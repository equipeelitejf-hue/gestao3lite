ALTER TABLE public.members ADD COLUMN spouse_id uuid REFERENCES public.members(id) ON DELETE SET NULL;
ALTER TABLE public.entries ADD COLUMN visitors integer NOT NULL DEFAULT 0;
ALTER TABLE public.personal_goals ADD COLUMN membresia numeric NOT NULL DEFAULT 0, ADD COLUMN cells integer NOT NULL DEFAULT 0;
ALTER TABLE public.team_goals ADD COLUMN membresia numeric NOT NULL DEFAULT 0, ADD COLUMN cells integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.in_my_subtree(_target uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  with recursive up as (
    select id, parent_id, spouse_id from public.members where id = _target
    union all
    select m.id, m.parent_id, m.spouse_id from public.members m join up on m.id = up.parent_id
  )
  select exists (select 1 from up where id = public.my_member_id() or spouse_id = public.my_member_id())
$$;

CREATE OR REPLACE FUNCTION public.members_guard()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
begin
  new.email := lower(trim(new.email));
  new.name := trim(new.name);
  if tg_op = 'INSERT' then
    if new.parent_id is not null then
      if (select count(*) from public.members where parent_id = new.parent_id
            or parent_id = (select spouse_id from public.members where id = new.parent_id)) >= 12 then
        raise exception 'Cada líder pode ter no máximo 12 discípulos';
      end if;
      new.level := (select level from public.members where id = new.parent_id) + 1;
    end if;
  else
    if new.parent_id is distinct from old.parent_id or new.level <> old.level
       or (old.user_id is not null and new.user_id is distinct from old.user_id)
       or (current_user in ('authenticated', 'anon') and (new.user_id is distinct from old.user_id or new.spouse_id is distinct from old.spouse_id)) then
      raise exception 'Alteração não permitida';
    end if;
    if old.user_id is not null and new.email <> old.email then
      raise exception 'Não é possível alterar o e-mail de quem já criou a conta';
    end if;
  end if;
  return new;
end $$;

CREATE OR REPLACE FUNCTION public.claim_membership(_name text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare
  uid uuid := auth.uid();
  mail text := lower(auth.jwt() ->> 'email');
  mid uuid;
  lvl int;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select id into mid from public.members where user_id = uid;
  if mid is not null then return mid; end if;
  update public.members set user_id = uid where email = mail and user_id is null returning id, level into mid, lvl;
  if mid is not null then
    if lvl = 0 then insert into public.user_roles (user_id, role) values (uid, 'admin') on conflict do nothing; end if;
    return mid;
  end if;
  perform pg_advisory_xact_lock(42);
  if not exists (select 1 from public.members) then
    insert into public.members (user_id, name, email, level)
      values (uid, coalesce(nullif(trim(_name), ''), split_part(mail, '@', 1)), mail, 0) returning id into mid;
    insert into public.user_roles (user_id, role) values (uid, 'admin') on conflict do nothing;
    return mid;
  end if;
  return null;
end $$;

CREATE OR REPLACE FUNCTION public.add_co_leader(_name text, _email text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare me uuid := public.my_member_id(); nid uuid;
begin
  if me is null or not public.has_role(auth.uid(), 'admin') or (select level from public.members where id = me) <> 0 then
    raise exception 'Apenas o Líder Principal pode vincular a co-liderança';
  end if;
  if (select spouse_id from public.members where id = me) is not null then raise exception 'Co-líder já vinculado'; end if;
  if length(trim(_name)) < 2 or _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Dados inválidos'; end if;
  insert into public.members (name, email, level, spouse_id) values (_name, _email, 0, me) returning id into nid;
  update public.members set spouse_id = nid where id = me;
  return nid;
end $$;

CREATE OR REPLACE FUNCTION public.link_couple(_a uuid, _b uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  if _a = _b or not public.leads_member(_a) or not public.leads_member(_b) then raise exception 'Alteração não permitida'; end if;
  if (select parent_id from public.members where id = _a) is distinct from (select parent_id from public.members where id = _b) then
    raise exception 'O casal precisa ter o mesmo líder';
  end if;
  if exists (select 1 from public.members where id in (_a, _b) and spouse_id is not null) then raise exception 'Uma das pessoas já está em um casal'; end if;
  update public.members set spouse_id = _b where id = _a;
  update public.members set spouse_id = _a where id = _b;
end $$;

CREATE OR REPLACE FUNCTION public.unlink_couple(_a uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare b uuid;
begin
  if not public.leads_member(_a) then raise exception 'Alteração não permitida'; end if;
  select spouse_id into b from public.members where id = _a;
  update public.members set spouse_id = null where id in (_a, b);
end $$;

REVOKE EXECUTE ON FUNCTION public.add_co_leader(text, text), public.link_couple(uuid, uuid), public.unlink_couple(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.add_co_leader(text, text), public.link_couple(uuid, uuid), public.unlink_couple(uuid) TO authenticated;

DROP POLICY "See own subtree and own leader" ON public.members;
CREATE POLICY "See own subtree and own leader" ON public.members FOR SELECT TO authenticated
  USING (in_my_subtree(id) OR id = my_leader_id() OR spouse_id = my_leader_id());

CREATE TABLE public.cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  host_name text NOT NULL,
  mode text NOT NULL DEFAULT 'presencial' CHECK (mode IN ('presencial','online')),
  frequency text NOT NULL CHECK (frequency IN ('semanal','quinzenal','mensal')),
  neighborhood text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cells TO authenticated;
GRANT ALL ON public.cells TO service_role;
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See cells in subtree" ON public.cells FOR SELECT TO authenticated USING (in_my_subtree(member_id));
CREATE POLICY "Add cells in subtree" ON public.cells FOR INSERT TO authenticated WITH CHECK (in_my_subtree(member_id));
CREATE POLICY "Edit cells in subtree" ON public.cells FOR UPDATE TO authenticated USING (in_my_subtree(member_id)) WITH CHECK (in_my_subtree(member_id));
CREATE POLICY "Delete cells in subtree" ON public.cells FOR DELETE TO authenticated USING (in_my_subtree(member_id));

CREATE TABLE public.cell_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_id uuid NOT NULL REFERENCES public.cells(id) ON DELETE CASCADE,
  date date NOT NULL,
  month text NOT NULL DEFAULT '',
  lives integer NOT NULL DEFAULT 0 CHECK (lives >= 0),
  visitors integer NOT NULL DEFAULT 0 CHECK (visitors >= 0),
  offering numeric NOT NULL DEFAULT 0 CHECK (offering >= 0),
  photo text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cell_meetings TO authenticated;
GRANT ALL ON public.cell_meetings TO service_role;
ALTER TABLE public.cell_meetings ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.cell_visible(_cell uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ select coalesce(public.in_my_subtree((select member_id from public.cells where id = _cell)), false) $$;
REVOKE EXECUTE ON FUNCTION public.cell_visible(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cell_visible(uuid) TO authenticated;
CREATE POLICY "See meetings" ON public.cell_meetings FOR SELECT TO authenticated USING (cell_visible(cell_id));
CREATE POLICY "Add meetings" ON public.cell_meetings FOR INSERT TO authenticated WITH CHECK (cell_visible(cell_id));
CREATE POLICY "Edit meetings" ON public.cell_meetings FOR UPDATE TO authenticated USING (cell_visible(cell_id)) WITH CHECK (cell_visible(cell_id));
CREATE POLICY "Delete meetings" ON public.cell_meetings FOR DELETE TO authenticated USING (cell_visible(cell_id));
CREATE TRIGGER cell_meetings_set_month BEFORE INSERT OR UPDATE ON public.cell_meetings FOR EACH ROW EXECUTE FUNCTION public.entries_set_month();
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  parent_id uuid references public.members(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  email text not null unique check (char_length(email) between 3 and 255),
  level int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.members(parent_id);
grant select, insert, update, delete on public.members to authenticated;
grant all on public.members to service_role;
alter table public.members enable row level security;

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  date date not null,
  month text not null default '',
  kind text not null check (kind in ('oferta','terca','arena','familia')),
  value numeric(12,2) not null check (value > 0 and value <= 1000000),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create index on public.entries(member_id, month);
grant select, insert, update, delete on public.entries to authenticated;
grant all on public.entries to service_role;
alter table public.entries enable row level security;

create or replace function public.entries_set_month()
returns trigger language plpgsql set search_path = public as $$
begin
  new.month := to_char(new.date, 'YYYY-MM');
  return new;
end $$;
create trigger entries_set_month before insert or update on public.entries for each row execute function public.entries_set_month();

create table public.personal_goals (
  member_id uuid not null references public.members(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  value numeric(12,2) not null default 0 check (value >= 0),
  primary key (member_id, month)
);
grant select, insert, update, delete on public.personal_goals to authenticated;
grant all on public.personal_goals to service_role;
alter table public.personal_goals enable row level security;

create table public.team_goals (
  month text primary key check (month ~ '^\d{4}-\d{2}$'),
  value numeric(12,2) not null default 0 check (value >= 0)
);
grant select, insert, update, delete on public.team_goals to authenticated;
grant all on public.team_goals to service_role;
alter table public.team_goals enable row level security;

create or replace function public.my_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.members where user_id = auth.uid()
$$;

create or replace function public.my_leader_id()
returns uuid language sql stable security definer set search_path = public as $$
  select parent_id from public.members where user_id = auth.uid()
$$;

create or replace function public.in_my_subtree(_target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with recursive up as (
    select id, parent_id from public.members where id = _target
    union all
    select m.id, m.parent_id from public.members m join up on m.id = up.parent_id
  )
  select exists (select 1 from up where id = public.my_member_id())
$$;

create or replace function public.leads_member(_target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.in_my_subtree((select parent_id from public.members where id = _target)), false)
$$;

create policy "See own subtree and own leader" on public.members for select to authenticated
  using (public.in_my_subtree(id) or id = public.my_leader_id());
create policy "Leaders add disciples" on public.members for insert to authenticated
  with check (parent_id is not null and public.in_my_subtree(parent_id) and user_id is null);
create policy "Leaders edit disciples" on public.members for update to authenticated
  using (public.leads_member(id)) with check (public.leads_member(id));
create policy "Leaders remove disciples" on public.members for delete to authenticated
  using (public.leads_member(id));

create or replace function public.members_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.email := lower(trim(new.email));
  new.name := trim(new.name);
  if tg_op = 'INSERT' then
    if new.parent_id is not null then
      if (select count(*) from public.members where parent_id = new.parent_id) >= 12 then
        raise exception 'Cada líder pode ter no máximo 12 discípulos';
      end if;
      new.level := (select level from public.members where id = new.parent_id) + 1;
    end if;
  else
    if new.parent_id is distinct from old.parent_id or new.level <> old.level
       or (old.user_id is not null and new.user_id is distinct from old.user_id) then
      raise exception 'Alteração não permitida';
    end if;
    if old.user_id is not null and new.email <> old.email then
      raise exception 'Não é possível alterar o e-mail de quem já criou a conta';
    end if;
  end if;
  return new;
end $$;
create trigger members_guard before insert or update on public.members for each row execute function public.members_guard();

create policy "See entries in subtree" on public.entries for select to authenticated using (public.in_my_subtree(member_id));
create policy "Add own entries" on public.entries for insert to authenticated with check (member_id = public.my_member_id());
create policy "Edit own entries" on public.entries for update to authenticated using (member_id = public.my_member_id()) with check (member_id = public.my_member_id());
create policy "Delete own entries" on public.entries for delete to authenticated using (member_id = public.my_member_id());

create policy "See goals in subtree" on public.personal_goals for select to authenticated using (public.in_my_subtree(member_id));
create policy "Leaders set goals" on public.personal_goals for insert to authenticated with check (public.leads_member(member_id));
create policy "Leaders update goals" on public.personal_goals for update to authenticated using (public.leads_member(member_id)) with check (public.leads_member(member_id));
create policy "Leaders delete goals" on public.personal_goals for delete to authenticated using (public.leads_member(member_id));

create policy "Members read team goals" on public.team_goals for select to authenticated using (public.my_member_id() is not null);
create policy "Admin inserts team goals" on public.team_goals for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin updates team goals" on public.team_goals for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.claim_membership(_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  mail text := lower(auth.jwt() ->> 'email');
  mid uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select id into mid from public.members where user_id = uid;
  if mid is not null then return mid; end if;
  update public.members set user_id = uid where email = mail and user_id is null returning id into mid;
  if mid is not null then return mid; end if;
  perform pg_advisory_xact_lock(42);
  if not exists (select 1 from public.members) then
    insert into public.members (user_id, name, email, level)
      values (uid, coalesce(nullif(trim(_name), ''), split_part(mail, '@', 1)), mail, 0) returning id into mid;
    insert into public.user_roles (user_id, role) values (uid, 'admin') on conflict do nothing;
    return mid;
  end if;
  return null;
end $$;
revoke execute on function public.claim_membership(text) from public, anon;
grant execute on function public.claim_membership(text) to authenticated;
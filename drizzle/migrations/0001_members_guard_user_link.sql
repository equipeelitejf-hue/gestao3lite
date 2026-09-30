create or replace function public.members_guard()
returns trigger language plpgsql set search_path = public as $$
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
       or (old.user_id is not null and new.user_id is distinct from old.user_id)
       or (current_user in ('authenticated', 'anon') and new.user_id is distinct from old.user_id) then
      raise exception 'Alteração não permitida';
    end if;
    if old.user_id is not null and new.email <> old.email then
      raise exception 'Não é possível alterar o e-mail de quem já criou a conta';
    end if;
  end if;
  return new;
end $$;
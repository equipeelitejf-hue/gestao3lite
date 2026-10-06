CREATE OR REPLACE FUNCTION public.team_partner_summary(_month text)
RETURNS TABLE(name text, result numeric, goal numeric, is_total boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
declare me uuid := public.my_member_id(); root uuid; root_sp uuid;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  with recursive up as (
    select id, parent_id from members where id = me
    union all select m.id, m.parent_id from members m join up on m.id = up.parent_id
  ) select id into root from up where parent_id is null limit 1;
  select spouse_id into root_sp from members where id = root;
  return query
  with recursive tree as (
    select id from members where id in (root, root_sp)
    union select m.id from members m join tree t on m.parent_id = t.id
    union select m.id from members m join tree t on m.spouse_id = t.id
  ), own as (
    select mb.id, coalesce((select sum(e.value) from entries e where e.member_id = mb.id and e.month = _month and e.kind = 'oferta'), 0)
      + coalesce((select sum(cm.offering) from cell_meetings cm join cells c on c.id = cm.cell_id where c.member_id = mb.id and cm.month = _month), 0) as v,
      coalesce((select pg.value from personal_goals pg where pg.member_id = mb.id and pg.month = _month), 0) as g
    from members mb
  ), directs as (
    select m.id, m.name, m.spouse_id, case when m.spouse_id is not null and exists (select 1 from members s where s.id = m.spouse_id and s.parent_id in (root, root_sp)) then least(m.id, m.spouse_id) else m.id end as k
    from members m where m.parent_id in (root, root_sp)
  ), units as (
    select d.k, string_agg(split_part(d.name, ' ', 1), ' & ' order by d.id) as uname, sum(o.v) as v, max(o.g) as g, count(*) as n, min(d.name) as full_name
    from directs d join own o on o.id = d.id group by d.k
  )
  select case when u.n > 1 then u.uname else u.full_name end, u.v, u.g, false from units u
  union all
  select 'TOTAL', (select coalesce(sum(o.v), 0) from own o where o.id in (select id from tree)), 0::numeric, true;
end $$;
REVOKE ALL ON FUNCTION public.team_partner_summary(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_partner_summary(text) TO authenticated;
CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES public.entries(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES public.cell_meetings(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  date date NOT NULL,
  month text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT visits_one_source CHECK ((entry_id IS NULL) <> (meeting_id IS NULL)),
  CONSTRAINT visits_name_len CHECK (length(trim(name)) BETWEEN 2 AND 100 AND length(phone) <= 30)
);
CREATE INDEX visits_month_idx ON public.visits(month);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visits TO authenticated;
GRANT ALL ON public.visits TO service_role;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER visits_set_month BEFORE INSERT OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.entries_set_month();
CREATE POLICY "See visits in subtree" ON public.visits FOR SELECT TO authenticated USING (public.in_my_subtree(member_id));
CREATE POLICY "Add visits" ON public.visits FOR INSERT TO authenticated WITH CHECK (
  (entry_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.entries e WHERE e.id = entry_id AND e.member_id = public.my_member_id() AND e.member_id = visits.member_id))
  OR (meeting_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.cell_meetings m JOIN public.cells c ON c.id = m.cell_id WHERE m.id = meeting_id AND c.member_id = visits.member_id AND public.cell_visible(m.cell_id)))
);
CREATE POLICY "Delete visits" ON public.visits FOR DELETE TO authenticated USING (
  (entry_id IS NOT NULL AND member_id = public.my_member_id())
  OR (meeting_id IS NOT NULL AND public.in_my_subtree(member_id))
);
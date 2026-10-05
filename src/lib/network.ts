import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type EntryKind = "oferta" | "terca" | "arena" | "familia";
export type Member = { id: string; user_id: string | null; parent_id: string | null; spouse_id: string | null; name: string; email: string; level: number };
export type Entry = { id: string; member_id: string; date: string; month: string; kind: EntryKind; value: number; visitors: number; note: string };
export type CellMode = "presencial" | "online";
export type CellFreq = "semanal" | "quinzenal" | "mensal";
export type Cell = { id: string; member_id: string; host_name: string; mode: CellMode; frequency: CellFreq; neighborhood: string; address: string };
export type Meeting = { id: string; cell_id: string; date: string; month: string; lives: number; visitors: number; offering: number };
export type Visit = { id: string; member_id: string; entry_id: string | null; meeting_id: string | null; name: string; phone: string; date: string };
export type VisitorInput = { name: string; phone: string };
/** Chave de desduplicação: telefone (8+ dígitos) ou nome normalizado. */
export const visitorKey = (v: { name: string; phone: string }) => { const d = v.phone.replace(/\D/g, ""); return d.length >= 8 ? `t:${d.slice(-9)}` : `n:${v.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim()}`; };
export type Totals = { uniqueVisitors: number; oferta: number; terca: number; arena: number; familia: number; arregimentacao: number; membresia: number; visitantes: number; cells: number; activeCells: number; vidas: number; cellVisitors: number };
export type Goals = { oferta: number; membresia: number; cells: number };
export const FREQ_LABEL: Record<CellFreq, string> = { semanal: "Semanal", quinzenal: "Quinzenal", mensal: "Mensal" };

export const KIND_LABEL: Record<EntryKind, string> = {
  oferta: "Parceiro de Deus",
  terca: "Terça da Fé",
  arena: "Arena",
  familia: "Culto da Família",
};

/** Peso de cada culto na membresia. */
export const MEMBRESIA_WEIGHT = { terca: 0.3, arena: 0.5, familia: 1 } as const;

/** Divisor fixo do ciclo mensal (4 semanas). */
export const MEMBRESIA_WEEKS = 4;
/** Membresia = média semanal (soma ponderada ÷ 4), arredondada: decimal ≥ 0,5 sobe, ≤ 0,4 desce. */
export function membresia(t: { terca: number; arena: number; familia: number }) {
  const raw = (t.terca * MEMBRESIA_WEIGHT.terca + t.arena * MEMBRESIA_WEIGHT.arena + t.familia * MEMBRESIA_WEIGHT.familia) / MEMBRESIA_WEEKS;
  return Math.round(Math.round(raw * 100) / 100);
}

/** Parceiro de Deus sempre com centavos, sem arredondar. */
export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const num = (v: number) => Math.round(v).toLocaleString("pt-BR");
export const pct = (v: number, goal: number) => (goal > 0 ? Math.round((v / goal) * 100) : 0);
export const initials = (name: string) => name.replace(/^Pr\.?\s+/i, "").split(/\s+/).filter(Boolean).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function monthLabel(id: string) {
  const [y, m] = id.split("-");
  return `${MONTH_NAMES[Number(m) - 1] ?? ""} de ${y}`;
}
/** 11 meses anteriores, o atual e o próximo. */
export function monthOptions() {
  const d = new Date();
  const out: { id: string; label: string }[] = [];
  for (let i = 1; i >= -11; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() + i, 1);
    const id = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
    out.push({ id, label: monthLabel(id) });
  }
  return out;
}
export const today = () => new Date().toISOString().slice(0, 10);

const empty = (): Totals => ({ uniqueVisitors: 0, oferta: 0, terca: 0, arena: 0, familia: 0, arregimentacao: 0, membresia: 0, visitantes: 0, cells: 0, activeCells: 0, vidas: 0, cellVisitors: 0 });
const SUM_KEYS = ["oferta", "terca", "arena", "familia", "visitantes", "cells", "activeCells", "vidas", "cellVisitors"] as const;
function add(t: Totals, o: Totals) { for (const k of SUM_KEYS) t[k] += o[k]; }
function finish(t: Totals) { t.arregimentacao = t.terca + t.arena + t.familia; t.membresia = membresia(t); return t; }
const zeroGoals = (): Goals => ({ oferta: 0, membresia: 0, cells: 0 });

/** Rede visível com somas na árvore. Casais (spouse_id) contam como uma unidade com resultado e meta conjuntos. */
export class Network {
  byId = new Map<string, Member>();
  kids = new Map<string, Member[]>();
  raw = new Map<string, Totals>();
  goals = new Map<string, Goals>();
  cellsByMember = new Map<string, Cell[]>();
  meetingsByCell = new Map<string, Meeting[]>();
  private treeCache = new Map<string, Totals>();
  private goalCache = new Map<string, Goals>();
  visitsByMember = new Map<string, Visit[]>();
  private keyCache = new Map<string, Set<string>>();

  constructor(public members: Member[], public entries: Entry[], goals: ({ member_id: string } & Goals)[], public team: Goals, public cells: Cell[] = [], public meetings: Meeting[] = [], public visits: Visit[] = []) {
    for (const v of visits) { const l = this.visitsByMember.get(v.member_id) ?? []; l.push(v); this.visitsByMember.set(v.member_id, l); }
    for (const m of members) this.byId.set(m.id, m);
    for (const m of [...members].sort((a, b) => a.name.localeCompare(b.name))) {
      if (m.parent_id && this.byId.has(m.parent_id)) {
        const list = this.kids.get(m.parent_id) ?? [];
        list.push(m);
        this.kids.set(m.parent_id, list);
      }
    }
    const rawOf = (id: string) => { let t = this.raw.get(id); if (!t) { t = empty(); this.raw.set(id, t); } return t; };
    for (const e of entries) { const t = rawOf(e.member_id); t[e.kind] += Number(e.value); if (e.kind !== "oferta") t.visitantes += Number(e.visitors ?? 0); }
    for (const mt of meetings) { const l = this.meetingsByCell.get(mt.cell_id) ?? []; l.push(mt); this.meetingsByCell.set(mt.cell_id, l); }
    for (const c of cells) {
      const l = this.cellsByMember.get(c.member_id) ?? []; l.push(c); this.cellsByMember.set(c.member_id, l);
      const t = rawOf(c.member_id); t.cells += 1;
      const ms = this.meetingsByCell.get(c.id) ?? [];
      if (ms.length) t.activeCells += 1;
      for (const mt of ms) { t.oferta += Number(mt.offering); t.vidas += mt.lives; t.cellVisitors += mt.visitors; }
    }
    for (const g of goals) this.goals.set(g.member_id, { oferta: Number(g.oferta), membresia: Number(g.membresia), cells: Number(g.cells) });
  }

  /** Teamgoal legado (Parceiro de Deus). */
  get teamGoal() { return this.team.oferta; }
  person(id: string) { return this.byId.get(id); }
  spouseOf(id: string) { const s = this.byId.get(id)?.spouse_id; return s ? this.byId.get(s) : undefined; }
  unit(id: string) { const s = this.spouseOf(id); return s ? [id, s.id] : [id]; }
  unitKey(id: string) { return this.unit(id).sort()[0]!; }
  unitName(id: string) { const p = this.person(id); const s = this.spouseOf(id); return s ? `${p?.name.split(" ")[0]} & ${s.name.split(" ")[0]}` : p?.name ?? "—"; }
  /** Filhos diretos da pessoa e do cônjuge (equipe compartilhada). */
  childrenOf(id: string) {
    const out = this.unit(id).flatMap((u) => this.kids.get(u) ?? []);
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }
  /** Um representante por unidade (casais aparecem uma vez). */
  childUnits(id: string) { const seen = new Set<string>(); return this.childrenOf(id).filter((c) => { const k = this.unitKey(c.id); if (seen.has(k)) return false; seen.add(k); return true; }); }
  goalOf(id: string): Goals { const g = zeroGoals(); for (const u of this.unit(id)) { const x = this.goals.get(u); if (x) { g.oferta = Math.max(g.oferta, x.oferta); g.membresia = Math.max(g.membresia, x.membresia); g.cells = Math.max(g.cells, x.cells); } } return g; }
  ownTotals(id: string): Totals { const t = empty(); for (const u of this.unit(id)) { const r = this.raw.get(u); if (r) add(t, r); } finish(t); t.uniqueVisitors = this.ownKeys(id).size; return t; }
  private ownKeys(id: string) { const s = new Set<string>(); for (const u of this.unit(id)) for (const v of this.visitsByMember.get(u) ?? []) s.add(visitorKey(v)); return s; }
  /** Vidas únicas visitantes na pessoa/casal + rede abaixo (sem duplicar entre células e cultos). */
  treeKeys(id: string): Set<string> { const k = this.unitKey(id); const hit = this.keyCache.get(k); if (hit) return hit; const s = this.ownKeys(id); for (const c of this.childUnits(id)) for (const x of this.treeKeys(c.id)) s.add(x); this.keyCache.set(k, s); return s; }
  visitsOf(src: { entry_id?: string; meeting_id?: string }) { return this.visits.filter((v) => (src.entry_id && v.entry_id === src.entry_id) || (src.meeting_id && v.meeting_id === src.meeting_id)); }
  /** Nomes já vistos na rede (para sugerir). */
  knownVisitors() { const m = new Map<string, VisitorInput>(); for (const v of this.visits) { const k = visitorKey(v); if (!m.has(k) || (v.phone && !m.get(k)!.phone)) m.set(k, { name: v.name, phone: v.phone }); } return [...m.values()].sort((a, b) => a.name.localeCompare(b.name)); }
  cellsOf(id: string) { return this.unit(id).flatMap((u) => this.cellsByMember.get(u) ?? []); }
  meetingsOf(cellId: string) { return (this.meetingsByCell.get(cellId) ?? []).sort((a, b) => b.date.localeCompare(a.date)); }
  entriesOf(id: string) { const u = this.unit(id); return this.entries.filter((e) => u.includes(e.member_id)).sort((a, b) => b.date.localeCompare(a.date)); }
  pathOf(id: string) {
    const path: Member[] = [];
    let cur = this.byId.get(id);
    while (cur) { path.unshift(cur); cur = cur.parent_id ? this.byId.get(cur.parent_id) : undefined; }
    return path;
  }
  inTree(rootId: string, id: string) { const r = new Set(this.unit(rootId)); return this.pathOf(id).some((x) => r.has(x.id)); }
  subtreeSize(id: string): number { return this.childrenOf(id).reduce((a, c) => a + 1 + this.kidsCount(c.id), 0); }
  private kidsCount(id: string): number { return (this.kids.get(id) ?? []).reduce((a, c) => a + 1 + this.kidsCount(c.id), 0); }
  treeTotals(id: string): Totals {
    const key = this.unitKey(id);
    const hit = this.treeCache.get(key);
    if (hit) return hit;
    const t = this.ownTotals(id);
    for (const c of this.childUnits(id)) add(t, this.treeTotals(c.id));
    finish(t);
    t.uniqueVisitors = this.treeKeys(id).size;
    this.treeCache.set(key, t);
    return t;
  }
  treeGoal(id: string): Goals {
    const key = this.unitKey(id);
    const hit = this.goalCache.get(key);
    if (hit) return hit;
    const g = this.goalOf(id);
    for (const c of this.childUnits(id)) { const x = this.treeGoal(c.id); g.oferta += x.oferta; g.membresia += x.membresia; g.cells += x.cells; }
    this.goalCache.set(key, g);
    return g;
  }
}

// ---------------- Dados ----------------
export type Me = { member: Member | null; isAdmin: boolean; email: string };
const MEMBER_COLS = "id, user_id, parent_id, spouse_id, name, email, level";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me> => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Sessão expirada");
      const name = typeof user.user_metadata?.["name"] === "string" ? (user.user_metadata["name"] as string) : "";
      const { data: id, error } = await supabase.rpc("claim_membership", { _name: name });
      if (error) throw error;
      let member: Member | null = null;
      if (id) {
        const { data } = await supabase.from("members").select(MEMBER_COLS).eq("id", id).maybeSingle();
        member = data;
      }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return { member, isAdmin: !!roles?.some((r) => r.role === "admin"), email: user.email ?? "" };
    },
  });
}

export function useNetwork(month: string, enabled: boolean) {
  return useQuery({
    queryKey: ["network", month],
    enabled,
    queryFn: async () => {
      const [members, entries, goals, team, cells, meetings, visits] = await Promise.all([
        supabase.from("members").select(MEMBER_COLS),
        supabase.from("entries").select("id, member_id, date, month, kind, value, visitors, note").eq("month", month),
        supabase.from("personal_goals").select("member_id, value, membresia, cells").eq("month", month),
        supabase.from("team_goals").select("value, membresia, cells").eq("month", month).maybeSingle(),
        supabase.from("cells").select("id, member_id, host_name, mode, frequency, neighborhood, address"),
        supabase.from("cell_meetings").select("id, cell_id, date, month, lives, visitors, offering").eq("month", month),
        supabase.from("visits").select("id, member_id, entry_id, meeting_id, name, phone, date").eq("month", month),
      ]);
      const err = members.error ?? entries.error ?? goals.error ?? team.error ?? cells.error ?? meetings.error ?? visits.error;
      if (err) throw err;
      return new Network(
        members.data ?? [],
        (entries.data ?? []) as Entry[],
        (goals.data ?? []).map((g) => ({ member_id: g.member_id, oferta: Number(g.value), membresia: Number(g.membresia), cells: Number(g.cells) })),
        { oferta: Number(team.data?.value ?? 0), membresia: Number(team.data?.membresia ?? 0), cells: Number(team.data?.cells ?? 0) },
        (cells.data ?? []) as Cell[],
        (meetings.data ?? []).map((m) => ({ ...m, offering: Number(m.offering) })),
        (visits.data ?? []) as Visit[],
      );
    },
  });
}

export async function fetchMeetingPhoto(id: string) {
  const { data } = await supabase.from("cell_meetings").select("photo").eq("id", id).maybeSingle();
  return data?.photo ?? "";
}

function friendly(e: unknown) {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "";
  if (msg.includes("12 discípulos")) return "Cada líder pode ter no máximo 12 discípulos.";
  if (msg.includes("duplicate") || msg.includes("unique")) return "Este e-mail já está cadastrado na rede.";
  if (msg.includes("e-mail de quem já criou")) return "Não é possível alterar o e-mail de quem já criou a conta.";
  for (const k of ["Co-líder já vinculado", "mesmo líder", "já está em um casal", "Apenas o Líder Principal", "Dados inválidos"]) if (msg.includes(k)) return msg.replace(/^.*?:\s*/, "");
  if (msg.includes("row-level security")) return "Você não tem permissão para esta ação.";
  return "Não foi possível salvar. Tente novamente.";
}

export function useActions(onNotice: (m: string) => void) {
  const qc = useQueryClient();
  const done = (msg: string) => () => { void qc.invalidateQueries({ queryKey: ["network"] }); onNotice(msg); };
  const fail = (e: unknown) => onNotice(friendly(e));
  const run = <T,>(fn: (v: T) => PromiseLike<{ error: unknown }>, msg: string) =>
    useMutation({ mutationFn: async (v: T) => { const { error } = await fn(v); if (error) throw error; }, onSuccess: done(msg), onError: fail });

  return {
    addEntry: run(async (v: { member_id: string; date: string; kind: EntryKind; value: number; note: string; people: VisitorInput[] }) => {
      const { people, ...row } = v;
      const r = await supabase.from("entries").insert({ ...row, visitors: people.length }).select("id").single();
      if (r.error || !people.length) return r;
      return supabase.from("visits").insert(people.map((p) => ({ ...p, member_id: v.member_id, entry_id: r.data.id, date: v.date })));
    }, "Lançamento registrado."),
    updateEntry: run(async (v: { id: string; member_id: string; date: string; kind: EntryKind; value: number; note: string; people: VisitorInput[] }) => {
      const r = await supabase.from("entries").update({ date: v.date, kind: v.kind, value: v.value, visitors: v.people.length, note: v.note }).eq("id", v.id);
      if (r.error) return r;
      const d = await supabase.from("visits").delete().eq("entry_id", v.id);
      if (d.error || !v.people.length) return d;
      return supabase.from("visits").insert(v.people.map((p) => ({ ...p, member_id: v.member_id, entry_id: v.id, date: v.date })));
    }, "Lançamento atualizado."),
    deleteEntry: run((id: string) => supabase.from("entries").delete().eq("id", id), "Lançamento excluído."),
    setGoal: run(async (v: { member_ids: string[]; month: string; goals: Goals }) => supabase.from("personal_goals").upsert(v.member_ids.map((member_id) => ({ member_id, month: v.month, value: v.goals.oferta, membresia: v.goals.membresia, cells: v.goals.cells }))), "Meta salva."),
    setTeamGoal: run((v: { month: string; goals: Goals }) => supabase.from("team_goals").upsert({ month: v.month, value: v.goals.oferta, membresia: v.goals.membresia, cells: v.goals.cells }), "Meta da equipe salva."),
    addMember: run((v: { parent_id: string; name: string; email: string }) => supabase.from("members").insert(v), "Discípulo cadastrado."),
    updateMember: run((v: { id: string; name: string; email: string }) => supabase.from("members").update({ name: v.name, email: v.email }).eq("id", v.id), "Cadastro atualizado."),
    deleteMember: run((id: string) => supabase.from("members").delete().eq("id", id), "Discípulo removido."),
    addCoLeader: run((v: { name: string; email: string }) => supabase.rpc("add_co_leader", { _name: v.name, _email: v.email }), "Co-líder vinculado(a)."),
    linkCouple: run((v: { a: string; b: string }) => supabase.rpc("link_couple", { _a: v.a, _b: v.b }), "Casal vinculado."),
    unlinkCouple: run((id: string) => supabase.rpc("unlink_couple", { _a: id }), "Casal desvinculado."),
    saveCell: run((v: Omit<Cell, "id"> & { id?: string }) => (v.id ? supabase.from("cells").update(v).eq("id", v.id) : supabase.from("cells").insert(v)), "Célula salva."),
    deleteCell: run((id: string) => supabase.from("cells").delete().eq("id", id), "Célula removida."),
    addMeeting: run(async (v: { cell_id: string; member_id: string; date: string; lives: number; offering: number; photo: string; people: VisitorInput[] }) => {
      const { people, member_id, ...row } = v;
      const r = await supabase.from("cell_meetings").insert({ ...row, visitors: people.length }).select("id").single();
      if (r.error || !people.length) return r;
      return supabase.from("visits").insert(people.map((p) => ({ ...p, member_id, meeting_id: r.data.id, date: v.date })));
    }, "Encontro registrado."),
    deleteMeeting: run((id: string) => supabase.from("cell_meetings").delete().eq("id", id), "Encontro excluído."),
  };
}
export type Actions = ReturnType<typeof useActions>;

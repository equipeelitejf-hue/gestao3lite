import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type EntryKind = "oferta" | "terca" | "arena" | "familia";
export type Member = { id: string; user_id: string | null; parent_id: string | null; name: string; email: string; level: number };
export type Entry = { id: string; member_id: string; date: string; month: string; kind: EntryKind; value: number; note: string };
export type Totals = { oferta: number; terca: number; arena: number; familia: number; arregimentacao: number; membresia: number };

export const KIND_LABEL: Record<EntryKind, string> = {
  oferta: "Parceiro de Deus",
  terca: "Terça da Fé",
  arena: "Arena",
  familia: "Culto da Família",
};

/** Peso de cada culto na membresia. */
export const MEMBRESIA_WEIGHT = { terca: 0.3, arena: 0.5, familia: 1 } as const;

export function membresia(t: { terca: number; arena: number; familia: number }) {
  return Math.round((t.terca * MEMBRESIA_WEIGHT.terca + t.arena * MEMBRESIA_WEIGHT.arena + t.familia * MEMBRESIA_WEIGHT.familia) * 10) / 10;
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
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

const empty = (): Totals => ({ oferta: 0, terca: 0, arena: 0, familia: 0, arregimentacao: 0, membresia: 0 });

/** Rede visível para o usuário com cálculos de soma na árvore. */
export class Network {
  byId = new Map<string, Member>();
  kids = new Map<string, Member[]>();
  own = new Map<string, Totals>();
  goals = new Map<string, number>();
  private treeCache = new Map<string, Totals>();
  private goalCache = new Map<string, number>();

  constructor(public members: Member[], public entries: Entry[], goals: { member_id: string; value: number }[], public teamGoal: number) {
    for (const m of members) this.byId.set(m.id, m);
    for (const m of [...members].sort((a, b) => a.name.localeCompare(b.name))) {
      if (m.parent_id && this.byId.has(m.parent_id)) {
        const list = this.kids.get(m.parent_id) ?? [];
        list.push(m);
        this.kids.set(m.parent_id, list);
      }
    }
    for (const e of entries) {
      const t = this.own.get(e.member_id) ?? empty();
      t[e.kind] += Number(e.value);
      this.own.set(e.member_id, t);
    }
    for (const t of this.own.values()) { t.arregimentacao = t.terca + t.arena + t.familia; t.membresia = membresia(t); }
    for (const g of goals) this.goals.set(g.member_id, Number(g.value));
  }

  person(id: string) { return this.byId.get(id); }
  childrenOf(id: string) { return this.kids.get(id) ?? []; }
  goalOf(id: string) { return this.goals.get(id) ?? 0; }
  ownTotals(id: string) { return this.own.get(id) ?? empty(); }
  entriesOf(id: string) { return this.entries.filter((e) => e.member_id === id).sort((a, b) => b.date.localeCompare(a.date)); }
  pathOf(id: string) {
    const path: Member[] = [];
    let cur = this.byId.get(id);
    while (cur) { path.unshift(cur); cur = cur.parent_id ? this.byId.get(cur.parent_id) : undefined; }
    return path;
  }
  subtreeSize(id: string): number { return this.childrenOf(id).reduce((a, c) => a + 1 + this.subtreeSize(c.id), 0); }
  treeTotals(id: string): Totals {
    const hit = this.treeCache.get(id);
    if (hit) return hit;
    const t = { ...this.ownTotals(id) };
    for (const c of this.childrenOf(id)) {
      const ct = this.treeTotals(c.id);
      t.oferta += ct.oferta; t.terca += ct.terca; t.arena += ct.arena; t.familia += ct.familia;
    }
    t.arregimentacao = t.terca + t.arena + t.familia;
    t.membresia = membresia(t);
    this.treeCache.set(id, t);
    return t;
  }
  treeGoal(id: string): number {
    const hit = this.goalCache.get(id);
    if (hit !== undefined) return hit;
    const v = this.goalOf(id) + this.childrenOf(id).reduce((a, c) => a + this.treeGoal(c.id), 0);
    this.goalCache.set(id, v);
    return v;
  }
}

// ---------------- Dados ----------------
export type Me = { member: Member | null; isAdmin: boolean; email: string };

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
        const { data } = await supabase.from("members").select("id, user_id, parent_id, name, email, level").eq("id", id).maybeSingle();
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
      const [members, entries, goals, team] = await Promise.all([
        supabase.from("members").select("id, user_id, parent_id, name, email, level"),
        supabase.from("entries").select("id, member_id, date, month, kind, value, note").eq("month", month),
        supabase.from("personal_goals").select("member_id, value").eq("month", month),
        supabase.from("team_goals").select("value").eq("month", month).maybeSingle(),
      ]);
      const err = members.error ?? entries.error ?? goals.error ?? team.error;
      if (err) throw err;
      return new Network(members.data ?? [], (entries.data ?? []) as Entry[], goals.data ?? [], Number(team.data?.value ?? 0));
    },
  });
}

function friendly(e: unknown) {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "";
  if (msg.includes("12 discípulos")) return "Cada líder pode ter no máximo 12 discípulos.";
  if (msg.includes("duplicate") || msg.includes("unique")) return "Este e-mail já está cadastrado na rede.";
  if (msg.includes("e-mail de quem já criou")) return "Não é possível alterar o e-mail de quem já criou a conta.";
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
    addEntry: run((v: { member_id: string; date: string; kind: EntryKind; value: number; note: string }) => supabase.from("entries").insert(v), "Lançamento registrado."),
    updateEntry: run((v: { id: string; date: string; kind: EntryKind; value: number; note: string }) => supabase.from("entries").update({ date: v.date, kind: v.kind, value: v.value, note: v.note }).eq("id", v.id), "Lançamento atualizado."),
    deleteEntry: run((id: string) => supabase.from("entries").delete().eq("id", id), "Lançamento excluído."),
    setGoal: run((v: { member_id: string; month: string; value: number }) => supabase.from("personal_goals").upsert(v), "Meta salva."),
    setTeamGoal: run((v: { month: string; value: number }) => supabase.from("team_goals").upsert(v), "Meta da equipe salva."),
    addMember: run((v: { parent_id: string; name: string; email: string }) => supabase.from("members").insert(v), "Discípulo cadastrado."),
    updateMember: run((v: { id: string; name: string; email: string }) => supabase.from("members").update({ name: v.name, email: v.email }).eq("id", v.id), "Cadastro atualizado."),
    deleteMember: run((id: string) => supabase.from("members").delete().eq("id", id), "Discípulo removido."),
  };
}
export type Actions = ReturnType<typeof useActions>;

import { useSyncExternalStore } from "react";

export type EntryKind = "oferta" | "terca" | "arena" | "familia";

export type Person = { id: string; name: string; parentId: string | null; level: 0 | 1 | 2 };
export type Entry = { id: string; personId: string; month: string; date: string; kind: EntryKind; value: number; note: string };
export type NetworkState = {
  entries: Entry[];
  personalGoals: Record<string, Record<string, number>>; // month -> personId -> R$
  teamGoals: Record<string, number>; // month -> R$
};
export type Totals = { oferta: number; terca: number; arena: number; familia: number; arregimentacao: number; membresia: number };

export const KIND_LABEL: Record<EntryKind, string> = {
  oferta: "Parceiro de Deus",
  terca: "Terça da Fé",
  arena: "Arena",
  familia: "Culto da Família",
};

/** Peso de cada culto na membresia. */
export const MEMBRESIA_WEIGHT = { terca: 0.3, arena: 0.5, familia: 1 } as const;

export const MONTHS = [
  { id: "2026-08", label: "Agosto de 2026" },
  { id: "2026-09", label: "Setembro de 2026" },
  { id: "2026-10", label: "Outubro de 2026" },
];
export const CURRENT_MONTH = "2026-09";

export function membresia(t: { terca: number; arena: number; familia: number }) {
  return Math.round((t.terca * MEMBRESIA_WEIGHT.terca + t.arena * MEMBRESIA_WEIGHT.arena + t.familia * MEMBRESIA_WEIGHT.familia) * 10) / 10;
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

// ---------- Pessoas (fixas, determinísticas) ----------
const FIRST = ["Lucas", "Mariana", "Pedro", "Ana", "Rafael", "Juliana", "Mateus", "Camila", "Tiago", "Beatriz", "João", "Larissa", "Felipe", "Gabriela", "Daniel", "Isabela", "Samuel", "Letícia", "André", "Priscila", "Bruno", "Raquel", "Caio", "Débora"];
const LAST = ["Ribeiro", "Costa", "Santos", "Oliveira", "Almeida", "Souza", "Ferreira", "Lima", "Rocha", "Carvalho", "Martins", "Barbosa", "Gomes", "Moreira", "Cardoso", "Teixeira", "Mendes", "Pires", "Nunes", "Araújo"];

function buildPeople(): Person[] {
  const list: Person[] = [{ id: "root", name: "Pr. Gabriel", parentId: null, level: 0 }];
  for (let i = 0; i < 12; i++) {
    const id = `d${i + 1}`;
    list.push({ id, name: `${FIRST[i]} ${LAST[i]}`, parentId: "root", level: 1 });
    for (let j = 0; j < 12; j++) {
      const k = i * 12 + j;
      list.push({ id: `${id}-${j + 1}`, name: `${FIRST[(k * 7 + 3) % FIRST.length]} ${LAST[(k * 11 + 5) % LAST.length]}`, parentId: id, level: 2 });
    }
  }
  return list;
}

export const PEOPLE = buildPeople();
export const PERSON = Object.fromEntries(PEOPLE.map((p) => [p.id, p])) as Record<string, Person>;
export const CHILDREN: Record<string, Person[]> = {};
for (const p of PEOPLE) if (p.parentId) (CHILDREN[p.parentId] ??= []).push(p);
export const person = (id: string): Person => PERSON[id] ?? PEOPLE[0]!;
export const childrenOf = (id: string) => CHILDREN[id] ?? [];
export function pathOf(id: string) {
  const path: Person[] = [];
  let cur: Person | undefined = PERSON[id];
  while (cur) { path.unshift(cur); cur = cur.parentId ? PERSON[cur.parentId] : undefined; }
  return path;
}
export const initials = (name: string) => name.replace("Pr. ", "").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

// ---------- Dados de demonstração ----------
function rand(seed: number) { const x = Math.sin(seed) * 10000; return x - Math.floor(x); }

function buildSeed(): NetworkState {
  const entries: Entry[] = [];
  const personalGoals: NetworkState["personalGoals"] = {};
  const teamGoals: NetworkState["teamGoals"] = {};
  let n = 0;
  for (const [mi, month] of ["2026-08", "2026-09"].entries()) {
    personalGoals[month] = {};
    let sum = 0;
    for (const [pi, p] of PEOPLE.entries()) {
      if (p.level === 0) continue;
      const s = pi * 13 + mi * 101;
      const goal = Math.round((150 + rand(s) * 350) / 10) * 10;
      personalGoals[month][p.id] = goal;
      sum += goal;
      const day = (d: number) => `${month}-${String(d).padStart(2, "0")}`;
      const push = (kind: EntryKind, value: number, d: number) => value > 0 && entries.push({ id: `seed-${n++}`, personId: p.id, month, date: day(d), kind, value, note: "" });
      push("oferta", Math.round(goal * (0.5 + rand(s + 1) * 0.6) / 10) * 10, 5 + Math.floor(rand(s + 2) * 20));
      push("terca", Math.floor(rand(s + 3) * 6), 1 + Math.floor(rand(s + 4) * 27));
      push("arena", Math.floor(rand(s + 5) * 5), 1 + Math.floor(rand(s + 6) * 27));
      push("familia", Math.floor(rand(s + 7) * 5) + 1, 1 + Math.floor(rand(s + 8) * 27));
    }
    teamGoals[month] = Math.round(sum * 1.05 / 1000) * 1000;
  }
  return { entries, personalGoals, teamGoals };
}

export const SEED = buildSeed();

// ---------- Store ----------
const KEY = "3lite-network-v1";
let state: NetworkState = SEED;
const listeners = new Set<() => void>();
let loaded = false;

function emit(next: NetworkState) {
  state = next;
  cache.clear();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

/** Chamar após a hidratação para carregar dados salvos. */
export function loadSaved() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { state = JSON.parse(raw) as NetworkState; cache.clear(); listeners.forEach((l) => l()); }
  } catch { /* ignore */ }
}

export function useNetwork() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => SEED,
  );
}

export const actions = {
  addEntry(e: Omit<Entry, "id" | "month">) {
    emit({ ...state, entries: [{ ...e, id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, month: e.date.slice(0, 7) }, ...state.entries] });
  },
  updateEntry(id: string, e: Omit<Entry, "id" | "month">) {
    emit({ ...state, entries: state.entries.map((x) => (x.id === id ? { ...e, id, month: e.date.slice(0, 7) } : x)) });
  },
  deleteEntry(id: string) { emit({ ...state, entries: state.entries.filter((x) => x.id !== id) }); },
  setPersonalGoal(month: string, personId: string, value: number) {
    emit({ ...state, personalGoals: { ...state.personalGoals, [month]: { ...state.personalGoals[month], [personId]: value } } });
  },
  setTeamGoal(month: string, value: number) { emit({ ...state, teamGoals: { ...state.teamGoals, [month]: value } }); },
  reset() { emit(SEED); },
};

// ---------- Cálculos ----------
const cache = new Map<string, unknown>();
const empty = (): Totals => ({ oferta: 0, terca: 0, arena: 0, familia: 0, arregimentacao: 0, membresia: 0 });

function ownIndex(s: NetworkState, month: string) {
  const key = `own:${month}`;
  if (cache.has(key) && cache.get("state") === s) return cache.get(key) as Record<string, Totals>;
  if (cache.get("state") !== s) { cache.clear(); cache.set("state", s); }
  const idx: Record<string, Totals> = {};
  for (const e of s.entries) {
    if (e.month !== month) continue;
    const t = (idx[e.personId] ??= empty());
    t[e.kind] += e.value;
  }
  for (const t of Object.values(idx)) { t.arregimentacao = t.terca + t.arena + t.familia; t.membresia = membresia(t); }
  cache.set(key, idx);
  return idx;
}

export function ownTotals(s: NetworkState, month: string, id: string): Totals {
  return ownIndex(s, month)[id] ?? empty();
}

/** Resultado da pessoa + de toda a rede abaixo dela. */
export function treeTotals(s: NetworkState, month: string, id: string): Totals {
  const key = `tree:${month}:${id}`;
  ownIndex(s, month);
  if (cache.has(key)) return cache.get(key) as Totals;
  const t = { ...ownTotals(s, month, id) };
  for (const c of childrenOf(id)) {
    const ct = treeTotals(s, month, c.id);
    t.oferta += ct.oferta; t.terca += ct.terca; t.arena += ct.arena; t.familia += ct.familia;
  }
  t.arregimentacao = t.terca + t.arena + t.familia;
  t.membresia = membresia(t);
  cache.set(key, t);
  return t;
}

/** Meta Parceiro de Deus da pessoa + da rede abaixo dela. */
export function treeGoal(s: NetworkState, month: string, id: string): number {
  const own = s.personalGoals[month]?.[id] ?? 0;
  return own + childrenOf(id).reduce((acc, c) => acc + treeGoal(s, month, c.id), 0);
}

export const pct = (v: number, goal: number) => (goal > 0 ? Math.round((v / goal) * 100) : 0);

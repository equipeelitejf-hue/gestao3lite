import { ChevronRight, Heart, HeartOff, Plus, X, Pencil, Search, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KIND_LABEL, MEMBRESIA_WEIGHT, brl, initials, num, pct, today, type Actions, type Entry, type EntryKind, type Goals, type Member, type Network, type Totals, type VisitorInput, visitorKey } from "@/lib/network";
import { cn } from "@/lib/utils";

export const levelLabel = (level: number) => (level === 0 ? "Liderança Principal" : level === 1 ? "Discípulo direto" : `Rede · ${level}º nível`);

export function Bar({ value, className }: { value: number; className?: string }) {
  return <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, value)}%` }} /></div>;
}

export function Avatar({ name, strong }: { name: string; strong?: boolean }) {
  return <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-medium", strong ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground")}>{initials(name)}</span>;
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="rounded-md border border-dashed border-border bg-secondary/50 p-8 text-center"><p className="text-sm font-bold text-navy">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{text}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

const Pending = () => <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">Aguardando cadastro</span>;

// ---------------- Árvore ----------------
export function NetworkTree({ net, rootId, onSelect }: { net: Network; rootId: string; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ [rootId]: true });
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => (q ? net.members.filter((p) => p.id !== rootId && net.inTree(rootId, p.id) && p.name.toLowerCase().includes(q)) : []), [q, net, rootId]);
  const size = net.subtreeSize(rootId);

  const renderRow = (id: string, depth: number): React.ReactNode => {
    const p = net.person(id);
    if (!p) return null;
    const kids = net.childrenOf(id);
    const t = net.treeTotals(id);
    const goal = net.treeGoal(id).oferta;
    const isOpen = open[id];
    return <div key={id}>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border py-3" style={{ paddingLeft: Math.min(depth, 4) * 20 }}>
        <button disabled={!kids.length} onClick={() => setOpen((o) => ({ ...o, [id]: !o[id] }))} aria-label={isOpen ? "Recolher" : "Expandir"} className={cn("grid size-7 place-items-center rounded-md hover:bg-accent", !kids.length && "invisible")}>
          <ChevronRight className={cn("size-4 transition-transform", isOpen && "rotate-90")} />
        </button>
        <button onClick={() => onSelect(id)} className="flex min-w-0 items-center gap-3 text-left">
          <Avatar name={p.name} strong={depth === 0} />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-medium hover:text-primary">{p.name}</span>{net.spouseOf(id) && <span className="text-[10px] text-primary">♥ {net.spouseOf(id)?.name.split(" ")[0]}</span>}{kids.length > 0 && <span className="text-[10px] text-muted-foreground">{kids.length} discípulos</span>}{!p.user_id && <Pending />}</span>
            <Bar value={pct(t.oferta, goal)} className="mt-2 max-w-xs" />
          </span>
        </button>
        <div className="grid grid-cols-2 gap-4 text-right text-xs sm:grid-cols-3">
          <div className="hidden sm:block"><p className="font-medium">{brl(t.oferta)}</p><p className="text-[10px] text-muted-foreground">{goal ? `${pct(t.oferta, goal)}% da meta` : "sem meta"}</p></div>
          <div><p className="font-medium">{t.activeCells}</p><p className="text-[10px] text-muted-foreground">células ativas</p></div>
          <div><p className="font-bold text-primary">{num(t.membresia)}</p><p className="text-[10px] text-muted-foreground">membresia</p></div>
        </div>
      </div>
      {isOpen && kids.map((k) => <div key={k.id}>{renderRow(k.id, depth + 1)}</div>)}
    </div>;
  };

  return <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><h2 className="text-lg font-bold text-navy">Rede · {size} {size === 1 ? "pessoa" : "pessoas"}</h2><p className="mt-1 text-xs text-muted-foreground">Cada linha soma o resultado da pessoa e de toda a rede abaixo dela.</p></div>
      {size > 0 && <div className="relative sm:w-72"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar pessoa" className="pl-9" maxLength={60} /></div>}
    </div>
    <div className="mt-5">
      {q ? (matches.length ? matches.slice(0, 30).map((p) => <button key={p.id} onClick={() => onSelect(p.id)} className="flex w-full items-center gap-3 border-b border-border py-3 text-left hover:bg-secondary"><Avatar name={p.name} /><span><span className="block text-sm font-medium">{p.name}</span><span className="block text-[11px] text-muted-foreground">{net.pathOf(p.id).map((x) => x.name).join(" › ")}</span></span></button>) : <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma pessoa encontrada.</p>)
        : size === 0 ? <EmptyState title="Sua rede ainda está vazia" text="Cadastre seus discípulos na aba Minha equipe para ver a rede aqui." /> : renderRow(rootId, 0)}
    </div>
  </section>;
}

// ---------------- Painel lateral ----------------
export function MemberSheet({ net, id, onClose }: { net: Network | undefined; id: string | null; onClose: () => void }) {
  const p = id && net ? net.person(id) : undefined;
  return <Sheet open={!!p} onOpenChange={(o) => !o && onClose()}>
    <SheetContent className="w-full overflow-y-auto sm:max-w-md">
      {p && net && <>
        <SheetHeader><SheetTitle className="text-navy">{p.name}</SheetTitle><SheetDescription>{levelLabel(p.level)} · {p.email}{!p.user_id && " · aguardando cadastro"}</SheetDescription></SheetHeader>
        <div className="space-y-5 px-4 pb-6">
          <p className="text-[11px] text-muted-foreground">{net.pathOf(p.id).map((x) => x.name).join(" › ")}</p>
          <StatsBlock title={net.spouseOf(p.id) ? `Resultado do casal ${net.unitName(p.id)}` : "Resultado próprio"} t={net.ownTotals(p.id)} goal={net.goalOf(p.id)} />
          {net.childrenOf(p.id).length > 0 && <StatsBlock title="Com a rede abaixo" t={net.treeTotals(p.id)} goal={net.treeGoal(p.id)} />}
          <div><p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Lançamentos do mês</p><EntryList net={net} memberId={p.id} /></div>
        </div>
      </>}
    </SheetContent>
  </Sheet>;
}

function StatsBlock({ title, t, goal }: { title: string; t: Totals; goal: Goals }) {
  return <div className="rounded-md border border-border p-4">
    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
    <GoalLine label="Parceiro de Deus" value={brl(t.oferta)} goal={brl(goal.oferta)} p={pct(t.oferta, goal.oferta)} />
    <GoalLine label="Membresia" value={num(t.membresia)} goal={num(goal.membresia)} p={pct(t.membresia, goal.membresia)} />
    <GoalLine label="Células ativas" value={`${t.activeCells} de ${t.cells}`} goal={String(goal.cells)} p={pct(t.activeCells, goal.cells)} />
    <div className="mt-4 grid grid-cols-4 gap-2 text-center">{(["terca", "arena", "familia"] as const).map((k) => <div key={k} className="rounded-md bg-secondary p-2"><p className="text-sm font-bold">{t[k]}</p><p className="text-[9px] leading-tight text-muted-foreground">{KIND_LABEL[k]}</p></div>)}<div className="rounded-md bg-primary-soft p-2"><p className="text-sm font-bold text-primary">{t.uniqueVisitors}</p><p className="text-[9px] leading-tight text-muted-foreground">Visitantes únicos</p></div></div>
  </div>;
}

export function GoalLine({ label, value, goal, p }: { label: string; value: string; goal: string; p: number }) {
  return <div className="mt-3"><div className="flex items-end justify-between"><div><p className="text-base font-bold text-navy">{value}</p><p className="text-[11px] text-muted-foreground">{label} · meta {goal}</p></div><span className="text-sm font-bold text-primary">{p}%</span></div><Bar value={p} className="mt-1.5" /></div>;
}

// ---------------- Metas ----------------
const GOAL_FIELDS: { key: keyof Goals; label: string; money?: boolean }[] = [
  { key: "oferta", label: "Parceiro de Deus", money: true },
  { key: "membresia", label: "Membresia" },
  { key: "cells", label: "Células ativas" },
];

export function GoalsEditor({ net, month, parentId, isAdmin, actions }: { net: Network; month: string; parentId: string; isAdmin: boolean; actions: Actions }) {
  const units = net.childUnits(parentId);
  const sum = units.reduce((a, k) => { const g = net.treeGoal(k.id); return { oferta: a.oferta + g.oferta, membresia: a.membresia + g.membresia, cells: a.cells + g.cells }; }, { oferta: 0, membresia: 0, cells: 0 });
  const done = net.treeTotals(parentId);
  const real: Goals = { oferta: done.oferta, membresia: done.membresia, cells: done.activeCells };
  const fmt = (k: keyof Goals, v: number) => (k === "oferta" ? brl(v) : num(v));
  return <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7">
    <h2 className="text-lg font-bold text-navy">Metas do ciclo mensal</h2>
    <p className="mt-1 text-xs text-muted-foreground">Parceiro de Deus, Membresia e Células ativas. Casais têm uma meta conjunta. Os valores são salvos ao sair do campo.</p>
    {isAdmin && <div className="mt-5 grid gap-4 rounded-md bg-navy p-5 text-primary-foreground md:grid-cols-3">
      {GOAL_FIELDS.map((f) => <div key={f.key}>
        <p className="text-[11px] uppercase tracking-[0.14em] text-primary">Meta da equipe · {f.label}</p>
        <NumberInput money={f.money} value={net.team[f.key]} onSave={(v) => actions.setTeamGoal.mutate({ month, goals: { ...net.team, [f.key]: v } })} dark />
        <p className="mt-2 text-[11px] text-primary-foreground/70">Realizado {fmt(f.key, real[f.key])} · {pct(real[f.key], net.team[f.key])}%</p>
        <p className="text-[11px] text-primary-foreground/50">Soma individual {fmt(f.key, sum[f.key])}</p>
      </div>)}
    </div>}
    <div className="mt-5 divide-y divide-border">
      {units.length === 0 && <EmptyState title="Cadastre seu primeiro discípulo" text="As metas individuais aparecem aqui assim que você tiver discípulos na aba Minha equipe." />}
      {units.map((k) => {
        const g = net.goalOf(k.id);
        const t = net.ownTotals(k.id);
        const got: Goals = { oferta: t.oferta, membresia: t.membresia, cells: t.activeCells };
        return <div key={k.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex min-w-0 items-center gap-3"><Avatar name={net.unitName(k.id)} /><div className="min-w-0"><p className="truncate text-sm font-medium">{net.unitName(k.id)}{net.spouseOf(k.id) && <span className="ml-2 text-[10px] text-primary">meta conjunta</span>}</p><p className="text-[11px] text-muted-foreground">{GOAL_FIELDS.map((f) => `${f.label} ${fmt(f.key, got[f.key])}${g[f.key] ? ` (${pct(got[f.key], g[f.key])}%)` : ""}`).join(" · ")}</p></div></div>
          <div className="grid grid-cols-3 gap-2">{GOAL_FIELDS.map((f) => <label key={f.key} className="text-[10px] text-muted-foreground">{f.label}<NumberInput money={f.money} value={g[f.key]} onSave={(v) => actions.setGoal.mutate({ member_ids: net.unit(k.id), month, goals: { ...g, [f.key]: v } })} /></label>)}</div>
        </div>;
      })}
    </div>
  </section>;
}

function NumberInput({ value, onSave, dark, money }: { value: number; onSave: (v: number) => void; dark?: boolean | undefined; money?: boolean | undefined }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const r = z.coerce.number().min(0).max(10_000_000).safeParse(draft.replace(/\./g, "").replace(",", "."));
    if (r.success) { const v = money ? Math.round(r.data * 100) / 100 : Math.round(r.data); if (v !== value) onSave(v); }
    setDraft(null);
  };
  return <div className="relative mt-1 w-full min-w-24">{money && <span className={cn("absolute left-3 top-1/2 -translate-y-1/2 text-xs", dark ? "text-primary-foreground/60" : "text-muted-foreground")}>R$</span>}
    <Input inputMode="decimal" aria-label="Meta" value={draft ?? (money ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(value))} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()} className={cn("text-right", money && "pl-9", dark && "border-navy-soft bg-navy-deep text-primary-foreground")} />
  </div>;
}

// ---------------- Lançamentos ----------------
const entrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data"),
  kind: z.enum(["oferta", "terca", "arena", "familia"]),
  value: z.coerce.number({ message: "Informe um número" }).positive("Informe um valor maior que zero").max(1_000_000, "Valor muito alto"),
  note: z.string().trim().max(200, "Máximo de 200 caracteres"),
});

// ---------------- Visitantes nominais ----------------
const visitorSchema = z.object({ name: z.string().trim().min(2, "Informe o nome do visitante").max(100, "Nome muito longo"), phone: z.string().trim().max(30, "Telefone muito longo").regex(/^[\d\s()+-]*$/, "Telefone inválido") });

export function VisitorsField({ net, value, onChange }: { net: Network; value: VisitorInput[]; onChange: (v: VisitorInput[]) => void }) {
  const [d, setD] = useState({ name: "", phone: "" });
  const [error, setError] = useState("");
  const known = net.knownVisitors();
  function add() {
    const r = visitorSchema.safeParse(d);
    if (!r.success) { setError(r.error.issues[0]?.message ?? "Dados inválidos"); return; }
    const k = known.find((x) => x.name.toLowerCase() === r.data.name.toLowerCase());
    const v = { name: r.data.name, phone: r.data.phone || k?.phone || "" };
    if (value.some((x) => visitorKey(x) === visitorKey(v))) { setError("Este visitante já está na lista"); return; }
    setError(""); onChange([...value, v]); setD({ name: "", phone: "" });
  }
  return <div className="rounded-md border border-border p-3">
    <p className="text-[11px] font-medium text-muted-foreground">Visitantes ({value.length})</p>
    {value.length > 0 && <ul className="mt-2 space-y-1">{value.map((v, i) => <li key={i} className="flex items-center gap-2 rounded bg-secondary px-2 py-1 text-xs"><span className="flex-1 truncate">{v.name}{v.phone && <span className="text-muted-foreground"> · {v.phone}</span>}</span><button type="button" aria-label="Remover visitante" onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="size-3.5" /></button></li>)}</ul>}
    <div className="mt-2 grid grid-cols-[1fr_0.8fr_auto] gap-2">
      <Input list="known-visitors" placeholder="Nome do visitante" value={d.name} maxLength={100} onChange={(e) => { const name = e.target.value; const k = known.find((x) => x.name === name); setD((x) => ({ name, phone: k?.phone ?? x.phone })); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
      <Input inputMode="tel" placeholder="Telefone (opcional)" value={d.phone} maxLength={30} onChange={(e) => setD((x) => ({ ...x, phone: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
      <Button type="button" size="icon" variant="outline" aria-label="Adicionar visitante" onClick={add}><Plus className="size-4" /></Button>
    </div>
    <datalist id="known-visitors">{known.map((k) => <option key={visitorKey(k)} value={k.name} />)}</datalist>
    {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    <p className="mt-2 text-[10px] text-muted-foreground">A mesma pessoa em célula e cultos conta como 1 visitante no mês.</p>
  </div>;
}

export function EntryForm({ net, memberId, month, editing, actions, onDone }: { net: Network; memberId: string; month: string; editing?: Entry | null; actions: Actions; onDone?: () => void }) {
  const [people, setPeople] = useState<VisitorInput[]>(() => (editing ? net.visitsOf({ entry_id: editing.id }).map((v) => ({ name: v.name, phone: v.phone })) : []));
  const initialDate = editing?.date ?? (today().startsWith(month) ? today() : `${month}-01`);
  const [form, setForm] = useState({ date: initialDate, kind: (editing?.kind ?? "oferta") as EntryKind, value: editing ? String(editing.value) : "", note: editing?.note ?? "" });
  const [error, setError] = useState("");
  const isMoney = form.kind === "oferta";
  const busy = actions.addEntry.isPending || actions.updateEntry.isPending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = entrySchema.safeParse({ ...form, value: form.value.replace(/\./g, "").replace(",", ".") });
    if (!r.success) { setError(r.error.issues[0]?.message ?? "Dados inválidos"); return; }
    if (!isMoney && !Number.isInteger(r.data.value)) { setError("A arregimentação deve ser um número inteiro de pessoas"); return; }
    setError("");
    const after = { onSuccess: () => { setForm((f) => ({ ...f, value: "", note: "" })); setPeople([]); onDone?.(); } };
    if (editing) actions.updateEntry.mutate({ id: editing.id, member_id: editing.member_id, ...r.data, people: isMoney ? [] : people }, after);
    else actions.addEntry.mutate({ member_id: memberId, ...r.data, people: isMoney ? [] : people }, after);
  }

  return <form onSubmit={submit} className="space-y-3">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(Object.keys(KIND_LABEL) as EntryKind[]).map((k) => <button type="button" key={k} onClick={() => setForm((f) => ({ ...f, kind: k }))} className={cn("rounded-md border px-2 py-2.5 text-xs font-medium transition-colors", form.kind === k ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-accent")}>{KIND_LABEL[k]}</button>)}</div>
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-[11px] text-muted-foreground">Data<Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="mt-1" /></label>
      <label className="text-[11px] text-muted-foreground">{isMoney ? "Valor da oferta (R$)" : "Pessoas no culto"}<Input inputMode="decimal" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder={isMoney ? "0,00" : "0"} className="mt-1" /></label>
    </div>
    {!isMoney && <VisitorsField net={net} value={people} onChange={setPeople} />}
    <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Observação (opcional)" maxLength={200} />
    {!isMoney && <p className="text-[11px] text-muted-foreground">Na membresia, este culto conta {Math.round(MEMBRESIA_WEIGHT[form.kind as "terca"] * 100)}% do número informado.</p>}
    {error && <p className="text-xs text-destructive">{error}</p>}
    <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando..." : editing ? "Salvar alteração" : "Registrar lançamento"}</Button>
  </form>;
}

export function EntryList({ net, memberId, actions, onEdit }: { net: Network; memberId: string; actions?: Actions; onEdit?: (e: Entry) => void }) {
  const list = net.entriesOf(memberId);
  if (!list.length) return <p className="rounded-md bg-secondary p-4 text-center text-xs text-muted-foreground">Nenhum lançamento neste mês.</p>;
  return <div className="divide-y divide-border rounded-md border border-border">{list.map((e) => <div key={e.id} className="flex items-center gap-3 px-3 py-2.5">
    <div className="min-w-0 flex-1"><p className="text-sm font-medium">{KIND_LABEL[e.kind]}</p><p className="truncate text-[11px] text-muted-foreground">{net.spouseOf(memberId) && `${net.person(e.member_id)?.name.split(" ")[0]} · `}{e.date.split("-").reverse().join("/")}{e.note && ` · ${e.note}`}</p></div>
    <span className="text-sm font-bold text-navy">{e.kind === "oferta" ? brl(Number(e.value)) : `${Number(e.value)} pess.${e.visitors ? ` · ${e.visitors} visit.` : ""}`}</span>
    {actions && (!net.spouseOf(memberId) || e.member_id === memberId) && <><Button size="icon" variant="ghost" aria-label="Editar" onClick={() => onEdit?.(e)}><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => { if (window.confirm("Excluir este lançamento?")) actions.deleteEntry.mutate(e.id); }}><Trash2 className="size-4" /></Button></>}
  </div>)}</div>;
}

// ---------------- Cadastro de discípulos ----------------
const memberSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(100, "Nome muito longo"),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(255, "E-mail muito longo"),
});

export function TeamManager({ net, parentId, actions, onSelect }: { net: Network; parentId: string; actions: Actions; onSelect: (id: string) => void }) {
  const kids = net.childrenOf(parentId);
  const [pairing, setPairing] = useState<Member | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({ name: "", email: "" });
  const [error, setError] = useState("");
  const full = kids.length >= 12 && !editing;
  const busy = actions.addMember.isPending || actions.updateMember.isPending;

  function startEdit(m: Member) { setEditing(m); setForm({ name: m.name, email: m.email }); setError(""); }
  function reset() { setEditing(null); setForm({ name: "", email: "" }); setError(""); }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = memberSchema.safeParse(form);
    if (!r.success) { setError(r.error.issues[0]?.message ?? "Dados inválidos"); return; }
    if (editing) actions.updateMember.mutate({ id: editing.id, ...r.data }, { onSuccess: reset });
    else actions.addMember.mutate({ parent_id: parentId, ...r.data }, { onSuccess: reset });
  }

  return <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
    <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7">
      <h2 className="text-lg font-bold text-navy">{editing ? "Editar discípulo" : "Cadastrar discípulo"}</h2>
      <p className="mt-1 text-xs text-muted-foreground">Quando a pessoa criar a conta com este e-mail, ela entra automaticamente na sua equipe.</p>
      {full ? <p className="mt-5 rounded-md bg-primary-soft p-4 text-sm text-primary">Sua equipe já tem os 12 discípulos.</p> :
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block text-[11px] text-muted-foreground">Nome completo<Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={100} className="mt-1" /></label>
          <label className="block text-[11px] text-muted-foreground">E-mail<Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} maxLength={255} disabled={!!editing?.user_id} className="mt-1" /></label>
          {editing?.user_id && <p className="text-[11px] text-muted-foreground">O e-mail não pode ser alterado depois que a conta foi criada.</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2"><Button type="submit" className="flex-1" disabled={busy}><UserPlus className="size-4" />{busy ? "Salvando..." : editing ? "Salvar" : "Cadastrar"}</Button>{editing && <Button type="button" variant="outline" onClick={reset}>Cancelar</Button>}</div>
        </form>}
    </section>
    <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7">
      <div className="flex items-baseline justify-between"><h2 className="text-lg font-bold text-navy">Minha equipe</h2><span className="text-sm text-muted-foreground"><strong className="text-navy">{kids.length}</strong> / 12</span></div>
      {pairing && <p className="mt-3 rounded-md bg-primary-soft p-3 text-xs text-primary">Toque no coração do cônjuge de {pairing.name} para formar o casal. <button className="underline" onClick={() => setPairing(null)}>Cancelar</button></p>}
      {!pairing && kids.length > 1 && <p className="mt-2 text-[11px] text-muted-foreground">Use o coração para marcar dois discípulos como casal: meta conjunta e mesma equipe.</p>}
      <div className="mt-5 divide-y divide-border">
        {kids.length === 0 && <EmptyState title="Cadastre seu primeiro discípulo" text="Informe o nome e o e-mail de cada um dos seus 12." />}
        {kids.map((k) => <div key={k.id} className="flex items-center gap-3 py-3">
          <button onClick={() => onSelect(k.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><Avatar name={k.name} /><span className="min-w-0"><span className="flex flex-wrap items-center gap-2 text-sm font-medium">{k.name}{!k.user_id && <Pending />}</span><span className="block truncate text-[11px] text-muted-foreground">{k.spouse_id && `♥ ${net.person(k.spouse_id)?.name.split(" ")[0]} · `}{k.email} · {net.childrenOf(k.id).length} discípulos</span></span></button>
          {k.spouse_id ? <Button size="icon" variant="ghost" aria-label="Desfazer casal" title={`Casal com ${net.person(k.spouse_id)?.name ?? ""}`} onClick={() => { if (window.confirm("Desvincular este casal?")) actions.unlinkCouple.mutate(k.id); }}><HeartOff className="size-4 text-primary" /></Button>
            : <Button size="icon" variant={pairing?.id === k.id ? "secondary" : "ghost"} aria-label="Marcar como casal" title="Marcar como casal" onClick={() => { if (!pairing) setPairing(k); else if (pairing.id === k.id) setPairing(null); else { actions.linkCouple.mutate({ a: pairing.id, b: k.id }); setPairing(null); } }}><Heart className="size-4" /></Button>}
          <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => startEdit(k)}><Pencil className="size-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => { const n = net.subtreeSize(k.id); if (window.confirm(n ? `Remover ${k.name} e as ${n} pessoas da rede dele(a), com todos os lançamentos?` : `Remover ${k.name}?`)) actions.deleteMember.mutate(k.id); }}><Trash2 className="size-4" /></Button>
        </div>)}
      </div>
    </section>
  </div>;
}

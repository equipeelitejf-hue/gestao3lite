import { ChevronRight, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  KIND_LABEL, MEMBRESIA_WEIGHT, PEOPLE, person, actions, brl, childrenOf, initials, num, ownTotals, pathOf, pct, treeGoal, treeTotals, useNetwork,
  type Entry, type EntryKind, type Totals,
} from "@/lib/network";
import { cn } from "@/lib/utils";

const LEVEL_LABEL = ["Líder Principal", "Discípulo direto (12)", "Rede (144)"];

export function Bar({ value, className }: { value: number; className?: string }) {
  return <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, value)}%` }} /></div>;
}

export function Avatar({ name, strong }: { name: string; strong?: boolean }) {
  return <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-medium", strong ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground")}>{initials(name)}</span>;
}

// ---------------- Árvore ----------------
export function NetworkTree({ month, onSelect }: { month: string; onSelect: (id: string) => void }) {
  const s = useNetwork();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ root: true });
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => (q ? PEOPLE.filter((p) => p.name.toLowerCase().includes(q)) : []), [q]);

  function Row({ id, depth }: { id: string; depth: number }) {
    const p = person(id);
    const kids = childrenOf(id);
    const t = treeTotals(s, month, id);
    const goal = treeGoal(s, month, id);
    const isOpen = open[id];
    return <>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border py-3" style={{ paddingLeft: depth * 20 }}>
        <button disabled={!kids.length} onClick={() => setOpen((o) => ({ ...o, [id]: !o[id] }))} aria-label={isOpen ? "Recolher" : "Expandir"} className={cn("grid size-7 place-items-center rounded-md hover:bg-accent", !kids.length && "invisible")}>
          <ChevronRight className={cn("size-4 transition-transform", isOpen && "rotate-90")} />
        </button>
        <button onClick={() => onSelect(id)} className="flex min-w-0 items-center gap-3 text-left">
          <Avatar name={p.name} strong={p.level === 0} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2"><span className="truncate text-sm font-medium hover:text-primary">{p.name}</span>{kids.length > 0 && <span className="text-[10px] text-muted-foreground">{kids.length} discípulos</span>}</span>
            <Bar value={pct(t.oferta, goal)} className="mt-2 max-w-xs" />
          </span>
        </button>
        <div className="grid grid-cols-2 gap-4 text-right text-xs sm:grid-cols-3">
          <div className="hidden sm:block"><p className="font-medium">{brl(t.oferta)}</p><p className="text-[10px] text-muted-foreground">{pct(t.oferta, goal)}% da meta</p></div>
          <div><p className="font-medium">{num(t.arregimentacao)}</p><p className="text-[10px] text-muted-foreground">arregim.</p></div>
          <div><p className="font-bold text-primary">{num(t.membresia)}</p><p className="text-[10px] text-muted-foreground">membresia</p></div>
        </div>
      </div>
      {isOpen && kids.map((k) => <Row key={k.id} id={k.id} depth={depth + 1} />)}
    </>;
  }

  return <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><h2 className="text-lg font-bold text-navy">Rede 1 · 12 · 144</h2><p className="mt-1 text-xs text-muted-foreground">Cada linha soma o resultado da pessoa e de toda a rede abaixo dela.</p></div>
      <div className="relative sm:w-72"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar pessoa" className="pl-9" maxLength={60} /></div>
    </div>
    <div className="mt-5">
      {q ? (matches.length ? matches.slice(0, 30).map((p) => <button key={p.id} onClick={() => onSelect(p.id)} className="flex w-full items-center gap-3 border-b border-border py-3 text-left hover:bg-secondary"><Avatar name={p.name} /><span><span className="block text-sm font-medium">{p.name}</span><span className="block text-[11px] text-muted-foreground">{pathOf(p.id).map((x) => x.name).join(" › ")}</span></span></button>) : <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma pessoa encontrada.</p>)
        : <Row id="root" depth={0} />}
    </div>
  </section>;
}

// ---------------- Painel lateral ----------------
export function MemberSheet({ id, month, onClose }: { id: string | null; month: string; onClose: () => void }) {
  const s = useNetwork();
  const p = id ? person(id) : null;
  return <Sheet open={!!p} onOpenChange={(o) => !o && onClose()}>
    <SheetContent className="w-full overflow-y-auto sm:max-w-md">
      {p && <>
        <SheetHeader><SheetTitle className="text-navy">{p.name}</SheetTitle><SheetDescription>{LEVEL_LABEL[p.level]} · {pathOf(p.id).map((x) => x.name).join(" › ")}</SheetDescription></SheetHeader>
        <div className="mt-6 space-y-5 px-4 pb-6">
          <StatsBlock title="Resultado próprio" t={ownTotals(s, month, p.id)} goal={s.personalGoals[month]?.[p.id] ?? 0} />
          {childrenOf(p.id).length > 0 && <StatsBlock title="Com a rede abaixo" t={treeTotals(s, month, p.id)} goal={treeGoal(s, month, p.id)} />}
          <div><p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Lançamentos do mês</p><EntryList personId={p.id} month={month} /></div>
        </div>
      </>}
    </SheetContent>
  </Sheet>;
}

function StatsBlock({ title, t, goal }: { title: string; t: Totals; goal: number }) {
  return <div className="rounded-md border border-border p-4">
    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
    <div className="mt-3 flex items-end justify-between"><div><p className="text-xl font-bold text-navy">{brl(t.oferta)}</p><p className="text-[11px] text-muted-foreground">Parceiro de Deus · meta {brl(goal)}</p></div><span className="text-sm font-bold text-primary">{pct(t.oferta, goal)}%</span></div>
    <Bar value={pct(t.oferta, goal)} className="mt-3" />
    <div className="mt-4 grid grid-cols-4 gap-2 text-center">{(["terca", "arena", "familia"] as const).map((k) => <div key={k} className="rounded-md bg-secondary p-2"><p className="text-sm font-bold">{t[k]}</p><p className="text-[9px] leading-tight text-muted-foreground">{KIND_LABEL[k]}</p></div>)}<div className="rounded-md bg-primary-soft p-2"><p className="text-sm font-bold text-primary">{num(t.membresia)}</p><p className="text-[9px] text-muted-foreground">Membresia</p></div></div>
  </div>;
}

// ---------------- Metas ----------------
export function GoalsEditor({ month, parentId, teamLevel }: { month: string; parentId: string; teamLevel?: boolean }) {
  const s = useNetwork();
  const kids = childrenOf(parentId);
  const teamGoal = s.teamGoals[month] ?? 0;
  const sumGoals = kids.reduce((a, k) => a + treeGoal(s, month, k.id), 0);
  const realized = kids.reduce((a, k) => a + treeTotals(s, month, k.id).oferta, 0);
  return <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7">
    <h2 className="text-lg font-bold text-navy">Metas Parceiro de Deus</h2>
    <p className="mt-1 text-xs text-muted-foreground">Na virada do mês, cada discípulo define a meta dele junto com o líder direto.</p>
    {teamLevel && <div className="mt-5 grid gap-4 rounded-md bg-navy p-5 text-primary-foreground sm:grid-cols-3">
      <div><p className="text-[11px] uppercase tracking-[0.14em] text-primary">Meta da equipe</p><MoneyInput value={teamGoal} onSave={(v) => actions.setTeamGoal(month, v)} dark /></div>
      <div><p className="text-[11px] uppercase tracking-[0.14em] text-primary-foreground/60">Soma das metas individuais</p><p className="mt-2 text-xl font-bold">{brl(sumGoals)}</p><p className={cn("text-[11px]", sumGoals >= teamGoal ? "text-primary" : "text-primary-foreground/60")}>{sumGoals >= teamGoal ? "Cobre a meta da equipe" : `Faltam ${brl(teamGoal - sumGoals)}`}</p></div>
      <div><p className="text-[11px] uppercase tracking-[0.14em] text-primary-foreground/60">Realizado</p><p className="mt-2 text-xl font-bold">{brl(realized)}</p><Bar value={pct(realized, teamGoal)} className="mt-2 bg-navy-soft" /></div>
    </div>}
    <div className="mt-5 divide-y divide-border">
      {kids.map((k) => {
        const own = s.personalGoals[month]?.[k.id] ?? 0;
        const tree = treeGoal(s, month, k.id);
        const done = ownTotals(s, month, k.id).oferta;
        return <div key={k.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3">
          <Avatar name={k.name} />
          <div className="min-w-0"><p className="truncate text-sm font-medium">{k.name}</p><p className="text-[11px] text-muted-foreground">Realizado {brl(done)} · {pct(done, own)}%{childrenOf(k.id).length ? ` · com a rede ${brl(tree)}` : ""}</p></div>
          <MoneyInput value={own} onSave={(v) => actions.setPersonalGoal(month, k.id, v)} />
        </div>;
      })}
    </div>
  </section>;
}

function MoneyInput({ value, onSave, dark }: { value: number; onSave: (v: number) => void; dark?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const r = z.coerce.number().min(0).max(10_000_000).safeParse(draft.replace(",", "."));
    if (r.success) onSave(Math.round(r.data));
    setDraft(null);
  };
  return <div className="relative mt-1 w-32"><span className={cn("absolute left-3 top-1/2 -translate-y-1/2 text-xs", dark ? "text-primary-foreground/60" : "text-muted-foreground")}>R$</span>
    <Input inputMode="decimal" aria-label="Meta em reais" value={draft ?? String(value)} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} className={cn("pl-9 text-right", dark && "border-navy-soft bg-navy-deep text-primary-foreground")} />
  </div>;
}

// ---------------- Lançamentos ----------------
const entrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data"),
  kind: z.enum(["oferta", "terca", "arena", "familia"]),
  value: z.coerce.number({ message: "Informe um número" }).positive("Informe um valor maior que zero").max(1_000_000, "Valor muito alto"),
  note: z.string().trim().max(200, "Máximo de 200 caracteres"),
});

export function EntryForm({ personId, month, editing, onDone }: { personId: string; month: string; editing?: Entry | null; onDone?: (msg: string) => void }) {
  const initial = editing ?? null;
  const [form, setForm] = useState({ date: initial?.date ?? `${month}-15`, kind: (initial?.kind ?? "oferta") as EntryKind, value: initial ? String(initial.value) : "", note: initial?.note ?? "" });
  const [error, setError] = useState("");
  const isMoney = form.kind === "oferta";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = entrySchema.safeParse({ ...form, value: form.value.replace(",", ".") });
    if (!r.success) { setError(r.error.issues[0]?.message ?? "Dados inválidos"); return; }
    if (!isMoney && !Number.isInteger(r.data.value)) { setError("A arregimentação deve ser um número inteiro de pessoas"); return; }
    const data = { ...r.data, personId };
    if (initial) actions.updateEntry(initial.id, data); else actions.addEntry(data);
    setError("");
    setForm((f) => ({ ...f, value: "", note: "" }));
    onDone?.(initial ? "Lançamento atualizado." : "Lançamento registrado.");
  }

  return <form onSubmit={submit} className="space-y-3">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(Object.keys(KIND_LABEL) as EntryKind[]).map((k) => <button type="button" key={k} onClick={() => setForm((f) => ({ ...f, kind: k }))} className={cn("rounded-md border px-2 py-2.5 text-xs font-medium transition-colors", form.kind === k ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-accent")}>{KIND_LABEL[k]}</button>)}</div>
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
      <label className="text-[11px] text-muted-foreground">Data<Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="mt-1" /></label>
      <label className="text-[11px] text-muted-foreground">{isMoney ? "Valor da oferta (R$)" : "Pessoas no culto"}<Input inputMode="decimal" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder={isMoney ? "0,00" : "0"} className="mt-1" /></label>
    </div>
    <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Observação (opcional)" maxLength={200} />
    {!isMoney && <p className="text-[11px] text-muted-foreground">Na membresia, este culto conta {Math.round(MEMBRESIA_WEIGHT[form.kind as "terca"] * 100)}% do número informado.</p>}
    {error && <p className="text-xs text-destructive">{error}</p>}
    <Button type="submit" className="w-full">{initial ? "Salvar alteração" : "Registrar lançamento"}</Button>
  </form>;
}

export function EntryList({ personId, month, editable, onEdit, onNotice }: { personId: string; month: string; editable?: boolean; onEdit?: (e: Entry) => void; onNotice?: (m: string) => void }) {
  const s = useNetwork();
  const list = s.entries.filter((e) => e.personId === personId && e.month === month).sort((a, b) => b.date.localeCompare(a.date));
  if (!list.length) return <p className="rounded-md bg-secondary p-4 text-center text-xs text-muted-foreground">Nenhum lançamento neste mês.</p>;
  return <div className="divide-y divide-border rounded-md border border-border">{list.map((e) => <div key={e.id} className="flex items-center gap-3 px-3 py-2.5">
    <div className="min-w-0 flex-1"><p className="text-sm font-medium">{KIND_LABEL[e.kind]}</p><p className="truncate text-[11px] text-muted-foreground">{e.date.split("-").reverse().join("/")}{e.note && ` · ${e.note}`}</p></div>
    <span className="text-sm font-bold text-navy">{e.kind === "oferta" ? brl(e.value) : `${e.value} pess.`}</span>
    {editable && <><Button size="icon" variant="ghost" aria-label="Editar" onClick={() => onEdit?.(e)}><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => { actions.deleteEntry(e.id); onNotice?.("Lançamento excluído."); }}><Trash2 className="size-4" /></Button></>}
  </div>)}</div>;
}

import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleUserRound,
  Clock3,
  Download,
  Goal,
  Home,
  Menu,
  Plus,
  Target,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EntryForm, EntryList, GoalsEditor, MemberSheet, NetworkTree, Bar, Avatar } from "@/components/network-panels";
import { CURRENT_MONTH, MONTHS, PEOPLE, PERSON, actions, brl, childrenOf, loadSaved, num, ownTotals, pct, treeGoal, treeTotals, useNetwork, type Entry, KIND_LABEL } from "@/lib/network";

import logoBlue from "@/assets/logotipo-azul.svg.asset.json";
import symbolOrange from "@/assets/simbolo-laranja.svg.asset.json";
import symbolWhite from "@/assets/simbolo-branco.svg.asset.json";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Profile = "leader" | "disciple";
type Tab = "overview" | "network" | "goals" | "entries";

const TABS: Record<Profile, { id: Tab; label: string; icon: typeof Home }[]> = {
  leader: [
    { id: "overview", label: "Visão geral", icon: Home },
    { id: "network", label: "Rede", icon: UsersRound },
    { id: "goals", label: "Metas", icon: Target },
  ],
  disciple: [
    { id: "overview", label: "Visão geral", icon: Home },
    { id: "entries", label: "Lançamentos", icon: Plus },
    { id: "goals", label: "Metas da equipe", icon: Target },
    { id: "network", label: "Minha rede", icon: UsersRound },
  ],
};

export function MinisterialDashboard() {
  const [profile, setProfile] = useState<Profile>("leader");
  const [discipleId, setDiscipleId] = useState("d1");
  const [tab, setTab] = useState<Tab>("overview");
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [selected, setSelected] = useState<string | null>(null);
  const [splashVisible, setSplashVisible] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const s = useNetwork();

  useEffect(() => {
    loadSaved();
    const timer = window.setTimeout(() => setSplashVisible(false), 1750);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const user = useMemo(() => {
    if (profile === "leader") return { name: "Pr. Gabriel", role: "Líder Principal", initials: "GG" };
    const p = PERSON[discipleId];
    return { name: p.name, role: p.level === 1 ? "Discípulo direto" : "Discípulo (rede)", initials: p.name.split(" ").map((x) => x[0]).join("").slice(0, 2) };
  }, [profile, discipleId]);

  function changeProfile(next: Profile) {
    setProfile(next);
    setTab("overview");
    setProfileOpen(false);
    setMobileMenu(false);
  }

  function exportReport() {
    const rows = ["Nome,Nível,Parceiro de Deus (meta),Parceiro de Deus (realizado),Terça da Fé,Arena,Culto da Família,Membresia"];
    for (const p of PEOPLE) {
      const t = ownTotals(s, month, p.id);
      rows.push([`"${p.name}"`, p.level, s.personalGoals[month]?.[p.id] ?? 0, t.oferta, t.terca, t.arena, t.familia, t.membresia].join(","));
    }
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-ministerial-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Relatório mensal exportado com sucesso.");
  }

  const tabs = TABS[profile];
  const selfId = profile === "leader" ? "root" : discipleId;
  const discipleOptions = PEOPLE.filter((p) => p.level > 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={cn("fixed inset-0 z-50 grid place-items-center bg-navy transition-all duration-700", splashVisible ? "visible opacity-100" : "invisible scale-105 opacity-0")} aria-hidden={!splashVisible}>
        <div className="flex flex-col items-center gap-7">
          <img src={symbolWhite.url} alt="" className="splash-symbol h-28 w-auto sm:h-36" />
          <div className="h-px w-20 overflow-hidden bg-navy-soft"><div className="splash-line h-full bg-primary" /></div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary-foreground/70">Gestão ministerial</p>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button className="lg:hidden" onClick={() => setMobileMenu(true)} aria-label="Abrir menu"><Menu className="size-6" /></button>
          <img src={logoBlue.url} alt="3Lite Supernova" className="h-11 w-auto" />
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <select aria-label="Mês" value={month} onChange={(e) => setMonth(e.target.value)} className="hidden h-11 rounded-md border border-input bg-card px-3 text-xs font-medium sm:block">
              {MONTHS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <div className="relative">
              <Button variant="outline" className="h-11 min-w-[172px] justify-between px-3" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen}>
                <span className="flex min-w-0 items-center gap-2.5"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy text-[10px] text-primary-foreground">{user.initials}</span><span className="truncate text-left"><span className="block text-xs font-medium">{user.name}</span><span className="block text-[10px] font-book text-muted-foreground">{user.role}</span></span></span>
                <ChevronDown className={cn("size-4 transition-transform", profileOpen && "rotate-180")} />
              </Button>
              {profileOpen && <div className="absolute right-0 top-12 z-40 w-72 rounded-md border border-border bg-card p-2 shadow-xl">
                <p className="px-3 pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Visualizar como</p>
                <ProfileOption active={profile === "leader"} title="Líder Principal" subtitle="Visão consolidada" onClick={() => changeProfile("leader")} />
                <ProfileOption active={profile === "disciple"} title="Discípulo" subtitle="Progresso individual" onClick={() => changeProfile("disciple")} />
                {profile === "disciple" && <DiscipleSelect value={discipleId} options={discipleOptions} onChange={(v) => { setDiscipleId(v); setTab("overview"); }} />}
              </div>}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <Sidebar tabs={tabs} tab={tab} onTab={setTab} month={month} onReset={() => { actions.reset(); setNotice("Dados de demonstração restaurados."); }} />
        <main className="min-w-0 flex-1 px-4 pb-28 pt-7 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          <select aria-label="Mês" value={month} onChange={(e) => setMonth(e.target.value)} className="mb-5 h-10 w-full rounded-md border border-input bg-card px-3 text-sm sm:hidden">
            {MONTHS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          {tab === "overview" && (profile === "leader" ? <LeaderView month={month} onExport={exportReport} onSelect={setSelected} onTab={setTab} /> : <DiscipleView id={discipleId} month={month} onTab={setTab} />)}
          {tab === "network" && <div className="animate-fade-in"><NetworkTreeFor id={selfId} month={month} onSelect={setSelected} /></div>}
          {tab === "goals" && <div className="animate-fade-in space-y-6">
            {childrenOf(selfId).length ? <GoalsEditor month={month} parentId={selfId} teamLevel={profile === "leader"} /> : <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Você ainda não tem discípulos para definir metas.</p>}
          </div>}
          {tab === "entries" && <EntriesView id={discipleId} month={month} onNotice={setNotice} />}
        </main>
      </div>

      <nav className={cn("fixed inset-x-0 bottom-0 z-30 grid h-20 border-t border-border bg-card px-2 pb-[env(safe-area-inset-bottom)] lg:hidden", tabs.length === 4 ? "grid-cols-4" : "grid-cols-3")}>
        {tabs.map((t) => <MobileNav key={t.id} icon={t.icon} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />)}
      </nav>

      {mobileMenu && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-overlay" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} /><div className="relative h-full w-[82%] max-w-xs overflow-y-auto bg-card p-6 shadow-2xl"><div className="mb-10 flex items-center justify-between"><img src={logoBlue.url} alt="3Lite Supernova" className="h-12 w-auto" /><Button size="icon" variant="ghost" onClick={() => setMobileMenu(false)} aria-label="Fechar"><X className="size-5" /></Button></div><p className="mb-3 text-xs font-medium uppercase text-muted-foreground">Alternar perfil</p><div className="space-y-2"><ProfileOption active={profile === "leader"} title="Líder Principal" subtitle="Visão consolidada" onClick={() => changeProfile("leader")} /><ProfileOption active={profile === "disciple"} title="Discípulo" subtitle="Progresso individual" onClick={() => changeProfile("disciple")} />{profile === "disciple" && <DiscipleSelect value={discipleId} options={discipleOptions} onChange={(v) => { setDiscipleId(v); setTab("overview"); setMobileMenu(false); }} />}</div><Button variant="outline" className="mt-8 w-full" onClick={() => { actions.reset(); setNotice("Dados de demonstração restaurados."); }}>Restaurar dados de demonstração</Button></div></div>}

      <MemberSheet id={selected} month={month} onClose={() => setSelected(null)} />

      {notice && <div role="status" className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-md bg-navy px-4 py-3 text-sm text-primary-foreground shadow-xl lg:bottom-7"><Check className="size-4 text-primary" />{notice}</div>}
    </div>
  );
}

function DiscipleSelect({ value, options, onChange }: { value: string; options: typeof PEOPLE; onChange: (v: string) => void }) {
  return <label className="mt-2 block px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Simular discípulo
    <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-card px-2 text-xs normal-case tracking-normal text-foreground">
      <optgroup label="Discípulos diretos (12)">{options.filter((o) => o.level === 1).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</optgroup>
      <optgroup label="Rede (144)">{options.filter((o) => o.level === 2).map((o) => <option key={o.id} value={o.id}>{o.name} — equipe de {PERSON[o.parentId!].name}</option>)}</optgroup>
    </select>
  </label>;
}

function NetworkTreeFor({ id, month, onSelect }: { id: string; month: string; onSelect: (id: string) => void }) {
  if (id === "root") return <NetworkTree month={month} onSelect={onSelect} />;
  return <SubTeam id={id} month={month} onSelect={onSelect} />;
}

function SubTeam({ id, month, onSelect }: { id: string; month: string; onSelect: (id: string) => void }) {
  const s = useNetwork();
  const kids = childrenOf(id);
  return <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7">
    <SectionHeading title="Minha rede" subtitle={kids.length ? `${kids.length} discípulos abaixo de você` : "Você ainda não tem discípulos"} />
    <div className="mt-5 divide-y divide-border">{kids.map((k) => { const t = treeTotals(s, month, k.id); const g = treeGoal(s, month, k.id); return <button key={k.id} onClick={() => onSelect(k.id)} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 py-3 text-left hover:bg-secondary"><Avatar name={k.name} /><div className="min-w-0"><p className="truncate text-sm font-medium">{k.name}</p><Bar value={pct(t.oferta, g)} className="mt-2 max-w-xs" /></div><div className="text-right text-xs"><p className="font-medium">{brl(t.oferta)}</p><p className="text-primary">{num(t.membresia)} membresia</p></div></button>; })}</div>
  </section>;
}

function LeaderView({ month, onExport, onSelect, onTab }: { month: string; onExport: () => void; onSelect: (id: string) => void; onTab: (t: Tab) => void }) {
  const s = useNetwork();
  const t = treeTotals(s, month, "root");
  const teamGoal = s.teamGoals[month] ?? 0;
  const directs = childrenOf("root").map((p) => ({ p, t: treeTotals(s, month, p.id), g: treeGoal(s, month, p.id) })).sort((a, b) => b.t.membresia - a.t.membresia);
  const recent = [...s.entries].filter((e) => e.month === month).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 6);
  const cards = [
    { label: "Parceiro de Deus", value: brl(t.oferta), note: `${pct(t.oferta, teamGoal)}% da meta de ${brl(teamGoal)}`, icon: Goal },
    { label: "Arregimentação", value: num(t.arregimentacao), note: `${t.terca} Terça · ${t.arena} Arena · ${t.familia} Família`, icon: UsersRound },
    { label: "Membresia", value: num(t.membresia), note: "30% Terça + 50% Arena + 100% Família", icon: TrendingUp },
    { label: "Rede ministerial", value: String(PEOPLE.length - 1), note: "12 diretos · 144 na rede", icon: UserRound },
  ];
  return <div className="animate-fade-in">
    <PageHeading eyebrow="Painel do líder" title="Olá, Pr. Gabriel" description="Os resultados de toda a rede são somados automaticamente." action={<Button onClick={onExport}><Download className="size-4" />Exportar relatório</Button>} />
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((item) => <SummaryCard key={item.label} {...item} />)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
      <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7">
        <SectionHeading title="Meus 12" subtitle="Ordenados pela membresia da rede de cada um" action="Ver rede completa" onAction={() => onTab("network")} />
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-md bg-secondary p-4 sm:p-6">
          <HierarchyNode value="1" label="Líder" featured /><div className="hierarchy-line" /><HierarchyNode value="12" label="Diretos" /><div className="hierarchy-line" /><HierarchyNode value="144" label="Rede" />
        </div>
        <div className="mt-4 divide-y divide-border">{directs.map(({ p, t: dt, g }) => <button key={p.id} onClick={() => onSelect(p.id)} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 py-3 text-left hover:bg-secondary"><Avatar name={p.name} /><div className="min-w-0"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium">{p.name}</p><span className="text-xs text-muted-foreground">{pct(dt.oferta, g)}%</span></div><Bar value={pct(dt.oferta, g)} className="mt-2" /></div><span className="w-20 text-right text-xs"><strong className="block text-primary">{num(dt.membresia)}</strong><span className="text-[10px] text-muted-foreground">membresia</span></span></button>)}</div>
      </section>
      <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7"><SectionHeading title="Lançamentos recentes" subtitle="Movimento da rede no mês" /><div className="mt-6 space-y-5">{recent.length ? recent.map((e) => <div key={e.id} className="flex gap-3"><div className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Clock3 className="size-3.5" /></div><div><p className="text-sm leading-5"><span className="font-medium">{PERSON[e.personId].name}</span> lançou {e.kind === "oferta" ? brl(e.value) : `${e.value} pessoas`}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"><span>{e.date.split("-").reverse().join("/")}</span><span className="size-1 rounded-full bg-border" /><span>{KIND_LABEL[e.kind]}</span></div></div></div>) : <p className="text-sm text-muted-foreground">Sem lançamentos neste mês.</p>}</div></section>
    </div>
  </div>;
}

function DiscipleView({ id, month, onTab }: { id: string; month: string; onTab: (t: Tab) => void }) {
  const s = useNetwork();
  const p = PERSON[id];
  const own = ownTotals(s, month, id);
  const goal = s.personalGoals[month]?.[id] ?? 0;
  const progress = pct(own.oferta, goal);
  const kids = childrenOf(id);
  const tree = treeTotals(s, month, id);
  return <div className="animate-fade-in">
    <PageHeading eyebrow="Meu painel" title={`Olá, ${p.name.split(" ")[0]}`} description={`Líder direto: ${PERSON[p.parentId!].name}`} action={<Button onClick={() => onTab("entries")}><Plus className="size-4" />Novo lançamento</Button>} />
    <section className="relative mt-8 overflow-hidden rounded-lg bg-navy p-6 text-primary-foreground sm:p-8">
      <img src={symbolOrange.url} alt="" className="absolute -bottom-20 -right-8 h-72 w-auto opacity-10" />
      <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Parceiro de Deus</p><h2 className="mt-3 text-2xl font-bold sm:text-3xl">{own.oferta >= goal ? "Meta do mês alcançada!" : `Faltam ${brl(goal - own.oferta)} para sua meta`}</h2><p className="mt-2 max-w-xl font-book text-sm leading-6 text-primary-foreground/65">Meta definida com seu líder na virada do mês.</p><div className="mt-6 h-2 max-w-xl overflow-hidden rounded-full bg-navy-soft"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, progress)}%` }} /></div><div className="mt-3 flex max-w-xl justify-between text-xs"><span>{progress}% concluído</span><span className="text-primary-foreground/60">{brl(own.oferta)} de {brl(goal)}</span></div></div>
        <div className="grid size-28 place-items-center rounded-full border-[10px] border-primary bg-navy-deep"><div className="text-center"><strong className="block text-2xl font-bold">{progress}%</strong><span className="text-[10px] text-primary-foreground/60">da meta</span></div></div>
      </div>
    </section>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.8fr]">
      <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7"><SectionHeading title="Arregimentação e membresia" subtitle="Pessoas que você levou a cada culto no mês" />
        <div className="mt-6 space-y-3">{([["terca", 30], ["arena", 50], ["familia", 100]] as const).map(([k, w]) => <div key={k} className="flex items-center justify-between rounded-md border border-border p-4"><div><p className="text-sm font-medium">{KIND_LABEL[k]}</p><p className="mt-1 text-xs text-muted-foreground">Conta {w}% na membresia</p></div><div className="text-right"><strong className="text-xl text-navy">{own[k]}</strong><p className="text-[11px] text-primary">+{num(own[k] * w / 100)} membresia</p></div></div>)}
          <div className="flex items-center justify-between rounded-md bg-primary-soft p-4"><p className="text-sm font-bold">Membresia do mês</p><strong className="text-2xl text-primary">{num(own.membresia)}</strong></div>
        </div>
      </section>
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-6"><SectionHeading title="Minha equipe" subtitle={kids.length ? "Discípulos abaixo de você" : "Você ainda não tem discípulos"} action={kids.length ? "Ver" : undefined} onAction={() => onTab("network")} /><div className="mt-5 flex items-end justify-between"><div><strong className="text-4xl font-bold text-navy">{kids.length}</strong><span className="text-lg text-muted-foreground"> / 12</span><p className="mt-1 text-xs text-muted-foreground">discípulos</p></div><div className="flex -space-x-2">{kids.slice(0, 3).map((k) => <span key={k.id} className="grid size-9 place-items-center rounded-full border-2 border-card bg-accent text-[10px] font-medium">{k.name.split(" ").map((x) => x[0]).join("")}</span>)}{kids.length > 3 && <span className="grid size-9 place-items-center rounded-full border-2 border-card bg-accent text-[10px] font-medium">+{kids.length - 3}</span>}</div></div></section>
        {kids.length > 0 && <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-6"><SectionHeading title="Com a minha rede" subtitle="Seu resultado somado ao da sua equipe" /><div className="mt-5 grid grid-cols-2 gap-3"><MiniStat value={brl(tree.oferta)} label="Parceiro de Deus" /><MiniStat value={num(tree.membresia)} label="Membresia" /></div></section>}
      </div>
    </div>
  </div>;
}

function EntriesView({ id, month, onNotice }: { id: string; month: string; onNotice: (m: string) => void }) {
  const [editing, setEditing] = useState<Entry | null>(null);
  return <div className="animate-fade-in">
    <PageHeading eyebrow="Lançamentos" title="Registrar resultados" description="Cada lançamento atualiza na hora os totais de toda a rede acima de você." action={null} />
    <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7"><SectionHeading title={editing ? "Editar lançamento" : "Novo lançamento"} subtitle="Oferta Parceiro de Deus ou arregimentação por culto" action={editing ? "Cancelar" : undefined} onAction={() => setEditing(null)} /><div className="mt-5"><EntryForm key={editing?.id ?? `new-${id}-${month}`} personId={id} month={month} editing={editing} onDone={(m) => { setEditing(null); onNotice(m); }} /></div></section>
      <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7"><SectionHeading title="Meu histórico" subtitle={MONTHS.find((m) => m.id === month)?.label ?? month} /><div className="mt-5"><EntryList personId={id} month={month} editable onEdit={setEditing} onNotice={onNotice} /></div></section>
    </div>
  </div>;
}

function Sidebar({ tabs, tab, onTab, month, onReset }: { tabs: { id: Tab; label: string; icon: typeof Home }[]; tab: Tab; onTab: (t: Tab) => void; month: string; onReset: () => void }) {
  return <aside className="sticky top-[76px] hidden h-[calc(100vh-76px)] w-64 shrink-0 border-r border-border bg-card px-4 py-8 lg:flex lg:flex-col"><p className="px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Menu principal</p><nav className="mt-4 space-y-1">{tabs.map((item) => <Button key={item.id} variant={tab === item.id ? "secondary" : "ghost"} className={cn("w-full justify-start", tab === item.id && "text-primary")} onClick={() => onTab(item.id)}><item.icon className="size-4" />{item.label}</Button>)}</nav><div className="mt-auto rounded-md bg-navy p-4 text-primary-foreground"><img src={symbolWhite.url} alt="" className="mb-4 h-8 w-auto opacity-90" /><p className="text-xs font-medium">{MONTHS.find((m) => m.id === month)?.label}</p><p className="mt-1 text-[11px] font-book text-primary-foreground/60">Dados de demonstração salvos neste navegador.</p><button onClick={onReset} className="mt-3 text-[11px] font-medium text-primary hover:underline">Restaurar dados</button></div></aside>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action: React.ReactNode }) { return <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p><h1 className="mt-2 text-3xl font-bold text-navy sm:text-4xl">{title}</h1><p className="mt-2 font-book text-sm text-muted-foreground sm:text-base">{description}</p></div><div className="self-start sm:self-auto">{action}</div></div>; }
function SectionHeading({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) { return <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-bold text-navy sm:text-lg">{title}</h2><p className="mt-1 text-xs font-book text-muted-foreground">{subtitle}</p></div>{action && <button onClick={onAction} className="text-xs font-medium text-primary hover:underline">{action}</button>}</div>; }
function SummaryCard({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof UsersRound }) { return <article className="rounded-lg border border-border bg-card p-5 shadow-card transition-transform hover:-translate-y-0.5"><div className="flex items-start justify-between"><p className="text-xs font-medium text-muted-foreground">{label}</p><span className="grid size-9 place-items-center rounded-md bg-primary-soft text-primary"><Icon className="size-4" /></span></div><strong className="mt-4 block text-3xl font-bold text-navy">{value}</strong><p className="mt-2 text-[11px] text-muted-foreground">{note}</p></article>; }
function HierarchyNode({ value, label, featured }: { value: string; label: string; featured?: boolean }) { return <div className="text-center"><span className={cn("mx-auto grid size-12 place-items-center rounded-full text-sm font-bold sm:size-14", featured ? "bg-primary text-primary-foreground" : "bg-card text-navy shadow-sm")}>{value}</span><p className="mt-2 text-[10px] font-medium uppercase text-muted-foreground">{label}</p></div>; }
function MiniStat({ value, label }: { value: string; label: string }) { return <div className="rounded-md bg-secondary p-3"><strong className="text-xl font-bold text-navy">{value}</strong><p className="mt-1 text-[10px] text-muted-foreground">{label}</p></div>; }
function ProfileOption({ active, title, subtitle, onClick }: { active: boolean; title: string; subtitle: string; onClick: () => void }) { return <button onClick={onClick} className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent", active && "bg-secondary")}><span className={cn("grid size-8 place-items-center rounded-full", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><UserRound className="size-4" /></span><span className="flex-1"><span className="block text-xs font-medium">{title}</span><span className="block text-[10px] text-muted-foreground">{subtitle}</span></span>{active && <Check className="size-4 text-primary" />}</button>; }
function MobileNav({ icon: Icon, label, active, onClick }: { icon: typeof Home; label: string; active?: boolean; onClick?: () => void }) { return <button onClick={onClick} className={cn("flex flex-col items-center justify-center gap-1 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}><Icon className="size-5" />{label}</button>; }

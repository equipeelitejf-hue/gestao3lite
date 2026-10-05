import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown, Clock3, Download, Goal, Home, MapPin as Home2, LogOut, Menu, Plus, Target, TrendingUp, UserPlus, UserRound, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import logoBlue from "@/assets/logotipo-azul.svg.asset.json";
import symbolOrange from "@/assets/simbolo-laranja.svg.asset.json";
import symbolWhite from "@/assets/simbolo-branco.svg.asset.json";
import { Avatar, Bar, EmptyState, EntryForm, EntryList, GoalsEditor, MemberSheet, NetworkTree, TeamManager, levelLabel } from "@/components/network-panels";
import { CellsView, CoLeaderCard } from "@/components/cells-panel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { KIND_LABEL, brl, currentMonth, initials, monthLabel, monthOptions, num, pct, useActions, useMe, useNetwork, type Actions, type Entry, type Member, type Network } from "@/lib/network";
import { cn } from "@/lib/utils";

type Tab = "overview" | "entries" | "team" | "goals" | "network" | "cells";
const TABS: { id: Tab; label: string; short: string; icon: typeof Home }[] = [
  { id: "overview", label: "Visão geral", short: "Início", icon: Home },
  { id: "entries", label: "Lançamentos", short: "Lançar", icon: Plus },
  { id: "cells", label: "Células", short: "Células", icon: Home2 },
  { id: "team", label: "Minha equipe", short: "Equipe", icon: UserPlus },
  { id: "goals", label: "Metas", short: "Metas", icon: Target },
  { id: "network", label: "Rede", short: "Rede", icon: UsersRound },
];

export function MinisterialDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [month, setMonth] = useState(currentMonth);
  const [selected, setSelected] = useState<string | null>(null);
  const [splashVisible, setSplashVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const months = useMemo(monthOptions, []);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const me = useMe();
  const member = me.data?.member ?? null;
  const netQ = useNetwork(month, !!member);
  const net = netQ.data;
  const actions = useActions(setNotice);

  useEffect(() => {
    const timer = window.setTimeout(() => setSplashVisible(false), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function exportReport() {
    if (!net || !member) return;
    const rows = ["Nome,E-mail,Nível,Meta Parceiro de Deus,Parceiro de Deus,Terça da Fé,Arena,Culto da Família,Membresia"];
    for (const p of net.members) {
      const t = net.ownTotals(p.id);
      rows.push([`"${p.name.replace(/"/g, "'")}"`, p.email, levelLabel(p.level), net.goalOf(p.id).oferta, t.oferta, t.terca, t.arena, t.familia, t.membresia].join(","));
    }
    const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-ministerial-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Relatório exportado.");
  }

  const splash = <div className={cn("fixed inset-0 z-50 grid place-items-center bg-navy transition-all duration-700", splashVisible ? "visible opacity-100" : "invisible scale-105 opacity-0")} aria-hidden={!splashVisible}>
    <div className="flex flex-col items-center gap-7">
      <img src={symbolWhite.url} alt="" className="splash-symbol h-28 w-auto sm:h-36" />
      <div className="h-px w-20 overflow-hidden bg-navy-soft"><div className="splash-line h-full bg-primary" /></div>
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary-foreground/70">Gestão ministerial</p>
    </div>
  </div>;

  if (me.isError) return <CenterMessage title="Não foi possível carregar seus dados" text="Verifique sua conexão e tente novamente." action={<Button onClick={() => me.refetch()}>Tentar novamente</Button>} />;
  if (me.data && !member) return <>{splash}<CenterMessage title="Aguardando convite" text={`O e-mail ${me.data.email} ainda não foi cadastrado por nenhum líder. Peça ao seu líder para cadastrar você com este e-mail e depois entre novamente.`} action={<div className="flex justify-center gap-2"><Button onClick={() => me.refetch()}>Verificar novamente</Button><Button variant="outline" onClick={signOut}>Sair</Button></div>} /></>;

  const isRoot = member?.level === 0;
  const isAdmin = !!me.data?.isAdmin;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {splash}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button className="lg:hidden" onClick={() => setMobileMenu(true)} aria-label="Abrir menu"><Menu className="size-6" /></button>
          <img src={logoBlue.url} alt="3Lite Supernova" className="h-11 w-auto" />
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <MonthSelect value={month} options={months} onChange={setMonth} className="hidden h-11 sm:block" />
            {member && <div className="relative">
              <Button variant="outline" className="h-11 min-w-[172px] justify-between px-3" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen}>
                <span className="flex min-w-0 items-center gap-2.5"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy text-[10px] text-primary-foreground">{initials(member.name)}</span><span className="truncate text-left"><span className="block max-w-[140px] truncate text-xs font-medium">{member.name}</span><span className="block text-[10px] font-book text-muted-foreground">{levelLabel(member.level)}</span></span></span>
                <ChevronDown className={cn("size-4 transition-transform", menuOpen && "rotate-180")} />
              </Button>
              {menuOpen && <div className="absolute right-0 top-12 z-40 w-64 rounded-md border border-border bg-card p-2 shadow-xl">
                <p className="truncate px-3 pb-2 pt-1 text-[11px] text-muted-foreground">{member.email}</p>
                <button onClick={signOut} className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm hover:bg-accent"><LogOut className="size-4" />Sair</button>
              </div>}
            </div>}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-[76px] hidden h-[calc(100vh-76px)] w-64 shrink-0 border-r border-border bg-card px-4 py-8 lg:flex lg:flex-col">
          <p className="px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Menu principal</p>
          <nav className="mt-4 space-y-1">{TABS.map((item) => <Button key={item.id} variant={tab === item.id ? "secondary" : "ghost"} className={cn("w-full justify-start", tab === item.id && "text-primary")} onClick={() => setTab(item.id)}><item.icon className="size-4" />{item.label}</Button>)}</nav>
          <div className="mt-auto rounded-md bg-navy p-4 text-primary-foreground"><img src={symbolWhite.url} alt="" className="mb-4 h-8 w-auto opacity-90" /><p className="text-xs font-medium">{monthLabel(month)}</p><p className="mt-1 text-[11px] font-book text-primary-foreground/60">Metas e resultados do mês selecionado.</p></div>
        </aside>
        <main className="min-w-0 flex-1 px-4 pb-28 pt-7 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          <MonthSelect value={month} options={months} onChange={setMonth} className="mb-5 h-10 w-full sm:hidden" />
          {!member || !net ? (netQ.isError ? <EmptyState title="Não foi possível carregar a rede" text="Tente novamente em instantes." action={<Button onClick={() => netQ.refetch()}>Tentar novamente</Button>} /> : <LoadingBlock />) : <div className="animate-fade-in">
            {tab === "overview" && (isRoot ? <LeaderView net={net} me={member} month={month} onExport={exportReport} onSelect={setSelected} onTab={setTab} /> : <DiscipleView net={net} me={member} onTab={setTab} />)}
            {tab === "entries" && <EntriesView net={net} me={member} month={month} actions={actions} />}
            {tab === "team" && <><PageHeading eyebrow="Cadastro" title="Minha equipe" description="Cadastre, edite ou remova os seus discípulos diretos." /><div className="mt-8">{isRoot && isAdmin && <CoLeaderCard net={net} rootId={member.id} actions={actions} />}<TeamManager net={net} parentId={member.id} actions={actions} onSelect={setSelected} /></div></>}
            {tab === "goals" && <><PageHeading eyebrow="Metas" title={`Metas de ${monthLabel(month).toLowerCase()}`} description="Parceiro de Deus: meta de oferta definida com cada discípulo." /><div className="mt-8"><GoalsEditor net={net} month={month} parentId={member.id} isAdmin={isAdmin && isRoot} actions={actions} /></div></>}
            {tab === "cells" && <><PageHeading eyebrow="Células" title="Minhas células" description="Cadastre células e lance os encontros com foto." /><div className="mt-8"><CellsView net={net} memberId={member.id} month={month} actions={actions} /></div></>}
            {tab === "network" && <><PageHeading eyebrow="Rede" title="Minha rede" description="Resultados somados automaticamente em toda a hierarquia." action={isRoot ? <Button variant="outline" onClick={exportReport}><Download className="size-4" />Exportar</Button> : undefined} /><div className="mt-8"><NetworkTree net={net} rootId={member.id} onSelect={setSelected} /></div></>}
          </div>}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-20 grid-cols-6 border-t border-border bg-card px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex flex-col items-center justify-center gap-1 text-[10px] font-medium", tab === t.id ? "text-primary" : "text-muted-foreground")}><t.icon className="size-5" />{t.short}</button>)}
      </nav>

      {mobileMenu && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-overlay" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} /><div className="relative h-full w-[82%] max-w-xs overflow-y-auto bg-card p-6 shadow-2xl"><div className="mb-8 flex items-center justify-between"><img src={logoBlue.url} alt="3Lite Supernova" className="h-12 w-auto" /><Button size="icon" variant="ghost" onClick={() => setMobileMenu(false)} aria-label="Fechar"><X className="size-5" /></Button></div>{member && <div className="mb-6 flex items-center gap-3"><Avatar name={member.name} strong /><div className="min-w-0"><p className="truncate text-sm font-medium">{member.name}</p><p className="truncate text-[11px] text-muted-foreground">{member.email}</p></div></div>}<div className="space-y-1">{TABS.map((t) => <Button key={t.id} variant={tab === t.id ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => { setTab(t.id); setMobileMenu(false); }}><t.icon className="size-4" />{t.label}</Button>)}</div><Button variant="outline" className="mt-8 w-full" onClick={signOut}><LogOut className="size-4" />Sair</Button></div></div>}

      <MemberSheet net={net} id={selected} onClose={() => setSelected(null)} />

      {notice && <div role="status" className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-md bg-navy px-4 py-3 text-sm text-primary-foreground shadow-xl lg:bottom-7"><Check className="size-4 text-primary" />{notice}</div>}
    </div>
  );
}

function MonthSelect({ value, options, onChange, className }: { value: string; options: { id: string; label: string }[]; onChange: (v: string) => void; className?: string }) {
  return <select aria-label="Mês" value={value} onChange={(e) => onChange(e.target.value)} className={cn("rounded-md border border-input bg-card px-3 text-xs font-medium", className)}>{options.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select>;
}

function CenterMessage({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-background px-4"><div className="max-w-md text-center"><img src={symbolOrange.url} alt="" className="mx-auto h-14 w-auto" /><h1 className="mt-6 text-2xl font-bold text-navy">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{text}</p>{action && <div className="mt-6">{action}</div>}</div></div>;
}

function LoadingBlock() {
  return <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />)}</div>;
}

function LeaderView({ net, me, month, onExport, onSelect, onTab }: { net: Network; me: Member; month: string; onExport: () => void; onSelect: (id: string) => void; onTab: (t: Tab) => void }) {
  const t = net.treeTotals(me.id);
  const teamGoal = net.teamGoal;
  const directs = net.childrenOf(me.id).map((p) => ({ p, t: net.treeTotals(p.id), g: net.treeGoal(p.id).oferta })).sort((a, b) => b.t.membresia - a.t.membresia);
  const recent = [...net.entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const size = net.subtreeSize(me.id);
  const level2 = directs.reduce((a, d) => a + net.childrenOf(d.p.id).length, 0);
  const cards = [
    { label: "Parceiro de Deus", value: brl(t.oferta), note: teamGoal ? `${pct(t.oferta, teamGoal)}% da meta de ${brl(teamGoal)}` : "Meta da equipe não definida", icon: Goal },
    { label: "Membresia", value: num(t.membresia), note: net.team.membresia ? `${pct(t.membresia, net.team.membresia)}% da meta de ${num(net.team.membresia)}` : "30% Terça + 50% Arena + 100% Família", icon: TrendingUp },
    { label: "Células ativas", value: `${t.activeCells}/${t.cells}`, note: net.team.cells ? `${pct(t.activeCells, net.team.cells)}% da meta de ${net.team.cells}` : "Meta de células não definida", icon: Home2 },
    { label: "Arregimentação", value: num(t.arregimentacao), note: `${t.terca} Terça · ${t.arena} Arena · ${t.familia} Família`, icon: UsersRound },
    { label: "Rede ministerial", value: String(size), note: `${directs.length} diretos · ${level2} no 2º nível`, icon: UserRound },
  ];
  return <div>
    <PageHeading eyebrow="Painel do líder" title={`Olá, ${me.name.split(" ")[0]}`} description={`Resultados de ${monthLabel(month).toLowerCase()} somados em toda a rede.`} action={<Button onClick={onExport}><Download className="size-4" />Exportar relatório</Button>} />
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map((item) => <SummaryCard key={item.label} {...item} />)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
      <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7">
        <SectionHeading title="Meus 12" subtitle="Ordenados pela membresia da rede de cada um" action={directs.length ? "Ver rede completa" : undefined} onAction={() => onTab("network")} />
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-md bg-secondary p-4 sm:p-6">
          <HierarchyNode value="1" label="Líder" featured /><div className="hierarchy-line" /><HierarchyNode value={`${directs.length}`} label="de 12" /><div className="hierarchy-line" /><HierarchyNode value={`${level2}`} label="de 144" />
        </div>
        <div className="mt-4 divide-y divide-border">
          {directs.length === 0 && <div className="pt-4"><EmptyState title="Cadastre seu primeiro discípulo" text="Adicione os seus 12 na aba Minha equipe. Eles recebem acesso ao criar a conta com o e-mail cadastrado." action={<Button onClick={() => onTab("team")}><UserPlus className="size-4" />Cadastrar discípulos</Button>} /></div>}
          {directs.map(({ p, t: dt, g }) => <button key={p.id} onClick={() => onSelect(p.id)} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 py-3 text-left hover:bg-secondary"><Avatar name={p.name} /><div className="min-w-0"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium">{p.name}</p><span className="text-xs text-muted-foreground">{g ? `${pct(dt.oferta, g)}%` : "sem meta"}</span></div><Bar value={pct(dt.oferta, g)} className="mt-2" /></div><span className="w-20 text-right text-xs"><strong className="block text-primary">{num(dt.membresia)}</strong><span className="text-[10px] text-muted-foreground">membresia</span></span></button>)}
        </div>
      </section>
      <RecentEntries net={net} entries={recent} />
    </div>
  </div>;
}

function RecentEntries({ net, entries }: { net: Network; entries: Entry[] }) {
  return <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7"><SectionHeading title="Lançamentos recentes" subtitle="Movimento da rede no mês" /><div className="mt-6 space-y-5">{entries.length ? entries.map((e) => <div key={e.id} className="flex gap-3"><div className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Clock3 className="size-3.5" /></div><div><p className="text-sm leading-5"><span className="font-medium">{net.person(e.member_id)?.name ?? "—"}</span> lançou {e.kind === "oferta" ? brl(Number(e.value)) : `${Number(e.value)} pessoas`}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"><span>{e.date.split("-").reverse().join("/")}</span><span className="size-1 rounded-full bg-border" /><span>{KIND_LABEL[e.kind]}</span></div></div></div>) : <p className="text-sm text-muted-foreground">Nenhum lançamento neste mês.</p>}</div></section>;
}

function DiscipleView({ net, me, onTab }: { net: Network; me: Member; onTab: (t: Tab) => void }) {
  const own = net.ownTotals(me.id);
  const goal = net.goalOf(me.id).oferta;
  const progress = pct(own.oferta, goal);
  const kids = net.childrenOf(me.id);
  const tree = net.treeTotals(me.id);
  const leader = me.parent_id ? net.person(me.parent_id) : undefined;
  return <div>
    <PageHeading eyebrow="Meu painel" title={`Olá, ${me.name.split(" ")[0]}`} description={leader ? `Líder direto: ${leader.name}` : "Continue avançando nas suas metas."} action={<Button onClick={() => onTab("entries")}><Plus className="size-4" />Novo lançamento</Button>} />
    <section className="relative mt-8 overflow-hidden rounded-lg bg-navy p-6 text-primary-foreground sm:p-8">
      <img src={symbolOrange.url} alt="" className="absolute -bottom-20 -right-8 h-72 w-auto opacity-10" />
      <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Parceiro de Deus</p><h2 className="mt-3 text-2xl font-bold sm:text-3xl">{!goal ? "Sua meta do mês ainda não foi definida" : own.oferta >= goal ? "Meta do mês alcançada!" : `Faltam ${brl(goal - own.oferta)} para sua meta`}</h2><p className="mt-2 max-w-xl font-book text-sm leading-6 text-primary-foreground/65">{goal ? "Meta definida com seu líder na virada do mês." : "Combine a meta com seu líder, que vai registrá-la no app."}</p><div className="mt-6 h-2 max-w-xl overflow-hidden rounded-full bg-navy-soft"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, progress)}%` }} /></div><div className="mt-3 flex max-w-xl justify-between text-xs"><span>{progress}% concluído</span><span className="text-primary-foreground/60">{brl(own.oferta)} de {brl(goal)}</span></div></div>
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
        <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-6"><SectionHeading title="Minhas metas do mês" subtitle="Membresia e células ativas" action="Células" onAction={() => onTab("cells")} /><div className="mt-5 grid grid-cols-2 gap-3"><MiniStat value={`${num(own.membresia)} / ${num(net.goalOf(me.id).membresia)}`} label="Membresia" /><MiniStat value={`${own.activeCells} / ${net.goalOf(me.id).cells}`} label="Células ativas" /></div></section>
        <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-6"><SectionHeading title="Minha equipe" subtitle={kids.length ? "Discípulos abaixo de você" : "Cadastre seus discípulos"} action={kids.length ? "Ver rede" : "Cadastrar"} onAction={() => onTab(kids.length ? "network" : "team")} /><div className="mt-5 flex items-end justify-between"><div><strong className="text-4xl font-bold text-navy">{kids.length}</strong><span className="text-lg text-muted-foreground"> / 12</span><p className="mt-1 text-xs text-muted-foreground">discípulos</p></div><div className="flex -space-x-2">{kids.slice(0, 3).map((k) => <span key={k.id} className="grid size-9 place-items-center rounded-full border-2 border-card bg-accent text-[10px] font-medium">{initials(k.name)}</span>)}{kids.length > 3 && <span className="grid size-9 place-items-center rounded-full border-2 border-card bg-accent text-[10px] font-medium">+{kids.length - 3}</span>}</div></div></section>
        {kids.length > 0 && <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-6"><SectionHeading title="Com a minha rede" subtitle="Seu resultado somado ao da sua equipe" /><div className="mt-5 grid grid-cols-2 gap-3"><MiniStat value={brl(tree.oferta)} label="Parceiro de Deus" /><MiniStat value={num(tree.membresia)} label="Membresia" /><MiniStat value={`${tree.activeCells}`} label="Células ativas" /></div></section>}
      </div>
    </div>
  </div>;
}

function EntriesView({ net, me, month, actions }: { net: Network; me: Member; month: string; actions: Actions }) {
  const [editing, setEditing] = useState<Entry | null>(null);
  return <div>
    <PageHeading eyebrow="Lançamentos" title="Registrar resultados" description="Cada lançamento atualiza na hora os totais de toda a rede acima de você." />
    <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7"><SectionHeading title={editing ? "Editar lançamento" : "Novo lançamento"} subtitle="Oferta Parceiro de Deus ou arregimentação por culto" action={editing ? "Cancelar" : undefined} onAction={() => setEditing(null)} /><div className="mt-5"><EntryForm net={net} key={editing?.id ?? `new-${month}`} memberId={me.id} month={month} editing={editing} actions={actions} onDone={() => setEditing(null)} /></div></section>
      <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7"><SectionHeading title="Meu histórico" subtitle={monthLabel(month)} /><div className="mt-5"><EntryList net={net} memberId={me.id} actions={actions} onEdit={setEditing} /></div></section>
    </div>
  </div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode | undefined }) { return <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p><h1 className="mt-2 text-3xl font-bold text-navy sm:text-4xl">{title}</h1><p className="mt-2 font-book text-sm text-muted-foreground sm:text-base">{description}</p></div>{action && <div className="self-start sm:self-auto">{action}</div>}</div>; }
function SectionHeading({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string | undefined; onAction?: () => void }) { return <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-bold text-navy sm:text-lg">{title}</h2><p className="mt-1 text-xs font-book text-muted-foreground">{subtitle}</p></div>{action && <button onClick={onAction} className="text-xs font-medium text-primary hover:underline">{action}</button>}</div>; }
function SummaryCard({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof UsersRound }) { return <article className="rounded-lg border border-border bg-card p-5 shadow-card transition-transform hover:-translate-y-0.5"><div className="flex items-start justify-between"><p className="text-xs font-medium text-muted-foreground">{label}</p><span className="grid size-9 place-items-center rounded-md bg-primary-soft text-primary"><Icon className="size-4" /></span></div><strong className="mt-4 block text-3xl font-bold text-navy">{value}</strong><p className="mt-2 text-[11px] text-muted-foreground">{note}</p></article>; }
function HierarchyNode({ value, label, featured }: { value: string; label: string; featured?: boolean }) { return <div className="text-center"><span className={cn("mx-auto grid size-12 place-items-center rounded-full text-sm font-bold sm:size-14", featured ? "bg-primary text-primary-foreground" : "bg-card text-navy shadow-sm")}>{value}</span><p className="mt-2 text-[10px] font-medium uppercase text-muted-foreground">{label}</p></div>; }
function MiniStat({ value, label }: { value: string; label: string }) { return <div className="rounded-md bg-secondary p-3"><strong className="text-xl font-bold text-navy">{value}</strong><p className="mt-1 text-[10px] text-muted-foreground">{label}</p></div>; }

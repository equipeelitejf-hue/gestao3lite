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

import logoBlue from "@/assets/logotipo-azul.svg.asset.json";
import symbolOrange from "@/assets/simbolo-laranja.svg.asset.json";
import symbolWhite from "@/assets/simbolo-branco.svg.asset.json";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Profile = "leader" | "disciple";

const summaryCards = [
  { label: "Discípulos diretos", value: "12", note: "Equipe completa", icon: UsersRound },
  { label: "Rede ministerial", value: "108", note: "de 144 pessoas", icon: UserRound },
  { label: "Metas concluídas", value: "74%", note: "+8% neste mês", icon: Target },
  { label: "Resultados no mês", value: "326", note: "+42 desde agosto", icon: TrendingUp },
];

const disciples = [
  { name: "Lucas Ribeiro", initials: "LR", people: 12, progress: 92 },
  { name: "Mariana Costa", initials: "MC", people: 11, progress: 84 },
  { name: "Pedro Santos", initials: "PS", people: 10, progress: 78 },
  { name: "Ana Beatriz", initials: "AB", people: 9, progress: 71 },
];

const activities = [
  { name: "Mariana Costa", text: "registrou 4 novas visitas", time: "Hoje, 11:42", type: "Resultado" },
  { name: "Lucas Ribeiro", text: "concluiu a meta de discipulados", time: "Hoje, 09:18", type: "Meta concluída" },
  { name: "Pedro Santos", text: "adicionou uma nova meta mensal", time: "Ontem, 20:36", type: "Nova meta" },
  { name: "Ana Beatriz", text: "registrou 2 decisões", time: "Ontem, 18:05", type: "Resultado" },
];

const goals = [
  { title: "Discipulados realizados", current: 9, target: 12, suffix: "encontros" },
  { title: "Novas pessoas alcançadas", current: 17, target: 24, suffix: "pessoas" },
  { title: "Visitas ministeriais", current: 6, target: 8, suffix: "visitas" },
];

export function MinisterialDashboard() {
  const [profile, setProfile] = useState<Profile>("leader");
  const [splashVisible, setSplashVisible] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSplashVisible(false), 1750);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const user = useMemo(
    () => (profile === "leader" ? { name: "Pr. Gabriel", role: "Líder Principal", initials: "GG" } : { name: "Lucas Ribeiro", role: "Discípulo", initials: "LR" }),
    [profile],
  );

  function changeProfile(next: Profile) {
    setProfile(next);
    setProfileOpen(false);
    setMobileMenu(false);
  }

  function exportReport() {
    const csv = "Indicador,Resultado\nDiscípulos diretos,12\nRede ministerial,108\nMetas concluídas,74%\nResultados no mês,326";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "relatorio-ministerial-setembro.csv";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Relatório mensal exportado com sucesso.");
  }

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
            <Button variant="ghost" size="icon" aria-label="Notificações" className="relative hidden sm:inline-flex">
              <Bell className="size-5" /><span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-card" />
            </Button>
            <div className="relative">
              <Button variant="outline" className="h-11 min-w-[172px] justify-between px-3" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen}>
                <span className="flex min-w-0 items-center gap-2.5"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy text-[10px] text-primary-foreground">{user.initials}</span><span className="truncate text-left"><span className="block text-xs font-medium">{user.name}</span><span className="block text-[10px] font-book text-muted-foreground">{user.role}</span></span></span>
                <ChevronDown className={cn("size-4 transition-transform", profileOpen && "rotate-180")} />
              </Button>
              {profileOpen && <div className="absolute right-0 top-12 z-40 w-64 rounded-md border border-border bg-card p-2 shadow-xl">
                <p className="px-3 pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Visualizar como</p>
                <ProfileOption active={profile === "leader"} title="Líder Principal" subtitle="Visão consolidada" onClick={() => changeProfile("leader")} />
                <ProfileOption active={profile === "disciple"} title="Discípulo" subtitle="Progresso individual" onClick={() => changeProfile("disciple")} />
              </div>}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <Sidebar profile={profile} onAction={() => setNotice("Esta área estará disponível na próxima etapa.")} />
        <main className="min-w-0 flex-1 px-4 pb-28 pt-7 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          {profile === "leader" ? <LeaderView onExport={exportReport} /> : <DiscipleView onAction={setNotice} />}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-20 grid-cols-4 border-t border-border bg-card px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <MobileNav icon={Home} label="Início" active />
        <MobileNav icon={Target} label="Metas" />
        <MobileNav icon={UsersRound} label="Equipe" />
        <MobileNav icon={CircleUserRound} label="Perfil" />
      </nav>

      {mobileMenu && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-overlay" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} /><div className="relative h-full w-[82%] max-w-xs bg-card p-6 shadow-2xl"><div className="mb-10 flex items-center justify-between"><img src={logoBlue.url} alt="3Lite Supernova" className="h-12 w-auto" /><Button size="icon" variant="ghost" onClick={() => setMobileMenu(false)} aria-label="Fechar"><X className="size-5" /></Button></div><p className="mb-3 text-xs font-medium uppercase text-muted-foreground">Alternar perfil</p><div className="space-y-2"><ProfileOption active={profile === "leader"} title="Líder Principal" subtitle="Visão consolidada" onClick={() => changeProfile("leader")} /><ProfileOption active={profile === "disciple"} title="Discípulo" subtitle="Progresso individual" onClick={() => changeProfile("disciple")} /></div></div></div>}

      {notice && <div role="status" className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-md bg-navy px-4 py-3 text-sm text-primary-foreground shadow-xl lg:bottom-7"><Check className="size-4 text-primary" />{notice}</div>}
    </div>
  );
}

function LeaderView({ onExport }: { onExport: () => void }) {
  return <div className="animate-fade-in">
    <PageHeading eyebrow="Painel do líder" title="Olá, Pr. Gabriel" description="Acompanhe o movimento da sua equipe neste mês." action={<Button onClick={onExport}><Download className="size-4" />Exportar relatório</Button>} />
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summaryCards.map((item) => <SummaryCard key={item.label} {...item} />)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
      <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7">
        <SectionHeading title="Estrutura da equipe" subtitle="Visão consolidada da sua rede 1 · 12 · 144" action="Ver todos" />
        <div className="mt-7 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-md bg-secondary p-4 sm:p-6">
          <HierarchyNode value="1" label="Líder" featured /><div className="hierarchy-line" /><HierarchyNode value="12" label="Diretos" /><div className="hierarchy-line" /><HierarchyNode value="108" label="Rede" />
        </div>
        <div className="mt-6 divide-y divide-border">{disciples.map((person, index) => <div key={person.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3.5"><span className="grid size-9 place-items-center rounded-full bg-accent text-[11px] font-medium text-accent-foreground">{person.initials}</span><div className="min-w-0"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium">{person.name}</p><span className="text-xs text-muted-foreground">{person.progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full bg-primary", ["w-[92%]", "w-[84%]", "w-[78%]", "w-[71%]"][index])} /></div></div><span className="hidden text-xs text-muted-foreground sm:block">{person.people}/12</span></div>)}</div>
      </section>
      <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7"><SectionHeading title="Movimento recente" subtitle="Atualizações da sua equipe" /><div className="mt-6 space-y-5">{activities.map((activity) => <div key={activity.name + activity.time} className="flex gap-3"><div className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Clock3 className="size-3.5" /></div><div><p className="text-sm leading-5"><span className="font-medium">{activity.name}</span> {activity.text}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"><span>{activity.time}</span><span className="size-1 rounded-full bg-border" /><span>{activity.type}</span></div></div></div>)}</div></section>
    </div>
  </div>;
}

function DiscipleView({ onAction }: { onAction: (message: string) => void }) {
  return <div className="animate-fade-in">
    <PageHeading eyebrow="Meu painel" title="Olá, Lucas" description="Continue avançando nas suas metas de setembro." action={<Button onClick={() => onAction("Novo resultado preparado para cadastro.")}><Plus className="size-4" />Novo resultado</Button>} />
    <section className="relative mt-8 overflow-hidden rounded-lg bg-navy p-6 text-primary-foreground sm:p-8">
      <img src={symbolOrange.url} alt="" className="absolute -bottom-20 -right-8 h-72 w-auto opacity-10" />
      <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Progresso mensal</p><h2 className="mt-3 text-2xl font-bold sm:text-3xl">Você está a 8 ações da sua meta</h2><p className="mt-2 max-w-xl font-book text-sm leading-6 text-primary-foreground/65">Seu resultado individual também compõe o avanço de toda a equipe ministerial.</p><div className="mt-6 h-2 max-w-xl overflow-hidden rounded-full bg-navy-soft"><div className="h-full w-[74%] rounded-full bg-primary" /></div><div className="mt-3 flex max-w-xl justify-between text-xs"><span>74% concluído</span><span className="text-primary-foreground/60">22 de 30 ações</span></div></div>
        <div className="grid size-28 place-items-center rounded-full border-[10px] border-primary bg-navy-deep"><div className="text-center"><strong className="block text-2xl font-bold">74%</strong><span className="text-[10px] text-primary-foreground/60">do mês</span></div></div>
      </div>
    </section>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.8fr]">
      <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7"><SectionHeading title="Minhas metas" subtitle="Setembro de 2026" action="Ver histórico" /><div className="mt-6 space-y-3">{goals.map((goal, index) => <div key={goal.title} className="rounded-md border border-border p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium">{goal.title}</p><p className="mt-1 text-xs text-muted-foreground">{goal.current} de {goal.target} {goal.suffix}</p></div><span className="text-sm font-bold text-primary">{Math.round(goal.current / goal.target * 100)}%</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full bg-primary", ["w-3/4", "w-[71%]", "w-3/4"][index])} /></div></div>)}</div></section>
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-6"><SectionHeading title="Minha equipe" subtitle="2º nível da rede" /><div className="mt-5 flex items-end justify-between"><div><strong className="text-4xl font-bold text-navy">10</strong><span className="text-lg text-muted-foreground"> / 12</span><p className="mt-1 text-xs text-muted-foreground">discípulos ativos</p></div><div className="flex -space-x-2">{["RM", "JL", "FS", "+7"].map((initials) => <span key={initials} className="grid size-9 place-items-center rounded-full border-2 border-card bg-accent text-[10px] font-medium">{initials}</span>)}</div></div></section>
        <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-6"><SectionHeading title="Equipe geral" subtitle="Consolidado ministerial" /><div className="mt-5 grid grid-cols-2 gap-3"><MiniStat value="108" label="Pessoas" /><MiniStat value="326" label="Resultados" /></div></section>
      </div>
    </div>
  </div>;
}

function Sidebar({ profile, onAction }: { profile: Profile; onAction: () => void }) {
  const items = [{ icon: Home, label: "Visão geral", active: true }, { icon: Target, label: "Metas" }, { icon: UsersRound, label: profile === "leader" ? "Minha equipe" : "Meus discípulos" }, { icon: CalendarDays, label: "Relatórios" }];
  return <aside className="sticky top-[76px] hidden h-[calc(100vh-76px)] w-64 shrink-0 border-r border-border bg-card px-4 py-8 lg:flex lg:flex-col"><p className="px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Menu principal</p><nav className="mt-4 space-y-1">{items.map((item) => <Button key={item.label} variant={item.active ? "secondary" : "ghost"} className={cn("w-full justify-start", item.active && "text-primary")} onClick={item.active ? undefined : onAction}><item.icon className="size-4" />{item.label}</Button>)}</nav><div className="mt-auto rounded-md bg-navy p-4 text-primary-foreground"><img src={symbolWhite.url} alt="" className="mb-4 h-8 w-auto opacity-90" /><p className="text-xs font-medium">Ciclo de setembro</p><p className="mt-1 text-[11px] font-book text-primary-foreground/60">Faltam 8 dias para o fechamento.</p><div className="mt-4 h-1 overflow-hidden rounded-full bg-navy-soft"><div className="h-full w-3/4 bg-primary" /></div></div></aside>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action: React.ReactNode }) { return <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p><h1 className="mt-2 text-3xl font-bold text-navy sm:text-4xl">{title}</h1><p className="mt-2 font-book text-sm text-muted-foreground sm:text-base">{description}</p></div><div className="self-start sm:self-auto">{action}</div></div>; }
function SectionHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: string }) { return <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-bold text-navy sm:text-lg">{title}</h2><p className="mt-1 text-xs font-book text-muted-foreground">{subtitle}</p></div>{action && <button className="text-xs font-medium text-primary hover:underline">{action}</button>}</div>; }
function SummaryCard({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof UsersRound }) { return <article className="rounded-lg border border-border bg-card p-5 shadow-card transition-transform hover:-translate-y-0.5"><div className="flex items-start justify-between"><p className="text-xs font-medium text-muted-foreground">{label}</p><span className="grid size-9 place-items-center rounded-md bg-primary-soft text-primary"><Icon className="size-4" /></span></div><strong className="mt-4 block text-3xl font-bold text-navy">{value}</strong><p className="mt-2 text-[11px] text-muted-foreground">{note}</p></article>; }
function HierarchyNode({ value, label, featured }: { value: string; label: string; featured?: boolean }) { return <div className="text-center"><span className={cn("mx-auto grid size-12 place-items-center rounded-full text-sm font-bold sm:size-14", featured ? "bg-primary text-primary-foreground" : "bg-card text-navy shadow-sm")}>{value}</span><p className="mt-2 text-[10px] font-medium uppercase text-muted-foreground">{label}</p></div>; }
function MiniStat({ value, label }: { value: string; label: string }) { return <div className="rounded-md bg-secondary p-3"><strong className="text-xl font-bold text-navy">{value}</strong><p className="mt-1 text-[10px] text-muted-foreground">{label}</p></div>; }
function ProfileOption({ active, title, subtitle, onClick }: { active: boolean; title: string; subtitle: string; onClick: () => void }) { return <button onClick={onClick} className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent", active && "bg-secondary")}><span className={cn("grid size-8 place-items-center rounded-full", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><UserRound className="size-4" /></span><span className="flex-1"><span className="block text-xs font-medium">{title}</span><span className="block text-[10px] text-muted-foreground">{subtitle}</span></span>{active && <Check className="size-4 text-primary" />}</button>; }
function MobileNav({ icon: Icon, label, active }: { icon: typeof Home; label: string; active?: boolean }) { return <button className={cn("flex flex-col items-center justify-center gap-1 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}><Icon className="size-5" />{label}</button>; }
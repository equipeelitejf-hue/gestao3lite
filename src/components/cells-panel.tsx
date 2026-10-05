import { Camera, ImageIcon, MapPin, Pencil, Trash2, Wifi, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { EmptyState, VisitorsField } from "@/components/network-panels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FREQ_LABEL, brl, fetchMeetingPhoto, today, type Actions, type Cell, type CellFreq, type CellMode, type Network, type VisitorInput } from "@/lib/network";
import { cn } from "@/lib/utils";

const parseMoney = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;

/** Reduz a imagem para envio leve (JPEG, até 1280px). */
function compress(src: CanvasImageSource, w: number, h: number) {
  const scale = Math.min(1, 1280 / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.72);
}

function download(dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl; a.download = `celula-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;
  document.body.appendChild(a); a.click(); a.remove();
}

function CameraCapture({ onPhoto, onClose }: { onPhoto: (d: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => { stream = s; if (video.current) { video.current.srcObject = s; void video.current.play(); } })
      .catch(() => setErr("Não foi possível abrir a câmera. Permita o acesso ou use “Escolher da galeria”."));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);
  function shoot() {
    const v = video.current; if (!v || !v.videoWidth) return;
    const d = compress(v, v.videoWidth, v.videoHeight);
    download(d); onPhoto(d); onClose();
  }
  return <div className="fixed inset-0 z-50 flex flex-col bg-navy-deep">
    <div className="flex justify-end p-3"><Button size="icon" variant="ghost" className="text-primary-foreground" onClick={onClose} aria-label="Fechar câmera"><X className="size-6" /></Button></div>
    <div className="relative flex-1">{err ? <p className="p-6 text-center text-sm text-primary-foreground">{err}</p> : <video ref={video} playsInline muted className="absolute inset-0 size-full object-contain" />}</div>
    <div className="grid place-items-center p-6"><button onClick={shoot} disabled={!!err} aria-label="Tirar foto" className="size-20 rounded-full border-4 border-primary-foreground bg-primary disabled:opacity-40" /></div>
  </div>;
}

const cellSchema = z.object({
  host_name: z.string().trim().min(2, "Informe o nome do hospedeiro").max(100),
  mode: z.enum(["presencial", "online"]),
  frequency: z.enum(["semanal", "quinzenal", "mensal"]),
  neighborhood: z.string().trim().max(100),
  address: z.string().trim().max(200),
});

function CellForm({ memberId, editing, actions, onDone }: { memberId: string; editing: Cell | null; actions: Actions; onDone: () => void }) {
  const [f, setF] = useState({ host_name: editing?.host_name ?? "", mode: (editing?.mode ?? "presencial") as CellMode, frequency: (editing?.frequency ?? "semanal") as CellFreq, neighborhood: editing?.neighborhood ?? "", address: editing?.address ?? "" });
  const [error, setError] = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = cellSchema.safeParse(f);
    if (!r.success) { setError(r.error.issues[0]?.message ?? "Dados inválidos"); return; }
    if (r.data.mode === "presencial" && (!r.data.neighborhood || !r.data.address)) { setError("Informe bairro e endereço da célula presencial"); return; }
    const data = r.data.mode === "online" ? { ...r.data, neighborhood: "", address: "" } : r.data;
    setError("");
    actions.saveCell.mutate({ ...data, member_id: editing?.member_id ?? memberId, ...(editing ? { id: editing.id } : {}) }, { onSuccess: onDone });
  }
  const opt = (on: boolean) => cn("min-w-0 rounded-md border px-2 py-2.5 text-center text-xs leading-tight font-medium", on ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-accent");
  return <form onSubmit={submit} className="space-y-3">
    <div className="grid grid-cols-2 gap-2">{(["presencial", "online"] as const).map((m) => <button type="button" key={m} className={opt(f.mode === m)} onClick={() => setF((x) => ({ ...x, mode: m }))}>{m === "presencial" ? "Presencial" : "Online"}</button>)}</div>
    <div className="grid grid-cols-3 gap-2">{(Object.keys(FREQ_LABEL) as CellFreq[]).map((k) => <button type="button" key={k} className={opt(f.frequency === k)} onClick={() => setF((x) => ({ ...x, frequency: k }))}>{FREQ_LABEL[k]}</button>)}</div>
    <label className="block text-[11px] text-muted-foreground">Nome do hospedeiro<Input value={f.host_name} onChange={(e) => setF((x) => ({ ...x, host_name: e.target.value }))} maxLength={100} className="mt-1" /></label>
    {f.mode === "presencial" && <>
      <label className="block text-[11px] text-muted-foreground">Bairro<Input value={f.neighborhood} onChange={(e) => setF((x) => ({ ...x, neighborhood: e.target.value }))} maxLength={100} className="mt-1" /></label>
      <label className="block text-[11px] text-muted-foreground">Endereço<Input value={f.address} onChange={(e) => setF((x) => ({ ...x, address: e.target.value }))} maxLength={200} className="mt-1" /></label>
    </>}
    {error && <p className="text-xs text-destructive">{error}</p>}
    <div className="flex gap-2"><Button type="submit" className="flex-1" disabled={actions.saveCell.isPending}>{editing ? "Salvar célula" : "Cadastrar célula"}</Button>{editing && <Button type="button" variant="outline" onClick={onDone}>Cancelar</Button>}</div>
  </form>;
}

function MeetingForm({ net, cell, month, actions, onDone }: { net: Network; cell: Cell; month: string; actions: Actions; onDone: () => void }) {
  const [f, setF] = useState({ date: today().startsWith(month) ? today() : `${month}-01`, lives: "", offering: "" });
  const [people, setPeople] = useState<VisitorInput[]>([]);
  const [photo, setPhoto] = useState("");
  const [cam, setCam] = useState(false);
  const [error, setError] = useState("");
  const gallery = useRef<HTMLInputElement>(null);
  function pick(file?: File) {
    if (!file) return;
    const img = new Image();
    img.onload = () => { setPhoto(compress(img, img.naturalWidth, img.naturalHeight)); URL.revokeObjectURL(img.src); };
    img.src = URL.createObjectURL(file);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const lives = Number(f.lives), offering = Math.round(parseMoney(f.offering) * 100) / 100;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return setError("Informe a data");
    if (!Number.isInteger(lives) || lives < 0 || lives > 10000) return setError("Informe o número de vidas");
    if (offering < 0 || offering > 1_000_000) return setError("Valor de Parceiro de Deus inválido");
    if (!photo) return setError("Tire ou escolha a foto da célula");
    setError("");
    actions.addMeeting.mutate({ cell_id: cell.id, member_id: cell.member_id, date: f.date, lives, offering, photo, people }, { onSuccess: onDone });
  }
  return <form onSubmit={submit} className="mt-3 space-y-3 rounded-md bg-secondary p-4">
    {cam && <CameraCapture onPhoto={setPhoto} onClose={() => setCam(false)} />}
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-[11px] text-muted-foreground">Data do encontro<Input type="date" value={f.date} onChange={(e) => setF((x) => ({ ...x, date: e.target.value }))} className="mt-1" /></label>
      <label className="text-[11px] text-muted-foreground">Parceiro de Deus gerado (R$)<Input inputMode="decimal" placeholder="0,00" value={f.offering} onChange={(e) => setF((x) => ({ ...x, offering: e.target.value }))} className="mt-1" /></label>
      <label className="text-[11px] text-muted-foreground">Vidas presentes<Input inputMode="numeric" placeholder="0" value={f.lives} onChange={(e) => setF((x) => ({ ...x, lives: e.target.value }))} className="mt-1" /></label>
    </div>
    <VisitorsField net={net} value={people} onChange={setPeople} />
    {photo ? <div className="relative"><img src={photo} alt="Foto da célula" className="max-h-56 w-full rounded-md object-cover" /><Button type="button" size="sm" variant="secondary" className="absolute right-2 top-2" onClick={() => setPhoto("")}>Trocar foto</Button></div>
      : <div className="grid grid-cols-1 gap-2 min-[440px]:grid-cols-2"><Button type="button" className="min-w-0 flex-wrap" onClick={() => setCam(true)}><Camera className="size-4 shrink-0" />Tirar foto</Button><Button type="button" variant="outline" className="min-w-0 flex-wrap" onClick={() => gallery.current?.click()}><ImageIcon className="size-4 shrink-0" />Escolher da galeria</Button></div>}
    <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    <p className="text-[11px] text-muted-foreground">A foto tirada pelo app também é salva no seu aparelho. O valor de Parceiro de Deus soma no resultado do líder da célula.</p>
    {error && <p className="text-xs text-destructive">{error}</p>}
    <div className="flex gap-2"><Button type="submit" className="flex-1" disabled={actions.addMeeting.isPending}>{actions.addMeeting.isPending ? "Enviando..." : "Registrar encontro"}</Button><Button type="button" variant="outline" onClick={onDone}>Cancelar</Button></div>
  </form>;
}

function PhotoButton({ id }: { id: string }) {
  const [src, setSrc] = useState<string | null>(null);
  return <>{src ? <img src={src} alt="Foto do encontro" className="mt-2 max-h-48 rounded-md" onClick={() => setSrc(null)} /> : <button className="text-[11px] text-primary underline" onClick={async () => setSrc((await fetchMeetingPhoto(id)) || null)}>ver foto</button>}</>;
}

export function CellsView({ net, memberId, month, actions }: { net: Network; memberId: string; month: string; actions: Actions }) {
  const [editing, setEditing] = useState<Cell | null>(null);
  const [launch, setLaunch] = useState<string | null>(null);
  const cells = net.cellsOf(memberId);
  const active = cells.filter((c) => net.meetingsOf(c.id).length).length;
  return <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
    <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7">
      <h2 className="text-lg font-bold text-navy">{editing ? "Editar célula" : "Cadastrar célula"}</h2>
      <p className="mb-5 mt-1 text-xs text-muted-foreground">Células online não precisam de bairro e endereço.</p>
      <CellForm key={editing?.id ?? "new"} memberId={memberId} editing={editing} actions={actions} onDone={() => setEditing(null)} />
    </section>
    <section className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-7">
      <div className="flex items-baseline justify-between"><h2 className="text-lg font-bold text-navy">Minhas células</h2><span className="text-sm text-muted-foreground"><strong className="text-primary">{active}</strong> ativas de {cells.length}</span></div>
      <p className="mt-1 text-[11px] text-muted-foreground">Célula ativa é a que tem pelo menos um encontro lançado no mês.</p>
      <div className="mt-5 space-y-4">
        {cells.length === 0 && <EmptyState title="Nenhuma célula cadastrada" text="Cadastre sua primeira célula ao lado para começar a lançar os encontros." />}
        {cells.map((c) => { const ms = net.meetingsOf(c.id); return <div key={c.id} className="rounded-md border border-border p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">{c.mode === "online" ? <Wifi className="size-4" /> : <MapPin className="size-4" />}</span>
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">Casa de {c.host_name} {ms.length > 0 ? <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">ativa</span> : <span className="ml-1 text-[10px] text-muted-foreground">sem encontro no mês</span>}</p><p className="truncate text-[11px] text-muted-foreground">{FREQ_LABEL[c.frequency]} · {c.mode === "online" ? "Online" : `${c.neighborhood} · ${c.address}`}{c.member_id !== memberId && ` · ${net.person(c.member_id)?.name.split(" ")[0]}`}</p></div>
            <Button size="icon" variant="ghost" aria-label="Editar célula" onClick={() => setEditing(c)}><Pencil className="size-4" /></Button>
            <Button size="icon" variant="ghost" aria-label="Remover célula" onClick={() => { if (window.confirm("Remover esta célula e todos os encontros?")) actions.deleteCell.mutate(c.id); }}><Trash2 className="size-4" /></Button>
          </div>
          {ms.length > 0 && <div className="mt-3 divide-y divide-border border-t border-border">{ms.map((m) => <div key={m.id} className="flex items-start justify-between gap-2 py-2 text-xs"><div><p className="font-medium">{m.date.split("-").reverse().join("/")} · {m.lives} vidas · {m.visitors} visitantes</p>{net.visitsOf({ meeting_id: m.id }).length > 0 && <p className="text-muted-foreground">{net.visitsOf({ meeting_id: m.id }).map((v) => v.name).join(", ")}</p>}<p className="text-muted-foreground">Parceiro de Deus {brl(Number(m.offering))}</p><PhotoButton id={m.id} /></div><Button size="icon" variant="ghost" aria-label="Excluir encontro" onClick={() => { if (window.confirm("Excluir este encontro?")) actions.deleteMeeting.mutate(m.id); }}><Trash2 className="size-4" /></Button></div>)}</div>}
          {launch === c.id ? <MeetingForm net={net} cell={c} month={month} actions={actions} onDone={() => setLaunch(null)} /> : <Button size="sm" variant="outline" className="mt-3" onClick={() => setLaunch(c.id)}>Lançar encontro</Button>}
        </div>; })}
      </div>
    </section>
  </div>;
}

export function CoLeaderCard({ net, rootId, actions }: { net: Network; rootId: string; actions: Actions }) {
  const spouse = net.spouseOf(rootId);
  const [f, setF] = useState({ name: "", email: "" });
  const [error, setError] = useState("");
  if (spouse) return <section className="mb-6 rounded-lg bg-navy p-5 text-primary-foreground"><p className="text-[11px] uppercase tracking-[0.14em] text-primary">Co-líder Principal</p><p className="mt-1 text-sm font-medium">♥ {spouse.name} · {spouse.email}{!spouse.user_id && " · aguardando cadastro"}</p></section>;
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = z.object({ name: z.string().trim().min(2, "Informe o nome").max(100), email: z.string().trim().toLowerCase().email("E-mail inválido").max(255) }).safeParse(f);
    if (!r.success) { setError(r.error.issues[0]?.message ?? "Dados inválidos"); return; }
    setError("");
    actions.addCoLeader.mutate(r.data);
  }
  return <section className="mb-6 rounded-lg bg-navy p-5 text-primary-foreground sm:p-6">
    <p className="text-[11px] uppercase tracking-[0.14em] text-primary">Vincular co-líder (cônjuge)</p>
    <p className="mt-1 text-xs text-primary-foreground/70">Ela terá o mesmo acesso da liderança principal, sem ocupar vaga dos 12. Basta criar a conta com este e-mail.</p>
    <form onSubmit={submit} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <Input placeholder="Nome" value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} maxLength={100} className="border-navy-soft bg-navy-deep text-primary-foreground" />
      <Input type="email" placeholder="E-mail" value={f.email} onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} maxLength={255} className="border-navy-soft bg-navy-deep text-primary-foreground" />
      <Button type="submit" disabled={actions.addCoLeader.isPending}>Vincular</Button>
    </form>
    {error && <p className="mt-2 text-xs text-primary">{error}</p>}
  </section>;
}

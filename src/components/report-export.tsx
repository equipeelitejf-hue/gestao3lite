import { useMemo, useState } from "react";
import { Download, FileImage, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { brl, monthLabel, num, pct, type Network } from "@/lib/network";

type Row = { name: string; result: string; goal: string; progress: number };
type Section = { title: string; rows: Row[] };
const navy = "#062b45", orange = "#ff7900", pale = "#f3f7fa";

export function ReportExportMenu({ net, rootId, month }: { net: Network; rootId: string; month: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const disciples = useMemo(() => net.members
    .filter((member) => member.id !== rootId && net.inTree(rootId, member.id) && net.unitKey(member.id) === member.id)
    .sort((a, b) => net.unitName(a.id).localeCompare(net.unitName(b.id), "pt-BR")), [net, rootId]);

  const sections: Section[] = [
    { title: "Membresia", rows: disciples.map((m) => { const t = net.ownTotals(m.id), g = net.goalOf(m.id).membresia; return { name: net.unitName(m.id), result: num(t.membresia), goal: num(g), progress: pct(t.membresia, g) }; }) },
    { title: "Células Ativas", rows: disciples.map((m) => { const t = net.ownTotals(m.id), g = net.goalOf(m.id).cells; return { name: net.unitName(m.id), result: num(t.activeCells), goal: num(g), progress: pct(t.activeCells, g) }; }) },
    { title: "Parceiro de Deus", rows: disciples.map((m) => { const t = net.ownTotals(m.id), g = net.goalOf(m.id).oferta; return { name: net.unitName(m.id), result: brl(t.oferta), goal: brl(g), progress: pct(t.oferta, g) }; }) },
  ];

  async function exportFile(kind: "general" | "individual" | "partner") {
    setBusy(true); setError("");
    try {
      if (kind === "individual") {
        const member = disciples.find((m) => m.id === selected);
        if (!member) throw new Error("Escolha um discípulo para exportar.");
        const totals = net.ownTotals(member.id), goals = net.goalOf(member.id);
        const name = net.unitName(member.id);
        const individualPage = drawPage(month, { title: "Resultado individual", rows: [
          { name: "Membresia", result: num(totals.membresia), goal: num(goals.membresia), progress: pct(totals.membresia, goals.membresia) },
          { name: "Células Ativas", result: num(totals.activeCells), goal: num(goals.cells), progress: pct(totals.activeCells, goals.cells) },
          { name: "Parceiro de Deus", result: brl(totals.oferta), goal: brl(goals.oferta), progress: pct(totals.oferta, goals.oferta) },
        ] }, name);
        download(await makePdf([individualPage]), `relatorio-${slug(name)}-${month}.pdf`);
      } else if (kind === "partner") {
        const section = sections[2]!;
        download(await canvasBlob(drawPage(month, section, section.rows, "Parceiro de Deus", true), "image/png"), `parceiro-de-deus-${month}.png`);
      } else {
        download(await makePdf(renderPages(month, sections)), `relatorio-geral-${month}.pdf`);
      }
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar o arquivo.");
    } finally { setBusy(false); }
  }

  return <>
    <Button variant="outline" onClick={() => { setError(""); setOpen(true); }}><Download className="size-4" /> Exportar relatório</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Escolha o relatório</DialogTitle><DialogDescription>Arquivos separados com os resultados de {monthLabel(month)}.</DialogDescription></DialogHeader>
        <div className="grid gap-3 pt-2">
          <Choice icon={<FileText className="size-5" />} title="Relatório geral" detail="PDF com Membresia, Células Ativas e Parceiro de Deus." onClick={() => void exportFile("general")} disabled={busy || !disciples.length} />
          <section className="rounded-lg border border-border p-4">
            <div className="flex items-start gap-3"><FileText className="mt-0.5 size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1">
              <p className="font-medium">Relatório individual de discípulo</p><p className="mt-1 text-sm text-muted-foreground">PDF com Membresia, Células Ativas e Parceiro de Deus, com resultado e meta de cada área.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <select aria-label="Escolher discípulo" value={selected} onChange={(event) => setSelected(event.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Escolha um discípulo</option>{disciples.map((m) => <option key={m.id} value={m.id}>{net.unitName(m.id)}</option>)}
                </select>
                <Button onClick={() => void exportFile("individual")} disabled={busy || !selected}><Download className="size-4" />Exportar PDF</Button>
              </div>
            </div></div>
          </section>
          <Choice icon={<FileImage className="size-5" />} title="Parceiro de Deus geral (PNG)" detail="Somente o quadro Parceiro de Deus, com todos os discípulos." onClick={() => void exportFile("partner")} disabled={busy || !disciples.length} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{busy && <p role="status" className="text-sm text-muted-foreground">Preparando o arquivo…</p>}
      </DialogContent>
    </Dialog>
  </>;
}

function Choice({ icon, title, detail, onClick, disabled }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="flex w-full items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50">
    <span className="mt-0.5 text-primary">{icon}</span><span><span className="block font-medium">{title}</span><span className="mt-1 block text-sm text-muted-foreground">{detail}</span></span>
  </button>;
}

function renderPages(month: string, sections: Section[], subtitle?: string) {
  const pages: HTMLCanvasElement[] = [];
  const perPage = 14;
  for (const section of sections) {
    const batches = section.rows.length ? Array.from({ length: Math.ceil(section.rows.length / perPage) }, (_, i) => section.rows.slice(i * perPage, (i + 1) * perPage)) : [[]];
    batches.forEach((rows, i) => pages.push(drawPage(month, section, rows, subtitle, false, batches.length > 1 ? `Continuação ${i + 1}` : undefined)));
  }
  return pages;
}

function drawPage(month: string, section: Section, rows: Row[], subtitle?: string, tall = false, continuation?: string) {
  const width = 1080, rowHeight = tall ? 82 : 74;
  const height = tall ? Math.max(1100, 700 + rows.length * rowHeight) : 1920;
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Não foi possível preparar a imagem.");
  const gradient = ctx.createLinearGradient(0, 0, 0, tall ? 600 : 700);
  gradient.addColorStop(0, navy); gradient.addColorStop(0.4, "#06415a"); gradient.addColorStop(1, pale);
  ctx.fillStyle = pale; ctx.fillRect(0, 0, width, height); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, tall ? 600 : 700);
  ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = "#d88932"; ctx.font = "900 650px Arial, sans-serif"; ctx.textAlign = "right"; ctx.fillText("3", 1110, 520); ctx.restore();
  ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.font = "700 82px Arial, sans-serif"; ctx.fillText("Resultados", 145, 210);
  ctx.fillStyle = orange; ctx.font = "700 68px Arial, sans-serif"; ctx.fillText(monthLabel(month), 145, 292, 800);
  ctx.fillStyle = "#fff"; ctx.font = "400 28px Arial, sans-serif"; ctx.fillText(subtitle ? `${section.title} · ${subtitle}` : "Membresia · Células · Parceiro de Deus", 145, 348, 820);
  const top = tall ? 420 : 540, bottom = tall ? height - 56 : 1850;
  roundedRect(ctx, 96, top, 888, bottom - top, 52, "#fff");
  ctx.fillStyle = navy; ctx.font = "700 46px Arial, sans-serif"; ctx.fillText(section.title, 144, top + 84, 780);
  if (continuation) { ctx.textAlign = "right"; ctx.fillStyle = "#71808a"; ctx.font = "400 22px Arial, sans-serif"; ctx.fillText(continuation, 930, top + 82); ctx.textAlign = "left"; }
  const y0 = top + 136;
  ctx.fillStyle = "#73828c"; ctx.font = "600 20px Arial, sans-serif"; ctx.fillText("DISCÍPULO", 144, y0); ctx.fillText("RESULTADO", 600, y0); ctx.fillText("META DO CICLO", 790, y0);
  ctx.fillStyle = "#e5ebef"; ctx.fillRect(144, y0 + 20, 790, 2);
  rows.forEach((row, i) => {
    const y = y0 + 78 + i * rowHeight;
    ctx.fillStyle = orange; ctx.font = "700 28px Arial, sans-serif"; ctx.fillText(row.name, 144, y, 420);
    ctx.fillStyle = navy; ctx.font = "600 23px Arial, sans-serif"; ctx.fillText(row.result, 600, y, 175); ctx.fillText(row.goal, 790, y, 140);
    ctx.fillStyle = "#6f7e88"; ctx.font = "400 18px Arial, sans-serif"; ctx.fillText(`${row.progress}% da meta`, 144, y + 28);
    ctx.fillStyle = "#e5ebef"; ctx.fillRect(144, y + 44, 790, 1);
  });
  if (!rows.length) { ctx.fillStyle = "#6f7e88"; ctx.font = "400 24px Arial, sans-serif"; ctx.fillText("Nenhum discípulo cadastrado neste circuito.", 144, y0 + 90, 760); }
  return canvas;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
}
function canvasBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Não foi possível gerar a imagem.")), type));
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function slug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "discipulo";
}
async function makePdf(canvases: HTMLCanvasElement[]) {
  const encode = new TextEncoder(), objects: Uint8Array[] = [];
  const pageIds = canvases.map((_, i) => 3 + i * 3), kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  objects.push(encode.encode("<< /Type /Catalog /Pages 2 0 R >>"), encode.encode(`<< /Type /Pages /Kids [${kids}] /Count ${canvases.length} >>`));
  for (let i = 0; i < canvases.length; i += 1) {
    const canvas = canvases[i]!, page = 3 + i * 3, imageId = page + 1, contentId = page + 2;
    const jpeg = await canvasBlob(canvas, "image/jpeg"), image = new Uint8Array(await jpeg.arrayBuffer());
    const w = 432, h = w * canvas.height / canvas.width;
    objects.push(encode.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`));
    objects.push(join([encode.encode(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`), image, encode.encode("\nendstream")]));
    const command = encode.encode(`q\n${w} 0 0 ${h} 0 0 cm\n/Im0 Do\nQ`);
    objects.push(join([encode.encode(`<< /Length ${command.length} >>\nstream\n`), command, encode.encode("\nendstream")]));
  }
  const chunks: Uint8Array[] = [encode.encode("%PDF-1.4\n")], offsets = [0]; let offset = chunks[0]!.length;
  objects.forEach((object, i) => { offsets.push(offset); const item = join([encode.encode(`${i + 1} 0 obj\n`), object, encode.encode("\nendobj\n")]); chunks.push(item); offset += item.length; });
  const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, ...offsets.slice(1).map((n) => `${String(n).padStart(10, "0")} 00000 n \n`), `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`].join("");
  chunks.push(encode.encode(xref)); return new Blob([join(chunks)], { type: "application/pdf" });
}
function join(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0)); let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; } return out;
}


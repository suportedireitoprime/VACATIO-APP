import { jsPDF } from 'jspdf';
import brasaoUrl from '@/assets/juris-brasao.png';
import coverArtUrl from '@/assets/juris-cover-art.png';

const YELLOW: [number, number, number] = [239, 224, 57];
const YELLOW_DARK: [number, number, number] = [212, 184, 0];
const GRAY_900: [number, number, number] = [26, 26, 30];
const GRAY_800: [number, number, number] = [42, 42, 48];
const GRAY_700: [number, number, number] = [64, 64, 72];
const GRAY_500: [number, number, number] = [110, 112, 120];
const GRAY_200: [number, number, number] = [225, 226, 232];
const GRAY_100: [number, number, number] = [238, 239, 244];
const TEXT: [number, number, number] = [28, 28, 32];
const BLUE: [number, number, number] = [37, 99, 235];

const APP_URL = 'https://vacatio.com.br';

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function gradientPng(
  w: number,
  h: number,
  stops: Array<{ at: number; color: string }>,
  direction: 'vertical' | 'horizontal' = 'vertical',
): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(w));
  canvas.height = Math.max(2, Math.round(h));
  const ctx = canvas.getContext('2d')!;
  const g =
    direction === 'vertical'
      ? ctx.createLinearGradient(0, 0, 0, canvas.height)
      : ctx.createLinearGradient(0, 0, canvas.width, 0);
  stops.forEach((s) => g.addColorStop(s.at, s.color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

export interface PeticaoPdfInput {
  titulo: string;
  areaDireito?: string;
  peca: string; // markdown com placeholders já substituídos
  fontes?: Array<{ label: string; url?: string }>;
}

// Remove marcadores markdown simples (##, **, [text](url) -> text) e capta links.
type Segment = { text: string; url?: string; bold?: boolean };

function parseMarkdown(md: string): Array<{ type: 'h2' | 'p'; segments: Segment[] }> {
  const blocks: Array<{ type: 'h2' | 'p'; segments: Segment[] }> = [];
  const lines = md.split(/\r?\n/);
  let buf: string[] = [];
  const flushPara = () => {
    if (!buf.length) return;
    const raw = buf.join(' ').trim();
    if (raw) blocks.push({ type: 'p', segments: tokenize(raw) });
    buf = [];
  };
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      flushPara();
      continue;
    }
    if (/^##\s+/.test(t)) {
      flushPara();
      blocks.push({ type: 'h2', segments: tokenize(t.replace(/^##\s+/, '')) });
      continue;
    }
    if (/^#\s+/.test(t)) {
      flushPara();
      blocks.push({ type: 'h2', segments: tokenize(t.replace(/^#\s+/, '')) });
      continue;
    }
    buf.push(t);
  }
  flushPara();
  return blocks;
}

function tokenize(s: string): Segment[] {
  const out: Segment[] = [];
  // Regex para [text](url) e **bold**
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push({ text: s.slice(last, m.index) });
    if (m[1] !== undefined) {
      out.push({ text: m[1], url: m[2] });
    } else if (m[3] !== undefined) {
      out.push({ text: m[3], bold: true });
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out.length ? out : [{ text: s }];
}

function slug(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60);
}

export async function gerarPeticaoPDF(input: PeticaoPdfInput) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const [brasao, coverArt] = await Promise.all([urlToDataUrl(brasaoUrl), urlToDataUrl(coverArtUrl)]);

  // ==== CAPA ====
  const yellowH = pageH * 0.52;
  doc.addImage(
    gradientPng(600, 600, [
      { at: 0, color: '#F5E85B' },
      { at: 1, color: '#E0CE28' },
    ]),
    'PNG',
    0,
    0,
    pageW,
    yellowH,
    undefined,
    'FAST',
  );

  if (coverArt) {
    try {
      const artH = yellowH * 0.7;
      const artW = artH * 1.5;
      const finalW = Math.min(artW, pageW - 40);
      const finalH = finalW / 1.5;
      doc.addImage(
        coverArt,
        'PNG',
        (pageW - finalW) / 2,
        (yellowH - finalH) / 2 - 6,
        finalW,
        finalH,
        undefined,
        'FAST',
      );
    } catch {}
  }

  doc.addImage(
    gradientPng(600, 900, [
      { at: 0, color: '#2E2F35' },
      { at: 1, color: '#1A1B20' },
    ]),
    'PNG',
    0,
    yellowH,
    pageW,
    pageH - yellowH,
    undefined,
    'FAST',
  );

  doc.setFillColor(...YELLOW_DARK);
  doc.rect(0, yellowH - 0.6, pageW, 1.2, 'F');

  const wmY = yellowH + 22;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.text('VACATIO', pageW / 2, wmY, { align: 'center', charSpace: 2.2 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(...YELLOW);
  doc.text('vade mecum', pageW / 2, wmY + 8, { align: 'center', charSpace: 3 });

  // Pill
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const pillLabel = 'PETIÇÃO INICIAL';
  const pillCS = 0.8;
  const pillTextW = doc.getTextWidth(pillLabel) + pillCS * (pillLabel.length - 1);
  const pillW = pillTextW + 12;
  const pillH = 6.6;
  const pillX = (pageW - pillW) / 2;
  const pillY = wmY + 13;
  doc.setFillColor(...YELLOW);
  doc.roundedRect(pillX, pillY, pillW, pillH, pillH / 2, pillH / 2, 'F');
  doc.setTextColor(...GRAY_900);
  doc.text(pillLabel, pageW / 2, pillY + pillH - 2.3, { align: 'center', charSpace: pillCS });

  // Título
  const titleY = pillY + pillH + 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(input.titulo || 'Petição Inicial', pageW - 40);
  doc.text(titleLines, pageW / 2, titleY, { align: 'center' });

  if (input.areaDireito) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(210, 212, 220);
    doc.text(input.areaDireito, pageW / 2, titleY + titleLines.length * 7 + 3, {
      align: 'center',
    });
  }

  doc.setFontSize(8.5);
  doc.setTextColor(180, 182, 190);
  doc.textWithLink(APP_URL, pageW / 2, pageH - 12, { align: 'center', url: APP_URL });
  doc.setFontSize(7.5);
  doc.setTextColor(140, 142, 150);
  doc.text(
    `Documento gerado em ${new Date().toLocaleDateString('pt-BR')}`,
    pageW / 2,
    pageH - 7,
    { align: 'center' },
  );

  // ==== CONTEÚDO ====
  doc.addPage();

  const mLeft = 30;
  const mRight = 20;
  const mTop = 30;
  const mBottom = 22;
  const contentW = pageW - mLeft - mRight;

  const drawBackground = () => {
    doc.addImage(
      gradientPng(600, 900, [
        { at: 0, color: '#F1F2F6' },
        { at: 1, color: '#E6E7ED' },
      ]),
      'PNG',
      0,
      0,
      pageW,
      pageH,
      undefined,
      'FAST',
    );
  };
  const drawWatermark = () => {
    if (!brasao) return;
    try {
      const size = 130;
      const G = (doc as any).GState;
      const g = G ? new G({ opacity: 0.05 }) : null;
      if (g) (doc as any).setGState(g);
      doc.addImage(brasao, 'PNG', (pageW - size) / 2, (pageH - size) / 2, size, size, undefined, 'FAST');
      if (g) (doc as any).setGState(new G({ opacity: 1 }));
    } catch {}
  };
  const drawHeader = () => {
    doc.setFillColor(...YELLOW);
    doc.rect(0, 0, pageW, 5, 'F');
    doc.setFillColor(...YELLOW_DARK);
    doc.rect(0, 5, pageW, 0.6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_800);
    const cs = 1.4;
    const t = 'VACATIO';
    const w = doc.getTextWidth(t) + cs * (t.length - 1);
    doc.text(t, mLeft, 14, { charSpace: cs });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY_500);
    doc.text('vade mecum', mLeft + w + 3, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_700);
    doc.text('Petição Inicial', pageW - mRight, 14, { align: 'right' });
    doc.setDrawColor(...GRAY_200);
    doc.setLineWidth(0.3);
    doc.line(mLeft, 18, pageW - mRight, 18);
  };

  drawBackground();
  drawWatermark();
  drawHeader();
  let cursorY = mTop;
  let pageCount = 1;

  const ensureSpace = (h: number) => {
    if (cursorY + h > pageH - mBottom - 2) {
      doc.addPage();
      pageCount++;
      drawBackground();
      drawWatermark();
      drawHeader();
      cursorY = mTop;
    }
  };

  const blocks = parseMarkdown(input.peca);
  for (const block of blocks) {
    if (block.type === 'h2') {
      ensureSpace(14);
      cursorY += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...GRAY_900);
      const t = block.segments.map((s) => s.text).join('');
      const lines = doc.splitTextToSize(t.toUpperCase(), contentW);
      for (const l of lines) {
        ensureSpace(6);
        doc.text(l, mLeft, cursorY + 4, { charSpace: 0.6 });
        cursorY += 6;
      }
      doc.setDrawColor(...YELLOW);
      doc.setLineWidth(1);
      doc.line(mLeft, cursorY, mLeft + 26, cursorY);
      cursorY += 5;
      continue;
    }
    // Parágrafo: render segment-by-segment com quebra manual
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...TEXT);
    const lh = 6;
    // Achata segmentos em palavras preservando url/bold
    type Word = { text: string; url?: string; bold?: boolean; space?: boolean };
    const words: Word[] = [];
    block.segments.forEach((seg) => {
      const parts = seg.text.split(/(\s+)/);
      for (const p of parts) {
        if (!p) continue;
        if (/^\s+$/.test(p)) {
          words.push({ text: ' ', url: seg.url, bold: seg.bold, space: true });
        } else {
          words.push({ text: p, url: seg.url, bold: seg.bold });
        }
      }
    });
    let x = mLeft;
    ensureSpace(lh);
    // Indentação de parágrafo
    x += 6;
    for (const w of words) {
      doc.setFont('helvetica', w.bold ? 'bold' : 'normal');
      const ww = doc.getTextWidth(w.text);
      if (x + ww > mLeft + contentW && !w.space) {
        cursorY += lh;
        ensureSpace(lh);
        x = mLeft;
      }
      if (w.url) {
        doc.setTextColor(...BLUE);
        doc.textWithLink(w.text, x, cursorY + 4, { url: w.url });
      } else {
        doc.setTextColor(...TEXT);
        doc.text(w.text, x, cursorY + 4);
      }
      x += ww;
    }
    cursorY += lh + 2;
  }

  // Fontes
  if (input.fontes?.length) {
    cursorY += 4;
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...GRAY_900);
    doc.text('FONTES CITADAS', mLeft, cursorY + 4, { charSpace: 1 });
    cursorY += 6;
    doc.setDrawColor(...YELLOW);
    doc.setLineWidth(1);
    doc.line(mLeft, cursorY, mLeft + 26, cursorY);
    cursorY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    for (const f of input.fontes) {
      ensureSpace(6);
      const label = '• ' + f.label;
      doc.setTextColor(...TEXT);
      const lines = doc.splitTextToSize(label, contentW);
      for (const l of lines) {
        ensureSpace(5.5);
        doc.text(l, mLeft, cursorY + 4);
        cursorY += 5.5;
      }
      if (f.url) {
        doc.setTextColor(...BLUE);
        const uLines = doc.splitTextToSize(f.url, contentW - 6);
        for (const l of uLines) {
          ensureSpace(5);
          doc.textWithLink(l, mLeft + 4, cursorY + 4, { url: f.url });
          cursorY += 5;
        }
      }
      cursorY += 1;
    }
  }

  // Rodapés
  const total = doc.getNumberOfPages();
  const contentPages = total - 1;
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GRAY_200);
    doc.setLineWidth(0.3);
    doc.line(mLeft, pageH - mBottom + 4, pageW - mRight, pageH - mBottom + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_500);
    doc.textWithLink(APP_URL, mLeft, pageH - mBottom + 10, { url: APP_URL });
    doc.text(`Página ${i - 1} de ${contentPages}`, pageW - mRight, pageH - mBottom + 10, {
      align: 'right',
    });
  }

  doc.save(`peticao-inicial-${slug(input.titulo)}.pdf`);
}

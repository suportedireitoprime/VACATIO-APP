import { jsPDF } from 'jspdf';
import brasaoUrl from '@/assets/brasao-republica.webp';

// Paleta
const YELLOW: [number, number, number] = [239, 224, 57]; // #EFE039
const GRAY_DARK: [number, number, number] = [45, 45, 48];
const GRAY_MID: [number, number, number] = [90, 92, 98];
const GRAY_SOFT: [number, number, number] = [235, 236, 240];
const TEXT: [number, number, number] = [30, 30, 34];

const APP_NAME = 'Vacatio — Vade Mecum';
const APP_URL = 'https://vacatio.com.br';
const STORE_APPLE = 'https://vacatio.com.br';
const STORE_ANDROID = 'https://vacatio.com.br';
const LOGO_URL = '/icon-512.png';

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

async function toPngDataUrl(url: string, size = 512): Promise<string | null> {
  try {
    const src = await urlToDataUrl(url);
    if (!src) return null;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej();
      img.src = src;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return src;
    const ratio = Math.min(size / img.width, size / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export type ArtigoPdfModo = 'lei-seca' | 'completo';

export interface ArtigoPdfInput {
  leiLabel: string;          // "CP — Código Penal"
  numero: string;            // "1º"
  caput: string;
  incisos?: string[];
  paragrafos?: string[];
  modo: ArtigoPdfModo;
  explicacao?: string;
  exemplo?: string;
  historico?: { ano: number; texto: string }[];
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

// remove marcações **bold**, ---SECAO---, cabeçalhos markdown
function stripMd(text: string): string {
  return text
    .replace(/---SECAO---|---EXEMPLO---/g, '\n\n')
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function gerarArtigoPDF(data: ArtigoPdfInput) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const [brasao, logo] = await Promise.all([
    urlToDataUrl(brasaoUrl),
    toPngDataUrl(LOGO_URL, 512),
  ]);

  const titulo = `Art. ${data.numero}`;

  // ============ CAPA ============
  doc.setFillColor(...GRAY_SOFT);
  doc.rect(0, 0, pageW, pageH, 'F');

  const yellowH = pageH * 0.55;
  doc.setFillColor(...YELLOW);
  doc.rect(0, 0, pageW, yellowH, 'F');

  doc.setFillColor(...GRAY_DARK);
  doc.rect(0, yellowH, pageW, 1.5, 'F');

  if (logo) {
    const logoSize = 48;
    try {
      doc.addImage(logo, 'PNG', (pageW - logoSize) / 2, yellowH / 2 - logoSize / 2 - 12, logoSize, logoSize);
    } catch { /* ignore */ }
  }

  doc.setTextColor(...GRAY_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(APP_NAME, pageW / 2, yellowH / 2 + 26, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...GRAY_MID);
  const subCapa = data.modo === 'lei-seca'
    ? 'Artigo (lei seca) • Documento gerado pelo app'
    : 'Artigo comentado • Documento gerado pelo app';
  doc.text(subCapa, pageW / 2, yellowH / 2 + 34, { align: 'center' });

  // Título da capa
  const centerBelow = yellowH + (pageH - yellowH) / 2;
  doc.setTextColor(...TEXT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(titulo, pageW / 2, centerBelow - 18, { align: 'center', maxWidth: pageW - 40 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...GRAY_MID);
  doc.text(data.leiLabel, pageW / 2, centerBelow - 10, { align: 'center', maxWidth: pageW - 40 });

  // Bloco "Baixe aqui"
  const boxW = pageW - 40;
  const boxX = 20;
  const boxY = centerBelow + 4;
  const boxH = 46;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...GRAY_DARK);
  doc.setLineWidth(0.4);
  doc.roundedRect(boxX, boxY, boxW, boxH, 4, 4, 'FD');

  doc.setTextColor(...GRAY_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Baixe o app', boxX + boxW / 2, boxY + 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...GRAY_MID);
  doc.text('Leis, jurisprudência e Direito na palma da mão', boxX + boxW / 2, boxY + 16, { align: 'center' });

  const btnW = 62;
  const btnH = 14;
  const gap = 6;
  const totalW = btnW * 2 + gap;
  const btnY = boxY + 22;
  const btnAppleX = boxX + (boxW - totalW) / 2;
  const btnGoogleX = btnAppleX + btnW + gap;

  doc.setFillColor(...GRAY_DARK);
  doc.roundedRect(btnAppleX, btnY, btnW, btnH, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('App Store', btnAppleX + btnW / 2, btnY + btnH / 2 + 1.2, { align: 'center' });
  doc.link(btnAppleX, btnY, btnW, btnH, { url: STORE_APPLE });

  doc.setFillColor(...GRAY_DARK);
  doc.roundedRect(btnGoogleX, btnY, btnW, btnH, 3, 3, 'F');
  doc.setTextColor(...YELLOW);
  doc.text('Google Play', btnGoogleX + btnW / 2, btnY + btnH / 2 + 1.2, { align: 'center' });
  doc.link(btnGoogleX, btnY, btnW, btnH, { url: STORE_ANDROID });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_MID);
  doc.textWithLink(APP_URL, pageW / 2, boxY + boxH + 8, { align: 'center', url: APP_URL });

  doc.setFontSize(8);
  doc.setTextColor(...GRAY_MID);
  const today = new Date().toLocaleDateString('pt-BR');
  doc.text(`Documento gerado em ${today}`, pageW / 2, pageH - 10, { align: 'center' });

  // ============ CONTEÚDO ============
  doc.addPage();

  const mLeft = 30;
  const mRight = 20;
  const mTop = 30;
  const mBottom = 20;
  const contentW = pageW - mLeft - mRight;

  const drawWatermark = () => {
    if (!brasao) return;
    try {
      const size = 110;
      const g = (doc as any).GState ? new (doc as any).GState({ opacity: 0.06 }) : null;
      if (g) (doc as any).setGState(g);
      doc.addImage(brasao, 'WEBP', (pageW - size) / 2, (pageH - size) / 2, size, size, undefined, 'FAST');
      if (g) {
        const g2 = new (doc as any).GState({ opacity: 1 });
        (doc as any).setGState(g2);
      }
    } catch { /* ignore */ }
  };

  const drawHeader = () => {
    doc.setFillColor(...YELLOW);
    doc.rect(0, 0, pageW, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_DARK);
    doc.text(APP_NAME, mLeft, 14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_MID);
    doc.text(data.leiLabel, pageW - mRight, 14, { align: 'right' });
    doc.setDrawColor(...GRAY_SOFT);
    doc.setLineWidth(0.3);
    doc.line(mLeft, 18, pageW - mRight, 18);
  };

  const drawFooter = (pageNum: number, total: number) => {
    doc.setDrawColor(...GRAY_SOFT);
    doc.setLineWidth(0.3);
    doc.line(mLeft, pageH - mBottom + 4, pageW - mRight, pageH - mBottom + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY_MID);
    doc.text(APP_URL, mLeft, pageH - mBottom + 10);
    doc.text(`Página ${pageNum} de ${total}`, pageW - mRight, pageH - mBottom + 10, { align: 'right' });
  };

  let cursorY = mTop;
  let pageCount = 1;

  const ensureSpace = (h: number) => {
    if (cursorY + h > pageH - mBottom - 2) {
      doc.addPage();
      pageCount++;
      cursorY = mTop;
      drawWatermark();
      drawHeader();
    }
  };

  drawWatermark();
  drawHeader();

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...TEXT);
  doc.text(titulo, mLeft, cursorY + 6);
  cursorY += 12;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10.5);
  doc.setTextColor(...GRAY_MID);
  doc.text(data.leiLabel, mLeft, cursorY);
  cursorY += 6;

  doc.setDrawColor(...YELLOW);
  doc.setLineWidth(1.2);
  doc.line(mLeft, cursorY, mLeft + 28, cursorY);
  cursorY += 6;

  const paragraph = (text: string, opts?: { size?: number; bold?: boolean; color?: [number, number, number] }) => {
    const size = opts?.size ?? 11;
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...(opts?.color ?? TEXT));
    const lh = size * 0.53; // ~1.5 line-height
    const lines = doc.splitTextToSize(text, contentW);
    for (const line of lines) {
      ensureSpace(lh);
      doc.text(line, mLeft, cursorY + 4);
      cursorY += lh;
    }
    cursorY += 2;
  };

  const sectionTitle = (label: string) => {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...GRAY_DARK);
    doc.text(label.toUpperCase(), mLeft, cursorY + 4);
    cursorY += 5;
    doc.setDrawColor(...GRAY_SOFT);
    doc.setLineWidth(0.4);
    doc.line(mLeft, cursorY, pageW - mRight, cursorY);
    cursorY += 4;
  };

  // Corpo do artigo (sempre)
  sectionTitle('Texto do artigo');
  paragraph(data.caput);
  (data.incisos || []).forEach((t) => paragraph(t));
  (data.paragrafos || []).forEach((t) => paragraph(t));

  if (data.modo === 'completo') {
    if (data.explicacao) {
      sectionTitle('Explicação');
      const paragraphs = stripMd(data.explicacao).split(/\n\s*\n/);
      for (const p of paragraphs) paragraph(p);
    }
    if (data.exemplo) {
      sectionTitle('Exemplo prático');
      const paragraphs = stripMd(data.exemplo).split(/\n\s*\n/);
      for (const p of paragraphs) paragraph(p);
    }
    if (data.historico && data.historico.length > 0) {
      sectionTitle('Histórico de alterações');
      for (const h of data.historico) {
        const prefix = h.ano > 0 ? `${h.ano} — ` : '';
        paragraph(`${prefix}${h.texto}`);
      }
    }
  }

  // Aplica footer em todas as páginas de conteúdo (contando a partir da pág 2)
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i - 1, totalPages - 1);
  }

  const filename = `${slug(data.leiLabel)}-art-${slug(data.numero)}-${data.modo}.pdf`;
  doc.save(filename);
}

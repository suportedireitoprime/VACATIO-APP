import { jsPDF } from 'jspdf';
import brasaoUrl from '@/assets/juris-brasao.png';
import coverArtUrl from '@/assets/juris-cover-art.png';

// ============= Paleta =============
const YELLOW: [number, number, number] = [239, 224, 57];    // #EFE039
const YELLOW_DARK: [number, number, number] = [212, 184, 0]; // #D4B800
const GRAY_900: [number, number, number] = [26, 26, 30];
const GRAY_800: [number, number, number] = [42, 42, 48];
const GRAY_700: [number, number, number] = [64, 64, 72];
const GRAY_500: [number, number, number] = [110, 112, 120];
const GRAY_200: [number, number, number] = [225, 226, 232];
const GRAY_100: [number, number, number] = [238, 239, 244];
const GRAY_50: [number, number, number] = [246, 247, 250];
const TEXT: [number, number, number] = [28, 28, 32];

const APP_LINE1 = 'VACATIO';
const APP_LINE2 = 'vade mecum';
const APP_URL = 'https://vacatio.com.br';
const STORE_APPLE = 'https://vacatio.com.br';
const STORE_ANDROID = 'https://vacatio.com.br';

// ============= Utilidades =============
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

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  try {
    const src = await urlToDataUrl(url);
    if (!src) return null;
    return await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  } catch {
    return null;
  }
}

/** Pré-renderiza um degradê como PNG dataURL (jsPDF não tem gradiente nativo). */
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

/** Ícone Apple (maçã) desenhado em canvas → PNG dataURL. */
function applePng(size: number, color = '#111'): string {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color;
  const s = size / 32;
  ctx.beginPath();
  // Silhueta simplificada de maçã
  ctx.moveTo(16 * s, 9 * s);
  ctx.bezierCurveTo(18 * s, 5 * s, 22 * s, 4 * s, 24 * s, 4.5 * s);
  ctx.bezierCurveTo(24.5 * s, 7 * s, 22.5 * s, 10 * s, 20 * s, 10 * s);
  ctx.bezierCurveTo(23 * s, 10 * s, 26 * s, 12 * s, 26 * s, 17 * s);
  ctx.bezierCurveTo(26 * s, 22 * s, 22 * s, 28 * s, 19 * s, 28 * s);
  ctx.bezierCurveTo(17 * s, 28 * s, 16.5 * s, 27 * s, 15 * s, 27 * s);
  ctx.bezierCurveTo(13.5 * s, 27 * s, 13 * s, 28 * s, 11 * s, 28 * s);
  ctx.bezierCurveTo(8 * s, 28 * s, 4 * s, 22 * s, 4 * s, 17 * s);
  ctx.bezierCurveTo(4 * s, 12 * s, 8 * s, 10 * s, 11 * s, 10 * s);
  ctx.bezierCurveTo(13 * s, 10 * s, 14 * s, 11 * s, 15 * s, 11 * s);
  ctx.bezierCurveTo(15.5 * s, 11 * s, 15.8 * s, 10 * s, 16 * s, 9 * s);
  ctx.closePath();
  ctx.fill();
  return c.toDataURL('image/png');
}

/** Ícone Google Play (triângulo colorido) → PNG dataURL. */
function googlePlayPng(size: number): string {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const s = size / 32;
  // Base do triângulo com 4 partes coloridas
  const tip = { x: 26 * s, y: 16 * s };
  const bl = { x: 6 * s, y: 4 * s };
  const tl = { x: 6 * s, y: 28 * s };
  const mid = { x: 15 * s, y: 16 * s };

  // Azul (topo)
  ctx.fillStyle = '#00A0FF';
  ctx.beginPath();
  ctx.moveTo(bl.x, bl.y);
  ctx.lineTo(mid.x, mid.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.closePath();
  ctx.fill();
  // Verde
  ctx.fillStyle = '#00E676';
  ctx.beginPath();
  ctx.moveTo(bl.x, bl.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.lineTo(bl.x, 16 * s);
  ctx.closePath();
  ctx.fill();
  // Amarelo
  ctx.fillStyle = '#FFCE00';
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tl.x, tl.y);
  ctx.lineTo(mid.x, mid.y);
  ctx.closePath();
  ctx.fill();
  // Vermelho (base)
  ctx.fillStyle = '#FF3A44';
  ctx.beginPath();
  ctx.moveTo(bl.x, bl.y);
  ctx.lineTo(mid.x, mid.y);
  ctx.lineTo(tl.x, tl.y);
  ctx.closePath();
  ctx.fill();
  return c.toDataURL('image/png');
}

export interface JurisPdfInput {
  tribunal: string;
  categoria: string;
  situacao?: string | null;
  titulo: string;
  descricao?: string;
  numeroProcesso?: string;
  tese?: string;
  ementa?: string;
  urlOrigem?: string;
  leiLabel?: string;
  modo?: 'tese' | 'ementa' | 'ambos';
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

export async function gerarJurisprudenciaPDF(data: JurisPdfInput) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Assets
  const [brasao, coverArt] = await Promise.all([
    urlToDataUrl(brasaoUrl),
    urlToDataUrl(coverArtUrl),
  ]);

  // ============ CAPA ============
  // Bloco superior: degradê amarelo
  const yellowH = pageH * 0.52;
  const yellowGrad = gradientPng(600, 600, [
    { at: 0, color: '#F5E85B' },
    { at: 1, color: '#E0CE28' },
  ]);
  doc.addImage(yellowGrad, 'PNG', 0, 0, pageW, yellowH, undefined, 'FAST');

  // Ilustração jurídica (topo)
  if (coverArt) {
    try {
      // Manter proporção 1536:1024 = 1.5
      const artH = yellowH * 0.72;
      const artW = artH * 1.5;
      const maxW = pageW - 40;
      const finalW = Math.min(artW, maxW);
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
    } catch { /* ignore */ }
  }

  // Bloco inferior: degradê cinza escuro
  const grayGrad = gradientPng(600, 900, [
    { at: 0, color: '#2E2F35' },
    { at: 1, color: '#1A1B20' },
  ]);
  doc.addImage(grayGrad, 'PNG', 0, yellowH, pageW, pageH - yellowH, undefined, 'FAST');

  // Faixa fina amarela separando os blocos
  doc.setFillColor(...YELLOW_DARK);
  doc.rect(0, yellowH - 0.6, pageW, 1.2, 'F');

  // Wordmark VACATIO / vade mecum
  const wmY = yellowH + 22;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.text(APP_LINE1, pageW / 2, wmY, { align: 'center', charSpace: 2.2 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(...YELLOW);
  doc.text(APP_LINE2, pageW / 2, wmY + 8, { align: 'center', charSpace: 3 });

  // Pill "JURISPRUDÊNCIA"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const pillLabel = 'JURISPRUDÊNCIA';
  const pillCharSpace = 0.8;
  const pillTextW = doc.getTextWidth(pillLabel) + pillCharSpace * (pillLabel.length - 1);
  const pillW = pillTextW + 12;
  const pillH = 6.6;
  const pillX = (pageW - pillW) / 2;
  const pillY = wmY + 13;
  doc.setFillColor(...YELLOW);
  doc.roundedRect(pillX, pillY, pillW, pillH, pillH / 2, pillH / 2, 'F');
  doc.setTextColor(...GRAY_900);
  doc.text(pillLabel, pageW / 2, pillY + pillH - 2.3, { align: 'center', charSpace: pillCharSpace });

  // Título do documento
  const titleY = pillY + pillH + 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  const tituloCapa = data.titulo || 'Jurisprudência';
  doc.text(tituloCapa, pageW / 2, titleY, { align: 'center', maxWidth: pageW - 40 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(210, 212, 220);
  const sub = [data.tribunal, data.categoria, data.leiLabel].filter(Boolean).join('  •  ');
  doc.text(sub, pageW / 2, titleY + 7, { align: 'center', maxWidth: pageW - 40 });

  // Card "Baixe o app"
  const boxW = pageW - 40;
  const boxX = 20;
  const boxY = titleY + 16;
  const boxH = 40;
  // Card com leve degradê off-white
  const cardGrad = gradientPng(600, 400, [
    { at: 0, color: '#FBFBFD' },
    { at: 1, color: '#EDEEF3' },
  ]);
  doc.addImage(cardGrad, 'PNG', boxX, boxY, boxW, boxH, undefined, 'FAST');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'S');

  doc.setTextColor(...GRAY_900);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Baixe o app', boxX + boxW / 2, boxY + 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_500);
  doc.text(
    'Mais jurisprudência, leis e conteúdo de Direito',
    boxX + boxW / 2,
    boxY + 13,
    { align: 'center' },
  );

  // Botões das lojas (pretos, no padrão oficial)
  const btnW = 58;
  const btnH = 14;
  const gap = 6;
  const totalW = btnW * 2 + gap;
  const btnY = boxY + 18;
  const btnAppleX = boxX + (boxW - totalW) / 2;
  const btnGoogleX = btnAppleX + btnW + gap;

  // Apple
  doc.setFillColor(...GRAY_900);
  doc.roundedRect(btnAppleX, btnY, btnW, btnH, 2.5, 2.5, 'F');
  try {
    doc.addImage(applePng(64, '#FFFFFF'), 'PNG', btnAppleX + 4, btnY + 2.6, 8.5, 8.5);
  } catch { /* ignore */ }
  doc.setTextColor(220, 220, 224);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text('Download on the', btnAppleX + 15, btnY + 5.2, { charSpace: 0.3 });
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('App Store', btnAppleX + 15, btnY + 10.3);
  doc.link(btnAppleX, btnY, btnW, btnH, { url: STORE_APPLE });

  // Google
  doc.setFillColor(...GRAY_900);
  doc.roundedRect(btnGoogleX, btnY, btnW, btnH, 2.5, 2.5, 'F');
  try {
    doc.addImage(googlePlayPng(64), 'PNG', btnGoogleX + 4, btnY + 2.6, 8.5, 8.5);
  } catch { /* ignore */ }
  doc.setTextColor(220, 220, 224);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text('GET IT ON', btnGoogleX + 15, btnY + 5.2, { charSpace: 0.4 });
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Google Play', btnGoogleX + 15, btnY + 10.3);
  doc.link(btnGoogleX, btnY, btnW, btnH, { url: STORE_ANDROID });

  // URL + data no rodapé da capa
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 182, 190);
  const today = new Date().toLocaleDateString('pt-BR');
  doc.textWithLink(APP_URL, pageW / 2, pageH - 12, { align: 'center', url: APP_URL });
  doc.setFontSize(7.5);
  doc.setTextColor(140, 142, 150);
  doc.text(`Documento gerado em ${today}`, pageW / 2, pageH - 7, { align: 'center' });

  // ============ CONTEÚDO ============
  doc.addPage();

  const mLeft = 30;
  const mRight = 20;
  const mTop = 30;
  const mBottom = 20;
  const contentW = pageW - mLeft - mRight;

  const drawBackground = () => {
    const bg = gradientPng(600, 900, [
      { at: 0, color: '#F1F2F6' },
      { at: 1, color: '#E6E7ED' },
    ]);
    doc.addImage(bg, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST');
  };

  const drawWatermark = () => {
    if (!brasao) return;
    try {
      const size = 130;
      const G = (doc as any).GState;
      const g = G ? new G({ opacity: 0.05 }) : null;
      if (g) (doc as any).setGState(g);
      doc.addImage(
        brasao,
        'PNG',
        (pageW - size) / 2,
        (pageH - size) / 2,
        size,
        size,
        undefined,
        'FAST',
      );
      if (g) {
        const g2 = new G({ opacity: 1 });
        (doc as any).setGState(g2);
      }
    } catch { /* ignore */ }
  };

  const drawHeader = () => {
    // Faixa amarela superior
    doc.setFillColor(...YELLOW);
    doc.rect(0, 0, pageW, 5, 'F');
    doc.setFillColor(...YELLOW_DARK);
    doc.rect(0, 5, pageW, 0.6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_800);
    const hdrCS = 1.4;
    const vacatio = 'VACATIO';
    const vacatioW = doc.getTextWidth(vacatio) + hdrCS * (vacatio.length - 1);
    doc.text(vacatio, mLeft, 14, { charSpace: hdrCS });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY_500);
    doc.text('vade mecum', mLeft + vacatioW + 3, 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_700);
    doc.text('Jurisprudência', pageW - mRight, 14, { align: 'right' });

    doc.setDrawColor(...GRAY_200);
    doc.setLineWidth(0.3);
    doc.line(mLeft, 18, pageW - mRight, 18);
  };

  const drawFooter = (pageNum: number, total: number) => {
    doc.setDrawColor(...GRAY_200);
    doc.setLineWidth(0.3);
    doc.line(mLeft, pageH - mBottom + 4, pageW - mRight, pageH - mBottom + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_500);
    doc.textWithLink(APP_URL, mLeft, pageH - mBottom + 10, { url: APP_URL });
    doc.text(
      `Página ${pageNum} de ${total}`,
      pageW - mRight,
      pageH - mBottom + 10,
      { align: 'right' },
    );
  };

  // Página 2 — desenha fundo/watermark/header
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

  // Chips superiores
  const chip = (
    label: string,
    x: number,
    y: number,
    bg: [number, number, number],
    fg: [number, number, number],
  ) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const w = doc.getTextWidth(label) + 7;
    doc.setFillColor(...bg);
    doc.roundedRect(x, y - 4.4, w, 6.4, 2, 2, 'F');
    doc.setTextColor(...fg);
    doc.text(label, x + 3.5, y);
    return w;
  };

  {
    let cx = mLeft;
    const cy = cursorY + 2;
    const tribColor: [number, number, number] =
      data.tribunal === 'STF' ? [37, 99, 235] : data.tribunal === 'STJ' ? [16, 163, 74] : GRAY_800;
    cx += chip(data.tribunal, cx, cy, tribColor, [255, 255, 255]) + 3;
    cx += chip(data.categoria, cx, cy, GRAY_100, GRAY_800) + 3;
    if (data.situacao) chip(data.situacao, cx, cy, [220, 252, 231], [22, 101, 52]);
    cursorY += 9;
  }

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...TEXT);
  const titleLines = doc.splitTextToSize(data.titulo || 'Jurisprudência', contentW);
  doc.text(titleLines, mLeft, cursorY + 7);
  cursorY += 7 + titleLines.length * 8;

  if (data.leiLabel) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10.5);
    doc.setTextColor(...GRAY_500);
    doc.text(data.leiLabel, mLeft, cursorY + 3);
    cursorY += 6;
  }

  if (data.numeroProcesso) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY_500);
    doc.text(data.numeroProcesso, mLeft, cursorY + 3);
    cursorY += 6;
  }

  cursorY += 4;
  doc.setDrawColor(...YELLOW);
  doc.setLineWidth(1.4);
  doc.line(mLeft, cursorY, mLeft + 30, cursorY);
  cursorY += 6;

  if (data.descricao) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...TEXT);
    const desc = doc.splitTextToSize(data.descricao, contentW);
    ensureSpace(desc.length * 5.8 + 4);
    doc.text(desc, mLeft, cursorY);
    cursorY += desc.length * 5.8 + 4;
  }

  const renderSection = (label: string, text: string) => {
    if (!text) return;
    ensureSpace(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...GRAY_800);
    doc.text(label.toUpperCase(), mLeft, cursorY + 4, { charSpace: 1.2 });
    cursorY += 5;
    doc.setDrawColor(...YELLOW);
    doc.setLineWidth(0.6);
    doc.line(mLeft, cursorY, mLeft + 22, cursorY);
    doc.setDrawColor(...GRAY_200);
    doc.setLineWidth(0.3);
    doc.line(mLeft + 24, cursorY, pageW - mRight, cursorY);
    cursorY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...TEXT);
    const paragraphs = text.split(/\n\s*\n|\r\n\r\n/);
    for (const p of paragraphs) {
      const lines = doc.splitTextToSize(p.trim(), contentW);
      const lh = 5.8;
      for (const line of lines) {
        ensureSpace(lh);
        doc.text(line, mLeft, cursorY + 4);
        cursorY += lh;
      }
      cursorY += 2;
    }
    cursorY += 3;
  };

  const modo = data.modo || 'ambos';
  if ((modo === 'tese' || modo === 'ambos') && data.tese) renderSection('Tese', data.tese);
  if ((modo === 'ementa' || modo === 'ambos') && data.ementa && data.ementa !== data.tese) {
    renderSection('Ementa', data.ementa);
  }

  if (data.urlOrigem) {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...GRAY_800);
    doc.text('Fonte oficial', mLeft, cursorY + 4);
    cursorY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(37, 99, 235);
    const lines = doc.splitTextToSize(data.urlOrigem, contentW);
    for (const line of lines) {
      ensureSpace(5);
      doc.textWithLink(line, mLeft, cursorY + 4, { url: data.urlOrigem });
      cursorY += 5;
    }
  }

  // Rodapé em todas as páginas de conteúdo
  const totalPages = doc.getNumberOfPages();
  const contentPages = totalPages - 1;
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i - 1, contentPages);
  }

  const filename = `jurisprudencia-${slug(data.tribunal)}-${slug(data.titulo)}.pdf`;
  doc.save(filename);
}

/**
 * Motor de layout determinístico dos visuais jurídicos.
 *
 * Recebe conteúdo estruturado e devolve uma cena de primitivas (retângulos,
 * textos, caminhos). O texto é MEDIDO antes de posicionar, a caixa cresce para
 * caber o texto e todo espaçamento é calculado — por construção não existe
 * sobreposição nem texto fora da moldura.
 */

import type { VisualContent } from './types';

export const PALETA = {
  paper: '#FBF7F1',
  paperAlt: '#F4EDE3',
  ink: '#2A1114',
  inkSoft: '#5C4448',
  wine: '#7A1220',
  wineDeep: '#4A0B14',
  wineSoft: '#F0DCDE',
  gold: '#C39A2B',
  line: '#DCCFC0',
  white: '#FFFFFF',
};

export type SceneNode =
  | { k: 'rect'; x: number; y: number; w: number; h: number; r?: number; fill?: string; stroke?: string; sw?: number }
  | { k: 'path'; d: string; stroke?: string; fill?: string; sw?: number; arrow?: boolean; dash?: string; transform?: string; opacity?: number }
  | { k: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number }
  | {
      k: 'text';
      x: number;
      y: number;
      text: string;
      size: number;
      weight?: number;
      fill?: string;
      anchor?: 'start' | 'middle' | 'end';
      serif?: boolean;
      spacing?: number;
      italic?: boolean;
    };

export interface Scene {
  w: number;
  h: number;
  nodes: SceneNode[];
}

const W = 1100;
const PAD = 56;
const FOOTER_H = 112;


/* ------------------------------------------------------------------ medida */

let ctx: CanvasRenderingContext2D | null | undefined;
function measure(text: string, size: number, weight = 400, serif = false): number {
  if (ctx === undefined) {
    try {
      ctx = document.createElement('canvas').getContext('2d');
    } catch {
      ctx = null;
    }
  }
  if (!ctx) return text.length * size * 0.52;
  ctx.font = `${weight} ${size}px ${serif ? 'Georgia, "Times New Roman", serif' : 'Inter, "Helvetica Neue", Arial, sans-serif'}`;
  return ctx.measureText(text).width;
}

function wrap(text: string, maxW: number, size: number, weight = 400, serif = false): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (measure(next, size, weight, serif) <= maxW || !cur) {
      cur = next;
    } else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ---------------------------------------------------------------- moldura */

interface Frame {
  nodes: SceneNode[];
  top: number;
  footer: (totalH: number) => SceneNode[];
}

/* Glifos vazados (marca d'água do cabeçalho). */
const GLIFOS: Record<string, { box: number; paths: string[] }> = {
  // Cérebro — mesmo ícone usado no início do app (lucide "brain"), caixa 24x24.
  mapa_mental: {
    box: 24,
    paths: [
      'M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z',
      'M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z',
      'M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4',
      'M17.599 6.5a3 3 0 0 0 .399-1.375',
      'M6.003 5.125A3 3 0 0 0 6.401 6.5',
      'M3.477 10.896a4 4 0 0 1 .585-.396',
      'M19.938 10.5a4 4 0 0 1 .585.396',
      'M6 18a4 4 0 0 1-1.967-.516',
      'M19.967 17.484A4 4 0 0 1 18 18',
    ],
  },
  infografico: {
    box: 120,
    paths: ['M60 12 L108 36 L60 60 L12 36 Z', 'M12 60 L60 84 L108 60', 'M12 82 L60 106 L108 82'],
  },
  fluxograma: {
    box: 120,
    paths: [
      'M40 10 H80 V38 H40 Z',
      'M60 38 V56',
      'M18 56 H102',
      'M18 56 V76',
      'M102 56 V76',
      'M4 76 H50 V104 H4 Z',
      'M70 76 H116 V104 H70 Z',
    ],
  },
  diagrama: {
    box: 120,
    paths: [
      'M60 6 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0',
      'M60 22 V44 M20 44 H100 M20 44 V62 M100 44 V62 M60 44 V62',
      'M4 62 h32 v24 h-32 Z',
      'M44 62 h32 v24 h-32 Z',
      'M84 62 h32 v24 h-32 Z',
    ],
  },
};

function glifo(tipo: string, cx: number, cy: number, size: number, cor: string, opacity: number, sw = 3.4): SceneNode[] {
  const g = GLIFOS[tipo];
  if (!g) return [];
  const s = size / g.box;
  const t = `translate(${cx - size / 2} ${cy - size / 2}) scale(${s})`;
  return g.paths.map((d) => ({
    k: 'path' as const, d, transform: t, stroke: cor, sw: sw / s, fill: 'none', opacity,
  }));
}


/** Assinatura vetorial da marca — nunca depende de imagem externa. */
function marca(rightX: number, baseY: number): SceneNode[] {
  const nodes: SceneNode[] = [];
  const nome = 'VACATIO VADE MECUM';
  const traco = '— Estudos Jurídicos';
  const nomeW = measure(nome, 24, 700, true) + nome.length * 3.4;
  const emblemaX = rightX - nomeW - 70;
  const emblemaY = baseY - 40;

  nodes.push({
    k: 'path',
    d: 'M18 2 L34 8 V22 C34 32 27 39 18 42 C9 39 2 32 2 22 V8 Z',
    transform: `translate(${emblemaX} ${emblemaY})`,
    stroke: PALETA.wine,
    sw: 2.4,
    fill: 'none',
  });
  nodes.push({
    k: 'path',
    d: 'M18 11 V33 M8 17 H28 M8 17 L4 26 H12 Z M28 17 L24 26 H32 Z',
    transform: `translate(${emblemaX} ${emblemaY})`,
    stroke: PALETA.wine,
    sw: 1.8,
    fill: 'none',
  });
  nodes.push({
    k: 'text', x: rightX, y: baseY - 14, text: nome, size: 24, weight: 700,
    fill: PALETA.wine, serif: true, spacing: 3.4, anchor: 'end',
  });
  nodes.push({
    k: 'text', x: rightX, y: baseY + 12, text: traco, size: 16,
    fill: PALETA.inkSoft, italic: true, spacing: 1.2, anchor: 'end',
  });
  return nodes;
}


function header(titulo: string, subtitulo: string | undefined, tipo: string): Frame {
  const nodes: SceneNode[] = [];
  const innerW = W - PAD * 2 - 230;
  
  // Ajuste dinâmico do tamanho do título para caber idealmente em até 2 linhas
  let tSize = 44;
  let tLines = wrap(titulo, innerW, tSize, 700, true);
  for (const s of [40, 36, 32, 28]) {
    if (tLines.length <= 2) break;
    tSize = s;
    tLines = wrap(titulo, innerW, tSize, 700, true);
  }

  const sLines = subtitulo ? wrap(subtitulo, innerW + 70, 21, 400) : [];
  const tLineH = tSize + 8;
  const h = Math.max(190, 52 + tLines.length * tLineH + (sLines.length ? sLines.length * 29 + 10 : 0) + 40);

  nodes.push({ k: 'rect', x: 0, y: 0, w: W, h, fill: PALETA.wineDeep });
  nodes.push({ k: 'rect', x: 0, y: h - 6, w: W, h: 6, fill: PALETA.gold });

  // Marca d'água vazada do formato — grande, à direita, sangrando na borda.
  nodes.push(...glifo(tipo, W - 118, h / 2 - 6, 236, PALETA.white, 0.2, tipo === 'mapa_mental' ? 7 : 3.4));

  let y = 52 + tSize * 0.8;
  tLines.forEach((l) => {
    nodes.push({ k: 'text', x: PAD, y, text: l, size: tSize, weight: 700, fill: PALETA.white, serif: true });
    y += tLineH;
  });
  if (sLines.length) {
    y += 6;
    sLines.forEach((l) => {
      nodes.push({ k: 'text', x: PAD, y, text: l, size: 21, fill: 'rgba(255,255,255,0.78)' });
      y += 29;
    });
  }

  return {
    nodes,
    top: h + 44,
    footer: (totalH) => [
      { k: 'rect', x: 0, y: totalH - FOOTER_H, w: W, h: FOOTER_H, fill: PALETA.paperAlt },
      { k: 'rect', x: 0, y: totalH - FOOTER_H, w: W, h: 2, fill: PALETA.line },
      { k: 'rect', x: PAD, y: totalH - FOOTER_H + 26, w: W - PAD * 2, h: 1, fill: PALETA.line },
      ...marca(W - PAD, totalH - 34),
    ],
  };
}

function fonteLine(fonte: string, totalH: number): SceneNode[] {
  if (!fonte) return [];
  const lines = wrap(`Fonte: ${fonte}`, W - PAD * 2 - 400, 17, 400);
  return lines.slice(0, 2).map((l, i) => ({
    k: 'text' as const, x: PAD, y: totalH - FOOTER_H + 58 + i * 22, text: l, size: 17, fill: PALETA.inkSoft, italic: true,
  }));
}


function bg(h: number): SceneNode[] {
  return [{ k: 'rect', x: 0, y: 0, w: W, h, fill: PALETA.paper }];
}

/* ------------------------------------------------------------------ cards */

function cardTitleBar(x: number, y: number, w: number, titulo: string, numero?: number): { nodes: SceneNode[]; h: number } {
  const nodes: SceneNode[] = [];
  const padX = numero ? 66 : 20;
  const maxW = w - padX - 20;
  // Encolhe a fonte até o título caber em, no máximo, 2 linhas sem reticências.
  let size = 22;
  let lines = wrap(titulo, maxW, size, 700, true);
  for (const s of [20, 18, 17, 16]) {
    const cabe = lines.length <= 2 && lines.every((l) => measure(l, size, 700, true) <= maxW);
    if (cabe) break;
    size = s;
    lines = wrap(titulo, maxW, size, 700, true);
  }
  const lineH = size + 6;
  const h = Math.max(52, lines.length * lineH + 24);
  nodes.push({ k: 'rect', x, y, w, h, r: 0, fill: PALETA.wine });
  if (numero) {
    nodes.push({ k: 'circle', cx: x + 36, cy: y + h / 2, r: 19, fill: PALETA.gold });
    nodes.push({
      k: 'text', x: x + 36, y: y + h / 2 + 7, text: String(numero).padStart(2, '0'), size: 17, weight: 700,
      fill: PALETA.wineDeep, anchor: 'middle',
    });
  }
  let ty = y + (h - lines.length * lineH) / 2 + size - 1;
  lines.forEach((l) => {
    nodes.push({ k: 'text', x: x + padX, y: ty, text: l, size, weight: 700, fill: PALETA.white, serif: true });
    ty += lineH;
  });
  return { nodes, h };
}

function bullets(x: number, y: number, w: number, itens: string[], nota?: string): { nodes: SceneNode[]; h: number } {
  const nodes: SceneNode[] = [];
  let cy = y + 26;
  itens.forEach((item) => {
    const lines = wrap(item, w - 60, 19, 400);
    nodes.push({ k: 'circle', cx: x + 26, cy: cy - 6, r: 4.5, fill: PALETA.gold });
    lines.forEach((l, i) => {
      nodes.push({ k: 'text', x: x + 44, y: cy + i * 26, text: l, size: 19, fill: PALETA.ink });
    });
    cy += lines.length * 26 + 14;
  });
  if (nota) {
    const lines = wrap(nota, w - 66, 16, 400);
    const boxH = lines.length * 22 + 22;
    nodes.push({ k: 'rect', x: x + 18, y: cy - 4, w: w - 36, h: boxH, r: 9, fill: PALETA.wineSoft });
    nodes.push({ k: 'rect', x: x + 18, y: cy - 4, w: 4, h: boxH, r: 2, fill: PALETA.wine });
    lines.forEach((l, i) => {
      nodes.push({ k: 'text', x: x + 34, y: cy + 15 + i * 22, text: l, size: 16, fill: PALETA.wineDeep, italic: true });
    });
    cy += boxH + 8;
  }
  return { nodes, h: cy - y + 10 };
}


function paragraph(x: number, y: number, w: number, texto: string): { nodes: SceneNode[]; h: number } {
  const lines = wrap(texto, w - 40, 19, 400);
  const nodes: SceneNode[] = lines.map((l, i) => ({
    k: 'text' as const, x: x + 20, y: y + 24 + i * 26, text: l, size: 19, fill: PALETA.ink,
  }));
  return { nodes, h: lines.length * 26 + 34 };
}

const arrowDown = (x: number, y1: number, y2: number): SceneNode =>
  ({ k: 'path', d: `M ${x} ${y1} L ${x} ${y2}`, stroke: PALETA.wine, sw: 2.5, arrow: true });

/* --------------------------------------------------------------- layouts */

function layoutMapaMental(c: Extract<VisualContent, { tipo: 'mapa_mental' }>): Scene {
  const f = header(c.titulo, c.subtitulo, 'mapa_mental');
  const nodes: SceneNode[] = [];
  const cardW = 336;
  const centerX = W / 2;

  const cards = c.ramos.map((r) => {
    const bar = cardTitleBar(0, 0, cardW, r.titulo);
    const body = bullets(0, 0, cardW, r.itens, r.nota);
    return { ramo: r, barH: bar.h, bodyH: body.h, h: bar.h + body.h };
  });

  const right = cards.filter((_, i) => i % 2 === 0);
  const left = cards.filter((_, i) => i % 2 === 1);
  const sideH = (arr: typeof cards, gap: number) =>
    arr.reduce((s, x) => s + x.h, 0) + Math.max(0, arr.length - 1) * gap;

  // Aproveita a vertical: alonga o espaçamento até a folha ficar em retrato,
  // com teto para não abrir faixas vazias quando há poucos ramos.
  const ALTURA_ALVO = Math.round(W * 1.34);
  const maiorLado = Math.max(right.length, left.length);
  let GAP = 34;
  const naturalTotal = f.top + Math.max(sideH(right, GAP), sideH(left, GAP), 240) + 60 + FOOTER_H;
  if (naturalTotal < ALTURA_ALVO && maiorLado > 1) {
    GAP = Math.min(120, GAP + (ALTURA_ALVO - naturalTotal) / (maiorLado - 1));
  }
  const contentH = Math.max(sideH(right, GAP), sideH(left, GAP), 240);

  const totalH = f.top + contentH + 60 + FOOTER_H;
  const cy = f.top + contentH / 2;



  // Núcleo central.
  const centralLines = wrap(c.central, 208, 24, 700, true);
  const centralH = Math.max(96, centralLines.length * 32 + 44);
  const centralW = 248;
  nodes.push({ k: 'rect', x: centerX - centralW / 2 + 5, y: cy - centralH / 2 + 6, w: centralW, h: centralH, r: 18, fill: 'rgba(74,11,20,0.14)' });
  nodes.push({ k: 'rect', x: centerX - centralW / 2, y: cy - centralH / 2, w: centralW, h: centralH, r: 18, fill: PALETA.wineDeep, stroke: PALETA.gold, sw: 2 });
  let ly = cy - (centralLines.length * 32) / 2 + 23;
  centralLines.forEach((l) => {
    nodes.push({ k: 'text', x: centerX, y: ly, text: l, size: 24, weight: 700, fill: PALETA.white, anchor: 'middle', serif: true });
    ly += 32;
  });

  const place = (arr: typeof cards, side: 'left' | 'right') => {
    let y = f.top + (contentH - sideH(arr, GAP)) / 2;
    arr.forEach((card) => {
      const x = side === 'right' ? W - PAD - cardW : PAD;
      nodes.push({ k: 'rect', x: x + 4, y: y + 5, w: cardW, h: card.h, r: 12, fill: 'rgba(42,17,20,0.08)' });
      nodes.push({ k: 'rect', x, y, w: cardW, h: card.h, r: 12, fill: PALETA.white, stroke: PALETA.line, sw: 1.5 });
      const bar = cardTitleBar(x, y, cardW, card.ramo.titulo);
      nodes.push(...bar.nodes);
      const body = bullets(x, y + bar.h, cardW, card.ramo.itens, card.ramo.nota);
      nodes.push(...body.nodes);

      // Conector curvo do núcleo até a borda do cartão.
      const anchorY = y + bar.h / 2;
      const from = side === 'right' ? centerX + centralW / 2 : centerX - centralW / 2;
      const to = side === 'right' ? x : x + cardW;
      const mid = (from + to) / 2;
      nodes.push({
        k: 'path',
        d: `M ${from} ${cy} C ${mid} ${cy} ${mid} ${anchorY} ${to} ${anchorY}`,
        stroke: PALETA.wine,
        sw: 2.5,
        fill: 'none',
      });
      nodes.push({ k: 'circle', cx: to, cy: anchorY, r: 5, fill: PALETA.gold });
      y += card.h + GAP;
    });
  };
  place(right, 'right');
  place(left, 'left');

  return { w: W, h: totalH, nodes: [...bg(totalH), ...f.nodes, ...nodes, ...f.footer(totalH), ...fonteLine(c.fonte, totalH)] };
}

function layoutInfografico(c: Extract<VisualContent, { tipo: 'infografico' }>): Scene {
  const f = header(c.titulo, c.subtitulo, 'infografico');
  const nodes: SceneNode[] = [];
  const GAP = 28;
  const colW = (W - PAD * 2 - GAP) / 2;

  const measured = c.cards.map((card, i) => {
    const bar = cardTitleBar(0, 0, colW, card.titulo, i + 1);
    const body = paragraph(0, 0, colW, card.texto);
    return { card, i, barH: bar.h, h: bar.h + body.h };
  });

  let y = f.top;
  for (let r = 0; r < measured.length; r += 2) {
    const row = measured.slice(r, r + 2);
    const rowH = Math.max(...row.map((m) => m.h));
    row.forEach((m, ci) => {
      const x = PAD + ci * (colW + GAP);
      nodes.push({ k: 'rect', x: x + 4, y: y + 5, w: colW, h: rowH, r: 12, fill: 'rgba(42,17,20,0.08)' });
      nodes.push({ k: 'rect', x, y, w: colW, h: rowH, r: 12, fill: PALETA.white, stroke: PALETA.line, sw: 1.5 });
      const bar = cardTitleBar(x, y, colW, m.card.titulo, m.i + 1);
      nodes.push(...bar.nodes);
      nodes.push(...paragraph(x, y + bar.h, colW, m.card.texto).nodes);
    });
    y += rowH + GAP;
  }

  let rodapeH = 0;
  if (c.rodape) {
    const lines = wrap(c.rodape, W - PAD * 2 - 60, 20, 400);
    rodapeH = lines.length * 28 + 44;
    nodes.push({ k: 'rect', x: PAD, y, w: W - PAD * 2, h: rodapeH - 10, r: 12, fill: PALETA.wineSoft });
    nodes.push({ k: 'rect', x: PAD, y, w: 6, h: rodapeH - 10, fill: PALETA.wine });
    lines.forEach((l, i) => {
      nodes.push({ k: 'text', x: PAD + 30, y: y + 34 + i * 28, text: l, size: 20, fill: PALETA.wineDeep, italic: true });
    });
    y += rodapeH;
  }

  const totalH = y + 24 + FOOTER_H;
  return { w: W, h: totalH, nodes: [...bg(totalH), ...f.nodes, ...nodes, ...f.footer(totalH), ...fonteLine(c.fonte, totalH)] };
}

function layoutFluxograma(c: Extract<VisualContent, { tipo: 'fluxograma' }>): Scene {
  const f = header(c.titulo, c.subtitulo, 'fluxograma');
  const nodes: SceneNode[] = [];
  const mainW = 480;
  const mainX = PAD;
  const mainCx = mainX + mainW / 2;
  const outW = 320;
  const outX = W - PAD - outW;

  let y = f.top;

  // Entrada.
  const entLines = wrap(c.entrada, mainW - 60, 21, 700);
  const entH = Math.max(54, entLines.length * 28 + 26);
  nodes.push({ k: 'rect', x: mainX, y, w: mainW, h: entH, r: entH / 2, fill: PALETA.wineDeep });
  entLines.forEach((l, i) => {
    nodes.push({ k: 'text', x: mainCx, y: y + 24 + i * 28 + (entH - entLines.length * 28 - 10) / 2, text: l, size: 21, weight: 700, fill: PALETA.white, anchor: 'middle' });
  });
  y += entH;

  c.decisoes.forEach((d, idx) => {
    const arrowH = 46;
    nodes.push(arrowDown(mainCx, y, y + arrowH - 8));
    if (idx > 0) {
      nodes.push({ k: 'text', x: mainCx + 14, y: y + 28, text: 'SIM', size: 14, weight: 700, fill: PALETA.wine, spacing: 1.2 });
    }
    y += arrowH;

    const qLines = wrap(d.pergunta, mainW - 70, 21, 700, true);
    const baseLines = d.base ? wrap(d.base, mainW - 70, 15, 400, false) : [];
    const baseH = baseLines.length ? baseLines.length * 20 + 8 : 0;
    const boxH = qLines.length * 29 + 46 + baseH;

    // Saída "NÃO" — cartão à direita
    const nLines = wrap(d.seNao, outW - 44, 17, 400);
    const outH = nLines.length * 24 + 54;

    // O passo vertical deve comportar tanto a caixa principal quanto o cartão do NÃO
    const stepH = Math.max(boxH, outH);
    const outY = y + (stepH - outH) / 2;

    nodes.push({ k: 'rect', x: mainX + 4, y: y + 5, w: mainW, h: boxH, r: 12, fill: 'rgba(42,17,20,0.08)' });
    nodes.push({ k: 'rect', x: mainX, y, w: mainW, h: boxH, r: 12, fill: PALETA.white, stroke: PALETA.wine, sw: 2.5 });
    nodes.push({ k: 'rect', x: mainX, y, w: 6, h: boxH, fill: PALETA.wine });
    qLines.forEach((l, i) => {
      nodes.push({ k: 'text', x: mainCx + 3, y: y + 34 + i * 29, text: l, size: 21, weight: 700, fill: PALETA.wineDeep, anchor: 'middle', serif: true });
    });
    if (baseLines.length) {
      baseLines.forEach((bl, bi) => {
        nodes.push({
          k: 'text', x: mainCx + 3, y: y + 34 + qLines.length * 29 + 6 + bi * 20, text: bl, size: 15,
          fill: PALETA.wine, anchor: 'middle', italic: true, spacing: 0.6,
        });
      });
    }

    // Card do "NÃO"
    nodes.push({ k: 'rect', x: outX, y: outY, w: outW, h: outH, r: 12, fill: PALETA.paperAlt, stroke: PALETA.line, sw: 1.5 });
    nodes.push({ k: 'text', x: outX + 22, y: outY + 26, text: 'NÃO', size: 14, weight: 700, fill: PALETA.wine, spacing: 1.4 });
    nLines.forEach((l, i) => {
      nodes.push({ k: 'text', x: outX + 22, y: outY + 48 + i * 24, text: l, size: 17, fill: PALETA.ink });
    });

    // Conector lateral pontilhado entre a caixa de decisão e o cartão do NÃO
    const midY = y + boxH / 2;
    nodes.push({
      k: 'path',
      d: `M ${mainX + mainW} ${midY} L ${outX} ${midY}`,
      stroke: PALETA.inkSoft,
      sw: 2,
      dash: '7 6',
      arrow: true,
    });

    y += stepH + 16;
  });

  nodes.push(arrowDown(mainCx, y, y + 38));
  nodes.push({ k: 'text', x: mainCx + 14, y: y + 26, text: 'SIM', size: 14, weight: 700, fill: PALETA.wine, spacing: 1.2 });
  y += 46;

  const rLines = wrap(c.resultado, mainW - 60, 22, 700, true);
  const rH = rLines.length * 30 + 40;
  nodes.push({ k: 'rect', x: mainX, y, w: mainW, h: rH, r: 12, fill: PALETA.wine, stroke: PALETA.gold, sw: 2 });
  rLines.forEach((l, i) => {
    nodes.push({ k: 'text', x: mainCx, y: y + 32 + i * 30, text: l, size: 22, weight: 700, fill: PALETA.white, anchor: 'middle', serif: true });
  });
  y += rH;

  const totalH = y + 30 + FOOTER_H;
  return { w: W, h: totalH, nodes: [...bg(totalH), ...f.nodes, ...nodes, ...f.footer(totalH), ...fonteLine(c.fonte, totalH)] };
}

function layoutDiagrama(c: Extract<VisualContent, { tipo: 'diagrama' }>): Scene {
  const f = header(c.titulo, c.subtitulo, 'diagrama');
  const nodes: SceneNode[] = [];
  const n = c.grupos.length;
  const GAP = 26;
  const colW = (W - PAD * 2 - GAP * (n - 1)) / n;

  let y = f.top;
  const raizLines = wrap(c.raiz, W / 2 - 40, 26, 700, true);
  const raizW = Math.min(W - PAD * 2, Math.max(320, Math.max(...raizLines.map((l) => measure(l, 26, 700, true))) + 80));
  const raizH = raizLines.length * 34 + 40;
  const raizX = (W - raizW) / 2;
  nodes.push({ k: 'rect', x: raizX, y, w: raizW, h: raizH, r: 14, fill: PALETA.wineDeep, stroke: PALETA.gold, sw: 2 });
  raizLines.forEach((l, i) => {
    nodes.push({ k: 'text', x: W / 2, y: y + 32 + i * 34, text: l, size: 26, weight: 700, fill: PALETA.white, anchor: 'middle', serif: true });
  });
  y += raizH;

  // Barramento: desce do centro, distribui na horizontal e desce até cada coluna.
  const busY = y + 34;
  nodes.push({ k: 'path', d: `M ${W / 2} ${y} L ${W / 2} ${busY}`, stroke: PALETA.wine, sw: 2.5 });
  const centers = Array.from({ length: n }, (_, i) => PAD + i * (colW + GAP) + colW / 2);
  nodes.push({ k: 'path', d: `M ${centers[0]} ${busY} L ${centers[n - 1]} ${busY}`, stroke: PALETA.wine, sw: 2.5 });
  centers.forEach((cx) => {
    nodes.push({ k: 'path', d: `M ${cx} ${busY} L ${cx} ${busY + 34}`, stroke: PALETA.wine, sw: 2.5, arrow: true });
  });
  const colY = busY + 42;

  const heights = c.grupos.map((g) => {
    const bar = cardTitleBar(0, 0, colW, g.titulo);
    return bar.h + bullets(0, 0, colW, g.itens, g.nota).h;
  });
  const colH = Math.max(...heights);

  c.grupos.forEach((g, i) => {
    const x = PAD + i * (colW + GAP);
    nodes.push({ k: 'rect', x: x + 4, y: colY + 5, w: colW, h: colH, r: 12, fill: 'rgba(42,17,20,0.08)' });
    nodes.push({ k: 'rect', x, y: colY, w: colW, h: colH, r: 12, fill: PALETA.white, stroke: PALETA.line, sw: 1.5 });
    const bar = cardTitleBar(x, colY, colW, g.titulo);
    nodes.push(...bar.nodes);
    nodes.push(...bullets(x, colY + bar.h, colW, g.itens, g.nota).nodes);
  });

  const totalH = colY + colH + 34 + FOOTER_H;
  return { w: W, h: totalH, nodes: [...bg(totalH), ...f.nodes, ...nodes, ...f.footer(totalH), ...fonteLine(c.fonte, totalH)] };
}

export function buildScene(content: VisualContent): Scene {
  switch (content.tipo) {
    case 'mapa_mental':
      return layoutMapaMental(content);
    case 'infografico':
      return layoutInfografico(content);
    case 'fluxograma':
      return layoutFluxograma(content);
    default:
      return layoutDiagrama(content);
  }
}

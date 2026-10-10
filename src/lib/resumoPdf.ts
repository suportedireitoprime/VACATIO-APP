import { jsPDF } from "jspdf";
import { PALETA } from "@/lib/visuaisJuridicos/layout";
import { baixarBlob } from '@/lib/nativo';

type ResumoLike = {
  area: string;
  tema: string;
  subtema: string | null;
  markdown: string | null;
  exemplos?: string | null;
  termos?: string | null;
};

/* ------------------------------------------------------------------ paleta */

type RGB = [number, number, number];

const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const COR = {
  paper: hex(PALETA.paper),
  paperAlt: hex(PALETA.paperAlt),
  ink: hex(PALETA.ink),
  inkSoft: hex(PALETA.inkSoft),
  wine: hex(PALETA.wine),
  wineDeep: hex(PALETA.wineDeep),
  wineSoft: hex(PALETA.wineSoft),
  gold: hex(PALETA.gold),
  line: hex(PALETA.line),
  white: [255, 255, 255] as RGB,
};

/* Glifos vazados — mesmos traçados dos visuais jurídicos. */
const BRAIN = {
  box: 24,
  paths: [
    "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",
    "M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z",
    "M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4",
    "M17.599 6.5a3 3 0 0 0 .399-1.375",
    "M6.003 5.125A3 3 0 0 0 6.401 6.5",
    "M3.477 10.896a4 4 0 0 1 .585-.396",
    "M19.938 10.5a4 4 0 0 1 .585.396",
    "M6 18a4 4 0 0 1-1.967-.516",
    "M19.967 17.484A4 4 0 0 1 18 18",
  ],
};

const ESCUDO = {
  box: 44,
  paths: [
    "M18 2 L34 8 V22 C34 32 27 39 18 42 C9 39 2 32 2 22 V8 Z",
    "M18 11 V33 M8 17 H28 M8 17 L4 26 H12 Z M28 17 L24 26 H32 Z",
  ],
};

/** Rasteriza traçados SVG em PNG — usado nas marcas d'água e no emblema. */
function glifoPng(
  glifo: { box: number; paths: string[] },
  cor: RGB,
  px: number,
  larguraTraco: number,
  alfa: number
): string | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const escala = px / glifo.box;
    ctx.scale(escala, escala);
    ctx.strokeStyle = `rgba(${cor[0]},${cor[1]},${cor[2]},${alfa})`;
    ctx.lineWidth = larguraTraco;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const d of glifo.paths) ctx.stroke(new Path2D(d));
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------- markdown */

type Bloco = { tipo: "h1" | "h2" | "h3" | "p" | "li" | "quote"; texto: string };

function parseMarkdown(md: string): Bloco[] {
  const linhas = md.replace(/\r/g, "").split("\n");
  const blocos: Bloco[] = [];
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length) {
      blocos.push({ tipo: "p", texto: limpar(buffer.join(" ")) });
      buffer = [];
    }
  };

  for (const raw of linhas) {
    const linha = raw.trim();
    if (!linha) {
      flush();
      continue;
    }
    if (/^###\s+/.test(linha)) {
      flush();
      blocos.push({ tipo: "h3", texto: limpar(linha.replace(/^###\s+/, "")) });
    } else if (/^##\s+/.test(linha)) {
      flush();
      blocos.push({ tipo: "h2", texto: limpar(linha.replace(/^##\s+/, "")) });
    } else if (/^#\s+/.test(linha)) {
      flush();
      blocos.push({ tipo: "h1", texto: limpar(linha.replace(/^#\s+/, "")) });
    } else if (/^>\s?/.test(linha)) {
      flush();
      blocos.push({ tipo: "quote", texto: limpar(linha.replace(/^>\s?/, "")) });
    } else if (/^([-*+]|\d+\.)\s+/.test(linha)) {
      flush();
      blocos.push({ tipo: "li", texto: limpar(linha.replace(/^([-*+]|\d+\.)\s+/, "")) });
    } else if (/^\|/.test(linha)) {
      flush();
      const celulas = linha
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (celulas.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      blocos.push({ tipo: "p", texto: limpar(celulas.join("  •  ")) });
    } else {
      buffer.push(linha);
    }
  }
  flush();
  return blocos;
}

function limpar(t: string) {
  return t
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/* ------------------------------------------------------------------- pdf */

export async function gerarResumoPdf(resumo: ResumoLike) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 210;
  const A = 297;
  const PAD = 18;
  const RODAPE_H = 26;
  const UTIL = L - PAD * 2;
  const BASE = A - RODAPE_H - 10;

  const titulo = resumo.subtema || resumo.tema || "Resumo";
  const cerebro = glifoPng(BRAIN, COR.white, 420, 1.5, 0.22);
  const emblema = glifoPng(ESCUDO, COR.wine, 220, 1.6, 1);

  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const texto = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const traco = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

  /** Fundo papel + rodapé com assinatura da marca. */
  const moldura = (pagina: number) => {
    fill(COR.paper);
    doc.rect(0, 0, L, A, "F");

    fill(COR.paperAlt);
    doc.rect(0, A - RODAPE_H, L, RODAPE_H, "F");
    fill(COR.line);
    doc.rect(0, A - RODAPE_H, L, 0.4, "F");

    if (emblema) doc.addImage(emblema, "PNG", L - PAD - 46, A - RODAPE_H + 7, 8, 8);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    texto(COR.wine);
    doc.text("DIREITO PRIME", L - PAD, A - RODAPE_H + 13, { align: "right" });
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    texto(COR.inkSoft);
    doc.text("— Estudos Jurídicos", L - PAD, A - RODAPE_H + 18.5, { align: "right" });

    if (pagina > 1) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      texto(COR.inkSoft);
      doc.text(titulo.toUpperCase().slice(0, 60), PAD, A - RODAPE_H + 13);
      doc.text(String(pagina - 1).padStart(2, "0"), PAD, A - RODAPE_H + 18.5);
    }
  };

  /* ---------------------------------------------------------------- capa */

  moldura(1);

  const tituloLinhas = doc.setFont("times", "bold").setFontSize(30).splitTextToSize(titulo, UTIL - 34);
  const capaH = Math.max(96, 46 + tituloLinhas.length * 12 + 30);

  fill(COR.wineDeep);
  doc.rect(0, 0, L, capaH, "F");
  fill(COR.gold);
  doc.rect(0, capaH - 2, L, 2, "F");
  if (cerebro) doc.addImage(cerebro, "PNG", L - 62, capaH / 2 - 26, 52, 52);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  texto(COR.gold);
  doc.text("RESUMO JURÍDICO", PAD, 22, { charSpace: 1.4 });

  doc.setFont("times", "bold");
  doc.setFontSize(30);
  texto(COR.white);
  let cy = 40;
  tituloLinhas.forEach((linha: string) => {
    doc.text(linha, PAD, cy);
    cy += 12;
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  const subtitulo = [resumo.area, resumo.tema].filter(Boolean).join(" — ");
  doc.splitTextToSize(subtitulo, UTIL - 40).slice(0, 2).forEach((linha: string, i: number) => {
    doc.text(linha, PAD, cy + 4 + i * 6);
  });

  let y = capaH + 8;
  let pagina = 1;

  const quebra = (altura: number) => {
    if (y + altura > BASE) {
      doc.addPage();
      pagina++;
      moldura(pagina);
      y = 26;
    }
  };

  /* ------------------------------------------------------------- blocos */

  const escrever = (blocos: Bloco[]) => {
    for (const b of blocos) {
      if (b.tipo === "h1" || b.tipo === "h2" || b.tipo === "h3") {
        const size = b.tipo === "h3" ? 12 : 14;
        const fonte = () => doc.setFont("times", "bold").setFontSize(size);
        fonte();
        const linhas = doc.splitTextToSize(b.texto, UTIL - 6);
        // +22 mantém o título junto do parágrafo que vem depois (sem viúva no pé).
        quebra(linhas.length * (size * 0.46) + 34);
        fonte();
        y += 8;
        fill(COR.gold);
        doc.rect(PAD, y - 4.4, 12, 1.1, "F");
        y += 4;
        texto(COR.wine);
        linhas.forEach((linha: string) => {
          doc.text(linha, PAD, y);
          y += size * 0.46;
        });
        y += 2.4;
        continue;
      }

      if (b.tipo === "quote") {
        const fonte = () => doc.setFont("helvetica", "italic").setFontSize(10);
        fonte();
        const linhas = doc.splitTextToSize(b.texto, UTIL - 16);
        const caixaH = linhas.length * 5 + 8;
        quebra(caixaH + 6);
        fonte();
        y += 3;
        fill(COR.wineSoft);
        doc.roundedRect(PAD, y, UTIL, caixaH, 2, 2, "F");
        fill(COR.wine);
        doc.rect(PAD, y, 1.4, caixaH, "F");
        texto(COR.wineDeep);
        linhas.forEach((linha: string, i: number) => doc.text(linha, PAD + 7, y + 6.4 + i * 5));
        y += caixaH + 4;
        continue;
      }

      if (b.tipo === "li") {
        const fonte = () => doc.setFont("helvetica", "normal").setFontSize(10.5);
        fonte();
        const linhas = doc.splitTextToSize(b.texto, UTIL - 8);
        quebra(linhas.length * 5.6 + 3);
        fonte();
        y += 1.5;
        fill(COR.gold);
        doc.circle(PAD + 1.8, y - 1.4, 1.05, "F");
        texto(COR.ink);
        linhas.forEach((linha: string, i: number) => doc.text(linha, PAD + 6.5, y + i * 5.6));
        y += linhas.length * 5.6 + 1.5;
        continue;
      }

      const fonte = () => doc.setFont("helvetica", "normal").setFontSize(10.5);
      fonte();
      const linhas = doc.splitTextToSize(b.texto, UTIL);
      quebra(linhas.length * 5.6 + 4);
      fonte();
      y += 2;
      texto(COR.ink);
      linhas.forEach((linha: string, i: number) => {
        const ultima = i === linhas.length - 1;
        doc.text(linha, PAD, y + i * 5.6, {
          maxWidth: UTIL,
          align: ultima ? "left" : "justify",
        });
      });
      y += linhas.length * 5.6 + 2.5;
    }
  };


  /** Faixa vinho de seção — mesma barra dos cartões do mapa mental. */
  const secao = (rotulo: string, conteudo?: string | null) => {
    if (!conteudo?.trim()) return;
    quebra(34);
    y += 8;
    fill(COR.wine);
    doc.rect(PAD, y, UTIL, 11, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(12.5);
    texto(COR.white);
    doc.text(rotulo.toUpperCase(), PAD + 7, y + 7.6, { charSpace: 0.8 });
    y += 11 + 7;
    escrever(parseMarkdown(conteudo));
  };

  secao("Resumo", resumo.markdown);
  secao("Exemplos", resumo.exemplos);
  secao("Termos", resumo.termos);

  const nome = (resumo.subtema || resumo.tema || "resumo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .slice(0, 60);

  await baixarBlob(doc.output("blob"), `${nome || "resumo"}.pdf`, {
    titulo: resumo.subtema || resumo.tema || "Resumo",
  });
}

export function resumoParaTexto(resumo: ResumoLike) {
  const partes = [
    `${resumo.subtema || resumo.tema}`,
    `${resumo.area} · ${resumo.tema}`,
    "",
    resumo.markdown || "",
  ];
  if (resumo.exemplos) partes.push("", "EXEMPLOS", resumo.exemplos);
  if (resumo.termos) partes.push("", "TERMOS", resumo.termos);
  return partes.join("\n");
}

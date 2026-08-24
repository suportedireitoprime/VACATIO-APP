// Oferta de material complementar do Horus: após uma explicação, ele oferece
// um PDF (gerado na hora com o conteúdo da explicação) ou uma videoaula
// (buscada pela API interna `buscar-videoaulas`).

import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { evolution } from "./evolution.ts";
import { buscarLivroPorTema } from "./horusBiblioteca.ts";

/** Frase-âncora: também serve de marcador para detectar a oferta pendente. */
export const OFERTA_FRASE =
  "Se você quiser uma *videoaula* ou um *PDF* sobre esse tema, é só responder *PDF* ou *vídeo* 🦉";

const OFERTA_MARCADOR = /videoaula.{0,20}ou um .{0,3}pdf/i;

export function textoTemOferta(texto: unknown): boolean {
  return OFERTA_MARCADOR.test(String(texto || ""));
}

/**
 * Detecta um pedido explícito de material, mesmo sem oferta pendente.
 * Ex.: "me manda um PDF sobre usucapião", "quero uma videoaula de direito penal".
 */
export function detectarPedidoMaterial(
  texto: unknown,
): { tipo: "pdf" | "video"; tema: string | null } | null {
  const raw = String(texto || "").trim();
  if (!raw || raw.length > 220) return null;
  const t = raw.toLowerCase();
  const querPdf = /\b(pdf|apostila|material de estudo|livro)\b/.test(t);
  const querVideo = /\b(v[ií]deo ?aula|videoaula|v[ií]deo|youtube|aula em v[ií]deo)\b/.test(t);
  if (!querPdf && !querVideo) return null;
  const pedido = /\b(manda|envia|envie|quero|preciso|me d[êe]|tem|pode mandar|gostaria|busca|procura|arruma)\b/
    .test(t);
  if (!pedido) return null;
  const m = raw.match(/\b(?:sobre|de|do|da|acerca de|a respeito de)\s+(.{3,120})$/i);
  let tema = m ? m[1] : null;
  if (tema) {
    tema = tema.replace(/[?!.]+$/, "").replace(/[*_~`]/g, "").trim();
    if (tema.length < 3) tema = null;
  }
  return { tipo: querVideo && !querPdf ? "video" : "pdf", tema };
}

/** Detecta se a resposta curta do usuário aceita PDF ou vídeo. */
export function detectarEscolha(texto: unknown): "pdf" | "video" | null {
  const t = String(texto || "").trim().toLowerCase();
  if (!t || t.length > 60) return null;
  if (/\b(pdf|apostila|resumo em pdf|material|documento)\b/.test(t)) return "pdf";
  if (/\b(v[ií]deo|videoaula|video aula|aula em v[ií]deo|youtube)\b/.test(t)) return "video";
  return null;
}

/** Só oferece depois de explicações de verdade (não em saudações/respostas curtas). */
export function deveOferecer(intent: string, pergunta: string, resposta: string): boolean {
  if (textoTemOferta(resposta)) return false;
  if ((resposta || "").length < 320) return false;
  const explicativo = /explica|d[uú]vida|conceito|estud|jur[ií]dic|resum/i.test(
    `${intent} ${pergunta}`,
  );
  return explicativo || /art(?:igo)?\.?\s*\d/i.test(pergunta);
}

// ─────────────────────────── PDF ───────────────────────────

/** Remove emojis/caracteres fora do Latin-1 (Helvetica só cobre WinAnsi). */
function sanitizar(s: string): string {
  return String(s || "")
    .replace(/[*_~`]/g, "")
    .replace(/[^\u0000-\u00FF\n]/g, "")
    .replace(/\r/g, "");
}

function quebrarLinhas(texto: string, font: any, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    if (!paragrafo.trim()) { out.push(""); continue; }
    let linha = "";
    for (const palavra of paragrafo.split(/\s+/)) {
      const tentativa = linha ? `${linha} ${palavra}` : palavra;
      if (font.widthOfTextAtSize(tentativa, size) > maxWidth && linha) {
        out.push(linha);
        linha = palavra;
      } else {
        linha = tentativa;
      }
    }
    if (linha) out.push(linha);
  }
  return out;
}

/** Gera um PDF simples (A4) com o conteúdo da explicação. Retorna base64. */
export async function gerarPdfExplicacao(titulo: string, conteudo: string): Promise<string> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28, H = 841.89, M = 56;
  const maxWidth = W - M * 2;
  let page = doc.addPage([W, H]);
  let y = H - M;

  const tituloLinhas = quebrarLinhas(sanitizar(titulo) || "Material de estudo", bold, 18, maxWidth);
  for (const l of tituloLinhas) {
    page.drawText(l, { x: M, y, size: 18, font: bold, color: rgb(0.12, 0.12, 0.12) });
    y -= 24;
  }
  y -= 6;
  page.drawLine({
    start: { x: M, y }, end: { x: W - M, y },
    thickness: 1, color: rgb(0.85, 0.72, 0.15),
  });
  y -= 26;

  const linhas = quebrarLinhas(sanitizar(conteudo), font, 11.5, maxWidth);
  for (const linha of linhas) {
    if (y < M + 40) {
      page = doc.addPage([W, H]);
      y = H - M;
    }
    if (linha) {
      page.drawText(linha, { x: M, y, size: 11.5, font, color: rgb(0.15, 0.15, 0.15) });
    }
    y -= 16.5;
  }

  // Rodapé em todas as páginas
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Vade Mecum - Horus  |  pagina ${i + 1} de ${pages.length}`, {
      x: M, y: 28, size: 8.5, font, color: rgb(0.5, 0.5, 0.5),
    });
  });

  const bytes = await doc.save();
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** Envia o PDF gerado na hora (fallback quando não há livro na biblioteca). */
async function enviarPdfGerado(
  target: string,
  titulo: string,
  conteudo: string,
): Promise<boolean> {
  try {
    const base64 = await gerarPdfExplicacao(titulo, conteudo);
    const nome = (sanitizar(titulo) || "material")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "material";
    await evolution.sendDocument(target, {
      media: base64,
      fileName: `${nome}.pdf`,
      caption: `📄 *${titulo}*\n\nSeu material em PDF, feito sob medida. Bons estudos! 🦉`,
      mimetype: "application/pdf",
    });
    return true;
  } catch (e) {
    console.error("horus oferta: falha ao enviar PDF gerado", String((e as Error)?.message || e));
    return false;
  }
}

/**
 * Envia material em PDF sobre o tema:
 *  1) procura na biblioteca do app o livro/PDF que combina com o assunto e
 *     manda o card (capa + sinopse + botão com o link do Drive);
 *  2) se não achar nada, gera um PDF com a explicação do Horus.
 * Retorna o texto registrado no histórico, ou null se falhou tudo.
 */
export async function enviarPdf(
  admin: any,
  target: string,
  tema: string,
  conteudoFallback: string,
): Promise<string | null> {
  let livro = null;
  try {
    livro = await buscarLivroPorTema(admin, tema);
  } catch (e) {
    console.warn("enviarPdf: busca na biblioteca falhou", String((e as Error)?.message || e));
  }

  if (livro?.driveUrl) {
    const sinopse = String(livro.sobre || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 280);
    const descricao =
      `${livro.autor ? `_${livro.autor}_\n\n` : ""}` +
      `${sinopse || "Material da biblioteca do Vade Mecum sobre o tema que você pediu."}` +
      `${sinopse.length === 280 ? "…" : ""}`;
    try {
      if (livro.capa) {
        await evolution.sendImageCta(target, {
          imageUrl: livro.capa,
          title: `📚 ${livro.titulo}`,
          description: descricao,
          buttonLabel: "📄 Abrir PDF",
          url: livro.driveUrl,
          footer: "Biblioteca Vade Mecum • Horus 🦉",
        });
      } else {
        await evolution.sendCtaUrl(target, {
          title: `📚 ${livro.titulo}`,
          description: descricao,
          buttonLabel: "📄 Abrir PDF",
          url: livro.driveUrl,
          footer: "Biblioteca Vade Mecum • Horus 🦉",
        });
      }
      return `[PDF da biblioteca] ${livro.titulo} — ${livro.driveUrl}`;
    } catch (e) {
      console.warn("enviarPdf: card falhou, indo de texto", String((e as Error)?.message || e));
      const msg =
        `📚 *${livro.titulo}*\n${livro.autor ? `_${livro.autor}_\n` : ""}\n` +
        `${sinopse}\n\n👉 ${livro.driveUrl}\n\nBons estudos! 🦉`;
      await evolution.sendText(target, msg).catch(() => {});
      return msg;
    }
  }

  const ok = await enviarPdfGerado(target, tema, conteudoFallback || tema);
  return ok ? `[PDF gerado] ${tema}` : null;
}

// ───────────────────────── Videoaula ─────────────────────────

export interface VideoResultado {
  titulo: string;
  canal: string;
  url: string;
  thumb?: string;
}

/** Usa a edge function interna `buscar-videoaulas` (modo tema). */
export async function buscarVideoaula(tema: string): Promise<VideoResultado | null> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/buscar-videoaulas`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
      body: JSON.stringify({ tema }),
    });
    if (!res.ok) {
      console.warn("buscar-videoaulas falhou", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    const v = Array.isArray(data?.videos) ? data.videos[0] : null;
    if (!v?.url) return null;
    return { titulo: v.titulo, canal: v.canal, url: v.url, thumb: v.thumb };
  } catch (e) {
    console.warn("buscar-videoaulas erro", String((e as Error)?.message || e));
    return null;
  }
}

export async function enviarVideoaula(target: string, tema: string): Promise<string> {
  const video = await buscarVideoaula(tema);
  if (!video) {
    const msg = `Não encontrei uma videoaula boa sobre *${tema}* agora 😕 Quer que eu te mande em *PDF*?`;
    await evolution.sendText(target, msg).catch(() => {});
    return msg;
  }
  const descricao = `${video.canal}\n\nVideoaula selecionada sobre *${tema}*.`;
  try {
    if (video.thumb) {
      await evolution.sendImageCta(target, {
        imageUrl: video.thumb,
        title: `🎥 ${video.titulo}`,
        description: descricao,
        buttonLabel: "▶️ Assistir no YouTube",
        url: video.url,
        footer: "Videoaulas • Horus 🦉",
      });
    } else {
      await evolution.sendCtaUrl(target, {
        title: `🎥 ${video.titulo}`,
        description: descricao,
        buttonLabel: "▶️ Assistir no YouTube",
        url: video.url,
        footer: "Videoaulas • Horus 🦉",
      });
    }
    return `[Videoaula] ${video.titulo} — ${video.url}`;
  } catch (e) {
    console.warn("enviarVideoaula: card falhou", String((e as Error)?.message || e));
    const msg =
      `🎥 *Videoaula sobre ${tema}*\n\n*${video.titulo}*\n_${video.canal}_\n\n👉 ${video.url}\n\nBons estudos! 🦉`;
    await evolution.sendText(target, msg);
    return msg;
  }
}

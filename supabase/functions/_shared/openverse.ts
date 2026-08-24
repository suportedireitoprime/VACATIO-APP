// Helper: busca imagens gratuitas no Openverse (https://api.openverse.org).
// Sem chave de API. Retorna a primeira imagem horizontal com boa resolução.

import { geminiFetch } from "./geminiFetch.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const TEXT_MODEL = "gemini-flash-lite-latest";

export type OpenverseHit = {
  url: string;
  thumbnail: string;
  title: string;
  creator: string;
  creator_url: string;
  license: string;
  license_url: string;
  foreign_landing_url: string;
  width: number;
  height: number;
};

export type TermoBusca = { ptBR: string; en: string };

/** Gera 2 termos curtos (pt-BR + en) para a imagem, a partir do título+resumo. */
export async function gerarTermoBusca(titulo: string, resumo: string): Promise<TermoBusca> {
  const prompt = `Você recebe o título e o resumo de uma norma jurídica brasileira.
Devolva SOMENTE JSON no formato:
{ "ptBR": "2-4 palavras para buscar uma FOTO ilustrativa", "en": "2-4 English words for the same picture" }

Regras:
- Foque no TEMA/SETOR da norma (saúde, meio ambiente, tecnologia, tributário, criança, trânsito, agro, etc.), NÃO em termos jurídicos abstratos.
- Prefira substantivos concretos que existam em bancos de fotos.
- Evite palavras como "lei", "decreto", "artigo", "código".

TÍTULO: ${titulo}
RESUMO: ${resumo}`;

  try {
    const res = await geminiFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
        }),
      },
    );
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(raw);
    return {
      ptBR: String(parsed?.ptBR || "").trim(),
      en: String(parsed?.en || "").trim(),
    };
  } catch (e) {
    console.warn("[openverse] gerarTermoBusca falhou:", e);
    return { ptBR: "", en: "" };
  }
}

async function fetchOpenverse(q: string): Promise<OpenverseHit | null> {
  if (!q) return null;
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=10&license_type=commercial&mature=false&aspect_ratio=wide,square&size=medium,large`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const hits = (data?.results || []) as any[];
    // Escolhe a primeira com largura decente
    for (const h of hits) {
      if (!h?.url) continue;
      if ((h.width || 0) < 800) continue;
      return {
        url: h.url,
        thumbnail: h.thumbnail || h.url,
        title: h.title || "",
        creator: h.creator || "",
        creator_url: h.creator_url || "",
        license: h.license || "",
        license_url: h.license_url || "",
        foreign_landing_url: h.foreign_landing_url || "",
        width: h.width || 0,
        height: h.height || 0,
      };
    }
    return null;
  } catch (e) {
    console.warn("[openverse] fetch falhou:", e);
    return null;
  }
}

/** Tenta pt-BR primeiro, depois en. */
export async function buscarImagemOpenverse(termo: TermoBusca): Promise<OpenverseHit | null> {
  return (await fetchOpenverse(termo.ptBR)) || (await fetchOpenverse(termo.en));
}

/** Baixa a imagem em bytes. Retorna null em falha. */
export async function baixarImagem(url: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { bytes, contentType };
  } catch (e) {
    console.warn("[openverse] download falhou:", e);
    return null;
  }
}

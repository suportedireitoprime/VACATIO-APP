import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

async function fetchHtmlOnce(url: string): Promise<string> {
  const fullUrl = url.replace(/^http:/, "https:");
  const res = await fetch(fullUrl, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${fullUrl}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let html: string;
  try {
    html = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    html = new TextDecoder("windows-1252").decode(bytes);
  }
  return html
    .normalize("NFC")
    .replace(/\uFFFD/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function urlVariants(url: string): string[] {
  const u = url.replace(/^http:/, "https:");
  const out = new Set<string>([u]);
  if (/compilado\.htm$/i.test(u)) out.add(u.replace(/compilado\.htm$/i, ".htm"));
  else if (/\.htm$/i.test(u)) out.add(u.replace(/\.htm$/i, "compilado.htm"));
  out.add(u.replace("/LEIS/", "/leis/"));
  out.add(u.replace("/leis/", "/LEIS/"));
  out.add(u.replace("://www.planalto", "://planalto"));
  out.add(u.replace("://planalto", "://www.planalto"));
  return [...out];
}

async function fetchHtml(url: string): Promise<string> {
  const variants = urlVariants(url);
  let lastErr: unknown = null;
  for (const v of variants) {
    try {
      return await fetchHtmlOnce(v);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { lei_id } = await req.json();
    if (!lei_id) throw new Error("lei_id é obrigatório");

    const { data: lei, error: leiErr } = await supabase
      .from("vade_mecum_leis")
      .select("planalto_url")
      .eq("id", lei_id)
      .single();

    if (leiErr || !lei?.planalto_url) {
      throw new Error("Lei não encontrada ou sem URL do Planalto");
    }

    const html = await fetchHtml(lei.planalto_url);
    const bm = html.match(/<body[^>]*>([\s\S]+)/i);
    const body = bm ? bm[1] : html;

    // Remove tags de formatação irrelevantes, mas mantém <strike> e <del>
    let clean = body
      .replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (_, inner) => {
        const t = inner.replace(/<[^>]+>/g, "").trim().toLowerCase();
        if (t === "" || t === "o" || t === "a" || t === "º" || t === "°" || t === "ª") return "º";
        return inner;
      })
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/td>/gi, "\n")
      .replace(/<\/tr>/gi, "\n");

    clean = decodeHtmlEntities(clean);

    const regexStrike = /<(strike|del)[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;
    const historico = [];

    const strikes = [];
    while ((match = regexStrike.exec(clean)) !== null) {
      const textoAntigo = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (textoAntigo.length < 10) continue;
      strikes.push({ index: match.index, length: match[0].length, textoAntigo });
    }

    const agrupados = [];
    for (const s of strikes) {
      const last = agrupados[agrupados.length - 1];
      if (last && s.index - (last.index + last.length) < 200) {
        last.textoAntigo += "\n" + s.textoAntigo;
        last.length = (s.index + s.length) - last.index;
      } else {
        agrupados.push({ ...s });
      }
    }

    for (const g of agrupados) {
      const endIdx = g.index + g.length;
      const searchSpace = clean.substring(endIdx, endIdx + 1500);
      const cleanSearchSpace = searchSpace.replace(/<[^>]+>/g, "");
      
      const noteRegex = /\(\s*(Reda[çc][ãa]o\s+dada|Inclu[íi]d[oa]|Acrescid[oa]|Alterad[oa])[\s\S]{1,150}?\)/i;
      const noteMatch = noteRegex.exec(cleanSearchSpace);
      
      let nota = null;
      let textoNovo = null;

      if (noteMatch) {
        nota = noteMatch[0].replace(/\s+/g, " ").trim();
        textoNovo = cleanSearchSpace.substring(0, noteMatch.index).replace(/\s+/g, " ").trim();
      } else {
        const nextLines = cleanSearchSpace.split(/\n\s*\n/)[0];
        if (nextLines) {
           textoNovo = nextLines.replace(/\s+/g, " ").trim();
        }
      }

      let artigo_numero = "Desconhecido";
      const artMatch = g.textoAntigo.match(/^(?:Art\.|Parágrafo\b|§)[^\s]+\s+([\d.-]+[A-Z]?)/i);
      if (artMatch) {
        artigo_numero = artMatch[0];
      } else {
        const contextBefore = clean.substring(Math.max(0, g.index - 1000), g.index).replace(/<[^>]+>/g, "");
        const prevArts = [...contextBefore.matchAll(/Art\.\s*([\d.-]+[A-Z]?)/gi)];
        if (prevArts.length > 0) {
          artigo_numero = "Art. " + prevArts[prevArts.length - 1][1];
        }
      }

      if (g.textoAntigo && textoNovo && g.textoAntigo !== textoNovo) {
        historico.push({
          artigo_numero,
          texto_antigo: g.textoAntigo,
          texto_novo: textoNovo,
          nota: nota || "Sem anotação explícita",
          data_aproximada: extrairAno(nota || ""),
        });
      }
    }

    historico.sort((a, b) => (b.data_aproximada || 0) - (a.data_aproximada || 0));

    return new Response(JSON.stringify(historico.slice(0, 50)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extrairAno(nota: string): number {
  const match = nota.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : 0;
}

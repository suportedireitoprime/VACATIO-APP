// Verifica se uma lei do Planalto teve alterações desde o último snapshot.
// Body: { lei_id: string } OU { slug: string }
// Retorna: { mudou, data_nova, data_antiga, hash_novo, hash_antigo, raw_bytes, tags_encontradas, ultima_alteracao_texto }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

async function fetchHtml(url: string): Promise<{ text: string; bytes: number }> {
  const full = url.replace(/^http:/, "https:");
  const res = await fetch(full, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${full}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    text = new TextDecoder("iso-8859-1").decode(buf);
  }
  return { text, bytes: buf.byteLength };
}

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5,
  junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10,
  novembro: 11, dezembro: 12,
};

function parseDataPtBr(s: string): string | null {
  // "23 de outubro de 2024" | "2024-10-23" | "23/10/2024"
  s = s.trim().toLowerCase();
  let m = s.match(/(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/i);
  if (m) {
    const d = parseInt(m[1], 10);
    const mes = MESES[m[2]];
    const y = parseInt(m[3], 10);
    if (mes) return `${y}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

function normalizarTexto(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function sha256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface AnaliseHtml {
  ultimaData: string | null;
  ultimaTag: string | null;
  totalTags: number;
}

function analisarAlteracoes(html: string): AnaliseHtml {
  // Tags que o Planalto usa
  // "(Redação dada pela Lei nº 14.451, de 2022)"
  // "(Vigência)"
  // "(Revogado pela Lei nº ...)"
  // "(Incluído pela Lei ...)"
  const regexes = [
    /\(Reda[cç][aã]o dada pela[^)]*\)/gi,
    /\(Revogado pela[^)]*\)/gi,
    /\(Inclu[ií]do pela[^)]*\)/gi,
    /\(Nova reda[cç][aã]o[^)]*\)/gi,
  ];
  let melhorData: string | null = null;
  let melhorTag: string | null = null;
  let total = 0;
  for (const rx of regexes) {
    const matches = html.matchAll(rx);
    for (const m of matches) {
      total++;
      const tag = m[0];
      // Tenta extrair data
      const dataMatch = tag.match(/de\s+(\d{1,2}\.\d{1,2}\.\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4})/i);
      const dataStr = dataMatch ? dataMatch[1] : "";
      let iso: string | null = null;
      if (/^\d{4}$/.test(dataStr)) iso = `${dataStr}-12-31`;
      else if (dataStr) iso = parseDataPtBr(dataStr.replace(/\./g, "/"));
      if (iso && (!melhorData || iso > melhorData)) {
        melhorData = iso;
        melhorTag = tag;
      }
    }
  }
  return { ultimaData: melhorData, ultimaTag: melhorTag, totalTags: total };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { lei_id, slug } = await req.json();
    if (!lei_id && !slug) {
      return new Response(JSON.stringify({ error: "lei_id ou slug requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const q = supabase.from("vade_mecum_leis").select("id, slug, nome, planalto_url");
    const { data: lei, error: leiErr } = lei_id
      ? await q.eq("id", lei_id).maybeSingle()
      : await q.eq("slug", slug).maybeSingle();

    if (leiErr) throw leiErr;
    if (!lei) {
      return new Response(JSON.stringify({ error: "lei não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!lei.planalto_url) {
      return new Response(JSON.stringify({ error: "lei sem planalto_url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Baixar
    const { text: html, bytes } = await fetchHtml(lei.planalto_url);

    // 2) Analisar
    const analise = analisarAlteracoes(html);
    const textoLimpo = normalizarTexto(html);
    const hashNovo = await sha256(textoLimpo);

    // 3) Comparar com snapshot anterior
    const { data: snap } = await supabase
      .from("vade_mecum_lei_snapshots")
      .select("*")
      .eq("lei_id", lei.id)
      .maybeSingle();

    const hashAntigo = snap?.texto_hash ?? null;
    const dataAntiga = snap?.data_ultima_alteracao_detectada ?? null;

    const mudouHash = hashAntigo !== null && hashAntigo !== hashNovo;
    const mudouData =
      analise.ultimaData !== null &&
      dataAntiga !== null &&
      analise.ultimaData > dataAntiga;
    const primeiraVerificacao = !snap;
    const mudou = mudouHash || mudouData;

    const diff = {
      mudou,
      primeira_verificacao: primeiraVerificacao,
      hash_novo: hashNovo,
      hash_antigo: hashAntigo,
      data_nova: analise.ultimaData,
      data_antiga: dataAntiga,
      ultima_tag: analise.ultimaTag,
      total_tags: analise.totalTags,
      raw_bytes: bytes,
    };

    // 4) Salvar/atualizar snapshot
    const status = primeiraVerificacao ? "verificado" : mudou ? "atualizacao_disponivel" : "ok";
    await supabase
      .from("vade_mecum_lei_snapshots")
      .upsert({
        lei_id: lei.id,
        data_ultima_alteracao_detectada: analise.ultimaData,
        texto_hash: hashNovo,
        raw_html_bytes: bytes,
        status,
        ultimo_diff: diff,
        verificado_em: new Date().toISOString(),
      });

    return new Response(JSON.stringify({ ok: true, lei: { id: lei.id, slug: lei.slug, nome: lei.nome }, status, ...diff }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

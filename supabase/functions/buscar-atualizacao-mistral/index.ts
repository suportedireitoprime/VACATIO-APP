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

async function fetchHtml(url: string): Promise<string> {
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
  return html.normalize("NFC").replace(/\uFFFD/g, " ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

async function fetchWithBrowserless(url: string): Promise<string> {
  const key = Deno.env.get('BROWSERLESS_API_KEY');
  if (!key) {
    console.warn('BROWSERLESS_API_KEY não configurada. Usando fetch padrão.');
    return fetchHtml(url);
  }

  console.log(`Usando Browserless para: ${url}`);
  const endpoint = `https://production-sfo.browserless.io/content?token=${encodeURIComponent(key)}`;
  
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: url.replace(/^http:/, "https:"),
        rejectResourceTypes: ["image", "stylesheet", "font", "media", "script"],
        gotoOptions: { waitUntil: "domcontentloaded", timeout: 60000 }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Browserless Error: ${res.status} - ${errText}`);
      throw new Error("Browserless failed");
    }
    return await res.text();
  } catch (err) {
    console.warn("Falha no Browserless, fazendo fallback para fetch padrão...", err);
    return fetchHtml(url);
  }
}

// =========================================================================
// PARSERS E REGEXES DO PLANALTO
// =========================================================================

const HIER_RE = /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)(?:\s+(?:[IVXLCDM]+|[ÚU]NICO|[ÚU]NICA|PRELIMINAR|GERAL|ESPECIAL|PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|S[ÉE]TIMA|OITAVA|NONA|D[ÉE]CIMA|\d+[ºª°]?)\b[\s\S]*|\s*)$/i;
const ART_RE = /^Art\.\s*(\d+(?:\.\d+)*(?:-[A-Z0-9]+)?)/;
const CAPUT_STOP_RE = /^(§|Parágrafo\b|[IVXLCDM]+\s*[-–.)]|[a-z]\))/i;

const PLANALTO_NOTE_START_RE = /^(?:[\(\[]\s*)?(?:Reda[çc][ãa]o\s+dada|Inclu[íi]d[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vide|Vig[êe]ncia|Regulamento|Nova\s+reda[çc][ãa]o|Renumerad[oa]|Transformad[oa]|Restabelecid[oa]|Produ[çc][ãa]o\s+de\s+efeito)\b/i;
const PLANALTO_NOTE_BLOCK_RE = /[\(\[]\s*(?:Reda[çc][ãa]o\s+dada|Inclu[íi]d[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vide|Vig[êe]ncia|Regulamento|Nova\s+reda[çc][ãa]o|Renumerad[oa]|Transformad[oa]|Restabelecid[oa]|Produ[çc][ãa]o\s+de\s+efeito)[\s\S]{0,320}?[\)\]]/gi;
const PLANALTO_NOTE_CONTINUATION_RE = /^(?:Lei|Leis|Decreto|Decretos|Medida\s+Provis[óo]ria|Emenda\s+Constitucional|Lei\s+Complementar)\s+n[º°o]?\s*[\d.]+/i;

function isPlanaltoAnnotationLine(s: string | undefined): boolean {
  if (!s) return false;
  const t = s.trim();
  return PLANALTO_NOTE_START_RE.test(t) || PLANALTO_NOTE_CONTINUATION_RE.test(t);
}

function stripPlanaltoAnnotations(s: string): string {
  return s.replace(PLANALTO_NOTE_BLOCK_RE, " ").replace(/\s+/g, " ").trim();
}

function formatPlanaltoAnnotationBlocks(s: string): string {
  return s.replace(PLANALTO_NOTE_BLOCK_RE, (m) => m.replace(/\s+/g, " "));
}

function normalizeHierLabel(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLocaleUpperCase("pt-BR");
}

interface Bloco {
  tipo: "hier" | "art";
  numero: string;
  texto: string;
  titulo_hierarquico?: string;
}

function extractBlocos(html: string): Bloco[] {
  let body = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<s\b[^>]*>[\s\S]*?<\/s>/gi, " ")
    .replace(/<strike\b[^>]*>[\s\S]*?<\/strike>/gi, " ")
    .replace(/<del\b[^>]*>[\s\S]*?<\/del>/gi, " ")
    .replace(/<([a-z]+)\b[^>]*style\s*=\s*"[^"]*text-decoration\s*:\s*[^"]*line-through[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<([a-z]+)\b[^>]*style\s*=\s*'[^']*text-decoration\s*:\s*[^']*line-through[^']*'[^>]*>[\s\S]*?<\/\1>/gi, " ");

  const bm = body.match(/<body[^>]*>([\s\S]+)/i);
  if (bm) body = bm[1];

  body = body.replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (_, inner) => {
    const t = inner.replace(/<[^>]+>/g, "").trim().toLowerCase();
    if (t === "" || t === "o" || t === "a" || t === "º" || t === "°" || t === "ª") return "º";
    return inner;
  });

  body = body
    .replace(/<blockquote[^>]*>/gi, "")
    .replace(/<\/blockquote>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  body = decodeHtmlEntities(body);
  body = formatPlanaltoAnnotationBlocks(body);

  const linhasBrutas = body
    .split(/\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);

  const linhas: string[] = [];
  for (let k = 0; k < linhasBrutas.length; k++) {
    const atual = linhasBrutas[k];
    const proxima = linhasBrutas[k + 1];
    if (/^Art\.?$/.test(atual) && proxima && /^\d/.test(proxima)) {
      linhas.push(`Art. ${proxima}`);
      k += 1;
      continue;
    }
    linhas.push(atual);
  }

  const startIdx = linhas.findIndex((l) => HIER_RE.test(l) || ART_RE.test(l));
  const uteis = startIdx > 0 ? linhas.slice(startIdx) : linhas;

  let endIdx = -1;
  for (let k = uteis.length - 1; k >= 0; k--) {
    if (/Este texto não substitui/i.test(uteis[k])) { endIdx = k; break; }
  }
  const finais = endIdx > 0 ? uteis.slice(0, endIdx) : uteis;

  const blocos: Bloco[] = [];
  let currentHier = "";
  let i = 0;
  
  while (i < finais.length) {
    const linha = finais[i];

    const hm = linha.match(HIER_RE);
    if (hm) {
      const proximaUtil = (from: number): { idx: number; linha: string | undefined } => {
        let k = from;
        while (k < finais.length && isPlanaltoAnnotationLine(finais[k])) k++;
        return { idx: k, linha: finais[k] };
      };

      let sigla = linha;
      let nome = "";
      const p1 = proximaUtil(i + 1);
      const eSoLabel = /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\s*$/i.test(linha);
      const romano = p1.linha ? p1.linha.match(/^([IVXLCDM]+|[ÚU]NICO|PRELIMINAR)$/i) : null;
      
      if (eSoLabel && romano) {
        sigla = `${linha} ${romano[1]}`;
        const p2 = proximaUtil(p1.idx + 1);
        const nomeLinha = p2.linha;
        if (nomeLinha && !HIER_RE.test(nomeLinha) && !ART_RE.test(nomeLinha) && nomeLinha.length < 200) {
          nome = nomeLinha;
          i = p2.idx + 1;
        } else {
          i = p1.idx + 1;
        }
      } else if (p1.linha && !HIER_RE.test(p1.linha) && !ART_RE.test(p1.linha) && p1.linha.length < 200) {
        nome = p1.linha;
        i = p1.idx + 1;
      } else {
        i += 1;
      }
      
      sigla = stripPlanaltoAnnotations(sigla);
      nome = stripPlanaltoAnnotations(nome);
      const siglaNorm = normalizeHierLabel(sigla);
      const texto = nome ? `${siglaNorm}\n${nome}` : siglaNorm;
      
      currentHier = texto;
      blocos.push({ tipo: "hier", numero: siglaNorm, texto });
      continue;
    }

    const am = linha.match(ART_RE);
    if (am) {
      const numero = am[1];
      const cabeca = linha
        .replace(/^Art\.\s*(\d{2,})[º°]/i, (_, n) => `Art. ${n}`)
        .replace(/^Art\.\s*(\d+)[º°](?=\.\d)/i, (_, n) => `Art. ${n}`)
        .replace(/^Art\.\s*([1-9])(?![\dº°\w\-.])/i, (_, n) => `Art. ${n}º`);

      const caputParts: string[] = [cabeca];
      const restoParts: string[] = [];
      let j = i + 1;
      let caputFechado = false;
      
      while (j < finais.length) {
        const l2 = finais[j];
        if (HIER_RE.test(l2) || ART_RE.test(l2)) break;
        if (/^[ºª°oa]$/i.test(l2)) { j += 1; continue; }
        if (!caputFechado && CAPUT_STOP_RE.test(l2)) caputFechado = true;
        (caputFechado ? restoParts : caputParts).push(l2);
        j += 1;
      }

      const caputLinha = caputParts.join(" ").replace(/\s+/g, " ").trim();
      const texto = [caputLinha, ...restoParts]
        .join("\n")
        .replace(/(\d)o(?=[\s.,;:])/g, "$1º")
        .replace(/([0-9])[º°]\s+[º°]/g, "$1º");
        
      blocos.push({ tipo: "art", numero: `Art. ${numero}`, texto, titulo_hierarquico: currentHier });
      i = j;
      continue;
    }

    i += 1;
  }

  return blocos;
}

// =========================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { lei_id, planalto_url } = body;

    if (!lei_id || !planalto_url) {
      return new Response(JSON.stringify({ error: "Faltam parâmetros: lei_id e planalto_url" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // 1. Baixar HTML via Browserless
    console.log(`Baixando HTML de: ${planalto_url}`);
    let rawHtml = await fetchWithBrowserless(planalto_url);
    
    // 2. Extrair Blocos Estruturados (nativo, sem Mistral)
    const blocos = extractBlocos(rawHtml);

    // 3. Filtrar apenas os blocos que contêm textos de atualização recente.
    const artigosAtualizados = blocos.filter(bloco => {
      if (bloco.tipo !== "art") return false;
      // Procura por notas do Planalto dentro do texto do artigo (caput ou incisos)
      return PLANALTO_NOTE_BLOCK_RE.test(bloco.texto);
    });

    if (artigosAtualizados.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Nenhuma atualização detectada com notas no HTML." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Retorna os artigos extraídos e mapeados no mesmo formato que o app espera
    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: `Foram processados ${artigosAtualizados.length} artigos atualizados diretamente via Browserless!`,
        artigos: artigosAtualizados
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

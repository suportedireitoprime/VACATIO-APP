// Re-extrai artigos + hierarquia (PARTE / LIVRO / TÍTULO / CAPÍTULO / SEÇÃO / SUBSEÇÃO)
// de uma lei já cadastrada em vade_mecum_leis, usando o HTML do Planalto.
// Body: { slug: string, dry_run?: boolean }
// Em dry_run devolve estatísticas e um preview, sem gravar.

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
  // Remove/adiciona sufixo "compilado"
  if (/compilado\.htm$/i.test(u)) out.add(u.replace(/compilado\.htm$/i, ".htm"));
  else if (/\.htm$/i.test(u)) out.add(u.replace(/\.htm$/i, "compilado.htm"));
  // Alterna caixa do path /LEIS/ <-> /leis/
  out.add(u.replace("/LEIS/", "/leis/"));
  out.add(u.replace("/leis/", "/LEIS/"));
  // Alterna www e sem www
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


// Regex para cabeçalhos de hierarquia — aceita caixa alta E mista
// (Planalto usa tanto "CAPÍTULO II" quanto "Capítulo II" dependendo da lei).
// "DISPOSIÇÕES ..." NÃO entra aqui porque aparece tanto como nome de capítulo
// quanto no meio de sentenças — vira nome do cabeçalho anterior via o
// consumidor de próxima-linha logo abaixo.
// Exige que o rótulo venha seguido de um marcador válido (romano, número,
// ÚNICO, PRELIMINAR, GERAL, etc.) OU esteja sozinho na linha — evita casar
// sentenças como "PARTE QUE CONSTITUA SUA CONTRIBUIÇÃO...".
const HIER_RE =
  /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)(?:\s+(?:[IVXLCDM]+|[ÚU]NICO|[ÚU]NICA|PRELIMINAR|GERAL|ESPECIAL|PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|S[ÉE]TIMA|OITAVA|NONA|D[ÉE]CIMA|\d+[ºª°]?)\b[\s\S]*|\s*)$/i;

// Aceita "Art. 1", "Art. 1º", "Art. 1.368-C", "Art. 15-A", etc.
// Exige "Art." com A maiúsculo: referências internas em minúscula
// ("art. 5º, inciso XV, ...") não podem virar um artigo novo.
const ART_RE = /^Art\.\s*(\d+(?:\.\d+)*(?:-[A-Z0-9]+)?)/;

// Início de §/parágrafo/inciso/alínea — usado para cortar o caput
const CAPUT_STOP_RE = /^(§|Parágrafo\b|[IVXLCDM]+\s*[-–.)]|[a-z]\))/i;

const PLANALTO_NOTE_START_RE =
  /^(?:[\(\[]\s*)?(?:Reda[çc][ãa]o\s+dada|Inclu[íi]d[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vide|Vig[êe]ncia|Regulamento|Nova\s+reda[çc][ãa]o|Renumerad[oa]|Transformad[oa]|Restabelecid[oa]|Produ[çc][ãa]o\s+de\s+efeito)\b/i;

const PLANALTO_NOTE_BLOCK_RE =
  /[\(\[]\s*(?:Reda[çc][ãa]o\s+dada|Inclu[íi]d[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vide|Vig[êe]ncia|Regulamento|Nova\s+reda[çc][ãa]o|Renumerad[oa]|Transformad[oa]|Restabelecid[oa]|Produ[çc][ãa]o\s+de\s+efeito)[\s\S]{0,320}?[\)\]]/gi;

const PLANALTO_NOTE_CONTINUATION_RE =
  /^(?:Lei|Leis|Decreto|Decretos|Medida\s+Provis[óo]ria|Emenda\s+Constitucional|Lei\s+Complementar)\s+n[º°o]?\s*[\d.]+/i;

function isPlanaltoAnnotationLine(s: string | undefined): boolean {
  if (!s) return false;
  const t = s.trim();
  return PLANALTO_NOTE_START_RE.test(t) || PLANALTO_NOTE_CONTINUATION_RE.test(t);
}

function stripPlanaltoAnnotations(s: string): string {
  return s.replace(PLANALTO_NOTE_BLOCK_RE, " ").replace(/\s+/g, " ").trim();
}

function removePlanaltoAnnotationBlocks(s: string): string {
  return s.replace(PLANALTO_NOTE_BLOCK_RE, " ");
}

// Normaliza rótulo de hierarquia para CAIXA ALTA no campo `numero`
// ("Capítulo II" -> "CAPÍTULO II", "Título Único" -> "TÍTULO ÚNICO")
function normalizeHierLabel(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLocaleUpperCase("pt-BR");
}

interface Bloco {
  tipo: "hier" | "art";
  numero: string;
  texto: string;
}

const CATEGORIAS_VADE_MECUM = new Set(["codigo", "estatuto", "lei", "sumula"]);

function normalizeVadeMecumCategoria(value: string): "codigo" | "estatuto" | "lei" | "sumula" {
  const raw = String(value || "").trim().toLowerCase();
  if (CATEGORIAS_VADE_MECUM.has(raw)) {
    return raw as "codigo" | "estatuto" | "lei" | "sumula";
  }

  if (raw.includes("codigo") || raw.includes("código")) return "codigo";
  if (raw.includes("estatuto")) return "estatuto";
  if (raw.includes("sumula") || raw.includes("súmula")) return "sumula";

  return "lei";
}

function extractEmenta(html: string): string {
  // A ementa no Planalto costuma vir num <p> logo após "LEI Nº ..., DE ... DE ..."
  // com estilo "text-align:right" ou em uma célula à direita.
  // Estratégia: lê o HTML linearizado, encontra o primeiro parágrafo curto após
  // o cabeçalho "LEI Nº" e antes de "O PRESIDENTE" / "Faço saber".
  let body = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  body = decodeHtmlEntities(body)
    .replace(/[ \t]+/g, " ")
    .replace(/\r/g, "");
  const linhas = body.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const inicio = linhas.findIndex((l) =>
    /^(LEI(?:\s+COMPLEMENTAR)?|DECRETO(?:-LEI)?|MEDIDA\s+PROVISÓRIA|EMENDA\s+CONSTITUCIONAL)\s+N[º°]/i.test(l)
  );
  if (inicio < 0) return "";
  const stopRe =
    /^(O\s+PRESIDENTE|A\s+PRESIDENTE|Faço\s+saber|PRESIDENTE\s+DA\s+REPÚBLICA|CAP[ÍI]TULO|T[ÍI]TULO|LIVRO|PARTE|Art\.)/i;
  for (let k = inicio + 1; k < Math.min(linhas.length, inicio + 15); k++) {
    const l = linhas[k];
    if (stopRe.test(l)) break;
    if (l.length < 25) continue;
    if (/^Mensagem\s+de\s+veto/i.test(l)) continue;
    // Ementa costuma terminar com "outras providências." mas nem sempre.
    return l.replace(/\s+/g, " ").trim();
  }
  return "";
}

function extractBlocos(html: string): Bloco[] {
  // Regra do compilado do Planalto: texto TACHADO (<s>, <strike>, <del> ou
  // style="text-decoration:line-through") representa a redação ANTIGA/revogada.
  // Sempre descartamos o conteúdo riscado por completo — mantendo apenas a
  // redação vigente que vem logo em seguida no HTML. Isso evita duplicidade
  // do tipo "declarar a suspensão da autoridade parental" + "(revogado)".
  let body = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    // 1) remove tags dedicadas de strike com seu conteúdo interno
    .replace(/<s\b[^>]*>[\s\S]*?<\/s>/gi, " ")
    .replace(/<strike\b[^>]*>[\s\S]*?<\/strike>/gi, " ")
    .replace(/<del\b[^>]*>[\s\S]*?<\/del>/gi, " ")
    // 2) remove qualquer elemento com style contendo line-through
    //    (span, p, font, div, a — Planalto varia bastante)
    .replace(/<([a-z]+)\b[^>]*style\s*=\s*"[^"]*text-decoration\s*:\s*[^"]*line-through[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<([a-z]+)\b[^>]*style\s*=\s*'[^']*text-decoration\s*:\s*[^']*line-through[^']*'[^>]*>[\s\S]*?<\/\1>/gi, " ");

  // NÃO recortar por <body>: os HTMLs compilada do Planalto costumam ter
  // </body> prematuramente e cortar quase todo o conteúdo. Usar o HTML inteiro.
  const bm = body.match(/<body[^>]*>([\s\S]+)/i);
  if (bm) body = bm[1];

  // Substitui <sup>...</sup> por "º" quando o conteúdo textual for ordinal (o/a/º/°)
  // Ex: "1<sup><u>o</u></sup>" -> "1º". Cobre também <sup> </sup> vazio.
  body = body.replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (_, inner) => {
    const t = inner.replace(/<[^>]+>/g, "").trim().toLowerCase();
    if (t === "" || t === "o" || t === "a" || t === "º" || t === "°" || t === "ª") return "º";
    return inner;
  });

  // manter parágrafos como separadores
  body = body
    .replace(/<blockquote[^>]*>/gi, "")
    .replace(/<\/blockquote>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  body = decodeHtmlEntities(body);
  // Remove anotações editoriais do Planalto antes de separar linhas.
  // Em páginas como a Lei de Drogas, o HTML quebra "(Redação dada pela\nLei nº...)"
  // em duas linhas; se não limpar aqui, o parser confunde a anotação com o
  // nome oficial do CAPÍTULO/SEÇÃO.
  body = removePlanaltoAnnotationBlocks(body);

  const linhasBrutas = body
    .split(/\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);

  // O Planalto às vezes quebra o rótulo do artigo: uma linha só com "Art."
  // e o número na linha seguinte ("Art." / "1º Esta Lei regula..."). Sem
  // juntar, o ART_RE não casa e o artigo é engolido pelo bloco anterior.
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

  // achar início — pular preâmbulo até primeiro cabeçalho/art
  const startIdx = linhas.findIndex(
    (l) => HIER_RE.test(l) || ART_RE.test(l),
  );
  const uteis = startIdx > 0 ? linhas.slice(startIdx) : linhas;

  // cortar "Este texto não substitui" — mas só se aparecer DEPOIS de algum artigo,
  // e usar a ÚLTIMA ocorrência (versão compilada tem várias)
  let endIdx = -1;
  for (let k = uteis.length - 1; k >= 0; k--) {
    if (/Este texto não substitui/i.test(uteis[k])) { endIdx = k; break; }
  }
  const finais = endIdx > 0 ? uteis.slice(0, endIdx) : uteis;

  const blocos: Bloco[] = [];
  let i = 0;
  while (i < finais.length) {
    const linha = finais[i];

    // cabeçalho de hierarquia
    const hm = linha.match(HIER_RE);
    if (hm) {
      // Anotações do Planalto que NÃO fazem parte do nome do capítulo/seção
      // Ex.: "(Redação dada pela Lei nº ...)", "(Incluído pela Lei ...)",
      //      "(Vide ...)", "(Revogado pela ...)", "(Vetado)".
      // Encontra a próxima linha "útil" (pula anotações parentéticas)
      const proximaUtil = (from: number): { idx: number; linha: string | undefined } => {
        let k = from;
        while (k < finais.length && isPlanaltoAnnotationLine(finais[k])) k++;
        return { idx: k, linha: finais[k] };
      };

      // sigla base ("TÍTULO I", "CAPÍTULO II - ...", ou só "CAPÍTULO" se número vier abaixo)
      let sigla = linha;
      let nome = "";
      const p1 = proximaUtil(i + 1);
      // Caso 1: label sozinho ("CAPÍTULO") + próximo é romano ("I", "II", "IV", "ÚNICO")
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
      } else if (
        p1.linha &&
        !HIER_RE.test(p1.linha) &&
        !ART_RE.test(p1.linha) &&
        p1.linha.length < 200
      ) {
        nome = p1.linha;
        i = p1.idx + 1;
      } else {
        i += 1;
      }
      // Remove anotações parentéticas presas no fim da sigla ou do nome
      // Ex.: "Do Sistema Nacional (Redação dada pela Lei nº ...)"
      sigla = stripPlanaltoAnnotations(sigla);
      nome = stripPlanaltoAnnotations(nome);
      const siglaNorm = normalizeHierLabel(sigla);
      const texto = nome ? `${siglaNorm}\n${nome}` : siglaNorm;
      blocos.push({ tipo: "hier", numero: siglaNorm, texto });
      continue;
    }

    // artigo
    const am = linha.match(ART_RE);
    if (am) {
      const numero = am[1];
      // normaliza: só números 1..9 SEM ponto/traço/dígito seguinte recebem "º"
      const cabeca = linha
        // remove "º" indevido em números >= 10 (Art. 10º -> Art. 10)
        .replace(/^Art\.\s*(\d{2,})[º°]/i, (_, n) => `Art. ${n}`)
        // remove "º" indevido antes de "." (Art. 1º.368 -> Art. 1.368)
        .replace(/^Art\.\s*(\d+)[º°](?=\.\d)/i, (_, n) => `Art. ${n}`)
        // adiciona "º" em 1..9 quando NÃO seguido por ., dígito, - ou letra
        .replace(/^Art\.\s*([1-9])(?![\dº°\w\-.])/i, (_, n) => `Art. ${n}º`);

      // Junta o caput em UMA linha até o primeiro §/parágrafo/inciso/alínea.
      // Depois disso, cada § / inciso ocupa a sua própria linha.
      const caputParts: string[] = [cabeca];
      const restoParts: string[] = [];
      let j = i + 1;
      let caputFechado = false;
      while (j < finais.length) {
        const l2 = finais[j];
        if (HIER_RE.test(l2) || ART_RE.test(l2)) break;
        if (/^[ºª°oa]$/i.test(l2)) { j += 1; continue; } // ordinal órfão
        if (!caputFechado && CAPUT_STOP_RE.test(l2)) caputFechado = true;
        (caputFechado ? restoParts : caputParts).push(l2);
        j += 1;
      }

      const caputLinha = caputParts.join(" ").replace(/\s+/g, " ").trim();
      const texto = [caputLinha, ...restoParts]
        .join("\n")
        .replace(/(\d)o(?=[\s.,;:])/g, "$1º")
        .replace(/([0-9])[º°]\s+[º°]/g, "$1º");
      blocos.push({ tipo: "art", numero, texto });
      i = j;
      continue;
    }


    i += 1;
  }

  return blocos;
}

function addSyntheticHierarchy(slug: string, blocos: Bloco[]): Bloco[] {
  const hasHierarchy = blocos.some((b) => b.tipo === "hier");
  if (hasHierarchy) return blocos;

  // A Lei do Mandado de Injunção não possui capítulos oficiais no HTML do
  // Planalto, mas a experiência do Vade Mecum precisa manter a aba
  // "Capítulos" navegável no mesmo padrão visual das leis estruturadas.
  // Esses blocos são agrupamentos técnicos de navegação, não texto legal.
  if (slug !== "lmi") return blocos;

  const chapters = [
    { before: "1", numero: "CAPÍTULO I", nome: "DO CABIMENTO E DOS LEGITIMADOS" },
    { before: "4", numero: "CAPÍTULO II", nome: "DO PROCEDIMENTO" },
    { before: "8", numero: "CAPÍTULO III", nome: "DA DECISÃO E DOS SEUS EFEITOS" },
    { before: "12", numero: "CAPÍTULO IV", nome: "DO MANDADO DE INJUNÇÃO COLETIVO E DISPOSIÇÕES FINAIS" },
  ];

  const byArticle = new Map(chapters.map((c) => [c.before, c]));
  const out: Bloco[] = [];
  for (const bloco of blocos) {
    if (bloco.tipo === "art") {
      const chapter = byArticle.get(bloco.numero);
      if (chapter) {
        out.push({
          tipo: "hier",
          numero: chapter.numero,
          texto: `${chapter.numero}\n${chapter.nome}`,
        });
      }
    }
    out.push(bloco);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // ── MODO 'sugerir': usa Gemini + google_search para sugerir leis faltantes.
    // Reaproveita esta função porque o projeto atingiu o limite de edge functions.
    if (body?.mode === "sugerir") {
      const key = Deno.env.get("GEMINI_API_KEY");
      if (!key) {
        return new Response(JSON.stringify({ error: "GEMINI_API_KEY ausente" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const query = String(body.query || "").trim();
      const area = String(body.area || "").trim();
      const leisAtuais: string[] = Array.isArray(body.leisAtuais) ? body.leisAtuais : [];
      const limite = Math.min(Number(body.limite) || 10, 15);
      const foco = [query, area].filter(Boolean).join(" — ")
        || "leis federais brasileiras relevantes para concursos e prática jurídica";
      const listaAtual = leisAtuais.slice(0, 250).map((n) => `- ${n}`).join("\n");
      const prompt = `Você é um curador jurídico. Sugira LEIS FEDERAIS BRASILEIRAS reais (com URL do Planalto) que estejam FALTANDO na lista abaixo do nosso Vade Mecum digital.

FOCO: ${foco}
LIMITE: até ${limite} sugestões.

LEIS QUE JÁ TEMOS (NÃO SUGIRA NENHUMA DESSAS):
${listaAtual || "(nenhuma informada)"}

REGRAS:
- Só sugira normas federais brasileiras com URL oficial em https://www.planalto.gov.br/ccivil_03/...
- Não invente. Se não tiver URL confiável, não sugira.
- Prefira normas relevantes (concursos, prática forense, grande impacto social).
- Verifique a URL na web antes de sugerir.

Retorne em texto livre listando cada sugestão com nome oficial, URL do Planalto e resumo de 1 frase.`;

      const groundResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
          }),
        },
      );
      if (!groundResp.ok) {
        const t = await groundResp.text();
        return new Response(
          JSON.stringify({ error: `Gemini ${groundResp.status}: ${t.slice(0, 300)}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const groundData = await groundResp.json();
      const rawText: string =
        groundData?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("\n") ?? "";
      const grounding = groundData?.candidates?.[0]?.groundingMetadata;
      const fontes: string[] =
        grounding?.groundingChunks?.map((c: any) => c?.web?.uri).filter(Boolean) ?? [];

      const structResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [{
                text: `Extraia APENAS JSON válido:
{"sugestoes":[{"nome":"...","nome_curto":"...","planalto_url":"https://www.planalto.gov.br/...","categoria":"constituicao|codigo|estatuto|lei|decreto|sumula","resumo":"1 frase"}]}
Sem markdown. Máximo ${limite} itens. Remova sem URL do Planalto confiável.

PESQUISA:
${rawText}`,
              }],
            }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
          }),
        },
      );
      let parsed: any = { sugestoes: [] };
      if (structResp.ok) {
        const d = await structResp.json();
        const txt = d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "{}";
        try { parsed = JSON.parse(txt); } catch { parsed = { sugestoes: [] }; }
      }
      const CAT = ["constituicao", "codigo", "estatuto", "lei", "decreto", "sumula"];
      const nomesAtuais = new Set(leisAtuais.map((n) => n.toLowerCase().trim()));
      const sugestoes = (Array.isArray(parsed.sugestoes) ? parsed.sugestoes : [])
        .filter((s: any) => s?.nome && s?.planalto_url && /planalto\.gov\.br/i.test(s.planalto_url))
        .filter((s: any) => !nomesAtuais.has(String(s.nome).toLowerCase().trim()))
        .map((s: any) => ({
          nome: String(s.nome).trim(),
          nome_curto: String(s.nome_curto || s.nome).trim(),
          planalto_url: String(s.planalto_url).trim(),
          categoria: CAT.includes(String(s.categoria || "").toLowerCase())
            ? String(s.categoria).toLowerCase() : "lei",
          resumo: String(s.resumo || "").trim(),
        }))
        .slice(0, limite);

      return new Response(
        JSON.stringify({ ok: true, sugestoes, fontes }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const slug: string = String(body.slug || "").trim();
    const dryRun: boolean = body.dry_run !== false; // default TRUE por segurança
    const preservarEnriquecimento: boolean = body.preservar_enriquecimento === true;
    const bootstrap = {
      nome: body.nome ? String(body.nome).trim() : "",
      nome_curto: body.nome_curto ? String(body.nome_curto).trim() : "",
      planalto_url: body.planalto_url ? String(body.planalto_url).trim() : "",
      categoria: body.categoria ? String(body.categoria).trim() : "",
    };

    if (!slug) {
      return new Response(
        JSON.stringify({ error: "campo 'slug' é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    let { data: lei, error: leiErr } = await supa
      .from("vade_mecum_leis")
      .select("id, slug, nome, planalto_url")
      .eq("slug", slug)
      .maybeSingle();

    if (leiErr) throw leiErr;

    // Se a lei não existe no banco, mas o cliente forneceu os metadados do
    // catálogo (nome + URL do Planalto), cria a linha antes de reindexar.
    if (!lei && bootstrap.nome && bootstrap.planalto_url) {
      const { data: inserted, error: insLeiErr } = await supa
        .from("vade_mecum_leis")
        .insert({
          slug,
          nome: bootstrap.nome,
          nome_curto: bootstrap.nome_curto || bootstrap.nome,
          planalto_url: bootstrap.planalto_url,
          categoria: normalizeVadeMecumCategoria(bootstrap.categoria),
          total_artigos: 0,
        })
        .select("id, slug, nome, planalto_url")
        .single();
      if (insLeiErr) throw insLeiErr;
      lei = inserted;
    }

    if (!lei) {
      return new Response(
        JSON.stringify({ error: `lei '${slug}' não encontrada` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!lei.planalto_url) {
      return new Response(
        JSON.stringify({ error: `lei '${slug}' sem planalto_url` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    console.log(`Baixando ${lei.planalto_url}`);
    const html = await fetchHtml(lei.planalto_url);
    const blocos = addSyntheticHierarchy(lei.slug, extractBlocos(html));
    const ementa = extractEmenta(html);

    const nHier = blocos.filter((b) => b.tipo === "hier").length;
    const nArt = blocos.filter((b) => b.tipo === "art").length;

    // Diagnóstico: quantos "Art. N" existem no HTML BRUTO (antes de retirar tachados)?
    const rawArtMatches = (html.match(/Art\.\s*\d/gi) ?? []).length;
    const strikeMatches = (html.match(/<strike\b|<s\b|<del\b|line-through/gi) ?? []).length;
    const revogadaHint = /Revogad[oa]\s+pel[oa]\s+Lei/i.test(html);
    // A lei aparece marcada como totalmente revogada quando:
    //  - o HTML tem muitos "Art." mas nenhum sobrou depois de retirar tachados
    //  - ou o próprio Planalto tem um aviso "Revogada pela Lei ..."
    const totalmenteRevogada =
      nArt === 0 && rawArtMatches >= 3 && (strikeMatches > rawArtMatches || revogadaHint);

    // Aviso: se o HTML tem sinais claros de hierarquia mas nada foi extraído,
    // provavelmente há uma regressão no parser (regex, encoding, layout novo).
    const hierEsperada = /(?:^|\n)\s*(?:PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O)\s+[IVX]/i.test(html);
    const aviso_hierarquia_vazia = nHier === 0 && hierEsperada;

    const preview = {
      primeiros: blocos.slice(0, 12).map((b) => ({
        tipo: b.tipo,
        numero: b.numero,
        texto_head: b.texto.slice(0, 120),
      })),
      hierarquia_amostra: blocos
        .filter((b) => b.tipo === "hier")
        .slice(0, 20)
        .map((b) => b.texto.replace(/\n/g, " | ")),
    };

    if (dryRun) {
      return new Response(
        JSON.stringify({
          ok: true,
          dry_run: true,
          slug: lei.slug,
          nome: lei.nome,
          url: lei.planalto_url,
          total_blocos: blocos.length,
          cabecalhos_hierarquia: nHier,
          artigos: nArt,
          aviso_hierarquia_vazia,
          totalmente_revogada: totalmenteRevogada,
          raw_art_matches: rawArtMatches,
          preview,
        }, null, 2),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (nArt < 5) {
      const motivo = totalmenteRevogada
        ? `Lei totalmente revogada: o HTML do Planalto tem ${rawArtMatches} artigos, mas todos estão tachados (revogados). Aponte para a URL "compilada" ou para a lei substituta.`
        : rawArtMatches === 0
        ? `Nenhum "Art." foi encontrado em ${lei.planalto_url}. A página pode ter mudado de layout, exigir JavaScript ou ter retornado um desafio de segurança.`
        : `Extração encontrou só ${nArt} artigo(s) (mín. 5). O HTML tem ${rawArtMatches} referências a "Art.", mas o parser não conseguiu casá-las — provável mudança de layout.`;
      return new Response(
        JSON.stringify({
          error: motivo,
          artigos: nArt,
          raw_art_matches: rawArtMatches,
          totalmente_revogada: totalmenteRevogada,
          preview,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Snapshot de enriquecimento (se solicitado): mapeia por "numero"
    // para preservar comentário, explicações, exemplo, termos, questões,
    // flashcards, alterações e narração já cadastrados.
    const enriquecimentoPorNumero = new Map<string, Record<string, any>>();
    if (preservarEnriquecimento) {
      const { data: antigos } = await supa
        .from("vade_mecum_artigos")
        .select(
          "numero, comentario, explicacao_tecnico, explicacao_resumido, explicacao_simples_maior16, explicacao_simples_menor16, exemplo, termos, questoes, flashcards, alteracoes, narracao_url, planalto_url, epigrafe, relevancia, relevancia_nota, ult_alteracao_em, revogado",
        )
        .eq("lei_id", lei.id);
      for (const a of (antigos as any[]) ?? []) {
        if (a?.numero != null) enriquecimentoPorNumero.set(String(a.numero), a);
      }
    }

    // GRAVAÇÃO: apaga e insere
    const { error: delErr } = await supa
      .from("vade_mecum_artigos")
      .delete()
      .eq("lei_id", lei.id);
    if (delErr) throw delErr;

    const rows = blocos.map((b, idx) => {
      const base: Record<string, any> = {
        lei_id: lei.id,
        numero: b.numero,
        texto: b.texto,
        ordem: idx + 1,
      };
      if (preservarEnriquecimento) {
        const antigo = enriquecimentoPorNumero.get(String(b.numero));
        if (antigo) {
          for (const [k, v] of Object.entries(antigo)) {
            if (k === "numero") continue;
            if (v !== null && v !== undefined) base[k] = v;
          }
        }
      }
      return base;
    });

    // inserir em lotes de 500
    let inserted = 0;
    for (let k = 0; k < rows.length; k += 500) {
      const chunk = rows.slice(k, k + 500);
      const { error: insErr } = await supa
        .from("vade_mecum_artigos")
        .insert(chunk);
      if (insErr) throw insErr;
      inserted += chunk.length;
    }

    await supa
      .from("vade_mecum_leis")
      .update({
        total_artigos: nArt,
        updated_at: new Date().toISOString(),
        ultima_reextracao_em: new Date().toISOString(),
        ...(ementa ? { ementa } : {}),
      })
      .eq("id", lei.id);

    return new Response(
      JSON.stringify({
        ok: true,
        dry_run: false,
        slug: lei.slug,
        cabecalhos_hierarquia: nHier,
        artigos: nArt,
        linhas_gravadas: inserted,
        preservou_enriquecimento: preservarEnriquecimento,
        preservados_count: preservarEnriquecimento
          ? blocos.filter((b) => enriquecimentoPorNumero.has(String(b.numero))).length
          : 0,
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

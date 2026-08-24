import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { geminiFetch } from "../_shared/geminiFetch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================================
// TABELAS DE EXTENSO
// ============================================================================

const letrasParaExtenso: Record<string, string> = {
  a: "á", b: "bê", c: "cê", d: "dê", e: "é",
  f: "éfe", g: "gê", h: "agá", i: "í", j: "jota",
  k: "cá", l: "éle", m: "ême", n: "êne", o: "ó",
  p: "pê", q: "quê", r: "érre", s: "ésse", t: "tê",
  u: "ú", v: "vê", w: "dáblio", x: "xis", y: "ípsilon", z: "zê",
};

const romanosParaOrdinais: Record<string, string> = {
  I: "primeiro", II: "segundo", III: "terceiro", IV: "quarto", V: "quinto",
  VI: "sexto", VII: "sétimo", VIII: "oitavo", IX: "nono", X: "décimo",
  XI: "décimo primeiro", XII: "décimo segundo", XIII: "décimo terceiro",
  XIV: "décimo quarto", XV: "décimo quinto", XVI: "décimo sexto",
  XVII: "décimo sétimo", XVIII: "décimo oitavo", XIX: "décimo nono",
  XX: "vigésimo", XXI: "vigésimo primeiro", XXII: "vigésimo segundo",
  XXIII: "vigésimo terceiro", XXIV: "vigésimo quarto", XXV: "vigésimo quinto",
  XXVI: "vigésimo sexto", XXVII: "vigésimo sétimo", XXVIII: "vigésimo oitavo",
  XXIX: "vigésimo nono", XXX: "trigésimo", XXXI: "trigésimo primeiro",
  XXXII: "trigésimo segundo", XXXIII: "trigésimo terceiro", XXXIV: "trigésimo quarto",
  XXXV: "trigésimo quinto", XXXVI: "trigésimo sexto", XXXVII: "trigésimo sétimo",
  XXXVIII: "trigésimo oitavo", XXXIX: "trigésimo nono", XL: "quadragésimo",
  XLI: "quadragésimo primeiro", XLII: "quadragésimo segundo", XLIII: "quadragésimo terceiro",
  XLIV: "quadragésimo quarto", XLV: "quadragésimo quinto", XLVI: "quadragésimo sexto",
  XLVII: "quadragésimo sétimo", XLVIII: "quadragésimo oitavo", XLIX: "quadragésimo nono",
  L: "quinquagésimo",
};

const ordinaisUnidades = ["", "primeiro", "segundo", "terceiro", "quarto", "quinto", "sexto", "sétimo", "oitavo", "nono"];
const ordinaisDezenas = ["", "", "vigésimo", "trigésimo", "quadragésimo", "quinquagésimo", "sexagésimo", "septuagésimo", "octogésimo", "nonagésimo"];

function numeroParaOrdinal(n: number): string {
  if (n <= 0) return String(n);
  if (n === 10) return "décimo";
  if (n < 10) return ordinaisUnidades[n];
  if (n < 20) return "décimo " + ordinaisUnidades[n - 10];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return ordinaisDezenas[d] + (u ? " " + ordinaisUnidades[u] : "");
  }
  return String(n);
}

// Cardinais por extenso (0-999) para artigos/parágrafos >= 10
const cardUnidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const cardEspeciais10a19 = ["dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const cardDezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const cardCentenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function numeroParaCardinal(n: number): string {
  if (n === 0) return "zero";
  if (n === 100) return "cem";
  if (n < 10) return cardUnidades[n];
  if (n < 20) return cardEspeciais10a19[n - 10];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return cardDezenas[d] + (u ? " e " + cardUnidades[u] : "");
  }
  if (n < 1000) {
    const c = Math.floor(n / 100);
    const resto = n % 100;
    const centena = cardCentenas[c];
    return resto ? centena + " e " + numeroParaCardinal(resto) : centena;
  }
  return String(n);
}

// Convenção jurídica: 1º-9º → ordinal; ≥10 → cardinal
function numeroParaExtensoJuridico(n: number): string {
  if (n >= 1 && n <= 9) return numeroParaOrdinal(n);
  return numeroParaCardinal(n);
}

// ============================================================================
// LIMPEZA DE ANOTAÇÕES EDITORIAIS
// ============================================================================

function limparAnotacoesParaNarracao(texto: string): string {
  let resultado = texto;

  // Remove anotações editoriais entre parênteses
  resultado = resultado.replace(
    /\(\s*(?:Reda[çc][ãa]o\s+dada|Inclu[ií]d[oa]|Acrescid[oa]|Alterad[oa]|Renumerad[oa]|Vide|Vig[êe]ncia|Regulamento|Produ[çc][ãa]o\s+de\s+efeitos|Promulga[çc][ãa]o\s+parcial|NR)[^)]*\)/gi,
    "",
  );

  // Preserva revogado/vetado como palavra
  resultado = resultado.replace(/\(\s*Revogad[oa]\s+(?:pel[oa]|por)[^)]*\)/gi, (m) =>
    m.toLowerCase().includes("revogada") ? "revogada" : "revogado"
  );
  resultado = resultado.replace(/\(\s*Revogad[oa]\s*\)/gi, (m) =>
    m.toLowerCase().includes("revogada") ? "revogada" : "revogado"
  );
  resultado = resultado.replace(/\(\s*Vetad[oa]\s*\)/gi, (m) =>
    m.toLowerCase().includes("vetada") ? "vetada" : "vetado"
  );
  resultado = resultado.replace(/\(\s*VETADO\s*\)/g, "vetado");

  // Remove parênteses que só citam leis
  resultado = resultado.replace(
    /\(\s*(?:Lei\s+(?:n[ºo°]?\s*)?\d|Decreto|Medida\s+Provis[oó]ria|Emenda\s+Constitucional|Lei\s+Complementar)[^)]*\)/gi,
    "",
  );

  return resultado.replace(/\s{2,}/g, " ").trim();
}

// ============================================================================
// NORMALIZAÇÃO COMPLETA PARA TTS
// ============================================================================

function normalizarTextoParaTTS(texto: string): string {
  let r = limparAnotacoesParaNarracao(texto);

  r = r
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s/gm, "")
    .replace(/^\d+\.\s/gm, "")
    .replace(/[º°]/g, "")
    .replace(/[""''""]/g, "")
    // Abreviações jurídicas
    .replace(/\bart\.\s?(\d+)/gi, "artigo $1")
    .replace(/\barts\.\s?/gi, "artigos ")
    .replace(/\binc\.\s?/gi, "inciso ")
    .replace(/\bal\.\s?/gi, "alínea ")
    .replace(/\bCF\b/g, "Constituição Federal")
    .replace(/\bCC\b/g, "Código Civil")
    .replace(/\bCP\b/g, "Código Penal")
    .replace(/\bCPC\b/g, "Código de Processo Civil")
    .replace(/\bCPP\b/g, "Código de Processo Penal")
    .replace(/\bCLT\b/g, "Consolidação das Leis do Trabalho")
    .replace(/\bCTN\b/g, "Código Tributário Nacional")
    .replace(/\bCDC\b/g, "Código de Defesa do Consumidor")
    .replace(/\bLINDB\b/g, "Lei de Introdução às Normas do Direito Brasileiro")
    .replace(/\bSTF\b/g, "Supremo Tribunal Federal")
    .replace(/\bSTJ\b/g, "Superior Tribunal de Justiça")
    .replace(/\bTST\b/g, "Tribunal Superior do Trabalho")
    .replace(/\bOAB\b/g, "Ordem dos Advogados do Brasil")
    .replace(/\bPEC\b/g, "Proposta de Emenda Constitucional")
    .replace(/\bDOU\b/g, "Diário Oficial da União")
    .replace(/[<>{}|\\^~[\]]/g, "")
    .trim();

  // Parágrafos com pausa (convenção jurídica: §1-9 ordinal, §10+ cardinal)
  r = r.replace(/§\s*único/gi, ". parágrafo único. ");
  r = r.replace(/§§/g, "parágrafos");
  r = r.replace(/§\s*(\d+)/g, (_, num) => {
    const n = parseInt(num);
    return `. parágrafo ${numeroParaExtensoJuridico(n)}. `;
  });

  // Incisos romanos (ordem: maiores primeiro para não colidir)
  const romanos = Object.keys(romanosParaOrdinais).sort((a, b) => b.length - a.length);
  for (const romano of romanos) {
    const ordinal = romanosParaOrdinais[romano];
    const reSep = new RegExp(`(^|\\n|\\s)(${romano})\\s*[-–—.:;]\\s*`, "g");
    r = r.replace(reSep, `$1. inciso ${ordinal}. `);
    const reSem = new RegExp(`(^|\\n|\\s)(${romano})\\s+(?=[a-zA-ZáàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ])`, "gm");
    r = r.replace(reSem, `$1. inciso ${ordinal}. `);
  }

  // Alíneas com letra por extenso
  r = r.replace(/(^|\n|\s)([a-z])\)\s*/gm, (_, prefix, letra) => {
    return `${prefix}. alínea ${letrasParaExtenso[letra.toLowerCase()] || letra}. `;
  });

  // Sufixos "1º-A" → "primeiro á"
  r = r.replace(/(\d+)\s*-\s*([A-Z])\b/g, (_, num, letra) => {
    return `${num} ${letrasParaExtenso[letra.toLowerCase()] || letra}`;
  });

  r = r.replace(/\s*[-–—]\s*/g, ", ");
  r = r.replace(/\s+/g, " ");
  r = r.replace(/,\s*,/g, ",");

  return r.trim();
}

// ============================================================================
// SEGMENTAÇÃO PARA TTS (limite de estabilidade do Gemini)
// ============================================================================

const MAX_TTS_CHARS = 700;

function dividirTextoEmSegmentos(texto: string): string[] {
  const t = texto.trim();
  if (!t) return [];
  if (t.length <= MAX_TTS_CHARS) return [t];

  const paragrafos = t.replace(/\n{2,}/g, "\n").split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const segmentos: string[] = [];
  let buffer = "";
  const push = (s: string) => { if (s.trim()) segmentos.push(s.trim()); };

  for (const paragrafo of paragrafos.length ? paragrafos : [t]) {
    const unidades = paragrafo.match(/[^.!?;:]+[.!?;:]?\s*/g) || [paragrafo];
    for (const unidade of unidades) {
      const cand = buffer ? `${buffer}${unidade}` : unidade;
      if (cand.length <= MAX_TTS_CHARS) { buffer = cand; continue; }
      if (buffer) { push(buffer); buffer = ""; }
      if (unidade.length > MAX_TTS_CHARS) {
        for (let i = 0; i < unidade.length; i += MAX_TTS_CHARS) push(unidade.slice(i, i + MAX_TTS_CHARS));
      } else {
        buffer = unidade;
      }
    }
    if (buffer) { push(buffer); buffer = ""; }
  }
  return segmentos.length ? segmentos : [t.slice(0, MAX_TTS_CHARS)];
}

// ============================================================================
// GEMINI TTS — Sulafat (animada) + prompt de entusiasmo
// ============================================================================

const VOICE_NAME = "Sulafat";
const MODEL = "gemini-2.5-flash-preview-tts";
const NARRATION_CACHE_VERSION = "v4-cardinal-juridico";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function criarSignedUrl(supabase: any, filePath: string): Promise<string> {
  const { data: signed, error: signErr } = await supabase.storage
    .from("narracoes")
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 5); // 5 anos
  if (signErr || !signed?.signedUrl) {
    throw new Error(`Signed URL falhou: ${signErr?.message || "sem URL assinada"}`);
  }
  return signed.signedUrl;
}

async function gerarAudioSegmento(
  texto: string,
  keys: string[],
  segIdx: number,
  totalSeg: number,
): Promise<string> {
  const textoComInstrucao =
    `TTS(português brasileiro, tom animado e envolvente):\n` +
    `Narre com entusiasmo, energia e clareza, como uma professora jovem, ` +
    `apaixonada por Direito, explicando o conteúdo para os alunos com empolgação ` +
    `— nunca em tom monótono ou robótico.\n` +
    `Mantenha a precisão jurídica ao pronunciar "parágrafo primeiro", "inciso segundo", ` +
    `"alínea á", com uma breve pausa antes de cada um.\n` +
    `Leitura contínua, fluida e viva. Não diga "parte um" ou "continuação".\n\n${texto}`;

  for (let ki = 0; ki < keys.length; ki++) {
    const key = keys[ki];
    for (let tent = 0; tent < 2; tent++) {
      try {
        console.log(`Seg ${segIdx}/${totalSeg}: chave ${ki + 1}/${keys.length}, tent ${tent + 1} (${texto.length} chars)`);
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), 180000);
        const res = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: textoComInstrucao }] }],
              generationConfig: {
                response_modalities: ["AUDIO"],
                speech_config: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } },
                },
              },
            }),
          },
        );
        clearTimeout(to);
        const data = await res.json();
        if (data?.error) {
          const sc = Number(data.error?.code) || res.status || 500;
          console.error(`Seg ${segIdx}: erro ${sc}: ${JSON.stringify(data.error).slice(0, 220)}`);
          if (sc === 500 && tent === 0) { await sleep(3000); continue; }
          break;
        }
        if (!res.ok) {
          console.error(`Seg ${segIdx}: HTTP ${res.status}`);
          if (res.status === 500 && tent === 0) { await sleep(3000); continue; }
          break;
        }
        const audioPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data);
        const audioData = audioPart?.inlineData?.data;
        if (audioData) {
          console.log(`Seg ${segIdx}: ✅ ${audioData.length} chars base64`);
          return audioData;
        }
        console.error(`Seg ${segIdx}: sem audio na resposta`);
        break;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Seg ${segIdx}: erro chave ${ki + 1}: ${msg}`);
        if (msg.includes("abort")) break;
        if (tent === 0) { await sleep(3000); continue; }
        break;
      }
    }
  }
  throw new Error(`Todas as ${keys.length} chaves Gemini falharam para segmento ${segIdx}`);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concatenarPCM(audios: Uint8Array[]): Uint8Array {
  const total = audios.reduce((a, x) => a + x.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of audios) { out.set(a, off); off += a.length; }
  return out;
}

function pcmToWav(pcm: Uint8Array, sampleRate = 24000): Uint8Array {
  const numChannels = 1, bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length;
  const wavSize = 44 + dataSize;
  const buf = new ArrayBuffer(wavSize);
  const view = new DataView(buf);
  const writeStr = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, wavSize - 8, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  const bytes = new Uint8Array(buf);
  bytes.set(pcm, 44);
  return bytes;
}

function gerarTimingsAproximados(
  texto: string,
  duracaoSegundos: number,
): Array<{ word: string; start: number; end: number }> {
  const tokens = texto
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length || !Number.isFinite(duracaoSegundos) || duracaoSegundos <= 0) return [];

  const weights = tokens.map((token) => {
    const clean = token.replace(/[^\p{L}\p{N}]/gu, "");
    const base = Math.max(0.22, clean.length * 0.055);
    const pause = /[.!?;:]$/.test(token) ? 0.26 : /[,]$/.test(token) ? 0.12 : 0;
    return base + pause;
  });
  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
  let cursor = 0;

  return tokens.map((word, index) => {
    const length = Math.max(0.04, (weights[index] / totalWeight) * duracaoSegundos);
    const start = cursor;
    const end = index === tokens.length - 1 ? duracaoSegundos : Math.min(duracaoSegundos, cursor + length);
    cursor = end;
    return {
      word,
      start: Number(start.toFixed(3)),
      end: Number(Math.max(end, start + 0.04).toFixed(3)),
    };
  });
}

// ============================================================================
// HANDLER
// ============================================================================

function periodStart(period: string): string {
  const d = new Date();
  if (period === "daily") d.setHours(0, 0, 0, 0);
  else if (period === "monthly") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  } else d.setTime(0);
  return d.toISOString();
}

async function getUserIdFromRequest(supabase: any, req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

async function isUserPremiumOrAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data: isAdmin } = await supabase.rpc("is_admin_user", { _user_id: userId });
  if (isAdmin) return true;

  const { data: premium } = await supabase.rpc("is_premium_user", { _user_id: userId });
  if (premium) return true;

  const { data: legacySub } = await supabase
    .from("play_subscriptions")
    .select("expires_at")
    .eq("user_id", userId)
    .in("status", ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"])
    .limit(5);

  return (legacySub || []).some((row: any) => !row.expires_at || new Date(row.expires_at) > new Date());
}

async function consumeNarrationLimit(supabase: any, userId: string, refKey: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (await isUserPremiumOrAdmin(supabase, userId)) return { ok: true };

  const { data: limitRow } = await supabase
    .from("feature_limits")
    .select("limit_value,period,enabled")
    .eq("feature_key", "narracao")
    .maybeSingle();

  if (!limitRow?.enabled) return { ok: true };

  const since = periodStart(limitRow.period || "daily");
  const { data: usageRows, error: usageError } = await supabase
    .from("feature_usage")
    .select("id,ref_key,scope_value")
    .eq("user_id", userId)
    .eq("feature_key", "narracao")
    .gte("used_at", since);

  if (usageError) return { ok: false, status: 500, error: usageError.message };

  const rows = usageRows || [];
  const alreadyUsedThisArticle = rows.some((row: any) => row.ref_key === refKey || row.scope_value === refKey);
  if (alreadyUsedThisArticle) return { ok: true };

  if (rows.length >= Number(limitRow.limit_value || 0)) {
    return { ok: false, status: 402, error: "daily_narration_limit_reached" };
  }

  const { error: insertError } = await supabase.from("feature_usage").insert({
    user_id: userId,
    feature_key: "narracao",
    ref_key: refKey,
    scope_value: refKey,
  });

  if (insertError) return { ok: false, status: 500, error: insertError.message };
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tabela_nome, artigo_numero, artigo_texto, lei_nome, titulo_artigo, hierarquia, epigrafe, force_regenerate } = await req.json();

    if (!tabela_nome || !artigo_numero || !artigo_texto || !lei_nome) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios faltando" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const userId = await getUserIdFromRequest(supabase, req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "authentication_required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const usageCheck = await consumeNarrationLimit(supabase, userId, `${tabela_nome}_${artigo_numero}`);
    if (!usageCheck.ok) {
      return new Response(JSON.stringify({ error: usageCheck.error || "daily_narration_limit_reached" }), {
        status: usageCheck.status || 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Converte "2º", "121", "3-A" em extenso ("segundo", "cento e vinte e um", "três A")
    const artigoNumStr = String(artigo_numero).trim();
    const somenteNum = artigoNumStr.match(/^(\d+)/)?.[1];
    const sufixoLetra = artigoNumStr.match(/[-–]\s*([A-Za-z])/)?.[1];
    let artigoExtenso = artigoNumStr;
    if (somenteNum) {
      const n = parseInt(somenteNum, 10);
      artigoExtenso = numeroParaExtensoJuridico(n);
      if (sufixoLetra) artigoExtenso += " " + (letrasParaExtenso[sufixoLetra.toLowerCase()] ?? sufixoLetra);
    }

    // Remove prefixo redundante do próprio texto ("Art. 2º —", "Art. 2 -", "Art. 2º.")
    const textoLimpo = String(artigo_texto)
      .replace(/^\s*Art\.?\s*\d+[º°]?(?:\s*[-–]\s*[A-Za-z])?\s*[.\-–—:]?\s*/i, "")
      .trim();

    // Monta prefixo formal: "<Lei>, <hierarquia>, artigo <n>. <epígrafe?>. <texto>"
    // Fallback compatível: usa `titulo_artigo` como hierarquia se não vier `hierarquia`.
    const cleanLabel = (s: any) =>
      s ? String(s).trim()
            .replace(/^(PARTE|LIVRO|T[IÍ]TULO|CAP[IÍ]TULO|SEÇ[AÃ]O|SUBSEÇ[AÃ]O)\s+[IVXLCDM\d]+\s*[-–—:.]?\s*/i, "")
            .replace(/\.+$/, "")
            .trim()
        : "";
    const hierLabel = cleanLabel(hierarquia ?? titulo_artigo);
    const epigrafeLabel = cleanLabel(epigrafe);

    const partes: string[] = [lei_nome];
    if (hierLabel) partes.push(hierLabel);
    partes.push(`artigo ${artigoExtenso}`);
    const prefixBase = partes.join(", ") + ".";
    const prefixo = epigrafeLabel ? `${prefixBase} ${epigrafeLabel}. ` : `${prefixBase} `;
    const textoCompleto = prefixo + textoLimpo;

    const filePath = `${tabela_nome}/${NARRATION_CACHE_VERSION}/${String(artigo_numero).replace(/[^a-zA-Z0-9]/g, "_")}.wav`;

    if (!force_regenerate) {
      const { data: cached } = await supabase
        .from("narracoes_artigos")
        .select("audio_url,word_timings,titulo_artigo")
        .eq("tabela_nome", tabela_nome)
        .eq("artigo_numero", artigo_numero)
        .maybeSingle();

      const cachedTimings = Array.isArray(cached?.word_timings) ? cached.word_timings : [];
      const cachedTitle = cleanLabel(cached?.titulo_artigo);
      const sameTitle = !hierLabel || cachedTitle === hierLabel;
      if (cached?.audio_url && cachedTimings.length > 0 && sameTitle) {
        try {
          const audioUrl = await criarSignedUrl(supabase, filePath);
          if (audioUrl !== cached.audio_url) {
            await supabase
              .from("narracoes_artigos")
              .update({ audio_url: audioUrl })
              .eq("tabela_nome", tabela_nome)
              .eq("artigo_numero", artigo_numero);
          }
          console.log(`✅ Narração reaproveitada com karaokê: ${tabela_nome} ${artigo_numero}`);
          return new Response(JSON.stringify({ audio_url: audioUrl, word_timings: cachedTimings, cached: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (e) {
          console.warn(`Cache encontrado, mas arquivo/link indisponível. Vou gerar novamente: ${String(e)}`);
        }
      } else if (cached?.audio_url) {
        console.log(`Cache antigo ignorado: sem karaokê ou sem título correto (${tabela_nome} ${artigo_numero})`);
      }
    }

    const keys = [Deno.env.get("GEMINI_API_KEY")].filter(Boolean) as string[];
    if (!keys.length) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalização pesada
    const textoNormalizado = normalizarTextoParaTTS(textoCompleto);
    const segmentos = dividirTextoEmSegmentos(textoNormalizado);
    console.log(`Narração ${lei_nome} - ${artigo_numero}: ${segmentos.length} segmentos, voz ${VOICE_NAME}`);

    // Gera segmentos sequencialmente
    const audiosPCM: Uint8Array[] = [];
    for (let i = 0; i < segmentos.length; i++) {
      const b64 = await gerarAudioSegmento(segmentos[i], keys, i + 1, segmentos.length);
      audiosPCM.push(base64ToBytes(b64));
    }

    const pcmConcatenado = concatenarPCM(audiosPCM);
    const wavBytes = pcmToWav(pcmConcatenado, 24000);

    // Upload
    const { error: upErr } = await supabase.storage.from("narracoes").upload(filePath, wavBytes, {
      contentType: "audio/wav", upsert: true, cacheControl: "31536000, immutable",
    });
    if (upErr) {
      console.error("Upload:", upErr);
      return new Response(JSON.stringify({ error: `Upload falhou: ${upErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let audioUrl = "";
    try {
      audioUrl = await criarSignedUrl(supabase, filePath);
    } catch (e) {
      console.error("Signed URL:", e);
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transcreve o áudio gerado para obter word timings (karaokê).
    // Falha silenciosa: se não conseguir, salva sem timings.
    let wordTimings: Array<{ word: string; start: number; end: number }> | null = null;
    try {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (lovableKey) {
        const fd = new FormData();
        fd.append("file", new Blob([wavBytes as any], { type: "audio/wav" }), "narracao.wav");
        fd.append("model", "openai/whisper-1");
        fd.append("response_format", "verbose_json");
        fd.append("timestamp_granularities[]", "word");
        fd.append("language", "pt");
        const tRes = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}` },
          body: fd,
        });
        if (tRes.ok) {
          const tJson = await tRes.json();
          if (Array.isArray(tJson?.words) && tJson.words.length > 0) {
            wordTimings = tJson.words.map((w: any) => ({
              word: String(w.word ?? "").trim(),
              start: Number(w.start ?? 0),
              end: Number(w.end ?? 0),
            })).filter((w: any) => w.word);
            console.log(`✅ ${wordTimings.length} word timings capturados`);
          }
        } else {
          console.warn(`Transcrição falhou: ${tRes.status} ${await tRes.text().catch(() => "")}`);
        }
      }
    } catch (e) {
      console.warn("Falha ao gerar word timings:", e);
    }

    if (!wordTimings?.length) {
      const duracaoSegundos = pcmConcatenado.length / (24000 * 2);
      wordTimings = gerarTimingsAproximados(textoNormalizado, duracaoSegundos);
      console.log(`✅ ${wordTimings.length} word timings aproximados gerados`);
    }

    const { error: insErr } = await supabase.from("narracoes_artigos").upsert(
      {
        tabela_nome, artigo_numero, lei_nome,
        titulo_artigo: hierLabel || titulo_artigo || null,
        audio_url: audioUrl,
        word_timings: wordTimings,
      },
      { onConflict: "tabela_nome,artigo_numero" },
    );
    if (insErr) console.error("Insert cache:", insErr);

    console.log(`✅ Narração salva: ${audioUrl}`);
    return new Response(JSON.stringify({ audio_url: audioUrl, word_timings: wordTimings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Erro geral:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

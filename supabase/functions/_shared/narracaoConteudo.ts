// Edge function: Narração de Conteúdo (admin)
// Ações:
//  - vozes           → lista de vozes masculinas do Gemini TTS + estilo padrão
//  - livros          → livros com Leitura Nativa disponíveis para narrar
//  - paginas         → páginas do livro + narrações já geradas
//  - preview         → gera (e cacheia) uma prévia de voz a partir de um parágrafo
//  - narrar-pagina   → narra uma página do livro e salva o áudio
//  - apagar-pagina   → remove a narração de uma página
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { geminiFetch } from "./geminiFetch.ts";
import { logAiCall } from "./ai-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const MODEL = "gemini-2.5-flash-preview-tts";
const BUCKET = "narracoes-conteudo";
const SAMPLE_RATE = 24000;
const ANO_SEGUNDOS = 60 * 60 * 24 * 365;

// Vozes do Gemini TTS (masculinas e femininas)
export const VOZES_CATALOGO = [
  { id: "Charon", genero: "masculina", descricao: "Grave e imponente · locutor clássico" },
  { id: "Puck", genero: "masculina", descricao: "Animada e envolvente · narrador jovem" },
  { id: "Fenrir", genero: "masculina", descricao: "Energética · dramática" },
  { id: "Orus", genero: "masculina", descricao: "Firme e segura · documentário" },
  { id: "Enceladus", genero: "masculina", descricao: "Calma e profunda · audiolivro noturno" },
  { id: "Iapetus", genero: "masculina", descricao: "Séria e sóbria · técnica" },
  { id: "Umbriel", genero: "masculina", descricao: "Tranquila e acolhedora" },
  { id: "Algieba", genero: "masculina", descricao: "Suave e aveludada" },
  { id: "Algenib", genero: "masculina", descricao: "Entusiasta · leitura vibrante" },
  { id: "Rasalgethi", genero: "masculina", descricao: "Informativa · didática" },
  { id: "Sadaltager", genero: "masculina", descricao: "Madura e erudita" },
  { id: "Zubenelgenubi", genero: "masculina", descricao: "Conversacional · próxima" },
  { id: "Schedar", genero: "masculina", descricao: "Equilibrada · neutra" },
  { id: "Achernar", genero: "feminina", descricao: "Clara e leve" },
  { id: "Sulafat", genero: "feminina", descricao: "Calorosa · acolhedora" },
  { id: "Kore", genero: "feminina", descricao: "Firme e segura" },
  { id: "Aoede", genero: "feminina", descricao: "Leve e fluida" },
  { id: "Leda", genero: "feminina", descricao: "Jovem e desenvolta" },
  { id: "Zephyr", genero: "feminina", descricao: "Brilhante · expressiva" },
  { id: "Autonoe", genero: "feminina", descricao: "Animada · envolvente" },
  { id: "Callirrhoe", genero: "feminina", descricao: "Tranquila · serena" },
  { id: "Despina", genero: "feminina", descricao: "Suave e delicada" },
  { id: "Erinome", genero: "feminina", descricao: "Clara · didática" },
  { id: "Laomedeia", genero: "feminina", descricao: "Alegre · leitura viva" },
];

// Compatibilidade com o nome antigo
export const VOZES_MASCULINAS = VOZES_CATALOGO.filter((v) => v.genero === "masculina");

const VOZ_VALIDA = (id: string) => VOZES_CATALOGO.some((v) => v.id === id);

async function listarVozes(admin: any) {
  const { data: cfg } = await admin
    .from("narracao_vozes_config")
    .select("voz, ativa, padrao, genero, descricao");
  const mapa = new Map<string, any>();
  for (const c of (cfg ?? []) as any[]) mapa.set(c.voz, c);
  const vozes = VOZES_CATALOGO.map((v) => {
    const c = mapa.get(v.id);
    return {
      id: v.id,
      genero: c?.genero ?? v.genero,
      descricao: c?.descricao ?? v.descricao,
      ativa: c?.ativa ?? true,
      padrao: c?.padrao ?? false,
    };
  });
  if (!vozes.some((v) => v.padrao)) {
    const primeira = vozes.find((v) => v.ativa);
    if (primeira) primeira.padrao = true;
  }
  return vozes;
}

export const ESTILO_PADRAO_LIVRO = [
  "Você é um locutor profissional de audiolivros narrando em português brasileiro.",
  "Interprete o texto como um ator: incorpore a obra, respeite as pausas de pontuação e o ritmo dos parágrafos.",
  "Quando houver diálogos ou personagens distintos, identifique cada um e mude o timbre, o ritmo e a intensidade para diferenciá-los, voltando à voz do narrador fora das falas.",
  "Traga a emoção que o texto pede — tensão, ironia, solenidade, ternura — sem exagerar nem caricaturar.",
  "Pronuncie termos jurídicos e nomes próprios com clareza. Não leia marcações de markdown, números de página, notas de rodapé nem comentários técnicos.",
  "REGRAS DE PRONÚNCIA JURÍDICA (obrigatórias):",
  "1) Incisos são numerais romanos e devem ser lidos como ordinais: 'inciso VI' = 'inciso sexto', 'inciso XIV' = 'inciso décimo quarto'. Nunca leia a letra nem o cardinal ('vi', 'seis').",
  "2) Artigos até o número nove são ordinais: 'art. 5º' = 'artigo quinto'; de dez em diante são cardinais: 'art. 121' = 'artigo cento e vinte e um'.",
  "3) '§' lê-se 'parágrafo' e '§§' lê-se 'parágrafos'; '§ 2º' = 'parágrafo segundo'; 'parágrafo único' lê-se por extenso.",
  "4) Leia por extenso as abreviações: 'art.' = artigo, 'arts.' = artigos, 'inc.' = inciso, 'al.' = alínea, 'nº' = número, 'CF' = Constituição Federal, 'CP' = Código Penal, 'CPC' = Código de Processo Civil, 'CPP' = Código de Processo Penal, 'CC' = Código Civil, 'CLT' = Consolidação das Leis do Trabalho, 'STF' = Supremo Tribunal Federal, 'STJ' = Superior Tribunal de Justiça.",
  "5) Alíneas são lidas como letras: 'alínea a' = 'alínea á'. 'Caput' pronuncia-se 'cáput'.",
  "6) Expressões latinas (habeas corpus, in dubio pro reo, erga omnes) devem ser pronunciadas na dicção jurídica brasileira usual, com naturalidade.",
  "Narre o texto a seguir",
].join(" ");

const ESTILO_PADRAO_PREVIA = ESTILO_PADRAO_LIVRO;

// Coleções da biblioteca: id usado na leitura nativa → tabela + campos
const COLECOES: Record<string, { tabela: string; titulo: string; autor?: string }> = {
  areas: { tabela: "biblioteca_estudos", titulo: "tema" },
  biblioteca_estudos: { tabela: "biblioteca_estudos", titulo: "tema" },
  classicos: { tabela: "biblioteca_classicos", titulo: "livro", autor: "autor" },
  biblioteca_classicos: { tabela: "biblioteca_classicos", titulo: "livro", autor: "autor" },
  oab: { tabela: "biblioteca_oab", titulo: "tema" },
  biblioteca_oab: { tabela: "biblioteca_oab", titulo: "tema" },
  "fora-da-toga": { tabela: "biblioteca_fora_da_toga", titulo: "livro", autor: "autor" },
  biblioteca_fora_da_toga: { tabela: "biblioteca_fora_da_toga", titulo: "livro", autor: "autor" },
  oratoria: { tabela: "biblioteca_oratoria", titulo: "livro", autor: "autor" },
  biblioteca_oratoria: { tabela: "biblioteca_oratoria", titulo: "livro", autor: "autor" },
  lideranca: { tabela: "biblioteca_lideranca", titulo: "livro", autor: "autor" },
  biblioteca_lideranca: { tabela: "biblioteca_lideranca", titulo: "livro", autor: "autor" },
  portugues: { tabela: "biblioteca_portugues", titulo: "tema" },
  biblioteca_portugues: { tabela: "biblioteca_portugues", titulo: "tema" },
  "pesquisa-cientifica": { tabela: "biblioteca_pesquisa_cientifica", titulo: "livro", autor: "autor" },
  biblioteca_pesquisa_cientifica: { tabela: "biblioteca_pesquisa_cientifica", titulo: "livro", autor: "autor" },
};

// ---------- áudio ----------
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pcmToWav(pcm: Uint8Array, sampleRate = SAMPLE_RATE): Uint8Array {
  const dataSize = pcm.length;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  const bytes = new Uint8Array(buf);
  bytes.set(pcm, 44);
  return bytes;
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function ttsGemini(texto: string, voz: string, estilo: string, apiKey: string): Promise<Uint8Array> {
  const res = await geminiFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${estilo}:\n\n${texto}` }] }],
        generationConfig: {
          response_modalities: ["AUDIO"],
          speech_config: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } },
        },
      }),
    },
  );
  const data = await res.json();
  if (data?.error) throw new Error(`Gemini: ${JSON.stringify(data.error).slice(0, 300)}`);
  const b64 = data.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data)?.inlineData?.data;
  if (!b64) throw new Error("Sem áudio na resposta do Gemini");
  return b64ToBytes(b64);
}

// Fallback: Lovable AI Gateway (Gemini TTS) — devolve WAV, do qual extraímos o PCM.
async function ttsGateway(texto: string, voz: string, estilo: string): Promise<Uint8Array> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY ausente");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-tts",
      contents: [{ role: "user", parts: [{ text: `${estilo}:\n\n${texto}` }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } },
      },
    }),
  });
  if (!res.ok) throw new Error(`Gateway TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (!buf.length) throw new Error("Gateway TTS sem áudio");
  // remove o cabeçalho RIFF de 44 bytes quando presente
  const isWav = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46;
  return isWav ? buf.slice(44) : buf;
}

async function ttsChunk(texto: string, voz: string, estilo: string): Promise<Uint8Array> {
  const chaves = [Deno.env.get("GEMINI_API_KEY"), Deno.env.get("GEMINI_API_KEY_RESERVA")].filter(Boolean) as string[];
  let ultimo: unknown = null;
  for (const chave of chaves) {
    try {
      return await ttsGemini(texto, voz, estilo, chave);
    } catch (e) {
      ultimo = e;
      console.error("TTS Gemini falhou, tentando próxima chave:", (e as Error).message);
    }
  }
  try {
    return await ttsGateway(texto, voz, estilo);
  } catch (e) {
    console.error("TTS gateway falhou:", (e as Error).message);
    throw ultimo ?? e;
  }
}

function chunkText(text: string, max = 1400): string[] {
  const clean = text.replace(/\r/g, "").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?\n]+[.!?\n]?/g) ?? [clean];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max && cur) { chunks.push(cur.trim()); cur = ""; }
    cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

// Expande abreviações e numerais jurídicos para que o TTS pronuncie corretamente
// (ex.: "inciso VI" → "inciso sexto", "§ 2º" → "parágrafo segundo").
const ORDINAIS = [
  "", "primeiro", "segundo", "terceiro", "quarto", "quinto", "sexto", "sétimo", "oitavo", "nono",
  "décimo", "décimo primeiro", "décimo segundo", "décimo terceiro", "décimo quarto", "décimo quinto",
  "décimo sexto", "décimo sétimo", "décimo oitavo", "décimo nono", "vigésimo", "vigésimo primeiro",
  "vigésimo segundo", "vigésimo terceiro", "vigésimo quarto", "vigésimo quinto", "vigésimo sexto",
  "vigésimo sétimo", "vigésimo oitavo", "vigésimo nono", "trigésimo",
];

function romanoParaNumero(r: string): number {
  const mapa: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const s = r.toUpperCase();
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const v = mapa[s[i]] ?? 0;
    const n = mapa[s[i + 1]] ?? 0;
    total += v < n ? -v : v;
  }
  return total;
}

export function normalizarJuridico(texto: string): string {
  let t = texto;
  // Incisos em romano → ordinal por extenso
  t = t.replace(/\b(inc(?:isos?|\.)?)\s+([IVXLCDM]{1,7})\b/gi, (m, pre, rom) => {
    const n = romanoParaNumero(rom);
    const ord = ORDINAIS[n];
    if (!n || !ord) return m;
    const plural = /incisos/i.test(pre);
    return `${plural ? "incisos" : "inciso"} ${ord}`;
  });
  // § / §§
  t = t.replace(/§§/g, "parágrafos ").replace(/§/g, "parágrafo ");
  // Ordinais com º / ª
  t = t.replace(/\b(\d{1,2})\s*[ºo°]\b/g, (m, d) => ORDINAIS[Number(d)] || m);
  t = t.replace(/\b(\d{1,2})\s*[ªa]\b(?=\s)/g, (m, d) => {
    const o = ORDINAIS[Number(d)];
    return o ? o.replace(/o\b/g, "a").replace(/imo\b/g, "ima") : m;
  });
  // Abreviações comuns
  const abrev: [RegExp, string][] = [
    [/\barts\.\s*/gi, "artigos "],
    [/\bart\.\s*/gi, "artigo "],
    [/\bincs\.\s*/gi, "incisos "],
    [/\binc\.\s*/gi, "inciso "],
    [/\bal\.\s*/gi, "alínea "],
    [/\bn[ºo°]\.?\s*/gi, "número "],
    [/\bpar[áa]gr\.\s*/gi, "parágrafo "],
    [/\bcaput\b/gi, "cáput"],
    [/\bCF\/88\b/g, "Constituição Federal de 1988"],
    [/\bCF\b/g, "Constituição Federal"],
    [/\bCPC\b/g, "Código de Processo Civil"],
    [/\bCPP\b/g, "Código de Processo Penal"],
    [/\bCLT\b/g, "Consolidação das Leis do Trabalho"],
    [/\bCDC\b/g, "Código de Defesa do Consumidor"],
    [/\bCTN\b/g, "Código Tributário Nacional"],
    [/\bCP\b/g, "Código Penal"],
    [/\bCC\b/g, "Código Civil"],
    [/\bSTF\b/g, "Supremo Tribunal Federal"],
    [/\bSTJ\b/g, "Superior Tribunal de Justiça"],
    [/\bTST\b/g, "Tribunal Superior do Trabalho"],
  ];
  for (const [re, sub] of abrev) t = t.replace(re, sub as string);
  // "artigos 5" plural quando veio de "arts."
  return t.replace(/\s{2,}/g, " ");
}

async function sintetizar(texto: string, voz: string, estilo: string): Promise<{ wav: Uint8Array; segundos: number }> {
  const chunks = chunkText(normalizarJuridico(texto));
  if (!chunks.length) throw new Error("Texto vazio");
  const parts: Uint8Array[] = [];
  let total = 0;
  for (const c of chunks) {
    const pcm = await ttsChunk(c, voz, estilo);
    parts.push(pcm);
    total += pcm.length;
  }
  const merged = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { merged.set(p, off); off += p.length; }
  return { wav: pcmToWav(merged), segundos: Math.round(merged.length / 2 / SAMPLE_RATE) };
}

// ---------- apresentação narrada ----------
const ESTILO_APRESENTACAO = [
  "Você é um professor de Direito apresentando slides para estudantes.",
  "Fale com entusiasmo controlado, ritmo de aula, pausas naturais e ênfase nas ideias-chave.",
  "Não leia o slide literalmente: explique, contextualize e complemente com clareza.",
  "Aplique as regras de pronúncia jurídica: incisos em ordinal ('inciso sexto'), '§' como 'parágrafo', abreviações por extenso.",
  "Narre o texto a seguir",
].join(" ");

const TEXTO_MODEL = "gemini-2.5-flash";

async function gerarTextoIA(prompt: string): Promise<string> {
  // 1) Gemini direto (com fallback de chave)
  try {
    const res = await geminiFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${TEXTO_MODEL}:generateContent?key=${Deno.env.get("GEMINI_API_KEY") ?? ""}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 900 },
        }),
      },
    );
    if (res.ok) {
      const data = await res.json();
      const txt = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(" ")?.trim();
      if (txt) return txt;
    }
  } catch (_) { /* cai para o gateway */ }

  // 2) Lovable AI Gateway
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("não foi possível gerar o roteiro (sem chave de IA)");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`roteiro: ${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  const txt = String(data?.choices?.[0]?.message?.content ?? "").trim();
  if (!txt) throw new Error("roteiro vazio");
  return txt;
}

async function gerarRoteiroSlide(opts: { titulo: string; indice: number; total: number; texto: string }): Promise<string> {
  const { titulo, indice, total, texto } = opts;
  const posicao = indice === 0
    ? "Este é o slide de abertura: uma saudação curtíssima e o tema, em uma ou duas frases."
    : total > 0 && indice === total - 1
      ? "Este é o slide final: feche com uma síntese rápida e um convite curto à leitura da obra."
      : "Este é um slide intermediário: vá direto ao ponto principal deste slide.";
  const prompt = [
    `Você é um professor de Direito narrando uma apresentação em slides sobre a obra "${titulo}".`,
    `Slide ${indice + 1}${total ? ` de ${total}` : ""}. ${posicao}`,
    "Escreva APENAS o texto falado da narração deste slide, em português do Brasil, com tom entusiasta e direto de professor que empolga a turma.",
    "REGRA DE TEMPO (obrigatória): entre 20 e 30 segundos falados — de 50 a 75 palavras. Nunca passe disso.",
    "Seja direto: 2 a 4 frases curtas com a ideia central do slide. Sem introduções, sem repetir o que já foi dito, sem encher linguiça, sem floreios.",
    "NUNCA descreva a imagem nem use frases como 'como você vê na imagem', 'observe o slide', 'nesta tela', 'veja aqui' — a pessoa já está vendo o slide enquanto ouve.",
    "Sem markdown, sem títulos, sem listas, sem indicações de cena — só o texto a ser lido em voz alta.",
    "",
    "Conteúdo do slide:",
    texto ? texto.slice(0, 4000) : "(o slide é majoritariamente visual — descreva e explique o ponto provável a partir do tema da obra)",
  ].join("\n");
  const roteiro = await gerarTextoIA(prompt);
  const limpo = removerReferenciasVisuais(
    roteiro.replace(/[*#`_>]/g, "").replace(/\s{2,}/g, " ").trim(),
  );
  return limitarAUmMinuto(limpo);
}

/** Remove frases que apontam para a imagem/slide — a pessoa já está vendo. */
function removerReferenciasVisuais(texto: string): string {
  const padrao = /(como (?:você|voce|vocês|voces|se) (?:pode )?(?:vê|ve|veem|vê(?:em)?|observa|nota)[^.!?]*[.!?]\s*)|((?:observe|veja|repare|note|olhe)[^.!?]*\b(?:imagem|slide|tela|figura|quadro)\b[^.!?]*[.!?]\s*)|([^.!?]*\b(?:nesta|nesse|neste|nessa|na)\s+(?:imagem|tela|slide|figura)\b[^.!?]*[.!?]\s*)/gi;
  const limpo = texto.replace(padrao, "").replace(/\s{2,}/g, " ").trim();
  return limpo.length > 20 ? limpo : texto;
}

/**
 * Trava rígida de ~30 segundos por slide (~75 palavras a ~150 wpm de narração).
 * Corta no fim da última frase completa que couber, para não terminar no meio.
 */
const MAX_PALAVRAS_SLIDE = 75;
function limitarAUmMinuto(texto: string): string {
  const palavras = texto.split(/\s+/).filter(Boolean);
  if (palavras.length <= MAX_PALAVRAS_SLIDE) return texto;
  const cortado = palavras.slice(0, MAX_PALAVRAS_SLIDE).join(" ");
  const fim = Math.max(cortado.lastIndexOf("."), cortado.lastIndexOf("!"), cortado.lastIndexOf("?"));
  return (fim > 40 ? cortado.slice(0, fim + 1) : cortado.replace(/[,;:\s]+$/, "") + ".").trim();
}

// ---------- texto do livro ----------
function limparParaNarracao(md: string): string {
  return md
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|.*\|\s*$/gm, "")
    .replace(/^[\s>*_`~#-]{3,}$/gm, "")
    .replace(/[#>*_`~]/g, "")
    .replace(/^\s*\d{1,4}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type PaginaLivro = { index: number; label: string; texto: string; caracteres: number };

function paginarConteudo(conteudo: string): PaginaLivro[] {
  const src = conteudo ?? "";
  const paginas: PaginaLivro[] = [];
  const partes = src.split(/<!--\s*page:(\d+)\s*-->/g);
  if (partes.length > 1) {
    for (let i = 1; i < partes.length; i += 2) {
      const numero = Number(partes[i]);
      const texto = limparParaNarracao(partes[i + 1] ?? "");
      if (!texto || texto.length < 40) continue;
      paginas.push({ index: paginas.length, label: `Página ${numero}`, texto, caracteres: texto.length });
    }
  }
  if (paginas.length) return paginas;
  // fallback: divide por blocos de ~2500 caracteres
  const limpo = limparParaNarracao(src);
  const blocos = limpo.split(/\n\n+/);
  let cur = "";
  const push = () => {
    const t = cur.trim();
    if (t.length >= 40) paginas.push({ index: paginas.length, label: `Trecho ${paginas.length + 1}`, texto: t, caracteres: t.length });
    cur = "";
  };
  for (const b of blocos) {
    if ((cur + b).length > 2500 && cur) push();
    cur += `${b}\n\n`;
  }
  push();
  return paginas;
}

async function carregarPaginas(admin: any, livroTabela: string, livroId: string) {
  const { data, error } = await admin
    .from("biblioteca_leitura_nativa")
    .select("conteudo_md, conteudo_md_refinado")
    .eq("livro_tabela", livroTabela)
    .eq("livro_id", livroId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const conteudo = data?.conteudo_md_refinado || data?.conteudo_md || "";
  if (!conteudo) throw new Error("Livro sem conteúdo de Leitura Nativa");
  return paginarConteudo(conteudo);
}

function svc() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function assinar(admin: any, path: string): Promise<string | null> {
  const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, ANO_SEGUNDOS);
  return data?.signedUrl ?? null;
}

// ---------- handler ----------
export async function handleNarracaoConteudo(req: Request, body: any): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const admin = svc();

    // autenticação: somente admins
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "não autenticado" }, 401);
    const { data: userData } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ error: "não autenticado" }, 401);
    const { data: isAdmin } = await admin.rpc("is_admin_user", { _user_id: user.id });
    if (!isAdmin) return json({ error: "acesso restrito a administradores" }, 403);

    const acao = (body.acao || "vozes").toString();

    if (acao === "vozes") {
      const vozes = await listarVozes(admin);
      return json({
        vozes,
        voz_padrao: vozes.find((v) => v.padrao && v.ativa)?.id ?? vozes.find((v) => v.ativa)?.id ?? null,
        estilo_padrao: ESTILO_PADRAO_LIVRO,
        modelo: MODEL,
      });
    }

    if (acao === "voz-config") {
      const voz = String(body.voz || "");
      if (!VOZ_VALIDA(voz)) return json({ error: "voz inválida" }, 400);
      const base = VOZES_CATALOGO.find((v) => v.id === voz)!;
      const patch: Record<string, unknown> = {
        voz, genero: base.genero, descricao: base.descricao,
      };
      if (typeof body.ativa === "boolean") patch.ativa = body.ativa;
      if (body.padrao === true) {
        // só uma voz pode ser padrão
        await admin.from("narracao_vozes_config").update({ padrao: false }).neq("voz", voz);
        patch.padrao = true;
        patch.ativa = true;
      } else if (body.padrao === false) {
        patch.padrao = false;
      }
      const { error } = await admin
        .from("narracao_vozes_config")
        .upsert(patch, { onConflict: "voz" });
      if (error) throw new Error(error.message);
      const vozes = await listarVozes(admin);
      return json({
        vozes,
        voz_padrao: vozes.find((v) => v.padrao && v.ativa)?.id ?? null,
      });
    }

    if (acao === "livros") {
      const { data: registros, error } = await admin
        .from("biblioteca_leitura_nativa")
        .select("livro_tabela, livro_id, total_paginas, status, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);

      const comConteudo = (registros ?? []) as any[];

      // busca títulos em lote por coleção
      const porColecao = new Map<string, string[]>();
      for (const r of comConteudo) {
        const arr = porColecao.get(r.livro_tabela) ?? [];
        arr.push(String(r.livro_id));
        porColecao.set(r.livro_tabela, arr);
      }
      const titulos = new Map<string, { titulo: string; autor?: string }>();
      for (const [colecao, ids] of porColecao) {
        const cfg = COLECOES[colecao];
        if (!cfg) continue;
        const campos = ["id", cfg.titulo, cfg.autor].filter(Boolean).join(", ");
        const { data: rows } = await admin.from(cfg.tabela).select(campos).in("id", ids);
        for (const row of (rows ?? []) as any[]) {
          titulos.set(`${colecao}:${row.id}`, {
            titulo: String(row[cfg.titulo] ?? "Sem título"),
            autor: cfg.autor ? (row[cfg.autor] ?? undefined) : undefined,
          });
        }
      }

      // narrações já geradas
      const { data: narracoes } = await admin
        .from("narracao_livro_paginas")
        .select("livro_tabela, livro_id, duracao_segundos");
      const contagem = new Map<string, { total: number; segundos: number }>();
      for (const n of (narracoes ?? []) as any[]) {
        const k = `${n.livro_tabela}:${n.livro_id}`;
        const atual = contagem.get(k) ?? { total: 0, segundos: 0 };
        atual.total += 1;
        atual.segundos += Number(n.duracao_segundos ?? 0);
        contagem.set(k, atual);
      }

      const livros = comConteudo.map((r: any) => {
        const key = `${r.livro_tabela}:${r.livro_id}`;
        const info = titulos.get(key);
        return {
          livro_tabela: r.livro_tabela,
          livro_id: String(r.livro_id),
          titulo: info?.titulo ?? `Livro ${r.livro_id}`,
          autor: info?.autor ?? null,
          colecao: COLECOES[r.livro_tabela]?.tabela ?? r.livro_tabela,
          total_paginas: Number(r.total_paginas ?? 0),
          narradas: contagem.get(key)?.total ?? 0,
          segundos_narrados: contagem.get(key)?.segundos ?? 0,
          status: r.status,
        };
      }).sort((a: any, b: any) => a.titulo.localeCompare(b.titulo, "pt-BR"));

      return json({ livros });
    }

    if (acao === "paginas") {
      const livroTabela = String(body.livro_tabela || "");
      const livroId = String(body.livro_id || "");
      if (!livroTabela || !livroId) return json({ error: "livro_tabela e livro_id obrigatórios" }, 400);

      const paginas = await carregarPaginas(admin, livroTabela, livroId);
      const { data: narracoes } = await admin
        .from("narracao_livro_paginas")
        .select("pagina_index, voz, audio_url, audio_path, duracao_segundos, status, erro, updated_at")
        .eq("livro_tabela", livroTabela)
        .eq("livro_id", livroId);

      const mapa = new Map<number, any>();
      for (const n of (narracoes ?? []) as any[]) mapa.set(Number(n.pagina_index), n);

      // renova URLs assinadas expiradas quando necessário
      const itens = [];
      for (const p of paginas) {
        const n = mapa.get(p.index);
        let audioUrl = n?.audio_url ?? null;
        if (n?.audio_path && !audioUrl) audioUrl = await assinar(admin, n.audio_path);
        itens.push({
          index: p.index,
          label: p.label,
          caracteres: p.caracteres,
          preview_texto: p.texto.slice(0, 400),
          narracao: n ? { voz: n.voz, audio_url: audioUrl, duracao_segundos: n.duracao_segundos, status: n.status, erro: n.erro, updated_at: n.updated_at } : null,
        });
      }
      return json({ paginas: itens, total: itens.length });
    }

    if (acao === "preview") {
      const texto = String(body.texto || "").trim();
      const voz = String(body.voz || "Charon");
      const estilo = String(body.estilo || ESTILO_PADRAO_PREVIA);
      const forcar = body.forcar === true;
      if (texto.length < 3) return json({ error: "texto obrigatório" }, 400);
      if (texto.length > 1500) return json({ error: "parágrafo muito longo (máx. 1500 caracteres)" }, 400);
      if (!VOZ_VALIDA(voz)) return json({ error: "voz inválida" }, 400);

      const hash = await sha256(`${estilo}::${texto}`);
      if (!forcar) {
        const { data: cache } = await admin
          .from("narracao_vozes_preview")
          .select("id, audio_path, audio_url, duracao_segundos")
          .eq("voz", voz).eq("texto_hash", hash).maybeSingle();
        if (cache?.audio_path) {
          const url = await assinar(admin, cache.audio_path);
          if (url) {
            if (url !== cache.audio_url) await admin.from("narracao_vozes_preview").update({ audio_url: url }).eq("id", cache.id);
            return json({ audio_url: url, voz, duracao_segundos: cache.duracao_segundos, cache: true });
          }
        }
      }

      const { wav, segundos } = await sintetizar(texto, voz, estilo);
      const path = `previews/${voz}/${hash.slice(0, 24)}.wav`;
      const { error: upErr } = await admin.storage.from(BUCKET)
        .upload(path, wav, { contentType: "audio/wav", upsert: true, cacheControl: "31536000" });
      if (upErr) throw new Error(`upload: ${upErr.message}`);
      const url = await assinar(admin, path);

      await admin.from("narracao_vozes_preview").upsert({
        voz, estilo, texto, texto_hash: hash,
        audio_path: path, audio_url: url, duracao_segundos: segundos,
      }, { onConflict: "voz,texto_hash" });

      await logAiCall({
        functionName: "narracao-conteudo", kind: "tts", model: MODEL,
        triggerType: "manual", inputUnits: texto.length, outputUnits: segundos, userId: user.id,
      });

      return json({ audio_url: url, voz, duracao_segundos: segundos, cache: false });
    }

    if (acao === "narrar-pagina") {
      const livroTabela = String(body.livro_tabela || "");
      const livroId = String(body.livro_id || "");
      const index = Number(body.pagina_index);
      const voz = String(body.voz || "Charon");
      const estilo = String(body.estilo || ESTILO_PADRAO_LIVRO);
      const forcar = body.forcar === true;
      if (!livroTabela || !livroId || Number.isNaN(index)) return json({ error: "parâmetros inválidos" }, 400);
      if (!VOZ_VALIDA(voz)) return json({ error: "voz inválida" }, 400);

      const paginas = await carregarPaginas(admin, livroTabela, livroId);
      const pagina = paginas.find((p) => p.index === index);
      if (!pagina) return json({ error: "página não encontrada" }, 404);

      const hash = await sha256(`${voz}::${estilo}::${pagina.texto}`);
      const { data: existente } = await admin
        .from("narracao_livro_paginas")
        .select("id, audio_path, audio_url, texto_hash, duracao_segundos")
        .eq("livro_tabela", livroTabela).eq("livro_id", livroId).eq("pagina_index", index).maybeSingle();

      if (!forcar && existente?.audio_path && existente.texto_hash === hash) {
        const url = await assinar(admin, existente.audio_path);
        return json({ audio_url: url, duracao_segundos: existente.duracao_segundos, cache: true, pagina_index: index });
      }

      const { wav, segundos } = await sintetizar(pagina.texto, voz, estilo);
      const path = `livros/${livroTabela}/${livroId}/${String(index).padStart(4, "0")}-${voz}.wav`;
      const { error: upErr } = await admin.storage.from(BUCKET)
        .upload(path, wav, { contentType: "audio/wav", upsert: true, cacheControl: "31536000" });
      if (upErr) throw new Error(`upload: ${upErr.message}`);
      const url = await assinar(admin, path);

      await admin.from("narracao_livro_paginas").upsert({
        livro_tabela: livroTabela, livro_id: livroId, pagina_index: index, pagina_label: pagina.label,
        voz, modelo: MODEL, estilo, texto_hash: hash, caracteres: pagina.caracteres,
        audio_path: path, audio_url: url, duracao_segundos: segundos, status: "pronto", erro: null,
      }, { onConflict: "livro_tabela,livro_id,pagina_index" });

      await logAiCall({
        functionName: "narracao-conteudo", kind: "tts", model: MODEL,
        triggerType: "manual", inputUnits: pagina.caracteres, outputUnits: segundos,
        userId: user.id, refId: `${livroTabela}:${livroId}:${index}`,
      });

      return json({ audio_url: url, duracao_segundos: segundos, cache: false, pagina_index: index, label: pagina.label });
    }

    if (acao === "apagar-pagina") {
      const livroTabela = String(body.livro_tabela || "");
      const livroId = String(body.livro_id || "");
      const index = Number(body.pagina_index);
      if (!livroTabela || !livroId || Number.isNaN(index)) return json({ error: "parâmetros inválidos" }, 400);
      const { data: row } = await admin.from("narracao_livro_paginas")
        .select("audio_path").eq("livro_tabela", livroTabela).eq("livro_id", livroId).eq("pagina_index", index).maybeSingle();
      if (row?.audio_path) await admin.storage.from(BUCKET).remove([row.audio_path]);
      await admin.from("narracao_livro_paginas").delete()
        .eq("livro_tabela", livroTabela).eq("livro_id", livroId).eq("pagina_index", index);
      return json({ ok: true });
    }

    // ---------- APRESENTAÇÃO NARRADA ----------
    if (acao === "apres-livros") {
      const ROTULOS: Record<string, string> = {
        biblioteca_estudos: "Áreas do Direito",
        biblioteca_classicos: "Clássicos do Direito",
        biblioteca_oab: "OAB",
        biblioteca_fora_da_toga: "Fora da Toga",
        biblioteca_oratoria: "Oratória",
        biblioteca_lideranca: "Liderança",
        biblioteca_portugues: "Português",
        biblioteca_pesquisa_cientifica: "Pesquisa Científica",
      };
      const tabelas = new Map<string, { titulo: string; autor?: string }>();
      for (const [chave, cfg] of Object.entries(COLECOES)) {
        if (chave !== cfg.tabela) continue;
        tabelas.set(cfg.tabela, { titulo: cfg.titulo, autor: cfg.autor });
      }
      const livros: any[] = [];
      for (const [tabela, cfg] of tabelas) {
        const campos = ["id", cfg.titulo, cfg.autor].filter(Boolean).join(", ");
        const { data: rows } = await admin.from(tabela).select(campos).limit(500);
        for (const row of (rows ?? []) as any[]) {
          livros.push({
            livro_tabela: tabela,
            livro_id: String(row.id),
            titulo: String(row[cfg.titulo] ?? "Sem título"),
            autor: cfg.autor ? (row[cfg.autor] ?? null) : null,
            categoria: ROTULOS[tabela] ?? tabela,
          });
        }
      }
      const { data: aprs } = await admin
        .from("apresentacoes_narradas")
        .select("id, livro_tabela, livro_id, total_slides, publicada");
      const porLivro = new Map<string, any>();
      for (const a of (aprs ?? []) as any[]) porLivro.set(`${a.livro_tabela}:${a.livro_id}`, a);
      for (const l of livros) {
        const a = porLivro.get(`${l.livro_tabela}:${l.livro_id}`);
        l.apresentacao_id = a?.id ?? null;
        l.total_slides = a?.total_slides ?? 0;
        l.publicada = a?.publicada ?? false;
      }
      livros.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
      return json({ livros });
    }

    if (acao === "apres-criar") {
      const livroTabela = String(body.livro_tabela || "");
      const livroId = String(body.livro_id || "");
      const titulo = String(body.titulo || "").trim();
      const voz = String(body.voz || "Charon");
      const totalSlides = Number(body.total_slides || 0);
      if (!livroTabela || !livroId || !titulo) return json({ error: "parâmetros inválidos" }, 400);
      if (!VOZ_VALIDA(voz)) return json({ error: "voz inválida" }, 400);

      // uma apresentação por livro: substitui a anterior
      const { data: antiga } = await admin
        .from("apresentacoes_narradas").select("id")
        .eq("livro_tabela", livroTabela).eq("livro_id", livroId).maybeSingle();
      if (antiga?.id) {
        const { data: slides } = await admin.from("apresentacao_slides")
          .select("imagem_path, audio_path").eq("apresentacao_id", antiga.id);
        const paths = (slides ?? []).flatMap((s: any) => [s.imagem_path, s.audio_path]).filter(Boolean);
        if (paths.length) await admin.storage.from(BUCKET).remove(paths);
        await admin.from("apresentacoes_narradas").delete().eq("id", antiga.id);
      }

      const { data: nova, error } = await admin.from("apresentacoes_narradas").insert({
        livro_tabela: livroTabela, livro_id: livroId, titulo,
        descricao: body.descricao ? String(body.descricao) : null,
        voz, total_slides: totalSlides, status: "processando", created_by: user.id,
      }).select("id").single();
      if (error) throw new Error(error.message);
      return json({ apresentacao_id: nova.id });
    }

    if (acao === "apres-slide") {
      const apresentacaoId = String(body.apresentacao_id || "");
      const index = Number(body.slide_index);
      const imagemB64 = String(body.imagem_b64 || "");
      const textoSlide = String(body.texto || "").trim();
      if (!apresentacaoId || Number.isNaN(index) || !imagemB64) return json({ error: "parâmetros inválidos" }, 400);

      const { data: apr } = await admin.from("apresentacoes_narradas")
        .select("id, titulo, voz, total_slides, capa_url").eq("id", apresentacaoId).maybeSingle();
      if (!apr) return json({ error: "apresentação não encontrada" }, 404);
      const voz = String(apr.voz || "Charon");

      // imagem do slide
      const imgBytes = b64ToBytes(imagemB64.replace(/^data:[^,]+,/, ""));
      const imgPath = `apresentacoes/${apresentacaoId}/${String(index).padStart(3, "0")}.png`;
      const { error: imgErr } = await admin.storage.from(BUCKET)
        .upload(imgPath, imgBytes, { contentType: "image/png", upsert: true, cacheControl: "31536000" });
      if (imgErr) throw new Error(`upload imagem: ${imgErr.message}`);
      const imgUrl = await assinar(admin, imgPath);

      // roteiro do professor
      const roteiro = await gerarRoteiroSlide({
        titulo: String(apr.titulo),
        indice: index,
        total: Number(apr.total_slides || 0),
        texto: textoSlide,
      });

      // áudio
      const { wav, segundos } = await sintetizar(roteiro, voz, ESTILO_APRESENTACAO);
      const audioPath = `apresentacoes/${apresentacaoId}/${String(index).padStart(3, "0")}-${voz}.wav`;
      const { error: upErr } = await admin.storage.from(BUCKET)
        .upload(audioPath, wav, { contentType: "audio/wav", upsert: true, cacheControl: "31536000" });
      if (upErr) throw new Error(`upload áudio: ${upErr.message}`);
      const audioUrl = await assinar(admin, audioPath);

      await admin.from("apresentacao_slides").upsert({
        apresentacao_id: apresentacaoId, slide_index: index,
        imagem_path: imgPath, imagem_url: imgUrl,
        texto_extraido: textoSlide || null, roteiro,
        audio_path: audioPath, audio_url: audioUrl,
        duracao_segundos: segundos, status: "pronto", erro: null,
      }, { onConflict: "apresentacao_id,slide_index" });

      const patch: Record<string, unknown> = {};
      if (index === 0) patch.capa_url = imgUrl;
      const { count } = await admin.from("apresentacao_slides")
        .select("id", { count: "exact", head: true })
        .eq("apresentacao_id", apresentacaoId).eq("status", "pronto");
      if ((count ?? 0) >= Number(apr.total_slides || 0)) {
        patch.status = "pronto";
        patch.publicada = true;
      }
      if (Object.keys(patch).length) await admin.from("apresentacoes_narradas").update(patch).eq("id", apresentacaoId);

      await logAiCall({
        functionName: "narracao-conteudo", kind: "tts", model: MODEL,
        triggerType: "manual", inputUnits: roteiro.length, outputUnits: segundos,
        userId: user.id, refId: `apres:${apresentacaoId}:${index}`,
      });

      return json({ slide_index: index, imagem_url: imgUrl, audio_url: audioUrl, roteiro, duracao_segundos: segundos });
    }

    if (acao === "apres-listar") {
      const { data } = await admin.from("apresentacoes_narradas")
        .select("id, livro_tabela, livro_id, titulo, capa_url, voz, total_slides, status, publicada, updated_at")
        .order("updated_at", { ascending: false });
      return json({ apresentacoes: data ?? [] });
    }

    if (acao === "apres-excluir") {
      const id = String(body.apresentacao_id || "");
      if (!id) return json({ error: "apresentacao_id obrigatório" }, 400);
      const { data: slides } = await admin.from("apresentacao_slides")
        .select("imagem_path, audio_path").eq("apresentacao_id", id);
      const paths = (slides ?? []).flatMap((s: any) => [s.imagem_path, s.audio_path]).filter(Boolean);
      if (paths.length) await admin.storage.from(BUCKET).remove(paths);
      await admin.from("apresentacoes_narradas").delete().eq("id", id);
      return json({ ok: true });
    }

    if (acao === "apres-finalizar") {
      // Fecha a geração: só publica quando TODOS os slides do PDF ficaram prontos.
      const id = String(body.apresentacao_id || "");
      if (!id) return json({ error: "apresentacao_id obrigatório" }, 400);
      const { data: apr } = await admin.from("apresentacoes_narradas")
        .select("total_slides").eq("id", id).maybeSingle();
      const esperado = Number(body.total_slides || (apr as any)?.total_slides || 0);
      const { count } = await admin.from("apresentacao_slides")
        .select("id", { count: "exact", head: true })
        .eq("apresentacao_id", id).eq("status", "pronto");
      const prontos = count ?? 0;
      const completo = esperado > 0 && prontos >= esperado;
      // Nunca reduzir o total para "o que ficou pronto": o total é sempre o
      // conjunto completo de slides do PDF. Publica só quando estiver completo.
      const patch: Record<string, unknown> = {
        status: completo ? "pronto" : "parcial",
        publicada: completo,
      };
      if (esperado > 0) patch.total_slides = esperado;
      await admin.from("apresentacoes_narradas").update(patch).eq("id", id);
      return json({ ok: true, total_slides: esperado || Number((apr as any)?.total_slides || 0), prontos, publicada: completo });
    }

    if (acao === "apres-faltantes") {
      // Índices de slide que ainda não têm narração (para retomar a geração).
      const id = String(body.apresentacao_id || "");
      if (!id) return json({ error: "apresentacao_id obrigatório" }, 400);
      const { data: apr } = await admin.from("apresentacoes_narradas")
        .select("total_slides, voz").eq("id", id).maybeSingle();
      if (!apr) return json({ existe: false, total_slides: 0, prontos: 0, faltantes: [], voz: null });
      const total = Number((apr as any)?.total_slides || 0);
      const { data: slides } = await admin.from("apresentacao_slides")
        .select("slide_index, status").eq("apresentacao_id", id);
      const prontos = new Set((slides ?? []).filter((s: any) => s.status === "pronto").map((s: any) => s.slide_index));
      const faltantes: number[] = [];
      for (let i = 0; i < total; i++) if (!prontos.has(i)) faltantes.push(i);
      return json({ existe: true, total_slides: total, prontos: prontos.size, faltantes, voz: (apr as any)?.voz ?? null });
    }

    if (acao === "apres-publicar") {
      const id = String(body.apresentacao_id || "");
      const publicada = body.publicada !== false;
      if (!id) return json({ error: "apresentacao_id obrigatório" }, 400);
      await admin.from("apresentacoes_narradas").update({ publicada }).eq("id", id);
      return json({ ok: true, publicada });
    }

    return json({ error: `ação desconhecida: ${acao}` }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("narracao-conteudo erro:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

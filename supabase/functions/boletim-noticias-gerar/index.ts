// Boletim de Notícias Jurídicas — gera roteiro + narração TTS a partir das
// notícias mais relevantes do dia em `noticias_juridicas`.
//
// Fluxo:
// 1. Coleta as ~40 notícias mais recentes (últimas 24-36h) com título e link.
// 2. Gemini seleciona as N mais relevantes SÓ pelo título + rewrite persuasivo (40-60 palavras)
//    com hook, contexto e chamada à ação — pensado para engajar o ouvinte.
// 3. Gera TTS por cena.
// 4. Reaproveita `imagem_url` da notícia (quando existir) ou busca no Openverse.
// 5. Persiste em `boletins_juridicos` com tipo='noticias'.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { geminiFetch } from "../_shared/geminiFetch.ts";
import {
  buscarImagemOpenverse,
  gerarTermoBusca,
  baixarImagem,
} from "../_shared/openverse.ts";
import { notificarBoletimPronto } from "../_shared/boletimNotify.ts";
import { logAiCall } from "../_shared/ai-log.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
// gemini-flash-latest foi descontinuado no endpoint direto (generativelanguage.googleapis.com).
// Usar o alias "-latest" mantido pelo Google.
const TEXT_MODEL = "gemini-flash-lite-latest";
const BUCKET_AUDIO = "boletins-audio";
const BUCKET_IMG = "boletins-thumbnails";

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pcmToWav(pcm: Uint8Array, sampleRate = 24000): { wav: Uint8Array; durationS: number } {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length;
  const wavSize = 44 + dataSize;
  const buf = new ArrayBuffer(wavSize);
  const view = new DataView(buf);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  view.setUint32(4, wavSize - 8, true);
  w(8, "WAVE");
  w(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  w(36, "data");
  view.setUint32(40, dataSize, true);
  const bytes = new Uint8Array(buf);
  bytes.set(pcm, 44);
  return { wav: bytes, durationS: dataSize / byteRate };
}

async function gerarTTS(texto: string, voz: string, promptExtra: string) {
  const prompt = `${promptExtra}\n\nLeia em português brasileiro, exatamente o texto abaixo, sem repetir instruções:\n\n${texto}`;
  const _t0 = Date.now();
  const res = await geminiFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_modalities: ["AUDIO"],
          speech_config: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } },
        },
      }),
    },
  );
  const data = await res.json();
  if (!res.ok || data?.error) {
    await logAiCall({ functionName: "boletim-noticias-gerar", kind: "tts", model: TTS_MODEL, triggerType: "auto", inputUnits: texto.length, success: false, error: String(data?.error?.message ?? res.status).slice(0, 200), durationMs: Date.now() - _t0 });
    throw new Error(`TTS falhou: ${res.status} ${JSON.stringify(data?.error || data).slice(0, 300)}`);
  }
  await logAiCall({ functionName: "boletim-noticias-gerar", kind: "tts", model: TTS_MODEL, triggerType: "auto", inputUnits: texto.length, durationMs: Date.now() - _t0 });
  const b64 = data.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data)?.inlineData?.data;
  if (!b64) throw new Error("TTS sem áudio");
  return pcmToWav(base64ToBytes(b64));
}

type Noticia = { id: string; titulo: string; resumo: string | null; link: string; imagem_url: string | null; categoria: string | null; fonte: string };

function hojeBRT(): string {
  // Brasil não tem mais horário de verão desde 2019 → UTC-3 constante.
  // Evita o bug do ICU do Deno no edge runtime, que às vezes ignora
  // `timeZone: 'America/Sao_Paulo'` e cai pra UTC, causando data +1 dia
  // quando o cron dispara à noite (00:00 UTC = 21:00 BRT do dia anterior).
  const brt = new Date(Date.now() - 3 * 3600 * 1000);
  const y = brt.getUTCFullYear();
  const m = String(brt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(brt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function selecionarERescrever(
  noticias: Noticia[],
  n: number,
): Promise<Array<{ index: number; titulo: string; resumo: string }>> {
  const lista = noticias
    .map((x, i) => `[${i}] (${x.fonte}) ${x.titulo}${x.categoria ? ` — ${x.categoria}` : ""}`)
    .join("\n");

  const prompt = `Você é editor-chefe do "Boletim de Notícias Jurídicas" — um mini-podcast noturno que DEVE caber entre 2 e 2 minutos e 30 segundos de áudio total.
Abaixo, ${noticias.length} manchetes de hoje. Escolha as ${n} MAIS relevantes para o público jurídico brasileiro (advogados, estudantes, concurseiros).

Priorize: decisões do STF/STJ, novas leis/MPs, mudanças em códigos (CPC/CPP/CLT/CDC), OAB, concursos, temas que afetam a rotina do operador do Direito. Ignore fofocas, notas político-partidárias e conteúdo repetido.

Para cada notícia escolhida, escreva um lead em português brasileiro, MUITO ENXUTO, com 15 a 22 palavras (limite rígido — nunca ultrapasse 22), tom de podcast noturno, EXATAMENTE nesta estrutura:
- 1ª frase: FATO — o que aconteceu hoje (quem + o quê), verbo forte no início.
- 2ª frase (curtíssima): LEITURA — por que importa (efeito prático em uma linha).
- Sem CTA de link, sem "clique", sem markdown, sem repetir o nome do órgão duas vezes, sem emenda pra próxima manchete.

Retorne SOMENTE JSON válido:
{ "escolhidas": [ { "index": <numero>, "titulo": "manchete curta reescrita (máx 8 palavras)", "resumo": "lead 15-22 palavras" } ] }

MANCHETES:
${lista}`;


  const _t0 = Date.now();
  const res = await geminiFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
      }),
    },
  );
  const data = await res.json();
  if (!res.ok) {
    await logAiCall({ functionName: "boletim-noticias-gerar", kind: "text", model: TEXT_MODEL, triggerType: "auto", success: false, error: String(res.status).slice(0, 200), durationMs: Date.now() - _t0 });
    throw new Error(`Seleção falhou: ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  }
  const _u = data?.usageMetadata ?? {};
  await logAiCall({ functionName: "boletim-noticias-gerar", kind: "text", model: TEXT_MODEL, triggerType: "auto", inputUnits: _u.promptTokenCount ?? 0, outputUnits: _u.candidatesTokenCount ?? 0, durationMs: Date.now() - _t0 });
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  // Gemini às vezes anexa texto após o JSON; extrair só o primeiro objeto.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const jsonStr = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  let parsed: any = {};
  try { parsed = JSON.parse(jsonStr); } catch { parsed = {}; }

  const arr = Array.isArray(parsed?.escolhidas) ? parsed.escolhidas : [];
  return arr
    .map((x: any) => ({
      index: Number(x?.index),
      titulo: String(x?.titulo || "").trim(),
      resumo: String(x?.resumo || "").trim(),
    }))
    .filter((x: any) => Number.isInteger(x.index) && x.index >= 0 && x.index < noticias.length && x.resumo.length > 10)
    .slice(0, n);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const dataRef = (body.dataRef as string) || hojeBRT();
    const triggeredBy = (body.triggeredBy as string) || null;

    const { data: cfg } = await supa.from("boletim_config").select("*").eq("id", 1).maybeSingle();
    const voz = cfg?.noticias_voz_id || cfg?.voz_id || "Kore";
    const promptExtra = cfg?.noticias_prompt_tts_extra ||
      "Locutor de telejornal jurídico. Tom persuasivo e envolvente, ritmo dinâmico de rádio, ênfase em verbos fortes e nomes próprios.";
    const n = Math.max(3, Math.min(15, cfg?.noticias_max_itens || 8));

    // Notícias das últimas 36h
    const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
    const { data: noticiasRaw, error: nErr } = await supa
      .from("noticias_juridicas")
      .select("id,titulo,resumo,link,imagem_url,categoria,fonte,data_publicacao")
      .gte("data_publicacao", since)
      .not("titulo", "is", null)
      .order("data_publicacao", { ascending: false })
      .limit(60);
    if (nErr) throw nErr;

    const noticias: Noticia[] = (noticiasRaw || []).filter((x: any) => x.titulo && x.titulo.length > 10);
    if (noticias.length < 3) {
      return new Response(JSON.stringify({ error: "Poucas notícias disponíveis nas últimas 36h" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const escolhidas = await selecionarERescrever(noticias, n);
    if (escolhidas.length === 0) throw new Error("Gemini não escolheu notícias");

    // Criar registro
    const dataFmt = new Date(dataRef + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
    const titulo = `Boletim de Notícias — ${dataFmt}`;
    const { data: boletim, error: insErr } = await supa
      .from("boletins_juridicos")
      .insert({
        data_ref: dataRef,
        tipo: "noticias",
        titulo,
        subtitulo: `${escolhidas.length} manchetes do dia`,
        status: "gerando",
        gerado_por: triggeredBy,
        roteiro_json: [],
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    const boletimId = boletim.id as string;

    // Cenas
    const scenes: any[] = [];
    const dataFala = new Date(dataRef + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
    scenes.push({
      kind: "intro",
      tipo: "noticia",
      titulo: "Boletim de Notícias",
      texto: `Boa noite. As ${escolhidas.length} manchetes jurídicas de ${dataFala}. Bora.`,
    });
    for (const e of escolhidas) {
      const src = noticias[e.index];
      scenes.push({
        kind: "norma", // reutiliza layout do player
        tipo: "noticia",
        titulo: e.titulo || src.titulo,
        texto: e.resumo,
        url_fonte: src.link,
        _noticia_imagem: src.imagem_url,
        fonte: src.fonte,
      });
    }
    scenes.push({
      kind: "outro",
      tipo: "noticia",
      titulo: "Boa noite!",
      texto: "É isso. Boa noite.",
    });

    const CORES_NOTICIA = "#DC2626"; // vermelho jornalístico

    // Áudio + imagens (paralelo para evitar timeout do edge runtime)
    await Promise.all(scenes.map(async (s, i) => {
      const { wav, durationS } = await gerarTTS(s.texto, voz, promptExtra);
      const path = `${boletimId}/${String(i).padStart(2, "0")}-${s.kind}.wav`;
      const up = await supa.storage.from(BUCKET_AUDIO).upload(path, wav, { contentType: "audio/wav", upsert: true, cacheControl: "31536000, immutable" });
      if (up.error) throw up.error;
      const { data: signed } = await supa.storage.from(BUCKET_AUDIO).createSignedUrl(path, 60 * 60 * 24 * 30);
      s.audio_url = signed?.signedUrl || "";
      s.audio_path = path;
      s.duracao_s = Math.max(2, Math.round(durationS * 10) / 10);
      s.cor_hex = CORES_NOTICIA;
      s.tipo_label = "Notícia";

      // Imagem
      let imagemUrl: string | null = null;
      let imagemFonte: "noticia" | "openverse" | "padrao" = "padrao";
      let imagemCredito: any = null;
      if (s._noticia_imagem) {
        imagemUrl = s._noticia_imagem;
        imagemFonte = "noticia";
      } else {
        try {
          let termo: { ptBR: string; en: string };
          if (s.kind === "norma") {
            termo = await gerarTermoBusca(s.titulo || "", s.texto || "");
          } else if (s.kind === "intro") {
            termo = { ptBR: "jornal notícias manchete", en: "newspaper headlines morning news" };
          } else {
            termo = { ptBR: "café da manhã leitura jornal", en: "morning coffee newspaper reading" };
          }
          const hit = await buscarImagemOpenverse(termo);
          if (hit) {
            const dl = await baixarImagem(hit.url);
            if (dl) {
              const ext = (dl.contentType.split("/")[1] || "jpg").split(";")[0].replace("jpeg", "jpg");
              const imgPath = `${boletimId}/${String(i).padStart(2, "0")}-slide.${ext}`;
              const upImg = await supa.storage.from(BUCKET_IMG).upload(imgPath, dl.bytes, { contentType: dl.contentType, upsert: true });
              if (!upImg.error) {
                const { data: sImg } = await supa.storage.from(BUCKET_IMG).createSignedUrl(imgPath, 60 * 60 * 24 * 30);
                if (sImg?.signedUrl) {
                  imagemUrl = sImg.signedUrl;
                  imagemFonte = "openverse";
                  imagemCredito = { autor: hit.creator, licenca: hit.license, fonte_url: hit.foreign_landing_url, titulo: hit.title };
                }
              }
            }
          }
        } catch (e) {
          console.warn(`[boletim-noticias] cena ${i} — imagem falhou:`, e);
        }
      }
      s.imagem_url = imagemUrl;
      s.imagem_fonte = imagemFonte;
      s.imagem_credito = imagemCredito;
      delete s._noticia_imagem;
    }));

    const audioUrls: string[] = scenes.map((s: any) => s.audio_url);


    const duracaoTotal = scenes.reduce((acc, s) => acc + (s.duracao_s || 0), 0);
    await supa.from("boletins_juridicos").update({
      status: "pronto",
      roteiro_json: scenes,
      audio_urls: audioUrls,
      duracao_s: Math.round(duracaoTotal),
    }).eq("id", boletimId);

    if (cfg?.enviar_push !== false) {
      await notificarBoletimPronto({
        supa,
        boletimId,
        tipo: "noticias",
        titulo,
        totalCenas: escolhidas.length,
        duracaoS: duracaoTotal,
        automationKey: "boletim_noticias_diario",
        pushEmoji: "📰",
        labelUnidade: escolhidas.length === 1 ? "manchete" : "manchetes",
      });
    }

    return new Response(
      JSON.stringify({ boletim_id: boletimId, duracao_s: Math.round(duracaoTotal), cenas: scenes.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("boletim-noticias-gerar erro:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

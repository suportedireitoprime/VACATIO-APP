// Boletim Jurídico Diário — gera roteiro + narração TTS para o vídeo do dia.
//
// Fluxo (Fase 1 — MVP):
// 1. Coleta últimas normas da `resenha_diaria` com texto/ementa reais.
// 2. Usa Gemini Flash para produzir, em JSON, título curto + resumo narrado de ~15s por norma.
// 3. Classifica o tipo da norma e busca imagem fixa em `boletim_tipo_imagens`.
// 4. Gera narração TTS (Gemini TTS multi-vozes) para cada cena e salva WAV em Storage.
// 5. Persiste o boletim em `boletins_juridicos` com `roteiro_json` completo.
//
// A renderização em MP4 via Remotion + GitHub Actions é feita numa fase posterior,
// consumindo o mesmo `roteiro_json`. Enquanto isso, o app reproduz as cenas com
// animação nativa React sincronizada com os áudios.

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
// gemini-flash-latest foi descontinuado no endpoint direto; usar alias -latest.
const TEXT_MODEL = "gemini-flash-lite-latest";
const BUCKET_AUDIO = "boletins-audio";
const BUCKET_IMG = "boletins-thumbnails";

const TIPO_KEYS = [
  "lei",
  "decreto",
  "medida_provisoria",
  "portaria",
  "resolucao",
  "instrucao_normativa",
  "generico",
] as const;
type TipoKey = (typeof TIPO_KEYS)[number];

function classifyTipo(raw: string): TipoKey {
  const s = (raw || "").toLowerCase();
  if (s.includes("medida provis")) return "medida_provisoria";
  if (s.includes("instru")) return "instrucao_normativa";
  if (s.includes("resolu")) return "resolucao";
  if (s.includes("portaria")) return "portaria";
  if (s.includes("decreto")) return "decreto";
  if (s.startsWith("lei") || s.includes(" lei ")) return "lei";
  return "generico";
}

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
  const durationS = dataSize / byteRate;
  return { wav: bytes, durationS };
}

async function gerarTTS(
  texto: string,
  voz: string,
  promptExtra: string,
): Promise<{ wav: Uint8Array; durationS: number }> {
  const prompt =
    `${promptExtra}\n\nLeia em português brasileiro, exatamente o texto abaixo, sem repetir instruções:\n\n${texto}`;
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
          speech_config: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } },
          },
        },
      }),
    },
  );
  const data = await res.json();
  if (!res.ok || data?.error) {
    await logAiCall({ functionName: "boletim-juridico-gerar", kind: "tts", model: TTS_MODEL, triggerType: "auto", inputUnits: texto.length, success: false, error: String(data?.error?.message ?? res.status).slice(0, 200), durationMs: Date.now() - _t0 });
    throw new Error(`TTS falhou: ${res.status} ${JSON.stringify(data?.error || data).slice(0, 300)}`);
  }
  await logAiCall({ functionName: "boletim-juridico-gerar", kind: "tts", model: TTS_MODEL, triggerType: "auto", inputUnits: texto.length, durationMs: Date.now() - _t0 });
  const audioPart = data.candidates?.[0]?.content?.parts?.find(
    (p: any) => p?.inlineData?.data,
  );
  const b64 = audioPart?.inlineData?.data;
  if (!b64) throw new Error("TTS sem áudio na resposta");
  const pcm = base64ToBytes(b64);
  return pcmToWav(pcm);
}

async function gerarRoteirosGemini(
  normas: Array<{ tipo_ato: string; numero_ato: string; ementa: string | null; texto_completo: string | null }>,
): Promise<Array<{ tipo: TipoKey; titulo: string; resumo: string }>> {
  const lista = normas
    .map((n, i) => {
      const src = (n.texto_completo || n.ementa || "").slice(0, 1500);
      return `[${i + 1}] TIPO: ${n.tipo_ato}\nNÚMERO: ${n.numero_ato}\nCONTEÚDO: ${src}`;
    })
    .join("\n\n---\n\n");

  const prompt = `Você é redator do "Boletim Jurídico Diário" — um mini-podcast em vídeo com narração feminina.
Para cada norma abaixo, produza:
- "tipo": um dos valores: lei | decreto | medida_provisoria | portaria | resolucao | instrucao_normativa | generico
- "titulo": título curto e forte (máx. 8 palavras), começando pelo nome oficial da norma (ex.: "Lei nº 15.469 — Cria o Fundo X")
- "resumo": narração pronta em português brasileiro, com 40-70 palavras, tom jornalístico e entusiasmado, explicando ao ouvinte o que a norma faz e por que importa. NÃO cite artigos por número. NÃO use markdown. NÃO abrevie. Termine numa frase de impacto.

Retorne SOMENTE JSON válido no formato:
{ "normas": [ { "tipo": "...", "titulo": "...", "resumo": "..." } ] }

NORMAS:
${lista}`;

  const _t0 = Date.now();
  const res = await geminiFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
      }),
    },
  );
  const data = await res.json();
  if (!res.ok) {
    await logAiCall({ functionName: "boletim-juridico-gerar", kind: "text", model: TEXT_MODEL, triggerType: "auto", success: false, error: String(res.status).slice(0, 200), durationMs: Date.now() - _t0 });
    throw new Error(`Roteiro falhou: ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  }
  const _u = data?.usageMetadata ?? {};
  await logAiCall({ functionName: "boletim-juridico-gerar", kind: "text", model: TEXT_MODEL, triggerType: "auto", inputUnits: _u.promptTokenCount ?? 0, outputUnits: _u.candidatesTokenCount ?? 0, durationMs: Date.now() - _t0 });
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const parsed = JSON.parse(raw);
  const arr = Array.isArray(parsed?.normas) ? parsed.normas : [];
  return arr.map((x: any) => ({
    tipo: TIPO_KEYS.includes(x?.tipo) ? (x.tipo as TipoKey) : "generico",
    titulo: String(x?.titulo || "").trim(),
    resumo: String(x?.resumo || "").trim(),
  }));
}

function hojeBRT(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supa = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const dataRef = (body.dataRef as string) || hojeBRT();
    const triggeredBy = (body.triggeredBy as string) || null;

    // Config
    const { data: cfg } = await supa
      .from("boletim_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    const voz = cfg?.voz_id || "Sulafat";
    const promptExtra =
      cfg?.prompt_tts_extra ||
      "Narração jornalística com entusiasmo, ritmo dinâmico e voz clara.";
    const maxNormas = Math.max(1, Math.min(10, cfg?.max_normas || 6));

    // Imagens por tipo
    const { data: imgs } = await supa
      .from("boletim_tipo_imagens")
      .select("tipo,imagem_url,cor_hex,nome")
      .eq("ativo", true);
    const imgMap = new Map<string, { url: string; cor: string; nome: string }>();
    for (const i of imgs || []) {
      imgMap.set(i.tipo, { url: i.imagem_url, cor: i.cor_hex || "#3B82F6", nome: i.nome });
    }
    const getImg = (t: TipoKey) => imgMap.get(t) || imgMap.get("generico")!;

    // Normas: apenas as publicadas na data de referência do boletim.
    // Regra: se não houver leis novas nesse dia, o boletim NÃO é gerado.
    const { data: normas, error: normasErr } = await supa
      .from("resenha_diaria")
      .select("tipo_ato,numero_ato,ementa,texto_completo,url,data_publicacao")
      .eq("data_publicacao", dataRef)
      .not("ementa", "is", null)
      .neq("ementa", "")
      .order("created_at", { ascending: false })
      .limit(maxNormas * 3);
    if (normasErr) throw normasErr;

    // Filtra ruído (títulos genéricos como "Projetos de Lei do Congresso Nacional")
    const filtradas = (normas || [])
      .filter((n: any) => {
        const t = (n.tipo_ato || "").toLowerCase();
        const num = (n.numero_ato || "").toLowerCase();
        if (t.includes("projeto")) return false;
        if (!/\d/.test(num)) return false; // exige algum número no identificador
        return true;
      })
      .slice(0, maxNormas);

    if (filtradas.length === 0) {
      // Registra um "boletim vazio" do dia para que a timeline mostre o dia
      // com um marcador apagado ("sem leis publicadas"), em vez de sumir.
      const tituloVazio = `Boletim Jurídico — ${new Date(dataRef + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}`;
      const { data: existente } = await supa
        .from("boletins_juridicos")
        .select("id")
        .eq("data_ref", dataRef)
        .eq("tipo", "juridico")
        .maybeSingle();
      if (!existente) {
        await supa.from("boletins_juridicos").insert({
          data_ref: dataRef,
          tipo: "juridico",
          titulo: tituloVazio,
          subtitulo: "Nenhuma lei nova publicada neste dia",
          status: "sem_leis",
          roteiro_json: [],
        });
      }
      return new Response(
        JSON.stringify({
          skipped: true,
          reason: "sem_leis_novas",
          dataRef,
          message: `Nenhuma lei nova publicada em ${dataRef}. Registrado como dia sem leis.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Cria registro do boletim (status: gerando)
    const titulo = `Boletim Jurídico — ${new Date(dataRef + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}`;
    const { data: boletim, error: insErr } = await supa
      .from("boletins_juridicos")
      .insert({
        data_ref: dataRef,
        titulo,
        subtitulo: `${filtradas.length} ${filtradas.length === 1 ? "norma comentada" : "normas comentadas"}`,
        status: "gerando",
        gerado_por: triggeredBy,
        roteiro_json: [],
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    const boletimId = boletim.id as string;

    // Gera roteiros via Gemini
    const roteiros = await gerarRoteirosGemini(filtradas);
    // Se Gemini retornou menos itens que o esperado, complementa com fallback simples
    const scenes: any[] = [];

    // Intro
    const intro = `Bom dia! Aqui é o Boletim Jurídico do dia ${new Date(dataRef + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}. Separamos ${filtradas.length} ${filtradas.length === 1 ? "norma quente" : "normas quentes"} pra você começar o dia por dentro do que mudou. Bora?`;
    scenes.push({ kind: "intro", tipo: "generico", titulo: "Boletim Jurídico", texto: intro });

    // Normas
    for (let i = 0; i < filtradas.length; i++) {
      const src = filtradas[i];
      const g = roteiros[i];
      const tipo = g?.tipo || classifyTipo(src.tipo_ato);
      const titulo = g?.titulo || `${src.tipo_ato} — ${src.numero_ato}`;
      const resumo =
        g?.resumo ||
        (src.ementa || `${src.tipo_ato} ${src.numero_ato}`).slice(0, 400);
      scenes.push({ kind: "norma", tipo, titulo, texto: resumo, url_fonte: src.url });
    }

    // Outro
    scenes.push({
      kind: "outro",
      tipo: "generico",
      titulo: "Bom dia!",
      texto:
        "Foi isso por hoje. Compartilhe o boletim com um colega, tenha um ótimo dia e nos vemos amanhã com mais direito quentinho. Vacatio, com você todo dia.",
    });

    // Gera TTS cena por cena e faz upload
    const audioUrls: string[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      const { wav, durationS } = await gerarTTS(s.texto, voz, promptExtra);
      const path = `${boletimId}/${String(i).padStart(2, "0")}-${s.kind}.wav`;
      const up = await supa.storage.from(BUCKET_AUDIO).upload(path, wav, {
        contentType: "audio/wav",
        upsert: true,
        cacheControl: "31536000, immutable",
      });
      if (up.error) throw up.error;
      const { data: signed } = await supa.storage
        .from(BUCKET_AUDIO)
        .createSignedUrl(path, 60 * 60 * 24 * 30); // 30d
      const url = signed?.signedUrl || "";
      const imgPadrao = getImg(s.tipo as TipoKey);
      s.audio_url = url;
      s.audio_path = path;
      s.duracao_s = Math.max(2, Math.round(durationS * 10) / 10);
      s.cor_hex = imgPadrao.cor;
      s.tipo_label = imgPadrao.nome;

      // Imagem: todas as cenas buscam no Openverse. Intro/outro usam um tema geral (Direito/Justiça).
      let imagemUrl = imgPadrao.url;
      let imagemFonte: "openverse" | "tipo_padrao" = "tipo_padrao";
      let imagemCredito: any = null;
      try {
        let termo: { ptBR: string; en: string };
        if (s.kind === "norma") {
          termo = await gerarTermoBusca(s.titulo || "", s.texto || "");
        } else if (s.kind === "intro") {
          termo = { ptBR: "livro direito justiça", en: "law book gavel justice" };
        } else {
          termo = { ptBR: "biblioteca jurídica leitura", en: "law library reading study" };
        }
        const hit = await buscarImagemOpenverse(termo);
        if (hit) {
          const dl = await baixarImagem(hit.url);
          if (dl) {
            const ext = (dl.contentType.split("/")[1] || "jpg").split(";")[0].replace("jpeg", "jpg");
            const imgPath = `${boletimId}/${String(i).padStart(2, "0")}-slide.${ext}`;
            const upImg = await supa.storage.from(BUCKET_IMG).upload(imgPath, dl.bytes, {
              contentType: dl.contentType,
              upsert: true,
            });
            if (!upImg.error) {
              const { data: signedImg } = await supa.storage
                .from(BUCKET_IMG)
                .createSignedUrl(imgPath, 60 * 60 * 24 * 30);
              if (signedImg?.signedUrl) {
                imagemUrl = signedImg.signedUrl;
                imagemFonte = "openverse";
                imagemCredito = {
                  autor: hit.creator,
                  autor_url: hit.creator_url,
                  licenca: hit.license,
                  licenca_url: hit.license_url,
                  fonte_url: hit.foreign_landing_url,
                  titulo: hit.title,
                  termo_busca: termo,
                };
              }
            }
          }
        }
      } catch (e) {
        console.warn(`[boletim] cena ${i} — busca Openverse falhou:`, e);
      }
      s.imagem_url = imagemUrl;
      s.imagem_fonte = imagemFonte;
      s.imagem_credito = imagemCredito;
      audioUrls.push(url);
    }

    const duracaoTotal = scenes.reduce((acc, s) => acc + (s.duracao_s || 0), 0);

    await supa
      .from("boletins_juridicos")
      .update({
        status: "pronto",
        roteiro_json: scenes,
        audio_urls: audioUrls,
        duracao_s: Math.round(duracaoTotal),
      })
      .eq("id", boletimId);

    // Push (best-effort)
    if (cfg?.enviar_push !== false) {
      await notificarBoletimPronto({
        supa,
        boletimId,
        tipo: "juridico",
        titulo,
        totalCenas: filtradas.length,
        duracaoS: duracaoTotal,
        automationKey: "boletim_juridico_diario",
        pushEmoji: "🎬",
        labelUnidade: filtradas.length === 1 ? "norma comentada" : "normas comentadas",
      });
    }

    return new Response(
      JSON.stringify({ boletim_id: boletimId, duracao_s: Math.round(duracaoTotal), cenas: scenes.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("boletim-juridico-gerar erro:", e);
    return new Response(
      JSON.stringify({ error: String((e as Error).message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
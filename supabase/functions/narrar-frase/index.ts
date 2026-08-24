// Edge function: narra frases curtas do overlay (filósofos, curiosidades, termos)
// e faz cache em Storage para reproduzir sem recomputar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { geminiFetch } from "../_shared/geminiFetch.ts";
import { logAiCall, detectTrigger } from "../_shared/ai-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const MODEL = "gemini-2.5-flash-preview-tts";
const BUCKET = "narracoes-frases";

// Vozes Gemini TTS conhecidas
export const VOZES_DISPONIVEIS = [
  // Femininas
  { id: "Sulafat", genero: "F", descricao: "Feminina, calorosa" },
  { id: "Kore", genero: "F", descricao: "Feminina, firme" },
  { id: "Aoede", genero: "F", descricao: "Feminina, leve" },
  { id: "Leda", genero: "F", descricao: "Feminina, jovem" },
  { id: "Zephyr", genero: "F", descricao: "Feminina, brilhante" },
  { id: "Autonoe", genero: "F", descricao: "Feminina, animada" },
  { id: "Callirrhoe", genero: "F", descricao: "Feminina, tranquila" },
  { id: "Despina", genero: "F", descricao: "Feminina, suave" },
  { id: "Erinome", genero: "F", descricao: "Feminina, clara" },
  { id: "Laomedeia", genero: "F", descricao: "Feminina, alegre" },
  // Masculinas
  { id: "Puck", genero: "M", descricao: "Masculina, animada" },
  { id: "Charon", genero: "M", descricao: "Masculina, grave" },
  { id: "Fenrir", genero: "M", descricao: "Masculina, energética" },
  { id: "Orus", genero: "M", descricao: "Masculina, firme" },
  { id: "Enceladus", genero: "M", descricao: "Masculina, calma" },
  { id: "Iapetus", genero: "M", descricao: "Masculina, séria" },
  { id: "Umbriel", genero: "M", descricao: "Masculina, tranquila" },
  { id: "Algieba", genero: "M", descricao: "Masculina, suave" },
  { id: "Algenib", genero: "M", descricao: "Masculina, entusiasta" },
  { id: "Rasalgethi", genero: "M", descricao: "Masculina, informativa" },
];

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
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
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
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

async function gerarAudioGemini(texto: string, voz: string, apiKey: string): Promise<Uint8Array> {
  const prompt =
    `Diga em português brasileiro com tom animado, contagiante e envolvente, ` +
    `como quem compartilha algo fascinante sobre Direito com um amigo curioso. ` +
    `Ritmo natural, energia positiva, sem soar robótico:\n\n${texto}`;

  const res = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
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
  if (data?.error) throw new Error(`Gemini erro: ${JSON.stringify(data.error).slice(0, 300)}`);
  const audioPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data);
  const b64 = audioPart?.inlineData?.data;
  if (!b64) throw new Error("Sem áudio na resposta");
  const pcm = base64ToBytes(b64);
  return pcmToWav(pcm);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    // Endpoint auxiliar para listar vozes
    if (url.pathname.endsWith("/vozes") || url.searchParams.get("acao") === "vozes") {
      return new Response(JSON.stringify({ vozes: VOZES_DISPONIVEIS }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const texto: string = (body.texto || "").toString().trim();
    const voz: string = (body.voz || "Puck").toString();
    const preview: boolean = Boolean(body.preview);

    if (!texto || texto.length < 3) {
      return new Response(JSON.stringify({ error: "texto obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (texto.length > 1200) {
      return new Response(JSON.stringify({ error: "texto muito longo (max 1200)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!VOZES_DISPONIVEIS.some((v) => v.id === voz)) {
      return new Response(JSON.stringify({ error: "voz inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const chave = `${voz}-${hashString(texto)}${preview ? "-preview" : ""}`;
    const filePath = `${voz}/${chave}.wav`;

    // Preview NÃO usa cache (para o admin testar variações fresh)
    if (!preview) {
      const { data: signedExist } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath, 60 * 60 * 24 * 30);
      if (signedExist?.signedUrl) {
        // Verifica se o arquivo realmente existe
        const head = await fetch(signedExist.signedUrl, { method: "HEAD" });
        if (head.ok) {
          return new Response(JSON.stringify({ audio_url: signedExist.signedUrl, cached: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY ausente");

    const _t0 = Date.now();
    let wav: Uint8Array;
    try {
      wav = await gerarAudioGemini(texto, voz, apiKey);
      await logAiCall({ functionName: "narrar-frase", kind: "tts", model: MODEL, triggerType: detectTrigger(body, req), inputUnits: texto.length, durationMs: Date.now() - _t0 });
    } catch (err) {
      await logAiCall({ functionName: "narrar-frase", kind: "tts", model: MODEL, triggerType: detectTrigger(body, req), inputUnits: texto.length, success: false, error: (err as Error).message?.slice(0, 200), durationMs: Date.now() - _t0 });
      throw err;
    }

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, wav, { contentType: "audio/wav", upsert: true, cacheControl: "31536000, immutable" });
    if (upErr) throw new Error(`upload: ${upErr.message}`);

    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 60 * 60 * 24 * 30);
    if (signErr || !signed?.signedUrl) throw new Error("Falha ao gerar signed URL");

    return new Response(JSON.stringify({ audio_url: signed.signedUrl, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("narrar-frase erro:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

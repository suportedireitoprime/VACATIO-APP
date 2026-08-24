// Edge function: gera narração completa de um artigo do blog.
// { post_id, voz?, estilo? } → sintetiza em chunks, concatena WAVs,
// faz upload no bucket 'blog-narracoes' e atualiza blog_edicao_posts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { geminiFetch } from "../_shared/geminiFetch.ts";
import { logAiCall } from "../_shared/ai-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const MODEL = "gemini-2.5-flash-preview-tts";
const BUCKET = "blog-narracoes";
const SAMPLE_RATE = 24000;

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

function pcmToWav(pcm: Uint8Array, sampleRate = SAMPLE_RATE): Uint8Array {
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

// Divide o texto em chunks (~1200 chars) respeitando pontuação
function chunkText(text: string, max = 1200): string[] {
  const clean = text.replace(/\r/g, "");
  const sentences = clean.match(/[^.!?\n]+[.!?\n]?/g) ?? [clean];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      chunks.push(cur.trim());
      cur = "";
    }
    cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function ttsChunk(texto: string, voz: string, estilo: string, apiKey: string): Promise<Uint8Array> {
  const prompt = `${estilo}:\n\n${texto}`;
  const res = await geminiFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
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
  if (data?.error) throw new Error(`Gemini: ${JSON.stringify(data.error).slice(0, 300)}`);
  const b64 = data.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data)?.inlineData?.data;
  if (!b64) throw new Error("Sem áudio na resposta");
  return b64ToBytes(b64);
}

async function runNarracao(
  body: any,
  onProgress?: (done: number, total: number) => void,
) {
  const post_id: string = (body.post_id || "").toString();
  if (!post_id) throw new Error("post_id obrigatório");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: post, error: pErr } = await supabase
    .from("blog_edicao_posts")
    .select("id,titulo,resumo,conteudo_md")
    .eq("id", post_id)
    .single();
  if (pErr || !post) throw new Error("post não encontrado");

  const { data: cfg } = await supabase
    .from("blog_edicao_config")
    .select("narracao_voz, narracao_modelo, narracao_estilo")
    .limit(1)
    .single();

  const voz: string = (body.voz || cfg?.narracao_voz || "Puck").toString();
  const estilo: string = (body.estilo || cfg?.narracao_estilo ||
    "Diga em português brasileiro com entusiasmo curioso e informativo, como quem revela uma curiosidade jurídica fascinante"
  ).toString();

  const texto = stripMarkdown(
    `${post.titulo}.\n\n${post.resumo || ""}\n\n${post.conteudo_md || ""}`,
  );

  const chunks = chunkText(texto, 1400);
  if (chunks.length === 0) throw new Error("Texto vazio");

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY ausente");

  onProgress?.(0, chunks.length);

  const parts: Uint8Array[] = [];
  let totalBytes = 0;
  for (let i = 0; i < chunks.length; i++) {
    const pcm = await ttsChunk(chunks[i], voz, estilo, apiKey);
    parts.push(pcm);
    totalBytes += pcm.length;
    onProgress?.(i + 1, chunks.length);
  }
  const merged = new Uint8Array(totalBytes);
  { let off = 0; for (const p of parts) { merged.set(p, off); off += p.length; } }
  const wav = pcmToWav(merged);

  const durationSec = Math.round(merged.length / 2 / SAMPLE_RATE);
  const filePath = `${post.id}/${voz}-${Date.now()}.wav`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, wav, { contentType: "audio/wav", upsert: true, cacheControl: "31536000, immutable" });
  if (upErr) throw new Error(`upload: ${upErr.message}`);

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365);

  const custoCred = Number(((texto.length / 1000) * 0.5).toFixed(4));

  await supabase.from("blog_edicao_posts").update({
    audio_url: signed?.signedUrl || null,
    audio_duration_seconds: durationSec,
    audio_voice: voz,
    audio_model: MODEL,
    audio_cost_credits: custoCred,
    audio_generated_at: new Date().toISOString(),
  }).eq("id", post.id);

  await logAiCall({
    functionName: "blog-narrar-artigo",
    kind: "tts",
    model: MODEL,
    triggerType: body?.manual === true ? "manual" : "auto",
    inputUnits: texto.length,
    outputUnits: durationSec,
    refId: post.id,
  });

  return {
    audio_url: signed?.signedUrl,
    duration_seconds: durationSec,
    cost_credits: custoCred,
    chunks: chunks.length,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const wantsStream =
    url.searchParams.get("stream") === "1" ||
    (req.headers.get("accept") || "").includes("text/event-stream");

  const body = await req.json().catch(() => ({}));

  if (!wantsStream) {
    try {
      const result = await runNarracao(body);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("blog-narrar-artigo erro:", msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, payload: Record<string, unknown> = {}) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`));
      };
      // heartbeat para manter conexão viva enquanto Gemini processa
      const hb = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: ping\n\n`)); } catch { /* ignore */ }
      }, 10000);
      try {
        const result = await runNarracao(body, (done, total) =>
          send("progress", { done, total }));
        send("done", { result });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("blog-narrar-artigo stream erro:", msg);
        send("error", { error: msg });
      } finally {
        clearInterval(hb);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
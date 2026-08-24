// Edge function: preview de voz para narração de blog.
// Recebe { texto, voz, estilo } e retorna WAV (sem cache) para o admin escolher a voz.
import { geminiFetch } from "../_shared/geminiFetch.ts";
import { handleNarracaoConteudo } from "../_shared/narracaoConteudo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const MODEL = "gemini-2.5-flash-preview-tts";

export const VOZES_BLOG = [
  { id: "Sulafat", genero: "F", descricao: "Feminina · calorosa" },
  { id: "Kore", genero: "F", descricao: "Feminina · firme" },
  { id: "Aoede", genero: "F", descricao: "Feminina · leve" },
  { id: "Leda", genero: "F", descricao: "Feminina · jovem" },
  { id: "Zephyr", genero: "F", descricao: "Feminina · brilhante" },
  { id: "Autonoe", genero: "F", descricao: "Feminina · animada" },
  { id: "Callirrhoe", genero: "F", descricao: "Feminina · tranquila" },
  { id: "Despina", genero: "F", descricao: "Feminina · suave" },
  { id: "Erinome", genero: "F", descricao: "Feminina · clara" },
  { id: "Laomedeia", genero: "F", descricao: "Feminina · alegre" },
  { id: "Puck", genero: "M", descricao: "Masculina · animada" },
  { id: "Charon", genero: "M", descricao: "Masculina · grave" },
  { id: "Fenrir", genero: "M", descricao: "Masculina · energética" },
  { id: "Orus", genero: "M", descricao: "Masculina · firme" },
  { id: "Enceladus", genero: "M", descricao: "Masculina · calma" },
  { id: "Iapetus", genero: "M", descricao: "Masculina · séria" },
  { id: "Umbriel", genero: "M", descricao: "Masculina · tranquila" },
  { id: "Algieba", genero: "M", descricao: "Masculina · suave" },
  { id: "Algenib", genero: "M", descricao: "Masculina · entusiasta" },
  { id: "Rasalgethi", genero: "M", descricao: "Masculina · informativa" },
];

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pcmToWav(pcm: Uint8Array, sampleRate = 24000): Uint8Array {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    if (url.searchParams.get("acao") === "vozes") {
      return new Response(JSON.stringify({ vozes: VOZES_BLOG }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    // Narração de Conteúdo (admin): livros da Leitura Nativa e prévias salvas.
    if (body && typeof body.acao === "string" && body.acao) {
      return await handleNarracaoConteudo(req, body);
    }
    const texto: string = (body.texto || "").toString().trim();
    const voz: string = (body.voz || "Puck").toString();
    const estilo: string = (body.estilo || "Diga em português brasileiro com entusiasmo curioso e informativo, como quem revela uma curiosidade jurídica fascinante").toString();

    if (!texto || texto.length < 3) {
      return new Response(JSON.stringify({ error: "texto obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (texto.length > 1500) {
      return new Response(JSON.stringify({ error: "amostra muito longa (max 1500)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!VOZES_BLOG.some((v) => v.id === voz)) {
      return new Response(JSON.stringify({ error: "voz inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY ausente");

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
    const wav = pcmToWav(b64ToBytes(b64));

    // Retorna como data URL base64 para consumo simples no cliente.
    // Codifica em chunks para evitar "Maximum call stack size exceeded"
    // ao espalhar arrays grandes em String.fromCharCode(...).
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < wav.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, wav.subarray(i, i + CHUNK) as unknown as number[]);
    }
    const audioB64 = btoa(bin);
    return new Response(
      JSON.stringify({ audio_data_url: `data:audio/wav;base64,${audioB64}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("blog-narrar-preview erro:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
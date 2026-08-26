// Edge function: generate TTS narration per scene for admin triagem preview.
// Uses Lovable AI Gateway with Gemini TTS (google/gemini-2.5-flash-tts).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

type SceneIn = { id: string; text: string };
type Body = { voice?: string; scenes: SceneIn[]; model?: string };

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

async function speakOne(text: string, voice: string, model: string): Promise<string> {
  const prompt = `Fale em português brasileiro, com tom acolhedor, ritmo natural e sem pressa: ${text}`;
  const modelName = model.replace('google/', '').replace('-tts', '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Response(
      JSON.stringify({ error: `TTS ${res.status}`, detail: err }),
      { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const j = await res.json();
  const inlineData = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inlineData || !inlineData.data) {
    throw new Error('TTS failed: no audio returned from Gemini');
  }
  return inlineData.data; // Base64 audio

}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const body = (await req.json()) as Body;
    const voice = (body.voice || 'Kore').toString();
    const model = (body.model || 'gemini-2.5-flash').toString();
    const scenes = Array.isArray(body.scenes) ? body.scenes.slice(0, 30) : [];
    if (!scenes.length) {
      return new Response(JSON.stringify({ error: 'no scenes' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const out: { id: string; audioBase64: string; mime: string }[] = [];
    for (const s of scenes) {
      const text = (s.text || '').trim();
      if (!text) continue;
      try {
        const audioBase64 = await speakOne(text, voice, model);
        out.push({ id: s.id, audioBase64, mime: 'audio/wav' });
      } catch (e) {
        if (e instanceof Response) return e;
        throw e;
      }
    }
    return new Response(JSON.stringify({ scenes: out }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message || 'internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

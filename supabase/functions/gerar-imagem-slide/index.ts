import { logAiCall, detectTrigger } from "../_shared/ai-log.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const { prompt } = body;
  try {
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fullPrompt = `${prompt}. The image should be suitable as a background for an Instagram carousel slide with text overlay. Dark wine/burgundy tones, elegant legal theme, 4:5 aspect ratio. No text in the image.`;

    const _t0 = Date.now();
    const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict', {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey || "",
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt: fullPrompt }],
        parameters: { sampleCount: 1, aspectRatio: "3:4" },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('AI Gateway error:', resp.status, errText);
      await logAiCall({ functionName: 'gerar-imagem-slide', kind: 'image', model: 'imagen-3', triggerType: detectTrigger(body, req), success: false, error: errText.slice(0, 200), durationMs: Date.now() - _t0 });
      return new Response(JSON.stringify({ error: 'Image generation failed', detail: errText }), {
        status: resp.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    await logAiCall({ functionName: 'gerar-imagem-slide', kind: 'image', model: 'imagen-3', triggerType: detectTrigger(body, req), outputUnits: 1, durationMs: Date.now() - _t0 });

    const data = await resp.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    const imageUrl = b64 ? `data:image/jpeg;base64,${b64}` : null;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'No image generated', text: JSON.stringify(data) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

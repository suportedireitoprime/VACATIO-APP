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

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fullPrompt = `${prompt}. The image should be suitable as a background for an Instagram carousel slide with text overlay. Dark wine/burgundy tones, elegant legal theme, 4:5 aspect ratio. No text in the image.`;

    const _t0 = Date.now();
    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: fullPrompt,
        size: '1024x1024',
        n: 1,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('AI Gateway error:', resp.status, errText);
      await logAiCall({ functionName: 'gerar-imagem-slide', kind: 'image', model: 'dall-e-3', triggerType: detectTrigger(body, req), success: false, error: errText.slice(0, 200), durationMs: Date.now() - _t0 });
      return new Response(JSON.stringify({ error: 'Image generation failed', detail: errText }), {
        status: resp.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    await logAiCall({ functionName: 'gerar-imagem-slide', kind: 'image', model: 'dall-e-3', triggerType: detectTrigger(body, req), outputUnits: 1, durationMs: Date.now() - _t0 });

    const data = await resp.json();
    const imageUrl = data?.data?.[0]?.url;

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

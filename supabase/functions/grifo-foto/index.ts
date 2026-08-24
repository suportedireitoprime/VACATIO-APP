// deno-lint-ignore-file no-explicit-any
// Edge function: recebe uma foto de texto legal, extrai o texto via Gemini
// Vision e devolve as frases mais importantes já classificadas (definição,
// prazo, regra, exceção, penalidade). Consumido pelo botão "Grifar de foto"
// do Grifo Mágico no ArtigoBottomSheet.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é uma IA de análise de texto jurídico. Recebe uma FOTO de um texto legal (lei, artigo, súmula, código). Sua tarefa:

1. Extrair o texto FIEL da imagem (OCR). Preserve pontuação, incisos, alíneas, artigos. Ignore rodapé/cabeçalho.
2. Identificar de 3 a 10 frases-chave (frases exatas, tal como aparecem no texto extraído) e classificar cada uma em UMA categoria:
   - "definicao" (definições, conceitos)
   - "prazo" (prazos, datas)
   - "regra" (regra principal)
   - "excecao" (exceções, salvo)
   - "penalidade" (multa, sanção, crime, pena)

RESPONDA APENAS JSON VÁLIDO neste formato:
{
  "texto": "texto extraído fiel...",
  "highlights": [
    { "frase": "frase exata do texto", "categoria": "definicao" }
  ]
}

Se a imagem não for texto jurídico legível, retorne { "texto": "", "highlights": [] }.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'missing_api_key' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dataUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:${mimeType};base64,${imageBase64}`;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: [
            { type: 'text', text: 'Analise a imagem abaixo:' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ]},
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      return new Response(JSON.stringify({ error: 'ai_gateway_error', status: resp.status, detail: errText }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch { parsed = { texto: String(raw), highlights: [] }; }

    return new Response(JSON.stringify({
      texto: parsed.texto ?? '',
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('grifo-foto error', e);
    return new Response(JSON.stringify({ error: e?.message ?? 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

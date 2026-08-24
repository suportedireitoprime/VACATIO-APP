// deno-lint-ignore-file no-explicit-any
// Recebe uma foto (caderno, resumo, livro) e identifica citações de artigos
// da lei atual. Retorna uma lista de trechos, cada um com o número do artigo
// (quando identificável) e um resumo do trecho.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é uma IA especializada em identificar citações de artigos jurídicos em fotos de cadernos, livros, resumos ou anotações.

TAREFA:
1. Faça OCR da imagem, extraindo o texto fielmente.
2. Divida o texto em CITAÇÕES independentes — cada citação é um trecho que fala de UM artigo específico (mesmo que o número do artigo não esteja escrito).
3. Para cada citação:
   - Se houver "Art. X" explícito, use esse número.
   - Se NÃO houver número mas o trecho for claramente sobre um artigo da lei informada, IDENTIFIQUE qual artigo é (use seu conhecimento da lei).
   - Escreva um trecho curto (até 220 caracteres) resumindo o conteúdo.
   - Escreva um título curto (até 60 caracteres) descrevendo o tema.

RESPONDA APENAS JSON VÁLIDO neste formato:
{
  "citacoes": [
    {
      "numero_artigo": "5",
      "titulo": "Direitos e garantias fundamentais",
      "trecho": "Trecho resumido citado na imagem...",
      "confianca": "alta"
    }
  ]
}

Se não encontrar nenhuma citação legível, retorne { "citacoes": [] }.
"confianca" deve ser "alta", "media" ou "baixa".
"numero_artigo" pode ser null se você não conseguir identificar.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType = 'image/jpeg', leiNome = '' } = await req.json();
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

    const userMsg = leiNome
      ? `Lei de referência: ${leiNome}. Analise a imagem e identifique todas as citações de artigos desta lei.`
      : 'Analise a imagem e identifique todas as citações de artigos jurídicos.';

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
            { type: 'text', text: userMsg },
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
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { citacoes: [] }; }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'internal', detail: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

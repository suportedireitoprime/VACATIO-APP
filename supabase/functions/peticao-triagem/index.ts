// Edge function: analyze user facts and classify (área do direito, tags, pedidos, partes).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const MODEL = 'google/gemini-3.6-flash';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) {
      return json({ error: 'LOVABLE_API_KEY missing' }, 500);
    }
    const { fatos } = await req.json();
    if (!fatos || typeof fatos !== 'string' || fatos.trim().length < 20) {
      return json({ error: 'Descreva os fatos com mais detalhes.' }, 400);
    }

    const prompt = `Você é um advogado brasileiro sênior. Leia os fatos abaixo e faça a triagem inicial para elaboração de uma petição inicial.

FATOS RELATADOS PELO CLIENTE:
"""
${fatos.slice(0, 8000)}
"""

Retorne APENAS um JSON válido (sem markdown, sem crase) com esta estrutura EXATA:
{
  "area_direito": "Direito Civil" | "Direito Penal" | "Direito Trabalhista" | "Direito Consumidor" | "Direito de Família" | "Direito Previdenciário" | "Direito Tributário" | "Direito Administrativo" | "Direito Empresarial" | "Direito Imobiliário" | "Outro",
  "sub_area": "string breve (ex: 'Responsabilidade civil - dano moral')",
  "tags": ["3 a 6 tags curtas"],
  "resumo": "resumo dos fatos em 2-3 frases claras, sem juridiquês",
  "pedidos": ["lista de pedidos que a IA infere que o autor quer fazer"],
  "partes_sugeridas": {
    "autor": "descrição do provável autor (ex: 'consumidor pessoa física')",
    "reu": "descrição do provável réu (ex: 'empresa de telefonia XYZ')"
  },
  "campos_sensiveis_necessarios": ["lista curta: 'CPF autor', 'RG autor', 'Endereço autor', 'Telefone autor', 'CNPJ réu', etc"]
}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'Você retorna apenas JSON válido, sem markdown.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('triagem gateway error', res.status, err);
      return json({ error: 'gateway_error', status: res.status, detail: err }, res.status);
    }

    const j = await res.json();
    const raw = j.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // tenta extrair primeiro objeto
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    return json(parsed);
  } catch (e) {
    console.error('triagem error', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

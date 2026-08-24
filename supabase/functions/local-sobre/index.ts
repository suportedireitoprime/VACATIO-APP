// Edge function: local-sobre
// Retorna um resumo específico sobre um local jurídico (fórum, tribunal,
// museu, OAB etc.) usando Gemini com google_search grounding. Foco no lugar
// específico — não em definições genéricas.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { geminiFetch } from '../_shared/geminiFetch.ts';

interface Body {
  nome: string;
  categoria?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { nome, categoria, endereco, cidade, uf } = (await req.json()) as Body;
    if (!nome) return json({ error: 'nome obrigatório' }, 400);

    const key = Deno.env.get('GEMINI_API_KEY');
    if (!key) return json({ error: 'GEMINI_API_KEY ausente' }, 500);

    const localizacao = [endereco, cidade, uf].filter(Boolean).join(', ');
    const tipo = categoria ? ` (${categoria})` : '';

    const prompt = `Pesquise informações reais e verificáveis sobre este local específico:

Nome: "${nome}"${tipo}
${localizacao ? `Endereço: ${localizacao}` : ''}

Escreva UM parágrafo (3 a 5 frases, máx. 600 caracteres) SOMENTE sobre este lugar em particular. Inclua se possível: qual a competência/função dele, quando foi inaugurado ou fatos históricos, qual tribunal/órgão ele pertence, se tem prédio marcante, casos notórios, ou curiosidades locais. NUNCA explique o que é a palavra "fórum", "tribunal" ou "museu" de forma genérica — o texto deve ser sobre ESSE local. Se não encontrar dados confiáveis sobre este local específico, responda apenas com a palavra: SEM_DADOS

Não use markdown, não use listas. Texto corrido em português do Brasil.`;

    const resp = await geminiFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
        }),
      },
    );
    if (!resp.ok) {
      const t = await resp.text();
      console.error('gemini error', resp.status, t);
      return json({ error: `Gemini ${resp.status}` }, 500);
    }
    const data = await resp.json();
    const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p.text ?? '')
      .join('\n')
      .trim();

    if (!text || /SEM_DADOS/i.test(text)) {
      return json({ extract: null, fontes: [] });
    }

    const grounding = data?.candidates?.[0]?.groundingMetadata;
    const fontes: string[] =
      grounding?.groundingChunks?.map((c: any) => c?.web?.uri).filter(Boolean) ?? [];

    return json({ extract: text, fontes: fontes.slice(0, 3) });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

// Edge function: explica um item de jurisprudência (tema/tese) usando IA (Lovable AI Gateway).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';

interface Payload {
  titulo?: string;
  categoria?: string;
  tribunal?: string;
  numero_processo?: string;
  situacao?: string;
  tese?: string;
  ementa?: string;
  descricao?: string;
  lei?: string;
  artigo?: string;
}

const SYSTEM = `Você é um professor de Direito brasileiro. Explique de forma DETALHADA, didática e completa um item de jurisprudência (tema, tese, súmula ou julgado) para um estudante ou operador do Direito.

FORMATO OBRIGATÓRIO (markdown, em português):
## Do que se trata
Resumo em 2-3 frases sobre o que essa jurisprudência decide.

## Contexto jurídico
Explique o instituto, o dispositivo legal envolvido e por que essa questão chegou ao tribunal. Se o usuário pesquisou um artigo específico, mostre a conexão entre o artigo pesquisado e os artigos citados no julgado (mesmo que sejam diferentes).

## O que o tribunal decidiu
Explique a tese fixada em linguagem clara, com exemplos práticos quando possível.

## Fundamentos e raciocínio
Principais argumentos jurídicos usados pelo tribunal (princípios, dispositivos, precedentes).

## Impacto prático
Consequências para advogados, juízes, réus/autores. Como aplicar no dia a dia.

## Pontos de atenção
Divergências, exceções, temas correlatos, ressalvas importantes.

REGRAS:
- Cite artigos no formato canônico: "art. 91 do CP", "art. 5º, XL, da CF", "Súmula 231 do STJ".
- Seja rico em detalhes mas objetivo. Sem enrolação.
- Não invente número de processo nem tese que não estejam no material fornecido.
- Se o julgado citar artigos diferentes do artigo pesquisado pelo usuário, EXPLIQUE explicitamente por que estão relacionados.`;

function buildUserPrompt(p: Payload): string {
  const parts: string[] = [];
  if (p.lei || p.artigo) parts.push(`**Pesquisa do usuário:** ${p.lei || ''} ${p.artigo ? '— art. ' + p.artigo : ''}`.trim());
  if (p.tribunal || p.categoria) parts.push(`**Origem:** ${[p.tribunal, p.categoria].filter(Boolean).join(' · ')}`);
  if (p.titulo) parts.push(`**Título:** ${p.titulo}`);
  if (p.numero_processo) parts.push(`**Processo/Referência:** ${p.numero_processo}`);
  if (p.situacao) parts.push(`**Situação:** ${p.situacao}`);
  if (p.tese) parts.push(`\n**TESE:**\n${p.tese}`);
  if (p.ementa) parts.push(`\n**EMENTA:**\n${p.ementa}`);
  if (p.descricao && !p.tese && !p.ementa) parts.push(`\n**Descrição:**\n${p.descricao}`);
  parts.push('\nAgora produza a explicação seguindo estritamente o formato pedido.');
  return parts.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY ausente' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const payload = (await req.json()) as Payload;
    if (!payload || (!payload.tese && !payload.ementa && !payload.descricao && !payload.titulo)) {
      return new Response(JSON.stringify({ error: 'Dados insuficientes para explicar.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: buildUserPrompt(payload) },
        ],
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error('gateway err', resp.status, errBody);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de uso atingido. Tente novamente em alguns instantes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados no workspace.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Falha na IA', status: resp.status, details: errBody }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const explicacao: string = data?.choices?.[0]?.message?.content ?? '';
    return new Response(JSON.stringify({ explicacao, model: MODEL }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
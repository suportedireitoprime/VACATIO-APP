// Edge function: elabora UMA seção da petição inicial por chamada usando um
// pipeline MULTI-AGENTE:
//   1) REDATOR     — escreve o rascunho inicial da seção com base no contexto.
//   2) REVISOR     — critica o rascunho (JSON: pontos fracos + sugestões).
//   3) REFINADOR   — reescreve incorporando a crítica; entrega a versão final.
// O retorno é compatível com o cliente atual (`texto`, `proxima`, `done`) e
// inclui `iteracoes` para eventual auditoria/UX.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const MODEL = 'google/gemini-3.6-flash';

// Ordem das seções — o cliente chama uma por vez.
const SECOES = [
  { id: 'cabecalho', label: 'Endereçamento e qualificação' },
  { id: 'fatos', label: 'Dos fatos' },
  { id: 'direito', label: 'Do direito' },
  { id: 'jurisprudencia', label: 'Da jurisprudência' },
  { id: 'pedidos', label: 'Dos pedidos' },
  { id: 'encerramento', label: 'Valor da causa e encerramento' },
];

async function llm(system: string, user: string, opts: { json?: boolean } = {}) {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`gateway ${res.status}: ${err.slice(0, 200)}`);
  }
  const j = await res.json();
  return String(j.choices?.[0]?.message?.content ?? '');
}

function limparMd(t: string): string {
  return t.replace(/^```(?:markdown)?\s*/i, '').replace(/```\s*$/g, '').trim();
}

function safeJson<T>(txt: string, fallback: T): T {
  try {
    return JSON.parse(txt) as T;
  } catch {
    const m = txt.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]) as T; } catch { /* ignore */ }
    }
    return fallback;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) return json({ error: 'LOVABLE_API_KEY missing' }, 500);
    const body = await req.json();
    const {
      secao_id,
      fatos,
      resumo,
      area_direito,
      sub_area,
      pedidos = [],
      partes = {},
      jurisprudencias = [],
      anteriores = '',
    } = body;

    const secao = SECOES.find((s) => s.id === secao_id);
    if (!secao) return json({ error: 'secao inválida', validas: SECOES.map((s) => s.id) }, 400);

    const partesTxt = `
Autor: ${partes.autor_nome || '{{NOME_AUTOR}}'} — CPF {{CPF_AUTOR}}, RG {{RG_AUTOR}}, residente em {{ENDERECO_AUTOR}}, telefone {{TEL_AUTOR}}, e-mail {{EMAIL_AUTOR}}.
Réu: ${partes.reu_nome || '{{NOME_REU}}'} — CNPJ {{CNPJ_REU}}, sede em {{ENDERECO_REU}}.
`;

    const jurisTxt = jurisprudencias.length
      ? jurisprudencias
          .map(
            (j: any, i: number) =>
              `[${i + 1}] ${j.tribunal} — ${j.titulo || j.tema || ''}. ${j.tese || j.ementa || ''}${j.link ? ' Fonte: ' + j.link : ''}`,
          )
          .join('\n')
      : '(sem jurisprudência selecionada)';

    // Contexto compartilhado entre os três agentes.
    const contexto = `CONTEXTO GERAL:
- Área: ${area_direito || 'não classificada'} — ${sub_area || ''}
- Resumo do caso: ${resumo || fatos?.slice(0, 500) || ''}
- Partes: ${partesTxt}
- Pedidos identificados: ${(pedidos || []).map((p: string) => '• ' + p).join('\n') || '(a inferir)'}
- Jurisprudências disponíveis:
${jurisTxt}

SEÇÕES ANTERIORES (para manter coerência, NÃO repetir):
${anteriores.slice(-4000) || '(nenhuma ainda)'}

SEÇÃO ATUAL: **${secao.label.toUpperCase()}**

Regras de formatação obrigatórias:
- Markdown puro (sem cercas ${'```'}).
- Título "## ${secao.label.toUpperCase()}". Se a seção for 'cabecalho', comece por "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A)...".
- Dados sensíveis SEMPRE via placeholders: {{CPF_AUTOR}}, {{RG_AUTOR}}, {{ENDERECO_AUTOR}}, {{TEL_AUTOR}}, {{EMAIL_AUTOR}}, {{CNPJ_REU}}, {{ENDERECO_REU}}, {{NOME_AUTOR}}, {{NOME_REU}}. Nunca invente número.
- Artigos de lei: formato [Art. 186 do CC](lei://cc/186). Súmulas: [Súmula 297 do STJ](sumula://stj/297).
- Ao citar as jurisprudências fornecidas acima, use [tribunal, título/tema](URL) quando houver link.
- Se for 'jurisprudencia' e não houver jurisprudências, retorne apenas: "## DA JURISPRUDÊNCIA\\n\\n(seção suprimida por opção do autor)".
- Se for 'encerramento', incluir "Valor da causa: R$ {{VALOR_CAUSA}}" e o fecho "Nestes termos, pede deferimento. {{CIDADE_AUTOR}}, {{DATA_HOJE}}. {{NOME_ADVOGADO}} — OAB {{OAB_ADVOGADO}}".`;

    // ─── AGENTE 1: REDATOR ───
    const promptRedator = `Você é o REDATOR do time. Escreva a PRIMEIRA versão da seção em português técnico-jurídico brasileiro, formal e sem enrolação.

${contexto}

Entregue somente o markdown da seção.`;
    const rascunho = limparMd(
      await llm(
        'Você é um redator jurídico brasileiro. Retorne apenas markdown, sem cercas de código.',
        promptRedator,
      ),
    );

    // Atalho: seções triviais (jurisprudência suprimida, cabeçalho curto) não
    // se beneficiam de revisão adicional — devolvemos o rascunho direto.
    const puloRevisao =
      (secao_id === 'jurisprudencia' && (!jurisprudencias || jurisprudencias.length === 0));

    let critica = '';
    let texto = rascunho;

    if (!puloRevisao) {
      // ─── AGENTE 2: REVISOR ───
      const promptRevisor = `Você é o REVISOR crítico do time. Sua função é APONTAR falhas concretas no rascunho abaixo — nunca reescrever. Seja duro, direto e objetivo.

${contexto}

RASCUNHO DO REDATOR:
"""
${rascunho}
"""

Avalie com rigor:
1. A tese jurídica está clara e bem fundamentada?
2. As jurisprudências fornecidas foram efetivamente utilizadas (com link)?
3. Falta citar algum artigo de lei óbvio (ex: 186/927 CC em resp. civil; 5º/6º/14 CDC em consumidor; 5º CF em direito fundamental)?
4. A linguagem está formal, sem repetição e sem juridiquês inútil?
5. Os placeholders foram respeitados? Há dado sensível inventado?
6. Formato markdown correto (título ##, links [texto](url), sem cercas)?

Retorne APENAS JSON válido:
{
  "nota": 1-10,
  "pontos_fracos": ["frase curta descrevendo cada problema real"],
  "melhorias_obrigatorias": ["instrução concreta ao refinador"],
  "manter": "o que está bom e NÃO deve ser reescrito"
}`;
      try {
        critica = await llm(
          'Você é um revisor jurídico exigente. Retorne apenas JSON válido.',
          promptRevisor,
          { json: true },
        );
      } catch (e) {
        console.warn('revisor falhou, seguindo com rascunho', e);
      }

      // ─── AGENTE 3: REFINADOR ───
      const parsed = safeJson<{
        pontos_fracos?: string[];
        melhorias_obrigatorias?: string[];
        manter?: string;
        nota?: number;
      }>(critica, {});
      const nota = Number(parsed.nota ?? 0);
      const temMelhorias =
        (parsed.pontos_fracos?.length ?? 0) + (parsed.melhorias_obrigatorias?.length ?? 0) > 0;

      if (temMelhorias || nota < 8) {
        const promptRefinador = `Você é o REFINADOR do time. Reescreva a seção incorporando as correções do revisor. Preserve o que já estava bom. Mantenha todas as regras de formatação do contexto.

${contexto}

RASCUNHO ORIGINAL:
"""
${rascunho}
"""

CRÍTICA DO REVISOR (JSON):
${critica || '{}'}

Entregue APENAS o markdown final da seção, já corrigido e polido — nada mais.`;
        try {
          texto = limparMd(
            await llm(
              'Você é um redator jurídico brasileiro sênior. Retorne apenas markdown, sem cercas de código.',
              promptRefinador,
            ),
          );
        } catch (e) {
          console.warn('refinador falhou, mantendo rascunho', e);
        }
      }
    }

    const idx = SECOES.findIndex((s) => s.id === secao_id);
    const proxima = SECOES[idx + 1]?.id ?? null;

    return json({
      secao_id,
      texto,
      proxima,
      done: proxima === null,
      iteracoes: {
        rascunho_len: rascunho.length,
        critica_bruta: critica ? critica.slice(0, 2000) : null,
        revisado: !puloRevisao && texto !== rascunho,
      },
    });
  } catch (e) {
    console.error('elaborar error', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Refina com IA a ementa/observação de um acórdão de Pesquisa Pronta.
// Recebe { resultado_id, force? } — busca a linha, chama Lovable AI (gpt-5.5)
// para estruturar/limpar o texto, e persiste em ementa_refinada / observacao_refinada.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const SYSTEM_PROMPT = `Você é um editor jurídico especializado em decisões do STF e STJ.
Sua tarefa é REFINAR o texto de um acórdão para leitura em app mobile, SEM inventar nada.

REGRAS:
- Não invente fatos, números, datas, artigos ou nomes que não estejam no texto original.
- Remova artefatos de scraping (nomes de ícones, links quebrados, "arrow_drop_down", "file_copy", etc.).
- Remova cabeçalhos administrativos irrelevantes (ex.: "Repercussão Geral – Admissibilidade").
- Preserve o conteúdo jurídico integralmente: ementa, tema, tese, artigos citados, súmulas.
- Organize em seções claras usando estes marcadores em negrito quando fizerem sentido:
  **Ementa**, **Tema**, **Tese**, **Fundamentos**, **Dispositivo**.
- Use quebras de linha entre parágrafos para facilitar leitura.
- Mantenha grifos em negrito nos conceitos-chave (usando **texto**).
- Não use markdown de link, imagens, tabelas ou HTML.
- Responda APENAS com o texto refinado, sem preâmbulo nem comentários.`;

async function refineText(raw: string, kind: 'ementa' | 'observacao'): Promise<string> {
  const userPrompt = kind === 'ementa'
    ? `Refine a ementa abaixo mantendo TODO o conteúdo jurídico (ementa, tema, tese, fundamentos):\n\n${raw}`
    : `Refine a observação abaixo (nota complementar do julgado). Mantenha o conteúdo, apenas limpe artefatos:\n\n${raw}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${err.slice(0, 400)}`);
  }
  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const content = Array.isArray(parts)
    ? parts.map((p: any) => p?.text || '').join('').trim()
    : '';
  if (!content) throw new Error('Resposta vazia da IA (Gemini)');
  return content;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { resultado_id, force = false } = await req.json();
    if (!resultado_id) return json({ error: 'resultado_id obrigatório' }, 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: row, error: selErr } = await sb
      .from('jurisprudencia_prontas_resultados')
      .select('id, ementa, observacao, ementa_refinada, observacao_refinada, refinado_em')
      .eq('id', resultado_id)
      .maybeSingle();

    if (selErr) throw selErr;
    if (!row) return json({ error: 'resultado não encontrado' }, 404);

    // Já refinado e não forçando? devolve o que já existe.
    if (!force && row.ementa_refinada) {
      return json({
        cached: true,
        ementa_refinada: row.ementa_refinada,
        observacao_refinada: row.observacao_refinada,
        refinado_em: row.refinado_em,
      });
    }

    const [ementa_refinada, observacao_refinada] = await Promise.all([
      row.ementa ? refineText(row.ementa, 'ementa') : Promise.resolve(null),
      row.observacao ? refineText(row.observacao, 'observacao') : Promise.resolve(null),
    ]);

    const refinado_em = new Date().toISOString();
    const { error: updErr } = await sb
      .from('jurisprudencia_prontas_resultados')
      .update({ ementa_refinada, observacao_refinada, refinado_em })
      .eq('id', resultado_id);
    if (updErr) throw updErr;

    return json({ cached: false, ementa_refinada, observacao_refinada, refinado_em });
  } catch (e) {
    console.error('refinar erro:', e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
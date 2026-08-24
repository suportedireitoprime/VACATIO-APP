// Edge function: biblioteca-enriquecer
// Gera capa horizontal + análise técnica (ano, editora, curiosidades, análise detalhada)
// para um livro da biblioteca usando Lovable AI Gateway.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const TABLES = new Set([
  'biblioteca_classicos',
  'biblioteca_estudos',
  'biblioteca_fora_da_toga',
  'biblioteca_lideranca',
  'biblioteca_oab',
  'biblioteca_pesquisa_cientifica',
  'biblioteca_portugues',
]);

interface Body {
  tabela: string;
  livro_id: string | number;
  only?: 'capa' | 'texto' | 'all';
}

const IA_ACTIONS = new Set(['termos', 'resumo', 'sugestoes', 'chat', 'frase_marcante', 'frases_livro', 'frases_listar']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const rawBody = await req.json();

    // === Roteador IA (merge do antigo biblioteca-ia) ===
    if (rawBody && typeof rawBody === 'object' && IA_ACTIONS.has(String((rawBody as any).action))) {
      return await handleIA(rawBody as any);
    }

    const body = rawBody as Body;
    if (!body?.tabela || !TABLES.has(body.tabela) || !body?.livro_id) {
      return json({ error: 'Parâmetros inválidos' }, 400);
    }
    const only = body.only ?? 'all';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return json({ error: 'LOVABLE_API_KEY ausente' }, 500);

    // Busca livro
    const { data: livro, error: eLivro } = await supabase
      .from(body.tabela)
      .select('*')
      .eq('id', body.livro_id)
      .maybeSingle();
    if (eLivro || !livro) return json({ error: 'Livro não encontrado' }, 404);

    const titulo =
      (livro as any).livro || (livro as any).tema || (livro as any).titulo || '';
    const autor = (livro as any).autor || '';

    const updates: Record<string, unknown> = {};

    // === Texto (Gemini) ===
    if (only === 'all' || only === 'texto') {
      const prompt = `Você é um crítico literário e acadêmico jurídico. Sobre o livro "${titulo}"${autor ? ` de ${autor}` : ''}, retorne um JSON com os seguintes campos EXATAMENTE:
{
  "ano_lancamento": "AAAA",
  "editora": "nome da editora original ou principal",
  "curiosidades": ["curiosidade 1", "curiosidade 2", "curiosidade 3", "curiosidade 4", "curiosidade 5"],
  "analise_detalhada": "texto corrido de 600 a 900 palavras analisando a obra: contexto histórico, tese central, importância jurídica/acadêmica, impacto e relevância atual. Tom acadêmico-jurídico, em português brasileiro."
}
Regras: sem markdown, sem texto fora do JSON, sem \`\`\`. Se não souber algo com certeza, use "" (string vazia) ou array vazio. NUNCA invente dados factuais como ano ou editora.`;

      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            { role: 'system', content: 'Retorne apenas JSON válido, sem markdown.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
        }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        console.error('AI text error', resp.status, t);
        return json({ error: `AI text ${resp.status}: ${t}` }, 500);
      }
      const j = await resp.json();
      const raw = j?.choices?.[0]?.message?.content ?? '{}';
      let parsed: any = {};
      try { parsed = JSON.parse(raw); } catch { parsed = {}; }
      if (parsed.ano_lancamento) updates.ano_lancamento = String(parsed.ano_lancamento);
      if (parsed.editora) updates.editora = String(parsed.editora);
      if (Array.isArray(parsed.curiosidades)) {
        updates.curiosidades = parsed.curiosidades.filter((x: unknown) => typeof x === 'string');
      }
      if (parsed.analise_detalhada) updates.analise_detalhada = String(parsed.analise_detalhada);
    }

    // === Capa horizontal (Gemini image) ===
    let promptUsed: string | null = null;
    if (only === 'all' || only === 'capa') {
      // Carrega histórico de feedback (últimos gostados/rejeitados) para IA aprender
      const { data: liked } = await supabase
        .from('biblioteca_capa_feedback')
        .select('titulo, autor')
        .eq('rating', 1)
        .order('created_at', { ascending: false })
        .limit(8);
      const { data: disliked } = await supabase
        .from('biblioteca_capa_feedback')
        .select('titulo, autor')
        .eq('rating', -1)
        .order('created_at', { ascending: false })
        .limit(5);

      const likedRef = (liked ?? []).map((r: any) => `"${r.titulo}"`).join(', ');
      const dislikedRef = (disliked ?? []).map((r: any) => `"${r.titulo}"`).join(', ');

      const learningBlock = [
        likedRef ? `REFERÊNCIAS APROVADAS pelo curador (siga o estilo dessas obras): ${likedRef}.` : '',
        dislikedRef ? `REFERÊNCIAS REJEITADAS (NÃO repita esse padrão visual): ${dislikedRef}.` : '',
      ].filter(Boolean).join(' ');

      const imgPrompt = `Ilustração editorial rica e DENSA representando o livro "${titulo}"${autor ? ` de ${autor}` : ''}. Formato estritamente horizontal 16:9 (paisagem). Fundo preto puro (#000000) porém PREENCHIDO POR COMPLETO — sem vazios, sem áreas mortas, sem espaço em branco/preto liso. A composição deve OCUPAR TODA A LARGURA da moldura de ponta a ponta, com múltiplos planos de profundidade (fundo, meio, primeiro plano).

Elementos obrigatórios: cenário simbólico completo do tema central da obra, arquitetura/paisagem/silhuetas humanas em várias escalas, ornamentos, texturas sutis, feixes de luz volumétrica, partículas, detalhes decorativos preenchendo cantos e bordas. Riqueza de detalhes em TODO o quadro (esquerda, centro e direita). NUNCA deixar metade do quadro só com um objeto pequeno flutuando no preto.

Estilo: arte vetorial editorial cinematográfica, alto contraste, paleta bordô (#7A1F2B), dourado envelhecido (#C9A96E), marfim e detalhes brancos sobre preto. Mood dramático e clássico. SEM texto, SEM letras, SEM logotipos, SEM assinaturas, SEM molduras/bordas retangulares em volta.

${learningBlock}`;
      promptUsed = imgPrompt;

      const imgResp = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          messages: [{ role: 'user', content: imgPrompt }],
          modalities: ['image', 'text'],
        }),
      });
      if (!imgResp.ok) {
        const t = await imgResp.text();
        console.error('AI image error', imgResp.status, t);
      } else {
        const jImg = await imgResp.json();
        const b64 = jImg?.data?.[0]?.b64_json;
        if (b64) {
          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          const path = `${body.tabela}/${body.livro_id}-${Date.now()}.png`;
          const { error: eUp } = await supabase.storage
            .from('biblioteca-capas-horizontal')
            .upload(path, bytes, { contentType: 'image/png', upsert: true });
          if (eUp) {
            console.error('Storage upload error', eUp);
          } else {
            const { data: signed } = await supabase.storage
              .from('biblioteca-capas-horizontal')
              .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
            if (signed?.signedUrl) updates.capa_horizontal = signed.signedUrl;
          }
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return json({ ok: true, updated: false, updates });
    }

    const { error: eUpd } = await supabase
      .from(body.tabela)
      .update(updates)
      .eq('id', body.livro_id);
    if (eUpd) {
      console.error('Update error', eUpd);
      return json({ error: eUpd.message }, 500);
    }

    return json({ ok: true, updated: true, updates, prompt_used: promptUsed });
  } catch (err) {
    console.error('biblioteca-enriquecer fatal', err);
    return json({ error: String((err as Error)?.message ?? err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ============================================================================
// Assistente de leitura IA (merge do antigo biblioteca-ia)
// Body: { action: 'termos'|'resumo'|'chat'|'sugestoes'|'frase_marcante', ...payload }
// ============================================================================

const IA_MODEL = 'google/gemini-2.5-flash-lite';
const IA_MODEL_FRASE = 'google/gemini-2.5-flash-lite';

const IA_SYSTEM_TERMOS = `Você é um professor que ajuda leitores a entender palavras difíceis, expressões técnicas, termos jurídicos, termos em latim, nomes históricos e conceitos abstratos que aparecem em um trecho de um livro.

Sua tarefa: ler UMA página do livro e listar entre 3 e 10 termos que um leitor médio pode ter dúvida. Ignore palavras comuns.

Devolva APENAS JSON válido, no formato:
{
  "termos": [
    {
      "termo": "palavra ou expressão exata como aparece no texto",
      "categoria": "jurídico" | "latim" | "técnico" | "histórico" | "pessoa" | "conceito",
      "significado": "explicação clara e curta (1-2 frases) em português",
      "contexto": "por que esse termo importa NESTE trecho específico (1 frase)",
      "aplicacao": "exemplo prático do dia a dia OU uso concreto do termo (1-2 frases, linguagem simples, se possível cite uma situação real)"
    }
  ]
}

Regras:
- Extraia termos REALMENTE presentes na página. Não invente.
- Ordene do mais importante para o menos.
- Se a página não tiver termos relevantes (ex.: só narração simples), devolva {"termos": []}.`;

const IA_SYSTEM_RESUMO = `Você é um professor didático explicando UMA página específica de um livro para um leitor que quer entender melhor o que acabou de ler.

Você recebe: título do livro, título do capítulo, número da página e o texto da página.
Devolva um resumo em Markdown, em português (pt-BR), com EXATAMENTE esta estrutura:

## Contexto
1-2 frases situando o leitor: onde estamos no livro, o que o autor está discutindo agora.

## Resumo desta página
2-4 parágrafos claros e naturais explicando o que a página diz, com as próprias palavras — não copie frases inteiras do original.

## Pontos-chave
- 3 a 5 bullets curtos com as ideias mais importantes desta página.

Regras:
- Não invente informações que não estejam na página.
- Se a página é uma capa, sumário ou tem pouco conteúdo, escreva um resumo curto e sinalize isso.
- Nunca comece com "Este texto..." ou "Nesta página..."; vá direto ao conteúdo.
- Não repita o título do livro no início.`;

const IA_SYSTEM_SUGESTOES = `Você recebe uma página de um livro e gera 4 perguntas curtas, na PRIMEIRA pessoa (como se o leitor estivesse falando), que ele poderia querer fazer sobre o texto. Cada pergunta com no máximo 70 caracteres, sem numerar, específicas ao conteúdo (nunca genéricas como "Do que se trata?").
Devolva APENAS JSON: {"sugestoes": ["...","...","...","..."]}`;

const IA_SYSTEM_FRASE = `Você é um curador literário sofisticado. Recebe um trecho (uma página ou o livro inteiro) e escolhe UMA frase marcante — poética, filosófica, provocadora ou reveladora — pronta para ser postada como citação em redes sociais.

Critérios de excelência:
- A frase DEVE existir EXATAMENTE no texto (mesmo idioma, mesma pontuação). Não parafraseie, não invente, não traduza.
- Entre 40 e 240 caracteres. Prefira frases completas, autossuficientes, que carreguem uma ideia forte fora do contexto.
- Priorize: aforismos, metáforas potentes, definições marcantes, virada de pensamento, síntese conceitual, provocações éticas.
- Evite: frases descritivas, transições, diálogos triviais, listas, notas de rodapé, trechos que dependem do parágrafo anterior.
- Se de fato não houver nada memorável, devolva {"frase": "", "motivo": "sem frase marcante"}.

Devolva APENAS JSON: {"frase": "...", "motivo": "por que ela é marcante (1 frase curta e específica)"}`;

const IA_SYSTEM_FRASES_LIVRO = `Você é um curador literário sofisticado. Recebe amostras do livro inteiro e seleciona um conjunto de 6 frases marcantes — as MAIS memoráveis, distintas entre si, que juntas representam o pensamento central da obra.

Critérios:
- Cada frase DEVE existir EXATAMENTE no texto (mesmo idioma, mesma pontuação). Não invente, não parafraseie.
- Entre 40 e 240 caracteres cada.
- Diversifique: temas diferentes, tons diferentes (poético, filosófico, provocador, definição, síntese).
- Zero repetição de ideias entre frases.
- Se o texto for insuficiente, devolva menos frases (mínimo 2).

Devolva APENAS JSON: {"frases": [{"frase":"...","motivo":"por que essa frase é marcante"}]}`;

function iaSystemChat(ctx: any) {
  return `Você é um tutor gentil e culto que conversa com um leitor sobre UMA página específica de um livro.
Responda sempre em português (pt-BR), tom sóbrio e didático, em Markdown quando ajudar.

Contexto fixo desta conversa:
- LIVRO: ${ctx?.livro_titulo || '(desconhecido)'}
- CAPÍTULO: ${ctx?.capitulo_titulo || '(desconhecido)'}
- PÁGINA: ${ctx?.pagina_num ?? '?'}

TEXTO DA PÁGINA (use como base principal para responder):
"""
${String(ctx?.pagina_md || '').slice(0, 9000)}
"""

Regras:
- Priorize o conteúdo desta página. Se a pergunta pedir algo fora dela, responda com base no que se sabe, mas avise brevemente que é fora do trecho.
- Não invente citações que não estejam no texto.
- Se o usuário pedir para "resumir" ou "explicar", faça em 2-4 parágrafos.
- Nunca peça desculpas por ser uma IA nem se apresente novamente. Vá direto ao ponto.`;
}

async function iaCallGateway(body: any) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');
  return fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
}

function iaMapError(status: number, txt: string) {
  if (status === 429) return json({ error: 'rate_limit', detail: txt }, 429);
  if (status === 402) return json({ error: 'sem_creditos', detail: txt }, 402);
  return json({ error: 'ai_error', detail: txt }, 500);
}

function iaSafeJson(str: string): any {
  try { return JSON.parse(str); } catch { /* fallthrough */ }
  const m = str.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* fallthrough */ } }
  return {};
}

// Reduz um livro grande a uma amostra representativa (início + amostras do meio + fim),
// mantendo o total abaixo do limite de contexto do modelo.
function amostraLivro(full: string, maxChars = 26000): string {
  const t = String(full || '');
  if (t.length <= maxChars) return t;
  const slice = Math.floor(maxChars / 4);
  const inicio = t.slice(0, slice);
  const fim = t.slice(-slice);
  const meioA = t.slice(Math.floor(t.length * 0.35), Math.floor(t.length * 0.35) + slice);
  const meioB = t.slice(Math.floor(t.length * 0.65), Math.floor(t.length * 0.65) + slice);
  return `${inicio}\n\n[...]\n\n${meioA}\n\n[...]\n\n${meioB}\n\n[...]\n\n${fim}`;
}

async function handleIA(body: any): Promise<Response> {
  try {
    const action = String(body?.action || '');

    if (action === 'termos' || action === 'resumo') {
      const { pagina_md, livro_titulo, capitulo_titulo, pagina_num } = body;
      if (!pagina_md || typeof pagina_md !== 'string') {
        return json({ error: 'pagina_md é obrigatório' }, 400);
      }
      const user = `LIVRO: ${livro_titulo || '(desconhecido)'}
CAPÍTULO: ${capitulo_titulo || '(desconhecido)'}
PÁGINA: ${pagina_num ?? '?'}

${action === 'termos' ? 'CONTEÚDO DA PÁGINA:' : 'TEXTO DA PÁGINA:'}
${String(pagina_md).slice(0, 9000)}`;

      const resp = await iaCallGateway({
        model: IA_MODEL,
        temperature: action === 'termos' ? 0.3 : 0.5,
        ...(action === 'termos' ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: action === 'termos' ? IA_SYSTEM_TERMOS : IA_SYSTEM_RESUMO },
          { role: 'user', content: user },
        ],
      });
      if (!resp.ok) return iaMapError(resp.status, await resp.text().catch(() => ''));
      const data = await resp.json();
      const content = (data?.choices?.[0]?.message?.content || '').trim();
      if (action === 'termos') {
        const parsed = iaSafeJson(content);
        return json({ termos: Array.isArray(parsed?.termos) ? parsed.termos : [] });
      }
      return json({ resumo_md: content });
    }

    if (action === 'sugestoes') {
      const ctx = body?.contexto;
      if (!ctx?.pagina_md) return json({ error: 'contexto.pagina_md obrigatório' }, 400);
      const resp = await iaCallGateway({
        model: IA_MODEL,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: IA_SYSTEM_SUGESTOES },
          {
            role: 'user',
            content: `LIVRO: ${ctx.livro_titulo || ''}\nCAPÍTULO: ${ctx.capitulo_titulo || ''}\nPÁGINA ${ctx.pagina_num ?? ''}\n\n${String(ctx.pagina_md).slice(0, 6000)}`,
          },
        ],
      });
      if (!resp.ok) return iaMapError(resp.status, await resp.text().catch(() => ''));
      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content || '{}';
      const parsed = iaSafeJson(content);
      const sugestoes = Array.isArray(parsed?.sugestoes)
        ? parsed.sugestoes.slice(0, 4).map((s: any) => String(s))
        : [];
      return json({ sugestoes });
    }

    if (action === 'chat') {
      const ctx = body?.contexto;
      if (!ctx?.pagina_md) return json({ error: 'contexto.pagina_md obrigatório' }, 400);
      const historico = Array.isArray(body?.messages)
        ? body.messages
            .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
            .slice(-20)
        : [];
      const resp = await iaCallGateway({
        model: IA_MODEL,
        temperature: 0.6,
        messages: [{ role: 'system', content: iaSystemChat(ctx) }, ...historico],
      });
      if (!resp.ok) return iaMapError(resp.status, await resp.text().catch(() => ''));
      const data = await resp.json();
      const content = (data?.choices?.[0]?.message?.content || '').trim();
      return json({ content });
    }

    if (action === 'frase_marcante') {
      const { pagina_md, livro_titulo, capitulo_titulo, pagina_num, livro_tabela, livro_id } = body;
      const escopo: 'pagina' | 'livro' = body?.escopo === 'livro' ? 'livro' : 'pagina';

      let texto = String(pagina_md || '').slice(0, 12000);
      if (escopo === 'livro' && livro_tabela && livro_id) {
        const admin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
        const { data: reg } = await admin
          .from('biblioteca_leitura_nativa')
          .select('conteudo_md_refinado, conteudo_md')
          .eq('livro_tabela', livro_tabela)
          .eq('livro_id', String(livro_id))
          .maybeSingle();
        const full = String((reg as any)?.conteudo_md_refinado || (reg as any)?.conteudo_md || '');
        if (full) texto = amostraLivro(full);
      }
      if (!texto) return json({ error: 'sem conteúdo' }, 400);

      const resp = await iaCallGateway({
        model: IA_MODEL_FRASE,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: IA_SYSTEM_FRASE },
          {
            role: 'user',
            content: `LIVRO: ${livro_titulo || ''}\nCAPÍTULO: ${capitulo_titulo || ''}\nPÁGINA: ${pagina_num ?? ''}\nESCOPO: ${escopo}\n\nTEXTO:\n${texto}`,
          },
        ],
      });
      if (!resp.ok) return iaMapError(resp.status, await resp.text().catch(() => ''));
      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content || '{}';
      const parsed = iaSafeJson(content);
      const frase = String(parsed?.frase || '').trim();
      const motivo = String(parsed?.motivo || '').trim();

      if (frase && livro_tabela && livro_id) {
        try {
          const admin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          );
          await admin.from('biblioteca_frases').insert({
            livro_tabela, livro_id: String(livro_id), frase, motivo,
            pagina_num: escopo === 'pagina' ? pagina_num ?? null : null,
            escopo, origem: 'ia',
          });
        } catch { /* dedupe conflict ok */ }
      }
      return json({ frase, motivo });
    }

    if (action === 'frases_livro') {
      const { livro_tabela, livro_id, livro_titulo } = body;
      if (!livro_tabela || !livro_id) return json({ error: 'livro_tabela e livro_id obrigatórios' }, 400);
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: reg } = await admin
        .from('biblioteca_leitura_nativa')
        .select('conteudo_md_refinado, conteudo_md')
        .eq('livro_tabela', livro_tabela)
        .eq('livro_id', String(livro_id))
        .maybeSingle();
      const full = String((reg as any)?.conteudo_md_refinado || (reg as any)?.conteudo_md || '');
      if (!full) return json({ error: 'livro sem conteúdo processado' }, 400);

      const resp = await iaCallGateway({
        model: IA_MODEL_FRASE,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: IA_SYSTEM_FRASES_LIVRO },
          { role: 'user', content: `LIVRO: ${livro_titulo || ''}\n\nAMOSTRA DO LIVRO:\n${amostraLivro(full)}` },
        ],
      });
      if (!resp.ok) return iaMapError(resp.status, await resp.text().catch(() => ''));
      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content || '{}';
      const parsed = iaSafeJson(content);
      const frases = Array.isArray(parsed?.frases) ? parsed.frases : [];
      const clean = frases
        .map((f: any) => ({ frase: String(f?.frase || '').trim(), motivo: String(f?.motivo || '').trim() }))
        .filter((f: any) => f.frase.length >= 20 && f.frase.length <= 260)
        .slice(0, 8);

      if (clean.length) {
        try {
          await admin.from('biblioteca_frases').insert(
            clean.map((f: any) => ({
              livro_tabela, livro_id: String(livro_id), frase: f.frase, motivo: f.motivo,
              escopo: 'livro', origem: 'ia',
            })),
          );
        } catch { /* dedupe */ }
      }
      return json({ frases: clean });
    }

    if (action === 'frases_listar') {
      const { livro_tabela, livro_id } = body;
      if (!livro_tabela || !livro_id) return json({ error: 'parâmetros obrigatórios' }, 400);
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data, error } = await admin
        .from('biblioteca_frases')
        .select('id, frase, motivo, pagina_num, escopo, origem, created_at')
        .eq('livro_tabela', livro_tabela)
        .eq('livro_id', String(livro_id))
        .order('created_at', { ascending: false })
        .limit(40);
      if (error) return json({ error: 'db_error', detail: error.message }, 500);
      return json({ frases: data || [] });
    }

    return json({ error: 'action inválida' }, 400);
  } catch (e: any) {
    return json({ error: 'internal', detail: String(e?.message || e) }, 500);
  }
}

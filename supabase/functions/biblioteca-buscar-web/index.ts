// Edge function: biblioteca-buscar-web
// Pesquisa informações reais na web (via Gemini + Google Search grounding)
// para preencher ano de lançamento, editora, curiosidades e sinopse curta de um livro.
//
// Nota: usa a API nativa do Gemini (GEMINI_API_KEY) porque a grounding com
// google_search só é exposta na API do Gemini — não no chat completions.
// Alternativa mais robusta: usar Browserless (self-host ou nuvem) — repo
// https://github.com/browserless/browserless. É um Chrome headless como serviço.
// O plano cloud é PAGO (mensalidade por sessões concorrentes); a versão docker
// open source é gratuita para self-host. Para usar, defina BROWSERLESS_URL +
// BROWSERLESS_TOKEN e faça chamadas para /content ou /scrape.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { geminiFetch } from "../_shared/geminiFetch.ts";

interface Body {
  titulo: string;
  autor?: string;
  campo?: 'ano' | 'editora' | 'curiosidades' | 'sinopse' | 'all';
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { titulo, autor, campo = 'all' } = (await req.json()) as Body;
    if (!titulo) return json({ error: 'titulo obrigatório' }, 400);

    const key = Deno.env.get('GEMINI_API_KEY');
    if (!key) return json({ error: 'GEMINI_API_KEY ausente' }, 500);

    const q = `${titulo}${autor ? ' ' + autor : ''} livro editora ano publicação`;

    // 1) Chamada grounded com google_search
    const groundBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Pesquise na web informações reais e verificáveis sobre o livro "${titulo}"${autor ? ` de ${autor}` : ''}. Cite fontes. Retorne em texto livre com:
- Ano da primeira publicação (original)
- Editora original e principais editoras brasileiras
- 5 curiosidades pouco conhecidas (fatos históricos, bastidores, impacto cultural, edições marcantes, controvérsias)
- Sinopse breve (2 a 3 frases) do que a obra trata

Termo de busca sugerido: "${q}"`,
            },
          ],
        },
      ],
      tools: [{ google_search: {} }],
    };

    const groundResp = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groundBody),
      },
    );
    if (!groundResp.ok) {
      const t = await groundResp.text();
      console.error('gemini ground error', groundResp.status, t);
      return json({ error: `Gemini ${groundResp.status}: ${t.slice(0, 200)}` }, 500);
    }
    const groundData = await groundResp.json();
    const rawText: string =
      groundData?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('\n') ??
      '';
    const grounding = groundData?.candidates?.[0]?.groundingMetadata;
    const fontes: string[] =
      grounding?.groundingChunks?.map((c: any) => c?.web?.uri).filter(Boolean) ?? [];

    // 2) Estrutura em JSON com um segundo modelo (sem tool)
    const structureResp = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `A partir da pesquisa abaixo sobre o livro "${titulo}", extraia APENAS JSON válido no formato:
{
  "ano_lancamento": "AAAA",
  "editora": "nome da editora",
  "curiosidades": ["c1", "c2", "c3", "c4", "c5"],
  "sinopse": "2-3 frases"
}
Se algum campo não estiver claro na pesquisa, use "" ou []. Nunca invente. Sem markdown, sem \`\`\`.

PESQUISA:
${rawText}`,
                },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
      },
    );

    let parsed: any = {};
    if (structureResp.ok) {
      const d = await structureResp.json();
      const txt: string =
        d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '{}';
      try { parsed = JSON.parse(txt); } catch { parsed = {}; }
    }

    // Filtra por campo pedido
    const result: any = {};
    if (campo === 'all' || campo === 'ano') result.ano_lancamento = parsed.ano_lancamento ?? '';
    if (campo === 'all' || campo === 'editora') result.editora = parsed.editora ?? '';
    if (campo === 'all' || campo === 'curiosidades')
      result.curiosidades = Array.isArray(parsed.curiosidades) ? parsed.curiosidades : [];
    if (campo === 'all' || campo === 'sinopse') result.sinopse = parsed.sinopse ?? '';

    return json({ ok: true, ...result, fontes, raw: rawText });
  } catch (e) {
    console.error('biblioteca-buscar-web fatal', e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

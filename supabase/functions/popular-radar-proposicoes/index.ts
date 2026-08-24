import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { geminiFetch } from "../_shared/geminiFetch.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CAMARA_API = 'https://dadosabertos.camara.leg.br/api/v2'

// ─── Gemini / Mistral helpers ───

const SYSTEM_PROMPT_HEADLINE = `Você é um editor-chefe de um portal de notícias jurídicas popular. Crie UMA headline curta, chamativa e fácil de entender para um projeto de lei.

Regras OBRIGATÓRIAS:
- Responda APENAS com a headline, sem aspas e sem explicação
- A headline DEVE ter entre 45 e 95 caracteres
- Escreva como chamada de notícia que faz a pessoa bater o olho e entender o tema principal
- Pode ter tom de clickbait jornalístico, mas sem mentir e sem exagerar além do que está na ementa
- NUNCA comece com "PL", "Projeto de Lei" ou número
- NUNCA termine com vírgula, reticências ou frase incompleta
- A headline DEVE terminar com uma palavra completa e significativa
- Destaque a promessa central da proposta em linguagem popular
- Evite juridiquês e prefira verbos fortes
- Exemplos do estilo ideal:
  "Golpistas podem perder dinheiro e bens mais rápido com nova proposta"
  "Motoristas de app podem ganhar férias, FGTS e novas garantias"
  "Sua identidade digital pode ganhar proteção contra cópias falsas"
  "Prefeituras podem ser obrigadas a provar caixa antes de criar despesas"`;

const SYSTEM_PROMPT_ANALISE_PL = `Você é um analista político-jurídico renomado. Analise o projeto de lei de forma clara e acessível.

Regras:
- Responda SEMPRE em português brasileiro
- Use formatação markdown
- Organize a análise nas seguintes seções:

## 📋 Resumo
Explique em 2-3 frases simples o que o projeto propõe.

## 🎯 Quem é Afetado
Liste os grupos de pessoas ou setores diretamente impactados.

## ✅ Pontos Positivos
Liste os possíveis benefícios da proposta.

## ⚠️ Pontos de Atenção
Liste possíveis riscos, críticas ou preocupações.

## 📊 Chances de Aprovação
Avalie de forma realista as chances, considerando o contexto político atual.

## 💡 Impacto Prático
Explique como isso mudaria a vida do cidadão comum no dia a dia.`;

const BAD_ENDINGS = /\b(de|da|do|das|dos|e|em|com|para|por|sem|sob|sobre|contra|entre|até|ou|num|numa|no|na|nos|nas|que|se|ao|à|aos|às|pelo|pela|pelos|pelas|um|uma|uns|umas)\s*$/i;
const TRUNCATED_END = /\b[a-záéíóúâêôãõç]{1,4}$/i;
const INVALID_HEADLINE_PATTERNS = [/desculpe/i, /não consegui gerar/i, /erro interno/i, /resposta\.?$/i];

function isValidHeadline(value: string) {
  const h = value.replace(/\s+/g, ' ').trim().replace(/^['"]|['"]$/g, '');
  if (h.length < 45 || h.length > 95) return false;
  if (INVALID_HEADLINE_PATTERNS.some((p) => p.test(h))) return false;
  if (/[,:;\-/]$|\.\.\.$/.test(h)) return false;
  if (BAD_ENDINGS.test(h)) return false;
  const last = h.split(' ').pop() ?? '';
  if (last.length <= 4 && TRUNCATED_END.test(last) && !/[.!?)]$/.test(h)) return false;
  return true;
}

function createFallbackHeadline(ementa?: string, plNumero?: number, plAno?: number) {
  const base = (ementa || '').replace(/\s+/g, ' ').trim().replace(/[\.;:,]+$/g, '');
  if (!base) {
    const suffix = plNumero && plAno ? ` no PL ${plNumero}/${plAno}` : '';
    return `Entenda os principais impactos propostos${suffix}`;
  }
  const cleaned = base
    .replace(/^dispõe sobre\s*/i, '')
    .replace(/^altera\s*/i, '')
    .replace(/^institui\s*/i, '')
    .replace(/^cria\s*/i, '')
    .replace(/,?\s*e\s+dá\s+outras\s+providências\.?$/i, '')
    .trim();
  const headline = `Projeto quer ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`;
  const normalized = headline.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 95) return normalized;
  const words = normalized.split(' ');
  let result = '';
  for (const w of words) {
    const candidate = result ? `${result} ${w}` : w;
    if (candidate.length > 88) break;
    result = candidate;
  }
  result = result.replace(/\s+(?:de|da|do|das|dos|e|em|com|para|por|ou|no|na|nos|nas|que|se|ao|à)\s*$/i, '');
  return result || normalized.slice(0, 88).replace(/\s+\S*$/, '');
}

async function extractPdfText(pdfUrl: string, mistralKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${mistralKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'mistral-ocr-latest', document: { type: 'document_url', document_url: pdfUrl } }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.pages || [];
    return pages.map((p: any) => p.markdown || '').join('\n\n').slice(0, 3000) || null;
  } catch { return null; }
}

async function callGemini(geminiKeys: string[], systemPrompt: string, userPrompt: string, opts?: { temp?: number; maxTokens?: number }): Promise<string | null> {
  const { logAiCall } = await import("../_shared/ai-log.ts");
  const model = "gemini-flash-latest";
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: opts?.temp ?? 0.7, maxOutputTokens: opts?.maxTokens ?? 4096 },
  };
  const startedAt = Date.now();
  let success = false, errMsg: string | undefined;
  let inputUnits = 0, outputUnits = 0;
  let result: string | null = null;
  try {
    for (const key of geminiKeys) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
          );
          if (res.status === 429) {
            console.warn(`Gemini 429 on key, trying next...`);
            errMsg = "429 rate limited";
            break;
          }
          if (res.ok) {
            const data = await res.json();
            inputUnits  = Number(data?.usageMetadata?.promptTokenCount ?? 0) || 0;
            outputUnits = Number(data?.usageMetadata?.candidatesTokenCount ?? 0) || 0;
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) { success = true; result = text; return text; }
          } else {
            errMsg = `HTTP ${res.status}`;
          }
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        } catch (e) {
          errMsg = String((e as Error)?.message ?? e).slice(0, 300);
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    return null;
  } finally {
    await logAiCall({
      functionName: "popular-radar-proposicoes",
      kind: "text",
      model,
      triggerType: "auto",
      inputUnits, outputUnits,
      durationMs: Date.now() - startedAt,
      success, error: success ? undefined : errMsg,
    });
  }
}

// ─── Câmara API helpers ───

async function fetchAutores(propId: number): Promise<{ nome: string; foto: string | null }> {
  try {
    const res = await fetch(`${CAMARA_API}/proposicoes/${propId}/autores`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { nome: '', foto: null };
    const json = await res.json();
    const dep = (json.dados || [])[0];
    if (!dep) return { nome: '', foto: null };
    let foto = dep.urlFoto || null;
    if (!foto && dep.uri) {
      try {
        const depRes = await fetch(dep.uri, { headers: { Accept: 'application/json' } });
        if (depRes.ok) { const dj = await depRes.json(); foto = dj.dados?.ultimoStatus?.urlFoto || null; }
      } catch {}
    }
    return { nome: dep.nome || '', foto };
  } catch { return { nome: '', foto: null }; }
}

async function fetchInteiroTeorUrl(propId: number): Promise<string | null> {
  try {
    const res = await fetch(`${CAMARA_API}/proposicoes/${propId}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.dados?.urlInteiroTeor || null;
  } catch { return null; }
}

// ─── Main ───

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
    const geminiKeys = [GEMINI_API_KEY].filter(Boolean);
    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY') || '';

    // Check if only_headlines mode (skip API fetch, just generate headlines)
    let body: any = {}
    try { body = await req.json() } catch {}
    const onlyHeadlines = body?.only_headlines === true
    const backfillAuthors = body?.backfill_authors === true
    const fullSync = body?.full_sync === true

    // ─── Backfill authors mode ───
    if (backfillAuthors) {
      const { data: needAuth } = await supabase
        .from('radar_proposicoes')
        .select('id_externo')
        .eq('sigla_tipo', 'PL')
        .is('autor', null)
        .order('id_externo', { ascending: false })
        .limit(50)

      if (!needAuth || needAuth.length === 0) {
        return new Response(JSON.stringify({ success: true, backfilled: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      let backfilled = 0
      const batchSize = 10
      for (let i = 0; i < needAuth.length; i += batchSize) {
        const batch = needAuth.slice(i, i + batchSize)
        await Promise.all(batch.map(async (p) => {
          const propId = Number(p.id_externo)
          const { nome, foto } = await fetchAutores(propId)
          if (nome || foto) {
            const updateData: any = {}
            if (nome) updateData.autor = nome
            if (foto) updateData.autor_foto = foto
            const { error } = await supabase
              .from('radar_proposicoes')
              .update(updateData)
              .eq('id_externo', p.id_externo)
            if (!error) backfilled++
            else console.error(`Backfill error for ${p.id_externo}:`, error.message)
          }
        }))
      }

      console.log(`Backfilled ${backfilled} authors`)
      return new Response(JSON.stringify({ success: true, backfilled }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const allProps: any[] = []
    let totalFromApi = 0

    if (!onlyHeadlines) {
    const tipos = ['PL', 'PEC', 'PLP', 'MPV']

    // Incremental mode (default): only last 5 days
    // Full sync mode: fetch all from 2025+2026
    if (fullSync) {
      console.log('Full sync mode: fetching all propositions from 2025+2026')
    } else {
      console.log('Incremental mode: fetching last 5 days only')
    }

    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
    const dataInicio = fiveDaysAgo.toISOString().slice(0, 10)

    for (const tipo of tipos) {
      if (fullSync) {
        // Full sync: iterate over years
        const anos = [2025, 2026]
        for (const ano of anos) {
          let pagina = 1
          while (true) {
            const url = `${CAMARA_API}/proposicoes?siglaTipo=${tipo}&ano=${ano}&ordem=DESC&ordenarPor=id&itens=100&pagina=${pagina}`
            console.log(`Fetching ${tipo} ${ano} page ${pagina}...`)
            try {
              const res = await fetch(url, { headers: { Accept: 'application/json' } })
              if (res.ok) {
                const json = await res.json()
                const dados = json.dados || []
                if (dados.length === 0) break
                allProps.push(...dados.map((d: any) => ({
                  id_externo: String(d.id), fonte: 'camara', sigla_tipo: d.siglaTipo,
                  numero: d.numero, ano: d.ano, ementa: d.ementa, dados_json: d,
                  atualizado_em: new Date().toISOString(),
                })))
                if (dados.length < 100) break
                pagina++
              } else { console.error(`HTTP ${res.status} for ${tipo} ${ano} page ${pagina}`); break }
            } catch (e) { console.error(`Error fetching ${tipo} ${ano} page ${pagina}:`, e); break }
          }
        }
      } else {
        // Incremental: only recent days
        let pagina = 1
        while (true) {
          const url = `${CAMARA_API}/proposicoes?siglaTipo=${tipo}&dataApresentacaoInicio=${dataInicio}&ordem=DESC&ordenarPor=id&itens=100&pagina=${pagina}`
          console.log(`Fetching ${tipo} since ${dataInicio} page ${pagina}...`)
          try {
            const res = await fetch(url, { headers: { Accept: 'application/json' } })
            if (res.ok) {
              const json = await res.json()
              const dados = json.dados || []
              if (dados.length === 0) break
              allProps.push(...dados.map((d: any) => ({
                id_externo: String(d.id), fonte: 'camara', sigla_tipo: d.siglaTipo,
                numero: d.numero, ano: d.ano, ementa: d.ementa, dados_json: d,
                atualizado_em: new Date().toISOString(),
              })))
              if (dados.length < 100) break
              pagina++
            } else { console.error(`HTTP ${res.status} for ${tipo} since ${dataInicio} page ${pagina}`); break }
          } catch (e) { console.error(`Error fetching ${tipo} since ${dataInicio} page ${pagina}:`, e); break }
        }
      }
    }

    console.log(`Total proposições: ${allProps.length}`)

    // Check which PLs already exist in the database
    const allIds = allProps.filter(p => p.sigla_tipo === 'PL').map(p => p.id_externo)
    const { data: existingProps } = await supabase
      .from('radar_proposicoes')
      .select('id_externo')
      .in('id_externo', allIds.slice(0, 1000))

    // For large sets, fetch in batches of 1000
    const existingIds = new Set((existingProps || []).map(p => p.id_externo))
    if (allIds.length > 1000) {
      for (let i = 1000; i < allIds.length; i += 1000) {
        const { data: more } = await supabase
          .from('radar_proposicoes')
          .select('id_externo')
          .in('id_externo', allIds.slice(i, i + 1000))
        for (const p of (more || [])) existingIds.add(p.id_externo)
      }
    }

    // Only fetch authors for NEW PLs (not already in DB)
    const newPlProps = allProps.filter(p => p.sigla_tipo === 'PL' && !existingIds.has(p.id_externo))
    console.log(`New PLs needing author fetch: ${newPlProps.length} (out of ${allIds.length} total)`)

    // Only fetch authors if manageable number of new PLs
    const authorLimit = fullSync ? 200 : 30
    if (newPlProps.length > 0 && newPlProps.length <= authorLimit) {
      const batchAuthSize = 10
      for (let i = 0; i < newPlProps.length; i += batchAuthSize) {
        const batch = newPlProps.slice(i, i + batchAuthSize)
        const results = await Promise.all(
          batch.map(async (p) => {
            const propId = Number(p.id_externo)
            const [{ nome, foto }, inteiroTeorUrl] = await Promise.all([
              fetchAutores(propId),
              fetchInteiroTeorUrl(propId),
            ])
            return { id_externo: p.id_externo, nome, foto, inteiroTeorUrl }
          })
        )
        for (const r of results) {
          const prop = allProps.find((p) => p.id_externo === r.id_externo)
          if (prop) {
            prop.autor = r.nome || null
            prop.autor_foto = r.foto || null
            prop.url_inteiro_teor = r.inteiroTeorUrl || null
          }
        }
      }
    } else if (newPlProps.length > authorLimit) {
      console.log(`Skipping author fetch for ${newPlProps.length} PLs (limit: ${authorLimit}, will backfill later)`)
    }

    // Clean batch: remove null fields to avoid overwriting existing data
    const cleanedProps = allProps.map(p => {
      const obj: any = { ...p };
      if (!obj.autor) delete obj.autor;
      if (!obj.autor_foto) delete obj.autor_foto;
      if (!obj.url_inteiro_teor) delete obj.url_inteiro_teor;
      return obj;
    });

    // Upsert all (don't delete old ones, just upsert)
    const batchSize = 100
    for (let i = 0; i < cleanedProps.length; i += batchSize) {
      const batch = cleanedProps.slice(i, i + batchSize)
      const { error } = await supabase
        .from('radar_proposicoes')
        .upsert(batch, { onConflict: 'id_externo,fonte' })
      if (error) console.error('Insert error:', error.message)
    }
    totalFromApi = allProps.length
    } // end if (!onlyHeadlines)

    // ─── Generate headlines + analyses for PLs without them ───
    console.log('Checking PLs that need headline/analysis...')

    // In only_headlines mode, fetch PLs from database
    let plProps: any[]
    if (onlyHeadlines) {
      // Paginate to get ALL PLs from DB (Supabase has 1000 row limit)
      const allDbPls: any[] = []
      let from = 0
      const pageSize = 1000
      while (true) {
        const { data } = await supabase
          .from('radar_proposicoes')
          .select('id_externo, sigla_tipo, numero, ano, ementa, autor, url_inteiro_teor')
          .eq('sigla_tipo', 'PL')
          .eq('fonte', 'camara')
          .range(from, from + pageSize - 1)
        if (!data || data.length === 0) break
        allDbPls.push(...data)
        if (data.length < pageSize) break
        from += pageSize
      }
      plProps = allDbPls.map(d => ({ ...d, fonte: 'camara' }))
      console.log(`Only-headlines mode: found ${plProps.length} PLs in DB`)
    } else {
      plProps = allProps.filter(p => p.sigla_tipo === 'PL')
    }
    const plIds = plProps.map(p => p.id_externo)

    // Get existing headlines in batches of 1000
    const existingHeadlinesList: any[] = []
    for (let i = 0; i < plIds.length; i += 1000) {
      const { data } = await supabase
        .from('radar_pl_headlines')
        .select('id_externo, headline, analise')
        .in('id_externo', plIds.slice(i, i + 1000))
      if (data) existingHeadlinesList.push(...data)
    }

    const existingMap = new Map<string, { headline: string | null; analise: string | null }>()
    for (const h of existingHeadlinesList) {
      existingMap.set(h.id_externo, { headline: h.headline, analise: h.analise })
    }

    // Filter PLs that need generation
    const needGeneration = plProps.filter(p => {
      const existing = existingMap.get(p.id_externo)
      return !existing || !existing.headline || !existing.analise
    })
    .sort((a, b) => (b.ano || 0) - (a.ano || 0) || (b.numero || 0) - (a.numero || 0))
    .slice(0, fullSync ? 20 : 15) // Limit per run to avoid timeout

    console.log(`PLs needing headline/analysis: ${needGeneration.length} (capped at ${fullSync ? 20 : 15})`)

    // Process in batches of 5 with 2s delay
    const genBatchSize = 5
    let generatedCount = 0

    for (let i = 0; i < needGeneration.length; i += genBatchSize) {
      const batch = needGeneration.slice(i, i + genBatchSize)

      await Promise.all(batch.map(async (p) => {
        const existing = existingMap.get(p.id_externo)
        const needHeadline = !existing?.headline
        const needAnalise = !existing?.analise

        // Build prompt context
        let pdfContext = ''
        if (p.url_inteiro_teor && MISTRAL_API_KEY) {
          const text = await extractPdfText(p.url_inteiro_teor, MISTRAL_API_KEY)
          if (text && text.length > 100) {
            pdfContext = `\n\nTexto completo do projeto de lei (extraído do PDF):\n${text}`
          }
        }

        const userPrompt = `Projeto de Lei: PL ${p.numero || ''}/${p.ano || ''}\nAutor: ${p.autor || 'Não informado'}\nEmenta: ${p.ementa || ''}${pdfContext}`

        const upsertData: any = { id_externo: p.id_externo }

        // Generate headline
        if (needHeadline) {
          let headline: string | null = null
          for (let attempt = 0; attempt < 2; attempt++) {
            const raw = await callGemini(geminiKeys, SYSTEM_PROMPT_HEADLINE, userPrompt, { temp: 0.6, maxTokens: 150 })
            if (raw) {
              const cleaned = raw.replace(/^['"]|['"]$/g, '').trim()
              if (isValidHeadline(cleaned)) { headline = cleaned; break; }
            }
          }
          upsertData.headline = headline || createFallbackHeadline(p.ementa, p.numero, p.ano)
        }

        // Generate analysis
        if (needAnalise) {
          const analise = await callGemini(geminiKeys, SYSTEM_PROMPT_ANALISE_PL, userPrompt)
          upsertData.analise = analise || null
        }

        const { error } = await supabase
          .from('radar_pl_headlines')
          .upsert(upsertData, { onConflict: 'id_externo' })

        if (error) {
          console.error(`Headline upsert error for ${p.id_externo}:`, error.message)
        } else {
          generatedCount++
          console.log(`Generated for PL ${p.numero}/${p.ano} (${p.id_externo})`)
        }
      }))

      // Rate limit delay between batches
      if (i + genBatchSize < needGeneration.length) {
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    console.log(`Generation complete. Generated: ${generatedCount}`)

    return new Response(
      JSON.stringify({ success: true, total: totalFromApi, plsInDb: plProps.length, generated: generatedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

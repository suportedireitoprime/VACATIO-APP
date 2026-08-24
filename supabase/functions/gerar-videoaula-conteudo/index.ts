// Gera resumo/questões/flashcards de uma videoaula (com cache por videoId).
// Body: { videoId, titulo, canal, artigoNumero, tabelaNome, artigoTexto, tipo: 'resumo'|'questoes'|'flashcards' }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchTranscript(videoId: string): Promise<string> {
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' },
    });
    if (!pageRes.ok) return '';
    const html = await pageRes.text();
    const m = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (!m) return '';
    let tracks: any[] = [];
    try { tracks = JSON.parse(m[1]); } catch { return ''; }
    const chosen = tracks.find(t => t.languageCode === 'pt' && t.kind !== 'asr')
      || tracks.find(t => t.languageCode === 'pt')
      || tracks[0];
    if (!chosen?.baseUrl) return '';
    const capRes = await fetch(chosen.baseUrl);
    if (!capRes.ok) return '';
    const xml = await capRes.text();
    const out: string[] = [];
    const re = /<text[^>]*>([\s\S]*?)<\/text>/g;
    let mm;
    while ((mm = re.exec(xml)) !== null) {
      const t = mm[1]
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/\n/g, ' ').trim();
      if (t) out.push(t);
    }
    return out.join(' ').substring(0, 12000);
  } catch { return ''; }
}

async function callGemini(system: string, user: string): Promise<string> {
  const { logAiCall } = await import("../_shared/ai-log.ts");
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');
  const model = 'google/gemini-2.5-flash-lite';
  const startedAt = Date.now();
  let success = true, errMsg: string | undefined;
  let inputUnits = 0, outputUnits = 0;
  try {
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`AI gateway ${resp.status}: ${txt}`);
    }
    const data = await resp.json();
    inputUnits  = Number(data?.usage?.prompt_tokens ?? 0) || 0;
    outputUnits = Number(data?.usage?.completion_tokens ?? 0) || 0;
    return (data?.choices?.[0]?.message?.content || '').trim();
  } catch (e) {
    success = false;
    errMsg = String((e as Error)?.message ?? e).slice(0, 500);
    throw e;
  } finally {
    await logAiCall({
      functionName: "gerar-videoaula-conteudo",
      kind: "text",
      model,
      triggerType: "manual",
      inputUnits, outputUnits,
      durationMs: Date.now() - startedAt,
      success, error: errMsg,
    });
  }
}

const SYS_RESUMO = `Você é uma professora de Direito brasileira. Você recebe a TRANSCRIÇÃO de uma videoaula sobre um artigo específico e produz um RESUMO DETALHADO da aula em português (pt-BR), em MARKDOWN limpo.

REGRAS:
- Baseie-se PRINCIPALMENTE na transcrição fornecida; capture o que o professor ensina, exemplos que ele dá, ordem da explicação.
- Nunca invente. Se a transcrição estiver vazia, gere resumo a partir do texto do artigo e sinalize "(transcrição indisponível)" em pequena nota final.
- Comece direto no primeiro ## sem introdução.
- Use ## para blocos, ### para subtópicos, **negrito** em termos jurídicos, listas com "- " para pontos-chave e blockquote para a frase-síntese final.

ESTRUTURA:
## Do que trata a aula
2-3 parágrafos: contexto do artigo e enfoque do professor.

## Pontos-chave explicados
Lista dos principais conceitos que o professor destaca (com sub-explicação em 1-2 linhas cada).

## Exemplos e aplicações práticas
Exemplos citados na aula (se houver) e situações de prova.

## Cuidados / pegadinhas
Erros comuns, exceções, distinções apontadas pelo professor.

## Para levar
> Frase-síntese em blockquote.`;

async function generate(tipo: string, ctx: {
  titulo: string; canal: string; artigoNumero: string; artigoTexto: string; transcricao: string;
}): Promise<any> {
  const base = `TÍTULO DA AULA: ${ctx.titulo}\nCANAL: ${ctx.canal}\nARTIGO: ${ctx.artigoNumero}\n\nTEXTO DO ARTIGO:\n${(ctx.artigoTexto || '').substring(0, 1500)}\n\nTRANSCRIÇÃO DA AULA:\n${ctx.transcricao || '(indisponível)'}`;

  if (tipo === 'resumo') {
    return await callGemini(SYS_RESUMO, base);
  }
  if (tipo === 'questoes') {
    const sys = `Você gera questões de múltipla escolha estilo OAB baseadas em uma videoaula. Responda APENAS com JSON válido: [{"pergunta":"...","alternativas":["a)...","b)...","c)...","d)..."],"correta":0,"comentario":"..."}]. Gere 12 questões.`;
    const txt = await callGemini(sys, base);
    const cleaned = txt.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const m = cleaned.match(/\[[\s\S]*\]/);
    return m ? JSON.parse(m[0]) : [];
  }
  if (tipo === 'flashcards') {
    const sys = `Você gera flashcards de estudo baseados em uma videoaula. Responda APENAS com JSON válido: [{"frente":"...","verso":"...","comentario":"..."}]. Gere 12 flashcards.`;
    const txt = await callGemini(sys, base);
    const cleaned = txt.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const m = cleaned.match(/\[[\s\S]*\]/);
    return m ? JSON.parse(m[0]) : [];
  }
  throw new Error('tipo inválido');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { videoId, titulo, canal, artigoNumero, tabelaNome, artigoTexto, tipo } = await req.json();
    if (!videoId || !tipo) {
      return new Response(JSON.stringify({ error: 'videoId e tipo obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Cache check
    const { data: cached } = await admin
      .from('videoaula_conteudo')
      .select('resumo_md, questoes, flashcards, transcricao')
      .eq('video_id', videoId)
      .maybeSingle();

    if (tipo === 'resumo' && cached?.resumo_md) {
      return new Response(JSON.stringify({ resultado: cached.resumo_md, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (tipo === 'questoes' && cached?.questoes) {
      return new Response(JSON.stringify({ resultado: cached.questoes, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (tipo === 'flashcards' && cached?.flashcards) {
      return new Response(JSON.stringify({ resultado: cached.flashcards, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let transcricao = cached?.transcricao || '';
    if (!transcricao) {
      transcricao = await fetchTranscript(videoId);
    }

    const resultado = await generate(tipo, {
      titulo: titulo || '',
      canal: canal || '',
      artigoNumero: artigoNumero || '',
      artigoTexto: artigoTexto || '',
      transcricao,
    });

    const patch: Record<string, any> = {
      video_id: videoId,
      titulo: titulo || null,
      canal: canal || null,
      artigo_numero: artigoNumero || null,
      tabela_nome: tabelaNome || null,
      transcricao,
      updated_at: new Date().toISOString(),
    };
    if (tipo === 'resumo') patch.resumo_md = resultado;
    if (tipo === 'questoes') patch.questoes = resultado;
    if (tipo === 'flashcards') patch.flashcards = resultado;

    await admin.from('videoaula_conteudo').upsert(patch, { onConflict: 'video_id' });

    return new Response(JSON.stringify({ resultado, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('gerar-videoaula-conteudo error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Edge function: local-moderar-comentario
// Classifica um comentário como aprovado/rejeitado usando Gemini.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { geminiFetch } from '../_shared/geminiFetch.ts';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { texto } = (await req.json()) as { texto: string };
    if (!texto) return json({ aprovado: false, motivo: 'vazio' });
    const key = Deno.env.get('GEMINI_API_KEY');
    if (!key) return json({ aprovado: true }); // fail-open sem key

    const prompt = `Você modera comentários de um app jurídico. Analise o texto abaixo. Responda APENAS JSON com {"aprovado": bool, "motivo": "..."}. Reprove se contiver: xingamentos, ameaças, discurso de ódio, spam, links suspeitos, dados pessoais alheios, conteúdo sexual. Texto: "${texto.slice(0, 500)}"`;
    const resp = await geminiFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    );
    if (!resp.ok) return json({ aprovado: true }); // fail-open
    const data = await resp.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch {}
    return json({ aprovado: parsed?.aprovado !== false, motivo: parsed?.motivo ?? null });
  } catch (e) {
    return json({ aprovado: true, erro: String(e) });
  }
});

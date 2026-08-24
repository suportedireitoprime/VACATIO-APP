// Grifar por voz: recebe áudio + linhas do artigo, usa Gemini para identificar
// trechos e cores a grifar, retorna passages com line/start/end.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const CORES = ['amarelo', 'verde', 'azul', 'rosa', 'laranja'] as const;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findInLines(quote: string, lines: string[]): { lineIndex: number; startOffset: number; endOffset: number } | null {
  const nq = normalize(quote);
  if (!nq || nq.length < 3) return null;
  for (let i = 0; i < lines.length; i++) {
    const nline = normalize(lines[i]);
    const idx = nline.indexOf(nq);
    if (idx === -1) continue;
    // Map normalized indices back to raw indices
    let rawStart = -1, rawEnd = -1;
    const normPos = 0;
    let acc = '';
    for (let j = 0; j < lines[i].length; j++) {
      const ch = lines[i][j];
      const n = normalize(ch);
      const prev = acc;
      acc += n;
      // handle whitespace collapse
      const collapsedAcc = acc.replace(/\s+/g, ' ');
      if (rawStart === -1 && collapsedAcc.length > idx) {
        rawStart = j;
      }
      if (rawEnd === -1 && collapsedAcc.length >= idx + nq.length) {
        rawEnd = j + 1;
        break;
      }
    }
    if (rawStart >= 0 && rawEnd > rawStart) {
      return { lineIndex: i, startOffset: rawStart, endOffset: rawEnd };
    }
    // fallback naive
    const rawIdx = lines[i].toLowerCase().indexOf(quote.toLowerCase());
    if (rawIdx !== -1) return { lineIndex: i, startOffset: rawIdx, endOffset: rawIdx + quote.length };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurado' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let transcript = '';
    let lines: string[] = [];
    let audioB64: string | null = null;
    let audioFormat = 'wav';

    if (contentType.includes('application/json')) {
      const json = await req.json();
      transcript = String(json?.transcript || '').trim();
      lines = Array.isArray(json?.linhas) ? json.linhas : [];
    } else {
      const form = await req.formData();
      const linhasRaw = form.get('linhas') as string | null;
      transcript = String(form.get('transcript') || '').trim();
      const audio = form.get('audio') as File | null;
      if (!linhasRaw) {
        return new Response(JSON.stringify({ error: 'linhas obrigatórias' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      lines = JSON.parse(linhasRaw);
      if (audio) {
        const buf = new Uint8Array(await audio.arrayBuffer());
        let bin = '';
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        audioB64 = btoa(bin);
        audioFormat = (audio.type.includes('wav') ? 'wav' : audio.type.includes('mp3') ? 'mp3' : 'wav');
      }
    }

    if (!transcript && !audioB64) {
      return new Response(JSON.stringify({ error: 'transcript ou audio obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const textoArtigo = lines.map((l, i) => `[L${i}] ${l}`).join('\n');

    const systemPrompt = `Você é um assistente que ajuda estudantes a grifar trechos de artigos jurídicos por comando de voz.
Cores permitidas: ${CORES.join(', ')}.
Use raciocínio lógico para identificar EXATAMENTE quais trechos o usuário quer grifar, mesmo se a fala for imprecisa.
Retorne APENAS um JSON válido em UM destes formatos:

1) Quando a cor está clara ou o usuário citou explicitamente:
{"passages":[{"quote":"trecho literal contínuo do texto","color":"amarelo|verde|azul|rosa|laranja"}]}

2) Quando você identificou os trechos MAS o usuário NÃO citou cor, ou está ambíguo:
{"needsColor":true,"candidates":[{"quote":"trecho literal contínuo do texto"}],"message":"resumo curto do que entendeu, ex.: 'Entendi, você quer grifar a parte que fala em X e Y'"}

Regras:
- "quote" deve ser LITERAL contínuo copiado do texto (mesma pontuação/capitalização).
- Se o usuário disser "do início até X", pegue do começo da linha relevante até logo antes de X.
- Se pedir vários trechos, retorne todos.
- NÃO invente cor. Só use uma cor se o usuário disse ou é óbvio pelo contexto. Do contrário, use needsColor.
- Se não entender nada, retorne {"passages":[]}.`;

    const userTextParts = [`Texto do artigo (linhas rotuladas):\n${textoArtigo}`];
    if (transcript) userTextParts.push(`\nO estudante disse: "${transcript}"`);
    else userTextParts.push(`\nOuça o áudio do estudante e identifique os trechos a grifar.`);
    const userText = userTextParts.join('\n');

    const userContent: any[] = [{ type: 'text', text: userText }];
    if (!transcript && audioB64) {
      userContent.push({ type: 'input_audio', input_audio: { data: audioB64, format: audioFormat } });
    }

    const body = {
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
    };

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Gateway error:', resp.status, errText);
      return new Response(JSON.stringify({ error: 'AI error', status: resp.status, details: errText }), {
        status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || '{}';
    let parsed: { passages?: Array<{ quote: string; color: string }>; needsColor?: boolean; candidates?: Array<{ quote: string }>; message?: string } = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const colorMap: Record<string, string> = {
      amarelo: 'rgba(250, 204, 21, 0.42)',
      verde: 'rgba(74, 222, 128, 0.42)',
      azul: 'rgba(96, 165, 250, 0.42)',
      rosa: 'rgba(244, 114, 182, 0.42)',
      laranja: 'rgba(251, 146, 60, 0.42)',
    };

    // Path 1: needsColor — AI identified passages but no color chosen
    if (parsed.needsColor && Array.isArray(parsed.candidates) && parsed.candidates.length) {
      const candidates = [] as Array<{ lineIndex: number; startOffset: number; endOffset: number; text: string }>;
      for (const c of parsed.candidates) {
        const loc = findInLines(c.quote, lines);
        if (!loc) continue;
        const text = lines[loc.lineIndex].slice(loc.startOffset, loc.endOffset);
        candidates.push({ ...loc, text });
      }
      if (candidates.length) {
        return new Response(JSON.stringify({ needsColor: true, candidates, message: parsed.message || '', transcript }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Path 2: passages with colors
    const rawPassages = Array.isArray(parsed.passages) ? parsed.passages : [];
    const passages = [] as Array<{ lineIndex: number; startOffset: number; endOffset: number; text: string; color: string; colorName: string }>;
    for (const p of rawPassages) {
      const colorName = (p.color || 'amarelo').toLowerCase();
      const color = colorMap[colorName] || colorMap.amarelo;
      const loc = findInLines(p.quote, lines);
      if (!loc) continue;
      const text = lines[loc.lineIndex].slice(loc.startOffset, loc.endOffset);
      passages.push({ ...loc, text, color, colorName });
    }

    return new Response(JSON.stringify({ passages, transcript }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('grifar-por-voz error:', e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

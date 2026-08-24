import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured')

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get active subscribers
    const { data: subscribers, error: subError } = await supabase
      .from('newsletter_subscriptions')
      .select('*')
      .eq('ativo', true)

    if (subError) throw subError
    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No active subscribers', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch content for newsletter
    const today = new Date().toISOString().slice(0, 10)

    // 1. Notícias
    const { data: noticias } = await supabase
      .from('noticias_camara')
      .select('titulo,resumo,link,imagem_url')
      .not('imagem_url', 'is', null)
      .neq('imagem_url', '')
      .order('data_publicacao', { ascending: false })
      .limit(5)

    // 2. Leis do dia (resenha diária)
    const { data: resenha } = await supabase
      .from('resenha_diaria')
      .select('tipo_ato,numero_ato,ementa,url')
      .order('data_dou', { ascending: false })
      .limit(10)

    // 3. Alterações legislativas recentes
    const { data: alteracoes } = await supabase
      .from('legislacao_alteracoes')
      .select('lei_alteradora,artigo_numero,tipo_alteracao,tabela_nome')
      .order('data_publicacao', { ascending: false })
      .limit(5)

    let sentCount = 0
    const errors: string[] = []

    for (const sub of subscribers) {
      const prefs = sub.preferencias || {}
      const sections: string[] = []

      // Build personalized HTML
      if (prefs.noticias && noticias?.length) {
        sections.push(buildNoticiasSection(noticias))
      }
      if (prefs.leis_do_dia && resenha?.length) {
        sections.push(buildResenhaSection(resenha))
      }
      if (alteracoes?.length) {
        sections.push(buildAlteracoesSection(alteracoes))
      }

      if (sections.length === 0) continue

      const html = buildEmailHTML(sections, today, sub.email)

      try {
        const res = await fetch(`${GATEWAY_URL}/emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: 'Vacatio Newsletter <onboarding@resend.dev>',
            to: [sub.email],
            subject: `📋 Vacatio Digest — ${today}`,
            html,
          }),
        })

        if (!res.ok) {
          const errBody = await res.text()
          errors.push(`${sub.email}: ${res.status} ${errBody}`)
        } else {
          sentCount++
          // Update last sent
          await supabase
            .from('newsletter_subscriptions')
            .update({ ultimo_envio: new Date().toISOString() })
            .eq('id', sub.id)
        }
      } catch (e) {
        errors.push(`${sub.email}: ${e.message}`)
      }

      // Rate limit: small delay between sends
      await new Promise(r => setTimeout(r, 200))
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, errors: errors.length, errorDetails: errors.slice(0, 5) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Newsletter error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ---- HTML Builders ----

function buildEmailHTML(sections: string[], date: string, email: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#0f0f0f;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#e0e0e0}
  .container{max-width:600px;margin:0 auto;background:#1a1a1a;border-radius:12px;overflow:hidden}
  .header{background:linear-gradient(135deg,#7f1d1d,#991b1b);padding:28px 24px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:26px;letter-spacing:1px}
  .header p{color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px}
  .section{padding:20px 24px;border-bottom:1px solid #2a2a2a}
  .section h2{color:#fbbf24;font-size:16px;margin:0 0 14px;text-transform:uppercase;letter-spacing:1px;font-weight:700}
  .item{margin-bottom:14px;padding:12px 14px;background:#222;border-radius:8px;border-left:3px solid #fbbf24}
  .item h3{margin:0 0 4px;font-size:14px;color:#fff}
  .item p{margin:0;font-size:12px;color:#aaa;line-height:1.5}
  .item a{color:#fbbf24;text-decoration:none;font-size:12px}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;margin-left:6px}
  .badge-tramitando{background:#3b82f6;color:#fff}
  .badge-votacao{background:#f59e0b;color:#000}
  .badge-publicada{background:#10b981;color:#fff}
  .badge-sancao{background:#8b5cf6;color:#fff}
  .footer{padding:20px 24px;text-align:center;font-size:11px;color:#666}
  .footer a{color:#fbbf24}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>⚖️ Vacatio</h1>
    <p>Seu resumo jurídico diário — ${date}</p>
  </div>
  ${sections.join('')}
  <div class="footer">
    <p>Você recebeu este e-mail porque se inscreveu no Newsletter do Vacatio.</p>
    <p>Para cancelar, acesse suas <a href="https://vademecum-legal-guide.lovable.app/newsletter">preferências</a>.</p>
  </div>
</div>
</body>
</html>`
}

function buildNoticiasSection(noticias: any[]): string {
  const items = noticias.map(n => `
    <div class="item">
      <h3>${escapeHtml(n.titulo)}</h3>
      <p>${escapeHtml(n.resumo?.slice(0, 120) || '')}...</p>
      ${n.link ? `<a href="${n.link}" target="_blank">Ler mais →</a>` : ''}
    </div>`).join('')
  return `<div class="section"><h2>📰 Notícias</h2>${items}</div>`
}

function buildResenhaSection(resenha: any[]): string {
  const items = resenha.map(r => `
    <div class="item">
      <h3>${escapeHtml(r.tipo_ato)} ${escapeHtml(r.numero_ato)}</h3>
      <p>${escapeHtml(r.ementa?.slice(0, 150) || '')}</p>
      ${r.url ? `<a href="${r.url}" target="_blank">Ver no DOU →</a>` : ''}
    </div>`).join('')
  return `<div class="section"><h2>📜 Leis do Dia</h2>${items}</div>`
}

function buildAlteracoesSection(alteracoes: any[]): string {
  const items = alteracoes.map(a => `
    <div class="item">
      <h3>${escapeHtml(a.tipo_alteracao || 'Alteração')} — ${escapeHtml(a.artigo_numero)}</h3>
      <p>Lei alteradora: ${escapeHtml(a.lei_alteradora || 'N/A')}</p>
    </div>`).join('')
  return `<div class="section"><h2>🔔 Alterações Legislativas</h2>${items}</div>`
}

function escapeHtml(str: string): string {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// deno-lint-ignore-file no-explicit-any
// Processa a fila `admin_alertas`: avisa o admin no WhatsApp (Horus) e por push.
// Chamado a cada tick (reminders-tick). Cada alerta é enviado UMA única vez.
import { evolution } from './evolution.ts';

const ADMIN_PHONE_FALLBACK = '5511991897603';
const ADMIN_EMAILS_FALLBACK = ['wn7corporation@gmail.com', 'suporte.vacatio@gmail.com'];

const ROTA_RULES: { test: RegExp; label: string }[] = [
  { test: /^\/$/, label: 'Início' },
  { test: /^\/auth|^\/reset-password/, label: 'Login / Cadastro' },
  { test: /^\/onboarding/, label: 'Onboarding' },
  { test: /^\/legislacao-estadual/, label: 'Leis Estaduais' },
  { test: /^\/legislacao\/[^/]+\/[^/]+\/[^/]+/, label: 'Leitura de Artigo' },
  { test: /^\/legislacao\/[^/]+\/[^/]+/, label: 'Leitura de Lei' },
  { test: /^\/legislacao|^\/normas/, label: 'Vade Mecum' },
  { test: /^\/praticar/, label: 'Praticar' },
  { test: /^\/aprender/, label: 'Aprender' },
  { test: /^\/resumos/, label: 'Resumos Jurídicos' },
  { test: /^\/jurisprudencia/, label: 'Jurisprudência' },
  { test: /^\/dicionario|^\/termo/, label: 'Dicionário Jurídico' },
  { test: /^\/tematica-juridica/, label: 'Temática Jurídica' },
  { test: /^\/biblioteca-offline|^\/modo-offline/, label: 'Modo Offline' },
  { test: /^\/biblioteca/, label: 'Biblioteca' },
  { test: /^\/noticias|^\/boletins|^\/blog|^\/opiniao|^\/novidades/, label: 'Notícias e Boletins' },
  { test: /^\/radar/, label: 'Radar Legislativo' },
  { test: /^\/assistente-horus|^\/ajustes\/horus/, label: 'Horus (WhatsApp)' },
  { test: /^\/assistente/, label: 'Assistente IA' },
  { test: /^\/narracao/, label: 'Narração' },
  { test: /^\/pessoal|^\/meu-espaco|^\/anotacoes/, label: 'Meu Espaço' },
  { test: /^\/lembretes|^\/meus-lembretes/, label: 'Lembretes' },
  { test: /^\/ferramentas|^\/funcoes/, label: 'Ferramentas' },
  { test: /^\/planos|^\/assinatura/, label: 'Planos e Assinatura' },
  { test: /^\/perfil|^\/configuracoes|^\/ajustes/, label: 'Perfil e Ajustes' },
  { test: /^\/locais/, label: 'Locais Jurídicos' },
  { test: /^\/admin/, label: 'Área Admin' },
];

function rotaLabel(route?: string | null): string {
  const r = String(route || '').split('?')[0];
  if (!r) return 'Outros';
  for (const rule of ROTA_RULES) if (rule.test.test(r)) return rule.label;
  return 'Outros';
}

function providerLabel(identities: any[]): string {
  const ids = (identities || []).map((i) => String(i?.provider || '').toLowerCase());
  if (ids.includes('google')) return 'Google';
  if (ids.includes('apple')) return 'Apple';
  return 'E-mail';
}

function fmtDuracao(seg: number): string {
  if (seg < 60) return `${Math.round(seg)}s`;
  const min = Math.round(seg / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}min`;
}

function fmtDataBRT(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
}

function planoLabel(productId?: string | null, basePlanId?: string | null): string {
  const s = `${productId || ''} ${basePlanId || ''}`.toLowerCase();
  if (s.includes('anual') || s.includes('year') || s.includes('annual')) return 'Anual';
  if (s.includes('mensal') || s.includes('month')) return 'Mensal';
  return productId || 'Assinatura';
}

async function getConfig(admin: any) {
  const { data } = await admin.from('horus_config').select('valor').eq('chave', 'admin_alertas').maybeSingle();
  const v = (data?.valor || {}) as any;
  return {
    phone: String(v.phone || ADMIN_PHONE_FALLBACK).replace(/\D/g, ''),
    emails: Array.isArray(v.emails) && v.emails.length ? v.emails.map((e: string) => e.toLowerCase()) : ADMIN_EMAILS_FALLBACK,
    ativo: v.ativo !== false,
  };
}

async function adminUserIds(admin: any, emails: string[]): Promise<string[]> {
  const ids: string[] = [];
  try {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const u of data?.users || []) {
      if (emails.includes(String(u.email || '').toLowerCase())) ids.push(u.id);
    }
  } catch (_) { /* ignore */ }
  return ids;
}

async function authInfo(admin: any, userId: string) {
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    const u = data?.user;
    return {
      email: u?.email || null,
      phone: u?.phone || null,
      provider: providerLabel(u?.identities || []),
      created_at: u?.created_at || null,
    };
  } catch (_) {
    return { email: null, phone: null, provider: 'E-mail', created_at: null };
  }
}

async function enviarPush(admin: any, ids: string[], title: string, body: string, url: string) {
  if (!ids.length) return;
  const base = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  try {
    await fetch(`${base}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key!, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ title, body, url, data: { url }, audience: { user_ids: ids } }),
    });
  } catch (e) {
    console.error('[admin-alertas] push falhou', e);
  }
}

async function montarCadastro(admin: any, userId: string) {
  const [{ data: perfil }, info] = await Promise.all([
    admin.from('profiles').select('display_name, perfil_tipos, perfil_contexto, faixa_etaria, telefone, whatsapp_number, pais, uf, cidade, created_at').eq('id', userId).maybeSingle(),
    authInfo(admin, userId),
  ]);
  const inicioDia = new Date(); inicioDia.setUTCHours(0, 0, 0, 0);
  const { count: totalHoje } = await admin
    .from('profiles').select('id', { head: true, count: 'exact' })
    .gte('created_at', inicioDia.toISOString());

  const nome = perfil?.display_name || info.email?.split('@')[0] || 'Usuário';
  const perfilTipos = Array.isArray(perfil?.perfil_tipos) && perfil.perfil_tipos.length
    ? perfil.perfil_tipos.join(', ')
    : (perfil?.perfil_contexto || '—');
  const telefone = perfil?.telefone || perfil?.whatsapp_number || info.phone || '—';
  const local = [perfil?.cidade, perfil?.uf, perfil?.pais].filter(Boolean).join(' / ') || '—';

  const texto = [
    '🆕 *NOVO CADASTRO NO VACATIO*',
    '',
    `👤 *Nome:* ${nome}`,
    `🔐 *Origem:* ${info.provider}`,
    `✉️ *E-mail:* ${info.email || '—'}`,
    `📱 *Telefone:* ${telefone}`,
    `🎓 *Perfil:* ${perfilTipos}`,
    `🎂 *Faixa etária:* ${perfil?.faixa_etaria || '—'}`,
    `📍 *Local:* ${local}`,
    `🕐 *Cadastro:* ${fmtDataBRT(perfil?.created_at || info.created_at)}`,
    '',
    `📊 Total de cadastros hoje: ${totalHoje ?? 0}`,
  ].join('\n');

  return {
    texto,
    pushTitle: '🆕 Novo cadastro',
    pushBody: `${nome} entrou via ${info.provider}`,
    url: '/admin-funcoes?card=cadastros',
  };
}

async function montarTrial(admin: any, userId: string, payload: any) {
  const desde30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: perfil }, info, logsR, sessR, assR, appleR] = await Promise.all([
    admin.from('profiles').select('display_name, perfil_tipos, telefone, whatsapp_number, pais, uf, cidade, created_at').eq('id', userId).maybeSingle(),
    authInfo(admin, userId),
    admin.from('user_activity_log').select('current_route, last_seen_at').eq('user_id', userId).gte('last_seen_at', desde30).order('last_seen_at', { ascending: true }).limit(2000),
    admin.from('user_sessions').select('started_at, platform').eq('user_id', userId).limit(500),
    admin.from('play_subscriptions').select('product_id, base_plan_id, status, expires_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('apple_subscriptions').select('product_id, status, expires_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  // Tempo por função (mesma lógica do dossiê: diferença entre pings da mesma rota)
  const logs = (logsR.data as any[]) || [];
  const porFuncao = new Map<string, number>();
  let totalSeg = 0;
  for (let i = 0; i < logs.length - 1; i++) {
    const a = logs[i], b = logs[i + 1];
    const delta = (new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()) / 1000;
    if (delta <= 0 || delta > 900) continue;
    const label = rotaLabel(a.current_route);
    porFuncao.set(label, (porFuncao.get(label) || 0) + delta);
    totalSeg += delta;
  }
  const top = [...porFuncao.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const sessoes = ((sessR.data as any[]) || []).length;
  const loja = payload?.loja === 'apple_subscriptions' ? 'App Store (Apple)' : 'Google Play';
  const ass = payload?.loja === 'apple_subscriptions' ? appleR.data : assR.data;
  const plano = planoLabel(ass?.product_id || payload?.product_id, (ass as any)?.base_plan_id);

  const cadastro = perfil?.created_at || info.created_at;
  const dias = cadastro ? Math.max(0, Math.round((Date.now() - new Date(cadastro).getTime()) / 86400000)) : null;
  const conversao = dias === null ? '—' : dias === 0 ? 'no mesmo dia do cadastro' : `${dias} dia${dias === 1 ? '' : 's'} após o cadastro`;

  const nome = perfil?.display_name || info.email?.split('@')[0] || 'Usuário';
  const topTexto = top.length
    ? top.map(([label, seg], i) => `   ${i + 1}. ${label} — ${fmtDuracao(seg)}`).join('\n')
    : '   —';
  const resumo = top.length
    ? `Antes de assinar, passou a maior parte do tempo em ${top[0][0]}${top[1] ? ` e ${top[1][0]}` : ''}.`
    : 'Ainda sem histórico de navegação registrado.';

  const texto = [
    '💎 *NOVA ASSINATURA TESTE*',
    '',
    `👤 *Nome:* ${nome}`,
    `✉️ *E-mail:* ${info.email || '—'}`,
    `🔐 *Origem da conta:* ${info.provider}`,
    `📱 *Telefone:* ${perfil?.telefone || perfil?.whatsapp_number || info.phone || '—'}`,
    `🛒 *Plano:* ${plano} · ${loja}`,
    '',
    `⏱️ *Conversão:* ${conversao}`,
    `🔁 *Acessos ao app:* ${sessoes}`,
    `🕒 *Tempo total de tela:* ${fmtDuracao(totalSeg)}`,
    '',
    '🏆 *Funções mais acessadas:*',
    topTexto,
    '',
    `📝 ${resumo}`,
  ].join('\n');

  return {
    texto,
    pushTitle: '💎 Novo teste iniciado',
    pushBody: `${nome} assinou o plano ${plano}`,
    url: '/admin-funcoes?card=trial',
  };
}

export async function processarAdminAlertas(admin: any, limite = 10) {
  const cfg = await getConfig(admin);
  if (!cfg.ativo) return { processados: 0, skipped: 'desativado' };

  const { data: pendentes } = await admin
    .from('admin_alertas')
    .select('id, tipo, user_id, payload')
    .eq('status', 'pendente')
    .order('created_at', { ascending: true })
    .limit(limite);

  if (!pendentes?.length) return { processados: 0 };

  const ids = await adminUserIds(admin, cfg.emails);
  let ok = 0;

  for (const alerta of pendentes) {
    try {
      if (!alerta.user_id) {
        await admin.from('admin_alertas').update({ status: 'ignorado' }).eq('id', alerta.id);
        continue;
      }
      const msg = alerta.tipo === 'trial'
        ? await montarTrial(admin, alerta.user_id, alerta.payload)
        : await montarCadastro(admin, alerta.user_id);

      await evolution.sendText(cfg.phone, msg.texto);
      await admin.from('horus_outbound_log').insert({
        phone_e164: cfg.phone,
        kind: 'admin_alerta',
        tipo: `admin_alerta_${alerta.tipo}`,
        status: 'sent',
        sent_at: new Date().toISOString(),
        payload: { text: msg.texto, alerta_id: alerta.id },
      });

      await enviarPush(admin, ids, msg.pushTitle, msg.pushBody, msg.url);

      await admin.from('admin_alertas')
        .update({ status: 'enviado', sent_at: new Date().toISOString(), erro: null })
        .eq('id', alerta.id);
      ok++;
    } catch (e: any) {
      console.error('[admin-alertas] falha', alerta.id, e);
      await admin.from('admin_alertas')
        .update({ status: 'falhou', erro: String(e?.message || e) })
        .eq('id', alerta.id);
    }
  }

  return { processados: ok, total: pendentes.length };
}

// deno-lint-ignore-file no-explicit-any
// Tick: encontra reminders vencidos e dispara. Roda a cada 1 min via pg_cron.
// - Faz até MAX_RETRIES tentativas por canal em caso de falha (retry imediato,
//   sem replanejar o next_fire_at — a 2ª tentativa acontece no mesmo tick).
// - Loga TODAS as tentativas em `reminder_dispatch_log` (auditoria).
// - Quando todos os canais falham, insere um aviso em `avisos` pro usuário.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { evolution } from '../_shared/evolution.ts';
import { sanitizeFirstName } from '../_shared/nomeSanitizer.ts';
import { generateLembreteText } from '../_shared/lembreteAiText.ts';
import { processarAdminAlertas } from '../_shared/adminAlertas.ts';


const MAX_RETRIES = 2;

const MSG_POOL: Record<string, { title: string; body: string }[]> = {
  padrao: [
    { title: '📖 Hora de ler', body: 'Ei {nome}, {livro} está te esperando. Só 10 minutos hoje já contam.' },
    { title: '📚 Sua sessão de leitura', body: 'Retome de onde parou em {livro}.' },
    { title: '📕 Lembrete de leitura', body: 'Pequenas doses diárias formam grandes leitores. Bora, {nome}?' },
  ],
  motivacional: [
    { title: '🔥 Não quebra o ritmo', body: '{nome}, mantenha a chama de {livro} acesa!' },
    { title: '💪 Foco total', body: '15 minutos em {livro} agora valem por 1 hora amanhã.' },
    { title: '🚀 Uma página por vez', body: 'Cada linha de {livro} te aproxima do próximo nível.' },
  ],
  bem_humorado: [
    { title: '👀 Cadê você?', body: '{livro} tá aqui olhando a hora. Não deixa ele no vácuo, {nome}.' },
    { title: '🍿 Sessão premium', body: 'Trocou o livro pelo TikTok de novo? Vem, {livro} tá bom demais.' },
  ],
  zen: [
    { title: '🌙 Momento seu', body: 'Respira. Abre {livro}. Só você e a página.' },
    { title: '🍃 Pausa consciente', body: 'Silencia o mundo por 10 minutos com {livro}.' },
  ],
};

function render(t: string, ctx: Record<string, string>) {
  return t.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? '').replace(/\s{2,}/g, ' ').trim();
}
function daySeed() { return Math.floor(Date.now() / 86400000); }
function pickMsg(estilo: string, ctx: { nome: string; livro: string }) {
  const pool = MSG_POOL[estilo] || MSG_POOL.padrao;
  const raw = pool[daySeed() % pool.length];
  return { title: render(raw.title, ctx), body: render(raw.body, ctx) };
}

function tzOffsetMinutes(tz: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(at);
  const g = (t: string) => +parts.find(p => p.type === t)!.value;
  const asUTC = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
  return Math.round((asUTC - at.getTime()) / 60000);
}

function computeNextFireAt(timeHHMM: string, timezone: string, dow: number[]): Date {
  const [hh, mm] = timeHHMM.split(':').map(Number);
  const now = new Date();
  const tz = timezone || 'America/Sao_Paulo';
  for (let i = 0; i < 14; i++) {
    const probe = new Date(now.getTime() + i * 86400000);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    }).formatToParts(probe);
    const wk = parts.find(p => p.type === 'weekday')?.value || '';
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const weekdayLocal = map[wk] ?? 0;
    if (!dow.includes(weekdayLocal)) continue;
    const y = parts.find(p => p.type === 'year')!.value;
    const M = parts.find(p => p.type === 'month')!.value;
    const D = parts.find(p => p.type === 'day')!.value;
    const offsetMin = tzOffsetMinutes(tz, probe);
    const localMs = Date.UTC(+y, +M - 1, +D, hh, mm, 0) - offsetMin * 60000;
    const fire = new Date(localMs);
    if (fire.getTime() > now.getTime() - 30_000) return fire;
  }
  return new Date(now.getTime() + 86400000);
}

async function withRetries<T>(fn: () => Promise<T>): Promise<{ ok: boolean; value?: T; error?: string; attempts: number }> {
  let lastErr = '';
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const value = await fn();
      return { ok: true, value, attempts: attempt };
    } catch (e: any) {
      lastErr = e?.message || String(e);
      if (attempt <= MAX_RETRIES) await new Promise(r => setTimeout(r, 800 * attempt));
    }
  }
  return { ok: false, error: lastErr, attempts: MAX_RETRIES + 1 };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const now = new Date();
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const logDispatch = async (row: {
    reminder_id: string; user_id: string; canal: string; status: string;
    reminder_type: 'reading' | 'article_time' | 'location';
    retry_attempt?: number; error?: string;
    livro_id?: string | null; livro_titulo?: string | null;
    article_ref?: string | null; article_titulo?: string | null;
  }) => {
    try { await admin.from('reminder_dispatch_log').insert(row); } catch {}
  };

  const notifyFailure = async (user_id: string, prefs: any, kind: string, label: string, err: string) => {
    if (prefs?.failure_alerts === false) return;
    try {
      await admin.from('avisos').insert({
        user_id,
        titulo: '⚠️ Lembrete não foi enviado',
        mensagem: `Não conseguimos enviar seu lembrete "${label}" (${kind}). Motivo: ${err}. Tentaremos novamente no próximo disparo.`,
        avisar_em: new Date().toISOString(),
        ativo: true,
      });
    } catch {}
  };

  const getPrefs = async (user_id: string) => {
    try {
      const { data } = await admin.from('user_reminder_preferences').select('*').eq('user_id', user_id).maybeSingle();
      return data;
    } catch { return null; }
  };

  const sendPushWithRetry = async (payload: any) => withRetries(async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/push-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SRK}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`push HTTP ${res.status}`);
    return await res.text();
  });

  const sendPushAudienceWithRetry = async (payload: any) => withRetries(async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SRK}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`send-push HTTP ${res.status}`);
    return await res.text();
  });

  const sendHorusWithRetry = async (phone: string, text: string) => withRetries(async () => {
    await evolution.sendText(phone, text);
  });

  try {
    // ============ 0) alertas do admin (cadastro / trial) ============
    try { await processarAdminAlertas(admin); } catch (e) { console.error('[reminders-tick] admin alertas', e); }

    // ============ 1) reading_reminders ============

    const { data: needSchedule } = await admin.from('reading_reminders')
      .select('*').eq('enabled', true).is('next_fire_at', null).limit(200);
    for (const r of needSchedule || []) {
      const next = computeNextFireAt(r.time_of_day, r.timezone, r.days_of_week);
      await admin.from('reading_reminders').update({ next_fire_at: next.toISOString() }).eq('id', r.id);
    }

    const { data: due } = await admin.from('reading_reminders')
      .select('*').eq('enabled', true).lte('next_fire_at', now.toISOString()).limit(500);

    const fired: any[] = [];
    for (const r of due || []) {
      const [{ data: prof }, { data: horusUser }, { data: horusStats }, prefs] = await Promise.all([
        admin.from('profiles').select('display_name').eq('id', r.user_id).maybeSingle(),
        admin.from('horus_whatsapp_users').select('phone_e164, verified_at, nome_preferido, apelido, apelido_ativo').eq('user_id', r.user_id).maybeSingle(),
        admin.from('horus_user_stats').select('nome_preferido').eq('user_id', r.user_id).maybeSingle(),
        getPrefs(r.user_id),
      ]);
      const apelidoHorus = horusUser?.apelido_ativo ? sanitizeFirstName(horusUser?.apelido) : '';
      const nome =
        apelidoHorus ||
        sanitizeFirstName(prof?.display_name) ||
        sanitizeFirstName(horusUser?.nome_preferido) ||
        sanitizeFirstName(horusStats?.nome_preferido) ||
        '';
      const nomeParaMsg = nome || 'você';
      const livro = r.livro_titulo || 'seu livro';
      const base = pickMsg(r.message_style || 'padrao', { nome: nomeParaMsg, livro });

      // Tenta gerar uma versão mais fluida via IA — cai no template se falhar.
      const aiText = await generateLembreteText({
        primeiroNome: nome || undefined,
        tipo: 'leitura',
        tituloAlvo: livro,
        mensagemUsuario: r.message || undefined,
        hora: r.time_of_day,
        estilo: r.message_style || 'padrao',
      }).catch(() => null);

      const requested: string[] = r.channels || ['push'];
      // Dedup: quando o WhatsApp está disponível E verificado, ele vira o canal
      // principal e o push só entra como fallback caso o WhatsApp falhe.
      const horusRequested = requested.includes('horus_whatsapp');
      const pushRequested = requested.includes('push');
      const horusAvailable = horusRequested && !!horusUser?.phone_e164 && !!horusUser?.verified_at;

      const failures: string[] = [];
      let horusOk = false;

      if (horusAvailable) {
        const bodyHorus =
          aiText ||
          `${nome ? `${nome}, ` : ''}${base.body}`;
        const text = `*${base.title}*\n${bodyHorus}\n\n_Vacatio · https://simply-sweet-calc-06.lovable.app/biblioteca_`;
        const res = await sendHorusWithRetry(horusUser!.phone_e164, text);
        await logDispatch({
          reminder_id: r.id, user_id: r.user_id, canal: 'horus_whatsapp',
          status: res.ok ? 'sent' : 'error', error: res.error,
          retry_attempt: res.attempts - 1, reminder_type: 'reading',
          livro_id: r.livro_id, livro_titulo: r.livro_titulo,
        });
        if (res.ok) {
          horusOk = true;
          await admin.from('horus_outbound_log').insert({
            phone_e164: horusUser!.phone_e164.replace(/\D/g, ''),
            kind: 'reading_reminder', tipo: 'lembrete_leitura', status: 'sent',
            sent_at: new Date().toISOString(), payload: { text, reminder_id: r.id },
          });
        } else {
          failures.push(`horus: ${res.error}`);
        }
      }

      const shouldPush = pushRequested && !horusOk; // dedup: push só se Horus não entregou
      if (shouldPush) {
        const body = aiText || `${nome ? `${nome}, ` : ''}${base.body}`;
        const res = await sendPushWithRetry({
          user_id: r.user_id, title: base.title, body,
          url: r.livro_id ? `/biblioteca?livro=${encodeURIComponent(r.livro_id)}` : '/biblioteca',
          tag: `lembrete-${r.id}`,
        });
        await logDispatch({
          reminder_id: r.id, user_id: r.user_id, canal: 'push',
          status: res.ok ? 'sent' : 'error', error: res.error,
          retry_attempt: res.attempts - 1, reminder_type: 'reading',
          livro_id: r.livro_id, livro_titulo: r.livro_titulo,
        });
        if (!res.ok) failures.push(`push: ${res.error}`);
      }

      const attempted = (horusAvailable ? 1 : 0) + (shouldPush ? 1 : 0);
      if (attempted > 0 && failures.length === attempted) {
        await notifyFailure(r.user_id, prefs, 'leitura', r.livro_titulo || 'lembrete', failures.join(' · '));
      }

      const nextFire = computeNextFireAt(r.time_of_day, r.timezone, r.days_of_week);
      await admin.from('reading_reminders').update({
        last_fired_at: now.toISOString(), next_fire_at: nextFire.toISOString(),
      }).eq('id', r.id);
      fired.push({ id: r.id, requested, horusOk, next: nextFire.toISOString(), failures });
    }

    // ============ 2) article_time_reminders ============
    const artFired: any[] = [];
    const { data: artNeed } = await admin.from('article_time_reminders')
      .select('*').eq('active', true).is('next_fire_at', null).limit(500);
    for (const r of artNeed || []) {
      const next = computeNextFireAt(r.time_of_day, r.timezone, r.days_of_week);
      await admin.from('article_time_reminders').update({ next_fire_at: next.toISOString() }).eq('id', r.id);
    }
    const { data: artDue } = await admin.from('article_time_reminders')
      .select('*').eq('active', true).lte('next_fire_at', now.toISOString()).limit(500);
    for (const r of artDue || []) {
      const ch: string = r.channel || 'push';
      const prefs = await getPrefs(r.user_id);

      // Nome preferido do usuário (com sanitização anti "Direito").
      const [{ data: prof }, { data: wa }, { data: horusStats }] = await Promise.all([
        admin.from('profiles').select('display_name').eq('id', r.user_id).maybeSingle(),
        admin.from('horus_whatsapp_users').select('phone_e164, verified_at, nome_preferido, apelido, apelido_ativo').eq('user_id', r.user_id).maybeSingle(),
        admin.from('horus_user_stats').select('nome_preferido').eq('user_id', r.user_id).maybeSingle(),
      ]);
      const apelidoHorus = wa?.apelido_ativo ? sanitizeFirstName(wa?.apelido) : '';
      const nome =
        apelidoHorus ||
        sanitizeFirstName(prof?.display_name) ||
        sanitizeFirstName(wa?.nome_preferido) ||
        sanitizeFirstName(horusStats?.nome_preferido) ||
        '';

      const title = `⏰ ${r.label}`;
      const baseBody = (r.message && r.message.trim()) || `Hora de revisar ${r.artigo_titulo}`;

      // Texto fluido via IA — sempre citando o nome quando existir.
      const aiText = await generateLembreteText({
        primeiroNome: nome || undefined,
        tipo: 'artigo',
        tituloAlvo: r.artigo_titulo,
        mensagemUsuario: r.message || undefined,
        hora: r.time_of_day,
      }).catch(() => null);
      const body = aiText || `${nome ? `${nome}, ` : ''}${baseBody}`;

      const wantsPush = ch === 'push' || ch === 'both';
      const wantsHorus = ch === 'horus' || ch === 'both';
      const horusAvailable = wantsHorus && !!wa?.phone_e164 && !!wa?.verified_at;

      const failures: string[] = [];
      let horusOk = false;

      if (horusAvailable) {
        const text = `⏰ *${r.label}*\n${body}\n\n_${r.artigo_titulo}_`;
        const res = await sendHorusWithRetry(wa!.phone_e164, text);
        await logDispatch({
          reminder_id: r.id, user_id: r.user_id, canal: 'horus',
          status: res.ok ? 'sent' : 'error', error: res.error,
          retry_attempt: res.attempts - 1, reminder_type: 'article_time',
          article_ref: r.artigo_ref, article_titulo: r.artigo_titulo,
        });
        if (res.ok) {
          horusOk = true;
          await admin.from('horus_outbound_log').insert({
            phone_e164: wa!.phone_e164.replace(/\D/g, ''),
            kind: 'article_time_reminder', tipo: 'lembrete_artigo_horario',
            status: 'sent', sent_at: new Date().toISOString(),
            payload: { text, reminder_id: r.id },
          });
        } else { failures.push(`horus: ${res.error}`); }
      } else if (wantsHorus) {
        await logDispatch({
          reminder_id: r.id, user_id: r.user_id, canal: 'horus',
          status: 'skipped', error: 'WhatsApp não verificado',
          reminder_type: 'article_time', article_ref: r.artigo_ref, article_titulo: r.artigo_titulo,
        });
      }

      const shouldPush = wantsPush && !horusOk; // dedup
      if (shouldPush) {
        const res = await sendPushAudienceWithRetry({
          audience: { user_ids: [r.user_id] }, title, body, tag: `article-reminder-${r.id}`,
        });
        await logDispatch({
          reminder_id: r.id, user_id: r.user_id, canal: 'push',
          status: res.ok ? 'sent' : 'error', error: res.error,
          retry_attempt: res.attempts - 1, reminder_type: 'article_time',
          article_ref: r.artigo_ref, article_titulo: r.artigo_titulo,
        });
        if (!res.ok) failures.push(`push: ${res.error}`);
      }

      const attempted = (horusAvailable ? 1 : 0) + (shouldPush ? 1 : 0);
      if (attempted > 0 && failures.length === attempted) {
        await notifyFailure(r.user_id, prefs, 'artigo', r.label, failures.join(' · '));
      }

      const next = computeNextFireAt(r.time_of_day, r.timezone, r.days_of_week);
      await admin.from('article_time_reminders').update({
        last_fired_at: now.toISOString(),
        next_fire_at: next.toISOString(),
        triggered_count: (r.triggered_count || 0) + 1,
      }).eq('id', r.id);
      artFired.push({ id: r.id, ch, horusOk, next: next.toISOString(), failures });
    }

    return new Response(JSON.stringify({
      ok: true, fired: fired.length, backfilled: (needSchedule || []).length,
      article_fired: artFired.length, article_backfilled: (artNeed || []).length,
      details: fired, article_details: artFired,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[reminders-tick] fatal', e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

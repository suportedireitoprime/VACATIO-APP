// Consulta o Google Play Developer Reporting API + agrega dados locais de assinaturas.
// Reaproveita GOOGLE_PLAY_SERVICE_ACCOUNT_JSON já configurado no projeto.
// Requer que a service account tenha no Play Console permissão "Ver app information e estatísticas"
// e "Ver informações financeiras, pedidos e cancelamentos".
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PACKAGE_NAME = Deno.env.get('ANDROID_PACKAGE_NAME') ?? '';
const SERVICE_ACCOUNT_JSON = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON') ?? '';

// Cache em memória (edge function warm) — 5 min
let tokenCache: { token: string; exp: number } | null = null;

async function getGoogleAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;
  const sa = JSON.parse(SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: [
      'https://www.googleapis.com/auth/androidpublisher',
      'https://www.googleapis.com/auth/playdeveloperreporting',
    ].join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const b64url = (b: Uint8Array) =>
    btoa(String.fromCharCode(...b)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const enc = new TextEncoder();
  const toSign = `${b64url(enc.encode(JSON.stringify(header)))}.${b64url(enc.encode(JSON.stringify(claim)))}`;
  const pem = sa.private_key.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(toSign)));
  const jwt = `${toSign}.${b64url(sig)}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error('oauth: ' + JSON.stringify(json));
  tokenCache = { token: json.access_token, exp: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return tokenCache.token;
}

// ============================================================================
// IMPORTANTE: a Google Play Developer Reporting API NÃO expõe métricas de
// assinatura (não existe "subscriptionMetricSet" nem "installsMetricSet").
// Ela só cobre "vitals" (crash rate, ANR, erros) e anomalias.
// Métricas agregadas de assinantes/cancelamentos só existem:
//   - no Play Console (UI) e nos relatórios CSV do bucket do Cloud Storage;
//   - por compra individual, via androidpublisher purchases.subscriptionsv2.get.
// Por isso aqui: sincronizamos cada compra com o androidpublisher e agregamos
// as métricas a partir do nosso próprio banco (alimentado por RTDN + validação).
// ============================================================================

// Consulta o estado atual de UMA assinatura no Google Play.
async function fetchPurchaseState(accessToken: string, purchaseToken: string) {
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}` +
    `/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

type SyncResult = {
  checked: number;
  updated: number;
  errors: { status: number; message: string }[];
  lastSyncAt: string;
};

// Sincroniza até `max` assinaturas com o Google Play (estado real, refunds, cancelamentos).
async function syncWithGoogle(
  supabase: ReturnType<typeof createClient>,
  rows: { id: string; user_id: string; purchase_token: string | null; status: string }[],
  max = 60,
): Promise<SyncResult> {
  const result: SyncResult = { checked: 0, updated: 0, errors: [], lastSyncAt: new Date().toISOString() };
  const token = await getGoogleAccessToken();
  const targets = rows.filter((r) => !!r.purchase_token).slice(0, max);

  for (let i = 0; i < targets.length; i += 8) {
    const batch = targets.slice(i, i + 8);
    await Promise.all(batch.map(async (row) => {
      try {
        const r = await fetchPurchaseState(token, row.purchase_token!);
        result.checked++;
        if (!r.ok) {
          const msg = r.body?.error?.message ?? JSON.stringify(r.body).slice(0, 300);
          console.error(`androidpublisher ${r.status} para token ${row.purchase_token?.slice(0, 12)}…: ${msg}`);
          // 410/404 = compra sumiu (reembolso/void) → expira localmente
          if (r.status === 404 || r.status === 410) {
            await supabase.from('play_subscriptions')
              .update({ status: 'SUBSCRIPTION_STATE_EXPIRED', cancel_reason: 'não encontrada no Google (reembolso/void)', updated_at: new Date().toISOString() })
              .eq('id', row.id);
            result.updated++;
            return;
          }
          if (!result.errors.some((e) => e.status === r.status)) {
            result.errors.push({ status: r.status, message: msg });
          }
          return;
        }
        const b: any = r.body;
        const line = b.lineItems?.[0] ?? {};
        const patch: Record<string, unknown> = {
          status: b.subscriptionState ?? row.status,
          expires_at: line.expiryTime ?? null,
          start_time: b.startTime ?? null,
          product_id: line.productId ?? undefined,
          base_plan_id: line.offerDetails?.basePlanId ?? undefined,
          auto_renewing: line.autoRenewingPlan?.autoRenewEnabled ?? null,
          cancel_reason:
            b.canceledStateContext?.userInitiatedCancellation?.cancelSurveyResult?.reason ??
            (b.canceledStateContext?.systemInitiatedCancellation ? 'cancelada pelo sistema' :
              b.canceledStateContext?.developerInitiatedCancellation ? 'cancelada pelo desenvolvedor' :
              b.canceledStateContext?.replacementCancellation ? 'substituída por outro plano' : null),
          raw_payload: b,
          updated_at: new Date().toISOString(),
        };
        Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
        await supabase.from('play_subscriptions').update(patch).eq('id', row.id);
        result.updated++;

        // Sincroniza o flag premium do perfil
        const stillActive =
          (b.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE' || b.subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') &&
          (!line.expiryTime || new Date(line.expiryTime).getTime() > Date.now());
        if (!stillActive) {
          const { data: others } = await supabase
            .from('play_subscriptions')
            .select('id, status, expires_at')
            .eq('user_id', row.user_id);
          const anyActive = (others ?? []).some((o: any) =>
            o.id !== row.id &&
            (o.status === 'SUBSCRIPTION_STATE_ACTIVE' || o.status === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') &&
            (!o.expires_at || new Date(o.expires_at).getTime() > Date.now()));
          if (!anyActive) {
            await supabase.from('profiles').update({ is_premium: false }).eq('id', row.user_id);
          }
        }
      } catch (err) {
        console.error('sync error', err);
        if (!result.errors.some((e) => e.status === 0)) {
          result.errors.push({ status: 0, message: String((err as Error)?.message ?? err) });
        }
      }
    }));
  }
  return result;
}

// Agrega métricas diárias (30d) a partir do nosso banco.
function buildMetrics(rows: any[]) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) days.push(new Date(now - i * dayMs).toISOString().slice(0, 10));

  const timeline = days.map((date) => {
    const dayStart = new Date(`${date}T00:00:00.000Z`).getTime();
    const dayEnd = dayStart + dayMs;
    let novos = 0, cancelados = 0, ativos = 0;
    rows.forEach((r) => {
      const st = r.start_time ? new Date(r.start_time).getTime() : 0;
      const ex = r.expires_at ? new Date(r.expires_at).getTime() : 0;
      if (st >= dayStart && st < dayEnd) novos++;
      const canceladoEm = r.status === 'SUBSCRIPTION_STATE_CANCELED' && r.updated_at ? new Date(r.updated_at).getTime() : 0;
      if (canceladoEm >= dayStart && canceladoEm < dayEnd) cancelados++;
      if (st && st < dayEnd && (!ex || ex >= dayStart)) ativos++;
    });
    return { date, label: date.slice(5).replace('-', '/'), ativos, novos, cancelados, renovacoes: 0 };
  });

  const since7 = now - 7 * dayMs;
  const ativosHoje = rows.filter((r) =>
    (r.status === 'SUBSCRIPTION_STATE_ACTIVE' || r.status === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') &&
    (!r.expires_at || new Date(r.expires_at).getTime() > now)).length;
  const novos7 = rows.filter((r) => r.start_time && new Date(r.start_time).getTime() >= since7).length;
  const cancelados7 = rows.filter((r) =>
    r.status === 'SUBSCRIPTION_STATE_CANCELED' && r.updated_at && new Date(r.updated_at).getTime() >= since7).length;
  const renovacoes30 = rows.filter((r) =>
    r.latest_notification_type === 2 &&
    r.updated_at && new Date(r.updated_at).getTime() >= now - 30 * dayMs).length;


  return { ativosHoje, novos7, cancelados7, renovacoes30, timeline };
}


async function fetchSubscribersLocal(supabase: ReturnType<typeof createClient>) {
  const { data: rows, error } = await supabase
    .from('play_subscriptions')
    .select('id, user_id, product_id, base_plan_id, purchase_token, order_id, status, auto_renewing, start_time, expires_at, cancel_reason, latest_notification_type, updated_at')
    .order('start_time', { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) throw error;


  const userIds = [...new Set((rows ?? []).map((r) => r.user_id).filter(Boolean))];
  const profilesMap = new Map<string, { display_name?: string; avatar_url?: string }>();
  const emailsMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds);
    (profiles ?? []).forEach((p: any) => profilesMap.set(p.id, p));

    // Emails via admin API — paginado
    let page = 1;
    while (page < 20) {
      const { data: users, error: uErr } = await (supabase as any).auth.admin.listUsers({ page, perPage: 200 });
      if (uErr || !users?.users?.length) break;
      users.users.forEach((u: any) => { if (u.email) emailsMap.set(u.id, u.email); });
      if (users.users.length < 200) break;
      page++;
    }
  }

  const enriched = (rows ?? []).map((r) => {
    const p = profilesMap.get(r.user_id) ?? {};
    const startMs = r.start_time ? new Date(r.start_time).getTime() : 0;
    const expMs = r.expires_at ? new Date(r.expires_at).getTime() : 0;
    const durationMs = startMs && expMs ? expMs - startMs : 0;
    const isTest = durationMs > 0 && durationMs < 60 * 60 * 1000; // < 1h = teste de licença
    return {
      ...r,
      display_name: p.display_name ?? null,
      avatar_url: p.avatar_url ?? null,
      email: emailsMap.get(r.user_id) ?? null,
      is_test: isTest,
    };
  });

  // Agregados locais
  const now = Date.now();
  const active = enriched.filter((r) =>
    (r.status === 'SUBSCRIPTION_STATE_ACTIVE' || r.status === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') &&
    (!r.expires_at || new Date(r.expires_at).getTime() > now)
  );
  const testCount = enriched.filter((r) => r.is_test).length;
  const byPlan: Record<string, number> = {};
  active.forEach((r) => { const k = r.product_id ?? 'desconhecido'; byPlan[k] = (byPlan[k] ?? 0) + 1; });

  return {
    rows: enriched,
    stats: {
      total: enriched.length,
      active: active.length,
      test: testCount,
      byPlan,
    },
    metrics: buildMetrics(enriched),
  };
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth: precisa ser admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: cErr } = await anon.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (cErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: isAdmin } = await admin.rpc('is_admin_user', { _user_id: claims.claims.sub });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!SERVICE_ACCOUNT_JSON || !PACKAGE_NAME) {
      return new Response(JSON.stringify({ error: 'Configuração ausente: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON / ANDROID_PACKAGE_NAME' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ?sync=true (ou body { sync: true }) → consulta cada compra no Google Play antes de agregar
    let wantSync = true;
    try {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body.sync === 'boolean') wantSync = body.sync;
    } catch { /* ignore */ }

    let sync: SyncResult | { error: string } | null = null;
    if (wantSync) {
      const { data: pending } = await admin
        .from('play_subscriptions')
        .select('id, user_id, purchase_token, status')
        .order('updated_at', { ascending: true })
        .limit(120);
      sync = await syncWithGoogle(admin, (pending ?? []) as any).catch((err) => ({
        error: String((err as Error)?.message ?? err),
      }));
    }

    const local = await fetchSubscribersLocal(admin);

    // Extrai e-mail da service account (para mensagem de erro 403 amigável)
    let serviceAccountEmail: string | null = null;
    try { serviceAccountEmail = JSON.parse(SERVICE_ACCOUNT_JSON).client_email ?? null; } catch { /* ignore */ }

    return new Response(JSON.stringify({
      sync,
      local,
      packageName: PACKAGE_NAME,
      serviceAccountEmail,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('play-reporting error', err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
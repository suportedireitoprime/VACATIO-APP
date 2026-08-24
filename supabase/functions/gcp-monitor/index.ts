// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { SignJWT, importPKCS8 } from 'npm:jose@5';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getGoogleAccessToken(saJson: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const scope = [
    'https://www.googleapis.com/auth/monitoring.read',
    'https://www.googleapis.com/auth/bigquery.readonly',
    'https://www.googleapis.com/auth/cloud-platform.read-only',
  ].join(' ');

  const privateKey = await importPKCS8(saJson.private_key, 'RS256');
  const jwt = await new SignJWT({ scope })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: saJson.private_key_id })
    .setIssuer(saJson.client_email)
    .setSubject(saJson.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`[${res.status}] token: ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

async function fetchApiCalls(accessToken: string, projectId: string) {
  const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries:query`;
  const query = `
    fetch consumed_api
    | metric 'serviceruntime.googleapis.com/api/request_count'
    | within 7d
    | group_by [metric.service, metric.response_code_class], sum(value.request_count)
  `.trim();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[${res.status}] monitoring: ${body}`);
  }
  const data = await res.json();

  // Aggregate by service, count errors (response_code_class starting with 4 or 5)
  const map = new Map<string, { total: number; erros: number }>();
  const series = data.timeSeriesData || [];
  for (const s of series) {
    const labels = s.labelValues || [];
    const service = labels[0]?.stringValue ?? 'unknown';
    const codeClass = labels[1]?.stringValue ?? '';
    let total = 0;
    for (const p of s.pointData || []) {
      total += Number(p.values?.[0]?.int64Value ?? p.values?.[0]?.doubleValue ?? 0);
    }
    const cur = map.get(service) || { total: 0, erros: 0 };
    cur.total += total;
    if (codeClass.startsWith('4xx') || codeClass.startsWith('5xx') || codeClass.startsWith('4') || codeClass.startsWith('5')) {
      cur.erros += total;
    }
    map.set(service, cur);
  }
  return Array.from(map.entries())
    .map(([servico, v]) => ({ servico, total: v.total, erros: v.erros }))
    .sort((a, b) => b.total - a.total);
}

async function fetchCosts(accessToken: string, projectId: string, dataset: string, table: string) {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`;
  const fullTable = `\`${projectId}.${dataset}.${table}\``;
  const sql = `
    WITH base AS (
      SELECT
        service.description AS servico,
        DATE(usage_start_time) AS dia,
        cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0) AS custo_liquido
      FROM ${fullTable}
      WHERE _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 45 DAY)
    )
    SELECT
      (SELECT SUM(custo_liquido) FROM base WHERE dia >= DATE_TRUNC(CURRENT_DATE(), MONTH)) AS custo_mes,
      (SELECT SUM(custo_liquido) FROM base WHERE dia = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)) AS custo_ontem,
      (SELECT SUM(custo_liquido) FROM base WHERE dia >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 MONTH) AND dia < DATE_TRUNC(CURRENT_DATE(), MONTH)) AS custo_mes_anterior,
      ARRAY(
        SELECT AS STRUCT servico, ROUND(SUM(custo_liquido), 4) AS custo
        FROM base
        WHERE dia >= DATE_TRUNC(CURRENT_DATE(), MONTH)
        GROUP BY servico
        HAVING SUM(custo_liquido) > 0
        ORDER BY custo DESC
        LIMIT 15
      ) AS por_servico
  `.trim();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: sql,
      useLegacySql: false,
      maximumBytesBilled: '2147483648', // 2 GB
      timeoutMs: 30000,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[${res.status}] bigquery: ${body}`);
  }
  const data = await res.json();
  const row = data.rows?.[0]?.f ?? [];
  const custoMes = Number(row[0]?.v ?? 0);
  const custoOntem = Number(row[1]?.v ?? 0);
  const custoMesAnterior = Number(row[2]?.v ?? 0);
  const porServicoRaw = row[3]?.v ?? [];
  const porServico = porServicoRaw.map((item: any) => {
    const f = item.v?.f ?? [];
    return {
      servico: f[0]?.v ?? 'unknown',
      custo_usd: Number(f[1]?.v ?? 0),
    };
  });
  return {
    custo_mes_atual_usd: custoMes,
    custo_ontem_usd: custoOntem,
    custo_mes_anterior_usd: custoMesAnterior,
    custo_por_servico: porServico,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth check → admin only
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { error: 'Unauthorized' });
    }
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await supabaseUser.auth.getClaims(authHeader.replace('Bearer ', ''));
    const userId = claims?.claims?.sub;
    if (!userId) return json(401, { error: 'Unauthorized' });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isAdmin } = await admin.rpc('is_admin_user', { _user_id: userId });
    if (!isAdmin) return json(403, { error: 'Forbidden' });

    // Query params
    const url = new URL(req.url);
    const bypassCache = url.searchParams.get('refresh') === '1';

    // Cache
    if (!bypassCache) {
      const { data: cache } = await admin
        .from('gcp_monitor_cache')
        .select('payload, updated_at')
        .eq('bucket', 'default')
        .maybeSingle();
      if (cache && Date.now() - new Date(cache.updated_at).getTime() < CACHE_TTL_MS) {
        return json(200, { ...cache.payload, _cached: true, _updated_at: cache.updated_at });
      }
    }

    // Secrets
    const saRaw = Deno.env.get('GCP_SERVICE_ACCOUNT_JSON');
    const projectId = Deno.env.get('GCP_PROJECT_ID');
    const dataset = Deno.env.get('GCP_BILLING_DATASET');
    const table = Deno.env.get('GCP_BILLING_TABLE');
    if (!saRaw || !projectId) {
      return json(200, {
        error: 'setup_required',
        message: 'Configure GCP_SERVICE_ACCOUNT_JSON e GCP_PROJECT_ID nos secrets.',
      });
    }

    let saJson: any;
    try {
      saJson = JSON.parse(saRaw);
    } catch {
      return json(200, { error: 'setup_required', message: 'GCP_SERVICE_ACCOUNT_JSON inválido (JSON malformado).' });
    }

    const accessToken = await getGoogleAccessToken(saJson);

    const [callsResult, costResult] = await Promise.allSettled([
      fetchApiCalls(accessToken, projectId),
      dataset && table
        ? fetchCosts(accessToken, projectId, dataset, table)
        : Promise.resolve(null),
    ]);

    const chamadas_por_servico = callsResult.status === 'fulfilled' ? callsResult.value : [];
    const chamadas_erro = callsResult.status === 'rejected' ? String(callsResult.reason) : null;

    const cost = costResult.status === 'fulfilled' ? costResult.value : null;
    const cost_erro = costResult.status === 'rejected' ? String(costResult.reason) : null;

    const total_chamadas_7d = chamadas_por_servico.reduce((s, x) => s + x.total, 0);
    const total_erros_7d = chamadas_por_servico.reduce((s, x) => s + x.erros, 0);

    const payload = {
      periodo: {
        inicio: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
        fim: new Date().toISOString(),
      },
      total_chamadas_7d,
      total_erros_7d,
      chamadas_por_servico,
      chamadas_erro,
      custo_mes_atual_usd: cost?.custo_mes_atual_usd ?? null,
      custo_ontem_usd: cost?.custo_ontem_usd ?? null,
      custo_mes_anterior_usd: cost?.custo_mes_anterior_usd ?? null,
      custo_por_servico: cost?.custo_por_servico ?? [],
      cost_erro,
      billing_configurado: Boolean(dataset && table),
    };

    await admin.from('gcp_monitor_cache').upsert({
      bucket: 'default',
      payload,
      updated_at: new Date().toISOString(),
    });

    return json(200, { ...payload, _cached: false, _updated_at: new Date().toISOString() });
  } catch (err) {
    console.error('gcp-monitor error:', err);
    return json(500, { error: 'internal_error', message: String(err) });
  }
});

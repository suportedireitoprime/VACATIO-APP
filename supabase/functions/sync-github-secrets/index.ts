// Sincroniza secrets do Supabase para GitHub Actions Secrets de um repo.
// Exige: usuário logado + email em ADMIN_DOWNLOAD_EMAILS + ADMIN_DOWNLOAD_PASSWORD.
// Usa GITHUB_API_KEY (Personal Access Token com escopo `repo`) para chamar api.github.com diretamente.
import { createClient } from 'npm:@supabase/supabase-js@2';
import _sodium from 'https://esm.sh/libsodium-wrappers@0.7.15';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_ANDROID = [
  'ANDROID_KEYSTORE_BASE64',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'GOOGLE_WEB_CLIENT_ID',
] as const;

const ALLOWED_APPLE = [
  'APPLE_TEAM_ID',
  'APPLE_BUNDLE_ID',
  'APPLE_APP_STORE_CONNECT_KEY_ID',
  'APPLE_APP_STORE_CONNECT_ISSUER_ID',
  'APPLE_APP_STORE_CONNECT_KEY_P8_BASE64',
  'APPLE_DISTRIBUTION_CERT_P12_BASE64',
  'APPLE_DISTRIBUTION_CERT_PASSWORD',
  'APPLE_PROVISIONING_PROFILE_BASE64',
  'KEYCHAIN_PASSWORD',
] as const;

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const GITHUB_API = 'https://api.github.com';
const WORKFLOW_PATH_ANDROID = '.github/workflows/build-android.yml';
const WORKFLOW_PATH_IOS = '.github/workflows/build-ios.yml';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function ghHeaders() {
  const token = (Deno.env.get('GITHUB_API_KEY') || '').trim();
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'lovable-sync-secrets',
  };
}

function encodeBase64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function syncWorkflow(repo: string, workflowSource: unknown, workflowPath: string, commitMessage: string) {
  const source = typeof workflowSource === 'string' ? workflowSource : '';
  if (!source.trim()) {
    return { status: 'skipped', message: 'workflowSource vazio', path: workflowPath };
  }

  const currentRes = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${encodeURIComponent(workflowPath).replaceAll('%2F', '/')}`,
    { headers: ghHeaders() },
  );

  let sha: string | undefined;
  let branch = 'main';
  if (currentRes.ok) {
    const current = await currentRes.json() as { sha?: string; content?: string; encoding?: string; html_url?: string };
    sha = current.sha;
    const currentContent = current.encoding === 'base64' && current.content
      ? new TextDecoder().decode(Uint8Array.from(atob(current.content.replace(/\s/g, '')), c => c.charCodeAt(0)))
      : '';
    if (currentContent === source) {
      return { status: 'unchanged', message: 'workflow já estava atualizado', branch, html_url: current.html_url, path: workflowPath };
    }
  } else if (currentRes.status !== 404) {
    const details = await currentRes.text();
    return { status: 'error', message: `falha ao ler workflow (${currentRes.status}): ${details.slice(0, 180)}`, path: workflowPath };
  }

  const repoRes = await fetch(`${GITHUB_API}/repos/${repo}`, { headers: ghHeaders() });
  if (repoRes.ok) {
    const repoData = await repoRes.json() as { default_branch?: string };
    branch = repoData.default_branch || branch;
  }

  const putRes = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${encodeURIComponent(workflowPath).replaceAll('%2F', '/')}`,
    {
      method: 'PUT',
      headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: commitMessage,
        content: encodeBase64Utf8(source),
        branch,
        ...(sha ? { sha } : {}),
      }),
    },
  );

  if (!putRes.ok) {
    const details = await putRes.text();
    return { status: 'error', message: `falha ao salvar workflow (${putRes.status}): ${details.slice(0, 180)}`, path: workflowPath };
  }

  const putData = await putRes.json() as { content?: { html_url?: string } };
  return { status: sha ? 'updated' : 'created', message: `workflow salvo na branch ${branch}`, branch, html_url: putData.content?.html_url, path: workflowPath };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const GITHUB_API_KEY = Deno.env.get('GITHUB_API_KEY');
    if (!GITHUB_API_KEY) {
      return json({ error: 'GITHUB_API_KEY não configurado (precisa ser um Personal Access Token com escopo repo)' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    );
    if (claimsErr || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);

    const email = (claimsData.claims.email as string || '').toLowerCase();
    const DEFAULT_ADMINS = ['wn7corporation@gmail.com', 'suporte.vacatio@gmail.com'];
    const envAdmins = (Deno.env.get('ADMIN_DOWNLOAD_EMAILS') || '')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const admins = new Set([...DEFAULT_ADMINS, ...envAdmins]);
    if (!admins.has(email)) return json({ error: 'Forbidden', email }, 403);

    const body = await req.json();
    const { password, repo, workflowSource, workflowSourceIos } = body;
    const platform: 'android' | 'apple' | 'both' = body.platform ?? 'android';

    const expected = Deno.env.get('ADMIN_DOWNLOAD_PASSWORD') || '';
    if (!expected || password !== expected) return json({ error: 'Senha inválida' }, 401);
    if (!repo || !REPO_RE.test(repo)) return json({ error: 'Repo inválido (use owner/repo)' }, 400);

    // 1. Verifica acesso ao repo
    const repoRes = await fetch(`${GITHUB_API}/repos/${repo}`, { headers: ghHeaders() });
    if (!repoRes.ok) {
      const details = await repoRes.text();
      return json({ error: 'Sem acesso ao repositório', status: repoRes.status, details }, repoRes.status);
    }

    // 2. Pega a public key do repo (necessária pra encriptar)
    const keyRes = await fetch(
      `${GITHUB_API}/repos/${repo}/actions/secrets/public-key`,
      { headers: ghHeaders() },
    );
    if (!keyRes.ok) {
      const details = await keyRes.text();
      return json({ error: 'Falha ao obter public key', status: keyRes.status, details }, keyRes.status);
    }
    const { key, key_id } = await keyRes.json() as { key: string; key_id: string };

    // 3. Inicializa libsodium
    await _sodium.ready;
    const sodium = _sodium;
    const publicKeyBytes = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);

    // 4. Atualiza os workflows relevantes.
    const workflows: Array<Record<string, unknown>> = [];
    if (platform === 'android' || platform === 'both') {
      workflows.push(await syncWorkflow(repo, workflowSource, WORKFLOW_PATH_ANDROID, 'Update Android build workflow signing secrets'));
    }
    if (platform === 'apple' || platform === 'both') {
      workflows.push(await syncWorkflow(repo, workflowSourceIos, WORKFLOW_PATH_IOS, 'Update iOS build workflow signing secrets'));
    }

    // 5. Para cada secret configurado, encripta e envia
    const targetSecrets: string[] = platform === 'apple'
      ? [...ALLOWED_APPLE]
      : platform === 'both'
        ? [...ALLOWED_ANDROID, ...ALLOWED_APPLE]
        : [...ALLOWED_ANDROID];

    const results: Array<{ name: string; status: 'created' | 'updated' | 'skipped' | 'error'; message?: string }> = [];

    for (const name of targetSecrets) {
      const value = Deno.env.get(name);
      if (!value) {
        results.push({ name, status: 'skipped', message: 'não configurado no Supabase' });
        continue;
      }
      try {
        const messageBytes = sodium.from_string(value);
        const encryptedBytes = sodium.crypto_box_seal(messageBytes, publicKeyBytes);
        const encrypted_value = sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL);

        const putRes = await fetch(
          `${GITHUB_API}/repos/${repo}/actions/secrets/${name}`,
          {
            method: 'PUT',
            headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ encrypted_value, key_id }),
          },
        );

        if (putRes.status === 201) {
          results.push({ name, status: 'created' });
        } else if (putRes.status === 204) {
          results.push({ name, status: 'updated' });
        } else {
          const details = await putRes.text();
          results.push({ name, status: 'error', message: `${putRes.status}: ${details.slice(0, 200)}` });
        }
      } catch (e: any) {
        results.push({ name, status: 'error', message: e?.message || String(e) });
      }
    }

    // Compat: legacy `workflow` field = primeiro workflow processado.
    return json({
      ok: true,
      repo,
      platform,
      workflow: workflows[0],
      workflows,
      total: results.length,
      synced: results.filter(r => r.status === 'created' || r.status === 'updated').length,
      results,
    });
  } catch (e: any) {
    console.error('sync-github-secrets error', e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});

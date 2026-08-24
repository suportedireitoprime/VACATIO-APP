import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/github';
const GITHUB_DIRECT_URL = 'https://api.github.com';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const GITHUB_API_KEY = Deno.env.get('GITHUB_API_KEY');
// If the stored GITHUB_API_KEY looks like a raw GitHub PAT, call the API directly
// (bypasses the Lovable connector gateway, which needs a linked connection key).
const IS_PAT = !!GITHUB_API_KEY && /^(ghp_|github_pat_|gho_|ghu_|ghs_)/.test(GITHUB_API_KEY);

function ghHeaders() {
  if (IS_PAT) {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${GITHUB_API_KEY}`,
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    'X-Connection-Api-Key': GITHUB_API_KEY!,
  };
}

async function gh(path: string, init: RequestInit = {}) {
  const base = IS_PAT ? GITHUB_DIRECT_URL : GATEWAY_URL;
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...ghHeaders(), ...(init.headers || {}) },
  });
  return res;
}

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const MOBILE_CONFIG_BUCKET = 'mobile-config';
const MOBILE_CONFIG_FILES = [
  'google-services.json',
  'GoogleService-Info.plist',
  'icon.png',
  'icon-foreground.png',
  'icon-background.png',
  'splash.png',
  'splash-dark.png',
  'notification-icon.png',
  'app-name.txt',
];


function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function pass(res: Response) {
  const text = await res.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch {}
  if (!res.ok) return json({ error: 'GitHub API failed', status: res.status, details: body }, res.status);
  return json(body);
}

async function createMobileConfigSignedUrls() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return {};

  const admin = createClient(url, serviceKey);
  const entries: Record<string, string> = {};

  await Promise.all(MOBILE_CONFIG_FILES.map(async (filename) => {
    const { data, error } = await admin.storage
      .from(MOBILE_CONFIG_BUCKET)
      .createSignedUrl(filename, 60 * 30);
    if (!error && data?.signedUrl) entries[filename] = data.signedUrl;
  }));

  return entries;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY || !GITHUB_API_KEY) {
      return json({ error: 'GitHub connector not configured' }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const { action, repo, workflow_file, run_id, artifact_id, ref, per_page, path, content_base64, message, branch } = body || {};

    if (!action) return json({ error: 'missing action' }, 400);

    if (action === 'list_accessible_repos') {
      const res = await gh(`/user/repos?per_page=${per_page || 100}&affiliation=owner,collaborator,organization_member&sort=updated`);
      if (!res.ok) return pass(res);
      const repos = await res.json();
      return json({
        repos: (repos || []).map((r: any) => ({
          full_name: r.full_name,
          private: r.private,
          default_branch: r.default_branch,
          updated_at: r.updated_at,
          html_url: r.html_url,
          permissions: r.permissions,
        })),
      });
    }

    if (!repo || !REPO_RE.test(repo)) return json({ error: 'invalid repo' }, 400);

    const wf = workflow_file || 'build-android.yml';

    switch (action) {
      case 'list_workflows':
        return pass(await gh(`/repos/${repo}/actions/workflows`));

      case 'list_runs':
        return pass(await gh(`/repos/${repo}/actions/workflows/${encodeURIComponent(wf)}/runs?per_page=${per_page || 10}`));

      case 'get_run': {
        if (!run_id) return json({ error: 'missing run_id' }, 400);
        const [runRes, jobsRes] = await Promise.all([
          gh(`/repos/${repo}/actions/runs/${run_id}`),
          gh(`/repos/${repo}/actions/runs/${run_id}/jobs`),
        ]);
        const runTxt = await runRes.text();
        const jobsTxt = await jobsRes.text();
        if (!runRes.ok) return json({ error: 'get_run failed', status: runRes.status, details: runTxt }, runRes.status);
        return json({ run: JSON.parse(runTxt), jobs: jobsRes.ok ? JSON.parse(jobsTxt) : null });
      }

      case 'list_artifacts':
        if (!run_id) return json({ error: 'missing run_id' }, 400);
        return pass(await gh(`/repos/${repo}/actions/runs/${run_id}/artifacts`));

      case 'get_logs': {
        // Retorna as últimas ~400 linhas dos logs do job que falhou (ou do job informado).
        if (!run_id) return json({ error: 'missing run_id' }, 400);
        const jobsRes = await gh(`/repos/${repo}/actions/runs/${run_id}/jobs`);
        if (!jobsRes.ok) {
          const t = await jobsRes.text();
          return json({ error: 'jobs failed', status: jobsRes.status, details: t }, jobsRes.status);
        }
        const jobsData = await jobsRes.json();
        const jobs = jobsData.jobs || [];
        const target =
          (body?.job_id && jobs.find((j: any) => j.id === body.job_id)) ||
          jobs.find((j: any) => j.conclusion === 'failure') ||
          jobs[jobs.length - 1];
        if (!target) return json({ error: 'no job found' }, 404);
        const logRes = await gh(`/repos/${repo}/actions/jobs/${target.id}/logs`, { redirect: 'follow' });
        if (!logRes.ok) {
          const t = await logRes.text();
          return json({ error: 'logs failed', status: logRes.status, details: t }, logRes.status);
        }
        const full = await logRes.text();
        const lines = full.split('\n');
        const tail = lines.slice(-500).join('\n');
        return json({
          job: { id: target.id, name: target.name, conclusion: target.conclusion },
          failed_steps: (target.steps || []).filter((s: any) => s.conclusion === 'failure'),
          log_tail: tail,
          total_lines: lines.length,
        });
      }

      case 'get_logs_compact': {
        // Retorna somente trechos próximos aos marcadores de erro para caber no chat/debug.
        if (!run_id) return json({ error: 'missing run_id' }, 400);
        const jobsRes = await gh(`/repos/${repo}/actions/runs/${run_id}/jobs`);
        if (!jobsRes.ok) {
          const t = await jobsRes.text();
          return json({ error: 'jobs failed', status: jobsRes.status, details: t }, jobsRes.status);
        }
        const jobsData = await jobsRes.json();
        const jobs = jobsData.jobs || [];
        const target =
          (body?.job_id && jobs.find((j: any) => j.id === body.job_id)) ||
          jobs.find((j: any) => j.conclusion === 'failure') ||
          jobs[jobs.length - 1];
        if (!target) return json({ error: 'no job found' }, 404);

        const logRes = await gh(`/repos/${repo}/actions/jobs/${target.id}/logs`, { redirect: 'follow' });
        if (!logRes.ok) {
          const t = await logRes.text();
          return json({ error: 'logs failed', status: logRes.status, details: t }, logRes.status);
        }
        const full = await logRes.text();
        const lines = full.split('\n');
        const patterns = [
          /FAILURE:/i,
          /Execution failed/i,
          /Process.*failed/i,
          /Manifest merger failed/i,
          /uses-sdk/i,
          /minSdk/i,
          /duplicate/i,
          /error:/i,
          /Caused by:/i,
        ];
        const indexes = lines
          .map((line, index) => ({ line, index }))
          .filter(({ line }) => patterns.some((p) => p.test(line)))
          .map(({ index }) => index);

        const ranges: Array<[number, number]> = [];
        for (const idx of indexes) {
          const start = Math.max(0, idx - 18);
          const end = Math.min(lines.length, idx + 36);
          const last = ranges[ranges.length - 1];
          if (last && start <= last[1] + 5) last[1] = Math.max(last[1], end);
          else ranges.push([start, end]);
        }

        const snippets = ranges.slice(-6).map(([start, end]) => ({
          start_line: start + 1,
          end_line: end,
          text: lines.slice(start, end).join('\n'),
        }));

        return json({
          job: { id: target.id, name: target.name, conclusion: target.conclusion },
          failed_steps: (target.steps || []).filter((s: any) => s.conclusion === 'failure'),
          total_lines: lines.length,
          snippets,
          tail: lines.slice(-80).join('\n'),
        });
      }



      case 'download_artifact': {
        if (!artifact_id) return json({ error: 'missing artifact_id' }, 400);
        const res = await gh(`/repos/${repo}/actions/artifacts/${artifact_id}/zip`, { redirect: 'follow' });
        if (!res.ok) {
          const txt = await res.text();
          return json({ error: 'download failed', status: res.status, details: txt }, res.status);
        }
        return new Response(res.body, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="artifact.zip"',
          },
        });
      }

      case 'dispatch_run': {
        const mobileConfigUrls = await createMobileConfigSignedUrls();
        const inputs = Object.keys(mobileConfigUrls).length
          ? { mobile_config_urls: JSON.stringify(mobileConfigUrls) }
          : undefined;
        let res = await gh(`/repos/${repo}/actions/workflows/${encodeURIComponent(wf)}/dispatches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref: ref || 'main', ...(inputs ? { inputs } : {}) }),
        });
        if (!res.ok && inputs && res.status === 422) {
          await res.text();
          res = await gh(`/repos/${repo}/actions/workflows/${encodeURIComponent(wf)}/dispatches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: ref || 'main' }),
          });
        }
        if (!res.ok) {
          const txt = await res.text();
          return json({ error: 'dispatch failed', status: res.status, details: txt }, res.status);
        }
        await res.text();
        return json({ ok: true });
      }

      case 'get_repo':
        return pass(await gh(`/repos/${repo}`));

      case 'get_file': {
        if (!path || typeof path !== 'string') return json({ error: 'missing path' }, 400);
        const res = await gh(`/repos/${repo}/contents/${encodeURI(path)}${branch ? `?ref=${encodeURIComponent(branch)}` : ''}`);
        return pass(res);
      }

      case 'list_actions_secrets':
        return pass(await gh(`/repos/${repo}/actions/secrets?per_page=${per_page || 100}`));

      case 'commit_file': {
        // Commita/atualiza um arquivo no repo via Contents API.
        if (!path || typeof path !== 'string') return json({ error: 'missing path' }, 400);
        if (!content_base64 || typeof content_base64 !== 'string') return json({ error: 'missing content_base64' }, 400);
        const targetBranch = branch || 'main';
        // Descobre SHA atual (se existir) pra fazer update.
        const getRes = await gh(`/repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(targetBranch)}`);
        let sha: string | undefined;
        if (getRes.ok) {
          const cur = await getRes.json().catch(() => null);
          if (cur && typeof cur.sha === 'string') sha = cur.sha;
        }
        const putRes = await gh(`/repos/${repo}/contents/${encodeURI(path)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message || `chore: update ${path}`,
            content: content_base64,
            branch: targetBranch,
            ...(sha ? { sha } : {}),
          }),
        });
        return pass(putRes);
      }

      case 'patch_ios_profile_install': {
        const workflowPath = '.github/workflows/build-ios.yml';
        const targetBranch = branch || 'main';
        const getRes = await gh(`/repos/${repo}/contents/${encodeURI(workflowPath)}?ref=${encodeURIComponent(targetBranch)}`);
        if (!getRes.ok) return pass(getRes);
        const cur = await getRes.json() as { sha?: string; content?: string; encoding?: string };
        if (!cur.sha || cur.encoding !== 'base64' || !cur.content) return json({ error: 'invalid workflow content response' }, 500);
        const source = new TextDecoder().decode(Uint8Array.from(atob(cur.content.replace(/\s/g, '')), c => c.charCodeAt(0)));
        const oldBlock = `      - name: Install provisioning profile
        run: |
          set -euo pipefail
          PROFILES_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"
          mkdir -p "$PROFILES_DIR"
          UUID=$(security cms -D -i "$RUNNER_TEMP/signing/profile.mobileprovision" | plutil -extract UUID raw -)
          NAME=$(security cms -D -i "$RUNNER_TEMP/signing/profile.mobileprovision" | plutil -extract Name raw -)
          cp "$RUNNER_TEMP/signing/profile.mobileprovision" "$PROFILES_DIR/$UUID.mobileprovision"
          echo "Installed profile: $NAME ($UUID)"
          echo "PROFILE_NAME=$NAME" >> "$GITHUB_ENV"`;
        const newBlock = `      - name: Install provisioning profile
        run: |
          set -euo pipefail
          PROFILES_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"
          mkdir -p "$PROFILES_DIR"
          PROFILE_PLIST="$RUNNER_TEMP/signing/profile.plist"
          if ! security cms -D -i "$RUNNER_TEMP/signing/profile.mobileprovision" > "$PROFILE_PLIST"; then
            echo "::error::Could not decode provisioning profile. Recreate the App Store provisioning profile and re-sync APPLE_PROVISIONING_PROFILE_BASE64."
            exit 1
          fi
          UUID=$(/usr/libexec/PlistBuddy -c "Print :UUID" "$PROFILE_PLIST")
          NAME=$(/usr/libexec/PlistBuddy -c "Print :Name" "$PROFILE_PLIST")
          APP_IDENTIFIER=$(/usr/libexec/PlistBuddy -c "Print :Entitlements:application-identifier" "$PROFILE_PLIST" 2>/dev/null || true)
          if [ -z "$UUID" ] || [ -z "$NAME" ]; then
            echo "::error::Provisioning profile is missing UUID or Name. Recreate it in Apple Developer → Profiles → App Store Connect."
            exit 1
          fi
          if [[ "$APP_IDENTIFIER" != "\${APPLE_TEAM_ID}.\${APPLE_BUNDLE_ID}" ]]; then
            echo "::error::Provisioning profile app id mismatch. Expected \${APPLE_TEAM_ID}.\${APPLE_BUNDLE_ID}, got \${APP_IDENTIFIER:-unknown}."
            exit 1
          fi
          cp "$RUNNER_TEMP/signing/profile.mobileprovision" "$PROFILES_DIR/$UUID.mobileprovision"
          echo "Installed profile: $NAME ($UUID)"
          {
            echo "PROFILE_NAME<<EOF"
            echo "$NAME"
            echo "EOF"
          } >> "$GITHUB_ENV"`;
        if (!source.includes(oldBlock)) {
          return json({ ok: true, status: source.includes('PROFILE_PLIST="$RUNNER_TEMP/signing/profile.plist"') ? 'already_patched' : 'old_block_not_found' });
        }
        const updated = source.replace(oldBlock, newBlock);
        const bytes = new TextEncoder().encode(updated);
        let encoded = '';
        for (const byte of bytes) encoded += String.fromCharCode(byte);
        const putRes = await gh(`/repos/${repo}/contents/${encodeURI(workflowPath)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Corrige leitura do provisioning profile no build iOS',
            content: btoa(encoded),
            branch: targetBranch,
            sha: cur.sha,
          }),
        });
        return pass(putRes);
      }

      case 'patch_ios_profile_text_extract': {
        const workflowPath = '.github/workflows/build-ios.yml';
        const targetBranch = branch || 'main';
        const getRes = await gh(`/repos/${repo}/contents/${encodeURI(workflowPath)}?ref=${encodeURIComponent(targetBranch)}`);
        if (!getRes.ok) return pass(getRes);
        const cur = await getRes.json() as { sha?: string; content?: string; encoding?: string };
        if (!cur.sha || cur.encoding !== 'base64' || !cur.content) return json({ error: 'invalid workflow content response' }, 500);
        const source = new TextDecoder().decode(Uint8Array.from(atob(cur.content.replace(/\s/g, '')), c => c.charCodeAt(0)));
        const oldBlock = `          UUID=$(/usr/libexec/PlistBuddy -c "Print :UUID" "$PROFILE_PLIST")
          NAME=$(/usr/libexec/PlistBuddy -c "Print :Name" "$PROFILE_PLIST")
          APP_IDENTIFIER=$(/usr/libexec/PlistBuddy -c "Print :Entitlements:application-identifier" "$PROFILE_PLIST" 2>/dev/null || true)`;
        const newBlock = `          extract_next_string() {
            local key="$1"
            awk -v key="<key>\${key}</key>" '
              index($0, key) { found=1; next }
              found && /<string>/ {
                gsub(/^.*<string>/, "");
                gsub(/<\\/string>.*$/, "");
                print;
                exit;
              }
            ' "$PROFILE_PLIST"
          }
          UUID=$(extract_next_string "UUID")
          NAME=$(extract_next_string "Name")
          APP_IDENTIFIER=$(extract_next_string "application-identifier")`;
        if (!source.includes(oldBlock)) {
          return json({ ok: true, status: source.includes('extract_next_string()') ? 'already_patched' : 'old_block_not_found' });
        }
        const updated = source.replace(oldBlock, newBlock);
        const bytes = new TextEncoder().encode(updated);
        let encoded = '';
        for (const byte of bytes) encoded += String.fromCharCode(byte);
        const putRes = await gh(`/repos/${repo}/contents/${encodeURI(workflowPath)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Evita PlistBuddy ao ler provisioning profile no iOS',
            content: btoa(encoded),
            branch: targetBranch,
            sha: cur.sha,
          }),
        });
        return pass(putRes);
      }

      default:
        return json({ error: `unknown action ${action}` }, 400);
    }
  } catch (e) {
    console.error('github-actions error', e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});

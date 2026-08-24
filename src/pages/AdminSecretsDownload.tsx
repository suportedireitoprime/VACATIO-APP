import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Download, ShieldAlert, KeyRound, Copy, Github, CheckCircle2, XCircle, BookOpen, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminGithubTabs } from '@/components/admin/AdminGithubTabs';
import { useSharedGithubRepo } from '@/hooks/useSharedGithubRepo';

const ANDROID_SECRETS = [
  'ANDROID_KEYSTORE_BASE64',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'GOOGLE_WEB_CLIENT_ID',
] as const;

const APPLE_SECRETS = [
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

const SECRET_DETAILS: Record<string, string> = {
  ANDROID_KEYSTORE_BASE64: 'Arquivo upload-keystore.jks convertido em base64.',
  ANDROID_KEYSTORE_PASSWORD: 'Senha que abre o arquivo keystore.',
  ANDROID_KEY_PASSWORD: 'Senha da chave privada. Se não existir, o workflow usa a senha do keystore.',
  ANDROID_KEY_ALIAS: 'Alias da chave dentro do keystore.',
  GOOGLE_WEB_CLIENT_ID: 'Client ID web usado pelo login Google nativo.',
  APPLE_TEAM_ID: 'Team ID da conta Apple Developer (ex: DKVT35Y3W5).',
  APPLE_BUNDLE_ID: 'Bundle Identifier do app iOS (ex: br.com.vacatio.app).',
  APPLE_APP_STORE_CONNECT_KEY_ID: 'Key ID da API do App Store Connect (10 caracteres).',
  APPLE_APP_STORE_CONNECT_ISSUER_ID: 'Issuer ID da API do App Store Connect (UUID).',
  APPLE_APP_STORE_CONNECT_KEY_P8_BASE64: 'Arquivo .p8 da API Key convertido em base64.',
  APPLE_DISTRIBUTION_CERT_P12_BASE64: 'Certificado de distribuição (.p12) convertido em base64.',
  APPLE_DISTRIBUTION_CERT_PASSWORD: 'Senha usada ao exportar o certificado .p12.',
  APPLE_PROVISIONING_PROFILE_BASE64: 'Provisioning Profile de distribuição (.mobileprovision) em base64.',
  KEYCHAIN_PASSWORD: 'Senha temporária usada pelo GitHub Actions para abrir o keychain de assinatura iOS.',
};

type Platform = 'android' | 'apple';

const WORKFLOW_FILES: Record<Platform, string> = {
  android: 'build-android.yml',
  apple: 'build-ios.yml',
};

async function loadWorkflowSource(platform: Platform): Promise<string | undefined> {
  const file = WORKFLOW_FILES[platform];
  const baseUrl = import.meta.env.BASE_URL || '/';
  const url = `${baseUrl.replace(/\/$/, '')}/workflows/${file}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const trimmed = text.trimStart();
    if (!trimmed || trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
      throw new Error('workflow inválido');
    }
    return text;
  } catch (error) {
    console.warn(`[admin-secrets] Workflow ${file} não pôde ser carregado`, error);
    return undefined;
  }
}

export default function AdminSecretsDownload() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform>('android');
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [available, setAvailable] = useState<string[]>([]);
  const [fingerprints, setFingerprints] = useState<Record<string, { last4: string; length: number }>>({});
  const [showGuide, setShowGuide] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const { repo, setRepo, commit: commitRepo } = useSharedGithubRepo('WN7CORP/lexi-guide');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<null | {
    synced: number;
    total: number;
    workflow?: { status: string; message?: string; branch?: string; html_url?: string; path?: string };
    workflows?: Array<{ status: string; message?: string; path?: string }>;
    results: Array<{ name: string; status: string; message?: string }>;
  }>(null);

  const SECRETS = platform === 'android' ? ANDROID_SECRETS : APPLE_SECRETS;

  const handleSync = async () => {
    if (!password) { toast.error('Digite a senha admin'); return; }
    const normalized = commitRepo();
    if (!normalized.match(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)) {
      toast.error('Formato inválido. Use owner/repo (ex: WN7CORP/vade-mestre-app)');
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    try {
      const selectedWorkflowSource = await loadWorkflowSource(platform);
      if (!selectedWorkflowSource) {
        toast.warning('Workflow não encontrado no build; vou sincronizar os secrets sem atualizar o YAML.');
      }
      const { data, error } = await supabase.functions.invoke('sync-github-secrets', {
        body: {
          password,
          repo: normalized,
          platform,
          workflowSource: platform === 'android' ? selectedWorkflowSource : undefined,
          workflowSourceIos: platform === 'apple' ? selectedWorkflowSource : undefined,
        },
      });
      if (error) throw new Error(error.message || 'Falha na sincronização');
      if (data?.error) throw new Error(data.error);
      setSyncResult(data);
      const workflowErrors = (data.workflows || [data.workflow]).filter((w: any) => w?.status === 'error');
      if (workflowErrors.length > 0) {
        toast.warning(`Secrets enviados, mas o workflow ${platform === 'apple' ? 'iOS' : 'Android'} não foi atualizado`);
      } else {
        toast.success(`${data.synced}/${data.total} secrets (${platform}) enviados para ${normalized}`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Falha ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('admin-download-secret', {
          body: { listOnly: true },
        });
        if (error) throw error;
        setAvailable(data?.available || []);
        setFingerprints(data?.fingerprints || {});
      } catch (e: any) {
        setForbidden(true);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const fetchSecret = async (name: string): Promise<{ blob: Blob; text: string } | null> => {
    if (!password) { toast.error('Digite a senha admin'); return null; }
    const { data: sess } = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-download-secret`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${sess.session?.access_token || ''}`,
      },
      body: JSON.stringify({ password, secretName: name }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `Erro ${res.status}`);
    }
    const text = await res.text();
    return { blob: new Blob([text], { type: 'text/plain' }), text };
  };

  const download = async (name: string) => {
    setLoading(`${name}:dl`);
    try {
      const r = await fetchSecret(name);
      if (!r) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(r.blob);
      link.download = `${name}.txt`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 2000);
      setUnlocked(true);
      toast.success(`${name}.txt baixado`);
    } catch (e: any) {
      toast.error(e.message || 'Falha no download');
    } finally {
      setLoading(null);
    }
  };

  const copy = async (name: string) => {
    setLoading(`${name}:cp`);
    try {
      const r = await fetchSecret(name);
      if (!r) return;
      await navigator.clipboard.writeText(r.text);
      setUnlocked(true);
      toast.success(`${name} copiado`);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao copiar');
    } finally {
      setLoading(null);
    }
  };

  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center gap-3">
        <ShieldAlert className="w-10 h-10 text-destructive" />
        <h1 className="text-xl font-display">Acesso negado</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Seu e-mail não está na lista <code>ADMIN_DOWNLOAD_EMAILS</code>.
        </p>
      </div>
    );
  }

  const copyName = async (name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      toast.success(`Nome "${name}" copiado`);
    } catch {
      toast.error('Falha ao copiar nome');
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader
        title={platform === 'android' ? 'Secrets Android' : 'Secrets Apple'}
        subtitle="Copie o nome para o GitHub Secrets e o valor da chave separadamente."
        onBack={() => navigate('/admin-funcoes')}
        leading={<KeyRound className="w-5 h-5 text-primary" />}
      />
      <div className="p-4 pt-6 max-w-3xl mx-auto space-y-6">

      <AdminGithubTabs />

      {/* Seletor de plataforma */}
      <div className="w-full p-1 rounded-2xl bg-secondary/70 border border-border flex items-center gap-1">
        {(['android', 'apple'] as const).map((p) => {
          const active = platform === p;
          return (
            <button
              key={p}
              onClick={() => { setPlatform(p); setSyncResult(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-body text-xs sm:text-sm font-semibold transition-all ${
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === 'android' ? '🤖 Android (Play Store)' : ' Apple (App Store)'}
            </button>
          );
        })}
      </div>

      {platform === 'apple' && (
        <Card className="p-4 border-primary/40 bg-primary/5">
          <button
            onClick={() => navigate('/admin-apple-csr')}
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-primary shrink-0" />
              <div>
                <div className="font-display text-sm">Gerar chave privada + CSR</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Passo 1 para criar o certificado <code>.p12</code> — abre <code>/admin-apple-csr</code>
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-primary shrink-0" />
          </button>
        </Card>
      )}

      <Card className="p-4 space-y-3 border-primary/30">
        <button
          onClick={() => setShowGuide(v => !v)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-display text-base">
              {platform === 'android' ? 'Passo a passo: site → app Android' : 'Passo a passo: site → app iOS'}
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">{showGuide ? 'Fechar' : 'Abrir'}</span>
        </button>

        {showGuide && platform === 'android' && (
          <div className="space-y-4 text-sm pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Fluxo completo usando Capacitor + GitHub Actions com os secrets desta página.
            </p>

            <Step n={1} title="Preparar o projeto (Capacitor)">
              Instale <code className="text-xs bg-muted/40 px-1 rounded">@capacitor/core @capacitor/android @capacitor/cli</code> e rode <code className="text-xs bg-muted/40 px-1 rounded">npx cap init</code>. Configure <code className="text-xs bg-muted/40 px-1 rounded">appId</code> (ex: <code className="text-xs bg-muted/40 px-1 rounded">br.com.vacatio.app</code>) em <code className="text-xs bg-muted/40 px-1 rounded">capacitor.config.ts</code>.
              <DocLink href="https://capacitorjs.com/docs/getting-started">Docs Capacitor</DocLink>
            </Step>

            <Step n={2} title="Gerar keystore de assinatura">
              Rode <code className="text-xs bg-muted/40 px-1 rounded">keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload</code>. Anote <b>senha do keystore</b>, <b>senha da chave</b> e <b>alias</b>. Converta em base64: <code className="text-xs bg-muted/40 px-1 rounded">base64 upload-keystore.jks &gt; keystore.b64</code>.
              <DocLink href="https://developer.android.com/studio/publish/app-signing">Docs Android Signing</DocLink>
            </Step>

            <Step n={3} title="Salvar os 4 secrets do keystore no Supabase">
              Use esta página para conferir e enviar ao GitHub:
              <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                <li><code>ANDROID_KEYSTORE_BASE64</code> — conteúdo do <code>keystore.b64</code></li>
                <li><code>ANDROID_KEYSTORE_PASSWORD</code> — senha do arquivo .jks</li>
                <li><code>ANDROID_KEY_PASSWORD</code> — senha da chave privada (opcional; usa a do keystore se vazio)</li>
                <li><code>ANDROID_KEY_ALIAS</code> — alias (ex: <code>upload</code>)</li>
              </ul>
            </Step>

            <Step n={4} title="Configurar Google Sign-In (opcional)">
              No Google Cloud Console crie um <b>OAuth Client ID</b> tipo Web. Cole o Client ID em <code className="text-xs bg-muted/40 px-1 rounded">GOOGLE_WEB_CLIENT_ID</code>. Baixe o <code>google-services.json</code> do Firebase (com package correto + SHA-1) e suba em <code>/admin-native-assets</code>.
              <DocLink href="https://firebase.google.com/docs/android/setup">Docs Firebase Android</DocLink>
            </Step>

            <Step n={5} title="Sincronizar secrets no GitHub">
              Preencha <b>senha admin</b> e <b>owner/repo</b> abaixo e clique em <b>Sincronizar secrets para o GitHub</b>. Isso envia os 5 secrets e atualiza <code className="text-xs bg-muted/40 px-1 rounded">.github/workflows/build-android.yml</code>.
            </Step>

            <Step n={6} title="Rodar o build e baixar o .aab / .apk">
              Vá em <b>GitHub → Actions → Build Android</b> e clique em <i>Run workflow</i>. Ao terminar, baixe os artifacts (<code>.aab</code> para Play Store, <code>.apk</code> para teste direto).
              <DocLink href="https://docs.github.com/actions/using-workflows/manually-running-a-workflow">Docs GitHub Actions</DocLink>
            </Step>

            <Step n={7} title="Publicar na Play Store">
              Envie o <code>.aab</code> em <b>Google Play Console → Produção → Criar release</b>. Preencha ficha da loja, política de privacidade e conteúdo. Aguarde revisão.
              <DocLink href="https://support.google.com/googleplay/android-developer/answer/9859152">Docs Play Console</DocLink>
            </Step>
          </div>
        )}

        {showGuide && platform === 'apple' && (
          <div className="space-y-4 text-sm pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Fluxo completo iOS usando Capacitor + Xcode Cloud/GitHub Actions com os secrets desta página.
            </p>

            <Step n={1} title="Conta Apple Developer + Bundle ID">
              Ative a conta Apple Developer (US$ 99/ano). Em <b>App Store Connect</b>, registre o <b>Bundle ID</b> do app (ex: <code className="text-xs bg-muted/40 px-1 rounded">br.com.vacatio.app</code>) e salve em <code>APPLE_BUNDLE_ID</code>. O <b>Team ID</b> aparece no canto superior direito — salve em <code>APPLE_TEAM_ID</code>.
              <DocLink href="https://developer.apple.com/account">Portal Apple Developer</DocLink>
            </Step>

            <Step n={2} title="Gerar chave e CSR (Certificate Signing Request)">
              Abra <a href="/admin-apple-csr" className="text-primary underline">/admin-apple-csr</a> e gere a chave privada RSA 2048 + arquivo <code>.certSigningRequest</code> direto no navegador — sem precisar rodar <code>openssl</code>.
            </Step>

            <Step n={3} title="Certificado de distribuição (.p12)">
              No portal Apple, envie o <code>.certSigningRequest</code> para gerar um <b>Apple Distribution Certificate</b>. Baixe o <code>.cer</code>, combine com a chave privada e exporte como <code>.p12</code> (com senha). Converta em base64: <code className="text-xs bg-muted/40 px-1 rounded">base64 -i cert.p12 -o cert.b64</code> e salve:
              <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                <li><code>APPLE_DISTRIBUTION_CERT_P12_BASE64</code> — conteúdo do <code>cert.b64</code></li>
                <li><code>APPLE_DISTRIBUTION_CERT_PASSWORD</code> — senha do <code>.p12</code></li>
              </ul>
            </Step>

            <Step n={4} title="Provisioning Profile (.mobileprovision)">
              No portal Apple, crie um <b>App Store Provisioning Profile</b> para o Bundle ID acima, associado ao certificado de distribuição. Baixe o <code>.mobileprovision</code>, converta em base64 e salve em <code>APPLE_PROVISIONING_PROFILE_BASE64</code>.
            </Step>

            <Step n={5} title="App Store Connect API Key (.p8)">
              Em <b>App Store Connect → Users and Access → Keys</b>, crie uma chave com role <i>App Manager</i>. Baixe o <code>.p8</code> (só aparece uma vez), anote o <b>Key ID</b> e o <b>Issuer ID</b>. Converta o <code>.p8</code> em base64 e salve:
              <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                <li><code>APPLE_APP_STORE_CONNECT_KEY_ID</code></li>
                <li><code>APPLE_APP_STORE_CONNECT_ISSUER_ID</code></li>
                <li><code>APPLE_APP_STORE_CONNECT_KEY_P8_BASE64</code></li>
              </ul>
              <DocLink href="https://developer.apple.com/documentation/appstoreconnectapi/creating-api-keys-for-app-store-connect-api">Docs App Store Connect API</DocLink>
            </Step>

            <Step n={6} title="Sincronizar secrets no GitHub">
              Preencha <b>senha admin</b> e <b>owner/repo</b> abaixo, mantenha a aba <b>Apple</b> ativa e clique em <b>Sincronizar secrets para o GitHub</b>. Os 9 secrets iOS acima serão enviados como GitHub Actions Secrets.
            </Step>

            <Step n={7} title="Build e envio à App Store">
              Com um runner macOS (GitHub Actions ou Xcode Cloud), o workflow decodifica o <code>.p12</code> + provisioning, assina o app e envia à App Store Connect com a API Key. Depois, envie para revisão em <b>App Store Connect → App Store → Enviar para revisão</b>.
              <DocLink href="https://docs.github.com/actions/deployment/deploying-xcode-applications">Docs GitHub Actions iOS</DocLink>
            </Step>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Senha admin de download
        </label>
        <Input
          type="password"
          placeholder="Digite ADMIN_DOWNLOAD_PASSWORD"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="off"
        />
      </Card>

      <Card className="p-4 space-y-3 border-primary/30">
        <div className="flex items-center gap-2">
          <Github className="w-5 h-5 text-primary" />
          <h2 className="font-display text-base">Sincronizar com GitHub</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Envia os secrets configurados e atualiza o workflow {platform === 'apple' ? 'iOS' : 'Android'} do repositório. Este repositório é o <b>mesmo</b> usado para enviar o ícone/splash em <i>Ícones &amp; Splash</i>.
        </p>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block">
          Repositório (owner/repo) — compartilhado
        </label>
        <Input
          placeholder="ex: wn7corp/vade-mestre-app"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          autoComplete="off"
        />
        <Button
          onClick={handleSync}
          disabled={syncing || !password || !repo}
          className="w-full gap-2"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
          {syncing ? 'Enviando...' : 'Sincronizar secrets para o GitHub'}
        </Button>

        {syncResult && (
          <div className="mt-2 space-y-1 border-t border-border pt-3">
            {(syncResult.workflows || (syncResult.workflow ? [syncResult.workflow] : [])).map((workflow) => (
              <div key={workflow.path || workflow.message || workflow.status} className="flex items-start gap-2 text-xs mb-2">
                {workflow.status === 'updated' || workflow.status === 'created' || workflow.status === 'unchanged' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                ) : workflow.status === 'skipped' ? (
                  <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-mono">{workflow.path || (platform === 'apple' ? '.github/workflows/build-ios.yml' : '.github/workflows/build-android.yml')}</span>
                  <span className="text-muted-foreground ml-1">
                    · {workflow.status}{workflow.message ? `: ${workflow.message}` : ''}
                  </span>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mb-2">
              {syncResult.synced}/{syncResult.total} enviados
            </p>
            {syncResult.results.map((r) => (
              <div key={r.name} className="flex items-start gap-2 text-xs">
                {r.status === 'created' || r.status === 'updated' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                ) : r.status === 'skipped' ? (
                  <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-mono">{r.name}</span>
                  <span className="text-muted-foreground ml-1">
                    · {r.status}{r.message ? `: ${r.message}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>


      <div className="space-y-3">
        {SECRETS.map((name) => {
          const has = available.includes(name);
          return (
            <Card key={name} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm break-all leading-snug">{name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {has ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-500">
                        <CheckCircle2 className="w-3 h-3" /> Configurado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive">
                        <XCircle className="w-3 h-3" /> Não configurado
                      </span>
                    )}
                    {fingerprints[name] && (
                      <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                        ···{fingerprints[name].last4} · {fingerprints[name].length} chars
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {SECRET_DETAILS[name]}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyName(name)}
                  className="gap-2 shrink-0"
                  aria-label={`Copiar nome ${name}`}
                >
                  <Copy className="w-4 h-4" />
                  Nome
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!has || !password || loading?.startsWith(name)}
                  onClick={() => copy(name)}
                  className="gap-2 flex-1 min-w-[140px]"
                >
                  {loading === `${name}:cp`
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Copy className="w-4 h-4" />}
                  Copiar valor
                </Button>
                <Button
                  size="sm"
                  disabled={!has || !password || loading?.startsWith(name)}
                  onClick={() => download(name)}
                  className="gap-2 flex-1 min-w-[140px]"
                >
                  {loading === `${name}:dl`
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Download className="w-4 h-4" />}
                  Baixar .txt
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {unlocked && (
        <p className="text-xs text-muted-foreground text-center">
          Guarde os arquivos em local seguro. Você pode reimportá-los como GitHub Secrets em outro repositório.
        </p>
      )}
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
        {n}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm mb-1">{title}</p>
        <div className="text-xs text-muted-foreground leading-relaxed space-y-1">{children}</div>
      </div>
    </div>
  );
}

function DocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
    >
      <ExternalLink className="w-3 h-3" />
      {children}
    </a>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload, Trash2, CheckCircle2, XCircle, Loader2, Image as ImageIcon,
  FileJson, Sparkles, ExternalLink, RefreshCw, Download, Info, Rocket,
} from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { generateVariants, blobToBase64 } from '@/lib/generateIconVariants';
import { AdminGithubTabs } from '@/components/admin/AdminGithubTabs';
import { useSharedGithubRepo } from '@/hooks/useSharedGithubRepo';

type AssetKey =
  | 'icon.png'
  | 'icon-foreground.png'
  | 'icon-background.png'
  | 'splash.png'
  | 'splash-dark.png'
  | 'notification-icon.png'
  | 'google-services.json'
  | 'GoogleService-Info.plist';

type AssetSpec = {
  key: AssetKey;
  label: string;
  hint: string;
  accept: string;
  required?: boolean;
  isImage?: boolean;
};

const SPECS: AssetSpec[] = [
  { key: 'icon.png',                label: 'Ícone do app',            hint: '1024×1024 PNG opaco',              accept: 'image/png',        required: true,  isImage: true },
  { key: 'icon-foreground.png',     label: 'Ícone adaptativo (frente)', hint: '1024×1024 PNG transparente, logo a 66%', accept: 'image/png', isImage: true },
  { key: 'icon-background.png',     label: 'Ícone adaptativo (fundo)',  hint: '1024×1024 PNG cor sólida',        accept: 'image/png',        isImage: true },
  { key: 'splash.png',              label: 'Splash screen',           hint: '2732×2732 PNG, logo centralizado', accept: 'image/png',        required: true, isImage: true },
  { key: 'splash-dark.png',         label: 'Splash (dark)',           hint: '2732×2732 PNG tema escuro',        accept: 'image/png',        isImage: true },
  { key: 'notification-icon.png',   label: 'Ícone de notificação',    hint: '96×96 branco monocromático transparente (Android)', accept: 'image/png', required: true, isImage: true },
  { key: 'google-services.json',    label: 'google-services.json',    hint: 'Firebase Android (push notifications)', accept: 'application/json,.json', required: true },
  { key: 'GoogleService-Info.plist',label: 'GoogleService-Info.plist',hint: 'Firebase iOS (opcional)',           accept: '.plist,application/xml,text/xml' },
];

type FileEntry = { name: string; updated_at?: string; metadata?: { size?: number } };

const callFn = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('mobile-config-upload', { body });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
};

const CHECKLIST_ITEMS = [
  { key: 'google-services.json', text: 'Firebase configurado (push notifications)' },
  { key: 'icon.png',              text: 'Ícone 1024×1024 enviado' },
  { key: 'icon-foreground.png',   text: 'Ícone adaptativo Android enviado' },
  { key: 'splash.png',            text: 'Splash screen enviado' },
  { key: 'notification-icon.png', text: 'Ícone de notificação (monocromático) enviado' },
];

const REFS = [
  { label: 'Firebase Console — criar projeto', href: 'https://console.firebase.google.com/' },
  { label: 'Capacitor Assets — docs', href: 'https://capacitorjs.com/docs/guides/splash-screens-and-icons' },
  { label: 'FCM Android setup', href: 'https://firebase.google.com/docs/cloud-messaging/android/client' },
  { label: 'Play Console pré-lançamento', href: 'https://support.google.com/googleplay/android-developer/answer/9859455' },
];

const AdminNativeAssets = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<Record<string, FileEntry>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [autoGenBusy, setAutoGenBusy] = useState(false);
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState<{ type: 'success' | 'error'; text: string; url?: string } | null>(null);
  const [appName, setAppName] = useState<string>('Vacatio');
  const [appNameSaved, setAppNameSaved] = useState<string>('Vacatio');
  const [appNameBusy, setAppNameBusy] = useState(false);
  const { repo, setRepo, commit: commitRepo } = useSharedGithubRepo('WN7CORP/lexi-guide');
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const autoGenRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await callFn({ action: 'list' });
      const map: Record<string, FileEntry> = {};
      for (const f of (res.files || []) as FileEntry[]) map[f.name] = f;
      setFiles(map);

      // signed URLs for image previews
      const nextPreviews: Record<string, string> = {};
      await Promise.all(
        SPECS.filter(s => s.isImage && map[s.key]).map(async s => {
          try {
            const u = await callFn({ action: 'signed_url', filename: s.key });
            nextPreviews[s.key] = u.url;
          } catch {}
        }),
      );
      setPreviews(nextPreviews);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Carrega app-name atual do bucket
  useEffect(() => {
    (async () => {
      try {
        const u = await callFn({ action: 'signed_url', filename: 'app-name.txt' });
        const r = await fetch(u.url);
        if (r.ok) {
          const txt = (await r.text()).trim();
          if (txt) { setAppName(txt); setAppNameSaved(txt); }
        }
      } catch {}
    })();
  }, []);

  const saveAppName = async () => {
    const name = appName.trim() || 'Vacatio';
    setAppNameBusy(true);
    setError(null);
    try {
      const b64 = btoa(unescape(encodeURIComponent(name)));
      await callFn({
        action: 'upload',
        filename: 'app-name.txt',
        contentBase64: b64,
        contentType: 'text/plain',
      });
      setAppNameSaved(name);
      setAppName(name);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAppNameBusy(false);
    }
  };

  const upload = async (spec: AssetSpec, file: File) => {
    setUploading(spec.key);
    setError(null);
    try {
      const b64 = await blobToBase64(file);
      await callFn({
        action: 'upload',
        filename: spec.key,
        contentBase64: b64,
        contentType: file.type || (spec.key.endsWith('.png') ? 'image/png' : 'application/json'),
      });
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(null);
    }
  };

  const remove = async (spec: AssetSpec) => {
    if (!confirm(`Remover ${spec.label}?`)) return;
    setUploading(spec.key);
    try {
      await callFn({ action: 'delete', filename: spec.key });
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(null);
    }
  };

  const autoGenerate = async (file: File) => {
    setAutoGenBusy(true);
    setError(null);
    try {
      const v = await generateVariants(file);
      const uploads: [AssetKey, Blob][] = [
        ['icon.png', v.icon],
        ['icon-foreground.png', v.iconForeground],
        ['icon-background.png', v.iconBackground],
        ['splash.png', v.splash],
        ['splash-dark.png', v.splashDark],
        ['notification-icon.png', v.notificationIcon],
      ];
      for (const [name, blob] of uploads) {
        setUploading(name);
        const b64 = await blobToBase64(blob);
        await callFn({ action: 'upload', filename: name, contentBase64: b64, contentType: 'image/png' });
      }
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(null);
      setAutoGenBusy(false);
    }
  };

  const dispatchBuild = async () => {
    setDispatchBusy(true);
    setDispatchMsg(null);
    try {
      const cleaned = commitRepo();
      if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(cleaned)) {
        throw new Error('Repositório inválido. Use o formato owner/repo (ex.: WN7CORP/lexi-guide).');
      }
      const { data, error: fnErr } = await supabase.functions.invoke('github-actions', {
        body: { action: 'dispatch_run', repo: cleaned, workflow_file: 'build-android.yml', ref: 'main' },
      });
      if (fnErr) throw new Error(fnErr.message);
      if ((data as any)?.error) {
        const det = (data as any).details;
        const detStr = typeof det === 'string' ? det : JSON.stringify(det || {});
        if ((data as any).status === 404) {
          throw new Error(`Repositório ou workflow não encontrado em "${cleaned}". Verifique se o nome está exato e se o token do GitHub tem acesso ao repo.`);
        }
        throw new Error(`${(data as any).error}: ${detStr}`);
      }
      setDispatchMsg({
        type: 'success',
        text: 'Build enviado! Estas imagens serão usadas na compilação.',
        url: `https://github.com/${cleaned}/actions/workflows/build-android.yml`,
      });
    } catch (e: any) {
      setDispatchMsg({ type: 'error', text: e.message || 'Falha ao disparar build' });
    } finally {
      setDispatchBusy(false);
    }
  };


  const fmtBytes = (n?: number) => {
    if (!n) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-dvh bg-background pb-16">
      <PageHeader
        title="Ícone, Splash e Config Nativa"
        onBack={() => navigate('/admin-passo-a-passo-lojas')}
        rightAction={
          <button
            onClick={refresh}
            disabled={loading}
            className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-muted-foreground disabled:opacity-50"
            aria-label="Atualizar"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="p-4 space-y-4">
        <AdminGithubTabs />
        {error && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}
        {/* Nome do app */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-body text-sm sm:text-base font-semibold text-foreground">
                Nome do app (abaixo do ícone na home)
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Aparece no launcher do Android e no iOS logo abaixo do ícone. Padrão: <b>Vacatio</b>. Máx. 30 caracteres.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value.slice(0, 30))}
                  placeholder="Vacatio"
                  className="flex-1 h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/60"
                />
                <button
                  onClick={saveAppName}
                  disabled={appNameBusy || appName.trim() === appNameSaved.trim()}
                  className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 inline-flex items-center gap-2"
                >
                  {appNameBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Salvar
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Salvo atual: <span className="text-foreground font-semibold">{appNameSaved}</span>
              </p>
            </div>
          </div>
        </div>


        {/* Auto-gerar */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-body text-sm sm:text-base font-semibold text-foreground">
                Gerar tudo a partir do logo
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Envie 1 imagem 1024×1024 (PNG). Vamos gerar automaticamente: ícone, ícone adaptativo (frente+fundo), splash e ícone de notificação monocromático.
              </p>
              <input
                ref={autoGenRef}
                type="file"
                accept="image/png"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) autoGenerate(f);
                  if (autoGenRef.current) autoGenRef.current.value = '';
                }}
              />
              <button
                onClick={() => autoGenRef.current?.click()}
                disabled={autoGenBusy}
                className="mt-3 inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
              >
                {autoGenBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Escolher logo e gerar
              </button>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-primary" />
            <h3 className="font-body text-sm font-semibold text-foreground">
              Checklist do app
            </h3>
          </div>
          <ul className="space-y-1.5">
            {CHECKLIST_ITEMS.map(item => {
              const ok = !!files[item.key];
              return (
                <li key={item.key} className="flex items-center gap-2 text-xs">
                  {ok
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    : <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>{item.text}</span>
                </li>
              );
            })}
            <li className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/40 mt-2">
              <Info className="w-3.5 h-3.5" />
              <span>Antes de gerar o AAB: remover <code className="text-primary">server.url</code> do capacitor.config.ts</span>
            </li>
          </ul>
        </div>

        {/* Uploads */}
        <div className="space-y-2">
          {SPECS.map(spec => {
            const f = files[spec.key];
            const busy = uploading === spec.key;
            const Icon = spec.isImage ? ImageIcon : FileJson;
            return (
              <motion.div
                key={spec.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border/60 bg-secondary/30 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-primary shrink-0 overflow-hidden">
                    {spec.isImage && previews[spec.key]
                      ? <img src={previews[spec.key]} alt="" className="w-full h-full object-cover" />
                      : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-body text-sm font-semibold text-foreground break-words">{spec.label}</h4>
                      {spec.required && (
                        <span className="text-[10px] font-bold uppercase text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                          obrigatório
                        </span>
                      )}
                      {f && (
                        <span className="text-[10px] font-semibold uppercase text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> enviado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed break-words">{spec.hint}</p>
                    {f && (
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                        {fmtBytes(f.metadata?.size)} · {f.updated_at ? new Date(f.updated_at).toLocaleString('pt-BR') : ''}
                      </p>
                    )}
                  </div>
                </div>

                <input
                  ref={el => (inputRefs.current[spec.key] = el)}
                  type="file"
                  accept={spec.accept}
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) upload(spec, file);
                    const el = inputRefs.current[spec.key];
                    if (el) el.value = '';
                  }}
                />

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => inputRefs.current[spec.key]?.click()}
                    disabled={busy}
                    className="h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center gap-2 text-xs font-semibold disabled:opacity-40"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {f ? 'Substituir' : 'Enviar'}
                  </button>
                  {f && (
                    <button
                      onClick={() => remove(spec)}
                      disabled={busy}
                      className="h-10 rounded-lg bg-background border border-border flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-rose-400 disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" /> Remover
                    </button>
                  )}
                  {!f && previews[spec.key] === undefined && spec.isImage === false && (
                    <div />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Enviar para compilação */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Rocket className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-body text-sm sm:text-base font-semibold text-foreground">
                Enviar para compilação
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Dispara uma nova build no GitHub Actions usando exatamente as imagens e arquivos enviados acima. O logo atual será aplicado no ícone, splash e notificações do próximo APK/AAB.
              </p>
              <label className="block mt-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Repositório GitHub (owner/repo) — compartilhado com <i>Secrets</i>
                </span>
                <input
                  type="text"
                  value={repo}
                  onChange={e => setRepo(e.target.value)}
                  placeholder="ex.: WN7CORP/lexi-guide"
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground font-mono focus:outline-none focus:border-primary/60"
                />
              </label>
              <button
                onClick={dispatchBuild}
                disabled={dispatchBusy || !files['icon.png']}
                className="mt-3 inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
              >
                {dispatchBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                Subir logo para a próxima build
              </button>
              {!files['icon.png'] && (
                <p className="text-[11px] text-amber-400 mt-2">
                  Envie ao menos o <b>ícone do app</b> antes de disparar a build.
                </p>
              )}
              {dispatchMsg && (
                <div className={`mt-3 rounded-lg border p-2.5 text-xs ${
                  dispatchMsg.type === 'success'
                    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-400/30 bg-rose-500/10 text-rose-300'
                }`}>
                  {dispatchMsg.text}
                  {dispatchMsg.url && (
                    <a
                      href={dispatchMsg.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 inline-flex items-center gap-1 underline"
                    >
                      Ver progresso <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Referências */}
        <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">

          <h3 className="font-body text-sm font-semibold text-foreground mb-2">Documentação</h3>
          <div className="space-y-1.5">
            {REFS.map(r => (
              <a
                key={r.href}
                href={r.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 h-10 px-3 rounded-lg bg-background border border-border text-xs text-foreground hover:border-primary/40"
              >
                <span className="truncate">{r.label}</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
          <Download className="w-3 h-3 inline mr-1" />
          O workflow do GitHub Actions baixa estes arquivos automaticamente antes do build e roda <code className="text-primary">npx capacitor-assets generate</code>. Nenhum arquivo é commitado no repositório.
        </p>
      </div>
    </div>
  );
};

export default AdminNativeAssets;

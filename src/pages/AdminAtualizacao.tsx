import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Github, KeyRound, PlayCircle, Download, Edit3, Check, Copy, Bell, ImageIcon } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { motion } from 'framer-motion';
import GithubBuildPanel from '@/components/admin/GithubBuildPanel';

const REPO_STORAGE_KEY = 'admin_github_repo';
const DEFAULT_REPO = 'WN7CORP/lexi-guide';

const buildLinks = (repo: string) => ({
  repo: `https://github.com/${repo}`,
  secrets: `https://github.com/${repo}/settings/secrets/actions`,
  actions: `https://github.com/${repo}/actions`,
  workflow: `https://github.com/${repo}/actions/workflows/build-android.yml`,
  newRepo: `https://github.com/new`,
  workflowFile: `https://github.com/${repo}/blob/main/.github/workflows/build-android.yml`,
});

type Snippet = { label?: string; value: string };

type Step = {
  title: string;
  desc: string;
  icon: any;
  actions?: { label: string; href: string }[];
  list?: { name: string; desc: string }[];
  snippets?: Snippet[];
};

const AdminAtualizacao = () => {
  const navigate = useNavigate();
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_REPO);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(REPO_STORAGE_KEY);
    if (saved) {
      setRepo(saved);
      setDraft(saved);
    }
  }, []);

  const save = () => {
    const cleaned = draft.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
    setRepo(cleaned);
    localStorage.setItem(REPO_STORAGE_KEY, cleaned);
    setEditing(false);
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const links = buildLinks(repo);

  const steps: Step[] = [
    {
      title: '1. Criar ou abrir o repositório no GitHub',
      desc: 'Se ainda não existir, crie um repositório novo. Se estiver transferindo, use o repositório de destino.',
      icon: Github,
      actions: [
        { label: 'Abrir repositório', href: links.repo },
        { label: 'Criar novo repositório', href: links.newRepo },
      ],
    },
    {
      title: '2. Conectar o Lovable ao GitHub',
      desc: 'No editor Lovable: botão + (canto inferior esquerdo) → GitHub → Connect project → autorize o Lovable App e selecione o repositório. O código sincroniza automaticamente nos dois sentidos.',
      icon: Github,
      actions: [
        { label: 'Documentação Lovable + GitHub', href: 'https://docs.lovable.dev/integrations/github' },
      ],
    },
    {
      title: '3. Cadastrar as secrets de assinatura',
      desc: 'Sem estas secrets o workflow falha. Vá em Settings → Secrets and variables → Actions → New repository secret. Crie os nomes abaixo; a senha da chave é opcional quando for igual à senha do keystore.',
      icon: KeyRound,
      actions: [
        { label: 'Abrir Secrets do repositório', href: links.secrets },
      ],
      list: [
        { name: 'ANDROID_KEYSTORE_BASE64', desc: 'Conteúdo do upload-keystore.jks em base64' },
        { name: 'ANDROID_KEYSTORE_PASSWORD', desc: 'Senha que abre o arquivo keystore' },
        { name: 'ANDROID_KEY_PASSWORD', desc: 'Senha da chave privada, se for diferente da senha do keystore' },
        { name: 'ANDROID_KEY_ALIAS', desc: 'Alias da chave (ex: upload)' },
      ],
    },
    {
      title: '4. Gerar o keystore (uma vez só)',
      desc: 'No seu computador, rode os comandos abaixo. GUARDE o arquivo .jks — perder significa não conseguir mais atualizar o app na Play Store.',
      icon: KeyRound,
      snippets: [
        {
          label: 'Gerar keystore',
          value: 'keytool -genkey -v -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000 -storepass SUA_SENHA -keypass SUA_SENHA',
        },
        {
          label: 'Converter para base64 — Linux / Mac',
          value: 'base64 -w 0 upload-keystore.jks > keystore.b64',
        },
        {
          label: 'Converter para base64 — Windows PowerShell',
          value: '[Convert]::ToBase64String([IO.File]::ReadAllBytes("upload-keystore.jks")) > keystore.b64',
        },
      ],
    },
    {
      title: '5. Rodar o workflow Build Android',
      desc: 'GitHub → Actions → "Build Android (.aab + .apk)" → Run workflow (branch main). O build leva de 10 a 15 minutos.',
      icon: PlayCircle,
      actions: [
        { label: 'Abrir Actions', href: links.actions },
        { label: 'Abrir workflow Build Android', href: links.workflow },
      ],
    },
    {
      title: '6. Baixar os artefatos (.aab e .apk)',
      desc: 'Quando o run terminar em verde, abra o run e role até "Artifacts" no final da página. Baixe vacatio-release-aab (para Play Store) e vacatio-release-apk (para instalar direto no celular).',
      icon: Download,
      actions: [
        { label: 'Ver runs recentes', href: links.workflow },
      ],
    },
    {
      title: '7. Ícone, splash e Firebase (push notifications)',
      desc: 'Push notifications no Android exigem Firebase. Envie o google-services.json e todos os ícones/splash pela nova tela de config nativa. O workflow injeta tudo antes do build.',
      icon: Bell,
      actions: [
        { label: 'Abrir tela de config nativa', href: '/admin-native-assets' },
        { label: 'Firebase Console', href: 'https://console.firebase.google.com/' },
        { label: 'FCM Android setup (docs)', href: 'https://firebase.google.com/docs/cloud-messaging/android/client' },
      ],
    },
    {
      title: '8. Ver ou editar o arquivo do workflow',
      desc: 'Se precisar ajustar versões de Java, package name ou steps do build, edite este arquivo:',
      icon: Github,
      actions: [
        { label: 'Abrir build-android.yml', href: links.workflowFile },
      ],
    },
  ];

  return (
    <div className="min-h-dvh bg-background pb-16">
      <PageHeader title="Passo a passo — Atualização" onBack={() => navigate(-1)} />

      {/* Repo config */}
      <div className="p-4">
        <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Github className="w-4 h-4 text-primary" />
            <span className="font-body text-[11px] uppercase tracking-wider text-muted-foreground">
              Repositório vinculado
            </span>
          </div>
          {editing ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="usuario/repositorio"
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground min-w-0"
                autoFocus
              />
              <button
                onClick={save}
                className="h-10 px-4 rounded-lg bg-primary text-primary-foreground flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <Check className="w-4 h-4" /> Salvar
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <a
                href={links.repo}
                target="_blank"
                rel="noreferrer"
                className="font-body text-sm font-semibold text-foreground hover:underline break-all"
              >
                {repo}
              </a>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => copy(links.repo, 'repo')}
                  className="h-10 rounded-lg bg-background border border-border flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {copied === 'repo'
                    ? <><Check className="w-4 h-4 text-green-500" /> Copiado</>
                    : <><Copy className="w-4 h-4" /> Copiar URL</>}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="h-10 rounded-lg bg-background border border-border flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <Edit3 className="w-4 h-4" /> Editar
                </button>
              </div>
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
            Se trocar de repositório, edite aqui e todos os links abaixo já apontam para o novo.
          </p>
        </div>
      </div>

      {/* Live build panel */}
      <div className="px-4 pb-4">
        <GithubBuildPanel repo={repo} />
      </div>

      {/* Steps */}
      <div className="px-4 space-y-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-border/60 bg-secondary/30 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-primary shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-body text-sm sm:text-base font-semibold text-foreground leading-snug break-words">
                    {step.title}
                  </h3>
                  <p className="font-body text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed break-words">
                    {step.desc}
                  </p>
                </div>
              </div>

              {/* List of secrets — one card per item, tap to copy the name */}
              {step.list && (
                <ul className="mt-4 space-y-2">
                  {step.list.map((it, j) => (
                    <li key={j}>
                      <button
                        onClick={() => copy(it.name, `list-${i}-${j}`)}
                        className="w-full flex items-center justify-between gap-3 rounded-xl bg-background border border-border p-3 text-left active:bg-secondary/60"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs sm:text-[13px] font-semibold text-foreground break-all">
                            {it.name}
                          </div>
                          <div className="font-body text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-relaxed break-words">
                            {it.desc}
                          </div>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                          {copied === `list-${i}-${j}`
                            ? <Check className="w-4 h-4 text-green-500" />
                            : <Copy className="w-4 h-4" />}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Snippets — each with header bar + full-width copy */}
              {step.snippets && (
                <div className="mt-4 space-y-3">
                  {step.snippets.map((sn, j) => (
                    <div key={j} className="rounded-xl border border-border bg-background overflow-hidden">
                      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-secondary/40">
                        <span className="font-body text-[11px] uppercase tracking-wider text-muted-foreground truncate">
                          {sn.label || 'Comando'}
                        </span>
                        <button
                          onClick={() => copy(sn.value, `snip-${i}-${j}`)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground shrink-0"
                        >
                          {copied === `snip-${i}-${j}`
                            ? <><Check className="w-3 h-3 text-green-500" /> Copiado</>
                            : <><Copy className="w-3 h-3" /> Copiar</>}
                        </button>
                      </div>
                      <pre className="p-3 text-[11px] sm:text-xs text-foreground font-mono whitespace-pre-wrap break-all leading-relaxed">
{sn.value}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {/* Action links — stacked full-width on mobile */}
              {step.actions && step.actions.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {step.actions.map((a, j) => (
                    <a
                      key={j}
                      href={a.href}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 h-11 px-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs sm:text-sm font-semibold hover:bg-primary/20 active:bg-primary/25 transition-colors text-center break-words"
                    >
                      <ExternalLink className="w-4 h-4 shrink-0" />
                      <span className="truncate">{a.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminAtualizacao;

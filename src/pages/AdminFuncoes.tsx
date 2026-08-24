import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Activity, ShieldCheck, ClipboardList, BookOpen,
  Gamepad2, Brain, BookA, MessageCircle, BellRing, Mic, Lightbulb, Building2,
  Rss, Palette, Users, GitBranch, Github, ImageIcon, KeyRound, Bug, Newspaper,
  Quote, Monitor, Send, RefreshCcw, Lock, Wrench, FileText, Crown, Search, Target, MapPin, PlayCircle,
  Sparkles, UserPlus, GraduationCap, Scale, Store, Mail, FileSignature,
} from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { AdminHojeCards } from '@/components/admin/AdminHojeCards';


// Prefetch map
const PREFETCH: Record<string, () => Promise<unknown>> = {
  '/admin-monitor': () => import('./AdminMonitor'),
  '/admin-monitor-usuarios': () => import('./AdminMonitorUsuarios'),
  '/admin-monitoramento': () => import('./AdminMonitoramento'),
  '/admin-monitor-apis': () => import('./AdminMonitorApis'),
  '/admin-push': () => import('./AdminPush'),
  '/admin-horus': () => import('./AdminHorus'),
  '/admin-triagem': () => import('./AdminTriagem'),
  '/admin-triagem-entrada': () => import('./AdminTriagemEntrada'),
  '/teste-push': () => import('./TestePush'),
  '/admin-atualizacao': () => import('./AdminAtualizacao'),
  '/admin-native-assets': () => import('./AdminNativeAssets'),
  '/admin-handoff': () => import('./AdminHandoffIA'),
  '/admin-secrets': () => import('./AdminSecretsDownload'),
  '/admin-passo-a-passo-lojas': () => import('./AdminPassoAPassoLojas'),
  '/admin-blog-edicao': () => import('./AdminBlogEdicao'),
  '/admin-design-imagens': () => import('./AdminDesignImagens'),
  '/admin-hero-home': () => import('./AdminHeroHome'),
  '/admin-home-curiosidades': () => import('./AdminHomeCuriosidades'),
  '/admin-overlay-frases': () => import('./AdminOverlayFrases'),
  
  '/admin-funcoes-assinantes': () => import('./AdminFuncoesAssinantes'),
  '/admin-assinantes': () => import('./AdminAssinantes'),
  '/admin-boletins': () => import('./AdminBoletins'),
  '/admin-modelos': () => import('./AdminModelos'),
  '/admin-desktop': () => import('./AdminDesktop'),
  '/admin-jurisprudencia': () => import('./AdminJurisprudencia'),
  '/admin-concorrentes': () => import('./AdminConcorrentes'),
  '/admin-radares-leis': () => import('./AdminRadaresLeis'),
  '/admin/locais': () => import('./AdminLocais'),
  '/admin-biblioteca-leis': () => import('./AdminBibliotecaLeis'),
  '/admin-buscador-leis': () => import('./AdminBuscadorLeis'),

  '/boletins': () => import('./BoletinsJuridicos'),
  
  '/admin-biblioteca-editar': () => import('./BibliotecaEditar'),
  '/admin-leitura-nativa': () => import('./AdminLeituraNativa'),
  '/narracao': () => import('./NarracaoLei'),
  '/explicacao-lei': () => import('./ExplicacaoLei'),
  '/radar/deputados': () => import('./RadarDeputados'),
  '/newsletter': () => import('./Newsletter'),
  '/configuracoes': () => import('./Configuracoes'),
  '/ferramentas/peticao-inicial': () => import('./PeticaoInicial'),
  '/anotacoes/audio': () => import('./AnotacoesAudio'),
};
const prefetched = new Set<string>();
const prefetching = new Map<string, Promise<unknown>>();
const prefetch = (route?: string): Promise<unknown> => {
  const factory = route ? PREFETCH[route] : undefined;
  if (!route || !factory) return Promise.resolve();
  if (prefetched.has(route)) return Promise.resolve();
  const existing = prefetching.get(route);
  if (existing) return existing;
  const promise = factory()
    .then((result) => {
      prefetched.add(route);
      prefetching.delete(route);
      return result;
    })
    .catch((error) => {
      prefetching.delete(route);
      throw error;
    });
  prefetching.set(route, promise);
  return promise;
};

const prefetchAllAdminRoutes = () => {
  const routes = Array.from(new Set(CATEGORIES.flatMap((cat) => cat.items.map((item) => item.route).filter(Boolean)))) as string[];
  routes.forEach(prefetch);
};

type Item = {
  id: string;
  label: string;
  desc: string;
  icon: any;
  route?: string;
};

type Category = {
  id: string;
  title: string;
  desc: string;
  icon: any;
  items: Item[];
  route?: string;
};

const CATEGORIES: Category[] = [
  {
    id: 'exclusivas-admin',
    title: 'Funções exclusivas (Admin)',
    desc: 'Ferramentas em testes, visíveis apenas para admins',
    icon: Crown,
    items: [
      { id: 'admin-newsletter', label: 'Newsletter', icon: Mail, desc: 'Receba um resumo jurídico diário no e-mail', route: '/newsletter' },
      { id: 'admin-peticao-inicial', label: 'Petição Inicial', icon: FileSignature, desc: 'Gere petições com IA e jurisprudência real do STF/STJ', route: '/ferramentas/peticao-inicial' },
      { id: 'admin-gravar-aula', label: 'Gravar aula', icon: Mic, desc: 'Grave aulas longas com resumo automático por IA', route: '/anotacoes/audio' },
      { id: 'admin-horus-congelado', label: 'Assistente Horus (Congelado)', icon: MessageCircle, desc: 'Assistente virtual por IA (oculto do app principal)', route: '/assistente-horus' },
      { id: 'admin-blog-congelado', label: 'Blog Jurídico (Congelado)', icon: Rss, desc: 'Artigos jurídicos (oculto do app principal)', route: '/blog' },
    ],
  },
  {
    id: 'push',
    title: 'Notificações Push',
    desc: 'Campanhas, agendamento e métricas',
    icon: Send,
    items: [
      { id: 'admin-push', label: 'Painel de Push', icon: BellRing, desc: 'Compor, agendar, campanhas e métricas', route: '/admin-push' },
    ],
  },
  {
    id: 'lembretes',
    title: 'Lembretes',
    desc: 'Funções do app que oferecem lembretes ao usuário',
    icon: BellRing,
    route: '/admin-lembretes',
    items: [
      { id: 'admin-lembretes-biblioteca', label: 'Biblioteca', icon: BookOpen, desc: 'Lembretes de leitura: métricas, canais e disparos', route: '/admin-lembretes/biblioteca' },
    ],
  },
  {
    id: 'narracao-conteudo',
    title: 'Narração de Conteúdo',
    desc: 'Narrar livros da biblioteca e artigos do blog com vozes do Gemini',
    icon: Mic,
    route: '/admin-narracao',
    items: [
      { id: 'admin-narracao-biblioteca', label: 'Narração Biblioteca', icon: BookOpen, desc: 'Escolha o livro, a voz e narre página por página ou em fila', route: '/admin-narracao/biblioteca' },
      { id: 'admin-narracao-blog', label: 'Narração Blog e Artigos', icon: Newspaper, desc: 'Prévia de voz e narração dos artigos do Blogger', route: '/admin-narracao/blog' },
    ],
  },
  {
    id: 'aprender',
    title: 'Aprender',
    desc: 'Gerar aulas por IA a partir dos resumos e publicar',
    icon: GraduationCap,
    route: '/admin-aprender',
    items: [
      { id: 'admin-aprender', label: 'Gerar conteúdo das aulas', icon: Sparkles, desc: 'Gera/regera aulas a partir dos resumos e publica no app', route: '/admin-aprender' },
    ],
  },
  {
    id: 'jurisprudencia',
    title: 'Jurisprudência',
    desc: 'Mapear leis do Vade Mecum ao Corpus927 (Enfam/STJ)',
    icon: Scale,
    route: '/admin-jurisprudencia',
    items: [
      { id: 'admin-jurisprudencia', label: 'Mapeamento de leis', icon: Scale, desc: 'Cadastra o ID Corpus927 de cada lei; acompanha cache de artigos', route: '/admin-jurisprudencia' },
    ],
  },
  {
    id: 'monitoramento',
    title: 'Monitoramento',
    desc: 'Saúde do sistema, usuários e APIs de IA',
    icon: Monitor,
    route: '/admin-monitoramento',
    items: [
      { id: 'admin-monitor', label: 'Monitoramento', icon: Activity, desc: 'Status e saúde do sistema', route: '/admin-monitor' },
      { id: 'monitor-usuarios', label: 'Usuários Online', icon: Users, desc: 'Monitoramento em tempo real', route: '/admin-monitor-usuarios' },
      { id: 'monitor-apis', label: 'APIs', icon: Activity, desc: 'Funções que usam IA (custo, manual/auto)', route: '/admin-monitor-apis' },
    ],
  },
  {
    id: 'passo-a-passo-lojas',
    title: 'Passo a Passo Lojas',
    desc: 'Apple App Store e Google Play — publicação do Vacatio',
    icon: Store,
    route: '/admin-passo-a-passo-lojas',
    items: [
      { id: 'admin-passo-a-passo-lojas', label: 'Passo a Passo Lojas', icon: Store, desc: 'Guia com 25 passos para publicar no Google Play e App Store', route: '/admin-passo-a-passo-lojas' },
    ],
  },


  {
    id: 'triagem',
    title: 'Triagem',
    desc: 'Intro do app e triagem de cadastro',
    icon: Sparkles,
    route: '/admin-triagem-hub',
    items: [
      { id: 'admin-triagem-entrada', label: 'Triagem de Entrada', icon: Sparkles, desc: 'Intro Vade Mecum · Vacatio ao abrir o app (MP4 Remotion)', route: '/admin-triagem-entrada' },
      { id: 'admin-triagem-cadastro', label: 'Triagem de Cadastro', icon: UserPlus, desc: 'Apresentação Remotion no primeiro cadastro do usuário', route: '/admin-triagem' },
    ],
  },
  {
    id: 'horus-exclusivo',
    title: 'Horus (Exclusivo)',
    desc: 'Assistente Horus no WhatsApp — instância, usuários e conversas',
    icon: MessageCircle,
    items: [
      { id: 'admin-horus', label: 'Painel do Horus', icon: MessageCircle, desc: 'Instância, QR Code, usuários vinculados e conversas', route: '/admin-horus' },
    ],
  },
  {
    id: 'geracao-conteudo',
    title: 'Geração de Conteúdo',
    desc: 'IA, biblioteca, radar e estudos',
    icon: Newspaper,
    items: [
      // Conteúdo & IA
      { id: 'blog-edicao', label: 'Blog Editar', icon: Newspaper, desc: 'Geração automática de artigos + push', route: '/admin-blog-edicao' },
      { id: 'overlay-frases', label: 'Frases Editar', icon: Quote, desc: 'Frases + vozes do overlay de geração', route: '/admin-overlay-frases' },
      { id: 'design-imagens', label: 'Design de Imagens', icon: Palette, desc: 'Presets de estilo (prompt travado) por categoria', route: '/admin-design-imagens' },
      { id: 'hero-home', label: 'Imagens Início do App', icon: ImageIcon, desc: 'Personagens do painel amarelo + animações de entrada', route: '/admin-hero-home' },
      { id: 'home-curiosidades', label: 'Curiosidades da Home', icon: Lightbulb, desc: 'Cards leves misturados aos stats, com capa vazada IA', route: '/admin-home-curiosidades' },
      { id: 'narracao', label: 'Narração Editar', icon: Mic, desc: 'TTS com Gemini', route: '/narracao' },
      { id: 'explicacao-lei', label: 'Explicações Editar (IA)', icon: Lightbulb, desc: 'Batch de explicações', route: '/explicacao-lei' },
      { id: 'boletins', label: 'Boletins Editar', icon: Rss, desc: 'Newsletters e boletins', route: '/newsletter' },
      // Biblioteca
      { id: 'biblioteca-editar', label: 'Biblioteca Editar', icon: BookOpen, desc: 'Sinopse, capa horizontal e análise técnica com IA', route: '/admin-biblioteca-editar' },
      { id: 'leitura-nativa', label: 'Leitura Nativa (OCR + Gemini)', icon: FileText, desc: 'OCR de PDFs + refino Gemini com capítulos, individual ou em lote', route: '/admin-leitura-nativa' },
      // Radar Legislativo
      { id: 'camara-deputados', label: 'Câmara Editar', icon: Building2, desc: 'Radar legislativo', route: '/radar/deputados' },
      // Estudo & Jogos
      { id: 'praticar', label: 'Praticar', icon: Target, desc: 'Tiro ao alvo na lei seca (em testes, só admin)', route: '/praticar' },
      { id: 'dicionario', label: 'Dicionário Editar', icon: BookA, desc: 'Termos e definições' },
    ],
  },
  {
    id: 'atualizacao',
    title: 'Passo a passo — Atualização',
    desc: 'Build, ícone, splash e Firebase',
    icon: RefreshCcw,
    items: [
      { id: 'admin-atualizacao', label: 'Atualizar app no GitHub', icon: GitBranch, desc: 'Guia completo: repositório, secrets e build', route: '/admin-atualizacao' },
      { id: 'admin-native-assets', label: 'Ícone, Splash e Firebase', icon: ImageIcon, desc: 'Upload de ícones, splash e google-services.json', route: '/admin-native-assets' },
      { id: 'admin-handoff', label: 'Handoff para IA (Remix)', icon: FileText, desc: 'Documento pronto pra colar em qualquer IA após remix', route: '/admin-handoff' },
      { id: 'github-abrir', label: 'Abrir repositório vinculado', icon: Github, desc: 'Vai direto pro repositório configurado' },
    ],
  },
  {
    id: 'secrets',
    title: 'Secrets & Credenciais',
    desc: 'Keystore e credenciais Android',
    icon: Lock,
    items: [
      { id: 'admin-secrets', label: 'Secrets Android (download)', icon: KeyRound, desc: 'Baixar keystore e senhas como .txt', route: '/admin-secrets' },
    ],
  },
  {
    id: 'radares-admin',
    title: 'Radares',
    desc: 'Radar de Leis, cron e histórico',
    icon: Rss,
    items: [
      { id: 'admin-radares-leis', label: 'Radar de Leis (Editar)', icon: Rss, desc: 'Cron 10h e 20h, histórico das raspagens, reenvio de push', route: '/admin-radares-leis' },
      { id: 'admin-biblioteca-leis', label: 'Biblioteca de Leis', icon: BookOpen, desc: 'Auditoria, verificação de atualização e sugestões do Radar', route: '/admin-biblioteca-leis' },
      { id: 'admin-buscador-leis', label: 'Buscador de Leis', icon: Search, desc: 'IA busca na web leis faltantes e sugere para adicionar à Biblioteca', route: '/admin-buscador-leis' },
    ],
  },
  {
    id: 'concorrentes-analise',
    title: 'Concorrentes',
    desc: 'Extrai reviews do Google Play e analisa dores/pedidos com IA',
    icon: Target,
    items: [
      { id: 'admin-concorrentes', label: 'Concorrentes', icon: Target, desc: 'Cadastro de apps, extração de reviews (Browserless) e análise IA', route: '/admin-concorrentes' },
    ],
  },
  {
    id: 'locais-juridicos',
    title: 'Locais Jurídicos',
    desc: 'Tribunais, cartórios, delegacias e museus via OpenStreetMap',
    icon: MapPin,
    items: [
      { id: 'admin-locais', label: 'Locais Jurídicos', icon: MapPin, desc: 'Sincronizar OSM por UF e categoria (custo zero)', route: '/admin/locais' },
    ],
  },
  {
    id: 'boletins-juridicos',
    title: 'Boletins Jurídicos',
    desc: 'Geração diária de boletins em áudio e vídeo',
    icon: Mic,
    items: [
      { id: 'admin-boletins', label: 'Boletins (Admin)', icon: Mic, desc: 'Gerar, renderizar MP4 e configurar cron 9h', route: '/admin-boletins' },
      { id: 'boletins-player', label: 'Player de Boletins', icon: Rss, desc: 'Visualizar boletins publicados no app', route: '/boletins' },
    ],
  },
  {
    id: 'monetizacao',
    title: 'Monetização & Paywall',
    desc: 'Limites free por função (editável)',
    icon: Crown,
    items: [
      { id: 'admin-funcoes-assinantes', label: 'Funções Assinantes', icon: Crown, desc: 'Limite de uso free por função (blog, narração, biblioteca, IA…)', route: '/admin-funcoes-assinantes' },
      { id: 'admin-assinantes', label: 'Assinantes Play', icon: Users, desc: 'Métricas do Google Play + lista de quem assinou', route: '/admin-assinantes' },
    ],
  },
  {
    id: 'ia-modelos',
    title: 'Modelos de IA',
    desc: 'Modelos Gemini usados no app',
    icon: Brain,
    items: [
      { id: 'admin-modelos', label: 'Modelos de Geração', icon: Brain, desc: 'Texto, imagem e áudio — cataloga funções e limites', route: '/admin-modelos' },
    ],
  },
  {
    id: 'distribuicao',
    title: 'Distribuição',
    desc: 'Apps instaláveis (Android, Desktop)',
    icon: Monitor,
    items: [
      { id: 'admin-desktop', label: 'App para computador', icon: Monitor, desc: 'Gerar .exe / .dmg / .AppImage via GitHub Actions', route: '/admin-desktop' },
    ],
  },

  {
    id: 'configuracoes',
    title: 'Configurações',
    desc: 'Paleta, tema e preferências',
    icon: Wrench,
    items: [
      { id: 'paleta-cores', label: 'Paleta de Cores', icon: Palette, desc: 'Configurações visuais', route: '/configuracoes' },
    ],
  },
  {
    id: 'depuracao',
    title: 'Depuração',
    desc: 'Ferramentas de teste e diagnóstico',
    icon: Bug,
    items: [
      { id: 'crashlytics-test', label: 'Disparar crash de teste', icon: Bug, desc: 'Envia crash pro Firebase Crashlytics (só native)' },
    ],
  },
];

const REPO_STORAGE_KEY = 'admin_github_repo';
const DEFAULT_REPO = 'WN7CORP/lexi-guide';

const AdminFuncoes = () => {
  const navigate = useNavigate();
  const [openCat, setOpenCat] = useState<Category | null>(null);

  useEffect(() => {
    const run = () => prefetchAllAdminRoutes();
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(run, { timeout: 600 });
      return () => { try { (window as any).cancelIdleCallback?.(id); } catch {} };
    }
    const t = globalThis.setTimeout(run, 250);
    return () => globalThis.clearTimeout(t);
  }, []);

  const handleClick = async (item: Item) => {
    if (item.id === 'github-abrir') {
      const repo = (typeof window !== 'undefined' && localStorage.getItem(REPO_STORAGE_KEY)) || DEFAULT_REPO;
      window.open(`https://github.com/${repo}`, '_blank');
      return;
    }
    if (item.id === 'crashlytics-test') {
      try {
        const m = await import('@/lib/nativeCrashlytics');
        toast.info('Disparando crash em 2s… reabra o app para enviar o relatório.');
        setTimeout(() => { void m.forceNativeCrash().catch((e) => toast.error(String(e?.message || e))); }, 2000);
      } catch (e: any) {
        toast.error(String(e?.message || e));
      }
      return;
    }
    if (item.route) {
      try { await prefetch(item.route); } catch {}
      setOpenCat(null);
      navigate(item.route);
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-8">
      <PageHeader title="Funções Admin" onBack={() => navigate('/')} />

      <div className="p-4">
        <AdminHojeCards />
        <p className="font-body text-[12px] text-muted-foreground mb-3 px-1">
          Toque em uma categoria para ver as funções disponíveis.
        </p>

        <div className="rounded-2xl border border-border/60 bg-secondary/30 divide-y divide-border/50 overflow-hidden">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (cat.route) {
                    void prefetch(cat.route).finally(() => navigate(cat.route!));
                    return;
                  }
                  if (cat.items.length === 1 && cat.items[0].route) {
                    void prefetch(cat.items[0].route).finally(() => navigate(cat.items[0].route!));
                  } else {
                    setOpenCat(cat);
                  }
                }}
                onPointerDown={() => {
                  if (cat.route) prefetch(cat.route);
                  cat.items.forEach(i => prefetch(i.route));
                }}
                className="w-full flex items-center gap-4 px-4 py-5 min-h-[84px] text-left hover:bg-secondary/60 active:bg-secondary transition-colors"
              >
                <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center text-primary shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-body text-base font-semibold text-foreground truncate">
                    {cat.title}
                  </div>
                  <div className="font-body text-[12px] text-muted-foreground truncate mt-0.5">
                    {cat.desc} · {cat.items.length} {cat.items.length === 1 ? 'função' : 'funções'}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Sheet de baixo pra cima com os itens da categoria */}
      <Sheet open={!!openCat} onOpenChange={(v) => !v && setOpenCat(null)}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-0 bg-background border-border"
        >
          <SheetHeader className="px-4 pt-5 pb-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              {openCat && (
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
                  <openCat.icon className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <SheetTitle className="font-display text-base font-bold text-foreground">
                  {openCat?.title}
                </SheetTitle>
                <p className="font-body text-[11.5px] text-muted-foreground mt-0.5">
                  {openCat?.desc}
                </p>
              </div>
            </div>
          </SheetHeader>

          {openCat && (
              <div className="p-3">
                <div className="rounded-2xl border border-border/60 bg-secondary/30 divide-y divide-border/50 overflow-hidden">
                  {openCat.items.map(item => {
                    const Icon = item.icon;
                    const disabled = !item.route && item.id !== 'github-abrir' && item.id !== 'crashlytics-test';
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleClick(item)}
                        onPointerDown={() => prefetch(item.route)}
                        disabled={disabled}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/60 active:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-primary shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-body text-sm font-semibold text-foreground truncate">
                            {item.label}
                          </div>
                          <div className="font-body text-[11px] text-muted-foreground truncate">
                            {item.desc}
                          </div>
                        </div>
                        {!disabled && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminFuncoes;

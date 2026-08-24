import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, Monitor, ChevronRight, ChevronDown, X, Search, Sparkles, MessageCircle, Bot, BookOpen, WifiOff, StickyNote, Newspaper, ScanEye, Scale, User, Library, Mic, FileText, FileSignature, Image as ImageIcon, Bell, Gavel, Star, Send, Video, Film, Clapperboard, Bird } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MentorOverlay from './MentorOverlay';
// PessoalSheet removido — Meu Espaço agora é rota dedicada (/meu-espaco).
import AssistenteOverlay from './AssistenteOverlay';

import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/nativeHaptics';

import DicionarioJuridico from '@/components/ferramentas/DicionarioJuridico';
const SideMenu = lazy(() => import('./SideMenu'));
import SearchOverlay from './SearchOverlay';
import { pushRecente } from '@/lib/leisRecentes';
import { startAppMetrics } from '@/lib/appMetrics';
import { usePrefetchProfileSummary } from '@/hooks/useProfileSummary';
import { tipoToSlug, leiToSlug } from '@/lib/legislacaoSlugs';
import { pickAsset } from '@/lib/assetUrl';
import { prefetchRoute, type PrefetchKey } from '@/lib/routePrefetch';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchMeuEspacoFeed, MEU_ESPACO_FEED_KEY } from '@/services/meuEspacoFeed';
import { prefetchAllPessoal } from '@/services/pessoalPrefetch';
import vacatioLogoAsset from '@/assets/logo-vacatio-v2.png.asset.json';
import vacatioLogoBundled from '@/assets/bundled/logo-vacatio-v2.webp';

// Logo do app (web usa CDN, nativo usa bundle)
const vacatioLogo = pickAsset(vacatioLogoBundled, vacatioLogoAsset.url);

// Ícone oficial do WhatsApp (lucide não inclui logos de marca)
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z"/>
  </svg>
);



// Número do WhatsApp do Horus (formato internacional sem "+" nem espaços).
const WHATSAPP_NUMERO = '5511914910906';
const WHATSAPP_MSG = 'Olá Horus! Preciso da sua ajuda com uma dúvida jurídica.';

const HORUS_TAGS = [
  'Explicar',
  'Explicar lei',
  'Ler PDF',
  'Ler imagem',
  'Mandar áudio',
  'Escutar áudio',
];


// Mapa estático de cores (Tailwind JIT precisa das classes literais)
const HORUS_COLOR: Record<string, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-500/20 ring-1 ring-emerald-400/40', text: 'text-emerald-400' },
  sky:     { bg: 'bg-sky-500/20 ring-1 ring-sky-400/40',         text: 'text-sky-400' },
  rose:    { bg: 'bg-rose-500/20 ring-1 ring-rose-400/40',       text: 'text-rose-400' },
  violet:  { bg: 'bg-violet-500/20 ring-1 ring-violet-400/40',   text: 'text-violet-400' },
  amber:   { bg: 'bg-amber-500/20 ring-1 ring-amber-400/40',     text: 'text-amber-400' },
  cyan:    { bg: 'bg-cyan-500/20 ring-1 ring-cyan-400/40',       text: 'text-cyan-400' },
};

// NavShine removido — o brilho contínuo pesava demais na barra
// inferior (montada em toda navegação mobile/tablet).

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const [ferramentasOpen, setFerramentasOpen] = useState(false);
  const [assistenteChooserOpen, setAssistenteChooserOpen] = useState(false);
  const [estudosOpen, setEstudosOpen] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dicionarioOpen, setDicionarioOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [externalMenuOpen, setExternalMenuOpen] = useState(false);
  // pessoalOpen removido — Meu Espaço é rota agora.
  const [chatOpen, setChatOpen] = useState(false);
  const [horusView, setHorusView] = useState<'chooser' | 'main' | 'funcoes' | 'notificacoes'>('chooser');

  // (Removido: intervalo do NavShine — animação contínua no BottomNav.)

  const prefetchProfile = usePrefetchProfileSummary();
  const qc = useQueryClient();
  const { user } = useAuth();
  const warmMeuEspaco = () => {
    if (!user?.id) return;
    prefetchProfile();
    const uid = user.id;
    qc.prefetchQuery({
      queryKey: MEU_ESPACO_FEED_KEY(uid),
      queryFn: () => fetchMeuEspacoFeed(uid),
      staleTime: 60_000,
    }).catch(() => {});
    prefetchAllPessoal(qc, uid);
  };
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setExternalMenuOpen(!!detail?.open);
    };
    window.addEventListener('sidemenu-state', handler);
    startAppMetrics();
    // Aquece o cache de "Meu Espaço" logo após o boot para que os stats
    // apareçam no primeiro paint quando o usuário abrir a página.
    const idle: any = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 300));
    idle(() => prefetchProfile());
    return () => window.removeEventListener('sidemenu-state', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hideNav = sideMenuOpen || externalMenuOpen;

  const isEstudos = path.startsWith('/estudos') || path.startsWith('/resumos-juridicos') || path.startsWith('/biblioteca');

  // Badge de novas notícias: conta quantas notícias são mais recentes que
  // o timestamp "última vista" do localStorage. Se nunca viu, considera as
  // notícias dos últimos 7 dias como novas para não explodir o contador.
  const [noticiasCount, setNoticiasCount] = useState(0);
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const lastSeen = Number(localStorage.getItem('noticias_last_seen') || 0);
        const since = lastSeen || Date.now() - 7 * 24 * 60 * 60 * 1000;
        const { count, error } = await supabase
          .from('noticias_juridicas')
          .select('*', { count: 'exact', head: true })
          .gt('created_at', new Date(since).toISOString());
        if (cancel || error) return;
        setNoticiasCount(count || 0);
      } catch {}
    })();
    return () => { cancel = true; };
  }, [path]);



  const FERRAMENTAS: Array<{ id: string; label: string; desc: string; icon: any; action: () => void; hot?: boolean; prefetch?: PrefetchKey }> = [
    { id: 'desktop', label: 'Desktop', desc: 'Versão para computador', icon: Monitor, action: () => navigate('/desktop'), hot: true, prefetch: 'desktop' },
    { id: 'peticao-inicial', label: 'Petição Inicial', desc: 'Gere petições com IA e jurisprudência real do STF/STJ', icon: FileSignature, action: () => navigate('/ferramentas/peticao-inicial'), prefetch: 'peticaoInicial' },
    { id: 'dicionario', label: 'Dicionário Jurídico', desc: 'Consulte termos e conceitos do Direito', icon: BookOpen, action: () => navigate('/ferramentas/dicionario'), prefetch: 'dicionario' },
    { id: 'radar360', label: 'Radar 360', desc: 'Alterações recentes e projetos de lei', icon: ScanEye, action: () => navigate('/radar-360'), prefetch: 'radar360' },
    { id: 'locais', label: 'Locais Jurídicos', desc: 'Tribunais, cartórios, delegacias e museus perto de você', icon: Scale, action: () => navigate('/ferramentas/locais'), prefetch: 'locais' },
    { id: 'assistente', label: 'Assistente IA', desc: 'IA jurídica para tirar dúvidas', icon: Bot, action: () => navigate('/assistente-horus'), prefetch: 'assistenteHorus' },
    { id: 'gravar-aula', label: 'Gravar aula', desc: 'Grave aulas longas com resumo automático por IA', icon: Mic, action: () => navigate('/anotacoes/audio'), prefetch: 'gravarAula' },
    { id: 'tematica', label: 'Temática Jurídica', desc: 'Filmes, séries e documentários para juristas', icon: Clapperboard, action: () => navigate('/tematica-juridica'), prefetch: 'tematica' },
    { id: 'resumos', label: 'Resumos Jurídicos', desc: 'Biblioteca por área, tema e subtema', icon: FileText, action: () => navigate('/resumos-juridicos'), prefetch: 'resumosJuridicos' },
    { id: 'boletins', label: 'Boletins Jurídicos', desc: 'Vídeo diário com as normas quentes de hoje', icon: Video, action: () => navigate('/boletins'), prefetch: 'boletins' },
    { id: 'noticias', label: 'Notícias', desc: 'Notícias jurídicas e atualizações', icon: Newspaper, action: () => navigate('/noticias'), prefetch: 'noticias' },
    { id: 'newsletter', label: 'Newsletter', desc: 'Receba um resumo jurídico diário no e-mail', icon: Send, action: () => navigate('/newsletter'), prefetch: 'newsletter' },
    { id: 'biblioteca', label: 'Biblioteca', desc: 'Livros e materiais de estudo para leitura', icon: Library, action: () => navigate('/biblioteca'), prefetch: 'biblioteca' },
    { id: 'aprender', label: 'Aprender', desc: 'Artigos educacionais e conteúdos complementares', icon: BookOpen, action: () => navigate('/aprender'), prefetch: 'aprender' },
    { id: 'modo-offline', label: 'Modo Offline', desc: 'Baixe leis para consultar sem internet', icon: WifiOff, action: () => navigate('/modo-offline'), prefetch: 'modoOffline' },
  ];

  const ESTUDOS_ITENS: Array<{ id: string; label: string; desc: string; icon: any; action: () => void; prefetch?: PrefetchKey }> = [
    { id: 'resumos', label: 'Resumos Jurídicos', desc: 'Biblioteca por área, tema e subtema', icon: FileText, action: () => navigate('/resumos-juridicos'), prefetch: 'resumosJuridicos' },
    { id: 'biblioteca', label: 'Biblioteca', desc: 'Ebooks jurídicos com leitor Kindle', icon: Library, action: () => navigate('/biblioteca'), prefetch: 'biblioteca' },
    { id: 'videoaulas', label: 'Videoaulas', desc: 'Aulas em vídeo com transcrição', icon: Video, action: () => navigate('/estudos'), prefetch: 'estudos' },
  ];


  const handleFerramenta = (fn: () => void) => {
    setFerramentasOpen(false);
    fn();
  };

  const handleEstudo = (fn: () => void) => {
    setEstudosOpen(false);
    fn();
  };

  return (
    <>
    {/* Bottom bar — visível em celular e tablet (< lg).
        Desktop (lg+) usa a sidebar lateral. */}
    <nav aria-label="Navegação principal" role="navigation" className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-all duration-300 ease-out md:bottom-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto ${hideNav ? 'translate-y-[140%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>

      <div className="bg-card/95 backdrop-blur-md border-t border-border rounded-t-3xl shadow-lg shadow-black/10 pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] md:border md:rounded-full md:shadow-2xl md:shadow-black/30 md:pb-0">

        <div className="relative grid grid-cols-5 items-end px-1 pt-3.5 pb-3.5 max-w-lg mx-auto md:gap-2 md:px-4 md:py-2">
          {/* Notícias */}
          <button
            onPointerDown={() => prefetchRoute('noticias')}
            onMouseEnter={() => prefetchRoute('noticias')}
            onClick={() => {
              haptic.selection();
              localStorage.setItem('noticias_last_seen', String(Date.now()));
              setNoticiasCount(0);
              navigate('/noticias');
            }}
            data-track="bottom_nav_click"
            data-track-destino="noticias"
            className="flex flex-col items-center justify-end py-1.5 text-foreground hover:text-primary transition-colors"
            aria-label="Notícias"
          >
            <span className="relative flex flex-col items-center gap-1.5 overflow-hidden px-2 py-1 rounded-lg">
              <span className="relative">
                <Newspaper className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
                {noticiasCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-black text-[10px] font-bold leading-none ring-2 ring-card flex items-center justify-center" aria-label={`${noticiasCount} novas notícias`}>
                    {noticiasCount > 9 ? '9+' : noticiasCount}
                  </span>
                )}
              </span>
              <span className="font-body text-[11px] sm:text-[12px] leading-tight">Notícias</span>
            </span>

          </button>

          {/* Chat Jurídico */}
          <button
            onClick={() => { haptic.selection(); setChatOpen(true); }}
            data-track="bottom_nav_click"
            data-track-destino="chat"
            className="flex flex-col items-center justify-end py-1.5 text-foreground hover:text-primary transition-colors"
            aria-label="Chat Jurídico"
          >
            <span className="relative flex flex-col items-center gap-1.5 overflow-hidden px-2 py-1 rounded-lg">
              <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
              <span className="font-body text-[11px] sm:text-[12px] leading-tight">Chat</span>
            </span>
          </button>


          {/* Ferramentas (FAB centralizado — coluna do meio) */}
          <button
            onPointerDown={() => {
              // Pré-carrega em lote as rotas mais pesadas do menu para
              // clique instantâneo no mobile (onde hover não existe).
              for (const f of FERRAMENTAS) if (f.prefetch) prefetchRoute(f.prefetch);
            }}
            onClick={() => { haptic.light(); setFerramentasOpen(true); }}
            data-track="bottom_nav_click"
            data-track-destino="ferramentas"
            className="flex flex-col items-center justify-end -mt-11"
            aria-label="Ferramentas"
          >
            <span className="relative flex flex-col items-center gap-1.5 pt-1 pb-1 px-2 rounded-2xl">
              <span className="relative w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 ring-4 ring-background btn-attention-shine overflow-hidden">
                <Gavel className="w-11 h-11 sm:w-12 sm:h-12 text-primary-foreground relative z-[2]" strokeWidth={1.75} />
              </span>
              <span className="font-body text-[11px] sm:text-[12px] font-semibold text-primary leading-tight">Ferramentas</span>
            </span>

          </button>

          {/* Biblioteca */}
          <button
            onPointerDown={() => prefetchRoute('biblioteca')}
            onMouseEnter={() => prefetchRoute('biblioteca')}
            onClick={() => { haptic.selection(); navigate('/biblioteca'); }}
            data-track="bottom_nav_click"
            data-track-destino="biblioteca"
            className="flex flex-col items-center justify-end py-1.5 text-foreground hover:text-primary transition-colors"
            aria-label="Biblioteca"
          >
            <span className="relative flex flex-col items-center gap-1.5 overflow-hidden px-2 py-1 rounded-lg">
              <Library className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
              <span className="font-body text-[11px] sm:text-[12px] leading-tight">Biblioteca</span>
            </span>
          </button>

          {/* Radares */}
          <button
            onClick={() => { haptic.selection(); navigate('/radares'); }}
            onPointerEnter={() => prefetchRoute('radar360')}
            onPointerDown={() => prefetchRoute('radar360')}
            onTouchStart={() => prefetchRoute('radar360')}
            data-track="bottom_nav_click"
            data-track-destino="radares"
            className="flex flex-col items-center justify-end py-1.5 text-foreground hover:text-primary transition-colors"
          >
            <span className="relative flex flex-col items-center gap-1.5 overflow-hidden px-2 py-1 rounded-lg">
              <ScanEye className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
              <span className="font-body text-[11px] sm:text-[12px] leading-tight">Radares</span>
            </span>
          </button>
        </div>
      </div>
    </nav>

    {/* Tablet agora usa a mesma bottom bar do celular (acima). */}




    {/* Estudos Sheet */}
    <AnimatePresence>
      {estudosOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={() => setEstudosOpen(false)}
            className="fixed inset-0 z-[70] bg-background/80 lg:hidden"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: 'transform', transform: 'translateZ(0)' }}
            className="fixed bottom-0 left-0 right-0 z-[80] bg-card border-t border-border rounded-t-2xl pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] lg:hidden"
          >
            <div className="flex items-center justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h3 className="font-display text-lg text-foreground">Estudos</h3>
              </div>
              <button
                onClick={() => setEstudosOpen(false)}
                aria-label="Fechar estudos"
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
              >
                <X className="w-4 h-4 text-foreground" aria-hidden="true" />
              </button>
            </div>
            <div className="px-4 pb-8 flex flex-col gap-3">
              {ESTUDOS_ITENS.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.button
                    key={f.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onPointerEnter={() => { if (f.prefetch) prefetchRoute(f.prefetch); }}
                    onFocus={() => { if (f.prefetch) prefetchRoute(f.prefetch); }}
                    onClick={() => handleEstudo(f.action)}
                    data-track="estudo_abrir"
                    data-estudo-id={f.id}
                    data-estudo-nome={f.label}
                    className="group flex items-center gap-4 p-4 min-h-[76px] rounded-xl bg-secondary/50 border border-border hover:border-primary/40 hover:bg-secondary transition-all text-left"
                  >
                    <Icon className="w-6 h-6 text-primary stroke-[1.5] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-base font-bold text-foreground leading-tight">{f.label}</p>
                      <p className="font-body text-sm text-muted-foreground line-clamp-1">{f.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>


    {/* Ferramentas Sheet */}
    <AnimatePresence>
      {ferramentasOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={() => setFerramentasOpen(false)}
            className="fixed inset-0 z-[70] bg-background/80 lg:hidden"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: 'transform', transform: 'translateZ(0)' }}
            className="fixed bottom-0 left-0 right-0 z-[80] bg-card border-t border-border rounded-t-2xl pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] lg:hidden flex flex-col h-[90vh] md:max-w-2xl md:mx-auto md:max-h-[90vh] md:h-auto md:min-h-[60vh] md:rounded-3xl md:mb-6 md:border"
          >
            <div className="flex items-center justify-center pt-2 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between px-5 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Gavel className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground leading-tight">Ferramentas</h3>
                  <p className="font-body text-xs text-muted-foreground">Recursos jurídicos e utilitários</p>
                </div>
              </div>
              <button
                onClick={() => setFerramentasOpen(false)}
                aria-label="Fechar ferramentas"
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
              >
                <ChevronDown className="w-5 h-5 text-foreground" aria-hidden="true" />
              </button>
            </div>
            <div className="px-4 pb-8 overflow-y-auto flex-1">
              <div className="rounded-2xl border border-border/60 bg-secondary/30 divide-y divide-border/50 overflow-hidden">
                {FERRAMENTAS.map((f) => {
                  const Icon = f.icon;
                  return (
                    <button
                      key={f.id}
                      onPointerEnter={() => { if (f.prefetch) prefetchRoute(f.prefetch); }}
                      onFocus={() => { if (f.prefetch) prefetchRoute(f.prefetch); }}
                      onClick={() => handleFerramenta(f.action)}
                      data-track="ferramenta_abrir"
                      data-ferramenta-id={f.id}
                      data-ferramenta-nome={f.label}
                      data-ferramenta-origin="bottom_sheet"
                      className="w-full flex items-center gap-4 px-4 py-5 min-h-[84px] text-left hover:bg-secondary/60 active:bg-secondary transition-colors"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center text-primary shrink-0">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-body text-base font-semibold text-foreground truncate">{f.label}</div>
                        </div>
                        <div className="font-body text-[12px] text-muted-foreground truncate mt-0.5">{f.desc}</div>
                      </div>
                      {f.hot && (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wide border border-primary/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          Em alta
                        </span>
                      )}
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Assistente Chooser Sheet — grande, tela cheia */}
    <AnimatePresence>
      {assistenteChooserOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={() => setAssistenteChooserOpen(false)}
            className="fixed inset-0 z-[70] bg-background/85 lg:hidden"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: 'transform', transform: 'translateZ(0)' }}
            className="fixed bottom-0 left-0 right-0 z-[80] h-[92vh] bg-card border-t border-border rounded-t-3xl pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] lg:hidden flex flex-col md:max-w-3xl md:mx-auto md:max-h-[88vh] md:h-auto md:min-h-[70vh] md:rounded-3xl md:mb-6 md:border"
          >
            <div className="flex items-center justify-center pt-3 pb-2 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between px-5 pb-4 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {horusView !== 'chooser' && (
                  <button
                    onClick={() => setHorusView(horusView === 'main' ? 'chooser' : 'main')}
                    aria-label="Voltar"
                    className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0"
                  >
                    <ChevronRight className="w-5 h-5 text-foreground rotate-180" />
                  </button>
                )}
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${horusView === 'chooser' ? 'bg-primary shadow-primary/30' : 'bg-emerald-500 shadow-emerald-500/30'}`}>
                  {horusView === 'chooser'
                    ? <Scale className="w-6 h-6 text-primary-foreground" />
                    : <WhatsAppIcon className="w-6 h-6 text-primary-foreground" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-bold text-foreground leading-tight truncate">
                    {horusView === 'chooser'
                      ? 'Assistente'
                      : horusView === 'funcoes'
                      ? 'Funções'
                      : horusView === 'notificacoes'
                      ? 'Notificações'
                      : 'Assistente Horus'}
                  </h3>
                  <p className="font-body text-xs text-muted-foreground truncate">
                    {horusView === 'chooser'
                      ? 'Escolha onde falar com seu assistente'
                      : horusView === 'funcoes'
                      ? 'O que o Horus faz por você'
                      : horusView === 'notificacoes'
                      ? 'Escolha o que quer receber'
                      : 'Seu assistente jurídico no WhatsApp'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setAssistenteChooserOpen(false); setHorusView('chooser'); }}
                aria-label="Fechar"
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5 text-foreground" aria-hidden="true" />
              </button>
            </div>


            <div className="flex-1 overflow-y-auto px-5 pt-2 pb-8">
              {horusView === 'chooser' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
                  className="flex flex-col gap-3 pt-2"
                >
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    onClick={() => {
                      haptic.selection();
                      setAssistenteChooserOpen(false);
                      setHorusView('chooser');
                      setMentorOpen(true);
                    }}
                    className="group flex items-center gap-4 p-4 min-h-[80px] rounded-2xl bg-secondary/50 border border-border hover:border-primary/40 transition-all text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/20 ring-1 ring-primary/40 flex items-center justify-center shrink-0">
                      <Scale className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-base font-bold text-foreground leading-tight">Assistente no app</p>
                      <p className="font-body text-sm text-muted-foreground line-clamp-2">Converse aqui dentro, sem sair do app</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </motion.button>

                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 }}
                    onClick={() => { haptic.selection(); setHorusView('main'); }}
                    className="group flex items-center gap-4 p-4 min-h-[80px] rounded-2xl bg-secondary/50 border border-border hover:border-emerald-500/40 transition-all text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/40 flex items-center justify-center shrink-0">
                      <WhatsAppIcon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-base font-bold text-foreground leading-tight">Assistente no WhatsApp</p>
                      <p className="font-body text-sm text-muted-foreground line-clamp-2">Fale com o Horus direto no WhatsApp</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-400 transition-colors shrink-0" />
                  </motion.button>
                </motion.div>
              )}

              {horusView === 'main' && (
                <div className="flex flex-col gap-6">
                  {/* Logo + descrição + tags */}
                  <div className="flex flex-col items-center text-center gap-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                      className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl shadow-primary/40 overflow-hidden ring-4 ring-background"
                    >
                      <img
                        src={vacatioLogo}
                        alt="Vacatio"
                        className="w-14 h-14 object-contain"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className="space-y-1"
                    >
                      <h4 className="font-display text-lg font-bold text-foreground">Assistente Horus</h4>
                      <p className="font-body text-sm text-muted-foreground max-w-[260px] leading-snug">
                        Seu assistente jurídico no WhatsApp. Tire dúvidas, resuma documentos e receba avisos sobre o que importa para você.
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex flex-wrap justify-center gap-2"
                    >
                      {HORUS_TAGS.map((tag, i) => (
                        <motion.span
                          key={tag}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.12 + i * 0.03 }}
                          className="px-3 py-1.5 rounded-full bg-secondary/70 border border-border/60 text-[11px] font-semibold text-foreground/80"
                        >
                          {tag}
                        </motion.span>
                      ))}
                    </motion.div>
                  </div>

                  {/* CTA centralizado — Falar com Horus */}
                  <motion.a
                    href={`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(WHATSAPP_MSG)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                    onClick={() => setAssistenteChooserOpen(false)}
                    className="mx-auto w-full max-w-sm h-14 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-2.5"
                  >
                    <WhatsAppIcon className="w-6 h-6 text-primary-foreground" />
                    <span className="font-display text-base font-bold text-primary-foreground">Falar com Horus</span>
                  </motion.a>

                  {/* Lista com 2 opções */}
                  <div className="flex flex-col gap-3">
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      onClick={() => { haptic.selection(); setHorusView('funcoes'); }}
                      className="group flex items-center gap-4 p-4 min-h-[76px] rounded-2xl bg-secondary/50 border border-border hover:border-emerald-500/40 transition-all text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/40 flex items-center justify-center shrink-0">
                        <Sparkles className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-base font-bold text-foreground leading-tight">Funções</p>
                        <p className="font-body text-sm text-muted-foreground line-clamp-1">O que o Horus pode fazer</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-400 transition-colors shrink-0" />
                    </motion.button>

                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      onClick={() => { haptic.selection(); setHorusView('notificacoes'); }}
                      className="group flex items-center gap-4 p-4 min-h-[76px] rounded-2xl bg-secondary/50 border border-border hover:border-emerald-500/40 transition-all text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 ring-1 ring-amber-400/40 flex items-center justify-center shrink-0">
                        <Bell className="w-6 h-6 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-base font-bold text-foreground leading-tight">Notificações</p>
                        <p className="font-body text-sm text-muted-foreground line-clamp-1">Escolha o que receber no WhatsApp</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-400 transition-colors shrink-0" />
                    </motion.button>
                  </div>
                </div>
              )}


              {horusView === 'funcoes' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
                  className="flex flex-col gap-2.5"
                >
                  {[
                    { icon: Send, color: 'emerald', label: 'Enviar mensagem', desc: 'Mande qualquer dúvida por texto no WhatsApp e receba resposta na hora.' },
                    { icon: Mic, color: 'sky', label: 'Áudio por voz', desc: 'Grave um áudio explicando sua dúvida. O Horus entende e responde em áudio também.' },
                    { icon: FileText, color: 'rose', label: 'Ler PDF', desc: 'Envie um PDF de prova, artigo ou trabalho e peça resumo, correção ou explicação.' },
                    { icon: ImageIcon, color: 'violet', label: 'Ler imagem', desc: 'Envie foto do caderno, prova ou documento — ele lê e comenta.' },
                    { icon: Gavel, color: 'amber', label: 'Dúvidas jurídicas', desc: 'Explica artigos, súmulas, jurisprudência e conceitos de forma simples.' },
                    { icon: BookOpen, color: 'cyan', label: 'Explicar lição', desc: 'Peça explicação passo a passo de qualquer conteúdo que estiver estudando.' },
                  ].map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <motion.div
                        key={f.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-3 p-4 rounded-2xl bg-secondary/50 border border-border"
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${HORUS_COLOR[f.color].bg}`}>
                          <Icon className={`w-5 h-5 ${HORUS_COLOR[f.color].text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-base font-bold text-foreground leading-tight">{f.label}</p>
                          <p className="font-body text-sm text-muted-foreground leading-snug mt-1">{f.desc}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {horusView === 'notificacoes' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
                  className="flex flex-col gap-2.5"
                >
                  {[
                    { icon: Newspaper, color: 'sky', label: 'Boletim jurídico diário', desc: 'Resumo diário das principais notícias do Direito.' },
                    { icon: Gavel, color: 'amber', label: 'Boletim de leis diárias', desc: 'Novas leis e decretos publicados no DOU.' },
                    { icon: Star, color: 'rose', label: 'Mudança em artigo favorito', desc: 'Aviso quando um artigo que você favoritou for alterado.' },
                    { icon: ScanEye, color: 'violet', label: 'Radar Legislativo', desc: 'Andamento de PLs que você acompanha.' },
                  ].map((n, i) => {
                    const Icon = n.icon;
                    return (
                      <motion.label
                        key={n.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50 border border-border cursor-pointer"
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${HORUS_COLOR[n.color].bg}`}>
                          <Icon className={`w-5 h-5 ${HORUS_COLOR[n.color].text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm font-bold text-foreground leading-tight">{n.label}</p>
                          <p className="font-body text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{n.desc}</p>
                        </div>
                        <input type="checkbox" className="w-5 h-5 accent-emerald-500 shrink-0" defaultChecked />
                      </motion.label>
                    );
                  })}
                  <p className="font-body text-xs text-muted-foreground mt-3 px-1 leading-snug">
                    As notificações são enviadas pelo WhatsApp do Horus. Você pode desativar a qualquer momento.
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>



    {/* Side Menu (Perfil, Estudar, Legislação, Configurações) */}
    <Suspense fallback={null}>{sideMenuOpen && <SideMenu open={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />}</Suspense>

    {/* Search Overlay (80% bottom sheet) */}
    <SearchOverlay
      open={searchOpen}
      onClose={() => setSearchOpen(false)}
      onSelectLei={(lei) => {
        setSearchOpen(false);
        pushRecente({ tipo: lei.tipo, leiId: lei.leiId, nome: lei.nome, descricao: lei.descricao, tabela_nome: lei.tabela_nome });
        const slug = leiToSlug({ id: lei.leiId, nome: lei.nome });
        const base = `/legislacao/${tipoToSlug(lei.tipo)}/${slug}`;
        navigate(lei.artigoNumero ? `${base}/${encodeURIComponent(lei.artigoNumero)}` : base);
      }}
    />

    {/* Dicionário Jurídico */}
    <DicionarioJuridico open={dicionarioOpen} onClose={() => setDicionarioOpen(false)} />

    {/* Mentor Jurídico */}
    <MentorOverlay open={mentorOpen} onClose={() => setMentorOpen(false)} />

    {/* Pessoal — agora é rota dedicada em /meu-espaco */}

    {/* Chat Jurídico */}
    <AssistenteOverlay open={chatOpen} onClose={() => setChatOpen(false)} />

    </>
  );
};

export default BottomNav;

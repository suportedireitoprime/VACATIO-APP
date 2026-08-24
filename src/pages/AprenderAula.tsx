import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RotateCw,
  Trophy,
  Sparkles,
  BookOpen,
  Layers,
  HelpCircle,
  Link2,
  FileText,
  Lightbulb,
  Flag,
  List,
  MessageCircle,
  Settings2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Info, AlertTriangle, Quote, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { proximaRevisao, rotuloIntervalo, type NivelFlashcard } from '@/lib/spacedRepetition';
import { HorusContextualSheet } from '@/components/aprender/HorusContextualSheet';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AulaSettingsSheet } from '@/components/aprender/AulaSettingsSheet';
import { MapaConceitualBlock } from '@/components/aprender/blocos/MapaConceitualBlock';
import { OrdenacaoBlock } from '@/components/aprender/blocos/OrdenacaoBlock';
import { CenaAnimadaBlock } from '@/components/aprender/blocos/CenaAnimadaBlock';
import flipSoundAsset from '@/assets/flipcard.mp3.asset.json';
import swooshSoundAsset from '@/assets/swoosh.mp3.asset.json';

type TipoBloco =
  | 'texto' | 'leitura' | 'intro' | 'conceito' | 'exemplo' | 'conclusao'
  | 'pergunta' | 'flashcard' | 'conexao'
  | 'citacao' | 'artigo_lei' | 'tabela' | 'mapa_mental' | 'mapa_conceitual'
  | 'infografico' | 'linha_tempo' | 'destaque' | 'fluxograma'
  | 'ordenacao' | 'cena_animada';

type Bloco = {
  id: string;
  ordem: number;
  tipo: TipoBloco;
  payload: any;
  resposta_correta: any;
};

type Aula = { id: string; titulo: string; objetivo: string | null; duracao_est_min: number };

const TIPOS_TEXTO = new Set<TipoBloco>(['texto', 'leitura', 'intro', 'conceito', 'exemplo', 'conclusao']);
const isBlocoTexto = (tipo: TipoBloco) => TIPOS_TEXTO.has(tipo);

const iconePorTipo = (tipo: TipoBloco) => {
  switch (tipo) {
    case 'intro': return BookOpen;
    case 'conceito': return Lightbulb;
    case 'exemplo': return FileText;
    case 'conclusao': return Flag;
    case 'leitura':
    case 'texto': return FileText;
    case 'pergunta': return HelpCircle;
    case 'flashcard': return Layers;
    case 'conexao': return Link2;
    case 'citacao': return BookOpen;
    case 'artigo_lei': return FileText;
    case 'tabela': return Layers;
    case 'mapa_mental': return Link2;
    case 'mapa_conceitual': return Link2;
    case 'ordenacao': return List;
    case 'cena_animada': return Sparkles;
    case 'infografico': return Sparkles;
    case 'linha_tempo': return Flag;
    case 'destaque': return Lightbulb;
    case 'fluxograma': return Flag;
    default: return FileText;
  }
};

const rotuloPorTipo = (tipo: TipoBloco) => {
  switch (tipo) {
    case 'intro': return 'Introdução';
    case 'conceito': return 'Conceito';
    case 'exemplo': return 'Exemplo';
    case 'conclusao': return 'Conclusão';
    case 'leitura':
    case 'texto': return 'Leitura';
    case 'pergunta': return 'Pergunta';
    case 'flashcard': return 'Flashcard';
    case 'conexao': return 'Conexões';
    case 'citacao': return 'Citação';
    case 'artigo_lei': return 'Artigo de Lei';
    case 'tabela': return 'Tabela';
    case 'mapa_mental': return 'Mapa mental';
    case 'mapa_conceitual': return 'Mapa conceitual';
    case 'ordenacao': return 'Coloque em ordem';
    case 'cena_animada': return 'Cena animada';
    case 'infografico': return 'Infográfico';
    case 'linha_tempo': return 'Linha do tempo';
    case 'destaque': return 'Destaque';
    case 'fluxograma': return 'Fluxograma';
    default: return 'Bloco';
  }
};

const AprenderAula = () => {
  const navigate = useNavigate();
  const { aulaId } = useParams<{ aulaId: string }>();
  const { user } = useAuth();
  const [aula, setAula] = useState<Aula | null>(null);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [respostas, setRespostas] = useState<Record<string, { correta: boolean; escolha?: string }>>({});
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [conexoes, setConexoes] = useState<Record<string, Record<number, number | null>>>({});
  const [finalizada, setFinalizada] = useState(false);
  const [sumarioOpen, setSumarioOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const startedAt = useRef<number>(Date.now());
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const timelineItemsRef = useRef<Array<HTMLDivElement | null>>([]);
  const flipAudioRef = useRef<HTMLAudioElement | null>(null);
  const swooshAudioRef = useRef<HTMLAudioElement | null>(null);
  if (typeof window !== 'undefined' && !flipAudioRef.current) {
    flipAudioRef.current = new Audio(flipSoundAsset.url);
    flipAudioRef.current.volume = 0.5;
    flipAudioRef.current.preload = 'auto';
  }
  if (typeof window !== 'undefined' && !swooshAudioRef.current) {
    swooshAudioRef.current = new Audio(swooshSoundAsset.url);
    swooshAudioRef.current.volume = 0.5;
    swooshAudioRef.current.preload = 'auto';
  }
  const playFlipSound = () => {
    const a = flipAudioRef.current;
    if (!a) return;
    try { a.currentTime = 0; void a.play(); } catch {}
  };
  const playSwooshSound = () => {
    const a = swooshAudioRef.current;
    if (!a) return;
    try { a.currentTime = 0; void a.play(); } catch {}
  };

  useEffect(() => {
    if (!aulaId) return;
    (async () => {
      const [{ data: a }, { data: bs }] = await Promise.all([
        supabase.from('aprender_aulas').select('id, titulo, objetivo, duracao_est_min').eq('id', aulaId).maybeSingle(),
        supabase.from('aprender_blocos').select('id, ordem, tipo, payload, resposta_correta').eq('aula_id', aulaId).order('ordem'),
      ]);
      setAula(a as Aula | null);
      setBlocos((bs ?? []) as Bloco[]);
      startedAt.current = Date.now();
      setLoading(false);
    })();
  }, [aulaId]);

  const total = blocos.length;
  const atual = blocos[idx];
  const perguntas = useMemo(() => blocos.filter((b) => b.tipo === 'pergunta'), [blocos]);

  // Auto-scroll da timeline amarela: mantém o passo atual centralizado conforme avança
  useEffect(() => {
    const container = timelineScrollRef.current;
    const item = timelineItemsRef.current[idx];
    if (!container || !item) return;
    const targetLeft = item.offsetLeft - container.clientWidth / 2 + item.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [idx, blocos.length]);
  const acertos = useMemo(
    () => perguntas.filter((p) => respostas[p.id]?.correta).length,
    [perguntas, respostas],
  );

  const salvarProgresso = async (concluida = false) => {
    if (!user || !aulaId) return;
    const payload = {
      user_id: user.id,
      aula_id: aulaId,
      blocos_concluidos: concluida ? total : Math.min(idx + 1, total),
      acertos,
      total_perguntas: perguntas.length,
      tempo_ms: Date.now() - startedAt.current,
      concluida_em: concluida ? new Date().toISOString() : null,
    };
    await supabase.from('aprender_progresso_aula').upsert(payload, { onConflict: 'user_id,aula_id' });
  };

  const salvarBloco = async (
    bloco: Bloco,
    resposta: any,
    acertou: boolean | null,
    proxima_revisao_em?: string | null,
  ) => {
    if (!user) return;
    const payload: any = {
      user_id: user.id,
      bloco_id: bloco.id,
      resposta,
      acertou,
      tentativas: 1,
    };
    if (typeof proxima_revisao_em !== 'undefined') payload.proxima_revisao_em = proxima_revisao_em;
    await supabase.from('aprender_progresso_bloco').upsert(payload, { onConflict: 'user_id,bloco_id' });
  };

  const avaliarFlashcard = async (bloco: Bloco, nivel: NivelFlashcard) => {
    const { data: anterior } = user
      ? await supabase
          .from('aprender_progresso_bloco')
          .select('proxima_revisao_em')
          .eq('user_id', user.id)
          .eq('bloco_id', bloco.id)
          .maybeSingle()
      : { data: null as any };
    const nova = proximaRevisao(nivel, anterior?.proxima_revisao_em);
    await salvarBloco(bloco, { nivel }, nivel === 'sabia', nova);
    toast.success(`Revisão marcada para ${rotuloIntervalo(nova)}`);
  };

  const responderPergunta = async (bloco: Bloco, escolha: string) => {
    if (respostas[bloco.id]) return;
    const correta = String(bloco.resposta_correta?.id_correto || '').toLowerCase() === escolha.toLowerCase();
    setRespostas((r) => ({ ...r, [bloco.id]: { correta, escolha } }));
    await salvarBloco(bloco, { escolha }, correta);
  };

  const irPara = (novo: number) => {
    if (novo < 0 || novo >= total || novo === idx) return;
    setDirection(novo > idx ? 1 : -1);
    setIdx(novo);
    playSwooshSound();
  };

  const proximo = async () => {
    if (idx < total - 1) {
      await salvarProgresso(false);
      irPara(idx + 1);
    } else {
      await salvarProgresso(true);
      setFinalizada(true);
      toast.success('Aula concluída!');
    }
  };

  const anterior = () => irPara(idx - 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="h-64 rounded-2xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (!aula || total === 0) {
    return (
      <div className="min-h-screen bg-background p-6 text-center">
        <p className="text-muted-foreground">Aula não encontrada ou sem conteúdo.</p>
        <button onClick={() => navigate('/aprender')} className="mt-4 text-primary underline">
          Voltar
        </button>
      </div>
    );
  }

  if (finalizada) {
    const pct = perguntas.length ? Math.round((acertos / perguntas.length) * 100) : 100;
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-10 text-center">
          <div
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full"
            style={{ background: '#EFE039' }}
          >
            <Trophy className="h-12 w-12 text-black" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Aula concluída!</h1>
          <p className="mt-2 text-muted-foreground">{aula.titulo}</p>
          {perguntas.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase text-muted-foreground">Acertos</p>
                <p className="mt-1 font-display text-2xl font-bold">{acertos}/{perguntas.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase text-muted-foreground">Aproveitamento</p>
                <p className="mt-1 font-display text-2xl font-bold">{pct}%</p>
              </div>
            </div>
          )}
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => { setIdx(0); setRespostas({}); setFlipped({}); setConexoes({}); setFinalizada(false); startedAt.current = Date.now(); }}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              <RotateCw className="mr-1 inline h-4 w-4" /> Refazer
            </button>
            <button
              onClick={() => navigate('/aprender')}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Voltar para trilhas
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/*
        Header alinhado ao PageHeader do Radar (min-height 5rem + safe-area).
        Alvos de toque seguem Apple HIG (44pt) e Material 3 (48dp).
      */}
      <header
        className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur"
        style={{
          paddingTop: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 0.5rem)',
        }}
      >
        <div
          className="mx-auto flex max-w-3xl items-center gap-3 py-2 md:py-3"
          style={{
            paddingLeft: 'calc(0.75rem + var(--sai-left, env(safe-area-inset-left, 0px)))',
            paddingRight: 'calc(0.75rem + var(--sai-right, env(safe-area-inset-right, 0px)))',
          }}
        >
          <button
            onClick={() => navigate(-1)}
            aria-label="Voltar"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted hover:bg-accent active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-[22px] w-[22px]" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground md:text-xs">Aprender</p>
            <p className="truncate font-display text-[15px] font-bold text-foreground md:text-base">{aula.titulo}</p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground md:text-sm">
            {idx + 1}/{total}
          </span>
        </div>

        {/* Timeline horizontal — fundo amarelo degradê (mesma paleta do painel inicial), sem margens laterais */}
        <div
          ref={timelineScrollRef}
          className="relative overflow-x-auto border-y border-black/10 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
          style={{
            background: 'linear-gradient(135deg, #EFE039 0%, #EFE039 55%, #EFE039 100%)',
          }}
        >
          {/* Radial warmth overlays — mesmo efeito do painel amarelo */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.35),transparent_65%)]" />

          <div
            className="mx-auto flex max-w-3xl items-center"
            style={{
              paddingLeft: 'calc(0.75rem + var(--sai-left, env(safe-area-inset-left, 0px)))',
              paddingRight: 'calc(0.75rem + var(--sai-right, env(safe-area-inset-right, 0px)))',
            }}
          >
            {blocos.map((b, i) => {
              const Icon = iconePorTipo(b.tipo);
              const isAtual = i === idx;
              const isFeito = i < idx;
              const ativo = isAtual || isFeito;
              const respondida = b.tipo === 'pergunta' ? respostas[b.id] : undefined;
              const ok = respondida?.correta;
              const err = respondida && !respondida.correta;
              const isLast = i === blocos.length - 1;
              return (
                <div key={b.id} ref={(el) => (timelineItemsRef.current[i] = el)} className="relative flex shrink-0 items-center">
                  <button
                    onClick={() => irPara(i)}
                    aria-label={`${rotuloPorTipo(b.tipo)} ${i + 1}`}
                    className="relative flex h-11 w-11 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
                  >
                    {isAtual && (
                      <motion.span
                        layoutId="timeline-halo"
                        className="absolute inset-0 rounded-full"
                        style={{ background: 'rgba(0,0,0,0.18)' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                      />
                    )}
                    <Icon
                      className={`relative h-[22px] w-[22px] md:h-6 md:w-6 transition-colors ${
                        ativo ? 'text-black' : 'text-black/40'
                      }`}
                      strokeWidth={2}
                    />
                    {ok && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-600 ring-2 ring-[#EFE039]">
                        <CheckCircle2 className="h-2.5 w-2.5 text-white" strokeWidth={2} />
                      </span>
                    )}
                    {err && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 ring-2 ring-[#EFE039]">
                        <XCircle className="h-2.5 w-2.5 text-white" strokeWidth={2} />
                      </span>
                    )}
                  </button>
                  {!isLast && (
                    <div className="relative mx-0.5 h-[3px] w-6 md:w-8 overflow-hidden rounded-full bg-black/20">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: 'black' }}
                        initial={false}
                        animate={{ width: isFeito ? '100%' : '0%' }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Conteúdo com swipe horizontal */}
      <main className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={atual.id}
            custom={direction}
            initial={{ x: direction * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -60, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) proximo();
              else if (info.offset.x > 80) anterior();
            }}
            className="mx-auto h-full w-full max-w-3xl overflow-y-auto px-5 md:px-8 pt-6 md:pt-8"
            style={{ paddingBottom: 'calc(9rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <BlocoView
              bloco={atual}
              resposta={respostas[atual.id]}
              onResponder={(escolha) => responderPergunta(atual, escolha)}
              flipped={!!flipped[atual.id]}
              onFlip={() => { playFlipSound(); setFlipped((f) => ({ ...f, [atual.id]: !f[atual.id] })); }}
              onAvaliarFlash={(nivel) => avaliarFlashcard(atual, nivel)}
              conexao={conexoes[atual.id]}
              onConexao={async (map, done) => {
                setConexoes((c) => ({ ...c, [atual.id]: map }));
                if (done) {
                  const pares = atual.payload?.pares || [];
                  const acertou = pares.every((_: any, i: number) => map[i] === i);
                  await salvarBloco(atual, { map }, acertou);
                  if (acertou) toast.success('Todas as ligações corretas!');
                }
              }}
            />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Rodapé unificado — botões 48dp (Material) / 44pt (Apple) */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur"
        style={{
          paddingLeft: 'calc(0.75rem + var(--sai-left, env(safe-area-inset-left, 0px)))',
          paddingRight: 'calc(0.75rem + var(--sai-right, env(safe-area-inset-right, 0px)))',
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2 md:gap-3 py-3">
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Configurações"
            className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-full border border-border hover:bg-accent active:scale-95 transition-transform"
          >
            <Settings2 className="h-[22px] w-[22px] md:h-6 md:w-6" />
          </button>
          <button
            onClick={() => setMentorOpen(true)}
            aria-label="Mentor"
            className="relative flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-black shadow-md active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #EFE039 0%, #EFE039 55%, #EFE039 100%)' }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.35),transparent_65%)]" />
            <MessageCircle className="relative h-[22px] w-[22px] md:h-6 md:w-6" strokeWidth={2} />
          </button>
          <div className="flex-1" />
          <button
            onClick={anterior}
            disabled={idx === 0}
            className="rounded-full border border-border px-5 md:px-6 h-12 md:h-14 text-sm md:text-base font-medium disabled:opacity-40 active:scale-95 transition-transform"
          >
            Anterior
          </button>
          <button
            onClick={proximo}
            className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full px-6 md:px-7 h-12 md:h-14 text-sm md:text-base font-semibold text-black hover:opacity-90 active:scale-95 transition-transform shadow-md"
            style={{ background: 'linear-gradient(135deg, #EFE039 0%, #EFE039 55%, #EFE039 100%)' }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.35),transparent_65%)]" />
            <span className="relative">{idx === total - 1 ? 'Concluir' : 'Próximo'}</span>
            <ArrowRight className="relative h-4 w-4 md:h-5 md:w-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Sumário */}
      <Sheet open={sumarioOpen} onOpenChange={setSumarioOpen}>
        <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl p-0">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle className="text-left">Sumário da aula</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto p-3">
            {blocos.map((b, i) => {
              const Icon = iconePorTipo(b.tipo);
              const isAtual = i === idx;
              const titulo =
                b.payload?.titulo ||
                b.payload?.enunciado ||
                b.payload?.frente ||
                rotuloPorTipo(b.tipo);
              return (
                <button
                  key={b.id}
                  onClick={() => { irPara(i); setSumarioOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm transition-colors ${
                    isAtual ? 'bg-accent' : 'hover:bg-accent/60'
                  }`}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black"
                    style={{ background: '#EFE039' }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {i + 1}. {rotuloPorTipo(b.tipo)}
                    </p>
                    <p className="truncate font-medium text-foreground">{titulo}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Configurações da aula (Sumário + Narração) */}
      <AulaSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        blocoKey={atual.id}
        onAbrirSumario={() => setSumarioOpen(true)}
        textoBlocoAtual={(() => {
          const p = atual.payload || {};
          const flip = !!flipped[atual.id];
          switch (atual.tipo) {
            case 'intro':
            case 'conceito':
            case 'exemplo':
            case 'conclusao':
            case 'leitura':
            case 'texto':
              return `${p.titulo ? p.titulo + '.\n\n' : ''}${p.conteudo || p.texto || ''}`;
            case 'citacao':
              return `Citação. ${p.texto || ''}${p.fonte ? `. Fonte: ${p.fonte}.` : ''}`;
            case 'artigo_lei':
              return `${p.lei || 'Artigo de lei'}${p.numero ? `, artigo ${p.numero}` : ''}.\n\n${p.texto || ''}`;
            case 'destaque':
              return `${p.titulo || 'Destaque'}. ${p.texto || ''}`;
            case 'pergunta': {
              const opcs = (p.opcoes || [])
                .map((o: any) => `Alternativa ${String(o.id).toUpperCase()}: ${o.texto}.`)
                .join(' ');
              return `Pergunta. ${p.enunciado || ''}\n\n${opcs}`;
            }
            case 'flashcard':
              return flip
                ? `Resposta. ${p.verso || ''}. ${p.explicacao || ''}. Exemplo prático: ${p.exemplo || ''}. Aplicando: ${p.aplicando || ''}.`
                : `Pergunta do flashcard. ${p.frente || ''}`;
            case 'conexao': {
              const pares = (p.pares || [])
                .map((par: any) => `${par.termo}: ${par.definicao}.`)
                .join('\n');
              return `Associe cada termo à sua definição.\n\n${pares}`;
            }
            case 'tabela':
              return `${p.titulo || 'Tabela'}. Colunas: ${(p.colunas || []).join(', ')}.`;
            case 'mapa_mental':
              return `Mapa mental. ${p.raiz || ''}. ${p.definicao_raiz || ''}. ${(p.ramos || [])
                .map((r: any) => `${r.titulo}: ${(r.itens || [])
                  .map((it: any) => typeof it === 'string' ? it : `${it.termo}, ${it.definicao}`)
                  .join(', ')}.`)
                .join(' ')}`;
            case 'fluxograma':
              return `Fluxograma. ${p.titulo || ''}. ${(p.etapas || [])
                .map((et: any) => `Etapa ${et.n}: ${et.titulo}. ${et.descricao || ''}`)
                .join(' ')}`;
            case 'mapa_conceitual':
              return `Mapa conceitual. ${(p.nos || []).map((n: any) => `${n.rotulo}${n.definicao ? ': ' + n.definicao : ''}`).join('. ')}. Relações: ${(p.arestas || []).map((a: any) => `${a.de} ${a.relacao} ${a.para}`).join('; ')}.`;
            case 'ordenacao':
              return `${p.titulo || 'Coloque em ordem'}. ${p.instrucao || ''}. Itens: ${(p.itens || []).map((it: any) => it.texto).join('; ')}.`;
            case 'cena_animada':
              return `${p.titulo || 'Cena animada'}. ${(p.cenas || []).map((c: any) => `Cena ${c.n}: ${c.titulo}. ${c.narracao}`).join(' ')}. ${p.moral ? 'Regra: ' + p.moral : ''}`;
            case 'linha_tempo':
              return `${p.titulo || 'Linha do tempo'}. ${(p.eventos || [])
                .map((e: any) => `${e.marco}, ${e.titulo}. ${e.descricao || ''}`)
                .join(' ')}`;
            case 'infografico':
              return `${p.titulo || 'Infográfico'}. ${(p.itens || [])
                .map((it: any) => `${it.numero || ''} ${it.titulo}. ${it.descricao || ''}`)
                .join(' ')}`;
            default:
              return p.titulo || p.texto || rotuloPorTipo(atual.tipo);
          }
        })()}
      />



      {/* Mentor controlado */}
      <HorusContextualSheet
        hideFab
        open={mentorOpen}
        onOpenChange={setMentorOpen}
        contexto={{
          aula_titulo: aula.titulo,
          bloco_tipo: atual.tipo,
          bloco_texto: (() => {
            const p = atual.payload || {};
            if (isBlocoTexto(atual.tipo)) return `${p.titulo || ''}\n\n${p.conteudo || ''}`;
            if (atual.tipo === 'pergunta') return `${p.enunciado || ''}\n\nOpções: ${JSON.stringify(p.opcoes || [])}`;
            if (atual.tipo === 'flashcard') return `${p.frente || ''} → ${p.verso || ''}`;
            if (atual.tipo === 'conexao') return `Pares: ${JSON.stringify(p.pares || [])}`;
            return JSON.stringify(p);
          })(),
          termos: atual.payload?.termos || [],
        }}
      />
    </div>
  );
};

/* ---------- Blocos ---------- */

function BlocoView({
  bloco, resposta, onResponder, flipped, onFlip, onAvaliarFlash, conexao, onConexao,
}: {
  bloco: Bloco;
  resposta?: { correta: boolean; escolha?: string };
  onResponder: (escolha: string) => void;
  flipped: boolean;
  onFlip: () => void;
  onAvaliarFlash: (nivel: NivelFlashcard) => void;
  conexao?: Record<number, number | null>;
  onConexao: (map: Record<number, number | null>, done: boolean) => void;
}) {
  const pares: { termo: string; definicao: string }[] = bloco.tipo === 'conexao'
    ? bloco.payload?.pares || []
    : [];
  const shuffled = useMemo(() => {
    const idxs = pares.map((_, i) => i);
    let seed = bloco.id.charCodeAt(0);
    for (let i = idxs.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = seed % (i + 1);
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    return idxs;
  }, [bloco.id, pares.length]);

  if (isBlocoTexto(bloco.tipo)) {
    const { titulo, conteudo } = bloco.payload || {};
    return (
      <article>
        {titulo && <h2 className="mb-4 font-display text-2xl font-bold leading-tight text-foreground">{titulo}</h2>}
        <div className="prose prose-lg max-w-none dark:prose-invert prose-p:leading-relaxed prose-p:text-[17px] prose-li:text-[17px] prose-blockquote:border-l-primary prose-blockquote:text-foreground/90">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(conteudo ?? '')}</ReactMarkdown>
        </div>
      </article>
    );
  }

  if (bloco.tipo === 'citacao') {
    const { texto, autor, fonte_url } = bloco.payload || {};
    return (
      <article>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><Quote className="h-4 w-4" /> Citação</p>
        <blockquote className="border-l-4 border-primary bg-primary/5 p-4 rounded-r-lg">
          <p className="font-display text-lg leading-relaxed italic text-foreground">"{texto}"</p>
          {autor && <footer className="mt-3 text-sm text-muted-foreground">— {autor}</footer>}
          {fonte_url && (
            <a href={fonte_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-primary underline">
              Ver fonte
            </a>
          )}
        </blockquote>
      </article>
    );
  }

  if (bloco.tipo === 'artigo_lei') {
    const { lei, numero, texto } = bloco.payload || {};
    return (
      <article>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><Scale className="h-4 w-4" /> Artigo de lei</p>
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <p className="mb-2 text-sm font-bold text-foreground">
            {lei} {numero ? `— art. ${numero}` : ''}
          </p>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground">{texto}</p>
        </div>
      </article>
    );
  }

  if (bloco.tipo === 'tabela') {
    const { titulo, colunas = [], linhas = [] } = bloco.payload || {};
    return (
      <article>
        {titulo && <h3 className="mb-3 font-display text-lg font-bold text-foreground">{titulo}</h3>}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                {colunas.map((c: string, i: number) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold text-foreground">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((row: string[], ri: number) => (
                <tr key={ri} className="border-t border-border">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 align-top text-foreground/90">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    );
  }

  if (bloco.tipo === 'mapa_mental') {
    const { raiz, definicao_raiz, ramos = [] } = bloco.payload || {};
    return (
      <article>
        <p className="mb-3 text-xs font-semibold uppercase text-primary">Mapa mental</p>
        <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-accent/10 p-5 text-center">
          <p className="font-display text-2xl font-bold text-foreground leading-tight">{raiz}</p>
          {definicao_raiz && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{definicao_raiz}</p>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ramos.map((r: any, i: number) => (
            <div key={i} className="rounded-xl border-2 border-border bg-card p-4 shadow-sm">
              <p className="font-display text-base font-bold text-foreground">{r.titulo}</p>
              {r.definicao && (
                <p className="mt-1 mb-3 text-xs text-muted-foreground italic leading-relaxed">{r.definicao}</p>
              )}
              <ul className="space-y-2 text-[14px]">
                {(r.itens || []).map((it: any, j: number) => {
                  const isObj = it && typeof it === 'object';
                  const termo = isObj ? it.termo : String(it);
                  const definicao = isObj ? it.definicao : '';
                  return (
                    <li key={j} className="flex gap-2 items-start">
                      <span className="mt-1.5 inline-block w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      <span className="flex-1 leading-snug">
                        <span className="font-semibold text-foreground">{termo}</span>
                        {definicao && (
                          <span className="text-muted-foreground"> — {definicao}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </article>
    );
  }

  if (bloco.tipo === 'fluxograma') {
    const { titulo, etapas = [] } = bloco.payload || {};
    const stepStyle = (t?: string) => {
      switch (t) {
        case 'inicio': return { border: 'border-emerald-500/50', bg: 'bg-emerald-500/5', badge: 'bg-emerald-500 text-white', label: 'Início' };
        case 'fim': return { border: 'border-primary/50', bg: 'bg-primary/5', badge: 'bg-primary text-primary-foreground', label: 'Fim' };
        case 'decisao': return { border: 'border-yellow-500/60', bg: 'bg-yellow-500/10', badge: 'bg-yellow-500 text-black', label: 'Decisão' };
        default: return { border: 'border-border', bg: 'bg-card', badge: 'bg-muted text-foreground', label: 'Etapa' };
      }
    };
    return (
      <article>
        <p className="mb-3 text-xs font-semibold uppercase text-primary">Fluxograma</p>
        {titulo && <h3 className="mb-4 font-display text-lg font-bold text-foreground">{titulo}</h3>}
        <ol className="space-y-2">
          {etapas.map((et: any, i: number) => {
            const s = stepStyle(et.tipo);
            const isDecisao = et.tipo === 'decisao';
            return (
              <li key={i}>
                <div className={`rounded-2xl border-2 ${s.border} ${s.bg} p-4 shadow-sm ${isDecisao ? 'transform-gpu' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-9 h-9 rounded-full ${s.badge} flex items-center justify-center font-bold text-sm`}>
                      {et.n ?? i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${s.badge}`}>{s.label}</span>
                      </div>
                      <p className="font-display text-base font-bold text-foreground leading-tight">{et.titulo}</p>
                      {et.descricao && (
                        <p className="mt-1 text-[14px] text-muted-foreground leading-relaxed">{et.descricao}</p>
                      )}
                    </div>
                  </div>
                </div>
                {i < etapas.length - 1 && (
                  <div className="flex justify-center py-1" aria-hidden="true">
                    <div className="w-0.5 h-4 bg-primary/30" />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </article>
    );
  }

  if (bloco.tipo === 'linha_tempo') {
    const { titulo, eventos = [] } = bloco.payload || {};
    return (
      <article>
        {titulo && <h3 className="mb-3 font-display text-lg font-bold text-foreground">{titulo}</h3>}
        <ol className="relative border-l-2 border-primary/40 pl-4 space-y-4">
          {eventos.map((ev: any, i: number) => (
            <li key={i} className="relative">
              <span className="absolute -left-[22px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary" />
              <p className="text-xs font-bold uppercase text-primary">{ev.marco}</p>
              <p className="font-semibold text-foreground">{ev.titulo}</p>
              {ev.descricao && <p className="text-sm text-muted-foreground">{ev.descricao}</p>}
            </li>
          ))}
        </ol>
      </article>
    );
  }

  if (bloco.tipo === 'destaque') {
    const { tom = 'info', titulo, texto } = bloco.payload || {};
    const style = tom === 'alerta'
      ? { bg: 'bg-red-500/10', br: 'border-red-500/40', tx: 'text-red-700 dark:text-red-300', Icon: AlertTriangle }
      : tom === 'dica'
      ? { bg: 'bg-yellow-500/10', br: 'border-yellow-500/40', tx: 'text-yellow-700 dark:text-yellow-300', Icon: Lightbulb }
      : { bg: 'bg-blue-500/10', br: 'border-blue-500/40', tx: 'text-blue-700 dark:text-blue-300', Icon: Info };
    return (
      <article>
        <div className={`rounded-xl border ${style.br} ${style.bg} p-4`}>
          <div className={`mb-2 flex items-center gap-2 text-xs font-bold uppercase ${style.tx}`}>
            <style.Icon className="h-4 w-4" />
            {titulo || (tom === 'alerta' ? 'Atenção' : tom === 'dica' ? 'Dica' : 'Importante')}
          </div>
          <p className="text-[15px] leading-relaxed text-foreground">{texto}</p>
        </div>
      </article>
    );
  }

  if (bloco.tipo === 'mapa_conceitual') return <MapaConceitualBlock payload={bloco.payload} />;
  if (bloco.tipo === 'ordenacao') return <OrdenacaoBlock payload={bloco.payload} />;
  if (bloco.tipo === 'cena_animada') return <CenaAnimadaBlock payload={bloco.payload} />;

  if (bloco.tipo === 'infografico') {
    const { titulo, itens = [] } = bloco.payload || {};
    return (
      <article>
        {titulo && <h3 className="mb-3 font-display text-lg font-bold text-foreground">{titulo}</h3>}
        <div className="grid gap-3 sm:grid-cols-2">
          {itens.map((it: any, i: number) => (
            <div key={i} className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-4">
              {it.numero && <p className="font-display text-3xl font-bold text-primary">{it.numero}</p>}
              <p className="mt-1 font-semibold text-foreground">{it.titulo}</p>
              {it.descricao && <p className="mt-1 text-sm text-muted-foreground">{it.descricao}</p>}
            </div>
          ))}
        </div>
      </article>
    );
  }

  if (bloco.tipo === 'pergunta') {
    const { enunciado, opcoes } = bloco.payload || {};
    const correta = String(bloco.resposta_correta?.id_correto || '').toLowerCase();
    return (
      <article>
        <p className="mb-1 text-xs font-semibold uppercase text-primary">Pergunta</p>
        <h2 className="mb-4 font-display text-xl font-bold leading-snug text-foreground">{enunciado}</h2>
        <div className="space-y-2">
          {(opcoes || []).map((op: any) => {
            const id = String(op.id).toLowerCase();
            const escolhida = resposta?.escolha?.toLowerCase() === id;
            const acertou = resposta?.correta && escolhida;
            const errou = resposta && escolhida && !resposta.correta;
            const revelaCerta = resposta && id === correta;
            return (
              <button
                key={op.id}
                disabled={!!resposta}
                onClick={() => onResponder(id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left text-[15px] leading-relaxed transition-colors min-h-14 ${
                  acertou || revelaCerta
                    ? 'border-green-500/60 bg-green-500/10 text-foreground'
                    : errou
                    ? 'border-red-500/60 bg-red-500/10 text-foreground'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-sm font-bold uppercase">
                  {op.id}
                </span>
                <span className="flex-1">{op.texto}</span>
                {(acertou || revelaCerta) && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                {errou && <XCircle className="h-5 w-5 text-red-600" />}
              </button>
            );
          })}
        </div>
        {resposta && bloco.resposta_correta?.explicacao && (
          <div className="mt-4 rounded-lg bg-muted/60 p-3 text-[15px] text-muted-foreground">
            <strong className="text-foreground">Explicação:</strong> {bloco.resposta_correta.explicacao}
          </div>
        )}
      </article>
    );
  }

  if (bloco.tipo === 'flashcard') {
    const { frente, verso, explicacao, exemplo, aplicando, dica } = bloco.payload || {};
    const versoTexto: string = explicacao || verso || '';
    const exemploTexto: string = exemplo || '';
    const aplicandoTexto: string = aplicando || '';
    const dicaTexto: string = dica || '';

    const Divider = ({ label, Icon }: { label: string; Icon?: any }) => (
      <div className="flex items-center gap-3 my-3" aria-hidden="true">
        <div className="flex-1 h-px bg-accent-foreground/25" />
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-accent-foreground/80">
          {Icon && <Icon className="w-3.5 h-3.5" />} {label}
        </span>
        <div className="flex-1 h-px bg-accent-foreground/25" />
      </div>
    );

    return (
      <article>
        <p className="mb-3 text-xs font-semibold uppercase text-primary">Flashcard</p>

        <div className="w-full" style={{ perspective: '1200px' }}>
          <motion.div
            className="relative w-full min-h-[460px] cursor-pointer"
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformStyle: 'preserve-3d' }}
            onClick={onFlip}
          >
            {/* Frente */}
            <div
              className="absolute inset-0 rounded-3xl bg-gradient-to-br from-card via-card to-secondary border-2 border-accent/40 p-6 flex flex-col shadow-2xl"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-widest font-bold text-accent">Frente</span>
                <Sparkles className="w-4 h-4 text-accent/60" />
              </div>
              <div className="flex-1 flex items-center justify-center text-center">
                <p className="font-display text-xl leading-snug text-foreground">{frente}</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-3 border-t border-border/40">
                <RotateCw className="w-3.5 h-3.5" /> Toque para virar
              </div>
            </div>

            {/* Verso */}
            <div
              className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent/95 to-primary/90 p-5 flex flex-col shadow-2xl"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest font-bold text-accent-foreground/80">Verso · Resposta</span>
                <CheckCircle2 className="w-4 h-4 text-accent-foreground/80" />
              </div>
              <div className="flex-1 overflow-y-auto text-left pr-1">
                <p className="font-body text-[15px] leading-relaxed text-accent-foreground">{versoTexto}</p>

                {exemploTexto && (
                  <>
                    <Divider label="Exemplo prático" Icon={Lightbulb} />
                    <p className="font-body text-[14px] leading-relaxed text-accent-foreground italic">{exemploTexto}</p>
                  </>
                )}

                {aplicandoTexto && (
                  <>
                    <Divider label="Aplicando" Icon={Flag} />
                    <p className="font-body text-[14px] leading-relaxed text-accent-foreground">{aplicandoTexto}</p>
                  </>
                )}

                {dicaTexto && (
                  <div className="mt-3 rounded-xl bg-accent-foreground/10 border border-accent-foreground/25 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-accent-foreground/80 mb-0.5">Dica</p>
                    <p className="font-body text-[13px] leading-relaxed text-accent-foreground/90">{dicaTexto}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-accent-foreground/70 pt-3 mt-2 border-t border-accent-foreground/20">
                <RotateCw className="w-3.5 h-3.5" /> Toque para voltar
              </div>
            </div>
          </motion.div>
        </div>


      </article>
    );
  }


  if (bloco.tipo === 'conexao') {
    const state = conexao ?? {};
    const usadas = new Set(Object.values(state).filter((v) => v != null) as number[]);

    const pick = (termoIdx: number, defIdx: number) => {
      const next = { ...state, [termoIdx]: defIdx };
      Object.keys(next).forEach((k) => {
        const ki = Number(k);
        if (ki !== termoIdx && next[ki] === defIdx) next[ki] = null;
      });
      const done = pares.every((_, i) => next[i] != null);
      onConexao(next, done);
    };

    return (
      <article>
        <p className="mb-1 text-xs font-semibold uppercase text-primary">Conecte os termos</p>
        <h2 className="mb-4 font-display text-xl font-bold leading-snug text-foreground sm:text-2xl">
          Associe cada termo à sua definição.
        </h2>
        <div className="space-y-4">
          {pares.map((par, i) => {
            const escolha = state[i];
            const correto = escolha === i;
            const respondida = escolha != null;
            return (
              <div key={i} className="rounded-xl border border-border bg-card/40 p-4">
                <p className="mb-3 text-base font-semibold leading-snug text-foreground sm:text-lg">
                  {par.termo}
                </p>
                <div className="flex flex-col gap-2">
                  {shuffled.map((di) => {
                    const desativada = usadas.has(di) && escolha !== di;
                    const selecionada = escolha === di;
                    return (
                      <button
                        key={di}
                        onClick={() => pick(i, di)}
                        disabled={desativada}
                        className={`w-full min-h-11 rounded-xl border px-4 py-3 text-left text-[15px] leading-relaxed transition-colors ${
                          selecionada
                            ? correto
                              ? 'border-green-500/60 bg-green-500/10 text-foreground'
                              : 'border-red-500/60 bg-red-500/10 text-foreground'
                            : desativada
                            ? 'border-border/60 opacity-40'
                            : 'border-border text-foreground hover:border-primary hover:bg-primary hover:text-black active:bg-primary active:text-black'
                        }`}
                      >
                        {pares[di].definicao}
                      </button>
                    );
                  })}
                </div>
                {respondida && (
                  correto
                    ? <p className="mt-3 text-sm font-medium text-green-600">Correto</p>
                    : <p className="mt-3 text-sm font-medium text-red-600">Revise essa ligação</p>
                )}
              </div>
            );
          })}
        </div>
      </article>
    );
  }

  return null;
}

export default AprenderAula;

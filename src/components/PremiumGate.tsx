import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown, X, Volume2, Sparkles, BookOpen, MessageCircle, Scale, PlayCircle,
  Network, Bell, Download, StickyNote, Highlighter, FileText, Layers,
  HelpCircle, Map, Radar, Newspaper, Library, GraduationCap, Bot, ChevronLeft,
  Lock, Unlock, CheckCircle2, ArrowRight, ShieldCheck, Flame, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { haptic } from '@/lib/nativeHaptics';

import capa1 from '@/assets/capas/capa-1.webp';
import capa2 from '@/assets/capas/capa-2.webp';
import capa3 from '@/assets/capas/capa-3.webp';
import capa4 from '@/assets/capas/capa-4.webp';
import capa5 from '@/assets/capas/capa-5.webp';

const CAPAS_FUNDO = [capa3, capa1, capa2, capa4, capa5];

export type PremiumFeatureKey =
  | 'narracao' | 'explicacao' | 'exemplo' | 'termos' | 'perguntar'
  | 'jurisprudencia' | 'videoaula' | 'grafo' | 'mapa_mental' | 'lembretes'
  | 'baixar' | 'anotacoes' | 'grifo' | 'flashcards' | 'questoes'
  | 'praticar' | 'favorito' | 'ideia' | 'desdobramento' | 'historico'
  | 'radar' | 'blog' | 'biblioteca' | 'aprender' | 'horus'
  | 'chat_juridico' | 'chat_web' | 'chat_anexo' | 'audioaula' | 'default';

type FeatureInfo = {
  title: string;
  tagline: string;
  description: string;
  icon: any;
};

const FEATURES: Record<PremiumFeatureKey, FeatureInfo> = {
  narracao: {
    title: 'Audioleis Completas',
    tagline: 'Ouça qualquer artigo ou lei sem limites',
    description: 'Narrações em alta definição com voz humana natural e velocidade ajustável para estudar em qualquer lugar.',
    icon: Volume2,
  },
  audioaula: {
    title: 'Audioaulas com Especialistas',
    tagline: '+2.230 aulas práticas e doutrinárias',
    description: 'Aprenda direito com os melhores professores e especialistas em formato direto de áudio.',
    icon: GraduationCap,
  },
  videoaula: {
    title: 'Videoaulas Exclusivas',
    tagline: 'Aulas em vídeo completas sem restrição',
    description: 'Explicações audiovisuais aprofundadas dos principais temas e artigos da legislação.',
    icon: PlayCircle,
  },
  blog: {
    title: 'Blog Jurídico Exclusivo',
    tagline: '+490 artigos e doutrinas completos',
    description: 'Análises de jurisprudência, resenhas doutrinárias e novidades comentadas por especialistas.',
    icon: Newspaper,
  },
  ideia: {
    title: 'Ideia Central do Artigo',
    tagline: 'Síntese inteligente com IA',
    description: 'Compreenda imediatamente a intenção e a finalidade prática do dispositivo legal em segundos.',
    icon: Sparkles,
  },
  explicacao: {
    title: 'Explicação Didática com IA',
    tagline: 'Sem juridiquês, direto ao ponto',
    description: 'Tradução do artigo em linguagem clara, humana e descomplicada para qualquer nível de estudo.',
    icon: BookOpen,
  },
  desdobramento: {
    title: 'Raio-X Esquematizado',
    tagline: 'Desdobramento de caput, incisos e parágrafos',
    description: 'Visualização esquematizada parte a parte das hipóteses, requisitos e consequências do artigo.',
    icon: Scale,
  },
  exemplo: {
    title: 'Exemplos Práticos do Cotidiano',
    tagline: 'Casos concretos do dia a dia',
    description: 'Veja como o artigo é aplicado na prática com exemplos reais de tribunais e situações comuns.',
    icon: BookOpen,
  },
  termos: {
    title: 'Termos Jurídicos Explicados',
    tagline: 'Dicionário contextual do artigo',
    description: 'Tradução precisa de cada vocábulo em latim e expressão técnica utilizada na lei.',
    icon: FileText,
  },
  jurisprudencia: {
    title: 'Jurisprudência do STF e STJ',
    tagline: 'Súmulas, temas e acórdãos em vigor',
    description: 'Decisões consolidadas e súmulas vinculantes diretamente associadas a este artigo.',
    icon: Scale,
  },
  historico: {
    title: 'Histórico Legislativo',
    tagline: 'Evolução e redações anteriores',
    description: 'Veja todas as alterações legislativas, revogações e inclusões feitas neste dispositivo.',
    icon: Layers,
  },
  grifo: {
    title: 'Grifar Artigos Sem Limite',
    tagline: 'Manual, por voz e Grifo Mágico com IA',
    description: 'Destaque trechos essenciais, pegadinhas de prova e requisitos com cores personalizadas.',
    icon: Highlighter,
  },
  anotacoes: {
    title: 'Anotações Pessoais',
    tagline: 'Caderno de notas sincronizado',
    description: 'Escreva suas observações em cada artigo e acerte revisões no celular ou computador.',
    icon: StickyNote,
  },
  favorito: {
    title: 'Favoritos Ilimitados',
    tagline: 'Sua pasta pessoal de leis e artigos',
    description: 'Salve quantos artigos e códigos quiser para consulta instantânea em um toque.',
    icon: Heart,
  },
  praticar: {
    title: 'Modo Praticar & Memorização',
    tagline: 'Flashcards, questões e quizzes com IA',
    description: 'Treine com questões baseadas em provas da OAB e concursos públicos de todo o país.',
    icon: Layers,
  },
  flashcards: {
    title: 'Flashcards Ilimitados',
    tagline: 'Repetição espaçada inteligente',
    description: 'Cartões de memorização gerados a partir do artigo para fixar prazos e exceções.',
    icon: Layers,
  },
  questoes: {
    title: 'Questões OAB e Concursos',
    tagline: 'Bateria de testes comentados',
    description: 'Resolva exercícios formulados especificamente sobre a lei que você está estudando.',
    icon: HelpCircle,
  },
  chat_juridico: {
    title: 'Chat Jurídico com IA',
    tagline: 'Assistente 24h fundamentada nas leis',
    description: 'Tire dúvidas pontuais com respostas embasadas na Constituição e nos principais códigos do Brasil.',
    icon: MessageCircle,
  },
  chat_web: {
    title: 'Pesquisa Jurídica na Web',
    tagline: 'Busca em tempo real na internet',
    description: 'Consulte informações e julgados atualizados de hoje diretamente na conversa.',
    icon: Sparkles,
  },
  chat_anexo: {
    title: 'Análise de Documentos e Áudio',
    tagline: 'Envie PDFs, petições e imagens',
    description: 'Faça upload de contratos, pareceres e áudios para resumo e análise jurídica automática.',
    icon: FileText,
  },
  biblioteca: {
    title: 'Biblioteca Digital Completa',
    tagline: 'Leitura irrestrita de livros e manuais',
    description: 'Acesse todo o acervo doutrinário e livros de grandes referências do direito sem restrição mensal.',
    icon: Library,
  },
  radar: {
    title: 'Radar Legislativo',
    tagline: 'Acompanhe projetos de lei em tempo real',
    description: 'Notificações antecipadas sobre votações e mudanças no Congresso Nacional.',
    icon: Radar,
  },
  aprender: {
    title: 'Trilhas Aprender',
    tagline: 'Jornadas guiadas de estudo',
    description: 'Siga cronogramas prontos para OAB, carreiras jurídicas e faculdade.',
    icon: GraduationCap,
  },
  horus: {
    title: 'Horus no WhatsApp',
    tagline: 'Sua assistente no celular 24 horas',
    description: 'Tire dúvidas jurídicas diretamente no seu WhatsApp particular a qualquer hora.',
    icon: Bot,
  },
  grafo: {
    title: 'Grafo de Conexões Jurídicas',
    tagline: 'Mapeamento visual de normas',
    description: 'Entenda como o artigo se conecta com súmulas, decretos e outras leis.',
    icon: Network,
  },
  mapa_mental: {
    title: 'Mapas Mentais com IA',
    tagline: 'Esquemas visuais de memorização',
    description: 'Transforme artigos complexos em mapas mentais intuitivos e prontos para revisar.',
    icon: Map,
  },
  lembretes: {
    title: 'Lembretes de Estudo',
    tagline: 'Alertas por horário e local',
    description: 'Receba notificações no momento certo para revisar o que você estudou.',
    icon: Bell,
  },
  baixar: {
    title: 'Baixar em PDF e Imagem',
    tagline: 'Estudo impresso e offline',
    description: 'Exporte artigos comentados, grifados e esquematizados em alta resolução.',
    icon: Download,
  },
  perguntar: {
    title: 'Perguntas ao Artigo',
    tagline: 'Tire dúvidas específicas do texto',
    description: 'Converse diretamente com o artigo e resolva questionamentos de hermenêutica.',
    icon: MessageCircle,
  },
  default: {
    title: 'Recurso Exclusivo',
    tagline: 'Disponível no Plano Completo',
    description: 'Desbloqueie todo o ecossistema do Vacatio para acelerar seus estudos com ferramentas ilimitadas.',
    icon: Crown,
  },
};

interface PremiumGateProps {
  open: boolean;
  onClose: () => void;
  feature?: PremiumFeatureKey;
  title?: string;
  description?: string;
  usageLabel?: string;
  onListenExample?: () => void;
  onLibraryExample?: () => void;
}

const ACERVO_ITEMS = [
  {
    icon: GraduationCap,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    title: 'Audioaulas (+2.230 aulas gravadas)',
    desc: '2.234 aulas didáticas completas em áudio organizadas por disciplinas jurídicas com especialistas.',
  },
  {
    icon: Volume2,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    title: 'Audioleis Completas',
    desc: 'Narrações em áudio de alta fidelidade com voz humana dos principais códigos e leis brasileiras.',
  },
  {
    icon: Newspaper,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    title: 'Blog Jurídico (+490 artigos & doutrinas)',
    desc: '499 publicações com doutrina comentada, jurisprudência recente e análises de impacto prático.',
  },
  {
    icon: Library,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    title: 'Biblioteca Digital (+430 obras & manuais)',
    desc: '402 manuais de exame da OAB e 35 clássicos do Direito para leitura irrestrita no app.',
  },
  {
    icon: Sparkles,
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    title: 'Vade Mecum (+138 leis & 40.000 artigos com IA)',
    desc: '7 recursos em cada artigo: Ideia Central, Explicação Didática, Raio-X, Prática, Termos e Jurisprudência.',
  },
  {
    icon: Bot,
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    title: 'Horus no WhatsApp (24 Horas)',
    desc: 'Assistente jurídica de IA diretamente no seu WhatsApp pessoal para responder dúvidas a qualquer hora.',
  },
  {
    icon: Layers,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    title: 'Praticar, Flashcards & Questões',
    desc: 'Flashcards inteligentes com repetição espaçada e banco com centenas de questões comentadas.',
  },
  {
    icon: Highlighter,
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    title: 'Grifos por Voz & Anotações Ilimitadas',
    desc: 'Grifo manual em cores, Grifo Mágico com IA e anotações pessoais sincronizadas na nuvem.',
  },
];

export default function PremiumGate({
  open,
  onClose,
  feature = 'default',
  title,
  description,
  usageLabel,
  onListenExample,
  onLibraryExample,
}: PremiumGateProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trialUsed, isTrialActive, activateTrial } = useSubscription();

  const [step, setStep] = useState<'paywall' | 'detail' | 'success'>('paywall');
  const [activating, setActivating] = useState(false);
  const [capaIdx, setCapaIdx] = useState(0);

  // Informações da ferramenta que disparou o paywall
  const info = FEATURES[feature] ?? FEATURES.default;
  const Icon = info.icon;
  const displayTitle = title ?? info.title;
  const displayDesc = description ?? info.description;

  // Reseta para o primeiro passo sempre que abrir
  useEffect(() => {
    if (open) {
      setStep('paywall');
      setActivating(false);
      // Alterna capa de fundo aleatoriamente para dinamismo premium
      setCapaIdx(Math.floor(Math.random() * CAPAS_FUNDO.length));
    }
  }, [open]);

  // Handler de ativação dos 3 dias grátis
  const handleStartTrial = async () => {
    if (activating) return;

    // Se não estiver logado, direciona para entrar/cadastrar e salvar o trial
    if (!user) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('vacatio:start_trial_after_login', 'true');
      }
      onClose();
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }

    setActivating(true);
    haptic.selection();

    try {
      await activateTrial();
      setStep('success');
      haptic.notification('success');

      // Fecha o paywall após a animação cinematográfica
      setTimeout(() => {
        onClose();
        setStep('paywall');
        setActivating(false);
      }, 2200);
    } catch (e) {
      console.warn('[PremiumGate] Erro ao ativar trial:', e);
      setActivating(false);
    }
  };

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-[10050] bg-black text-white overflow-hidden flex flex-col font-sans select-none">
      {/* ─── FUNDO CINEMATOGRÁFICO DE DIREITO COM VINHETA LUXUOSA ─── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.img
          key={`capa-gate-${capaIdx}`}
          initial={{ scale: 1.05, opacity: 0 }}
          animate={{ scale: 1.12, opacity: 0.72 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          src={CAPAS_FUNDO[capaIdx]}
          alt="Direito"
          className="w-full h-full object-cover object-center filter saturate-105 brightness-100"
        />
        {/* Gradientes translúcidos elegantes mantendo o fundo bem nítido e visível */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/35" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.75)_100%)]" />
      </div>

      {/* ─── TOPO SEGURO COM BOTÃO FECHAR (X) ─── */}
      <div className="relative z-20 shrink-0 pt-[max(0.75rem,var(--sai-top,0px))] px-4 pb-2 flex items-center justify-between">
        {step === 'detail' ? (
          <button
            onClick={() => setStep('paywall')}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center justify-center backdrop-blur-md border border-white/10 text-white/90"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-bold tracking-widest uppercase">
              <Crown className="w-3.5 h-3.5" />
              Recurso Exclusivo
            </span>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center justify-center backdrop-blur-md border border-white/10 text-white/90 shadow-lg"
          aria-label="Fechar"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* ─── CORPO CENTRAL DINÂMICO CONFORME O PASSO ─── */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,var(--sai-bottom,0px))] flex flex-col justify-between max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          {/* ══════════════════════════════════════════════════════════════
              PASSO 1: BANNER PAYWALL DE TELA INTEIRA (MINIMALISTA)
             ══════════════════════════════════════════════════════════════ */}
          {step === 'paywall' && (
            <motion.div
              key="step-paywall"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.28 }}
              className="flex-1 flex flex-col justify-between py-2"
            >
              {/* Bloco Superior: Ícone e Apresentação da Função */}
              <div className="flex flex-col items-center text-center mt-3 sm:mt-6">
                {/* Ícone com anel dourado e brilho */}
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-amber-400/30 to-amber-300/10 border border-amber-400/40 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.25)] backdrop-blur-md">
                    <Icon className="w-10 h-10 text-amber-300" strokeWidth={1.8} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-md">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                </div>

                <span className="text-xs uppercase tracking-[0.25em] text-amber-400/90 font-bold mb-1">
                  Exclusivo para assinantes
                </span>

                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight max-w-sm">
                  {displayTitle}
                </h1>

                <p className="text-amber-200/80 text-xs sm:text-sm font-medium mt-1 mb-3">
                  {info.tagline}
                </p>

                <p className="text-neutral-300/80 text-xs sm:text-sm leading-relaxed max-w-xs sm:max-w-sm mb-4">
                  {displayDesc}
                </p>

                {usageLabel && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-neutral-300 text-xs mb-3">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    {usageLabel}
                  </div>
                )}
              </div>

              {/* Bloco Inferior: Botões Principais ("Testar 3 dias gratuitos" e "Ver planos") */}
              <div className="space-y-3 pt-4 shrink-0">
                {/* Botão de Amostra para Narração se disponível */}
                {feature === 'narracao' && onListenExample && (
                  <button
                    onClick={onListenExample}
                    className="w-full py-3 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98]"
                  >
                    <Volume2 className="w-4 h-4 text-amber-300" />
                    Ouvir demonstração gratuita
                  </button>
                )}

                {/* Botão de Amostra para Biblioteca se disponível */}
                {feature === 'biblioteca' && onLibraryExample && (
                  <button
                    onClick={onLibraryExample}
                    className="w-full py-3 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98]"
                  >
                    <BookOpen className="w-4 h-4 text-amber-300" />
                    Ler demonstração (5 páginas)
                  </button>
                )}

                {/* BOTÃO 1: TESTAR 3 DIAS GRATUITOS (OU JÁ UTILIZADO) */}
                {trialUsed && !isTrialActive ? (
                  <div className="w-full py-3.5 px-4 rounded-2xl bg-white/5 border border-white/10 text-neutral-400 text-xs font-medium flex items-center justify-center gap-2 select-none">
                    <CheckCircle2 className="w-4 h-4 text-neutral-500" />
                    <span>Teste gratuito de 3 dias já utilizado</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setStep('detail')}
                    className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-extrabold text-sm sm:text-base tracking-wide shadow-[0_0_30px_rgba(251,191,36,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 group relative overflow-hidden"
                  >
                    <Flame className="w-5 h-5 text-black shrink-0 animate-bounce" />
                    <span>Testar 3 dias gratuitos</span>
                    <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* BOTÃO 2: VER PLANOS */}
                <button
                  onClick={() => {
                    onClose();
                    navigate('/assinatura');
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs sm:text-sm tracking-wide active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span>Ver planos e assinaturas</span>
                </button>

                <p className="text-center text-[10.5px] text-neutral-400/70 pt-1">
                  Cancele a qualquer momento nas configurações da loja.
                </p>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PASSO 2: TELA DETALHADA DO QUE SERÁ DESBLOQUEADO NO TRIAL
             ══════════════════════════════════════════════════════════════ */}
          {step === 'detail' && (
            <motion.div
              key="step-detail"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between py-1"
            >
              <div className="flex flex-col">
                <div className="text-center pt-1 pb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold tracking-widest uppercase">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    3 Dias Grátis · Sem Cobrança Hoje
                  </span>
                  <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white mt-2 leading-tight">
                    Tudo que você desbloqueia agora
                  </h2>
                  <p className="text-neutral-300/80 text-xs mt-1">
                    Acesso irrestrito a todo o acervo jurídico e ferramentas de IA por 72 horas:
                  </p>
                </div>

                {/* Lista de Recursos Desbloqueados com contagens reais */}
                <div className="space-y-2.5 my-2 max-h-[50dvh] overflow-y-auto pr-1">
                  {ACERVO_ITEMS.map((item, idx) => {
                    const ItemIcon = item.icon;
                    return (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-white leading-tight">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-neutral-300/70 leading-snug mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Botão de Ativação do Trial */}
              <div className="pt-3 shrink-0">
                <button
                  onClick={handleStartTrial}
                  disabled={activating}
                  className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-extrabold text-base tracking-wide shadow-[0_0_35px_rgba(251,191,36,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 select-none"
                >
                  <Unlock className="w-5 h-5 text-black" />
                  <span>{activating ? 'Ativando seu acesso...' : 'Ativar 3 dias grátis agora'}</span>
                </button>
                <p className="text-center text-[10.5px] text-neutral-400/80 mt-2">
                  Você não paga nada hoje. O teste expira automaticamente em 72h.
                </p>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PASSO 3: ANIMAÇÃO CINEMATOGRÁFICA DE DESBLOQUEIO
             ══════════════════════════════════════════════════════════════ */}
          {step === 'success' && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center text-center py-8"
            >
              {/* Cadeado abrindo com anéis e partículas de luz */}
              <div className="relative mb-6">
                <motion.div
                  initial={{ scale: 0.5, rotate: -20 }}
                  animate={{ scale: [0.5, 1.15, 1], rotate: [0, 10, 0] }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-black flex items-center justify-center shadow-[0_0_60px_rgba(251,191,36,0.6)]"
                >
                  <Unlock className="w-12 h-12 stroke-[2.2]" />
                </motion.div>

                {/* Pulso de luz expansivo */}
                <div className="absolute inset-0 rounded-full bg-amber-400/40 animate-ping pointer-events-none" style={{ animationDuration: '1.4s' }} />

                {/* Partículas douradas decorativas */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <motion.div
                    key={deg}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    animate={{
                      opacity: 0,
                      x: Math.cos((deg * Math.PI) / 180) * 80,
                      y: Math.sin((deg * Math.PI) / 180) * 80,
                      scale: 0.3,
                    }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="absolute top-1/2 left-1/2 w-2.5 h-2.5 -ml-1.5 -mt-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#fde047]"
                  />
                ))}
              </div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
              >
                Acesso Total Liberado!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-amber-300 text-sm font-semibold mt-2"
              >
                Aproveite suas 72 horas gratuitas
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-neutral-300/80 text-xs mt-1 max-w-xs"
              >
                Todas as audioaulas, áudios de lei, recursos com IA e ferramentas estão prontos para você.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

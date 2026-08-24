import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown, X, Volume2, Sparkles, BookOpen, MessageCircle, Scale, PlayCircle,
  Network, Bell, Download, StickyNote, Highlighter, FileText, Layers,
  HelpCircle, Map, Radar, Newspaper, Library, GraduationCap, Bot, ChevronLeft,
  type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { BENEFICIOS_PREMIUM } from '@/lib/premiumBeneficios';


export type PremiumFeatureKey =
  | 'narracao' | 'explicacao' | 'exemplo' | 'termos' | 'perguntar'
  | 'jurisprudencia' | 'videoaula' | 'grafo' | 'mapa_mental' | 'lembretes'
  | 'baixar' | 'anotacoes' | 'grifo' | 'flashcards' | 'questoes'
  | 'praticar' | 'favorito'
  | 'radar' | 'blog' | 'biblioteca' | 'aprender' | 'horus'
  | 'chat_juridico' | 'chat_web' | 'chat_anexo' | 'default';


type FeatureInfo = { title: string; description: string; icon: LucideIcon };

const FEATURES: Record<PremiumFeatureKey, FeatureInfo> = {
  narracao:      { title: 'Ouvir sem interrupções', description: 'Escute qualquer artigo com narração ilimitada. Assine para desbloquear.', icon: Volume2 },
  explicacao:    { title: 'Explicações ilimitadas', description: 'Peça à IA para explicar qualquer artigo, sem limite diário. Assine para desbloquear.', icon: Sparkles },
  exemplo:       { title: 'Exemplos práticos ilimitados', description: 'Gere exemplos do dia a dia para cada artigo sem restrição. Assine para desbloquear.', icon: BookOpen },
  termos:        { title: 'Termos jurídicos explicados', description: 'Traduza o vocabulário técnico do artigo em linguagem simples. Assine para desbloquear.', icon: BookOpen },
  perguntar:     { title: 'Pergunte à IA sobre o artigo', description: 'Tire dúvidas específicas do artigo com a assistente jurídica. Assine para desbloquear.', icon: MessageCircle },
  jurisprudencia:{ title: 'Jurisprudência do STF e STJ', description: 'Consulte súmulas, temas e acórdãos ligados ao artigo. Assine para desbloquear.', icon: Scale },
  videoaula:     { title: 'Videoaulas sem limite', description: 'Assista aulas em vídeo sobre cada artigo sem restrição diária. Assine para desbloquear.', icon: PlayCircle },
  grafo:         { title: 'Grafo de conexões', description: 'Veja como o artigo se conecta a outros dispositivos e temas. Assine para desbloquear.', icon: Network },
  mapa_mental:   { title: 'Mapas mentais ilimitados', description: 'Gere mapas mentais do artigo para estudo rápido. Assine para desbloquear.', icon: Map },
  lembretes:     { title: 'Lembretes por local e horário', description: 'Programe alertas de estudo por hora ou geolocalização. Assine para desbloquear.', icon: Bell },
  baixar:        { title: 'Baixar artigos em PDF', description: 'Salve artigos em PDF, imagem, lei seca ou comentada. Assine para desbloquear.', icon: Download },
  anotacoes:     { title: 'Anotações pessoais', description: 'Faça anotações em cada artigo e sincronize entre dispositivos. Assine para desbloquear.', icon: StickyNote },
  grifo:         { title: 'Grifos ilimitados', description: 'Grife trechos manualmente, por voz, foto ou com a IA. Assine para desbloquear.', icon: Highlighter },
  flashcards:    { title: 'Flashcards ilimitados', description: 'Estude com flashcards gerados automaticamente pela IA. Assine para desbloquear.', icon: Layers },
  questoes:      { title: 'Questões OAB/concurso', description: 'Pratique com questões geradas a partir de qualquer conteúdo. Assine para desbloquear.', icon: HelpCircle },
  praticar:      { title: 'Praticar sem limite', description: 'Questões e flashcards gerados a partir de qualquer artigo. Assine para desbloquear.', icon: Layers },
  favorito:      { title: 'Favoritos ilimitados', description: 'Salve quantos artigos quiser nos seus favoritos. Assine para desbloquear.', icon: Highlighter },
  radar:         { title: 'Radar Legislativo', description: 'Acompanhe projetos de lei em tempo real com análise da IA. Assine para desbloquear.', icon: Radar },
  blog:          { title: 'Blogger Jurídico completo', description: 'Leia todos os artigos exclusivos do blog sem limites. Assine para desbloquear.', icon: Newspaper },
  biblioteca:    { title: 'Biblioteca completa', description: 'No plano gratuito você lê 1 livro por mês. Assine para ler todo o acervo — leitura nativa, PDF, folheada, offline e desktop.', icon: Library },
  aprender:      { title: 'Trilha Aprender ilimitada', description: 'Estude com trilhas guiadas e conteúdo sem limite diário. Assine para desbloquear.', icon: GraduationCap },
  horus:         { title: 'Horus 24h no WhatsApp', description: 'Sua assistente jurídica pessoal disponível 24h no WhatsApp. Assine para desbloquear.', icon: Bot },
  chat_juridico: { title: 'Chat Jurídico ilimitado', description: 'No plano gratuito você tem 1 interação por dia no Chat Jurídico. Assine para conversar sem limites.', icon: MessageCircle },
  chat_web:      { title: 'Pesquisar na internet', description: 'A busca em tempo real na internet dentro do Chat Jurídico é exclusiva para assinantes.', icon: Sparkles },
  chat_anexo:    { title: 'Enviar áudio, PDF e fotos', description: 'Analisar documentos, imagens e áudios no Chat Jurídico é exclusivo para assinantes.', icon: FileText },

  default:       { title: 'Funcionalidade Premium', description: 'Assine para desbloquear esta função e aproveitar todos os recursos sem limites.', icon: Crown },
};

interface PremiumGateProps {
  open: boolean;
  onClose: () => void;
  /** Chave da funcionalidade — mostra ícone, título e descrição personalizados. */
  feature?: PremiumFeatureKey;
  /** Override manual (opcional). */
  title?: string;
  description?: string;
  /** Texto extra tipo "Você já usou 1 de 1 narração hoje" */
  usageLabel?: string;
}

const PremiumGate = ({
  open,
  onClose,
  feature = 'default',
  title,
  description,
  usageLabel,
}: PremiumGateProps) => {
  const navigate = useNavigate();
  const info = FEATURES[feature] ?? FEATURES.default;
  const Icon = info.icon;
  const shownTitle = title ?? info.title;
  const shownDesc = description ?? info.description;
  const [showBenefits, setShowBenefits] = useState(false);
  useEffect(() => { if (!open) setShowBenefits(false); }, [open]);



  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10050]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[10051] flex items-end justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none"
          >
            <div className="relative w-full max-w-[340px] bg-card border border-border rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 pointer-events-auto">
              {/* Header banner */}
              <div className="bg-primary py-3 px-6 flex items-center justify-center relative">
                <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-primary-foreground">
                  Funcionalidade Premium
                </span>
                <button
                  onClick={onClose}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-primary-foreground/10 transition-colors"
                >
                  <X className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>

              <div className="p-8 flex flex-col items-center text-center">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(255,213,0,0.2)]">
                  <Icon className="w-8 h-8 text-primary-foreground" />
                </div>

                {/* Explanatory title */}
                <h3 className="font-display text-xl text-foreground mb-2 tracking-wide">
                  {shownTitle}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {shownDesc}
                </p>

                {usageLabel && (
                  <div className="text-[11px] text-primary bg-primary/10 border border-primary/30 rounded-lg py-1.5 px-3 mb-5">
                    {usageLabel}
                  </div>
                )}

                {/* Price highlight - before CTA (plano anual) */}
                <div className="flex flex-col items-center mb-6">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                    Plano anual — a partir de
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-muted-foreground text-sm font-medium">R$</span>
                    <span className="text-foreground text-3xl font-bold tracking-tight">15,83</span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/80 mt-1">
                    12x sem juros · R$ 189,90/ano
                  </span>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => { onClose(); navigate('/assinatura?plano=anual&trial=1'); }}
                  className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary-light transition-all active:scale-[0.98] shadow-lg shadow-primary/20 mb-3"
                >
                  Começar 7 dias grátis
                </button>

                {/* Ver mais benefícios */}
                <button
                  onClick={() => setShowBenefits(true)}
                  className="w-full py-3 rounded-xl border border-border bg-secondary/50 text-foreground font-semibold text-sm hover:bg-secondary transition-colors active:scale-[0.98] mb-3"
                >
                  Ver mais benefícios
                </button>

                {/* Secondary Action */}
                <button
                  onClick={() => { onClose(); navigate('/assinatura'); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors border-b border-transparent hover:border-border pb-0.5"
                >
                  Ver outros planos
                </button>
              </div>
            </div>
          </motion.div>

          {/* Camada de benefícios */}
          <AnimatePresence>
            {showBenefits && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="fixed inset-x-0 bottom-0 z-[10052] max-h-[88dvh] bg-card border-t border-border rounded-t-3xl overflow-hidden flex flex-col"
              >
                <div className="bg-primary py-3 px-4 flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowBenefits(false)}
                    aria-label="Voltar"
                    className="p-1.5 rounded-full hover:bg-primary-foreground/10 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-primary-foreground" />
                  </button>
                  <span className="flex-1 text-center text-[10px] font-extrabold tracking-[0.2em] uppercase text-primary-foreground">
                    Tudo que você desbloqueia
                  </span>
                  <button
                    onClick={() => { setShowBenefits(false); onClose(); }}
                    aria-label="Fechar"
                    className="p-1.5 rounded-full hover:bg-primary-foreground/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-primary-foreground" />
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-3 max-w-md mx-auto w-full">
                  {BENEFICIOS_PREMIUM.map((b) => {
                    const BIcon = b.icon;
                    return (
                      <div key={b.title} className="flex gap-3 items-start">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <BIcon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight">{b.title}</p>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">{b.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="shrink-0 border-t border-border px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-card max-w-md mx-auto w-full">
                  <button
                    onClick={() => { setShowBenefits(false); onClose(); navigate('/assinatura?plano=anual&trial=1'); }}
                    className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary-light transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                  >
                    Começar 7 dias grátis
                  </button>
                  <button
                    onClick={() => { setShowBenefits(false); onClose(); navigate('/assinatura'); }}
                    className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Ver outros planos
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );


  return createPortal(content, document.body);
};

export default PremiumGate;

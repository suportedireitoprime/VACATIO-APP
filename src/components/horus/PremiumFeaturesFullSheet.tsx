import { useEffect, useRef } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { motion } from 'framer-motion';
import { X, Check, MessageCircle, Bell, BookOpen, Radar, Mic, FileText, Scale, Sparkles, Bot } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    id: 'biblioteca',
    icon: BookOpen,
    color: '#38bdf8',
    title: 'Biblioteca completa',
    items: [
      'Acesso ilimitado a todas as obras jurídicas e literárias',
      'Leitor nativo com temas, animação 3D e busca dentro do livro',
      'Continuar de onde parou em qualquer dispositivo',
      'PDF, versão online e leitura por voz sem limite',
    ],
  },
  {
    id: 'radar',
    icon: Radar,
    color: '#f472b6',
    title: 'Radar Jurídico & Notícias',
    items: [
      'Boletins diários (09h) e notícias (21h)',
      'Alertas de novas leis, súmulas e julgados',
      'Histórico completo dos radares anteriores',
    ],
  },
  {
    id: 'aulas',
    icon: Mic,
    color: '#34d399',
    title: 'Gravar Aula & Áudios',
    items: [
      'Gravação em segundo plano com notificação persistente',
      'Transcrição automática e resumo inteligente',
      'Importar áudio do celular e do WhatsApp',
      'Tags jurídicas para organizar suas gravações',
    ],
  },
  {
    id: 'ferramentas',
    icon: FileText,
    color: '#a78bfa',
    title: 'Ferramentas jurídicas',
    items: [
      'Geradores de peças, resumos e fichamentos',
      'Análise de PDF, imagem e documentos longos',
      'Busca unificada em leis, livros e conteúdo',
    ],
  },
  {
    id: 'leis',
    icon: Scale,
    color: '#fbbf24',
    title: 'Leis & Vade-mécum',
    items: [
      'Todas as leis atualizadas com busca por lei',
      'Favoritos, anotações e destaque nos artigos',
      'Comparação de versões e histórico legislativo',
    ],
  },
  {
    id: 'horus',
    icon: Bot,
    color: '#f59e0b',
    title: 'Horus no WhatsApp',
    highlight: true,
    items: [
      'Envie texto, áudio, PDF e imagem direto pro Horus',
      'Ele lê, transcreve, resume e explica pra você',
      'Tire dúvidas jurídicas 24h por dia no seu WhatsApp',
      'Receba avisos, lembretes de estudo e novidades',
      'Assistente pessoal treinado no seu ritmo de leitura',
    ],
  },
  {
    id: 'extras',
    icon: Sparkles,
    color: '#22d3ee',
    title: 'Extras Premium',
    items: [
      'Sem anúncios em qualquer parte do app',
      'Suporte prioritário',
      'Novidades e recursos em primeira mão',
    ],
  },
];

export default function PremiumFeaturesFullSheet({ open, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const horusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // reset to top when opening
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    });
    // after a beat, animate down to horus
    const t = setTimeout(() => {
      if (horusRef.current && scrollRef.current) {
        const container = scrollRef.current;
        const target = horusRef.current.offsetTop - 24;
        container.scrollTo({ top: target, behavior: 'smooth' });
      }
    }, 1400);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="bottom"
        className="p-0 border-none bg-transparent shadow-none max-h-[90dvh] h-[90dvh]"
      >
        <div className="mx-auto max-w-lg h-full rounded-t-3xl overflow-hidden bg-background/95 backdrop-blur-xl border border-white/10 flex flex-col">
          <div className="relative px-6 pt-4 pb-3 border-b border-white/5 shrink-0">
            <div className="mx-auto w-10 h-1 rounded-full bg-foreground/20 mb-3" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 text-foreground/70" />
            </button>
            <h2 className="font-display text-xl font-black text-foreground text-center">
              Tudo o que o Premium libera
            </h2>
            <p className="font-body text-xs text-muted-foreground text-center mt-1">
              7 dias grátis pra explorar sem compromisso
            </p>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4"
            style={{ scrollBehavior: 'smooth' }}
          >
            {SECTIONS.map((section, idx) => {
              const Icon = section.icon;
              const isHorus = section.id === 'horus';
              return (
                <motion.div
                  key={section.id}
                  ref={isHorus ? horusRef : undefined}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.35 }}
                  className="relative rounded-2xl border p-4"
                  style={{
                    background: isHorus
                      ? `linear-gradient(135deg, ${section.color}22 0%, ${section.color}08 100%)`
                      : 'hsl(var(--secondary) / 0.4)',
                    borderColor: isHorus ? `${section.color}55` : 'hsl(var(--border) / 0.6)',
                  }}
                >
                  {isHorus && (
                    <motion.div
                      aria-hidden
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ boxShadow: `0 0 0 0 ${section.color}` }}
                      animate={{
                        boxShadow: [
                          `0 0 0 0 ${section.color}66`,
                          `0 0 0 12px ${section.color}00`,
                          `0 0 0 0 ${section.color}00`,
                        ],
                      }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 1.8 }}
                    />
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${section.color}22`, border: `1px solid ${section.color}44` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: section.color }} />
                    </div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      {section.title}
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {section.items.map((it) => (
                      <li key={it} className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: section.color }} strokeWidth={3} />
                        <span className="font-body text-sm text-foreground/90 leading-snug">{it}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
            <div className="h-4" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

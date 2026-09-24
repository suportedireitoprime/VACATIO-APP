import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Headphones,
  FileText,
  Library,
  ClipboardCheck,
  Scale,
  Brain,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

const AUTOPLAY_MS = 2800;

type Funcao = {
  id: string;
  titulo: string;
  legenda: string;
  Icone: LucideIcon;
  topicos: string[];
};

const FUNCOES: Funcao[] = [
  {
    id: 'vademecum',
    titulo: 'Vade Mecum',
    legenda: 'legislação sempre à mão',
    Icone: BookOpen,
    topicos: ['Códigos e leis atualizados', 'Busca por artigo e tema', 'Favoritos e anotações', 'Leitura offline'],
  },
  {
    id: 'biblioteca',
    titulo: 'Biblioteca',
    legenda: 'seu acervo jurídico',
    Icone: Library,
    topicos: ['Obras e doutrinas', 'Peças e modelos', 'Continuar leitura', 'Recomendações por matéria'],
  },
  {
    id: 'audio',
    titulo: 'Áudio',
    legenda: 'estude ouvindo',
    Icone: Headphones,
    topicos: ['Audioaulas', 'Leis cantadas', 'Narração de resumos', 'Player em segundo plano'],
  },
  {
    id: 'resumos',
    titulo: 'Resumos e mapas',
    legenda: 'conteúdo destilado',
    Icone: FileText,
    topicos: ['Resumos jurídicos', 'Mapas mentais', 'Método Cornell', 'Método Feynman', 'Infográficos'],
  },
  {
    id: 'treino',
    titulo: 'Treino',
    legenda: 'memória e desempenho',
    Icone: ClipboardCheck,
    topicos: ['Flashcards', 'Simulados', 'Questões comentadas', 'Cronograma de estudos'],
  },
  {
    id: 'jurisprudencia',
    titulo: 'Jurisprudência',
    legenda: 'o que os tribunais decidem',
    Icone: Scale,
    topicos: ['Julgados comentados', 'Súmulas e informativos', 'Dicionário jurídico', 'Blog diário'],
  },
  {
    id: 'ia',
    titulo: 'IA jurídica',
    legenda: 'entenda em segundos',
    Icone: Sparkles,
    topicos: ['Me Explique com IA', 'Câmera e leitura de texto', 'Explicação passo a passo', 'Salvar transcrições'],
  },
];

export default function FuncoesCarousel() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const userInteractingRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback((idx: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const child = scroller.children[idx] as HTMLElement | undefined;
    if (!child) return;
    const target = child.offsetLeft - (scroller.clientWidth - child.clientWidth) / 2;
    scroller.scrollTo({ left: target, behavior });
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (userInteractingRef.current || document.hidden) return;
      const next = (activeIndex + 1) % FUNCOES.length;
      setActiveIndex(next);
      scrollToIndex(next);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [activeIndex, scrollToIndex]);

  const onScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < scroller.children.length; i++) {
      const child = scroller.children[i] as HTMLElement;
      const mid = child.offsetLeft + child.clientWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    setActiveIndex(best);
  }, []);

  const pauseAutoplay = () => {
    userInteractingRef.current = true;
    window.setTimeout(() => { userInteractingRef.current = false; }, 5000);
  };

  return (
    <div
      className="lp-pop mt-3 sm:mt-4 -mx-5 sm:-mx-8 w-[calc(100%+2.5rem)] sm:w-[calc(100%+4rem)] space-y-2"
      style={{ animationDelay: '1.4s' }}
    >
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onPointerDown={pauseAutoplay}
        onTouchStart={pauseAutoplay}
        className="flex gap-2.5 sm:gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 px-4 sm:px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"


      >
        {FUNCOES.map((f, i) => {
          const isActive = i === activeIndex;
          const { Icone } = f;
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.25) }}
              className="snap-center shrink-0 w-[46%] sm:w-[30%] md:w-[22%] lg:w-[17%] text-left"
            >
              <motion.div
                animate={isActive ? { scale: [0.985, 1.025, 1] } : { scale: 0.955 }}
                transition={{ duration: isActive ? 0.65 : 0.3, ease: 'easeOut' }}
                className={`relative flex h-full min-h-[9rem] sm:min-h-[10.5rem] flex-col overflow-hidden rounded-[1.15rem] p-3 sm:px-3.5 sm:py-3.5 backdrop-blur-md transition-opacity duration-300 ${
                  isActive ? 'opacity-100' : 'opacity-65'
                }`}
                style={{
                  background: isActive
                    ? 'linear-gradient(155deg, hsl(352 34% 15% / 0.92), hsl(0 0% 5% / 0.9))'
                    : 'linear-gradient(155deg, hsl(0 0% 6% / 0.8), hsl(352 25% 10% / 0.7))',
                  border: `1px solid ${isActive ? 'hsl(352 60% 52% / 0.55)' : 'hsl(352 40% 50% / 0.22)'}`,
                  boxShadow: isActive
                    ? '0 14px 34px rgba(0,0,0,0.55), inset 0 1px 0 hsl(40 30% 98% / 0.1)'
                    : '0 6px 16px rgba(0,0,0,0.35)',
                }}
              >
                <Icone
                  aria-hidden="true"
                  strokeWidth={1}
                  className="pointer-events-none absolute -right-5 bottom-[-10%] h-[70%] w-auto"
                  style={{ color: 'hsl(352 62% 50%)', opacity: isActive ? 0.24 : 0.16 }}
                />

                {isActive && (
                  <motion.span
                    aria-hidden="true"
                    key={`sheen-${activeIndex}`}
                    initial={{ x: '-130%' }}
                    animate={{ x: '130%' }}
                    transition={{ duration: 1.1, ease: 'easeInOut' }}
                    className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, hsl(40 40% 98% / 0.16), transparent)',
                    }}
                  />
                )}

                <div className="relative flex items-center gap-2 mb-2.5">
                  <Icone className="w-[17px] h-[17px] shrink-0" strokeWidth={2.2} style={{ color: 'hsl(352 62% 52%)' }} />
                  <p
                    className="font-display text-[11.5px] font-bold uppercase tracking-[0.1em] truncate"
                    style={{ color: 'hsl(40 25% 97%)' }}
                  >
                    {f.titulo}
                  </p>
                </div>

                <ul className="relative space-y-[5px]">
                  {f.topicos.slice(0, 4).map((t) => (
                    <li
                      key={t}
                      className="flex items-start gap-1.5 text-[11px] font-medium leading-snug"
                      style={{ color: 'hsl(40 16% 92%)' }}
                    >
                      <span
                        aria-hidden="true"
                        className="mt-[6px] shrink-0 h-[3px] w-[3px] rounded-full"
                        style={{ background: 'hsl(352 62% 52%)', boxShadow: '0 0 6px hsl(352 62% 52% / 0.8)' }}
                      />
                      <span className="truncate">{t}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {FUNCOES.map((_, i) => (
          <button
            key={i}
            aria-label={`Ir para função ${i + 1}`}
            onClick={() => { pauseAutoplay(); setActiveIndex(i); scrollToIndex(i); }}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIndex ? 'w-5' : 'w-1.5'
            }`}
            style={{ background: i === activeIndex ? 'hsl(352 58% 44%)' : 'hsl(40 15% 90% / 0.3)' }}
          />
        ))}
      </div>
    </div>
  );
}

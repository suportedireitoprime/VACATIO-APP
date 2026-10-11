import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Library, Clock, ArrowUpRight, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { findColecao, normalizeLivro, type LivroNormalizado } from '@/lib/bibliotecaColecoes';
import { cdnImg, directImg, prefetchImages } from '@/lib/cdnImg';
import { getPersistedColecao, setPersistedColecao } from '@/services/offlineDb';
import { withBundleFallback, bundle } from '@/services/offlineBundle';
import { haptic } from '@/lib/nativeHaptics';
import LivroDetailSheet from '@/components/biblioteca/LivroDetailSheet';
import CarouselDots from '@/components/vademecum/home/carousel/CarouselDots';

import coverCpArtigos from '@/assets/covers/cp_artigos_v2.webp';
import coverSobreALiberdade from '@/assets/covers/sobre_a_liberdade_manual.webp';
import coverOEspiritoDasLeis from '@/assets/covers/o_espirito_das_leis_manual.webp';
import coverAArteDaGuerra from '@/assets/covers/a_arte_da_guerra_manual.webp';
import coverALutaPeloDireito from '@/assets/covers/a_luta_pelo_direito_manual.webp';
import coverOMundoAssombrado from '@/assets/covers/o_mundo_assombrado_pelos_demonios_manual.webp';

const FALLBACK_CLASSICOS: LivroNormalizado[] = [
  {
    id: 12,
    titulo: 'A Luta pelo Direito',
    autor: 'Rudolf von Ihering',
    sobre: 'A luta pelo direito como dever ético e afirmação da própria existência humana.',
    capa: directImg(coverALutaPeloDireito, 300),
    link: null,
    download: 'https://drive.google.com/file/d/15oWYvvoQT3OLhS32VU2vB2MGz-8KnHTE/view?usp=drivesdk',
    area: 'Filosofia do Direito',
    colecaoId: 'classicos',
  },
  {
    id: 138,
    titulo: 'Sobre a Liberdade',
    autor: 'John Stuart Mill',
    sobre: 'Ensaio clássico sobre os limites do poder da sociedade sobre o indivíduo.',
    capa: directImg(coverSobreALiberdade, 300),
    link: null,
    download: 'https://drive.google.com/file/d/1WeTT6eY67FoI7Jh9HuSKmrvgSwOF5iyr/view?usp=drivesdk',
    area: 'Filosofia Política',
    colecaoId: 'classicos',
  },
  {
    id: 19,
    titulo: 'A Arte da Guerra',
    autor: 'Sun Tzu',
    sobre: 'Tratado clássico de estratégia, disciplina e resolução de conflitos.',
    capa: directImg(coverAArteDaGuerra, 300),
    link: null,
    download: 'https://drive.google.com/file/d/1fxskqftGKsAoCYWElzSX9NGZ3dj7E8O7/view?usp=drivesdk',
    area: 'Estratégia e Filosofia',
    colecaoId: 'classicos',
  },
  {
    id: 9,
    titulo: 'O Espírito das Leis',
    autor: 'Montesquieu',
    sobre: 'A formulação clássica da separação dos poderes e o princípio da moderação política.',
    capa: directImg(coverOEspiritoDasLeis, 300),
    link: null,
    download: 'https://drive.google.com/file/d/1fDqngE5NhIvFiVD6GE2t_ebdepqP0uH9/view?usp=drivesdk',
    area: 'Teoria do Estado',
    colecaoId: 'classicos',
  },
  {
    id: 144,
    titulo: 'Teoria Pura do Direito',
    autor: 'Hans Kelsen',
    sobre: 'Obra fundamental da Teoria do Direito Positivo e do Normativismo Jurídico.',
    capa: directImg(coverCpArtigos, 300),
    link: null,
    download: 'https://drive.google.com/file/d/1XFuOCvzSjk_XWO4xGaWwNqWG_6MsxYYl/view?usp=drive_link',
    area: 'Teoria do Direito',
    colecaoId: 'classicos',
  },
  {
    id: 10,
    titulo: 'O Mundo Assombrado pelos Demônios',
    autor: 'Carl Sagan',
    sobre: 'Ciência, pensamento crítico e o ceticismo como arma contra as ilusões.',
    capa: directImg(coverOMundoAssombrado, 300),
    link: null,
    download: null,
    area: 'Pensamento Crítico',
    colecaoId: 'classicos',
  },
  {
    id: 140,
    titulo: 'O Príncipe',
    autor: 'Nicolau Maquiavel',
    sobre: 'Tratado clássico de ciência política sobre o exercício e a manutenção do poder.',
    capa: directImg(coverOEspiritoDasLeis, 300),
    link: null,
    download: 'https://drive.google.com/file/d/1fxskqftGKsAoCYWElzSX9NGZ3dj7E8O7/view?usp=drivesdk',
    area: 'Filosofia Política',
    colecaoId: 'classicos',
  },
  {
    id: 126,
    titulo: 'O Leviatã',
    autor: 'Thomas Hobbes',
    sobre: 'Tratado sobre soberania, contrato social e filosofia política moderna.',
    capa: directImg(coverALutaPeloDireito, 300),
    link: null,
    download: 'https://drive.google.com/file/d/15oWYvvoQT3OLhS32VU2vB2MGz-8KnHTE/view?usp=drivesdk',
    area: 'Filosofia Política',
    colecaoId: 'classicos',
  },
];

const AUTOPLAY_MS = 8000;

// Cache em memória compartilhado do catálogo de clássicos
let memoryPoolClassicos: LivroNormalizado[] | null = null;
let memoryPoolPromise: Promise<LivroNormalizado[]> | null = null;

// Gera uma sequência aleatória variada para cada visita
function generateSessionSequence(pool: LivroNormalizado[]): LivroNormalizado[] {
  if (!pool || pool.length === 0) return [];
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, 15);
}

// Carrega o pool de livros em background sem travar renderização
async function ensureClassicosPool(): Promise<LivroNormalizado[]> {
  if (memoryPoolClassicos && memoryPoolClassicos.length > 0) {
    return memoryPoolClassicos;
  }
  if (memoryPoolPromise) {
    return memoryPoolPromise;
  }

  memoryPoolPromise = (async () => {
    try {
      const cached = await getPersistedColecao<LivroNormalizado>('classicos');
      if (cached && cached.length > 0) {
        memoryPoolClassicos = cached;
        return cached;
      }
    } catch {}

    const colecaoClassicos = findColecao('classicos');
    if (!colecaoClassicos) return FALLBACK_CLASSICOS;

    try {
      const query = supabase
        .from('biblioteca_classicos')
        .select('id, livro, autor, area, imagem, sobre, link, download, capa_horizontal, ano_lancamento, editora, curiosidades, analise_detalhada, audio_resumo_url, paginas, minutos_leitura')
        .not('imagem', 'is', null)
        .limit(30);

      const data = await withBundleFallback(
        Promise.resolve(query.then((res) => {
          if (res.error) throw res.error;
          return res.data;
        })),
        async () => {
          const rows = await bundle.bibliotecaClassicos();
          return rows || [];
        }
      );

      if (Array.isArray(data) && data.length > 0) {
        const normalized = data.map((r: any) => normalizeLivro(r, colecaoClassicos));
        memoryPoolClassicos = normalized;
        setPersistedColecao('classicos', normalized).catch(() => {});
        prefetchImages(
          normalized.slice(0, 8).map((l) => (l.capa ? cdnImg(l.capa, 240) : null))
        );
        return normalized;
      }
    } catch {}

    return FALLBACK_CLASSICOS;
  })();

  return memoryPoolPromise;
}

// Pré-aquece o pool em idle
if (typeof window !== 'undefined') {
  void ensureClassicosPool();
}

export const FerramentasLivrosCarrossel = () => {
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const autoplayRef = useRef<number | null>(null);
  const userInteractingRef = useRef(false);

  // Inicializa a sequência da visita ATUAL diretamente no mount.
  // Uma vez definida a sequência desta visita, ela NUNCA muda durante a visualização ("não muda do nada"),
  // e se fechar e abrir novamente a tela, gerará uma nova sequência variada.
  const [livros, setLivros] = useState<LivroNormalizado[]>(() => {
    const pool = (memoryPoolClassicos && memoryPoolClassicos.length > 0)
      ? memoryPoolClassicos
      : FALLBACK_CLASSICOS;
    return generateSessionSequence(pool);
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedLivro, setSelectedLivro] = useState<LivroNormalizado | null>(null);

  // Atualiza o pool em segundo plano para as PRÓXIMAS aberturas, sem trocar a lista atual visível
  useEffect(() => {
    let mounted = true;

    ensureClassicosPool().then((pool) => {
      if (!mounted) return;
      setLivros((curr) => {
        // Se a lista estiver vazia por algum motivo extraordinário, popula agora.
        // Se já possui livros em exibição, MANTÉM a sequência atual estável.
        if (!curr || curr.length === 0) {
          return generateSessionSequence(pool);
        }
        return curr;
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  const scrollToIndex = useCallback((idx: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const child = scroller.children[idx] as HTMLElement | undefined;
    if (!child) return;
    const target = child.offsetLeft - (scroller.clientWidth - child.clientWidth) / 2;
    scroller.scrollTo({ left: target, behavior });
  }, []);

  // Autoplay
  useEffect(() => {
    if (livros.length < 2) return;
    const tick = () => {
      if (userInteractingRef.current) return;
      const next = (activeIndex + 1) % livros.length;
      setActiveIndex(next);
      scrollToIndex(next);
    };
    autoplayRef.current = window.setInterval(tick, AUTOPLAY_MS);
    return () => {
      if (autoplayRef.current) window.clearInterval(autoplayRef.current);
    };
  }, [activeIndex, livros.length, scrollToIndex]);

  // Observer de interseção para atualizar o slide ativo ao arrastar
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || livros.length === 0) return;

    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target, entry.intersectionRatio);
        });

        let maxRatio = -1;
        let bestTarget: Element | null = null;
        ratios.forEach((ratio, target) => {
          if (ratio > maxRatio) {
            maxRatio = ratio;
            bestTarget = target;
          }
        });

        if (bestTarget) {
          const idx = Array.from(scroller.children).indexOf(bestTarget);
          if (idx !== -1) setActiveIndex(idx);
        }
      },
      {
        root: scroller,
        threshold: Array.from({ length: 11 }, (_, i) => i / 10),
      }
    );

    Array.from(scroller.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [livros.length]);

  const pauseAutoplay = () => {
    userInteractingRef.current = true;
    window.setTimeout(() => {
      userInteractingRef.current = false;
    }, 4000);
  };

  const handleOpenLivro = (livro: LivroNormalizado) => {
    haptic.selection();
    setSelectedLivro(livro);
  };

  if (!livros.length) return null;

  return (
    <section className="space-y-3">
      {/* Cabeçalho do Carrossel de Livros */}
      <div className="mb-0 relative z-10 pointer-events-none px-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-foreground text-[18px] font-bold mb-1 flex items-center gap-2 pointer-events-auto uppercase tracking-widest">
            <span className="w-1 h-5 rounded-full bg-primary" />
            CLÁSSICOS DO DIREITO
          </h3>
          <p className="font-body text-muted-foreground text-[12.5px] leading-snug ml-3 pointer-events-auto whitespace-nowrap truncate">
            obras fundamentais e livros jurídicos
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            navigate('/bibliotecas/classicos');
          }}
          className="group pointer-events-auto shrink-0 mt-0.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:opacity-70 backdrop-blur-md border border-white/15 hover:border-white/25 text-[12px] font-semibold text-foreground/90 hover:text-white transition-all shadow-sm"
        >
          <span>Ver todos</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>

      {/* Faixa Carrossel Horizontal */}
      <div
        ref={scrollerRef}
        onPointerDown={pauseAutoplay}
        onTouchStart={pauseAutoplay}
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 px-[7.5%] md:px-[4%] lg:px-[3%] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {livros.map((livro, i) => {
          const isActive = i === activeIndex;
          const meta = livro.autor ? `${livro.autor} · ${livro.area ?? 'Clássicos'}` : (livro.area ?? 'Clássico do Direito');

          return (
            <motion.button
              key={`${livro.id}-${i}`}
              type="button"
              onClick={() => handleOpenLivro(livro)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2) }}
              className="snap-center shrink-0 w-[85%] md:w-[46%] lg:w-[31%] active:scale-[0.99] text-left"
            >
              <div
                className={`relative w-full h-[140px] overflow-hidden rounded-2xl transition-all duration-300 flex transform-gpu will-change-transform bg-brand-gradient ${
                  isActive ? 'opacity-100 scale-100 shadow-lg' : 'opacity-85 scale-[0.98]'
                }`}
              >
                {/* SVGs jurídicos decorativos ao fundo */}
                <svg
                  aria-hidden
                  viewBox="0 0 200 200"
                  className="pointer-events-none absolute -right-4 -bottom-6 w-[130px] h-[130px] text-white/10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M100 30 V170 M70 170 H130 M100 55 L55 95 M100 55 L145 95" strokeLinecap="round" />
                  <path d="M35 95 Q55 135 75 95 Z" />
                  <path d="M125 95 Q145 135 165 95 Z" />
                </svg>
                <svg
                  aria-hidden
                  viewBox="0 0 100 100"
                  className="pointer-events-none absolute top-2 right-14 w-[54px] h-[54px] text-white/10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <path d="M18 78 L58 38" />
                  <rect x="52" y="20" width="30" height="14" rx="2" transform="rotate(45 67 27)" />
                  <path d="M10 88 H50" />
                </svg>

                {/* Capa do livro */}
                <div className="relative h-full w-[104px] shrink-0 flex items-center justify-center px-2.5 z-[1]">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Library className="w-8 h-8 text-white/30" />
                  </div>
                  {livro.capa && (
                    <img
                      src={cdnImg(livro.capa, 240)}
                      alt={livro.titulo}
                      loading="eager"
                      fetchpriority="high"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="relative h-[118px] w-auto max-w-full object-contain rounded-md z-[2]"
                      style={{
                        boxShadow:
                          '0 14px 26px -8px rgba(0,0,0,0.75), 0 6px 12px -4px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.25)',
                      }}
                    />
                  )}
                </div>

                {/* Detalhes à direita */}
                <div className="relative flex-1 min-w-0 flex flex-col justify-end px-3.5 pb-3 pt-3 z-[1]">
                  <span className="self-start flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-white mb-1.5 bg-black/35 backdrop-blur-sm">
                    <Library className="w-2.5 h-2.5" />
                    Clássico
                  </span>
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] text-white/85">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="truncate">{meta}</span>
                  </div>
                  <p className="font-display text-white text-[14px] font-semibold leading-snug line-clamp-2 drop-shadow-sm">
                    {livro.titulo}
                  </p>
                  <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md">
                    <ArrowUpRight className="w-3 h-3 text-white" strokeWidth={2.2} />
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Indicadores de Paginação */}
      <CarouselDots total={livros.length} activeIndex={activeIndex} />

      {/* Sheet Modal com Detalhes Completos, Leitor e Resumo em Áudio */}
      <LivroDetailSheet
        livro={selectedLivro}
        open={!!selectedLivro}
        onClose={() => setSelectedLivro(null)}
      />
    </section>
  );
};

export default memo(FerramentasLivrosCarrossel);


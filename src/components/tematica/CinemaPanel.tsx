import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import pipoca from '@/assets/tematica-figures/01-pipoca.webp';
import claquete from '@/assets/tematica-figures/02-claquete.webp';
import rolo from '@/assets/tematica-figures/03-rolo-filme.webp';
import martelo from '@/assets/tematica-figures/04-martelo.webp';
import mascaras from '@/assets/tematica-figures/05-mascaras.webp';
import projetor from '@/assets/tematica-figures/06-projetor.webp';

type Item = { titulo: string; kicker: string; frase: string; img: string };

const ITENS: Item[] = [
  { titulo: '12 Homens e uma Sentença', kicker: 'Clássico do Júri · 1957', frase: 'A dúvida razoável basta para absolver.', img: pipoca },
  { titulo: 'Questão de Honra', kicker: 'Direito Militar · 1992', frase: 'Você não aguenta a verdade!', img: claquete },
  { titulo: 'Erin Brockovich', kicker: 'Direito Ambiental · 2000', frase: 'Uma advogada de araque contra um gigante.', img: rolo },
  { titulo: 'Julgamento em Nuremberg', kicker: 'Direitos Humanos · 1961', frase: 'Julgar juízes que julgaram.', img: martelo },
  { titulo: 'Better Call Saul', kicker: 'Advocacia · 2015', frase: 'Todo advogado tem o seu preço.', img: mascaras },
  { titulo: 'O Poderoso Chefão', kicker: 'Direito e Poder · 1972', frase: 'Uma oferta que ele não pode recusar.', img: projetor },
];

// Cache aquecido: pré-carrega todas as figuras imediatamente e injeta <link rel="preload">
if (typeof window !== 'undefined') {
  ITENS.forEach((f) => {
    const im = new Image();
    im.decoding = 'async';
    (im as any).fetchPriority = 'high';
    im.src = f.img;
    // link rel=preload garante prioridade alta antes mesmo do componente montar
    if (!document.head.querySelector(`link[data-cinema-preload="${f.img}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = f.img;
      link.setAttribute('data-cinema-preload', f.img);
      (link as any).fetchPriority = 'high';
      document.head.appendChild(link);
    }
  });
}

interface Props { children?: ReactNode; }

const CinemaPanel = ({ children }: Props) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % ITENS.length), 5000);
    return () => clearInterval(id);
  }, []);

  const atual = ITENS[idx];

  return (
    <section
      aria-label="Cinema jurídico"
      className="relative overflow-hidden rounded-b-[36px] border-b border-red-950/50 shadow-2xl shadow-black/60"
      style={{
        background:
          'linear-gradient(135deg, hsl(350 55% 14%) 0%, hsl(0 65% 26%) 50%, hsl(355 70% 18%) 100%)',
      }}
    >
      {/* Texturas cinema */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,180,180,0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.55),transparent_65%)]" />

      {/* Perfurações de filme laterais */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-3 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(0,0,0,0.6) 0 8px, transparent 8px 20px)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-3 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(0,0,0,0.6) 0 8px, transparent 8px 20px)',
        }}
      />

      {/* Ornamentos SVG - claquete estilizada */}
      <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute -left-2 -top-2 w-14 h-14 text-red-200/25">
        <g fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round">
          <rect x="20" y="80" width="160" height="90" rx="6" />
          <path d="M20 60 L60 40 L80 60 L120 40 L140 60 L180 40" strokeWidth="8" />
        </g>
      </svg>

      <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute right-3 top-4 w-12 h-12 text-red-200/25">
        <g fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round">
          <circle cx="100" cy="100" r="65" />
          <circle cx="100" cy="100" r="20" />
          <circle cx="60" cy="70" r="10" />
          <circle cx="140" cy="70" r="10" />
          <circle cx="140" cy="130" r="10" />
          <circle cx="60" cy="130" r="10" />
        </g>
      </svg>

      {/* Silhueta grande do item */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[55%] select-none overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          <motion.img
            key={atual.titulo}
            src={atual.img}
            alt=""
            loading="eager"
            decoding="sync"
            {...({ fetchpriority: 'high' } as any)}
            initial={{ opacity: 0, x: 30, scale: 0.95, rotate: -3 }}
            animate={{ opacity: 0.92, x: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="absolute -right-6 bottom-0 h-[105%] w-auto object-contain object-bottom drop-shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
          />
        </AnimatePresence>
      </div>

      {/* Gradiente para legibilidade */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[hsl(355,70%,14%)] via-[hsl(355,70%,14%)]/70 to-transparent" />

      <div className="relative px-5 pt-5 pb-5 flex flex-col min-h-[280px] sm:min-h-[300px]">
        <div className="max-w-[58%] xs:max-w-[62%] flex-1 flex flex-col">
          <p className="text-[10px] uppercase tracking-[0.28em] text-red-200/95 font-bold">
            Cinema Jurídico
          </p>
          <div className="relative min-h-[52px] mt-1.5">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={atual.titulo}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.45 }}
                className="absolute inset-0"
              >
                <h2 className="text-xl sm:text-2xl font-bold text-red-50 leading-tight drop-shadow">
                  {atual.titulo}
                </h2>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-red-200/80 font-semibold">
                  {atual.kicker}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative mt-3 min-h-[52px]">
            <AnimatePresence initial={false} mode="wait">
              <motion.p
                key={atual.frase}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="absolute inset-0 text-[13px] leading-snug text-red-50/95 italic font-serif"
              >
                "{atual.frase}"
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {ITENS.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Ver item ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? 'w-6 bg-red-300' : 'w-1.5 bg-red-100/30'
                }`}
              />
            ))}
          </div>
        </div>

        {children && <div className="relative mt-5">{children}</div>}
      </div>
    </section>
  );
};

export default CinemaPanel;

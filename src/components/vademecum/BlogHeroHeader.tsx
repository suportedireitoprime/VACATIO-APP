import { motion, AnimatePresence } from 'framer-motion';
import { pickAsset } from '@/lib/assetUrl';
import cover2Asset from '@/assets/covers/cover-2.png.asset.json';
import cover2Bundled from '@/assets/covers/cover-2.webp';
import cover3Asset from '@/assets/covers/cover-3.png.asset.json';
import cover3Bundled from '@/assets/covers/cover-3.webp';
import cover4Asset from '@/assets/covers/cover-4.png.asset.json';
import cover4Bundled from '@/assets/covers/cover-4.webp';
import cover5Asset from '@/assets/covers/cover-5.png.asset.json';
import cover5Bundled from '@/assets/covers/cover-5.webp';
import cover6Asset from '@/assets/covers/cover-6.png.asset.json';
import cover6Bundled from '@/assets/covers/cover-6.webp';
import { useEffect, useState } from 'react';
import type { BlogTema } from '@/data/blogPosts';

const COVERS = [
  pickAsset(cover2Bundled, cover2Asset.url),
  pickAsset(cover3Bundled, cover3Asset.url),
  pickAsset(cover4Bundled, cover4Asset.url),
  pickAsset(cover5Bundled, cover5Asset.url),
  pickAsset(cover6Bundled, cover6Asset.url),
];
const COVER_POSITIONS = ['right', 'left', 'center', 'right', 'left'] as const;

type HeroInfo = { titulo: string; descricao: string; bg: string; kicker: string };

const INFOS: Record<string, HeroInfo> = {
  Todos: {
    titulo: 'Blogger Jurídico',
    descricao: 'Artigos autorais sobre filosofia, STF, leis e curiosidades do Direito. Escolha um tema para mergulhar.',
    kicker: 'Blogger Jurídico',
    // âmbar clássico (identidade OAB na Risca)
    bg: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(45 95% 55%) 55%, hsl(38 90% 45%) 100%)',
  },
  Filosofia: {
    titulo: 'Filosofia do Direito',
    descricao: 'De Sócrates a Rawls: as ideias que moldam o que entendemos por justiça, lei e liberdade.',
    kicker: 'Pensadores & Ideias',
    // roxo profundo
    bg: 'linear-gradient(135deg, hsl(265 55% 22%) 0%, hsl(270 60% 38%) 55%, hsl(280 55% 30%) 100%)',
  },
  STF: {
    titulo: 'STF em Foco',
    descricao: 'Decisões marcantes e os bastidores da Suprema Corte que mudam a vida de milhões.',
    kicker: 'Suprema Corte',
    // azul institucional
    bg: 'linear-gradient(135deg, hsl(215 65% 18%) 0%, hsl(210 70% 32%) 55%, hsl(205 65% 25%) 100%)',
  },
  Curiosidades: {
    titulo: 'Curiosidades Jurídicas',
    descricao: 'Fatos históricos, casos bizarros e detalhes do Direito que quase ninguém conhece.',
    kicker: 'Você sabia?',
    // teal / verde-azulado
    bg: 'linear-gradient(135deg, hsl(175 60% 20%) 0%, hsl(170 65% 32%) 55%, hsl(180 55% 26%) 100%)',
  },
  'Clássicos': {
    titulo: 'Clássicos do Direito',
    descricao: 'Obras e autores que todo operador do Direito precisa conhecer ao menos uma vez.',
    kicker: 'Leitura Obrigatória',
    // bordô / vinho
    bg: 'linear-gradient(135deg, hsl(350 55% 20%) 0%, hsl(345 60% 34%) 55%, hsl(355 50% 26%) 100%)',
  },
  Leis: {
    titulo: 'Entendendo as Leis',
    descricao: 'O que é uma lei, como se estrutura, quem cria e por que ela vale. Do básico à hierarquia normativa.',
    kicker: 'Estrutura Legal',
    // verde jurídico
    bg: 'linear-gradient(135deg, hsl(150 50% 18%) 0%, hsl(145 55% 30%) 55%, hsl(155 50% 24%) 100%)',
  },
};


export default function BlogHeroHeader({ selectedTema }: { selectedTema: BlogTema | null }) {
  const [coverIndex, setCoverIndex] = useState(() => Math.floor(Math.random() * COVERS.length));
  useEffect(() => {
    const id = setInterval(() => setCoverIndex((i) => (i + 1) % COVERS.length), 6000);
    return () => clearInterval(id);
  }, []);

  const info = INFOS[selectedTema ?? 'Todos'] ?? INFOS.Todos;
  const pos = COVER_POSITIONS[coverIndex % COVER_POSITIONS.length];
  const posClass =
    pos === 'right' ? 'right-[2%] left-auto origin-bottom-right'
    : pos === 'left' ? 'left-[2%] right-auto origin-bottom-left'
    : 'left-1/2 -translate-x-1/2 origin-bottom';
  const xMotion = pos === 'center' ? [0, 0] : pos === 'right' ? [40, -10] : [20, -30];
  const xExit = pos === 'center' ? -40 : pos === 'right' ? -60 : -80;

  return (
    <motion.div
      className="relative overflow-hidden border-b border-white/10 shadow-xl shadow-black/40"
      animate={{ background: info.bg }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ background: info.bg }}
    >

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.35),transparent_65%)]" />

      {/* Decorative SVG motifs */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.22] mix-blend-multiply"
        viewBox="0 0 400 260"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <pattern id="blogDots" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.55" fill="rgba(0,0,0,0.55)" />
          </pattern>
          <g id="bhScales" stroke="rgba(0,0,0,0.95)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="0" y1="-22" x2="0" y2="22" />
            <line x1="-18" y1="-18" x2="18" y2="-18" />
            <path d="M -18 -18 Q -22 -4 -28 -2 Q -22 0 -18 -18 Z" />
            <path d="M  18 -18 Q  14 -4  8 -2 Q  14 0  18 -18 Z" />
            <path d="M -8 22 L 8 22" />
          </g>
          <g id="bhBook" stroke="rgba(0,0,0,0.95)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M -18 -12 L -18 14 L 0 10 L 18 14 L 18 -12 L 0 -8 Z" />
            <line x1="0" y1="-8" x2="0" y2="10" />
          </g>
          <g id="bhPara" fill="rgba(0,0,0,0.95)">
            <text x="0" y="8" textAnchor="middle" fontFamily="Georgia, serif" fontSize="34" fontWeight="700">§</text>
          </g>
          <g id="bhColumn" stroke="rgba(0,0,0,0.95)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="-14" y="-20" width="28" height="4" />
            <rect x="-16" y="18" width="32" height="4" />
            <line x1="-8" y1="-16" x2="-8" y2="18" />
            <line x1="0" y1="-16" x2="0" y2="18" />
            <line x1="8" y1="-16" x2="8" y2="18" />
          </g>
          <g id="bhQuill" stroke="rgba(0,0,0,0.95)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M -18 20 L 14 -14 Q 20 -20 22 -18 Q 24 -12 20 -6 L -6 20 Z" />
            <line x1="-4" y1="10" x2="6" y2="0" />
          </g>
        </defs>
        <rect width="400" height="260" fill="url(#blogDots)" />
        <use href="#bhScales" transform="translate(50,55) scale(1.35)" />
        <use href="#bhBook" transform="translate(345,60) scale(1.2)" />
        <use href="#bhColumn" transform="translate(35,215) scale(1.05)" />
        <use href="#bhQuill" transform="translate(355,215) scale(1.1)" />
        <use href="#bhPara" transform="translate(200,45) scale(1.25)" />
        <use href="#bhPara" transform="translate(150,240) scale(0.8)" />
        <use href="#bhPara" transform="translate(260,245) scale(0.7)" />
        <use href="#bhScales" transform="translate(200,150) scale(0.65)" />
      </svg>

      {/* Cover art */}
      <div className="pointer-events-none absolute inset-0 select-none overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.img
            key={coverIndex}
            src={COVERS[coverIndex]}
            alt=""
            loading="eager"
            decoding="async"
            initial={{ opacity: 0, scale: 0.85, x: xMotion[0] }}
            animate={{ opacity: 0.92, scale: 1.05, x: xMotion }}
            exit={{ opacity: 0, scale: 1.15, x: xExit }}
            transition={{
              opacity: { duration: 1.1, ease: 'easeInOut' },
              x: { duration: 6, ease: 'linear' },
              scale: { duration: 6, ease: 'linear' },
            }}
            className={`absolute bottom-0 h-[85%] w-auto max-w-[60%] object-contain object-bottom drop-shadow-[0_10px_28px_rgba(0,0,0,0.35)] ${posClass}`}
          />
        </AnimatePresence>
      </div>

      {/* Gradient for text legibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Content */}
      <div className="relative px-5 pt-8 pb-7 min-h-[210px] max-w-3xl mx-auto flex flex-col justify-end">
        <AnimatePresence mode="wait">
          <motion.div
            key={info.titulo}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="max-w-[65%]"
          >
            <p className="font-body text-white/90 text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
              {info.kicker}
            </p>
            <h2 className="font-display text-white text-[26px] leading-[1.05] font-black tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
              {info.titulo}
            </h2>
            <p className="font-body text-white/95 text-[13px] leading-snug mt-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
              {info.descricao}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

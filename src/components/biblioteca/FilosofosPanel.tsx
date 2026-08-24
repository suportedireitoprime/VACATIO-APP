import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import cicero from '@/assets/filosofos/cicero.webp';
import aquino from '@/assets/filosofos/aquino.webp';
import montesquieu from '@/assets/filosofos/montesquieu.webp';
import kant from '@/assets/filosofos/kant.webp';
import kelsen from '@/assets/filosofos/kelsen.webp';
import platao from '@/assets/filosofos/platao.webp';
import aristoteles from '@/assets/filosofos/aristoteles.webp';
import rousseau from '@/assets/filosofos/rousseau.webp';
import locke from '@/assets/filosofos/locke.webp';
import beccaria from '@/assets/filosofos/beccaria.webp';
import ruibarbosa from '@/assets/filosofos/ruibarbosa.webp';
import hegel from '@/assets/filosofos/hegel.webp';

type Filosofo = {
  nome: string;
  epoca: string;
  frase: string;
  img: string;
};

const FILOSOFOS: Filosofo[] = [
  { nome: 'Platão', epoca: 'Grécia Antiga · séc. IV a.C.', frase: 'A justiça consiste em cada um cumprir o que lhe é próprio.', img: platao },
  { nome: 'Aristóteles', epoca: 'Grécia Antiga · séc. IV a.C.', frase: 'A lei é a razão desprovida de paixão.', img: aristoteles },
  { nome: 'Cícero', epoca: 'Roma Antiga · séc. I a.C.', frase: 'A justiça é a rainha das virtudes.', img: cicero },
  { nome: 'Tomás de Aquino', epoca: 'Idade Média · séc. XIII', frase: 'A lei é uma ordenação da razão para o bem comum.', img: aquino },
  { nome: 'John Locke', epoca: 'Iluminismo · séc. XVII', frase: 'Onde não há lei, não há liberdade.', img: locke },
  { nome: 'Montesquieu', epoca: 'Iluminismo · séc. XVIII', frase: 'Para não abusar do poder, é necessário que o poder detenha o poder.', img: montesquieu },
  { nome: 'Cesare Beccaria', epoca: 'Iluminismo · séc. XVIII', frase: 'É melhor prevenir os delitos do que puni-los.', img: beccaria },
  { nome: 'Jean-Jacques Rousseau', epoca: 'Iluminismo · séc. XVIII', frase: 'A lei é a expressão da vontade geral.', img: rousseau },
  { nome: 'Immanuel Kant', epoca: 'Modernidade · séc. XVIII–XIX', frase: 'Age de tal modo que a máxima da tua ação possa ser uma lei universal.', img: kant },
  { nome: 'Georg Hegel', epoca: 'Idealismo · séc. XIX', frase: 'O direito é a existência da vontade livre.', img: hegel },
  { nome: 'Rui Barbosa', epoca: 'Brasil · séc. XIX–XX', frase: 'A justiça atrasada não é justiça; é injustiça qualificada e manifesta.', img: ruibarbosa },
  { nome: 'Hans Kelsen', epoca: 'Contemporâneo · séc. XX', frase: 'A norma fundamental é o pressuposto lógico de toda ordem jurídica.', img: kelsen },
];

// Pré-carrega todas as imagens no import do módulo para exibição instantânea.
if (typeof window !== 'undefined') {
  FILOSOFOS.forEach((f) => {
    const im = new Image();
    im.src = f.img;
  });
}


interface Props {
  children?: ReactNode;
}

const FilosofosPanel = ({ children }: Props) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % FILOSOFOS.length), 5000);
    return () => clearInterval(id);
  }, []);

  const atual = FILOSOFOS[idx];

  return (
    <section
      aria-label="Pensadores do Direito"
      className="relative overflow-hidden rounded-b-[36px] border-b border-amber-950/40 shadow-2xl shadow-black/50"
      style={{
        background:
          'linear-gradient(135deg, hsl(28 35% 22%) 0%, hsl(24 40% 30%) 50%, hsl(20 45% 18%) 100%)',
      }}
    >
      {/* Texturas */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,220,180,0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.45),transparent_65%)]" />

      {/* Ornamentos SVG (livros, martelo, colunas) */}
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="pointer-events-none absolute -left-3 -top-2 w-16 h-16 text-amber-300/25"
      >
        {/* Pilha de livros */}
        <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="30" y="140" width="140" height="24" rx="3" />
          <rect x="45" y="112" width="120" height="24" rx="3" />
          <rect x="35" y="84" width="130" height="24" rx="3" />
          <line x1="55" y1="152" x2="55" y2="158" />
          <line x1="70" y1="124" x2="70" y2="130" />
          <line x1="60" y1="96" x2="60" y2="102" />
        </g>
      </svg>

      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="pointer-events-none absolute right-2 top-3 w-14 h-14 text-amber-300/20"
      >
        {/* Martelo da justiça */}
        <g fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="30" y="40" width="90" height="30" rx="4" transform="rotate(-25 75 55)" />
          <line x1="95" y1="95" x2="160" y2="160" />
          <rect x="120" y="150" width="60" height="14" rx="3" />
        </g>
      </svg>

      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="pointer-events-none absolute left-4 bottom-24 w-10 h-10 text-amber-300/15"
      >
        {/* Livro aberto */}
        <g fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 60 L100 80 L180 60 L180 160 L100 180 L20 160 Z" />
          <line x1="100" y1="80" x2="100" y2="180" />
        </g>
      </svg>

      {/* Silhueta grande do filósofo */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[52%] select-none overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          <motion.img
            key={atual.nome}
            src={atual.img}
            alt=""
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            initial={{ opacity: 0, x: 30, scale: 0.98 }}
            animate={{ opacity: 0.92, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.98 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute -right-4 bottom-0 h-[110%] w-auto object-contain object-bottom opacity-90 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
          />
        </AnimatePresence>
      </div>

      {/* Gradiente para legibilidade */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[hsl(20,45%,18%)] via-[hsl(20,45%,18%)]/70 to-transparent" />

      <div className="relative px-5 pt-5 pb-5 flex flex-col min-h-[280px] sm:min-h-[300px]">
        <div className="max-w-[58%] xs:max-w-[62%] flex-1 flex flex-col">
          <p className="text-[10px] uppercase tracking-[0.28em] text-amber-300/90 font-bold">
            Pensadores do Direito
          </p>
          <div className="relative min-h-[52px] mt-1.5">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={atual.nome}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.45 }}
                className="absolute inset-0"
              >
                <h2 className="text-2xl font-bold text-amber-50 leading-tight drop-shadow">
                  {atual.nome}
                </h2>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-amber-200/75 font-semibold">
                  {atual.epoca}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative mt-3 min-h-[60px]">
            <AnimatePresence initial={false} mode="wait">
              <motion.p
                key={atual.frase}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="absolute inset-0 text-[13px] leading-snug text-amber-50/95 italic font-serif"
              >
                "{atual.frase}"
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Indicadores */}
          <div className="mt-3 flex items-center gap-1.5">
            {FILOSOFOS.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Ver ${FILOSOFOS[i].nome}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? 'w-6 bg-amber-300' : 'w-1.5 bg-amber-100/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Slot para a barra de pesquisa dentro do painel */}
        {children && <div className="relative mt-5">{children}</div>}
      </div>
    </section>
  );
};

export default FilosofosPanel;

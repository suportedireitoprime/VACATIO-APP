import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, BookOpen, Calendar, Building2, Sparkles, ChevronDown, X, User } from 'lucide-react';

export type IntroTocItem = {
  titulo: string;
  ocrPage?: number;
  chapterIdx?: number;
};

interface Props {
  titulo: string;
  autor?: string | null;
  ano?: string | null;
  editora?: string | null;
  sobre?: string | null;
  curiosidades?: string[] | null;
  capa?: string | null;
  tocItems: IntroTocItem[];
  totalPaginas?: number | null;
  tema: { bg: string; text: string; border: string; isDark: boolean };
  onStart: () => void;
  onSkip: () => void;
}

const easeOut = [0.22, 1, 0.36, 1] as const;

const IntroLivro = ({
  titulo,
  autor,
  ano,
  editora,
  sobre,
  curiosidades,
  capa,
  tocItems,
  totalPaginas,
  tema,
  onStart,
  onSkip,
}: Props) => {
  const [step, setStep] = useState<0 | 1>(0);
  const dark = tema.isDark;

  const beneficios =
    curiosidades && curiosidades.length > 0
      ? curiosidades.slice(0, 4)
      : sobre
        ? sobre
            .split(/(?<=\.)\s+/)
            .filter((s) => s.trim().length > 20)
            .slice(0, 3)
        : [];

  const softBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const chipBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  return (
    <div
      className="fixed inset-0 z-[1330] flex flex-col overflow-hidden"
      style={{ background: tema.bg, color: tema.text }}
    >
      {/* Glow ambiente */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)/0.35), transparent 70%)' }}
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="pointer-events-none absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)/0.25), transparent 70%)' }}
      />

      {/* Top bar: skip + step indicator */}
      <div
        className="relative z-10 flex items-center justify-between px-5 pt-4 pb-2 shrink-0"
        style={{ paddingTop: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 1rem)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full transition-all ${step === 0 ? 'w-6 bg-primary' : ''}`}
            style={{ background: step === 0 ? undefined : chipBg }}
          />
          <span
            className={`w-2 h-2 rounded-full transition-all ${step === 1 ? 'w-6 bg-primary' : ''}`}
            style={{ background: step === 1 ? undefined : chipBg }}
          />
        </div>
        <button
          onClick={onSkip}
          className="flex items-center gap-1.5 text-xs font-medium opacity-70 hover:opacity-100 transition"
        >
          Pular <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="s0"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
              transition={{ duration: 0.45, ease: easeOut }}
              className="px-6 pt-4 pb-8 max-w-2xl mx-auto"
            >
              {/* Capa */}
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.08, duration: 0.6, ease: easeOut }}
                className="mx-auto w-[180px] md:w-[210px] aspect-[2/3] rounded-2xl overflow-hidden relative"
                style={{
                  boxShadow: dark
                    ? '0 30px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)'
                    : '0 30px 60px -20px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.06)',
                }}
              >
                {capa ? (
                  <img src={capa} alt={titulo} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: softBg }}
                  >
                    <BookOpen className="w-16 h-16 opacity-30" />
                  </div>
                )}
                <motion.div
                  aria-hidden
                  initial={{ x: '-120%' }}
                  animate={{ x: '120%' }}
                  transition={{ delay: 0.7, duration: 1.4, ease: 'easeInOut' }}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)',
                  }}
                />
              </motion.div>

              {/* Título */}
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.5, ease: easeOut }}
                className="font-display text-2xl md:text-3xl font-bold text-center mt-6 tracking-tight leading-tight"
              >
                {titulo}
              </motion.h1>

              {autor && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.75 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-center text-sm md:text-base mt-2 font-body"
                >
                  por {autor}
                </motion.p>
              )}

              {/* Ficha técnica */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38, duration: 0.5, ease: easeOut }}
                className="mt-6 flex flex-wrap justify-center gap-2"
              >
                {autor && (
                  <Chip icon={<User className="w-3.5 h-3.5" />} label={autor} bg={chipBg} />
                )}
                {ano && (
                  <Chip icon={<Calendar className="w-3.5 h-3.5" />} label={ano} bg={chipBg} />
                )}
                {editora && (
                  <Chip icon={<Building2 className="w-3.5 h-3.5" />} label={editora} bg={chipBg} />
                )}
                {totalPaginas ? (
                  <Chip
                    icon={<BookOpen className="w-3.5 h-3.5" />}
                    label={`${totalPaginas} páginas`}
                    bg={chipBg}
                  />
                ) : null}
              </motion.div>

              {/* Benefícios / destaques */}
              {beneficios.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.55, ease: easeOut }}
                  className="mt-7 rounded-2xl p-5"
                  style={{ background: softBg }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
                      O que você vai encontrar
                    </p>
                  </div>
                  <ul className="space-y-2.5">
                    {beneficios.map((b, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.08, duration: 0.4 }}
                        className="flex gap-2.5 text-sm leading-relaxed"
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="opacity-85">{b}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
              transition={{ duration: 0.45, ease: easeOut }}
              className="px-6 pt-4 pb-8 max-w-2xl mx-auto"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.4 }}
                className="text-center"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Seu cronograma
                </p>
                <h2 className="font-display text-2xl md:text-3xl font-bold mt-2 tracking-tight">
                  Sumário do livro
                </h2>
                <p className="text-sm opacity-70 mt-2 max-w-md mx-auto">
                  Este é o caminho que você vai percorrer. Deslize para começar a leitura.
                </p>
              </motion.div>

              <div className="mt-8 relative">
                {/* Linha vertical de conexão */}
                <div
                  aria-hidden
                  className="absolute left-[22px] top-4 bottom-4 w-px"
                  style={{ background: `${tema.text}22` }}
                />

                <ul className="space-y-2">
                  {tocItems.length === 0 && (
                    <p className="text-sm opacity-60 text-center py-6">
                      Sumário não detectado para este livro.
                    </p>
                  )}
                  {tocItems.map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.05, duration: 0.4, ease: easeOut }}
                      className="relative flex items-stretch gap-3"
                    >
                      {/* Bolinha numerada */}
                      <div className="relative shrink-0">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold tabular-nums relative z-10"
                          style={{
                            background: tema.bg,
                            border: `2px solid hsl(var(--primary))`,
                            color: 'hsl(var(--primary))',
                          }}
                        >
                          {i + 1}
                        </div>
                      </div>

                      {/* Card do capítulo */}
                      <div
                        className="flex-1 min-w-0 rounded-xl px-4 py-3 flex items-center gap-3"
                        style={{ background: softBg }}
                      >
                        <p className="flex-1 text-sm font-medium truncate">{item.titulo}</p>
                        {item.ocrPage != null && (
                          <span
                            className="text-[11px] font-semibold tabular-nums px-2 py-1 rounded-md shrink-0"
                            style={{ background: chipBg, opacity: 0.85 }}
                          >
                            pág. {item.ocrPage}
                          </span>
                        )}
                      </div>
                    </motion.li>
                  ))}
                </ul>

                {tocItems.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: [0.4, 1, 0.4], y: [0, 6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                    className="flex justify-center mt-6"
                  >
                    <ChevronDown className="w-6 h-6 text-primary" />
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div
        className="relative z-10 shrink-0 px-6 pt-3 pb-6 border-t backdrop-blur"
        style={{
          borderColor: tema.border,
          background: dark ? 'rgba(0,0,0,0.35)' : `${tema.bg}dd`,
          paddingBottom: 'calc(var(--sai-bottom, env(safe-area-inset-bottom, 0px)) + 1.25rem)',
        }}
      >
        <div className="max-w-2xl mx-auto flex gap-3 items-center">
          {step === 1 && (
            <button
              onClick={() => setStep(0)}
              className="h-12 px-4 rounded-2xl text-sm font-medium opacity-70 hover:opacity-100 transition"
              style={{ background: chipBg }}
            >
              Voltar
            </button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => (step === 0 ? setStep(1) : onStart())}
            className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
          >
            {step === 0 ? 'Ver o sumário' : 'Começar a leitura'}
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

const Chip = ({
  icon,
  label,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  bg: string;
}) => (
  <span
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
    style={{ background: bg }}
  >
    {icon}
    <span className="opacity-90">{label}</span>
  </span>
);

export default IntroLivro;

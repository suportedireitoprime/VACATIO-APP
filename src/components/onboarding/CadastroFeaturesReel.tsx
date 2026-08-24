import { memo, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Radar, MessageCircle, Bell, Sparkles, ArrowRight } from 'lucide-react';

type Props = {
  nome: string;
  onDone: () => void;
  playSfx?: (k: 'tap' | 'whoosh' | 'ding') => void;
};

type Scene = {
  id: string;
  duration: number; // ms
  grad: string;
  accent: string;
  ink: string;
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  Icon: React.ComponentType<{ className?: string }>;
};

function build(nome: string): Scene[] {
  const primeiro = (nome.trim().split(' ')[0] || '').slice(0, 14);
  return [
    {
      id: 'saudacao',
      duration: 2800,
      grad: 'linear-gradient(140deg, #F5C518 0%, #E0A000 55%, #8B6508 100%)',
      accent: '#1A1204',
      ink: '#1A1204',
      eyebrow: 'PRAZER EM TE CONHECER',
      title: primeiro ? (
        <>
          Olá, <span className="italic">{primeiro}</span>.
        </>
      ) : (
        <>Bem-vindo(a).</>
      ),
      body: 'Deixa eu te mostrar tudo que o Vacatio faz por você.',
      Icon: Sparkles,
    },
    {
      id: 'biblioteca',
      duration: 3200,
      grad: 'linear-gradient(140deg, #2DD4A8 0%, #14a37f 55%, #0F4C3A 100%)',
      accent: '#03170F',
      ink: '#03170F',
      eyebrow: '01 · BIBLIOTECA',
      title: (
        <>
          Milhares de livros<br />
          <span className="italic">num só lugar.</span>
        </>
      ),
      body: 'Códigos comentados, doutrina clássica e resumos, sempre à mão.',
      Icon: BookOpen,
    },
    {
      id: 'radar',
      duration: 3200,
      grad: 'linear-gradient(140deg, #3B82F6 0%, #2453B6 55%, #16265E 100%)',
      accent: '#F0F9FF',
      ink: '#F0F9FF',
      eyebrow: '02 · RADAR DE LEIS',
      title: (
        <>
          Toda lei nova,<br />
          <span className="italic">com resumo pronto.</span>
        </>
      ),
      body: 'A gente monitora Diários e o Congresso — você lê só o que importa.',
      Icon: Radar,
    },
    {
      id: 'horus',
      duration: 3400,
      grad: 'linear-gradient(140deg, #C084FC 0%, #8B4FD9 55%, #4A1D8B 100%)',
      accent: '#FAF5FF',
      ink: '#FAF5FF',
      eyebrow: '03 · HORUS NO WHATSAPP',
      title: (
        <>
          Seu assistente<br />
          <span className="italic">24h no bolso.</span>
        </>
      ),
      body: 'Tira dúvidas por texto, foto ou áudio direto no WhatsApp.',
      Icon: MessageCircle,
    },
    {
      id: 'notificacoes',
      duration: 3200,
      grad: 'linear-gradient(140deg, #E85D3A 0%, #B23A20 55%, #5C1A0F 100%)',
      accent: '#FFF3EB',
      ink: '#FFF3EB',
      eyebrow: '04 · NOTIFICAÇÕES',
      title: (
        <>
          Só o que interessa,<br />
          <span className="italic">nada de spam.</span>
        </>
      ),
      body: 'Alertas da sua área, no seu ritmo. Você escolhe o que chega.',
      Icon: Bell,
    },
    {
      id: 'final',
      duration: 2600,
      grad: 'linear-gradient(140deg, #F5C518 0%, #E0A000 55%, #8B6508 100%)',
      accent: '#1A1204',
      ink: '#1A1204',
      eyebrow: 'TUDO PRONTO',
      title: primeiro ? (
        <>
          Bora estudar,<br />
          <span className="italic">{primeiro}!</span>
        </>
      ) : (
        <>Bora estudar!</>
      ),
      body: 'Seu Vacatio já está personalizado.',
      Icon: Sparkles,
    },
  ];
}

function CadastroFeaturesReelInner({ nome, onDone, playSfx }: Props) {
  const scenes = useMemo(() => build(nome), [nome]);
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const s = scenes[i];
    if (!s) return;
    const t = setTimeout(() => {
      if (i >= scenes.length - 1) {
        playSfx?.('ding');
        onDone();
      } else {
        playSfx?.('whoosh');
        setI((v) => v + 1);
      }
    }, s.duration);
    return () => clearTimeout(t);
  }, [i, scenes, onDone, playSfx]);

  const cur = scenes[i];
  const Icon = cur.Icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] overflow-hidden"
      style={{ background: '#0A0A0A' }}
    >
      {/* Top progress bar */}
      <div
        className="absolute inset-x-0 z-30 flex items-center gap-1.5 px-4"
        style={{ top: 'calc(env(safe-area-inset-top,0px) + 14px)' }}
      >
        {scenes.map((s, idx) => (
          <div key={s.id} className="flex-1 h-1 rounded-full bg-white/15 overflow-hidden">
            <motion.div
              className="h-full bg-white"
              initial={false}
              animate={{ width: idx < i ? '100%' : idx === i ? '100%' : '0%' }}
              transition={
                idx === i && !reduce
                  ? { duration: s.duration / 1000, ease: 'linear' }
                  : { duration: 0.2 }
              }
              key={idx === i ? `${s.id}-run` : `${s.id}-done`}
              style={idx === i ? { width: 0 } : undefined}
            />
          </div>
        ))}
      </div>

      {/* Skip */}
      <button
        onClick={() => {
          playSfx?.('ding');
          onDone();
        }}
        className="absolute z-30 right-4 h-9 px-4 rounded-full bg-white/15 backdrop-blur text-white text-xs font-bold tracking-widest active:scale-95"
        style={{ top: 'calc(env(safe-area-inset-top,0px) + 32px)' }}
      >
        PULAR
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={cur.id}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.03, filter: 'blur(14px)' }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex flex-col"
          style={{ background: cur.grad, color: cur.ink }}
        >
          {/* Radial vignette */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 50% 20%, transparent 40%, rgba(0,0,0,0.35) 100%)',
            }}
          />

          {/* Big icon */}
          <div
            className="relative flex-1 flex items-end justify-center"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top,0px) + 80px)',
              paddingBottom: '20px',
            }}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 170, damping: 18, delay: 0.05 }}
              className="rounded-[36px] backdrop-blur-sm flex items-center justify-center"
              style={{
                width: 'min(46vw, 200px)',
                height: 'min(46vw, 200px)',
                background: 'rgba(255,255,255,0.14)',
                border: '2px solid rgba(255,255,255,0.28)',
                boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
              }}
            >
              <Icon className="w-[46%] h-[46%]" />
            </motion.div>
          </div>

          {/* Text block */}
          <div
            className="relative flex-1 px-7 flex flex-col justify-start"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 32px)' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="text-[11px] font-black tracking-[0.35em] opacity-80 mb-3"
            >
              {cur.eyebrow}
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.55 }}
              className="font-black leading-[0.95] tracking-tight"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 'clamp(2.2rem, 8vw, 3.4rem)',
              }}
            >
              {cur.title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-5 max-w-md opacity-85"
              style={{ fontSize: 'clamp(0.95rem, 3.6vw, 1.1rem)', lineHeight: 1.4 }}
            >
              {cur.body}
            </motion.p>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export default memo(CadastroFeaturesReelInner);

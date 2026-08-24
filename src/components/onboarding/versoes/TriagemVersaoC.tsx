import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, BookOpen, Clock, ShieldCheck } from 'lucide-react';
import {
  DORES,
  FILOSOFOS,
  INTERESSES,
  PERSONAS,
  emptyResult,
  type PersonaId,
  type TriagemResult,
} from './triagemShared';

type Props = {
  open: boolean;
  onFinished: (r: TriagemResult) => void;
  previewMode?: boolean;
};

type Step = 'abertura' | 'persona' | 'interesses' | 'dores' | 'nome' | 'numero';
const CONTENT_STEPS: Step[] = ['persona', 'interesses', 'dores', 'nome', 'numero'];

// Paleta editorial — marrom profundo, tipografia serifada e detalhe dourado.
const SERIF = 'Georgia, "Times New Roman", serif';

const CARD_BG: Record<Exclude<Step, 'abertura'>, { grad: string; accent: string; label: string }> = {
  persona: {
    grad: 'radial-gradient(ellipse at 50% 0%, #4A2A18 0%, #2A1810 55%, #120906 100%)',
    accent: '#F3E7D6',
    label: 'PERFIL',
  },
  interesses: {
    grad: 'radial-gradient(ellipse at 50% 0%, #3F2A1A 0%, #241811 55%, #100907 100%)',
    accent: '#F3E7D6',
    label: 'FOCO',
  },
  dores: {
    grad: 'radial-gradient(ellipse at 50% 0%, #43221A 0%, #26130F 55%, #110706 100%)',
    accent: '#F5E4DA',
    label: 'DORES',
  },
  nome: {
    grad: 'radial-gradient(ellipse at 50% 0%, #3A2A1C 0%, #221810 55%, #110A06 100%)',
    accent: '#F3E7D6',
    label: 'NOME',
  },
  numero: {
    grad: 'radial-gradient(ellipse at 50% 0%, #362718 0%, #201710 55%, #100A06 100%)',
    accent: '#F3E7D6',
    label: 'CONTATO',
  },
};

const GOLD = '#C9A84C';

export default function TriagemVersaoC({ open, onFinished }: Props) {
  const [step, setStep] = useState<Step>('abertura');
  const [data, setData] = useState<TriagemResult>(emptyResult());

  useEffect(() => {
    if (open) {
      setStep('abertura');
      setData(emptyResult());
      FILOSOFOS.slice(0, 6).forEach((f) => {
        const img = new Image();
        img.decoding = 'async';
        img.src = f.src;
      });
    }
  }, [open]);

  const stepIndex = step === 'abertura' ? -1 : CONTENT_STEPS.indexOf(step);
  const bg = step === 'abertura' ? CARD_BG.persona : CARD_BG[step];

  const advance = (patch: Partial<TriagemResult>) => {
    const next = { ...data, ...patch };
    setData(next);
    
    if (step === 'abertura') {
      setStep('persona');
      return;
    }
    
    const nx = CONTENT_STEPS[stepIndex + 1];
    if (nx) {
      setStep(nx);
    } else {
      // Última etapa, finaliza a triagem e vai direto pro Início
      onFinished(next);
    }
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#0A0A0A]"
    >
      {/* Top bar — só aparece após abertura */}
      {step !== 'abertura' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-20 flex items-center justify-between px-6 pt-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top,0px) + 28px)' }}
        >
          <div className="flex-1 flex items-center gap-1.5">
            {CONTENT_STEPS.map((s, i) => (
              <div key={s} className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <motion.div
                  className="h-full bg-[#C9A84C]"
                  initial={false}
                  animate={{ width: i <= stepIndex ? '100%' : '0%' }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stack */}
      <div
        className="relative flex-1 min-h-0 flex items-stretch justify-center px-3 pt-6 sm:pt-8"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 36px)',
        }}
      >
        <AnimatePresence mode="wait">
          {step === 'abertura' ? (
            <AberturaCinematografica key="abertura" onDone={() => advance({})} />
          ) : (
            <motion.div
              key={step}
              initial={{ x: 60, opacity: 0, scale: 0.98 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: -60, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 1 }}
              className="relative w-full max-w-lg rounded-[36px] overflow-hidden flex flex-col shadow-2xl border border-[#C9A84C]/25"
              style={{ background: bg.grad, color: bg.accent, minHeight: 0, maxHeight: '100%', willChange: 'transform, opacity' }}
            >
              <FilosofosTextura seed={stepIndex + 1} />

              <div className="relative z-10 px-6 pt-6 flex items-center justify-between">
                <span className="text-[10px] font-black tracking-[0.45em]" style={{ color: GOLD }}>{bg.label}</span>
                <span className="text-[10px] font-bold tracking-[0.2em] opacity-60">
                  {stepIndex + 1}/{CONTENT_STEPS.length}
                </span>
              </div>

              <CardContent step={step as Exclude<Step, 'abertura'>} data={data} setData={setData} advance={advance} bg={bg} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* -------------------------- Abertura Cinematográfica -------------------------- */

function AberturaCinematografica({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2600); // flash amarelo
    const t2 = setTimeout(() => setPhase(2), 3100); // título amarelo
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const filosofosOrdem = useMemo(() => {
    const posicoes = [
      { top: '10%', left: '6%', size: 130, rot: -8 },
      { top: '16%', right: '4%', size: 145, rot: 6 },
      { bottom: '12%', left: '8%', size: 140, rot: -6 },
      { bottom: '16%', right: '6%', size: 150, rot: 7 },
    ];
    return posicoes.map((pos, i) => ({ ...pos, ...FILOSOFOS[i % FILOSOFOS.length] }));
  }, []);

  return (
    <motion.div
      key="abertura-root"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #4A2A18 0%, #2A1810 55%, #150A05 100%)' }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 45%, transparent 40%, rgba(0,0,0,0.55) 100%)' }} />

      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: phase === 0 ? 1 : 0 }}
        transition={{ duration: 0.45, ease: 'linear' }}
        style={{ willChange: 'opacity' }}
      >
        {filosofosOrdem.map((f, i) => (
            <motion.img
              key={f.nome}
              src={f.src}
              alt={f.nome}
              loading="eager"
              decoding="async"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0.8, 0] }}
              transition={{ duration: 2.4, delay: i * 0.18, times: [0, 0.35, 0.75, 1], ease: 'linear' }}
              className="absolute pointer-events-none select-none"
              style={{
                ...f,
                width: f.size,
                height: 'auto',
                filter: 'brightness(0) invert(1)',
                transform: `rotate(${f.rot}deg) translateZ(0)`,
                willChange: 'opacity, transform',
              }}
            />
          ))}
      </motion.div>

      <AnimatePresence>
        {phase === 0 && (
          <motion.div
            key="p0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="relative z-20 text-center px-8"
          >
            <div className="text-[11px] font-black tracking-[0.5em] text-white/60 mb-4">DOS CLÁSSICOS AOS CÓDIGOS</div>
            <h1 className="text-4xl sm:text-5xl font-black text-white leading-[0.95]" style={{ fontFamily: SERIF }}>
              O Direito<br /><span className="italic text-white/80">pensado por quem</span><br />o construiu.
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={false}
        animate={{ opacity: phase === 1 ? 1 : 0 }}
        transition={{ duration: 0.4, ease: 'linear' }}
        style={{ background: 'radial-gradient(circle at 50% 45%, rgba(201,168,76,0.5) 0%, transparent 70%)', willChange: 'opacity' }}
      />

      <AnimatePresence>
        {phase === 2 && (
          <motion.div
            key="p2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-20 text-center px-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-[11px] font-black tracking-[0.5em] mb-4"
              style={{ color: GOLD }}
            >
              BEM-VINDO(A)
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-5xl sm:text-6xl font-black text-[#F3E7D6] leading-[0.9]"
              style={{ fontFamily: SERIF }}
            >
              Vamos <span className="italic">te conhecer</span>.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 text-[#F3E7D6]/70 text-base max-w-sm mx-auto"
            >
              Cinco toques rápidos pra ajustar o app ao seu jeito de estudar.
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
              onClick={onDone}
              className="mt-8 h-14 px-8 rounded-full bg-[#C9A84C] text-[#150C05] font-black text-base inline-flex items-center gap-2 active:scale-95 shadow-2xl"
            >
              Começar <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FilosofosTextura({ seed = 0 }: { seed?: number }) {
  const spots = [
    { src: FILOSOFOS[seed % FILOSOFOS.length].src, top: '-30px', right: '-40px', size: 240, op: 0.14, rot: 8 },
    { src: FILOSOFOS[(seed + 4) % FILOSOFOS.length].src, bottom: '-40px', left: '-50px', size: 280, op: 0.1, rot: -6 },
  ];
  return (
    <>
      {spots.map((s, i) => (
        <img
          key={i}
          src={s.src}
          alt=""
          aria-hidden
          decoding="async"
          className="absolute pointer-events-none select-none"
          style={{
            top: s.top,
            bottom: s.bottom,
            left: s.left,
            right: s.right,
            width: s.size,
            opacity: s.op,
            transform: `rotate(${s.rot}deg)`,
            filter: 'brightness(0) invert(1)',
          }}
        />
      ))}
    </>
  );
}

/* -------------------------- Conteúdo dos passos com Persuasão -------------------------- */

const listVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } }
};

const maskPhone = (v: string) => {
  const r = v.replace(/\D/g, '');
  if (r.length === 0) return '';
  if (r.length <= 2) return `(${r}`;
  if (r.length <= 7) return `(${r.slice(0, 2)}) ${r.slice(2)}`;
  return `(${r.slice(0, 2)}) ${r.slice(2, 7)}-${r.slice(7, 11)}`;
};

/* Componentes persuasivos */
function PersuasionWidget({ icon: Icon, title, desc, delay = 0.5 }: { icon: any, title: string, desc: string, delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: 'spring', damping: 20 }}
      className="mt-4 mb-2 p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-4 shrink-0"
    >
      <div className="w-12 h-12 shrink-0 rounded-full bg-[#C9A84C]/20 flex items-center justify-center">
        <Icon className="w-6 h-6 text-[#C9A84C]" />
      </div>
      <div>
        <div className="text-[13px] font-bold text-white leading-tight" style={{ fontFamily: SERIF }}>{title}</div>
        <div className="text-[11px] text-white/60 leading-snug mt-0.5">{desc}</div>
      </div>
    </motion.div>
  );
}

function ProgressWidget({ delay = 0.5 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: 'spring', damping: 20 }}
      className="mt-4 mb-2 p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-2 shrink-0"
    >
      <div className="flex justify-between items-end">
        <div className="text-[13px] font-bold text-white leading-tight" style={{ fontFamily: SERIF }}>Leis Atualizadas</div>
        <div className="text-[16px] font-black text-[#C9A84C]">100%</div>
      </div>
      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-[#C9A84C] to-[#E3C575]" 
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ delay: delay + 0.3, duration: 1.5, ease: 'circOut' }}
        />
      </div>
      <div className="text-[10px] text-white/50 text-right uppercase tracking-wider">Em tempo real</div>
    </motion.div>
  );
}

function CardContent({
  step,
  data,
  setData,
  advance,
  bg,
}: {
  step: Exclude<Step, 'abertura'>;
  data: TriagemResult;
  setData: React.Dispatch<React.SetStateAction<TriagemResult>>;
  advance: (patch: Partial<TriagemResult>) => void;
  bg: { grad: string; accent: string; label: string };
}) {
  const nome1 = data.nome.trim().split(' ')[0];

  return (
    <div
      className="relative z-10 flex-1 min-h-0 flex flex-col px-6 pt-4 overflow-hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)' }}
    >
      {step === 'persona' && (
        <>
          <h2 className="text-3xl sm:text-4xl font-black leading-[1.05] mt-2 mb-4" style={{ fontFamily: SERIF }}>
            Qual é o <span className="italic">seu perfil</span>?
          </h2>
          <motion.div variants={listVariants} initial="hidden" animate="show" className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] grid grid-cols-2 gap-3 mt-2 content-start pb-2">
            {PERSONAS.map((p) => (
              <motion.button
                key={p.id}
                variants={itemVariants}
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  advance({ persona: p.id as PersonaId, personaLabel: p.label });
                }}
                className="relative overflow-hidden rounded-2xl aspect-[3/4] shadow-lg border border-[#C9A84C]/25"
              >
                <img src={p.cover} alt="" loading="eager" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-left text-white">
                  <div className="font-black text-sm leading-tight" style={{ fontFamily: SERIF }}>{p.label}</div>
                  <div className="text-white/70 text-[11px]">{p.desc}</div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </>
      )}

      {step === 'interesses' && (
        <>
          <h2 className="text-3xl sm:text-4xl font-black leading-[1.05] mt-2 mb-1" style={{ fontFamily: SERIF }}>
            O que <span className="italic">procura</span>?
          </h2>
          <p className="text-sm opacity-70 mb-3">Marque as funções que mais te interessam</p>
          
          <motion.div variants={listVariants} initial="hidden" animate="show" className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] space-y-2 pb-2 -mx-1 px-1">
            {INTERESSES.map((it) => {
              const Icon = it.icon;
              const on = data.interesses.includes(it.id);
              return (
                <motion.button
                  key={it.id}
                  variants={itemVariants}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    setData((d) => ({
                      ...d,
                      interesses: d.interesses.includes(it.id)
                        ? d.interesses.filter((x) => x !== it.id)
                        : [...d.interesses, it.id],
                    }));
                  }}
                  className={`w-full rounded-2xl px-4 py-3 flex items-center gap-3 border transition text-left ${
                    on
                      ? 'bg-[#C9A84C] text-[#150C05] border-[#C9A84C]'
                      : 'bg-white/[0.06] backdrop-blur border-white/15'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[14px] leading-tight" style={{ fontFamily: SERIF }}>{it.label}</div>
                    <div className="text-[11px] opacity-70 leading-snug">{it.desc}</div>
                  </div>
                  {on && <Check className="w-4 h-4 shrink-0" />}
                </motion.button>
              );
            })}
          </motion.div>
          <PersuasionWidget 
            icon={BookOpen} 
            title="Doutrina e Lei Seca" 
            desc="Mais de 10.000 livros em um só lugar. Textos e comentários na palma da mão." 
          />
          <ContinueBtn disabled={data.interesses.length === 0} onClick={() => advance({})} />
        </>
      )}

      {step === 'dores' && (
        <>
          <h2 className="text-3xl sm:text-4xl font-black leading-[1.05] mt-2 mb-1" style={{ fontFamily: SERIF }}>
            Quais são suas <span className="italic">dores</span>?
          </h2>
          <p className="text-sm opacity-70 mb-3">Marque o que trava seus estudos na lei</p>
          <motion.div variants={listVariants} initial="hidden" animate="show" className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] space-y-2 pb-2 -mx-1 px-1">
            {DORES.map((d) => {
              const Icon = d.icon;
              const on = data.dores.includes(d.id);
              return (
                <motion.button
                  key={d.id}
                  variants={itemVariants}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    setData((prev) => ({
                      ...prev,
                      dores: prev.dores.includes(d.id)
                        ? prev.dores.filter((x) => x !== d.id)
                        : [...prev.dores, d.id],
                    }));
                  }}
                  className={`w-full rounded-2xl px-4 py-3 flex items-center gap-3 border transition text-left ${
                    on
                      ? 'bg-[#C9A84C] text-[#150C05] border-[#C9A84C]'
                      : 'bg-white/[0.06] backdrop-blur border-white/15'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[14px] leading-tight" style={{ fontFamily: SERIF }}>{d.label}</div>
                    <div className="text-[11px] opacity-70 leading-snug">{d.desc}</div>
                  </div>
                  {on && <Check className="w-4 h-4 shrink-0" />}
                </motion.button>
              );
            })}
          </motion.div>
          <ProgressWidget />
          <ContinueBtn disabled={data.dores.length === 0} onClick={() => advance({})} />
        </>
      )}

      {step === 'nome' && (
        <>
          <h2 className="text-3xl sm:text-4xl font-black leading-[1.05] mt-2 mb-1" style={{ fontFamily: SERIF }}>
            Bora estudar{nome1 ? <>, <span className="italic">{nome1}</span>!</> : '...'}
          </h2>
          <p className="text-sm opacity-70 mb-6">Como quer ser chamado?</p>
          <input
            autoFocus
            value={data.nome}
            onChange={(e) => setData((d) => ({ ...d, nome: e.target.value.slice(0, 40) }))}
            onKeyDown={(e) => e.key === 'Enter' && data.nome.trim() && advance({})}
            enterKeyHint="next"
            placeholder="Digite seu nome..."
            className="w-full h-14 px-5 rounded-2xl bg-white/[0.07] backdrop-blur border border-white/20 text-lg font-semibold outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/50 focus:bg-white/[0.1] transition-all placeholder-white/35"
            style={{ color: bg.accent }}
          />
          <div className="flex-1" />
          <PersuasionWidget 
            icon={ShieldCheck} 
            title="Tudo pronto" 
            desc="Sua experiência está sendo montada baseada no seu perfil..." 
            delay={0.2}
          />
          <ContinueBtn disabled={!data.nome.trim()} onClick={() => advance({})} />
        </>
      )}

      {step === 'numero' && (
        <>
          <h2 className="text-3xl sm:text-4xl font-black leading-[1.05] mt-2 mb-1" style={{ fontFamily: SERIF }}>
            Qual seu <span className="italic">Número</span>?
          </h2>
          <p className="text-sm opacity-70 mb-6">Pra receber lembretes de leitura. Opcional.</p>
          <input
            autoFocus
            value={data.whatsapp || ''}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                whatsapp: maskPhone(e.target.value),
              }))
            }
            enterKeyHint="done"
            placeholder="(11) 98765-4321"
            className="w-full h-14 px-5 rounded-2xl bg-white/[0.07] backdrop-blur border border-white/20 text-lg font-semibold outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/50 focus:bg-white/[0.1] transition-all placeholder-white/35"
            style={{ color: bg.accent }}
          />
          <div className="flex-1" />
          <PersuasionWidget 
            icon={Clock} 
            title="Nunca perca o foco" 
            desc="Enviaremos um breve aviso quando for a hora de retomar os estudos." 
            delay={0.3}
          />
          <div className="flex gap-2 shrink-0 mt-4">
            <button
              onClick={() => advance({ whatsapp: null })}
              className="flex-1 h-14 rounded-2xl bg-white/[0.07] border border-white/20 font-bold active:scale-95"
            >
              Pular
            </button>
            <button
              onClick={() =>
                advance({
                  whatsapp:
                    data.whatsapp && data.whatsapp.replace(/\D/g, '').length >= 10
                      ? data.whatsapp
                      : null,
                })
              }
              className="flex-1 h-14 rounded-2xl bg-[#C9A84C] text-[#150C05] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              Finalizar <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ContinueBtn({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="mt-3 shrink-0 h-14 rounded-2xl bg-[#C9A84C] text-[#150C05] font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 transition-all"
    >
      Continuar <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
    </button>
  );
}

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, Volume2, VolumeX, X, ArrowRight } from 'lucide-react';
import {
  AREAS,
  INTERESSES,
  PERSONAS,
  emptyResult,
  type PersonaId,
  type TriagemResult,
} from './triagemShared';
import { useTriagemAudio } from './useTriagemAudio';

type Props = {
  open: boolean;
  onFinished: (r: TriagemResult) => void;
  previewMode?: boolean;
};

type Bubble =
  | { role: 'bot'; text: string; id: string }
  | { role: 'user'; text: string; id: string };

type Step = 'persona' | 'areas' | 'interesses' | 'nome' | 'whatsapp' | 'done';

export default function TriagemVersaoB({ open, onFinished }: Props) {
  const [step, setStep] = useState<Step>('persona');
  const [data, setData] = useState<TriagemResult>(emptyResult());
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { muted, toggleMute, playSfx } = useTriagemAudio(open);

  useEffect(() => {
    if (!open) return;
    setStep('persona');
    setData(emptyResult());
    setBubbles([]);
    setTimeout(() => pushBot('Oi! Sou o Horus 👋'), 400);
    setTimeout(() => pushBot('Vou te fazer 5 perguntas rápidas pra personalizar tudo.'), 1400);
    setTimeout(() => pushBot('Bora começar: em qual momento você está agora?'), 2600);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
  }, [bubbles, typing]);

  const pushBot = (text: string) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setBubbles((b) => [...b, { role: 'bot', text, id: crypto.randomUUID() }]);
      playSfx('tap');
    }, 600);
  };
  const pushUser = (text: string) => {
    setBubbles((b) => [...b, { role: 'user', text, id: crypto.randomUUID() }]);
    playSfx('whoosh');
  };

  const askAreas = () => {
    setTimeout(() => pushBot('Show. Em quais áreas você foca? (escolha 2 ou mais)'), 500);
    setTimeout(() => setStep('areas'), 1100);
  };
  const askInteresses = () => {
    setTimeout(() => pushBot('Perfeito. E o que você mais procura no dia a dia?'), 500);
    setTimeout(() => setStep('interesses'), 1100);
  };
  const askNome = () => {
    setTimeout(() => pushBot('Falta pouco. Como posso te chamar?'), 500);
    setTimeout(() => setStep('nome'), 1100);
  };
  const askWa = () => {
    setTimeout(
      () => pushBot(`Prazer, ${data.nome.split(' ')[0]}! Quer receber lembretes no WhatsApp? (opcional)`),
      500,
    );
    setTimeout(() => setStep('whatsapp'), 1100);
  };
  const finalize = (final: TriagemResult) => {
    setStep('done');
    setTimeout(() => pushBot('Fechou! Tudo pronto ✨'), 400);
    playSfx('ding');
    setTimeout(() => onFinished(final), 1800);
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col text-white"
      style={{
        background:
          'radial-gradient(circle at 50% 0%, rgba(245,197,24,0.18), transparent 45%), #05050A',
      }}
    >
      {/* Header */}
      <div
        className="relative z-10 flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top,0px) + 12px)' }}
      >
        <button
          onClick={toggleMute}
          className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center active:scale-95"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F5C518] to-[#C9A84C] flex items-center justify-center text-black font-black text-lg">
            H
          </div>
          <div>
            <div className="font-bold text-sm">Horus</div>
            <div className="text-[11px] text-[#2DD4A8] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4A8]" /> online agora
            </div>
          </div>
        </div>
        <button
          onClick={() => onFinished(data)}
          className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Chat */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-5 space-y-2">
        <AnimatePresence initial={false}>
          {bubbles.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className={`flex ${b.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed rounded-2xl ${
                  b.role === 'bot'
                    ? 'bg-white/8 border border-white/10 rounded-tl-sm'
                    : 'bg-[#F5C518] text-black font-semibold rounded-tr-sm'
                }`}
              >
                {b.text}
              </div>
            </motion.div>
          ))}
          {typing && (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                {[0, 150, 300].map((d) => (
                  <motion.span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-white/60"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 0.9, delay: d / 1000 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Answer dock */}
      <div
        className="relative z-10 border-t border-white/5 bg-black/40 backdrop-blur-md px-4 pt-3 pb-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)' }}
      >
        <AnimatePresence mode="wait">
          {step === 'persona' && (
            <motion.div
              key="persona"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 gap-2"
            >
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    pushUser(p.label);
                    setData((d) => ({ ...d, persona: p.id as PersonaId, personaLabel: p.label }));
                    askAreas();
                  }}
                  className="rounded-2xl bg-white/5 border border-white/15 hover:border-[#F5C518] p-3 text-left active:scale-95 transition"
                >
                  <div className="font-bold text-sm">{p.label}</div>
                  <div className="text-white/50 text-[11px]">{p.desc}</div>
                </button>
              ))}
            </motion.div>
          )}

          {step === 'areas' && (
            <MultiChipsDock
              key="areas"
              options={AREAS}
              selected={data.areas}
              min={2}
              onToggle={(a) =>
                setData((d) => ({
                  ...d,
                  areas: d.areas.includes(a) ? d.areas.filter((x) => x !== a) : [...d.areas, a],
                }))
              }
              onSubmit={() => {
                pushUser(data.areas.join(', '));
                askInteresses();
              }}
            />
          )}

          {step === 'interesses' && (
            <MultiInteressesDock
              key="int"
              selected={data.interesses}
              onToggle={(id) =>
                setData((d) => ({
                  ...d,
                  interesses: d.interesses.includes(id)
                    ? d.interesses.filter((x) => x !== id)
                    : [...d.interesses, id],
                }))
              }
              onSubmit={() => {
                pushUser(
                  INTERESSES.filter((i) => data.interesses.includes(i.id))
                    .map((i) => i.label)
                    .join(', '),
                );
                askNome();
              }}
            />
          )}

          {step === 'nome' && (
            <TextDock
              key="nome"
              value={data.nome}
              placeholder="Seu nome"
              onChange={(v) => setData((d) => ({ ...d, nome: v }))}
              onSend={() => {
                if (!data.nome.trim()) return;
                pushUser(data.nome);
                askWa();
              }}
            />
          )}

          {step === 'whatsapp' && (
            <WaDock
              key="wa"
              value={data.whatsapp || ''}
              onChange={(v) => setData((d) => ({ ...d, whatsapp: v }))}
              onSubmit={(v) => {
                const next = { ...data, whatsapp: v || null };
                setData(next);
                pushUser(v || 'Pular');
                finalize(next);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function MultiChipsDock({
  options,
  selected,
  min,
  onToggle,
  onSubmit,
}: {
  options: string[];
  selected: string[];
  min: number;
  onToggle: (a: string) => void;
  onSubmit: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
        {options.map((a) => {
          const on = selected.includes(a);
          return (
            <button
              key={a}
              onClick={() => onToggle(a)}
              className={`shrink-0 h-10 px-4 rounded-full text-sm font-semibold border-2 active:scale-95 ${
                on
                  ? 'bg-[#F5C518] border-[#F5C518] text-black'
                  : 'bg-white/5 border-white/15 text-white'
              }`}
            >
              {a}
            </button>
          );
        })}
      </div>
      <button
        onClick={onSubmit}
        disabled={selected.length < min}
        className="mt-3 w-full h-12 rounded-2xl bg-[#F5C518] text-black font-bold flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95"
      >
        Enviar ({selected.length}) <Send className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

function MultiInteressesDock({
  selected,
  onToggle,
  onSubmit,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  onSubmit: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      {INTERESSES.map((it) => {
        const on = selected.includes(it.id);
        const Icon = it.icon;
        return (
          <button
            key={it.id}
            onClick={() => onToggle(it.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left active:scale-[0.98] ${
              on
                ? 'bg-[#2DD4A8]/15 border-[#2DD4A8]'
                : 'bg-white/5 border-white/15'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-sm font-semibold flex-1">{it.label}</span>
            {on && <span className="text-[#2DD4A8] text-xs">✓</span>}
          </button>
        );
      })}
      <button
        onClick={onSubmit}
        disabled={selected.length === 0}
        className="w-full h-12 rounded-2xl bg-[#F5C518] text-black font-bold flex items-center justify-center gap-2 disabled:opacity-30"
      >
        Enviar <Send className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

function TextDock({
  value,
  onChange,
  onSend,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder: string;
}) {
  return (
    <div className="flex gap-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 40))}
        placeholder={placeholder}
        onKeyDown={(e) => e.key === 'Enter' && onSend()}
        className="flex-1 h-12 px-4 rounded-2xl bg-white/10 border border-white/20 text-white outline-none focus:border-[#F5C518]"
      />
      <button
        onClick={onSend}
        disabled={!value.trim()}
        className="h-12 w-12 rounded-2xl bg-[#F5C518] text-black flex items-center justify-center disabled:opacity-30"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}

function WaDock({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d+\s()-]/g, '').slice(0, 20))}
          placeholder="(11) 98765-4321"
          className="flex-1 h-12 px-4 rounded-2xl bg-white/10 border border-white/20 text-white outline-none focus:border-[#F5C518]"
        />
        <button
          onClick={() => onSubmit(value.trim())}
          disabled={!value.trim() || value.replace(/\D/g, '').length < 10}
          className="h-12 w-12 rounded-2xl bg-[#F5C518] text-black flex items-center justify-center disabled:opacity-30"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
      <button
        onClick={() => onSubmit('')}
        className="w-full h-10 rounded-2xl bg-transparent border border-white/15 text-white/70 text-sm font-semibold"
      >
        Pular
      </button>
    </div>
  );
}

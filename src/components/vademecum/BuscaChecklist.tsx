import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  query: string;
  loading: boolean;
  resultCount: number;
}

const STEPS = [
  'Lendo o termo',
  'Analisando relevância',
  'Buscando no aplicativo',
  'Organizando resultados',
];

export default function BuscaChecklist({ query, loading, resultCount }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (query.trim().length < 2) { setStep(0); return; }
    setStep(1);
    const timers = [
      setTimeout(() => setStep((s) => Math.max(s, 2)), 200),
      setTimeout(() => setStep((s) => Math.max(s, 3)), 500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [query]);

  useEffect(() => {
    if (!loading && query.trim().length >= 2) setStep(4);
  }, [loading, query]);

  if (query.trim().length < 2) return null;

  return (
    <div className="px-4 py-3 space-y-1.5">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step - 1 && loading;
        return (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2 text-xs"
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-primary/20 text-primary' : active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {done ? <Check className="w-3 h-3" /> : active ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />}
            </span>
            <span className={done ? 'text-foreground' : 'text-muted-foreground'}>
              {label}
              {i === 3 && !loading && step >= 4 && ` — ${resultCount} ${resultCount === 1 ? 'resultado' : 'resultados'}`}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

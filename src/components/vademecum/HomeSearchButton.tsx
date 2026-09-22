import { memo, useState, useEffect } from 'react';
import { Search, WifiOff } from 'lucide-react';

const HINTS = [
  'Pesquise o artigo...',
  'Pesquise a lei...',
  'Pesquise o número da lei...',
  'Pesquise trechos...',
  'Pesquise normas...',
  'Pesquise jurisprudência...',
  'Pesquise súmulas...',
  'Pesquise por voz...',
];

const TypingHint = () => {
  const [text, setText] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'paused' | 'erasing'>('typing');

  useEffect(() => {
    const current = HINTS[hintIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (text.length < current.length) {
        timer = setTimeout(() => setText(current.slice(0, text.length + 1)), 90);
      } else {
        timer = setTimeout(() => setPhase('paused'), 1500);
      }
    } else if (phase === 'paused') {
      timer = setTimeout(() => setPhase('erasing'), 100);
    } else if (phase === 'erasing') {
      if (text.length > 0) {
        timer = setTimeout(() => setText(text.slice(0, text.length - 1)), 50);
      } else {
        setHintIndex((i) => (i + 1) % HINTS.length);
        setPhase('typing');
      }
    }

    return () => clearTimeout(timer);
  }, [text, hintIndex, phase]);

  return (
    <span className="inline-flex items-center">
      {text}
      <span className="ml-0.5 inline-block w-[2px] h-[14px] bg-white/80 animate-pulse" />
    </span>
  );
};

interface HomeSearchButtonProps {
  onOpenSearch: () => void;
}

const HomeSearchButton = ({ onOpenSearch }: HomeSearchButtonProps) => {
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onOpenSearch}
      role="button"
      aria-haspopup="dialog"
      aria-label={isOffline ? 'Pesquisar leis e artigos no catálogo offline do Vade Mecum' : 'Pesquisar leis, códigos e artigos no Vade Mecum'}
      className="mt-auto relative w-full flex items-center h-16 pl-14 pr-[112px] rounded-2xl bg-black/65 backdrop-blur-md border border-white/15 shadow-lg shadow-black/30 active:scale-[0.99] transition search-bar-shine cursor-pointer"
    >
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0 pointer-events-none" strokeWidth={2.2} />

      <div className="flex items-center gap-1.5 min-w-0 flex-1 text-left overflow-hidden">
        {isOffline && (
          <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/25 border border-amber-400/40 text-amber-300 text-[10px] font-bold animate-fade-in pointer-events-none">
            <WifiOff className="w-3 h-3 text-amber-300 shrink-0" />
            <span className="hidden sm:inline">Offline</span>
          </span>
        )}
        <span className="relative z-[2] font-body text-white/75 text-[14px] sm:text-[15px] font-medium truncate text-left pointer-events-none">
          <TypingHint />
        </span>
      </div>

      <div
        aria-hidden="true"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-12 px-5 rounded-xl bg-primary text-black font-display text-[13px] font-extrabold tracking-wider flex items-center justify-center pointer-events-none select-none uppercase shadow-md shadow-black/30"
      >
        PESQUISAR
      </div>
    </button>
  );
};

export default memo(HomeSearchButton);

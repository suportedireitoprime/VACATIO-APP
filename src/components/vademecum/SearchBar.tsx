import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PHRASES = [
  'Pesquise leis e códigos...',
  'Busque artigos e parágrafos...',
  'Encontre jurisprudência...',
  'Procure por decretos...',
];

interface SearchBarProps {
  onClick: () => void;
}

const SearchBar = ({ onClick }: SearchBarProps) => {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card border border-border/60 shadow-md hover:shadow-lg hover:border-primary/30 transition-all relative overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        <div
          className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.10] to-transparent skew-x-[-20deg]"
          style={{ animation: 'shinePratique 3s ease-in-out infinite' }}
        />
      </div>
      <Search className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1 text-left overflow-hidden h-5 relative">
        <AnimatePresence mode="wait">
          <motion.span
            key={phraseIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-muted-foreground absolute inset-0"
          >
            {PHRASES[phraseIndex]}
          </motion.span>
        </AnimatePresence>
      </div>
    </button>
  );
};

export default SearchBar;

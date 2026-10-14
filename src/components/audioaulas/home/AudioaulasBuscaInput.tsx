import React from 'react';
import { Search, X } from 'lucide-react';

interface AudioaulasBuscaInputProps {
  busca: string;
  setBusca: (v: string) => void;
  buscaRef: React.RefObject<HTMLInputElement | null>;
}

export const AudioaulasBuscaInput = React.memo(function AudioaulasBuscaInput({
  busca,
  setBusca,
  buscaRef
}: AudioaulasBuscaInputProps) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 mt-4 lg:px-10 2xl:max-w-[1600px]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={buscaRef}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar aula, tema ou área..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary/50 focus:bg-white/10"
        />
        {busca && (
          <button
            onClick={() => setBusca('')}
            aria-label="Limpar busca"
            className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
});

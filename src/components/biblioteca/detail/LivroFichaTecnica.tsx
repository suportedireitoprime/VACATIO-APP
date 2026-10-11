import { Layers, Clock, Calendar } from 'lucide-react';
import { formatarDuracao } from '@/lib/livroSobreFormat';

export const InfoBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-secondary/40 border border-border/50 p-3">
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
      {label}
    </div>
    <div className="text-sm font-semibold text-foreground mt-0.5">{value}</div>
  </div>
);

export const FichaItem = ({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  loading?: boolean;
}) => (
  <div className="rounded-2xl bg-secondary/40 border border-border/50 p-3 flex flex-col items-center justify-center text-center gap-1">
    <Icon className="w-4 h-4 text-primary/80" />
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold leading-tight">
      {label}
    </div>
    <div className={`text-sm font-bold leading-tight ${loading ? 'text-muted-foreground/60 animate-pulse' : 'text-foreground'}`}>
      {loading ? '…' : value}
    </div>
  </div>
);

interface LivroFichaTecnicaProps {
  numPages?: number | null;
  minutosLeitura?: number | null;
  anoLancamento?: string | null;
  hasDownload?: boolean;
}

export const LivroFichaTecnica = ({
  numPages,
  minutosLeitura,
  anoLancamento,
  hasDownload,
}: LivroFichaTecnicaProps) => {
  if (!numPages && !minutosLeitura && !anoLancamento) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      <FichaItem
        icon={Layers}
        label="Páginas"
        value={numPages ? String(numPages) : '—'}
        loading={!numPages && !!hasDownload}
      />
      <FichaItem
        icon={Clock}
        label="Leitura média"
        value={formatarDuracao(minutosLeitura)}
        loading={!minutosLeitura && !!hasDownload}
      />
      <FichaItem
        icon={Calendar}
        label="Publicado"
        value={anoLancamento || '—'}
      />
    </div>
  );
};

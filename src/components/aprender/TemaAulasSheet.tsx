import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import TeoriaTab from './tema/TeoriaTab';

type Aula = {
  id: string;
  titulo: string;
  objetivo: string | null;
  duracao_est_min: number;
  ordem: number;
};

type Progresso = { concluida: boolean; pct: number };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  numero: number;
  titulo: string;
  aulas: Aula[];
  progresso: Record<string, Progresso>;
};

const TemaAulasSheet = ({ open, onOpenChange, numero, titulo, aulas, progresso }: Props) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[90dvh] max-h-[90dvh] flex-col gap-0 rounded-t-3xl border-t p-0"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <span className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pb-3 pr-14 pt-3 sm:px-6 sm:pr-16">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-black tabular-nums text-black"
            style={{ background: '#EFE039' }}
          >
            {String(numero).padStart(2, '0')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tema</p>
            <SheetTitle
              className="line-clamp-2 text-[17px] font-bold leading-snug sm:text-lg"
              style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
            >
              {titulo}
            </SheetTitle>
          </div>
        </div>

        {/* Lista de aulas do tema */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-1 sm:px-6">
          <TeoriaTab aulas={aulas} progresso={progresso} onNavigate={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TemaAulasSheet;

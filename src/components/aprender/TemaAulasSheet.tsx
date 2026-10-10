import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import TeoriaTab from './tema/TeoriaTab';
import bgImage from '@/assets/trilha_juridica_bg.jpg';
import { ArrowLeft } from 'lucide-react';

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
        className="flex h-[100dvh] max-h-[100dvh] flex-col gap-0 border-none p-0 bg-[#3a0a14]"
      >
        {/* Background Layer */}
        <div 
          className="absolute inset-0 z-0 opacity-40 mix-blend-overlay"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

        {/* Header */}
        <div 
          className="relative z-10 flex items-center gap-3 px-5 pb-4 pr-14 sm:px-6 sm:pr-16 border-b border-white/10 bg-black/20 backdrop-blur-md"
          style={{ paddingTop: 'calc(var(--sai-top, var(--sai-top)) + 1rem)' }}
        >
          <button 
            onClick={() => onOpenChange(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-transform text-white backdrop-blur-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
              Módulo {String(numero).padStart(2, '0')} • {aulas.length} aulas
            </p>
            <SheetTitle
              className="line-clamp-2 text-[16px] font-bold leading-tight text-white sm:text-lg uppercase tracking-wide"
              style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
            >
              {titulo}
            </SheetTitle>
          </div>
        </div>

        {/* Lista de aulas do tema (Trail) */}
        <div 
          className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 scroll-smooth"
          style={{ paddingBottom: 'calc(var(--sai-bottom, var(--sai-bottom)) + 5rem)' }}
        >
          <TeoriaTab aulas={aulas} progresso={progresso} onNavigate={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TemaAulasSheet;

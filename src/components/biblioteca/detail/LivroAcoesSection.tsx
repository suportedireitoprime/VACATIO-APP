import { Button } from '@/components/ui/button';
import { BookOpen, Headphones } from 'lucide-react';

interface LivroAcoesSectionProps {
  hasPdf: boolean;
  hasOnline: boolean;
  audioResumoUrl?: string | null;
  onLerAgora: () => void;
  onOuvirResumo: () => void;
}

export const LivroAcoesSection = ({
  hasPdf,
  hasOnline,
  audioResumoUrl,
  onLerAgora,
  onOuvirResumo,
}: LivroAcoesSectionProps) => {
  return (
    <div className="pt-1">
      <Button
        className="w-full h-14 text-lg font-semibold gap-2.5 rounded-2xl shadow-lg"
        onClick={onLerAgora}
        disabled={!hasPdf && !hasOnline}
      >
        <BookOpen className="w-5 h-5" />
        Ler agora
      </Button>

      {audioResumoUrl && (
        <Button
          variant="secondary"
          className="w-full h-14 text-lg font-semibold gap-2.5 rounded-2xl shadow-sm mt-3 bg-secondary/80 hover:bg-secondary text-foreground border border-white/5"
          onClick={onOuvirResumo}
        >
          <Headphones className="w-5 h-5 text-primary" />
          Ouvir resumo
        </Button>
      )}
    </div>
  );
};

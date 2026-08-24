import { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw, Scale } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getOrGenerateAnalise } from '@/services/plHeadlineService';
import ReactMarkdown from 'react-markdown';

interface PLAnaliseSheetProps {
  pl: {
    id: string | number;
    numero?: number;
    ano?: number;
    ementa: string;
    autorNome?: string;
    autorFoto?: string | null;
    href?: string;
  };
  onClose: () => void;
}

const PLAnaliseSheet = ({ pl, onClose }: PLAnaliseSheetProps) => {
  const [analise, setAnalise] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const a = await getOrGenerateAnalise({
        id: pl.id,
        ementa: pl.ementa,
        numero: pl.numero,
        ano: pl.ano,
        autorNome: pl.autorNome,
      });
      if (!cancelled) {
        setAnalise(a);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pl.id]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary/60 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-base font-bold truncate">
            PL {pl.numero}/{pl.ano}
          </h1>
          <p className="text-[11px] text-muted-foreground">Análise por IA</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* PL Info Card */}
        <div className="rounded-xl bg-card border border-border/50 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">PL {pl.numero}/{pl.ano}</p>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="w-5 h-5">
                  {pl.autorFoto ? <AvatarImage src={pl.autorFoto} /> : null}
                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                    {pl.autorNome?.slice(0, 2) || 'PL'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">
                  {pl.autorNome || 'Autor não informado'}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{pl.ementa}</p>

          {pl.href && (
            <a
              href={pl.href}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
            >
              Ver na Câmara <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Analysis */}
        <div className="rounded-xl bg-card border border-border/50 p-4">
          <h2 className="font-display text-sm font-bold text-foreground mb-3">Análise Completa</h2>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center gap-2 pt-2">
                <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Gerando análise com IA...</span>
              </div>
            </div>
          ) : analise ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground text-[13px] leading-relaxed">
              <ReactMarkdown>{analise}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Não foi possível gerar a análise.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PLAnaliseSheet;

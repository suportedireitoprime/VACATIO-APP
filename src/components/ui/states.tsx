import { AlertCircle, Inbox, RefreshCw, type LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Padrão único (Fase 7 do plano de UX) para os três estados de tela:
 *   • LoadingState  — skeleton uniforme com aria-busy.
 *   • ErrorState    — mensagem, ícone e botão "Tentar novamente".
 *   • EmptyState    — ícone, título, subtítulo e CTA opcional.
 *
 * Aplicável a mobile, tablet e desktop — o padding e o tamanho se ajustam
 * pelo container em vez de por breakpoint, evitando saltos entre dispositivos.
 */

interface BaseProps {
  className?: string;
}

interface LoadingStateProps extends BaseProps {
  /** Rótulo para leitores de tela; default: "Carregando…". */
  label?: string;
  /** Número de linhas de skeleton (default 4). */
  rows?: number;
  /** Renderiza cards em vez de linhas simples. */
  variant?: 'lines' | 'cards' | 'list';
}

export function LoadingState({
  className,
  label = 'Carregando…',
  rows = 4,
  variant = 'lines',
}: LoadingStateProps) {
  const items = Array.from({ length: rows });
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn('w-full space-y-3', className)}
    >
      <span className="sr-only">{label}</span>
      {variant === 'lines' &&
        items.map((_, i) => (
          <Skeleton key={i} className={cn('h-4 w-full', i === items.length - 1 && 'w-2/3')} />
        ))}
      {variant === 'list' &&
        items.map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl bg-card/40 border border-border/40 p-3">
            <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      {variant === 'cards' && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/40 bg-card/40 p-4 space-y-3">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ErrorStateProps extends BaseProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  className,
  title = 'Não foi possível carregar',
  description = 'Verifique sua conexão e tente novamente.',
  onRetry,
  retryLabel = 'Tentar novamente',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'w-full flex flex-col items-center justify-center text-center gap-3 py-10 px-6',
        'rounded-2xl border border-destructive/30 bg-destructive/5',
        className,
      )}
    >
      <div className="w-12 h-12 rounded-full bg-destructive/15 text-destructive flex items-center justify-center">
        <AlertCircle className="w-6 h-6" aria-hidden="true" />
      </div>
      <div className="space-y-1 max-w-sm">
        <p className="font-display text-base font-semibold text-foreground">{title}</p>
        <p className="font-body text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="mt-1 min-h-11 gap-2 border-destructive/40 text-foreground hover:bg-destructive/10"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps extends BaseProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({
  className,
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'w-full flex flex-col items-center justify-center text-center gap-3 py-12 px-6',
        'rounded-2xl border border-dashed border-border/60 bg-card/30',
        className,
      )}
    >
      <div className="w-14 h-14 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center">
        <Icon className="w-7 h-7" aria-hidden="true" />
      </div>
      <div className="space-y-1 max-w-sm">
        <p className="font-display text-base font-semibold text-foreground">{title}</p>
        {description && <p className="font-body text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <Button onClick={action.onClick} size="sm" className="mt-1 min-h-11">
          {action.label}
        </Button>
      )}
    </div>
  );
}

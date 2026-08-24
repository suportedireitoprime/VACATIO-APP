export function LocaisCardSkeleton({ variant = 'list' }: { variant?: 'list' | 'hero' }) {
  if (variant === 'hero') {
    return (
      <div className="snap-start shrink-0 w-[82vw] max-w-[360px] aspect-[4/5] rounded-2xl bg-muted animate-pulse relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
          <div className="h-4 w-2/3 bg-muted-foreground/20 rounded" />
          <div className="h-3 w-1/2 bg-muted-foreground/10 rounded" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
      <div className="w-20 h-20 rounded-xl bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/4 bg-muted animate-pulse rounded" />
        <div className="h-2.5 w-1/2 bg-muted animate-pulse rounded" />
        <div className="h-2.5 w-1/3 bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}

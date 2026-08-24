import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  leading?: ReactNode;
  className?: string;
  variant?: 'default' | 'dark';
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  leading,
  className = '',
  variant = 'default',
}: PageHeaderProps) {
  const isDark = variant === 'dark';
  const baseBg = isDark ? 'bg-[#1c1c1c]' : 'bg-background';
  const borderColor = isDark ? 'border-white/5' : 'border-border';
  const textColor = isDark ? 'text-white' : 'text-foreground';
  const mutedColor = isDark ? 'text-white/60' : 'text-muted-foreground';
  const buttonBg = isDark ? 'bg-white/[0.06] border border-white/10' : 'bg-muted';

  return (
    <header
      className={`flex items-center gap-3 py-3.5 shrink-0 ${baseBg} border-b ${borderColor} ${className}`}
      style={{
        paddingTop: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 0.875rem)',
        // Notch/curvatura em landscape: respeita insets laterais além dos 16px base.
        paddingLeft: 'calc(1rem + var(--sai-left, env(safe-area-inset-left, 0px)))',
        paddingRight: 'calc(1rem + var(--sai-right, env(safe-area-inset-right, 0px)))',
        minHeight: 'calc(5rem + var(--sai-top, env(safe-area-inset-top, 0px)))',
      }}
    >
      {onBack ? (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBack(); }}
          aria-label="Voltar"
          className={`w-12 h-12 md:w-11 md:h-11 rounded-full ${buttonBg} flex items-center justify-center shrink-0 active:scale-95 transition-transform touch-manipulation select-none`}
        >
          <ArrowLeft className={`w-[22px] h-[22px] ${textColor}`} />
        </button>

      ) : (
        <div className="w-12 md:w-11 shrink-0" />
      )}

      {leading && <div className="shrink-0">{leading}</div>}

      <div className="flex-1 min-w-0 text-center">
        <h1
          className={`font-display text-[18px] md:text-[17px] font-semibold ${textColor} tracking-wide truncate`}
        >
          {title}
        </h1>
        {subtitle && (
          <p className={`text-xs md:text-[11px] font-body ${mutedColor} truncate mt-1`}>
            {subtitle}
          </p>
        )}
      </div>


      {rightAction ? (
        <div className="shrink-0">{rightAction}</div>
      ) : (
        <div className="w-12 md:w-11 shrink-0" />
      )}
    </header>
  );
}

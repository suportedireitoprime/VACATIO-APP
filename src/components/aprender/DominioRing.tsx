interface DominioRingProps {
  score: number; // 0-100
  size?: number;
  stroke?: number;
  label?: string;
  showValue?: boolean;
}

export const DominioRing = ({
  score,
  size = 56,
  stroke = 6,
  label,
  showValue = true,
}: DominioRingProps) => {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#EFE039"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 600ms ease' }}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-sm font-bold text-foreground">
              {Math.round(clamped)}
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      )}
    </div>
  );
};

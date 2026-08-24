import { motion } from 'framer-motion';
import { AlertTriangle, Lightbulb, BookOpen, Scale, Info, ArrowRight } from 'lucide-react';

/* ─── Timeline ─── */
interface TimelineItem {
  ano: string;
  titulo: string;
  desc: string;
}

export const TimelineWidget = ({ items }: { items: TimelineItem[] }) => (
  <div className="my-6 relative pl-6">
    {/* vertical line */}
    <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-primary/60 to-primary/20 rounded-full" />
    {items.map((item, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.08 }}
        className="relative mb-5 last:mb-0"
      >
        {/* dot */}
        <div className="absolute -left-6 top-1 w-[18px] h-[18px] rounded-full border-[3px] border-primary bg-background shadow-md shadow-primary/20 z-10" />
        <div className="ml-2">
          <span className="text-[11px] font-bold text-primary tracking-wide uppercase">{item.ano}</span>
          <h4 className="text-[14px] font-display font-bold text-foreground leading-snug mt-0.5">{item.titulo}</h4>
          <p className="text-[13px] text-foreground/70 font-body leading-relaxed mt-0.5">{item.desc}</p>
        </div>
      </motion.div>
    ))}
  </div>
);

/* ─── Pyramid ─── */
export const PyramidWidget = ({ layers }: { layers: string[] }) => {
  const total = layers.length;
  return (
    <div className="my-6 flex flex-col items-center gap-1">
      {layers.map((layer, i) => {
        const widthPct = 40 + ((i / Math.max(total - 1, 1)) * 55);
        const opacity = 1 - i * 0.12;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scaleX: 0.6 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-lg py-2.5 px-3 text-center border border-primary/20"
            style={{
              width: `${widthPct}%`,
              background: `linear-gradient(135deg, hsl(var(--primary) / ${opacity * 0.18}), hsl(var(--primary) / ${opacity * 0.08}))`,
            }}
          >
            <span className="text-[12px] font-display font-bold text-foreground/90">{layer}</span>
          </motion.div>
        );
      })}
    </div>
  );
};

/* ─── Callout ─── */
const calloutConfig: Record<string, { icon: React.ElementType; accent: string; bg: string; label: string }> = {
  dica: { icon: Lightbulb, accent: 'text-amber-500', bg: 'bg-amber-500/8 border-amber-500/30', label: 'Dica' },
  atencao: { icon: AlertTriangle, accent: 'text-red-500', bg: 'bg-red-500/8 border-red-500/30', label: 'Atenção' },
  exemplo: { icon: BookOpen, accent: 'text-blue-500', bg: 'bg-blue-500/8 border-blue-500/30', label: 'Exemplo' },
  jurisprudencia: { icon: Scale, accent: 'text-emerald-500', bg: 'bg-emerald-500/8 border-emerald-500/30', label: 'Jurisprudência' },
  nota: { icon: Info, accent: 'text-primary', bg: 'bg-primary/8 border-primary/30', label: 'Nota' },
  important: { icon: AlertTriangle, accent: 'text-orange-500', bg: 'bg-orange-500/8 border-orange-500/30', label: 'Importante' },
};

export const CalloutBox = ({ type, title, children }: { type: string; title?: string; children: React.ReactNode }) => {
  const cfg = calloutConfig[type.toLowerCase()] || calloutConfig.nota;
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`my-5 rounded-xl border ${cfg.bg} p-3.5`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-4 h-4 ${cfg.accent} shrink-0`} />
        <span className={`text-[12px] font-display font-bold uppercase tracking-wide ${cfg.accent}`}>
          {title || cfg.label}
        </span>
      </div>
      <div className="text-[13.5px] text-foreground/80 font-body leading-relaxed pl-6">
        {children}
      </div>
    </motion.div>
  );
};

/* ─── FlowChart ─── */
export const FlowChartWidget = ({ steps }: { steps: string[] }) => {
  const safeSteps = Array.isArray(steps) ? steps : [];
  return (
  <div className="my-6 flex flex-col items-center gap-0">
    {safeSteps.map((step, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.07 }}
        className="flex flex-col items-center"
      >
        <div className="rounded-xl border border-primary/25 bg-primary/5 py-2.5 px-5 text-center max-w-[85%]">
          <span className="text-[13px] font-display font-semibold text-foreground/90">{step}</span>
        </div>
        {i < steps.length - 1 && (
          <div className="flex flex-col items-center my-1">
            <div className="w-0.5 h-3 bg-primary/30" />
            <ArrowRight className="w-3.5 h-3.5 text-primary/50 rotate-90" />
          </div>
        )}
      </motion.div>
    ))}
  </div>
  );
};

/* ─── ComparisonTable ─── */
interface ComparisonData {
  headers: string[];
  rows: string[][];
}

export const ComparisonTableWidget = ({ data }: { data: ComparisonData }) => (
  <div className="my-5 overflow-x-auto rounded-xl border border-primary/20">
    <table className="w-full text-sm">
      <thead>
        <tr>
          {data.headers.map((h, i) => (
            <th
              key={i}
              className="p-2.5 text-left text-[12px] font-display font-bold text-primary-foreground uppercase tracking-wide"
              style={{ background: 'hsl(var(--primary))' }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row, ri) => (
          <tr key={ri} className={ri % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
            {row.map((cell, ci) => (
              <td key={ci} className="p-2.5 text-[13px] font-body text-foreground/85 border-t border-border/40">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

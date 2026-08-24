import { Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const InfoRow = ({ icon: Icon, label, value, badge }: {
  icon: typeof Mail; label: string; value: string; badge?: string;
}) => (
  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border">
    <Icon className="w-4 h-4 text-primary/70 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-[11px] text-muted-foreground font-body uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground font-body truncate">{value}</p>
    </div>
    {badge && (
      <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-500 border-0">
        {badge}
      </Badge>
    )}
  </div>
);

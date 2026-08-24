import { Crown, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface Props {
  isPremium: boolean;
  loading: boolean;
  titulo: string;
  desc: string;
  tag: string;
  expira: string | null;
}

export function PlanoCard({ isPremium, loading, titulo, desc, tag, expira }: Props) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(isPremium ? '/assinatura' : '/assinatura')}
      className={`w-full text-left p-5 rounded-2xl border transition-all active:scale-[0.98] ${
        isPremium
          ? 'bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/40'
          : 'bg-card border-border hover:border-primary/40'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
          isPremium ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/10 text-primary'
        }`}>
          {isPremium ? <Crown className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display text-lg font-bold text-foreground leading-tight">{titulo}</p>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{tag}</Badge>
          </div>
          <p className="text-xs text-muted-foreground font-body mt-1 leading-snug">
            {loading ? 'Carregando...' : desc}
          </p>
          {expira && <p className="text-[11px] text-muted-foreground/80 mt-1">Renova em {expira}</p>}
        </div>
        <Sparkles className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>

      {!isPremium && !loading && (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); navigate('/assinatura'); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); navigate('/assinatura'); } }}
          className="gold-cta mt-4 w-full h-12 rounded-xl flex items-center justify-center gap-2 font-display text-[15px] font-extrabold text-amber-950 tracking-wide active:scale-[0.98] transition-transform cursor-pointer"
        >
          <Crown className="w-5 h-5 relative z-10" strokeWidth={2.5} />
          <span className="relative z-10">ASSINAR PREMIUM</span>
        </div>
      )}
    </button>
  );
}

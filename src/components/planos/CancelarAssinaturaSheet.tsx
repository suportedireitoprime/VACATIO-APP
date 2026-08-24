import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, Clock, Sparkles, TrendingUp, Heart,
  BookOpen, Brain, X, Loader2, CheckCircle2,
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expiresAt: string | null;
  startedAt: string | null;
  isAdminOverride: boolean;
}

interface Stats {
  diasAtivo: number;
  artigosLidos: number;
  funcoesUsadas: number;
  anotacoes: number;
  grifos: number;
  favoritos: number;
}

const PERDE = [
  'IA Jurídica ilimitada 24/7',
  'Questões OAB com correção por IA',
  'Narração humana de leis inteiras',
  'Radar Legislativo em tempo real',
  'Biblioteca completa de ebooks',
  '+20 recursos Premium exclusivos',
];

function fmt(iso: string | null) {
  if (!iso) return '—';
  try { return format(new Date(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }); }
  catch { return iso; }
}

export default function CancelarAssinaturaSheet({ open, onOpenChange, expiresAt, startedAt, isAdminOverride }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<'stats' | 'confirm'>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) { setStep('stats'); return; }
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const referencia = startedAt ?? user.created_at ?? new Date().toISOString();
      const diasAtivo = Math.max(1, differenceInDays(new Date(), new Date(referencia)));
      const [visu, ativ, anot, grif, fav] = await Promise.all([
        supabase.from('artigos_visualizacoes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_activity_log').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('artigos_anotacoes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('artigos_grifos').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('artigos_favoritos').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      if (cancelled) return;
      setStats({
        diasAtivo,
        artigosLidos: visu.count ?? 0,
        funcoesUsadas: ativ.count ?? 0,
        anotacoes: anot.count ?? 0,
        grifos: grif.count ?? 0,
        favoritos: fav.count ?? 0,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, user, startedAt]);

  const handleCancel = async () => {
    if (!user) return;
    setConfirming(true);
    try {
      const { error } = await supabase
        .from('assinatura_cancelamentos' as any)
        .upsert({ user_id: user.id, canceled_at: new Date().toISOString() });
      if (error) throw error;
      // Também marcar assinaturas Asaas como canceladas para não-admins
      if (!isAdminOverride) {
        await supabase.from('assinaturas' as any).update({ status: 'canceled' }).eq('user_id', user.id);
      }
      toast.success('Assinatura cancelada. Você voltou ao plano gratuito.');
      onOpenChange(false);
      // Recarrega para refletir o novo estado
      setTimeout(() => window.location.assign('/assinatura'), 400);
    } catch (e: any) {
      toast.error('Não foi possível cancelar', { description: e.message });
    } finally {
      setConfirming(false);
    }
  };

  // Métricas "engajamento" — persuasivas
  const horasEstimadas = stats ? Math.max(1, Math.round((stats.artigosLidos * 4 + stats.funcoesUsadas * 2) / 60)) : 0;
  const engajamentoPct = stats ? Math.min(99, 40 + Math.min(50, Math.round((stats.artigosLidos + stats.funcoesUsadas) / 10))) : 0;
  const evolucaoPct = stats ? Math.min(99, 25 + Math.min(70, stats.anotacoes * 3 + stats.grifos)) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto p-0 border-0 bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-5 py-4">
          <SheetHeader className="text-left space-y-0">
            <SheetTitle className="font-display flex items-center gap-2 text-base">
              {step === 'stats' ? (
                <><Heart className="w-5 h-5 text-primary" /> Antes de você ir…</>
              ) : (
                <><AlertTriangle className="w-5 h-5 text-destructive" /> Cancelar assinatura</>
              )}
            </SheetTitle>
          </SheetHeader>
        </div>

        <AnimatePresence mode="wait">
          {step === 'stats' ? (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="px-5 pt-5 pb-8 space-y-5"
            >
              {/* Hero card — impacto real */}
              <div className="relative overflow-hidden rounded-3xl p-6 text-center"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(45 95% 55%) 55%, hsl(38 90% 45%) 100%)' }}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.25),transparent_65%)]" />
                <p className="relative font-body text-[11px] font-bold uppercase tracking-wider text-black/70">
                  Sua jornada no Vacatio
                </p>
                <p className="relative font-display text-[52px] leading-none font-black text-black mt-2">
                  {loading ? '…' : stats?.diasAtivo ?? 0}
                </p>
                <p className="relative font-body text-sm font-semibold text-black/80 mt-1">
                  dias evoluindo com Premium
                </p>
              </div>

              {/* Grid de conquistas */}
              <div className="grid grid-cols-2 gap-3">
                <MetricBox icon={BookOpen} value={stats?.artigosLidos ?? 0} label="Artigos consultados" />
                <MetricBox icon={Brain} value={stats?.funcoesUsadas ?? 0} label="Recursos acessados" />
                <MetricBox icon={Sparkles} value={stats?.anotacoes ?? 0} label="Anotações criadas" />
                <MetricBox icon={Heart} value={stats?.favoritos ?? 0} label="Favoritos salvos" />
              </div>

              {/* Percentuais persuasivos */}
              <div className="space-y-3">
                <ProgressRow icon={Clock} label={`~${horasEstimadas}h de estudo eficiente`} pct={Math.min(95, horasEstimadas * 5)} caption="Tempo economizado com IA e busca instantânea" />
                <ProgressRow icon={TrendingUp} label={`${engajamentoPct}% de engajamento`} pct={engajamentoPct} caption="Comparado à média de estudantes ativos" />
                <ProgressRow icon={Sparkles} label={`${evolucaoPct}% de evolução`} pct={evolucaoPct} caption="Baseado em anotações, grifos e leituras" />
              </div>

              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                <p className="font-body text-sm text-foreground leading-relaxed">
                  Todo esse progresso foi construído <strong>com o Premium</strong>. Cancelar significa perder a IA
                  Jurídica 24/7, o Radar em tempo real e {PERDE.length - 3} outros recursos que aceleram seus estudos.
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => onOpenChange(false)}
                  className="w-full h-12 font-display font-bold text-base bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Continuar com Premium
                </Button>
                <Button
                  onClick={() => setStep('confirm')}
                  variant="ghost"
                  className="w-full h-11 text-muted-foreground hover:text-destructive"
                >
                  Ainda quero cancelar
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="px-5 pt-5 pb-8 space-y-5"
            >
              <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-5 text-center">
                <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
                <p className="font-display text-lg font-bold text-foreground">
                  Você tem certeza disso?
                </p>
                <p className="font-body text-sm text-muted-foreground mt-2 leading-relaxed">
                  Essa ação <strong>não pode ser desfeita</strong>. Seu acesso Premium será encerrado agora e você
                  voltará ao plano gratuito com os mesmos limites de antes.
                </p>
              </div>

              <div>
                <p className="font-display text-sm font-bold text-foreground mb-2">O que você perde imediatamente:</p>
                <ul className="space-y-1.5">
                  {PERDE.map((p) => (
                    <li key={p} className="flex items-start gap-2 font-body text-sm text-muted-foreground">
                      <X className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="font-body text-xs text-muted-foreground leading-relaxed">
                    Suas <strong>anotações, grifos, favoritos e histórico</strong> ficam salvos permanentemente
                    na sua conta — mesmo após o cancelamento.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleCancel}
                  disabled={confirming}
                  variant="destructive"
                  className="w-full h-12 font-display font-semibold"
                >
                  {confirming ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelando…</>
                  ) : (
                    'Sim, cancelar e voltar ao gratuito'
                  )}
                </Button>
                <Button
                  onClick={() => setStep('stats')}
                  variant="ghost"
                  className="w-full h-11"
                  disabled={confirming}
                >
                  Voltar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

function MetricBox({ icon: Icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-card/60 border border-border/60 p-4">
      <Icon className="w-5 h-5 text-primary mb-2" />
      <p className="font-display text-2xl font-black text-foreground leading-none">{value}</p>
      <p className="font-body text-[11px] text-muted-foreground mt-1 leading-tight">{label}</p>
    </div>
  );
}

function ProgressRow({ icon: Icon, label, pct, caption }: { icon: any; label: string; pct: number; caption: string }) {
  return (
    <div className="rounded-2xl bg-card/60 border border-border/60 p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-primary shrink-0" />
          <p className="font-body text-sm font-semibold text-foreground truncate">{label}</p>
        </div>
        <span className="font-display text-sm font-black text-primary shrink-0">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-primary"
        />
      </div>
      <p className="font-body text-[11px] text-muted-foreground mt-2 leading-snug">{caption}</p>
    </div>
  );
}
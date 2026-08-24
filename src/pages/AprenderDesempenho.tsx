import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { DominioRing } from '@/components/aprender/DominioRing';
import AprenderBottomNav from '@/components/aprender/AprenderBottomNav';

type Area = { id: string; nome: string; cor: string | null; slug: string };

const AprenderDesempenho = () => {
  const navigate = useNavigate();
  const [areas, setAreas] = useState<Area[]>([]);
  const [dominio, setDominio] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState(0);
  const [revisoes, setRevisoes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      const [areasRes, domRes, streakRes, revRes] = await Promise.all([
        supabase.from('aprender_areas').select('id, nome, cor, slug').order('ordem'),
        uid
          ? supabase.from('aprender_dominio_area').select('area_id, score').eq('user_id', uid)
          : Promise.resolve({ data: [] as any }),
        uid
          ? supabase.rpc('aprender_streak_atual', { p_user_id: uid })
          : Promise.resolve({ data: 0 as any }),
        uid
          ? supabase.rpc('aprender_revisoes_devidas', { p_user_id: uid })
          : Promise.resolve({ data: 0 as any }),
      ]);
      if (cancelled) return;
      const areasList = (areasRes.data ?? []) as Area[];
      const map: Record<string, number> = {};
      ((domRes as any).data ?? []).forEach((d: any) => {
        map[d.area_id] = Number(d.score) || 0;
      });
      setAreas(areasList);
      setDominio(map);
      setStreak(typeof streakRes.data === 'number' ? streakRes.data : 0);
      setRevisoes(typeof revRes.data === 'number' ? revRes.data : 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scores = areas.map((a) => dominio[a.id] ?? 0);
  const media = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;

  const mobileHeader = (
    <PageHeader
      title="Desempenho"
      subtitle="Seu progresso no Direito"
      onBack={() => navigate('/aprender')}
    />
  );

  return (
    <DesktopPageLayout
      activeId="aprender"
      title="Desempenho"
      subtitle="Domínio, streak e revisões"
      mobileHeader={mobileHeader}
    >
      <div className="px-4 sm:px-6 py-6 lg:px-0 lg:py-0 max-w-3xl mx-auto w-full space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center gap-1">
            <DominioRing score={media} size={64} stroke={7} />
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">Domínio</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1">
              <Flame
                className={`h-5 w-5 ${streak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}
              />
              <span className="font-display text-2xl font-bold text-foreground">{streak}</span>
            </div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Streak ({streak === 1 ? 'dia' : 'dias'})
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center justify-center gap-1">
            <span className="font-display text-2xl font-bold text-orange-500">{revisoes}</span>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground text-center">
              Revisar hoje
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="font-display text-sm font-bold text-foreground">Domínio por área</p>
          </div>
          {loading ? (
            <div className="grid gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {areas.map((a) => {
                const score = dominio[a.id] ?? 0;
                return (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/aprender/area/${a.slug}`)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-foreground font-medium truncate">{a.nome}</span>
                      <span className="text-muted-foreground">{Math.round(score)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, score)}%`,
                          background: a.cor ?? '#EFE039',
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <AprenderBottomNav />
    </DesktopPageLayout>
  );
};

export default AprenderDesempenho;
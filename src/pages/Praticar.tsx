import { Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronRight, Loader2, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import PraticarHeroPanel from '@/components/praticar/PraticarHeroPanel';
import { agruparPorArea, getPraticarAreaCover, LeiSimples } from '@/lib/praticarAreas';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@/lib/adminEmails';

export default function Praticar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const allowed = isAdminEmail(user?.email);
  const [leis, setLeis] = useState<LeiSimples[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('vade_mecum_leis')
        .select('id, nome, slug')
        .order('nome', { ascending: true })
        .limit(500);
      setLeis((data as LeiSimples[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return leis;
    return leis.filter((l) => l.nome.toLowerCase().includes(term));
  }, [leis, q]);

  const grupos = useMemo(() => agruparPorArea(filtradas), [filtradas]);

  if (!allowed) return <Navigate to="/" replace />;

  const header = (
    <PageHeader
      title="Praticar"
      subtitle="Tiro ao alvo na lei seca"
      onBack={() => navigate('/')}
    />
  );

  return (
    <DesktopPageLayout activeId="praticar" title="Praticar" subtitle="Tiro ao alvo na lei seca" mobileHeader={header}>
      <PraticarHeroPanel
        totalLeis={leis.length}
        artigosDominados={0}
        streakDias={0}
        onPraticarAleatorio={() => {
          const l = leis[Math.floor(Math.random() * leis.length)];
          if (l) navigate(`/praticar/${l.slug ?? l.id}/sessao`);
        }}
      />

      <div className="px-4 sm:px-6 py-4 space-y-4">
        {/* Pesquisa */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar lei ou código..."
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-red-500/60"
          />
        </div>

        {/* Se pesquisando: mostra leis diretas */}
        {q.trim() ? (
          <div className="space-y-2">
            {filtradas.map((l) => (
              <button
                key={l.id}
                onClick={() => navigate(`/praticar/${l.slug ?? l.id}`)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-red-500/50 transition-all group text-left"
              >
                <Target className="w-5 h-5 text-red-500 shrink-0" />
                <p className="flex-1 font-medium text-foreground group-hover:text-red-500 transition-colors">
                  {l.nome}
                </p>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            ))}
            {filtradas.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nada encontrado.
              </p>
            )}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pt-1">
              Por área do direito
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {grupos.map((g, i) => {
                const cover = getPraticarAreaCover(g.area);
                return (
                  <motion.button
                    key={g.area.slug}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 12) * 0.03 }}
                    onClick={() => navigate(`/praticar/area/${g.area.slug}`)}
                    className="relative overflow-hidden rounded-2xl aspect-[4/5] border border-border text-left group"
                    style={{ background: g.area.tint }}
                  >
                    {cover && (
                      <img
                        src={cover}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-cover opacity-40 group-hover:opacity-55 transition-opacity"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute inset-0 p-3 flex flex-col justify-end">
                      <h3 className="font-display text-sm font-black text-white leading-tight drop-shadow-md">
                        {g.area.nome}
                      </h3>
                      <p className="mt-0.5 text-[11px] font-medium text-white/85">
                        {g.leis.length} {g.leis.length === 1 ? 'lei' : 'leis'}
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                        <div className="h-full rounded-full bg-white/90" style={{ width: '0%' }} />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </DesktopPageLayout>
  );
}

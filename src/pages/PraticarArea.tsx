import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Loader2, Target, Search, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { classificarLei, getAreaPraticar, getPraticarAreaCover, LeiSimples } from '@/lib/praticarAreas';
import {
  getFavoritos,
  isFavorito,
  toggleFavorito,
  LEIS_FAVORITOS_EVENT,
} from '@/lib/leisFavoritos';
import miraArco from '@/assets/praticar/mira-arco.png';
import miraArma from '@/assets/praticar/mira-arma.png';
import miraErro from '@/assets/praticar/mira-erro.png';

type Tier = 'ruim' | 'medio' | 'bom';

const TIERS: { key: Tier; nome: string; img: string; cor: string; faixa: string }[] = [
  { key: 'ruim', nome: 'Aprendiz', img: miraErro, cor: 'from-slate-500 to-slate-600', faixa: '0–39%' },
  { key: 'medio', nome: 'Atirador', img: miraArma, cor: 'from-amber-500 to-orange-600', faixa: '40–79%' },
  { key: 'bom', nome: 'Certeiro', img: miraArco, cor: 'from-emerald-500 to-emerald-700', faixa: '80–100%' },
];

function tierDe(pct: number): Tier {
  if (pct >= 80) return 'bom';
  if (pct >= 40) return 'medio';
  return 'ruim';
}

export default function PraticarArea() {
  const { areaSlug } = useParams();
  const navigate = useNavigate();
  const [leis, setLeis] = useState<LeiSimples[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [favTick, setFavTick] = useState(0);

  useEffect(() => {
    const on = () => setFavTick((t) => t + 1);
    window.addEventListener(LEIS_FAVORITOS_EVENT, on);
    return () => window.removeEventListener(LEIS_FAVORITOS_EVENT, on);
  }, []);

  const area = useMemo(() => (areaSlug ? getAreaPraticar(areaSlug) : null), [areaSlug]);

  useEffect(() => {
    if (!area) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('vade_mecum_leis')
        .select('id, nome, slug')
        .order('nome', { ascending: true })
        .limit(500);
      const todas = (data as LeiSimples[]) ?? [];
      const doArea =
        area.slug === 'outras'
          ? todas.filter((l) => classificarLei(l).slug === 'outras')
          : todas.filter((l) => area.match(l));
      setLeis(doArea);
      setLoading(false);
    })();
  }, [area]);

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return leis;
    return leis.filter((l) => l.nome.toLowerCase().includes(term));
  }, [leis, q]);

  // Progresso agregado da área (placeholder até tabela dedicada)
  const progressoArea = 0;
  const tierAtual = tierDe(progressoArea);

  const favSet = useMemo(() => new Set(getFavoritos().map((f) => f.leiId)), [favTick, leis]);

  if (!area) {
    return (
      <DesktopPageLayout activeId="praticar" title="Área" subtitle="">
        <div className="p-6 text-sm text-muted-foreground">Área não encontrada.</div>
      </DesktopPageLayout>
    );
  }

  const cover = getPraticarAreaCover(area);

  const header = (
    <PageHeader title={area.nome} subtitle="Escolha uma lei" onBack={() => navigate('/praticar')} />
  );

  return (
    <DesktopPageLayout activeId="praticar" title={area.nome} subtitle="Escolha uma lei" mobileHeader={header}>
      {/* Painel da área */}
      <section
        className="relative overflow-hidden border-b border-black/10"
        style={{ background: area.tint }}
      >
        {cover && (
          <img
            src={cover}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-1/2 max-w-[280px] object-cover opacity-45"
            loading="eager"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_65%)]" />
        <div className="relative p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Área</p>
          <h1 className="mt-1 font-display text-[22px] sm:text-3xl font-black text-white drop-shadow-md">
            {area.nome}
          </h1>
          <p className="mt-1 text-[12px] font-medium text-white/85">
            {leis.length} {leis.length === 1 ? 'lei' : 'leis'} disponíveis
          </p>
        </div>
      </section>

      <div className="px-4 sm:px-6 py-4 space-y-4">
        {/* Conquistas — nível baseado na precisão */}
        <ConquistasCard tierAtual={tierAtual} pct={progressoArea} />

        {/* Barra de pesquisa */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar nesta área..."
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-red-500/60"
          />
        </div>

        {/* Lista de leis */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {q ? 'Nada encontrado.' : 'Nenhuma lei disponível nesta área ainda.'}
            </p>
          ) : (
            filtradas.map((l, i) => {
              const fav = favSet.has(l.id);
              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 12) * 0.03 }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-red-500/50 transition-all group text-left"
                >
                  <button
                    onClick={() => navigate(`/praticar/${l.slug ?? l.id}`)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                      <Target className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground group-hover:text-red-500 transition-colors truncate">
                        {l.nome}
                      </p>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-red-500/70" style={{ width: '0%' }} />
                      </div>
                    </div>
                  </button>
                  <button
                    aria-label={fav ? 'Remover favorito' : 'Favoritar'}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorito({
                        tipo: 'praticar',
                        leiId: l.id,
                        nome: l.nome,
                        descricao: area.nome,
                        tabela_nome: 'vade_mecum_leis',
                      });
                    }}
                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      fav
                        ? 'bg-amber-500/15 text-amber-500'
                        : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
                    }`}
                  >
                    <Star className="w-5 h-5" fill={fav ? 'currentColor' : 'none'} />
                  </button>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </DesktopPageLayout>
  );
}

/* ---------------- Conquistas ---------------- */

function ConquistasCard({ tierAtual, pct }: { tierAtual: Tier; pct: number }) {
  const atual = TIERS.find((t) => t.key === tierAtual)!;
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div
        className={`relative px-4 py-3 bg-gradient-to-r ${atual.cor} text-white`}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/85">
          Suas conquistas
        </p>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-black leading-tight">
              Nível: {atual.nome}
            </h3>
            <p className="text-[11px] font-medium text-white/90">
              Precisão nesta área: <span className="tabular-nums font-bold">{pct}%</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border">
        {TIERS.map((t) => {
          const ativo = t.key === tierAtual;
          return (
            <div
              key={t.key}
              className={`flex flex-col items-center gap-1 px-2 py-3 text-center transition ${
                ativo ? 'bg-red-500/5' : 'opacity-60'
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border-2 ${
                  ativo ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-border grayscale'
                }`}
              >
                <img
                  src={t.img}
                  alt={t.nome}
                  className="w-full h-full object-contain p-1"
                  loading="lazy"
                />
              </div>
              <p className={`text-[11px] font-bold ${ativo ? 'text-foreground' : 'text-muted-foreground'}`}>
                {t.nome}
              </p>
              <p className="text-[9px] font-medium text-muted-foreground tabular-nums">{t.faixa}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

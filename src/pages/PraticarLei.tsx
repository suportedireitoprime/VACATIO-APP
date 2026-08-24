import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Target, Play, Check, ChevronRight, X, Route, List } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { calcularProgressoPct, getProgressoArtigos, hidratarProgressoDoSupabase, nivelDoArtigo, nivelGeral } from '@/lib/praticarProgress';
import type { ArtigoProgress, NivelDominio } from '@/lib/praticarProgress';
import { formatarFaixaArtigos, montarBlocosDaLei } from '@/lib/praticarLeiEstrutura';
import type { BlocoLei, ArtigoTrilha, LinhaLeiPraticar } from '@/lib/praticarLeiEstrutura';
import TrilhaArtigos from '@/components/praticar/TrilhaArtigos';
import { GeracaoAnimacaoOverlay } from '@/components/vademecum/GeracaoAnimacaoOverlay';

type Modo = 'trilha' | 'lista';


export default function PraticarLei() {
  const { leiSlug } = useParams();
  const navigate = useNavigate();
  const [leiNome, setLeiNome] = useState('');
  const [capitulos, setCapitulos] = useState<BlocoLei[]>([]);
  const [loading, setLoading] = useState(true);
  const [ativo, setAtivo] = useState<number | null>(null);
  const [artigoAtivo, setArtigoAtivo] = useState<{ artigo: ArtigoTrilha; bloco: BlocoLei } | null>(null);
  const modoKey = `praticar_modo_${leiSlug ?? 'default'}`;
  const [modo, setModo] = useState<Modo>(() => {
    if (typeof window === 'undefined') return 'trilha';
    return (localStorage.getItem(modoKey) as Modo) || 'trilha';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(modoKey, modo);
  }, [modo, modoKey]);

  useEffect(() => {
    if (!leiSlug) return;

    (async () => {
      let { data: lei } = await supabase
        .from('vade_mecum_leis')
        .select('id, nome, slug')
        .eq('slug', leiSlug)
        .maybeSingle();
      if (!lei) {
        const r = await supabase
          .from('vade_mecum_leis')
          .select('id, nome, slug')
          .eq('id', leiSlug)
          .maybeSingle();
        lei = r.data;
      }
      if (!lei) { setLoading(false); return; }
      setLeiNome(lei.nome);

      const { data: arts } = await supabase
        .from('vade_mecum_artigos')
        .select('id, numero, epigrafe, texto, ordem')
        .eq('lei_id', lei.id)
        .order('ordem', { ascending: true })
        .limit(5000);

      const linhas = (arts ?? []) as LinhaLeiPraticar[];
      // Hidrata progresso do Supabase antes de renderizar níveis
      await hidratarProgressoDoSupabase(linhas.map((a) => a.id));
      setCapitulos(montarBlocosDaLei(linhas));
      setLoading(false);
    })();
  }, [leiSlug]);

  const header = (
    <PageHeader title={leiNome || 'Praticar'} subtitle="Trilha da lei" onBack={() => navigate('/praticar')} />
  );

  const totalArtigos = capitulos.reduce((sum, c) => sum + c.artigos.length, 0);
  const totalProgresso = calcularProgressoPct(capitulos.flatMap((c) => c.artigos.map((a) => a.id)));

  return (
    <DesktopPageLayout activeId="praticar" title={leiNome} subtitle="Trilha da lei" mobileHeader={header}>
      {/* Header compacto */}
      <section
        className="relative overflow-hidden border-b border-black/10"
        style={{ background: 'linear-gradient(135deg, hsl(0 70% 40%), hsl(0 84% 55%))' }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.28),transparent_60%)]" />
        <div className="relative p-4 sm:p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-lg ring-2 ring-white/60">
            <Target className="w-7 h-7" strokeWidth={2.5} style={{ color: 'hsl(0 84% 45%)' }} fill="hsl(0 84% 55% / 0.15)" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/85">Trilha</p>
            <h1 className="font-display text-lg sm:text-2xl font-black text-white truncate drop-shadow-md">
              {leiNome}
            </h1>
            <p className="text-[11px] font-medium text-white/85">
              {capitulos.length} blocos · {totalArtigos} artigos · {totalProgresso.pct}% dominado
            </p>
            {/* Barra de progresso geral */}
            <div className="mt-2 h-1.5 w-full rounded-full bg-black/25 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/95 transition-all"
                style={{ width: `${totalProgresso.pct}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Toggle Trilha / Lista */}
      {!loading && capitulos.length > 0 && (
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
          <div className="mx-auto max-w-2xl px-3 sm:px-4 py-3 flex items-center gap-2">
            <div className="inline-flex p-1 rounded-full bg-muted shadow-inner">
              <button
                onClick={() => setModo('trilha')}
                className={[
                  'flex items-center gap-1.5 px-4 min-h-[40px] rounded-full text-sm font-bold transition',
                  modo === 'trilha'
                    ? 'bg-destructive text-destructive-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                <Route className="w-4 h-4" /> Trilha
              </button>
              <button
                onClick={() => setModo('lista')}
                className={[
                  'flex items-center gap-1.5 px-4 min-h-[40px] rounded-full text-sm font-bold transition',
                  modo === 'lista'
                    ? 'bg-destructive text-destructive-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                <List className="w-4 h-4" /> Lista
              </button>
            </div>
            <p className="text-[11px] font-medium text-muted-foreground ml-auto tabular-nums">
              {totalArtigos} art · {totalProgresso.pct}%
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : capitulos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          Nenhum capítulo para essa lei ainda.
        </p>
      ) : modo === 'trilha' ? (
        <TrilhaArtigos
          blocos={capitulos}
          onSelectArtigo={(artigo, bloco) => setArtigoAtivo({ artigo, bloco })}
        />
      ) : (
        <ul className="mx-auto max-w-2xl px-3 sm:px-4 py-4 space-y-3">
          {capitulos.map((cap, i) => {
            const pct = calcularProgressoPct(cap.artigos.map((a) => a.id));
            const dominado = pct.pct >= 100;
            const range = formatarFaixaArtigos(cap.artigos);
            return (
              <motion.li
                key={cap.titulo + i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 20) * 0.02 }}
              >
                <button
                  onClick={() => setAtivo(i)}
                  className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card hover:bg-accent/40 active:scale-[0.99] transition p-4 text-left min-h-[80px]"
                >
                  <div
                    className="relative w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-2 text-white"
                    style={
                      dominado
                        ? {
                            background: 'linear-gradient(135deg, hsl(142 65% 40%), hsl(142 70% 50%))',
                            borderColor: 'hsl(142 70% 30%)',
                            boxShadow: '0 6px 14px rgba(20,150,80,0.35), inset 0 -3px 0 rgba(0,0,0,0.18)',
                          }
                        : {
                            background: 'linear-gradient(135deg, hsl(0 70% 40%), hsl(0 84% 55%))',
                            borderColor: 'hsl(0 70% 30%)',
                            boxShadow: '0 6px 14px rgba(180,30,30,0.35), inset 0 -3px 0 rgba(0,0,0,0.18)',
                          }
                    }
                  >
                    {dominado ? <Check className="w-6 h-6" strokeWidth={3} /> : <span className="text-base font-black tabular-nums">{i + 1}</span>}
                    {pct.pct > 0 && pct.pct < 100 && (
                      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
                        <circle
                          cx="20"
                          cy="20"
                          r="18"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 18}
                          strokeDashoffset={2 * Math.PI * 18 * (1 - pct.pct / 100)}
                        />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-foreground leading-snug">
                      {cap.titulo}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground tabular-nums mt-1">
                      {range} · {cap.artigos.length} art · {pct.pct}%
                    </p>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct.pct}%`,
                          background: dominado
                            ? 'linear-gradient(90deg, hsl(142 65% 40%), hsl(142 70% 50%))'
                            : 'linear-gradient(90deg, hsl(0 70% 40%), hsl(0 84% 55%))',
                        }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      <Drawer open={ativo !== null} onOpenChange={(o) => !o && setAtivo(null)}>
        <DrawerContent className="h-[90vh] max-h-[90vh] bg-background border-t border-border">
          {ativo !== null && capitulos[ativo] && (
            <NoDetalhe
              capitulo={capitulos[ativo]}
              leiSlug={leiSlug ?? ''}
              onClose={() => setAtivo(null)}
              onPraticar={(capitulo) => {
                setAtivo(null);
                const params = new URLSearchParams({ bloco: capitulo.titulo });
                if (capitulo.ordemInicio !== null) params.set('inicio', String(capitulo.ordemInicio));
                if (capitulo.ordemFim !== null) params.set('fim', String(capitulo.ordemFim));
                navigate(`/praticar/${leiSlug}/sessao?${params.toString()}`);
              }}
            />
          )}
        </DrawerContent>
      </Drawer>

      {/* Drawer de artigo único (a partir da trilha) */}
      <Drawer open={artigoAtivo !== null} onOpenChange={(o) => !o && setArtigoAtivo(null)}>
        <DrawerContent className="h-[70vh] max-h-[70vh] bg-background border-t border-border">
          {artigoAtivo && (
            <ArtigoDetalhe
              artigo={artigoAtivo.artigo}
              bloco={artigoAtivo.bloco}
              onClose={() => setArtigoAtivo(null)}
              onPraticar={() => {
                const { artigo, bloco } = artigoAtivo;
                setArtigoAtivo(null);
                const params = new URLSearchParams({ bloco: bloco.titulo, artigoId: artigo.id });
                if (artigo.ordem !== null) {
                  params.set('inicio', String(artigo.ordem));
                  params.set('fim', String(artigo.ordem));
                }
                navigate(`/praticar/${leiSlug}/sessao?${params.toString()}`);
              }}
            />
          )}
        </DrawerContent>
      </Drawer>
    </DesktopPageLayout>
  );
}


/* ---------------- Detalhe do nó ---------------- */

const NIVEL_META: Record<NivelDominio, { label: string; color: string; bg: string }> = {
  dominante: { label: 'Dominante', color: 'hsl(142 65% 35%)', bg: 'hsl(142 65% 92%)' },
  mediano:   { label: 'Mediano',   color: 'hsl(38 92% 40%)',  bg: 'hsl(45 95% 92%)' },
  aprendiz:  { label: 'Aprendiz',  color: 'hsl(0 75% 45%)',   bg: 'hsl(0 85% 94%)' },
  novo:      { label: 'Novo',      color: 'hsl(220 10% 45%)', bg: 'hsl(220 15% 94%)' },
};

function NoDetalhe({
  capitulo,
  leiSlug,
  onPraticar,
  onClose,
}: {
  capitulo: BlocoLei;
  leiSlug: string;
  onPraticar: (capitulo: BlocoLei) => void;
  onClose: () => void;
}) {
  const ids = capitulo.artigos.map((a) => a.id);
  const pct = calcularProgressoPct(ids);
  const range = formatarFaixaArtigos(capitulo.artigos);
  const progressos = getProgressoArtigos(ids) as Record<string, ArtigoProgress>;

  const tentativasTotais = Object.values(progressos).reduce((s: number, p: any) => s + (p?.tentativas ?? 0), 0);
  const acertosTotais = Object.values(progressos).reduce((s: number, p: any) => s + (p?.acertos ?? 0), 0);
  const nivel = nivelGeral(pct.pct, tentativasTotais);
  const nivelUI = NIVEL_META[nivel as keyof typeof NIVEL_META];

  const artigosComNivel = capitulo.artigos.map((a) => {
    const p = progressos[a.id];
    return { ...a, prog: p, nivel: nivelDoArtigo(p) as keyof typeof NIVEL_META };
  });

  const dominantes = artigosComNivel.filter((a) => a.nivel === 'dominante');
  const medianos = artigosComNivel.filter((a) => a.nivel === 'mediano');
  const aprendizes = artigosComNivel.filter((a) => a.nivel === 'aprendiz');
  const novos = artigosComNivel.filter((a) => a.nivel === 'novo');

  const accuracy = tentativasTotais > 0 ? Math.round((acertosTotais / tentativasTotais) * 100) : 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header em vermelho (paleta do painel) */}
      <div
        className="shrink-0 relative text-white px-4 pt-3 pb-4 rounded-t-[10px]"
        style={{ background: 'linear-gradient(135deg, hsl(0 70% 40%), hsl(0 84% 50%))' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-2 right-2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition flex items-center justify-center text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <DrawerTitle className="text-left text-lg font-bold leading-tight text-white pr-12">
          {capitulo.titulo}
        </DrawerTitle>
        <DrawerDescription className="text-left text-xs text-white/85 mt-0.5">
          {range} · {capitulo.artigos.length} artigo{capitulo.artigos.length === 1 ? '' : 's'}
        </DrawerDescription>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-4">
        {/* Nível geral */}
        <div className="rounded-2xl p-4 border border-border bg-card">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Seu nível
              </p>
              <p className="text-2xl font-bold leading-tight text-foreground">
                {nivelUI.label}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {pct.dominados}/{pct.total} dominados · {pct.pct}%
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Acerto</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {tentativasTotais > 0 ? `${accuracy}%` : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {acertosTotais}/{tentativasTotais} tentativas
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct.pct}%`, background: nivelUI.color }}
            />
          </div>
        </div>

        {/* Distribuição */}
        <div className="grid grid-cols-4 gap-2">
          {([
            { key: 'dominante', count: dominantes.length },
            { key: 'mediano', count: medianos.length },
            { key: 'aprendiz', count: aprendizes.length },
            { key: 'novo', count: novos.length },
          ] as const).map(({ key, count }) => {
            const m = NIVEL_META[key];
            return (
              <div
                key={key}
                className="rounded-xl border border-border bg-card p-2 text-center"
              >
                <p className="text-xl font-bold tabular-nums" style={{ color: m.color }}>{count}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Grupos de artigos */}
        {[
          { titulo: 'Você domina', itens: dominantes, key: 'dominante' as const },
          { titulo: 'Precisa reforçar', itens: aprendizes, key: 'aprendiz' as const },
          { titulo: 'Em progresso', itens: medianos, key: 'mediano' as const },
          { titulo: 'Ainda não praticados', itens: novos, key: 'novo' as const },
        ].filter((g) => g.itens.length > 0).map((g) => {
          const m = NIVEL_META[g.key];
          return (
            <div key={g.key}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {g.titulo}
                </p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {g.itens.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.itens.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium min-h-[32px] text-foreground"
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                    {a.numero ? `Art. ${a.numero}` : 'Art.'}
                    {a.prog && a.prog.tentativas > 0 && (
                      <span className="tabular-nums text-muted-foreground">
                        {a.prog.acertos}/{a.prog.tentativas}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          Lei: <span className="font-semibold">{leiSlug}</span>
        </p>
      </div>

      {/* Ação fixa (mínimo 48px – guideline Apple/Google) */}
      <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => onPraticar(capitulo)}
          className="w-full min-h-[52px] rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition"
          style={{ background: 'linear-gradient(135deg, hsl(0 70% 40%), hsl(0 84% 55%))' }}
        >
          <Play className="w-5 h-5" fill="currentColor" /> Começar prática
        </button>
      </div>
    </div>
  );
}

/* ---------------- Detalhe de um artigo (a partir da trilha) ---------------- */

function ArtigoDetalhe({
  artigo,
  bloco,
  onClose,
  onPraticar,
}: {
  artigo: ArtigoTrilha;
  bloco: BlocoLei;
  onClose: () => void;
  onPraticar: () => void;
}) {
  const progressos = getProgressoArtigos([artigo.id]);
  const prog = progressos[artigo.id];
  const nivel = nivelDoArtigo(prog);
  const nivelUI = NIVEL_META[nivel as keyof typeof NIVEL_META];
  const accuracy = prog && prog.tentativas > 0 ? Math.round((prog.acertos / prog.tentativas) * 100) : 0;

  const [gerando, setGerando] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  const handlePraticar = async () => {
    setGerando(true);
    setStepIdx(0);
    // etapa 1: preparando
    setTimeout(() => setStepIdx(1), 400);
    try {
      // etapa 2: gerando com IA (chama a função para popular/aquecer o cache)
      await supabase.functions.invoke('praticar-gerar-desafios', {
        body: {
          artigo_id: artigo.id,
          texto: artigo.texto ?? '',
          numero: artigo.numero,
          epigrafe: artigo.epigrafe,
        },
      });
    } catch (e) {
      console.warn('[praticar] falha ao gerar desafios', e);
    }
    setStepIdx(2);
    // etapa 3: montando sessão
    await new Promise((r) => setTimeout(r, 500));
    setStepIdx(3);
    await new Promise((r) => setTimeout(r, 300));
    setGerando(false);
    onPraticar();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="shrink-0 relative text-white px-4 pt-3 pb-4 rounded-t-[10px]"
        style={{ background: 'linear-gradient(135deg, hsl(0 70% 40%), hsl(0 84% 50%))' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-2 right-2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition flex items-center justify-center text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">
          {bloco.titulo}
        </p>
        <DrawerTitle className="text-left text-2xl font-black leading-tight text-white pr-12">
          Art. {artigo.numero ?? '—'}
        </DrawerTitle>
        {artigo.epigrafe && (
          <DrawerDescription className="text-left text-xs text-white/85 mt-0.5">
            {artigo.epigrafe}
          </DrawerDescription>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        <div className="rounded-2xl p-3 border border-border bg-card flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nível</p>
            <p className="text-lg font-bold text-foreground">{nivelUI.label}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Acerto</p>
            <p className="text-lg font-bold tabular-nums text-foreground">
              {prog && prog.tentativas > 0 ? `${accuracy}%` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {prog?.acertos ?? 0}/{prog?.tentativas ?? 0} tentativas
            </p>
          </div>
        </div>

        {artigo.texto && (
          <div className="rounded-2xl p-4 border border-border bg-muted/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Texto do artigo
            </p>
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {artigo.texto}
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          onClick={handlePraticar}
          disabled={gerando}
          className="w-full min-h-[52px] rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition disabled:opacity-70"
          style={{ background: 'linear-gradient(135deg, hsl(0 70% 40%), hsl(0 84% 55%))' }}
        >
          {gerando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" fill="currentColor" />}
          {gerando ? 'Preparando desafios…' : 'Praticar este artigo'}
        </button>
      </div>

      <GeracaoAnimacaoOverlay
        open={gerando}
        titulo="Preparando seus desafios"
        steps={[
          'Lendo o artigo',
          'Gerando pegadinhas e V/F com IA',
          'Montando a sessão',
          'Pronto para praticar',
        ]}
        stepIdx={stepIdx}
        stepRanges={[[0, 15], [15, 85], [85, 97], [100, 100]]}
        estTotalSec={10}
      />
    </div>
  );
}



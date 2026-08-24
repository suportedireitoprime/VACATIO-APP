import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Film, Search, Star, Trophy, Heart, Flame, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/vademecum/PageHeader";
import DesktopPageLayout from "@/components/layout/DesktopPageLayout";
import ObraDetailSheet, { type Obra } from "@/components/tematica/ObraDetailSheet";
import CinemaPanel from "@/components/tematica/CinemaPanel";
import ObrasCarousel from "@/components/tematica/ObrasCarousel";
import RecomendadosAutoCarousel from "@/components/tematica/RecomendadosAutoCarousel";
import HabilidadesFloatingBar from "@/components/tematica/HabilidadesFloatingBar";
import HabilidadeHero from "@/components/tematica/HabilidadeHero";
import EmAltaFaixa from "@/components/tematica/EmAltaFaixa";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { buscarRankingEngajamento, type RankingRow } from "@/lib/tematicaMetricas";
import { HABILIDADES_MAP, type HabilidadeId, isHabilidadeId } from "@/lib/tematicaHabilidades";

type Atalho = "todos" | "ranking" | "favoritos" | "em_alta" | "comentados";

const ATALHOS: { id: Atalho; label: string; icon: any }[] = [
  { id: "todos", label: "Todos", icon: Film },
  { id: "ranking", label: "Ranking", icon: Trophy },
  { id: "favoritos", label: "Favoritos", icon: Heart },
  { id: "em_alta", label: "Em alta", icon: Flame },
  { id: "comentados", label: "Comentados", icon: MessageCircle },
];

export default function TematicaJuridica() {
  const navigate = useNavigate();
  const [obras, setObras] = useState<Obra[]>([]);
  const [destaques, setDestaques] = useState<Set<string>>(new Set());
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [ranking, setRanking] = useState<Map<string, RankingRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [atalho, setAtalho] = useState<Atalho>("todos");
  const [busca, setBusca] = useState("");
  const [habilidade, setHabilidade] = useState<HabilidadeId | null>(null);
  const [selecionada, setSelecionada] = useState<Obra | null>(null);

  useEffect(() => {
    (async () => {
      let list: (Obra & { destaque?: boolean })[] = [];
      try {
        const { data, error } = await supabase
          .from("tematica_juridica_obras")
          .select("*")
          .eq("ativo", true)
          .order("destaque", { ascending: false })
          .order("ordem", { ascending: true });
        if (error) console.error(error);
        list = ((data ?? []) as unknown) as (Obra & { destaque?: boolean })[];
      } catch (e) {
        console.error(e);
      }
      if (list.length === 0) {
        const { bundle } = await import("@/services/offlineBundle");
        list = (await bundle.tematicaObras<Obra & { destaque?: boolean }>()) ?? [];
      }
      setDestaques(new Set(list.filter((o: any) => o.destaque).map((o) => o.id)));
      setObras(list as Obra[]);
      setLoading(false);

      // Engajamento (últimos 7 dias)
      const rows = await buscarRankingEngajamento(7);
      const map = new Map<string, RankingRow>();
      rows.forEach((r) => map.set(r.obra_id, r));
      setRanking(map);

      // Favoritos do usuário
      const { data: user } = await supabase.auth.getUser();
      if (user.user?.id) {
        const { data: favs } = await supabase
          .from("tematica_favoritos")
          .select("obra_id")
          .eq("user_id", user.user.id);
        setFavoritos(new Set((favs ?? []).map((f: any) => f.obra_id)));
      }
    })();
  }, []);

  // Contagem de obras por habilidade (calculada sobre acervo completo, ignorando o filtro atual)
  const contagensHab = useMemo(() => {
    const map: Partial<Record<HabilidadeId, number>> = {};
    for (const o of obras) {
      const hs = ((o as any).habilidades ?? []) as string[];
      for (const h of hs) {
        if (isHabilidadeId(h)) map[h] = (map[h] ?? 0) + 1;
      }
    }
    return map;
  }, [obras]);

  const buscadas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    let base = obras;
    if (habilidade) {
      base = base.filter((o) =>
        (((o as any).habilidades ?? []) as string[]).includes(habilidade),
      );
    }
    if (!termo) return base;
    return base.filter((o) => {
      const alvo = `${o.titulo} ${o.titulo_original ?? ""}`.toLowerCase();
      return alvo.includes(termo);
    });
  }, [obras, busca, habilidade]);

  const filmes = useMemo(
    () => buscadas.filter((o) => o.tipo === "movie" && !(o.categorias_juridicas ?? []).includes("Documentário")),
    [buscadas]
  );
  const series = useMemo(
    () => buscadas.filter((o) => o.tipo === "tv" && !(o.categorias_juridicas ?? []).includes("Documentário")),
    [buscadas]
  );
  const documentarios = useMemo(
    () => buscadas.filter((o) => (o.categorias_juridicas ?? []).includes("Documentário")),
    [buscadas]
  );

  // Recomendados: mix aleatório 60% filmes, 30% séries, 10% docs. Prioriza destaques.
  const recomendados = useMemo(() => {
    const TOTAL = 18;
    const shuffle = <T,>(arr: T[]) => {
      const c = [...arr];
      for (let i = c.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [c[i], c[j]] = [c[j], c[i]];
      }
      return c;
    };
    const rankPool = (pool: Obra[]) => {
      const dest = shuffle(pool.filter((o) => destaques.has(o.id)));
      const rest = shuffle(pool.filter((o) => !destaques.has(o.id)));
      return [...dest, ...rest];
    };
    const pf = rankPool(filmes);
    const ps = rankPool(series);
    const pd = rankPool(documentarios);
    const nf = Math.round(TOTAL * 0.6);
    const ns = Math.round(TOTAL * 0.3);
    const nd = TOTAL - nf - ns;
    const pick: Obra[] = [
      ...pf.slice(0, nf),
      ...ps.slice(0, ns),
      ...pd.slice(0, nd),
    ];
    // se algum grupo não tiver o suficiente, completa com os outros pools
    const seen = new Set(pick.map((o) => o.id));
    if (pick.length < TOTAL) {
      const extras = shuffle([...pf, ...ps, ...pd]).filter((o) => !seen.has(o.id));
      pick.push(...extras.slice(0, TOTAL - pick.length));
    }
    return shuffle(pick);
  }, [filmes, series, documentarios, destaques]);

  // Modo "atalho" filtrado (mostra em grade)
  const listaAtalho = useMemo(() => {
    if (atalho === "todos") return null;
    if (atalho === "ranking") {
      return [...buscadas].sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0));
    }
    if (atalho === "favoritos") {
      return buscadas.filter((o) => favoritos.has(o.id));
    }
    if (atalho === "em_alta") {
      return [...buscadas].sort((a, b) => (ranking.get(b.id)?.score ?? 0) - (ranking.get(a.id)?.score ?? 0));
    }
    if (atalho === "comentados") {
      return [...buscadas].sort(
        (a, b) => (ranking.get(b.id)?.comentarios ?? 0) - (ranking.get(a.id)?.comentarios ?? 0)
      );
    }
    return null;
  }, [atalho, buscadas, favoritos, ranking]);

  // Top "Em alta" para faixa horizontal do topo (ranking real de engajamento; fallback: nota)
  const topEmAlta = useMemo(() => {
    const scored = buscadas
      .map((o) => ({ o, s: ranking.get(o.id)?.score ?? 0 }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.o);
    if (scored.length >= 4) return scored.slice(0, 12);
    // fallback quando ainda não há engajamento suficiente
    return [...buscadas]
      .sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0))
      .slice(0, 12);
  }, [buscadas, ranking]);


  const mobileHeader = (
    <PageHeader
      title="Temática Jurídica"
      subtitle="Filmes, séries e documentários para juristas"
      onBack={() => navigate(-1)}
    />
  );

  return (
    <DesktopPageLayout
      activeId="ferramentas"
      title="Temática Jurídica"
      subtitle="Filmes, séries e documentários para juristas"
      mobileHeader={mobileHeader}
    >
      <main className="min-h-dvh bg-background pb-[calc(96px+var(--sai-bottom,0px))]">
        <div className="max-w-3xl mx-auto w-full">
          {/* Painel cinema vermelho */}
          <CinemaPanel>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-red-200/70 z-10" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por título..."
                className="pl-9 h-11 rounded-xl bg-black/30 border-red-200/20 text-red-50 placeholder:text-red-200/50 backdrop-blur"
              />
            </div>
          </CinemaPanel>

          {/* Atalhos horizontais */}
          <div className="mt-5 mb-2 px-4 flex gap-2 overflow-x-auto scrollbar-none">
            {ATALHOS.map((a) => {
              const Icon = a.icon;
              const active = atalho === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setAtalho(a.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0",
                    active
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                  {a.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="px-4 pt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : listaAtalho ? (
            <>
              <div className="px-4 mt-5 mb-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-primary/90 font-bold">
                  {atalho === "ranking" && "TOP AVALIADOS"}
                  {atalho === "favoritos" && "SEUS FAVORITOS"}
                  {atalho === "em_alta" && "EM ALTA · ÚLTIMOS 7 DIAS"}
                  {atalho === "comentados" && "MAIS COMENTADOS"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-1 h-6 rounded-full bg-red-500" />
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                    {ATALHOS.find((a) => a.id === atalho)?.label}
                  </h2>
                </div>
              </div>

              {listaAtalho.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Film className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">
                    {atalho === "favoritos"
                      ? "Você ainda não favoritou nenhuma obra."
                      : "Nada por aqui ainda."}
                  </p>
                </div>
              ) : (
                <div className="px-4 flex flex-col gap-2.5">
                  {listaAtalho.map((obra, i) => {
                    const isDoc = (obra.categorias_juridicas ?? []).includes("Documentário");
                    const tipoLabel = isDoc ? "Doc" : obra.tipo === "movie" ? "Filme" : "Série";
                    const views = ranking.get(obra.id)?.views ?? 0;
                    const coments = ranking.get(obra.id)?.comentarios ?? 0;
                    return (
                      <motion.button
                        key={obra.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.025, 0.35) }}
                        onClick={() => setSelecionada(obra)}
                        className="group relative flex items-stretch gap-3 rounded-xl overflow-hidden bg-card border border-border/50 text-left hover:border-red-500/40 transition-colors"
                      >
                        {/* Posição no ranking */}
                        {(atalho === "ranking" || atalho === "em_alta" || atalho === "comentados") && (
                          <div className="shrink-0 w-8 flex items-center justify-center bg-gradient-to-b from-red-600/20 to-red-900/10">
                            <span className="text-lg font-black text-red-500/90 tabular-nums">
                              {i + 1}
                            </span>
                          </div>
                        )}

                        {/* Poster */}
                        <div className="shrink-0 w-16 aspect-[2/3] overflow-hidden bg-muted">
                          {obra.poster_url ? (
                            <img
                              src={obra.poster_url}
                              alt={obra.titulo}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center p-1"
                              style={{ background: "linear-gradient(135deg, hsl(0 55% 22%), hsl(355 65% 14%))" }}
                            >
                              <Film className="w-5 h-5 text-red-200/60" strokeWidth={1.5} />
                            </div>
                          )}
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0 py-2.5 pr-3 flex flex-col justify-center gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-red-600/15 text-red-500 text-[9px] font-bold uppercase tracking-wider">
                              {tipoLabel}
                            </span>
                            {obra.ano ? (
                              <span className="text-[11px] text-muted-foreground">{obra.ano}</span>
                            ) : null}
                          </div>
                          <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                            {obra.titulo}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                            {obra.nota ? (
                              <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                                <Star className="w-3 h-3 fill-amber-500" strokeWidth={0} />
                                {obra.nota.toFixed(1)}
                              </span>
                            ) : null}
                            {atalho === "em_alta" && views ? (
                              <span className="flex items-center gap-0.5 text-red-500 font-semibold">
                                <Flame className="w-3 h-3" strokeWidth={2} />
                                {views}
                              </span>
                            ) : null}
                            {atalho === "comentados" && coments ? (
                              <span className="flex items-center gap-0.5 font-semibold">
                                <MessageCircle className="w-3 h-3" strokeWidth={2} />
                                {coments}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Faixa "Em alta" no topo, só quando não há filtros ativos */}
              {!habilidade && !busca.trim() && <EmAltaFaixa obras={topEmAlta} onAbrir={setSelecionada} />}

              {/* Hero de habilidade selecionada */}
              {habilidade && (
                <HabilidadeHero
                  habilidade={HABILIDADES_MAP[habilidade]}
                  total={buscadas.length}
                  onLimpar={() => setHabilidade(null)}
                />
              )}

              {habilidade ? (
                buscadas.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground">
                    <Film className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Ainda não temos obras para essa habilidade.</p>
                  </div>
                ) : (
                  <div className="px-4 mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-6">
                    {buscadas.map((obra, i) => (
                      <motion.button
                        key={obra.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.4) }}
                        onClick={() => setSelecionada(obra)}
                        className="group text-left"
                      >
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted border border-border/50 group-hover:border-red-500/40 shadow-lg shadow-black/20 transition-colors">
                          {obra.poster_url ? (
                            <img
                              src={obra.poster_url}
                              alt={obra.titulo}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center"
                              style={{ background: "linear-gradient(135deg, hsl(0 55% 22%), hsl(355 65% 14%))" }}
                            >
                              <Film className="w-7 h-7 text-red-200/60" strokeWidth={1.5} />
                            </div>
                          )}
                          {obra.nota ? (
                            <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur text-amber-300 text-[10px] font-bold">
                              <Star className="w-2.5 h-2.5 fill-amber-400" strokeWidth={0} />
                              {obra.nota.toFixed(1)}
                            </div>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-[12px] font-semibold text-foreground leading-tight line-clamp-2">
                          {obra.titulo}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                )
              ) : (
                <>
                  <RecomendadosAutoCarousel obras={recomendados} onAbrir={setSelecionada} />
                  <ObrasCarousel
                    titulo="Filmes"
                    eyebrow="LONGAS-METRAGENS"
                    subtitulo="Clássicos e contemporâneos com temática jurídica"
                    obras={filmes}
                    onAbrir={setSelecionada}
                  />
                  <ObrasCarousel
                    titulo="Séries"
                    eyebrow="SEASONS"
                    subtitulo="Séries que exploram o universo do Direito"
                    obras={series}
                    onAbrir={setSelecionada}
                  />
                  <ObrasCarousel
                    titulo="Documentários"
                    eyebrow="REAL · INVESTIGATIVO"
                    subtitulo="Casos verdadeiros que marcaram a Justiça"
                    obras={documentarios}
                    onAbrir={setSelecionada}
                  />
                  <div className="h-8" />
                </>
              )}
            </>
          )}
        </div>

        <ObraDetailSheet
          obra={selecionada}
          open={!!selecionada}
          onClose={() => setSelecionada(null)}
        />

        {/* Barra flutuante de habilidades */}
        <HabilidadesFloatingBar
          ativa={habilidade}
          onChange={setHabilidade}
          contagens={contagensHab}
        />
      </main>
    </DesktopPageLayout>
  );
}

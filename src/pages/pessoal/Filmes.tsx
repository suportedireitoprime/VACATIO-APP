import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Film, ChevronRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import PessoalListLayout from "./PessoalListLayout";
import { supabase } from "@/integrations/supabase/client";
import { getCache, setCache } from "@/lib/pessoalCache";

type FavRow = { obra_id: string; created_at: string };
type Obra = {
  id: string;
  titulo: string;
  poster_url: string | null;
  categoria_juridica: string | null;
  tipo: string | null;
  ano: number | null;
};

const CK = "filmes";

export default function MeusFilmesPage() {
  const navigate = useNavigate();
  const cached = getCache<{ favs: FavRow[]; obras: Obra[] }>(CK);
  const [favs, setFavs] = useState<FavRow[]>(cached?.favs ?? []);
  const [obras, setObras] = useState<Obra[]>(cached?.obras ?? []);
  const [loading, setLoading] = useState(favs.length === 0);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    (async () => {
      const { data: favData } = await supabase
        .from("tematica_favoritos")
        .select("obra_id, created_at")
        .order("created_at", { ascending: false });
      const f = (favData ?? []) as any as FavRow[];
      setFavs(f);
      let o: Obra[] = [];
      if (f.length > 0) {
        const { data: obrasData } = await supabase
          .from("tematica_juridica_obras")
          .select("id, titulo, poster_url, categoria_juridica, tipo, ano")
          .in("id", f.map((r) => r.obra_id));
        o = (obrasData ?? []) as any;
        setObras(o);
      }
      setCache(CK, { favs: f, obras: o });
      setLoading(false);
    })();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const grupos = useMemo(() => {
    const byId = new Map(obras.map((o) => [o.id, o]));
    const ordered = favs.map((f) => byId.get(f.obra_id)).filter(Boolean) as Obra[];
    const m: Record<string, Obra[]> = { "Assistir depois": [] };
    for (const o of ordered) {
      const cat = o.categoria_juridica || "Sem categoria";
      (m[cat] ||= []).push(o);
      m["Assistir depois"].push(o);
    }
    if (m["Assistir depois"].length === 0) delete m["Assistir depois"];
    return m;
  }, [favs, obras]);

  const total = obras.length;

  return (
    <PessoalListLayout
      title="Meus filmes"
      count={total}
      icon={Film}
      accentClass="bg-rose-500/15 text-rose-500"
      loading={loading}
      isOffline={offline}
      emptyState={
        !loading && total === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Film className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Sua playlist de obras temáticas está vazia.</p>
            <p className="text-xs text-muted-foreground">Adicione filmes e séries na temática jurídica.</p>
          </div>
        ) : null
      }
    >
      {total > 0 && (
        <div className="space-y-6">
          {Object.entries(grupos).map(([cat, arr]) => (
            <section key={cat}>
              <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/85 backdrop-blur flex items-center justify-between">
                <h2 className="font-display text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                  {cat === "Assistir depois" && <Play className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />}
                  {cat} · {arr.length}
                </h2>
              </div>
              <div className="space-y-2 mt-2">
                {arr.map((o, i) => (
                  <motion.button
                    key={`${cat}-${o.id}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => navigate(`/tematica-juridica?obra=${o.id}`)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border text-left min-h-[72px]"
                  >
                    <div className="w-14 h-20 rounded-lg overflow-hidden shrink-0 bg-secondary">
                      {o.poster_url ? (
                        <img
                          src={o.poster_url}
                          alt={o.titulo}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-foreground truncate">{o.titulo}</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
                        {[o.tipo, o.ano].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </motion.button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PessoalListLayout>
  );
}

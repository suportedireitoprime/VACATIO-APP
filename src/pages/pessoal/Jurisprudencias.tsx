import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gavel, ChevronRight } from "lucide-react";
import PessoalListLayout from "./PessoalListLayout";
import { supabase } from "@/integrations/supabase/client";
import { getCache, setCache } from "@/lib/pessoalCache";

type Fav = {
  id: string;
  titulo: string | null;
  categoria: string | null;
  slug_local: string | null;
  numero_artigo: string | null;
  created_at: string;
};

const CK = "jurisprudencias";

export default function MinhasJurisprudenciasPage() {
  const navigate = useNavigate();
  const [favs, setFavs] = useState<Fav[]>(() => getCache<Fav[]>(CK) ?? []);
  const [loading, setLoading] = useState(favs.length === 0);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    (async () => {
      const { data } = await supabase
        .from("jurisprudencia_favoritos")
        .select("id, titulo, categoria, slug_local, numero_artigo, created_at")
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as any as Fav[];
      setFavs(rows);
      setCache(CK, rows);
      setLoading(false);
    })();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <PessoalListLayout
      title="Minhas jurisprudências"
      count={favs.length}
      icon={Gavel}
      isOffline={offline}
      loading={loading}
      emptyState={
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Você ainda não favoritou nenhuma jurisprudência. Toque no coração dentro de uma decisão para salvá-la aqui.
        </div>
      }
    >
      {favs.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-secondary/30 divide-y divide-border/50 overflow-hidden">
          {favs.map((f) => (
            <button
              key={f.id}
              onClick={() => navigate(f.slug_local ? `/jurisprudencia/${f.slug_local}` : "/jurisprudencia")}
              className="w-full flex items-center gap-3 px-4 py-3 min-h-[64px] text-left hover:bg-secondary/60 active:bg-secondary transition"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
                <Gavel className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-body text-sm font-semibold text-foreground truncate">
                  {f.titulo || "Jurisprudência"}
                </div>
                {(f.categoria || f.numero_artigo) && (
                  <div className="text-xs text-muted-foreground truncate">
                    {[f.categoria, f.numero_artigo && `Art. ${f.numero_artigo}`].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </PessoalListLayout>
  );
}

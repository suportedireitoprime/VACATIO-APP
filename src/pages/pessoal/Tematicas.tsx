import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Film, ChevronRight } from "lucide-react";
import PessoalListLayout from "./PessoalListLayout";
import { supabase } from "@/integrations/supabase/client";
import { getCache, setCache } from "@/lib/pessoalCache";

type Obra = {
  id: string;
  titulo: string;
  poster_url: string | null;
  tipo: string | null;
  ano: number | null;
  categorias_juridicas: string[] | null;
};

const CK = "tematicas";

export default function MinhasTematicasPage() {
  const navigate = useNavigate();
  const [obras, setObras] = useState<Obra[]>(() => getCache<Obra[]>(CK) ?? []);
  const [loading, setLoading] = useState(obras.length === 0);
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
      const favs = (favData ?? []) as any[];
      let rows: Obra[] = [];
      if (favs.length > 0) {
        const { data: obrasData } = await supabase
          .from("tematica_juridica_obras")
          .select("id, titulo, poster_url, tipo, ano, categorias_juridicas")
          .in("id", favs.map((r) => r.obra_id));
        const map = new Map<string, Obra>();
        for (const o of (obrasData ?? []) as Obra[]) map.set(o.id, o);
        rows = favs.map((f) => map.get(f.obra_id)).filter(Boolean) as Obra[];
      }
      setObras(rows);
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
      title="Minhas temáticas"
      count={obras.length}
      icon={Film}
      isOffline={offline}
      loading={loading}
      emptyState={
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma obra temática favoritada ainda. Toque no coração dentro de um filme ou série jurídica para salvar aqui.
        </div>
      }
    >
      {obras.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {obras.map((o) => (
            <button
              key={o.id}
              onClick={() => navigate(`/tematica-juridica/${o.id}`)}
              className="text-left rounded-2xl overflow-hidden border border-border/60 bg-secondary/30 hover:bg-secondary/60 active:scale-[0.98] transition"
            >
              <div className="aspect-[2/3] bg-secondary overflow-hidden">
                {o.poster_url ? (
                  <img src={o.poster_url} alt={o.titulo} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Film className="w-10 h-10" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="font-body text-sm font-semibold text-foreground truncate">{o.titulo}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[o.tipo, o.ano].filter(Boolean).join(" · ")}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </PessoalListLayout>
  );
}

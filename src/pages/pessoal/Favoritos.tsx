import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ChevronRight, Bookmark } from "lucide-react";
import { PageHeader } from "@/components/vademecum/PageHeader";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getLeiByTabela } from "@/data/leisCatalog";
import { tipoToSlug, leiToSlug } from "@/lib/legislacaoSlugs";

type Favorito = {
  id: string;
  tabela_codigo: string;
  numero_artigo: string;
  created_at: string;
};

const FavoritosPage = () => {
  const navigate = useNavigate();
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("artigos_favoritos")
        .select("id, tabela_codigo, numero_artigo, created_at")
        .order("created_at", { ascending: false });
      setFavoritos((data || []) as any);
      setLoading(false);
    })();
  }, []);

  const abrir = (f: Favorito) => {
    const lei = getLeiByTabela(f.tabela_codigo);
    if (!lei) return;
    const url = `/legislacao/${tipoToSlug(lei.tipo)}/${leiToSlug(lei)}/${encodeURIComponent(f.numero_artigo)}`;
    navigate(url);
  };

  // Group by lei
  const grupos: Record<string, Favorito[]> = {};
  for (const f of favoritos) (grupos[f.tabela_codigo] ||= []).push(f);

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      <PageHeader
        title="Meus Favoritos"
        onBack={() => navigate(-1)}
        leading={
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Bookmark className="w-5 h-5 text-primary" />
          </div>
        }
      />

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : favoritos.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Bookmark className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Você ainda não favoritou nada.</p>
            <p className="text-xs text-muted-foreground">Ao ler um artigo, toque no ícone de salvar para adicioná-lo aqui.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grupos).map(([tabela, itens]) => {
              const lei = getLeiByTabela(tabela);
              return (
                <div key={tabela} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      {lei?.sigla || tabela}
                    </span>
                    <span className="text-[11px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5 font-semibold">{itens.length}</span>
                  </div>
                  {itens.map((f) => {
                    return (
                      <motion.button
                        key={f.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => abrir(f)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-yellow-400">Art.</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">Art. {f.numero_artigo}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritosPage;

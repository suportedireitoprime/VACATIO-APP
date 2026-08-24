import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Loader2, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/vademecum/PageHeader";
import { motion } from "framer-motion";
import { getLeiByTabela } from "@/data/leisCatalog";
import { tipoToSlug, leiToSlug } from "@/lib/legislacaoSlugs";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getCache } from "@/lib/pessoalCache";
import { fetchPessoalArtigos, PESSOAL_KEYS } from "@/services/pessoalPrefetch";

type Fav = {
  id: string;
  tabela_codigo: string;
  numero_artigo: string;
  conteudo_preview: string | null;
  created_at: string;
};

const ArtigosPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initial = getCache<Fav[]>("artigos") ?? undefined;
  const { data: favs = [], isLoading } = useQuery({
    queryKey: PESSOAL_KEYS.artigos(user?.id ?? "anon"),
    queryFn: fetchPessoalArtigos,
    enabled: !!user?.id,
    staleTime: 60_000,
    initialData: initial as Fav[] | undefined,
  });
  const loading = isLoading && !initial;


  const abrir = (f: Fav) => {
    const lei = getLeiByTabela(f.tabela_codigo);
    if (!lei) return;
    const url = `/legislacao/${tipoToSlug(lei.tipo)}/${leiToSlug(lei)}/${encodeURIComponent(f.numero_artigo)}`;
    navigate(url);
  };

  const grupos: Record<string, Fav[]> = {};
  for (const f of favs) (grupos[f.tabela_codigo] ||= []).push(f);

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      <PageHeader
        title="Meus artigos"
        onBack={() => navigate(-1)}
        leading={
          <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
          </div>
        }
      />


      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : favs.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Você ainda não favoritou nenhum artigo.</p>
            <p className="text-xs text-muted-foreground">Toque no coração em qualquer artigo para salvá-lo aqui.</p>
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
                  {itens.map((f) => (
                    <motion.button
                      key={f.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => abrir(f)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
                        <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">Art. {f.numero_artigo}</p>
                        {f.conteudo_preview && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{f.conteudo_preview}</p>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </motion.button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtigosPage;

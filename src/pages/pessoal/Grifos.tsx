import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Highlighter, Loader2, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/vademecum/PageHeader";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getLeiByTabela } from "@/data/leisCatalog";
import { tipoToSlug, leiToSlug } from "@/lib/legislacaoSlugs";

type Grifo = {
  id: string;
  tabela_codigo: string;
  numero_artigo: string;
  highlights: any;
  updated_at: string;
};

const GrifosPage = () => {
  const navigate = useNavigate();
  const [grifos, setGrifos] = useState<Grifo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("artigos_grifos")
        .select("id, tabela_codigo, numero_artigo, highlights, updated_at")
        .order("updated_at", { ascending: false });
      setGrifos((data || []) as any);
      setLoading(false);
    })();
  }, []);

  const abrir = (g: Grifo) => {
    const lei = getLeiByTabela(g.tabela_codigo);
    if (!lei) return;
    const url = `/legislacao/${tipoToSlug(lei.tipo)}/${leiToSlug(lei)}/${encodeURIComponent(g.numero_artigo)}`;
    navigate(url);
  };

  // Group by lei
  const grupos: Record<string, Grifo[]> = {};
  for (const g of grifos) (grupos[g.tabela_codigo] ||= []).push(g);

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      <PageHeader
        title="Meus grifos"
        onBack={() => navigate(-1)}
        leading={
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Highlighter className="w-5 h-5 text-primary" />
          </div>
        }
      />


      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : grifos.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Highlighter className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Você ainda não grifou nada.</p>
            <p className="text-xs text-muted-foreground">Ao ler um artigo, selecione o texto para destacar.</p>
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
                  {itens.map((g) => {
                    const hl = Array.isArray(g.highlights) ? g.highlights : [];
                    const preview = hl.find((h: any) => h?.text)?.text || "Grifo salvo";
                    return (
                      <motion.button
                        key={g.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => abrir(g)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-yellow-400">Art.</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">Art. {g.numero_artigo}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">"{preview}"</p>
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

export default GrifosPage;

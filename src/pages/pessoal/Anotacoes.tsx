import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StickyNote, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import PessoalListLayout from "./PessoalListLayout";
import { supabase } from "@/integrations/supabase/client";
import { getCache, setCache } from "@/lib/pessoalCache";
import { getLeiByTabela } from "@/data/leisCatalog";
import { tipoToSlug, leiToSlug } from "@/lib/legislacaoSlugs";

type Anot = {
  id: string;
  tabela_codigo: string;
  numero_artigo: string;
  anotacao: string | null;
  updated_at: string;
};

const CK = "anotacoes";

export default function AnotacoesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Anot[]>(() => getCache<Anot[]>(CK) ?? []);
  const [loading, setLoading] = useState(items.length === 0);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    (async () => {
      const { data, error } = await supabase
        .from("artigos_anotacoes")
        .select("id, tabela_codigo, numero_artigo, anotacao, updated_at")
        .order("updated_at", { ascending: false });
      if (!error && data) {
        setItems(data as any);
        setCache(CK, data);
      }
      setLoading(false);
    })();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const grupos = useMemo(() => {
    const m: Record<string, Anot[]> = {};
    for (const a of items) (m[a.tabela_codigo] ||= []).push(a);
    return m;
  }, [items]);

  const abrir = (a: Anot) => {
    const lei = getLeiByTabela(a.tabela_codigo);
    if (!lei) return;
    navigate(`/legislacao/${tipoToSlug(lei.tipo)}/${leiToSlug(lei)}/${encodeURIComponent(a.numero_artigo)}`);
  };

  return (
    <PessoalListLayout
      title="Minhas anotações"
      count={items.length}
      icon={StickyNote}
      accentClass="bg-amber-500/15 text-amber-500"
      loading={loading}
      isOffline={offline}
      emptyState={
        !loading && items.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <StickyNote className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhuma anotação ainda.</p>
            <p className="text-xs text-muted-foreground">Toque no ícone de anotação em qualquer artigo para começar.</p>
          </div>
        ) : null
      }
    >
      {items.length > 0 && (
        <div className="space-y-6">
          {Object.entries(grupos).map(([tabela, arr]) => {
            const lei = getLeiByTabela(tabela);
            return (
              <section key={tabela}>
                <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/85 backdrop-blur">
                  <h2 className="font-display text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    {lei?.nome || tabela} · {arr.length}
                  </h2>
                </div>
                <div className="space-y-2 mt-2">
                  {arr.map((a, i) => (
                    <motion.button
                      key={a.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => abrir(a)}
                      className="w-full flex items-start gap-3 p-3.5 rounded-2xl bg-card border border-border text-left"
                    >
                      <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                        <StickyNote className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">Art. {a.numero_artigo}</p>
                        {a.anotacao && (
                          <p className="text-[13px] text-muted-foreground leading-relaxed mt-1 line-clamp-3">
                            {a.anotacao}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/70 mt-2 uppercase tracking-wider">
                          {new Date(a.updated_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
                    </motion.button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </PessoalListLayout>
  );
}

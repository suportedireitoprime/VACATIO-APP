import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Highlighter, Loader2, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/vademecum/PageHeader";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getLeiByTabela } from "@/data/leisCatalog";
import { tipoToSlug, leiToSlug } from "@/lib/legislacaoSlugs";
import { getCache } from "@/lib/pessoalCache";
import { listArtigosGrifos, ARTIGOS_GRIFOS_EVENT, type ArtigoGrifoRecord } from "@/lib/artigosGrifos";

const GrifosPage = ({ onClose }: { onClose?: () => void }) => {
  const navigate = useNavigate();
  const [grifos, setGrifos] = useState<ArtigoGrifoRecord[]>(() => {
    const cached = getCache<ArtigoGrifoRecord[]>("grifos");
    return Array.isArray(cached) ? cached.filter(g => Array.isArray(g.highlights) && g.highlights.length > 0) : [];
  });
  const [loading, setLoading] = useState(grifos.length === 0);

  const loadData = useCallback(async () => {
    try {
      const rows = await listArtigosGrifos();
      setGrifos(rows);
    } catch (err) {
      console.warn("Erro ao carregar grifos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // 1. Escuta eventos locais e entre abas em tempo real
    const onEvent = () => loadData();
    window.addEventListener(ARTIGOS_GRIFOS_EVENT, onEvent);
    window.addEventListener("storage", onEvent);

    // 2. Canal Supabase Realtime para sincronização instantânea
    const channel = supabase
      .channel("pessoal_artigos_grifos_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "artigos_grifos" },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener(ARTIGOS_GRIFOS_EVENT, onEvent);
      window.removeEventListener("storage", onEvent);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const abrir = (g: ArtigoGrifoRecord) => {
    const lei = getLeiByTabela(g.tabela_codigo);
    if (!lei) return;
    const url = `/legislacao/${tipoToSlug(lei.tipo)}/${leiToSlug(lei)}/${encodeURIComponent(g.numero_artigo)}`;
    navigate(url);
  };

  // Group by lei
  const grupos: Record<string, ArtigoGrifoRecord[]> = {};
  for (const g of grifos) {
    if (Array.isArray(g.highlights) && g.highlights.length > 0) {
      (grupos[g.tabela_codigo] ||= []).push(g);
    }
  }

  return (
    <div className={onClose ? "pb-[calc(2.5rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))]" : "min-h-dvh bg-background text-foreground pb-[calc(7.5rem+var(--sai-bottom,env(safe-area-inset-bottom,0px))+var(--active-mini-player-offset,0px))]"}>
      <PageHeader
        title="Meus grifos"
        onBack={onClose || (() => navigate(-1))}
        leading={
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Highlighter className="w-5 h-5 text-primary" />
          </div>
        }
      />

      <div className="max-w-2xl mx-auto px-4 py-4 pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(grupos).length === 0 ? (
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
                      {lei?.sigla || lei?.nome || tabela.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5 font-semibold">
                      {itens.length}
                    </span>
                  </div>
                  {itens.map((g) => {
                    const hl = Array.isArray(g.highlights) ? g.highlights : [];
                    const firstHl = hl.find((h) => h?.text || h?.trechoExato);
                    const preview = firstHl?.text || firstHl?.trechoExato || "Grifo salvo";
                    const cor = firstHl?.color || firstHl?.cor || "rgba(234, 179, 8, 0.55)";

                    return (
                      <motion.button
                        key={g.id || `${g.tabela_codigo}::${g.numero_artigo}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => abrir(g)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-all text-left"
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
                          style={{ backgroundColor: cor }}
                        >
                          <span className="text-xs font-bold text-white drop-shadow-sm">Art.</span>
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

      {/* FAB para Anotações */}
      <button
        onClick={() => navigate('/pessoal/anotacoes')}
        className="fixed bottom-[calc(var(--sai-bottom,env(safe-area-inset-bottom,0px))+5.5rem)] right-[calc(var(--sai-right,env(safe-area-inset-right,0px))+1.25rem)] z-40 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.55)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Minhas Anotações"
      >
        <div className="absolute inset-0 rounded-full bg-white/20" />
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sticky-note relative z-10"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/></svg>
      </button>
    </div>
  );
};

export default GrifosPage;

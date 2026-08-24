import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Heart, ChevronRight, ArrowUpRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  ARTIGOS_FAV_EVENT,
  listArtigosFavoritosByTabela,
  type ArtigoFav,
} from "@/lib/artigosFavoritos";
import { tipoToSlug, leiToSlug } from "@/lib/legislacaoSlugs";
import type { LeiFavorita } from "@/lib/leisFavoritos";
import { getLeiByTabela, LEIS_CATALOG } from "@/data/leisCatalog";

interface Props {
  lei: LeiFavorita | null;
  onClose: () => void;
}

export default function LeiFavoritaArtigosSheet({ lei, onClose }: Props) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Array<ArtigoFav & { created_at?: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lei) return;
    let cancel = false;
    setLoading(true);
    listArtigosFavoritosByTabela(lei.tabela_nome)
      .then((r) => { if (!cancel) setRows(r); })
      .finally(() => { if (!cancel) setLoading(false); });
    const refresh = () => {
      listArtigosFavoritosByTabela(lei.tabela_nome).then((r) => { if (!cancel) setRows(r); });
    };
    window.addEventListener(ARTIGOS_FAV_EVENT, refresh);
    return () => { cancel = true; window.removeEventListener(ARTIGOS_FAV_EVENT, refresh); };
  }, [lei?.tabela_nome]);

  const abrirLei = () => {
    if (!lei) return;
    const cat = getLeiByTabela(lei.tabela_nome) ?? LEIS_CATALOG.find((l) => l.id === lei.leiId);
    if (!cat) return;
    onClose();
    navigate(`/legislacao/${tipoToSlug(cat.tipo)}/${leiToSlug(cat)}`);
  };

  const abrirArtigo = (numero: string) => {
    if (!lei) return;
    const cat = getLeiByTabela(lei.tabela_nome) ?? LEIS_CATALOG.find((l) => l.id === lei.leiId);
    if (!cat) return;
    onClose();
    navigate(`/legislacao/${tipoToSlug(cat.tipo)}/${leiToSlug(cat)}/${encodeURIComponent(numero)}`);
  };

  return (
    <Sheet open={!!lei} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="bottom"
        className="z-[9999] flex flex-col gap-0 overflow-hidden rounded-t-3xl border-t border-white/5 bg-[#0f0f0f] p-0 [&>button:last-child]:hidden h-[90dvh]"
      >
        <div className="shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pt-2 pb-4 border-b border-white/5">
          <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-primary/80">
            Artigos favoritados
          </p>
          <h2 className="font-display text-white text-xl font-bold uppercase tracking-wide leading-tight mt-1 truncate">
            {lei?.nome}
          </h2>
          {lei?.descricao && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lei.descricao}</p>
          )}
          <button
            type="button"
            onClick={abrirLei}
            className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-primary/15 text-primary text-[11px] font-semibold hover:bg-primary/25 transition"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Abrir lei completa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Heart className="w-12 h-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">Você ainda não favoritou artigos desta lei.</p>
              <p className="text-xs text-muted-foreground">
                Abra a lei e toque no coração dentro do artigo.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((r, i) => (
                <motion.button
                  key={`${r.tabela_codigo}-${r.numero_artigo}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 12) * 0.02 }}
                  onClick={() => abrirArtigo(r.numero_artigo)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
                    <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Art. {r.numero_artigo}</p>
                    {r.conteudo_preview && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {r.conteudo_preview}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

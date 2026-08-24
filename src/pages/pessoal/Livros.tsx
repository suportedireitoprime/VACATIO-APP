import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronRight, BookMarked, CheckCircle2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import PessoalListLayout from "./PessoalListLayout";
import { supabase } from "@/integrations/supabase/client";
import { getCache, setCache } from "@/lib/pessoalCache";

type Fav = { id: string; livro_key: string; categoria: string | null; created_at: string };
type Prog = { livro_key: string; percentual: number | null; updated_at: string };

const CK = "livros";

export default function MeusLivrosPage() {
  const navigate = useNavigate();
  const [favs, setFavs] = useState<Fav[]>(() => getCache<{ favs: Fav[]; prog: Prog[] }>(CK)?.favs ?? []);
  const [prog, setProg] = useState<Prog[]>(() => getCache<{ favs: Fav[]; prog: Prog[] }>(CK)?.prog ?? []);
  const [loading, setLoading] = useState(favs.length === 0);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    (async () => {
      const [fRes, pRes] = await Promise.all([
        supabase.from("biblioteca_favoritos").select("id, livro_key, categoria, created_at").order("created_at", { ascending: false }),
        supabase.from("biblioteca_leitura_progresso").select("livro_key, percentual, updated_at").order("updated_at", { ascending: false }),
      ]);
      const f = (fRes.data ?? []) as any;
      const p = (pRes.data ?? []) as any;
      setFavs(f);
      setProg(p);
      setCache(CK, { favs: f, prog: p });
      setLoading(false);
    })();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const { lendo, concluidos, favoritos } = useMemo(() => {
    const progMap = new Map<string, Prog>();
    for (const p of prog) if (!progMap.has(p.livro_key)) progMap.set(p.livro_key, p);
    const favKeys = new Set(favs.map((f) => f.livro_key));

    const lendo: Array<{ key: string; pct: number; categoria?: string | null }> = [];
    const concluidos: Array<{ key: string; categoria?: string | null }> = [];
    for (const p of prog) {
      const pct = Math.round(p.percentual ?? 0);
      const fav = favs.find((f) => f.livro_key === p.livro_key);
      if (pct >= 95) concluidos.push({ key: p.livro_key, categoria: fav?.categoria });
      else if (pct > 0) lendo.push({ key: p.livro_key, pct, categoria: fav?.categoria });
    }
    const favoritos = favs.filter((f) => !progMap.has(f.livro_key) || (progMap.get(f.livro_key)!.percentual ?? 0) === 0);
    return { lendo, concluidos, favoritos };
  }, [favs, prog]);

  const nice = (k: string) => k.replace(/[-_]+/g, " ").replace(/\.pdf$/i, "").trim();

  const Section = ({
    title,
    icon: Icon,
    accent,
    items,
  }: {
    title: string;
    icon: any;
    accent: string;
    items: Array<{ key: string; pct?: number; categoria?: string | null }>;
  }) =>
    items.length === 0 ? null : (
      <section>
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/85 backdrop-blur">
          <h2 className="font-display text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
            <Icon className={`w-3.5 h-3.5 ${accent}`} /> {title} · {items.length}
          </h2>
        </div>
        <div className="space-y-2 mt-2">
          {items.map((it, i) => (
            <motion.button
              key={it.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => navigate(`/biblioteca?livro=${encodeURIComponent(it.key)}`)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border text-left min-h-[68px]"
            >
              <div className="w-11 h-14 rounded-lg bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shrink-0 shadow">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-foreground truncate capitalize">{nice(it.key)}</p>
                {it.categoria && (
                  <p className="text-[11px] text-muted-foreground truncate uppercase tracking-wider">{it.categoria}</p>
                )}
                {typeof it.pct === "number" && (
                  <div className="mt-2 h-1 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${it.pct}%` }} />
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </motion.button>
          ))}
        </div>
      </section>
    );

  const total = lendo.length + concluidos.length + favoritos.length;

  return (
    <PessoalListLayout
      title="Meus livros"
      count={total}
      icon={BookOpen}
      accentClass="bg-primary/15 text-primary"
      loading={loading}
      isOffline={offline}
      emptyState={
        !loading && total === 0 ? (
          <div className="text-center py-20 space-y-3">
            <BookMarked className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum livro salvo ainda.</p>
            <p className="text-xs text-muted-foreground">Favorite ou comece a ler para acompanhar aqui.</p>
          </div>
        ) : null
      }
    >
      {total > 0 && (
        <div className="space-y-6">
          <Section title="Lendo agora" icon={BookOpen} accent="text-primary" items={lendo.map((l) => ({ key: l.key, pct: l.pct, categoria: l.categoria }))} />
          <Section title="Favoritos" icon={Sparkles} accent="text-amber-500" items={favoritos.map((f) => ({ key: f.livro_key, categoria: f.categoria }))} />
          <Section title="Concluídos" icon={CheckCircle2} accent="text-emerald-500" items={concluidos.map((c) => ({ key: c.key, categoria: c.categoria }))} />
        </div>
      )}
    </PessoalListLayout>
  );
}

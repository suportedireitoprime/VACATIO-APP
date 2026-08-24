import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Search,
  BookOpen,
  Scale,
  Gavel,
  FileText,
  Landmark,
  Scroll,
  Building2,
  Shield,
  Users,
  Briefcase,
  Vote,
  Globe,
  Leaf,
  HeartHandshake,
  ClipboardList,
} from "lucide-react";
import { PageHeader } from "@/components/vademecum/PageHeader";
import { Input } from "@/components/ui/input";
import ResumoJuridicoReaderSheet, { ResumoRow } from "@/components/resumos-juridicos/ResumoJuridicoReaderSheet";

type Row = { tema: string; ordem_tema: number | null; total: number };

// ---- Cache em memória entre navegações ----
const temasCache = new Map<string, Row[]>();
const subtemasCache = new Map<string, ResumoRow[]>();

// Ícones rotativos por tema (para dar identidade visual no lado esquerdo)
const TEMA_ICONS = [
  BookOpen,
  Scale,
  Gavel,
  FileText,
  Landmark,
  Scroll,
  Building2,
  Shield,
  Users,
  Briefcase,
  Vote,
  Globe,
  Leaf,
  HeartHandshake,
  ClipboardList,
];

const TEMA_COLORS = [
  { bg: "bg-amber-500/15 ring-1 ring-amber-400/30", text: "text-amber-300" },
  { bg: "bg-cyan-500/15 ring-1 ring-cyan-400/30", text: "text-cyan-300" },
  { bg: "bg-emerald-500/15 ring-1 ring-emerald-400/30", text: "text-emerald-300" },
  { bg: "bg-violet-500/15 ring-1 ring-violet-400/30", text: "text-violet-300" },
  { bg: "bg-rose-500/15 ring-1 ring-rose-400/30", text: "text-rose-300" },
  { bg: "bg-sky-500/15 ring-1 ring-sky-400/30", text: "text-sky-300" },
  { bg: "bg-orange-500/15 ring-1 ring-orange-400/30", text: "text-orange-300" },
  { bg: "bg-pink-500/15 ring-1 ring-pink-400/30", text: "text-pink-300" },
];

function hashIdx(str: string, mod: number) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % mod;
}

export default function ResumosJuridicosTemas() {
  const { area } = useParams<{ area: string }>();
  const decodedArea = decodeURIComponent(area || "");
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>(() => temasCache.get(decodedArea) || []);
  const [loading, setLoading] = useState(!temasCache.has(decodedArea));
  const [q, setQ] = useState("");

  const [openTema, setOpenTema] = useState<string | null>(null);
  const [subtemas, setSubtemas] = useState<ResumoRow[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [selected, setSelected] = useState<ResumoRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (temasCache.has(decodedArea)) {
        setRows(temasCache.get(decodedArea)!);
        setLoading(false);
        return;
      }
      setLoading(true);
      const map = new Map<string, { ordem: number | null; total: number }>();
      let from = 0;
      const step = 1000;
      let gotAny = false;
      while (true) {
        const { data, error } = await (supabase as any)
          .from("resumos_juridicos")
          .select("tema, ordem_tema")
          .eq("area", decodedArea)
          .range(from, from + step - 1);
        if (error) break;
        if (!data || data.length === 0) break;
        gotAny = true;
        for (const r of data as { tema: string; ordem_tema: number | null }[]) {
          const prev = map.get(r.tema);
          map.set(r.tema, {
            ordem: prev?.ordem ?? r.ordem_tema,
            total: (prev?.total || 0) + 1,
          });
        }
        if (data.length < step) break;
        from += step;
      }
      if (!gotAny) {
        const { bundle } = await import("@/services/offlineBundle");
        const rows = await bundle.resumos<{ area: string; tema: string; ordem_tema: number | null }>();
        for (const r of rows) {
          if (r.area !== decodedArea) continue;
          const prev = map.get(r.tema);
          map.set(r.tema, {
            ordem: prev?.ordem ?? r.ordem_tema,
            total: (prev?.total || 0) + 1,
          });
        }
      }
      const list = Array.from(map.entries())
        .map(([tema, v]) => ({ tema, ordem_tema: v.ordem, total: v.total }))
        .sort((a, b) => {
          if (a.ordem_tema != null && b.ordem_tema != null) return a.ordem_tema - b.ordem_tema;
          if (a.ordem_tema != null) return -1;
          if (b.ordem_tema != null) return 1;
          return a.tema.localeCompare(b.tema);
        });
      if (cancelled) return;
      temasCache.set(decodedArea, list);
      setRows(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [decodedArea]);

  const filtered = useMemo(
    () => rows.filter((r) => r.tema.toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  const openSubtemas = async (tema: string) => {
    setOpenTema(tema);
    const key = `${decodedArea}::${tema}`;
    if (subtemasCache.has(key)) {
      setSubtemas(subtemasCache.get(key)!);
      setSubLoading(false);
      return;
    }
    setSubLoading(true);
    setSubtemas([]);
    const { data } = await (supabase as any)
      .from("resumos_juridicos")
      .select("id, area, tema, subtema, ordem_subtema, markdown, exemplos, termos")
      .eq("area", decodedArea)
      .eq("tema", tema)
      .order("ordem_subtema", { ascending: true, nullsFirst: false })
      .order("subtema", { ascending: true })
      .limit(5000);
    let list = (data || []) as ResumoRow[];
    if (list.length === 0) {
      const { bundle } = await import("@/services/offlineBundle");
      const all = await bundle.resumos<ResumoRow>();
      list = all
        .filter((r) => r.area === decodedArea && r.tema === tema)
        .sort((a, b) => (a.ordem_subtema ?? 9999) - (b.ordem_subtema ?? 9999));
    }
    subtemasCache.set(key, list);
    setSubtemas(list);
    setSubLoading(false);
  };

  const closeSubtemas = () => {
    setOpenTema(null);
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <PageHeader
          title={decodedArea}
          subtitle="Área"
          onBack={() => navigate("/resumos-juridicos")}
          className="border-b-0"
        />

        <div className="max-w-5xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar tema" className="pl-9" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((r, i) => {
              const Icon = TEMA_ICONS[hashIdx(r.tema, TEMA_ICONS.length)];
              const c = TEMA_COLORS[hashIdx(r.tema, TEMA_COLORS.length)];
              return (
                <motion.button
                  key={r.tema}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.25) }}
                  onClick={() => openSubtemas(r.tema)}
                  className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all text-left"
                >
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${c.bg}`}>
                    <Icon className={`w-5 h-5 ${c.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-body font-semibold text-foreground break-words">{r.tema}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {r.total} {r.total === 1 ? "subtema" : "subtemas"}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom sheet: subtemas do tema selecionado */}
      <AnimatePresence>
        {openTema && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={closeSubtemas}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed left-0 right-0 bottom-0 z-[70] bg-card border-t border-border rounded-t-2xl flex flex-col max-h-[88vh] pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))]"
            >
              <div className="flex items-center justify-center pt-2 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="flex items-center gap-3 px-4 pb-3 shrink-0 border-b border-border">
                <button
                  onClick={closeSubtemas}
                  aria-label="Fechar"
                  className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground break-words">
                    {decodedArea}
                  </p>
                  <h2 className="font-display text-base font-bold leading-tight break-words">{openTema}</h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                {subLoading ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
                  </div>
                ) : subtemas.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">Nenhum subtema.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {subtemas.map((r, i) => {
                      const Icon = TEMA_ICONS[hashIdx(r.subtema || String(i), TEMA_ICONS.length)];
                      const c = TEMA_COLORS[hashIdx(r.subtema || String(i), TEMA_COLORS.length)];
                      return (
                        <motion.button
                          key={r.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.01, 0.2) }}
                          onClick={() => {
                            setSelected(r);
                            setOpenTema(null);
                          }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border hover:border-primary/40 transition-all text-left"
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.bg}`}>
                            <Icon className={`w-5 h-5 ${c.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-body text-foreground break-words">
                              {r.subtema || "(sem título)"}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ResumoJuridicoReaderSheet resumo={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

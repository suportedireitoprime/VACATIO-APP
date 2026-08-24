import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Loader2,
  NotebookText,
  Search,
  Landmark,
  Leaf,
  Users,
  Building2,
  Scale,
  Trophy,
  Briefcase,
  Vote,
  Globe,
  Gavel,
  Shield,
  HeartPulse,
  Receipt,
  Baby,
  Car,
  Home,
  ScrollText,
  Wallet,
  Handshake,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/vademecum/PageHeader";
import { Input } from "@/components/ui/input";

type AreaRow = { area: string; total: number };

// Ícone e cor (hex) por área — inline style para evitar purge do Tailwind
const AREA_STYLE: Record<string, { icon: any; color: string }> = {
  administrativo: { icon: Landmark, color: "#38bdf8" },      // sky
  ambiental: { icon: Leaf, color: "#34d399" },               // emerald
  civil: { icon: Users, color: "#60a5fa" },                  // blue
  concorrencial: { icon: Building2, color: "#22d3ee" },      // cyan
  constitucional: { icon: Scale, color: "#fbbf24" },         // amber
  desportivo: { icon: Trophy, color: "#fb923c" },            // orange
  trabalho: { icon: Briefcase, color: "#fb7185" },           // rose
  eleitoral: { icon: Vote, color: "#a78bfa" },               // violet
  internacional: { icon: Globe, color: "#2dd4bf" },          // teal
  penal: { icon: Gavel, color: "#f87171" },                  // red
  processo: { icon: ScrollText, color: "#818cf8" },          // indigo
  processual: { icon: ScrollText, color: "#818cf8" },
  previdenciario: { icon: Shield, color: "#facc15" },        // yellow
  tributario: { icon: Receipt, color: "#a3e635" },           // lime
  empresarial: { icon: Building2, color: "#e879f9" },        // fuchsia
  consumidor: { icon: Wallet, color: "#f472b6" },            // pink
  familia: { icon: Baby, color: "#f472b6" },
  transito: { icon: Car, color: "#fb923c" },
  imobiliario: { icon: Home, color: "#fbbf24" },
  saude: { icon: HeartPulse, color: "#fb7185" },
  humanos: { icon: Handshake, color: "#34d399" },
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function styleForArea(area: string) {
  const n = normalize(area);
  for (const key of Object.keys(AREA_STYLE)) {
    if (n.includes(key)) return AREA_STYLE[key];
  }
  return { icon: FileText, color: "#e5c34a" };
}

let areasCache: AreaRow[] | null = null;

export default function ResumosJuridicosAreas() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AreaRow[]>(() => areasCache || []);
  const [loading, setLoading] = useState(!areasCache);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (areasCache) return;
    (async () => {
      setLoading(true);
      const map = new Map<string, number>();
      let from = 0;
      const step = 1000;
      let gotAny = false;
      while (true) {
        const { data, error } = await (supabase as any)
          .from("resumos_juridicos")
          .select("area")
          .not("area", "is", null)
          .range(from, from + step - 1);
        if (error) break;
        if (!data || data.length === 0) break;
        gotAny = true;
        for (const r of data as { area: string }[]) {
          map.set(r.area, (map.get(r.area) || 0) + 1);
        }
        if (data.length < step) break;
        from += step;
      }
      // Fallback: bundle nativo
      if (!gotAny) {
        const { bundle } = await import("@/services/offlineBundle");
        const rows = await bundle.resumos<{ area: string }>();
        for (const r of rows) {
          if (!r.area) continue;
          map.set(r.area, (map.get(r.area) || 0) + 1);
        }
      }
      const list = Array.from(map.entries())
        .map(([area, total]) => ({ area, total }))
        .sort((a, b) => a.area.localeCompare(b.area));
      areasCache = list;
      setRows(list);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => r.area.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <PageHeader
          title="Resumos Jurídicos"
          subtitle="Selecione uma área"
          onBack={() => navigate("/")}
          leading={
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <NotebookText className="w-5 h-5 text-primary" />
            </div>
          }
          className="border-b-0"
        />
        <div className="max-w-5xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar área"
              className="pl-9"
            />
          </div>
        </div>
      </div>


      <div className="max-w-5xl mx-auto px-4 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
            Nenhum resumo importado ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((r, i) => {
              const s = styleForArea(r.area);
              const Icon = s.icon;
              return (
                <motion.button
                  key={r.area}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  onClick={() => navigate(`/resumos-juridicos/${encodeURIComponent(r.area)}`)}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all text-left"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ring-1"
                    style={{ backgroundColor: `${s.color}22`, boxShadow: `inset 0 0 0 1px ${s.color}55` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-foreground truncate">{r.area}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {r.total} {r.total === 1 ? "resumo" : "resumos"}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

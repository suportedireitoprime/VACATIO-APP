import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Scale,
  Calendar,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Search,
  RefreshCw,
  BookOpen,
  X,
  FileCheck,
  Building,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/vademecum/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getResenhaCache,
  setResenhaCache,
  type ResenhaItem,
} from "@/services/atualizacaoService";
import LeiOrdinariaDetail from "@/components/vademecum/LeiOrdinariaDetail";
import type { LeiOrdinaria } from "@/services/legislacaoService";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS E MODELOS DE DADOS
// ─────────────────────────────────────────────────────────────────────────────

export interface NovaLeiCardItem {
  id: string;
  tipoAto:
    | "Emenda Constitucional"
    | "Lei"
    | "Lei Complementar"
    | "Decreto"
    | "Medida Provisória"
    | string;
  numeroAto: string;
  ano: number | string;
  tituloCurto: string;
  ementa: string;
  dataPublicacao: string;
  dataDou?: string;
  url?: string;
  textoCompleto?: string | null;
  explicacao?: string | null;
  isCurated?: boolean;
  destaqueBadge?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE NOVAS LEIS DO PLANALTO
// ─────────────────────────────────────────────────────────────────────────────

const NOVAS_LEIS_CURADAS: NovaLeiCardItem[] = [
  {
    id: "curated-ec-140",
    tipoAto: "Emenda Constitucional",
    numeroAto: "EC nº 140/2026",
    ano: 2026,
    tituloCurto: "Aposentadoria Especial de Agentes de Saúde e Endemias",
    ementa:
      "Altera o art. 198 da CF para dispor sobre a aposentadoria especial, o adicional de insalubridade e a regularização de vínculos dos Agentes Comunitários de Saúde e de Combate às Endemias.",
    dataPublicacao: "2026-10-18",
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc140.htm",
    destaqueBadge: "Recém Promulgada",
    isCurated: true,
  },
  {
    id: "curated-lc-238",
    tipoAto: "Lei Complementar",
    numeroAto: "LC nº 238/2026",
    ano: 2026,
    tituloCurto:
      "Normas Complementares de Assistência Financeira Previdenciária",
    ementa:
      "Estabelece normas orçamentárias e financeiras suplementares para a complementação de proventos e assistência da União aos regimes previdenciários dos entes federados.",
    dataPublicacao: "2026-10-21",
    url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp238.htm",
    destaqueBadge: "Outubro / 2026",
    isCurated: true,
  },
  {
    id: "curated-lc-214",
    tipoAto: "Lei Complementar",
    numeroAto: "LC nº 214/2025",
    ano: 2025,
    tituloCurto:
      "Instituição do IBS e da CBS (Regulamentação da Reforma Tributária)",
    ementa:
      "Institui o Imposto sobre Bens e Serviços (IBS) e a Contribuição sobre Bens e Serviços (CBS), dispondo sobre o Comitê Gestor do IBS e a transição tributária do consumo.",
    dataPublicacao: "2025-12-15",
    url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm",
    destaqueBadge: "Reforma Tributária",
    isCurated: true,
  },
  {
    id: "curated-lei-14994",
    tipoAto: "Lei",
    numeroAto: "Lei nº 14.994/2024",
    ano: 2024,
    tituloCurto:
      "Pacote Antifeminicídio: Crime Autônomo e Pena de 20 a 40 Anos",
    ementa:
      "Altera o Código Penal, a Lei de Execução Penal e a Lei dos Crimes Hediondos para tornar o feminicídio crime autônomo, aumentar a pena para 20 a 40 anos e agravar sanções.",
    dataPublicacao: "2024-10-10",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14994.htm",
    destaqueBadge: "Penal Rigoroso",
    isCurated: true,
  },
  {
    id: "curated-lei-14811",
    tipoAto: "Lei",
    numeroAto: "Lei nº 14.811/2024",
    ano: 2024,
    tituloCurto:
      "Combate ao Bullying, Cyberbullying e Proteção da Criança e Jovem",
    ementa:
      "Institui medidas de proteção à criança e ao adolescente contra a violência nos estabelecimentos educacionais ou similares, prevê a Política Nacional e tipifica o bullying no CP.",
    dataPublicacao: "2024-01-15",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14811.htm",
    destaqueBadge: "Ambiente Escolar",
    isCurated: true,
  },
  {
    id: "curated-lei-14790",
    tipoAto: "Lei",
    numeroAto: "Lei nº 14.790/2023",
    ano: 2023,
    tituloCurto: "Regulamentação das Apostas Esportivas e Jogos Online (Bets)",
    ementa:
      "Dispõe sobre a modalidade lotérica denominada apostas de quota fixa, outorga de autorização a operadores, tributação e regras de jogo responsável.",
    dataPublicacao: "2023-12-30",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14790.htm",
    destaqueBadge: "Marco das Bets",
    isCurated: true,
  },
  {
    id: "curated-lei-14711",
    tipoAto: "Lei",
    numeroAto: "Lei nº 14.711/2023",
    ano: 2023,
    tituloCurto: "Marco Legal das Garantias e Execuções Extrajudiciais",
    ementa:
      "Aprimora as regras relativas ao tratamento do crédito e garantias, permitindo execução extrajudicial de hipoteca e atuação de agentes de garantia.",
    dataPublicacao: "2023-10-31",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14711.htm",
    destaqueBadge: "Garantias & Crédito",
    isCurated: true,
  },
  {
    id: "curated-lei-14611",
    tipoAto: "Lei",
    numeroAto: "Lei nº 14.611/2023",
    ano: 2023,
    tituloCurto: "Igualdade Salarial e de Remuneração entre Mulheres e Homens",
    ementa:
      "Dispõe sobre a igualdade salarial e de critérios remuneratórios entre mulheres e homens para a realização de trabalho de igual valor ou no exercício da mesma função.",
    dataPublicacao: "2023-07-04",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14611.htm",
    destaqueBadge: "Trabalho & Equidade",
    isCurated: true,
  },
  {
    id: "curated-lei-14532",
    tipoAto: "Lei",
    numeroAto: "Lei nº 14.532/2023",
    ano: 2023,
    tituloCurto: "Tipificação da Injúria Racial na Lei de Crimes de Racismo",
    ementa:
      "Altera a Lei nº 7.716/1989 e o Código Penal para tipificar a injúria racial como crime de racismo, tornando-a inafiançável e imprescritível.",
    dataPublicacao: "2023-01-12",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14532.htm",
    destaqueBadge: "Direitos Humanos",
    isCurated: true,
  },
];

// Helper de cores por tipo de ato
const TIPO_ATO_COLORS: Record<
  string,
  { badge: string; border: string; glow: string; text: string }
> = {
  "Emenda Constitucional": {
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    glow: "from-emerald-500/10 via-card/90 to-card/90",
    text: "text-emerald-400",
  },
  "Lei Complementar": {
    badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    border: "border-rose-500/30 hover:border-rose-500/60",
    glow: "from-rose-500/10 via-card/90 to-card/90",
    text: "text-rose-400",
  },
  Lei: {
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    border: "border-amber-500/30 hover:border-amber-500/60",
    glow: "from-amber-500/10 via-card/90 to-card/90",
    text: "text-amber-400",
  },
  "Lei Ordinária": {
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    border: "border-amber-500/30 hover:border-amber-500/60",
    glow: "from-amber-500/10 via-card/90 to-card/90",
    text: "text-amber-400",
  },
  "Medida Provisória": {
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    border: "border-purple-500/30 hover:border-purple-500/60",
    glow: "from-purple-500/10 via-card/90 to-card/90",
    text: "text-purple-400",
  },
  Decreto: {
    badge: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    border: "border-sky-500/30 hover:border-sky-500/60",
    glow: "from-sky-500/10 via-card/90 to-card/90",
    text: "text-sky-400",
  },
};

const getTipoColors = (tipo?: string) => {
  if (!tipo) return TIPO_ATO_COLORS["Lei"];
  const match = Object.keys(TIPO_ATO_COLORS).find((k) =>
    tipo.toLowerCase().includes(k.toLowerCase()),
  );
  return match ? TIPO_ATO_COLORS[match] : TIPO_ATO_COLORS["Lei"];
};

const formatDateBr = (dateStr?: string) => {
  if (!dateStr) return "Recente";
  try {
    const parts = dateStr.slice(0, 10).split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("pt-BR");
    }
  } catch {}
  return dateStr;
};

type TipoFiltroPlanalto =
  | "todos"
  | "emenda"
  | "lei"
  | "complementar"
  | "mp"
  | "decreto";

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function Novidades() {
  const navigate = useNavigate();

  // Estados de dados
  const [resenhaItems, setResenhaItems] = useState<ResenhaItem[]>([]);
  const [loadingResenha, setLoadingResenha] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados de pesquisa e filtro por tipo de ato do Planalto
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltroPlanalto>("todos");

  // Estados para modais e detalhes
  const [selectedLeiCard, setSelectedLeiCard] =
    useState<NovaLeiCardItem | null>(null);

  // Visualizador completo de Lei do Planalto (LeiOrdinariaDetail)
  const [detailItem, setDetailItem] = useState<LeiOrdinaria | null>(null);

  // Ref para controle de scroll horizontal do destaque
  const carousel1Ref = useRef<HTMLDivElement>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // CARREGAMENTO DOS DADOS (RESENHA DIÁRIA DO PLANALTO)
  // ───────────────────────────────────────────────────────────────────────────

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    try {
      const cached = getResenhaCache();
      if (!isRefresh && cached && cached.length > 0) {
        setResenhaItems(cached);
        setLoadingResenha(false);
      } else {
        const { data } = await supabase
          .from("resenha_diaria" as any)
          .select(
            "id,tipo_ato,numero_ato,ementa,url,data_publicacao,data_dou,texto_completo,explicacao",
          )
          .order("data_dou", { ascending: false })
          .limit(150);

        if (data && data.length > 0) {
          setResenhaItems(data as unknown as ResenhaItem[]);
          setResenhaCache(data as unknown as ResenhaItem[]);
        }
        setLoadingResenha(false);
      }
    } catch (err) {
      console.warn("Erro ao carregar resenha do Planalto:", err);
      setLoadingResenha(false);
    }

    if (isRefresh) {
      setRefreshing(false);
      toast.success("Leis do Planalto atualizadas!");
    }
  }, []);

  useEffect(() => {
    loadData();
    try {
      localStorage.setItem(
        "radar_novidades_last_seen",
        new Date().toISOString(),
      );
    } catch {}
  }, [loadData]);

  // Scroll horizontal helper
  const scrollHoriz = (
    ref: React.RefObject<HTMLDivElement | null>,
    dir: "left" | "right",
  ) => {
    if (!ref.current) return;
    const amount = dir === "left" ? -340 : 340;
    ref.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // MESCLAGEM E FILTRAGEM DAS LEIS DO PLANALTO
  // ───────────────────────────────────────────────────────────────────────────

  const mergedNovasLeis = useMemo<NovaLeiCardItem[]>(() => {
    const list: NovaLeiCardItem[] = [...NOVAS_LEIS_CURADAS];
    const seenNumbers = new Set(
      NOVAS_LEIS_CURADAS.map((c) =>
        c.numeroAto.toLowerCase().replace(/\s+/g, ""),
      ),
    );

    resenhaItems.forEach((r) => {
      const normalizedNum = (r.numero_ato || "")
        .toLowerCase()
        .replace(/\s+/g, "");
      if (normalizedNum && !seenNumbers.has(normalizedNum)) {
        seenNumbers.add(normalizedNum);
        list.push({
          id: r.id,
          tipoAto: r.tipo_ato || "Lei",
          numeroAto: r.numero_ato || "Ato Normativo",
          ano: (r.data_dou || r.data_publicacao || "").slice(0, 4) || "2026",
          tituloCurto: r.numero_ato,
          ementa: r.ementa || "Sem ementa disponível no momento.",
          dataPublicacao: r.data_publicacao || r.data_dou || "",
          dataDou: r.data_dou || "",
          url: r.url || "",
          textoCompleto: r.texto_completo,
          explicacao: r.explicacao,
          isCurated: false,
        });
      }
    });

    // Ordena do mais recente para o mais antigo por data de publicação
    return list.sort((a, b) => {
      const dateA = a.dataPublicacao || a.dataDou || "";
      const dateB = b.dataPublicacao || b.dataDou || "";
      return dateB.localeCompare(dateA);
    });
  }, [resenhaItems]);

  // Filtros aplicados por busca (searchTerm) e por tipo de ato normativo
  const filteredNovasLeis = useMemo(() => {
    return mergedNovasLeis.filter((item) => {
      // Filtro por tipo de ato do Planalto
      if (
        tipoFiltro === "emenda" &&
        !item.tipoAto.toLowerCase().includes("emenda")
      )
        return false;
      if (
        tipoFiltro === "complementar" &&
        !item.tipoAto.toLowerCase().includes("complementar")
      )
        return false;
      if (
        tipoFiltro === "mp" &&
        !item.tipoAto.toLowerCase().includes("provisória") &&
        !item.tipoAto.toLowerCase().includes("provisoria")
      )
        return false;
      if (
        tipoFiltro === "decreto" &&
        !item.tipoAto.toLowerCase().includes("decreto")
      )
        return false;
      if (tipoFiltro === "lei") {
        const t = item.tipoAto.toLowerCase();
        if (
          t.includes("complementar") ||
          t.includes("emenda") ||
          t.includes("decreto")
        )
          return false;
      }

      // Filtro por termo de busca
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.numeroAto.toLowerCase().includes(term) ||
        item.tituloCurto.toLowerCase().includes(term) ||
        item.ementa.toLowerCase().includes(term) ||
        item.tipoAto.toLowerCase().includes(term) ||
        (item.dataPublicacao && item.dataPublicacao.includes(term))
      );
    });
  }, [mergedNovasLeis, searchTerm, tipoFiltro]);

  // Abre visualizador completo se solicitado
  if (detailItem) {
    return (
      <LeiOrdinariaDetail lei={detailItem} onBack={() => setDetailItem(null)} />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col select-none">
      {/* ─────────────────────────────────────────────────────────────────────
          HEADER DA PÁGINA
      ───────────────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Novidades"
        subtitle="Leis e atos normativos publicados no Portal do Planalto com datas oficiais"
        onBack={() => navigate(-1)}
        rightAction={
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            aria-label="Atualizar dados"
            className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center active:scale-95 transition-all text-muted-foreground hover:text-foreground touch-manipulation"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                refreshing ? "animate-spin text-primary" : ""
              }`}
            />
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto pb-32">
        {/* ───────────────────────────────────────────────────────────────────
            BARRA DE BUSCA E CHIPS DE TIPOS DE LEIS DO PLANALTO
        ─────────────────────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-2 max-w-7xl mx-auto w-full space-y-3">
          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por número da lei, ano, data ou ementa..."
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-card/70 border border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-muted-foreground/70 outline-none transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Chips por Tipo de Ato do Planalto */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setTipoFiltro("todos")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all ${
                tipoFiltro === "todos"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card/70 border border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas ({mergedNovasLeis.length})
            </button>
            <button
              type="button"
              onClick={() => setTipoFiltro("emenda")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                tipoFiltro === "emenda"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-card/70 border border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Emendas Constitucionais</span>
            </button>
            <button
              type="button"
              onClick={() => setTipoFiltro("complementar")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                tipoFiltro === "complementar"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "bg-card/70 border border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Leis Complementares</span>
            </button>
            <button
              type="button"
              onClick={() => setTipoFiltro("lei")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                tipoFiltro === "lei"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-card/70 border border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Leis Ordinárias</span>
            </button>
            <button
              type="button"
              onClick={() => setTipoFiltro("mp")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                tipoFiltro === "mp"
                  ? "bg-purple-500 text-white shadow-sm"
                  : "bg-card/70 border border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Medidas Provisórias</span>
            </button>
            <button
              type="button"
              onClick={() => setTipoFiltro("decreto")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                tipoFiltro === "decreto"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "bg-card/70 border border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Decretos</span>
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────────
            SEÇÃO DE LEIS DO PLANALTO: CARROSSEL DE DESTAQUES RECENTES
        ─────────────────────────────────────────────────────────────────── */}
        <section className="pt-4 pb-2">
          <div className="px-4 max-w-7xl mx-auto flex items-center justify-between gap-3 mb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                  Novidades Legislativas do Planalto
                  <Badge
                    variant="outline"
                    className="text-[10px] font-normal border-emerald-500/30 text-emerald-400"
                  >
                    {filteredNovasLeis.length}{" "}
                    {filteredNovasLeis.length === 1 ? "ato" : "atos"}
                  </Badge>
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Leis recém-publicadas no Diário Oficial da União (DOU) e Portal
                do Planalto
              </p>
            </div>

            {/* Botões desktop de navegação */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollHoriz(carousel1Ref, "left")}
                className="w-8 h-8 rounded-full bg-card border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="Rolar para esquerda"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollHoriz(carousel1Ref, "right")}
                className="w-8 h-8 rounded-full bg-card border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="Rolar para direita"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Carrossel de Novas Leis */}
          <div
            ref={carousel1Ref}
            className="flex gap-3.5 px-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth pt-1 pb-3"
          >
            {filteredNovasLeis.slice(0, 10).map((lei) => {
              const colors = getTipoColors(lei.tipoAto);
              return (
                <div
                  key={lei.id}
                  onClick={() => setSelectedLeiCard(lei)}
                  className={`w-[84vw] sm:w-[350px] md:w-[370px] shrink-0 snap-start rounded-2xl bg-gradient-to-b ${colors.glow} bg-card/85 border ${colors.border} p-4 flex flex-col justify-between shadow-lg cursor-pointer hover:shadow-emerald-500/5 hover:-translate-y-0.5 active:scale-[0.98] transition-all`}
                >
                  <div>
                    {/* Top Header do Card: Tipo de Ato + DATA OFICIAL DO PLANALTO */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-medium ${colors.badge}`}
                      >
                        {lei.tipoAto}
                      </Badge>
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateBr(lei.dataPublicacao)}
                      </span>
                    </div>

                    {/* Título e Número */}
                    <h3 className="font-bold text-foreground text-sm sm:text-base leading-snug line-clamp-1 mb-1">
                      {lei.numeroAto}
                    </h3>
                    {lei.destaqueBadge && (
                      <span className="inline-block px-2 py-0.5 mb-2 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {lei.destaqueBadge}
                      </span>
                    )}

                    {/* Ementa Oficial */}
                    <p className="text-xs text-muted-foreground/90 line-clamp-3 leading-relaxed">
                      {lei.ementa}
                    </p>
                  </div>

                  {/* Rodapé com Ação */}
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-3">
                    <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                      Ver resumo e detalhes
                    </span>
                    <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-foreground">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────────────
            FEED COMPLETO: TODAS AS LEIS DO PLANALTO EM LISTA/GRADE ORGANIZADA
        ─────────────────────────────────────────────────────────────────── */}
        <section className="pt-4 px-4 max-w-7xl mx-auto">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              Todas as Publicações Recentes ({filteredNovasLeis.length})
            </h3>
            <span className="text-xs text-muted-foreground">
              Mais recentes primeiro
            </span>
          </div>

          {filteredNovasLeis.length === 0 ? (
            <div className="p-8 text-center bg-card/40 border border-white/5 rounded-2xl">
              <p className="text-sm text-muted-foreground">
                Nenhuma lei encontrada para o filtro ou termo pesquisado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredNovasLeis.map((lei) => {
                const colors = getTipoColors(lei.tipoAto);
                return (
                  <div
                    key={`feed-${lei.id}`}
                    onClick={() => setSelectedLeiCard(lei)}
                    className={`rounded-2xl bg-card/80 border ${colors.border} p-4 flex flex-col justify-between shadow-md cursor-pointer hover:bg-card hover:-translate-y-0.5 active:scale-[0.98] transition-all`}
                  >
                    <div>
                      {/* Top Header: Tipo de Ato + DATA DE PUBLICAÇÃO */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium ${colors.badge}`}
                        >
                          {lei.tipoAto}
                        </Badge>
                        <span className="text-[11px] font-bold text-foreground/90 bg-white/5 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-emerald-400" />
                          {formatDateBr(lei.dataPublicacao)}
                        </span>
                      </div>

                      {/* Título / Número da Lei */}
                      <h4 className="font-bold text-foreground text-sm leading-snug mb-1">
                        {lei.numeroAto}
                      </h4>

                      {/* Ementa Oficial */}
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mt-1">
                        {lei.ementa}
                      </p>
                    </div>

                    {/* Rodapé do card */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between mt-3">
                      <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                        Ver detalhes
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ─────────────────────────────────────────────────────────────────────
          MODAL / BOTTOM SHEET: DETALHE DE NOVA LEI DO PLANALTO
      ───────────────────────────────────────────────────────────────────── */}
      <Sheet
        open={!!selectedLeiCard}
        onOpenChange={(open) => !open && setSelectedLeiCard(null)}
      >
        <SheetContent
          side="bottom"
          className="max-h-[88vh] rounded-t-3xl border-t border-white/10 bg-card p-0 flex flex-col"
        >
          {selectedLeiCard && (
            <div className="flex flex-col h-full overflow-hidden">
              <SheetHeader className="p-5 pb-3 border-b border-white/10 text-left">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <Badge
                    variant="outline"
                    className={getTipoColors(selectedLeiCard.tipoAto).badge}
                  >
                    {selectedLeiCard.tipoAto}
                  </Badge>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    <Calendar className="w-3.5 h-3.5" />
                    Data de Publicação:{" "}
                    {formatDateBr(selectedLeiCard.dataPublicacao)}
                  </span>
                </div>
                <SheetTitle className="text-lg sm:text-xl font-bold leading-snug text-foreground">
                  {selectedLeiCard.numeroAto}
                </SheetTitle>
                {selectedLeiCard.tituloCurto && (
                  <SheetDescription className="text-xs text-muted-foreground font-medium">
                    {selectedLeiCard.tituloCurto}
                  </SheetDescription>
                )}
              </SheetHeader>

              <ScrollArea className="flex-1 p-5 space-y-4">
                {/* Data e Fonte */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building className="w-4 h-4 text-emerald-400" />
                    <span>
                      Fonte: Diário Oficial da União / Portal do Planalto
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {formatDateBr(selectedLeiCard.dataPublicacao)}
                  </span>
                </div>

                {/* Ementa Oficial */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Ementa Oficial
                  </h4>
                  <p className="text-sm text-foreground/90 leading-relaxed bg-white/[0.03] border border-white/5 p-3.5 rounded-xl">
                    {selectedLeiCard.ementa}
                  </p>
                </div>

                {/* Explicação Doutrinária / Resumo Prático (se houver) */}
                {selectedLeiCard.explicacao && (
                  <div className="pt-2">
                    <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Análise de Impacto Jurídico
                    </h4>
                    <div className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed bg-emerald-500/[0.06] border border-emerald-500/20 p-3.5 rounded-xl">
                      {selectedLeiCard.explicacao}
                    </div>
                  </div>
                )}
              </ScrollArea>

              {/* Botões de Ação */}
              <div className="p-4 border-t border-white/10 bg-background/80 flex items-center gap-3">
                {selectedLeiCard.textoCompleto ? (
                  <Button
                    onClick={() => {
                      const itemToOpen: LeiOrdinaria = {
                        id: selectedLeiCard.id,
                        tipo_ato: selectedLeiCard.tipoAto,
                        numero_ato: selectedLeiCard.numeroAto,
                        ementa: selectedLeiCard.ementa,
                        url: selectedLeiCard.url || "",
                        data_publicacao: selectedLeiCard.dataPublicacao,
                        data_dou:
                          selectedLeiCard.dataDou ||
                          selectedLeiCard.dataPublicacao,
                        texto_completo: selectedLeiCard.textoCompleto,
                        explicacao: selectedLeiCard.explicacao,
                      };
                      setSelectedLeiCard(null);
                      setDetailItem(itemToOpen);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Ler Inteiro Teor no App
                  </Button>
                ) : (
                  selectedLeiCard.url && (
                    <Button
                      onClick={() => window.open(selectedLeiCard.url, "_blank")}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Acessar no Portal do Planalto
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedLeiCard(null)}
                  className="border-white/10"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

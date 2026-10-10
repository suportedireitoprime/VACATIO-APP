import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  NotebookText,
  Share2,
  Heart,
  FileDown,
  Copy,
  Check,
  Type,
  Sparkles,
  Loader2,
  Volume2,
  Square,
  Settings2,
} from "lucide-react";
import { useIsDesktop } from "@/hooks/use-desktop";
import { resumosLocal } from "@/lib/resumosLocal";
import { gerarResumoPdf, resumoParaTexto } from "@/lib/resumoPdf";
import { supabase } from "@/integrations/supabase/client";
import { get, set } from "idb-keyval";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
const ResumoMarkdown = lazy(() => import("./ResumoMarkdown"));
import CornellView from "./CornellView";
import FeynmanView from "./FeynmanView";
import FichaEditorial from "./FichaEditorial";
import { PALETA } from "@/lib/visuaisJuridicos/layout";

import {
  CornellContent,
  FeynmanContent,
  Metodo,
  cornellParaMarkdown,
  feynmanParaMarkdown,
} from "./metodologias";
import { copiarTexto } from '@/lib/nativo/copiar';
import { abrirLink } from '@/lib/nativo';
import { compartilharNativo, podeCompartilhar } from '@/lib/nativo/compartilhar';

export interface ResumoRow {
  id: string;
  area: string;
  tema: string;
  subtema: string | null;
  ordem_subtema: number | null;
  markdown: string | null;
  exemplos: string | null;
  termos: string | null;
}

interface Props {
  resumo: ResumoRow | null;
  onClose: () => void;
  onFavoritoChange?: () => void;
  /** Gera Cornell e Feynman automaticamente quando ainda não existem. */
  pregerarMetodos?: boolean;
  /** Método ativo inicial, escolhido pelo usuário na tela anterior. */
  initialMetodo?: Metodo;
}

type Tab = "resumo" | "exemplos" | "termos";

/** Vermelho oficial do app (mesmo do rodapé / início) */
const RED = "hsl(348 78% 45%)";

const METODOS: { id: Metodo; label: string }[] = [
  { id: "conceitos", label: "Conceitos" },
  { id: "cornell", label: "Cornell" },
  { id: "feynman", label: "Feynman" },
];

export default function ResumoJuridicoReaderSheet({ resumo, onClose, onFavoritoChange, pregerarMetodos, initialMetodo }: Props) {
  const isDesktop = useIsDesktop();
  const [fontScale, setFontScale] = useState(1.05);
  const [tab, setTab] = useState<Tab>("resumo");
  const [metodo, setMetodo] = useState<Metodo>(initialMetodo || "conceitos");
  const [cornell, setCornell] = useState<CornellContent | null>(null);
  const [feynman, setFeynman] = useState<FeynmanContent | null>(null);
  const [gerando, setGerando] = useState<Metodo | null>(null);
  const [erroGerar, setErroGerar] = useState<string | null>(null);
  const [fontOpen, setFontOpen] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [fav, setFav] = useState(false);
  const [falando, setFalando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (resumo && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "auto" });
      setTab("resumo");
      setMetodo(initialMetodo || "conceitos");
      setCornell(null);
      setFeynman(null);
      setGerando(null);
      setErroGerar(null);
      setFontOpen(false);
      setCopiado(false);
      setFalando(false);
      window.speechSynthesis.cancel();
      setFav(resumosLocal.isFavorito(resumo.id));
    }
  }, [resumo?.id, initialMetodo, resumo]);

  // Carrega metodologias já geradas para este resumo
  useEffect(() => {
    if (!resumo?.id) return;
    const resumoId = resumo.id;
    let ativo = true;
    (async () => {
      const cacheKey = `metodologias_${resumoId}`;
      let data = await get(cacheKey).catch(() => null);

      if (!data) {
        const res = await supabase
          .from("resumo_metodologias")
          .select("metodo, conteudo")
          .eq("resumo_id", resumoId);
        data = res.data;
        if (data && data.length > 0) {
          await set(cacheKey, data).catch(() => {});
        }
      }

      if (!ativo) return;
      const existentes = new Set<string>();
      for (const row of data || []) {
        existentes.add(row.metodo);
        if (row.metodo === "cornell") setCornell(row.conteudo as unknown as CornellContent);
        if (row.metodo === "feynman") setFeynman(row.conteudo as unknown as FeynmanContent);
      }

      // Se o usuário selecionou um método inicial que ainda não existe, gera automaticamente
      if (initialMetodo && initialMetodo !== "conceitos" && !existentes.has(initialMetodo)) {
        setGerando(initialMetodo);
        try {
          await gerarViaOmni(initialMetodo);
        } catch (e: any) {
          setErroGerar(e?.message || "Erro na geração inicial.");
        } finally {
          setGerando(null);
        }
      }

      // Gera em segundo plano os métodos que ainda não existem
      if (!pregerarMetodos) return;
      for (const alvo of ["cornell", "feynman"] as const) {
        if (existentes.has(alvo)) continue;
        if (alvo === initialMetodo) continue; // já gerado acima
        gerarViaOmni(alvo).catch(() => {});
      }
    })();
    return () => {
      ativo = false;
    };
  }, [resumo?.id, pregerarMetodos, initialMetodo]);

  const gerarViaOmni = async (alvo: Metodo) => {
    if (!resumo) return;
    const { generateOmniText } = await import("@/lib/omniRouteClient");
    
    let prompt = `LEGISLAÇÃO: ${resumo.area} / ${resumo.tema} / ${resumo.subtema}\nRESUMO ORIGINAL: ${resumo.markdown}\n\n`;
    if (alvo === "cornell") {
      prompt += `Crie um resumo usando o Método Cornell. Retorne ESTRITAMENTE JSON:
{
  "palavras_chave": ["...", "..."],
  "perguntas": [
    { "pergunta": "...", "resposta": "..." }
  ],
  "anotacoes": [
    { "topico": "...", "conteudo": "..." }
  ],
  "resumo_geral": "..."
}`;
    } else {
      prompt += `Crie um resumo usando a Técnica Feynman. Retorne ESTRITAMENTE JSON:
{
  "conceito": "...",
  "explicacao_simples": "...",
  "lacunas": [
    { "ponto": "...", "explicacao": "..." }
  ],
  "analogias": [
    { "analogia": "...", "relacao": "..." }
  ],
  "revisao_final": "..."
}`;
    }
    const systemPrompt = "Você é um professor de direito muito didático. Retorne apenas JSON puro sem blocos de markdown.";
    
    let res = await generateOmniText({ prompt, systemPrompt, complexity: 'low' });
    let cleanJson = res.replace(/```json/gi, '').replace(/```/g, '').trim();
    const startIdx = cleanJson.indexOf('{');
    const endIdx = cleanJson.lastIndexOf('}');
    if (startIdx >= 0 && endIdx >= 0) {
      cleanJson = cleanJson.substring(startIdx, endIdx + 1);
    }
    const raw = JSON.parse(cleanJson);
    
    // Salvar no banco (opcional, omitido aqui mas idealmente salvo para cache)
    await supabase.from("resumo_metodologias").insert({
      resumo_id: resumo.id,
      metodo: alvo,
      conteudo: raw
    });

    if (alvo === "cornell") setCornell(raw as CornellContent);
    else setFeynman(raw as FeynmanContent);
  };

  const gerarMetodologia = async (alvo: Metodo) => {
    if (!resumo || alvo === "conceitos" || gerando) return;
    setGerando(alvo);
    setErroGerar(null);
    try {
      await gerarViaOmni(alvo);
    } catch (e: any) {
      setErroGerar(e?.message || "Não foi possível gerar agora. Tente novamente.");
    } finally {
      setGerando(null);
    }
  };

  const incFont = () => setFontScale((s) => Math.min(1.6, +(s + 0.1).toFixed(2)));
  const decFont = () => setFontScale((s) => Math.max(0.9, +(s - 0.1).toFixed(2)));

  const content =
    tab === "resumo" ? resumo?.markdown : tab === "exemplos" ? resumo?.exemplos : resumo?.termos;

  /** Markdown do método ativo — usado em copiar / enviar / PDF */
  const markdownAtivo =
    metodo === "cornell"
      ? cornell
        ? cornellParaMarkdown(cornell)
        : null
      : metodo === "feynman"
      ? feynman
        ? feynmanParaMarkdown(feynman)
        : null
      : null;

  const toggleFav = () => {
    if (!resumo) return;
    const novo = resumosLocal.toggleFavorito({
      id: resumo.id,
      area: resumo.area,
      tema: resumo.tema,
      subtema: resumo.subtema,
    });
    setFav(novo);
    onFavoritoChange?.();
  };

  const textoAtivo = () => {
    if (!resumo) return "";
    if (metodo === "conceitos" || !markdownAtivo) return resumoParaTexto(resumo);
    const cabecalho = `${resumo.area} · ${resumo.tema}\n${resumo.subtema || ""}\nMétodo ${
      metodo === "cornell" ? "Cornell" : "Feynman"
    }\n\n`;
    return cabecalho + markdownAtivo.replace(/[#*]/g, "");
  };

  const copiar = async () => {
    if (!resumo) return;
    try {
      await copiarTexto(textoAtivo());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* noop */
    }
  };

  const toggleTTS = () => {
    if (falando) {
      window.speechSynthesis.cancel();
      setFalando(false);
    } else {
      const text = textoAtivo();
      if (!text) return;
      const ut = new SpeechSynthesisUtterance(text);
      ut.lang = 'pt-BR';
      ut.onend = () => setFalando(false);
      window.speechSynthesis.speak(ut);
      setFalando(true);
    }
  };

  const baixarPdf = async () => {
    if (!resumo) return;
    if (metodo !== "conceitos" && markdownAtivo) {
      await gerarResumoPdf({
        area: resumo.area,
        tema: resumo.tema,
        subtema: `${resumo.subtema || resumo.tema} — Método ${
          metodo === "cornell" ? "Cornell" : "Feynman"
        }`,
        markdown: markdownAtivo,
      });
      return;
    }
    await gerarResumoPdf(resumo);
  };

  const share = async () => {
    if (!resumo) return;
    const text = textoAtivo();
    try {
      if (podeCompartilhar()) {
        await compartilharNativo({ title: resumo.subtema || resumo.tema, text });
      } else {
        void abrirLink(`https://wa.me/?text=${encodeURIComponent(text.slice(0, 1500))}`);
      }
    } catch {
      /* noop */
    }
  };

  const abas = (["resumo", "exemplos", "termos"] as Tab[]).filter((t) =>
    t === "resumo" ? !!resumo?.markdown : t === "exemplos" ? !!resumo?.exemplos : !!resumo?.termos
  );


  return (
    <AnimatePresence>
      {resumo && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 340 }}
            className={
              isDesktop
                ? "fixed z-[100] inset-y-0 left-1/2 -translate-x-1/2 bg-card border-x border-border flex flex-col w-[800px] shadow-2xl overflow-hidden"
                : "fixed inset-0 z-[100] bg-card flex flex-col overflow-hidden"
            }
          >
            <div ref={scrollRef} className="flex-1 overflow-y-auto pb-8 relative">
              <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border">
                <div
                  className="flex items-center gap-3 py-3.5 shrink-0"
                  style={{
                    paddingTop: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 0.875rem)',
                    paddingLeft: 'calc(1rem + var(--sai-left, env(safe-area-inset-left, 0px)))',
                    paddingRight: 'calc(1rem + var(--sai-right, env(safe-area-inset-right, 0px)))',
                    minHeight: 'calc(5rem + var(--sai-top, env(safe-area-inset-top, 0px)))',
                  }}
                >
                  <button
                    onClick={onClose}
                    aria-label="Fechar"
                    className="w-12 h-12 md:w-11 md:h-11 flex items-center justify-center rounded-full bg-muted shrink-0 active:scale-95 transition-transform"
                  >
                    <ChevronDown className="w-[22px] h-[22px]" />
                  </button>
                  <div className="flex-1 min-w-0 text-center">
                    <h1 className="font-display text-[18px] md:text-[17px] font-semibold text-foreground tracking-wide truncate">
                      {resumo.tema}
                    </h1>
                    <p className="text-xs md:text-[11px] font-body text-muted-foreground truncate mt-1">
                      {resumo.area}
                    </p>
                  </div>
                  <button
                    onClick={toggleFav}
                    aria-label={fav ? "Remover dos favoritos" : "Favoritar"}
                    className="w-12 h-12 md:w-11 md:h-11 flex items-center justify-center rounded-full bg-muted shrink-0 active:scale-95 transition"
                  >
                    <Heart
                      className="w-[22px] h-[22px]"
                      style={fav ? { color: RED, fill: RED } : undefined}
                    />
                  </button>
                </div>
              </div>


                <div className="space-y-4 px-4 pt-5 md:px-5">
                  <div className="mb-6 border-b border-border pb-4">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                      {resumo.area}
                    </p>
                    <h2 className="font-display text-2xl font-bold text-foreground leading-tight">
                      {resumo.subtema || resumo.tema}
                    </h2>
                  </div>

                  {/* Métodos de estudo escondidos (o usuário deve escolher antes, mas vamos manter a lógica aqui caso precisem) */}

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`${metodo}-${tab}`}
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="pt-2"
                    >
                      {metodo === "conceitos" ? (
                        <>
                          {(resumo.exemplos || resumo.termos) && (
                            <div className="flex gap-1 border-b border-border mb-4">
                              {(["resumo", "exemplos", "termos"] as Tab[]).map((t) => {
                                const has = t === "resumo" ? !!resumo.markdown : t === "exemplos" ? !!resumo.exemplos : !!resumo.termos;
                                if (!has) return null;
                                const label = t === "resumo" ? "Resumo" : t === "exemplos" ? "Exemplos" : "Termos";
                                return (
                                  <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={`px-4 py-2 text-sm font-body transition-colors ${
                                      tab === t
                                        ? "text-primary border-b-2 border-primary -mb-px"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <article
                            style={{ fontSize: `${fontScale}em` }}
                            className="
                              prose prose-sm md:prose-base max-w-none dark:prose-invert font-body
                              prose-headings:font-display prose-headings:text-foreground prose-headings:mt-6 prose-headings:mb-3
                              prose-h2:text-xl prose-h3:text-lg
                              prose-p:text-foreground/90 prose-p:leading-[1.8] prose-p:my-4
                              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                              prose-strong:text-foreground
                              prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r prose-blockquote:not-italic
                              prose-ul:my-4 prose-li:my-1 prose-li:marker:text-primary
                            "
                          >
                            {content ? (
                              <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
                                <ResumoMarkdown content={content} />
                              </Suspense>
                            ) : (
                              <p className="text-muted-foreground">Sem conteúdo neste tópico.</p>
                            )}
                          </article>
                        </>
                      ) : (metodo === "cornell" && cornell) || (metodo === "feynman" && feynman) ? (
                        <div style={{ fontSize: `${fontScale}em` }}>
                          {metodo === "cornell" ? (
                            <CornellView conteudo={cornell!} />
                          ) : (
                            <FeynmanView conteudo={feynman!} />
                          )}
                        </div>
                      ) : (
                        <div
                          className="rounded-2xl border p-6 text-center space-y-3"
                          style={{ borderColor: "rgba(122,18,32,0.18)" }}
                        >
                          <p className="text-sm text-muted-foreground">
                            {metodo === "cornell"
                              ? "O Método Cornell organiza o conteúdo em palavras-chave, perguntas de revisão e anotações."
                              : "O Método Feynman explica o conteúdo em 4 passos, com linguagem simples e analogias."}
                          </p>
                          {erroGerar && (
                            <p className="text-sm" style={{ color: RED }}>
                              {erroGerar}
                            </p>
                          )}
                          <button
                            onClick={() => gerarMetodologia(metodo)}
                            disabled={!!gerando}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-semibold active:scale-95 transition disabled:opacity-60"
                            style={{ backgroundColor: PALETA.wine }}
                          >
                            {gerando === metodo ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Gerando…
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" /> Gerar com IA
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="h-28" />
              </div>

            {/* Ações flutuantes */}
            <div className="pointer-events-none absolute bottom-5 right-4 flex flex-col items-end gap-3">
              <div className="pointer-events-auto flex flex-col gap-2 items-end">
                <button
                  onClick={toggleTTS}
                  aria-label={falando ? "Parar leitura" : "Ler em voz alta"}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-card/95 backdrop-blur-md border border-border shadow-xl text-foreground active:scale-95 transition"
                >
                  {falando ? <Square className="w-5 h-5" style={{ color: RED, fill: RED }} /> : <Volume2 className="w-5 h-5" />}
                </button>

                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      aria-label="Opções de leitura"
                      className="w-12 h-12 flex items-center justify-center rounded-full text-white shadow-2xl hover:brightness-110 active:scale-95 transition-all"
                      style={{ backgroundColor: RED }}
                    >
                      <Settings2 className="w-5 h-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" side="top" sideOffset={16} className="w-64 p-3 rounded-2xl shadow-2xl bg-card border-border">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Tamanho do texto</p>
                        <div className="flex items-center justify-between bg-muted rounded-xl p-1">
                          <button onClick={decFont} className="w-12 h-10 flex items-center justify-center hover:bg-background rounded-lg transition-colors">
                            <span className="text-sm font-bold">A</span>
                          </button>
                          <span className="text-[11px] font-medium text-foreground w-12 text-center">
                            {Math.round(fontScale * 100)}%
                          </span>
                          <button onClick={incFont} className="w-12 h-10 flex items-center justify-center hover:bg-background rounded-lg transition-colors">
                            <span className="text-lg font-bold">A</span>
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ações</p>
                        <div className="grid grid-cols-3 gap-2">
                          <button onClick={copiar} className="flex flex-col items-center justify-center gap-1.5 bg-muted hover:bg-muted/80 rounded-xl p-2.5 transition-colors">
                            {copiado ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-foreground/70" />}
                            <span className="text-[10px] font-medium text-foreground/80">Copiar</span>
                          </button>
                          <button onClick={baixarPdf} className="flex flex-col items-center justify-center gap-1.5 bg-muted hover:bg-muted/80 rounded-xl p-2.5 transition-colors">
                            <FileDown className="w-4 h-4 text-foreground/70" />
                            <span className="text-[10px] font-medium text-foreground/80">PDF</span>
                          </button>
                          <button onClick={share} className="flex flex-col items-center justify-center gap-1.5 bg-muted hover:bg-muted/80 rounded-xl p-2.5 transition-colors">
                            <Share2 className="w-4 h-4 text-foreground/70" />
                            <span className="text-[10px] font-medium text-foreground/80">Enviar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

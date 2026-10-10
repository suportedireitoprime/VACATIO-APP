import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useIsDesktop } from "@/hooks/use-desktop";
import { resumosLocal } from "@/lib/resumosLocal";
import { gerarResumoPdf, resumoParaTexto } from "@/lib/resumoPdf";
import { supabase } from "@/integrations/supabase/client";
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
}

type Tab = "resumo" | "exemplos" | "termos";

/** Vermelho oficial do app (mesmo do rodapé / início) */
const RED = "hsl(348 78% 45%)";

const METODOS: { id: Metodo; label: string }[] = [
  { id: "conceitos", label: "Conceitos" },
  { id: "cornell", label: "Cornell" },
  { id: "feynman", label: "Feynman" },
];

export default function ResumoJuridicoReaderSheet({ resumo, onClose, onFavoritoChange, pregerarMetodos }: Props) {
  const isDesktop = useIsDesktop();
  const [fontScale, setFontScale] = useState(1.15);
  const [tab, setTab] = useState<Tab>("resumo");
  const [metodo, setMetodo] = useState<Metodo>("conceitos");
  const [cornell, setCornell] = useState<CornellContent | null>(null);
  const [feynman, setFeynman] = useState<FeynmanContent | null>(null);
  const [gerando, setGerando] = useState<Metodo | null>(null);
  const [erroGerar, setErroGerar] = useState<string | null>(null);
  const [fontOpen, setFontOpen] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [fav, setFav] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (resumo && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "auto" });
      setTab("resumo");
      setMetodo("conceitos");
      setCornell(null);
      setFeynman(null);
      setGerando(null);
      setErroGerar(null);
      setFontOpen(false);
      setCopiado(false);
      setFav(resumosLocal.isFavorito(resumo.id));
    }
  }, [resumo?.id]);

  // Carrega metodologias já geradas para este resumo
  useEffect(() => {
    if (!resumo?.id) return;
    const resumoId = resumo.id;
    let ativo = true;
    (async () => {
      const { data } = await supabase
        .from("resumo_metodologias")
        .select("metodo, conteudo")
        .eq("resumo_id", resumoId);
      if (!ativo) return;
      const existentes = new Set<string>();
      for (const row of data || []) {
        existentes.add(row.metodo);
        if (row.metodo === "cornell") setCornell(row.conteudo as unknown as CornellContent);
        if (row.metodo === "feynman") setFeynman(row.conteudo as unknown as FeynmanContent);
      }

      // Gera em segundo plano os métodos que ainda não existem
      if (!pregerarMetodos) return;
      for (const alvo of ["cornell", "feynman"] as const) {
        if (existentes.has(alvo)) continue;
        gerarViaOmni(alvo).catch(() => {});
      }
    })();
    return () => {
      ativo = false;
    };
  }, [resumo?.id, pregerarMetodos]);

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
    
    let res = await generateOmniText({ prompt, systemPrompt, complexity: 'medium' });
    let cleanJson = res.replace(/```json/gi, '').replace(/```/g, '').trim();
    const startIdx = cleanJson.indexOf('{');
    const endIdx = cleanJson.lastIndexOf('}');
    if (startIdx >= 0 && endIdx >= 0) {
      cleanJson = cleanJson.substring(startIdx, endIdx + 1);
    }
    const raw = JSON.parse(cleanJson);
    
    // Salvar no banco (opcional, omitido aqui mas idealmente salvo para cache)
    supabase.from("resumo_metodologias").insert({
      resumo_id: resumo.id,
      metodo: alvo,
      conteudo: raw
    }).catch(() => {});

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
                <FichaEditorial
                  etiqueta="Resumo Jurídico"
                  titulo={resumo.subtema || resumo.tema}
                  subtitulo={`${resumo.area} — ${resumo.tema}`}
                >
                  {/* Métodos de estudo */}
                  <div
                    className="flex w-full rounded-xl p-1 gap-1"
                    style={{ background: "rgba(122,18,32,0.07)" }}
                  >
                    {METODOS.map((m) => {
                      const ativo = metodo === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setMetodo(m.id)}
                          className="relative flex-1 py-2 rounded-lg text-sm font-body font-semibold transition-colors text-center"
                        >
                          {ativo && (
                            <motion.span
                              layoutId="ficha-metodo"
                              transition={{ type: "spring", stiffness: 420, damping: 34 }}
                              className="absolute inset-0 rounded-lg"
                              style={{ background: PALETA.wine }}
                            />
                          )}
                          <span
                            className="relative"
                            style={{ color: ativo ? "#FFF9F0" : "hsl(var(--muted-foreground))" }}
                          >
                            {m.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {metodo === "conceitos" && abas.length > 1 && (
                    <div
                      className="flex w-full mt-4 border-b"
                      style={{ borderColor: "rgba(122,18,32,0.16)" }}
                    >
                      {abas.map((t) => {
                        const label =
                          t === "resumo" ? "Resumo" : t === "exemplos" ? "Exemplos" : "Termos";
                        const ativo = tab === t;
                        return (
                          <button
                            key={t}
                            onClick={() => setTab(t)}
                            className="relative flex-1 py-2.5 text-[13px] font-body font-semibold uppercase tracking-[0.08em] text-center"
                            style={{ color: ativo ? PALETA.wine : "hsl(var(--muted-foreground))" }}
                          >
                            {label}
                            {ativo && (
                              <motion.span
                                layoutId="ficha-aba"
                                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                                className="absolute left-3 right-3 -bottom-[1px] h-[2px] rounded-full"
                                style={{ background: PALETA.gold }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

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
                        <article
                          style={{ fontSize: `${fontScale}em` }}
                          className="
                            prose prose-sm md:prose-base max-w-none font-body
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
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                          ) : (
                            <p className="text-muted-foreground">Sem conteúdo neste tópico.</p>
                          )}
                        </article>
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
                </FichaEditorial>

                <div className="h-28" />
              </div>

            </div>

            {/* Ações flutuantes */}
            <div className="pointer-events-none absolute bottom-5 right-4 flex flex-col items-end gap-3">
              <AnimatePresence>
                {fontOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="pointer-events-auto flex items-center bg-card/95 backdrop-blur-md border border-border rounded-full shadow-xl overflow-hidden"
                  >
                    <button
                      onClick={decFont}
                      aria-label="Diminuir fonte"
                      className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all"
                    >
                      <span className="text-sm font-bold">A</span>
                    </button>
                    <span className="text-[10px] text-muted-foreground w-9 text-center">
                      {Math.round(fontScale * 100)}%
                    </span>
                    <button
                      onClick={incFont}
                      aria-label="Aumentar fonte"
                      className="w-11 h-11 flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all"
                    >
                      <span className="text-lg font-bold">A</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pointer-events-auto flex flex-col gap-2 items-end">
                <button
                  onClick={() => setFontOpen((v) => !v)}
                  aria-label="Tamanho da fonte"
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-card/95 backdrop-blur-md border border-border shadow-xl text-foreground active:scale-95 transition"
                >
                  <Type className="w-5 h-5" />
                </button>
                <button
                  onClick={copiar}
                  aria-label="Copiar resumo"
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-card/95 backdrop-blur-md border border-border shadow-xl text-foreground active:scale-95 transition"
                >
                  {copiado ? <Check className="w-5 h-5" style={{ color: RED }} /> : <Copy className="w-5 h-5" />}
                </button>
                <button
                  onClick={baixarPdf}
                  aria-label="Baixar em PDF"
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-card/95 backdrop-blur-md border border-border shadow-xl text-foreground active:scale-95 transition"
                >
                  <FileDown className="w-5 h-5" />
                </button>
                <button
                  onClick={share}
                  aria-label="Compartilhar"
                  className="w-12 h-12 flex items-center justify-center rounded-full text-white shadow-2xl hover:brightness-110 active:scale-95 transition-all"
                  style={{ backgroundColor: RED }}
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

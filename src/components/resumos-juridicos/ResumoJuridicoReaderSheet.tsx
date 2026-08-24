import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, NotebookText, Share2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useIsDesktop } from "@/hooks/use-desktop";

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
}

type Tab = "resumo" | "exemplos" | "termos";

export default function ResumoJuridicoReaderSheet({ resumo, onClose }: Props) {
  const isDesktop = useIsDesktop();
  const [fontScale, setFontScale] = useState(1.15);
  const [tab, setTab] = useState<Tab>("resumo");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resumo && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "auto" });
      setTab("resumo");
    }
  }, [resumo?.id]);

  const incFont = () => setFontScale((s) => Math.min(1.6, +(s + 0.1).toFixed(2)));
  const decFont = () => setFontScale((s) => Math.max(0.9, +(s - 0.1).toFixed(2)));

  const content =
    tab === "resumo" ? resumo?.markdown : tab === "exemplos" ? resumo?.exemplos : resumo?.termos;

  const share = async () => {
    if (!resumo) return;
    const text = `${resumo.subtema || resumo.tema}\n\n${resumo.markdown || ""}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: resumo.subtema || resumo.tema, text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      /* noop */
    }
  };

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
                <div className="flex items-center gap-2 px-4 py-3">
                  <button
                    onClick={onClose}
                    aria-label="Fechar"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground break-words">
                      {resumo.area} · {resumo.tema}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-5 pt-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground uppercase tracking-wide">
                    <NotebookText className="w-3 h-3" />
                    Resumo
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-bold">
                    {resumo.tema}
                  </span>
                </div>
                <h2 className="font-display text-2xl md:text-3xl text-foreground leading-[1.15] font-bold tracking-tight">
                  {resumo.subtema || resumo.tema}
                </h2>

                {(resumo.exemplos || resumo.termos) && (
                  <div className="flex gap-1 border-b border-border">
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
                    prose-p:text-foreground/90 prose-p:leading-[1.75] prose-p:my-4
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-foreground
                    prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r
                    prose-ul:my-4 prose-li:my-1
                  "
                >
                  {content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground">Sem conteúdo neste tópico.</p>
                  )}
                </article>

                <div className="h-24" />
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-5 right-4 flex flex-col items-end gap-3">
              <div className="pointer-events-auto flex items-center bg-card/95 backdrop-blur-md border border-border rounded-full shadow-xl overflow-hidden">
                <button
                  onClick={decFont}
                  aria-label="Diminuir fonte"
                  className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all"
                >
                  <span className="text-sm font-bold">A</span>
                </button>
                <div className="w-px h-5 bg-border" />
                <button
                  onClick={incFont}
                  aria-label="Aumentar fonte"
                  className="w-11 h-11 flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all"
                >
                  <span className="text-lg font-bold">A</span>
                </button>
              </div>
              <button
                onClick={share}
                aria-label="Compartilhar"
                className="pointer-events-auto w-12 h-12 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl hover:brightness-110 active:scale-95 transition-all"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

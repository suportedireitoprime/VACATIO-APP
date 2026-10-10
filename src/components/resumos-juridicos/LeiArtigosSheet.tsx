import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Loader2, Sparkles, FileText } from "lucide-react";
import { fetchArtigosPaginado } from "@/services/legislacaoService";
import { supabase } from "@/integrations/supabase/client";
import { LEI_ICON_MAP } from "@/lib/leiIcons";
import type { LeiCatalogItem } from "@/data/leisCatalog";
import ResumoJuridicoReaderSheet, { type ResumoRow } from "./ResumoJuridicoReaderSheet";

interface Props {
  lei: LeiCatalogItem | null;
  area?: string;
  onClose: () => void;
}

interface ArtigoItem {
  id?: string;
  numero: string;
  caput: string;
}

export default function LeiArtigosSheet({ lei, area, onClose }: Props) {
  const [artigos, setArtigos] = useState<ArtigoItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [gerandoNumero, setGerandoNumero] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoRow | null>(null);

  useEffect(() => {
    if (!lei) return;
    let ativo = true;
    setBusca("");
    setErro(null);
    setArtigos([]);
    setCarregando(true);
    fetchArtigosPaginado(lei.tabela_nome, 0, 10000)
      .then((r) => {
        if (!ativo) return;
        setArtigos(
          (r || []).map((a: any) => ({ id: a.id, numero: a.numero, caput: a.caput || "" })),
        );
      })
      .catch(() => ativo && setErro("Não foi possível carregar os artigos desta lei."))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [lei?.tabela_nome]);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return artigos;
    return artigos.filter(
      (a) => a.numero.toLowerCase().includes(t) || a.caput.toLowerCase().includes(t),
    );
  }, [artigos, busca]);

  const abrirArtigo = async (artigo: ArtigoItem) => {
    if (!lei || gerandoNumero) return;
    setErro(null);
    setGerandoNumero(artigo.numero);
    try {
      const prompt = `LEGISLAÇÃO: ${lei.nome}
ARTIGO: ${artigo.numero}
CAPUT: ${artigo.caput}

Gere um resumo deste artigo jurídico. Retorne ESTRITAMENTE um objeto JSON válido (sem \`\`\`json) com os seguintes campos:
{
  "markdown": "Um resumo doutrinário conciso, formatado em markdown, focando nos conceitos e aplicação principal. Use bullet points e negritos.",
  "exemplos": "Pelo menos um exemplo prático bem direto explicando a aplicação do artigo. Formato markdown.",
  "termos": "Uma explicação muito curta dos principais termos ou jargões jurídicos usados neste artigo."
}`;

      const systemPrompt = "Você é um professor de direito experiente. Explique de forma muito didática, concisa e direta, voltado para alunos e advogados. Retorne apenas JSON puro, sem textos introdutórios ou blocos markdown de código.";

      const { generateOmniText } = await import("@/lib/omniRouteClient");
      let res = await generateOmniText({
        prompt,
        systemPrompt,
        complexity: 'medium'
      });

      let cleanJson = res.replace(/```json/gi, '').replace(/```/g, '').trim();
      const startIdx = cleanJson.indexOf('{');
      const endIdx = cleanJson.lastIndexOf('}');
      if (startIdx >= 0 && endIdx >= 0) {
        cleanJson = cleanJson.substring(startIdx, endIdx + 1);
      }
      const raw = JSON.parse(cleanJson);

      const novoResumo: ResumoRow = {
        id: crypto.randomUUID(),
        area: area || lei.nome,
        tema: lei.nome,
        subtema: artigo.numero,
        ordem_subtema: 0,
        markdown: raw.markdown || null,
        exemplos: raw.exemplos || null,
        termos: raw.termos || null
      };

      setResumo(novoResumo);
    } catch (e: any) {
      setErro(e?.message || "Não foi possível gerar o resumo agora.");
    } finally {
      setGerandoNumero(null);
    }
  };

  const LeiIcon = (lei && LEI_ICON_MAP[lei.id]) || FileText;

  return (
    <>
      <AnimatePresence>
        {lei && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[81] flex h-[90dvh] flex-col rounded-t-3xl border-t border-border bg-background pb-[calc(0.5rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))]"
            >
              <div className="flex items-center justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              <div className="flex items-center gap-3 px-5 pb-3">
                <div className="w-11 h-11 rounded-2xl bg-secondary/70 flex items-center justify-center shrink-0">
                  <LeiIcon
                    className="w-6 h-6"
                    style={{ color: lei.iconColor || "hsl(var(--primary))" }}
                    strokeWidth={1.3}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg text-foreground font-bold leading-tight truncate uppercase">
                    {lei.nome}
                  </h3>
                  <p className="text-muted-foreground text-[12px] font-body leading-tight mt-0.5 truncate">
                    {carregando ? "Carregando artigos..." : `${artigos.length} artigos`}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Fechar"
                  className="w-10 h-10 rounded-full bg-secondary/60 flex items-center justify-center shrink-0"
                >
                  <ChevronDown className="w-5 h-5 text-foreground" />
                </button>
              </div>

              <div className="px-4 pb-3">
                <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-secondary/45 px-3 h-12">
                  <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar artigo ou trecho"
                    className="min-w-0 flex-1 bg-transparent font-body text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
                  />
                </div>
              </div>

              {erro && (
                <p className="px-5 pb-2 text-[12.5px] text-destructive font-body">{erro}</p>
              )}

              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {carregando ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filtrados.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-12">
                    Nenhum artigo encontrado.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filtrados.slice(0, 800).map((a, i) => {
                      const gerando = gerandoNumero === a.numero;
                      return (
                        <button
                          key={`${a.numero}-${i}`}
                          onClick={() => abrirArtigo(a)}
                          disabled={!!gerandoNumero}
                          className="w-full flex items-center gap-3 p-4 min-h-[76px] rounded-2xl bg-secondary/40 border border-border/50 text-left active:scale-[0.99] transition disabled:opacity-60"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-foreground text-[15px] font-bold leading-tight uppercase tracking-[0.06em]">
                              {a.numero}
                            </p>
                            <p className="font-body text-muted-foreground text-[12.5px] leading-snug mt-1 line-clamp-2">
                              {a.caput}
                            </p>
                          </div>
                          {gerando ? (
                            <Loader2 className="w-5 h-5 shrink-0 animate-spin text-primary" />
                          ) : (
                            <Sparkles className="w-5 h-5 shrink-0 text-primary/70" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {gerandoNumero && (
                <div className="absolute inset-x-0 bottom-0 top-0 z-10 flex flex-col items-center justify-center gap-3 rounded-t-3xl bg-background/85 backdrop-blur-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="font-display text-sm text-foreground uppercase tracking-wide">
                    Gerando resumo do {gerandoNumero}
                  </p>
                  <p className="text-[12.5px] text-muted-foreground font-body">
                    Conceitos, Cornell e Feynman
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ResumoJuridicoReaderSheet
        resumo={resumo}
        onClose={() => setResumo(null)}
        pregerarMetodos
      />
    </>
  );
}

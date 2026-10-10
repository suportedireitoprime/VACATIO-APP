import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, FileText, Loader2, PlayCircle, Sparkles, ChevronRight, NotebookText, BookOpen, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateOmniText } from '@/lib/omniRouteClient';
import ResumoJuridicoReaderSheet, { type ResumoRow } from '@/components/resumos-juridicos/ResumoJuridicoReaderSheet';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import hero1 from '@/assets/aprender-hero/hero-1.webp';
import hero2 from '@/assets/aprender-hero/hero-2.webp';
import hero3 from '@/assets/aprender-hero/hero-3.webp';
import hero4 from '@/assets/aprender-hero/hero-4.webp';
import hero5 from '@/assets/aprender-hero/hero-5.webp';
import hero6 from '@/assets/aprender-hero/hero-6.webp';

const HERO_ILLUSTRATIONS = [hero1, hero2, hero3, hero4, hero5, hero6];
const OFFSETS = [0, 56, 84, 56, 0, -56, -84, -56];

type ArtigoType = any;
type CapGroup = { capitulo: string; artigos: ArtigoType[]; titulo?: string };
type TituloGroup = { titulo: string; capitulos: CapGroup[] };

interface ResumosOverlayProps {
  capituloGroups: TituloGroup[];
  leiNome: string;
  onClose: () => void;
}

export default function ResumosOverlay({ capituloGroups, leiNome, onClose }: ResumosOverlayProps) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [selectedCapitulo, setSelectedCapitulo] = useState<CapGroup | null>(null);
  
  const [gerandoArtigoId, setGerandoArtigoId] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoRow | null>(null);

  const [artigoParaMetodo, setArtigoParaMetodo] = useState<ArtigoType | null>(null);
  const [metodoSelecionado, setMetodoSelecionado] = useState<"conceitos" | "cornell" | "feynman">("conceitos");

  useEffect(() => {
    const id = setInterval(() => {
      setHeroIdx((i) => (i + 1) % HERO_ILLUSTRATIONS.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const allCapitulos = useMemo(() => {
    return capituloGroups.flatMap(t => t.capitulos).filter(c => c.artigos.length > 0);
  }, [capituloGroups]);

  const totalResumos = allCapitulos.reduce((acc, curr) => acc + curr.artigos.length, 0);

  const iniciarGeracao = (metodo: "conceitos" | "cornell" | "feynman") => {
    if (!artigoParaMetodo) return;
    setMetodoSelecionado(metodo);
    gerarResumoConceitual(artigoParaMetodo);
    setArtigoParaMetodo(null);
  };

  const gerarResumoConceitual = async (artigo: ArtigoType) => {
    if (gerandoArtigoId) return;
    setGerandoArtigoId(artigo.id);
    const toastId = toast.loading(`Abrindo resumo do ${artigo.numero}...`);

    try {
      const num = artigo.numero.replace(/art\.?\s*/i, '').trim();
      const numLabelArtigo = `Artigo ${num}`;
      const numLabelArt = `Art. ${num}`;
      
      // 1. Tentar buscar no banco
      const { data: existing } = await supabase
        .from('resumos_juridicos')
        .select('*')
        .eq('area', leiNome)
        .eq('tema', leiNome)
        .in('subtema', [numLabelArtigo, numLabelArt, artigo.numero, num])
        .maybeSingle();

      if (existing) {
        setResumo(existing as ResumoRow);
        toast.success('Resumo carregado!', { id: toastId });
        setGerandoArtigoId(null);
        return;
      }

      // 2. Se não existir, gera via IA
      toast.loading(`Gerando resumo inédito do ${artigo.numero} (pode levar 10s)...`, { id: toastId });
      const prompt = `LEGISLAÇÃO: ${leiNome}\nARTIGO: ${artigo.numero}\nCAPUT: ${artigo.caput}\n\nGere uma explicação doutrinária extensa e didática, formatada em markdown. Retorne ESTRITAMENTE um objeto JSON válido (sem \`\`\`json) com os seguintes campos:\n{\n  "markdown": "O texto deve obrigatoriamente começar com o título '# Artigo ${num}'. Não crie títulos inventados como 'Análise profunda do artigo...'. O texto deve ser extremamente didático, explicando como se fosse para um leigo entender, mas mantendo a técnica jurídica quando necessário. Use analogias, tabelas markdown e listas. OBRIGATÓRIO: Vá direto ao ponto! PROIBIDO usar saudações.",\n  "exemplos": "Pelo menos 2 ou 3 exemplos práticos, ricos em detalhes e do cotidiano, ilustrando perfeitamente a aplicação deste artigo. Formato markdown.",\n  "termos": "Um pequeno glossário explicando detalhadamente de forma acessível os termos ou jargões jurídicos usados neste artigo."\n}`;

      const systemPrompt = "Você é um professor de direito experiente e didático. Seu objetivo é explicar conceitos jurídicos de forma profunda, completa e muito acessível para leigos. IMPORTANTE: NÃO inclua NENHUMA saudação, introdução ou conversa fiada. Vá DIRETO ao conteúdo da explicação jurídica. Retorne apenas JSON puro, sem marcações markdown em volta do JSON.";

      let res = await generateOmniText({
        prompt,
        systemPrompt,
        modelOverride: 'antigravity/gemini-3.8-flash-tiered',
        complexity: 'tiered'
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
        area: leiNome,
        tema: leiNome,
        subtema: numLabelArtigo,
        ordem_subtema: 0,
        markdown: raw.markdown || null,
        exemplos: raw.exemplos || null,
        termos: raw.termos || null
      };

      // Tenta salvar no banco pro próximo usuário não precisar gerar
      await supabase.from('resumos_juridicos').insert({
        id: novoResumo.id,
        area: novoResumo.area,
        tema: novoResumo.tema,
        subtema: novoResumo.subtema,
        ordem_subtema: novoResumo.ordem_subtema,
        markdown: novoResumo.markdown,
        exemplos: novoResumo.exemplos,
        termos: novoResumo.termos
      });

      setResumo(novoResumo);
      toast.success('Resumo gerado com sucesso!', { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível gerar o resumo agora.", { id: toastId });
    } finally {
      setGerandoArtigoId(null);
    }
  };

  if (selectedCapitulo) {
    return (
      <div className="flex flex-col h-full bg-background relative w-full rounded-t-[30px] overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(348 78% 45%) 0%, hsl(348 85% 50%) 40%, hsl(348 75% 40%) 100%)' }}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="flex items-center gap-3 p-4 border-b border-white/10 relative z-20">
          <button 
            onClick={() => setSelectedCapitulo(null)}
            className="w-10 h-10 rounded-full bg-black/20 border border-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-white drop-shadow-md" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-lg text-white truncate drop-shadow-md">
              {selectedCapitulo.capitulo.split(' - ').slice(1).join(' - ') || selectedCapitulo.capitulo}
            </h2>
            <p className="text-sm text-white/80 truncate font-body drop-shadow-sm">
              {selectedCapitulo.artigos.length} resumos
            </p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 pb-32 relative z-10">
          <ul className="flex flex-col items-center gap-4 py-8">
            {selectedCapitulo.artigos.map((artigo, idx) => {
              const offset = OFFSETS[idx % OFFSETS.length];
              const numText = artigo.numero.toLowerCase().includes('art') ? artigo.numero : `Art. ${artigo.numero}`;
              const isGerando = gerandoArtigoId === artigo.id;
              
              return (
                <li
                  key={artigo.id || idx}
                  className="w-full flex justify-center relative"
                  style={{ transform: `translateX(${offset}px)` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none z-20">
                    <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-bold text-white/90 border border-white/20 whitespace-nowrap shadow-sm">
                      {numText}
                    </div>
                  </div>

                  <button
                    onClick={() => setArtigoParaMetodo(artigo)}
                    disabled={!!gerandoArtigoId}
                    className="relative w-16 h-16 z-10 rounded-full flex items-center justify-center font-black text-white text-lg bg-orange-500 ring-orange-200 ring-4 ring-offset-2 ring-offset-transparent active:scale-95 transition-transform disabled:opacity-50"
                    style={{
                      boxShadow: '0 10px 22px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.25), inset 0 -4px 0 rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.18)',
                    }}
                  >
                    {isGerando ? (
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                    ) : (
                      <FileText className="w-6 h-6 text-white drop-shadow-sm" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {resumo && (
          <ResumoJuridicoReaderSheet
            resumo={resumo}
            onClose={() => setResumo(null)}
            initialMetodo={metodoSelecionado}
            pregerarMetodos={false}
          />
        )}

        <AnimatePresence>
          {artigoParaMetodo && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                onClick={() => setArtigoParaMetodo(null)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[70] bg-card rounded-t-[32px] p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-2xl border-t border-border"
              >
                <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
                <h3 className="text-xl font-display font-bold text-center text-foreground mb-2">
                  Escolha o formato
                </h3>
                <p className="text-sm text-center text-muted-foreground mb-6">
                  Como você quer estudar o {artigoParaMetodo.numero.toLowerCase().includes('art') ? artigoParaMetodo.numero : `Art. ${artigoParaMetodo.numero}`}?
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => iniciarGeracao("conceitos")}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
                  >
                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                      <FileText className="w-7 h-7 text-rose-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">Resumo Conceitual</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Uma explicação profunda e detalhada com exemplos práticos, ideal para absorver o conteúdo por completo.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => iniciarGeracao("cornell")}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
                  >
                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-7 h-7 text-amber-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">Método Cornell</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Organize as ideias principais com perguntas e anotações para facilitar suas revisões ativas.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => iniciarGeracao("feynman")}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
                  >
                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                      <Brain className="w-7 h-7 text-violet-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">Técnica Feynman</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Aprenda através de uma explicação em linguagem simples e analogias, como se ensinasse a alguém.</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ---- LISTA PRINCIPAL (Estilo Mapas Overlay - Azul) ----

  return (
    <div className="flex flex-col h-full relative w-full overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(220 75% 35%) 0%, hsl(225 80% 40%) 40%, hsl(215 70% 30%) 100%)' }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15),transparent_60%)] z-0" />
      <div 
        className="flex-1 overflow-y-auto w-full relative z-10"
        style={{ paddingBottom: 'calc(8rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))' }}
      >
        <section className="relative isolate shrink-0 pb-4 overflow-hidden -mx-px rounded-t-[30px]">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] sm:w-[34%] overflow-hidden">
            <AnimatePresence mode="popLayout">
              {HERO_ILLUSTRATIONS.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="absolute inset-y-0 right-0 h-full w-auto object-contain object-right transition-opacity duration-[1400ms] ease-in-out"
                  style={{ opacity: i === heroIdx ? 1 : 0 }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ))}
            </AnimatePresence>
          </div>

          <div 
            className="relative p-5"
            style={{ paddingTop: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 16px)' }}
          >
            <button 
              onClick={onClose}
              style={{ top: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 12px)' }}
              className="absolute left-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white shadow-sm active:scale-95 transition-all z-20"
            >
              <ArrowLeft className="w-5 h-5 drop-shadow-md" />
            </button>

            <div className="flex items-start gap-4 mt-8 relative z-10">
              <div className="min-w-0 max-w-[80%] text-white drop-shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">Sua trilha</p>
                <h1 className="mt-0.5 font-display text-[22px] font-black leading-tight sm:text-[26px]">
                  Resumos
                  <span className="ml-2 font-display text-[15px] font-semibold italic text-white/80">
                    jurídicos
                  </span>
                </h1>
                <p className="mt-0.5 text-[12px] leading-snug text-white/80 font-body">
                  Resumos organizados por capítulos de {leiNome}
                </p>
              </div>
            </div>

            <div className="relative mt-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-lg z-10">
              <div className="grid grid-cols-2 divide-x divide-white/10">
                <div className="flex flex-col items-center justify-center px-2 py-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Temas</span>
                  <span className="mt-0.5 font-display text-lg font-black leading-none">{allCapitulos.length}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-2 py-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Resumos Totais</span>
                  <span className="mt-0.5 font-display text-lg font-black leading-none">{totalResumos * 3}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="px-4 py-2 space-y-3">
          {allCapitulos.map((cap, i) => {
            const capPct = 0; // Placeholder
            return (
              <button
                key={i}
                onClick={() => setSelectedCapitulo(cap)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md p-3 text-left transition-all hover:bg-black/30 active:scale-[0.99] sm:p-3.5 shadow-sm"
              >
                <div className="relative h-14 w-14 shrink-0 flex items-center justify-center sm:h-16 sm:w-16">
                  <NotebookText className="h-9 w-9 text-[#60A5FA] drop-shadow-sm transition-transform group-hover:scale-110" strokeWidth={1.5} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[11px] font-bold text-white/60 uppercase tracking-wider truncate">
                      {(() => {
                        if (cap.capitulo.toUpperCase().includes('SEM_CAPITULO')) {
                          if (cap.titulo && !cap.titulo.toUpperCase().includes('SEM_TITULO')) {
                            return cap.titulo.split(' - ')[0].toUpperCase();
                          }
                          return 'CAPÍTULO I';
                        }
                        return cap.capitulo.split(' - ')[0].toUpperCase();
                      })()}
                    </p>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold bg-white/10 text-white/80 tabular-nums ml-auto">
                      {capPct}%
                    </span>
                  </div>
                  <p className="min-w-0 text-[14px] font-bold text-white sm:text-[15px] leading-snug drop-shadow-sm" style={{ fontFamily: "'Barlow', system-ui, sans-serif", letterSpacing: '-0.005em' }}>
                    {(() => {
                      let raw = '';
                      if (cap.capitulo.toUpperCase().includes('SEM_CAPITULO')) {
                        if (cap.titulo && !cap.titulo.toUpperCase().includes('SEM_TITULO')) {
                          raw = cap.titulo.split(' - ').slice(1).join(' - ') || cap.titulo;
                        } else {
                          raw = 'Disposições Gerais';
                        }
                      } else {
                        raw = cap.capitulo.split(' - ').slice(1).join(' - ') || cap.capitulo;
                      }
                      
                      if (raw && raw === raw.toUpperCase() && raw.length > 3) {
                        const pequenos = ['E', 'OU', 'DE', 'DA', 'DO', 'DAS', 'DOS', 'A', 'O', 'AS', 'OS', 'EM', 'NO', 'NA', 'NOS', 'NAS', 'POR'];
                        return raw.split(' ').map((word, idx) => {
                          if (idx > 0 && pequenos.includes(word)) return word.toLowerCase();
                          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                        }).join(' ');
                      }
                      return raw;
                    })()}
                  </p>
                  <p className="mt-0.5 text-[12px] text-white/60 sm:text-[13px]">
                    {cap.artigos.length} {cap.artigos.length === 1 ? 'artigo' : 'artigos'}
                  </p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full bg-blue-400 transition-all"
                      style={{ width: `${capPct}%` }}
                    />
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
          {allCapitulos.length === 0 && (
            <div className="text-center py-10 text-white/60 text-sm font-body">
              Nenhum artigo encontrado para resumir nesta legislação.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

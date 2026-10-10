import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, FileText, Loader2, PlayCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateOmniText } from '@/lib/omniRouteClient';
import ResumoJuridicoReaderSheet, { type ResumoRow } from '@/components/resumos-juridicos/ResumoJuridicoReaderSheet';
import { toast } from 'sonner';

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

  const gerarResumoConceitual = async (artigo: ArtigoType) => {
    if (gerandoArtigoId) return;
    setGerandoArtigoId(artigo.id);
    const toastId = toast.loading(`Gerando resumo do ${artigo.numero}...`);

    try {
      const prompt = `LEGISLAÇÃO: ${leiNome}
ARTIGO: ${artigo.numero}
CAPUT: ${artigo.caput}

Gere um resumo deste artigo jurídico. Retorne ESTRITAMENTE um objeto JSON válido (sem \`\`\`json) com os seguintes campos:
{
  "markdown": "Um resumo doutrinário conciso, formatado em markdown, focando nos conceitos e aplicação principal. Use bullet points e negritos.",
  "exemplos": "Pelo menos um exemplo prático bem direto explicando a aplicação do artigo. Formato markdown.",
  "termos": "Uma explicação muito curta dos principais termos ou jargões jurídicos usados neste artigo."
}`;

      const systemPrompt = "Você é um professor de direito experiente. Explique de forma muito didática, concisa e direta, voltado para alunos e advogados. Retorne apenas JSON puro, sem textos introdutórios ou blocos markdown de código.";

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
        area: leiNome,
        tema: leiNome,
        subtema: artigo.numero,
        ordem_subtema: 0,
        markdown: raw.markdown || null,
        exemplos: raw.exemplos || null,
        termos: raw.termos || null
      };

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
                    onClick={() => gerarResumoConceitual(artigo)}
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
            pregerarMetodos={true}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative w-full rounded-t-[30px] overflow-hidden">
      <div className="flex items-center justify-between p-4 pb-2 relative z-20">
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-all shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto relative z-10 pb-[env(safe-area-inset-bottom)] hide-scrollbar">
        <div className="px-5 pt-2 pb-6">
          <div className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden mb-6 shadow-md border border-border/50">
            <AnimatePresence mode="popLayout">
              <motion.img
                key={heroIdx}
                src={HERO_ILLUSTRATIONS[heroIdx]}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 w-full h-full object-cover"
                alt="Ilustração Resumos"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <h1 className="font-display font-bold text-2xl text-white tracking-tight leading-tight mb-1">
                  Resumos
                </h1>
                <p className="font-body text-white/80 text-sm leading-tight max-w-[240px]">
                  Resumos conceituais, Técnicas Feynman e Cornell.
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg text-foreground uppercase tracking-wider">
              {leiNome}
            </h2>
            <span className="ml-auto text-xs font-bold px-2 py-1 bg-secondary text-muted-foreground rounded-full">
              {totalResumos} resumos
            </span>
          </div>

          <div className="space-y-4">
            {allCapitulos.map((cap, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedCapitulo(cap)}
                className="w-full text-left rounded-2xl bg-card border border-border/40 hover:border-primary/30 p-4 shadow-sm active:scale-[0.98] transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-secondary group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors">
                    <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <h3 className="font-display font-bold text-foreground text-[15px] leading-snug mb-1 line-clamp-2">
                      {cap.capitulo}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      {cap.artigos.length} artigos disponíveis
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary shrink-0 self-center transition-colors" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

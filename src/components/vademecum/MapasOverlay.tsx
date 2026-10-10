import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Brain, Layers, GitBranch, Network, Loader2, Sparkles, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateOmniText } from '@/lib/omniRouteClient';
import { TIPO_INFO, normalizeContent, type VisualContent, type VisualTipo, type VisualRecord } from '@/lib/visuaisJuridicos/types';
import { limparCacheVisuais } from '@/lib/visuaisJuridicos/cache';
import { limparTodosOsVisuais } from '@/lib/visuaisJuridicos/prefs';
import VisualViewer from '@/components/visuais/VisualViewer';
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

const TIPO_ICON: Record<VisualTipo, any> = {
  mapa_mental: Brain,
  infografico: Layers,
  fluxograma: GitBranch,
  diagrama: Network,
};

const TIPO_COR: Record<VisualTipo, string> = {
  mapa_mental: '#ef4444',
  infografico: '#f59e0b',
  fluxograma: '#22c55e',
  diagrama: '#8b5cf6',
};

interface MapasOverlayProps {
  capituloGroups: TituloGroup[];
  leiNome: string;
  onClose: () => void;
}

const formatPrompt = (tipo: VisualTipo, lei: string, artigo: any) => {
  const numLimpo = String(artigo.numero || '').replace(/^[^\d]*/, '').trim();
  let textoLegal = `Art. ${numLimpo} - ${artigo.caput || ''}\n`;
  if (artigo.paragrafos?.length) {
    textoLegal += artigo.paragrafos.map((p: any) => `§ ${p.numero || ''} ${p.texto || ''}`).join('\n') + '\n';
  }
  if (artigo.incisos?.length) {
    textoLegal += artigo.incisos.map((i: any) => `${i.numero || ''} - ${i.texto || ''}`).join('\n') + '\n';
  }
  if (artigo.alineas?.length) {
    textoLegal += artigo.alineas.map((a: any) => `${a.letra || ''}) ${a.texto || ''}`).join('\n') + '\n';
  }

  const baseContext = `LEGISLAÇÃO: ${lei}
DISPOSITIVO ANALISADO:
${textoLegal.trim()}

DIRETRIZES DE ENGENHARIA DE PROMPT E LEGAL DESIGN:
1. EXCLUSIVAMENTE JSON: Retorne apenas o objeto JSON puro, sem blocos de código markdown (\`\`\`json), sem textos introdutórios ou comentários.
2. SÍNTESE E ELEGÂNCIA: Crie um material visual de alto padrão (esquemas jurídicos profissionais no nível de editoras consagradas). NUNCA escreva parágrafos longos, dissertações ou textos prolixos. Cada item deve ser conciso, direto, técnico e de alto impacto didático.
3. SEM RETICÊNCIAS: É TERMINANTEMENTE PROIBIDO usar "..." ou reticências literais. Todas as frases devem ser completas e concluídas com pontuação correta.
4. LIMITE E PROPORÇÃO: Siga rigorosamente as restrições de tamanho para cada campo, garantindo que o texto caiba harmonicamente nos blocos visuais.`;

  if (tipo === 'mapa_mental') {
    return `${baseContext}

OBJETIVO DA CATEGORIA [MAPA MENTAL]:
Criar uma síntese radial e panorâmica dos pilares do artigo, partindo de um conceito nuclear para 4 ramos temáticos bem definidos (ex: 1. Regra Geral/Núcleo, 2. Requisitos/Pressupostos, 3. Exceções/Casos Especiais, 4. Efeitos/Consequências).

FORMATO JSON OBRIGATÓRIO:
{
  "titulo": "Art. ${numLimpo}, ${lei} — [Título curto do tema central, máx 55 caracteres]",
  "subtitulo": "[Frase concisa resumindo o objetivo da norma, máx 80 caracteres]",
  "fonte": "${lei}, Art. ${numLimpo}",
  "central": "[Conceito nuclear, 2 a 4 palavras, máx 25 caracteres]",
  "ramos": [
    {
      "titulo": "[Nome do ramo temático, máx 28 caracteres]",
      "itens": [
        "[Frase técnica assertiva e completa, de 35 a 65 caracteres]",
        "[Frase técnica assertiva e completa, de 35 a 65 caracteres]",
        "[Frase técnica assertiva e completa, de 35 a 65 caracteres]"
      ],
      "nota": "[Observação doutrinária/jurisprudencial sintética, máx 75 caracteres]"
    }
  ]
}

REGRAS ESPECÍFICAS DO MAPA MENTAL:
- Gere exatamente 4 ramos equilibrados e relevantes.
- Cada ramo deve ter de 2 a 3 itens concisos.
- O campo "central" deve ter apenas de 2 a 4 palavras impactantes (ex: "Recusa Terapêutica", "Tutela do Nascituro", "Capacidade Civil").`;
  }

  if (tipo === 'infografico') {
    return `${baseContext}

OBJETIVO DA CATEGORIA [INFOGRÁFICO]:
Apresentar os elementos, requisitos ou espécies do artigo em cartões numerados sequenciais (cards em grid), ideais para memorização rápida e consulta prática.

FORMATO JSON OBRIGATÓRIO:
{
  "titulo": "Art. ${numLimpo}, ${lei} — [Guia prático / Requisitos do tema, máx 55 caracteres]",
  "subtitulo": "[Contextualização concisa da aplicação prática, máx 80 caracteres]",
  "fonte": "${lei}, Art. ${numLimpo}",
  "cards": [
    {
      "titulo": "[1. Nome técnico do requisito/elemento, máx 32 caracteres]",
      "texto": "[Explicação técnica fluida, concisa e completa em 2 frases curtas, de 90 a 140 caracteres]"
    }
  ],
  "rodape": "[Regra de ouro prática ou ponto de atenção para concursos e advocacia, máx 100 caracteres]"
}

REGRAS ESPECÍFICAS DO INFOGRÁFICO:
- Gere exatamente 4 cards numerados sequencialmente ("1. ...", "2. ...", "3. ...", "4. ...").
- O texto de cada card deve ser completo, sem cortes e sem reticências, com linguagem fluida e jurídica.`;
  }

  if (tipo === 'fluxograma') {
    return `${baseContext}

OBJETIVO DA CATEGORIA [FLUXOGRAMA DECISÓRIO]:
Construir uma árvore lógica de subsunção jurídica (passo a passo para aplicar o artigo a um caso concreto). Cada decisão é uma pergunta direta testável que avança para a próxima etapa em caso de 'SIM' ou desvia para a consequência em caso de 'NÃO'.

FORMATO JSON OBRIGATÓRIO:
{
  "titulo": "Art. ${numLimpo}, ${lei} — [Fluxo Decisório do Tema, máx 55 caracteres]",
  "subtitulo": "[Critérios práticos para subsunção e solução do caso concreto, máx 80 caracteres]",
  "fonte": "${lei}, Art. ${numLimpo}",
  "entrada": "[Fato concreto que dá início ao procedimento, máx 50 caracteres]",
  "decisoes": [
    {
      "pergunta": "[Pergunta de teste jurídico direto com SIM ou NÃO?, máx 60 caracteres]",
      "seNao": "[Consequência jurídica imediata se a resposta for NÃO, máx 75 caracteres]",
      "base": "[Artigo ou súmula sintética, máx 30 caracteres, ex: Art. 15, caput]"
    }
  ],
  "resultado": "[Consequência jurídica final se todas as respostas forem SIM, máx 75 caracteres]"
}

REGRAS ESPECÍFICAS DO FLUXOGRAMA:
- Gere de 3 a 4 decisões lógicas e encadeadas.
- O campo 'entrada' deve ser um fato prático curto (ex: "Paciente manifesta recusa a procedimento médico").
- A 'pergunta' deve ser curta e clara (ex: "O paciente é plenamente capaz e lúcido?").
- O campo 'seNao' deve ser a consequência objetiva (ex: "Vontade suprida por representante ou emergência médica.").
- O campo 'resultado' é o desfecho favorável (ex: "Recusa é legítima: prevalece a autonomia e vedado o constrangimento.").`;
  }

  return `${baseContext}

OBJETIVO DA CATEGORIA [DIAGRAMA TAXONÔMICO]:
Estruturar a hierarquia conceitual e classificação dogmática do artigo, com uma raiz central no topo distribuindo para 3 colunas de espécies, princípios ou desdobramentos.

FORMATO JSON OBRIGATÓRIO:
{
  "titulo": "Art. ${numLimpo}, ${lei} — [Estrutura Dogmática do Tema, máx 55 caracteres]",
  "subtitulo": "[Classificação e relação sistemática dos institutos, máx 80 caracteres]",
  "fonte": "${lei}, Art. ${numLimpo}",
  "raiz": "[Conceito-tronco superior da classificação, máx 35 caracteres]",
  "grupos": [
    {
      "titulo": "[Nome da categoria ou espécie, máx 28 caracteres]",
      "itens": [
        "[Ponto dogmático conciso e direto, de 35 a 65 caracteres]",
        "[Ponto dogmático conciso e direto, de 35 a 65 caracteres]",
        "[Ponto dogmático conciso e direto, de 35 a 65 caracteres]"
      ],
      "nota": "[Observação doutrinária sintética, máx 70 caracteres]"
    }
  ]
}

REGRAS ESPECÍFICAS DO DIAGRAMA:
- Gere exatamente 3 colunas temáticas equilibradas.
- Cada grupo deve ter de 2 a 3 itens concisos e técnicos.`;
};

export function MapasOverlay({ capituloGroups, leiNome, onClose }: MapasOverlayProps) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [selectedCapitulo, setSelectedCapitulo] = useState<CapGroup | null>(null);
  const [selectedArtigo, setSelectedArtigo] = useState<ArtigoType | null>(null);
  const [gerando, setGerando] = useState<VisualTipo | null>(null);
  const [visualAtivo, setVisualAtivo] = useState<VisualRecord | null>(null);

  useEffect(() => {
    // Apaga os registros e cache antigos para garantir dados limpos com a nova engenharia
    limparCacheVisuais();
    limparTodosOsVisuais();

    const id = setInterval(() => {
      setHeroIdx((i) => (i + 1) % HERO_ILLUSTRATIONS.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const allCapitulos = useMemo(() => {
    return capituloGroups.flatMap(t => t.capitulos.map(c => ({...c, titulo: t.titulo}))).filter(c => c.artigos.length > 0);
  }, [capituloGroups]);

  const totalAulas = allCapitulos.reduce((acc, curr) => acc + curr.artigos.length, 0);

  const gerarVisual = async (tipo: VisualTipo) => {
    if (!selectedArtigo) return;
    setGerando(tipo);
    try {
      const prompt = formatPrompt(tipo, leiNome, selectedArtigo);
      let res;
      try {
        res = await generateOmniText({
          prompt,
          systemPrompt: "Você é um jurista e especialista sênior em Legal Design e Visual Law. Retorne ESTRITAMENTE um objeto JSON válido, sem blocos markdown (```json), sem introdução ou texto fora do JSON. Siga com precisão cirúrgica os limites de caracteres e a lógica de cada campo, sem usar reticências ou textos prolixos.",
          complexity: 'low'
        });
      } catch (networkErr: any) {
        throw networkErr;
      }
      
      let cleanJson = res.replace(/```json/gi, '').replace(/```/g, '').trim();
      const startIdx = cleanJson.indexOf('{');
      const endIdx = cleanJson.lastIndexOf('}');
      if (startIdx >= 0 && endIdx >= 0) {
        cleanJson = cleanJson.substring(startIdx, endIdx + 1);
      }
      
      let raw;
      try {
        raw = JSON.parse(cleanJson);
      } catch (err: any) {
        console.error("JSON inválido:", cleanJson);
        throw new Error('Falha no JSON gerado: ' + err.message);
      }
      
      const content = normalizeContent(tipo, raw);
      if (!content) throw new Error('Falha ao normalizar conteúdo gerado pela IA. Formato incompatível.');
      
      const record: VisualRecord = {
        id: crypto.randomUUID(),
        tipo,
        categoria: 'leis',
        item_key: `art-${selectedArtigo.numero}`,
        item_label: `Art. ${selectedArtigo.numero}`,
        titulo: content.titulo,
        conteudo: content,
        fonte: content.fonte || null,
        views: 1,
        created_at: new Date().toISOString()
      };
      
      setVisualAtivo(record);
      setSelectedArtigo(null); // Fecha o modal flutuante
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Não foi possível gerar o visual jurídico agora.');
    } finally {
      setGerando(null);
    }
  };

  if (visualAtivo) {
    return <VisualViewer registro={visualAtivo} onClose={() => setVisualAtivo(null)} />;
  }

  // ---- LISTA DE ARTIGOS (Estilo Trilha) ----
  if (selectedCapitulo) {
    return (
      <div className="flex flex-col h-full bg-background relative w-full rounded-t-[30px] overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(270 70% 30%) 0%, hsl(275 75% 35%) 40%, hsl(265 72% 28%) 100%)' }}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15),transparent_60%)]" />
        <div 
          className="flex items-center gap-3 px-4 pb-4 border-b border-white/10 relative z-20 shrink-0"
          style={{ paddingTop: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 14px)' }}
        >
          <button 
            onClick={() => setSelectedCapitulo(null)}
            className="w-10 h-10 rounded-full bg-black/20 border border-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all shadow-sm shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-white drop-shadow-md" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-lg text-white truncate drop-shadow-md">
              {(() => {
                let raw = '';
                if (selectedCapitulo.capitulo?.toUpperCase().includes('SEM_CAPITULO')) {
                  if (selectedCapitulo.titulo && !selectedCapitulo.titulo.toUpperCase().includes('SEM_TITULO') && !selectedCapitulo.titulo.toUpperCase().includes('SEM_CAPITULO')) {
                    raw = selectedCapitulo.titulo.split(' - ').slice(1).join(' - ') || selectedCapitulo.titulo;
                  } else {
                    raw = 'Disposições Gerais';
                  }
                } else {
                  raw = selectedCapitulo.capitulo?.split(' - ').slice(1).join(' - ') || selectedCapitulo.capitulo;
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
            </h2>
            <p className="text-sm text-white/80 truncate font-body drop-shadow-sm">
              {selectedCapitulo.artigos.length} artigos para mapear
            </p>
          </div>
        </div>
        
        <div 
          className="flex-1 overflow-y-auto p-4 relative z-10"
          style={{ paddingBottom: 'calc(8rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))' }}
        >
          <ul className="flex flex-col items-center gap-4 py-8">
            {selectedCapitulo.artigos.map((artigo, idx) => {
              const offset = OFFSETS[idx % OFFSETS.length];
              const numText = artigo.numero.toLowerCase().includes('art') ? artigo.numero : `Art. ${artigo.numero}`;
              
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
                    onClick={() => setSelectedArtigo(artigo)}
                    className="relative w-16 h-16 z-10 rounded-full flex items-center justify-center bg-purple-600 ring-purple-300 ring-4 ring-offset-2 ring-offset-transparent active:scale-95 transition-transform"
                    style={{
                      boxShadow: '0 10px 22px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.25), inset 0 -4px 0 rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.18)',
                    }}
                  >
                    <Brain className="w-7 h-7 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)]" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* MODAL FLUTUANTE PARA ESCOLHA DO TIPO */}
        <AnimatePresence>
          {selectedArtigo && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end"
            >
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="bg-card w-full rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]"
                style={{ paddingBottom: 'calc(var(--sai-bottom, env(safe-area-inset-bottom, 0px)) + 24px)' }}
              >
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border shrink-0">
                  <div>
                    <h3 className="font-display font-bold text-xl text-foreground">
                      Art. {selectedArtigo.numero.replace(/\D/g, '')}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Escolha o formato do visual
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedArtigo(null)}
                    className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-all"
                  >
                    <X className="w-5 h-5 text-foreground" />
                  </button>
                </div>
                
                <div 
                  className="p-4 space-y-3 overflow-y-auto"
                  style={{ paddingBottom: 'calc(var(--sai-bottom, env(safe-area-inset-bottom, 0px)) + 12px)' }}
                >
                  {(Object.keys(TIPO_INFO) as VisualTipo[]).map((t) => {
                    const Icon = TIPO_ICON[t];
                    const isGerando = gerando === t;
                    return (
                      <button
                        key={t}
                        disabled={!!gerando}
                        onClick={() => gerarVisual(t)}
                        className="w-full flex items-center gap-4 px-4 h-[84px] rounded-2xl bg-secondary/40 border border-border/50 active:scale-[0.99] transition disabled:opacity-50"
                      >
                        <div className="relative overflow-hidden rounded-xl shrink-0">
                          <Icon
                            className="w-8 h-8 relative"
                            style={{ color: TIPO_COR[t], filter: 'saturate(1.5) brightness(1.2)' }}
                            strokeWidth={1.3}
                          />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-display text-foreground text-[16px] font-bold leading-tight uppercase">
                            {TIPO_INFO[t].label}
                          </p>
                          <p className="font-body text-muted-foreground text-[12.5px] leading-snug mt-1 line-clamp-2">
                            {TIPO_INFO[t].desc}
                          </p>
                        </div>
                        {isGerando ? (
                          <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                        ) : (
                          <Sparkles className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ---- LISTA PRINCIPAL (Estilo Aulas Overlay) ----
  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = 0; // Placeholder
  const dash = c - (pct / 100) * c;

  return (
    <div className="flex flex-col h-full relative w-full overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(270 70% 30%) 0%, hsl(275 75% 35%) 40%, hsl(265 72% 28%) 100%)' }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15),transparent_60%)] z-0" />
      <div 
        className="flex-1 overflow-y-auto w-full relative z-10"
        style={{ paddingBottom: 'calc(8rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))' }}
      >
        <section className="relative isolate shrink-0 pb-4 overflow-hidden -mx-px rounded-t-[30px]">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] sm:w-[34%] overflow-hidden">
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
          </div>

          <div 
            className="relative p-5"
            style={{ paddingTop: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 16px)' }}
          >
            <button 
              onClick={onClose}
              style={{ top: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 12px)' }}
              className="absolute left-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white shadow-sm active:scale-95 transition-all"
            >
              <ArrowLeft className="w-5 h-5 drop-shadow-md" />
            </button>

            <div className="flex items-start gap-4 mt-8">
              <div className="relative shrink-0 mt-1" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                  <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} fill="none" />
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="#fff"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={c}
                    strokeDashoffset={dash}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-[14px] font-black leading-none text-white">{pct}%</span>
                </div>
              </div>

              <div className="min-w-0 max-w-[65%] text-white drop-shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">Sua trilha</p>
                <h1 className="mt-0.5 font-display text-[22px] font-black leading-tight sm:text-[26px]">
                  Mapas
                  <span className="ml-2 font-display text-[15px] font-semibold italic text-white/80">
                    visuais
                  </span>
                </h1>
                <p className="mt-0.5 text-[12px] leading-snug text-white/80 font-body">
                  Mapas organizados por capítulos de {leiNome}
                </p>
              </div>
            </div>

            <div className="relative mt-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-lg">
              <div className="grid grid-cols-2 divide-x divide-white/10">
                <div className="flex flex-col items-center justify-center px-2 py-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Trilhas</span>
                  <span className="mt-0.5 font-display text-lg font-black leading-none">{allCapitulos.length}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-2 py-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Artigos Totais</span>
                  <span className="mt-0.5 font-display text-lg font-black leading-none">{totalAulas}</span>
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
                  <Brain className="h-9 w-9 text-[#C084FC] drop-shadow-sm transition-transform group-hover:scale-110" strokeWidth={1.5} />
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
                      
                      // Convert ALL CAPS to Title Case, excluding small words optionally (simple title case here)
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
                      className="h-full rounded-full bg-purple-400 transition-all"
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
              Nenhum artigo encontrado para mapear nesta legislação.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapasOverlay;

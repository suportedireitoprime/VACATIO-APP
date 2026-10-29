import React, { useState, useMemo, useEffect } from 'react';
import { 
  Target, ArrowLeft, ChevronRight, CheckCircle2, XCircle, RotateCcw, 
  Trophy, Lightbulb, Loader2, Sparkles, HelpCircle, Check, X, BookOpen 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateOmniText } from '@/lib/omniRouteClient';

// Fallbacks caso não exista o diretório em vacatio app
import hero1 from '@/assets/aprender-hero/hero-1.webp';
import hero2 from '@/assets/aprender-hero/hero-2.webp';
import hero3 from '@/assets/aprender-hero/hero-3.webp';
import hero4 from '@/assets/aprender-hero/hero-4.webp';
import hero5 from '@/assets/aprender-hero/hero-5.webp';
import hero6 from '@/assets/aprender-hero/hero-6.webp';

const HERO_ILLUSTRATIONS = [hero1, hero2, hero3, hero4, hero5, hero6];
const OFFSETS = [0, 56, 84, 56, 0, -56, -84, -56];

const PASSOS_GERACAO_QUESTOES = [
  'Lendo caput, parágrafos e incisos do dispositivo',
  'Identificando conceitos-chave e regras de aplicação',
  'Estruturando 10 questões (conceito, sim/não e casos práticos)',
  'Elaborando pegadinhas e alternativas plausíveis',
  'Finalizando gabarito e comentários fundamentados',
];

import { formatCapituloDisplay } from '@/lib/capituloFormat';

type ArtigoType = any;
type CapGroup = { capitulo: string; titulo?: string; artigos: ArtigoType[] };
type TituloGroup = { titulo: string; capitulos: CapGroup[] };

export interface Alternativa {
  letra: string;
  texto: string;
}

export interface QuestaoItem {
  id: number;
  tipo: 'definicao' | 'caso_pratico' | 'sim_ou_nao' | 'requisitos' | 'pegadinha';
  dispositivo: string;
  enunciado: string;
  formato: 'multipla_escolha' | 'sim_nao';
  alternativas: Alternativa[];
  gabarito: string;
  comentario: string;
}

export interface QuestoesPacote {
  artigo: string;
  artigoNumero: string;
  lei: string;
  questoes: QuestaoItem[];
}

interface QuestoesOverlayProps {
  capituloGroups: TituloGroup[];
  leiNome: string;
  onClose: () => void;
  onArtigoSelect?: (artigo: ArtigoType) => void;
}

const TIPO_BADGES: Record<string, { label: string; cor: string }> = {
  definicao: { label: 'Conceito & Definição', cor: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  caso_pratico: { label: 'Caso Prático', cor: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  sim_ou_nao: { label: 'Sim ou Não', cor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  requisitos: { label: 'Requisitos & Elementos', cor: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  pegadinha: { label: 'Ponto de Atenção', cor: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
};

function extrairTextoCompleto(artigo: any, numLimpo: string): string {
  if (artigo.texto && artigo.texto.trim().length > 10) {
    return artigo.texto.trim();
  }
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
  return textoLegal.trim();
}

function formatQuestoesPrompt(lei: string, artigo: any): string {
  const numLimpo = String(artigo.numero || '').replace(/^[^\d]*/, '').trim();
  const textoLegal = extrairTextoCompleto(artigo, numLimpo);

  return `LEGISLAÇÃO: ${lei}
ARTIGO ANALISADO:
${textoLegal}

ATUE COMO UM PROFESSOR E EXAMINADOR JURÍDICO SÊNIOR (PADRÃO OAB E CONCURSOS DE ALTO NÍVEL).
Crie exatamente 10 QUESTÕES DIDÁTICAS DE EXCELÊNCIA cobrindo com profundidade todas as partes deste artigo (Caput, Parágrafos, Incisos e Alíneas se houver).

DISTRIBUIÇÃO DAS 10 QUESTÕES:
1. Questões de DEFINIÇÃO / CONCEITO (alcance e significado dos termos da regra geral)
2. Questões de SIM OU NÃO (julgar se uma premissa ou conduta hipotética é admitida ou proibida pela norma)
3. Questões de CASO PRÁTICO (situações-problema concretas com personagens reais como João, Maria, Empresa X)
4. Questões de REQUISITOS, EXCEÇÕES E PEGADINHAS (prazos, condições e ressalvas legais)

RETORNE EXCLUSIVAMENTE UM OBJETO JSON VÁLIDO (SEM BLOCOS MARKDOWN \`\`\`json, SEM TEXTO ANTES OU DEPOIS):
{
  "artigo": "Art. ${numLimpo}",
  "artigoNumero": "${numLimpo}",
  "lei": "${lei}",
  "questoes": [
    {
      "id": 1,
      "tipo": "definicao",
      "dispositivo": "Caput",
      "enunciado": "Sobre a disposição geral estabelecida no caput do Art. ${numLimpo}, assinale a alternativa correta:",
      "formato": "multipla_escolha",
      "alternativas": [
        { "letra": "A", "texto": "..." },
        { "letra": "B", "texto": "..." },
        { "letra": "C", "texto": "..." },
        { "letra": "D", "texto": "..." }
      ],
      "gabarito": "A",
      "comentario": "Comentário detalhado explicando a resposta com base no texto da lei."
    },
    {
      "id": 2,
      "tipo": "sim_ou_nao",
      "dispositivo": "Caput",
      "enunciado": "Diante das regras do artigo analisado, é juridicamente válido afirmar que...?",
      "formato": "sim_nao",
      "alternativas": [
        { "letra": "SIM", "texto": "SIM — Está em perfeita conformidade com o dispositivo legal" },
        { "letra": "NAO", "texto": "NÃO — Viola frontalmente o comando normativo" }
      ],
      "gabarito": "SIM",
      "comentario": "Comentário pedagógico justificando o gabarito."
    }
  ]
}

REGRAS RÍGIDAS:
- Devem ser exatamente 10 questões numeradas de 1 a 10 no array "questoes".
- Intercale questões de múltipla escolha (A, B, C, D) e Sim ou Não (SIM, NAO).
- Cada questão deve indicar em 'dispositivo' qual parte do artigo está sendo testada (ex: 'Caput', '§ 1º', 'Inciso I', 'Regra Geral').
- Cada questão deve conter comentário fundamentado explicando o motivo do acerto e das alternativas erradas.`;
}

function gerarQuestoesFallback(artigo: any, lei: string): QuestoesPacote {
  const numLimpo = String(artigo.numero || '').replace(/^[^\d]*/, '').trim();
  const textoLegal = extrairTextoCompleto(artigo, numLimpo);
  const frases = textoLegal.split(/[;.:\n]+/).map(f => f.trim()).filter(f => f.length > 15);
  const f1 = frases[0] || `O dispositivo do Art. ${numLimpo} estabelece preceito fundamental aplicável na matéria.`;
  const f2 = frases[1] || `A aplicação das regras exige estrita observância das condições previstas no diploma legal.`;

  const qList: QuestaoItem[] = [
    {
      id: 1,
      tipo: 'definicao',
      dispositivo: 'Caput',
      enunciado: `Em conformidade expressa com o caput do Art. ${numLimpo} da ${lei}, qual é a correta definição da norma?`,
      formato: 'multipla_escolha',
      alternativas: [
        { letra: 'A', texto: `${f1}.` },
        { letra: 'B', texto: 'A regra perde eficácia automática caso haja simples estipulação em contrário sem previsão em lei.' },
        { letra: 'C', texto: 'A norma tem caráter meramente elucidativo, não vinculando as partes nem os órgãos julgadores.' },
        { letra: 'D', texto: 'O dispositivo foi integralmente derrogado sem previsão de regra substitutiva.' }
      ],
      gabarito: 'A',
      comentario: `Correta a alternativa A. Essa é a dicção literal e o núcleo normativo expressos no Art. ${numLimpo} da ${lei}.`
    },
    {
      id: 2,
      tipo: 'sim_ou_nao',
      dispositivo: 'Caput',
      enunciado: `Diante do teor do Art. ${numLimpo}, é lícito ao aplicador do direito afastar o comando normativo sob mera alegação de conveniência administrativa?`,
      formato: 'sim_nao',
      alternativas: [
        { letra: 'SIM', texto: 'SIM — A conveniência administrativa se sobrepõe ao comando expresso da lei' },
        { letra: 'NAO', texto: 'NÃO — O princípio da legalidade vincula a atuação jurídica ao comando normativo' }
      ],
      gabarito: 'NAO',
      comentario: `Correto o NÃO. As normas legais cogentes possuem força imperativa e vinculante, não podendo ser afastadas por discricionariedade desprovida de previsão expressa.`
    },
    {
      id: 3,
      tipo: 'caso_pratico',
      dispositivo: 'Caput / Aplicação',
      enunciado: `Em caso concreto hipotético envolvendo a aplicação do Art. ${numLimpo}, uma das partes sustenta que a regra só produz efeitos se houver homologação prévia especial. De acordo com a sistemática legal, tal alegação:`,
      formato: 'multipla_escolha',
      alternativas: [
        { letra: 'A', texto: 'Não procede, pois a norma possui eficácia direta e aplicabilidade nos termos em que foi promulgada.' },
        { letra: 'B', texto: 'Procede integralmente, dependendo sempre de chancela arbitral.' },
        { letra: 'C', texto: 'Apenas produz efeitos se houver manifestação unânime dos envolvidos.' },
        { letra: 'D', texto: 'Fica suspensa até que sobrevenha decisão de tribunal superior.' }
      ],
      gabarito: 'A',
      comentario: `Correta a alternativa A. Os comandos do dispositivo têm aplicabilidade plena e eficácia regulada pela própria legislação.`
    },
    {
      id: 4,
      tipo: 'requisitos',
      dispositivo: 'Requisitos Legais',
      enunciado: `Quanto aos requisitos e pressupostos exigidos para a incidência do Art. ${numLimpo}, assinale a afirmativa verdadeira:`,
      formato: 'multipla_escolha',
      alternativas: [
        { letra: 'A', texto: `${f2}.` },
        { letra: 'B', texto: 'Independe de qualquer correlação fática com o suporte da norma.' },
        { letra: 'C', texto: 'Aplica-se exclusivamente aos litígios formalmente ajuizados após dez anos da vigência.' },
        { letra: 'D', texto: 'Exige comprovação de dolo em qualquer espécie de relação fática.' }
      ],
      gabarito: 'A',
      comentario: `Correta a alternativa A. A subsunção jurídica exige a subsistência do suporte fático tipificado na legislação.`
    },
    {
      id: 5,
      tipo: 'sim_ou_nao',
      dispositivo: 'Validade e Eficácia',
      enunciado: `A vigência e a obrigatoriedade dos comandos do Art. ${numLimpo} estendem-se a todos os destinatários alcançados pela norma na jurisdição nacional?`,
      formato: 'sim_nao',
      alternativas: [
        { letra: 'SIM', texto: 'SIM — A lei possui eficácia geral e imperatividade sobre os seus destinatários' },
        { letra: 'NAO', texto: 'NÃO — A eficácia é restrita a atos e contratos expressamente referenciados em cartório' }
      ],
      gabarito: 'SIM',
      comentario: `Correto o SIM. Pelo princípio da generalidade e obrigatoriedade da lei, o preceito legal vincula todos os seus destinatários.`
    },
    {
      id: 6,
      tipo: 'caso_pratico',
      dispositivo: 'Situação Concreta',
      enunciado: `Em litígio judicial, o magistrado invocou o Art. ${numLimpo} para fundamentar sua decisão. O patrono da parte sucumbente alegou vício de fundamentação. Diante da legislação:`,
      formato: 'multipla_escolha',
      alternativas: [
        { letra: 'A', texto: 'A decisão é válida se tiver demonstrado a subsunção do caso concreto ao suporte fático do artigo.' },
        { letra: 'B', texto: 'A decisão é sempre nula por ausência de parecer do Ministério Público.' },
        { letra: 'C', texto: 'A citação do artigo exige transcrição integral do texto sob pena de nulidade absoluta.' },
        { letra: 'D', texto: 'O magistrado não pode fundamentar decisões com base em normas expressas da legislação vigente.' }
      ],
      gabarito: 'A',
      comentario: `Correta a alternativa A. A fundamentação judicial deve demonstrar a correlação concreta entre o dispositivo legal e o fato apreciado.`
    },
    {
      id: 7,
      tipo: 'definicao',
      dispositivo: 'Hermenêutica',
      enunciado: `Na interpretação sistemática do Art. ${numLimpo} em harmonia com o restante do diploma legal, conclui-se que:`,
      formato: 'multipla_escolha',
      alternativas: [
        { letra: 'A', texto: 'O artigo deve ser compreendido de maneira contextualizada, respeitando a finalidade da norma.' },
        { letra: 'B', texto: 'A interpretação deve ser restritiva a ponto de anular os efeitos de suas ressalvas expressas.' },
        { letra: 'C', texto: 'Prevalece a interpretação histórica em detrimento absoluto do texto legal promulgado.' },
        { letra: 'D', texto: 'Não é admitida interpretação teleológica para dispositivos desta legislação.' }
      ],
      gabarito: 'A',
      comentario: `Correta a alternativa A. A hermenêutica moderna exige interpretação teleológica e sistemática orientada aos fins sociais da lei.`
    },
    {
      id: 8,
      tipo: 'sim_ou_nao',
      dispositivo: 'Exceções & Ressalvas',
      enunciado: `É admitido interpretar de forma extensiva uma eventual hipótese de exceção restritiva de direitos constante no artigo?`,
      formato: 'sim_nao',
      alternativas: [
        { letra: 'SIM', texto: 'SIM — As exceções devem abranger qualquer caso por analogia ilimitada' },
        { letra: 'NAO', texto: 'NÃO — Regras de exceção e restritivas de direitos interpretam-se estritamente' }
      ],
      gabarito: 'NAO',
      comentario: `Correto o NÃO. Regra basilar de hermenêutica: normas de exceção e sancionatórias interpretam-se estritamente.`
    },
    {
      id: 9,
      tipo: 'caso_pratico',
      dispositivo: 'Subsunção Fática',
      enunciado: `Determinado cidadão questionou formalmente a aplicabilidade de obrigação decorrente do Art. ${numLimpo}. A assessoria jurídica deve orientar que:`,
      formato: 'multipla_escolha',
      alternativas: [
        { letra: 'A', texto: 'O cumprimento do comando legal é imperativo, ressalvada eventual previsão expressa em contrário ou decisão suspensiva.' },
        { letra: 'B', texto: 'O particular pode declarar unilateralmente a nulidade do dispositivo perante órgãos públicos.' },
        { letra: 'C', texto: 'A eficácia da norma depende de referendo popular posterior.' },
        { letra: 'D', texto: 'A obrigação só vincula entidades privadas de grande porte.' }
      ],
      gabarito: 'A',
      comentario: `Correta a alternativa A. A imperatividade da norma jurídica impõe observância até que haja revogação ou ordem judicial impeditiva.`
    },
    {
      id: 10,
      tipo: 'pegadinha',
      dispositivo: 'Ponto Crítico em Concursos',
      enunciado: `Constitui pegadinha comum em exames a afirmação de que os preceitos do Art. ${numLimpo} podem ser dispensados por acordo tácito entre particulares. Sobre isso, assinale a opção correta:`,
      formato: 'multipla_escolha',
      alternativas: [
        { letra: 'A', texto: 'Errada a afirmativa, pois normas cogentes de ordem pública são inderrogáveis pela vontade particular.' },
        { letra: 'B', texto: 'Correta a afirmativa, pois o princípio da autonomia da vontade prevalece sobre qualquer preceito legal.' },
        { letra: 'C', texto: 'Correta se houver testemunhas instrumentárias no pacto tácito.' },
        { letra: 'D', texto: 'A dispensa só é permitida em contratos de valor inferior a um salário mínimo.' }
      ],
      gabarito: 'A',
      comentario: `Correta a alternativa A. Normas de ordem pública e imperativas não podem ser afastadas por simples convenção entre particulares.`
    }
  ];

  return {
    artigo: `Art. ${numLimpo}`,
    artigoNumero: numLimpo,
    lei,
    questoes: qList
  };
}

export function QuestoesOverlay({ capituloGroups, leiNome, onClose, onArtigoSelect }: QuestoesOverlayProps) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [selectedCapitulo, setSelectedCapitulo] = useState<CapGroup | null>(null);
  const [selectedArtigo, setSelectedArtigo] = useState<ArtigoType | null>(null);
  const [gerando, setGerando] = useState(false);
  const [passoGeracao, setPassoGeracao] = useState(0);
  const [pacoteAtivo, setPacoteAtivo] = useState<QuestoesPacote | null>(null);
  
  // Estado da sessão de questões em andamento
  const [currentIdx, setCurrentIdx] = useState(0);
  const [escolhaTemporaria, setEscolhaTemporaria] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [finalizado, setFinalizado] = useState(false);

  // Rotação dos heros
  useEffect(() => {
    const id = setInterval(() => {
      setHeroIdx((i) => (i + 1) % HERO_ILLUSTRATIONS.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  // Animação de checklist enquanto gera
  useEffect(() => {
    if (!gerando) {
      setPassoGeracao(0);
      return;
    }
    setPassoGeracao(0);
    const timer = setInterval(() => {
      setPassoGeracao(prev => (prev < PASSOS_GERACAO_QUESTOES.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(timer);
  }, [gerando]);

  const allCapitulos = useMemo(() => {
    return capituloGroups.flatMap(t => t.capitulos.map(c => ({ ...c, titulo: t.titulo }))).filter(c => c.artigos.length > 0);
  }, [capituloGroups]);

  const totalAulas = allCapitulos.reduce((acc, curr) => acc + curr.artigos.length, 0);

  // Inicia ou abre as questões para o artigo clicado
  const abrirQuestoesArtigo = async (artigo: ArtigoType) => {
    setSelectedArtigo(artigo);
    setCurrentIdx(0);
    setEscolhaTemporaria(null);
    setConfirmado(false);
    setRespostas({});
    setFinalizado(false);

    const numLimpo = String(artigo.numero || '').replace(/^[^\d]*/, '').trim();
    const cacheKey = `vacatio_questoes_v2_${leiNome.toLowerCase().replace(/\s+/g, '_')}_art_${numLimpo}`;

    // 1. Tenta carregar do cache local
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.questoes?.length >= 5) {
          setPacoteAtivo(parsed);
          return;
        }
      }
    } catch {
      // ignora erro de cache
    }

    // 2. Se não estiver em cache, gera com IA (OmniRoute)
    setGerando(true);
    try {
      const prompt = formatQuestoesPrompt(leiNome, artigo);
      const res = await generateOmniText({
        prompt,
        systemPrompt: "Você é um jurista e examinador sênior em Direito. Retorne ESTRITAMENTE um objeto JSON válido contendo exatamente 10 questões comentadas sobre o artigo, sem blocos markdown (```json) e sem texto antes ou depois.",
        complexity: 'low'
      });

      let cleanJson = res.replace(/```json/gi, '').replace(/```/g, '').trim();
      const startIdx = cleanJson.indexOf('{');
      const endIdx = cleanJson.lastIndexOf('}');
      if (startIdx >= 0 && endIdx >= 0) {
        cleanJson = cleanJson.substring(startIdx, endIdx + 1);
      }

      let parsed: any;
      try {
        parsed = JSON.parse(cleanJson);
      } catch (err: any) {
        console.warn('Falha no parse do JSON de questões gerado pela IA. Usando fallback robusto.', err);
        parsed = null;
      }

      if (parsed && Array.isArray(parsed.questoes) && parsed.questoes.length > 0) {
        const pacote: QuestoesPacote = {
          artigo: parsed.artigo || `Art. ${numLimpo}`,
          artigoNumero: numLimpo,
          lei: leiNome,
          questoes: parsed.questoes.map((q: any, i: number) => ({
            id: q.id || i + 1,
            tipo: q.tipo || 'definicao',
            dispositivo: q.dispositivo || 'Caput',
            enunciado: q.enunciado || `Questão sobre o Art. ${numLimpo}`,
            formato: q.formato === 'sim_nao' ? 'sim_nao' : 'multipla_escolha',
            alternativas: Array.isArray(q.alternativas) ? q.alternativas : [
              { letra: 'A', texto: 'Opção correta nos termos da lei.' },
              { letra: 'B', texto: 'Opção incorreta.' }
            ],
            gabarito: String(q.gabarito || 'A').toUpperCase().trim(),
            comentario: q.comentario || 'Fundamentação extraída dos preceitos do artigo.'
          }))
        };
        localStorage.setItem(cacheKey, JSON.stringify(pacote));
        setPacoteAtivo(pacote);
      } else {
        // Fallback dinâmico com 10 questões ricas
        const fallback = gerarQuestoesFallback(artigo, leiNome);
        localStorage.setItem(cacheKey, JSON.stringify(fallback));
        setPacoteAtivo(fallback);
      }
    } catch (e: any) {
      console.error('Erro ao gerar questões via IA:', e);
      // Garante que o usuário nunca fica sem praticar
      const fallback = gerarQuestoesFallback(artigo, leiNome);
      setPacoteAtivo(fallback);
    } finally {
      setGerando(false);
    }
  };

  // Se o pacote de questões estiver ativo, renderiza o Quiz Runner completo em fundo CINZA sofisticado
  if (pacoteAtivo && selectedArtigo) {
    const qAtual = pacoteAtivo.questoes[currentIdx];
    const acertou = confirmado && escolhaTemporaria === qAtual?.gabarito;
    const acertosTotais = pacoteAtivo.questoes.reduce((acc, q, i) => acc + (respostas[i] === q.gabarito ? 1 : 0), 0);

    const handleSelecionarAlternativa = (letra: string) => {
      if (confirmado) return;
      setEscolhaTemporaria(letra);
    };

    const handleConfirmarResposta = () => {
      if (escolhaTemporaria === null) return;
      setConfirmado(true);
      setRespostas(prev => ({ ...prev, [currentIdx]: escolhaTemporaria }));
    };

    const handleAvancarProxima = () => {
      if (currentIdx < pacoteAtivo.questoes.length - 1) {
        setCurrentIdx(i => i + 1);
        setEscolhaTemporaria(null);
        setConfirmado(false);
      } else {
        setFinalizado(true);
      }
    };

    const handleReiniciar = () => {
      setCurrentIdx(0);
      setEscolhaTemporaria(null);
      setConfirmado(false);
      setRespostas({});
      setFinalizado(false);
    };

    const badgeInfo = qAtual ? (TIPO_BADGES[qAtual.tipo] || { label: 'Questão', cor: 'bg-zinc-800 text-zinc-300 border-zinc-700' }) : null;

    return (
      <div 
        className="flex flex-col h-full bg-[#121214] relative w-full overflow-hidden text-white font-body"
      >
        {/* Top Header em cinza escuro */}
        <div 
          className="flex items-center gap-3 px-4 pb-3 border-b border-white/10 bg-[#18181b] relative z-20 shrink-0"
          style={{ paddingTop: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 14px)' }}
        >
          <button 
            onClick={() => { setPacoteAtivo(null); setSelectedArtigo(null); }}
            className="w-10 h-10 rounded-full bg-zinc-800/80 border border-white/15 flex items-center justify-center hover:bg-zinc-700 active:scale-95 transition-all shadow-sm shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-200" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-lg text-white truncate">
              Art. {pacoteAtivo.artigoNumero} · {leiNome}
            </h2>
            <p className="text-xs text-zinc-400 truncate">
              {finalizado ? 'Sessão concluída' : `Questão ${currentIdx + 1} de ${pacoteAtivo.questoes.length}`}
            </p>
          </div>
        </div>

        {/* Barra de Progresso Superior */}
        <div className="w-full bg-zinc-900 h-1.5 shrink-0 relative z-20 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-300"
            style={{ width: `${((currentIdx + (confirmado ? 1 : 0)) / pacoteAtivo.questoes.length) * 100}%` }}
          />
        </div>

        {/* Conteúdo Principal das Questões */}
        <div 
          className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10"
          style={{ paddingBottom: 'calc(var(--sai-bottom, env(safe-area-inset-bottom, 0px)) + 120px)' }}
        >
          {finalizado ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-md mx-auto my-auto text-center py-8 space-y-6"
            >
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl border-4 border-amber-300/30">
                <Trophy className="w-12 h-12 text-black" />
              </div>

              <div>
                <span className="text-xs uppercase tracking-widest font-bold text-zinc-400">Resultado do Treino</span>
                <h3 className="text-4xl font-display font-black text-white mt-1">
                  {acertosTotais} / {pacoteAtivo.questoes.length}
                </h3>
                <p className="text-sm text-amber-400 font-semibold mt-1">
                  {Math.round((acertosTotais / pacoteAtivo.questoes.length) * 100)}% de aproveitamento
                </p>
                <p className="text-xs text-zinc-400 mt-2 max-w-xs mx-auto leading-relaxed">
                  {acertosTotais >= 8 
                    ? 'Excelente! Você dominou o preceito normativo, as exceções e a aplicação prática deste artigo.'
                    : acertosTotais >= 5 
                    ? 'Bom rendimento! Revise as pegadinhas e os detalhes de parágrafos/incisos para gabaritar.'
                    : 'Treino concluído! Refaça as questões para fixar o teor deste dispositivo legal.'}
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleReiniciar}
                  className="w-full h-12 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-display font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-98 transition"
                >
                  <RotateCcw className="w-4 h-4" /> Refazer Treino
                </button>
                <button
                  onClick={() => { setPacoteAtivo(null); setSelectedArtigo(null); }}
                  className="w-full h-12 rounded-2xl bg-zinc-800 border border-white/10 text-zinc-200 font-display font-bold text-base flex items-center justify-center gap-2 hover:bg-zinc-700 active:scale-98 transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar para a Trilha
                </button>
              </div>
            </motion.div>
          ) : qAtual ? (
            <div className="max-w-xl mx-auto space-y-4">
              {/* Badges de Categoria e Dispositivo */}
              <div className="flex items-center gap-2 flex-wrap">
                {badgeInfo && (
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${badgeInfo.cor}`}>
                    {badgeInfo.label}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-800 text-zinc-300 border border-white/10 uppercase tracking-wider">
                  Dispositivo: {qAtual.dispositivo}
                </span>
              </div>

              {/* Card do Enunciado em Cinza Escuro */}
              <div className="rounded-2xl bg-[#1c1c20] border border-white/10 p-5 shadow-xl">
                <p className="text-[15.5px] sm:text-[16.5px] text-zinc-100 leading-relaxed font-body font-medium select-text">
                  {qAtual.enunciado}
                </p>
              </div>

              {/* Lista de Alternativas em Cinza (antes de responder) */}
              <div className="space-y-2.5 pt-1">
                {qAtual.alternativas.map((alt) => {
                  const isSelecionada = escolhaTemporaria === alt.letra;
                  const isCorreta = alt.letra === qAtual.gabarito;
                  
                  let estadoEstilo = 'bg-[#18181b] border-white/10 text-zinc-200 hover:border-white/20 hover:bg-[#202025]';
                  let badgeEstilo = 'bg-zinc-800 border-zinc-700 text-zinc-300';

                  if (!confirmado) {
                    if (isSelecionada) {
                      // Usuário selecionou mas ainda NÃO confirmou (apenas destaca a seleção)
                      estadoEstilo = 'bg-amber-500/10 border-amber-400 text-white ring-1 ring-amber-400/50 shadow-md';
                      badgeEstilo = 'bg-amber-400 border-amber-400 text-black font-black';
                    }
                  } else {
                    // Já confirmou: revela acerto e erro
                    if (isCorreta) {
                      estadoEstilo = 'bg-emerald-950/80 border-emerald-400 text-white ring-2 ring-emerald-400/60 shadow-lg';
                      badgeEstilo = 'bg-emerald-500 border-emerald-400 text-white';
                    } else if (isSelecionada) {
                      estadoEstilo = 'bg-rose-950/80 border-rose-400 text-white ring-2 ring-rose-400/60 shadow-lg';
                      badgeEstilo = 'bg-rose-500 border-rose-400 text-white';
                    } else {
                      estadoEstilo = 'bg-[#18181b]/40 border-white/5 text-zinc-500 opacity-50';
                    }
                  }

                  return (
                    <button
                      key={alt.letra}
                      disabled={confirmado}
                      onClick={() => handleSelecionarAlternativa(alt.letra)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all flex items-start gap-3 active:scale-[0.99] ${estadoEstilo}`}
                    >
                      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-display font-black text-sm border ${badgeEstilo}`}>
                        {confirmado && isCorreta ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : confirmado && isSelecionada ? (
                          <X className="w-4 h-4 stroke-[3]" />
                        ) : (
                          alt.letra
                        )}
                      </div>
                      <span className="text-[13.5px] sm:text-[14.5px] font-body leading-snug pt-1 flex-1">
                        {alt.texto}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* 1. Rodapé que sobe quando uma opção é selecionada (Botão RESPONDER) */}
        <AnimatePresence>
          {escolhaTemporaria !== null && !confirmado && !finalizado && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="absolute inset-x-0 bottom-0 z-40 bg-[#18181b]/95 border-t border-white/10 p-4 shadow-2xl backdrop-blur-lg"
              style={{ paddingBottom: 'calc(var(--sai-bottom, env(safe-area-inset-bottom, 0px)) + 14px)' }}
            >
              <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
                <div className="text-xs text-zinc-400 font-medium">
                  Alternativa <span className="font-bold text-amber-400">{escolhaTemporaria}</span> selecionada
                </div>
                <button
                  onClick={handleConfirmarResposta}
                  className="px-6 h-12 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-amber-950 font-display font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                  <span>Responder</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Sheet de Feedback e Comentário que sobe de baixo para cima */}
        <AnimatePresence>
          {confirmado && qAtual && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 240 }}
              className={`absolute inset-x-0 bottom-0 z-50 border-t p-5 sm:p-6 shadow-2xl backdrop-blur-xl ${
                acertou 
                  ? 'bg-[#062013]/98 border-emerald-500/40 text-emerald-100' 
                  : 'bg-[#240a0e]/98 border-rose-500/40 text-rose-100'
              }`}
              style={{ paddingBottom: 'calc(var(--sai-bottom, env(safe-area-inset-bottom, 0px)) + 18px)' }}
            >
              <div className="max-w-xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {acertou ? (
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center shrink-0">
                        <XCircle className="w-6 h-6 text-rose-400" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-display font-black text-lg uppercase tracking-wide">
                        {acertou ? 'Excelente! Você acertou!' : 'Resposta Incorreta'}
                      </h4>
                      {!acertou && (
                        <p className="text-xs text-rose-300 font-semibold mt-0.5">
                          Gabarito oficial: Alternativa {qAtual.gabarito}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Comentário fundamentado */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-[13.5px] leading-relaxed text-zinc-200">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold mb-1 text-xs">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Fundamentação & Comentário:</span>
                  </div>
                  <p>{qAtual.comentario}</p>
                </div>

                {/* Botão para continuar */}
                <button
                  onClick={handleAvancarProxima}
                  className={`w-full h-12 rounded-xl font-display font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-98 transition ${
                    acertou
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                      : 'bg-rose-500 hover:bg-rose-400 text-white'
                  }`}
                >
                  <span>{currentIdx < pacoteAtivo.questoes.length - 1 ? 'Continuar' : 'Ver Resultado Final'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ---- TELA 2: TRILHA DE ARTIGOS DO CAPÍTULO SELECIONADO (AMARELA / DOURADA) ----
  if (selectedCapitulo) {
    const selectedFormatted = formatCapituloDisplay(selectedCapitulo.capitulo, selectedCapitulo.titulo);
    return (
      <div 
        className="flex flex-col h-full bg-background relative w-full rounded-t-[30px] overflow-hidden" 
        style={{ background: 'linear-gradient(180deg, hsl(45 90% 40%) 0%, hsl(45 95% 45%) 40%, hsl(45 85% 35%) 100%)' }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.18),transparent_60%)]" />
        
        {/* Cabeçalho da Trilha */}
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
              {selectedFormatted.tag ? `${selectedFormatted.tag} - ${selectedFormatted.title}` : selectedFormatted.title}
            </h2>
            <p className="text-sm text-white/80 truncate font-body drop-shadow-sm">
              {selectedCapitulo.artigos.length} artigos para praticar
            </p>
          </div>
        </div>
        
        {/* Lista Sinuosa (Trilha estilo Duolingo amarela com botões Target amarelos) */}
        <div 
          className="flex-1 overflow-y-auto p-4 relative z-10"
          style={{ paddingBottom: 'calc(8rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))' }}
        >
          <ul className="flex flex-col items-center gap-4 py-8">
            {selectedCapitulo.artigos.map((artigo, idx) => {
              const offset = OFFSETS[idx % OFFSETS.length];
              const numText = artigo.numero.toLowerCase().includes('art') ? artigo.numero : `Art. ${artigo.numero}`;
              const isArtigoGerando = gerando && selectedArtigo?.numero === artigo.numero;
              
              return (
                <li
                  key={artigo.id || idx}
                  className="w-full flex justify-center relative"
                  style={{ transform: `translateX(${offset}px)` }}
                >
                  {/* Badge indicativo do Artigo */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none z-20">
                    <div className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-bold text-white/95 border border-white/25 whitespace-nowrap shadow-sm">
                      {numText}
                    </div>
                  </div>

                  {/* Botão circular amarelo tátil com o ícone oficial de Questões (Target) branco */}
                  <button
                    disabled={gerando}
                    onClick={() => abrirQuestoesArtigo(artigo)}
                    className="relative w-16 h-16 z-10 rounded-full flex items-center justify-center bg-yellow-500 hover:bg-yellow-400 ring-yellow-300 ring-4 ring-offset-2 ring-offset-transparent active:scale-95 transition-transform disabled:opacity-75"
                    style={{
                      boxShadow: '0 10px 22px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.25), inset 0 -4px 0 rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.18)',
                    }}
                    title={`Praticar questões do ${numText}`}
                  >
                    {isArtigoGerando ? (
                      <Loader2 className="w-7 h-7 text-white animate-spin" />
                    ) : (
                      <Target className="w-7 h-7 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)]" strokeWidth={2.4} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Modal / Overlay de Carregamento com Checklist Animado de 5 Passos */}
        <AnimatePresence>
          {gerando && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-5"
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="bg-[#18181b] border border-white/15 p-6 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col space-y-5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                    <Target className="w-6 h-6 text-amber-400 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-lg text-white leading-tight">
                      Gerando 10 questões com IA
                    </h4>
                    <p className="text-xs text-white/60 mt-0.5 truncate">
                      {selectedArtigo ? `Art. ${selectedArtigo.numero} · ${leiNome}` : 'Analisando dispositivo legal...'}
                    </p>
                  </div>
                </div>

                {/* Checklist com ticks automáticos */}
                <ul className="space-y-3 pt-1">
                  {PASSOS_GERACAO_QUESTOES.map((passo, idx) => {
                    const done = idx < passoGeracao;
                    const active = idx === passoGeracao;

                    return (
                      <li key={passo} className="flex items-center gap-3">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                            done
                              ? 'border-amber-400 bg-amber-400 text-black'
                              : active
                              ? 'border-amber-400 text-amber-400 ring-2 ring-amber-400/30'
                              : 'border-white/20 text-white/30'
                          }`}
                        >
                          {done ? (
                            <Check className="h-3 w-3 stroke-[3]" />
                          ) : active ? (
                            <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                          ) : null}
                        </span>
                        <span
                          className={`text-[13px] leading-snug transition-colors ${
                            done
                              ? 'text-white/50 line-through decoration-white/30'
                              : active
                              ? 'text-white font-medium'
                              : 'text-white/40'
                          }`}
                        >
                          {passo}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ---- TELA 1: LISTA PRINCIPAL DE CAPÍTULOS / TÍTULOS ----
  const pct = 0; // Placeholder

  return (
    <div 
      className="flex flex-col h-full relative w-full overflow-hidden" 
      style={{ background: 'linear-gradient(180deg, hsl(45 90% 40%) 0%, hsl(45 95% 45%) 40%, hsl(45 85% 35%) 100%)' }}
    >
      <div 
        className="flex-1 overflow-y-auto w-full relative z-10"
        style={{ paddingBottom: 'calc(8rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))' }}
      >
        <section className="relative isolate shrink-0 pb-4 overflow-hidden -mx-px rounded-t-[30px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.18),transparent_65%)]" />

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
            <div className="absolute inset-0 opacity-25" style={{ background: 'linear-gradient(135deg, hsl(45 90% 40%) 0%, #FACC15 100%)', mixBlendMode: 'multiply' }} />
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#eab308] via-[#eab308]/60 to-transparent" />
          </div>

          <div 
            className="relative p-5"
            style={{ paddingTop: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 16px)' }}
          >
            {/* Botão de Voltar */}
            <button 
              onClick={onClose}
              className="absolute left-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white shadow-sm active:scale-95 transition-all"
              style={{ top: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 12px)' }}
            >
              <ArrowLeft className="w-5 h-5 drop-shadow-md" />
            </button>

            <div className="flex items-start gap-4 mt-8 relative z-10">
              <div className="min-w-0 max-w-[80%] text-white drop-shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">Sua trilha</p>
                <h1 className="mt-0.5 font-display text-[22px] font-black leading-tight sm:text-[26px]">
                  Questões
                </h1>
                <p className="mt-0.5 text-[12px] leading-snug text-white/80 font-body">
                  Questões organizadas por capítulos de {leiNome}
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
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Questões Totais</span>
                  <span className="mt-0.5 font-display text-lg font-black leading-none">{totalAulas * 10}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="px-4 py-3 space-y-3">
          {allCapitulos.map((cap, i) => {
            const capPct = 0; // Placeholder
            return (
              <button
                key={i}
                onClick={() => setSelectedCapitulo(cap)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md p-3 text-left transition-all hover:bg-black/30 active:scale-[0.99] sm:p-3.5 shadow-sm"
              >
                <div className="relative h-14 w-14 shrink-0 flex items-center justify-center sm:h-16 sm:w-16">
                  <Target className="h-9 w-9 text-[#FACC15] drop-shadow-sm transition-transform group-hover:scale-110" strokeWidth={1.5} />
                </div>

                <div className="min-w-0 flex-1">
                  {(() => {
                    const f = formatCapituloDisplay(cap.capitulo, cap.titulo);
                    return (
                      <>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[11px] font-bold text-white/60 uppercase tracking-wider truncate">
                            {f.tag}
                          </p>
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold bg-white/10 text-white/80 tabular-nums ml-auto">
                            {capPct}%
                          </span>
                        </div>
                        <p className="min-w-0 text-[14px] font-bold text-white sm:text-[15px] leading-snug drop-shadow-sm" style={{ fontFamily: "'Barlow', system-ui, sans-serif", letterSpacing: '-0.005em' }}>
                          {f.title}
                        </p>
                      </>
                    );
                  })()}
                  <p className="mt-0.5 text-[12px] text-white/60 sm:text-[13px]">
                    {cap.artigos.length * 10} questões
                  </p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${capPct}%` }}
                    />
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
          {allCapitulos.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm font-body">
              Nenhuma trilha encontrada para esta legislação.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuestoesOverlay;

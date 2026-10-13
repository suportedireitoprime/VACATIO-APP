import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scale, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Lightbulb, 
  ShieldCheck, 
  MessageSquare, 
  Layers, 
  BrainCircuit, 
  Info,
  Play,
  BookOpen,
  ArrowRight,
  X,
  Flame,
  Award,
  Link2,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Eye,
  Copy,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@/lib/adminEmails';
import flipSoundAsset from '@/assets/flipcard.mp3.asset.json';

// ==========================================
// TIPOS E DEFINIÇÕES
// ==========================================

export type ArtigoId = 'art1' | 'art2' | 'art5_cf';
export type MecanicaId = 'combo' | 'anatomia' | 'storytelling' | 'dialogo' | 'linha_tempo' | 'mapa_decisao';

export interface DispositivoInfo {
  id: string; // ex: 'caput', 'paragrafo_unico', 'inciso_1', etc.
  label: string; // ex: 'Caput', 'Parágrafo único', 'Inciso I', 'Inciso II'
  titulo: string;
  textoLei: string;
}

export interface ArtigoDetalhe {
  id: ArtigoId;
  diploma: string;
  artigoNumero: string;
  titulo: string;
  subtitulo: string;
  texto: string;
  dispositivos: DispositivoInfo[];
}

interface SlideData {
  id: string;
  dispositivoId: string;
  dispositivoLabel: string;
  isCapaDispositivo?: boolean;
  badge: string;
  titulo: string;
  subtitulo?: string;
  conteudoPrincipal: React.ReactNode;
  textoAudio: string;
  imagePrompt?: string; // Prompt refinado para o Gemini Spark / Imagen 3
  imageUrl?: string;    // URL pública no Supabase Storage ou manual
}

interface MecanicaDef {
  id: MecanicaId;
  nome: string;
  badge: string;
  icone: React.ElementType;
  corPrimaria: string;
  gradienteFundo: string;
  bordaCor: string;
  botaoCor: string;
  barraProgressoCor?: string;
  subtitulo: string;
  descricaoCurta: string;
  focoLeigo: string;
  totalSlidesText: string;
  slides: Record<ArtigoId, SlideData[]>;
}

const ARTIGOS_INFO: Record<ArtigoId, ArtigoDetalhe> = {
  art1: {
    id: 'art1',
    diploma: 'Código Penal (DL 2.848/1940)',
    artigoNumero: 'Artigo 1º',
    titulo: 'Artigo 1º — Anterioridade da Lei Penal',
    subtitulo: 'Legalidade estrita e segurança jurídica do cidadão',
    texto: '“Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.”',
    dispositivos: [
      {
        id: 'caput',
        label: 'Caput',
        titulo: 'Princípio da Anterioridade Penal',
        textoLei: 'Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.',
      },
    ],
  },
  art2: {
    id: 'art2',
    diploma: 'Código Penal (DL 2.848/1940)',
    artigoNumero: 'Artigo 2º',
    titulo: 'Artigo 2º — Lei Penal no Tempo & Retroatividade',
    subtitulo: 'Abolitio criminis e a máquina do tempo benéfica',
    texto: '“Ninguém pode ser punido por fato que lei posterior deixa de considerar crime, cessando em virtude dela a execução e os efeitos penais da sentença condenatória. Parágrafo único: A lei posterior, que de qualquer modo favorecer o agente, aplica-se aos fatos anteriores, ainda que decididos por sentença condenatória transitada em julgado.”',
    dispositivos: [
      {
        id: 'caput',
        label: 'Caput',
        titulo: 'Abolitio Criminis (Extinção do Crime)',
        textoLei: 'Ninguém pode ser punido por fato que lei posterior deixa de considerar crime, cessando em virtude dela a execução e os efeitos penais da sentença condenatória.',
      },
      {
        id: 'paragrafo_unico',
        label: 'Parágrafo único',
        titulo: 'Novatio Legis in Mellius (Retroatividade Benéfica)',
        textoLei: 'A lei posterior, que de qualquer modo favorecer o agente, aplica-se aos fatos anteriores, ainda que decididos por sentença condenatória transitada em julgado.',
      },
    ],
  },
  art5_cf: {
    id: 'art5_cf',
    diploma: 'Constituição Federal (CF/1988)',
    artigoNumero: 'Artigo 5º',
    titulo: 'Artigo 5º — Direitos e Garantias Fundamentais',
    subtitulo: 'O pilar dos direitos humanos, liberdades públicas e igualdade cidadã',
    texto: '“Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos estrangeiros residentes no País a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade...”',
    dispositivos: [
      {
        id: 'caput',
        label: 'Caput',
        titulo: 'Igualdade Perante a Lei e Direitos Supremos',
        textoLei: 'Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos estrangeiros residentes no País a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade.',
      },
      {
        id: 'inciso_1',
        label: 'Inciso I',
        titulo: 'Igualdade entre Homens e Mulheres',
        textoLei: 'I - homens e mulheres são iguais em direitos e obrigações, nos termos desta Constituição;',
      },
      {
        id: 'inciso_2',
        label: 'Inciso II',
        titulo: 'Princípio Geral da Legalidade',
        textoLei: 'II - ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei;',
      },
      {
        id: 'inciso_3',
        label: 'Inciso III',
        titulo: 'Vedação à Tortura e Tratamento Degradante',
        textoLei: 'III - ninguém será submetido a tortura nem a tratamento desumano ou degradante;',
      },
      {
        id: 'inciso_4',
        label: 'Inciso IV',
        titulo: 'Liberdade de Expressão (Vedado o Anonimato)',
        textoLei: 'IV - é livre a manifestação do pensamento, sendo vedado o anonimato;',
      },
      {
        id: 'inciso_5',
        label: 'Inciso V',
        titulo: 'Direito de Resposta e Indenização',
        textoLei: 'V - é assegurado o direito de resposta, proporcional ao agravo, além da indenização por dano material, moral ou à imagem;',
      },
    ],
  },
};

// ==========================================
// ÍCONE BRASÃO DA REPÚBLICA (MARCA D'ÁGUA VETORIAL)
// ==========================================
function BrasaoRepublicaIcon({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Círculo externo radiante */}
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.35" />
      <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      {/* Estrela da República de 5 pontas */}
      <path
        d="M50 14 L58 35 L80 37 L63 53 L68 75 L50 62 L32 75 L37 53 L20 37 L42 35 Z"
        fill="currentColor"
        opacity="0.3"
      />
      {/* Globo central azul com estrelas */}
      <circle cx="50" cy="46" r="14" fill="currentColor" opacity="0.65" />
      <circle cx="50" cy="40" r="1.5" fill="#ffffff" />
      <circle cx="46" cy="45" r="1.5" fill="#ffffff" />
      <circle cx="54" cy="45" r="1.5" fill="#ffffff" />
      <circle cx="50" cy="50" r="1.5" fill="#ffffff" />
      <circle cx="54" cy="49" r="1.2" fill="#ffffff" />
      {/* Espada central da Justiça e República */}
      <path d="M50 8 L50 88 M43 23 L57 23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}

// ==========================================
// BARRA DE GUIA DOS DISPOSITIVOS (ESTILO PÍLULAS NATIVAS)
// ==========================================
interface GuiaDispositivosBarProps {
  dispositivos: DispositivoInfo[];
  dispositivoAtivoId: string;
  onSelecionarDispositivo: (id: string) => void;
  corPrimaria?: string;
}

function GuiaDispositivosBar({
  dispositivos,
  dispositivoAtivoId,
  onSelecionarDispositivo,
}: GuiaDispositivosBarProps) {
  return (
    <div className="relative w-full overflow-hidden py-1">
      {/* Marca d'água sutil do Brasão da República ao fundo como na referência */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 overflow-hidden">
        <BrasaoRepublicaIcon className="w-24 h-24 text-amber-400/50" />
      </div>

      <nav
        aria-label="Dispositivos do artigo"
        className="relative z-10 flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1 px-2"
      >
        {dispositivos.map((disp) => {
          const ativo = disp.id === dispositivoAtivoId;
          return (
            <button
              key={disp.id}
              onClick={() => onSelecionarDispositivo(disp.id)}
              className={`relative px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 shrink-0 flex items-center gap-1.5 active:scale-95 ${
                ativo
                  ? 'text-white shadow-lg backdrop-blur-md'
                  : 'bg-[#22272e]/85 text-slate-300 hover:text-white hover:bg-white/10 ring-1 ring-white/5 backdrop-blur-sm'
              }`}
              title={`Ir para ${disp.label} — ${disp.titulo}`}
            >
              {ativo && (
                <motion.div
                  layoutId="activeDispositivoPill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500/40 via-emerald-500/30 to-teal-500/40 ring-1 ring-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.25)]"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className={`relative z-10 ${ativo ? 'font-black text-white drop-shadow-sm' : ''}`}>
                {disp.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ==========================================
// CAPA DE TRANSIÇÃO DE DISPOSITIVO LEGAL
// ==========================================
function CapaDispositivoSlide({
  diploma,
  artigoNumero,
  dispositivoLabel,
  titulo,
  textoLei,
  explicacaoCurta,
  icone: Icone = Scale,
  corAcento = 'text-amber-400',
  gradienteFundo = 'from-amber-950/40 via-card to-background',
  bordaCor = 'border-amber-500/40',
}: {
  diploma: string;
  artigoNumero: string;
  dispositivoLabel: string;
  titulo: string;
  textoLei: string;
  explicacaoCurta: string;
  icone?: React.ElementType;
  corAcento?: string;
  gradienteFundo?: string;
  bordaCor?: string;
}) {
  return (
    <div className={`relative p-6 sm:p-8 rounded-3xl border ${bordaCor} bg-gradient-to-br ${gradienteFundo} text-center space-y-4 shadow-2xl overflow-hidden`}>
      {/* Marca d'água de brasão no fundo do card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
        <BrasaoRepublicaIcon className="w-56 h-56 text-amber-300" />
      </div>

      <div className="relative z-10 space-y-4">
        {/* Badge superior da Capa */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-black uppercase tracking-wider text-amber-300 shadow-sm">
          <Icone className="w-4 h-4 text-amber-400" />
          <span>{diploma} · {artigoNumero}</span>
        </div>

        {/* Título de Impacto do Dispositivo */}
        <div className="space-y-1">
          <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-muted-foreground block">
            Capa do Dispositivo Legal
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {dispositivoLabel}
          </h2>
          <h3 className={`text-base sm:text-lg font-bold ${corAcento}`}>
            {titulo}
          </h3>
        </div>

        {/* Citação Solene do Texto da Lei */}
        <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 text-left space-y-2 shadow-inner">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
            Texto Literal Oficial da Norma:
          </span>
          <p className="font-serif text-base sm:text-lg italic text-foreground/95 leading-relaxed border-l-4 border-amber-400 pl-3.5 py-0.5">
            “{textoLei}”
          </p>
        </div>

        {/* Explicação Inicial / Direcionamento para o Aluno Leigo */}
        <div className="space-y-2 pt-1">
          <p className="text-sm sm:text-base text-foreground/90 font-medium leading-relaxed max-w-lg mx-auto">
            {explicacaoCurta}
          </p>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400/90 pt-1">
            <span>Toque em <strong>Próximo</strong> para destrinchar este trecho</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE: CONTROLE & EXIBIÇÃO DE IMAGEM (MCP GEMINI SPARK)
// ==========================================

interface SlideImagemControleProps {
  slideId: string;
  imagePrompt?: string;
  imageUrl?: string;
  onSalvarUrl: (url: string) => void;
}

const SlideImagemVisualizadorEControle: React.FC<SlideImagemControleProps> = ({
  slideId,
  imagePrompt,
  imageUrl,
  onSalvarUrl,
}) => {
  const [aberto, setAberto] = useState(false);
  const [urlInput, setUrlInput] = useState(imageUrl || '');
  const [copiado, setCopiado] = useState(false);
  const [modalZoom, setModalZoom] = useState(false);

  useEffect(() => {
    setUrlInput(imageUrl || '');
  }, [imageUrl, slideId]);

  const handleCopiarPrompt = () => {
    if (!imagePrompt) return;
    navigator.clipboard.writeText(imagePrompt);
    setCopiado(true);
    toast.success('Prompt copiado para a área de transferência!');
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleAplicar = () => {
    if (!urlInput.trim()) {
      toast.error('Informe a URL da imagem.');
      return;
    }
    onSalvarUrl(urlInput.trim());
    toast.success('Imagem vinculada ao slide!');
    setAberto(false);
  };

  if (!imagePrompt && !imageUrl) return null;

  return (
    <div className="w-full space-y-2.5 my-2">
      {/* 1. SE JÁ TIVER IMAGEM: RENDERIZAÇÃO CINEMATOGRÁFICA 16:9 */}
      {imageUrl && (
        <div className="relative group overflow-hidden rounded-2xl border border-teal-500/30 bg-background/60 shadow-lg">
          <div className="aspect-video w-full overflow-hidden bg-black/40 flex items-center justify-center">
            <img 
              src={imageUrl} 
              alt="Ilustração de Legal Design" 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-md border border-border text-[10px] font-bold text-teal-300">
            <Sparkles className="w-3 h-3 text-teal-400" />
            <span>Legal Design Visual (Gemini Spark)</span>
          </div>
          <button
            onClick={() => setModalZoom(true)}
            className="absolute bottom-2.5 right-2.5 p-2 rounded-xl bg-background/80 backdrop-blur-md border border-border text-foreground hover:bg-secondary transition-all opacity-0 group-hover:opacity-100 shadow-md"
            title="Expandir Imagem"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. PAINEL COLAPSÁVEL DE CONTROLE DO PROMPT & MCP SPARK */}
      <div className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden text-left">
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
            <span>
              {imageUrl ? '🎨 Imagem Vinculada (Ver Prompt / Alterar Link)' : '🎨 Imagem do Slide (Prompt & Gemini Spark)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {imageUrl ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Pronta
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Pendente no Spark
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {aberto && (
          <div className="p-3.5 border-t border-border/60 space-y-3 bg-secondary/20">
            {/* Prompt Formulado */}
            {imagePrompt && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Prompt Gerado para Imagen 3 / Gemini Spark:
                  </span>
                  <button
                    onClick={handleCopiarPrompt}
                    className="flex items-center gap-1 text-[10px] font-bold text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    {copiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiado ? 'Copiado!' : 'Copiar Prompt'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-background/80 border border-border text-[11px] font-mono text-muted-foreground leading-relaxed select-all max-h-24 overflow-y-auto">
                  {imagePrompt}
                </div>
              </div>
            )}

            {/* Input Manual de URL / Storage */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                Link da Imagem (Supabase Storage ou Web):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://...supabase.co/storage/v1/object/public/aprender-leis-imagens/..."
                  className="flex-1 min-h-[38px] px-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button
                  onClick={handleAplicar}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs shadow-sm transition-all active:scale-95 shrink-0"
                >
                  Salvar
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                ⚡ O <strong>MCP Server</strong> do Gemini Spark pode salvar automaticamente essa URL através da ferramenta <code>upload_imagem_gerada</code>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Zoom da Imagem */}
      {modalZoom && imageUrl && (
        <div 
          onClick={() => setModalZoom(false)}
          className="fixed inset-0 z-[100000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-border/80 shadow-2xl">
            <img src={imageUrl} alt="Zoom" className="w-full h-full object-contain" />
            <button
              onClick={() => setModalZoom(false)}
              className="absolute top-3 right-3 p-2 rounded-xl bg-background/80 text-foreground hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// COMPONENTES INTERATIVOS ESPECIAIS
// ==========================================

// 1. MINI-GAME: LIGAR OS TERMOS (Apple & Material 3 Touch Friendly)
interface TermoPar {
  id: string;
  termo: string;
  significado: string;
}

function LigarTermosGame({ pares, onCompleto }: { pares: TermoPar[]; onCompleto?: () => void }) {
  const [selecionadoTermo, setSelecionadoTermo] = useState<string | null>(null);
  const [selecionadoSignificado, setSelecionadoSignificado] = useState<string | null>(null);
  const [acertos, setAcertos] = useState<string[]>([]);
  const [erro, setErro] = useState<{ termo: string; sig: string } | null>(null);

  // Embaralha significados na montagem
  const significadosEmbaralhados = useMemo(() => {
    return [...pares].sort(() => Math.random() - 0.5);
  }, [pares]);

  const tentarConectar = (termoId: string, sigId: string) => {
    if (termoId === sigId) {
      const novosAcertos = [...acertos, termoId];
      setAcertos(novosAcertos);
      setSelecionadoTermo(null);
      setSelecionadoSignificado(null);
      toast.success('Par correto conectado!');
      if (novosAcertos.length === pares.length && onCompleto) {
        onCompleto();
      }
    } else {
      setErro({ termo: termoId, sig: sigId });
      toast.error('Essa combinação não combina. Tente novamente!');
      setTimeout(() => {
        setErro(null);
        setSelecionadoTermo(null);
        setSelecionadoSignificado(null);
      }, 900);
    }
  };

  const handleCliqueTermo = (id: string) => {
    if (acertos.includes(id)) return;
    if (selecionadoSignificado) {
      tentarConectar(id, selecionadoSignificado);
    } else {
      setSelecionadoTermo(id === selecionadoTermo ? null : id);
    }
  };

  const handleCliqueSig = (id: string) => {
    if (acertos.includes(id)) return;
    if (selecionadoTermo) {
      tentarConectar(selecionadoTermo, id);
    } else {
      setSelecionadoSignificado(id === selecionadoSignificado ? null : id);
    }
  };

  const finalizado = acertos.length === pares.length;

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl border border-teal-500/40 bg-teal-950/25 flex items-center justify-between text-xs sm:text-sm shadow-sm">
        <span className="font-bold text-foreground flex items-center gap-2">
          <Link2 className="w-5 h-5 text-teal-400" />
          Toque para Conectar o Termo ao Significado:
        </span>
        <span className="font-black px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/40">
          {acertos.length} / {pares.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
        {/* Coluna da Esquerda: Termos */}
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-wider text-teal-400/90 px-1">
            Termo Jurídico:
          </div>
          {pares.map((p) => {
            const acertou = acertos.includes(p.id);
            const selecionado = selecionadoTermo === p.id;
            const comErro = erro?.termo === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleCliqueTermo(p.id)}
                disabled={acertou}
                className={`w-full min-h-[58px] sm:min-h-[64px] p-4 rounded-2xl border text-left font-bold transition-all flex items-center justify-between shadow-sm active:scale-[0.98] ${
                  acertou
                    ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300 opacity-90 cursor-default ring-1 ring-emerald-500/50'
                    : comErro
                    ? 'border-rose-500 bg-rose-950/50 text-rose-300 animate-shake'
                    : selecionado
                    ? 'border-teal-400 bg-teal-500/25 text-teal-100 ring-2 ring-teal-500 shadow-md shadow-teal-500/20'
                    : 'border-border/90 bg-card hover:bg-secondary/70 text-foreground'
                }`}
              >
                <span className="leading-snug">{p.termo}</span>
                {acertou && <Check className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>

        {/* Coluna da Direita: Significados */}
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-wider text-cyan-400/90 px-1">
            Significado na Prática:
          </div>
          {significadosEmbaralhados.map((p) => {
            const acertou = acertos.includes(p.id);
            const selecionado = selecionadoSignificado === p.id;
            const comErro = erro?.sig === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleCliqueSig(p.id)}
                disabled={acertou}
                className={`w-full min-h-[58px] sm:min-h-[64px] p-4 rounded-2xl border text-left font-medium transition-all flex items-center justify-between shadow-sm active:scale-[0.98] ${
                  acertou
                    ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300 opacity-90 cursor-default ring-1 ring-emerald-500/50'
                    : comErro
                    ? 'border-rose-500 bg-rose-950/50 text-rose-300 animate-shake'
                    : selecionado
                    ? 'border-teal-400 bg-teal-500/25 text-teal-100 ring-2 ring-teal-500 shadow-md shadow-teal-500/20'
                    : 'border-border/90 bg-card hover:bg-secondary/70 text-foreground'
                }`}
              >
                <span className="leading-relaxed">{p.significado}</span>
                {acertou && <Check className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      </div>

      {finalizado && (
        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/50 bg-emerald-950/40 text-center space-y-2 shadow-lg">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <p className="text-sm sm:text-base font-bold text-emerald-200">
            Parabéns! Todos os termos foram conectados com 100% de precisão!
          </p>
        </div>
      )}
    </div>
  );
}

// 2. FLASHCARD 3D (Animação de Flip Fluida e Realista com Profundidade 3D)
function FlipCardItem({ frente, verso }: { frente: string; verso: string }) {
  const [virado, setVirado] = useState(false);
  const flipAudioRef = useRef<HTMLAudioElement | null>(null);

  // Inicializa o som sutil de flipcard (opcional e não-bloqueante)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!flipAudioRef.current && flipSoundAsset?.url) {
        flipAudioRef.current = new Audio(flipSoundAsset.url);
        flipAudioRef.current.volume = 0.35;
      }
    } catch {}
  }, []);

  // Reseta a rotação ao mudar de questão/slide
  useEffect(() => {
    setVirado(false);
  }, [frente, verso]);

  const handleToggle = () => {
    setVirado((prev) => !prev);
    try {
      const audio = flipAudioRef.current;
      if (audio) {
        audio.currentTime = 0;
        void audio.play().catch(() => {});
      }
    } catch {}
  };

  return (
    <div 
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={virado ? "Flashcard mostrando resposta. Toque para rever a pergunta." : "Flashcard mostrando pergunta. Toque para ver a explicação."}
      aria-pressed={virado}
      className="cursor-pointer select-none py-2 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-3xl"
      style={{ perspective: '1200px' }}
    >
      <motion.div 
        className="relative w-full rounded-3xl"
        animate={{ rotateY: virado ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.985 }}
      >
        {/* Sizer invisível no fluxo normal para dimensionamento dinâmico sem saltos de layout */}
        <div 
          className="invisible pointer-events-none select-none p-6 sm:p-8 flex flex-col items-center justify-between text-center min-h-[260px] sm:min-h-[290px]" 
          aria-hidden="true"
        >
          <div className="text-xs font-black uppercase tracking-wider mb-3">Header Sizer</div>
          <p className="text-base sm:text-lg md:text-xl font-bold leading-relaxed max-w-xl my-auto">
            {frente.length >= verso.length ? frente : verso}
          </p>
          <span className="text-xs sm:text-sm mt-4 font-semibold">Footer Sizer</span>
        </div>

        {/* FACE 1: FRENTE (Pergunta) */}
        <div 
          className="absolute inset-0 w-full h-full rounded-3xl border border-teal-500/40 bg-gradient-to-br from-[#121820] via-[#10171d] to-[#0c1218] p-6 sm:p-8 flex flex-col items-center justify-between text-center shadow-2xl ring-1 ring-white/10 hover:border-teal-400/70 transition-colors"
          style={{ 
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <div className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5 pt-1">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>❓ Toque para Virar o Cartão</span>
          </div>

          <div className="my-auto py-2">
            <p className="text-base sm:text-lg md:text-xl font-bold leading-relaxed max-w-xl text-white">
              {frente}
            </p>
          </div>

          <span className="text-xs sm:text-sm text-slate-400 font-semibold flex items-center gap-1.5 opacity-90 pb-1">
            <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
            Toque para ver a explicação
          </span>
        </div>

        {/* FACE 2: VERSO (Resposta / Revelação Jurídica) */}
        <div 
          className="absolute inset-0 w-full h-full rounded-3xl border border-emerald-500/60 bg-gradient-to-br from-[#064e3b] via-[#042f2e] to-[#022c22] p-6 sm:p-8 flex flex-col items-center justify-between text-center shadow-2xl ring-1 ring-emerald-500/40"
          style={{ 
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            WebkitTransform: 'rotateY(180deg)',
          }}
        >
          <div className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5 pt-1">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>💡 Revelação Jurídica</span>
          </div>

          <div className="my-auto py-2">
            <p className="text-base sm:text-lg md:text-xl font-bold leading-relaxed max-w-xl text-emerald-50">
              {verso}
            </p>
          </div>

          <span className="text-xs sm:text-sm text-emerald-300/90 font-semibold flex items-center gap-1.5 opacity-90 pb-1">
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            Toque para rever a pergunta
          </span>
        </div>
      </motion.div>
    </div>
  );
}

// 3. QUIZ INTERATIVO (Alvos de Toque Apple HIG >= 44pt / Material 3 >= 48dp)
function QuizInterativoItem({
  pergunta,
  opcoes,
}: {
  pergunta: string;
  opcoes: { texto: string; correta: boolean; feedback: string }[];
}) {
  const [resposta, setResposta] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/* Card da Pergunta */}
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-card via-card to-secondary/40 shadow-lg">
        <p className="text-base sm:text-lg md:text-xl font-bold text-foreground leading-relaxed">
          {pergunta}
        </p>
      </div>

      {/* Lista de Alternativas Confortáveis */}
      <div className="space-y-3">
        {opcoes.map((op, idx) => (
          <button
            key={idx}
            onClick={() => setResposta(idx)}
            className={`w-full text-left min-h-[64px] sm:min-h-[72px] p-4 sm:p-5 rounded-2xl border text-sm sm:text-base font-semibold leading-relaxed transition-all shadow-sm active:scale-[0.99] flex flex-col justify-center ${
              resposta === idx
                ? op.correta
                  ? 'border-emerald-500 bg-emerald-950/60 text-emerald-100 ring-2 ring-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'border-rose-500 bg-rose-950/60 text-rose-100 ring-2 ring-rose-500 shadow-md shadow-rose-500/20'
                : 'border-border/90 bg-card hover:bg-secondary/70 text-foreground'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <span className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center shrink-0 text-base font-black shadow-sm transition-colors ${
                resposta === idx
                  ? op.correta
                    ? 'border-emerald-400 bg-emerald-500 text-white'
                    : 'border-rose-400 bg-rose-500 text-white'
                  : 'border-border bg-secondary/80 text-muted-foreground'
              }`}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="leading-relaxed font-semibold">{op.texto}</span>
            </div>
            {resposta === idx && (
              <div className={`mt-3 pt-3 border-t text-xs sm:text-sm leading-relaxed font-medium flex items-start gap-2 ${
                op.correta ? 'border-emerald-500/40 text-emerald-300' : 'border-rose-500/40 text-rose-300'
              }`}>
                {op.correta ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                )}
                <span>{op.feedback}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// 4. SIMULADOR TEMPORAL (Segmented Control Apple & Google M3)
function SimuladorArtigo1Tempo() {
  const [cenario, setCenario] = useState<'antes' | 'depois'>('antes');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-secondary/70 border border-border/80 gap-1.5">
        <button
          onClick={() => setCenario('antes')}
          className={`min-h-[50px] sm:min-h-[56px] px-4 py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm sm:text-base font-black transition-all flex items-center justify-center gap-2 shadow-sm ${
            cenario === 'antes'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30 scale-[1.01]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Ação ANTES da Lei</span>
        </button>
        <button
          onClick={() => setCenario('depois')}
          className={`min-h-[50px] sm:min-h-[56px] px-4 py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm sm:text-base font-black transition-all flex items-center justify-center gap-2 shadow-sm ${
            cenario === 'depois'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30 scale-[1.01]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Ação DEPOIS da Lei</span>
        </button>
      </div>

      <div className="p-6 sm:p-7 rounded-3xl border border-white/10 bg-gradient-to-br from-card via-card to-secondary/30 text-center space-y-3 shadow-lg">
        {cenario === 'antes' ? (
          <>
            <div className="text-4xl animate-bounce">🟢</div>
            <h5 className="text-base sm:text-lg md:text-xl font-black text-emerald-400">
              Conduta Totalmente Lícita (Inocente)
            </h5>
            <p className="text-sm sm:text-base md:text-lg text-foreground/90 leading-relaxed font-normal">
              Como a ação ocorreu antes da publicação da lei, a pessoa é inocente. O Artigo 1º ergue um muro impenetrável que impede o Estado de punir retroativamente condutas passadas.
            </p>
          </>
        ) : (
          <>
            <div className="text-4xl animate-pulse">⚠️</div>
            <h5 className="text-base sm:text-lg md:text-xl font-black text-amber-400">
              Crime Configurado (Punível)
            </h5>
            <p className="text-sm sm:text-base md:text-lg text-foreground/90 leading-relaxed font-normal">
              Como a ação ocorreu após a lei entrar em vigor, todo cidadão tem o dever de conhecê-la. A conduta é punível nos limites estritos fixados na lei prévia.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function SimuladorArtigo2Tempo() {
  const [cenario, setCenario] = useState<'revogado' | 'diminuiu' | 'piorou'>('revogado');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 p-1.5 rounded-2xl bg-secondary/70 border border-border/80 gap-1.5">
        <button
          onClick={() => setCenario('revogado')}
          className={`min-h-[50px] sm:min-h-[56px] p-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center text-center leading-tight shadow-sm ${
            cenario === 'revogado'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 scale-[1.01]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Crime Acabou
        </button>
        <button
          onClick={() => setCenario('diminuiu')}
          className={`min-h-[50px] sm:min-h-[56px] p-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center text-center leading-tight shadow-sm ${
            cenario === 'diminuiu'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.01]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Pena Diminuiu
        </button>
        <button
          onClick={() => setCenario('piorou')}
          className={`min-h-[50px] sm:min-h-[56px] p-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center text-center leading-tight shadow-sm ${
            cenario === 'piorou'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30 scale-[1.01]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Pena Aumentou
        </button>
      </div>

      <div className="p-6 sm:p-7 rounded-3xl border border-white/10 bg-gradient-to-br from-card via-card to-secondary/30 text-center space-y-3 shadow-lg">
        {cenario === 'revogado' && (
          <>
            <div className="text-4xl">🕊️</div>
            <h5 className="text-base sm:text-lg md:text-xl font-black text-emerald-400">
              Abolitio Criminis (Extinção Completa do Crime)
            </h5>
            <p className="text-sm sm:text-base md:text-lg text-foreground/90 leading-relaxed font-normal">
              Quem está preso sai imediatamente! Os efeitos penais são cancelados e a ficha criminal fica 100% limpa quanto a esse fato.
            </p>
          </>
        )}
        {cenario === 'diminuiu' && (
          <>
            <div className="text-4xl">📉</div>
            <h5 className="text-base sm:text-lg md:text-xl font-black text-blue-400">
              Novatio Legis in Mellius (Lei Mais Suave)
            </h5>
            <p className="text-sm sm:text-base md:text-lg text-foreground/90 leading-relaxed font-normal">
              A nova lei viaja no tempo e diminui a pena de quem já está preso ou processado, mesmo após sentença condenatória transitada em julgado.
            </p>
          </>
        )}
        {cenario === 'piorou' && (
          <>
            <div className="text-4xl">🛑</div>
            <h5 className="text-base sm:text-lg md:text-xl font-black text-rose-400">
              Irretroatividade da Lei Mais Grave (Lex Gravior)
            </h5>
            <p className="text-sm sm:text-base md:text-lg text-foreground/90 leading-relaxed font-normal">
              A lei que piora ou aumenta castigo NÃO pode retroagir. Quem cometeu o fato antes continua protegido pela lei anterior mais branda.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// DADOS DAS MECÂNICAS (EXPANDIDAS E O COMBO)
// ==========================================

// GERA OS SLIDES ROBUSTOS (25 ETAPAS COM ESCALA APPLE HIG & MATERIAL 3)
function gerarSlidesCombo(artigo: ArtigoId): SlideData[] {
  if (artigo === 'art1') {
    return [
      {
        id: 'combo-art1-1',
        dispositivoId: 'caput',
        dispositivoLabel: 'Caput',
        isCapaDispositivo: true,
        badge: 'Etapa 1 de 25 · Capa do Dispositivo',
        titulo: 'Caput — Anterioridade da Lei Penal',
        subtitulo: 'O escudo supremo que protege a liberdade de todo cidadão',
        imagePrompt: 'A stylized 3D conceptual illustration of a glowing golden hourglass resting on top of a dark marble timeline pedestal. To the left, a heavy closed iron gate locks the past events; to the right, an illuminated transparent path opens towards the future with a floating gavel, symbolizing that no law can punish past acts without prior existence. Minimalist dark background, cinematic teal lighting, 16:9 aspect ratio, zero text.',
        textoAudio: 'Bem-vindo ao estudo do Caput do Artigo primeiro do Código Penal. Você vai dominar a anterioridade penal: não há crime sem lei anterior que o defina, nem pena sem prévia cominação legal.',
        conteudoPrincipal: (
          <CapaDispositivoSlide
            diploma="Código Penal"
            artigoNumero="Artigo 1º"
            dispositivoLabel="Caput"
            titulo="Princípio da Anterioridade Penal"
            textoLei="Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal."
            explicacaoCurta="Você vai dominar um dos maiores escudos de liberdade da sociedade: o Estado não pode inventar uma proibição nova hoje para punir o que você fez ontem."
            icone={ShieldCheck}
            corAcento="text-teal-400"
            gradienteFundo="from-teal-950/50 via-card to-background"
            bordaCor="border-teal-500/40"
          />
        ),
      },
      {
        id: 'combo-art1-2',
        badge: 'Etapa 2 de 25 · O Texto Oficial',
        titulo: 'O que está escrito no Código Penal?',
        subtitulo: 'Decreto-Lei nº 2.848/1940 — Artigo 1º Oficial',
        imagePrompt: 'A glowing antique codex book of Brazilian Penal Law floating open with ethereal light rays illuminating the words, with dark stone scales of justice in the background, cinematic volumetric lighting, 16:9 widescreen, no text.',
        textoAudio: 'Artigo primeiro: Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-teal-500/40 bg-gradient-to-br from-teal-950/30 via-card to-background text-center space-y-4 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 inline-block">
              Texto Oficial da Lei
            </span>
            <p className="font-serif text-lg sm:text-xl md:text-2xl text-foreground italic leading-relaxed px-2">
              “Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.”
            </p>
            <p className="text-sm sm:text-base text-muted-foreground font-medium pt-1">
              Apenas duas frases curtas, mas que sustentam toda a justiça penal brasileira.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-3',
        badge: 'Etapa 3 de 25 · Anatomia 1',
        titulo: 'Primeira Metade: A Regra do Jogo',
        subtitulo: '“...sem lei anterior que o defina”',
        textoAudio: 'Primeira parte: A lei tem que existir antes da ação. Ninguém pode inventar um crime depois que você agiu.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-card to-background space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400 block">
              Tradução em Português Claro:
            </span>
            <p className="text-base sm:text-lg md:text-xl text-foreground/95 leading-relaxed font-normal">
              Você só pode ser punido por um ato se já existia uma lei formal em vigor no exato milissegundo da sua ação. Se a proibição for criada amanhã, o que você fez hoje é <strong>100% inocente e livre de culpa</strong>.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-4',
        badge: 'Etapa 4 de 25 · Exercício Rápido',
        titulo: 'Teste Relâmpago 1',
        subtitulo: 'Fixando a primeira metade do Artigo 1º',
        textoAudio: 'O prefeito da sua cidade publica um decreto hoje criando uma nova infração e manda a polícia punir atos cometidos no mês passado. Isso é permitido?',
        conteudoPrincipal: (
          <QuizInterativoItem 
            pergunta="O prefeito da sua cidade publica um decreto hoje criando uma nova infração e manda a polícia punir atos cometidos no mês passado. Isso é permitido?"
            opcoes={[
              { texto: "Não! Fere a anterioridade do Artigo 1º e só o Congresso Nacional cria crimes.", correta: true, feedback: "Exatamente! O Artigo 1º exige lei anterior e competência federal exclusiva do Congresso." },
              { texto: "Sim! O prefeito tem poder absoluto sobre os atos ocorridos na sua cidade.", correta: false, feedback: "Errado! Prefeitos não podem criar crimes, e mesmo que pudessem, jamais poderiam punir atos passados." },
            ]}
          />
        ),
      },
      {
        id: 'combo-art1-5',
        badge: 'Etapa 5 de 25 · Anatomia 2',
        titulo: 'Segunda Metade: O Castigo Tabelado',
        subtitulo: '“...sem prévia cominação legal”',
        textoAudio: 'Segunda metade: Não há pena sem prévia cominação legal. Cominação significa previsão de castigo. O juiz não pode inventar pena da cabeça dele.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-teal-500/40 bg-gradient-to-br from-teal-950/30 via-card to-background space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-teal-400 block">
              O que é Cominação?
            </span>
            <p className="text-base sm:text-lg md:text-xl text-foreground/95 leading-relaxed font-normal">
              A palavra <strong>cominação</strong> significa a fixação prévia da pena. A lei já tem que estabelecer o castigo exato e os limites (ex: 1 a 3 anos de reclusão e multa). O juiz é estritamente obrigado a respeitar essa tabela.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-6',
        badge: 'Etapa 6 de 25 · Flashcard 3D',
        titulo: 'Toque para testar sua memória!',
        subtitulo: 'Fixação interativa da palavra-chave do artigo',
        textoAudio: 'Toque para virar o cartão e revisar o significado de prévia cominação legal.',
        conteudoPrincipal: (
          <FlipCardItem 
            frente="O que significa a expressão 'Prévia Cominação Legal' no Artigo 1º?"
            verso="Significa que o CASTIGO (a pena) também precisa estar escrito e tabelado na lei antes do fato acontecer. O juiz não pode inventar um castigo novo da própria cabeça!"
          />
        ),
      },
      {
        id: 'combo-art1-7',
        badge: 'Etapa 7 de 25 · História Real 1',
        titulo: 'Caso Dona Clara: A Quitanda de Bairro',
        subtitulo: 'Uma atividade honesta e 100% legalizada',
        imagePrompt: 'A warm, realistic illustration of a friendly elderly Brazilian woman (Dona Clara, 68) in a cozy traditional neighborhood herbal tea store, glass jars of medicinal chamomile herbs neatly displayed on rustic wooden shelves, warm cinematic lighting, highly detailed legal storytelling, 16:9 widescreen, zero text.',
        textoAudio: 'Conheça Dona Clara. Há mais de dez anos ela produz e vende um chá de ervas artesanal em sua quitanda com total transparência e notas fiscais.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-card to-background flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left shadow-xl">
            <span className="text-5xl sm:text-6xl shrink-0">👵</span>
            <div className="space-y-2">
              <h5 className="text-base sm:text-lg font-black text-amber-300">Dona Clara, 68 anos</h5>
              <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
                Vende chás artesanais de camomila e capim-cidreira há mais de 10 anos em sua quitanda familiar. Sempre emitiu nota fiscal e possui alvará regular.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art1-8',
        badge: 'Etapa 8 de 25 · História Real 2',
        titulo: 'A Nova Lei em Brasília',
        subtitulo: 'A proibição inesperada surge no Diário Oficial',
        textoAudio: 'No dia primeiro de junho, o Congresso aprova uma nova lei dizendo que o extrato concentrado dessa erva agora é proibido sob pena de até três anos de cadeia.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-card via-card to-secondary/30 space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 block">
              📅 1º de Junho — Publicação Oficial:
            </span>
            <p className="text-base sm:text-lg text-foreground/95 leading-relaxed font-semibold italic border-l-4 border-amber-500 pl-4 py-1">
              “É crime inafiançável vender extrato concentrado dessa erva sem autorização médica expressa. Pena: 1 a 3 anos de reclusão.”
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-9',
        badge: 'Etapa 9 de 25 · História Real 3',
        titulo: 'O Fiscal Bate à Porta',
        subtitulo: 'A acusação indevida pelas vendas do mês passado',
        textoAudio: 'No dia 2 de junho, a fiscalização aparece com policiais na quitanda de Dona Clara e exige notas fiscais do mês de maio.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-card to-background space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <span className="text-xl">👮</span> O Fiscal Acusa:
            </span>
            <p className="text-base sm:text-lg text-foreground/95 leading-relaxed font-normal italic">
              “A senhora vendeu 50 frascos semana passada durante o mês de maio! Vamos lavrar o flagrante e te levar presa por crime!”
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-10',
        badge: 'Etapa 10 de 25 · História Real 4',
        titulo: 'A Intervenção do Artigo 1º',
        subtitulo: 'A lei não pode olhar para trás',
        textoAudio: 'O artigo primeiro entra em ação e salva Dona Clara. Como as vendas de maio ocorreram antes da lei existir, não há crime.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-card to-background space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Veredito: Livre de Qualquer Crime!
            </span>
            <p className="text-base sm:text-lg md:text-xl text-foreground/95 leading-relaxed font-normal">
              O Artigo 1º proíbe punir atos praticados antes da vigência da lei. Dona Clara só tem o dever de interromper as vendas a partir de 1º de junho. As vendas do mês passado foram <strong>100% lícitas e protegidas</strong>.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-11',
        badge: 'Etapa 11 de 25 · Bate-Papo Tutor',
        titulo: 'Conversa no WhatsApp com o Tutor',
        subtitulo: 'Tirando as dúvidas de quem não é do Direito',
        textoAudio: 'Aluno pergunta: Professor, mas e se o juiz achar que a atitude foi feia e imoral? O tutor responde: Não importa! Imoralidade não é crime se não estiver escrito na lei penal.',
        conteudoPrincipal: (
          <div className="space-y-3.5">
            {/* Header estilo WhatsApp Web/App */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#1f2c34] border border-[#2a3942] shadow-md">
              <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-base shadow-sm shrink-0">
                👨‍🏫
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-sm text-[#e9edef] block truncate">Tutor Jurídico Vacatio</span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  Online no chat
                </span>
              </div>
            </div>

            {/* Balão do Aluno (Recebido / Esquerda) */}
            <div className="p-4 sm:p-5 rounded-3xl rounded-tl-sm bg-[#202c33] border border-[#2a3942] text-[#e9edef] max-w-[90%] shadow-lg space-y-1">
              <span className="text-xs font-bold text-[#8696a0] block">Dúvida do Aluno:</span>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed font-medium">
                “Professor, e se todo mundo achar a atitude feia ou imoral? O juiz pode condenar mesmo sem ter lei federal escrita?”
              </p>
              <span className="text-[11px] text-[#8696a0] block text-right">14:32</span>
            </div>

            {/* Balão do Tutor (Enviado / Direita com Verde WhatsApp Autêntico #005c4b) */}
            <div className="p-4 sm:p-5 rounded-3xl rounded-tr-sm bg-[#005c4b] border border-[#005c4b] text-white max-w-[90%] ml-auto text-left shadow-lg space-y-1">
              <span className="text-xs font-bold text-emerald-300 block">Resposta do Tutor:</span>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed font-semibold text-white">
                “Não! No Brasil vigora a <strong className="text-[#25d366] bg-[#004739] px-1.5 py-0.5 rounded">Legalidade Estrita</strong>: só o que está expressamente escrito na lei pode ser crime. Juiz não inventa crime por sentimento moral!”
              </p>
              <div className="flex items-center justify-end gap-1 text-[11px] text-emerald-200">
                <span>14:33</span>
                <span className="text-[#53bdeb] font-bold">✓✓</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art1-12',
        badge: 'Etapa 12 de 25 · A Metáfora da Pelada',
        titulo: 'A Analogia do Jogo de Futebol',
        subtitulo: 'Regra inventada no meio da partida não vale',
        textoAudio: 'Imagina você jogando futebol no domingo e no final do segundo tempo o árbitro expulsa você por um toque de calcanhar dado no começo do jogo. Seria absurdo, e na lei é igual.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-card via-card to-secondary/30 space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-cyan-400 block">
              ⚽ A Pelada de Domingo:
            </span>
            <p className="text-base sm:text-lg md:text-xl text-foreground/95 leading-relaxed font-normal">
              Se o árbitro inventasse uma falta nova aos 40 minutos do segundo tempo e expulsasse um jogador por um toque de calcanhar dado no primeiro tempo, haveria revolta no campo! No Direito Penal é idêntico: a regra do jogo tem que ser conhecida com antecedência absoluta.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-13',
        badge: 'Etapa 13 de 25 · Quem Cria Leis?',
        titulo: 'O Princípio da Reserva Legal',
        subtitulo: 'Apenas representantes eleitos pelo povo',
        textoAudio: 'Apenas deputados federais e senadores aprovados no Congresso Nacional podem criar crimes no Brasil.',
        conteudoPrincipal: (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-500/40 bg-emerald-950/25 space-y-2 shadow-md">
              <span className="text-sm sm:text-base font-black text-emerald-400 flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400" /> QUEM PODE:
              </span>
              <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-medium">
                Apenas <strong>Lei Federal</strong> votada e aprovada pelo Congresso Nacional (Deputados Federais e Senadores).
              </p>
            </div>
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-rose-500/40 bg-rose-950/25 space-y-2 shadow-md">
              <span className="text-sm sm:text-base font-black text-rose-400 flex items-center gap-2">
                <X className="w-5 h-5 text-rose-400" /> QUEM NÃO PODE:
              </span>
              <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-medium">
                Decreto de prefeito, ordem de governador, portaria de delegado ou decisão solitária de juiz.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art1-14',
        badge: 'Etapa 14 de 25 · Linha do Tempo',
        titulo: 'A Régua Cronológica do Tempo',
        subtitulo: 'Como o relógio do Direito Penal funciona',
        textoAudio: 'Veja a linha do tempo: No passado aconteceu a ação. No presente surgiu a nova lei. A lei tenta viajar para trás, mas é bloqueada.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-white/10 bg-gradient-to-br from-card via-card to-secondary/30 space-y-5 shadow-xl">
            <div className="relative py-4 px-2">
              <div className="h-2.5 bg-secondary rounded-full w-full relative">
                <div className="absolute left-1/4 -top-2.5 w-7 h-7 rounded-full bg-purple-500 border-4 border-background shadow-md" />
                <div className="absolute left-3/4 -top-2.5 w-7 h-7 rounded-full bg-teal-400 border-4 border-background shadow-md" />
              </div>
              <div className="flex justify-between text-xs sm:text-sm font-bold text-foreground mt-4">
                <span className="text-purple-300">Passado: Conduta Praticada</span>
                <span className="text-teal-300">Presente: Nova Lei Criada</span>
              </div>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground text-center font-medium leading-relaxed">
              O tempo anda sempre para frente. A lei nova criada à direita não tem passe livre para alcançar a conduta praticada à esquerda.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-15',
        badge: 'Etapa 15 de 25 · O Muro do Tempo',
        titulo: 'A Barreira de Proteção Penal',
        subtitulo: 'Irretroatividade da lei que prejudica',
        textoAudio: 'O artigo primeiro funciona como um muro impenetrável. A lei que cria crime bate nessa barreira e não tem permissão para olhar para trás.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-card to-background text-center space-y-3 shadow-xl">
            <ShieldCheck className="w-12 h-12 text-rose-400 mx-auto" />
            <h5 className="text-lg sm:text-xl font-black text-rose-300">O Muro Temporal Intransponível</h5>
            <p className="text-base sm:text-lg text-foreground/95 leading-relaxed font-normal">
              A lei penal que prejudica o cidadão é <strong>alérgica ao passado</strong>. Ela nunca pode retroagir para punir quem agiu antes de sua vigência.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-16',
        badge: 'Etapa 16 de 25 · Simulador Interativo',
        titulo: 'Simulador Cronológico',
        subtitulo: 'Alterne os momentos no tempo e veja a consequência jurídica imediata',
        textoAudio: 'Teste no simulador o que acontece quando a conduta ocorre antes ou depois da vigência da lei.',
        conteudoPrincipal: <SimuladorArtigo1Tempo />,
      },
      {
        id: 'combo-art1-17',
        badge: 'Etapa 17 de 25 · E se a Pena Aumentar?',
        titulo: 'A Pena Também Não Pode Piorar',
        subtitulo: 'Anterioridade estrita da punição legal',
        textoAudio: 'Se uma conduta já era crime com pena de um ano e a nova lei aumentou para dez anos, quem agiu antes responde pela pena antiga de um ano.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-teal-500/40 bg-gradient-to-br from-teal-950/30 via-card to-background space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-teal-400 block">
              Proteção Absoluta da Pena:
            </span>
            <p className="text-base sm:text-lg md:text-xl text-foreground/95 leading-relaxed font-normal">
              O princípio da anterioridade protege tanto contra a criação de novos crimes quanto contra o <strong>aumento da pena</strong>. Se a punição era de 1 ano e subiu para 8 anos, quem cometeu o ato antes responde pela pena original de 1 ano.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-18',
        badge: 'Etapa 18 de 25 · Mini-Game',
        titulo: 'Ligar os Termos do Artigo 1º',
        subtitulo: 'Conecte os conceitos em segundos para fixar na memória',
        textoAudio: 'Mini game: Conecte os termos jurídicos da esquerda com os seus significados do dia a dia na direita.',
        conteudoPrincipal: (
          <LigarTermosGame 
            pares={[
              { id: '1', termo: 'Anterioridade', significado: 'A lei tem que existir antes do ato acontecer' },
              { id: '2', termo: 'Cominação Legal', significado: 'O castigo tabelado na lei com limites prévios' },
              { id: '3', termo: 'Reserva Legal', significado: 'Só lei federal do Congresso Nacional cria crimes' },
              { id: '4', termo: 'Fato Atípico', significado: 'Conduta que não é proibida como crime na lei' },
            ]}
          />
        ),
      },
      {
        id: 'combo-art1-19',
        badge: 'Etapa 19 de 25 · Caso Prático Real',
        titulo: 'Você é o Juiz: O Caso dos Patinetes',
        subtitulo: 'Um dilema real das grandes cidades brasileiras',
        textoAudio: 'Você é o juiz. Em janeiro, Marcos andou de patinete elétrico na calçada. Em março, saiu uma lei criando crime de patinete na calçada. O promotor pede a prisão de Marcos pelo fato de janeiro.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-pink-500/40 bg-gradient-to-br from-pink-950/30 via-card to-background space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-pink-400 flex items-center gap-2">
              <span className="text-xl">🛴</span> O Caso de Marcos:
            </span>
            <p className="text-base sm:text-lg text-foreground/95 leading-relaxed font-normal">
              Marcos andou a 40 km/h de patinete elétrico na calçada em janeiro. Em março, foi sancionada uma nova lei federal punindo patinetes em calçadas com pena de prisão. O promotor denunciou Marcos pelo fato de janeiro. O que você decide como juiz?
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-20',
        badge: 'Etapa 20 de 25 · Flashcard de Sentença',
        titulo: 'Toque para revelar o seu veredito!',
        subtitulo: 'Decisão judicial fundamentada no Artigo 1º',
        textoAudio: 'Toque para girar o cartão e conferir a sentença com base no artigo primeiro.',
        conteudoPrincipal: (
          <FlipCardItem 
            frente="Marcos pode ser punido criminalmente pelo fato praticado em janeiro?"
            verso="NÃO! Em janeiro, andar de patinete na calçada era um fato atípico (não era crime). Pelo Artigo 1º, a lei nova de março não pode retroagir. Denúncia rejeitada e arquivada!"
          />
        ),
      },
      {
        id: 'combo-art1-21',
        badge: 'Etapa 21 de 25 · Árvore de Decisão',
        titulo: 'O Algoritmo Mental em 3 Passos',
        subtitulo: 'Como raciocinar com segurança diante de qualquer caso',
        textoAudio: 'Siga a árvore de decisão: Alguém agiu? A lei existia antes da ação? Se sim, analisa o crime. Se não, inocente e fato atípico.',
        conteudoPrincipal: (
          <div className="space-y-3">
            <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card text-center font-bold text-sm sm:text-base text-foreground shadow-sm">
              1. Aconteceu uma conduta humana?
            </div>
            <div className="text-center text-muted-foreground text-sm font-black">↓</div>
            <div className="p-4 sm:p-5 rounded-2xl border border-teal-500/40 bg-teal-950/25 text-center font-bold text-sm sm:text-base text-teal-200 shadow-sm">
              2. Existia lei escrita proibindo no exato momento da ação?
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-center">
              <div className="p-4 rounded-2xl border border-rose-500/40 bg-rose-950/30 text-rose-200 font-bold text-sm sm:text-base shadow-sm">
                NÃO ➔ Inocente! (Fato Atípico)
              </div>
              <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-200 font-bold text-sm sm:text-base shadow-sm">
                SIM ➔ Prossegue apuração legal
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art1-22',
        badge: 'Etapa 22 de 25 · Exercício de Desafio',
        titulo: 'Desafio de Fixação Final',
        subtitulo: 'Provando seu domínio completo sobre a matéria',
        textoAudio: 'Qual das seguintes situações violaria diretamente o Artigo 1º do Código Penal?',
        conteudoPrincipal: (
          <QuizInterativoItem 
            pergunta="Qual das seguintes situações violaria diretamente o Artigo 1º do Código Penal?"
            opcoes={[
              { texto: "O Congresso criar um crime hoje com vigência para condutas futuras.", correta: false, feedback: "Incorreto! Isso é perfeitamente válido e respeita a anterioridade." },
              { texto: "O juiz aplicar uma pena mais dura criada por lei após o crime ter sido cometido.", correta: true, feedback: "Correto! Aumentar a punição de fatos passados fere a anterioridade da cominação legal." },
              { texto: "A polícia investigar uma conduta proibida por lei vigente na data do fato.", correta: false, feedback: "Incorreto! Isso é a aplicação normal e regular da lei." },
            ]}
          />
        ),
      },
      {
        id: 'combo-art1-23',
        badge: 'Etapa 23 de 25 · Glossário do Cidadão',
        titulo: 'Os 4 Termos que Você Agora Domina',
        subtitulo: 'Dicionário definitivo do Artigo 1º',
        textoAudio: 'Revise os quatro termos que você aprendeu: anterioridade, prévia cominação legal, reserva legal e fato atípico.',
        conteudoPrincipal: (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 sm:p-5 rounded-2xl border border-teal-500/30 bg-card space-y-1 shadow-sm">
              <strong className="text-teal-400 block text-sm sm:text-base font-black">Anterioridade:</strong>
              <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">A lei penal nasce antes da ação acontecer.</p>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl border border-teal-500/30 bg-card space-y-1 shadow-sm">
              <strong className="text-teal-400 block text-sm sm:text-base font-black">Cominação:</strong>
              <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">Tabela de punição previamente fixada em lei.</p>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl border border-teal-500/30 bg-card space-y-1 shadow-sm">
              <strong className="text-teal-400 block text-sm sm:text-base font-black">Reserva Legal:</strong>
              <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">Apenas o Congresso Nacional legisla em matéria penal.</p>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl border border-teal-500/30 bg-card space-y-1 shadow-sm">
              <strong className="text-teal-400 block text-sm sm:text-base font-black">Fato Atípico:</strong>
              <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">Ato que não se encaixa em nenhum crime escrito.</p>
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art1-24',
        badge: 'Etapa 24 de 25 · Resumo em 1 Frase',
        titulo: 'A Regra Gravada para Sempre',
        subtitulo: 'O mandamento que você nunca mais vai esquecer',
        textoAudio: 'A regra de ouro: Sem lei anterior, não há crime nem castigo. Você é livre para fazer tudo o que a lei prévia não proibir.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-8 rounded-3xl border border-teal-500/40 bg-gradient-to-br from-teal-950/40 via-card to-background text-center space-y-3 shadow-xl">
            <span className="text-4xl sm:text-5xl">🛡️</span>
            <h4 className="text-lg sm:text-xl md:text-2xl font-black text-teal-200">
              “Sem lei antes, sem crime e sem castigo!”
            </h4>
            <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-medium">
              Você tem a garantia constitucional de que governantes nunca poderão criar surpresas punitivas contra o seu passado.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-25',
        badge: 'Etapa 25 de 25 · Troféu de Maestria',
        titulo: 'Parabéns! Trilha Concluída com Sucesso',
        subtitulo: 'Você dominou o Artigo 1º do Código Penal',
        textoAudio: 'Parabéns! Você concluiu com sucesso a trilha master do artigo primeiro do Código Penal. Você agora compreende esse pilar da justiça com total clareza.',
        conteudoPrincipal: (
          <div className="p-7 sm:p-8 rounded-3xl border border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-card to-background text-center space-y-4 shadow-xl">
            <Award className="w-16 h-16 sm:w-20 sm:h-20 text-amber-400 mx-auto animate-pulse" />
            <h4 className="text-xl sm:text-2xl font-black text-foreground">Mestre do Artigo 1º</h4>
            <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
              Você completou todas as 25 etapas com anatomia da lei, histórias da vida real, diálogos descontraídos, simulador temporal, ligar de termos e exercícios de fixação!
            </p>
          </div>
        ),
      },
    ].map(s => ({
      ...s,
      dispositivoId: s.dispositivoId || 'caput',
      dispositivoLabel: s.dispositivoLabel || 'Caput',
    }));
  } else if (artigo === 'art2') {
    // ARTIGO 2º COMBO (25 ETAPAS COM ESCALA APPLE HIG & MATERIAL 3)
    return [
      {
        id: 'combo-art2-1',
        dispositivoId: 'caput',
        dispositivoLabel: 'Caput',
        isCapaDispositivo: true,
        badge: 'Etapa 1 de 25 · Capa do Dispositivo',
        titulo: 'Caput — Abolitio Criminis (Extinção do Crime)',
        subtitulo: 'Quando a sociedade decide que uma conduta não deve mais ser punida',
        imagePrompt: 'A dramatic, cinematic 3D illustration of an ancient heavy iron cell gate opening towards a luminous golden sunrise, heavy chains shattering into glowing light particles in the air, symbolizing Abolitio Criminis (extinction of crime), dark blue and amber atmospheric lighting, 16:9 widescreen, zero text.',
        textoAudio: 'Bem-vindo ao estudo do Caput do Artigo segundo do Código Penal. Você vai entender a abolitio criminis: ninguém pode ser punido por fato que lei posterior deixa de considerar crime.',
        conteudoPrincipal: (
          <CapaDispositivoSlide
            diploma="Código Penal"
            artigoNumero="Artigo 2º"
            dispositivoLabel="Caput"
            titulo="Abolitio Criminis (Extinção do Crime)"
            textoLei="Ninguém pode ser punido por fato que lei posterior deixa de considerar crime, cessando em virtude dela a execução e os efeitos penais da sentença condenatória."
            explicacaoCurta="Descubra o que acontece quando uma lei nova extingue um crime: o Estado liberta quem está preso e limpa a ficha na hora!"
            icone={Scale}
            corAcento="text-blue-400"
            gradienteFundo="from-blue-950/50 via-card to-background"
            bordaCor="border-blue-500/40"
          />
        ),
      },
      {
        id: 'combo-art2-2',
        badge: 'Etapa 2 de 25 · O Texto Oficial',
        titulo: 'O que diz o Artigo 2º?',
        subtitulo: 'Caput e Parágrafo Único do Código Penal',
        textoAudio: 'Artigo segundo: Ninguém pode ser punido por fato que lei posterior deixa de considerar crime, cessando a execução e os efeitos penais. A lei posterior que favorecer o agente aplica-se aos fatos anteriores.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-blue-500/40 bg-gradient-to-br from-blue-950/30 via-card to-background text-center space-y-4 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 inline-block">
              Texto Oficial da Lei
            </span>
            <p className="font-serif text-base sm:text-lg md:text-xl text-foreground italic leading-relaxed px-2">
              “Ninguém pode ser punido por fato que lei posterior deixa de considerar crime, cessando em virtude dela a execução e os efeitos penais da sentença condenatória.”
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground font-semibold">
              Parágrafo único: “A lei posterior que de qualquer modo favorecer o agente aplica-se aos fatos anteriores, ainda que decididos por sentença condenatória transitada em julgado.”
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-3',
        badge: 'Etapa 3 de 25 · Abolitio Criminis',
        titulo: 'Quando o Crime Deixa de Existir',
        subtitulo: 'O caput em linguagem leiga e direta',
        textoAudio: 'Abolitio criminis. Se a sociedade decide que uma conduta não deve mais ser crime, quem está preso é solto e a ficha fica limpa na hora.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-card to-background space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400 block">
              O Que Acontece com a Prisão?
            </span>
            <p className="text-base sm:text-lg md:text-xl text-foreground/95 leading-relaxed font-normal">
              A prisão cessa na mesma hora! Ninguém continua cumprindo pena por teimosia do Estado se a conduta deixou de ser crime na lei nova. O Estado abre as portas e liberta o indivíduo.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-4',
        badge: 'Etapa 4 de 25 · Exemplo Histórico Real',
        titulo: 'O Caso Real do Crime de Adultério',
        subtitulo: 'Brasil, ano de 2005 (Lei nº 11.106/2005)',
        textoAudio: 'Até o ano de 2005, adultério era crime no Código Penal. Quando a lei revogou o crime, todos os processos e penas foram cancelados imediatamente.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-card via-card to-secondary/30 space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 block">
              📅 Ano de 2005 no Brasil:
            </span>
            <p className="text-base sm:text-lg text-foreground/95 leading-relaxed font-normal">
              O adultério deixou de ser crime no Brasil em 2005. Todos os réus foram absolvidos, mandados de prisão foram revogados e as fichas criminais foram 100% limpas por força direta do Artigo 2º.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-5',
        badge: 'Etapa 5 de 25 · Exercício Rápido',
        titulo: 'Teste Relâmpago 1',
        subtitulo: 'Fixando a extinção do crime (Abolitio Criminis)',
        textoAudio: 'Se uma pessoa foi condenada a 4 anos e já cumpriu 2, e hoje sai uma nova lei dizendo que o ato não é mais crime: o que acontece com ela?',
        conteudoPrincipal: (
          <QuizInterativoItem 
            pergunta="Se uma pessoa foi condenada a 4 anos e já cumpriu 2, e hoje sai uma nova lei dizendo que o ato não é mais crime: o que acontece com ela?"
            opcoes={[
              { texto: "Ela é solta imediatamente e a ficha criminal é limpa (Abolitio Criminis).", correta: true, feedback: "Correto! O Artigo 2º determina que cessa a execução da pena imediatamente!" },
              { texto: "Ela tem que cumprir os 2 anos restantes porque a condenação ocorreu no passado.", correta: false, feedback: "Incorreto! A lei nova que abole o crime alcança o passado sem nenhuma exceção." },
            ]}
          />
        ),
      },
      {
        id: 'combo-art2-6',
        badge: 'Etapa 6 de 25 · Parágrafo Único',
        titulo: 'A Lei que Favorece o Réu',
        subtitulo: 'Novatio Legis in Mellius (A lei mais suave)',
        textoAudio: 'Parágrafo único: A lei posterior que de qualquer modo favorecer o agente aplica-se aos fatos anteriores, ainda que já decididos por sentença final.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-teal-500/40 bg-gradient-to-br from-teal-950/30 via-card to-background space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-teal-400 block">
              O que é a Lei Benéfica?
            </span>
            <p className="text-base sm:text-lg md:text-xl text-foreground/95 leading-relaxed font-normal">
              Mesmo que a lei não acabe com o crime por inteiro, se ela <strong>diminuir a pena</strong> (ex: de 8 para 4 anos) ou trouxer qualquer vantagem, ela viaja no tempo e ajuda quem agiu no passado!
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-7',
        dispositivoId: 'paragrafo_unico',
        dispositivoLabel: 'Parágrafo único',
        isCapaDispositivo: true,
        badge: 'Etapa 7 de 25 · Capa do Dispositivo',
        titulo: 'Parágrafo Único — A Máquina do Tempo Benéfica',
        subtitulo: 'Novatio Legis in Mellius & Sentença Transitada em Julgado',
        imagePrompt: 'A stylized conceptual 3D render of a luminous legal hourglass reversing its golden sands backward in time, touching a sealed judicial parchment and dissolving its heavy seals into light, symbolizing retroactive favorability of benign law, 16:9 aspect ratio, clean modern legal design, zero text.',
        textoAudio: 'Atenção: Novo dispositivo legal! Entramos no Parágrafo Único do Artigo segundo. A lei posterior que de qualquer modo favorecer o agente aplica-se aos fatos anteriores, ainda que decididos por sentença transitada em julgado.',
        conteudoPrincipal: (
          <CapaDispositivoSlide
            diploma="Código Penal"
            artigoNumero="Artigo 2º"
            dispositivoLabel="Parágrafo único"
            titulo="Novatio Legis in Mellius (Retroatividade Benéfica)"
            textoLei="A lei posterior, que de qualquer modo favorecer o agente, aplica-se aos fatos anteriores, ainda que decididos por sentença condenatória transitada em julgado."
            explicacaoCurta="Mesmo que o crime não seja extinto, se a lei nova diminuir a pena ou trouxer qualquer vantagem, ela viaja no tempo e ajuda quem agiu no passado, inclusive com sentença já transitada em julgado!"
            icone={Clock}
            corAcento="text-emerald-400"
            gradienteFundo="from-emerald-950/50 via-card to-background"
            bordaCor="border-emerald-500/40"
          />
        ),
      },
      {
        id: 'combo-art2-8',
        badge: 'Etapa 8 de 25 · História Real 1',
        titulo: 'O Caso de Lucas',
        subtitulo: 'Condenado no passado e cumprindo pena',
        textoAudio: 'Conheça o caso de Lucas. Em 2021 ele foi sentenciado a 4 anos de prisão e já cumpriu 2 anos. O julgamento encerrou definitivamente.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-blue-500/40 bg-gradient-to-br from-blue-950/30 via-card to-background flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left shadow-xl">
            <span className="text-5xl sm:text-6xl shrink-0">👨</span>
            <div className="space-y-2">
              <h5 className="text-base sm:text-lg font-black text-blue-300">Lucas, 28 anos</h5>
              <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
                Foi condenado a 4 anos de prisão em 2021. Já cumpriu 2 anos na penitenciária. O processo estava encerrado em definitivo, sem mais recursos.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art2-9',
        badge: 'Etapa 9 de 25 · História Real 2',
        titulo: 'A Nova Lei de 2024',
        subtitulo: 'A pena máxima do crime diminui',
        textoAudio: 'Em 2024, entra em vigor uma nova lei no Brasil reduzindo a pena máxima desse crime para exatamente dois anos.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-card via-card to-secondary/30 space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400 block">
              📢 Nova Lei Aprovada em 2024:
            </span>
            <p className="text-base sm:text-lg text-foreground/95 leading-relaxed font-semibold italic border-l-4 border-emerald-500 pl-4 py-1">
              A pena máxima daquele crime foi reduzida de 4 anos para 2 anos de reclusão.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-10',
        badge: 'Etapa 10 de 25 · História Real 3',
        titulo: 'A Família de Lucas Procura Ajuda',
        subtitulo: 'O processo já acabou faz anos, e agora?',
        textoAudio: 'A mãe de Lucas procura o defensor público com medo de que a nova lei não valesse para ele porque o processo já acabou.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-card to-background space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
              <span className="text-xl">👵</span> A Dúvida Angustiada da Família:
            </span>
            <p className="text-base sm:text-lg text-foreground/95 leading-relaxed font-normal italic">
              “Doutor, o processo do meu filho já acabou faz anos... Ele tem direito à redução da pena ou a lei nova só vale para crimes futuros?”
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-11',
        badge: 'Etapa 11 de 25 · História Real 4',
        titulo: 'O Alvará de Soltura de Lucas',
        subtitulo: 'Pena cumprida e liberdade imediata',
        textoAudio: 'O juiz da execução penal aplica o artigo segundo e emite o alvará de soltura. Como a nova pena é de 2 anos e Lucas já cumpriu 2 anos, a pena está extinta.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-card to-background space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              🎉 Lucas é Solto Imediatamente!
            </span>
            <p className="text-base sm:text-lg md:text-xl text-foreground/95 leading-relaxed font-normal">
              O Artigo 2º retroagiu para beneficiar Lucas. Como a nova pena máxima é de 2 anos e ele já havia cumprido 2 anos, o juiz declarou a pena extinta e emitiu o alvará de soltura no mesmo dia!
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-12',
        badge: 'Etapa 12 de 25 · Bate-Papo Tutor',
        titulo: 'A Dúvida que Todo Leigo Tem',
        subtitulo: '“Mas a lei viaja ou não viaja para trás no tempo?”',
        textoAudio: 'Aluno pergunta: No artigo primeiro você disse que a lei nunca volta no tempo. Agora no artigo segundo você diz que ela volta? Ficou confuso!',
        conteudoPrincipal: (
          <div className="space-y-3.5">
            {/* Header estilo WhatsApp Web/App */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#1f2c34] border border-[#2a3942] shadow-md">
              <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-base shadow-sm shrink-0">
                👨‍🏫
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-sm text-[#e9edef] block truncate">Tutor Jurídico Vacatio</span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  Online no chat
                </span>
              </div>
            </div>

            {/* Balão do Aluno (Recebido / Esquerda) */}
            <div className="p-4 sm:p-5 rounded-3xl rounded-tl-sm bg-[#202c33] border border-[#2a3942] text-[#e9edef] max-w-[90%] shadow-lg space-y-1">
              <span className="text-xs font-bold text-[#8696a0] block">Dúvida do Aluno:</span>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed font-medium">
                “Professor! No Artigo 1º você disse que a lei NÃO volta no tempo. Agora no Artigo 2º você diz que ela volta? Tô confuso!”
              </p>
              <span className="text-[11px] text-[#8696a0] block text-right">16:15</span>
            </div>

            {/* Balão do Tutor (Enviado / Direita com Verde WhatsApp Autêntico #005c4b) */}
            <div className="p-4 sm:p-5 rounded-3xl rounded-tr-sm bg-[#005c4b] border border-[#005c4b] text-white max-w-[90%] ml-auto text-left shadow-lg space-y-1">
              <span className="text-xs font-bold text-emerald-300 block">Resposta do Tutor:</span>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed font-semibold text-white">
                “A regra de ouro é simples e infalível: <strong className="text-[#25d366] bg-[#004739] px-1.5 py-0.5 rounded">a lei penal NUNCA volta para PREJUDICAR, mas SEMPRE volta para AJUDAR!</strong>”
              </p>
              <div className="flex items-center justify-end gap-1 text-[11px] text-emerald-200">
                <span>16:16</span>
                <span className="text-[#53bdeb] font-bold">✓✓</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art2-13',
        badge: 'Etapa 13 de 25 · A Metáfora do Desconto',
        titulo: 'A Analogia da Loja e do Cupom',
        subtitulo: 'Entendendo a lógica jurídica em 10 segundos',
        textoAudio: 'Imagina que você comprou um curso parcelado. Se a escola der desconto retroativo para contratos antigos, você quer o desconto? Claro! Mas se quisesse cobrar mais, você aceitaria? Nunca! No Direito Penal é igual.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-card via-card to-secondary/30 space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-cyan-400 block">
              🛍️ O Cupom de Desconto Retroativo:
            </span>
            <p className="text-base sm:text-lg md:text-xl text-foreground/95 leading-relaxed font-normal">
              A lei penal concede o desconto retroativo porque favorece o cidadão. Mas jamais cobra a mais pelos fatos já passados. O benefício sempre abraça o passado; o prejuízo fica barrado na porta.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-14',
        badge: 'Etapa 14 de 25 · Efeitos Civis vs Penais',
        titulo: 'O que Apaga e o que Continua?',
        subtitulo: 'Cessando a execução e os efeitos penais da condenação',
        textoAudio: 'A nova lei apaga os efeitos penais como prisão e reincidência. Mas se você causou prejuízo financeiro para a vítima, a obrigação civil de indenizar continua valendo.',
        conteudoPrincipal: (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-500/40 bg-emerald-950/25 space-y-2 shadow-md">
              <span className="text-sm sm:text-base font-black text-emerald-400 flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400" /> APAGA:
              </span>
              <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-medium">
                Prisão, mandados, reincidência criminal e execução penal no juízo criminal.
              </p>
            </div>
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-500/40 bg-amber-950/25 space-y-2 shadow-md">
              <span className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-2">
                <Info className="w-5 h-5 text-amber-400" /> CONTINUA:
              </span>
              <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-medium">
                A obrigação civil de reparar o prejuízo financeiro causado à vítima.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art2-15',
        badge: 'Etapa 15 de 25 · Linha do Tempo',
        titulo: 'O Portal de Retroatividade Aberto',
        subtitulo: 'A máquina do tempo benéfica em ação',
        textoAudio: 'Na linha do tempo do artigo segundo, quando a lei nova é mais boazinha, abre-se um portal no tempo para alcançar o réu no passado.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-purple-500/40 bg-gradient-to-br from-purple-950/30 via-card to-background text-center space-y-3 shadow-xl">
            <span className="text-4xl sm:text-5xl">🌀</span>
            <h5 className="text-lg sm:text-xl font-black text-purple-300">Ponte Temporal Benéfica</h5>
            <p className="text-base sm:text-lg text-foreground/95 leading-relaxed font-normal">
              A lei boa volta no tempo e neutraliza qualquer decisão judicial anterior que seja mais severa. A liberdade do cidadão prevalece sobre a imutabilidade das decisões anteriores.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-16',
        badge: 'Etapa 16 de 25 · Simulador Interativo',
        titulo: 'Simulador dos 3 Efeitos Temporais',
        subtitulo: 'Alterne os 3 cenários e veja o impacto prático em tempo real',
        textoAudio: 'Teste no simulador o que acontece quando o crime acaba, quando a pena diminui ou quando a pena aumenta.',
        conteudoPrincipal: <SimuladorArtigo2Tempo />,
      },
      {
        id: 'combo-art2-17',
        badge: 'Etapa 17 de 25 · Quem Aplica o Benefício?',
        titulo: 'A Súmula 611 do STF',
        subtitulo: 'O Juiz da Vara de Execuções Penais',
        textoAudio: 'Súmula 611 do STF: Transitada em julgado a sentença, compete ao juiz das execuções a aplicação de lei mais benigna. Não precisa reabrir o processo todo!',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-teal-500/40 bg-gradient-to-br from-teal-950/30 via-card to-background space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-teal-400 block">
              Aplicação Direta e Rápida:
            </span>
            <p className="text-base sm:text-lg md:text-xl text-foreground/95 leading-relaxed font-normal">
              Não é necessário entrar com recurso demorado ou anular o julgamento. Pela <strong>Súmula 611 do Supremo Tribunal Federal</strong>, o próprio juiz que fiscaliza o presídio recalcula a pena diretamente na ficha do réu!
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-18',
        badge: 'Etapa 18 de 25 · Mini-Game',
        titulo: 'Ligar os Termos do Artigo 2º',
        subtitulo: 'Conecte os conceitos em latim aos significados leigos',
        textoAudio: 'Mini game: Conecte os termos da esquerda com os significados simples da direita.',
        conteudoPrincipal: (
          <LigarTermosGame 
            pares={[
              { id: '1', termo: 'Abolitio Criminis', significado: 'Extinção completa do crime e liberdade total' },
              { id: '2', termo: 'Novatio in Mellius', significado: 'Lei nova mais suave que diminui a pena' },
              { id: '3', termo: 'Novatio in Pejus', significado: 'Lei nova mais severa que NÃO pode retroagir' },
              { id: '4', termo: 'Trânsito em Julgado', significado: 'Processo encerrado onde não cabe mais recurso' },
            ]}
          />
        ),
      },
      {
        id: 'combo-art2-19',
        badge: 'Etapa 19 de 25 · Caso Prático Real',
        titulo: 'Você é o Juiz: O Caso de Roberto',
        subtitulo: 'Julgue o pedido de liberdade definitiva',
        textoAudio: 'Roberto foi condenado a cinco anos em 2022. Em 2024 sai lei baixando a pena para dois anos. Roberto já cumpriu dois anos. O que você decide?',
        conteudoPrincipal: (
          <div className="p-6 sm:p-7 rounded-3xl border border-pink-500/40 bg-gradient-to-br from-pink-950/30 via-card to-background space-y-3 shadow-xl">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-pink-400 flex items-center gap-2">
              <span className="text-xl">⚖️</span> O Caso de Roberto:
            </span>
            <p className="text-base sm:text-lg text-foreground/95 leading-relaxed font-normal">
              Roberto foi condenado a 5 anos de reclusão em 2022. Em 2024, após cumprir 2 anos de cadeia, entra em vigor uma nova lei que reduz a pena máxima desse crime para 2 anos. O que você decide como juiz?
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-20',
        badge: 'Etapa 20 de 25 · Flashcard de Sentença',
        titulo: 'Toque para revelar a sentença!',
        subtitulo: 'Decisão judicial fundamentada no Artigo 2º',
        textoAudio: 'Toque para girar o cartão e conferir a sentença de Roberto.',
        conteudoPrincipal: (
          <FlipCardItem 
            frente="Roberto deve ser solto imediatamente ou continuar preso?"
            verso="SOLTO IMEDIATAMENTE! Pelo Artigo 2º, parágrafo único, a lei mais benéfica retroage aos fatos anteriores. Como a nova pena máxima é de 2 anos e ele já cumpriu 2 anos, a pena está extinta!"
          />
        ),
      },
      {
        id: 'combo-art2-21',
        badge: 'Etapa 21 de 25 · Árvore de Decisão',
        titulo: 'O Algoritmo Mental do Artigo 2º',
        subtitulo: 'Como raciocinar com rapidez diante de uma lei nova',
        textoAudio: 'Surgiu uma nova lei após o fato? Ela favorece o réu? Se sim, retroage na hora. Se piora, não retroage.',
        conteudoPrincipal: (
          <div className="space-y-3">
            <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card text-center font-bold text-sm sm:text-base text-foreground shadow-sm">
              Surgiu uma NOVA LEI após a conduta?
            </div>
            <div className="text-center text-muted-foreground text-sm font-black">↓</div>
            <div className="p-4 sm:p-5 rounded-2xl border border-teal-500/40 bg-teal-950/25 text-center font-bold text-sm sm:text-base text-teal-200 shadow-sm">
              Ela FAVORECE o réu de qualquer modo?
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-center">
              <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-200 font-bold text-sm sm:text-base shadow-sm">
                SIM ➔ Retroage na hora! (Mesmo após sentença final)
              </div>
              <div className="p-4 rounded-2xl border border-rose-500/40 bg-rose-950/30 text-rose-200 font-bold text-sm sm:text-base shadow-sm">
                NÃO ➔ Não retroage! (Vale a lei antiga suave)
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art2-22',
        badge: 'Etapa 22 de 25 · Exercício de Desafio',
        titulo: 'Desafio Final do Artigo 2º',
        subtitulo: 'Fixando a regra definitiva sobre a lei mais grave',
        textoAudio: 'Uma nova lei penal aumenta a pena de um crime de 10 anos para 20 anos. Essa lei atinge quem cometeu o crime antes de sua vigência?',
        conteudoPrincipal: (
          <QuizInterativoItem 
            pergunta="Uma nova lei penal aumenta a pena de um crime de 10 anos para 20 anos. Essa lei atinge quem cometeu o crime antes de sua vigência?"
            opcoes={[
              { texto: "Não! A lei penal mais severa (Lex Gravior) nunca retroage.", correta: true, feedback: "Perfeito! A lei penal só retroage quando for para beneficiar o agente." },
              { texto: "Sim! A lei mais recente sempre substitui a antiga em todos os casos.", correta: false, feedback: "Incorreto! A Constituição e o Código Penal proíbem retroatividade prejudicial." },
            ]}
          />
        ),
      },
      {
        id: 'combo-art2-23',
        badge: 'Etapa 23 de 25 · Glossário do Artigo 2º',
        titulo: 'Os 4 Termos que Você Agora Domina',
        subtitulo: 'Dicionário definitivo do Artigo 2º',
        textoAudio: 'Revise os quatro termos do artigo segundo: Abolitio criminis, novatio legis in mellius, novatio legis in pejus e trânsito em julgado.',
        conteudoPrincipal: (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 sm:p-5 rounded-2xl border border-blue-500/30 bg-card space-y-1 shadow-sm">
              <strong className="text-blue-400 block text-sm sm:text-base font-black">Abolitio Criminis:</strong>
              <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">O crime deixou de existir totalmente na lei nova.</p>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl border border-blue-500/30 bg-card space-y-1 shadow-sm">
              <strong className="text-blue-400 block text-sm sm:text-base font-black">Lex Mitior / In Mellius:</strong>
              <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">Lei nova mais suave que diminui a pena ou dá benefício.</p>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl border border-blue-500/30 bg-card space-y-1 shadow-sm">
              <strong className="text-blue-400 block text-sm sm:text-base font-black">Lex Gravior / In Pejus:</strong>
              <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">Lei nova mais severa que NUNCA retroage.</p>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl border border-blue-500/30 bg-card space-y-1 shadow-sm">
              <strong className="text-blue-400 block text-sm sm:text-base font-black">Trânsito em Julgado:</strong>
              <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">Processo encerrado em definitivo sem cabimento de recurso.</p>
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art2-24',
        badge: 'Etapa 24 de 25 · Resumo em 1 Frase',
        titulo: 'A Regra Gravada para Sempre',
        subtitulo: 'O mandamento do Artigo 2º',
        textoAudio: 'A regra de ouro: Lei boa viaja no tempo e ajuda todo mundo no passado. Lei ruim fica presa no presente.',
        conteudoPrincipal: (
          <div className="p-6 sm:p-8 rounded-3xl border border-blue-500/40 bg-gradient-to-br from-blue-950/40 via-card to-background text-center space-y-3 shadow-xl">
            <span className="text-4xl sm:text-5xl">⚖️</span>
            <h4 className="text-lg sm:text-xl md:text-2xl font-black text-blue-200">
              “Lei boa viaja no tempo, lei ruim fica no presente!”
            </h4>
            <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-medium">
              O benefício alcança até as condenações que já estavam encerradas. A liberdade sempre prevalece sobre a rigidez do Estado.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-25',
        badge: 'Etapa 25 de 25 · Troféu de Maestria',
        titulo: 'Parabéns! Trilha Concluída com Sucesso',
        subtitulo: 'Você dominou o Artigo 2º do Código Penal',
        textoAudio: 'Parabéns! Você concluiu com sucesso a trilha master do artigo segundo do Código Penal. Você domina a dinâmica temporal com total segurança.',
        conteudoPrincipal: (
          <div className="p-7 sm:p-8 rounded-3xl border border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-card to-background text-center space-y-4 shadow-xl">
            <Award className="w-16 h-16 sm:w-20 sm:h-20 text-amber-400 mx-auto animate-pulse" />
            <h4 className="text-xl sm:text-2xl font-black text-foreground">Mestre do Artigo 2º</h4>
            <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
              Você completou todas as 25 etapas com teoria clara, casos reais, minigame de ligar termos, simulador dos 3 efeitos e desafios de fixação!
            </p>
          </div>
        ),
      },
    ].map((s, idx) => ({
      ...s,
      dispositivoId: idx < 6 ? 'caput' : 'paragrafo_unico',
      dispositivoLabel: idx < 6 ? 'Caput' : 'Parágrafo único',
    }));
  } else {
    // ARTIGO 5º (CONSTITUIÇÃO FEDERAL DE 1988 — O ARTIGO GIGANTE MULTI-INCISOS)
    return gerarSlidesArtigo5CF();
  }
}

// ==========================================
// TRILHA EXPANSIVA DO ARTIGO 5º DA CF/1988 (MULTI-INCISOS)
// ==========================================
function gerarSlidesArtigo5CF(): SlideData[] {
  return [
    // ----------------------------------------------------
    // CAPUT: IGUALDADE E OS 5 PILARES FUNDAMENTAIS
    // ----------------------------------------------------
    {
      id: 'combo-art5-1',
      dispositivoId: 'caput',
      dispositivoLabel: 'Caput',
      isCapaDispositivo: true,
      badge: 'Etapa 1 de 25 · Capa do Dispositivo',
      titulo: 'Caput — Igualdade e Direitos Sagrados',
      subtitulo: 'A cláusula pétrea suprema da República Federativa do Brasil',
      imagePrompt: 'A breathtaking cinematic wide-angle illustration of the National Congress of Brazil and Supreme Federal Court at dusk, with an ethereal glowing golden shield hovering over diverse Brazilian citizens standing together in harmony, symbolizing equality and fundamental rights, clean architectural digital art, 16:9 widescreen, zero text.',
      textoAudio: 'Bem-vindo ao estudo do Artigo 5º da Constituição Federal. O Caput consagra que todos são iguais perante a lei, sem distinção de qualquer natureza.',
      conteudoPrincipal: (
        <CapaDispositivoSlide
          diploma="Constituição Federal"
          artigoNumero="Artigo 5º"
          dispositivoLabel="Caput"
          titulo="Igualdade Perante a Lei e Inviolabilidade de Direitos"
          textoLei="Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos estrangeiros residentes no País a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade..."
          explicacaoCurta="O pilar supremo da República: ninguém está acima da lei e os 5 direitos fundamentais formam a base inegociável da dignidade de todos no Brasil."
          icone={Scale}
          corAcento="text-amber-400"
          gradienteFundo="from-amber-950/50 via-card to-background"
          bordaCor="border-amber-500/40"
        />
      ),
    },
    {
      id: 'combo-art5-2',
      dispositivoId: 'caput',
      dispositivoLabel: 'Caput',
      badge: 'Etapa 2 de 25 · Os 5 Pilares Supremos',
      titulo: 'Vida, Liberdade, Igualdade, Segurança e Propriedade',
      subtitulo: 'O pentágono sagrado que o Estado não pode destruir',
      textoAudio: 'Os cinco direitos invioláveis da Constituição: Vida, Liberdade, Igualdade, Segurança e Propriedade.',
      conteudoPrincipal: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-card space-y-1">
            <span className="text-amber-400 font-black text-sm flex items-center gap-1.5">❤️ Vida</span>
            <p className="text-xs text-foreground/90 font-medium">Direito de existir e de viver com dignidade mínima.</p>
          </div>
          <div className="p-3.5 rounded-2xl border border-blue-500/30 bg-card space-y-1">
            <span className="text-blue-400 font-black text-sm flex items-center gap-1.5">🕊️ Liberdade</span>
            <p className="text-xs text-foreground/90 font-medium">Livre locomoção, pensamento, crença e escolhas pessoais.</p>
          </div>
          <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-card space-y-1">
            <span className="text-emerald-400 font-black text-sm flex items-center gap-1.5">⚖️ Igualdade</span>
            <p className="text-xs text-foreground/90 font-medium">Tratamento uniforme sem privilégios ou discriminações arbitrárias.</p>
          </div>
          <div className="p-3.5 rounded-2xl border border-purple-500/30 bg-card space-y-1">
            <span className="text-purple-400 font-black text-sm flex items-center gap-1.5">🛡️ Segurança</span>
            <p className="text-xs text-foreground/90 font-medium">Proteção física, patrimonial e certeza das regras jurídicas.</p>
          </div>
          <div className="p-3.5 rounded-2xl border border-teal-500/30 bg-card space-y-1 sm:col-span-2 text-center">
            <span className="text-teal-400 font-black text-sm inline-flex items-center gap-1.5">🏡 Propriedade</span>
            <p className="text-xs text-foreground/90 font-medium">Garantia dos bens conquistados pelo seu trabalho, cumprindo função social.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'combo-art5-3',
      dispositivoId: 'caput',
      dispositivoLabel: 'Caput',
      badge: 'Etapa 3 de 25 · Alcance Universal',
      titulo: 'Quem Está Protegido pelo Artigo 5º?',
      subtitulo: 'Brasileiros natos, naturalizados e estrangeiros',
      textoAudio: 'Apesar do texto literal citar estrangeiros residentes, o Supremo Tribunal Federal consolidou que qualquer ser humano em território nacional, inclusive turistas em trânsito, é protegido.',
      conteudoPrincipal: (
        <div className="p-6 sm:p-7 rounded-3xl border border-teal-500/40 bg-gradient-to-br from-teal-950/30 via-card to-background space-y-3 shadow-xl text-center">
          <span className="text-4xl">🌍</span>
          <h4 className="text-base sm:text-lg font-black text-teal-300">A Universalidade dos Direitos Humanos</h4>
          <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-normal">
            O STF já pacificou: o turista estrangeiro que está apenas passando férias no Brasil tem a mesma proteção inviolável à vida, liberdade e segurança que qualquer cidadão brasileiro.
          </p>
        </div>
      ),
    },
    {
      id: 'combo-art5-4',
      dispositivoId: 'caput',
      dispositivoLabel: 'Caput',
      badge: 'Etapa 4 de 25 · Quiz de Fixação',
      titulo: 'Teste Relâmpago do Caput',
      subtitulo: 'Avalie seu entendimento do alcance da norma',
      textoAudio: 'Responda: Um turista estrangeiro sem visto de residência sofre uma agressão no Brasil. Ele pode acionar a Justiça com base no Artigo 5º?',
      conteudoPrincipal: (
        <QuizInterativoItem
          pergunta="Um turista estrangeiro em viagem de férias no Brasil sofre uma agressão. Ele pode acionar a Justiça invocando o Artigo 5º da CF?"
          opcoes={[
            {
              texto: "SIM, pois os direitos fundamentais protegem qualquer pessoa física em solo brasileiro.",
              correta: true,
              feedback: "Exato! O STF consolidou que a proteção à vida, integridade e dignidade é universal para quem estiver no território nacional.",
            },
            {
              texto: "NÃO, pois o texto literal cita apenas quem tem residência fixa no país.",
              correta: false,
              feedback: "Incorreto! A jurisprudência constitucional não permite discriminar quem está em trânsito temporário.",
            },
          ]}
        />
      ),
    },

    // ----------------------------------------------------
    // INCISO I: IGUALDADE ENTRE HOMENS E MULHERES
    // ----------------------------------------------------
    {
      id: 'combo-art5-5',
      dispositivoId: 'inciso_1',
      dispositivoLabel: 'Inciso I',
      isCapaDispositivo: true,
      badge: 'Etapa 5 de 25 · Capa do Dispositivo',
      titulo: 'Inciso I — Igualdade de Homens e Mulheres',
      subtitulo: 'I - homens e mulheres são iguais em direitos e obrigações',
      textoAudio: 'Atenção: Novo dispositivo legal! Inciso primeiro do Artigo quinto: homens e mulheres são iguais em direitos e obrigações, nos termos desta Constituição.',
      conteudoPrincipal: (
        <CapaDispositivoSlide
          diploma="Constituição Federal"
          artigoNumero="Artigo 5º"
          dispositivoLabel="Inciso I"
          titulo="Igualdade em Direitos e Obrigações"
          textoLei="I - homens e mulheres são iguais em direitos e obrigações, nos termos desta Constituição;"
          explicacaoCurta="A ruptura com séculos de patriarcado legal: nenhuma lei ou contrato pode tratar mulheres como subordinadas ou impor salários inferiores pelo simples gênero."
          icone={Sparkles}
          corAcento="text-pink-400"
          gradienteFundo="from-pink-950/40 via-card to-background"
          bordaCor="border-pink-500/40"
        />
      ),
    },
    {
      id: 'combo-art5-6',
      dispositivoId: 'inciso_1',
      dispositivoLabel: 'Inciso I',
      badge: 'Etapa 6 de 25 · Aplicação Prática',
      titulo: 'Igualdade Material vs Formal',
      subtitulo: 'Tratar igualmente os iguais e desigualmente os desiguais',
      textoAudio: 'A igualdade não impede leis protetivas específicas, como a Lei Maria da Penha ou licença maternidade mais ampla, para equilibrar desvantagens históricas e biológicas.',
      conteudoPrincipal: (
        <div className="p-6 sm:p-7 rounded-3xl border border-pink-500/30 bg-gradient-to-br from-card via-card to-secondary/30 space-y-3 shadow-xl">
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-pink-400 block">
            Ações Afirmativas e Proteção:
          </span>
          <p className="text-sm sm:text-base md:text-lg text-foreground/90 leading-relaxed font-normal">
            Leis especiais para proteger a mulher contra violência doméstica (como a <strong>Lei Maria da Penha</strong>) ou garantir licença-maternidade estendida NÃO violam a igualdade. Elas existem para equilibrar desvantagens reais da sociedade.
          </p>
        </div>
      ),
    },
    {
      id: 'combo-art5-7',
      dispositivoId: 'inciso_1',
      dispositivoLabel: 'Inciso I',
      badge: 'Etapa 7 de 25 · Caso Real',
      titulo: 'O Caso da Engenheira Juliana',
      subtitulo: 'Mesma produtividade, salário 30% menor',
      textoAudio: 'Juliana e Marcos foram contratados na mesma data para o mesmo cargo de gerência. Juliana recebia trinta por cento a menos. O tribunal aplicou o Inciso I e condenou a empresa à equiparação.',
      conteudoPrincipal: (
        <div className="p-6 sm:p-7 rounded-3xl border border-pink-500/40 bg-gradient-to-br from-pink-950/30 via-card to-background space-y-3 shadow-xl">
          <span className="text-4xl">👩‍💼</span>
          <h5 className="text-base sm:text-lg font-black text-pink-300">Equiparação Salarial Imediata</h5>
          <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-normal">
            A Justiça do Trabalho condenou a multinacional a pagar retroativamente todas as diferenças salariais com base no Inciso I e na Lei de Igualdade Salarial nº 14.611/2023.
          </p>
        </div>
      ),
    },
    {
      id: 'combo-art5-8',
      dispositivoId: 'inciso_1',
      dispositivoLabel: 'Inciso I',
      badge: 'Etapa 8 de 25 · Flashcard 3D',
      titulo: 'Toque para testar sua memória!',
      subtitulo: 'Fixação interativa do Inciso I',
      textoAudio: 'Toque para virar o cartão e revisar a garantia de igualdade salarial.',
      conteudoPrincipal: (
        <FlipCardItem
          frente="Um empregador pode pagar salário inferior a uma funcionária alegando que mulheres podem engravidar e gerar custos futuros?"
          verso="JAMAIS! É discriminação inconstitucional gravíssima pelo Inciso I da CF/88. A empresa responde com multas pesadas e equiparação salarial obrigatória."
        />
      ),
    },

    // ----------------------------------------------------
    // INCISO II: PRINCÍPIO GERAL DA LEGALIDADE
    // ----------------------------------------------------
    {
      id: 'combo-art5-9',
      dispositivoId: 'inciso_2',
      dispositivoLabel: 'Inciso II',
      isCapaDispositivo: true,
      badge: 'Etapa 9 de 25 · Capa do Dispositivo',
      titulo: 'Inciso II — Princípio da Legalidade Geral',
      subtitulo: 'II - ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei',
      textoAudio: 'Atenção: Novo dispositivo legal! Inciso segundo do Artigo quinto: ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei.',
      conteudoPrincipal: (
        <CapaDispositivoSlide
          diploma="Constituição Federal"
          artigoNumero="Artigo 5º"
          dispositivoLabel="Inciso II"
          titulo="Princípio Geral da Legalidade"
          textoLei="II - ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei;"
          explicacaoCurta="A carta de alforria de todo cidadão: nenhum governante, policial ou fiscal pode te impor obrigações da própria cabeça se não houver uma lei formal aprovada pelo parlamento."
          icone={ShieldCheck}
          corAcento="text-blue-400"
          gradienteFundo="from-blue-950/40 via-card to-background"
          bordaCor="border-blue-500/40"
        />
      ),
    },
    {
      id: 'combo-art5-10',
      dispositivoId: 'inciso_2',
      dispositivoLabel: 'Inciso II',
      badge: 'Etapa 10 de 25 · Autonomia da Vontade',
      titulo: 'O Cidadão vs O Administrador Público',
      subtitulo: 'Duas regras opostas que todo mundo deve saber',
      textoAudio: 'Para o cidadão leigo: tudo o que a lei não proíbe é permitido. Para o prefeito e autoridade pública: só é permitido fazer o que a lei expressamente autoriza.',
      conteudoPrincipal: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/25 space-y-1 shadow-md">
            <span className="text-sm font-black text-emerald-400">👤 Para Você (Cidadão):</span>
            <p className="text-xs sm:text-sm text-foreground/90 font-medium">Você é livre para fazer tudo, exceto o que a lei proíbe.</p>
          </div>
          <div className="p-5 rounded-2xl border border-amber-500/40 bg-amber-950/25 space-y-1 shadow-md">
            <span className="text-sm font-black text-amber-400">🏛️ Para o Estado (Governo):</span>
            <p className="text-xs sm:text-sm text-foreground/90 font-medium">O governante só pode agir se a lei autorizar expressamente.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'combo-art5-11',
      dispositivoId: 'inciso_2',
      dispositivoLabel: 'Inciso II',
      badge: 'Etapa 11 de 25 · Caso Real',
      titulo: 'A Taxa Criada por Decreto Municipal',
      subtitulo: 'Um prefeito tentou inventar taxa para reformar praça',
      textoAudio: 'Um prefeito criou por decreto executivo uma taxa para reformar a praça. O Judiciário cancelou as cobranças imediatamente pelo Inciso II, porque taxas só podem ser criadas por lei aprovada na câmara.',
      conteudoPrincipal: (
        <div className="p-6 sm:p-7 rounded-3xl border border-blue-500/40 bg-gradient-to-br from-card via-card to-secondary/30 space-y-3 shadow-xl">
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-blue-400 block">
            Decisão Judicial Fundamentada:
          </span>
          <p className="text-sm sm:text-base md:text-lg text-foreground/90 leading-relaxed font-normal">
            O decreto foi anulado e a prefeitura obrigada a devolver o dinheiro arrecadado: nenhum tributo ou taxa pode ser imposto sem prévia lei votada pelos representantes do povo.
          </p>
        </div>
      ),
    },
    {
      id: 'combo-art5-12',
      dispositivoId: 'inciso_2',
      dispositivoLabel: 'Inciso II',
      badge: 'Etapa 12 de 25 · Quiz do Inciso II',
      titulo: 'Teste do Princípio da Legalidade',
      subtitulo: 'Avalie sua autonomia cidadã',
      textoAudio: 'Responda: Uma autoridade pode exigir seu celular particular sem ordem judicial ou lei que determine?',
      conteudoPrincipal: (
        <QuizInterativoItem
          pergunta="Uma autoridade pública pode exigir que você entregue seu celular particular sem mandado judicial ou lei que autorize expressamente?"
          opcoes={[
            {
              texto: "NÃO, pelo Inciso II ninguém é obrigado a fazer nada senão em virtude de lei.",
              correta: true,
              feedback: "Correto! Sem previsão em lei formal ou ordem judicial fundamentada, a exigência é abuso de autoridade.",
            },
            {
              texto: "SIM, qualquer autoridade pública tem poder de exigir qualquer coisa a qualquer momento.",
              correta: false,
              feedback: "Incorreto! O Estado não é monarquia absolutista; está submisso à estrita legalidade.",
            },
          ]}
        />
      ),
    },

    // ----------------------------------------------------
    // INCISO III: VEDAÇÃO ABSOLUTA À TORTURA
    // ----------------------------------------------------
    {
      id: 'combo-art5-13',
      dispositivoId: 'inciso_3',
      dispositivoLabel: 'Inciso III',
      isCapaDispositivo: true,
      badge: 'Etapa 13 de 25 · Capa do Dispositivo',
      titulo: 'Inciso III — Vedação Absoluta à Tortura',
      subtitulo: 'III - ninguém será submetido a tortura nem a tratamento desumano ou degradante',
      textoAudio: 'Atenção: Novo dispositivo legal! Inciso terceiro do Artigo quinto: ninguém será submetido a tortura nem a tratamento desumano ou degradante.',
      conteudoPrincipal: (
        <CapaDispositivoSlide
          diploma="Constituição Federal"
          artigoNumero="Artigo 5º"
          dispositivoLabel="Inciso III"
          titulo="Proibição Inegociável da Tortura"
          textoLei="III - ninguém será submetido a tortura nem a tratamento desumano ou degradante;"
          explicacaoCurta="A barreira intransponível da civilização: mesmo sob guerra ou emergência, o Estado não tem o direito de infligir sofrimento físico ou humilhação psicológica a ninguém."
          icone={ShieldCheck}
          corAcento="text-rose-400"
          gradienteFundo="from-rose-950/40 via-card to-background"
          bordaCor="border-rose-500/40"
        />
      ),
    },
    {
      id: 'combo-art5-14',
      dispositivoId: 'inciso_3',
      dispositivoLabel: 'Inciso III',
      badge: 'Etapa 14 de 25 · A Prova Ilícita',
      titulo: 'Confissão sob Coação Não Tem Valor',
      subtitulo: 'A teoria dos frutos da árvore envenenada',
      textoAudio: 'Toda e qualquer confissão obtida mediante tortura ou ameaça é nula e imprestável. A Justiça anula o processo criminal e processa os torturadores.',
      conteudoPrincipal: (
        <div className="p-6 sm:p-7 rounded-3xl border border-rose-500/30 bg-gradient-to-br from-rose-950/30 via-card to-background space-y-3 shadow-xl">
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-400 block">
            Inadmissibilidade das Provas Ilícitas:
          </span>
          <p className="text-sm sm:text-base md:text-lg text-foreground/90 leading-relaxed font-normal">
            No Brasil, a confissão forçada por agressão não serve para condenar ninguém. O juiz anula a prova, descarta o processo e determina a prisão dos agentes que praticaram o abuso.
          </p>
        </div>
      ),
    },
    {
      id: 'combo-art5-15',
      dispositivoId: 'inciso_3',
      dispositivoLabel: 'Inciso III',
      badge: 'Etapa 15 de 25 · Flashcard 3D',
      titulo: 'Toque para testar sua memória!',
      subtitulo: 'Fixação do Inciso III',
      textoAudio: 'Toque para virar o cartão e verificar a validade de provas obtidas sob tortura.',
      conteudoPrincipal: (
        <FlipCardItem
          frente="Em um caso urgente com perigo iminente, agentes policiais podem aplicar pressão física para arrancar o esconderijo de uma vítima?"
          verso="NÃO! A vedação à tortura é um direito absoluto sem NENHUMA exceção na Constituição Federal. Provas obtidas sob agressão física são nulas e os agentes respondem criminalmente."
        />
      ),
    },
    {
      id: 'combo-art5-16',
      dispositivoId: 'inciso_3',
      dispositivoLabel: 'Inciso III',
      badge: 'Etapa 16 de 25 · Crime Inafiançável',
      titulo: 'O Rigor Constitucional Contra a Tortura',
      subtitulo: 'Inafiançável e insuscetível de anistia ou indulto',
      textoAudio: 'A própria Constituição determina no Artigo 5º que a prática da tortura é crime inafiançável e insuscetível de graça ou anistia, respondendo mandantes, executores e quem se omitir.',
      conteudoPrincipal: (
        <div className="p-6 sm:p-8 rounded-3xl border border-rose-500/40 bg-gradient-to-br from-card via-card to-secondary/30 text-center space-y-3 shadow-xl">
          <span className="text-4xl">⚖️</span>
          <h4 className="text-lg sm:text-xl font-black text-rose-300">Tolerância Zero</h4>
          <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-normal">
            O presidente da República não pode perdoar torturador (proibido indulto), ninguém sai sob fiança e até quem presenciar a tortura e não fizer nada responde criminalmente!
          </p>
        </div>
      ),
    },

    // ----------------------------------------------------
    // INCISO IV: LIBERDADE DE PENSAMENTO E EXPRESSÃO
    // ----------------------------------------------------
    {
      id: 'combo-art5-17',
      dispositivoId: 'inciso_4',
      dispositivoLabel: 'Inciso IV',
      isCapaDispositivo: true,
      badge: 'Etapa 17 de 25 · Capa do Dispositivo',
      titulo: 'Inciso IV — Liberdade de Pensamento',
      subtitulo: 'IV - é livre a manifestação do pensamento, sendo vedado o anonimato',
      textoAudio: 'Atenção: Novo dispositivo legal! Inciso quarto do Artigo quinto: é livre a manifestação do pensamento, sendo vedado o anonimato.',
      conteudoPrincipal: (
        <CapaDispositivoSlide
          diploma="Constituição Federal"
          artigoNumero="Artigo 5º"
          dispositivoLabel="Inciso IV"
          titulo="Livre Manifestação (Vedado o Anonimato)"
          textoLei="IV - é livre a manifestação do pensamento, sendo vedado o anonimato;"
          explicacaoCurta="A garantia da voz livre: expresse suas ideias políticas, artísticas e filosóficas sem censura prévia, mas assuma a autoria para responder por eventuais abusos."
          icone={MessageSquare}
          corAcento="text-sky-400"
          gradienteFundo="from-sky-950/40 via-card to-background"
          bordaCor="border-sky-500/40"
        />
      ),
    },
    {
      id: 'combo-art5-18',
      dispositivoId: 'inciso_4',
      dispositivoLabel: 'Inciso IV',
      badge: 'Etapa 18 de 25 · O Porquê da Vedação',
      titulo: 'Por que o Anonimato é Proibido?',
      subtitulo: 'Para proteger as vítimas contra difamações covardes',
      textoAudio: 'A vedação ao anonimato garante que, se alguém cometer calúnia ou mentir sobre você, a Justiça possa identificar o autor para exigir retratação e indenização.',
      conteudoPrincipal: (
        <div className="p-6 sm:p-7 rounded-3xl border border-sky-500/30 bg-gradient-to-br from-card via-card to-secondary/30 space-y-3 shadow-xl">
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-sky-400 block">
            Equilíbrio entre Liberdade e Responsabilidade:
          </span>
          <p className="text-sm sm:text-base md:text-lg text-foreground/90 leading-relaxed font-normal">
            Você é livre para criticar qualquer autoridade. Mas se fizer acusações anônimas falsas escondido em contas anônimas, a proteção cai: a Justiça quebra o sigilo e pune o agressor.
          </p>
        </div>
      ),
    },
    {
      id: 'combo-art5-19',
      dispositivoId: 'inciso_4',
      dispositivoLabel: 'Inciso IV',
      badge: 'Etapa 19 de 25 · Caso Real',
      titulo: 'Os Ataques por Perfis Fakes',
      subtitulo: 'Como a Justiça quebra o anonimato na internet',
      textoAudio: 'Uma conta fake em rede social começou a espalhar boatos sobre comerciantes locais. O juiz determinou o fornecimento dos registros de conexão e a autora foi condenada a indenizar cada uma das vítimas.',
      conteudoPrincipal: (
        <div className="p-6 sm:p-7 rounded-3xl border border-sky-500/40 bg-gradient-to-br from-sky-950/30 via-card to-background space-y-3 shadow-xl">
          <span className="text-4xl">🎭</span>
          <h5 className="text-base sm:text-lg font-black text-sky-300">A Queda da Máscara Virtual</h5>
          <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-normal">
            A internet não é terra sem lei. Pelo Inciso IV e pelo Marco Civil da Internet, as plataformas são obrigadas a guardar os dados e entregá-los por ordem judicial para responsabilização.
          </p>
        </div>
      ),
    },
    {
      id: 'combo-art5-20',
      dispositivoId: 'inciso_4',
      dispositivoLabel: 'Inciso IV',
      badge: 'Etapa 20 de 25 · Quiz do Inciso IV',
      titulo: 'Quiz da Livre Manifestação',
      subtitulo: 'Avalie as regras do pensamento livre',
      textoAudio: 'Responda: É permitido criar um jornal panfletário apócrifo para atacar adversários sem assinar quem produziu?',
      conteudoPrincipal: (
        <QuizInterativoItem
          pergunta="Um grupo imprime 1.000 panfletos acusando um servidor de corrupção sem assinar ou se identificar. Isso é protegido pela Constituição?"
          opcoes={[
            {
              texto: "NÃO, pois a Constituição veda expressamente o anonimato para proteger o direito de defesa.",
              correta: true,
              feedback: "Exato! A manifestação do pensamento é livre, mas a assinatura é obrigatória para evitar ataques sem autoria.",
            },
            {
              texto: "SIM, pois manifestação de pensamento não precisa de nenhuma identificação.",
              correta: false,
              feedback: "Incorreto! O texto do Inciso IV diz categoricamente: 'sendo vedado o anonimato'.",
            },
          ]}
        />
      ),
    },

    // ----------------------------------------------------
    // INCISO V: DIREITO DE RESPOSTA E INDENIZAÇÃO
    // ----------------------------------------------------
    {
      id: 'combo-art5-21',
      dispositivoId: 'inciso_5',
      dispositivoLabel: 'Inciso V',
      isCapaDispositivo: true,
      badge: 'Etapa 21 de 25 · Capa do Dispositivo',
      titulo: 'Inciso V — Direito de Resposta e Dano Moral',
      subtitulo: 'V - é assegurado o direito de resposta, proporcional ao agravo, além da indenização',
      textoAudio: 'Atenção: Novo dispositivo legal! Inciso quinto do Artigo quinto: é assegurado o direito de resposta, proporcional ao agravo, além da indenização por dano material, moral ou à imagem.',
      conteudoPrincipal: (
        <CapaDispositivoSlide
          diploma="Constituição Federal"
          artigoNumero="Artigo 5º"
          dispositivoLabel="Inciso V"
          titulo="Direito de Resposta Proporcional e Indenização"
          textoLei="V - é assegurado o direito de resposta, proporcional ao agravo, além da indenização por dano material, moral ou à imagem;"
          explicacaoCurta="A reparação integral da honra: quem ofender alguém é obrigado a ceder o mesmo espaço para resposta e a pagar indenização pelos prejuízos causados à imagem e honra da pessoa."
          icone={Scale}
          corAcento="text-amber-400"
          gradienteFundo="from-amber-950/40 via-card to-background"
          bordaCor="border-amber-500/40"
        />
      ),
    },
    {
      id: 'combo-art5-22',
      dispositivoId: 'inciso_5',
      dispositivoLabel: 'Inciso V',
      badge: 'Etapa 22 de 25 · Proporcionalidade',
      titulo: 'O que é Ser Proporcional ao Agravo?',
      subtitulo: 'Mesmo espaço, destaque, alcance e horário',
      textoAudio: 'Se a notícia caluniosa foi veiculada na capa do portal ou no horário nobre da televisão, o direito de resposta deve ter o mesmo tempo, espaço e visibilidade da ofensa original.',
      conteudoPrincipal: (
        <div className="p-6 sm:p-7 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-card via-card to-secondary/30 space-y-3 shadow-xl">
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 block">
            A Lei do Direito de Resposta (Lei 13.188/2015):
          </span>
          <p className="text-sm sm:text-base md:text-lg text-foreground/90 leading-relaxed font-normal">
            Não adianta publicar a calúnia na primeira página e esconder a retratação nas notas de rodapé da página 30. A resposta tem que ter <strong>a mesma evidência e tempo da matéria original</strong>!
          </p>
        </div>
      ),
    },
    {
      id: 'combo-art5-23',
      dispositivoId: 'inciso_5',
      dispositivoLabel: 'Inciso V',
      badge: 'Etapa 23 de 25 · Mini-Game Constitucional',
      titulo: 'Ligue os 4 Conceitos Fundamentais',
      subtitulo: 'Conecte cada garantia constitucional à sua definição prática',
      textoAudio: 'Conecte os conceitos constitucionais aprendidos no Artigo quinto.',
      conteudoPrincipal: (
        <LigarTermosGame
          pares={[
            { id: '1', termo: 'Igualdade (Inciso I)', significado: 'Homens e mulheres com os mesmos direitos e obrigações' },
            { id: '2', termo: 'Legalidade (Inciso II)', significado: 'Ninguém é obrigado a agir senão por virtude de lei escrita' },
            { id: '3', termo: 'Vedação à Tortura (III)', significado: 'Proibição absoluta de violência física ou humilhação' },
            { id: '4', termo: 'Resposta e Dano (Inciso V)', significado: 'Mesmo espaço para esclarecer e indenização por ofensa' },
          ]}
        />
      ),
    },
    {
      id: 'combo-art5-24',
      dispositivoId: 'inciso_5',
      dispositivoLabel: 'Inciso V',
      badge: 'Etapa 24 de 25 · Flashcard de Sentença',
      titulo: 'Toque para revelar a decisão judicial!',
      subtitulo: 'Fixação de dano moral cumulativo',
      textoAudio: 'Toque para virar o cartão e verificar a cumulação entre direito de resposta e indenização por danos morais.',
      conteudoPrincipal: (
        <FlipCardItem
          frente="Se um veículo de comunicação publicar uma matéria difamatória e depois conceder o direito de resposta, ele fica livre de pagar indenização por dano moral?"
          verso="NÃO! O Inciso V diz 'além da indenização'. O direito de resposta e a indenização em dinheiro são cumulativos: a resposta limpa a verdade e a indenização compensa a dor e o constrangimento sofrido."
        />
      ),
    },
    {
      id: 'combo-art5-25',
      dispositivoId: 'inciso_5',
      dispositivoLabel: 'Inciso V',
      badge: 'Etapa 25 de 25 · Troféu de Maestria',
      titulo: 'Parabéns! Mestre do Artigo 5º da Constituição',
      subtitulo: 'Você dominou os pilares supremos da cidadania brasileira',
      textoAudio: 'Parabéns! Você completou com sucesso a trilha master do Artigo quinto da Constituição Federal. Você agora compreende seus direitos e garantias com total clareza e autoridade!',
      conteudoPrincipal: (
        <div className="p-7 sm:p-8 rounded-3xl border border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-card to-background text-center space-y-4 shadow-xl">
          <Award className="w-16 h-16 sm:w-20 sm:h-20 text-amber-400 mx-auto animate-pulse" />
          <h4 className="text-xl sm:text-2xl font-black text-foreground">Guardião da Constituição</h4>
          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            Você completou todas as 25 etapas do Artigo 5º dissecando o Caput e os Incisos I a V com capas solenes, casos práticos, flashcards 3D e desafios interativos!
          </p>
        </div>
      ),
    },
  ];
}

const MECANICAS: MecanicaDef[] = [
  // ----------------------------------------------------
  // MECÂNICA 0: O COMBO (A SUPER TRILHA INTEGRADA)
  // ----------------------------------------------------
  {
    id: 'combo',
    nome: '🌟 O COMBO — Trilha Master Completa',
    badge: '25 Etapas · Todas as Mecânicas Juntas',
    icone: Flame,
    corPrimaria: 'text-[#f59e0b]',
    gradienteFundo: 'from-[#78350f]/30 via-card to-background',
    bordaCor: 'border-[#f59e0b]/50 hover:border-[#f59e0b]',
    botaoCor: 'bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] text-slate-950 font-black shadow-lg shadow-amber-500/25',
    barraProgressoCor: 'bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]',
    subtitulo: 'Anatomia + Storytelling + Chat + Linha do Tempo + Flashcards + Ligar Termos + Quizzes',
    descricaoCurta: 'A experiência definitiva recomendada: reúne todos os 5 métodos pedagógicos em uma única jornada completa de 25 etapas interativas.',
    focoLeigo: 'Domínio 100% definitivo do artigo sem deixar nenhuma ponta solta ou dúvida.',
    totalSlidesText: '25 Etapas Completas',
    slides: {
      art1: gerarSlidesCombo('art1'),
      art2: gerarSlidesCombo('art2'),
      art5_cf: gerarSlidesCombo('art5_cf'),
    },
  },

  // ----------------------------------------------------
  // MECÂNICA 1: ANATOMIA & TRADUÇÃO
  // ----------------------------------------------------
  {
    id: 'anatomia',
    nome: '1. Anatomia & Tradução Palavra por Palavra',
    badge: 'Legal Design & Micro-Tradução',
    icone: Layers,
    corPrimaria: 'text-emerald-400',
    gradienteFundo: 'from-emerald-950/40 via-emerald-900/10 to-transparent',
    bordaCor: 'border-emerald-500/40 hover:border-emerald-400',
    botaoCor: 'bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-emerald-500/25',
    barraProgressoCor: 'bg-emerald-500',
    subtitulo: 'Desconstrução do juridiquês em português claro',
    descricaoCurta: 'Fatia o artigo em blocos e traduz termos difíceis como "cominação" e "anterioridade" em linguagem do dia a dia.',
    focoLeigo: 'Elimina o medo de ler a lei pura e explica o que cada frase significa na vida real.',
    totalSlidesText: '8 Etapas com Exercícios',
    slides: {
      art1: gerarSlidesCombo('art1').slice(0, 8),
      art2: gerarSlidesCombo('art2').slice(0, 8),
      art5_cf: gerarSlidesCombo('art5_cf').slice(0, 8),
    },
  },

  // ----------------------------------------------------
  // MECÂNICA 2: STORYTELLING & CASOS DA VIDA REAL
  // ----------------------------------------------------
  {
    id: 'storytelling',
    nome: '2. Storytelling & Casos da Vida Real',
    badge: 'Narrativa em Capítulos',
    icone: BookOpen,
    corPrimaria: 'text-[#f59e0b]',
    gradienteFundo: 'from-[#78350f]/25 via-card to-transparent',
    bordaCor: 'border-[#f59e0b]/40 hover:border-[#f59e0b]',
    botaoCor: 'bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white font-black shadow-orange-500/25',
    barraProgressoCor: 'bg-[#ea580c]',
    subtitulo: 'Histórias ilustradas com dilemas humanos cotidianos',
    descricaoCurta: 'Acompanhe histórias da vida real para entender a aplicação prática da lei na vida das pessoas.',
    focoLeigo: 'Cria empatia imediata através de uma historinha sem termos jurídicos frios.',
    totalSlidesText: '8 Etapas com Decisões',
    slides: {
      art1: gerarSlidesCombo('art1').slice(6, 14),
      art2: gerarSlidesCombo('art2').slice(7, 15),
      art5_cf: gerarSlidesCombo('art5_cf').slice(4, 12),
    },
  },

  // ----------------------------------------------------
  // MECÂNICA 3: DIÁLOGO TUTOR & ALUNO CURIOSO
  // ----------------------------------------------------
  {
    id: 'dialogo',
    nome: '3. Diálogo Tutor & Aluno Curioso',
    badge: 'Chat Socrático com Metáforas',
    icone: MessageSquare,
    corPrimaria: 'text-[#38bdf8]',
    gradienteFundo: 'from-[#0369a1]/25 via-card to-transparent',
    bordaCor: 'border-[#0284c7]/40 hover:border-[#0284c7]',
    botaoCor: 'bg-[#0284c7] hover:bg-[#0369a1] text-white font-black shadow-sky-500/25',
    barraProgressoCor: 'bg-[#0284c7]',
    subtitulo: 'Bate-papo estilo WhatsApp com analogias descontraídas',
    descricaoCurta: 'Um cidadão leigo faz perguntas sinceras e o tutor responde usando analogias da vida real.',
    focoLeigo: 'Linguagem natural, sem cerimônia, tirando exatamente as dúvidas que qualquer leigo teria.',
    totalSlidesText: '8 Etapas Conversacionais',
    slides: {
      art1: gerarSlidesCombo('art1').slice(10, 18),
      art2: gerarSlidesCombo('art2').slice(11, 19),
      art5_cf: gerarSlidesCombo('art5_cf').slice(8, 16),
    },
  },

  // ----------------------------------------------------
  // MECÂNICA 4: LINHA DO TEMPO VISUAL & SIMULADOR
  // ----------------------------------------------------
  {
    id: 'linha_tempo',
    nome: '4. Linha do Tempo & Simulador Temporal',
    badge: 'Visual Law Cronológico',
    icone: Clock,
    corPrimaria: 'text-[#c084fc]',
    gradienteFundo: 'from-[#581c87]/30 via-card to-transparent',
    bordaCor: 'border-[#7c3aed]/40 hover:border-[#7c3aed]',
    botaoCor: 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-black shadow-purple-500/25',
    barraProgressoCor: 'bg-[#7c3aed]',
    subtitulo: 'Régua cronológica com teste de causa e efeito',
    descricaoCurta: 'Visualiza graficamente a cronologia e a vigência das garantias constitucionais.',
    focoLeigo: 'Demonstração espacial e cronológica perfeita para quem aprende melhor visualmente.',
    totalSlidesText: '8 Etapas com Simulador',
    slides: {
      art1: gerarSlidesCombo('art1').slice(13, 21),
      art2: gerarSlidesCombo('art2').slice(14, 22),
      art5_cf: gerarSlidesCombo('art5_cf').slice(12, 20),
    },
  },

  // ----------------------------------------------------
  // MECÂNICA 5: MAPA MENTAL & DESAFIO GAMIFICADO
  // ----------------------------------------------------
  {
    id: 'mapa_decisao',
    nome: '5. Mapa Mental, Flashcards & Ligar Termos',
    badge: 'Você é o Juiz · Gamificação',
    icone: BrainCircuit,
    corPrimaria: 'text-[#f472b6]',
    gradienteFundo: 'from-[#831843]/30 via-card to-transparent',
    bordaCor: 'border-[#db2777]/40 hover:border-[#db2777]',
    botaoCor: 'bg-[#db2777] hover:bg-[#be185d] text-white font-black shadow-pink-500/25',
    barraProgressoCor: 'bg-[#db2777]',
    subtitulo: 'Árvore de decisão simples, jogo de ligar termos e flashcard 3D',
    descricaoCurta: 'Resolva um caso real tocando para virar o cartão 3D, conecte os termos jurídicos e teste sua maestria.',
    focoLeigo: 'Divertido, gamificado e fácil de fixar na memória em poucos segundos.',
    totalSlidesText: '8 Etapas Gamificadas',
    slides: {
      art1: gerarSlidesCombo('art1').slice(17, 25),
      art2: gerarSlidesCombo('art2').slice(17, 25),
      art5_cf: gerarSlidesCombo('art5_cf').slice(16, 25),
    },
  },
];

// ==========================================
// PÁGINA PRINCIPAL DO LABORATÓRIO
// ==========================================

const AdminAprenderLeisLaboratorio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);

  // Estados principais
  const [artigoAtual, setArtigoAtual] = useState<ArtigoId>('art1');
  const [mecanicaSelecionadaId, setMecanicaSelecionadaId] = useState<MecanicaId>('combo');
  const [emAula, setEmAula] = useState(false); // Alterna para TELA TODA
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction, setDirection] = useState(0); // 1 = avança, -1 = volta
  const [falando, setFalando] = useState(false);
  const [imagensCustomizadas, setImagensCustomizadas] = useState<Record<string, string>>({});

  const infoArtigo = ARTIGOS_INFO[artigoAtual];

  const mecanica = useMemo(() => {
    return MECANICAS.find(m => m.id === mecanicaSelecionadaId) || MECANICAS[0];
  }, [mecanicaSelecionadaId]);

  const slides = useMemo(() => {
    return mecanica.slides[artigoAtual] || [];
  }, [mecanica, artigoAtual]);

  const slideAtual = useMemo(() => {
    return slides[slideIndex] || slides[0];
  }, [slides, slideIndex]);

  const dispositivoAtivoId = slideAtual?.dispositivoId || 'caput';

  // Ações de alternância de artigo
  const handleAlternarArtigo = (art: ArtigoId) => {
    pararVoz();
    setArtigoAtual(art);
    setSlideIndex(0);
    setDirection(0);
  };

  // Iniciar aula para uma mecânica específica (EM TELA TODA!)
  const handleIniciarAula = (mecId: MecanicaId) => {
    pararVoz();
    setMecanicaSelecionadaId(mecId);
    setSlideIndex(0);
    setDirection(0);
    setEmAula(true);
  };

  // Sair da aula de tela toda
  const handleSairDaAula = useCallback(() => {
    pararVoz();
    setEmAula(false);
  }, []);

  // Controles de slide
  const proximoSlide = useCallback(() => {
    if (slideIndex < slides.length - 1) {
      pararVoz();
      setDirection(1);
      setSlideIndex(prev => prev + 1);
    }
  }, [slideIndex, slides.length]);

  const slideAnterior = useCallback(() => {
    if (slideIndex > 0) {
      pararVoz();
      setDirection(-1);
      setSlideIndex(prev => prev - 1);
    }
  }, [slideIndex]);

  // Navegar diretamente para um dispositivo pelo Guia no topo
  const handlePularParaDispositivo = useCallback((dispId: string) => {
    const targetIdx = slides.findIndex(s => s.dispositivoId === dispId);
    if (targetIdx !== -1 && targetIdx !== slideIndex) {
      pararVoz();
      setDirection(targetIdx > slideIndex ? 1 : -1);
      setSlideIndex(targetIdx);
    }
  }, [slides, slideIndex]);

  // Teclado (← e →)
  useEffect(() => {
    if (!emAula) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') proximoSlide();
      if (e.key === 'ArrowLeft') slideAnterior();
      if (e.key === 'Escape') handleSairDaAula();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [emAula, proximoSlide, slideAnterior, handleSairDaAula]);

  // Síntese de Voz (TTS)
  const falarSlide = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.info('Síntese de voz não suportada neste navegador.');
      return;
    }

    if (falando) {
      window.speechSynthesis.cancel();
      setFalando(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(slideAtual.textoAudio);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setFalando(false);
    utterance.onerror = () => setFalando(false);

    setFalando(true);
    window.speechSynthesis.speak(utterance);
  };

  const pararVoz = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setFalando(false);
  };

  useEffect(() => {
    return () => pararVoz();
  }, []);

  // Variantes para transição direcional e fluida dos slides
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 40 : dir < 0 ? -40 : 0,
      opacity: 0,
      scale: 0.985,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 350, damping: 32 },
        opacity: { duration: 0.22, ease: 'easeOut' },
        scale: { duration: 0.22, ease: 'easeOut' },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -40 : dir < 0 ? 40 : 0,
      opacity: 0,
      scale: 0.985,
      transition: {
        x: { type: 'spring', stiffness: 350, damping: 32 },
        opacity: { duration: 0.18, ease: 'easeIn' },
        scale: { duration: 0.18, ease: 'easeIn' },
      },
    }),
  };

  const mobileHeader = (
    <PageHeader 
      title="Laboratório — Aprender Leis" 
      onBack={() => {
        pararVoz();
        navigate('/admin-aprender-leis');
      }} 
    />
  );

  return (
    <>
      {/* ========================================================= */}
      {/* SE ESTIVER EM AULA: MODO TELA TODA (FULL SCREEN PORTAL)   */}
      {/* ========================================================= */}
      {emAula && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] h-[100dvh] w-screen max-w-full overflow-hidden bg-background text-foreground flex flex-col select-none">
          
          {/* TOPO DA TELA TODA: Barra de Controles e Progresso (FIXO NO TOPO COM ERGONOMIA HIG/M3) */}
          <header className="shrink-0 z-30 w-full px-4 py-2.5 sm:px-6 sm:py-3 border-b border-border/80 bg-background/95 backdrop-blur-md flex flex-col gap-2 shadow-sm">
            
            {/* Linha 1: Botão Sair, Título da Mecânica e Botão de Áudio */}
            <div className="flex items-center justify-between gap-3">
              
              {/* Botão Sair da Aula (Touch Target Apple HIG >= 44pt) */}
              <button
                onClick={handleSairDaAula}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-border bg-secondary/60 hover:bg-secondary text-foreground text-xs sm:text-sm font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                title="Sair da Aula (Esc)"
              >
                <X className="w-4 h-4 text-muted-foreground" />
                <span>Sair</span>
              </button>

              {/* Informações Centrais */}
              <div className="text-center min-w-0 flex-1 px-1">
                <span className={`text-[11px] sm:text-xs font-black uppercase tracking-wider block truncate ${mecanica.corPrimaria}`}>
                  {mecanica.nome}
                </span>
                <span className="text-xs sm:text-sm md:text-base font-extrabold text-foreground truncate block">
                  {infoArtigo.titulo}
                </span>
              </div>

              {/* Botão de Narração em Áudio (Touch Target Apple HIG >= 44pt) */}
              <button
                onClick={falarSlide}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all shrink-0 shadow-sm flex items-center gap-2 active:scale-95 ${
                  falando
                    ? `${mecanica.botaoCor} text-white animate-pulse`
                    : 'border-border bg-secondary/60 hover:bg-secondary text-foreground'
                }`}
                title="Ouvir explicação do slide com voz"
              >
                {falando ? (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span className="hidden sm:inline">Pausar</span>
                  </>
                ) : (
                  <>
                    <Volume2 className={`w-4 h-4 ${mecanica.corPrimaria}`} />
                    <span className="hidden sm:inline">Ouvir</span>
                  </>
                )}
              </button>
            </div>

            {/* Linha 2: Guia Visual de Dispositivos (Pílulas com Marca d'água do Brasão da República) */}
            <div className="w-full">
              <GuiaDispositivosBar
                dispositivos={infoArtigo.dispositivos}
                ativoId={dispositivoAtivoId}
                onSelectDispositivo={handlePularParaDispositivo}
                corDestaque={mecanica.corPrimaria}
              />
            </div>

            {/* Linha 3: Barra de Progresso Progressiva */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-muted-foreground">
                <span className="truncate max-w-[70%] font-bold text-foreground/90">{slideAtual.badge}</span>
                <span className="font-black text-foreground">Etapa {slideIndex + 1} de {slides.length}</span>
              </div>
              <div className="w-full h-1.5 sm:h-2 rounded-full bg-secondary/80 overflow-hidden shadow-inner">
                <motion.div 
                  className={`h-full ${mecanica.barraProgressoCor || mecanica.botaoCor}`}
                  initial={false}
                  animate={{ width: `${((slideIndex + 1) / slides.length) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                />
              </div>
            </div>

          </header>

          {/* CENTRO DA TELA TODA: CONTEÚDO PERFEITAMENTE EQUILIBRADO E RESPONSIVO */}
          <main className="flex-1 w-full overflow-y-auto px-4 py-4 sm:py-6 flex flex-col items-center justify-start sm:justify-center">
            <div className="w-full max-w-xl mx-auto space-y-4 pt-1 pb-6 my-auto">
              
              {!slideAtual.isCapaDispositivo && (
                <div className="text-center space-y-1 px-2">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black font-display text-foreground tracking-tight">
                    {slideAtual.titulo}
                  </h3>
                  {slideAtual.subtitulo && (
                    <p className="text-sm sm:text-base text-muted-foreground font-medium">
                      {slideAtual.subtitulo}
                    </p>
                  )}
                </div>
              )}

              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={slideAtual.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="w-full space-y-3"
                >
                  {/* Seção Visual de Legal Design (MCP Gemini Spark e Supabase Storage) */}
                  <SlideImagemVisualizadorEControle
                    slideId={slideAtual.id}
                    imagePrompt={slideAtual.imagePrompt}
                    imageUrl={imagensCustomizadas[slideAtual.id] || slideAtual.imageUrl}
                    onSalvarUrl={(url) => {
                      setImagensCustomizadas((prev) => ({
                        ...prev,
                        [slideAtual.id]: url,
                      }));
                    }}
                  />

                  {slideAtual.conteudoPrincipal}
                </motion.div>
              </AnimatePresence>

            </div>
          </main>

          {/* RODAPÉ DA TELA TODA: CONTROLES DE NAVEGAÇÃO ERGONÔMICOS E FIXOS (APPLE HIG & MATERIAL 3 >= 48DP) */}
          <footer className="shrink-0 z-30 w-full px-4 py-3 sm:px-6 sm:py-3.5 border-t border-border/80 bg-background/95 backdrop-blur-md flex items-center justify-between gap-3 shadow-lg pb-[max(0.85rem,env(safe-area-inset-bottom))]">
            <button
              onClick={slideAnterior}
              disabled={slideIndex === 0}
              className="min-h-[48px] sm:min-h-[52px] px-5 py-2.5 rounded-xl sm:rounded-2xl border border-border bg-card hover:bg-secondary text-foreground font-bold text-sm sm:text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm active:scale-95 flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Anterior</span>
            </button>

            <div className="text-sm sm:text-base text-muted-foreground font-black px-2">
              {slideIndex + 1} / {slides.length}
            </div>

            {slideIndex < slides.length - 1 ? (
              <button
                onClick={proximoSlide}
                className={`min-h-[48px] sm:min-h-[52px] px-7 py-2.5 rounded-xl sm:rounded-2xl text-white font-black text-sm sm:text-base shadow-lg transition-all active:scale-95 flex items-center gap-2 ${mecanica.botaoCor}`}
              >
                <span>Próximo</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  pararVoz();
                  handleSairDaAula();
                  toast.success('Parabéns! Você completou a aula inteira com sucesso!');
                }}
                className={`min-h-[48px] sm:min-h-[52px] px-6 py-2.5 rounded-xl sm:rounded-2xl text-white font-black text-sm sm:text-base shadow-lg transition-all active:scale-95 flex items-center gap-2 ${mecanica.botaoCor}`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Concluir</span>
              </button>
            )}
          </footer>

        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* TELA PADRÃO DO LABORATÓRIO (LISTA DE MECÂNICAS)           */}
      {/* ========================================================= */}
      <DesktopPageLayout
        activeId="admin"
        title="Laboratório — Aprender Leis"
        subtitle="Teste e avalie mecânicas de aulas da legislação para pessoas leigas"
        mobileHeader={mobileHeader}
      >
        <div className="px-4 sm:px-6 py-5 lg:px-0 lg:py-0 max-w-xl mx-auto w-full space-y-4">
          
          {/* Artigo Modelo Fixo: Artigo 1º (CP) */}
          <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-teal-400 block">
                    {infoArtigo.diploma}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {infoArtigo.titulo}
                  </h3>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary text-foreground/80 border border-border">
                Caput
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-teal-500/20 bg-teal-950/20">
              <p className="font-serif text-xs sm:text-sm italic text-foreground/90 leading-relaxed text-center sm:text-left">
                {infoArtigo.texto}
              </p>
            </div>
          </div>

          {/* Formato Padrão Único: Combo Completo */}
          {(() => {
            const comboMec = MECANICAS.find(m => m.id === 'combo') || MECANICAS[0];
            const Icon = comboMec.icone;
            return (
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-card via-card to-amber-950/20 p-5 sm:p-6 space-y-4 shadow-md">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
                    <Icon className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                        {comboMec.badge}
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {comboMec.totalSlidesText}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-foreground">
                      {comboMec.nome}
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {comboMec.descricaoCurta}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleIniciarAula('combo')}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Iniciar Aula (Tela Toda)</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Rodapé Compacto: Atalho para Criar Aulas via OmniRoute */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-secondary/20 flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              Gerar aulas para outros artigos e leis:
            </span>
            <button
              onClick={() => {
                pararVoz();
                navigate('/admin-aprender-leis/criar');
              }}
              className="text-blue-400 hover:underline font-semibold flex items-center gap-1 shrink-0"
            >
              <span>Criar com Robô</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </DesktopPageLayout>
    </>
  );
};

export default AdminAprenderLeisLaboratorio;

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Sparkles, 
  Link2, 
  Scale, 
  ChevronRight, 
  Clock 
} from 'lucide-react';
import { toast } from 'sonner';
import flipSoundAsset from '@/assets/flipcard.mp3.asset.json';

// ==========================================
// ÍCONE DO BRASÃO DA REPÚBLICA (MARCA D'ÁGUA)
// ==========================================
export function BrasaoRepublicaIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.35" />
      <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path
        d="M50 14 L58 35 L80 37 L63 53 L68 75 L50 62 L32 75 L37 53 L20 37 L42 35 Z"
        fill="currentColor"
        opacity="0.3"
      />
      <circle cx="50" cy="46" r="14" fill="currentColor" opacity="0.65" />
      <circle cx="50" cy="40" r="1.5" fill="#ffffff" />
      <circle cx="46" cy="45" r="1.5" fill="#ffffff" />
      <circle cx="54" cy="45" r="1.5" fill="#ffffff" />
      <circle cx="50" cy="50" r="1.5" fill="#ffffff" />
      <circle cx="54" cy="49" r="1.2" fill="#ffffff" />
      <path d="M50 8 L50 88 M43 23 L57 23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}

// ==========================================
// CAPA DE TRANSIÇÃO DE DISPOSITIVO LEGAL
// ==========================================
export function CapaDispositivoSlide({
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
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
        <BrasaoRepublicaIcon className="w-56 h-56 text-amber-300" />
      </div>

      <div className="relative z-10 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-black uppercase tracking-wider text-amber-300 shadow-sm">
          <Icone className="w-4 h-4 text-amber-400" />
          <span>{diploma} · {artigoNumero}</span>
        </div>

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

        <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 text-left space-y-2 shadow-inner">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
            Texto Literal Oficial da Norma:
          </span>
          <p className="font-serif text-base sm:text-lg italic text-foreground/95 leading-relaxed border-l-4 border-amber-400 pl-3.5 py-0.5">
            “{textoLei}”
          </p>
        </div>

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
// 1. MINI-GAME: LIGAR OS TERMOS
// ==========================================
export interface TermoPar {
  id: string;
  termo: string;
  significado: string;
}

export function LigarTermosGame({ pares, onCompleto }: { pares: TermoPar[]; onCompleto?: () => void }) {
  const [selecionadoTermo, setSelecionadoTermo] = useState<string | null>(null);
  const [selecionadoSignificado, setSelecionadoSignificado] = useState<string | null>(null);
  const [acertos, setAcertos] = useState<string[]>([]);
  const [erro, setErro] = useState<{ termo: string; sig: string } | null>(null);

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

// ==========================================
// 2. FLASHCARD 3D
// ==========================================
export function FlipCardItem({ frente, verso }: { frente: string; verso: string }) {
  const [virado, setVirado] = useState(false);
  const flipAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!flipAudioRef.current && flipSoundAsset?.url) {
        flipAudioRef.current = new Audio(flipSoundAsset.url);
        flipAudioRef.current.volume = 0.35;
      }
    } catch {}
  }, []);

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
      tabIndex={0}
      role="button"
      aria-label="Girar Flashcard 3D"
      className="relative w-full min-h-[260px] sm:min-h-[290px] cursor-pointer focus:outline-none select-none group perspective-1000 py-1"
    >
      <motion.div
        animate={{ rotateY: virado ? 180 : 0 }}
        transition={{ 
          duration: 0.6, 
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative w-full min-h-[260px] sm:min-h-[290px] rounded-3xl preserve-3d shadow-xl"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* FRENTE DO CARD */}
        <div 
          className="absolute inset-0 rounded-3xl p-6 sm:p-8 flex flex-col justify-between items-center text-center backface-hidden border border-teal-500/40 bg-gradient-to-br from-[#0c2423] via-[#091819] to-card shadow-2xl transition-all duration-300 group-hover:border-teal-400 group-hover:shadow-teal-500/10"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-[11px] font-black uppercase tracking-wider text-teal-300">
            <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span>Desafio de Memorização</span>
          </div>

          <div className="my-auto py-3">
            <p className="text-lg sm:text-xl md:text-2xl font-bold leading-relaxed max-w-xl text-teal-50">
              {frente}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs sm:text-sm font-black group-hover:bg-teal-500/30 transition-colors">
            <RotateCcw className="w-4 h-4 text-teal-300" />
            <span>Toque para Virar e Conferir a Resposta</span>
          </div>
        </div>

        {/* VERSO DO CARD */}
        <div 
          className="absolute inset-0 rounded-3xl p-6 sm:p-8 flex flex-col justify-between items-center text-center backface-hidden border border-emerald-500/50 bg-gradient-to-br from-[#062c1d] via-[#041a12] to-card shadow-2xl"
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

// ==========================================
// 3. QUIZ INTERATIVO
// ==========================================
export function QuizInterativoItem({
  pergunta,
  opcoes,
}: {
  pergunta: string;
  opcoes: { texto: string; correta: boolean; feedback: string }[];
}) {
  const [resposta, setResposta] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-card via-card to-secondary/40 shadow-lg">
        <p className="text-base sm:text-lg md:text-xl font-bold text-foreground leading-relaxed">
          {pergunta}
        </p>
      </div>

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

// ==========================================
// 4. SIMULADOR TEMPORAL - ARTIGO 1º
// ==========================================
export function SimuladorArtigo1Tempo() {
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
          <Clock className="w-4 h-4 shrink-0" />
          <span>Fato Antes da Lei</span>
        </button>
        <button
          onClick={() => setCenario('depois')}
          className={`min-h-[50px] sm:min-h-[56px] px-4 py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm sm:text-base font-black transition-all flex items-center justify-center gap-2 shadow-sm ${
            cenario === 'depois'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-500/30 scale-[1.01]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>Fato Depois da Lei</span>
        </button>
      </div>

      <div className="p-6 sm:p-7 rounded-3xl border border-white/10 bg-gradient-to-br from-card via-card to-secondary/30 text-center space-y-3 shadow-lg">
        {cenario === 'antes' ? (
          <>
            <div className="text-4xl">🛡️</div>
            <h5 className="text-base sm:text-lg md:text-xl font-black text-emerald-400">
              Inocente! Fato Atípico e Livre de Culpa
            </h5>
            <p className="text-sm sm:text-base md:text-lg text-foreground/90 leading-relaxed font-normal">
              Como a lei ainda não existia quando a pessoa agiu, a nova regra não tem permissão para voltar no tempo. A pessoa é 100% livre.
            </p>
          </>
        ) : (
          <>
            <div className="text-4xl">⚖️</div>
            <h5 className="text-base sm:text-lg md:text-xl font-black text-amber-400">
              Crime Configurado! Aplica-se a Lei
            </h5>
            <p className="text-sm sm:text-base md:text-lg text-foreground/90 leading-relaxed font-normal">
              Como a lei já estava escrita e em vigor antes da conduta acontecer, o infrator responderá formalmente perante o juiz.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 5. SIMULADOR TEMPORAL - ARTIGO 2º
// ==========================================
export function SimuladorArtigo2Tempo() {
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

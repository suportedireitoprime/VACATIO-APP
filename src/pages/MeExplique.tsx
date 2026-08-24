import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Mic,
  MicOff,
  X,
  Sparkles,
  Loader2,
  MessageSquare,
  RefreshCw,
  Flashlight,
  FlashlightOff,
  FileText,
  Clock,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  Speech,
  Bot,
  Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import PremiumGate from '@/components/PremiumGate';
import { haptic } from '@/lib/nativeHaptics';
import { telaAcesa } from '@/lib/nativeKeepAwake';
import { SessaoMeExplique, type FalaTranscrita, type StatusLive } from '@/lib/meExplique/liveClient';
import { CameraMeExplique, type RecursosCamera } from '@/lib/meExplique/camera';
import TranscricaoSheet, { type FalaSalva } from '@/components/meExplique/TranscricaoSheet';
import MeExpliqueConfigSheet, { type MeExpliqueConfig, DEFAULT_CONFIG } from '@/components/meExplique/MeExpliqueConfigSheet';

const SUGESTOES = [
  'Explique isso de forma simples',
  'Isso cai na OAB? Como cobram?',
  'Me dê um exemplo prático',
  'Qual a diferença entre esses institutos?',
];

const ROTULO: Record<StatusLive, string> = {
  inativo: 'Aponte e toque em "Me explique"',
  conectando: 'Conectando com o professor…',
  ouvindo: 'Ouvindo você',
  falando: 'Explicando…',
  erro: 'Ocorreu um erro',
  encerrado: 'Sessão encerrada',
};

const LIMITE_PREMIUM_SEG = 300; // 5 minutos por dia
const LIMITE_FREE_SEG = 60;     // 1 minuto teste

export default function MeExplique() {
  const navigate = useNavigate();
  const voltar = () => navigate(-1);
  const { isPremium, loading: carregandoPlano } = useSubscription();

  const videoRef = useRef<HTMLVideoElement>(null);
  const sessaoRef = useRef<SessaoMeExplique | null>(null);
  const cameraRef = useRef<CameraMeExplique>(new CameraMeExplique());
  const pinchRef = useRef<{ distancia: number; zoom: number } | null>(null);

  const [status, setStatus] = useState<StatusLive>('inativo');
  const [erro, setErro] = useState<string | null>(null);
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [micAtivo, setMicAtivo] = useState(true);
  const [falas, setFalas] = useState<FalaTranscrita[]>([]);
  const [falaParcial, setFalaParcial] = useState<FalaTranscrita | null>(null);
  const [historico, setHistorico] = useState<FalaSalva[]>([]);
  const [transcricaoAberta, setTranscricaoAberta] = useState(false);

  // Configurações do Assistente
  const [config, setConfig] = useState<MeExpliqueConfig>(() => {
    const saved = localStorage.getItem('me_explique_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  const [configAberta, setConfigAberta] = useState(false);

  // Tutorial Flutuante no 1º Acesso
  const [showTutorial, setShowTutorial] = useState(() => {
    return !localStorage.getItem('me_explique_tutorial_visto');
  });

  // Modal de Limite de Tempo
  const [limiteModal, setLimiteModal] = useState(false);

  // Controle do Tempo de Uso
  const hojeKey = new Date().toISOString().slice(0, 10);
  const storageKey = `me_explique_uso_${hojeKey}`;
  
  const [tempoUsadoHoje, setTempoUsadoHoje] = useState<number>(() => {
    const val = localStorage.getItem(storageKey);
    return val ? parseInt(val, 10) : 0;
  });

  const limiteSegundos = isPremium ? LIMITE_PREMIUM_SEG : LIMITE_FREE_SEG;
  const tempoRestante = Math.max(0, limiteSegundos - tempoUsadoHoje);

  const registrar = useCallback((fala: FalaTranscrita) => {
    setHistorico((atual) => {
      const ultimo = atual[atual.length - 1];
      if (ultimo && ultimo.quem === fala.quem && Date.now() - ultimo.em < 12000) {
        const juntos = [...atual];
        juntos[juntos.length - 1] = {
          ...ultimo,
          texto: `${ultimo.texto} ${fala.texto}`.replace(/\s+/g, ' ').trim(),
        };
        return juntos;
      }
      return [...atual, { quem: fala.quem, texto: fala.texto, em: Date.now() }];
    });
  }, []);

  const [gateAberto, setGateAberto] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [previewPronto, setPreviewPronto] = useState(false);
  const [recursos, setRecursos] = useState<RecursosCamera>({
    focoManual: false,
    zoom: null,
    lanterna: false,
  });
  const [lanterna, setLanterna] = useState(false);
  const [foco, setFoco] = useState<{ x: number; y: number; id: number } | null>(null);

  const ativo = status === 'ouvindo' || status === 'falando' || status === 'conectando';
  const aoVivo = status === 'ouvindo' || status === 'falando';

  useEffect(() => {
    void telaAcesa('me-explique', ativo);
    return () => {
      void telaAcesa('me-explique', false);
    };
  }, [ativo]);

  // Timer de Contagem Regressiva e Trava de Tempo
  useEffect(() => {
    if (!aoVivo) return;
    const interval = setInterval(() => {
      setTempoUsadoHoje((prev) => {
        const novo = prev + 1;
        localStorage.setItem(storageKey, String(novo));
        
        if (novo >= limiteSegundos) {
          encerrar();
          setLimiteModal(true);
          haptic.heavy();
        }
        return novo;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [aoVivo, limiteSegundos, storageKey]);

  /** Abre o preview da câmera (sem microfone, sem sessão). */
  const abrirPreview = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      setErroCamera(null);
      const disponiveis = await cameraRef.current.abrir(video);
      setRecursos(disponiveis);
      setLanterna(cameraRef.current.lanterna);
      setPreviewPronto(true);
    } catch (e) {
      setPreviewPronto(false);
      setErroCamera(e instanceof Error ? e.message : 'Não consegui abrir a câmera.');
    }
  }, []);

  const encerrar = useCallback(() => {
    sessaoRef.current?.encerrar();
    sessaoRef.current = null;
    setStatus('inativo');
    setFalaParcial(null);
  }, []);

  // Câmera já ligada ao entrar na tela.
  useEffect(() => {
    void abrirPreview();
    return () => {
      sessaoRef.current?.encerrar();
      sessaoRef.current = null;
      cameraRef.current.fechar();
    };
  }, [abrirPreview]);

  // Libera a câmera em segundo plano e reabre ao voltar.
  useEffect(() => {
    const aoTrocar = () => {
      if (document.hidden) {
        sessaoRef.current?.encerrar();
        sessaoRef.current = null;
        setStatus('inativo');
        cameraRef.current.fechar();
        setPreviewPronto(false);
      } else {
        void abrirPreview();
      }
    };
    document.addEventListener('visibilitychange', aoTrocar);
    return () => document.removeEventListener('visibilitychange', aoTrocar);
  }, [abrirPreview]);

  const iniciar = useCallback(async () => {
    if (tempoRestante <= 0) {
      setLimiteModal(true);
      return;
    }
    if (sessaoRef.current || iniciando) return;

    setErro(null);
    setFalas([]);
    setIniciando(true);
    setStatus('conectando');
    void haptic.medium();

    try {
      if (!cameraRef.current.ativa) await abrirPreview();

      const { data, error } = await supabase.functions.invoke('me-explique-token', {
        body: config
      });
      if (error) throw new Error(error.message);
      const resposta = data as { token?: string; modelo?: string; setup?: Record<string, unknown> | null; ephemeral?: boolean } | null;
      const token = resposta?.token;
      const modelo = resposta?.modelo;
      if (!token || !modelo) throw new Error('Não foi possível autorizar a sessão ao vivo.');

      const video = videoRef.current;
      if (!video) throw new Error('Câmera indisponível.');

      const sessao = new SessaoMeExplique({
        token,
        modelo,
        ephemeral: resposta?.ephemeral ?? false,
        setup: resposta?.setup ?? null,
        video,
        streamVideo: cameraRef.current.obterStream(),

        onStatus: (s) => setStatus(s),
        onTranscricaoParcial: (fala) => setFalaParcial(fala),
        onTranscricao: (fala) => {
          setFalas((atual) => [...atual.slice(-20), fala]);
          registrar(fala);
          setFalaParcial(null);
        },
        onErro: (msg) => setErro(msg),
        fps: 1,
      });

      sessaoRef.current = sessao;
      await sessao.iniciar();
      setMicAtivo(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao iniciar.';
      setErro(
        /permission|notallowed|denied/i.test(msg)
          ? 'Precisamos da sua câmera e microfone. Abra os Ajustes do aparelho e libere as permissões para o app.'
          : msg,
      );

      setStatus('erro');
      sessaoRef.current?.encerrar();
      sessaoRef.current = null;
    } finally {
      setIniciando(false);
    }
  }, [tempoRestante, iniciando, abrirPreview, registrar]);

  const alternarMic = () => {
    const sessao = sessaoRef.current;
    if (!sessao) return;
    void haptic.light();
    setMicAtivo(sessao.alternarMicrofone());
  };

  const alternarLanterna = async () => {
    void haptic.light();
    setLanterna(await cameraRef.current.alternarLanterna());
  };

  const perguntar = (texto: string) => {
    sessaoRef.current?.enviarTexto(texto);
    void haptic.light();
    setFalas((atual) => [...atual.slice(-20), { quem: 'aluno', texto }]);
    registrar({ quem: 'aluno', texto });
  };

  const tocarParaFocar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!previewPronto || pinchRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setFoco({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() });
    void haptic.light();
    void cameraRef.current.focarEm(x, y);
    window.setTimeout(() => sessaoRef.current?.enviarFrame(), 700);
  };

  const aoTocar = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2 || !recursos.zoom) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const distancia = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    pinchRef.current = { distancia, zoom: cameraRef.current.zoom };
  };

  const aoMover = (e: React.TouchEvent<HTMLDivElement>) => {
    const inicio = pinchRef.current;
    if (!inicio || e.touches.length !== 2 || !recursos.zoom) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const distancia = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const fator = distancia / (inicio.distancia || 1);
    void cameraRef.current.definirZoom(inicio.zoom * fator);
  };

  const aoSoltar = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      window.setTimeout(() => {
        pinchRef.current = null;
      }, 120);
    }
  };

  const ultimaFala = falas[falas.length - 1];

  const minRest = Math.floor(tempoRestante / 60);
  const segRest = String(tempoRestante % 60).padStart(2, '0');

  const fecharTutorial = () => {
    localStorage.setItem('me_explique_tutorial_visto', 'true');
    setShowTutorial(false);
    haptic.selection();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      {/* Câmera */}
      <div
        className="absolute inset-0 touch-none"
        onPointerUp={tocarParaFocar}
        onTouchStart={aoTocar}
        onTouchMove={aoMover}
        onTouchEnd={aoSoltar}
      >
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          disablePictureInPicture
          className={`h-full w-full ${aoVivo ? 'object-contain' : 'object-cover'} transition-opacity duration-300 ${!previewPronto ? 'opacity-0' : 'opacity-100'}`}
        />
        {!previewPronto && !erro && !erroCamera && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
            <Loader2 className="h-8 w-8 animate-spin text-white/50" />
          </div>
        )}
        <AnimatePresence>
          {foco && (
            <motion.span
              key={foco.id}
              initial={{ opacity: 1, scale: 1.35 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onAnimationComplete={() => window.setTimeout(() => setFoco(null), 700)}
              className="pointer-events-none absolute h-20 w-20 rounded-full border-2 border-white/90"
              style={{ left: foco.x - 40, top: foco.y - 40 }}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/5 to-black/85" />

      {/* Topo com Timer de Contagem Regressiva */}
      <header className="relative z-10 flex items-center gap-3 px-4 pb-2 pt-[calc(1.25rem+var(--sai-top,env(safe-area-inset-top,0px)))]">
        <button
          onClick={() => {
            encerrar();
            cameraRef.current.fechar();
            voltar();
          }}
          aria-label="Fechar"
          className="flex h-11 w-11 min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-white/15 backdrop-blur active:scale-95 transition-transform"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex-1">
          <p className="font-display text-base font-bold leading-tight">Me Explique</p>
          <p className="text-[13px] leading-tight text-white/70">{ROTULO[status]}</p>
        </div>

        {/* Configurações */}
        <button
          onClick={() => {
            void haptic.light();
            setConfigAberta(true);
          }}
          aria-label="Configurações do professor"
          className="flex h-11 w-11 min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-white/15 backdrop-blur active:scale-95 transition-transform"
        >
          <Settings2 className="h-5 w-5" />
        </button>

        {/* Badge do Timer */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 border border-white/20 backdrop-blur text-xs font-mono font-extrabold text-amber-300">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{minRest}:{segRest}</span>
        </div>

        {historico.length > 0 && (
          <button
            onClick={() => {
              void haptic.light();
              setTranscricaoAberta(true);
            }}
            aria-label="Ver e baixar a explicação"
            className="relative flex h-11 w-11 min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-white/15 backdrop-blur active:scale-95 transition-transform"
          >
            <FileText className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {historico.length}
            </span>
          </button>
        )}

        {recursos.lanterna && (
          <button
            onClick={() => void alternarLanterna()}
            aria-label={lanterna ? 'Desligar lanterna' : 'Ligar lanterna'}
            className={`flex h-11 w-11 min-h-[48px] min-w-[48px] items-center justify-center rounded-full backdrop-blur active:scale-95 transition-transform ${
              lanterna ? 'bg-white text-black' : 'bg-white/15'
            }`}
          >
            {lanterna ? <Flashlight className="h-5 w-5" /> : <FlashlightOff className="h-5 w-5" />}
          </button>
        )}
      </header>

      {/* Card Flutuante de Tutorial no 1º Acesso */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative z-30 mx-auto mt-4 w-[90%] max-w-md rounded-3xl border border-purple-500/40 bg-zinc-950/90 p-5 text-white shadow-2xl backdrop-blur-md space-y-4"
          >
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-black leading-snug">Como funciona o "Me Explique"?</h3>
                <p className="text-xs text-white/70">Sua câmera com IA e voz ao vivo</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-600/30 text-amber-400 font-bold flex items-center justify-center shrink-0">1</span>
                <p className="text-white/90"><strong>Aponte a câmera</strong> para seu Vade Mecum, livro, caderno ou tela de estudo.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-600/30 text-amber-400 font-bold flex items-center justify-center shrink-0">2</span>
                <p className="text-white/90"><strong>Fale por voz</strong>. Se você falar durante a explicação, o professor para na hora para te ouvir.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-600/30 text-amber-400 font-bold flex items-center justify-center shrink-0">3</span>
                <p className="text-white/90"><strong>Resumo em PDF</strong>. Toda a sessão gera um resumo estruturado pronto para baixar.</p>
              </div>
            </div>

            <button
              onClick={fecharTutorial}
              className="w-full h-12 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm tracking-wide shadow-lg shadow-amber-600/30 active:scale-95 transition-all"
            >
              ENTENDI, CONTINUAR
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guia de mira removido para evitar confusão com 'tela de erro de câmera' */}

      {/* Transcrição e Erros */}
      <div className="relative z-10 mt-auto space-y-3 px-4 mb-2">
        <AnimatePresence initial={false}>
          {(falaParcial || ultimaFala) && (() => {
            const fala = falaParcial || ultimaFala;
            return (
              <motion.div
                key={falaParcial ? `parcial-${fala.quem}` : `${falas.length}-${fala.texto.slice(0, 12)}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`max-h-40 overflow-y-auto rounded-2xl px-4 py-3 text-[15px] leading-relaxed backdrop-blur ${
                  fala.quem === 'professor' ? 'bg-white/15' : 'bg-primary/85'
                }`}
              >
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-white/70">
                  {fala.quem === 'professor' ? 'Professor' : 'Você'}
                </p>
                {fala.texto}
                {falaParcial && (
                  <span className="ml-1 inline-block w-1.5 h-3.5 bg-current animate-pulse opacity-60 rounded-full align-middle" />
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {!showTutorial && (erro || erroCamera) && (
          <div className="rounded-2xl bg-destructive/90 p-4 text-[14px] leading-snug backdrop-blur shadow-xl border border-white/10">
            <p className="font-medium text-white">{erro ?? erroCamera}</p>
            {erroCamera && !erro && (
              <button
                onClick={() => void abrirPreview()}
                className="mt-3 flex h-12 min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-white/20 px-4 text-[14px] font-bold text-white hover:bg-white/30 active:scale-95 transition-all"
              >
                <RefreshCw className="h-4 w-4" /> Tentar de novo
              </button>
            )}
          </div>
        )}

        {ativo && (
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                onClick={() => perguntar(s)}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2.5 min-h-[44px] text-[13px] font-medium backdrop-blur active:scale-95 transition-transform"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controles */}
      {!showTutorial && (
        <footer className="relative z-10 flex items-center justify-center gap-4 px-6 pb-[calc(1.5rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] pt-3">
          {ativo ? (
          <>
            <button
              onClick={alternarMic}
              aria-label={micAtivo ? 'Desligar microfone' : 'Ligar microfone'}
              className={`flex h-14 w-14 min-h-[48px] min-w-[48px] items-center justify-center rounded-full backdrop-blur active:scale-95 transition-transform ${
                micAtivo ? 'bg-white/20' : 'bg-white text-black'
              }`}
            >
              {micAtivo ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </button>
            <button
              onClick={() => {
                void haptic.medium();
                encerrar();
              }}
              className="flex h-16 min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-success px-7 text-[15px] font-bold text-success-foreground shadow-lg active:scale-95 transition-transform"
            >
              {status === 'conectando' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Conectando…
                </>
              ) : (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                  </span>
                  Ao vivo — encerrar
                </>
              )}
            </button>
          </>
        ) : (
          <button
            onClick={() => void iniciar()}
            disabled={iniciando || carregandoPlano}
            className="flex h-14 min-h-[52px] w-full max-w-sm items-center justify-center gap-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-black text-base shadow-xl shadow-purple-600/30 active:scale-95 disabled:opacity-70 transition-all"
          >
            {iniciando ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : status === 'erro' || status === 'encerrado' ? (
              <RefreshCw className="h-5 w-5" />
            ) : (
              <Bot className="h-5 w-5 text-amber-300" />
            )}
            {status === 'erro' || status === 'encerrado' ? 'Tentar de novo' : 'Me explique'}
          </button>
        )}
        </footer>
      )}

      {/* Sheet de Transcrição / Resumo Baixável */}
      <TranscricaoSheet
        open={transcricaoAberta}
        onClose={() => setTranscricaoAberta(false)}
        falas={historico}
      />

      {/* Sheet de Configurações */}
      <MeExpliqueConfigSheet
        open={configAberta}
        onClose={() => setConfigAberta(false)}
        configAtual={config}
        onSave={(novaConfig) => {
          setConfig(novaConfig);
          localStorage.setItem('me_explique_config', JSON.stringify(novaConfig));
        }}
      />

      {/* Modal de Alerta de Limite de Tempo */}
      <AnimatePresence>
        {limiteModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-zinc-900 p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Tempo Limite Atingido</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {isPremium
                    ? 'Você utilizou seus 5 minutos diários da funcionalidade Me Explique. Volte amanhã para mais explicações!'
                    : 'Você concluiu o teste gratuito de 1 minuto do Me Explique. Torne-se um Assinante PRIME para liberar 5 minutos por dia!'}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                {!isPremium && (
                  <button
                    onClick={() => {
                      setLimiteModal(false);
                      setGateAberto(true);
                    }}
                    className="w-full h-12 rounded-2xl bg-amber-500 text-black font-black text-sm shadow-md hover:bg-amber-400 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Crown className="w-4 h-4" /> Assinar o PRIME
                  </button>
                )}
                <button
                  onClick={() => setLimiteModal(false)}
                  className="w-full h-11 rounded-2xl border border-white/20 text-white font-bold text-xs hover:bg-white/10 transition-colors"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PremiumGate
        open={gateAberto}
        onClose={() => setGateAberto(false)}
        feature="explicacao"
        title="Professor ao vivo pela câmera"
        description="Aponte a câmera para qualquer material e receba a explicação falada na hora."
      />
    </div>
  );
}


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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useGoBack } from '@/hooks/useGoBack';
import PremiumGate from '@/components/PremiumGate';
import { haptic, telaAcesa } from '@/lib/nativo';
import { SessaoMeExplique, type FalaTranscrita, type StatusLive } from '@/lib/meExplique/liveClient';
import { CameraMeExplique, type RecursosCamera } from '@/lib/meExplique/camera';
import TranscricaoSheet, { type FalaSalva } from '@/components/meExplique/TranscricaoSheet';
import { useTrackArea } from '@/hooks/useTrackArea';

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

const MeExplique = () => {
  useTrackArea('me_explique_aberta');
  const voltar = useGoBack('/ferramentas');
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
  const [historico, setHistorico] = useState<FalaSalva[]>([]);
  const [transcricaoAberta, setTranscricaoAberta] = useState(false);

  const registrar = useCallback((fala: FalaTranscrita) => {
    setHistorico((atual) => {
      const ultimo = atual[atual.length - 1];
      // A Live API envia a fala em pedaços: junta os trechos do mesmo turno.
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
    if (!isPremium) {
      setGateAberto(true);
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

      const { data, error } = await supabase.functions.invoke('me-explique-token');
      if (error) throw new Error(error.message);
      const resposta = data as { token?: string; modelo?: string; setup?: Record<string, unknown> | null } | null;
      const token = resposta?.token;
      const modelo = resposta?.modelo;
      if (!token || !modelo) throw new Error('Não foi possível autorizar a sessão ao vivo.');

      const video = videoRef.current;
      if (!video) throw new Error('Câmera indisponível.');

      const sessao = new SessaoMeExplique({
        token,
        modelo,
        setup: resposta?.setup ?? null,
        video,
        streamVideo: cameraRef.current.obterStream(),

        onStatus: (s) => setStatus(s),
        onTranscricao: (fala) => {
          setFalas((atual) => [...atual.slice(-20), fala]);
          registrar(fala);
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
  }, [isPremium, iniciando, abrirPreview, registrar]);

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

  // ----- foco por toque e zoom por pinça -----

  const tocarParaFocar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!previewPronto || pinchRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setFoco({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() });
    void haptic.light();
    void cameraRef.current.focarEm(x, y);
    // Frame extra em alta qualidade logo depois do foco.
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
          className={`h-full w-full ${aoVivo ? 'object-contain' : 'object-cover'}`}
        />
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

      {/* Topo */}
      <header className="relative z-10 flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={() => {
            encerrar();
            cameraRef.current.fechar();
            voltar();
          }}
          aria-label="Fechar"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="font-display text-base font-bold leading-tight">Me Explique</p>
          <p className="text-[13px] leading-tight text-white/70">{ROTULO[status]}</p>
        </div>
        {historico.length > 0 && (
          <button
            onClick={() => {
              void haptic.light();
              setTranscricaoAberta(true);
            }}
            aria-label="Ver e baixar a explicação"
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur active:scale-95"
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
            className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur active:scale-95 ${
              lanterna ? 'bg-white text-black' : 'bg-white/15'
            }`}
          >
            {lanterna ? <Flashlight className="h-5 w-5" /> : <FlashlightOff className="h-5 w-5" />}
          </button>
        )}
        {aoVivo && (
          <span className="flex items-center gap-2 rounded-full bg-success px-3 py-1.5 text-[12px] font-semibold text-success-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            AO VIVO
          </span>
        )}
      </header>

      {/* Guia de mira */}
      {!ativo && (
        <div className="pointer-events-none relative z-10 mx-auto mt-8 w-[78%] max-w-sm rounded-2xl border-2 border-dashed border-white/40 p-6 text-center">
          <Camera className="mx-auto h-8 w-8 text-white/80" />
          <p className="mt-3 text-[15px] font-semibold">Aponte para o livro, slide ou caderno</p>
          <p className="mt-1 text-[13px] leading-snug text-white/70">
            Toque na tela para focar{recursos.zoom ? ' e use dois dedos para aproximar' : ''}. Depois
            toque em “Me explique” e o professor começa a explicar em voz alta.
          </p>
        </div>
      )}

      {/* Transcrição */}
      <div className="relative z-10 mt-auto space-y-2 px-4">
        <AnimatePresence initial={false}>
          {ultimaFala && (
            <motion.div
              key={`${falas.length}-${ultimaFala.texto.slice(0, 12)}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`max-h-40 overflow-y-auto rounded-2xl px-4 py-3 text-[15px] leading-relaxed backdrop-blur ${
                ultimaFala.quem === 'professor' ? 'bg-white/15' : 'bg-primary/85'
              }`}
            >
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-white/70">
                {ultimaFala.quem === 'professor' ? 'Professor' : 'Você'}
              </p>
              {ultimaFala.texto}
            </motion.div>
          )}
        </AnimatePresence>

        {(erro || erroCamera) && (
          <div className="rounded-2xl bg-destructive/85 px-4 py-3 text-[14px] leading-snug backdrop-blur">
            {erro ?? erroCamera}
            {erroCamera && !erro && (
              <button
                onClick={() => void abrirPreview()}
                className="mt-2 flex h-11 items-center gap-2 rounded-full bg-white/20 px-4 text-[14px] font-semibold active:scale-95"
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
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 text-[13px] font-medium backdrop-blur active:scale-95"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controles */}
      <footer className="relative z-10 flex items-center justify-center gap-6 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        {ativo ? (
          <>
            <button
              onClick={alternarMic}
              aria-label={micAtivo ? 'Desligar microfone' : 'Ligar microfone'}
              className={`flex h-14 w-14 items-center justify-center rounded-full backdrop-blur active:scale-95 ${
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
              className="flex h-16 items-center justify-center gap-2.5 rounded-full bg-success px-7 text-[15px] font-bold text-success-foreground shadow-lg active:scale-95"
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
            className="flex h-16 items-center justify-center gap-2.5 rounded-full bg-primary px-9 text-[16px] font-bold text-primary-foreground shadow-lg active:scale-95 disabled:opacity-70"
          >
            {iniciando ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : status === 'erro' || status === 'encerrado' ? (
              <RefreshCw className="h-5 w-5" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            {status === 'erro' || status === 'encerrado' ? 'Tentar de novo' : 'Me explique'}
          </button>
        )}
      </footer>

      <TranscricaoSheet
        open={transcricaoAberta}
        onClose={() => setTranscricaoAberta(false)}
        falas={historico}
      />

      <PremiumGate
        open={gateAberto}
        onClose={() => setGateAberto(false)}
        feature="explicacao"
        title="Professor ao vivo pela câmera"
        description="Aponte a câmera para qualquer material e receba a explicação falada na hora."
      />
    </div>
  );
};

export default MeExplique;

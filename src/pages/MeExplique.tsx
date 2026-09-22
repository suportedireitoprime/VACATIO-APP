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
  Scale,
  BookOpen,
  ArrowRightLeft,
  Volume2,
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
import ModoChooserModal from '@/components/meExplique/ModoChooserModal';
import LeisSelectorModal, { type SelecaoLeiArtigo } from '@/components/meExplique/LeisSelectorModal';
import { LEIS_CATALOG, type LeiCatalogItem } from '@/data/leisCatalog';
import { fetchArtigosInstant } from '@/services/legislacaoService';
import { useTrackArea } from '@/hooks/useTrackArea';

const SUGESTOES_CAMERA = [
  'Explique isso de forma simples',
  'Isso cai na OAB? Como cobram?',
  'Me dê um exemplo prático',
  'Qual a diferença entre esses institutos?',
];

const SUGESTOES_LEIS = [
  'Explique o artigo de forma simples',
  'Como esse artigo cai na OAB?',
  'Me dê um exemplo prático do cotidiano',
  'Quais as principais exceções dessa norma?',
];

const ROTULO: Record<StatusLive, string> = {
  inativo: 'Toque em "Me explique" para iniciar',
  conectando: 'Conectando com o professor…',
  ouvindo: 'Ouvindo você…',
  falando: 'Professor explicando…',
  erro: 'Ocorreu um erro',
  encerrado: 'Sessão encerrada',
};

const MeExplique = () => {
  useTrackArea('me_explique_aberta');
  const voltar = useGoBack('/ferramentas');
  const { isPremium, loading: carregandoPlano } = useSubscription();

  // Modos: 'camera' (apontar para livro/anotação) ou 'leis' (selecionar lei e artigo sem câmera)
  const [modo, setModo] = useState<'camera' | 'leis'>('camera');
  const [modoChooserAberto, setModoChooserAberto] = useState(false);
  const [leisSelectorAberto, setLeisSelectorAberto] = useState(false);

  // Estado da Lei e Artigo selecionados
  const [leiAtiva, setLeiAtiva] = useState<LeiCatalogItem>(() => {
    return LEIS_CATALOG.find((l) => l.id === 'cf88') ?? LEIS_CATALOG[0];
  });
  const [artigoAtivo, setArtigoAtivo] = useState<{ numero: string; texto?: string }>({
    numero: '5º',
    texto: 'Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos estrangeiros residentes no País a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade...',
  });

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

  /** Abre o preview da câmera (somente se estiver no modo câmera). */
  const abrirPreview = useCallback(async () => {
    if (modo !== 'camera') return;
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
  }, [modo]);

  const encerrar = useCallback(() => {
    sessaoRef.current?.encerrar();
    sessaoRef.current = null;
    setStatus('inativo');
  }, []);

  // Controla preview da câmera conforme o modo
  useEffect(() => {
    if (modo === 'camera') {
      void abrirPreview();
    } else {
      cameraRef.current.fechar();
      setPreviewPronto(false);
      setErroCamera(null);
    }
    return () => {
      sessaoRef.current?.encerrar();
      sessaoRef.current = null;
      cameraRef.current.fechar();
    };
  }, [modo, abrirPreview]);

  // Libera a câmera em segundo plano e reabre ao voltar se estiver no modo câmera
  useEffect(() => {
    const aoTrocar = () => {
      if (document.hidden) {
        sessaoRef.current?.encerrar();
        sessaoRef.current = null;
        setStatus('inativo');
        cameraRef.current.fechar();
        setPreviewPronto(false);
      } else if (modo === 'camera') {
        void abrirPreview();
      }
    };
    document.addEventListener('visibilitychange', aoTrocar);
    return () => document.removeEventListener('visibilitychange', aoTrocar);
  }, [modo, abrirPreview]);

  // Inicia sessão ao vivo no modo Câmera
  const iniciarCamera = useCallback(async () => {
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

  // Inicia sessão ao vivo no modo Leis (sem câmera, puramente áudio e legislação)
  const iniciarLeis = useCallback(
    async (selecao?: SelecaoLeiArtigo) => {
      if (!isPremium) {
        setGateAberto(true);
        return;
      }
      if (sessaoRef.current || iniciando) return;

      const lei = selecao?.lei ?? leiAtiva;
      const artNum = selecao?.artigoNumero ?? artigoAtivo.numero;
      let artTxt = selecao?.artigoTexto ?? artigoAtivo.texto;

      if (selecao) {
        setLeiAtiva(selecao.lei);
        setArtigoAtivo({ numero: selecao.artigoNumero, texto: selecao.artigoTexto });
      }

      // Se o texto não estiver pré-carregado, tenta buscar instantaneamente
      if (!artTxt) {
        try {
          const arts = await fetchArtigosInstant(lei.tabela_nome, 40);
          const limpo = artNum.replace(/[^0-9]/g, '');
          const achado = arts.find((a) => a.numero.replace(/[^0-9]/g, '') === limpo);
          if (achado?.texto) {
            artTxt = achado.texto;
            setArtigoAtivo((prev) => ({ ...prev, texto: achado.texto }));
          }
        } catch {
          /* segue com o que tiver */
        }
      }

      setErro(null);
      setFalas([]);
      setIniciando(true);
      setStatus('conectando');
      void haptic.medium();

      try {
        // Garante liberação da câmera
        cameraRef.current.fechar();
        setPreviewPronto(false);

        const { data, error } = await supabase.functions.invoke('me-explique-token');
        if (error) throw new Error(error.message);
        const resposta = data as { token?: string; modelo?: string; setup?: Record<string, unknown> | null } | null;
        const token = resposta?.token;
        const modelo = resposta?.modelo;
        if (!token || !modelo) throw new Error('Não foi possível autorizar a sessão ao vivo.');

        const instrucaoInicial = `Olá professor! Quero que você me explique o Artigo ${artNum} da ${lei.nome} (${lei.sigla}).\nTexto do artigo: "${artTxt || 'Artigo selecionado pelo aluno'}"\nPor favor, comece falando em português do Brasil com entusiasmo didático. Explique em linguagem simples e direta o que este artigo determina, dê um exemplo prático do dia a dia e comente como esse ponto costuma ser explorado em provas e na OAB. Fale sempre em voz alta.`;

        const sessao = new SessaoMeExplique({
          token,
          modelo,
          setup: resposta?.setup ?? null,
          somenteAudio: true,
          instrucaoInicial,
          onStatus: (s) => setStatus(s),
          onTranscricao: (fala) => {
            setFalas((atual) => [...atual.slice(-20), fala]);
            registrar(fala);
          },
          onErro: (msg) => setErro(msg),
        });

        sessaoRef.current = sessao;
        await sessao.iniciar();
        setMicAtivo(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Falha ao iniciar.';
        setErro(
          /permission|notallowed|denied/i.test(msg)
            ? 'Precisamos da permissão do microfone para você conversar com o professor. Abra os Ajustes do aparelho.'
            : msg,
        );
        setStatus('erro');
        sessaoRef.current?.encerrar();
        sessaoRef.current = null;
      } finally {
        setIniciando(false);
      }
    },
    [isPremium, iniciando, leiAtiva, artigoAtivo, registrar],
  );

  // Clique do botão principal "Me explique"
  const handleMeExpliqueClick = () => {
    void haptic.light();
    if (status === 'inativo') {
      // Abre o card flutuante para o usuário escolher o modo
      setModoChooserAberto(true);
    } else if (status === 'erro' || status === 'encerrado') {
      if (modo === 'leis') {
        void iniciarLeis();
      } else {
        void iniciarCamera();
      }
    }
  };

  const handleSelectCamera = () => {
    setModoChooserAberto(false);
    setModo('camera');
    void iniciarCamera();
  };

  const handleSelectLeis = () => {
    setModoChooserAberto(false);
    setModo('leis');
    setLeisSelectorAberto(true);
  };

  const handleConfirmarLeis = (selecao: SelecaoLeiArtigo) => {
    setLeisSelectorAberto(false);
    setLeiAtiva(selecao.lei);
    setArtigoAtivo({ numero: selecao.artigoNumero, texto: selecao.artigoTexto });
    setModo('leis');
    void iniciarLeis(selecao);
  };

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

  // Foco por toque e zoom por pinça (modo câmera)
  const tocarParaFocar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (modo !== 'camera' || !previewPronto || pinchRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setFoco({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() });
    void haptic.light();
    void cameraRef.current.focarEm(x, y);
    window.setTimeout(() => sessaoRef.current?.enviarFrame(), 700);
  };

  const aoTocar = (e: React.TouchEvent<HTMLDivElement>) => {
    if (modo !== 'camera' || e.touches.length !== 2 || !recursos.zoom) return;
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
  const sugestoesAtuais = modo === 'leis' ? SUGESTOES_LEIS : SUGESTOES_CAMERA;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none">
      {/* ── MODO CÂMERA ── */}
      {modo === 'camera' && (
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
      )}

      {/* ── MODO LEIS (Background com iluminação elegante) ── */}
      {modo === 'leis' && (
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black overflow-hidden pointer-events-none">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 blur-3xl rounded-full" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/5 blur-3xl rounded-full" />
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/90" />

      {/* ── TOPO / HEADER ── */}
      <header className="relative z-20 flex items-center justify-between gap-3 px-4 pt-[max(0.85rem,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => {
              encerrar();
              cameraRef.current.fechar();
              voltar();
            }}
            aria-label="Fechar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur active:scale-95 transition-transform"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-display text-base font-bold leading-tight truncate">
                Me Explique
              </p>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 text-white/90 shrink-0">
                {modo === 'camera' ? 'Câmera' : 'Leis'}
              </span>
            </div>
            <p className="text-[12px] leading-tight text-white/70 truncate">
              {modo === 'leis' ? `${leiAtiva.sigla} • Art. ${artigoAtivo.numero}` : ROTULO[status]}
            </p>
          </div>
        </div>

        {/* Botões de Ação no Topo */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Alternador de Modo Rápido */}
          <button
            onClick={() => {
              void haptic.light();
              if (ativo) encerrar();
              setModoChooserAberto(true);
            }}
            className="flex h-9 items-center gap-1.5 px-3 rounded-full bg-white/15 hover:bg-white/20 border border-white/10 text-xs font-semibold backdrop-blur active:scale-95 transition-all"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Modos</span>
          </button>

          {/* Modo Leis: Botão de Trocar Artigo */}
          {modo === 'leis' && (
            <button
              onClick={() => {
                void haptic.light();
                setLeisSelectorAberto(true);
              }}
              className="flex h-9 items-center gap-1.5 px-3 rounded-full bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-xs font-bold backdrop-blur active:scale-95 transition-all"
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Trocar</span>
            </button>
          )}

          {/* Modo Câmera: Lanterna */}
          {modo === 'camera' && recursos.lanterna && (
            <button
              onClick={() => void alternarLanterna()}
              aria-label={lanterna ? 'Desligar lanterna' : 'Ligar lanterna'}
              className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur active:scale-95 transition-transform ${
                lanterna ? 'bg-white text-black' : 'bg-white/15'
              }`}
            >
              {lanterna ? <Flashlight className="h-4 w-4" /> : <FlashlightOff className="h-4 w-4" />}
            </button>
          )}

          {/* Histórico / Transcrição */}
          {historico.length > 0 && (
            <button
              onClick={() => {
                void haptic.light();
                setTranscricaoAberta(true);
              }}
              aria-label="Ver explicação gravada"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur active:scale-95 transition-transform"
            >
              <FileText className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {historico.length}
              </span>
            </button>
          )}

          {/* Badge Ao Vivo */}
          {aoVivo && (
            <span className="flex items-center gap-1.5 rounded-full bg-success px-2.5 py-1 text-[11px] font-bold text-success-foreground shrink-0 shadow-sm animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              AO VIVO
            </span>
          )}
        </div>
      </header>

      {/* ── CONTEÚDO CENTRAL ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-4 overflow-y-auto">
        {/* Guia de mira (Modo Câmera) */}
        {modo === 'camera' && !ativo && (
          <div className="pointer-events-none mx-auto w-[82%] max-w-sm rounded-3xl border-2 border-dashed border-white/40 p-6 text-center backdrop-blur-sm bg-black/20 shadow-2xl">
            <Camera className="mx-auto h-8 w-8 text-amber-400" />
            <p className="mt-3 text-[15px] font-bold text-white">
              Aponte para o livro, slide ou caderno
            </p>
            <p className="mt-1 text-[12px] leading-snug text-white/70">
              Toque na tela para focar{recursos.zoom ? ' e use dois dedos para zoom' : ''}. Depois toque no botão abaixo para o professor explicar ao vivo.
            </p>
          </div>
        )}

        {/* Card do Artigo e Visualizador (Modo Leis) */}
        {modo === 'leis' && (
          <div className="w-full max-w-lg mx-auto space-y-3.5 my-auto">
            {/* Card com a Lei e o Artigo */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-zinc-900/90 border border-zinc-800 p-4 sm:p-5 shadow-2xl backdrop-blur-md relative overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="font-display text-sm font-bold text-white leading-tight">
                      {leiAtiva.nome} ({leiAtiva.sigla})
                    </h2>
                    <span className="text-[11px] font-semibold text-primary">
                      Artigo {artigoAtivo.numero}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    void haptic.light();
                    setLeisSelectorAberto(true);
                  }}
                  className="text-[11px] font-bold text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 transition-colors"
                >
                  Alterar Artigo
                </button>
              </div>

              {/* Texto do Artigo */}
              <div className="pt-3 max-h-36 overflow-y-auto pr-1">
                <p className="text-xs sm:text-[13px] leading-relaxed text-zinc-200 font-normal">
                  {artigoAtivo.texto || 'Carregando o texto da norma…'}
                </p>
              </div>

              {/* Onda Sonora / Status do Professor */}
              {aoVivo && (
                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs text-primary font-medium">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 animate-bounce" />
                    <span>{status === 'falando' ? 'Professor explicando em voz alta…' : 'Ouvindo sua dúvida…'}</span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <span className="h-2.5 w-1 bg-primary rounded-full animate-pulse" />
                    <span className="h-4 w-1 bg-primary rounded-full animate-pulse delay-75" />
                    <span className="h-3 w-1 bg-primary rounded-full animate-pulse delay-150" />
                    <span className="h-2 w-1 bg-primary rounded-full animate-pulse delay-100" />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {/* ── ÁREA DE TRANSCRIÇÃO & SUGESTÕES ── */}
      <div className="relative z-20 mt-auto space-y-2 px-4 max-w-lg mx-auto w-full">
        {/* Última fala transcrita */}
        <AnimatePresence initial={false}>
          {ultimaFala && (
            <motion.div
              key={`${falas.length}-${ultimaFala.texto.slice(0, 12)}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`max-h-32 overflow-y-auto rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed backdrop-blur shadow-lg ${
                ultimaFala.quem === 'professor' ? 'bg-zinc-900/95 border border-zinc-800 text-zinc-100' : 'bg-primary/90 text-primary-foreground font-medium'
              }`}
            >
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
                {ultimaFala.quem === 'professor' ? 'Professor' : 'Você'}
              </p>
              {ultimaFala.texto}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mensagens de Erro */}
        {(erro || (modo === 'camera' && erroCamera)) && (
          <div className="rounded-2xl bg-destructive/90 px-4 py-3 text-xs sm:text-sm leading-snug backdrop-blur border border-destructive-foreground/20 space-y-2">
            <p>{erro ?? erroCamera}</p>
            {erroCamera && !erro && modo === 'camera' && (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => void abrirPreview()}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-white/20 px-3 text-xs font-bold active:scale-95"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Tentar de novo
                </button>
                <button
                  onClick={() => {
                    setModo('leis');
                    setLeisSelectorAberto(true);
                  }}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 text-xs font-bold active:scale-95"
                >
                  <Scale className="h-3.5 w-3.5" /> Usar Me Explique de Leis (sem câmera)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Chips de Perguntas Rápidas */}
        {ativo && (
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sugestoesAtuais.map((s) => (
              <button
                key={s}
                onClick={() => perguntar(s)}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 hover:border-primary/40 px-3 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur active:scale-95 transition-all"
              >
                <MessageSquare className="h-3 w-3 text-primary" />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER / CONTROLES RESPONSIVOS ── */}
      <footer className="relative z-20 flex items-center justify-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 max-w-md mx-auto w-full">
        {ativo ? (
          <>
            {/* Botão Microfone */}
            <button
              onClick={alternarMic}
              aria-label={micAtivo ? 'Desligar microfone' : 'Ligar microfone'}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full backdrop-blur active:scale-95 transition-all border ${
                micAtivo ? 'bg-zinc-900/90 border-zinc-700 text-white' : 'bg-white text-black border-white'
              }`}
            >
              {micAtivo ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-red-600" />}
            </button>

            {/* Botão Encerrar Sessão */}
            <button
              onClick={() => {
                void haptic.medium();
                encerrar();
              }}
              className="flex-1 h-12 inline-flex items-center justify-center gap-2 rounded-full bg-success text-success-foreground text-sm sm:text-base font-bold shadow-lg shadow-success/25 active:scale-95 transition-all whitespace-nowrap"
            >
              {status === 'conectando' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Conectando…</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                  </span>
                  <span>Ao vivo — encerrar</span>
                </>
              )}
            </button>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2.5 w-full">
            {/* Botão Mais Fino e Responsivo "Me explique" */}
            <button
              onClick={handleMeExpliqueClick}
              disabled={iniciando || carregandoPlano}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground px-6 sm:px-8 text-sm sm:text-base font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all whitespace-nowrap min-w-[150px] max-w-xs"
            >
              {iniciando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Conectando…</span>
                </>
              ) : status === 'erro' || status === 'encerrado' ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Tentar de novo</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Me explique</span>
                </>
              )}
            </button>

            {/* Atalho para alternar entre Câmera e Leis */}
            <button
              onClick={() => {
                void haptic.light();
                setModoChooserAberto(true);
              }}
              aria-label="Escolher modo"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 active:scale-95 transition-all"
              title="Alternar entre Câmera e Leis"
            >
              {modo === 'camera' ? (
                <Scale className="h-5 w-5 text-primary" />
              ) : (
                <Camera className="h-5 w-5 text-amber-400" />
              )}
            </button>
          </div>
        )}
      </footer>

      {/* ── CARD FLUTUANTE DE ESCOLHA DE MODO ── */}
      <ModoChooserModal
        open={modoChooserAberto}
        onClose={() => setModoChooserAberto(false)}
        onSelectCamera={handleSelectCamera}
        onSelectLeis={handleSelectLeis}
      />

      {/* ── SELETOR DE LEIS E ARTIGOS ── */}
      <LeisSelectorModal
        open={leisSelectorAberto}
        onClose={() => setLeisSelectorAberto(false)}
        onConfirm={handleConfirmarLeis}
      />

      {/* ── SHEET DE TRANSCRIÇÃO E EXPORTAÇÃO PDF/TXT ── */}
      <TranscricaoSheet
        open={transcricaoAberta}
        onClose={() => setTranscricaoAberta(false)}
        falas={historico}
      />

      {/* ── GATE PREMIUM ── */}
      <PremiumGate
        open={gateAberto}
        onClose={() => setGateAberto(false)}
        feature="explicacao"
        title="Professor ao vivo por IA"
        description="Explicações faladas e interativas tanto pela câmera quanto selecionando qualquer lei e artigo do Vade Mecum."
      />
    </div>
  );
};

export default MeExplique;

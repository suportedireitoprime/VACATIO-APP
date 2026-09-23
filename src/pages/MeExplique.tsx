import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  ArrowLeft,
  ArrowRight,
  Send,
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
import heroEstudanteImg from '@/assets/covers/hero-justice.webp';
import ladyJusticeAvatar from '@/assets/lady-justice-avatar.webp';

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

const SUGESTOES_LIVRE = [
  'Diferença entre dolo eventual e culpa consciente',
  'Como funciona a audiência de custódia?',
  'Explique a tutela de urgência e evidência',
  'O que é controle difuso de constitucionalidade?',
];

const ROTULO: Record<StatusLive, string> = {
  inativo: 'Toque para iniciar',
  conectando: 'Conectando com o professor…',
  ouvindo: 'Ouvindo você…',
  falando: 'Professor explicando…',
  erro: 'Ocorreu um erro',
  encerrado: 'Sessão encerrada',
};

const MeExplique = () => {
  useTrackArea('me_explique_aberta');
  const voltar = useGoBack('/');
  const { isPremium, loading: carregandoPlano } = useSubscription();
  const [searchParams] = useSearchParams();

  // Modos: 'escolha' (tela inicial com os 2 cards), 'camera' (apontar para caderno/livro), 'livre' (dialogar com avatar) ou 'leis' (artigo específico)
  const modoInicial = (searchParams.get('modo') as 'camera' | 'livre' | 'leis' | null) || 'escolha';
  const [modo, setModo] = useState<'escolha' | 'camera' | 'livre' | 'leis'>(modoInicial);
  const [modoChooserAberto, setModoChooserAberto] = useState(false);
  const [leisSelectorAberto, setLeisSelectorAberto] = useState(false);
  const [textoDigitado, setTextoDigitado] = useState('');

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

  /** Abre o preview da câmera somente se estiver no modo câmera */
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

  // Inicia sessão ao vivo no Modo Livre (sem câmera, diálogo livre com o Avatar)
  const iniciarLivre = useCallback(
    async (perguntaInicial?: string) => {
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
        cameraRef.current.fechar();
        setPreviewPronto(false);

        const { data, error } = await supabase.functions.invoke('me-explique-token');
        if (error) throw new Error(error.message);
        const resposta = data as { token?: string; modelo?: string; setup?: Record<string, unknown> | null } | null;
        const token = resposta?.token;
        const modelo = resposta?.modelo;
        if (!token || !modelo) throw new Error('Não foi possível autorizar a sessão ao vivo.');

        const instrucaoInicial = perguntaInicial
          ? `Olá professor! O aluno está no Modo Livre de diálogo e perguntou: "${perguntaInicial}". Explique de forma didática, clara, com exemplos do dia a dia e comente o impacto em provas ou na prática jurídica. Fale sempre em voz alta em português do Brasil.`
          : `Olá professor! O aluno está no Modo Livre de diálogo. Seja um professor de Direito excelente, dinâmico, didático e empático, que explica tudo de forma clara em português do Brasil. Comece se apresentando brevemente com simpatia ("Olá! Sou sua professora jurídica do Vacatio...") e pergunte que tema ou dúvida você gostaria de aprender ou debater agora. Fale sempre em voz alta.`;

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
    [isPremium, iniciando, registrar],
  );

  // Inicia sessão ao vivo no modo Leis (sem câmera, legislação selecionada)
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

  const handleSelectCamera = () => {
    setModoChooserAberto(false);
    setModo('camera');
  };

  const handleSelectLivre = () => {
    setModoChooserAberto(false);
    setModo('livre');
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
    if (!texto.trim()) return;
    if (!ativo) {
      void iniciarLivre(texto.trim());
      setTextoDigitado('');
      return;
    }
    sessaoRef.current?.enviarTexto(texto.trim());
    void haptic.light();
    setFalas((atual) => [...atual.slice(-20), { quem: 'aluno', texto: texto.trim() }]);
    registrar({ quem: 'aluno', texto: texto.trim() });
    setTextoDigitado('');
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
  const sugestoesAtuais =
    modo === 'leis' ? SUGESTOES_LEIS : modo === 'livre' ? SUGESTOES_LIVRE : SUGESTOES_CAMERA;

  // ══════════════════════════════════════════════════════════════════════
  // ── 1. TELA DE ESCOLHA INICIAL (FUNDO HERO EXPANDIDO + 2 CARDS) ──
  // ══════════════════════════════════════════════════════════════════════
  if (modo === 'escolha') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#050505] text-white select-none overflow-y-auto">
        {/* Imagem do painel da Thêmis com bandeira e STF — visível e ofuscada com elegância */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#050505]">
          <img
            src={heroEstudanteImg}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-center sm:object-right select-none opacity-45 filter brightness-75 contrast-110"
          />
          {/* Overlay escurecido suave e vinheta para contraste perfeito */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/75" />
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#EFE039]/12 blur-[90px] rounded-full pointer-events-none" />
        </div>

        {/* Header da Tela de Escolha */}
        <header className="relative z-20 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 max-w-lg mx-auto w-full">
          <button
            onClick={() => {
              encerrar();
              voltar();
            }}
            aria-label="Voltar para a página anterior"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 backdrop-blur border border-white/15 active:scale-95 transition-all text-white shadow-lg"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center">
            <h1 className="font-display text-base font-bold tracking-wide uppercase text-white flex items-center justify-center gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              <span>Me Explique</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#EFE039] inline-block shadow-sm shadow-[#EFE039]" />
            </h1>
            <p className="text-[11px] text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              Escolha como deseja aprender
            </p>
          </div>

          <div className="w-10" />
        </header>

        {/* Conteúdo Central: 2 Cards Flutuantes Compactos */}
        <div className="relative z-20 flex-1 flex flex-col justify-center px-4 py-4 max-w-sm mx-auto w-full space-y-3 my-auto">
          {/* ── CARD 1: CÂMERA (APONTAR PARA O CADERNO / LIVRO) ── */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              void haptic.medium();
              handleSelectCamera();
            }}
            className="w-full text-center rounded-2xl border-2 border-dashed border-white/35 hover:border-[#EFE039] p-4 sm:p-4.5 backdrop-blur-md bg-black/60 hover:bg-black/75 shadow-2xl transition-all group relative overflow-hidden"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFE039]/15 border border-[#EFE039]/30 text-[#EFE039] group-hover:scale-105 transition-transform">
              <Camera className="h-6 w-6 text-[#EFE039]" />
            </div>

            <h3 className="mt-2.5 font-display text-[14px] sm:text-[15px] font-bold text-white group-hover:text-[#EFE039] transition-colors leading-snug">
              Aponte para o livro, slide ou caderno
            </h3>

            <p className="mt-1 text-[11px] sm:text-[11.5px] leading-snug text-white/75 max-w-[270px] mx-auto">
              Toque na tela para focar. Depois toque no botão abaixo para o professor explicar ao vivo.
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#EFE039]/20 border border-[#EFE039]/40 text-[#EFE039] text-[11px] font-bold group-hover:bg-[#EFE039] group-hover:text-black transition-all">
              <Camera className="h-3 w-3" />
              <span>Usar Câmera ao Vivo</span>
              <ArrowRight className="h-3 w-3 ml-0.5" />
            </div>
          </motion.button>

          {/* ── CARD 2: MODO LIVRE (DIALOGAR COM O AVATAR) ── */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              void haptic.medium();
              handleSelectLivre();
            }}
            className="w-full text-center rounded-2xl border border-white/20 hover:border-[#EFE039]/80 p-4 sm:p-4.5 backdrop-blur-md bg-black/60 hover:bg-black/75 shadow-2xl transition-all group relative overflow-hidden"
          >
            {/* Avatar da Professora Thêmis com anel dourado */}
            <div className="relative mx-auto w-12 h-12 rounded-full p-0.5 ring-2 ring-[#EFE039]/80 shadow-md shadow-[#EFE039]/20 group-hover:scale-105 transition-transform overflow-hidden bg-black">
              <img
                src={ladyJusticeAvatar}
                alt="Professor IA"
                className="w-full h-full object-cover rounded-full"
              />
            </div>

            <h3 className="mt-2.5 font-display text-[14px] sm:text-[15px] font-bold text-white group-hover:text-[#EFE039] transition-colors leading-snug">
              Modo Livre (Dialogar)
            </h3>

            <p className="mt-1 text-[11px] sm:text-[11.5px] leading-snug text-white/75 max-w-[270px] mx-auto">
              Converse livremente com o professor por voz ou texto sobre qualquer tema jurídico.
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-[11px] font-bold group-hover:bg-primary group-hover:text-black transition-all">
              <MessageSquare className="h-3 w-3" />
              <span>Conversar com Professor</span>
              <ArrowRight className="h-3 w-3 ml-0.5" />
            </div>
          </motion.button>

          {/* Opção adicional sutil: Me Explique de Leis (sem câmera) */}
          <div className="pt-1 text-center">
            <button
              onClick={() => {
                void haptic.light();
                handleSelectLeis();
              }}
              className="text-[11.5px] text-white/60 hover:text-[#EFE039] transition-colors underline-offset-4 hover:underline inline-flex items-center gap-1.5"
            >
              <Scale className="h-3 w-3" />
              <span>Ou escolha um artigo de lei específico do Vade Mecum</span>
            </button>
          </div>
        </div>

        {/* Modal de seleção de leis */}
        <LeisSelectorModal
          open={leisSelectorAberto}
          onClose={() => setLeisSelectorAberto(false)}
          onConfirm={handleConfirmarLeis}
        />

        {/* Gate Premium */}
        <PremiumGate
          open={gateAberto}
          onClose={() => setGateAberto(false)}
          feature="explicacao"
          title="Professor ao vivo por IA"
          description="Explicações faladas e interativas tanto pela câmera quanto no diálogo livre."
        />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── 2. MODO CÂMERA, MODO LIVRE OU MODO LEIS ──
  // ══════════════════════════════════════════════════════════════════════
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

      {/* ── MODO LIVRE (Background imersivo com Thêmis ofuscada) ── */}
      {modo === 'livre' && (
        <div className="absolute inset-0 bg-[#080808] overflow-hidden pointer-events-none">
          <img
            src={heroEstudanteImg}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-center opacity-15 filter brightness-[0.25] blur-[4px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-black/95" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#EFE039]/10 blur-3xl rounded-full" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/5 blur-3xl rounded-full" />
        </div>
      )}

      {/* ── MODO LEIS (Background elegante com gradiente) ── */}
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
          {/* Botão de voltar para a tela de escolha */}
          <button
            onClick={() => {
              encerrar();
              cameraRef.current.fechar();
              setModo('escolha');
            }}
            aria-label="Voltar para a tela de modos"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur active:scale-95 transition-transform"
            title="Voltar para opções de modo"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-display text-base font-bold leading-tight truncate">
                Me Explique
              </p>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 text-white/90 shrink-0">
                {modo === 'camera' ? 'Câmera' : modo === 'livre' ? 'Modo Livre' : 'Leis'}
              </span>
            </div>
            <p className="text-[12px] leading-tight text-white/70 truncate">
              {modo === 'leis'
                ? `${leiAtiva.sigla} • Art. ${artigoAtivo.numero}`
                : modo === 'livre'
                ? status === 'inativo'
                  ? 'Diálogo aberto com o professor'
                  : ROTULO[status]
                : ROTULO[status]}
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
              setModo('escolha');
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

        {/* Visualizador do Modo Livre (com Avatar do Professor em destaque) */}
        {modo === 'livre' && (
          <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center my-auto py-4">
            {/* Avatar em destaque com anéis pulsantes ao vivo */}
            <div className="relative mb-5">
              {aoVivo && (
                <>
                  <span className="absolute inset-0 rounded-full animate-ping bg-[#EFE039]/30 -m-3" />
                  <span className="absolute inset-0 rounded-full animate-pulse bg-primary/20 -m-1.5" />
                </>
              )}
              <div
                className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 ring-4 ${
                  status === 'falando'
                    ? 'ring-[#EFE039] shadow-2xl shadow-[#EFE039]/50 animate-pulse'
                    : status === 'ouvindo'
                    ? 'ring-emerald-400 shadow-xl shadow-emerald-400/40'
                    : 'ring-white/20 shadow-xl shadow-black/80'
                } bg-zinc-950 overflow-hidden transition-all`}
              >
                <img
                  src={ladyJusticeAvatar}
                  alt="Professor IA"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>

            {/* Status e Título do Professor */}
            <div className="text-center space-y-1 mb-4">
              <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                Professora Jurídica IA
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 font-medium">
                {status === 'falando' ? (
                  <span className="text-[#EFE039] font-bold flex items-center justify-center gap-1.5">
                    <Volume2 className="h-4 w-4 animate-bounce" />
                    Explicando em voz alta…
                  </span>
                ) : status === 'ouvindo' ? (
                  <span className="text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                    <Mic className="h-4 w-4 animate-pulse" />
                    Ouvindo sua dúvida…
                  </span>
                ) : status === 'conectando' ? (
                  <span className="text-primary flex items-center justify-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Conectando com o professor…
                  </span>
                ) : (
                  <span className="text-zinc-400">
                    Converse por voz ou envie sua dúvida sobre qualquer tema
                  </span>
                )}
              </p>
            </div>

            {/* Onda sonora animada durante fala/escuta */}
            {aoVivo && (
              <div className="flex items-center gap-1.5 py-1">
                <span className="h-3 w-1.5 bg-[#EFE039] rounded-full animate-pulse" />
                <span className="h-6 w-1.5 bg-[#EFE039] rounded-full animate-pulse delay-75" />
                <span className="h-8 w-1.5 bg-[#EFE039] rounded-full animate-pulse delay-150" />
                <span className="h-5 w-1.5 bg-[#EFE039] rounded-full animate-pulse delay-100" />
                <span className="h-3 w-1.5 bg-[#EFE039] rounded-full animate-pulse delay-200" />
              </div>
            )}
          </div>
        )}

        {/* Card do Artigo e Visualizador (Modo Leis) */}
        {modo === 'leis' && (
          <div className="w-full max-w-lg mx-auto space-y-3.5 my-auto">
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
                ultimaFala.quem === 'professor'
                  ? 'bg-zinc-900/95 border border-zinc-800 text-zinc-100'
                  : 'bg-primary/90 text-primary-foreground font-medium'
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
                    setModo('livre');
                  }}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 text-xs font-bold active:scale-95"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Usar Modo Livre (sem câmera)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Campo de envio de pergunta por texto no Modo Livre */}
        {modo === 'livre' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              perguntar(textoDigitado);
            }}
            className="flex items-center gap-2 rounded-full bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 shadow-lg backdrop-blur"
          >
            <input
              type="text"
              value={textoDigitado}
              onChange={(e) => setTextoDigitado(e.target.value)}
              placeholder="Digite uma dúvida para o professor…"
              className="flex-1 bg-transparent px-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!textoDigitado.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 active:scale-95 transition-all"
              aria-label="Enviar pergunta"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        )}

        {/* Chips de Perguntas Rápidas */}
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
            {/* Botão Principal conforme o modo */}
            <button
              onClick={() => {
                void haptic.light();
                if (modo === 'livre') {
                  void iniciarLivre();
                } else if (modo === 'leis') {
                  void iniciarLeis();
                } else {
                  void iniciarCamera();
                }
              }}
              disabled={iniciando || carregandoPlano}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground px-6 sm:px-8 text-sm sm:text-base font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all whitespace-nowrap min-w-[150px] max-w-xs flex-1"
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
              ) : modo === 'livre' ? (
                <>
                  <Mic className="h-4 w-4" />
                  <span>Conversar por Voz</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Me explique</span>
                </>
              )}
            </button>

            {/* Atalho para alternar modos */}
            <button
              onClick={() => {
                void haptic.light();
                setModo('escolha');
              }}
              aria-label="Escolher outro modo"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 active:scale-95 transition-all"
              title="Voltar para opções de modo"
            >
              <ArrowRightLeft className="h-5 w-5 text-primary" />
            </button>
          </div>
        )}
      </footer>

      {/* ── CARD FLUTUANTE DE ESCOLHA DE MODO (QUANDO SOLICITADO VIA MODAL) ── */}
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
        description="Explicações faladas e interativas tanto pela câmera quanto no diálogo livre com seu professor."
      />
    </div>
  );
};
export default MeExplique;


import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  List,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Sliders,
  WandSparkles,
  Share2,
  Volume2,
  Square,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import OcrProgressOverlay from './OcrProgressOverlay';
import { getLocalLeituraNativa, cacheLeituraOnDemand } from '@/services/leituraNativaPrefetch';
import pageTurnAsset from '@/assets/page-turn.mp3.asset.json';
import { useLeitorPrefs } from '@/hooks/useLeitorPrefs';
import { useIsDesktop } from '@/hooks/use-desktop';
import AjustesPanel from './leitor/AjustesPanel';
import PaginaConteudo from './leitor/PaginaConteudo';
import LeitorFolhear, { type LeitorFolhearHandle } from './leitor/LeitorFolhear';
import AssistenteIA from './leitor/AssistenteIA';
import CompartilharFrase from './leitor/CompartilharFrase';
import IntroLivro from './leitor/IntroLivro';



interface Props {
  livroId: string;
  livroTabela: string;
  pdfUrl: string;
  titulo: string;
  onClose: () => void;
  autor?: string | null;
  ano?: string | null;
  editora?: string | null;
  sobre?: string | null;
  curiosidades?: string[] | null;
  capa?: string | null;
  isPreview?: boolean;
}

type CapituloJson = {
  numero?: number;
  titulo: string;
  capa_md?: string;
  paginas?: [number, number] | number[];
  conteudo_md?: string;
};

type SumarioItem = { titulo: string; nivel: number; page: number };

/**
 * Limpa títulos de capítulo/sumário vindos do OCR: remove marcação markdown
 * residual (`**`, `#`, `_`), pontos de preenchimento do índice impresso
 * ("11. ACORDO DE ACIONISTAS... 39") e espaços duplicados.
 */
const limparTituloCapitulo = (raw: string): string =>
  String(raw || '')
    .replace(/^#+\s*/, '')
    .replace(/\*+/g, '')
    .replace(/_{2,}/g, '')
    .replace(/[.·•\u2026]{2,}\s*\d{1,4}\s*$/g, '')
    // "Capítulo 3 -", "Parte II —", "Seção 1:" no início do título
    .replace(/^\s*(cap[ií]tulo|t[ií]tulo|livro|parte|se[cç][ãa]o|unidade)\s+[\wIVXLCDM]+\s*[-–—:.·]?\s*/i, '')
    // numeração ordinal no início: "1.", "2.3", "04 -", "IV –"
    .replace(/^\s*\d{1,3}(?:\.\d{1,3})*\s*[.\-–—):·]?\s+/, '')
    .replace(/^\s*[IVXLCDM]{1,6}\s*[.\-–—):·]\s+/, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s.,;:-]+$/g, '')
    .trim();

/** Entradas que são do índice impresso / preliminares, não capítulos reais. */
const ehTituloNaoCapitulo = (titulo: string): boolean => {
  const t = limparTituloCapitulo(titulo)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!t) return true;
  return /^(sumario|indice|indices?( para catalogo.*)?|conteudo|table of contents|ficha catalografica|dedicatoria|agradecimentos|expediente|creditos)$/.test(t);
};

type Registro = {
  status: 'pendente' | 'processando' | 'pronto' | 'erro';
  conteudo_md: string | null;
  conteudo_md_refinado?: string | null;
  refino_status?: 'pendente' | 'processando' | 'pronto' | 'erro' | null;
  sumario_json: SumarioItem[] | null;
  capitulos_json?: CapituloJson[] | null;
  total_paginas: number | null;
  erro_detalhe: string | null;
  etapa: string | null;
  progresso: number;
  total_etapas: number;
};

type Pagina = {
  index: number;
  ocrPage: number;
  chapterIdx: number;
  chapterTitulo: string;
  kind: 'cover' | 'content';
  md: string;
  cover?: { numero?: string; titulo: string };
};

type BookmarkEntry = {
  ocrPage: number;
  chapterTitulo: string;
  criadoEm: number;
};

const LOCAL_KEY = (t: string, i: string) => `leitura-nativa:${t}:${i}`;

const LeitorNativo = ({ 
  livroId, 
  livroTabela, 
  pdfUrl, 
  titulo, 
  onClose, 
  autor, 
  ano, 
  editora, 
  sobre, 
  curiosidades, 
  capa,
  isPreview,
}: Props) => {
  const [status, setStatus] = useState<Registro['status']>('pendente');
  const [conteudo, setConteudo] = useState<string>('');
  const [speaking, setSpeaking] = useState(false);
  // Narrações geradas pelo admin (áudio real). Chave = número da página do OCR.
  const [narracoes, setNarracoes] = useState<Map<number, string>>(new Map());
  const audioNarracaoRef = useRef<HTMLAudioElement | null>(null);
  const [sumario, setSumario] = useState<SumarioItem[]>([]);
  const [capitulos, setCapitulos] = useState<CapituloJson[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [showToc, setShowToc] = useState(false);
  const [railExpanded, setRailExpanded] = useState<boolean>(
    () => localStorage.getItem('leitura-nativa:rail-open') === '1',
  );

  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showAjustes, setShowAjustes] = useState(false);
  const [showAssistente, setShowAssistente] = useState(false);
  const [showCompartilhar, setShowCompartilhar] = useState(false);
  const [highlightTerm, setHighlightTerm] = useState<string>('');
  const { prefs, update, tema, fonte, lineHeight } = useLeitorPrefs();
  const dark = tema.isDark;
  const isDesktop = useIsDesktop();
  const DESKTOP_FN_RAIL = 76;
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [etapa, setEtapa] = useState<string | null>('Iniciando');
  const [progresso, setProgresso] = useState<number>(0);
  const [totalEtapas, setTotalEtapas] = useState<number>(6);
  const [totalPaginas, setTotalPaginas] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0);
  const [refinoStatus, setRefinoStatus] = useState<Registro['refino_status']>(null);
  const [resumeOcrPage, setResumeOcrPage] = useState<number | null>(null);
  const [resumeDismissed, setResumeDismissed] = useState<boolean>(false);
  const [introDismissed, setIntroDismissed] = useState<boolean>(false);


  // Carrega bookmarks + retomada
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_KEY(livroTabela, livroId));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.bookmarks)) setBookmarks(parsed.bookmarks);
        else if (parsed.bookmark && typeof parsed.bookmarkIndex === 'number') {
          // Migração do formato antigo (bookmark único)
          setBookmarks([{ ocrPage: parsed.bookmarkOcrPage ?? 0, chapterTitulo: 'Marcador', criadoEm: Date.now() }]);
        }
      } catch {}
    }
  }, [livroTabela, livroId]);

  // Registra imediatamente que o usuário abriu este livro em leitura nativa,
  // mesmo antes do processamento terminar — para aparecer em "Minha Leitura".
  useEffect(() => {
    const key = LOCAL_KEY(livroTabela, livroId);
    try {
      const prev = JSON.parse(localStorage.getItem(key) || '{}');
      localStorage.setItem(
        key,
        JSON.stringify({
          ...prev,
          index: typeof prev.index === 'number' ? prev.index : 0,
          updatedAt: Date.now(),
          titulo: titulo || prev.titulo || 'Continuar leitura',
          autor: autor ?? prev.autor ?? null,
          capa: capa ?? prev.capa ?? null,
        }),
      );
      window.dispatchEvent(new CustomEvent('biblioteca:tracking', { detail: { key } }));
    } catch {}
  }, [livroTabela, livroId, titulo, autor, capa]);

  // Carrega/processa + realtime
  useEffect(() => {
    let cancelled = false;
    let pollingId: ReturnType<typeof setInterval> | null = null;
    let restoredIndex = false;

    const applyRow = (data: any) => {
      if (!data || cancelled) return;
      if (data.etapa) setEtapa(data.etapa);
      if (typeof data.progresso === 'number') setProgresso(data.progresso);
      if (typeof data.total_etapas === 'number') setTotalEtapas(data.total_etapas);
      if (typeof data.total_paginas === 'number') setTotalPaginas(data.total_paginas);
      if (data.refino_status) {
        setRefinoStatus((prev) => {
          if (prev !== 'erro' && data.refino_status === 'erro') {
            toast.warning('Refinamento indisponível — mostrando texto original do OCR.');
          }
          return data.refino_status;
        });
      }

      // Regra de "pronto para o usuário final":
      //   Se existe QUALQUER conteúdo (refinado preferido, senão bruto), abrimos
      //   direto — independentemente de refino_status. Isso garante que, quando
      //   o admin já extraiu o livro, o usuário normal entra na leitura
      //   nativa sem passar por tela de "processando" nem re-disparar o OCR.
      const contentToUse = data.conteudo_md_refinado || data.conteudo_md || null;
      if (data.refino_status === 'erro' && data.conteudo_md && !data.conteudo_md_refinado) {
        // apenas aviso — o conteúdo bruto será usado
      }

      if (data.status === 'pronto' && contentToUse) {

        setStatus('pronto');
        setConteudo(contentToUse);
        setSumario((data.sumario_json as SumarioItem[]) || []);
        setCapitulos((data.capitulos_json as CapituloJson[]) || []);
        if (!restoredIndex) {
          restoredIndex = true;
          try {
            const saved = JSON.parse(localStorage.getItem(LOCAL_KEY(livroTabela, livroId)) || '{}');
            if (typeof saved.ocrPage === 'number' && saved.ocrPage > 0) {
              setResumeOcrPage(saved.ocrPage);
            } else if (typeof saved.index === 'number' && saved.index > 0) {
              // legado: cai como resumo por index (fallback)
              setResumeOcrPage(-saved.index);
            }
          } catch {}
        }
        if (pollingId) {
          clearInterval(pollingId);
          pollingId = null;
        }
      } else if (data.status === 'erro') {
        setStatus('erro');
        setErro(data.erro_detalhe || 'Erro desconhecido');
        if (pollingId) {
          clearInterval(pollingId);
          pollingId = null;
        }
      }
    };

    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from('biblioteca_leitura_nativa')
        .select('*')
        .eq('livro_tabela', livroTabela)
        .eq('livro_id', livroId)
        .maybeSingle();
      if (!error && data) applyRow(data);
      return data;
    };

    const startPolling = () => {
      if (pollingId) return;
      pollingId = setInterval(() => {
        if (!cancelled) void fetchLatest();
      }, 2500);
    };

    const channel = supabase
      .channel(`leitura-nativa-${livroTabela}-${livroId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'biblioteca_leitura_nativa',
          filter: `livro_id=eq.${livroId}`,
        },
        (payload) => {
          if (cancelled) return;
          const row: any = payload.new;
          if (row?.livro_tabela === livroTabela) applyRow(row);
        }
      )
      .subscribe();

    (async () => {
      try {
        const local = await getLocalLeituraNativa(livroTabela, livroId);
        if (cancelled) return;
        const hasLocalContent = !!local?.conteudo_md;
        const localPronto = hasLocalContent && (local as any).refino_status === 'pronto';
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

        if (localPronto) {
          setStatus('pronto');
          setConteudo(local.conteudo_md);
          setSumario((local.sumario_json as any) || []);
          setCapitulos(((local as any).capitulos_json as CapituloJson[]) || []);
          setTotalPaginas(local.total_paginas ?? null);
          try {
            const saved = JSON.parse(localStorage.getItem(LOCAL_KEY(livroTabela, livroId)) || '{}');
            if (typeof saved.ocrPage === 'number' && saved.ocrPage > 0) setResumeOcrPage(saved.ocrPage);
          } catch {}
          return;
        }

        // Offline: se temos algum conteúdo local (mesmo sem refino), usamos.
        // Se não temos, dá mensagem clara em PT sem tentar chamar a Edge Function.
        if (offline) {
          if (hasLocalContent) {
            setStatus('pronto');
            setConteudo(local!.conteudo_md as string);
            setSumario((local!.sumario_json as any) || []);
            setCapitulos(((local as any).capitulos_json as CapituloJson[]) || []);
            setTotalPaginas(local!.total_paginas ?? null);
            return;
          }
          setStatus('erro');
          setErro(
            'Este livro ainda não foi baixado para leitura offline. Conecte-se à internet para preparar a leitura, ou baixe-o na aba "Offline" da biblioteca.'
          );
          return;
        }

        const existing = await fetchLatest();
        if (cancelled) return;

        // Se qualquer conteúdo já foi extraído (pelo admin ou por outro
        // usuário), não redispara OCR. O applyRow do fetchLatest já colocou
        // o status como 'pronto' e o leitor abre direto.
        if (existing && (existing.conteudo_md_refinado || existing.conteudo_md)) {
          cacheLeituraOnDemand(livroTabela, livroId);
          // Se o refino ainda está rodando em background, continua ouvindo
          // via realtime para trocar o conteúdo bruto pelo refinado quando
          // ficar pronto — mas o usuário já pode ler agora.
          if (existing.refino_status === 'processando') startPolling();
          return;
        }

        setStatus('processando');
        startPolling();

        const { error } = await supabase.functions.invoke('biblioteca-ocr-mistral', {
          body: { livro_id: livroId, livro_tabela: livroTabela, pdf_url: pdfUrl, titulo },
        });
        if (error) throw error;
        void fetchLatest();
      } catch (e: any) {
        console.error('[LeitorNativo]', e);
        if (!cancelled) {
          setStatus('erro');
          const raw = String(e?.message || e || '');
          const isNetwork =
            /Failed to (send|fetch)/i.test(raw) ||
            /NetworkError|network request failed/i.test(raw) ||
            (typeof navigator !== 'undefined' && navigator.onLine === false);
          setErro(
            isNetwork
              ? 'Sem conexão com o servidor. Verifique sua internet e tente novamente. Se já baixou este livro offline, abra-o pela aba "Offline".'
              : (raw || 'Falha ao preparar a leitura.')
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (pollingId) clearInterval(pollingId);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livroId, livroTabela, pdfUrl]);

  // ============================================================
  // Paginação: quando temos capitulos_json (refino pronto), reconstrói
  // a partir dele para garantir capa por capítulo + conteúdo correto.
  // Fallback: parse do markdown legado com <!-- capa-capitulo -->.
  // ============================================================
  const paginas = useMemo<Pagina[]>(() => {
    const cleanArtefatos = (raw: string) =>
      raw
        .replace(/^\s*-{2,}\s*\d+\s*\|\s*/gm, '')
        .replace(/^\s*-{2,}\s*\d+\s*\|?\s*$/gm, '')
        .replace(/^\s*-{3,}\s*$/gm, '')
        .replace(/<!--\s*capa-capitulo\s*-->/g, '')
        .replace(/<!--\s*(continua|page:\d+|toc-original|\/toc-original)\s*-->/g, '')
        .replace(/([^\n])\s+(#{1,6})\s+/g, '$1\n\n$2 ')
        .replace(/^#{4,6}\s+/gm, '### ')
        .replace(/(^|\s)#{2,6}(?=\s*$)/gm, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    // Remove blocos marcados como índice original do livro pelo refino
    const stripTocOriginal = (raw: string) =>
      raw.replace(/<!--\s*toc-original\s*-->[\s\S]*?<!--\s*\/toc-original\s*-->/g, '');

    // Promove títulos literais tipo "**PÁGINA 25**", "### PÁGINA 25", "Página 25",
    // "Pág. 25" etc. (deixados pelo refino da IA) a marcadores reais
    // <!-- page:N --> para que cada página do OCR ocupe UMA página do leitor.
    // Também remove rótulos residuais no meio de um parágrafo (sem quebrar o texto).
    const promoverTitulosDePagina = (raw: string) =>
      raw
        // Linha isolada com rótulo de página → vira marcador real
        .replace(
          /(^|\n)[ \t]*(?:#{1,6}[ \t]*)?[*_]{0,2}[ \t]*P[ÁA]G(?:\.|INA)?[ \t]+(\d+)[º°ª]?[ \t]*[*_]{0,2}[ \t]*[.:\-–—]?[ \t]*(?=\n|$)/gi,
          (_m, pre, n) => `${pre}\n<!-- page:${n} -->\n`,
        )
        // Rótulo residual embutido em heading `### Página 50` no meio do fluxo
        // (já contemplado acima), mas garante remoção de heading em minúsculas.
        .replace(
          /(^|\n)[ \t]*#{1,6}[ \t]*P[áa]gina[ \t]+\d+[.:\-]?[ \t]*(?=\n|$)/gi,
          '$1',
        );

    const paginarPorMarcadores = (texto: string): Array<{ ocrPage: number; md: string }> => {
      const src = promoverTitulosDePagina(stripTocOriginal(texto));
      const parts = src.split(/<!--\s*page:(\d+)\s*-->/g);
      const raw: Array<{ ocrPage: number; md: string }> = [];
      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i += 2) {
          const n = Number(parts[i]);
          const md = cleanArtefatos(parts[i + 1] || '');
          if (md) raw.push({ ocrPage: n, md });
        }
      } else {
        // fallback: fatia por tamanho
        const CHUNK = 2500;
        const blocks = src.split(/\n\n+/);
        let buf = '';
        let counter = 1;
        for (const b of blocks) {
          if ((buf + '\n\n' + b).length > CHUNK && buf) {
            const c = cleanArtefatos(buf);
            if (c) raw.push({ ocrPage: counter++, md: c });
            buf = b;
          } else {
            buf = buf ? buf + '\n\n' + b : b;
          }
        }
        const c = cleanArtefatos(buf);
        if (c) raw.push({ ocrPage: counter++, md: c });
      }
      // Mescla páginas órfãs muito curtas ao final da anterior quando esta
      // termina sem pontuação (defesa em profundidade para conteúdos já refinados).
      const out: Array<{ ocrPage: number; md: string }> = [];
      for (const p of raw) {
        const prev = out[out.length - 1];
        const texto = p.md.replace(/\s+/g, ' ').trim();
        const curto = texto.length > 0 && texto.length <= 12;
        const prevSemPontuacao = prev && /[a-zà-úñç,;:—-]$/i.test(prev.md.replace(/\s+$/g, ''));
        if (prev && curto && prevSemPontuacao) {
          prev.md = prev.md.replace(/\s+$/, '') + ' ' + p.md.replace(/^\s+/, '');
        } else {
          out.push(p);
        }
      }
      return out;
    };


    const out: Pagina[] = [];
    let idxCounter = 0;

    // ---- Caminho preferido: capitulos_json (refino Gemini) ----
    if (capitulos && capitulos.length > 0) {
      // Mapa global de páginas OCR (do markdown refinado). Serve de fallback
      // quando um capítulo do refino veio sem `conteudo_md` — evita exibir
      // só a capa e "pular" o conteúdo.
      let paginasGlobais: Array<{ ocrPage: number; md: string }> | null = null;
      const getPaginasGlobais = () => {
        if (paginasGlobais) return paginasGlobais;
        paginasGlobais = conteudo ? paginarPorMarcadores(conteudo) : [];
        return paginasGlobais;
      };

      const hasTextoUtil = (md: string) =>
        md
          .replace(/<!--[^>]*-->/g, '')
          .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
          .replace(/\[[^\]]+\]\([^)]*\)/g, '$1')
          .replace(/https?:\/\/\S+/g, '')
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/\s+/g, ' ')
          .trim().length >= 40;

      capitulos.forEach((cap, cIdx) => {
        const numero = cap.numero ?? cIdx + 1;
        const titCap = limparTituloCapitulo(cap.titulo) || `Capítulo ${numero}`;
        // Conteúdo do capítulo
        const conteudoCap = String(cap.conteudo_md || '').trim();
        let paginado: Array<{ ocrPage: number; md: string }> = [];
        if (conteudoCap) {
          paginado = paginarPorMarcadores(conteudoCap);
        } else if (Array.isArray(cap.paginas) && cap.paginas.length) {
          // Fallback: extrai as páginas correspondentes do markdown global.
          const start = Number(cap.paginas[0]);
          const end = Number(cap.paginas[cap.paginas.length - 1]);
          const proxCap = capitulos[cIdx + 1];
          const proxStart = Array.isArray(proxCap?.paginas) && proxCap.paginas.length
            ? Number(proxCap.paginas[0])
            : Number.POSITIVE_INFINITY;
          const limite = Math.min(end, proxStart - 1);
          paginado = getPaginasGlobais().filter(
            (p) => p.ocrPage >= start && p.ocrPage <= limite,
          );
        }
        const paginasValidas = paginado.filter((p) => hasTextoUtil(p.md));
        if (!paginasValidas.length) return;
        // Numeração sequencial dos capítulos realmente exibidos — o refino
        // deixa buracos (Capítulo 1, 2, 5, 8...) quando descarta entradas do
        // índice impresso.
        const numeroExibido = out.filter((p) => p.kind === 'cover').length + 1;
        // Capa — só aparece se houver conteúdo real para o capítulo.
        out.push({
          index: idxCounter++,
          ocrPage: Array.isArray(cap.paginas) && cap.paginas.length ? Number(cap.paginas[0]) : paginasValidas[0].ocrPage,
          chapterIdx: cIdx,
          chapterTitulo: titCap,
          kind: 'cover',
          md: '',
          cover: { numero: `CAPÍTULO ${numeroExibido}`, titulo: titCap },
        });
        for (const p of paginasValidas) {
          out.push({
            index: idxCounter++,
            ocrPage: p.ocrPage,
            chapterIdx: cIdx,
            chapterTitulo: titCap,
            kind: 'content',
            md: p.md,
          });
        }
      });
      return isPreview ? out.slice(0, 5) : out;
    }

    // ---- Fallback: parse do markdown legado ----
    if (!conteudo) return out;
    const chapters = stripTocOriginal(conteudo).split(/<!--\s*capa-capitulo\s*-->/g);
    let ocrCounter = 1;
    chapters.forEach((raw, cIdx) => {
      const bloco = raw.trim();
      if (!bloco) return;
      if (cIdx === 0) {
        for (const p of paginarPorMarcadores(bloco)) {
          out.push({
            index: idxCounter++,
            ocrPage: p.ocrPage || ocrCounter++,
            chapterIdx: 0,
            chapterTitulo: 'Introdução do livro',
            kind: 'content',
            md: p.md,
          });
        }
        return;
      }
      // extrai título
      const linhas = bloco.split('\n');
      let numero: string | undefined;
      let titCap = '';
      let i = 0;
      while (i < linhas.length && !linhas[i].trim()) i++;
      const mNum = linhas[i]?.match(/^#{0,3}\s*(CAP[IÍ]TULO|TÍTULO|LIVRO|PARTE|SEÇÃO|SECAO)\s+([\wIVXLCDM\d]+).*$/i);
      if (mNum) {
        numero = `${mNum[1].toUpperCase()} ${mNum[2]}`;
        i++;
        while (i < linhas.length && !linhas[i].trim()) i++;
      }
      if (i < linhas.length) {
        const t = linhas[i].replace(/^#{1,6}\s*/, '').trim();
        if (t) {
          titCap = t;
          i++;
        }
      }
      const resto = linhas.slice(i).join('\n').trim();
      const chapterTitulo = titCap || (numero ?? `Capítulo ${cIdx}`);

      out.push({
        index: idxCounter++,
        ocrPage: ocrCounter,
        chapterIdx: cIdx,
        chapterTitulo,
        kind: 'cover',
        md: '',
        cover: { numero, titulo: chapterTitulo },
      });

      for (const p of paginarPorMarcadores(resto)) {
        out.push({
          index: idxCounter++,
          ocrPage: p.ocrPage || ocrCounter++,
          chapterIdx: cIdx,
          chapterTitulo,
          kind: 'content',
          md: p.md,
        });
      }
    });
    return isPreview ? out.slice(0, 5) : out;
  }, [conteudo, capitulos, isPreview]);

  // ============================================================
  // TOC final: prefere capitulos_json; senão sumario_json
  // ============================================================
  const tocItems = useMemo(() => {
    if (capitulos && capitulos.length > 0) {
      // Só entram no sumário capítulos que realmente têm páginas renderizadas —
      // entradas herdadas do índice impresso do PDF ficavam listadas e o toque
      // não levava a lugar nenhum.
      const comConteudo = new Set(
        paginas.map((p) => p.chapterIdx).filter((v): v is number => typeof v === 'number'),
      );
      return capitulos
        .map((c, i) => ({
          nivel: 1 as number,
          titulo: limparTituloCapitulo(c.titulo) || `Capítulo ${c.numero ?? i + 1}`,
          chapterIdx: i,
        }))
        .filter((c) => comConteudo.has(c.chapterIdx) && !ehTituloNaoCapitulo(c.titulo));
    }
    // fallback com sumario_json bruto
    return (sumario || [])
      .map((s, i) => ({
        nivel: s.nivel,
        titulo: limparTituloCapitulo(s.titulo),
        // sem chapterIdx: usa jumpToOcrPage
        ocrPage: s.page,
        chapterIdx: i,
      }))
      .filter((s) => s.titulo && !ehTituloNaoCapitulo(s.titulo)) as any;
  }, [capitulos, sumario, paginas]);

  // Mapa chapterIdx -> { start, end } com base nas páginas OCR reais.
  const chapterRanges = useMemo(() => {
    const map = new Map<number, { start: number; end: number }>();
    paginas.forEach((p) => {
      if (typeof p.chapterIdx !== 'number') return;
      const cur = map.get(p.chapterIdx);
      if (!cur) map.set(p.chapterIdx, { start: p.ocrPage, end: p.ocrPage });
      else {
        if (p.ocrPage < cur.start) cur.start = p.ocrPage;
        if (p.ocrPage > cur.end) cur.end = p.ocrPage;
      }
    });
    return map;
  }, [paginas]);


  // Persiste posição por ocrPage
  useEffect(() => {
    if (status !== 'pronto') return;
    const p = paginas[currentIndex];
    if (!p) return;
    const key = LOCAL_KEY(livroTabela, livroId);
    const prev = (() => {
      try {
        return JSON.parse(localStorage.getItem(key) || '{}');
      } catch {
        return {};
      }
    })();
    localStorage.setItem(
      key,
      JSON.stringify({
        ...prev,
        ocrPage: p.ocrPage,
        index: currentIndex,
        total: paginas.length,
        totalOcr: totalPaginas ?? prev.totalOcr ?? null,
        updatedAt: Date.now(),
        bookmarks,
        titulo,
        autor: autor ?? prev.autor ?? null,
        capa: capa ?? prev.capa ?? null,
      })
    );
    try { window.dispatchEvent(new CustomEvent('biblioteca:tracking', { detail: { key } })); } catch {}
  }, [currentIndex, paginas, status, livroTabela, livroId, bookmarks, totalPaginas]);

  // Rastreia tempo de leitura (apenas com aba visível e reader pronto)
  useEffect(() => {
    if (status !== 'pronto') return;
    const key = LOCAL_KEY(livroTabela, livroId);
    let last = Date.now();
    const raf: number | null = null;
    const tick = () => {
      const now = Date.now();
      const delta = now - last;
      last = now;
      if (document.visibilityState === 'visible' && delta < 30_000) {
        try {
          const prev = JSON.parse(localStorage.getItem(key) || '{}');
          const readTimeMs = Number(prev.readTimeMs || 0) + delta;
          localStorage.setItem(key, JSON.stringify({ ...prev, readTimeMs, updatedAt: now }));
        } catch {}
      }
    };
    const id = window.setInterval(tick, 15_000);
    const onVis = () => { last = Date.now(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      if (raf) cancelAnimationFrame(raf);
      tick();
    };
  }, [status, livroTabela, livroId]);

  const pageTurnAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayRef = useRef(0);
  const playPageTurn = () => {
    const now = Date.now();
    if (now - lastPlayRef.current < 180) return;
    lastPlayRef.current = now;
    try {
      if (!pageTurnAudioRef.current) {
        const a = new Audio(pageTurnAsset.url);
        a.preload = 'auto';
        a.volume = 0.55;
        pageTurnAudioRef.current = a;
      }
      const audio = pageTurnAudioRef.current;
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    } catch {}
  };

  const flipRef = useRef<LeitorFolhearHandle>(null);
  const isCurlMode = prefs.pageMode === 'curl';

  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= paginas.length) return;
      setDirection(idx > currentIndex ? 1 : -1);
      if (isCurlMode) {
        // A StPageFlip cuida da animação — só sincronizamos via onFlip
        flipRef.current?.flip(idx);
      } else {
        setCurrentIndex(idx);
      }
      playPageTurn();
    },
    [currentIndex, paginas.length, isCurlMode]
  );
  const next = useCallback(() => {
    if (isCurlMode) {
      flipRef.current?.flipNext();
      playPageTurn();
    } else {
      goTo(currentIndex + 1);
    }
  }, [goTo, currentIndex, isCurlMode]);
  const prev = useCallback(() => {
    if (isCurlMode) {
      flipRef.current?.flipPrev();
      playPageTurn();
    } else {
      goTo(currentIndex - 1);
    }
  }, [goTo, currentIndex, isCurlMode]);



  const jumpToChapter = (chapterIdx: number) => {
    const idx = paginas.findIndex((p) => p.chapterIdx === chapterIdx && p.kind === 'cover');
    if (idx >= 0) goTo(idx);
    else {
      const alt = paginas.findIndex((p) => p.chapterIdx === chapterIdx);
      if (alt >= 0) goTo(alt);
    }
    setShowToc(false);
  };
  const jumpToOcrPage = (ocrPage: number) => {
    // Encontra a página cujo ocrPage seja o mais próximo (>=) do alvo
    let bestIdx = -1;
    let bestDiff = Infinity;
    paginas.forEach((p, i) => {
      const d = Math.abs(p.ocrPage - ocrPage);
      if (d < bestDiff) {
        bestDiff = d;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0) goTo(bestIdx);
    setShowToc(false);
  };

  // ============================================================
  // BOOKMARKS
  // ============================================================
  const currentPage = paginas[currentIndex];

  // ============================================================
  // NARRAÇÃO (áudio gerado) — substitui o TTS nativo
  // ============================================================
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from('narracao_livro_paginas')
        .select('pagina_label, audio_url, status')
        .eq('livro_tabela', livroTabela)
        .eq('livro_id', String(livroId));
      if (cancel || !data) return;
      const mapa = new Map<number, string>();
      for (const n of data as any[]) {
        const num = Number(String(n.pagina_label || '').match(/(\d+)/)?.[1]);
        if (Number.isFinite(num) && n.audio_url) mapa.set(num, n.audio_url as string);
      }
      setNarracoes(mapa);
    })();
    return () => { cancel = true; };
  }, [livroTabela, livroId]);

  const audioPaginaAtual = currentPage ? narracoes.get(currentPage.ocrPage) || null : null;

  const pararNarracao = useCallback(() => {
    const a = audioNarracaoRef.current;
    if (a) { a.pause(); a.currentTime = 0; }
    audioNarracaoRef.current = null;
    setSpeaking(false);
  }, []);

  const toggleNarracao = useCallback(() => {
    if (speaking) { pararNarracao(); return; }
    if (!audioPaginaAtual) {
      toast.info('Em breve', { description: 'A narração desta página ainda está sendo produzida.' });
      return;
    }
    const a = new Audio(audioPaginaAtual);
    audioNarracaoRef.current = a;
    a.onended = () => { audioNarracaoRef.current = null; setSpeaking(false); };
    a.onerror = () => { audioNarracaoRef.current = null; setSpeaking(false); toast.error('Não foi possível tocar a narração.'); };
    setSpeaking(true);
    a.play().catch(() => { setSpeaking(false); toast.error('Não foi possível tocar a narração.'); });
  }, [speaking, audioPaginaAtual, pararNarracao]);

  // troca de página interrompe o áudio
  useEffect(() => { pararNarracao(); }, [currentIndex, pararNarracao]);
  useEffect(() => () => { pararNarracao(); }, [pararNarracao]);

  const isCurrentBookmarked = !!(
    currentPage && bookmarks.find((b) => b.ocrPage === currentPage.ocrPage)
  );
  const toggleCurrentBookmark = () => {
    if (!currentPage) return;
    setBookmarks((prev) => {
      const exists = prev.find((b) => b.ocrPage === currentPage.ocrPage);
      if (exists) {
        toast.success('Marcador removido');
        return prev.filter((b) => b.ocrPage !== currentPage.ocrPage);
      }
      toast.success('Página marcada');
      return [
        ...prev,
        { ocrPage: currentPage.ocrPage, chapterTitulo: currentPage.chapterTitulo, criadoEm: Date.now() },
      ].sort((a, b) => a.ocrPage - b.ocrPage);
    });
  };
  const removeBookmark = (ocrPage: number) => {
    setBookmarks((prev) => prev.filter((b) => b.ocrPage !== ocrPage));
  };

  // Teclado (setas)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') {
        if (showToc) setShowToc(false);
        else if (showBookmarks) setShowBookmarks(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, showToc, showBookmarks]);

  // Destaque da busca: envolve ocorrências em <mark> percorrendo os nós de texto
  useEffect(() => {
    const article = document.querySelector<HTMLElement>('[data-reader-article]');
    if (!article) return;
    // Remove destaques antigos
    article.querySelectorAll('mark[data-search]').forEach((m) => {
      const parent = m.parentNode;
      if (parent) {
        while (m.firstChild) parent.insertBefore(m.firstChild, m);
        parent.removeChild(m);
        parent.normalize();
      }
    });
    const term = highlightTerm.trim();
    if (term.length < 3) return;
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let n: Node | null = walker.nextNode();
    while (n) {
      if (n.nodeValue && re.test(n.nodeValue)) nodes.push(n as Text);
      re.lastIndex = 0;
      n = walker.nextNode();
    }
    let firstMark: HTMLElement | null = null;
    for (const textNode of nodes) {
      const frag = document.createDocumentFragment();
      const raw = textNode.nodeValue || '';
      let last = 0;
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(raw)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(raw.slice(last, m.index)));
        const mark = document.createElement('mark');
        mark.setAttribute('data-search', '1');
        mark.style.background = 'hsl(var(--primary) / 0.4)';
        mark.style.color = 'inherit';
        mark.style.padding = '0 2px';
        mark.style.borderRadius = '3px';
        mark.textContent = m[0];
        if (!firstMark) firstMark = mark;
        frag.appendChild(mark);
        last = m.index + m[0].length;
      }
      if (last < raw.length) frag.appendChild(document.createTextNode(raw.slice(last)));
      textNode.parentNode?.replaceChild(frag, textNode);
    }
    if (firstMark) {
      firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightTerm, currentIndex, status]);



  // Cores do tema aplicadas inline (5 temas dinâmicos)

  const fontSize = prefs.fontSize;

  const menuOpen = showToc || showBookmarks || showAjustes;


  // Título do capítulo atual para o header
  const headerSub =
    status === 'pronto' && currentPage
      ? `${currentPage.chapterTitulo} · pág. ${currentPage.ocrPage}`
      : refinoStatus === 'processando'
        ? 'IA refinando o texto…'
        : null;

  const reader = (
    <div
      className="fixed inset-0 z-[1300] h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col"
      style={{ background: tema.bg, color: tema.text }}
    >

      {/* Header */}
      <header
        className="flex items-center gap-3 px-4 py-3.5 shrink-0 border-b backdrop-blur"
        style={{
          paddingTop: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 0.875rem)',
          minHeight: 'calc(5rem + var(--sai-top, env(safe-area-inset-top, 0px)))',
          paddingLeft:
            isDesktop && status === 'pronto' && tocItems.length > 0
              ? `calc(${railExpanded ? 380 : 56}px + 1rem)`
              : undefined,
          paddingRight:
            isDesktop && status === 'pronto'
              ? `calc(${DESKTOP_FN_RAIL}px + 1rem)`
              : undefined,
          background: dark ? 'rgba(0,0,0,0.28)' : `${tema.bg}cc`,
          borderColor: tema.border,
          color: tema.text,
        }}
      >
        <button
          onClick={onClose}
          aria-label="Voltar"
          className="w-12 h-12 md:w-11 md:h-11 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform border"
          style={{
            background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            borderColor: tema.border,
            color: tema.text,
          }}
        >
          <ArrowLeft className="w-[22px] h-[22px]" />
        </button>
        <div className="flex-1 min-w-0 text-center md:text-left">
          <h1 className="font-display text-[18px] md:text-[19px] font-semibold tracking-wide truncate">
            {titulo}
          </h1>
          {headerSub && (
            <p className="text-[11px] md:text-[12px] font-body opacity-70 truncate mt-0.5">{headerSub}</p>
          )}
        </div>
        <div className="w-12 md:hidden shrink-0" />
      </header>


      {/* Sumário lateral (rail recolhido) — tablet/desktop */}
      {status === 'pronto' && tocItems.length > 0 && (

        <aside
          aria-label="Sumário do livro"
          onMouseEnter={() => setRailExpanded(true)}
          onMouseLeave={() => {
            if (localStorage.getItem('leitura-nativa:rail-open') !== '1') {
              setRailExpanded(false);
            }
          }}
          className="hidden md:flex md:flex-col fixed left-0 top-0 bottom-0 z-[1305] border-r transition-[width] duration-300 ease-out backdrop-blur-md pt-[calc(5rem+var(--sai-top,env(safe-area-inset-top,0px)))]"
          style={{ width: railExpanded ? 380 : 56, background: `${tema.bg}f2`, borderColor: tema.border, color: tema.text }}
        >
          <div
            className={`flex items-center gap-2 border-b shrink-0 ${railExpanded ? 'px-4 h-16' : 'px-2 h-12'}`}
            style={{ borderColor: `${tema.text}1a` }}
          >
            <button
              onClick={() => {
                const next = !railExpanded;
                setRailExpanded(next);
                localStorage.setItem('leitura-nativa:rail-open', next ? '1' : '0');
              }}
              className={`${railExpanded ? 'w-11 h-11' : 'w-10 h-10'} flex items-center justify-center rounded-lg transition ${dark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              aria-label={railExpanded ? 'Recolher sumário' : 'Expandir sumário'}
              title={railExpanded ? 'Recolher sumário' : 'Expandir sumário'}
            >
              <List className={railExpanded ? 'w-6 h-6' : 'w-5 h-5'} />
            </button>
            {railExpanded && (
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold truncate leading-tight">Sumário</p>
                <p className="text-xs opacity-60 truncate">{tocItems.length} {tocItems.length === 1 ? 'capítulo' : 'capítulos'}</p>
              </div>
            )}
          </div>
          <div className={railExpanded ? 'flex-1 overflow-y-auto py-2' : 'flex-1 overflow-y-auto p-2 space-y-1'}>
            {tocItems.map((s: any, idx) => {
              const active = currentPage && s.chapterIdx === currentPage.chapterIdx;
              const onClick =
                typeof s.chapterIdx === 'number' && capitulos.length
                  ? () => jumpToChapter(s.chapterIdx)
                  : () => jumpToOcrPage(s.ocrPage);
              if (!railExpanded) {
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setRailExpanded(true);
                      localStorage.setItem('leitura-nativa:rail-open', '1');
                      onClick();
                    }}
                    className={`group relative w-10 h-9 mx-auto flex items-center justify-center rounded-md text-[12px] font-semibold tabular-nums transition ${active ? (dark ? 'bg-primary/25 text-primary' : 'bg-primary/15 text-primary') : (dark ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-black/60 hover:bg-black/5 hover:text-black')}`}
                    aria-label={`${s.titulo} — pág. ${s.ocrPage ?? ''}`}
                    title={`${s.titulo} — pág. ${s.ocrPage ?? ''}`}
                  >
                    {s.ocrPage ?? idx + 1}
                  </button>
                );
              }

              const range =
                typeof s.chapterIdx === 'number' ? chapterRanges.get(s.chapterIdx) : undefined;
              const rangeLabel = range
                ? range.start === range.end
                  ? `p. ${range.start}`
                  : `p. ${range.start}–${range.end}`
                : s.ocrPage
                  ? `p. ${s.ocrPage}`
                  : null;
              const isLast = idx === tocItems.length - 1;

              return (
                <div key={idx} className="px-2">
                  <button
                    onClick={onClick}
                    className={`w-full text-left px-3 py-3 rounded-lg transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${active ? (dark ? 'bg-primary/20 text-primary' : 'bg-primary/15 text-primary') : (dark ? 'hover:bg-white/5' : 'hover:bg-black/5')}`}
                    style={{ paddingLeft: 12 + (s.nivel - 1) * 14 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[15px] leading-snug font-medium flex-1 min-w-0">
                        {s.titulo}
                      </span>
                      {rangeLabel && (
                        <span
                          className={`text-[11px] tabular-nums shrink-0 mt-0.5 px-2 py-0.5 rounded-full ${active ? 'bg-primary/20 text-primary' : dark ? 'bg-white/5 text-white/60' : 'bg-black/5 text-black/60'}`}
                        >
                          {rangeLabel}
                        </span>
                      )}
                    </div>
                  </button>
                  {!isLast && (
                    <div
                      className="mx-3 h-px"
                      style={{ background: `${tema.text}14` }}
                    />
                  )}
                </div>
              );
            })}
          </div>

        </aside>
      )}

      {/* Rail de funções — desktop (direita) */}
      {isDesktop && status === 'pronto' && currentPage && (
        <aside
          aria-label="Ferramentas de leitura"
          className="hidden md:flex md:flex-col fixed right-0 top-0 bottom-0 z-[1305] border-l backdrop-blur-md pt-[calc(5rem+var(--sai-top,env(safe-area-inset-top,0px)))] pb-4"
          style={{ width: DESKTOP_FN_RAIL, background: `${tema.bg}f2`, borderColor: tema.border, color: tema.text }}
        >
          <div className="flex flex-col items-center gap-2 px-2 pt-3">
            <button
              onClick={prev}
              disabled={currentIndex === 0}
              aria-label="Página anterior"
              title="Página anterior"
              className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 disabled:opacity-30 ${dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/[0.04] hover:bg-black/10'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              disabled={currentIndex >= paginas.length - 1}
              aria-label="Próxima página"
              title="Próxima página"
              className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 disabled:opacity-30 ${dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/[0.04] hover:bg-black/10'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div
              className="w-8 h-px my-1"
              style={{ background: `${tema.text}22` }}
            />

            <button
              onClick={() => setShowAjustes(true)}
              aria-label="Ajustes de leitura"
              title="Ajustes"
              className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 ${dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/[0.04] hover:bg-black/10'}`}
            >
              <Sliders className="w-[20px] h-[20px]" />
            </button>

            <button
              onClick={toggleNarracao}
              aria-label={speaking ? 'Parar narração' : 'Ouvir narração'}
              title={speaking ? 'Parar narração' : audioPaginaAtual ? 'Ouvir narração' : 'Narração em breve'}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 ${speaking ? 'bg-primary text-primary-foreground' : dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/[0.04] hover:bg-black/10'} ${!audioPaginaAtual && !speaking ? 'opacity-50' : ''}`}
            >
              {speaking ? <Square className="w-[18px] h-[18px]" /> : <Volume2 className="w-[20px] h-[20px]" />}
            </button>

            <button
              onClick={() => setShowBookmarks(true)}
              aria-label="Marcadores"
              title="Marcadores"
              className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 relative ${dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/[0.04] hover:bg-black/10'}`}
            >
              {isCurrentBookmarked ? (
                <BookmarkCheck className="w-[20px] h-[20px] text-primary" />
              ) : (
                <Bookmark className="w-[20px] h-[20px]" />
              )}
              {bookmarks.length > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold flex items-center justify-center">
                  {bookmarks.length}
                </span>
              )}
            </button>

            {currentPage.kind === 'content' && (currentPage.md || '').trim().length > 40 && (
              <>
                <button
                  onClick={() => setShowAssistente(true)}
                  aria-label="Assistente de leitura"
                  title="Assistente IA"
                  className="w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 shadow-lg"
                  style={{
                    background: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                    boxShadow: '0 8px 20px -6px hsl(var(--primary) / 0.5)',
                  }}
                >
                  <WandSparkles className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setShowCompartilhar(true)}
                  aria-label="Compartilhar frase"
                  title="Compartilhar"
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 ${dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/[0.04] hover:bg-black/10'}`}
                >
                  <Share2 className="w-[18px] h-[18px]" />
                </button>
              </>
            )}
          </div>

          {/* Progresso vertical */}
          <div className="mt-auto flex flex-col items-center gap-2 px-2">
            <span className="text-[10px] opacity-60 tabular-nums">p.{currentPage.ocrPage}</span>
            <div
              className={`w-1 h-24 rounded-full overflow-hidden ${dark ? 'bg-white/10' : 'bg-black/10'} relative`}
            >
              <motion.div
                className="absolute left-0 right-0 bottom-0 bg-primary rounded-full"
                animate={{ height: `${((currentIndex + 1) / paginas.length) * 100}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 30 }}
              />
            </div>
            <span className="text-[10px] opacity-60 tabular-nums">
              {currentIndex + 1}/{paginas.length}
            </span>
          </div>
        </aside>
      )}


      {/* Conteúdo */}
      <div
        className="flex-1 min-h-0 relative overflow-hidden transition-[padding] duration-300 ease-out"
        style={{
          paddingLeft:
            isDesktop && status === 'pronto' && tocItems.length > 0
              ? railExpanded
                ? 320 + 120
                : 56 + 120
              : 0,
          paddingRight:
            isDesktop && status === 'pronto' ? DESKTOP_FN_RAIL + 120 : 0,
        }}
      >

        {status === 'processando' && (
          <OcrProgressOverlay
            etapa={etapa}
            progresso={progresso}
            total={totalEtapas}
            totalPaginas={totalPaginas}
            titulo={titulo}
          />
        )}
        {status === 'pendente' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin opacity-30" />
          </div>
        )}
        {status === 'erro' && (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <p className="text-sm font-semibold">Não foi possível preparar a leitura.</p>
            <p className="text-xs opacity-60 max-w-md">{erro}</p>
          </div>
        )}
        {status === 'pronto' && currentPage && (
          <>
            <div
              className="absolute inset-0"
              style={{
                filter: prefs.brilho !== 1 ? `brightness(${prefs.brilho})` : undefined,
              }}
            >
              {isCurlMode ? (
                // Modo Folhear: StPageFlip renderiza o curl real com curvatura e sombra dinâmicas
                <LeitorFolhear
                  ref={flipRef}
                  paginas={paginas.map((p) => ({
                    index: p.index,
                    ocrPage: p.ocrPage,
                    chapterTitulo: p.chapterTitulo,
                    md: p.md,
                    cover: p.cover,
                  }))}
                  currentIndex={currentIndex}
                  onChangeIndex={(idx) => {
                    setDirection(idx > currentIndex ? 1 : -1);
                    setCurrentIndex(idx);
                  }}
                  tema={tema}
                  fonte={fonte}
                  fontSize={fontSize}
                  lineHeight={lineHeight}
                  alinhamento={prefs.alinhamento}
                />
              ) : (
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                  <motion.div
                    key={currentPage.index}
                    ref={(el) => {
                      if (el) el.scrollTop = 0;
                    }}
                    custom={direction}
                    initial={
                      prefs.pageMode === 'fade'
                        ? { opacity: 0, filter: 'blur(6px)' }
                        : prefs.pageMode === 'scroll'
                          ? { opacity: 1 }
                          : { x: direction >= 0 ? '100%' : '-100%', opacity: 0.5 }
                    }
                    animate={
                      prefs.pageMode === 'fade'
                        ? { opacity: 1, filter: 'blur(0px)' }
                        : prefs.pageMode === 'scroll'
                          ? { opacity: 1 }
                          : { x: 0, opacity: 1 }
                    }
                    exit={
                      prefs.pageMode === 'fade'
                        ? { opacity: 0, filter: 'blur(6px)' }
                        : prefs.pageMode === 'scroll'
                          ? { opacity: 1 }
                          : { x: direction >= 0 ? '-40%' : '40%', opacity: 0 }
                    }
                    transition={{
                      type: 'tween',
                      ease: [0.32, 0.72, 0, 1],
                      duration:
                        prefs.pageMode === 'scroll'
                          ? 0
                          : prefs.pageMode === 'fade'
                            ? 0.28
                            : 0.34,
                    }}
                    drag="x"
                    dragDirectionLock
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.18}
                    dragMomentum={false}
                    onDragEnd={(_, info) => {
                      const threshold = 70;
                      if (Math.abs(info.offset.x) < Math.abs(info.offset.y)) return;
                      if (info.offset.x < -threshold || info.velocity.x < -400) next();
                      else if (info.offset.x > threshold || info.velocity.x > 400) prev();
                    }}
                    onPointerDown={(e) => {
                      (e.currentTarget as any)._tap = {
                        x: e.clientX,
                        y: e.clientY,
                        t: Date.now(),
                      };
                    }}
                    onPointerUp={(e) => {
                      const start = (e.currentTarget as any)._tap;
                      if (!start) return;
                      const dx = e.clientX - start.x;
                      const dy = e.clientY - start.y;
                      const dt = Date.now() - start.t;
                      if (dt > 350) return;
                      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return;
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const rel = (e.clientX - rect.left) / rect.width;
                      const relY = (e.clientY - rect.top) / rect.height;
                      if (relY > 0.85) return;
                      if (rel < 0.25) prev();
                      else if (rel > 0.75) next();
                    }}
                    style={{
                      touchAction: 'pan-y',
                      willChange: 'transform',
                      background: tema.bg,
                    }}
                    className="absolute inset-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
                  >
                    <PaginaConteudo
                      pagina={{
                        index: currentPage.index,
                        ocrPage: currentPage.ocrPage,
                        chapterTitulo: currentPage.chapterTitulo,
                        md: currentPage.md,
                        cover: currentPage.cover,
                      }}
                      tema={tema}
                      fonte={fonte}
                      fontSize={fontSize}
                      lineHeight={lineHeight}
                      alinhamento={prefs.alinhamento}
                    />
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Overlay de tonalidade quente (âmbar) */}
              {prefs.tonalidade > 0 && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `rgba(255, 170, 60, ${prefs.tonalidade})`,
                    mixBlendMode: 'multiply',
                  }}
                />
              )}
            </div>



            {/* Tap zones removidas: navegação por toque nas laterais é feita via onPointerUp
                do container rolável para não bloquear o scroll vertical nas bordas. */}
          </>

        )}
      </div>

      {/* Menu de rodapé — some quando drawer/sheet abertos */}
      <AnimatePresence>
        {status === 'pronto' && currentPage && !menuOpen && !isDesktop && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="fixed z-[1310] inset-x-0 bottom-0 border-t shadow-2xl"
            style={{
              paddingBottom: 'var(--sai-bottom,env(safe-area-inset-bottom,0px))',
              maxWidth:
                typeof window !== 'undefined' && window.innerWidth >= 768
                  ? `min(720px, calc(100vw - ${(railExpanded ? 380 : 56) + 32}px))`
                  : undefined,
              background: dark ? '#0b0b0b' : tema.bg,
              borderColor: tema.border,
              color: tema.text,
            }}
          >

            <div className="px-5 pt-3 pb-2 flex items-center gap-3 text-[11px]">
              <span className="opacity-60 tabular-nums">
                {currentIndex + 1} / {paginas.length}
              </span>
              <div className={`flex-1 h-1 rounded-full overflow-hidden ${dark ? 'bg-white/10' : 'bg-black/10'}`}>
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: `${((currentIndex + 1) / paginas.length) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                />
              </div>
              <span className="opacity-60 tabular-nums">p.{currentPage.ocrPage}</span>
            </div>

            <div className="flex items-center justify-around px-2 pb-4 pt-2 gap-1">
              <button
                onClick={prev}
                disabled={currentIndex === 0}
                aria-label="Página anterior"
                className={`w-14 h-14 rounded-full flex items-center justify-center transition active:scale-95 disabled:opacity-30 ${dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/[0.04] hover:bg-black/10'}`}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => setShowAjustes(true)}
                aria-label="Ajustes de leitura"
                className={`w-14 h-14 rounded-full flex items-center justify-center transition active:scale-95 ${dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/[0.04] hover:bg-black/10'}`}
              >
                <Sliders className="w-[22px] h-[22px]" />
              </button>

              <button
                onClick={toggleNarracao}
                aria-label={speaking ? 'Parar narração' : 'Ouvir narração'}
                title={speaking ? 'Parar narração' : audioPaginaAtual ? 'Ouvir narração' : 'Narração em breve'}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition active:scale-95 ${speaking ? 'bg-primary text-primary-foreground' : dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/[0.04] hover:bg-black/10'} ${!audioPaginaAtual && !speaking ? 'opacity-50' : ''}`}
              >
                {speaking ? <Square className="w-[20px] h-[20px]" /> : <Volume2 className="w-[22px] h-[22px]" />}
              </button>



              <button
                onClick={() => setShowBookmarks(true)}
                aria-label="Marcadores"
                className={`w-14 h-14 rounded-full flex items-center justify-center transition active:scale-95 relative ${dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/[0.04] hover:bg-black/10'}`}
              >
                {isCurrentBookmarked ? (
                  <BookmarkCheck className="w-[22px] h-[22px] text-primary" />
                ) : (
                  <Bookmark className="w-[22px] h-[22px]" />
                )}
                {bookmarks.length > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                    {bookmarks.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowToc(true)}
                aria-label="Sumário"
                className={`w-14 h-14 rounded-full flex items-center justify-center transition active:scale-95 ${dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/[0.04] hover:bg-black/10'}`}
              >
                <List className="w-[22px] h-[22px]" />
              </button>
              <button
                onClick={next}
                disabled={currentIndex >= paginas.length - 1}
                aria-label="Próxima página"
                className={`w-14 h-14 rounded-full flex items-center justify-center transition active:scale-95 disabled:opacity-30 ${dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/[0.04] hover:bg-black/10'}`}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card retomar leitura */}
      <AnimatePresence>
        {status === 'pronto' && paginas.length > 0 && resumeOcrPage !== null && !resumeDismissed && introDismissed && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1320] bg-black/50 backdrop-blur-sm"
              onClick={() => setResumeDismissed(true)}
            />
            <div
              className="fixed inset-0 z-[1321] flex items-center justify-center px-4 pointer-events-none"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top,0px))',
                paddingBottom: 'calc(env(safe-area-inset-bottom,0px))',
              }}
            >
              <motion.div
                initial={{ y: 24, opacity: 0, scale: 0.92, filter: 'blur(12px)' }}
                animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ y: -12, opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
                transition={{ type: 'spring', stiffness: 260, damping: 24, mass: 0.9 }}
                className={`relative w-full max-w-sm rounded-[28px] p-6 pointer-events-auto overflow-hidden ${dark ? 'bg-neutral-900/95 text-white' : 'bg-white/95 text-neutral-900'}`}
                style={{
                  boxShadow: dark
                    ? '0 30px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)'
                    : '0 30px 80px -20px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)',
                }}
              >
                {/* Glow ambiente animado */}
                <motion.div
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.35, 0.6, 0.35] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full"
                  style={{ background: 'radial-gradient(circle, hsl(var(--primary)/0.35), transparent 70%)' }}
                />

              {(() => {
                // Resolve alvo
                let targetIdx = 0;
                let targetPage: Pagina | undefined;
                if (resumeOcrPage < 0) {
                  const legacyIdx = Math.min(-resumeOcrPage, paginas.length - 1);
                  targetIdx = legacyIdx;
                  targetPage = paginas[legacyIdx];
                } else {
                  let bestDiff = Infinity;
                  paginas.forEach((p, i) => {
                    const d = Math.abs(p.ocrPage - resumeOcrPage);
                    if (d < bestDiff) {
                      bestDiff = d;
                      targetIdx = i;
                      targetPage = p;
                    }
                  });
                }
                return (
                  <div className="relative">
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="flex items-center gap-3 mb-5"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.08, type: 'spring', stiffness: 380, damping: 18 }}
                        className={`w-11 h-11 rounded-full flex items-center justify-center ${dark ? 'bg-primary/15' : 'bg-primary/10'}`}
                      >
                        <BookmarkCheck className="w-5 h-5 text-primary" />
                      </motion.div>
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-widest opacity-60">Bem-vindo de volta</p>
                        <p className="text-sm font-medium truncate">
                          {targetPage ? `${targetPage.chapterTitulo} · pág. ${targetPage.ocrPage}` : 'Continuar leitura'}
                        </p>
                      </div>
                    </motion.div>
                    <motion.button
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.22, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => {
                        setDirection(1);
                        setCurrentIndex(targetIdx);
                        setResumeDismissed(true);
                      }}
                      className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg shadow-primary/30"
                    >
                      Continuar leitura
                    </motion.button>
                    <motion.button
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.32, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => {
                        setDirection(-1);
                        setCurrentIndex(0);
                        setResumeDismissed(true);
                      }}
                      className={`w-full h-11 mt-2 rounded-xl text-sm font-medium transition active:scale-[0.98] ${dark ? 'text-white/70 hover:text-white hover:bg-white/[0.06]' : 'text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.04]'}`}
                    >
                      Começar do início
                    </motion.button>
                  </div>
                );
              })()}
              </motion.div>
            </div>
          </>

        )}
      </AnimatePresence>

      {/* Sumário — drawer mobile em tela cheia */}
      <AnimatePresence>
        {showToc && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1322] md:hidden"
              onClick={() => setShowToc(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed top-0 right-0 bottom-0 w-[90%] max-w-sm z-[1323] md:hidden shadow-2xl flex flex-col"
              style={{ background: tema.bg, color: tema.text, paddingTop: 'var(--sai-top,env(safe-area-inset-top,0px))' }}
            >
              <div className="px-4 h-14 flex items-center gap-3 border-b border-current/10 shrink-0">
                <p className="text-sm font-semibold flex-1">Sumário</p>
                <button
                  onClick={() => setShowToc(false)}
                  aria-label="Fechar sumário"
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/[0.04] hover:bg-black/10'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {tocItems.length === 0 && (
                  <p className="text-xs opacity-60 px-2 py-4">Este livro não tem sumário detectado.</p>
                )}
                {tocItems.map((s: any, idx) => {
                  const active = currentPage && s.chapterIdx === currentPage.chapterIdx;
                  const onClick =
                    typeof s.chapterIdx === 'number' && capitulos.length
                      ? () => jumpToChapter(s.chapterIdx)
                      : () => jumpToOcrPage(s.ocrPage);
                  return (
                    <button
                      key={idx}
                      onClick={onClick}
                      className={`w-full text-left px-3 py-3 rounded-lg transition text-sm ${active ? (dark ? 'bg-primary/20 text-primary' : 'bg-primary/15 text-primary') : (dark ? 'hover:bg-white/5' : 'hover:bg-black/5')}`}
                      style={{ paddingLeft: 12 + (s.nivel - 1) * 14 }}
                    >
                      <span className="opacity-90">{s.titulo}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bookmarks — bottom sheet */}
      <AnimatePresence>
        {showBookmarks && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1324]"
              onClick={() => setShowBookmarks(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-[1325] rounded-t-3xl shadow-2xl flex flex-col max-h-[80vh]"
              style={{ background: tema.bg, color: tema.text, paddingBottom: 'var(--sai-bottom,env(safe-area-inset-bottom,0px))' }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className={`w-10 h-1 rounded-full ${dark ? 'bg-white/20' : 'bg-black/20'}`} />
              </div>
              <div className="px-5 pt-2 pb-3 flex items-center gap-3">
                <p className="text-base font-semibold flex-1">Marcadores</p>
                <button
                  onClick={() => setShowBookmarks(false)}
                  aria-label="Fechar marcadores"
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/[0.04] hover:bg-black/10'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-5 pb-3">
                <button
                  onClick={toggleCurrentBookmark}
                  className={`w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg ${isCurrentBookmarked ? (dark ? 'bg-white/10 text-[#e8e2d4]' : 'bg-black/5 text-[#2a2418]') : 'bg-primary text-primary-foreground shadow-primary/20'}`}
                >
                  {isCurrentBookmarked ? (
                    <>
                      <Trash2 className="w-5 h-5" />
                      Remover marcador desta página
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Marcar esta página
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
                {bookmarks.length === 0 && (
                  <p className="text-xs opacity-60 px-4 py-6 text-center">
                    Nenhuma página marcada ainda. Toque em "Marcar esta página" para começar.
                  </p>
                )}
                {bookmarks.map((b) => (
                  <div
                    key={b.ocrPage}
                    className={`flex items-center gap-2 rounded-2xl p-3 ${dark ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.03]'}`}
                  >
                    <button
                      onClick={() => {
                        jumpToOcrPage(b.ocrPage);
                        setShowBookmarks(false);
                      }}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-sm font-medium truncate">{b.chapterTitulo}</p>
                      <p className="text-[11px] opacity-60 mt-0.5">Página {b.ocrPage}</p>
                    </button>
                    <button
                      onClick={() => removeBookmark(b.ocrPage)}
                      aria-label={`Remover marcador da página ${b.ocrPage}`}
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${dark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-black/[0.04] hover:bg-black/10'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Painel flutuante de Ajustes (Temas · Texto · Brilho · Página · Busca) */}
      <AjustesPanel
        open={showAjustes}
        onClose={() => setShowAjustes(false)}
        prefs={prefs}
        tema={tema}
        update={update}
        paginas={paginas.map((p) => ({
          index: p.index,
          ocrPage: p.ocrPage,
          chapterTitulo: p.chapterTitulo,
          md: p.md,
        }))}
        onJumpPage={(idx) => {
          setDirection(idx > currentIndex ? 1 : -1);
          setCurrentIndex(idx);
        }}
        onHighlight={setHighlightTerm}
      />

      {/* FAB — Assistente de IA para a página atual */}
      {!isDesktop && status === 'pronto' && currentPage && currentPage.kind === 'content' && (currentPage.md || '').trim().length > 40 && !menuOpen && !showAssistente && (
        <motion.button
          key="assistente-fab"
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.2 }}
          onClick={() => setShowAssistente(true)}
          aria-label="Assistente de leitura"
          className="fixed z-[1310] w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition group"
          style={{
            right: 'calc(env(safe-area-inset-right, 0px) + 18px)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 148px)',
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            boxShadow:
              '0 12px 32px -8px hsl(var(--primary) / 0.55), 0 4px 12px -2px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}
        >
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{ background: 'hsl(var(--primary))', opacity: 0.35 }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          />
          <WandSparkles className="w-6 h-6 relative" />
        </motion.button>
      )}

      {/* FAB — Compartilhar frase */}
      {!isDesktop && status === 'pronto' && currentPage && currentPage.kind === 'content' && (currentPage.md || '').trim().length > 40 && !menuOpen && !showAssistente && !showCompartilhar && (
        <motion.button
          key="compartilhar-fab"
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.28 }}
          onClick={() => setShowCompartilhar(true)}
          aria-label="Compartilhar frase"
          className="fixed z-[1310] w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition"
          style={{
            right: 'calc(env(safe-area-inset-right, 0px) + 20px)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 220px)',
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
            boxShadow: '0 8px 24px -6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <Share2 className="w-5 h-5" />
        </motion.button>
      )}

      {/* Painel do Assistente de IA */}
      {currentPage && (
        <AssistenteIA
          open={showAssistente}
          onClose={() => setShowAssistente(false)}
          paginaMd={currentPage.md || ''}
          livroTitulo={titulo}
          capituloTitulo={currentPage.chapterTitulo || titulo}
          paginaNum={currentPage.ocrPage}
          livroId={`${livroTabela}:${livroId}`}
          tema={tema}
          fonteFamily={fonte.family}
        />
      )}

      {/* Painel de Compartilhar */}
      {currentPage && (
        <CompartilharFrase
          open={showCompartilhar}
          onClose={() => setShowCompartilhar(false)}
          paginaMd={currentPage.md || ''}
          livroTitulo={titulo}
          autor={autor}
          capa={capa}
          capituloTitulo={currentPage.chapterTitulo || titulo}
          paginaNum={currentPage.ocrPage}
          livroTabela={livroTabela}
          livroId={livroId}
          tema={tema}
        />

      )}

      {/* Introdução do livro (capa + ficha + sumário) */}
      <AnimatePresence>
        {status === 'pronto' && paginas.length > 0 && !introDismissed && (
          <IntroLivro
            titulo={titulo}
            autor={autor}
            ano={ano}
            editora={editora}
            sobre={sobre}
            curiosidades={curiosidades}
            capa={capa}
            totalPaginas={totalPaginas}
            tocItems={tocItems.map((s: any) => {
              const ocrPage =
                typeof s.chapterIdx === 'number' && capitulos.length
                  ? paginas.find((p) => p.chapterIdx === s.chapterIdx)?.ocrPage
                  : s.ocrPage;
              return { titulo: s.titulo, ocrPage, chapterIdx: s.chapterIdx };
            })}
            tema={tema}
            onStart={() => setIntroDismissed(true)}
            onSkip={() => setIntroDismissed(true)}
          />
        )}
      </AnimatePresence>

      {/* Banner de Preview (5 páginas) */}
      {isPreview && status === 'pronto' && (
        <div className="absolute bottom-4 left-4 right-4 bg-primary/95 backdrop-blur-md rounded-2xl p-4 text-primary-foreground shadow-2xl border border-primary-foreground/20 text-center animate-in fade-in slide-in-from-bottom-4 z-[9999]">
          <p className="font-bold text-sm mb-1">Prévia do livro (5 págs)</p>
          <p className="text-xs opacity-90 mb-3">Assine o Premium para liberar a leitura completa deste livro e de todo o acervo.</p>
          <button
            onClick={() => {
              onClose();
              window.location.href = '/assinatura';
            }}
            className="w-full py-2.5 bg-background text-foreground rounded-xl text-sm font-bold active:scale-95 transition-transform"
          >
            Assinar Premium
          </button>
        </div>
      )}
    </div>

  );

  return typeof document === 'undefined' ? reader : createPortal(reader, document.body);
};

export default LeitorNativo;

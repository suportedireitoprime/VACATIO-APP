import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  type GrifoHighlight,
  readLocalArtigoGrifos,
  loadArtigoGrifosRemote,
  saveArtigoGrifos,
  ARTIGOS_GRIFOS_EVENT,
} from '@/lib/artigosGrifos';

export interface Highlight extends GrifoHighlight {}

export const HIGHLIGHT_COLORS = [
  { name: 'Amarelo (Conceito)', value: 'rgba(250, 204, 21, 0.42)', css: 'bg-yellow-400/40' },
  { name: 'Verde (Prazo)', value: 'rgba(74, 222, 128, 0.42)', css: 'bg-green-400/40' },
  { name: 'Azul (Requisito)', value: 'rgba(96, 165, 250, 0.42)', css: 'bg-blue-400/40' },
  { name: 'Vermelho (Atenção/Proibição)', value: 'rgba(248, 113, 113, 0.42)', css: 'bg-red-400/40' },
  { name: 'Roxo (Exceção)', value: 'rgba(167, 139, 250, 0.42)', css: 'bg-purple-400/40' },
  { name: 'Rosa (Importante)', value: 'rgba(244, 114, 182, 0.42)', css: 'bg-pink-400/40' },
  { name: 'Laranja (Dúvida)', value: 'rgba(251, 146, 60, 0.42)', css: 'bg-orange-400/40' },
];

export interface UseHighlightsOptions {
  artigoId?: string | null;
  tabelaNome?: string | null;
  numeroArtigo?: string | null;
  magicHighlights?: any[];
}

export function useHighlights(optionsOrArtigoId: string | null | UseHighlightsOptions) {
  const options: UseHighlightsOptions = typeof optionsOrArtigoId === 'string' || optionsOrArtigoId === null
    ? { artigoId: optionsOrArtigoId }
    : (optionsOrArtigoId || {});

  const artigoId = options.artigoId || null;
  const tabelaNome = options.tabelaNome || null;
  const numeroArtigo = options.numeroArtigo || null;
  const magicHighlightsRef = useRef<any[]>(options.magicHighlights || []);
  magicHighlightsRef.current = options.magicHighlights || [];

  const [highlights, setHighlights] = useState<Highlight[]>(() => {
    const local = readLocalArtigoGrifos(tabelaNome, numeroArtigo, artigoId);
    return local.filter((h) => h.origem !== 'ia');
  });

  const [highlightMode, setHighlightMode] = useState(false);
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Carrega local de imediato e reidrata remoto do Supabase
  useEffect(() => {
    let cancelled = false;

    // Leitura local síncrona imediata
    const local = readLocalArtigoGrifos(tabelaNome, numeroArtigo, artigoId);
    const manualOnly = local.filter((h) => h.origem !== 'ia');
    setHighlights(manualOnly);

    // Reidratação remota do Supabase (artigos_grifos)
    if (tabelaNome && numeroArtigo) {
      loadArtigoGrifosRemote(tabelaNome, numeroArtigo).then((remote) => {
        if (!cancelled && remote.length > 0) {
          const remoteManual = remote.filter((h) => h.origem !== 'ia');
          if (remoteManual.length > 0) {
            setHighlights(remoteManual);
          }
        }
      }).catch(() => {});
    }

    return () => { cancelled = true; };
  }, [artigoId, tabelaNome, numeroArtigo]);

  // 2. Escuta eventos de atualização de grifos
  useEffect(() => {
    if (!tabelaNome || !numeroArtigo) return;
    const handleChanged = (e: any) => {
      const detail = e?.detail;
      if (detail && detail.tabela_codigo === tabelaNome && detail.numero_artigo === numeroArtigo) {
        const local = readLocalArtigoGrifos(tabelaNome, numeroArtigo, artigoId);
        setHighlights(local.filter((h) => h.origem !== 'ia'));
      }
    };
    window.addEventListener(ARTIGOS_GRIFOS_EVENT, handleChanged);
    return () => window.removeEventListener(ARTIGOS_GRIFOS_EVENT, handleChanged);
  }, [tabelaNome, numeroArtigo, artigoId]);

  // 3. Salva no Supabase (artigos_grifos) em tempo real + espelho local
  const persist = useCallback((manualList: Highlight[]) => {
    const formattedManual: Highlight[] = manualList.map((h) => ({
      ...h,
      origem: h.origem || 'manual',
      createdAt: h.createdAt || Date.now(),
    }));

    // Se soubermos a tabela e o número, unificamos com os grifos mágicos atuais
    if (tabelaNome && numeroArtigo) {
      // Grifos mágicos existentes
      const currentMagic = (magicHighlightsRef.current || []).map((g: any, i: number) => ({
        id: g.id || `ia_${g.cor || 'amarelo'}_${i}`,
        text: g.trechoExato || g.text || '',
        trechoExato: g.trechoExato || g.text || '',
        color: g.color || g.cor || 'rgba(234, 179, 8, 0.55)',
        cor: g.color || g.cor || 'rgba(234, 179, 8, 0.55)',
        corNome: g.corNome || g.cor || 'amarelo',
        categoria: g.categoria || 'Grifo IA',
        comment: g.comment || g.explicacao || '',
        explicacao: g.explicacao || '',
        hierarquia: g.hierarquia || '',
        origem: 'ia' as const,
        lineIndex: -1,
        startOffset: 0,
        endOffset: (g.trechoExato || g.text || '').length,
        createdAt: Date.now() + i,
      }));

      const combined = [...formattedManual, ...currentMagic];

      void saveArtigoGrifos({
        tabela_codigo: tabelaNome,
        numero_artigo: numeroArtigo,
        highlights: combined,
        legacyId: artigoId,
      });
    } else if (artigoId) {
      try {
        localStorage.setItem(`highlights_${artigoId}`, JSON.stringify(formattedManual));
      } catch {}
    }

    // Compatibilidade legado com user_preferences
    if (artigoId) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) return;
        supabase
          .from('user_preferences')
          .select('highlights')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data }) => {
            const allHighlights = (data?.highlights as Record<string, any>) || {};
            allHighlights[artigoId] = formattedManual;
            supabase
              .from('user_preferences')
              .update({ highlights: allHighlights, updated_at: new Date().toISOString() })
              .eq('user_id', session.user.id)
              .then(() => {});
          });
      }).catch(() => {});
    }
  }, [artigoId, tabelaNome, numeroArtigo]);

  const addHighlight = useCallback((): string | null => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;

    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (!text) return null;

    // Find the paragraph with data-line-index
    let node: Node | null = range.startContainer;
    let lineEl: HTMLElement | null = null;
    while (node) {
      if (node instanceof HTMLElement && node.dataset.lineIndex !== undefined) {
        lineEl = node;
        break;
      }
      node = node.parentElement;
    }
    if (!lineEl) { sel.removeAllRanges(); return null; }

    const lineIndex = parseInt(lineEl.dataset.lineIndex!, 10);
    const fullText = lineEl.textContent || '';
    const preRange = document.createRange();
    preRange.selectNodeContents(lineEl);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preRange.toString().length;
    const endOffset = startOffset + text.length;

    if (startOffset >= endOffset || endOffset > fullText.length) {
      sel.removeAllRanges();
      return null;
    }

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newHighlight: Highlight = {
      id,
      lineIndex,
      startOffset,
      endOffset,
      text,
      color: selectedColor,
      origem: 'manual',
      createdAt: Date.now(),
    };

    const nonOverlapping = highlights.filter(h => {
      if (h.lineIndex !== lineIndex) return true;
      const overlaps = h.startOffset < endOffset && h.endOffset > startOffset;
      return !overlaps;
    });
    const updated = [...nonOverlapping, newHighlight];
    setHighlights(updated);
    persist(updated);
    sel.removeAllRanges();
    return id;
  }, [highlights, selectedColor, persist]);

  const addHighlightAtOffsets = useCallback((lineIndex: number, startOffset: number, endOffset: number, text: string, color?: string): string | null => {
    if (startOffset >= endOffset) return null;
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newHighlight: Highlight = {
      id,
      lineIndex,
      startOffset,
      endOffset,
      text,
      color: color || selectedColor,
      origem: 'manual',
      createdAt: Date.now(),
    };
    const nonOverlapping = highlights.filter(h => {
      if (h.lineIndex !== lineIndex) return true;
      const overlaps = h.startOffset < endOffset && h.endOffset > startOffset;
      return !overlaps;
    });
    const updated = [...nonOverlapping, newHighlight];
    setHighlights(updated);
    persist(updated);
    return id;
  }, [highlights, selectedColor, persist]);

  const removeHighlight = useCallback((id: string) => {
    const updated = highlights.filter(h => h.id !== id);
    setHighlights(updated);
    persist(updated);
  }, [highlights, persist]);

  const removeHighlightsByColor = useCallback((color: string) => {
    const updated = highlights.filter(h => h.color !== color);
    setHighlights(updated);
    persist(updated);
  }, [highlights, persist]);

  const updateHighlightComment = useCallback((id: string, comment: string) => {
    const updated = highlights.map(h => h.id === id ? { ...h, comment } : h);
    setHighlights(updated);
    persist(updated);
  }, [highlights, persist]);

  const updateHighlightTags = useCallback((id: string, tags: string[]) => {
    const updated = highlights.map(h => h.id === id ? { ...h, tags } : h);
    setHighlights(updated);
    persist(updated);
  }, [highlights, persist]);

  const updateHighlight = useCallback((id: string, patch: Partial<Highlight>) => {
    const updated = highlights.map(h => h.id === id ? { ...h, ...patch } : h);
    setHighlights(updated);
    persist(updated);
  }, [highlights, persist]);

  const clearAll = useCallback(() => {
    setHighlights([]);
    persist([]);
  }, [persist]);

  const toggleMode = useCallback(() => {
    setHighlightMode(prev => !prev);
  }, []);

  const getLineHighlights = useCallback((lineIndex: number) => {
    return highlights.filter(h => h.lineIndex === lineIndex);
  }, [highlights]);

  const getHighlightsWithComments = useCallback(() => {
    return highlights.filter(h => h.comment && h.comment.trim().length > 0);
  }, [highlights]);

  return {
    highlights,
    highlightMode,
    selectedColor,
    containerRef,
    setSelectedColor,
    toggleMode,
    addHighlight,
    addHighlightAtOffsets,
    removeHighlight,
    removeHighlightsByColor,
    updateHighlightComment,
    updateHighlightTags,
    updateHighlight,
    clearAll,
    getLineHighlights,
    getHighlightsWithComments,
  };
}

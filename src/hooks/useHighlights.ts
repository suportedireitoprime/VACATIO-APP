import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Highlight {
  id: string;
  lineIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  color: string;
  comment?: string;
  tags?: string[];
}

export const HIGHLIGHT_COLORS = [
  { name: 'Amarelo', value: 'rgba(250, 204, 21, 0.42)', css: 'bg-yellow-400/40' },
  { name: 'Verde', value: 'rgba(74, 222, 128, 0.42)', css: 'bg-green-400/40' },
  { name: 'Azul', value: 'rgba(96, 165, 250, 0.42)', css: 'bg-blue-400/40' },
  { name: 'Rosa', value: 'rgba(244, 114, 182, 0.42)', css: 'bg-pink-400/40' },
  { name: 'Laranja', value: 'rgba(251, 146, 60, 0.42)', css: 'bg-orange-400/40' },
];


function storageKey(artigoId: string) {
  return `highlights_${artigoId}`;
}

export function useHighlights(artigoId: string | null) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightMode, setHighlightMode] = useState(false);
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load from localStorage
  useEffect(() => {
    if (!artigoId) return;
    try {
      const stored = localStorage.getItem(storageKey(artigoId));
      if (stored) setHighlights(JSON.parse(stored));
      else setHighlights([]);
    } catch { setHighlights([]); }
  }, [artigoId]);

  // Save to localStorage
  const persist = useCallback((h: Highlight[]) => {
    if (!artigoId) return;
    localStorage.setItem(storageKey(artigoId), JSON.stringify(h));
    // Sync to Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase
        .from('user_preferences')
        .select('highlights')
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => {
          const allHighlights = (data?.highlights as Record<string, any>) || {};
          allHighlights[artigoId] = h;
          supabase
            .from('user_preferences')
            .update({ highlights: allHighlights, updated_at: new Date().toISOString() })
            .eq('user_id', session.user.id)
            .then(() => {});
        });
    });
  }, [artigoId]);

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
    };

    // Remove any existing highlights on this line that overlap the new range
    // (prevents duplicate/broken rendering when applying a new color over an existing one)
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

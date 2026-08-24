import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import PaginaConteudo, { type PaginaData } from './PaginaConteudo';
import type { Tema } from '@/hooks/useLeitorPrefs';

export interface LeitorFolhearHandle {
  flipNext: () => void;
  flipPrev: () => void;
  flip: (index: number) => void;
}

interface Props {
  paginas: PaginaData[];
  currentIndex: number;
  onChangeIndex: (idx: number) => void;
  tema: Tema;
  fonte: { family: string };
  fontSize: number;
  lineHeight: number;
  alinhamento: 'justify' | 'left';
}

/**
 * Leitor com folhear realista (StPageFlip / react-pageflip).
 * Substitui a animação de rotateY do Framer Motion quando o usuário
 * seleciona o modo "Folhear" nos ajustes.
 *
 * A StPageFlip renderiza o curl com curvatura e sombra dinâmicas —
 * chega o mais perto possível do iBooks dentro de um WebView.
 */
const LeitorFolhear = forwardRef<LeitorFolhearHandle, Props>(function LeitorFolhear(
  { paginas, currentIndex, onChangeIndex, tema, fonte, fontSize, lineHeight, alinhamento },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<any>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  // Mede o container com ResizeObserver para dar dimensões estáveis ao FlipBook
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      setDims((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sincroniza flip externo (botões, taps, TOC) com a lib
  useEffect(() => {
    const pf = bookRef.current?.pageFlip?.();
    if (!pf) return;
    if (typeof pf.getCurrentPageIndex === 'function') {
      if (pf.getCurrentPageIndex() !== currentIndex) {
        try {
          pf.turnToPage(currentIndex);
        } catch {}
      }
    }
  }, [currentIndex]);

  useImperativeHandle(ref, () => ({
    flipNext: () => {
      try { bookRef.current?.pageFlip?.().flipNext(); } catch {}
    },
    flipPrev: () => {
      try { bookRef.current?.pageFlip?.().flipPrev(); } catch {}
    },
    flip: (index: number) => {
      try { bookRef.current?.pageFlip?.().turnToPage(index); } catch {}
    },
  }));

  const isMobilePage = !!dims && dims.w < 640;
  // O StPageFlip só entra em página única quando a largura do bloco é menor
  // que minWidth * 2. Usar metade da largura ainda permitia spread em alguns
  // WebViews por arredondamento; usar a largura útil força 1 página por vez.
  const singlePageMinWidth = dims ? Math.max(240, dims.w) : 240;

  return (
    <div
      ref={containerRef}
      data-reader-flip
      className="absolute inset-0 w-full h-full min-w-0 overflow-hidden"
      style={{ background: tema.bg }}
    >
      {dims && paginas.length > 0 && (
        <HTMLFlipBook
          key={`${dims.w}x${dims.h}-${isMobilePage ? 'mobile' : 'wide'}`}
          ref={bookRef}
          width={dims.w}
          height={dims.h}
          size="stretch"
          minWidth={isMobilePage ? singlePageMinWidth : 240}
          maxWidth={dims.w}
          minHeight={1}
          maxHeight={dims.h}
          maxShadowOpacity={0.5}
          drawShadow
          flippingTime={700}
          usePortrait
          startPage={currentIndex}
          showCover={false}
          mobileScrollSupport
          swipeDistance={30}
          clickEventForward
          useMouseEvents
          autoSize={false}
          startZIndex={0}
          showPageCorners={false}
          disableFlipByClick={true}
          style={{ width: dims.w, height: dims.h }}
          className="reader-flipbook"
          onFlip={(e: any) => {
            if (typeof e?.data === 'number' && e.data !== currentIndex) {
              onChangeIndex(e.data);
            }
          }}
        >
          {paginas.map((p) => {
            // Em telas estreitas, justificar quebra o texto em colunas muito
            // magras — força alinhamento à esquerda para leitura confortável.
            const alinhamentoEfetivo =
              dims.w < 520 ? 'left' : alinhamento;
            return (
              <div
                key={p.index}
                className="w-full h-full min-w-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
                style={{ background: tema.bg, color: tema.text }}
              >
                <PaginaConteudo
                  pagina={p}
                  tema={tema}
                  fonte={fonte}
                  fontSize={fontSize}
                  lineHeight={lineHeight}
                  alinhamento={alinhamentoEfetivo}
                  compact={isMobilePage ? 'mobile-flip' : true}
                />
              </div>
            );
          })}
        </HTMLFlipBook>
      )}
    </div>
  );
});

export default LeitorFolhear;

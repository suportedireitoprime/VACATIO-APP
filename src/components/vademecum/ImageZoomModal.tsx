import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';
import { haptic } from '@/lib/nativeHaptics';

interface ImageZoomModalProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export default function ImageZoomModal({ src, alt, onClose }: ImageZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const posStartRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const lastTapRef = useRef(0);

  // Fecha com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Trava scroll da tela enquanto o modal de zoom estiver aberto
  useEffect(() => {
    if (!src) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [src]);

  const resetZoom = useCallback(() => {
    haptic.selection();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    haptic.selection();
    setScale((s) => Math.min(5, s + 0.5));
  }, []);

  const zoomOut = useCallback(() => {
    haptic.selection();
    setScale((s) => {
      const next = Math.max(1, s - 0.5);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Double tap / double click para alternar entre 1x e 2.5x
  const handleDoubleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      haptic.light();
      if (scale > 1) {
        resetZoom();
      } else {
        setScale(2.5);
      }
    },
    [scale, resetZoom]
  );

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { ...position };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPosition({
      x: posStartRef.current.x + dx,
      y: posStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.003;
    setScale((curr) => {
      const next = Math.min(5, Math.max(1, curr + delta));
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  // Touch: Suporte a Pinça (Pinch-to-zoom) e Arrastar
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Início do gesto de pinça
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      // Detecção de duplo toque
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        handleDoubleTap(e);
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      if (scale > 1) {
        setIsDragging(true);
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        posStartRef.current = { ...position };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      // Pinça em andamento
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / pinchStartDistRef.current;
      const nextScale = Math.min(5, Math.max(1, pinchStartScaleRef.current * ratio));
      setScale(nextScale);
      if (nextScale === 1) setPosition({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging) {
      // Arrastando com 1 dedo com zoom ativo
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPosition({
        x: posStartRef.current.x + dx,
        y: posStartRef.current.y + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
    setIsDragging(false);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between select-none touch-none"
          onClick={(e) => {
            if (e.target === e.currentTarget && scale === 1) onClose();
          }}
        >
          {/* Barra Superior de Controles */}
          <div className="w-full flex items-center justify-between p-4 z-20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-white/10 text-white/90 border border-white/10">
                {scale.toFixed(1)}x
              </span>
              {alt && (
                <span className="text-xs text-white/70 truncate max-w-[200px] sm:max-w-md hidden sm:inline">
                  {alt}
                </span>
              )}
            </div>

            {/* Ações de Zoom e Fechar */}
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/15">
              <button
                type="button"
                onClick={zoomOut}
                disabled={scale <= 1}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Diminuir zoom"
                aria-label="Diminuir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={resetZoom}
                disabled={scale === 1 && position.x === 0 && position.y === 0}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Redefinir zoom"
                aria-label="Redefinir zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={zoomIn}
                disabled={scale >= 5}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Aumentar zoom"
                aria-label="Aumentar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="w-px h-4 bg-white/20 mx-0.5" />

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-rose-500/80 hover:bg-rose-500 transition-colors cursor-pointer"
                title="Fechar"
                aria-label="Fechar visualizador"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Área Central Interativa com a Imagem */}
          <div
            className="flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <motion.img
              src={src}
              alt={alt || 'Visualização ampliada'}
              draggable={false}
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
              className="max-h-[82vh] max-w-[94vw] object-contain rounded-xl shadow-2xl pointer-events-auto"
            />
          </div>

          {/* Barra Inferior com Dica de Uso */}
          <div className="w-full flex items-center justify-center p-3 z-20 pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-white/80">
              <Move className="w-3.5 h-3.5 text-primary" />
              <span>
                {scale > 1 ? 'Arraste para navegar na imagem' : 'Toque duas vezes ou use pinça para dar zoom'}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

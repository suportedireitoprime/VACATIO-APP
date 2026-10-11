import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { haptic } from '@/lib/nativeHaptics';

export interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  src?: string | null;
  alt?: string;
  title?: string;
  subtitle?: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.5;

/**
 * ImageLightboxModal - Visualizador Universal de Imagens em Tela Cheia com Zoom Tátil
 * 
 * Atende ao Item 64 do Relatório Técnico:
 * 1. Pinch-to-zoom tátil para estudo de mapas mentais, fluxogramas, esquemas e capas em alta resolução.
 * 2. Arrastar/Panorâmica suave com limites de borda quando ampliado.
 * 3. Double-tap no mobile para alternar entre 1x e 2.5x.
 * 4. Roda do mouse (wheel) e atalhos de teclado (+, -, 0, Esc) no Desktop.
 * 5. Safe Area Insets (Android 15 / iOS 18) e feedback tátil nativo (Haptics).
 */
export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  src,
  alt = 'Imagem ampliada',
  title,
  subtitle,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const lastTouchTime = useRef<number>(0);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  useBodyScrollLock(isOpen);

  // Reset de zoom ao abrir/fechar ou trocar de imagem
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      haptic.light();
    }
  }, [isOpen, src]);

  // Fechamento e zoom via atalhos de teclado (Desktop)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const zoomIn = useCallback(() => {
    setScale((prev) => {
      const next = Math.min(MAX_ZOOM, prev + ZOOM_STEP);
      haptic.selection();
      return next;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(MIN_ZOOM, prev - ZOOM_STEP);
      if (next === MIN_ZOOM) setPosition({ x: 0, y: 0 });
      haptic.selection();
      return next;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    haptic.light();
  }, []);

  // Zoom via roda do mouse (Desktop)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(MAX_ZOOM, prev + 0.25));
    } else {
      setScale((prev) => {
        const next = Math.max(MIN_ZOOM, prev - 0.25);
        if (next === MIN_ZOOM) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Touch handlers para Pinch-to-Zoom e Double-Tap
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Início do pinch
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchRef.current = { dist, scale };
    } else if (e.touches.length === 1) {
      // Detecção de double tap
      const now = Date.now();
      if (now - lastTouchTime.current < 300) {
        if (scale > 1) {
          resetZoom();
        } else {
          setScale(2.5);
          haptic.selection();
        }
        lastTouchTime.current = 0;
        return;
      }
      lastTouchTime.current = now;

      // Início do drag / pan
      if (scale > 1) {
        setIsDragging(true);
        dragStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          posX: position.x,
          posY: position.y,
        };
      }
    }
  };

  // Fase 25: Limite físico de movimentação (Boundary Clamping) proporcional ao zoom atual
  const clampPosition = useCallback((posX: number, posY: number, currentScale: number) => {
    if (!containerRef.current || currentScale <= 1) {
      return { x: 0, y: 0 };
    }
    const container = containerRef.current;
    const maxPanX = Math.max(0, (container.clientWidth * (currentScale - 1)) / 2);
    const maxPanY = Math.max(0, (container.clientHeight * (currentScale - 1)) / 2);

    return {
      x: Math.min(maxPanX, Math.max(-maxPanX, posX)),
      y: Math.min(maxPanY, Math.max(-maxPanY, posY)),
    };
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      // Executa pinch-to-zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / pinchRef.current.dist;
      const nextScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchRef.current.scale * ratio));
      setScale(nextScale);
      setPosition((prev) => clampPosition(prev.x, prev.y, nextScale));
    } else if (e.touches.length === 1 && isDragging && dragStartRef.current && scale > 1) {
      // Pan com limites de rolagem
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      const clamped = clampPosition(
        dragStartRef.current.posX + dx,
        dragStartRef.current.posY + dy,
        scale
      );
      setPosition(clamped);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
      dragStartRef.current = null;
    }
  };

  // Mouse drag para pan no desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && dragStartRef.current && scale > 1) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const clamped = clampPosition(
        dragStartRef.current.posX + dx,
        dragStartRef.current.posY + dy,
        scale
      );
      setPosition(clamped);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="lightbox-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] bg-black/95 flex flex-col select-none overflow-hidden"
      >
        {/* Barra superior de controle com Safe Area Inset */}
        <header className="relative z-20 flex items-center justify-between px-4 pt-[calc(0.75rem+var(--sai-top,env(safe-area-inset-top,0px)))] pb-3 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex-1 min-w-0 pr-3">
            {title && (
              <h3 className="text-sm font-semibold text-white truncate drop-shadow-sm">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-zinc-400 truncate">
                {subtitle}
              </p>
            )}
          </div>

          {/* Ferramentas de Zoom */}
          <div className="flex items-center gap-1 bg-zinc-900/90 border border-white/10 rounded-full p-1 shadow-lg backdrop-blur-md">
            <button
              onClick={zoomOut}
              disabled={scale <= MIN_ZOOM}
              aria-label="Diminuir zoom"
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetZoom}
              aria-label="Restaurar tamanho original"
              className="px-2 h-8 rounded-full text-xs font-mono font-medium text-amber-400 hover:bg-white/10 transition-colors flex items-center gap-1"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={zoomIn}
              disabled={scale >= MAX_ZOOM}
              aria-label="Aumentar zoom"
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Botão Fechar */}
          <button
            onClick={() => {
              haptic.light();
              onClose();
            }}
            aria-label="Fechar visualizador"
            className="ml-3 w-10 h-10 rounded-full bg-zinc-900/90 border border-white/10 flex items-center justify-center text-white hover:bg-zinc-800 transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Área Central de Visualização e Gestos */}
        <main
          ref={containerRef}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden touch-none cursor-grab active:cursor-grabbing"
        >
          {src ? (
            <motion.div
              animate={{
                scale,
                x: position.x,
                y: position.y,
              }}
              transition={{
                type: isDragging ? 'tween' : 'spring',
                stiffness: 300,
                damping: 25,
                duration: isDragging ? 0 : undefined,
              }}
              className="relative max-w-full max-h-full flex items-center justify-center"
            >
              <img
                src={src}
                alt={alt}
                draggable={false}
                className="max-w-[95vw] max-h-[80vh] object-contain rounded-lg shadow-2xl pointer-events-none select-none"
              />
            </motion.div>
          ) : (
            <div className="text-sm text-zinc-500">Imagem indisponível</div>
          )}
        </main>

        {/* Rodapé com Dica de Uso */}
        <footer className="relative z-20 text-center pb-[calc(0.75rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] pt-2 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-[11px] text-zinc-400">
            Dica: dê dois toques rápidos para aproximar ou use dois dedos para zoom contínuo.
          </p>
        </footer>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

import React, { useRef, useEffect } from 'react';
import { App } from '@capacitor/app';
import './ShapeGrid.css';

interface ShapeGridProps {
  direction?: 'right' | 'left' | 'up' | 'down' | 'diagonal';
  speed?: number;
  borderColor?: string;
  squareSize?: number;
  hoverFillColor?: string;
  shape?: 'square' | 'circle' | 'hexagon' | 'triangle';
  hoverTrailAmount?: number;
  active?: boolean;
  className?: string;
}

const ShapeGrid = ({
  direction = 'right',
  speed = 1,
  borderColor = 'rgba(255, 255, 255, 0.05)',
  squareSize = 40,
  hoverFillColor = 'rgba(255, 255, 255, 0.08)',
  shape = 'square',
  hoverTrailAmount = 0,
  active = true,
  className = ''
}: ShapeGridProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const numSquaresX = useRef<number>(0);
  const numSquaresY = useRef<number>(0);
  const gridOffset = useRef({ x: 0, y: 0 });
  const hoveredSquare = useRef<{ x: number; y: number } | null>(null);
  const trailCells = useRef<Array<{ x: number; y: number }>>([]);
  const cellOpacities = useRef(new Map());
  const logicalWidth = useRef<number>(0);
  const logicalHeight = useRef<number>(0);
  const dprRef = useRef<number>(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Fase 2: Contexto 2D otimizado com flags de aceleração e desincronização de GPU
    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
      willReadFrequently: false
    }) as CanvasRenderingContext2D | null;
    if (!ctx) return;

    // Fase 1: Sanitização estrita de tamanho e proporções geométricas
    const safeSquareSize = Math.max(10, Number(squareSize) || 40);
    const isHex = shape === 'hexagon';
    const isTri = shape === 'triangle';
    const hexHoriz = safeSquareSize * 1.5;
    const hexVert = safeSquareSize * Math.sqrt(3);

    // Fase 1: Resolução de variáveis CSS/Tokens caso informadas
    const resolveColor = (colorStr: string): string => {
      if (typeof window !== 'undefined' && colorStr.startsWith('var(')) {
        const varName = colorStr.slice(4, -1).trim();
        const resolved = getComputedStyle(canvas).getPropertyValue(varName).trim();
        if (resolved) return resolved;
      }
      return colorStr;
    };
    const activeBorderColor = resolveColor(borderColor);
    const activeHoverFillColor = resolveColor(hoverFillColor);

    // State flags (declaradas antecipadamente)
    let isVisible = false;
    let isPageVisible = typeof document !== 'undefined' ? !document.hidden : true;
    let reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let isContextLost = false;
    let lastFrameTime = 0;
    const isMoving = speed > 0;
    const minFrameInterval = 1000 / 45;
    let resizeFrameId: number | null = null;

    // 1. Geometria e formas básicas
    const drawHex = (cx: number, cy: number, size: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const vx = cx + size * Math.cos(angle);
        const vy = cy + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
    };

    const drawCircle = (cx: number, cy: number, size: number) => {
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.closePath();
    };

    const drawTriangle = (cx: number, cy: number, size: number, flip: boolean) => {
      ctx.beginPath();
      if (flip) {
        ctx.moveTo(cx, cy + size / 2);
        ctx.lineTo(cx + size / 2, cy - size / 2);
        ctx.lineTo(cx - size / 2, cy - size / 2);
      } else {
        ctx.moveTo(cx, cy - size / 2);
        ctx.lineTo(cx + size / 2, cy + size / 2);
        ctx.lineTo(cx - size / 2, cy + size / 2);
      }
      ctx.closePath();
    };

    // 2. Opacidade e rastro de hover
    const updateCellOpacities = () => {
      if (!hoveredSquare.current && trailCells.current.length === 0 && cellOpacities.current.size === 0) {
        return;
      }
      const targets = new Map();

      if (hoveredSquare.current) {
        targets.set(`${hoveredSquare.current.x},${hoveredSquare.current.y}`, 1);
      }

      if (hoverTrailAmount > 0) {
        for (let i = 0; i < trailCells.current.length; i++) {
          const t = trailCells.current[i];
          const key = `${t.x},${t.y}`;
          if (!targets.has(key)) {
            targets.set(key, (trailCells.current.length - i) / (trailCells.current.length + 1));
          }
        }
      }

      for (const [key] of targets) {
        if (!cellOpacities.current.has(key)) {
          cellOpacities.current.set(key, 0);
        }
      }

      for (const [key, opacity] of cellOpacities.current) {
        const target = targets.get(key) || 0;
        const next = opacity + (target - opacity) * 0.15;
        if (next < 0.005) {
          cellOpacities.current.delete(key);
        } else {
          cellOpacities.current.set(key, next);
        }
      }

      // Limpeza preventiva de trailCells para evitar acúmulo de memória
      if (cellOpacities.current.size === 0 && !hoveredSquare.current && trailCells.current.length > 0) {
        trailCells.current = [];
      }
    };

    // 3. Renderização do Grid
    const drawGrid = () => {
      const w = logicalWidth.current;
      const h = logicalHeight.current;
      if (w <= 0 || h <= 0) return;

      const dpr = dprRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;

      if (isHex) {
        const colShift = Math.floor(gridOffset.current.x / hexHoriz);
        const offsetX = ((gridOffset.current.x % hexHoriz) + hexHoriz) % hexHoriz;
        const offsetY = ((gridOffset.current.y % hexVert) + hexVert) % hexVert;

        const cols = Math.ceil(w / hexHoriz) + 3;
        const rows = Math.ceil(h / hexVert) + 3;

        for (let col = -2; col < cols; col++) {
          for (let row = -2; row < rows; row++) {
            const cx = Math.round(col * hexHoriz + offsetX);
            const cy = Math.round(row * hexVert + ((col + colShift) % 2 !== 0 ? hexVert / 2 : 0) + offsetY);

            const cellKey = `${col},${row}`;
            const alpha = cellOpacities.current.get(cellKey);
            if (alpha) {
              ctx.globalAlpha = alpha;
              drawHex(cx, cy, safeSquareSize);
              ctx.fillStyle = activeHoverFillColor;
              ctx.fill();
              ctx.globalAlpha = 1;
            }

            drawHex(cx, cy, safeSquareSize);
            ctx.strokeStyle = activeBorderColor;
            ctx.stroke();
          }
        }
      } else if (isTri) {
        const halfW = safeSquareSize / 2;
        const colShift = Math.floor(gridOffset.current.x / halfW);
        const rowShift = Math.floor(gridOffset.current.y / safeSquareSize);
        const offsetX = ((gridOffset.current.x % halfW) + halfW) % halfW;
        const offsetY = ((gridOffset.current.y % safeSquareSize) + safeSquareSize) % safeSquareSize;

        const cols = Math.ceil(w / halfW) + 4;
        const rows = Math.ceil(h / safeSquareSize) + 4;

        for (let col = -2; col < cols; col++) {
          for (let row = -2; row < rows; row++) {
            const cx = Math.round(col * halfW + offsetX);
            const cy = Math.round(row * safeSquareSize + safeSquareSize / 2 + offsetY);
            const flip = ((col + colShift + row + rowShift) % 2 + 2) % 2 !== 0;

            const cellKey = `${col},${row}`;
            const alpha = cellOpacities.current.get(cellKey);
            if (alpha) {
              ctx.globalAlpha = alpha;
              drawTriangle(cx, cy, safeSquareSize, flip);
              ctx.fillStyle = activeHoverFillColor;
              ctx.fill();
              ctx.globalAlpha = 1;
            }

            drawTriangle(cx, cy, safeSquareSize, flip);
            ctx.strokeStyle = activeBorderColor;
            ctx.stroke();
          }
        }
      } else if (shape === 'circle') {
        const offsetX = ((gridOffset.current.x % safeSquareSize) + safeSquareSize) % safeSquareSize;
        const offsetY = ((gridOffset.current.y % safeSquareSize) + safeSquareSize) % safeSquareSize;

        const cols = Math.ceil(w / safeSquareSize) + 3;
        const rows = Math.ceil(h / safeSquareSize) + 3;

        for (let col = -2; col < cols; col++) {
          for (let row = -2; row < rows; row++) {
            const cx = Math.round(col * safeSquareSize + safeSquareSize / 2 + offsetX);
            const cy = Math.round(row * safeSquareSize + safeSquareSize / 2 + offsetY);

            const cellKey = `${col},${row}`;
            const alpha = cellOpacities.current.get(cellKey);
            if (alpha) {
              ctx.globalAlpha = alpha;
              drawCircle(cx, cy, safeSquareSize);
              ctx.fillStyle = activeHoverFillColor;
              ctx.fill();
              ctx.globalAlpha = 1;
            }

            drawCircle(cx, cy, safeSquareSize);
            ctx.strokeStyle = activeBorderColor;
            ctx.stroke();
          }
        }
      } else {
        const offsetX = ((gridOffset.current.x % safeSquareSize) + safeSquareSize) % safeSquareSize;
        const offsetY = ((gridOffset.current.y % safeSquareSize) + safeSquareSize) % safeSquareSize;

        const cols = Math.ceil(w / safeSquareSize) + 3;
        const rows = Math.ceil(h / safeSquareSize) + 3;

        for (let col = -2; col < cols; col++) {
          for (let row = -2; row < rows; row++) {
            const sx = Math.round(col * safeSquareSize + offsetX);
            const sy = Math.round(row * safeSquareSize + offsetY);

            const cellKey = `${col},${row}`;
            const alpha = cellOpacities.current.get(cellKey);
            if (alpha) {
              ctx.globalAlpha = alpha;
              ctx.fillStyle = activeHoverFillColor;
              ctx.fillRect(sx, sy, safeSquareSize, safeSquareSize);
              ctx.globalAlpha = 1;
            }

            ctx.strokeStyle = activeBorderColor;
            ctx.strokeRect(sx, sy, safeSquareSize, safeSquareSize);
          }
        }
      }
    };

    // 4. Controles de animação
    const tryStop = () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };

    const tryStart = () => {
      if (isVisible && isPageVisible && active && !reducedMotion && !isContextLost && !requestRef.current) {
        lastFrameTime = performance.now();
        requestRef.current = requestAnimationFrame(updateAnimation);
      }
    };

    // 5. Loop de animação
    const updateAnimation = (now: number) => {
      if (!isVisible || !isPageVisible || !active || reducedMotion || isContextLost) {
        tryStop();
        return;
      }

      const elapsed = now - lastFrameTime;
      if (elapsed < minFrameInterval) {
        requestRef.current = requestAnimationFrame(updateAnimation);
        return;
      }
      lastFrameTime = now - (elapsed % minFrameInterval);

      if (isMoving) {
        const effectiveSpeed = Math.max(speed, 0.1);
        const wrapX = isHex ? hexHoriz * 2 : safeSquareSize;
        const wrapY = isHex ? hexVert : isTri ? safeSquareSize * 2 : safeSquareSize;

        switch (direction) {
          case 'right':
            gridOffset.current.x = (gridOffset.current.x - effectiveSpeed + wrapX) % wrapX;
            break;
          case 'left':
            gridOffset.current.x = (gridOffset.current.x + effectiveSpeed + wrapX) % wrapX;
            break;
          case 'up':
            gridOffset.current.y = (gridOffset.current.y + effectiveSpeed + wrapY) % wrapY;
            break;
          case 'down':
            gridOffset.current.y = (gridOffset.current.y - effectiveSpeed + wrapY) % wrapY;
            break;
          case 'diagonal':
            gridOffset.current.x = (gridOffset.current.x - effectiveSpeed + wrapX) % wrapX;
            gridOffset.current.y = (gridOffset.current.y - effectiveSpeed + wrapY) % wrapY;
            break;
          default:
            break;
        }
      }

      updateCellOpacities();
      drawGrid();

      // Auto-sleep quando parado e células voltaram à opacidade zero
      if (!isMoving && cellOpacities.current.size === 0 && !hoveredSquare.current) {
        tryStop();
        return;
      }

      requestRef.current = requestAnimationFrame(updateAnimation);
    };

    // 6. Redimensionamento e DPI
    const applyResize = (w: number, h: number) => {
      if (!canvas || w <= 0 || h <= 0) return;

      const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
      dprRef.current = dpr;
      logicalWidth.current = w;
      logicalHeight.current = h;

      const nextWidth = Math.floor(w * dpr);
      const nextHeight = Math.floor(h * dpr);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        numSquaresX.current = Math.ceil(w / safeSquareSize) + 1;
        numSquaresY.current = Math.ceil(h / safeSquareSize) + 1;
        drawGrid();
      }
    };

    // 7. Handlers de Eventos
    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      if (reducedMotion) {
        tryStop();
        drawGrid();
      } else {
        tryStart();
      }
    };

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      isContextLost = true;
      tryStop();
    };

    const handleContextRestored = () => {
      isContextLost = false;
      if (canvas && canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
        applyResize(canvas.offsetWidth, canvas.offsetHeight);
      }
      tryStart();
    };

    const handlePointerMove = (event: PointerEvent) => {
      tryStart();
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const scaleX = logicalWidth.current > 0 ? logicalWidth.current / rect.width : 1;
      const scaleY = logicalHeight.current > 0 ? logicalHeight.current / rect.height : 1;
      const pointerX = (event.clientX - rect.left) * scaleX;
      const pointerY = (event.clientY - rect.top) * scaleY;

      if (isHex) {
        const colShift = Math.floor(gridOffset.current.x / hexHoriz);
        const offsetX = ((gridOffset.current.x % hexHoriz) + hexHoriz) % hexHoriz;
        const offsetY = ((gridOffset.current.y % hexVert) + hexVert) % hexVert;
        const adjustedX = pointerX - offsetX;
        const adjustedY = pointerY - offsetY;

        const col = Math.round(adjustedX / hexHoriz);
        const rowOffset = (col + colShift) % 2 !== 0 ? hexVert / 2 : 0;
        const row = Math.round((adjustedY - rowOffset) / hexVert);

        if (
          !hoveredSquare.current ||
          hoveredSquare.current.x !== col ||
          hoveredSquare.current.y !== row
        ) {
          if (hoveredSquare.current && hoverTrailAmount > 0) {
            trailCells.current.unshift({ ...hoveredSquare.current });
            if (trailCells.current.length > hoverTrailAmount) trailCells.current.length = hoverTrailAmount;
          }
          hoveredSquare.current = { x: col, y: row };
        }
      } else if (isTri) {
        const halfW = safeSquareSize / 2;
        const offsetX = ((gridOffset.current.x % halfW) + halfW) % halfW;
        const offsetY = ((gridOffset.current.y % safeSquareSize) + safeSquareSize) % safeSquareSize;

        const adjustedX = pointerX - offsetX;
        const adjustedY = pointerY - offsetY;

        const col = Math.round(adjustedX / halfW);
        const row = Math.floor(adjustedY / safeSquareSize);

        if (
          !hoveredSquare.current ||
          hoveredSquare.current.x !== col ||
          hoveredSquare.current.y !== row
        ) {
          if (hoveredSquare.current && hoverTrailAmount > 0) {
            trailCells.current.unshift({ ...hoveredSquare.current });
            if (trailCells.current.length > hoverTrailAmount) trailCells.current.length = hoverTrailAmount;
          }
          hoveredSquare.current = { x: col, y: row };
        }
      } else if (shape === 'circle') {
        const offsetX = ((gridOffset.current.x % safeSquareSize) + safeSquareSize) % safeSquareSize;
        const offsetY = ((gridOffset.current.y % safeSquareSize) + safeSquareSize) % safeSquareSize;

        const adjustedX = pointerX - offsetX;
        const adjustedY = pointerY - offsetY;

        const col = Math.round(adjustedX / safeSquareSize);
        const row = Math.round(adjustedY / safeSquareSize);

        if (
          !hoveredSquare.current ||
          hoveredSquare.current.x !== col ||
          hoveredSquare.current.y !== row
        ) {
          if (hoveredSquare.current && hoverTrailAmount > 0) {
            trailCells.current.unshift({ ...hoveredSquare.current });
            if (trailCells.current.length > hoverTrailAmount) trailCells.current.length = hoverTrailAmount;
          }
          hoveredSquare.current = { x: col, y: row };
        }
      } else {
        const offsetX = ((gridOffset.current.x % safeSquareSize) + safeSquareSize) % safeSquareSize;
        const offsetY = ((gridOffset.current.y % safeSquareSize) + safeSquareSize) % safeSquareSize;

        const adjustedX = pointerX - offsetX;
        const adjustedY = pointerY - offsetY;

        const col = Math.floor(adjustedX / safeSquareSize);
        const row = Math.floor(adjustedY / safeSquareSize);

        if (
          !hoveredSquare.current ||
          hoveredSquare.current.x !== col ||
          hoveredSquare.current.y !== row
        ) {
          if (hoveredSquare.current && hoverTrailAmount > 0) {
            trailCells.current.unshift({ ...hoveredSquare.current });
            if (trailCells.current.length > hoverTrailAmount) trailCells.current.length = hoverTrailAmount;
          }
          hoveredSquare.current = { x: col, y: row };
        }
      }
    };

    const handlePointerEnd = () => {
      tryStart();
      if (hoveredSquare.current && hoverTrailAmount > 0) {
        trailCells.current.unshift({ ...hoveredSquare.current });
        if (trailCells.current.length > hoverTrailAmount) trailCells.current.length = hoverTrailAmount;
      }
      hoveredSquare.current = null;
    };

    const onVisibility = (forceHidden?: boolean) => {
      isPageVisible = forceHidden === true ? false : (forceHidden === false ? true : !document.hidden);
      if (isPageVisible && active) {
        tryStart();
      } else {
        tryStop();
      }
    };

    // 8. Registro de Observers e Event Listeners (Apenas APÓS todas as funções declaradas)
    const motionQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (motionQuery) {
      motionQuery.addEventListener('change', handleMotionChange);
    }

    canvas.addEventListener('contextlost', handleContextLost);
    canvas.addEventListener('contextrestored', handleContextRestored);

    const isInteractive = hoverTrailAmount > 0;
    if (isInteractive) {
      canvas.addEventListener('pointermove', handlePointerMove, { passive: true });
      canvas.addEventListener('pointerdown', handlePointerMove, { passive: true });
      canvas.addEventListener('pointerup', handlePointerEnd, { passive: true });
      canvas.addEventListener('pointerleave', handlePointerEnd, { passive: true });
      canvas.addEventListener('pointercancel', handlePointerEnd, { passive: true });
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && active) {
          tryStart();
        } else {
          tryStop();
        }
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    const handleVis = () => onVisibility();
    document.addEventListener('visibilitychange', handleVis);
    
    let appListener: any;
    App.addListener('appStateChange', ({ isActive }) => {
      onVisibility(!isActive);
    }).then(listener => { appListener = listener; }).catch(() => {});

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;

      if (resizeFrameId) cancelAnimationFrame(resizeFrameId);
      resizeFrameId = requestAnimationFrame(() => {
        applyResize(width, height);
      });
    });
    resizeObserver.observe(canvas);

    if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
      applyResize(canvas.offsetWidth, canvas.offsetHeight);
    }

    if (active) {
      tryStart();
    } else {
      tryStop();
    }

    return () => {
      if (resizeFrameId) cancelAnimationFrame(resizeFrameId);
      resizeObserver.disconnect();
      tryStop();
      io.disconnect();
      document.removeEventListener('visibilitychange', handleVis);
      if (appListener) appListener.remove();
      if (motionQuery) {
        motionQuery.removeEventListener('change', handleMotionChange);
      }
      canvas.removeEventListener('contextlost', handleContextLost);
      canvas.removeEventListener('contextrestored', handleContextRestored);
      if (isInteractive) {
        canvas.removeEventListener('pointermove', handlePointerMove);
        canvas.removeEventListener('pointerdown', handlePointerMove);
        canvas.removeEventListener('pointerup', handlePointerEnd);
        canvas.removeEventListener('pointerleave', handlePointerEnd);
        canvas.removeEventListener('pointercancel', handlePointerEnd);
      }

      // Fase 5: Liberação explícita de VRAM no WebKit / Safari (iOS) e Chromium (Android)
      canvas.width = 0;
      canvas.height = 0;
      cellOpacities.current.clear();
      trailCells.current = [];
      hoveredSquare.current = null;
    };
  }, [direction, speed, borderColor, hoverFillColor, squareSize, shape, hoverTrailAmount, active]);

  const isInteractive = hoverTrailAmount > 0;
  const pointerClass = isInteractive ? '' : 'pointer-events-none';

  return (
    <canvas
      ref={canvasRef}
      className={`shapegrid-canvas ${pointerClass} ${className}`}
      style={{ touchAction: isInteractive ? 'none' : 'auto' }}
    />
  );
};

export default ShapeGrid;

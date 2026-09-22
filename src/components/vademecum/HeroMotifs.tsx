import { useState, useEffect, memo } from 'react';

const HeroMotifs = () => {
  const [motifTick, setMotifTick] = useState(0);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id) return;
      id = setInterval(() => setMotifTick((t) => t + 1), 6000);
    };
    const stop = () => { if (id) { clearInterval(id); id = null; } };
    if (!document.hidden) start();
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  return (
    <svg
      className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.32]"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <g id="legal-scales" stroke="rgba(0,0,0,0.95)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="0" cy="-26" r="2.4" fill="rgba(0,0,0,0.95)" stroke="none" />
          <line x1="0" y1="-24" x2="0" y2="18" />
          <line x1="-22" y1="-18" x2="22" y2="-18" />
          <line x1="-22" y1="-18" x2="-22" y2="-10" />
          <line x1="22" y1="-18" x2="22" y2="-10" />
          <path d="M -30 -10 Q -22 -2 -14 -10" />
          <line x1="-30" y1="-10" x2="-14" y2="-10" />
          <path d="M 14 -10 Q 22 -2 30 -10" />
          <line x1="14" y1="-10" x2="30" y2="-10" />
          <path d="M -12 18 L 12 18 L 9 22 L -9 22 Z" />
          <line x1="-14" y1="22" x2="14" y2="22" />
        </g>
        <g id="legal-gavel" stroke="rgba(0,0,0,0.95)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <g transform="rotate(-30)">
            <rect x="-16" y="-9" width="32" height="14" rx="2.5" />
            <line x1="-10" y1="-9" x2="-10" y2="5" />
            <line x1="10" y1="-9" x2="10" y2="5" />
            <line x1="6" y1="5" x2="22" y2="21" strokeWidth="2.6" />
            <circle cx="22" cy="21" r="1.8" fill="rgba(0,0,0,0.95)" stroke="none" />
          </g>
          <rect x="-18" y="16" width="36" height="5" rx="1.2" />
          <line x1="-16" y1="21" x2="16" y2="21" />
        </g>
        <g id="legal-book" stroke="rgba(0,0,0,0.95)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="0" y1="-14" x2="0" y2="16" />
          <path d="M 0 -12 Q -12 -16 -22 -14 L -22 14 Q -12 12 0 16 Z" />
          <path d="M 0 -12 Q 12 -16 22 -14 L 22 14 Q 12 12 0 16 Z" />
          <line x1="-18" y1="-8" x2="-4" y2="-6" />
          <line x1="-18" y1="-2" x2="-4" y2="0" />
          <line x1="-18" y1="4"  x2="-4" y2="6" />
          <line x1="4" y1="-6"  x2="18" y2="-8" />
          <line x1="4" y1="0"   x2="18" y2="-2" />
          <line x1="4" y1="6"   x2="18" y2="4" />
        </g>
        <g id="legal-sword" stroke="rgba(0,0,0,0.95)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="0" y1="-26" x2="0" y2="14" />
          <path d="M -3 -26 Q 0 -30 3 -26" />
          <line x1="-12" y1="14" x2="12" y2="14" />
          <line x1="0" y1="14" x2="0" y2="24" />
          <path d="M -5 24 Q 0 28 5 24" />
        </g>
      </defs>
      {(() => {
        type Spot = { x: number; y: number; r: number; s: number };
        const LAYOUTS: Spot[][] = [
          [
            { x:  70, y:  46, r: -8, s: 1.0  },
            { x: 200, y:  36, r:  0, s: 1.15 },
            { x: 330, y:  46, r:  8, s: 1.0  },
            { x:  34, y: 118, r: -14, s: 0.95 },
            { x: 366, y: 118, r:  14, s: 0.95 },
            { x:  30, y: 210, r:  10, s: 0.9  },
            { x: 370, y: 210, r: -10, s: 0.9  },
            { x: 110, y: 268, r:   6, s: 0.9  },
            { x: 200, y: 276, r:   0, s: 1.0  },
            { x: 290, y: 268, r:  -6, s: 0.9  },
          ],
          [
            { x: 200, y:  56, r:   0, s: 1.05 },
            { x: 110, y:  96, r: -18, s: 0.95 },
            { x: 290, y:  96, r:  18, s: 0.95 },
            { x:  56, y: 160, r: -10, s: 0.9  },
            { x: 344, y: 160, r:  10, s: 0.9  },
            { x: 110, y: 220, r:  12, s: 0.95 },
            { x: 290, y: 220, r: -12, s: 0.95 },
            { x: 200, y: 250, r:   0, s: 1.1  },
            { x:  30, y:  90, r: -30, s: 0.85 },
            { x: 370, y:  90, r:  30, s: 0.85 },
          ],
          [
            { x:  40, y:  50, r: -12, s: 0.95 },
            { x: 108, y:  86, r:  -6, s: 1.0  },
            { x: 178, y: 122, r:   0, s: 1.05 },
            { x: 248, y: 158, r:   6, s: 1.0  },
            { x: 318, y: 194, r:  12, s: 0.95 },
            { x:  60, y: 232, r:  18, s: 0.9  },
            { x: 360, y:  72, r: -18, s: 0.9  },
            { x: 200, y:  36, r:   0, s: 0.95 },
            { x: 130, y: 270, r:  10, s: 0.9  },
            { x: 290, y: 270, r: -10, s: 0.9  },
          ],
          [
            { x:  70, y: 264, r:   8, s: 1.0  },
            { x: 200, y: 274, r:   0, s: 1.15 },
            { x: 330, y: 264, r:  -8, s: 1.0  },
            { x:  34, y: 200, r:  14, s: 0.95 },
            { x: 366, y: 200, r: -14, s: 0.95 },
            { x:  30, y: 110, r: -10, s: 0.9  },
            { x: 370, y: 110, r:  10, s: 0.9  },
            { x: 110, y:  48, r:  -6, s: 0.9  },
            { x: 200, y:  40, r:   0, s: 1.0  },
            { x: 290, y:  48, r:   6, s: 0.9  },
          ],
        ];
        const ICONS = [
          'legal-scales', 'legal-gavel', 'legal-book',
          'legal-scales', 'legal-gavel', 'legal-book',
          'legal-scales', 'legal-gavel', 'legal-book', 'legal-scales',
        ];
        const preset = LAYOUTS[motifTick % LAYOUTS.length];
        return ICONS.map((id, i) => {
          const slot = preset[i];
          return (
            <g
              key={i}
              className="hero-legal-icon"
              style={{
                transform: `translate(${slot.x}px, ${slot.y}px) rotate(${slot.r}deg) scale(${slot.s})`,
                transition: 'transform 1400ms cubic-bezier(0.22, 1, 0.36, 1), opacity 900ms ease',
              }}
            >
              <use href={`#${id}`} />
            </g>
          );
        });
      })()}
    </svg>
  );
};

export default memo(HeroMotifs);

/**
 * Ornamentos SVG decorativos posicionados atrás da figura vazada do hero.
 * Duas colunas coríntias nas bordas, arco central com laurel, filigrana nos cantos.
 * Todos com opacidade baixa e cor dourada. Uma camada de shimmer varre horizontalmente
 * em loop via `.svg-shimmer-layer` (definida em index.css).
 */
const HeroOrnaments = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* SVG dos ornamentos */}
      <svg
        viewBox="0 0 800 400"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hero-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(45 85% 70%)" stopOpacity="0.55" />
            <stop offset="50%" stopColor="hsl(45 75% 55%)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(35 60% 40%)" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="hero-gold-soft" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(45 85% 70%)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(45 85% 70%)" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Coluna coríntia — esquerda */}
        <g stroke="url(#hero-gold)" strokeWidth="1.2" fill="none" opacity="0.9">
          {/* Capitel */}
          <path d="M18 60 Q18 50 30 48 L70 48 Q82 50 82 60 L82 72 L18 72 Z" />
          <path d="M22 62 Q30 56 40 60 Q50 64 60 60 Q70 56 78 62" />
          <circle cx="35" cy="66" r="2" />
          <circle cx="65" cy="66" r="2" />
          {/* Fuste (canaletas) */}
          <line x1="28" y1="72" x2="28" y2="360" />
          <line x1="38" y1="72" x2="38" y2="360" />
          <line x1="50" y1="72" x2="50" y2="360" />
          <line x1="62" y1="72" x2="62" y2="360" />
          <line x1="72" y1="72" x2="72" y2="360" />
          {/* Base */}
          <path d="M14 360 L86 360 L86 372 L14 372 Z" />
          <path d="M10 372 L90 372 L90 384 L10 384 Z" />
        </g>

        {/* Coluna coríntia — direita (espelhada) */}
        <g stroke="url(#hero-gold)" strokeWidth="1.2" fill="none" opacity="0.9">
          <path d="M718 60 Q718 50 730 48 L770 48 Q782 50 782 60 L782 72 L718 72 Z" />
          <path d="M722 62 Q730 56 740 60 Q750 64 760 60 Q770 56 778 62" />
          <circle cx="735" cy="66" r="2" />
          <circle cx="765" cy="66" r="2" />
          <line x1="728" y1="72" x2="728" y2="360" />
          <line x1="738" y1="72" x2="738" y2="360" />
          <line x1="750" y1="72" x2="750" y2="360" />
          <line x1="762" y1="72" x2="762" y2="360" />
          <line x1="772" y1="72" x2="772" y2="360" />
          <path d="M714 360 L786 360 L786 372 L714 372 Z" />
          <path d="M710 372 L790 372 L790 384 L710 384 Z" />
        </g>

        {/* Arco central com laurel */}
        <g stroke="url(#hero-gold)" strokeWidth="1.4" fill="none" opacity="0.5">
          <path d="M180 90 Q400 -10 620 90" />
          <path d="M180 100 Q400 4 620 100" />
          {/* Laurel esquerdo */}
          <g transform="translate(220 60) rotate(-25)">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <ellipse key={`ll-${i}`} cx={i * 18} cy="0" rx="9" ry="3.5" fill="url(#hero-gold-soft)" stroke="none" />
            ))}
          </g>
          {/* Laurel direito */}
          <g transform="translate(580 60) rotate(25) scale(-1 1)">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <ellipse key={`lr-${i}`} cx={i * 18} cy="0" rx="9" ry="3.5" fill="url(#hero-gold-soft)" stroke="none" />
            ))}
          </g>
          {/* Medalhão central */}
          <circle cx="400" cy="72" r="14" />
          <circle cx="400" cy="72" r="8" />
          <path d="M394 72 L400 66 L406 72 L400 78 Z" fill="url(#hero-gold-soft)" stroke="none" />
        </g>

        {/* Filigrana nos 4 cantos */}
        <g stroke="url(#hero-gold)" strokeWidth="1" fill="none" opacity="0.55">
          {/* topo-esq */}
          <path d="M0 20 Q30 20 40 30 Q50 40 50 60" />
          <path d="M0 30 Q40 30 55 55" />
          {/* topo-dir */}
          <path d="M800 20 Q770 20 760 30 Q750 40 750 60" />
          <path d="M800 30 Q760 30 745 55" />
          {/* base-esq */}
          <path d="M0 380 Q30 380 40 370 Q50 360 50 340" />
          <path d="M0 370 Q40 370 55 345" />
          {/* base-dir */}
          <path d="M800 380 Q770 380 760 370 Q750 360 750 340" />
          <path d="M800 370 Q760 370 745 345" />
        </g>

        {/* Linha de conexão horizontal (frisas) */}
        <g stroke="url(#hero-gold-soft)" strokeWidth="0.6" fill="none" opacity="0.4">
          <line x1="90" y1="120" x2="180" y2="120" strokeDasharray="2 4" />
          <line x1="620" y1="120" x2="710" y2="120" strokeDasharray="2 4" />
        </g>
      </svg>

      {/* Camada de shimmer — passa horizontalmente em loop sobre os ornamentos */}
      <div
        className="svg-shimmer-layer absolute inset-y-0 -inset-x-1/2 w-[60%] pointer-events-none"
        style={{
          background:
            'linear-gradient(105deg, transparent 40%, hsl(45 90% 75% / 0.28) 50%, transparent 60%)',
          mixBlendMode: 'overlay',
        }}
        aria-hidden="true"
      />
    </div>
  );
};

export default HeroOrnaments;

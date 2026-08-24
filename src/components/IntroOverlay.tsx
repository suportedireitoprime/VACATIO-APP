import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { pickAsset } from "@/lib/assetUrl";
import logoVacatioAsset from "@/assets/logo-vacatio-v2.png.asset.json";
import logoVacatioBundled from "@/assets/bundled/logo-vacatio-v2.webp";

const logoVacatio = pickAsset(logoVacatioBundled, logoVacatioAsset.url);

const getVh = () =>
  typeof window === "undefined"
    ? 0
    : Math.max(window.visualViewport?.height ?? 0, window.innerHeight ?? 0);
const getVw = () =>
  typeof window === "undefined"
    ? 0
    : Math.max(window.visualViewport?.width ?? 0, window.innerWidth ?? 0);

/* ── SVG motif positions — scattered around the edges like the HomeHeaderHero ── */
const MOTIF_SPOTS = [
  { icon: 'scales', x: 12, y: 10, r: -12, s: 0.7, delay: 0 },
  { icon: 'gavel',  x: 82, y: 8,  r: 15,  s: 0.6, delay: 0.15 },
  { icon: 'book',   x: 8,  y: 45, r: -8,  s: 0.65, delay: 0.3 },
  { icon: 'sword',  x: 88, y: 42, r: 10,  s: 0.55, delay: 0.1 },
  { icon: 'scales', x: 18, y: 80, r: 8,   s: 0.6, delay: 0.25 },
  { icon: 'gavel',  x: 78, y: 82, r: -10, s: 0.65, delay: 0.05 },
  { icon: 'book',   x: 50, y: 6,  r: 0,   s: 0.5, delay: 0.2 },
  { icon: 'sword',  x: 50, y: 90, r: 0,   s: 0.55, delay: 0.35 },
  { icon: 'scales', x: 90, y: 65, r: 18,  s: 0.5, delay: 0.12 },
  { icon: 'book',   x: 6,  y: 68, r: -15, s: 0.55, delay: 0.28 },
];

export const IntroOverlay: React.FC = () => {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("intro_splash_seen") !== "1";
  });
  const [size, setSize] = useState({ w: getVw(), h: getVh() });

  useEffect(() => {
    if (!visible) return;
    const update = () => setSize({ w: getVw(), h: getVh() });
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);

    const timer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("intro_splash_seen", "1");
    }, 3400);

    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      clearTimeout(timer);
    };
  }, [visible]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: `${size.w}px`,
            height: `${size.h}px`,
            margin: 0,
            padding: 0,
            zIndex: 2147483647,
            background: "#EFE039",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          {/* Radial warmth overlays */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse at top right, rgba(255,255,255,0.28), transparent 60%)" }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse at bottom left, rgba(0,0,0,0.30), transparent 65%)" }}
          />

          {/* ── SVG legal motifs floating in background ── */}
          <svg
            className="pointer-events-none absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
            style={{ opacity: 0.18 }}
          >
            <defs>
              {/* Balança da Justiça */}
              <g id="splash-scales" stroke="rgba(0,0,0,0.95)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
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
              {/* Martelo do Juiz */}
              <g id="splash-gavel" stroke="rgba(0,0,0,0.95)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
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
              {/* Livro Aberto */}
              <g id="splash-book" stroke="rgba(0,0,0,0.95)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <line x1="0" y1="-14" x2="0" y2="16" />
                <path d="M 0 -12 Q -12 -16 -22 -14 L -22 14 Q -12 12 0 16 Z" />
                <path d="M 0 -12 Q 12 -16 22 -14 L 22 14 Q 12 12 0 16 Z" />
                <line x1="-18" y1="-8" x2="-4" y2="-6" />
                <line x1="-18" y1="-2" x2="-4" y2="0" />
                <line x1="-18" y1="4" x2="-4" y2="6" />
                <line x1="4" y1="-6" x2="18" y2="-8" />
                <line x1="4" y1="0" x2="18" y2="-2" />
                <line x1="4" y1="6" x2="18" y2="4" />
              </g>
              {/* Espada */}
              <g id="splash-sword" stroke="rgba(0,0,0,0.95)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <line x1="0" y1="-26" x2="0" y2="14" />
                <path d="M -3 -26 Q 0 -30 3 -26" />
                <line x1="-12" y1="14" x2="12" y2="14" />
                <line x1="0" y1="14" x2="0" y2="24" />
                <path d="M -5 24 Q 0 28 5 24" />
              </g>
            </defs>

            {/* Render each motif with a slow floating CSS animation */}
            {MOTIF_SPOTS.map((spot, i) => (
              <g
                key={i}
                style={{
                  transform: `translate(${spot.x}%, ${spot.y}%) rotate(${spot.r}deg) scale(${spot.s})`,
                  animation: `splash-float-${i % 3} ${6 + (i % 4)}s ease-in-out ${spot.delay}s infinite alternate`,
                  transformOrigin: `${spot.x}% ${spot.y}%`,
                }}
              >
                <use href={`#splash-${spot.icon}`} />
              </g>
            ))}
          </svg>

          {/* Inline keyframes for the floating SVG motifs */}
          <style>{`
            @keyframes splash-float-0 {
              0%   { transform: translate(var(--tx), var(--ty)) rotate(var(--tr)) scale(var(--ts)); opacity: 0.15; }
              50%  { opacity: 0.28; }
              100% { transform: translate(calc(var(--tx) + 2%), calc(var(--ty) - 3%)) rotate(calc(var(--tr) + 8deg)) scale(calc(var(--ts) * 1.08)); opacity: 0.2; }
            }
            @keyframes splash-float-1 {
              0%   { transform: translate(var(--tx), var(--ty)) rotate(var(--tr)) scale(var(--ts)); opacity: 0.12; }
              50%  { opacity: 0.25; }
              100% { transform: translate(calc(var(--tx) - 1.5%), calc(var(--ty) + 2.5%)) rotate(calc(var(--tr) - 6deg)) scale(calc(var(--ts) * 0.94)); opacity: 0.18; }
            }
            @keyframes splash-float-2 {
              0%   { transform: translate(var(--tx), var(--ty)) rotate(var(--tr)) scale(var(--ts)); opacity: 0.18; }
              50%  { opacity: 0.3; }
              100% { transform: translate(calc(var(--tx) + 1%), calc(var(--ty) + 1.5%)) rotate(calc(var(--tr) + 5deg)) scale(calc(var(--ts) * 1.05)); opacity: 0.22; }
            }
            @keyframes splash-shimmer {
              0%   { transform: translateX(-100%) rotate(25deg); }
              100% { transform: translateX(200%) rotate(25deg); }
            }
          `}</style>

          {/* Shimmer light sweep */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{ duration: 2.2, ease: "easeInOut", delay: 0.6 }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "50%",
                height: "100%",
                background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)",
                transform: "skewX(-15deg)",
              }}
            />
          </div>

          {/* ── Central content with staggered fluid animations ── */}
          <div className="flex flex-col items-center text-center relative" style={{ zIndex: 10 }}>

            {/* Logo — scale bounce in */}
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 180,
                damping: 18,
                mass: 0.8,
                delay: 0.1,
              }}
              className="relative w-[100px] h-[100px] rounded-full border-2 border-white/90 bg-primary flex items-center justify-center overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
            >
              <img
                src={logoVacatio}
                alt="Vade Mecum"
                width={100}
                height={100}
                className="w-full h-full rounded-full object-cover scale-[1.06]"
              />
              {/* Logo glow ring */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ duration: 2, ease: "easeInOut", delay: 0.5, repeat: 1 }}
                className="absolute inset-[-4px] rounded-full border-2 border-white/50"
              />
            </motion.div>

            {/* Title "Vade Mecum" — slides up with spring + letter-by-letter fade */}
            <motion.h1
              initial={{ opacity: 0, y: 30, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 14,
                mass: 0.7,
                delay: 0.45,
              }}
              className="font-display text-zinc-900 text-[36px] leading-none font-black tracking-tight mt-4"
              style={{
                textShadow: "0 2px 12px rgba(0,0,0,0.1), 0 4px 20px rgba(0,0,0,0.05)",
              }}
            >
              Vade Mecum
            </motion.h1>

            {/* Decorative line separator */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.85,
              }}
              className="mt-2 mb-1 h-[2px] w-24 rounded-full"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(24,24,27,0.3), transparent)",
                transformOrigin: "center",
              }}
            />

            {/* Subtitle — smooth slide + fade */}
            <motion.p
              initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
                delay: 1.1,
              }}
              className="font-body text-zinc-800 text-[15px] font-semibold tracking-[0.18em] uppercase"
              style={{
                textShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              Uso Profissional
            </motion.p>

            {/* Secondary tagline */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 0.7, y: 0 }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
                delay: 1.5,
              }}
              className="font-body text-zinc-700 text-[11px] mt-1.5 font-medium tracking-wider uppercase"
              style={{
                textShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              Legislação Comentada com IA
            </motion.p>
          </div>

          {/* Bottom gradient for depth */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-[30%]"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.18), transparent)" }}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default IntroOverlay;

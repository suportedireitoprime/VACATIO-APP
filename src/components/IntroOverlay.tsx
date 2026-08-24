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

export const IntroOverlay: React.FC = () => {
  // Use sessionStorage so it shows once per app session (not on every navigation, but on reload/reopen)
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
    
    // Duration: 3 seconds total
    const timer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("intro_splash_seen", "1");
    }, 3000);

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
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: `${size.w}px`,
            height: `${size.h}px`,
            margin: 0,
            padding: 0,
            zIndex: 2147483647,
            background: "linear-gradient(135deg, #EFE039 0%, #EFE039 55%, #EFE039 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          {/* Subtle radial warmth similar to HomeHeaderHero */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.35),transparent_65%)]" />

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center gap-3 relative z-10"
          >
            <div className="relative w-24 h-24 rounded-full border border-white/90 bg-primary flex items-center justify-center overflow-hidden shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
              <img
                src={logoVacatio}
                alt="Vade Mecum"
                width={96}
                height={96}
                className="w-full h-full rounded-full object-cover scale-[1.06]"
              />
            </div>
            
            <div className="flex flex-col items-center mt-2">
              <h1 className="font-display text-white text-[32px] leading-none font-black tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
                Vade Mecum
              </h1>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="font-body text-white/90 text-[14px] mt-1 font-medium tracking-wide uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
              >
                Uso Profissional
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default IntroOverlay;

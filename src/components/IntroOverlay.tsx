import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FIRST_SEEN_KEY = "intro:firstSeen";
const VERSION_KEY = "intro:version";
const MOBILE_MQ = "(max-width: 1023px)";

const getVh = () =>
  typeof window === "undefined"
    ? 0
    : Math.max(window.visualViewport?.height ?? 0, window.innerHeight ?? 0);
const getVw = () =>
  typeof window === "undefined"
    ? 0
    : Math.max(window.visualViewport?.width ?? 0, window.innerWidth ?? 0);

const isMobileOrTablet = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_MQ).matches;
};

const getVersion = (): "v1" | "v2" | "v3" => {
  try {
    const v = localStorage.getItem(VERSION_KEY);
    if (v === "v1" || v === "v2" || v === "v3") return v;
  } catch {}
  return "v1";
};

export const IntroOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [size, setSize] = useState({ w: getVw(), h: getVh() });
  const [src, setSrc] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const gateWrittenRef = useRef(false);

  useEffect(() => {
    // Desktop nunca vê a intro; nem grava firstSeen.
    if (!isMobileOrTablet()) return;
    try {
      if (localStorage.getItem(FIRST_SEEN_KEY) === "1") return;
    } catch {
      return;
    }
    const v = getVersion();
    setSrc(`/intros/intro-${v}.mp4`);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const update = () => setSize({ w: getVw(), h: getVh() });
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const v = videoRef.current;
    if (!v) return;
    const finish = () => {
      setFading(true);
      window.setTimeout(() => setVisible(false), 320);
    };
    const markGate = () => {
      if (gateWrittenRef.current) return;
      gateWrittenRef.current = true;
      try {
        localStorage.setItem(FIRST_SEEN_KEY, "1");
      } catch {}
    };
    const onMeta = () => setVideoReady(true);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("ended", finish);
    v.addEventListener("playing", markGate);
    v.addEventListener("error", finish);
    const readyFallback = window.setTimeout(() => setVideoReady(true), 1500);
    const safety = window.setTimeout(finish, 6000);
    v.play().catch(finish);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("ended", finish);
      v.removeEventListener("playing", markGate);
      v.removeEventListener("error", finish);
      window.clearTimeout(readyFallback);
      window.clearTimeout(safety);
    };
  }, [visible]);

  if (!visible) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-hidden
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
        alignItems: "center",
        justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: "opacity 300ms ease-out",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="auto"
        style={{
          width: `${size.w}px`,
          height: `${size.h}px`,
          objectFit: "cover",
          display: "block",
          opacity: videoReady ? 1 : 0,
          transition: "opacity 180ms ease-out",
        }}
      />
    </div>,
    document.body,
  );
};

export default IntroOverlay;

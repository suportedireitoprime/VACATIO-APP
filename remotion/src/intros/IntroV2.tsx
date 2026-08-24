import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { INK, YELLOW } from "../shared/palette";
import { sans, display } from "../shared/fonts";
import { Grain } from "../shared/Grain";

// V2 — Cinético. Stagger por caractere, réguas móveis, springs soltos.

const KineticWord: React.FC<{
  text: string;
  from: number;
  size: number;
  fontFamily: string;
  weight?: number | string;
  letterSpacing?: string;
  color?: string;
}> = ({ text, from, size, fontFamily, weight = 700, letterSpacing = "0", color = INK }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {text.split("").map((ch, i) => {
        const s = spring({
          frame: frame - from - i * 2,
          fps,
          config: { damping: 12, stiffness: 180 },
        });
        const y = interpolate(s, [0, 1], [80, 0]);
        const o = interpolate(s, [0, 1], [0, 1]);
        const rot = interpolate(s, [0, 1], [-8, 0]);
        return (
          <span
            key={i}
            style={{
              fontFamily,
              fontWeight: weight,
              fontSize: size,
              color,
              letterSpacing,
              display: "inline-block",
              transform: `translateY(${y}px) rotate(${rot}deg)`,
              opacity: o,
              lineHeight: 1,
              minWidth: ch === " " ? size * 0.3 : undefined,
            }}
          >
            {ch === " " ? "\u00A0" : ch}
          </span>
        );
      })}
    </div>
  );
};

const Rule: React.FC<{ from: number; y: string; delay?: number }> = ({ from, y }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [from, from + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 0,
        right: 0,
        height: 4,
        background: INK,
        transformOrigin: "center",
        transform: `scaleX(${scale})`,
      }}
    />
  );
};

export const IntroV2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = interpolate(frame, [108, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoS = spring({ frame: frame - 4, fps, config: { damping: 10, stiffness: 130 } });
  const logoScale = interpolate(logoS, [0, 1], [0.4, 1]);
  const logoRot = interpolate(logoS, [0, 1], [-20, 0]);

  return (
    <AbsoluteFill style={{ background: YELLOW, opacity: exit, overflow: "hidden" }}>
      <Grain opacity={0.05} />

      <Rule from={0} y="18%" />
      <Rule from={70} y="82%" />

      {/* Logo topo */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 240 }}>
        <div style={{ transform: `scale(${logoScale}) rotate(${logoRot}deg)`, opacity: interpolate(frame, [4, 20], [0, 1], { extrapolateRight: "clamp" }) }}>
          <Img src={staticFile("logo.png")} style={{ width: 200, height: 200, objectFit: "contain" }} />
        </div>
      </AbsoluteFill>

      {/* Vade Mecum eyebrow */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 500 }}>
        <KineticWord text="VADE MECUM" from={14} size={64} fontFamily={sans} weight={700} letterSpacing="0.24em" />
      </AbsoluteFill>

      {/* Vacatio hero */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <KineticWord text="Vacatio" from={28} size={280} fontFamily={display} weight={400} letterSpacing="-0.03em" />
      </AbsoluteFill>

      {/* Chips animados */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 380 }}>
        <div style={{ display: "flex", gap: 20 }}>
          {["2026", "Comentado", "Grifado"].map((label, i) => {
            const s = spring({
              frame: frame - 58 - i * 6,
              fps,
              config: { damping: 14, stiffness: 200 },
            });
            const y = interpolate(s, [0, 1], [50, 0]);
            const o = interpolate(s, [0, 1], [0, 1]);
            return (
              <div
                key={label}
                style={{
                  transform: `translateY(${y}px)`,
                  opacity: o,
                  padding: "22px 42px",
                  borderRadius: 999,
                  background: INK,
                  color: YELLOW,
                  fontFamily: sans,
                  fontWeight: 700,
                  fontSize: 42,
                  letterSpacing: "0.04em",
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* Uso profissional */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 220 }}>
        <div
          style={{
            opacity: interpolate(frame, [82, 100], [0, 1], { extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(frame, [82, 100], [20, 0], { extrapolateRight: "clamp" })}px)`,
            fontFamily: sans,
            fontWeight: 600,
            fontSize: 34,
            color: INK,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
          }}
        >
          Uso profissional
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default IntroV2;

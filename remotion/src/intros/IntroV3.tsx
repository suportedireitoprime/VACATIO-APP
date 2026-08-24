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
import { INK, INK_LINE, YELLOW } from "../shared/palette";
import { sans, display } from "../shared/fonts";
import { Grain } from "../shared/Grain";

// V3 — Selo institucional. Emblema com traço SVG desenhando, entrada em selo.

const CIRCLE = 720;
const RADIUS = CIRCLE / 2 - 20;
const CIRC = 2 * Math.PI * RADIUS;

export const IntroV3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = interpolate(frame, [108, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Selo: traço desenha do frame 0 ao 34
  const draw = interpolate(frame, [0, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dashOffset = CIRC * (1 - draw);

  // Logo aparece dentro do selo com spring após o traço
  const logoS = spring({ frame: frame - 24, fps, config: { damping: 14, stiffness: 160 } });
  const logoScale = interpolate(logoS, [0, 1], [0.5, 1]);
  const logoOpacity = interpolate(frame, [24, 44], [0, 1], { extrapolateRight: "clamp" });

  // Selo travamento
  const stampS = spring({ frame: frame - 40, fps, config: { damping: 8, stiffness: 220 } });
  const stampScale = interpolate(stampS, [0, 1], [1.08, 1]);

  // Textos aparecem depois do selo
  const eyebrowO = interpolate(frame, [40, 58], [0, 1], { extrapolateRight: "clamp" });
  const eyebrowY = interpolate(frame, [40, 58], [16, 0], { extrapolateRight: "clamp" });

  const titleS = spring({ frame: frame - 48, fps, config: { damping: 14, stiffness: 150 } });
  const titleScale = interpolate(titleS, [0, 1], [0.92, 1]);
  const titleO = interpolate(frame, [48, 66], [0, 1], { extrapolateRight: "clamp" });

  const subO = interpolate(frame, [66, 82], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [66, 82], [12, 0], { extrapolateRight: "clamp" });

  const chipsO = interpolate(frame, [80, 98], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: YELLOW, opacity: exit }}>
      <Grain opacity={0.06} />

      {/* Selo central */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 320,
          transform: `scale(${stampScale})`,
        }}
      >
        <div style={{ position: "relative", width: CIRCLE, height: CIRCLE }}>
          <svg width={CIRCLE} height={CIRCLE} viewBox={`0 0 ${CIRCLE} ${CIRCLE}`}>
            {/* anel externo desenhado */}
            <circle
              cx={CIRCLE / 2}
              cy={CIRCLE / 2}
              r={RADIUS}
              fill="none"
              stroke={INK}
              strokeWidth={6}
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${CIRCLE / 2} ${CIRCLE / 2})`}
              strokeLinecap="round"
            />
            {/* anel interno fino */}
            <circle
              cx={CIRCLE / 2}
              cy={CIRCLE / 2}
              r={RADIUS - 22}
              fill="none"
              stroke={INK}
              strokeWidth={1.5}
              opacity={interpolate(frame, [28, 42], [0, 0.5], { extrapolateRight: "clamp" })}
            />
            {/* Ticks — 12 marcas horárias */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
              const inner = RADIUS - 34;
              const outer = RADIUS - 14;
              const x1 = CIRCLE / 2 + Math.cos(angle) * inner;
              const y1 = CIRCLE / 2 + Math.sin(angle) * inner;
              const x2 = CIRCLE / 2 + Math.cos(angle) * outer;
              const y2 = CIRCLE / 2 + Math.sin(angle) * outer;
              const tickO = interpolate(frame, [34 + i * 0.5, 44 + i * 0.5], [0, 0.7], {
                extrapolateRight: "clamp",
              });
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={INK}
                  strokeWidth={2}
                  opacity={tickO}
                />
              );
            })}
          </svg>

          {/* Logo no centro do selo */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                transform: `scale(${logoScale})`,
                opacity: logoOpacity,
              }}
            >
              <Img
                src={staticFile("logo.png")}
                style={{ width: 320, height: 320, objectFit: "contain" }}
              />
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Eyebrow abaixo do selo */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 320 + CIRCLE + 60,
        }}
      >
        <div
          style={{
            opacity: eyebrowO,
            transform: `translateY(${eyebrowY}px)`,
            fontFamily: sans,
            fontWeight: 600,
            fontSize: 32,
            color: INK,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
          }}
        >
          Vade Mecum · Edição 2026
        </div>
      </AbsoluteFill>

      {/* Vacatio */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 420,
        }}
      >
        <div
          style={{
            transform: `scale(${titleScale})`,
            opacity: titleO,
            fontFamily: display,
            fontSize: 260,
            color: INK,
            lineHeight: 0.9,
            letterSpacing: "-0.03em",
          }}
        >
          Vacatio
        </div>
      </AbsoluteFill>

      {/* Subtítulo */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 340,
        }}
      >
        <div
          style={{
            opacity: subO,
            transform: `translateY(${subY}px)`,
            fontFamily: sans,
            fontWeight: 500,
            fontSize: 38,
            color: INK,
            letterSpacing: "0.02em",
          }}
        >
          Comentado · Grifado
        </div>
      </AbsoluteFill>

      {/* Uso profissional */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 200,
          opacity: chipsO,
        }}
      >
        <div
          style={{
            padding: "16px 40px",
            border: `2px solid ${INK}`,
            borderRadius: 999,
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 28,
            color: INK,
            letterSpacing: "0.36em",
            textTransform: "uppercase",
          }}
        >
          Uso profissional
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default IntroV3;

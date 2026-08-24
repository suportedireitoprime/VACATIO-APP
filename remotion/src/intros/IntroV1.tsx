import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { INK, INK_SOFT, YELLOW } from "../shared/palette";
import { display, sans } from "../shared/fonts";
import { Grain } from "../shared/Grain";

// V1 — Editorial silencioso. Câmera parada, reveals por máscara, hierarquia editorial.

const MaskReveal: React.FC<{
  from: number;
  duration?: number;
  children: React.ReactNode;
  direction?: "up" | "down";
}> = ({ from, duration = 26, children, direction = "up" }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [from, from + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const eased = 1 - Math.pow(1 - t, 3);
  const translate = direction === "up" ? (1 - eased) * 48 : (1 - eased) * -48;
  return (
    <div
      style={{
        overflow: "hidden",
        display: "inline-block",
      }}
    >
      <div style={{ transform: `translateY(${translate}px)`, opacity: eased }}>
        {children}
      </div>
    </div>
  );
};

export const IntroV1: React.FC = () => {
  const frame = useCurrentFrame();
  const exit = interpolate(frame, [108, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const drift = Math.sin(frame / 30) * 6;

  return (
    <AbsoluteFill style={{ background: YELLOW, opacity: exit }}>
      <Grain opacity={0.05} />

      {/* Filete superior */}
      <AbsoluteFill style={{ padding: "180px 90px 0", flexDirection: "column", alignItems: "stretch" }}>
        <div
          style={{
            height: 2,
            background: INK,
            transformOrigin: "left center",
            transform: `scaleX(${interpolate(frame, [4, 26], [0, 1], { extrapolateRight: "clamp" })})`,
          }}
        />
      </AbsoluteFill>

      {/* Eyebrow */}
      <AbsoluteFill style={{ padding: "220px 90px 0", flexDirection: "column" }}>
        <MaskReveal from={10}>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 600,
              fontSize: 36,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              color: INK,
            }}
          >
            Vade Mecum · 2026
          </div>
        </MaskReveal>
      </AbsoluteFill>

      {/* Hero title */}
      <AbsoluteFill
        style={{
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "0 90px",
          transform: `translateY(${drift}px)`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <MaskReveal from={22} duration={34}>
            <div
              style={{
                fontFamily: display,
                fontSize: 340,
                lineHeight: 0.92,
                color: INK,
                letterSpacing: "-0.03em",
              }}
            >
              Vacatio
            </div>
          </MaskReveal>
          <MaskReveal from={42}>
            <div
              style={{
                fontFamily: sans,
                fontSize: 44,
                fontWeight: 500,
                color: INK_SOFT,
                letterSpacing: "0.01em",
              }}
            >
              O código que respira com você.
            </div>
          </MaskReveal>
        </div>
      </AbsoluteFill>

      {/* Logo pequeno canto */}
      <Sequence from={2}>
        <AbsoluteFill style={{ padding: 120, alignItems: "flex-end", justifyContent: "flex-start" }}>
          <div
            style={{
              opacity: interpolate(frame - 2, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
              transform: `translateY(${interpolate(frame - 2, [0, 20], [-12, 0], {
                extrapolateRight: "clamp",
              })}px)`,
            }}
          >
            <Img src={staticFile("logo.png")} style={{ width: 130, height: 130, objectFit: "contain" }} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Rodapé: comentado · grifado · uso profissional */}
      <AbsoluteFill
        style={{
          padding: "0 90px 200px",
          justifyContent: "flex-end",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 22, width: "100%" }}>
          <div
            style={{
              height: 2,
              background: INK,
              transformOrigin: "left center",
              transform: `scaleX(${interpolate(frame, [58, 82], [0, 1], { extrapolateRight: "clamp" })})`,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            {["Comentado", "Grifado", "Uso profissional"].map((label, i) => (
              <MaskReveal key={label} from={64 + i * 6} duration={22}>
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 30,
                    fontWeight: 600,
                    color: INK,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </div>
              </MaskReveal>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default IntroV1;

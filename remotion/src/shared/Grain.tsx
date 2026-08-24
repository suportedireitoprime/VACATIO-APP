import React from "react";
import { AbsoluteFill } from "remotion";

/** Vinheta sutil + textura de papel para dar profundidade sem pesar o render. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.08 }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.22) 100%)",
        opacity: 0.5,
      }}
    />
    <AbsoluteFill
      style={{
        opacity,
        backgroundImage:
          "repeating-radial-gradient(circle at 20% 30%, rgba(0,0,0,0.35) 0 1px, transparent 1px 3px), repeating-radial-gradient(circle at 70% 80%, rgba(0,0,0,0.25) 0 1px, transparent 1px 4px)",
        mixBlendMode: "multiply",
      }}
    />
  </AbsoluteFill>
);

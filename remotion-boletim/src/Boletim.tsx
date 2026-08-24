import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["500", "700", "900"], subsets: ["latin"] });

export type Cena = {
  titulo?: string;
  texto?: string;
  imagem_url?: string;
  audio_url?: string;
  duracao_s?: number;
  tipo?: string;
};

const COR_TIPO: Record<string, string> = {
  lei: "#1e40af",
  decreto: "#7c2d12",
  medida_provisoria: "#9f1239",
  portaria: "#065f46",
  resolucao: "#5b21b6",
  instrucao_normativa: "#0e7490",
  generico: "#1f2937",
};

const CenaView: React.FC<{ cena: Cena; framesTotal: number }> = ({ cena, framesTotal }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cor = COR_TIPO[cena.tipo || "generico"] || COR_TIPO.generico;

  const zoom = interpolate(frame, [0, framesTotal], [1.05, 1.18]);
  const pan = interpolate(frame, [0, framesTotal], [-20, 20]);
  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [framesTotal - fps * 0.4, framesTotal], [1, 0], { extrapolateLeft: "clamp" });
  const opacity = Math.min(fadeIn, fadeOut);

  const titleY = interpolate(frame, [0, fps * 0.6], [40, 0], { extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [fps * 0.15, fps * 0.7], [0, 1], { extrapolateRight: "clamp" });
  const textOpacity = interpolate(frame, [fps * 0.7, fps * 1.1], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(frame, [fps * 0.7, fps * 1.1], [30, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0d12", opacity, fontFamily }}>
      {cena.imagem_url && (
        <AbsoluteFill>
          <Img
            src={cena.imagem_url}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${zoom}) translateX(${pan}px)`,
            }}
          />
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.85) 100%)",
            }}
          />
        </AbsoluteFill>
      )}

      <div
        style={{
          position: "absolute",
          top: 100,
          left: 60,
          padding: "14px 26px",
          background: cor,
          color: "white",
          fontWeight: 900,
          fontSize: 32,
          letterSpacing: 2,
          textTransform: "uppercase",
          borderRadius: 12,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
        {(cena.tipo || "boletim").replace(/_/g, " ")}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 260,
          left: 60,
          right: 60,
          color: "white",
          fontWeight: 900,
          fontSize: 78,
          lineHeight: 1.05,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textShadow: "0 6px 24px rgba(0,0,0,0.7)",
        }}
      >
        {cena.titulo || ""}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 90,
          left: 60,
          right: 60,
          color: "rgba(255,255,255,0.92)",
          fontWeight: 500,
          fontSize: 40,
          lineHeight: 1.35,
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          textShadow: "0 4px 16px rgba(0,0,0,0.7)",
        }}
      >
        {cena.texto || ""}
      </div>
    </AbsoluteFill>
  );
};

const TransitionOverlay: React.FC<{ cor: string; framesTotal: number }> = ({ cor, framesTotal }) => {
  const frame = useCurrentFrame();
  // Cortina passando: -100% -> 100% em framesTotal
  const wipeX = interpolate(frame, [0, framesTotal], [-100, 100]);
  const flashScale = interpolate(frame, [0, framesTotal * 0.5, framesTotal], [0.5, 1.05, 1.15]);
  const flashOpacity = interpolate(
    frame,
    [0, framesTotal * 0.25, framesTotal * 0.7, framesTotal],
    [0, 1, 1, 0],
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translateX(${wipeX}%)`,
          background: `linear-gradient(90deg, transparent 0%, ${cor} 40%, ${cor} 60%, transparent 100%)`,
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            opacity: flashOpacity,
            transform: `scale(${flashScale})`,
          }}
        >
          <Img
            src={staticFile("brasao.webp")}
            style={{
              width: 140,
              height: 140,
              objectFit: "contain",
              filter: "drop-shadow(0 6px 24px rgba(0,0,0,0.8))",
            }}
          />
          <div
            style={{
              color: "white",
              fontWeight: 900,
              fontSize: 26,
              letterSpacing: 10,
              textTransform: "uppercase",
              textShadow: "0 4px 16px rgba(0,0,0,0.8)",
            }}
          >
            Próxima norma
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Boletim: React.FC<{ cenas: Cena[] }> = ({ cenas }) => {
  const { fps } = useVideoConfig();
  let cursor = 0;
  const totalFrames = cenas.reduce(
    (acc, c) => acc + Math.ceil(Math.max(c.duracao_s || 4, 1) * fps),
    0,
  );
  const transitionFrames = Math.round(fps * 0.7);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Trilha de fundo estilo breaking news */}
      <Audio
        src={staticFile("news-bg.mp3")}
        volume={(f) => {
          const fadeIn = interpolate(f, [0, fps * 1.5], [0, 0.18], { extrapolateRight: "clamp" });
          const fadeOut = interpolate(
            f,
            [Math.max(0, totalFrames - fps * 2), totalFrames],
            [0.18, 0],
            { extrapolateLeft: "clamp" },
          );
          return Math.min(fadeIn, fadeOut);
        }}
      />
      {cenas.map((c, i) => {
        const dur = Math.max(c.duracao_s || 4, 1);
        const framesTotal = Math.ceil(dur * fps);
        const from = cursor;
        cursor += framesTotal;
        const cor = COR_TIPO[c.tipo || "generico"] || COR_TIPO.generico;
        return (
          <React.Fragment key={i}>
            <Sequence from={from} durationInFrames={framesTotal}>
              <CenaView cena={c} framesTotal={framesTotal} />
              {c.audio_url && <Audio src={c.audio_url} />}
            </Sequence>
            {i > 0 && (
              <Sequence from={from} durationInFrames={transitionFrames}>
                <TransitionOverlay cor={cor} framesTotal={transitionFrames} />
                <Audio src={staticFile("swoosh.mp3")} volume={0.6} />
              </Sequence>
            )}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

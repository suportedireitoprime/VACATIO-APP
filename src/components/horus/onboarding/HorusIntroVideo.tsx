import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from 'remotion';
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { wipe } from '@remotion/transitions/wipe';

/* ------------------------------------------------------------------ */
/*  Shared visual language                                            */
/* ------------------------------------------------------------------ */

const YELLOW = '#F5C518';
const YELLOW_SOFT = '#FFDD57';
const INK = '#0A0A0A';
const CREAM = '#FAF7EF';

const displayFont =
  '"Space Grotesk", "Inter", ui-sans-serif, system-ui, sans-serif';
const bodyFont = '"Inter", ui-sans-serif, system-ui, sans-serif';

/* Animated background — subtle yellow rays + noise. Present in every scene. */
const BackdropRays: React.FC = () => {
  const frame = useCurrentFrame();
  const rotate = interpolate(frame, [0, 900], [0, 360]);
  return (
    <AbsoluteFill style={{ background: INK, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: '-30%',
          background: `conic-gradient(from ${rotate}deg at 50% 55%,
            rgba(245,197,24,0) 0deg,
            rgba(245,197,24,0.12) 40deg,
            rgba(245,197,24,0) 90deg,
            rgba(245,197,24,0.10) 160deg,
            rgba(245,197,24,0) 220deg,
            rgba(245,197,24,0.14) 300deg,
            rgba(245,197,24,0) 360deg)`,
          filter: 'blur(40px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 100%, rgba(245,197,24,0.18) 0%, rgba(0,0,0,0) 55%)',
        }}
      />
    </AbsoluteFill>
  );
};

/* Sparkle particles rising */
const Sparkles: React.FC<{ count?: number }> = ({ count = 14 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: count }).map((_, i) => {
        const seed = (i * 97) % 100;
        const x = (seed / 100) * 100;
        const delay = (i * 11) % 60;
        const t = ((frame + delay) % 120) / 120;
        const y = interpolate(t, [0, 1], [110, -10]);
        const size = 4 + ((i * 7) % 6);
        const opacity = interpolate(t, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              borderRadius: '50%',
              background: YELLOW_SOFT,
              opacity,
              boxShadow: `0 0 ${size * 2}px ${YELLOW}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* Section label — small yellow eyebrow used across feature scenes */
const Eyebrow: React.FC<{ text: string; delay?: number }> = ({
  text,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 160 },
  });
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 22px',
        borderRadius: 999,
        background: 'rgba(245,197,24,0.14)',
        border: '2px solid rgba(245,197,24,0.4)',
        transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
        opacity: s,
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: YELLOW,
          boxShadow: `0 0 12px ${YELLOW}`,
        }}
      />
      <span
        style={{
          fontFamily: bodyFont,
          fontSize: 26,
          color: YELLOW,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        {text}
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 1 — ABERTURA                                                */
/* ------------------------------------------------------------------ */

const SceneAbertura: React.FC<{ owlSrc: string }> = ({ owlSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const owlIn = spring({ frame, fps, config: { damping: 12, stiffness: 130 } });
  const owlScale = interpolate(owlIn, [0, 1], [0.4, 1]);
  const owlY = interpolate(owlIn, [0, 1], [80, 0]);
  const owlFloat = Math.sin(frame / 12) * 6;

  const letters = 'HORUS'.split('');

  return (
    <AbsoluteFill>
      <BackdropRays />
      <Sparkles />
      <AbsoluteFill
        style={{ alignItems: 'center', justifyContent: 'center', gap: 40 }}
      >
        <div
          style={{
            transform: `translateY(${owlY + owlFloat}px) scale(${owlScale})`,
            filter: `drop-shadow(0 30px 60px rgba(245,197,24,0.35))`,
          }}
        >
          <Img
            src={owlSrc}
            style={{ width: 460, height: 460, objectFit: 'contain' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {letters.map((L, i) => {
            const s = spring({
              frame: frame - 12 - i * 4,
              fps,
              config: { damping: 14, stiffness: 200 },
            });
            const y = interpolate(s, [0, 1], [40, 0]);
            const op = interpolate(s, [0, 1], [0, 1]);
            return (
              <span
                key={i}
                style={{
                  fontFamily: displayFont,
                  fontWeight: 900,
                  fontSize: 168,
                  lineHeight: 1,
                  color: CREAM,
                  transform: `translateY(${y}px)`,
                  opacity: op,
                  letterSpacing: '-0.04em',
                  textShadow: `0 8px 40px rgba(245,197,24,0.4)`,
                }}
              >
                {L}
              </span>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: bodyFont,
            fontSize: 40,
            color: YELLOW,
            fontWeight: 600,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            opacity: interpolate(frame, [30, 55], [0, 1], {
              extrapolateRight: 'clamp',
            }),
          }}
        >
          Seu assistente jurídico
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 2 — APRESENTAÇÃO                                            */
/* ------------------------------------------------------------------ */

const SceneApresentacao: React.FC<{ owlSrc: string }> = ({ owlSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 130 },
  });
  const owlX = interpolate(enter, [0, 1], [400, 0]);
  const textX = interpolate(enter, [0, 1], [400, 0]);
  const owlFloat = Math.sin(frame / 10) * 8;

  return (
    <AbsoluteFill>
      <BackdropRays />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 40,
            width: '100%',
          }}
        >
          <div
            style={{
              transform: `translateX(${-owlX}px) translateY(${owlFloat}px)`,
            }}
          >
            <Img
              src={owlSrc}
              style={{
                width: 340,
                height: 340,
                objectFit: 'contain',
                filter: 'drop-shadow(0 20px 40px rgba(245,197,24,0.35))',
              }}
            />
          </div>
          <div
            style={{
              transform: `translateX(${textX}px)`,
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: bodyFont,
                fontSize: 30,
                color: YELLOW,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                margin: 0,
                fontWeight: 700,
              }}
            >
              Prazer, eu sou o Horus
            </p>
            <h2
              style={{
                fontFamily: displayFont,
                fontWeight: 900,
                fontSize: 96,
                color: CREAM,
                lineHeight: 0.95,
                margin: '20px 0 0',
                letterSpacing: '-0.03em',
              }}
            >
              Deixa eu te mostrar o{' '}
              <span style={{ color: YELLOW }}>que eu faço</span>
            </h2>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Feature scenes — reusable structure                                */
/* ------------------------------------------------------------------ */

type FeatureSceneProps = {
  step: string; // e.g. "01 / 05"
  title: string;
  titleAccent: string;
  description: string;
  bullets: string[];
  mock: React.ReactNode; // visual mock on the right/top
};

const FeatureScene: React.FC<FeatureSceneProps> = ({
  step,
  title,
  titleAccent,
  description,
  bullets,
  mock,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({
    frame: frame - 8,
    fps,
    config: { damping: 16, stiffness: 140 },
  });
  const descS = spring({
    frame: frame - 24,
    fps,
    config: { damping: 20, stiffness: 130 },
  });
  const mockS = spring({
    frame: frame - 12,
    fps,
    config: { damping: 14, stiffness: 110 },
  });

  return (
    <AbsoluteFill>
      <BackdropRays />
      <AbsoluteFill
        style={{
          padding: '90px 70px',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        <Eyebrow text={step} delay={0} />

        <h2
          style={{
            fontFamily: displayFont,
            fontWeight: 900,
            fontSize: 96,
            color: CREAM,
            lineHeight: 0.95,
            margin: 0,
            letterSpacing: '-0.03em',
            transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
            opacity: titleS,
          }}
        >
          {title}
          <br />
          <span style={{ color: YELLOW }}>{titleAccent}</span>
        </h2>

        <p
          style={{
            fontFamily: bodyFont,
            fontSize: 36,
            color: 'rgba(250,247,239,0.85)',
            lineHeight: 1.35,
            margin: 0,
            fontWeight: 500,
            transform: `translateY(${interpolate(descS, [0, 1], [24, 0])}px)`,
            opacity: descS,
            maxWidth: 900,
          }}
        >
          {description}
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            marginTop: 8,
          }}
        >
          {bullets.map((b, i) => {
            const s = spring({
              frame: frame - 40 - i * 14,
              fps,
              config: { damping: 18, stiffness: 150 },
            });
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  transform: `translateX(${interpolate(s, [0, 1], [-40, 0])}px)`,
                  opacity: s,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: YELLOW,
                    boxShadow: `0 0 14px ${YELLOW}`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: bodyFont,
                    fontSize: 30,
                    color: CREAM,
                    fontWeight: 500,
                    lineHeight: 1.25,
                  }}
                >
                  {b}
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'center',
            transform: `translateY(${interpolate(mockS, [0, 1], [60, 0])}px)`,
            opacity: mockS,
          }}
        >
          {mock}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------- Mocks (visual props for feature scenes) ---------- */

const PhoneFrame: React.FC<{ children: React.ReactNode; height?: number }> = ({
  children,
  height = 560,
}) => (
  <div
    style={{
      width: 380,
      height,
      borderRadius: 44,
      background: '#111',
      border: '6px solid #222',
      boxShadow:
        '0 40px 80px rgba(0,0,0,0.6), 0 0 0 2px rgba(245,197,24,0.25)',
      overflow: 'hidden',
      position: 'relative',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 110,
        height: 22,
        borderRadius: 999,
        background: '#000',
        zIndex: 2,
      }}
    />
    {children}
  </div>
);

const WhatsMock: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bubbles = [
    { me: true, text: 'Oi Horus! O que é usucapião?', at: 20 },
    {
      me: false,
      text: 'Usucapião é quando alguém vira dono de um imóvel pelo uso prolongado. Quer que eu explique com um exemplo?',
      at: 40,
    },
    { me: true, text: 'Sim, por favor 🙏', at: 65 },
  ];
  return (
    <PhoneFrame height={520}>
      <div
        style={{
          background: '#0b141a',
          height: '100%',
          padding: '48px 14px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 6px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: YELLOW,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              color: INK,
              fontSize: 16,
              fontFamily: bodyFont,
            }}
          >
            H
          </div>
          <div>
            <div
              style={{
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: bodyFont,
              }}
            >
              Horus
            </div>
            <div
              style={{
                color: '#25D366',
                fontSize: 11,
                fontFamily: bodyFont,
              }}
            >
              online
            </div>
          </div>
        </div>
        {bubbles.map((b, i) => {
          const s = spring({
            frame: frame - b.at,
            fps,
            config: { damping: 20, stiffness: 200 },
          });
          return (
            <div
              key={i}
              style={{
                alignSelf: b.me ? 'flex-end' : 'flex-start',
                maxWidth: '82%',
                background: b.me ? '#005c4b' : '#202c33',
                color: '#fff',
                padding: '9px 12px',
                borderRadius: 10,
                fontSize: 14,
                fontFamily: bodyFont,
                lineHeight: 1.35,
                transform: `translateY(${interpolate(s, [0, 1], [12, 0])}px)`,
                opacity: s,
              }}
            >
              {b.text}
            </div>
          );
        })}
      </div>
    </PhoneFrame>
  );
};

const DocMock: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scan = interpolate(frame % 90, [0, 90], [0, 100]);
  return (
    <div
      style={{
        display: 'flex',
        gap: 20,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 220,
          height: 300,
          background: CREAM,
          borderRadius: 8,
          boxShadow:
            '0 30px 60px rgba(0,0,0,0.5), 0 0 0 2px rgba(245,197,24,0.25)',
          padding: 20,
          position: 'relative',
          overflow: 'hidden',
          transform: 'rotate(-5deg)',
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 6,
              background: '#333',
              opacity: 0.6,
              borderRadius: 2,
              marginBottom: 10,
              width: `${60 + ((i * 13) % 40)}%`,
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${scan}%`,
            height: 4,
            background: YELLOW,
            boxShadow: `0 0 20px ${YELLOW}, 0 -80px 60px rgba(245,197,24,0.35)`,
          }}
        />
      </div>
      <div
        style={{
          fontSize: 60,
          color: YELLOW,
          fontFamily: displayFont,
          fontWeight: 900,
        }}
      >
        →
      </div>
      <div
        style={{
          width: 230,
          padding: 16,
          borderRadius: 16,
          background: 'rgba(245,197,24,0.14)',
          border: '2px solid rgba(245,197,24,0.4)',
          color: CREAM,
          fontFamily: bodyFont,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: YELLOW,
            fontWeight: 700,
            letterSpacing: '0.2em',
            marginBottom: 8,
            textTransform: 'uppercase',
          }}
        >
          Resumo
        </div>
        {['Objeto do contrato', 'Prazo: 24 meses', 'Multa rescisória: 20%', 'Foro: Comarca da Capital'].map(
          (t, i) => {
            const s = spring({
              frame: frame - 25 - i * 10,
              fps,
              config: { damping: 20, stiffness: 180 },
            });
            return (
              <div
                key={i}
                style={{
                  fontSize: 14,
                  marginBottom: 6,
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [10, 0])}px)`,
                }}
              >
                • {t}
              </div>
            );
          },
        )}
      </div>
    </div>
  );
};

const OCRMock: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scan = interpolate(frame % 60, [0, 60], [0, 100]);
  return (
    <div
      style={{
        width: 380,
        height: 260,
        borderRadius: 24,
        background: '#1a1a1a',
        border: '2px solid rgba(245,197,24,0.4)',
        position: 'relative',
        overflow: 'hidden',
        padding: 18,
        fontFamily: bodyFont,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: YELLOW,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        Foto do caderno
      </div>
      <div
        style={{
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 12,
          padding: 12,
          color: '#ddd',
          fontSize: 15,
          lineHeight: 1.5,
          fontStyle: 'italic',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        "Art. 5º Todos são iguais perante a lei…"
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${scan}%`,
            height: 2,
            background: YELLOW,
            boxShadow: `0 0 14px ${YELLOW}`,
          }}
        />
      </div>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            background: YELLOW,
            color: INK,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {spring({ frame: frame - 20, fps, config: { damping: 20 } }) > 0.5
            ? 'Reconhecido ✓'
            : 'Lendo…'}
        </div>
        <div style={{ color: '#888', fontSize: 12 }}>
          CF/88 · Art. 5º · Direitos Fundamentais
        </div>
      </div>
    </div>
  );
};

const AudioMock: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: 380,
        padding: 20,
        borderRadius: 24,
        background: '#1a1a1a',
        border: '2px solid rgba(245,197,24,0.4)',
        fontFamily: bodyFont,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: YELLOW,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        Você enviou um áudio
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          height: 60,
        }}
      >
        {Array.from({ length: 40 }).map((_, i) => {
          const h = 20 + Math.abs(Math.sin(i * 0.5 + frame / 4)) * 40;
          const active = i < ((frame / 2) % 40);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: h,
                background: active ? YELLOW : 'rgba(255,255,255,0.15)',
                borderRadius: 2,
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          color: CREAM,
          fontSize: 16,
          lineHeight: 1.35,
        }}
      >
        "Explica pra mim o que é <b style={{ color: YELLOW }}>habeas corpus</b> em um minuto"
      </div>
      <div
        style={{
          fontSize: 12,
          color: '#888',
        }}
      >
        Respondo em áudio também 🎧
      </div>
    </div>
  );
};

const RadarMock: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = ((frame % 60) / 60) * 100;
  const items = [
    { t: 'Nova Lei sancionada', d: 'PL 2.338/23 · IA no setor público' },
    { t: 'STF publica súmula', d: 'Súmula Vinculante 59' },
    { t: 'Portaria MJ', d: 'Regulamenta atendimento em delegacias' },
  ];
  return (
    <div
      style={{
        width: 400,
        padding: 20,
        borderRadius: 24,
        background: '#1a1a1a',
        border: '2px solid rgba(245,197,24,0.4)',
        fontFamily: bodyFont,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: YELLOW,
          boxShadow: `0 0 0 ${pulse * 0.3}px rgba(245,197,24,${
            0.3 - pulse * 0.003
          })`,
        }}
      />
      <div
        style={{
          fontSize: 13,
          color: YELLOW,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        Radar de leis
      </div>
      {items.map((it, i) => {
        const s = spring({
          frame: frame - 20 - i * 12,
          fps,
          config: { damping: 20, stiffness: 180 },
        });
        return (
          <div
            key={i}
            style={{
              padding: '10px 0',
              borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
              transform: `translateY(${interpolate(s, [0, 1], [16, 0])}px)`,
              opacity: s,
            }}
          >
            <div
              style={{
                color: CREAM,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {it.t}
            </div>
            <div style={{ color: '#999', fontSize: 13, marginTop: 2 }}>
              {it.d}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Checklist recap (visual summary of all features)                   */
/* ------------------------------------------------------------------ */

const CHECK_ITEMS = [
  'Explico artigos e leis em linguagem simples',
  'Resumo PDFs, provas e documentos',
  'Leio imagens do caderno ou da prova',
  'Entendo áudios e respondo em áudio',
  'Aviso sobre novas leis e boletins',
  'Tudo direto no seu WhatsApp',
];

const CheckIcon: React.FC<{ progress: number }> = ({ progress }) => {
  const dash = 60;
  const drawn = dash * (1 - progress);
  return (
    <svg width={64} height={64} viewBox="0 0 72 72">
      <circle
        cx={36}
        cy={36}
        r={30}
        stroke={YELLOW}
        strokeWidth={4}
        fill="rgba(245,197,24,0.15)"
      />
      <path
        d="M22 38 L32 48 L52 26"
        stroke={YELLOW}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={dash}
        strokeDashoffset={drawn}
      />
    </svg>
  );
};

const SceneChecklist: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <BackdropRays />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          padding: '90px 70px',
        }}
      >
        <div style={{ alignSelf: 'flex-start', marginBottom: 30 }}>
          <Eyebrow text="Resumindo" />
        </div>
        <h3
          style={{
            fontFamily: displayFont,
            fontWeight: 900,
            fontSize: 68,
            color: CREAM,
            letterSpacing: '-0.02em',
            margin: '0 0 36px',
            alignSelf: 'flex-start',
            lineHeight: 1,
          }}
        >
          Tudo que <span style={{ color: YELLOW }}>eu sei fazer</span>
        </h3>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            width: '100%',
          }}
        >
          {CHECK_ITEMS.map((item, i) => {
            const start = 8 + i * 14;
            const s = spring({
              frame: frame - start,
              fps,
              config: { damping: 14, stiffness: 160 },
            });
            const drawS = spring({
              frame: frame - start - 8,
              fps,
              config: { damping: 20, stiffness: 100 },
            });
            const x = interpolate(s, [0, 1], [-120, 0]);
            const op = interpolate(s, [0, 1], [0, 1]);
            return (
              <div
                key={i}
                style={{
                  transform: `translateX(${x}px)`,
                  opacity: op,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 22,
                  padding: '18px 26px',
                  borderRadius: 24,
                  background:
                    'linear-gradient(90deg, rgba(245,197,24,0.14) 0%, rgba(245,197,24,0.02) 100%)',
                  border: '2px solid rgba(245,197,24,0.35)',
                }}
              >
                <CheckIcon progress={drawS} />
                <span
                  style={{
                    fontFamily: bodyFont,
                    fontSize: 32,
                    fontWeight: 600,
                    color: CREAM,
                    lineHeight: 1.15,
                  }}
                >
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene — LIMITES (o que eu NÃO faço)                                */
/* ------------------------------------------------------------------ */

const LIMITS = [
  'Não substituo um advogado',
  'Não emito parecer oficial nem faço petição',
  'Sempre confira antes de agir em processo',
  'Não guardo nem exponho seus dados pessoais',
];

const SceneLimites: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <BackdropRays />
      <AbsoluteFill
        style={{
          padding: '90px 70px',
          display: 'flex',
          flexDirection: 'column',
          gap: 30,
        }}
      >
        <Eyebrow text="Importante saber" />

        <h2
          style={{
            fontFamily: displayFont,
            fontWeight: 900,
            fontSize: 84,
            color: CREAM,
            lineHeight: 0.95,
            margin: 0,
            letterSpacing: '-0.03em',
          }}
        >
          O que eu <span style={{ color: YELLOW }}>não faço</span>
        </h2>

        <p
          style={{
            fontFamily: bodyFont,
            fontSize: 32,
            color: 'rgba(250,247,239,0.75)',
            lineHeight: 1.35,
            margin: 0,
            fontWeight: 500,
            maxWidth: 900,
          }}
        >
          Sou seu companheiro de estudos e consulta rápida — mas conhecer meus
          limites te protege.
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            marginTop: 10,
          }}
        >
          {LIMITS.map((t, i) => {
            const s = spring({
              frame: frame - 20 - i * 14,
              fps,
              config: { damping: 18, stiffness: 150 },
            });
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  padding: '18px 24px',
                  borderRadius: 20,
                  background: 'rgba(255,255,255,0.04)',
                  border: '2px dashed rgba(245,197,24,0.4)',
                  transform: `translateY(${interpolate(s, [0, 1], [24, 0])}px)`,
                  opacity: s,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'rgba(245,197,24,0.14)',
                    border: `2px solid ${YELLOW}`,
                    color: YELLOW,
                    fontFamily: displayFont,
                    fontWeight: 900,
                    fontSize: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  !
                </div>
                <span
                  style={{
                    fontFamily: bodyFont,
                    fontSize: 30,
                    fontWeight: 600,
                    color: CREAM,
                    lineHeight: 1.2,
                  }}
                >
                  {t}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene — PERGUNTA NOME                                             */
/* ------------------------------------------------------------------ */

const ScenePerguntaNome: React.FC<{ owlSrc: string }> = ({ owlSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14, stiffness: 130 } });
  const owlY = interpolate(s, [0, 1], [40, 0]) + Math.sin(frame / 9) * 6;
  const textY = interpolate(s, [0, 1], [60, 0]);

  return (
    <AbsoluteFill>
      <BackdropRays />
      <Sparkles count={8} />
      <AbsoluteFill
        style={{ alignItems: 'center', justifyContent: 'center', gap: 40 }}
      >
        <div
          style={{
            transform: `translateY(${owlY}px)`,
            filter: 'drop-shadow(0 20px 40px rgba(245,197,24,0.35))',
          }}
        >
          <Img
            src={owlSrc}
            style={{ width: 340, height: 340, objectFit: 'contain' }}
          />
        </div>
        <div
          style={{
            transform: `translateY(${textY}px)`,
            textAlign: 'center',
            padding: '0 80px',
            opacity: s,
          }}
        >
          <p
            style={{
              fontFamily: bodyFont,
              fontSize: 30,
              color: YELLOW,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              margin: 0,
              fontWeight: 700,
            }}
          >
            Uma última coisa
          </p>
          <h2
            style={{
              fontFamily: displayFont,
              fontWeight: 900,
              fontSize: 100,
              color: CREAM,
              lineHeight: 1,
              margin: '24px 0 0',
              letterSpacing: '-0.03em',
            }}
          >
            Como posso te <span style={{ color: YELLOW }}>chamar?</span>
          </h2>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene — SAUDAÇÃO FINAL                                            */
/* ------------------------------------------------------------------ */

const SceneSaudacao: React.FC<{ owlSrc: string; nome: string }> = ({
  owlSrc,
  nome,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12, stiffness: 140 } });
  const owlScale = interpolate(s, [0, 1], [0.6, 1]);
  const wave = Math.sin(frame / 5) * 8;

  const primeiro = (nome || 'você').trim().split(/\s+/)[0];

  return (
    <AbsoluteFill>
      <BackdropRays />
      <Sparkles count={18} />
      <AbsoluteFill
        style={{ alignItems: 'center', justifyContent: 'center', gap: 40 }}
      >
        <div
          style={{
            transform: `translateY(${wave}px) scale(${owlScale}) rotate(${
              Math.sin(frame / 8) * 4
            }deg)`,
            filter: 'drop-shadow(0 30px 60px rgba(245,197,24,0.5))',
          }}
        >
          <Img
            src={owlSrc}
            style={{ width: 420, height: 420, objectFit: 'contain' }}
          />
        </div>

        <div
          style={{ textAlign: 'center', opacity: s, padding: '0 60px' }}
        >
          <p
            style={{
              fontFamily: bodyFont,
              fontSize: 36,
              color: YELLOW,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              margin: 0,
              fontWeight: 700,
            }}
          >
            Prazer em te conhecer
          </p>
          <h1
            style={{
              fontFamily: displayFont,
              fontWeight: 900,
              fontSize: 140,
              color: CREAM,
              lineHeight: 0.95,
              margin: '20px 0 0',
              letterSpacing: '-0.04em',
            }}
          >
            Olá,{' '}
            <span
              style={{
                color: YELLOW,
                textShadow: '0 8px 40px rgba(245,197,24,0.5)',
              }}
            >
              {primeiro}!
            </span>
          </h1>
          <p
            style={{
              fontFamily: bodyFont,
              fontSize: 34,
              color: 'rgba(250,247,239,0.75)',
              margin: '30px 0 0',
              fontWeight: 500,
            }}
          >
            Estou pronto para te ajudar.
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Composição principal                                              */
/* ------------------------------------------------------------------ */

export type HorusIntroProps = {
  owlSrc: string;
  nome: string;
};

/**
 * Sequências (30fps):
 *   1. Abertura              90     (0–90)
 *   2. Apresentação          70
 *   3. Feature 1 — WhatsApp  150
 *   4. Feature 2 — Docs      150
 *   5. Feature 3 — OCR       150
 *   6. Feature 4 — Áudios    150
 *   7. Feature 5 — Radar     150
 *   8. Checklist recap       170
 *   9. Limites               160
 *  10. Pergunta nome         80    ← PAUSE aqui (input)
 *  11. Saudação final        120
 *
 * Transições (subtraídas do total): 10 transições * ~15 frames.
 */
export const HORUS_INTRO_FPS = 30;
export const HORUS_INTRO_WIDTH = 1080;
export const HORUS_INTRO_HEIGHT = 1920;

const SEQ = {
  abertura: 90,
  apresentacao: 70,
  featWhats: 150,
  featDocs: 150,
  featOCR: 150,
  featAudio: 150,
  featRadar: 150,
  checklist: 170,
  limites: 160,
  perguntaNome: 80,
  saudacao: 120,
};

const TRANS = {
  t1: 15, // abertura → apresentação (fade)
  t2: 20, // apresentação → whats (wipe)
  t3: 15, // whats → docs (fade)
  t4: 15, // docs → ocr (fade)
  t5: 15, // ocr → audio (fade)
  t6: 15, // audio → radar (fade)
  t7: 20, // radar → checklist (wipe)
  t8: 15, // checklist → limites (fade)
  t9: 20, // limites → pergunta (fade)
  t10: 20, // pergunta → saudação (fade)
};

const TOTAL_SEQ = Object.values(SEQ).reduce((a, b) => a + b, 0);
const TOTAL_TRANS = Object.values(TRANS).reduce((a, b) => a + b, 0);
export const HORUS_INTRO_DURATION = TOTAL_SEQ - TOTAL_TRANS;

// PAUSE = 40 frames dentro da cena "Pergunta nome" (para o input aparecer suave).
const START_PERGUNTA =
  SEQ.abertura +
  SEQ.apresentacao +
  SEQ.featWhats +
  SEQ.featDocs +
  SEQ.featOCR +
  SEQ.featAudio +
  SEQ.featRadar +
  SEQ.checklist +
  SEQ.limites -
  (TRANS.t1 +
    TRANS.t2 +
    TRANS.t3 +
    TRANS.t4 +
    TRANS.t5 +
    TRANS.t6 +
    TRANS.t7 +
    TRANS.t8 +
    TRANS.t9);
export const HORUS_INTRO_PAUSE_FRAME = START_PERGUNTA + 40;

export const HorusIntroVideo: React.FC<HorusIntroProps> = ({
  owlSrc,
  nome,
}) => {
  return (
    <AbsoluteFill style={{ background: INK }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SEQ.abertura}>
          <SceneAbertura owlSrc={owlSrc} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t1 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.apresentacao}>
          <SceneApresentacao owlSrc={owlSrc} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: 'from-bottom' })}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: TRANS.t2,
          })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.featWhats}>
          <FeatureScene
            step="01 / 05"
            title="Converse comigo"
            titleAccent="no WhatsApp"
            description="Sem baixar nada extra. Manda uma mensagem, foto ou áudio no WhatsApp e eu respondo em segundos."
            bullets={[
              'Respostas em texto, áudio ou imagem',
              'Funciona 24h, todos os dias',
              'Histórico salvo pra você consultar depois',
            ]}
            mock={<WhatsMock />}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t3 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.featDocs}>
          <FeatureScene
            step="02 / 05"
            title="Resumo PDFs"
            titleAccent="e documentos"
            description="Me envie um contrato, sentença, edital ou apostila. Eu leio tudo e devolvo o essencial: pontos-chave, prazos e riscos."
            bullets={[
              'Contratos, editais, sentenças, provas',
              'Até 200 páginas por documento',
              'Aponto cláusulas críticas em destaque',
            ]}
            mock={<DocMock />}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t4 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.featOCR}>
          <FeatureScene
            step="03 / 05"
            title="Leio imagens"
            titleAccent="do seu caderno"
            description="Tirou foto da prova, do resumo ou de um artigo impresso? Mando a foto e eu transcrevo, explico e até resolvo com você."
            bullets={[
              'Reconhece letra impressa e manuscrita',
              'Identifica artigos, súmulas e jurisprudência',
              'Explica cada trecho em linguagem simples',
            ]}
            mock={<OCRMock />}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t5 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.featAudio}>
          <FeatureScene
            step="04 / 05"
            title="Entendo áudios"
            titleAccent="e respondo falando"
            description="Sem tempo pra digitar? Grava um áudio explicando sua dúvida. Eu escuto, entendo e volto a resposta em áudio pra você."
            bullets={[
              'Perfeito pra usar dirigindo ou andando',
              'Transcrevo e resumo áudios de aula',
              'Respondo em português natural',
            ]}
            mock={<AudioMock />}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t6 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.featRadar}>
          <FeatureScene
            step="05 / 05"
            title="Aviso quando"
            titleAccent="mudar uma lei"
            description="Monitoro o Diário Oficial, o STF e o STJ e te aviso sobre novas leis, súmulas e portarias que interessam ao que você estuda."
            bullets={[
              'Novas leis federais e estaduais',
              'Súmulas vinculantes do STF e STJ',
              'Resumo curto direto no WhatsApp',
            ]}
            mock={<RadarMock />}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: 'from-top' })}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: TRANS.t7,
          })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.checklist}>
          <SceneChecklist />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t8 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.limites}>
          <SceneLimites />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t9 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.perguntaNome}>
          <ScenePerguntaNome owlSrc={owlSrc} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t10 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.saudacao}>
          <SceneSaudacao owlSrc={owlSrc} nome={nome} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

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
/*  Design tokens                                                     */
/* ------------------------------------------------------------------ */
const INK = '#0A0A0A';
const YELLOW = '#F5C518';
const YELLOW_SOFT = '#FFDD57';
const CREAM = '#FAF7EF';
const displayFont = '"Space Grotesk", "Inter", ui-sans-serif, system-ui, sans-serif';
const bodyFont = '"Inter", ui-sans-serif, system-ui, sans-serif';

const Backdrop: React.FC = () => {
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
          filter: 'blur(50px)',
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

const Eyebrow: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = spring({ frame, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        opacity: o,
        transform: `translateY(${(1 - o) * 8}px)`,
      }}
    >
      <span
        style={{
          width: 44,
          height: 3,
          borderRadius: 2,
          background: YELLOW,
          boxShadow: `0 0 12px ${YELLOW}`,
        }}
      />
      <span
        style={{
          fontFamily: bodyFont,
          color: YELLOW,
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
        }}
      >
        {text}
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Scenes                                                            */
/* ------------------------------------------------------------------ */

const SceneAbertura: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  const scale = interpolate(s, [0, 1], [0.9, 1]);
  const tagline = spring({ frame: frame - 20, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Backdrop />
      <div style={{ textAlign: 'center', transform: `scale(${scale})`, opacity: s }}>
        <div
          style={{
            fontFamily: displayFont,
            fontSize: 180,
            fontWeight: 800,
            color: YELLOW,
            lineHeight: 0.9,
            letterSpacing: '-0.04em',
            textShadow: `0 0 60px rgba(245,197,24,0.35)`,
          }}
        >
          Vacatio
        </div>
        <div
          style={{
            marginTop: 32,
            fontFamily: bodyFont,
            fontSize: 42,
            color: CREAM,
            opacity: tagline * 0.85,
            letterSpacing: '0.08em',
          }}
        >
          Direito, do seu jeito.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneBoasVindas: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <Backdrop />
      <div style={{ opacity: s, transform: `translateY(${(1 - s) * 30}px)`, textAlign: 'center' }}>
        <Eyebrow text="Bem-vindo(a)" />
        <div
          style={{
            marginTop: 40,
            fontFamily: displayFont,
            fontSize: 108,
            fontWeight: 800,
            color: CREAM,
            lineHeight: 1.02,
            letterSpacing: '-0.03em',
          }}
        >
          Vamos montar
          <br />
          <span style={{ color: YELLOW }}>o app do seu jeito.</span>
        </div>
        <div
          style={{
            marginTop: 40,
            fontFamily: bodyFont,
            fontSize: 40,
            color: 'rgba(250,247,239,0.7)',
            maxWidth: 780,
            margin: '40px auto 0',
            lineHeight: 1.35,
          }}
        >
          Três perguntas rápidas pra deixar tudo na sua medida.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ScenePersona: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ padding: 100, justifyContent: 'center' }}>
      <Backdrop />
      <div style={{ opacity: s }}>
        <Eyebrow text="Passo 1 de 3" />
        <div
          style={{
            marginTop: 32,
            fontFamily: displayFont,
            fontSize: 96,
            fontWeight: 800,
            color: CREAM,
            letterSpacing: '-0.03em',
            lineHeight: 1.02,
          }}
        >
          Quem é você?
        </div>
        <div
          style={{
            marginTop: 24,
            fontFamily: bodyFont,
            fontSize: 38,
            color: 'rgba(250,247,239,0.7)',
            lineHeight: 1.35,
          }}
        >
          Selecione o perfil que mais combina com o seu momento agora.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneConfirma: React.FC<{ label: string }> = ({ label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  const scale = interpolate(s, [0, 1], [0.85, 1]);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <Backdrop />
      <div style={{ textAlign: 'center', transform: `scale(${scale})`, opacity: s }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: YELLOW,
            marginBottom: 40,
            boxShadow: `0 0 80px rgba(245,197,24,0.5)`,
          }}
        >
          <svg width="90" height="90" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke={INK} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div
          style={{
            fontFamily: displayFont,
            fontSize: 72,
            fontWeight: 800,
            color: CREAM,
            letterSpacing: '-0.02em',
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: 20,
            fontFamily: bodyFont,
            fontSize: 36,
            color: 'rgba(250,247,239,0.65)',
          }}
        >
          Perfeito. Anotado.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneFaixa: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ padding: 100, justifyContent: 'center' }}>
      <Backdrop />
      <div style={{ opacity: s }}>
        <Eyebrow text="Passo 2 de 3" />
        <div
          style={{
            marginTop: 32,
            fontFamily: displayFont,
            fontSize: 96,
            fontWeight: 800,
            color: CREAM,
            letterSpacing: '-0.03em',
            lineHeight: 1.02,
          }}
        >
          Sua faixa
          <br />
          <span style={{ color: YELLOW }}>etária?</span>
        </div>
        <div
          style={{
            marginTop: 24,
            fontFamily: bodyFont,
            fontSize: 38,
            color: 'rgba(250,247,239,0.7)',
            lineHeight: 1.35,
          }}
        >
          A gente ajusta a linguagem e o conteúdo pra você.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneInteresses: React.FC = () => {
  const frame = useCurrentFrame();
  const chips = [
    'Constitucional',
    'Penal',
    'Civil',
    'Trabalho',
    'Tributário',
    'Administrativo',
    'Processo Civil',
    'Empresarial',
  ];
  return (
    <AbsoluteFill style={{ padding: 100, justifyContent: 'center' }}>
      <Backdrop />
      <Eyebrow text="Áreas do Direito" />
      <div
        style={{
          marginTop: 32,
          fontFamily: displayFont,
          fontSize: 92,
          fontWeight: 800,
          color: CREAM,
          letterSpacing: '-0.03em',
          lineHeight: 1.02,
        }}
      >
        Tudo que você
        <br />
        estuda, num só lugar.
      </div>
      <div style={{ marginTop: 56, display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {chips.map((c, i) => {
          const start = i * 6;
          const t = Math.min(1, Math.max(0, (frame - start) / 20));
          return (
            <div
              key={c}
              style={{
                padding: '22px 40px',
                borderRadius: 100,
                border: `2px solid rgba(245,197,24,${0.3 + t * 0.4})`,
                background: `rgba(245,197,24,${0.05 + t * 0.08})`,
                color: CREAM,
                fontFamily: bodyFont,
                fontSize: 34,
                fontWeight: 600,
                opacity: t,
                transform: `translateY(${(1 - t) * 20}px)`,
              }}
            >
              {c}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const FeatureCard: React.FC<{
  step: string;
  title: string;
  accent: string;
  desc: string;
  icon: React.ReactNode;
}> = ({ step, title, accent, desc, icon }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ padding: 100, justifyContent: 'center' }}>
      <Backdrop />
      <div style={{ opacity: s, transform: `translateY(${(1 - s) * 30}px)` }}>
        <Eyebrow text={step} />
        <div
          style={{
            marginTop: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 200,
            height: 200,
            borderRadius: 48,
            background: `linear-gradient(135deg, ${YELLOW}, ${YELLOW_SOFT})`,
            boxShadow: '0 0 80px rgba(245,197,24,0.4)',
            marginBottom: 48,
          }}
        >
          {icon}
        </div>
        <div
          style={{
            fontFamily: displayFont,
            fontSize: 100,
            fontWeight: 800,
            color: CREAM,
            letterSpacing: '-0.03em',
            lineHeight: 1.0,
          }}
        >
          {title}
          <br />
          <span style={{ color: YELLOW }}>{accent}</span>
        </div>
        <div
          style={{
            marginTop: 36,
            fontFamily: bodyFont,
            fontSize: 40,
            color: 'rgba(250,247,239,0.72)',
            lineHeight: 1.35,
            maxWidth: 850,
          }}
        >
          {desc}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const IconBook = (
  <svg width="110" height="110" viewBox="0 0 24 24" fill="none">
    <path d="M4 4h9a3 3 0 013 3v13H7a3 3 0 01-3-3V4z" stroke={INK} strokeWidth="2" />
    <path d="M20 4h-2v13a3 3 0 01-3 3h5V4z" stroke={INK} strokeWidth="2" />
  </svg>
);
const IconRadar = (
  <svg width="110" height="110" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={INK} strokeWidth="2" />
    <circle cx="12" cy="12" r="5" stroke={INK} strokeWidth="2" />
    <circle cx="12" cy="12" r="1.5" fill={INK} />
  </svg>
);
const IconOwl = (
  <svg width="110" height="110" viewBox="0 0 24 24" fill="none">
    <path d="M12 3l2 3h-4l2-3z" fill={INK} />
    <circle cx="12" cy="13" r="8" stroke={INK} strokeWidth="2" />
    <circle cx="9" cy="12" r="2" fill={INK} />
    <circle cx="15" cy="12" r="2" fill={INK} />
  </svg>
);
const IconBell = (
  <svg width="110" height="110" viewBox="0 0 24 24" fill="none">
    <path
      d="M6 16V11a6 6 0 1112 0v5l2 3H4l2-3z"
      stroke={INK}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M10 21a2 2 0 004 0" stroke={INK} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const SceneEncerramento: React.FC<{ nome: string }> = ({ nome }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <Backdrop />
      <div style={{ textAlign: 'center', opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}>
        <Eyebrow text="Pronto!" />
        <div
          style={{
            marginTop: 40,
            fontFamily: displayFont,
            fontSize: 120,
            fontWeight: 800,
            color: CREAM,
            letterSpacing: '-0.03em',
            lineHeight: 0.98,
          }}
        >
          Bora estudar,
          <br />
          <span style={{ color: YELLOW }}>{nome}!</span>
        </div>
        <div
          style={{
            marginTop: 40,
            fontFamily: bodyFont,
            fontSize: 40,
            color: 'rgba(250,247,239,0.72)',
            maxWidth: 780,
            margin: '40px auto 0',
            lineHeight: 1.35,
          }}
        >
          Tudo pronto. Seu Vacatio já está personalizado.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Composition                                                       */
/* ------------------------------------------------------------------ */

export type CadastroIntroProps = {
  nome: string;
  personaLabel?: string | null;
};

export const CADASTRO_FPS = 30;
export const CADASTRO_WIDTH = 1080;
export const CADASTRO_HEIGHT = 1920;

const SEQ = {
  abertura: 70,
  boas: 70,
  persona: 70,
  confirma: 55,
  faixa: 70,
  interesses: 110,
  featBook: 120,
  featRadar: 120,
  featOwl: 120,
  featNotif: 110,
  encerramento: 130,
};

const TRANS = {
  t1: 15,
  t2: 20, // → persona pause
  t3: 20, // → confirma
  t4: 20, // → faixa pause
  t5: 20, // → interesses
  t6: 15,
  t7: 15,
  t8: 15,
  t9: 15,
  t10: 20,
};

const TOTAL_SEQ = Object.values(SEQ).reduce((a, b) => a + b, 0);
const TOTAL_TRANS = Object.values(TRANS).reduce((a, b) => a + b, 0);
export const CADASTRO_DURATION = TOTAL_SEQ - TOTAL_TRANS;

// Pausa 1: cena persona (após 40 frames — dá tempo do título aparecer)
export const CADASTRO_PAUSE_PERSONA =
  SEQ.abertura + SEQ.boas - (TRANS.t1 + TRANS.t2) + 30;

// Pausa 2: cena faixa (após confirma + 30 frames)
export const CADASTRO_PAUSE_FAIXA =
  SEQ.abertura +
  SEQ.boas +
  SEQ.persona +
  SEQ.confirma -
  (TRANS.t1 + TRANS.t2 + TRANS.t3 + TRANS.t4) +
  30;

export const CadastroIntroVideo: React.FC<CadastroIntroProps> = ({
  nome,
  personaLabel,
}) => {
  return (
    <AbsoluteFill style={{ background: INK }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SEQ.abertura}>
          <SceneAbertura />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t1 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.boas}>
          <SceneBoasVindas />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: 'from-bottom' })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANS.t2 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.persona}>
          <ScenePersona />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t3 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.confirma}>
          <SceneConfirma label={personaLabel || 'Perfil selecionado'} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t4 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.faixa}>
          <SceneFaixa />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: 'from-right' })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANS.t5 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.interesses}>
          <SceneInteresses />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t6 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.featBook}>
          <FeatureCard
            step="Biblioteca"
            title="Milhares de leis"
            accent="explicadas."
            desc="Códigos comentados, jurisprudência e clássicos do Direito prontos pra estudar."
            icon={IconBook}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t7 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.featRadar}>
          <FeatureCard
            step="Radar de Leis"
            title="Fico de olho"
            accent="por você."
            desc="Novas leis, súmulas e portarias chegam com resumo pronto na sua tela."
            icon={IconRadar}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t8 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.featOwl}>
          <FeatureCard
            step="Assistente Horus"
            title="Tira dúvidas"
            accent="no WhatsApp."
            desc="Conversa direto com o Horus — texto, foto ou áudio. Respostas 24 horas."
            icon={IconOwl}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t9 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.featNotif}>
          <FeatureCard
            step="Notificações"
            title="Só o que"
            accent="importa."
            desc="A gente te avisa das novidades da sua área — sem spam, sem barulho à toa."
            icon={IconBell}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANS.t10 })}
        />

        <TransitionSeries.Sequence durationInFrames={SEQ.encerramento}>
          <SceneEncerramento nome={nome || 'você'} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

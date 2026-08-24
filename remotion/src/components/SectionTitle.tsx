import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  delay?: number;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 200 } });
  const lineWidth = interpolate(s, [0, 1], [0, 400]);
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [60, 0]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, opacity, transform: `translateY(${y}px)` }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 72, fontWeight: 700, color: "#f8fafc", textAlign: "center", margin: 0, letterSpacing: 2 }}>
        {title}
      </h1>
      {/* Gold line */}
      <div style={{ width: lineWidth, height: 3, background: "linear-gradient(90deg, transparent, #d4a845, transparent)", borderRadius: 2 }} />
      {subtitle && (
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 28, color: "#d4a845", textAlign: "center", margin: 0, letterSpacing: 4, textTransform: "uppercase" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

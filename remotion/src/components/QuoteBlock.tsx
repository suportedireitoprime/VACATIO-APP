import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface QuoteBlockProps {
  title: string;
  quote: string;
  author?: string;
  delay?: number;
}

export const QuoteBlock: React.FC<QuoteBlockProps> = ({ title, quote, author, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 160 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const scale = interpolate(s, [0, 1], [0.95, 1]);

  const quoteS = spring({ frame: frame - delay - 15, fps, config: { damping: 25, stiffness: 140 } });
  const quoteOpacity = interpolate(quoteS, [0, 1], [0, 1]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 120px", width: "100%", boxSizing: "border-box" }}>
      <div style={{ opacity, transform: `scale(${scale})`, marginBottom: 40 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, color: "#d4a845", textAlign: "center", margin: 0, fontWeight: 700 }}>
          {title}
        </h2>
      </div>
      <div
        style={{
          opacity: quoteOpacity,
          background: "rgba(212, 168, 69, 0.08)",
          border: "1px solid rgba(212, 168, 69, 0.25)",
          borderRadius: 16,
          padding: "48px 56px",
          maxWidth: 1200,
        }}
      >
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, color: "#f8fafc", textAlign: "center", margin: 0, fontStyle: "italic", lineHeight: 1.6 }}>
          "{quote}"
        </p>
        {author && (
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 22, color: "#94a3b8", textAlign: "center", marginTop: 24, margin: "24px 0 0 0" }}>
            — {author}
          </p>
        )}
      </div>
    </div>
  );
};

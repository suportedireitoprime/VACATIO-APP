import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface MindMapProps {
  title: string;
  items: string[];
  delay?: number;
}

export const MindMap: React.FC<MindMapProps> = ({ title, items, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const centerS = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 200 } });
  const centerOpacity = interpolate(centerS, [0, 1], [0, 1]);
  const centerScale = interpolate(centerS, [0, 1], [0.5, 1]);

  const positions = [
    { x: -350, y: -180 },
    { x: 350, y: -180 },
    { x: -350, y: 180 },
    { x: 350, y: 180 },
  ];

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Center node */}
      <div
        style={{
          opacity: centerOpacity,
          transform: `scale(${centerScale})`,
          background: "linear-gradient(135deg, #dc2626, #991b1b)",
          borderRadius: 20,
          padding: "28px 48px",
          zIndex: 10,
          position: "absolute",
          boxShadow: "0 0 60px rgba(220, 38, 38, 0.3)",
        }}
      >
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#f8fafc", margin: 0, fontWeight: 700, textAlign: "center" }}>
          {title}
        </p>
      </div>

      {/* Branch nodes */}
      {items.map((item, i) => {
        const nodeDelay = delay + 20 + i * 15;
        const nodeS = spring({ frame: frame - nodeDelay, fps, config: { damping: 18, stiffness: 180 } });
        const nodeOpacity = interpolate(nodeS, [0, 1], [0, 1]);
        const nodeScale = interpolate(nodeS, [0, 1], [0.3, 1]);
        const pos = positions[i % positions.length];

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${pos.x}px)`,
              top: `calc(50% + ${pos.y}px)`,
              transform: `translate(-50%, -50%) scale(${nodeScale})`,
              opacity: nodeOpacity,
              background: "rgba(212, 168, 69, 0.12)",
              border: "1px solid rgba(212, 168, 69, 0.4)",
              borderRadius: 16,
              padding: "20px 32px",
              maxWidth: 360,
            }}
          >
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 24, color: "#e2e8f0", margin: 0, textAlign: "center", lineHeight: 1.4 }}>
              {item}
            </p>
          </div>
        );
      })}
    </div>
  );
};

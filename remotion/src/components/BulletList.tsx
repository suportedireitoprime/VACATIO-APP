import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface BulletListProps {
  title: string;
  items: string[];
  delay?: number;
}

export const BulletList: React.FC<BulletListProps> = ({ title, items, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 200 } });
  const titleOpacity = interpolate(titleS, [0, 1], [0, 1]);
  const titleY = interpolate(titleS, [0, 1], [30, 0]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "0 160px", width: "100%", boxSizing: "border-box" }}>
      <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, marginBottom: 40 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, color: "#d4a845", margin: 0, fontWeight: 700 }}>
          {title}
        </h2>
        <div style={{ width: 80, height: 3, background: "#d4a845", marginTop: 12, borderRadius: 2 }} />
      </div>
      {items.map((item, i) => {
        const itemDelay = delay + 15 + i * 12;
        const itemS = spring({ frame: frame - itemDelay, fps, config: { damping: 18, stiffness: 180 } });
        const itemOpacity = interpolate(itemS, [0, 1], [0, 1]);
        const itemX = interpolate(itemS, [0, 1], [-40, 0]);

        return (
          <div
            key={i}
            style={{
              opacity: itemOpacity,
              transform: `translateX(${itemX}px)`,
              display: "flex",
              alignItems: "flex-start",
              gap: 20,
              marginBottom: 28,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#dc2626", marginTop: 12, flexShrink: 0 }} />
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 34, color: "#e2e8f0", margin: 0, lineHeight: 1.5 }}>
              {item}
            </p>
          </div>
        );
      })}
    </div>
  );
};

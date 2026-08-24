import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const shimmer = interpolate(frame % 300, [0, 150, 300], [0, 0.03, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `radial-gradient(ellipse at 50% 40%, rgba(212,168,69,${0.08 + shimmer}) 0%, #0f172a 60%, #0a0f1a 100%)`,
        }}
      />
      {/* Gold line at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: "10%",
          right: "10%",
          height: 1,
          background: "linear-gradient(90deg, transparent, #d4a845, transparent)",
          opacity: 0.4,
        }}
      />
    </AbsoluteFill>
  );
};

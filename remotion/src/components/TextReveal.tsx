import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface TextRevealProps {
  text: string;
  delay?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  textAlign?: "left" | "center" | "right";
  italic?: boolean;
  maxWidth?: string;
}

export const TextReveal: React.FC<TextRevealProps> = ({
  text,
  delay = 0,
  fontSize = 48,
  color = "#f8fafc",
  fontFamily = "Inter, sans-serif",
  fontWeight = 400,
  textAlign = "center",
  italic = false,
  maxWidth = "80%",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 180 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [40, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        fontSize,
        color,
        fontFamily,
        fontWeight,
        textAlign,
        fontStyle: italic ? "italic" : "normal",
        lineHeight: 1.5,
        maxWidth,
        margin: "0 auto",
      }}
    >
      {text}
    </div>
  );
};

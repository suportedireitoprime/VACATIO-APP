import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const ArtigoDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // O texto do Artigo 1 do Código Penal
  const texto = "Artigo 1º - Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.";
  const palavras = texto.split(" ");

  // Vamos fazer cada palavra aparecer a cada 15 frames (0.5 segundos)
  const framesPorPalavra = 15;

  return (
    <AbsoluteFill style={{ backgroundColor: "#1C1C1E", justifyContent: "center", alignItems: "center", padding: "80px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "20px", fontSize: "64px", fontWeight: "bold", color: "white", textAlign: "center", fontFamily: "sans-serif" }}>
        {palavras.map((palavra, index) => {
          const delay = index * framesPorPalavra;
          
          // Animação de pop-in
          const scale = spring({
            fps,
            frame: frame - delay,
            config: {
              damping: 12,
            },
          });
          
          // Opacidade
          const opacity = interpolate(
            frame - delay,
            [0, 10],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          // Cor de destaque (amarelo) para as palavras mais recentes
          const isHighlight = frame >= delay && frame < delay + framesPorPalavra * 3;
          const color = isHighlight ? "#FBBF24" : "white";

          return (
            <span
              key={index}
              style={{
                transform: `scale(${scale})`,
                opacity,
                color,
                transition: "color 0.5s ease",
              }}
            >
              {palavra}
            </span>
          );
        })}
      </div>
      
      {/* Barra de Progresso */}
      <div style={{ position: "absolute", bottom: "100px", width: "80%", height: "20px", backgroundColor: "#333", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ 
          height: "100%", 
          backgroundColor: "#FBBF24", 
          width: `${(frame / (1800)) * 100}%` 
        }} />
      </div>
      
      <div style={{ position: "absolute", bottom: "40px", color: "#888", fontSize: "32px", fontFamily: "sans-serif" }}>
        Gerado automaticamente pelo OmniRoute + Remotion
      </div>
    </AbsoluteFill>
  );
};

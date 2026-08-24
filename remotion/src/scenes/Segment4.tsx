import { AbsoluteFill, Sequence } from "remotion";
import { Background } from "../components/Background";
import { BulletList } from "../components/BulletList";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

loadPlayfair();
loadInter();

export const Segment4: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Sequence from={0} durationInFrames={750}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="CASO 1: A CONDUTA ATÍPICA"
            items={[
              "João comete ato moralmente reprovável hoje",
              "Lei criminalizando o ato é criada amanhã",
              "João não pode ser punido retroativamente",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={750} durationInFrames={750}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="CASO 2: AUMENTO DE PENA"
            items={[
              "Maria furta um objeto sob pena de 1 a 4 anos",
              "Nova lei aumenta pena para 2 a 8 anos",
              "Juiz deve aplicar a pena antiga (mais benéfica)",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={1500} durationInFrames={750}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="CASO 3: DESCRIMINALIZAÇÃO"
            items={[
              "Carlos cumpre pena por crime que deixou de existir",
              "Aplica-se a retroatividade da lei benéfica",
              "A punibilidade de Carlos deve ser extinta",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={2250} durationInFrames={750}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="FOCO OAB E CONCURSOS"
            items={[
              "Cuidado com Medidas Provisórias proibidas",
              "Interprete sempre 'In Dubio Pro Reo'",
              "Diferença entre Lei Penal e Lei Processual",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

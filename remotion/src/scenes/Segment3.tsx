import { AbsoluteFill, Sequence } from "remotion";
import { Background } from "../components/Background";
import { SectionTitle } from "../components/SectionTitle";
import { BulletList } from "../components/BulletList";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

loadPlayfair();
loadInter();

export const Segment3: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Sequence from={0} durationInFrames={600}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <SectionTitle title="ANTERIORIDADE DA LEI PENAL" subtitle="O tempo rege o ato (Tempus Regit Actum)" delay={10} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={600} durationInFrames={800}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="A LEI PRECISA VIR ANTES"
            items={[
              "Irretroatividade: A lei não volta no tempo",
              "Punição apenas de fatos posteriores à vigência",
              "Vacatio Legis: Tempo para conhecimento da norma",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={1400} durationInFrames={800}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="EXCEÇÃO CONSTITUCIONAL"
            items={[
              "Novatio Legis in Mellius: Lei nova benéfica retroage",
              "Abolitio Criminis: Conduta deixa de ser crime",
              "Fundamento: Art. 5º, XL da CF/88",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={2200} durationInFrames={800}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="CRIMES PERMANENTES E CONTINUADOS"
            items={[
              "Súmula 711 do STF",
              "Aplica-se a lei vigente ao final da conduta",
              "Atenção para leis mais graves durante o crime",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

import { AbsoluteFill, Sequence } from "remotion";
import { Background } from "../components/Background";
import { SectionTitle } from "../components/SectionTitle";
import { BulletList } from "../components/BulletList";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

loadPlayfair();
loadInter();

export const Segment2: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Sequence from={0} durationInFrames={600}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <SectionTitle title="PRINCÍPIO DA LEGALIDADE" subtitle="Nullum Crimen, Nulla Poena Sine Lege" delay={10} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={600} durationInFrames={800}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="EVOLUÇÃO HISTÓRICA"
            items={[
              "Magna Carta (1215): Law of the Land",
              "Cesare Beccaria: Dos Delitos e das Penas",
              "Feuerbach: A formulação latina moderna",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={1400} durationInFrames={800}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="RESERVA LEGAL VS. LEGALIDADE"
            items={[
              "Reserva Legal: Exclusividade de Lei Ordinária",
              "Legalidade: Submissão ao ordenamento jurídico",
              "Proibição de Medidas Provisórias em Direito Penal",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={2200} durationInFrames={800}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="FUNÇÃO DE GARANTIA"
            items={[
              "Garantia Política: Defesa contra o Estado",
              "Garantia Jurídica: Definição taxativa de condutas",
              "Garantia Individual: Liberdade preservada",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

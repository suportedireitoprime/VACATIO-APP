import { AbsoluteFill, Sequence } from "remotion";
import { Background } from "../components/Background";
import { BulletList } from "../components/BulletList";
import { QuoteBlock } from "../components/QuoteBlock";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

loadPlayfair();
loadInter();

export const Segment5: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Sequence from={0} durationInFrames={750}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="VISÃO DOS DOUTRINADORES"
            items={[
              "Nelson Hungria: 'A lei é a muralha de bronze'",
              "Heleno Fragoso: 'Foco na dignidade humana'",
              "Cezar Bitencourt: 'Taxatividade e clareza'",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={750} durationInFrames={750}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="O USO DA ANALOGIA"
            items={[
              "Analogia 'In Bonam Partem': Permitida (favorece)",
              "Analogia 'In Malam Partem': Proibida (prejudica)",
              "Interpretação Extensiva vs. Analogia",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={1500} durationInFrames={800}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <QuoteBlock
            title="ENTENDIMENTO DO STF"
            quote="O princípio da reserva legal impede a tipificação de condutas por normas infralegais."
            author="Supremo Tribunal Federal"
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={2300} durationInFrames={700}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="TAXATIVIDADE PENAL"
            items={[
              "O legislador deve ser preciso e claro",
              "Leis vagas ferem o Princípio da Legalidade",
              "Rejeição a tipos penais 'abertos' excessivos",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

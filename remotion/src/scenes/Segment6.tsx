import { AbsoluteFill, Sequence } from "remotion";
import { Background } from "../components/Background";
import { SectionTitle } from "../components/SectionTitle";
import { MindMap } from "../components/MindMap";
import { BulletList } from "../components/BulletList";
import { TextReveal } from "../components/TextReveal";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

loadPlayfair();
loadInter();

export const Segment6: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Sequence from={0} durationInFrames={900}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <MindMap
            title="ARTIGO 1º CP"
            items={[
              "Legalidade = Lei em sentido estrito",
              "Anterioridade = Lei antes do fato",
              "Irretroatividade = Regra geral (Maléfica)",
              "Retroatividade = Exceção (Benéfica)",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={900} durationInFrames={800}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="PONTOS CHAVE PARA REVISÃO"
            items={[
              "Não existe crime sem lei anterior",
              "Não existe pena sem cominação prévia",
              "Garantia fundamental do Art. 5º da CF",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={1700} durationInFrames={800}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
          <SectionTitle title="OBRIGADO POR ASSISTIR" subtitle="Estude a lei, entenda a justiça." delay={10} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={2500} durationInFrames={500}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <BulletList
            title="REFERÊNCIAS"
            items={[
              "Código Penal (Decreto-Lei 2.848/40)",
              "Constituição Federal de 1988",
              "Doutrina Clássica e Tribunais Superiores",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

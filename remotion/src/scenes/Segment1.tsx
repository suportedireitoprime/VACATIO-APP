import { AbsoluteFill, Sequence } from "remotion";
import { Background } from "../components/Background";
import { SectionTitle } from "../components/SectionTitle";
import { QuoteBlock } from "../components/QuoteBlock";
import { BulletList } from "../components/BulletList";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

loadPlayfair();
loadInter();

export const Segment1: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      {/* Scene 1: Title */}
      <Sequence from={0} durationInFrames={700}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <SectionTitle title="CÓDIGO PENAL BRASILEIRO" subtitle="DECRETO-LEI Nº 2.848/1940" delay={20} />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Quote - Art. 1º */}
      <Sequence from={700} durationInFrames={900}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <QuoteBlock
            title="ARTIGO 1º — A BASE DE TUDO"
            quote="Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal."
            author="Código Penal Brasileiro"
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Fundamentos */}
      <Sequence from={1600} durationInFrames={700}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="FUNDAMENTOS DO ESTADO DE DIREITO"
            items={[
              "Segurança jurídica para o cidadão",
              "Limitação do poder de punir do Estado",
              "Previsibilidade das normas penais",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Contexto Histórico */}
      <Sequence from={2300} durationInFrames={700}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <BulletList
            title="CONTEXTO HISTÓRICO"
            items={[
              "Transição do arbítrio para a lei",
              "Iluminismo e a razão jurídica",
              "Proteção contra abusos absolutistas",
            ]}
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

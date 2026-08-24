import React from "react";
import { Composition, getInputProps } from "remotion";
import { Boletim, type Cena } from "./Boletim";

const FPS = 30;

type Roteiro = { cenas: Cena[] };

function totalFrames(cenas: Cena[]): number {
  const total = cenas.reduce((acc, c) => acc + Math.max(c.duracao_s || 4, 1), 0);
  return Math.max(Math.ceil(total * FPS), FPS * 5);
}

export const RemotionRoot: React.FC = () => {
  const input = getInputProps() as { roteiro?: Roteiro };
  const cenas = input?.roteiro?.cenas ?? [];
  const durationInFrames = totalFrames(cenas);
  return (
    <>
      <Composition
        id="boletim"
        component={Boletim as any}
        durationInFrames={durationInFrames}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ cenas }}
      />
    </>
  );
};
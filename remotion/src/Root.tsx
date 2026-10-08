import { Composition } from "remotion";
import { IntroV1 } from "./intros/IntroV1";
import { IntroV2 } from "./intros/IntroV2";
import { IntroV3 } from "./intros/IntroV3";
import { ArtigoDemo } from "./scenes/ArtigoDemo";

const COMMON = {
  durationInFrames: 120,
  fps: 30,
  width: 1080,
  height: 1920,
} as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="intro-v1" component={IntroV1} {...COMMON} />
    <Composition id="intro-v2" component={IntroV2} {...COMMON} />
    <Composition id="intro-v3" component={IntroV3} {...COMMON} />
    <Composition id="artigo-demo" component={ArtigoDemo} durationInFrames={1800} fps={30} width={1080} height={1920} />
  </>
);

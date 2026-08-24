import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadDMSerif } from "@remotion/google-fonts/DMSerifDisplay";

export const { fontFamily: serif } = loadPlayfair("normal", {
  weights: ["700", "900"],
  subsets: ["latin"],
});
export const { fontFamily: sans } = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
export const { fontFamily: display } = loadDMSerif("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

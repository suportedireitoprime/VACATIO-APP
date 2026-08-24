import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IDS = ["intro-v1", "intro-v2", "intro-v3"];
const OUT_DIR = path.resolve(__dirname, "../../public/intros");
fs.mkdirSync(OUT_DIR, { recursive: true });

console.log("Bundling…");
const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: {
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  },
  chromeMode: "chrome-for-testing",
});

const only = process.argv[2];
const targets = only ? IDS.filter((id) => id === only) : IDS;

for (const id of targets) {
  console.log(`Rendering ${id}…`);
  const composition = await selectComposition({
    serveUrl: bundled,
    id,
    puppeteerInstance: browser,
  });
  const outPath = path.join(OUT_DIR, `${id}.mp4`);
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outPath,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 1,
  });
  console.log("→", outPath);
}

await browser.close({ silent: false });
console.log("Done.");

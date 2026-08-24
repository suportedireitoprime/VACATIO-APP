// Render pipeline invocado pelo GitHub Actions.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { createClient } from "@supabase/supabase-js";
import * as tus from "tus-js-client";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOLETIM_ID = process.env.BOLETIM_ID;
const BUCKET_VIDEO = process.env.BUCKET_VIDEO || "boletins-video";

if (!SUPABASE_URL || !SERVICE_KEY || !BOLETIM_ID) {
  console.error("Faltam envs: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOLETIM_ID");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log("Buscando boletim", BOLETIM_ID);
  const { data, error } = await supabase
    .from("boletins_juridicos")
    .select("id, titulo, roteiro_json, status")
    .eq("id", BOLETIM_ID)
    .single();
  if (error) throw error;
  if (!data?.roteiro_json?.length) throw new Error("roteiro_json vazio");

  const cenas = data.roteiro_json;
  console.log(`Cenas: ${cenas.length}`);

  await supabase
    .from("boletins_juridicos")
    .update({ status: "renderizando" })
    .eq("id", BOLETIM_ID);

  const bundled = await bundle({
    entryPoint: path.resolve(__dirname, "../src/index.ts"),
    webpackOverride: (c) => c,
  });

  const composition = await selectComposition({
    serveUrl: bundled,
    id: "boletim",
    inputProps: { roteiro: { cenas } },
  });

  const outPath = path.resolve(__dirname, "../out.mp4");
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outPath,
    inputProps: { roteiro: { cenas } },
    concurrency: 2,
    chromiumOptions: { gl: "swiftshader" },
    // Compressão agressiva para caber no limite de storage e YouTube.
    // crf 28 (0=lossless, 51=pior) + preset veryfast reduz ~60-70% do tamanho.
    crf: 28,
    x264Preset: "veryfast",
    audioBitrate: "96k",
  });

  let stat = fs.statSync(outPath);
  console.log(`MP4 inicial: ${(stat.size / 1024 / 1024).toFixed(2)}MB`);

  // Sempre re-encoda com ffmpeg pra garantir MP4 leve (~15-25MB) e faststart pro YouTube/streaming.
  console.log(`Re-encodando com ffmpeg (crf 30, 720p, faststart)...`);
  const compressed = path.resolve(__dirname, "../out-compressed.mp4");
  const { execSync } = await import("child_process");
  execSync(
    `ffmpeg -y -i "${outPath}" -vf "scale='min(1280,iw)':-2" -c:v libx264 -preset veryfast -crf 30 -maxrate 2000k -bufsize 4000k -c:a aac -b:a 96k -movflags +faststart "${compressed}"`,
    { stdio: "inherit" },
  );
  fs.renameSync(compressed, outPath);
  stat = fs.statSync(outPath);
  console.log(`MP4 final: ${(stat.size / 1024 / 1024).toFixed(2)}MB`);



  const objectPath = `${BOLETIM_ID}.mp4`;
  await uploadTus({
    filePath: outPath,
    bucket: BUCKET_VIDEO,
    objectPath,
    size: stat.size,
  });

  const { data: signed } = await supabase.storage
    .from(BUCKET_VIDEO)
    .createSignedUrl(objectPath, 60 * 60 * 24 * 365 * 5);
  const videoUrl = signed?.signedUrl || null;

  await supabase
    .from("boletins_juridicos")
    .update({ status: "pronto", video_url: videoUrl })
    .eq("id", BOLETIM_ID);

  // Dispara upload para o YouTube via edge function
  try {
    const fnUrl = `${SUPABASE_URL}/functions/v1/boletim-youtube-upload`;
    const fnRes = await fetch(fnUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ boletim_id: BOLETIM_ID }),
    });
    const fnJson = await fnRes.json().catch(() => ({}));
    console.log("YouTube upload:", fnRes.status, JSON.stringify(fnJson).slice(0, 200));
  } catch (e) {
    console.error("Falha ao chamar boletim-youtube-upload:", e);
  }

  console.log("OK video_url:", videoUrl?.slice(0, 80));
}

main().catch(async (e) => {
  console.error(e);
  try {
    await supabase
      .from("boletins_juridicos")
      .update({ status: "erro", erro: String(e).slice(0, 500) })
      .eq("id", BOLETIM_ID);
  } catch {}
  process.exit(1);
});

// Upload resumable via TUS — bypassa limite de 50MB do endpoint /object/{bucket}/{path}.
// Passamos um Buffer (não stream) pra evitar erro "Maximum size exceeded" do tus-js-client.
// Docs: https://supabase.com/docs/guides/storage/uploads/resumable-uploads
function uploadTus({ filePath, bucket, objectPath, size }) {
  return new Promise((resolve, reject) => {
    const buffer = fs.readFileSync(filePath);
    const upload = new tus.Upload(buffer, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${SERVICE_KEY}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: objectPath,
        contentType: "video/mp4",
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024, // exigido pelo TUS do Supabase
      uploadSize: size,
      onError: (err) => reject(err),
      onProgress: (sent, total) => {
        const pct = ((sent / total) * 100).toFixed(1);
        console.log(`  upload TUS: ${pct}%`);
      },
      onSuccess: () => resolve(),
    });
    upload.start();
  });
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StorageFile {
  name: string;
  bucket: string;
  size: number;
  type: string;
  publicUrl: string;
  path: string;
}

async function listAllFiles(supabase: any, bucket: string, prefix = ""): Promise<StorageFile[]> {
  const files: StorageFile[] = [];
  const SB_URL = Deno.env.get("SUPABASE_URL")!;

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, { limit: 1000 });

  if (error || !data) return files;

  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

    if (!item.id) {
      // It's a folder
      const subFiles = await listAllFiles(supabase, bucket, fullPath);
      files.push(...subFiles);
    } else {
      const ext = item.name.split('.').pop()?.toLowerCase() || '';
      const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tiff'];
      if (imageExts.includes(ext)) {
        files.push({
          name: item.name,
          bucket,
          size: item.metadata?.size || 0,
          type: item.metadata?.mimetype || `image/${ext}`,
          publicUrl: `${SB_URL}/storage/v1/object/public/${bucket}/${fullPath}`,
          path: fullPath,
        });
      }
    }
  }

  return files;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SB_URL = Deno.env.get("SUPABASE_URL")!;
  const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const TINIFY_KEY = Deno.env.get("TINIFY_API_KEY");
  const supabase = createClient(SB_URL, SB_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "list";

    // ACTION: list all images across all buckets
    if (action === "list") {
      const buckets = ["biblioteca", "narracoes", "avatars", "biblioteca-externa"];
      const allFiles: StorageFile[] = [];

      for (const bucket of buckets) {
        const files = await listAllFiles(supabase, bucket);
        allFiles.push(...files);
      }

      // Sort by size descending
      allFiles.sort((a, b) => b.size - a.size);

      const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);

      return new Response(JSON.stringify({
        total: allFiles.length,
        totalSize,
        files: allFiles,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: compress a single image
    if (action === "compress") {
      if (!TINIFY_KEY) {
        return new Response(JSON.stringify({ error: "TINIFY_API_KEY não configurada" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { bucket, path: filePath } = body;
      if (!bucket || !filePath) {
        return new Response(JSON.stringify({ error: "bucket e path são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Download original
      const { data: fileData, error: dlError } = await supabase.storage
        .from(bucket)
        .download(filePath);

      if (dlError || !fileData) {
        // Check if file was already converted to .webp
        const webpPath = filePath.replace(/\.[^.]+$/, '.webp');
        if (webpPath !== filePath) {
          const { data: webpData } = await supabase.storage.from(bucket).download(webpPath);
          if (webpData) {
            const webpSize = (await webpData.arrayBuffer()).byteLength;
            return new Response(JSON.stringify({
              success: true, originalSize: webpSize, compressedSize: webpSize,
              saved: 0, pctSaved: 0, converted: true, newPath: webpPath,
              alreadyDone: true,
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
        return new Response(JSON.stringify({ error: "Falha ao baixar arquivo: " + (dlError?.message || "not found") }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const originalBytes = await fileData.arrayBuffer();
      const originalSize = originalBytes.byteLength;

      // Skip tiny files
      if (originalSize < 5000) {
        return new Response(JSON.stringify({
          success: true, originalSize, compressedSize: originalSize,
          saved: 0, pctSaved: 0, converted: false, newPath: filePath,
          skipped: true,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const authHeader = { Authorization: "Basic " + btoa(`api:${TINIFY_KEY}`) };

      // Step 1: Shrink (upload to TinyPNG)
      const shrinkRes = await fetch("https://api.tinify.com/shrink", {
        method: "POST",
        headers: authHeader,
        body: new Uint8Array(originalBytes),
      });

      if (!shrinkRes.ok) {
        const errText = await shrinkRes.text();
        return new Response(JSON.stringify({ error: "TinyPNG shrink falhou: " + errText }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const shrinkData = await shrinkRes.json();
      const outputUrl = shrinkData.output.url;

      // Step 2: Resize + Convert in a single POST to outputUrl
      const ext = filePath.split('.').pop()?.toLowerCase() || '';
      const isWebp = ext === 'webp';

      const transformBody: Record<string, unknown> = {
        resize: { method: "fit", width: 800, height: 1200 },
      };
      if (!isWebp) {
        transformBody.convert = { type: ["image/webp"] };
      }

      const convertRes = await fetch(outputUrl, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(transformBody),
      });

      let finalBytes: Uint8Array;
      let finalPath = filePath;
      let converted = false;

      if (convertRes.ok) {
        finalBytes = new Uint8Array(await convertRes.arrayBuffer());
        if (!isWebp) {
          finalPath = filePath.replace(/\.[^.]+$/, '.webp');
          converted = true;
        }
      } else {
        // Fallback: just download the shrunk version
        const dlRes = await fetch(outputUrl, { headers: authHeader });
        finalBytes = new Uint8Array(await dlRes.arrayBuffer());
      }

      const finalSize = finalBytes.byteLength;
      const contentType = converted ? "image/webp" : (isWebp ? "image/webp" : shrinkData.output.type || "image/png");

      // Upload back
      const { error: upError } = await supabase.storage
        .from(bucket)
        .upload(finalPath, finalBytes, { contentType, upsert: true });

      if (upError) {
        return new Response(JSON.stringify({ error: "Falha ao fazer upload: " + upError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Remove original if converted to different path + update DB references
      if (converted && finalPath !== filePath) {
        await supabase.storage.from(bucket).remove([filePath]);

        // Build old and new public URLs
        const SB_URL = Deno.env.get("SUPABASE_URL")!;
        const oldUrl = `${SB_URL}/storage/v1/object/public/${bucket}/${filePath}`;
        const newUrl = `${SB_URL}/storage/v1/object/public/${bucket}/${finalPath}`;

        // Update all known image columns in DB tables
        const updates: [string, string][] = [
          ["biblioteca_estudos", "capa_livro"],
          ["biblioteca_fora_da_toga", "capa_livro"],
          ["biblioteca_classicos", "imagem"],
          ["biblioteca_lideranca", "imagem"],
          ["biblioteca_estudos", "capa_area"],
          ["biblioteca_classicos", "url_capa_gerada"],
          ["biblioteca_lideranca", "url_capa_gerada"],
          ["noticias_cache", "imagem_url"],
        ];
        for (const [table, col] of updates) {
          await supabase.from(table).update({ [col]: newUrl }).eq(col, oldUrl);
        }
      }

      const saved = originalSize - finalSize;
      const pctSaved = originalSize > 0 ? Math.round((saved / originalSize) * 100) : 0;

      return new Response(JSON.stringify({
        success: true, originalSize, compressedSize: finalSize,
        saved, pctSaved, converted, newPath: finalPath,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("comprimir-imagens error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

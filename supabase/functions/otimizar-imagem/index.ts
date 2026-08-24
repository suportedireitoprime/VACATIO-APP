import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashKey(url: string, w: number): Promise<string> {
  const data = new TextEncoder().encode(`${url}::${w}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const imageUrl = url.searchParams.get("url");
  const width = parseInt(url.searchParams.get("w") || "640", 10);

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: "url required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const TINIFY_KEY = Deno.env.get("TINIFY_API_KEY");
  const SB_URL = Deno.env.get("SUPABASE_URL")!;
  const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SB_URL, SB_KEY);

  const hash = await hashKey(imageUrl, width);
  const cachePath = `cache-img/${hash}.webp`;

  // Check cache
  const { data: existing } = await supabase.storage
    .from("biblioteca")
    .createSignedUrl(cachePath, 60 * 60 * 24 * 365);

  if (existing?.signedUrl) {
    // Verify file actually exists by trying to download metadata
    const { data: meta } = await supabase.storage
      .from("biblioteca")
      .list("cache-img", { search: `${hash}.webp`, limit: 1 });

    if (meta && meta.length > 0) {
      const publicUrl = `${SB_URL}/storage/v1/object/public/biblioteca/${cachePath}`;
      return Response.redirect(publicUrl, 302);
    }
  }

  // No cache — compress with TinyPNG
  if (!TINIFY_KEY) {
    // Fallback to wsrv.nl
    const fallback = `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&w=${width}&q=75&output=webp&fit=cover`;
    return Response.redirect(fallback, 302);
  }

  try {
    // Step 1: Upload source to TinyPNG
    const shrinkRes = await fetch("https://api.tinify.com/shrink", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`api:${TINIFY_KEY}`),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source: { url: imageUrl } }),
    });

    if (!shrinkRes.ok) {
      const errText = await shrinkRes.text();
      console.error("TinyPNG shrink failed:", shrinkRes.status, errText);
      // Fallback
      const fallback = `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&w=${width}&q=75&output=webp&fit=cover`;
      return Response.redirect(fallback, 302);
    }

    const shrinkData = await shrinkRes.json();
    const outputUrl = shrinkData.output.url;

    // Step 2: Resize + convert to WebP
    const convertRes = await fetch(outputUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`api:${TINIFY_KEY}`),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resize: { method: "scale", width },
        convert: { type: ["image/webp"] },
      }),
    });

    if (!convertRes.ok) {
      console.error("TinyPNG convert failed:", convertRes.status);
      const fallback = `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&w=${width}&q=75&output=webp&fit=cover`;
      return Response.redirect(fallback, 302);
    }

    const webpBytes = new Uint8Array(await convertRes.arrayBuffer());

    // Step 3: Save to Storage
    await supabase.storage
      .from("biblioteca")
      .upload(cachePath, webpBytes, {
        contentType: "image/webp",
        upsert: true,
      });

    const publicUrl = `${SB_URL}/storage/v1/object/public/biblioteca/${cachePath}`;
    return Response.redirect(publicUrl, 302);
  } catch (err) {
    console.error("otimizar-imagem error:", err);
    const fallback = `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&w=${width}&q=75&output=webp&fit=cover`;
    return Response.redirect(fallback, 302);
  }
});

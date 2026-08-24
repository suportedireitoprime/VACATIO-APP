import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractDriveFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SB_URL = Deno.env.get("SUPABASE_URL")!;
  const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SB_URL, SB_KEY);

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const mode = url.searchParams.get("mode") || "all";

  // mode=all → process ALL books (re-extract everything)
  // mode=missing → only NULL capa_livro
  let query = supabase
    .from("biblioteca_estudos")
    .select("id, link, download, capa_livro");

  if (mode === "missing") {
    query = query.is("capa_livro", null);
  }

  query = query.not("download", "is", null).order("id", { ascending: true }).range(offset, offset + limit - 1);

  const { data: livros, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: { id: number; status: string; url?: string }[] = [];

  for (const livro of livros || []) {
    try {
      let imgBytes: Uint8Array | null = null;
      let contentType = "image/jpeg";

      // Strategy 1: Google Drive thumbnail at maximum resolution (renders full page)
      if (livro.download) {
        const fileId = extractDriveFileId(livro.download);
        if (fileId) {
          // sz=w1600 gives a high-quality render of the first page
          const thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
          const res = await fetch(thumbUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
            redirect: "follow",
          });
          if (res.ok) {
            imgBytes = new Uint8Array(await res.arrayBuffer());
            contentType = res.headers.get("content-type") || "image/png";
          }
        }
      }

      // Strategy 2: FlipHTML5 thumbnail from reading link
      if (!imgBytes && livro.link?.includes("fliphtml5.com")) {
        const base = livro.link.replace(/\/$/, "");
        const thumbUrl = `${base}/files/large/1.jpg`;
        const res = await fetch(thumbUrl);
        if (res.ok) {
          imgBytes = new Uint8Array(await res.arrayBuffer());
          contentType = "image/jpeg";
        }
      }

      if (!imgBytes || imgBytes.length < 1000) {
        results.push({ id: livro.id, status: "no_image_found" });
        continue;
      }

      const ext = contentType.includes("png") ? "png" : "jpg";
      const path = `capas-estudos/${livro.id}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("biblioteca")
        .upload(path, imgBytes, { contentType, upsert: true });

      if (uploadErr) {
        results.push({ id: livro.id, status: `upload_error: ${uploadErr.message}` });
        continue;
      }

      const publicUrl = `${SB_URL}/storage/v1/object/public/biblioteca/${path}`;

      const { error: updateErr } = await supabase
        .from("biblioteca_estudos")
        .update({ capa_livro: publicUrl })
        .eq("id", livro.id);

      if (updateErr) {
        results.push({ id: livro.id, status: `update_error: ${updateErr.message}` });
      } else {
        results.push({ id: livro.id, status: "ok", url: publicUrl });
      }
    } catch (e) {
      results.push({ id: livro.id, status: `error: ${e.message}` });
    }
  }

  return new Response(
    JSON.stringify({ total: livros?.length || 0, offset, processed: results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

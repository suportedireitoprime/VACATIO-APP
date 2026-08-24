// Boletim Jurídico — upload para YouTube
// Recebe { boletim_id }, baixa o MP4 do Storage, gera thumbnail via IA,
// sobe como "não listado" no canal do usuário e salva youtube_video_id/youtube_url.
// O MP4 é removido do Storage após upload bem-sucedido.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("YOUTUBE_CLIENT_SECRET")!;
const REFRESH_TOKEN = Deno.env.get("YOUTUBE_REFRESH_TOKEN")!;

const BUCKET_VIDEO = "boletins-video";

async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`OAuth refresh failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function gerarThumbnail(titulo: string, tipoLabel: string, dataBr: string): Promise<Uint8Array | null> {
  if (!LOVABLE_API_KEY) return null;
  const prompt = `Thumbnail estilo jornal jurídico brasileiro, fundo escuro elegante com detalhes dourados, palavra grande '${tipoLabel}' no topo, título '${titulo}' abaixo em tipografia bold, data '${dataBr}' no canto, logo Vacatio discreto. Alto contraste, sem pessoas, 1280x720.`;
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    console.error("AI thumbnail error", resp.status, t);
    return null;
  }
  const j = await resp.json();
  const b64 = j?.data?.[0]?.b64_json;
  if (!b64) return null;
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  let boletimId = "";

  try {
    const body = await req.json().catch(() => ({}));
    boletimId = body.boletim_id;
    if (!boletimId) throw new Error("boletim_id obrigatório");

    const { data: b, error } = await supabase
      .from("boletins_juridicos")
      .select("id, titulo, data_ref, roteiro_json, video_url, status")
      .eq("id", boletimId)
      .single();
    if (error) throw error;
    if (!b) throw new Error("Boletim não encontrado");

    if (!b.video_url) throw new Error("video_url ausente — renderize o MP4 primeiro");

    await supabase
      .from("boletins_juridicos")
      .update({ status: "enviando_youtube" })
      .eq("id", boletimId);

    // Baixa MP4 do Storage
    const mp4Resp = await fetch(b.video_url);
    if (!mp4Resp.ok) throw new Error(`Falha ao baixar MP4: ${mp4Resp.status}`);
    const mp4Bytes = new Uint8Array(await mp4Resp.arrayBuffer());

    // Thumbnail via IA
    const dataBr = new Date(b.data_ref + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const primeiraNorma = Array.isArray(b.roteiro_json)
      ? b.roteiro_json.find((s: any) => s.kind === "norma")
      : null;
    const tipoLabel = primeiraNorma?.tipo_label || "BOLETIM";
    const thumbBytes = await gerarThumbnail(b.titulo, tipoLabel, dataBr);

    // OAuth2 access token
    const accessToken = await getAccessToken();

    // YouTube resumable upload
    const metadata = {
      snippet: {
        title: b.titulo,
        description: `Boletim Jurídico diário do Vacatio — ${dataBr}. Fique por dentro das normas publicadas no Diário Oficial. Acesse o app Vacatio para mais conteúdo.`,
        tags: ["direito", "juridico", "boletim", "leis", "vacatio"],
        categoryId: "25", // News & Politics
      },
      status: { privacyStatus: "unlisted", selfDeclaredMadeForKids: false },
    };

    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(mp4Bytes.length),
          "X-Upload-Content-Type": "video/mp4",
        },
        body: JSON.stringify(metadata),
      },
    );
    if (!initRes.ok) {
      const t = await initRes.text();
      throw new Error(`YouTube init upload failed: ${initRes.status} ${t}`);
    }
    const uploadUrl = initRes.headers.get("Location");
    if (!uploadUrl) throw new Error("YouTube não retornou URL de upload");

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(mp4Bytes.length),
      },
      body: mp4Bytes,
    });
    if (!uploadRes.ok) {
      const t = await uploadRes.text();
      throw new Error(`YouTube upload failed: ${uploadRes.status} ${t}`);
    }
    const videoData = await uploadRes.json();
    const videoId = videoData.id;
    if (!videoId) throw new Error("YouTube não retornou videoId");

    // Upload thumbnail
    let thumbnailUrl: string | null = null;
    if (thumbBytes) {
      const thumbRes = await fetch(
        `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "image/png",
            "Content-Length": String(thumbBytes.length),
          },
          body: thumbBytes,
        },
      );
      if (!thumbRes.ok) {
        const t = await thumbRes.text();
        console.warn("YouTube thumbnail upload failed:", thumbRes.status, t);
      } else {
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }

    const youtubeUrl = `https://youtu.be/${videoId}`;
    const finalThumbnailUrl = thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    await supabase
      .from("boletins_juridicos")
      .update({
        status: "pronto",
        youtube_video_id: videoId,
        youtube_url: youtubeUrl,
        thumbnail_url: finalThumbnailUrl,
      })
      .eq("id", boletimId);

    // Remove MP4 do Storage
    try {
      await supabase.storage.from(BUCKET_VIDEO).remove([`${boletimId}.mp4`]);
    } catch (e) {
      console.warn("Falha ao remover MP4 do storage:", e);
    }

    // Push follow-up com link do YouTube (best-effort)
    try {
      const { data: cfg } = await supabase
        .from("boletim_config")
        .select("enviar_push")
        .eq("id", 1)
        .maybeSingle();
      if (cfg?.enviar_push !== false) {
        supabase.functions
          .invoke("send-push", {
            body: {
              automation_key: "boletim_youtube_pronto",
              title: "📺 Boletim Jurídico no YouTube",
              body: "O vídeo de hoje já está disponível. Toque para assistir.",
              url: youtubeUrl,
              deep_link: `/boletins/${boletimId}`,
            },
          })
          .catch((e) => console.warn("push youtube falhou:", e));
      }
    } catch (e) {
      console.warn("push youtube config falhou:", e);
    }

    return new Response(
      JSON.stringify({ ok: true, video_id: videoId, youtube_url: youtubeUrl, thumbnail_url: finalThumbnailUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("boletim-youtube-upload erro:", e);
    try {
      if (boletimId) {
        await supabase
          .from("boletins_juridicos")
          .update({ status: "erro", erro: String((e as Error).message || e).slice(0, 500) })
          .eq("id", boletimId);
      }
    } catch {}
    return new Response(
      JSON.stringify({ error: String((e as Error).message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

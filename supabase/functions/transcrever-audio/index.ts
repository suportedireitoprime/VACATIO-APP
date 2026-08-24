// Edge Function: transcreve áudio via Lovable AI Gateway (openai/gpt-4o-mini-transcribe).
// Aceita base64+mime OU um caminho no bucket privado `aulas-audio`.
//
// POST { audioBase64?, mimeType?, filePath?, language? } → { text: string }

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audioBase64, mimeType, filePath, language } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ausente" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let bytes: Uint8Array;
    let mime = mimeType || "audio/aac";

    if (filePath) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data, error } = await supabase.storage.from("aulas-audio").download(filePath);
      if (error || !data) {
        return new Response(JSON.stringify({ error: "Falha ao baixar arquivo: " + (error?.message ?? "?") }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      bytes = new Uint8Array(await data.arrayBuffer());
      mime = data.type || mime;
    } else if (audioBase64) {
      bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
    } else {
      return new Response(JSON.stringify({ error: "audioBase64 ou filePath obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = mime.includes("wav") ? "wav"
      : mime.includes("mp4") || mime.includes("m4a") ? "m4a"
      : mime.includes("aac") ? "aac"
      : mime.includes("webm") ? "webm"
      : "aac";
    const blob = new Blob([bytes], { type: mime });

    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", blob, `audio.${ext}`);
    if (language) form.append("language", language);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: form,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return new Response(JSON.stringify({ error: `Transcription failed`, status: res.status, detail: errText }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    return new Response(JSON.stringify({ text: data.text ?? "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

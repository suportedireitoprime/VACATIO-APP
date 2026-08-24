const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) throw new Error("Missing GEMINI_API_KEY no ambiente da Supabase.");

    let voiceName = "Aoede"; // Feminina
    
    try {
      const config = await req.json();
      if (config?.voz === 'masculina') {
        voiceName = "Puck"; // Voz masculina da Gemini
      }
    } catch (e) {
      // Body vazio ou ignorado
    }

    const resposta = {
      token: key,
      modelo: "models/gemini-3.1-flash-live-preview",
      ephemeral: false,
      setup: {
        model: "models/gemini-3.1-flash-live-preview",
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
            }
          }
        }
      }
    };
    
    return new Response(JSON.stringify(resposta), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Erro no me-explique-token:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

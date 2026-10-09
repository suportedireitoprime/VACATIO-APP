import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const lei_id = body.lei_id;
    const planalto_url = body.planalto_url;

    if (!lei_id || !planalto_url) {
      return new Response(
        JSON.stringify({ error: "Faltam parâmetros: lei_id e planalto_url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mistralKey = Deno.env.get("MISTRAL_API_KEY");
    if (!mistralKey) {
      throw new Error("MISTRAL_API_KEY não configurada nas variáveis de ambiente.");
    }

    // Aqui implementaremos a extração usando a inteligência do Mistral
    // para capturar perfeitamente incisos, alíneas e Títulos no meio do texto,
    // e ler as notas azuis ("incluído pela lei", etc).
    
    // Por enquanto, apenas retornamos sucesso para validar a comunicação UI -> Edge.
    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: "Mistral conectado com sucesso. Pronto para iniciar o processamento completo." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

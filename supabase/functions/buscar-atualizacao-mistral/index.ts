import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

// Funções utilitárias de limpeza HTML
function decodeHtmlEntities(text: string): string {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

async function fetchHtml(url: string): Promise<string> {
  const fullUrl = url.replace(/^http:/, "https:");
  const res = await fetch(fullUrl, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${fullUrl}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let html: string;
  try {
    html = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    html = new TextDecoder("windows-1252").decode(bytes);
  }
  return html.normalize("NFC").replace(/\uFFFD/g, " ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { lei_id, planalto_url } = body;

    if (!lei_id || !planalto_url) {
      return new Response(JSON.stringify({ error: "Faltam parâmetros: lei_id e planalto_url" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const mistralKey = Deno.env.get("MISTRAL_API_KEY");
    if (!mistralKey) throw new Error("MISTRAL_API_KEY não configurada.");

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // 1. Baixar HTML do Planalto
    let rawHtml = await fetchHtml(planalto_url);
    
    // Limpar tags inúteis
    rawHtml = rawHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<s\b[^>]*>[\s\S]*?<\/s>/gi, "") // Remove texto tachado (revogado)
      .replace(/<strike\b[^>]*>[\s\S]*?<\/strike>/gi, "")
      .replace(/<del\b[^>]*>[\s\S]*?<\/del>/gi, "");
      
    let textBody = rawHtml.replace(/<[^>]+>/g, "\n");
    textBody = decodeHtmlEntities(textBody).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");

    // 2. Filtrar apenas os blocos que contêm textos azuis de atualização recente.
    // Para não sobrecarregar o Mistral e focar apenas no que mudou, vamos extrair os "Art. X" que têm notas do Planalto.
    const artigosBrutos = textBody.split(/(?=Art\.\s*\d)/i);
    
    const artigosAtualizados = artigosBrutos.filter(bloco => {
      // Procura por (Redação dada pela Lei..., Incluído pela Lei..., etc)
      const hasNote = /(?:Redação\s+dada|Incluído|Acrescido|Revogado|Alterado)\s+pel[ao]/i.test(bloco);
      // Para testes rápidos, podemos limitar o tamanho ou pegar só os que têm notas.
      return hasNote;
    });

    if (artigosAtualizados.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Nenhuma atualização detectada com notas no HTML." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pega os 10 primeiros artigos atualizados para não estourar tokens em uma única chamada (ideal seria fazer em lotes)
    const lote = artigosAtualizados.slice(0, 10).join("\n\n---\n\n");

    // 3. Chamar Mistral para extrair a estrutura perfeitamente
    const prompt = `Você é um especialista jurídico brasileiro. 
Abaixo está um trecho de uma lei brasileira que sofreu atualizações (texto bruto do Planalto).
Sua tarefa é extrair os artigos de forma perfeitamente estruturada.

REGRAS CRÍTICAS:
1. Mantenha os textos de notas de atualização intactos (ex: "(Redação dada pela Lei nº...)").
2. Organize caput, parágrafos (§), incisos (I, II) e alíneas (a, b) mantendo a numeração exata.
3. ATENÇÃO: No Código Penal, frequentemente há um "TÍTULO" ou "CAPÍTULO" solto no meio ou acima do artigo. Se encontrar um Título/Capítulo/Seção hierárquico no meio do texto, coloque-o na propriedade "titulo_hierarquico" do artigo correspondente.

Formato de saída OBRIGATÓRIO (apenas JSON válido):
{
  "artigos": [
    {
      "numero": "Art. 123",
      "texto": "Matar alguém:\\nPena - reclusão, de seis a vinte anos.\\n§ 1º Se o agente...\\nI - inciso um;\\nII - inciso dois.",
      "titulo_hierarquico": "TÍTULO I\\nDOS CRIMES CONTRA A PESSOA" // Apenas se houver um título logo acima ou dentro deste bloco. Nulo caso contrário.
    }
  ]
}

TEXTO PARA ANÁLISE:
${lote}`;

    const mistralResp = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mistralKey}`
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!mistralResp.ok) {
      const errTxt = await mistralResp.text();
      throw new Error(`Mistral API error: ${mistralResp.status} - ${errTxt}`);
    }

    const mistralData = await mistralResp.json();
    const content = mistralData.choices[0].message.content;
    
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      throw new Error("Mistral não retornou um JSON válido: " + content);
    }

    const atualizacoesEncontradas = parsed.artigos || [];

    // 4. (Opcional/Futuro) Aqui faríamos o UPDATE no banco 'vade_mecum_artigos' 
    // cruzando o numero do artigo. Por enquanto, como é o MVP do Mistral, 
    // apenas retornamos o que ele achou para o app confirmar.

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: `Mistral processou com sucesso ${atualizacoesEncontradas.length} artigos atualizados!`,
        artigos: atualizacoesEncontradas
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

// Emite um token efêmero da Gemini Live API para o cliente conectar direto no
// WebSocket (baixa latência) sem nunca expor a GEMINI_API_KEY.
// Docs: https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODELO_LIVE = "gemini-3.1-flash-live-preview";

const INSTRUCAO = `Você é o "Me Explique", professor particular de Direito do aplicativo Direito Prime.

O aluno aponta a câmera do celular para um livro, apostila, slide, caderno, tela ou peça processual e quer entender aquilo AGORA.

Como agir:
- Fale em português do Brasil, em tom de professor calmo, próximo e didático.
- Comece reconhecendo o que está vendo, de forma natural: "Estou vendo aqui que você está estudando..." e diga o tema/assunto/dispositivo identificado.
- Depois explique o conteúdo em linguagem simples: primeiro a ideia central em uma frase, depois o detalhamento, e por fim um exemplo prático brasileiro.
- Se identificar artigo de lei, súmula, princípio ou instituto, cite corretamente (ex.: "art. 121 do Código Penal") e explique o que ele significa.
- Respostas faladas curtas: 3 a 6 frases por vez. Termine convidando o aluno a perguntar ("quer que eu aprofunde alguma parte?").
- Se a imagem estiver ilegível, escura ou distante, peça gentilmente para aproximar ou melhorar a luz.
- Se o aluno falar por cima, pare e responda a pergunta dele.
- Nunca invente lei, número de artigo, súmula ou jurisprudência. Se não tiver certeza, diga que precisa conferir.
- Não dê consultoria jurídica de caso concreto: você é apoio de estudo.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // 1) Exige usuário autenticado
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Não autenticado." }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Sessão inválida. Entre novamente." }, 401);
    }

    // 2) Chave da Gemini — a chave dedicada do Me Explique vem primeiro
    const chaves = [
      Deno.env.get("GEMINI_API_KEY_ME_EXPLIQUE"),
      Deno.env.get("GEMINI_API_KEY"),
      Deno.env.get("GEMINI_API_KEY_RESERVA"),
    ].filter((k): k is string => !!k);

    if (chaves.length === 0) {
      return json({ error: "GEMINI_API_KEY não configurada." }, 500);
    }

    const agora = Date.now();
    // Formato exigido pelo BidiGenerateContent: modalidades ficam em
    // generationConfig; transcrições e systemInstruction no nível do setup.
    const setup = {
      model: `models/${MODELO_LIVE}`,
      generationConfig: { responseModalities: ["AUDIO"] },
      systemInstruction: { parts: [{ text: INSTRUCAO }] },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      // Menor custo de tokens de vídeo/imagem (~66 tokens/frame em vez de ~256)
      mediaResolution: "MEDIA_RESOLUTION_LOW",
    };


    const base = {
      uses: 1,
      // 30 min de sessão, 2 min para iniciar a conexão
      expireTime: new Date(agora + 30 * 60 * 1000).toISOString(),
      newSessionExpireTime: new Date(agora + 2 * 60 * 1000).toISOString(),
    };

    // A API só aceita as restrições de sessão em v1alpha, sob o nome
    // `bidiGenerateContentSetup`. Se a versão da API não aceitar, cai para um
    // token sem restrições e o cliente envia o setup recebido daqui.
    const tentativas: Array<{ url: string; corpo: Record<string, unknown>; travado: boolean }> = [
      {
        url: "https://generativelanguage.googleapis.com/v1alpha/auth_tokens",
        corpo: { ...base, bidiGenerateContentSetup: setup },
        travado: true,
      },
      {
        url: "https://generativelanguage.googleapis.com/v1alpha/auth_tokens",
        corpo: base,
        travado: false,
      },
      {
        url: "https://generativelanguage.googleapis.com/v1beta/auth_tokens",
        corpo: base,
        travado: false,
      },
    ];

    let ultimoErro = "";
    for (const chave of chaves) {
      for (const tentativa of tentativas) {
        const res = await fetch(tentativa.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
          body: JSON.stringify(tentativa.corpo),
        });

        const texto = await res.text();
        if (res.ok) {
          const dados = JSON.parse(texto || "{}");
          if (!dados?.name) {
            ultimoErro = "Resposta sem token.";
            continue;
          }
          return json({
            token: dados.name,
            modelo: MODELO_LIVE,
            // Quando o token não trava a configuração, o cliente precisa enviá-la.
            setup: tentativa.travado ? null : setup,
          });
        }

        console.error(`auth_tokens falhou [${res.status}] ${tentativa.url}: ${texto}`);
        ultimoErro = texto || `HTTP ${res.status}`;
        // 400 = versão/campo não suportado -> tenta o formato seguinte
        if (![400, 401, 403, 404, 429].includes(res.status)) break;
      }
    }

    return json({ error: "Não foi possível iniciar a sessão ao vivo.", detalhe: ultimoErro }, 502);

  } catch (e) {
    const detalhe = e instanceof Error ? e.message : String(e);
    console.error("me-explique-token:", detalhe);
    return json({ error: "Falha inesperada.", detalhe }, 500);
  }
});

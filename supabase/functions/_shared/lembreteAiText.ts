// Gera texto de lembrete "humanizado" via Lovable AI Gateway.
// Recebe o contexto do lembrete (o que o usuário escreveu, título do
// artigo/livro, nome) e devolve UMA mensagem curta pronta pra WhatsApp,
// SEMPRE citando o primeiro nome quando informado.
//
// Falha de forma silenciosa: se a IA/timeout falhar, devolve `null` e o
// caller usa o template padrão.

type LembreteCtx = {
  primeiroNome?: string;
  tipo: "leitura" | "artigo" | "local";
  tituloAlvo?: string;         // ex.: "Estatuto do Idoso · Art. 1º" ou nome do livro
  mensagemUsuario?: string;    // texto opcional que o próprio usuário escreveu ao criar
  hora?: string;               // HH:MM (opcional)
  estilo?: string;             // "padrao" | "motivacional" | "bem_humorado" | "zen"
};

const SYSTEM = `Você é o Horus, um assistente jurídico brasileiro que envia lembretes de estudo no WhatsApp.
Escreva UMA mensagem curta (máx. 220 caracteres), em português do Brasil, natural, cordial e direta.
Regras:
- Se um nome for informado, comece pelo nome ("{nome},"), sempre.
- Reformule o que o próprio usuário escreveu no lembrete para soar humano — nunca copie literalmente.
- Faça referência ao que ele quis estudar (o assunto/artigo/livro citados).
- No fim, mencione discretamente que você fica à disposição pra tirar dúvidas.
- Não use listas, não use markdown. Emojis com moderação (0 a 2).
- Nunca invente nomes.
Retorne APENAS o texto da mensagem, sem prefixos ou aspas.`;

export async function generateLembreteText(ctx: LembreteCtx): Promise<string | null> {
  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) return null;

  const parts: string[] = [];
  if (ctx.primeiroNome) parts.push(`Nome: ${ctx.primeiroNome}`);
  parts.push(`Tipo: ${ctx.tipo}`);
  if (ctx.tituloAlvo) parts.push(`Alvo: ${ctx.tituloAlvo}`);
  if (ctx.hora) parts.push(`Horário combinado: ${ctx.hora}`);
  if (ctx.estilo) parts.push(`Tom: ${ctx.estilo}`);
  if (ctx.mensagemUsuario) parts.push(`O que a pessoa escreveu no lembrete: "${ctx.mensagemUsuario}"`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: parts.join("\n") },
        ],
        temperature: 0.7,
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const txt = String(j?.choices?.[0]?.message?.content || "").trim();
    if (!txt) return null;
    // Sanitiza: remove aspas envolventes e limita tamanho
    const cleaned = txt.replace(/^["'`]+|["'`]+$/g, "").slice(0, 400);
    return cleaned || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

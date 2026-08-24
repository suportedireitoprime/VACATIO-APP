// Shared helper: chama a API do Gemini com fallback para chave reserva (gratuita).
//
// Uso: substitua `fetch(url, init)` por `geminiFetch(url, init)` em toda chamada
// para `generativelanguage.googleapis.com`. A `url` continua vindo com o
// `?key=${chave}` embutido — o helper reescreve o parâmetro quando precisa
// tentar a reserva.
//
// Regras:
// - Tenta primeiro com a chave paga (GEMINI_API_KEY).
// - Se a paga retornar 429 (RESOURCE_EXHAUSTED / créditos esgotados) e a reserva
//   NÃO estiver marcada como esgotada, refaz a chamada com GEMINI_API_KEY_RESERVA.
// - Se a reserva também retornar 429, marca-a como esgotada por 1h em memória
//   (do isolate) para não continuar chamando e sofrer restrição.
// - A marcação é apenas em memória do isolate: reinicia sozinha e não persiste.

const PRIMARY = Deno.env.get("GEMINI_API_KEY") ?? "";
const RESERVA = Deno.env.get("GEMINI_API_KEY_RESERVA") ?? "";

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hora
let reservaExhaustedUntil = 0;

function replaceKey(url: string, newKey: string): string {
  // Substitui apenas o valor de key= (mantém demais parâmetros)
  if (url.includes("key=")) {
    return url.replace(/([?&])key=[^&]*/, `$1key=${encodeURIComponent(newKey)}`);
  }
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}key=${encodeURIComponent(newKey)}`;
}

function isQuotaExhausted(status: number, bodyText: string): boolean {
  if (status === 429) return true;
  if (!bodyText) return false;
  const lower = bodyText.toLowerCase();
  return (
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("prepayment credits are depleted") ||
    lower.includes("credits are depleted")
  );
}

// Chave inválida / sem permissão / faturamento — também deve tentar a próxima chave.
function isKeyProblem(status: number, bodyText: string): boolean {
  const lower = (bodyText || "").toLowerCase();
  if (status === 401 || status === 403) return true;
  return (
    lower.includes("api_key_invalid") ||
    lower.includes("api key not valid") ||
    lower.includes("invalid api key") ||
    lower.includes("permission_denied") ||
    lower.includes("billing")
  );
}

async function readBodySafely(res: Response): Promise<string> {
  try {
    // Clona para não consumir o body original
    return await res.clone().text();
  } catch {
    return "";
  }
}

function extractKey(url: string): string {
  const m = url.match(/[?&]key=([^&]*)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export async function geminiFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const isGemini = typeof url === "string" && url.includes("generativelanguage.googleapis.com");
  if (!isGemini) {
    return fetch(url, init);
  }

  // Monta a fila de chaves a tentar, na ordem:
  // 1) a chave que veio na URL (respeita quem chamou)
  // 2) GEMINI_API_KEY (principal)
  // 3) GEMINI_API_KEY_RESERVA (reserva, se não estiver em cooldown)
  const urlKey = extractKey(url);
  const candidates: string[] = [];
  const pushUnique = (k: string) => { if (k && !candidates.includes(k)) candidates.push(k); };
  pushUnique(urlKey);
  pushUnique(PRIMARY);
  if (RESERVA && Date.now() >= reservaExhaustedUntil) pushUnique(RESERVA);

  if (candidates.length === 0) {
    // Sem nenhuma chave — devolve a resposta da URL original para o chamador tratar.
    return fetch(url, init);
  }

  let lastResponse: Response | null = null;
  for (let i = 0; i < candidates.length; i++) {
    const key = candidates[i];
    const attemptUrl = replaceKey(url, key);
    const response = await fetch(attemptUrl, init);
    if (response.ok) return response;

    const bodyText = await readBodySafely(response);
    const exhausted = isQuotaExhausted(response.status, bodyText);
    const keyProblem = isKeyProblem(response.status, bodyText);

    // Marca a reserva gratuita como esgotada para não continuar tentando por 1h.
    if (exhausted && key === RESERVA) {
      reservaExhaustedUntil = Date.now() + COOLDOWN_MS;
      console.warn("[geminiFetch] Reserva gratuita esgotada — cooldown de 1h ativado.");
    }

    lastResponse = response;
    // Continua para a próxima chave em problema de quota OU de chave inválida.
    if (!exhausted && !keyProblem) return response;
    console.warn(`[geminiFetch] Chave #${i + 1} falhou (${exhausted ? "quota" : "chave inválida"}) — tentando próxima.`);
  }

  return lastResponse ?? fetch(url, init);
}

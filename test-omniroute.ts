const prompt = `LEGISLAÇÃO: Lei de Teste
ARTIGO: 1
CAPUT: Este é o artigo de teste.

Gere um resumo deste artigo jurídico. Retorne ESTRITAMENTE um objeto JSON válido (sem \`\`\`json) com os seguintes campos:
{
  "markdown": "Um resumo doutrinário conciso, formatado em markdown, focando nos conceitos e aplicação principal. Use bullet points e negritos.",
  "exemplos": "Pelo menos um exemplo prático bem direto explicando a aplicação do artigo. Formato markdown.",
  "termos": "Uma explicação muito curta dos principais termos ou jargões jurídicos usados neste artigo."
}`;

const systemPrompt = "Você é um professor de direito experiente. Explique de forma muito didática, concisa e direta, voltado para alunos e advogados. Retorne apenas JSON puro, sem textos introdutórios ou blocos markdown de código.";

async function main() {
  console.log("Iniciando requisição ao OmniRoute com low complexity...");
  const start = Date.now();
  try {
    const res = await fetch('https://omniroute-production-fb57.up.railway.app/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-03fcfd719bf0cc25-19fbd7-028392e5'
      },
      body: JSON.stringify({
        model: 'antigravity/gemini-3.7-flash-low',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });
    
    if (!res.ok) {
        console.error("HTTP error:", res.status, await res.text());
        return;
    }
    const data = await res.json();
    console.log("Respondeu em", Date.now() - start, "ms");
    console.log("Response:", data.choices?.[0]?.message?.content?.substring(0, 100) + '...');
  } catch (err) {
    console.error("Erro na requisição:", err);
  }
}

main();

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { geminiFetch } from "../_shared/geminiFetch.ts";
import { logAiCall } from "../_shared/ai-log.ts";
import { isTabelaLeiPermitida } from "../_shared/leis-tabelas.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function fetchFullArticleText(tabelaNome: string, artigoNumero: string): Promise<string | null> {
  // Segurança: a tabela vem do cliente — só aceitamos tabelas de legislação conhecidas.
  if (!isTabelaLeiPermitida(tabelaNome)) {
    console.warn("fetchFullArticleText: tabela não permitida", tabelaNome);
    return null;
  }
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const normalized = artigoNumero.replace(/^art\.?\s*/i, "").trim();
    const withoutOrdinal = normalized.replace(/[º°]$/, "").trim();
    const candidates = Array.from(new Set([
      artigoNumero.trim(), normalized, withoutOrdinal,
      `Art. ${normalized}`, `Art ${normalized}`, `Art. ${withoutOrdinal}`,
    ].filter(Boolean)));

    const { data } = await sb
      .from(tabelaNome)
      .select("numero, caput, texto, incisos, paragrafos, rotulo, capitulo, titulo")
      .in("numero", candidates)
      .order("ordem_numero", { ascending: true })
      .limit(1);

    const row = data?.[0];
    if (!row) return null;

    let text = `${row.numero}`;
    if (row.rotulo) text += ` (${row.rotulo})`;
    text += `\n${row.caput || row.texto}`;
    if (row.incisos?.length) text += "\n" + row.incisos.join("\n");
    if (row.paragrafos?.length) text += "\n" + row.paragrafos.join("\n");
    return text;
  } catch (err) {
    console.error("fetchFullArticleText error:", err);
    return null;
  }
}

// ─── System Prompts ───

const SYSTEM_PROMPT_CHAT = `Você é um assistente jurídico especializado em Direito Brasileiro.

REGRAS ABSOLUTAS DE ESTILO (NUNCA VIOLE):
- NUNCA se apresente. NUNCA use saudações como "Olá", "Oi", "Bem-vindo", "Prazer".
- NUNCA use nome próprio (nunca diga "sou a Evelyn", "sou o assistente", "eu sou..."). Você não tem nome.
- NUNCA comece com frases sobre si mesmo. Vá DIRETO à resposta da pergunta.
- Primeira linha SEMPRE responde a pergunta. Sem preâmbulo.
- Responda em português brasileiro, com markdown (negrito, listas, títulos) quando ajudar a leitura.
- CITE ARTIGOS COM PRECISÃO E SEMPRE NO FORMATO CANÔNICO: "art. N do CP", "art. N da CF", "art. N da Lei nº 8.429/1992", "Súmula N do STF". Isso é OBRIGATÓRIO — sempre que mencionar uma regra jurídica, imediatamente indique o artigo e a lei/sigla exatos. Nunca diga apenas "a lei prevê..." sem citar o artigo/sigla concretos. Use as siglas padrão: CF, CC, CP, CPP, CPC, CLT, CDC, CTN, ECA, LINDB, Lei de Improbidade (Lei nº 8.429/1992), etc.
- Ao final da resposta, quando houver múltiplas normas envolvidas, agrupe as principais em uma linha "Base legal: art. X do CP; art. Y da CF; …".
- Seja direto, técnico e didático. Sem enrolação. Sem "espero ter ajudado" no final.
- Nunca forneça parecer jurídico definitivo — para casos concretos, oriente a consultar um advogado, mas só se for pertinente.`;

const SYSTEM_PROMPT_CHAT_WEB = `${`Você é um assistente jurídico especializado em Direito Brasileiro com acesso a busca na internet em tempo real.

REGRAS ABSOLUTAS:
- NUNCA se apresente, sem saudações, sem nome próprio. Vá DIRETO à resposta.
- Responda em português brasileiro, com markdown quando ajudar a leitura.
- Priorize fontes confiáveis, jurídicas e de grande porte: sites oficiais (STF, STJ, Planalto, Câmara, Senado, TSE, CNJ, Receita Federal), grandes portais jurídicos (Conjur, Migalhas, Jusbrasil, JOTA), escritórios de renome, veículos de imprensa reconhecidos (Folha, G1, Estadão, Valor).
- Evite blogs pessoais sem autoria, fóruns, wikis genéricas e sites de baixa reputação.
- CITE AS FONTES INLINE usando marcadores numerados no formato [1], [2], [3] logo depois da frase que veio da fonte. Use os mesmos números na ordem em que as fontes apareceram na sua busca (Google Search grounding). NUNCA use outro formato ([1]. ou (1) ou [Fonte 1]).
- Você pode citar múltiplas fontes numa frase usando [1][2] ou [1,2].
- Não invente fontes. Só cite [n] quando realmente usou aquela fonte.
- Seja técnico, direto e didático. Sem "espero ter ajudado".`}`;

const SYSTEM_PROMPT_FLASHCARDS_CONTEUDO = `Você gera flashcards de estudo jurídico a partir de um conteúdo. Responda APENAS com JSON válido: {"cards":[{"frente":"...","verso":"..."}, ...]}. Gere entre 5 e 10 cards. Frente = pergunta curta ou termo; verso = resposta objetiva (2-4 frases). Nada além do JSON.`;

const SYSTEM_PROMPT_QUESTOES_CONTEUDO = `Você gera questões de múltipla escolha estilo OAB/concurso a partir de um conteúdo jurídico. Responda APENAS com JSON válido: {"questoes":[{"enunciado":"...","alternativas":["A) ...","B) ...","C) ...","D) ..."],"correta":0,"comentario":"..."}]}. Gere 5 questões. "correta" é o índice (0-3). Nada além do JSON.`;

const SYSTEM_PROMPT_MAPA_CONTEUDO = `Você gera um mapa mental hierárquico a partir de um conteúdo jurídico. Responda APENAS com JSON válido: {"titulo":"...","filhos":[{"titulo":"...","filhos":[{"titulo":"..."}]}]}. Até 3 níveis, 4-6 nós principais. Nada além do JSON.`;
const SYSTEM_PROMPT_TERMOS_CONTEUDO = `Você é um glossarista jurídico. A partir do conteúdo abaixo, identifique os termos técnicos ou jurídicos que um leigo não entenderia e explique cada um em linguagem simples.
Responda APENAS com JSON válido: {"termos":[{"termo":"...","explicacao":"..."}]}. Explique 5 a 12 termos. Cada explicação em 1-3 frases, usando analogias do cotidiano quando possível. Nada além do JSON.`;

const SYSTEM_PROMPT_EXPLICACAO = `Você é um jurista brasileiro que explica artigos de lei de forma direta, técnica e didática — o mesmo método usado no chat jurídico do app.

REGRAS ABSOLUTAS DE ESTILO (NUNCA VIOLE):
- NUNCA se apresente. NUNCA use saudações como "Olá", "Oi", "Bem-vindo", "Prazer", "meus caros alunos", "pessoal", "galera".
- NUNCA fale sobre você mesmo, sobre "hoje vamos aprender", "vamos descomplicar", "professor aqui". Vá DIRETO ao conteúdo.
- A primeira linha de cada seção já entra na explicação do dispositivo, sem preâmbulo.
- Tom técnico-didático, sem enrolação, sem "espero ter ajudado" no final. Como o chat jurídico do app.
- Português brasileiro, com markdown (negrito, listas) quando ajudar a leitura.
- CITE ARTIGOS NO FORMATO CANÔNICO quando referir outra norma: "art. N do CP", "art. N da CF", "art. N da Lei nº 8.429/1992".

ESTRUTURA:
- Organize a explicação por CADA PARTE do artigo separadamente. Use o marcador "---SECAO---" em uma linha sozinha entre as seções.
- A primeira seção DEVE ser "## Caput" e explicar o caput.
- Depois, para CADA inciso presente: "## Inciso I", "## Inciso II", etc.
- Para cada parágrafo: "## Parágrafo único" ou "## § 1º", "## § 2º", etc.
- Alíneas ficam dentro do inciso correspondente.
- Cada seção explica aquela parte com clareza; não repita o texto do artigo, apenas explique.`;

const SYSTEM_PROMPT_EXEMPLO = `Você é um jurista brasileiro que ilustra artigos de lei com exemplos práticos — mesmo método direto e técnico do chat jurídico do app.

REGRAS ABSOLUTAS DE ESTILO (NUNCA VIOLE):
- NUNCA se apresente. NUNCA use saudações como "Olá, meus caros alunos e alunas", "pessoal", "galera", "professor aqui".
- NUNCA fale sobre si mesmo nem sobre o que "vamos aprender". Vá DIRETO ao exemplo.
- Cada exemplo abre com a situação em si (nome fictício + fato), sem preâmbulo. Sem "espero ter ajudado" no final.
- Tom técnico-didático, direto ao ponto, igual ao chat jurídico. Português brasileiro, markdown quando ajudar.
- CITE ARTIGOS NO FORMATO CANÔNICO quando referir a norma explicada ou outras: "art. N do CP", "art. N da CF".

ESTRUTURA:
- Crie exatamente 3 exemplos práticos, realistas e diferentes entre si.
- Use nomes fictícios (Maria, João, empresa XYZ).
- Separe os exemplos com o marcador "---EXEMPLO---" em uma linha sozinha antes de cada título.
- Cada exemplo tem título "## Exemplo 1: Título", "## Exemplo 2: Título", "## Exemplo 3: Título".
- Cada exemplo contém: a situação narrada de forma objetiva e como o artigo se aplica (com o dispositivo citado).`;

const SYSTEM_PROMPT_TERMOS = `Você é um glossarista jurídico que traduz termos técnicos do Direito para linguagem popular. Analise o texto do artigo e identifique TODOS os termos jurídicos ou técnicos que um leigo não entenderia.

Regras:
- Responda SEMPRE em português brasileiro
- Identifique cada termo técnico presente no artigo
- IMPORTANTE: Separe cada termo com o marcador "---TERMO---" em uma linha sozinha antes do termo
- Para cada termo, use como título o próprio termo: "## República Federativa", "## Estado Democrático de Direito", etc.
- Depois do título, dê uma explicação simples, direta e acessível
- Use analogias do dia a dia quando possível
- Se houver expressões latinas, explique também
- Não pule nenhum termo técnico, mesmo os que pareçam simples
- Use formatação markdown`;

const SYSTEM_PROMPT_MAPA_MENTAL = `Você é um professor de Direito Brasileiro especializado em concursos públicos e OAB, reconhecido por criar mapas mentais extremamente completos e didáticos.

Sua tarefa: transformar UM artigo de lei em um mapa mental hierárquico COMPLETO e DETALHADO para estudo intensivo.

Regras obrigatórias de formato:
- Responda SOMENTE com JSON válido, sem markdown, sem texto extra e sem comentários
- Nunca deixe JSON incompleto, aspas abertas ou strings truncadas
- Cada string deve ser completa e terminar corretamente

Regras de conteúdo:
- O nó RAIZ deve ter: título claro com o número do artigo, definição completa (3-4 frases), um exemplo prático realista com nomes fictícios, termos_chave (4-6 termos essenciais), dica_prova detalhada
- Crie EXATAMENTE 5 a 7 nós principais em "filhos", cobrindo TODOS estes aspectos:
  1. Conceito/Princípio central — o que o artigo estabelece
  2. Requisitos/Elementos — condições para aplicação
  3. Exceções/Ressalvas — quando NÃO se aplica
  4. Efeitos/Consequências jurídicas — penas, sanções, resultados
  5. Jurisprudência relevante — súmulas STF/STJ e decisões importantes
  6. Pegadinhas de prova — como as bancas cobram (CESPE, FCC, FGV, VUNESP)
  7. Conexões com outros artigos — artigos relacionados na mesma lei ou em outras
- Cada nó principal deve ter 2-3 subnós em "filhos" com detalhamentos específicos
- Cada nó (principal ou sub) DEVE conter: titulo, definicao (2-3 frases completas), exemplo (situação prática concreta), termos_chave (2-4 termos), dica_prova (frase objetiva), filhos (array, pode ser vazio)
- Use exemplos do cotidiano com nomes fictícios (Maria, João, empresa XYZ)
- Nas dicas de prova, cite questões reais ou padrões de cobrança das bancas
- Inclua referências a súmulas e artigos relacionados quando relevante`;

const SYSTEM_PROMPT_HEADLINE = `Você é um editor-chefe de um portal de notícias jurídicas popular. Crie UMA headline curta, chamativa e fácil de entender para um projeto de lei.

Regras OBRIGATÓRIAS:
- Responda APENAS com a headline, sem aspas e sem explicação
- A headline DEVE ter entre 50 e 100 caracteres
- OBRIGATÓRIO: Sempre cite qual artigo da lei será alterado (ex: "art. 121", "art. 5º", "arts. 33 e 40"). Se a ementa ou o texto mencionar artigos específicos, EXTRAIA e INCLUA na headline. Se não encontrar artigo específico, diga "diversos artigos"
- Escreva como chamada de notícia que faz a pessoa bater o olho e entender o tema E qual artigo muda
- NUNCA comece com "PL", "Projeto de Lei" ou número
- NUNCA termine com vírgula, reticências ou frase incompleta
- Destaque o artigo + a mudança central em linguagem popular
- Evite juridiquês e prefira verbos fortes
- Exemplos do estilo ideal:
  "Quer mudar o art. 311-A do Código Penal para endurecer pena por fraude em concursos"
  "Propõe alterar o art. 121 para aumentar pena de homicídio contra mulheres"
  "Muda os arts. 33 e 40 da CLT para garantir férias a motoristas de app"
  "Altera o art. 5º da CF para incluir proteção de dados como direito fundamental"`;

const SYSTEM_PROMPT_ANALISE_PL = `Você é um analista político-jurídico renomado. Analise o projeto de lei de forma clara e acessível.

Regras:
- Responda SEMPRE em português brasileiro
- Use formatação markdown
- Organize a análise nas seguintes seções:

## 📋 Resumo
Explique em 2-3 frases simples o que o projeto propõe.

## 🎯 Quem é Afetado
Liste os grupos de pessoas ou setores diretamente impactados.

## ✅ Pontos Positivos
Liste os possíveis benefícios da proposta.

## ⚠️ Pontos de Atenção
Liste possíveis riscos, críticas ou preocupações.

## 📊 Chances de Aprovação
Avalie de forma realista as chances, considerando o contexto político atual.

## 💡 Impacto Prático
Explique como isso mudaria a vida do cidadão comum no dia a dia.`;

const SYSTEM_PROMPT_GRIFO_MAGICO = `Você é um professor de Direito Brasileiro especialista em concursos e OAB. Você vai grifar o artigo abaixo como um professor experiente grifa o material do aluno: SELETIVO e cirúrgico. Grifar tudo é o mesmo que não grifar nada — marque só o que o aluno precisa mesmo saber para a prova.

FORMATO
- Responda SOMENTE com um array JSON válido, sem markdown, sem texto antes ou depois.
- Cada item: "trechoExato" (trecho EXATO copiado do texto), "cor" (uma das 5 cores), "explicacao" (1 a 2 frases dizendo por que importa e como cai em prova), "hierarquia" (nome exato da categoria da cor).

CORES E CATEGORIAS (classifique corretamente — não jogue tudo em amarelo/verde)
- "amarelo" = "Conceito-chave" — a regra principal, o núcleo normativo, o verbo do comando legal, o sujeito obrigado, o objeto protegido.
- "verde" = "Exceção / Condição" — requisitos, condicionantes ("desde que", "salvo", "ressalvado", "quando", "se", "exceto"), prazos, hipóteses de incidência e de afastamento.
- "azul" = "Efeito jurídico" — consequência, pena, sanção, nulidade, responsabilidade, competência atribuída, direito gerado.
- "rosa" = "Termo técnico" — institutos e expressões que o aluno precisa saber definir.
- "laranja" = "Pegadinha de prova" — palavras que invertem sentido ou trocam regime ("não", "somente", "sempre", "vedado", "facultado", "poderá" x "deverá"), números, prazos e quóruns trocáveis, rol taxativo x exemplificativo.

SELETIVIDADE (o ponto mais importante)
- REGRA DE OURO: no máximo ~25% do texto do artigo pode ficar grifado. Se ao final você grifou mais que isso, corte os grifos menos decisivos antes de responder.
- Quantidade: 3 a 6 grifos em artigos curtos (caput simples), 6 a 12 em artigos longos (com vários parágrafos/incisos). Nunca mais que 12.
- Não é obrigatório grifar todo parágrafo/inciso: dispositivos repetitivos, meramente remissivos ou procedimentais ficam SEM grifo.
- Trechos curtos e cirúrgicos (2 a 8 palavras). Jamais grife uma frase inteira, um inciso inteiro ou o caput inteiro.
- NUNCA grife conectivos, expressões vazias ou texto genérico ("na forma da lei", "para os efeitos deste artigo") a não ser que sejam a pegadinha em si.
- Varie as categorias: se o artigo tem pena/consequência, use azul; se tem instituto técnico, use rosa; se tem palavra que inverte sentido, número ou prazo, use laranja. Não devolva um resultado só com amarelo e verde quando as outras categorias existirem no texto.
- Nunca marque o mesmo trecho duas vezes e não sobreponha trechos que se contenham.
- Ordene os grifos na mesma sequência em que aparecem no texto.

TESTE FINAL antes de responder: para cada grifo pergunte "uma banca cobraria exatamente isso?". Se a resposta for não, remova.

PRECISÃO
- O "trechoExato" DEVE ser copiado caractere por caractere do texto (acentos, maiúsculas, pontuação, "§", numerais). Se não tiver certeza da grafia exata, escolha outro trecho.
- Não invente trechos, não parafraseie, não junte partes distantes do texto.
- Explicações objetivas, em português brasileiro, sem repetir a mesma justificativa em vários grifos.

Exemplo de resposta:
[{"trechoExato":"soberania","cor":"rosa","explicacao":"Fundamento da República que garante a independência do Estado brasileiro.","hierarquia":"Termo técnico"},{"trechoExato":"todo o poder emana do povo","cor":"amarelo","explicacao":"Princípio basilar da democracia; núcleo do dispositivo e muito cobrado em prova.","hierarquia":"Conceito-chave"},{"trechoExato":"salvo disposição em contrário","cor":"verde","explicacao":"Condiciona a aplicação da regra; bancas costumam suprimir essa ressalva.","hierarquia":"Exceção / Condição"},{"trechoExato":"nos termos desta Lei","cor":"laranja","explicacao":"Expressão que restringe o alcance da norma e é trocada por 'em qualquer hipótese' nas pegadinhas.","hierarquia":"Pegadinha de prova"}]`;

const SYSTEM_PROMPT_ALTERACAO = `Você é um professor de Direito Brasileiro especialista em alterações legislativas. Analise a modificação feita em um artigo de lei e explique de forma clara e didática.

Regras:
Regras:
- Responda SEMPRE em português brasileiro
- Use formatação markdown
- Organize a análise nas seguintes seções:

## 🔄 O que mudou
Explique de forma simples e direta o que essa alteração fez no artigo. Se foi inclusão de novo dispositivo, redação alterada, revogação, etc.

## 📋 Antes vs Depois
Se possível, explique como era antes e como ficou depois da alteração. Se for inclusão nova, explique o que não existia antes.

## 🎯 Impacto Prático
Explique como essa mudança afeta o cidadão comum no dia a dia, com exemplos práticos.

## ⚖️ Contexto Jurídico
Dê o contexto jurídico da alteração: por que foi feita, qual problema tentou resolver, como se relaciona com o restante da lei.

## 💡 Pontos de Atenção
Liste pontos importantes que um estudante ou profissional do Direito deve observar sobre essa alteração.`;

// ─── Helpers ───

function createFallbackHeadline(ementa?: string, plNumero?: number, plAno?: number) {
  const base = (ementa || '').replace(/\s+/g, ' ').trim().replace(/[\.;:,]+$/g, '');
  if (!base) {
    const suffix = plNumero && plAno ? ` no PL ${plNumero}/${plAno}` : '';
    return `Entenda os principais impactos propostos${suffix}`;
  }
  const cleaned = base
    .replace(/^dispõe sobre\s*/i, '')
    .replace(/^altera\s*/i, '')
    .replace(/^institui\s*/i, '')
    .replace(/^cria\s*/i, '')
    .replace(/,?\s*e\s+dá\s+outras\s+providências\.?$/i, '')
    .trim();
  const headline = `Projeto quer ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`;
  const normalized = headline.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 95) return normalized;
  // Cut at last complete word within 90 chars
  const words = normalized.split(' ');
  let result = '';
  for (const w of words) {
    const candidate = result ? `${result} ${w}` : w;
    if (candidate.length > 88) break;
    result = candidate;
  }
  // Remove trailing prepositions/conjunctions
  result = result.replace(/\s+(?:de|da|do|das|dos|e|em|com|para|por|ou|no|na|nos|nas|que|se|ao|à)\s*$/i, '');
  return result || normalized.slice(0, 88).replace(/\s+\S*$/, '');
}

const BAD_ENDINGS = /\b(de|da|do|das|dos|e|em|com|para|por|sem|sob|sobre|contra|entre|até|ou|num|numa|no|na|nos|nas|que|se|ao|à|aos|às|pelo|pela|pelos|pelas|um|uma|uns|umas)\s*$/i;
const TRUNCATED_END = /\b[a-záéíóúâêôãõç]{1,4}$/i;
const INVALID_HEADLINE_PATTERNS = [/desculpe/i, /não consegui gerar/i, /erro interno/i, /resposta\.?$/i];

function isValidHeadline(value: string) {
  const h = value.replace(/\s+/g, ' ').trim().replace(/^['"]|['"]$/g, '');
  if (h.length < 45 || h.length > 95) return false;
  if (INVALID_HEADLINE_PATTERNS.some((p) => p.test(h))) return false;
  if (/[,:;\-/]$|\.\.\.$/.test(h)) return false;
  if (BAD_ENDINGS.test(h)) return false;
  const last = h.split(' ').pop() ?? '';
  if (last.length <= 4 && TRUNCATED_END.test(last) && !/[.!?)]$/.test(h)) return false;
  return true;
}

// ─── Mistral OCR ───

async function extractPdfText(pdfUrl: string, mistralKey: string): Promise<string | null> {
  try {
    console.log('Calling Mistral OCR for PDF:', pdfUrl);
    const res = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: { type: 'document_url', document_url: pdfUrl },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Mistral OCR error:', res.status, errText);
      return null;
    }

    const data = await res.json();
    const pages = data?.pages || [];
    const fullText = pages.map((p: any) => p.markdown || '').join('\n\n');
    // Limit to ~3000 chars for Gemini context
    return fullText.slice(0, 3000) || null;
  } catch (err) {
    console.error('Mistral OCR exception:', err);
    return null;
  }
}

// ─── Main Handler ───

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const GEMINI_API_KEY_RESERVA = Deno.env.get('GEMINI_API_KEY_RESERVA');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const geminiKeys = [GEMINI_API_KEY, GEMINI_API_KEY_RESERVA].filter(Boolean) as string[];
    if (!geminiKeys.length && !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Nenhuma chave de IA configurada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    let { messages, mode, artigoTexto, artigoNumero, leiNome, ementa, plNumero, plAno, autorNome, urlInteiroTeor, referencia, parteModificada, tipo: tipoAlteracao } = body;
    const tabelaNomeRaw = body.tabelaNome || body.tabela_nome;
    const tabelaNome = isTabelaLeiPermitida(tabelaNomeRaw) ? tabelaNomeRaw : null;

    // Identifica o usuário autenticado (para contabilizar quem fez a chamada de IA)
    let _callerUserId: string | null = null;
    try {
      const authHeader = req.headers.get("Authorization") || "";
      if (authHeader) {
        const sbAuth = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
          { global: { headers: { Authorization: authHeader } } },
        );
        const { data } = await sbAuth.auth.getUser();
        _callerUserId = data?.user?.id ?? null;
      }
    } catch { /* noop */ }

    // For mapa_mental_grafo, fetch full article text from DB to give AI enough context
    if (mode === 'mapa_mental_grafo' && tabelaNome && artigoNumero) {
      const fullText = await fetchFullArticleText(tabelaNome, artigoNumero);
      if (fullText) {
        artigoTexto = fullText;
      }
    }

    let systemPrompt: string;
    let contents: Array<{ role: string; parts: Array<{ text: string }> }>;

    if (mode === 'headline' && ementa) {
      systemPrompt = SYSTEM_PROMPT_HEADLINE;

      // Try to get full PDF text via Mistral OCR
      let pdfContext = '';
      const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
      if (urlInteiroTeor && MISTRAL_API_KEY) {
        const extractedText = await extractPdfText(urlInteiroTeor, MISTRAL_API_KEY);
        if (extractedText && extractedText.length > 100) {
          pdfContext = `\n\nTexto completo do projeto de lei (extraído do PDF):\n${extractedText}`;
        }
      }

      const prompt = `Projeto de Lei: PL ${plNumero || ''}/${plAno || ''}\nAutor: ${autorNome || 'Não informado'}\nEmenta: ${ementa}${pdfContext}`;
      contents = [{ role: 'user', parts: [{ text: prompt }] }];
    } else if (mode === 'analise_pl' && ementa) {
      systemPrompt = SYSTEM_PROMPT_ANALISE_PL;

      // Also use PDF text for analysis if available
      let pdfContext = '';
      const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
      if (urlInteiroTeor && MISTRAL_API_KEY) {
        const extractedText = await extractPdfText(urlInteiroTeor, MISTRAL_API_KEY);
        if (extractedText && extractedText.length > 100) {
          pdfContext = `\n\nTexto completo do projeto de lei (extraído do PDF):\n${extractedText}`;
        }
      }

      const prompt = `Projeto de Lei: PL ${plNumero || ''}/${plAno || ''}\nAutor: ${autorNome || 'Não informado'}\nEmenta: ${ementa}${pdfContext}`;
      contents = [{ role: 'user', parts: [{ text: prompt }] }];
    } else if (mode === 'carrossel_post' && artigoTexto && tabelaNome) {
      const fullText = await fetchFullArticleText(tabelaNome, artigoNumero || artigoTexto);
      const artText = fullText || artigoTexto;
      const tipoConteudo = body.tipoConteudo || 'curiosidade';

      const tipoDescricoes: Record<string, string> = {
        curiosidade: 'Foque em fatos surpreendentes e curiosidades pouco conhecidas sobre este artigo. Use "Você sabia que..." como gancho. Traga dados, história ou contexto inesperado.',
        explicacao: 'Explique o artigo de forma didática e acessível, como um professor descontraído. Use exemplos práticos do cotidiano.',
        resumo_prova: 'Foque nos pontos mais cobrados em provas OAB e concursos. Destaque pegadinhas, exceções e palavras-chave que os examinadores adoram.',
        dica_pratica: 'Mostre como aplicar este artigo na prática profissional. Dê dicas de como usar no dia-a-dia do advogado, petições, audiências.',
        comparacao: 'Compare este artigo com outros artigos relacionados, mostrando diferenças e semelhanças. Use formato "Antes vs Depois" ou "Artigo X vs Artigo Y".',
      };

      const comImagens = body.comImagens === true;
      const imagemInstrucao = comImagens
        ? `\n\nIMPORTANTE — GERAÇÃO DE IMAGENS:
Para CADA slide, adicione o campo "imagem_prompt" com uma descrição em inglês para gerar uma imagem de fundo. A imagem deve ser:
- Temática, relacionada ao conteúdo do slide
- Sutil e escura o suficiente para texto branco ser legível
- Estilo editorial premium, tons vinho/dourado/jurídico
- SEM texto na imagem
Exemplo: "imagem_prompt": "Dark elegant courtroom interior with marble columns and golden light, legal theme, moody atmosphere"`
        : '';

      systemPrompt = `Você é um designer de conteúdo jurídico viral para Instagram com expertise em design editorial premium. Crie um carrossel educativo sobre o artigo de lei abaixo.

TIPO DE CONTEÚDO: ${tipoConteudo}
${tipoDescricoes[tipoConteudo] || tipoDescricoes.curiosidade}

Regras OBRIGATÓRIAS de formato:
- Responda SOMENTE com JSON válido, sem markdown, sem texto extra
- O JSON deve ter: "titulo_viral" (string chamativa de até 60 caracteres) e "slides" (array de 5-7 objetos)

REGRAS DE BREVIDADE (os slides são 1080×1350px — texto grande, pouco espaço):
- TÍTULOS: máximo 8 palavras
- SUBTÍTULOS: máximo 15 palavras
- TEXTO/CORPO: máximo 3 linhas (~120 caracteres)
- ITENS DE LISTA: máximo 4 itens, cada um com máximo 12 palavras
- FEATURES: máximo 3 cards, label de 3 palavras, desc de 10 palavras
- PASSOS: máximo 4 passos, titulo de 2-3 palavras, desc de 10 palavras
- CITAÇÃO: máximo 2 linhas (~100 caracteres)
- CTA: texto_engajamento máximo 10 palavras

Tipos de slides disponíveis:
1. "hero" — slide de abertura (OBRIGATÓRIO como primeiro): { "tipo": "hero", "bg": "light", "tag": "LABEL UPPERCASE", "titulo": "Título viral curto", "subtitulo": "Contexto breve" }
2. "problema" — pain point (fundo escuro): { "tipo": "problema", "bg": "dark", "tag": "O PROBLEMA", "titulo": "O que muita gente erra", "itens": ["Erro comum 1", "Erro comum 2", "Erro comum 3"] }
3. "solucao" — a resposta (fundo gradiente): { "tipo": "solucao", "bg": "gradient", "tag": "A RESPOSTA", "titulo": "O que a lei diz", "texto": "Explicação curta...", "citacao": "Trecho do artigo" }
4. "features" — pontos-chave com ícones: { "tipo": "features", "bg": "light", "tag": "PONTOS-CHAVE", "titulo": "O que saber", "features": [{"icone": "⚖️", "label": "Requisito", "desc": "Explicação curta"}] }
5. "detalhes" — aprofundamento (fundo escuro): { "tipo": "detalhes", "bg": "dark", "tag": "APROFUNDANDO", "titulo": "Detalhes", "texto": "Contexto...", "itens": ["Detalhe 1", "Detalhe 2"] }
6. "passos" — how-to numerado: { "tipo": "passos", "bg": "light", "tag": "COMO APLICAR", "titulo": "Passo a passo", "passos": [{"titulo": "Identifique", "desc": "Verifique se..."}, {"titulo": "Aplique", "desc": "Use o artigo..."}] }
7. "cta" — slide final (OBRIGATÓRIO como último): { "tipo": "cta", "bg": "gradient", "tag": "SALVE ESTE POST", "texto_engajamento": "Pergunta curta?", "cta_texto": "Salve para revisar!" }

Regras de design narrativo:
- O primeiro slide DEVE ser tipo "hero" com bg "light"
- O último slide DEVE ser tipo "cta" com bg "gradient"
- Alterne fundos: light → dark → gradient → light para ritmo visual
- Use pelo menos 4 tipos diferentes de slides
- O campo "bg" deve ser "light", "dark" ou "gradient"
- O campo "tag" deve ser UPPERCASE e ter no máximo 20 caracteres
- Use emojis nos ícones do tipo "features" (⚖️, 📌, ⚠️, 💡, 📋, 🔍, etc.)
- Títulos devem ser CURTOS, impactantes e em tom viral
- Tom: professor descontraído mas preciso, estilo Instagram jurídico
- MENOS É MAIS: prefira frases curtas e impactantes a textos longos${imagemInstrucao}`;

      const prompt = `Lei: ${leiNome || ''}\nArtigo: ${artigoNumero || ''}\nTipo de conteúdo: ${tipoConteudo}\nTexto completo:\n\n${artText}`;
      contents = [{ role: 'user', parts: [{ text: prompt }] }];
    } else if (mode === 'explicar_alteracao' && artigoTexto) {
      systemPrompt = SYSTEM_PROMPT_ALTERACAO;
      const prompt = `Lei: ${leiNome || 'Não informada'}\nArtigo: ${artigoNumero || 'Não informado'}\nTipo de alteração: ${tipoAlteracao || 'Não informado'}\nParte modificada: ${parteModificada || 'Artigo inteiro'}\nReferência legislativa: ${referencia || 'Não informada'}\n\nTexto completo do artigo:\n\n${artigoTexto}`;
      contents = [{ role: 'user', parts: [{ text: prompt }] }];
    } else if (mode && artigoTexto) {
      switch (mode) {
        case 'explicacao': systemPrompt = SYSTEM_PROMPT_EXPLICACAO; break;
        case 'exemplo': systemPrompt = SYSTEM_PROMPT_EXEMPLO; break;
        case 'termos': systemPrompt = SYSTEM_PROMPT_TERMOS; break;
        case 'grifo_magico': systemPrompt = SYSTEM_PROMPT_GRIFO_MAGICO; break;
        case 'mapa_mental_grafo':
          systemPrompt = SYSTEM_PROMPT_MAPA_MENTAL;
          break;
        case 'sugerir-anotacoes':
          systemPrompt = `Você é um professor de Direito Brasileiro. Sugira 5 anotações importantes e concisas que um estudante deveria fazer sobre o artigo abaixo. Cada anotação deve ser uma frase curta e objetiva que capture um ponto-chave para estudo. Responda apenas com a lista numerada, sem introdução.`;
          break;
        case 'sugerir-perguntas':
        case 'sugerir_perguntas':
          systemPrompt = `Você é um estudante de Direito se preparando para a prova da OAB e concursos. Ao ler o artigo abaixo, anote exatamente 4 dúvidas reais que você teria — do tipo que anotaria na margem do caderno.

Regras:
- As perguntas devem ser práticas, específicas e contextualizadas ao artigo
- Use linguagem natural de estudante, não de professor
- Exemplos bons: "Se eu fizer X, esse artigo se aplica?", "Qual a diferença entre isso e o Art. Y?", "Isso vale também para situação Z?"
- Exemplos ruins: "Qual o conceito de...?", "Defina...", "O que estabelece o artigo?"
- Cada pergunta deve terminar com "?"
- Responda SOMENTE com um array JSON de 4 strings, sem markdown, sem explicação
- Exemplo: ["Pergunta 1?","Pergunta 2?","Pergunta 3?","Pergunta 4?"]`;
          break;
        case 'perguntar':
          systemPrompt = `Você é uma assistente jurídica especializada em Direito Brasileiro. O estudante está lendo o seguinte artigo:\n\nLei: ${leiNome || ''}\nArtigo: ${artigoNumero || ''}\nTexto: ${artigoTexto}\n\nResponda a pergunta do estudante de forma clara, didática e em português brasileiro. Use markdown para formatar. Cite artigos relacionados quando relevante.`;
          // For 'perguntar' mode with messages array, use chat-style
          if (messages && Array.isArray(messages) && messages.length > 0) {
            contents = messages.map((msg: { role: string; content: string }) => ({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }],
            }));
          } else {
            const prompt = `${artigoNumero ? `Artigo: ${artigoNumero}\n` : ''}Texto do artigo:\n\n${artigoTexto}`;
            contents = [{ role: 'user', parts: [{ text: prompt }] }];
          }
          break;
        default: systemPrompt = SYSTEM_PROMPT_EXPLICACAO;
      }
      if (mode !== 'perguntar' && !contents!) {
        const prompt = `${leiNome ? `Lei: ${leiNome}\n` : ''}${artigoNumero ? `Artigo: ${artigoNumero}\n` : ''}Texto do artigo:\n\n${artigoTexto}`;
        contents = [{ role: 'user', parts: [{ text: prompt }] }];
      }
    } else if ((mode === 'flashcards_conteudo' || mode === 'questoes_conteudo' || mode === 'mapa_conteudo' || mode === 'termos_conteudo') && (body.conteudo || artigoTexto)) {
      systemPrompt = mode === 'flashcards_conteudo' ? SYSTEM_PROMPT_FLASHCARDS_CONTEUDO
        : mode === 'questoes_conteudo' ? SYSTEM_PROMPT_QUESTOES_CONTEUDO
        : mode === 'termos_conteudo' ? SYSTEM_PROMPT_TERMOS_CONTEUDO
        : SYSTEM_PROMPT_MAPA_CONTEUDO;
      contents = [{ role: 'user', parts: [{ text: `Conteúdo:\n\n${body.conteudo || artigoTexto}` }] }];
    } else if (messages && Array.isArray(messages) && messages.length > 0) {
      systemPrompt = body.webSearch ? SYSTEM_PROMPT_CHAT_WEB : SYSTEM_PROMPT_CHAT;
      contents = messages.map((msg: any) => {
        const parts: any[] = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.attachment?.data && msg.attachment?.mime) {
          parts.push({ inlineData: { mimeType: msg.attachment.mime, data: msg.attachment.data } });
        }
        return { role: msg.role === 'assistant' ? 'model' : 'user', parts: parts.length ? parts : [{ text: ' ' }] };
      });
    } else {
      return new Response(JSON.stringify({ error: 'messages array or mode+artigoTexto required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const useWebSearch = !!body.webSearch && !mode;
    const isJsonMode = mode === 'grifo_magico' || mode === 'sugerir_perguntas' || mode === 'sugerir-perguntas' || mode === 'mapa_mental_grafo' || mode === 'carrossel_post' || mode === 'flashcards_conteudo' || mode === 'questoes_conteudo' || mode === 'mapa_conteudo' || mode === 'termos_conteudo';
    const geminiBody: any = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: mode === 'headline' ? 0.6 : isJsonMode ? 0.3 : 0.7,
        maxOutputTokens: mode === 'headline'
          ? 150
          : (mode === 'mapa_mental_grafo' || mode === 'carrossel_post' || mode === 'grifo_magico')
            ? 8192
            : 4096,
        ...(isJsonMode ? { responseMimeType: 'application/json' } : {}),
      },
      ...(useWebSearch ? { tools: [{ google_search: {} }] } : {}),
    };

    let reply = mode === 'headline' ? '' : 'Desculpe, não consegui gerar uma resposta.';
    let sources: Array<{ n: number; title: string; url: string; domain: string }> = [];
    let _lastUsage: any = null;
    let _lastErr = "";
    const _t0 = Date.now();
    // Se as chaves diretas do Gemini estiverem ausentes/invalidas, caímos para o
    // Lovable AI Gateway (mesmo modelo, cobrança pela plataforma).
    let geminiDisabled = geminiKeys.length === 0;

    async function gatewayGenerate(): Promise<any | null> {
      if (!LOVABLE_API_KEY) return null;
      const msgs: any[] = [{ role: 'system', content: systemPrompt }];
      for (const c of (contents as any[])) {
        const textParts = (c.parts || []).filter((p: any) => typeof p?.text === 'string').map((p: any) => p.text).join('\n');
        const inline = (c.parts || []).find((p: any) => p?.inlineData?.data);
        if (inline) {
          msgs.push({
            role: c.role === 'model' ? 'assistant' : 'user',
            content: [
              ...(textParts ? [{ type: 'text', text: textParts }] : []),
              { type: 'image_url', image_url: { url: `data:${inline.inlineData.mimeType};base64,${inline.inlineData.data}` } },
            ],
          });
        } else {
          msgs.push({ role: c.role === 'model' ? 'assistant' : 'user', content: textParts || ' ' });
        }
      }
      const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': LOVABLE_API_KEY },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: msgs,
          temperature: geminiBody.generationConfig.temperature,
          max_tokens: geminiBody.generationConfig.maxOutputTokens,
          ...(isJsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (!r.ok) {
        _lastErr = (await r.text()).slice(0, 200);
        console.error('Lovable Gateway error:', r.status, _lastErr);
        return null;
      }
      const j = await r.json();
      const text = j?.choices?.[0]?.message?.content ?? '';
      return {
        candidates: [{ content: { parts: [{ text }] } }],
        usageMetadata: {
          promptTokenCount: j?.usage?.prompt_tokens ?? 0,
          candidatesTokenCount: j?.usage?.completion_tokens ?? 0,
        },
      };
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      let data: any = null;
      let fatal = false;

      if (!geminiDisabled) {
        const keyToUse = geminiKeys[attempt % geminiKeys.length];
        const res = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${keyToUse}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
        );
        if (res.ok) {
          data = await res.json();
        } else {
          const errText = await res.text();
          _lastErr = errText.slice(0, 200);
          const invalidKey = res.status === 400 && /API_KEY_INVALID|API key not valid/i.test(errText);
          const noQuota = res.status === 429 || res.status === 403;
          if (invalidKey || noQuota) {
            console.error('Gemini indisponível, usando Lovable AI Gateway:', errText.slice(0, 200));
            geminiDisabled = true;
          } else {
            const isUnavailable = res.status === 503 || errText.includes('UNAVAILABLE');
            if (!isUnavailable || attempt === 2) { console.error('Gemini API error:', errText); fatal = true; }
          }
        }
      }

      if (!data && geminiDisabled) {
        data = await gatewayGenerate();
        if (!data) fatal = true;
      }

      if (fatal) break;

      if (data) {
        _lastUsage = data?.usageMetadata || null;
        const candidateReply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        // Extract grounding sources when web search is on
        if (useWebSearch) {
          try {
            const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            sources = chunks
              .map((c: any, i: number) => {
                const w = c?.web;
                if (!w?.uri) return null;
                let domain = '';
                try { domain = new URL(w.uri).hostname.replace(/^www\./, ''); } catch { /* noop */ }
                return { n: i + 1, title: w.title || domain || w.uri, url: w.uri, domain };
              })
              .filter((x: any) => x !== null);
          } catch { /* noop */ }
        }

        if (mode === 'headline') {
          if (candidateReply && isValidHeadline(candidateReply)) {
            reply = candidateReply;
            break;
          }
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
          continue;
        } else if (mode === 'grifo_magico' && candidateReply) {
          let trimmed = candidateReply.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
          // Extract JSON array if wrapped in object or extra text
          const firstBracket = trimmed.indexOf('[');
          const lastBracket = trimmed.lastIndexOf(']');
          if (firstBracket !== -1 && lastBracket > firstBracket) {
            trimmed = trimmed.slice(firstBracket, lastBracket + 1);
          }
          try {
            const parsed = JSON.parse(trimmed);
            const arr = Array.isArray(parsed)
              ? parsed
              : (Array.isArray(parsed?.grifos)
                ? parsed.grifos
                : (parsed && typeof parsed === 'object'
                  ? (Object.values(parsed).find((v: any) => Array.isArray(v)) as any[] | undefined) ?? null
                  : null));
            if (arr && arr.length > 0 && arr.every((g: any) => g?.trechoExato && g?.cor)) {
              reply = JSON.stringify(arr);
              break;
            }
          } catch (e) {
            console.log(`grifo_magico attempt ${attempt + 1} parse error:`, (e as Error).message);
          }
          console.log(`grifo_magico attempt ${attempt + 1}: invalid JSON. Raw (first 300):`, candidateReply.slice(0, 300));
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
          continue;
        } else if (mode === 'mapa_mental_grafo' && candidateReply) {
          const trimmed = candidateReply.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed?.titulo && Array.isArray(parsed?.termos_chave) && Array.isArray(parsed?.filhos)) {
              reply = JSON.stringify(parsed);
              break;
            }
          } catch { /* retry */ }
          console.log(`mapa_mental_grafo attempt ${attempt + 1}: invalid JSON, retrying...`);
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
          continue;
        } else if (mode === 'carrossel_post' && candidateReply) {
          const trimmed = candidateReply.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed?.slides && Array.isArray(parsed.slides) && parsed.slides.length >= 3) {
              reply = JSON.stringify(parsed);
              break;
            }
          } catch { /* retry */ }
          console.log(`carrossel_post attempt ${attempt + 1}: invalid JSON, retrying...`);
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
          continue;
        } else if ((mode === 'sugerir_perguntas' || mode === 'sugerir-perguntas') && candidateReply) {
          const trimmed = candidateReply.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed) && parsed.length >= 2) {
              reply = JSON.stringify(parsed.slice(0, 4));
              break;
            }
          } catch { /* retry */ }
          console.log(`sugerir_perguntas attempt ${attempt + 1}: invalid JSON, retrying...`);
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
          continue;
        } else if (candidateReply) {
          reply = candidateReply;
          break;
        }
      }
      await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
    }

    await logAiCall({
      functionName: "assistente-juridica",
      kind: "text",
      model: "gemini-flash-lite-latest",
      triggerType: "manual",
      inputUnits: _lastUsage?.promptTokenCount ?? 0,
      outputUnits: _lastUsage?.candidatesTokenCount ?? 0,
      durationMs: Date.now() - _t0,
      success: !_lastErr,
      error: _lastErr || undefined,
      refId: mode,
      userId: _callerUserId,
    });

    if (mode === 'headline' && !reply) {
      reply = createFallbackHeadline(ementa, plNumero, plAno);
    }

    // For mapa_mental_grafo, if reply is still the default fallback, return explicit error
    if (mode === 'mapa_mental_grafo') {
      try {
        const parsed = JSON.parse(reply);
        if (!parsed?.titulo || !Array.isArray(parsed?.filhos)) {
          return new Response(JSON.stringify({ error: 'Falha ao gerar mapa mental após 3 tentativas. Tente novamente.' }), {
            status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch {
        return new Response(JSON.stringify({ error: 'Falha ao gerar mapa mental. Tente novamente.' }), {
          status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ reply, sources }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

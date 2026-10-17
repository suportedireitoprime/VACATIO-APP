/**
 * legalLinker.ts
 * Utilitário de inteligência para detecção e hiperlinkagem automática
 * de citações normativas (artigos, leis, códigos, estatutos e súmulas)
 * dentro do texto de notícias e publicações jurídicas.
 *
 * Transforma menções no texto em rotas internas do VACATIO APP.
 */

export interface LegalCitation {
  raw: string;
  label: string;
  leiNome: string;
  artigoNumero?: string;
  url: string;
  tipo: 'constituicao' | 'codigo' | 'estatuto' | 'lei-especial' | 'sumula';
}

interface CitationRule {
  pattern: RegExp;
  tipo: 'constituicao' | 'codigo' | 'estatuto' | 'lei-especial' | 'sumula';
  leiNome: string;
  sigla: string;
  baseRoute: string; // Ex: '/legislacao/codigos/codigo-de-processo-civil'
  isConstituicao?: boolean;
}

const CITATION_RULES: CitationRule[] = [
  // 1. Constituição Federal
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:da|do|de)?\s*(?:CF(?:\/88)?|CRFB(?:\/88)?|Constitui[çc][ãa]o(?:\s+Federal)?|Carta\s+Magna)\b/gi,
    tipo: 'constituicao',
    leiNome: 'Constituição Federal',
    sigla: 'CF/88',
    baseRoute: '/legislacao/constituicao',
    isConstituicao: true,
  },

  // 2. Códigos Principais
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:do|da|de)?\s*(?:CPC(?:\/15)?|C[óo]digo\s+de\s+Processo\s+Civil)\b/gi,
    tipo: 'codigo',
    leiNome: 'Código de Processo Civil',
    sigla: 'CPC',
    baseRoute: '/legislacao/codigos/codigo-de-processo-civil',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:do|da|de)?\s*(?:CC(?:\/02)?|C[óo]digo\s+Civil)\b/gi,
    tipo: 'codigo',
    leiNome: 'Código Civil',
    sigla: 'CC',
    baseRoute: '/legislacao/codigos/codigo-civil',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:do|da|de)?\s*(?:CP(?:\/40)?|C[óo]digo\s+Penal)\b/gi,
    tipo: 'codigo',
    leiNome: 'Código Penal',
    sigla: 'CP',
    baseRoute: '/legislacao/codigos/codigo-penal',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:do|da|de)?\s*(?:CPP|C[óo]digo\s+de\s+Processo\s+Penal)\b/gi,
    tipo: 'codigo',
    leiNome: 'Código de Processo Penal',
    sigla: 'CPP',
    baseRoute: '/legislacao/codigos/codigo-de-processo-penal',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:da|do|de)?\s*(?:CLT|Consolida[çc][ãa]o\s+das\s+Leis\s+do\s+Trabalho)\b/gi,
    tipo: 'codigo',
    leiNome: 'Consolidação das Leis do Trabalho',
    sigla: 'CLT',
    baseRoute: '/legislacao/codigos/consolidacao-das-leis-do-trabalho',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:do|da|de)?\s*(?:CDC|C[óo]digo\s+de\s+Defesa\s+do\s+Consumidor)\b/gi,
    tipo: 'codigo',
    leiNome: 'Código de Defesa do Consumidor',
    sigla: 'CDC',
    baseRoute: '/legislacao/codigos/codigo-de-defesa-do-consumidor',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:do|da|de)?\s*(?:CTN|C[óo]digo\s+Tribut[áa]rio\s+Nacional)\b/gi,
    tipo: 'codigo',
    leiNome: 'Código Tributário Nacional',
    sigla: 'CTN',
    baseRoute: '/legislacao/codigos/codigo-tributario-nacional',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:do|da|de)?\s*(?:CTB|C[óo]digo\s+de\s+Tr[âa]nsito\s+Brasileiro)\b/gi,
    tipo: 'codigo',
    leiNome: 'Código de Trânsito Brasileiro',
    sigla: 'CTB',
    baseRoute: '/legislacao/codigos/codigo-de-transito-brasileiro',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:do|da|de)?\s*(?:C[óo]digo\s+Florestal)\b/gi,
    tipo: 'codigo',
    leiNome: 'Código Florestal',
    sigla: 'CFlor',
    baseRoute: '/legislacao/codigos/codigo-florestal',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:do|da|de)?\s*(?:C[óo]digo\s+Eleitoral)\b/gi,
    tipo: 'codigo',
    leiNome: 'Código Eleitoral',
    sigla: 'CE',
    baseRoute: '/legislacao/codigos/codigo-eleitoral',
  },

  // 3. Estatutos
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:do|da|de)?\s*(?:EOAB|Estatuto\s+da\s+(?:Advocacia|OAB)|Lei\s+(?:n[ºo]\.?\s*)?8\.?906(?:\/94)?)\b/gi,
    tipo: 'estatuto',
    leiNome: 'Estatuto da OAB',
    sigla: 'EOAB',
    baseRoute: '/legislacao/estatutos/estatuto-da-oab',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:do|da|de)?\s*(?:ECA|Estatuto\s+da\s+Crian[çc]a\s+e\s+do\s+Adolescente|Lei\s+(?:n[ºo]\.?\s*)?8\.?069(?:\/90)?)\b/gi,
    tipo: 'estatuto',
    leiNome: 'Estatuto da Criança e do Adolescente',
    sigla: 'ECA',
    baseRoute: '/legislacao/estatutos/estatuto-da-crianca-e-do-adolescente',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:do|da|de)?\s*(?:Estatuto\s+do\s+Idoso|Estatuto\s+da\s+Pessoa\s+Idosa|Lei\s+(?:n[ºo]\.?\s*)?10\.?741(?:\/03)?)\b/gi,
    tipo: 'estatuto',
    leiNome: 'Estatuto do Idoso',
    sigla: 'EI',
    baseRoute: '/legislacao/estatutos/estatuto-do-idoso',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:do|da|de)?\s*(?:EPD|Estatuto\s+da\s+Pessoa\s+com\s+Defici[êe]ncia|Lei\s+(?:n[ºo]\.?\s*)?13\.?146(?:\/15)?)\b/gi,
    tipo: 'estatuto',
    leiNome: 'Estatuto da Pessoa com Deficiência',
    sigla: 'EPD',
    baseRoute: '/legislacao/estatutos/estatuto-da-pessoa-com-deficiencia',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:do|da|de)?\s*(?:Estatuto\s+do\s+Desarmamento|Lei\s+(?:n[ºo]\.?\s*)?10\.?826(?:\/03)?)\b/gi,
    tipo: 'estatuto',
    leiNome: 'Estatuto do Desarmamento',
    sigla: 'ED',
    baseRoute: '/legislacao/estatutos/estatuto-do-desarmamento',
  },

  // 4. Leis Especiais de Alto Impacto
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:da|do|de)?\s*(?:Lei\s+Maria\s+da\s+Penha|Lei\s+(?:n[ºo]\.?\s*)?11\.?340(?:\/06)?)\b/gi,
    tipo: 'lei-especial',
    leiNome: 'Lei Maria da Penha',
    sigla: 'LMP',
    baseRoute: '/legislacao/leis-especiais/lei-maria-da-penha',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:da|do|de)?\s*(?:Lei\s+de\s+Drogas|Lei\s+Antidrogas|Lei\s+(?:n[ºo]\.?\s*)?11\.?343(?:\/06)?)\b/gi,
    tipo: 'lei-especial',
    leiNome: 'Lei de Drogas',
    sigla: 'LD',
    baseRoute: '/legislacao/leis-especiais/lei-de-drogas',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:da|do|de)?\s*(?:Nova\s+Lei\s+de\s+Licita[çc][õo]es|Lei\s+de\s+Licita[çc][õo]es|Lei\s+(?:n[ºo]\.?\s*)?14\.?133(?:\/21)?)\b/gi,
    tipo: 'lei-especial',
    leiNome: 'Nova Lei de Licitações',
    sigla: 'NLL',
    baseRoute: '/legislacao/leis-especiais/nova-lei-de-licitacoes',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:da|do|de)?\s*(?:LGPD|Lei\s+Geral\s+de\s+Prote[çc][ãa]o\s+de\s+Dados|Lei\s+(?:n[ºo]\.?\s*)?13\.?709(?:\/18)?)\b/gi,
    tipo: 'lei-especial',
    leiNome: 'Lei Geral de Proteção de Dados',
    sigla: 'LGPD',
    baseRoute: '/legislacao/leis-especiais/lei-geral-de-protecao-de-dados',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:da|do|de)?\s*(?:LIA|Lei\s+de\s+Improbidade(?:\s+Administrativa)?|Lei\s+(?:n[ºo]\.?\s*)?8\.?429(?:\/92)?)\b/gi,
    tipo: 'lei-especial',
    leiNome: 'Lei de Improbidade Administrativa',
    sigla: 'LIA',
    baseRoute: '/legislacao/leis-especiais/lei-de-improbidade-administrativa',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:da|do|de)?\s*(?:LEP|Lei\s+de\s+Execu[çc][ãa]o\s+Penal|Lei\s+(?:n[ºo]\.?\s*)?7\.?210(?:\/84)?)\b/gi,
    tipo: 'lei-especial',
    leiNome: 'Lei de Execução Penal',
    sigla: 'LEP',
    baseRoute: '/legislacao/leis-especiais/lei-de-execucao-penal',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:da|do|de)?\s*(?:Lei\s+de\s+Organiza[çc][ãa]o\s+Criminosa|Lei\s+das\s+Organiza[çc][õo]es\s+Criminosas|Lei\s+(?:n[ºo]\.?\s*)?12\.?850(?:\/13)?)\b/gi,
    tipo: 'lei-especial',
    leiNome: 'Lei de Organização Criminosa',
    sigla: 'LOC',
    baseRoute: '/legislacao/leis-especiais/lei-de-organizacao-criminosa',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:da|do|de)?\s*(?:Lei\s+de\s+Abuso\s+de\s+Autoridade|Lei\s+(?:n[ºo]\.?\s*)?13\.?869(?:\/19)?)\b/gi,
    tipo: 'lei-especial',
    leiNome: 'Lei de Abuso de Autoridade',
    sigla: 'LAA',
    baseRoute: '/legislacao/leis-especiais/lei-de-abuso-de-autoridade',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:da|do|de)?\s*(?:Lei\s+de\s+Fal[êe]ncias|Lei\s+de\s+Recupera[çc][ãa]o\s+Judicial|Lei\s+(?:n[ºo]\.?\s*)?11\.?101(?:\/05)?)\b/gi,
    tipo: 'lei-especial',
    leiNome: 'Lei de Falências',
    sigla: 'LF',
    baseRoute: '/legislacao/leis-especiais/lei-de-falencias-e-recuperacao',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:da|do|de)?\s*(?:Lei\s+do\s+Inquilinato|Lei\s+de\s+Loca[çc][õo]es|Lei\s+(?:n[ºo]\.?\s*)?8\.?245(?:\/91)?)\b/gi,
    tipo: 'lei-especial',
    leiNome: 'Lei do Inquilinato',
    sigla: 'LI',
    baseRoute: '/legislacao/leis-especiais/lei-do-inquilinato',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:da|do|de)?\s*(?:LINDB|Lei\s+de\s+Introdu[çc][ãa]o\s+às\s+Normas\s+do\s+Direito\s+Brasileiro|Decreto-Lei\s+(?:n[ºo]\.?\s*)?4\.?657(?:\/42)?)\b/gi,
    tipo: 'lei-especial',
    leiNome: 'LINDB',
    sigla: 'LINDB',
    baseRoute: '/legislacao/leis-especiais/lei-de-introducao-as-normas-do-direito-brasileiro',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:da|do|de)?\s*(?:Lei\s+dos\s+Juizados\s+Especiais|Lei\s+(?:n[ºo]\.?\s*)?9\.?099(?:\/95)?)\b/gi,
    tipo: 'lei-especial',
    leiNome: 'Lei dos Juizados Especiais',
    sigla: 'LJE',
    baseRoute: '/legislacao/leis-especiais/lei-dos-juizados-especiais',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:da|do|de)?\s*(?:Estatuto\s+dos\s+Servidores|Lei\s+(?:n[ºo]\.?\s*)?8\.?112(?:\/90)?)\b/gi,
    tipo: 'lei-especial',
    leiNome: 'Servidores Federais',
    sigla: 'Lei 8.112',
    baseRoute: '/legislacao/leis-especiais/estatuto-dos-servidores-federais',
  },
  {
    pattern: /\b(?:arts?\.?|artigos?)\s*(\d+[º°]?(?:-[A-Za-z])?)\s+(?:do|da|de)?\s*(?:Marco\s+Civil(?:\s+da\s+Internet)?|Lei\s+(?:n[ºo]\.?\s*)?12\.?965(?:\/14)?)\b/gi,
    tipo: 'lei-especial',
    leiNome: 'Marco Civil da Internet',
    sigla: 'Marco Civil',
    baseRoute: '/legislacao/leis-especiais/marco-civil-da-internet',
  },
];

/**
 * Normaliza número do artigo removendo ordinais e símbolos (ex: '5º' -> '5', '833' -> '833').
 */
function cleanArtigoNumero(art: string): string {
  return art.replace(/[º°]/g, '').trim();
}

/**
 * Extrai citações únicas de normas e súmulas a partir de um texto.
 */
export function extractLegalCitations(text: string): LegalCitation[] {
  if (!text) return [];

  const found: LegalCitation[] = [];
  const seenUrls = new Set<string>();

  // 1. Súmula Vinculante
  const svRegex = /\bS[úu]mula\s+Vinculante\s+(?:n[ºo]\.?\s*)?(\d+)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = svRegex.exec(text)) !== null) {
    const num = match[1];
    const url = `/jurisprudencia/sumulas-vinculantes?q=${num}`;
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      found.push({
        raw: match[0],
        label: `Súmula Vinculante ${num}`,
        leiNome: 'Súmula Vinculante (STF)',
        artigoNumero: num,
        url,
        tipo: 'sumula',
      });
    }
  }

  // 2. Súmula STF
  const stfRegex = /\bS[úu]mula\s+(?:n[ºo]\.?\s*)?(\d+)\s+do\s+STF\b/gi;
  while ((match = stfRegex.exec(text)) !== null) {
    const num = match[1];
    const url = `/jurisprudencia/sumulas-stf?q=${num}`;
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      found.push({
        raw: match[0],
        label: `STF · Súmula ${num}`,
        leiNome: 'Súmulas do STF',
        artigoNumero: num,
        url,
        tipo: 'sumula',
      });
    }
  }

  // 3. Súmula STJ
  const stjRegex = /\bS[úu]mula\s+(?:n[ºo]\.?\s*)?(\d+)\s+do\s+STJ\b/gi;
  while ((match = stjRegex.exec(text)) !== null) {
    const num = match[1];
    const url = `/jurisprudencia/sumulas-stj?q=${num}`;
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      found.push({
        raw: match[0],
        label: `STJ · Súmula ${num}`,
        leiNome: 'Súmulas do STJ',
        artigoNumero: num,
        url,
        tipo: 'sumula',
      });
    }
  }

  // 4. Artigos de Códigos, CF e Leis Especiais
  for (const rule of CITATION_RULES) {
    const reg = new RegExp(rule.pattern.source, 'gi');
    while ((match = reg.exec(text)) !== null) {
      const rawMatch = match[0];
      const rawArt = match[1];
      const num = cleanArtigoNumero(rawArt);
      const url = rule.isConstituicao
        ? `${rule.baseRoute}?artigo=${encodeURIComponent(num)}`
        : `${rule.baseRoute}/${encodeURIComponent(num)}`;

      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        found.push({
          raw: rawMatch,
          label: `${rule.sigla} · Art. ${rawArt}`,
          leiNome: rule.leiNome,
          artigoNumero: num,
          url,
          tipo: rule.tipo,
        });
      }
    }
  }

  return found;
}

/**
 * Transforma citações de artigos e leis encontradas no texto markdown
 * em links internos com esquema `#legal:<rota>`.
 *
 * Preserva blocos de código e links já existentes.
 */
export function linkifyLegalMarkdown(markdown: string): string {
  if (!markdown) return '';

  // 1. Mascara blocos de código, imagens e links existentes para evitar reprocessamento
  const masks: string[] = [];
  const maskToken = (content: string) => {
    const id = `@@LEGAL_MASK_${masks.length}@@`;
    masks.push(content);
    return id;
  };

  let processed = markdown
    // Blocos de código multiline
    .replace(/```[\s\S]*?```/g, maskToken)
    // Inline code
    .replace(/`[^`]+`/g, maskToken)
    // Imagens markdown
    .replace(/!\[[^\]]*\]\([^)]+\)/g, maskToken)
    // Links existentes
    .replace(/\[[^\]]+\]\([^)]+\)/g, maskToken);

  // 2. Aplica substituições para Súmula Vinculante
  processed = processed.replace(
    /\b(S[úu]mula\s+Vinculante\s+(?:n[ºo]\.?\s*)?(\d+))\b/gi,
    '[$1](#legal:/jurisprudencia/sumulas-vinculantes?q=$2)'
  );

  // 3. Súmula STF
  processed = processed.replace(
    /\b(S[úu]mula\s+(?:n[ºo]\.?\s*)?(\d+)\s+do\s+STF)\b/gi,
    '[$1](#legal:/jurisprudencia/sumulas-stf?q=$2)'
  );

  // 4. Súmula STJ
  processed = processed.replace(
    /\b(S[úu]mula\s+(?:n[ºo]\.?\s*)?(\d+)\s+do\s+STJ)\b/gi,
    '[$1](#legal:/jurisprudencia/sumulas-stj?q=$2)'
  );

  // 5. Aplica regras normativas (Artigos de Códigos, CF e Leis)
  for (const rule of CITATION_RULES) {
    const reg = new RegExp(rule.pattern.source, 'gi');
    processed = processed.replace(reg, (fullMatch, artGroup) => {
      const num = cleanArtigoNumero(artGroup);
      const url = rule.isConstituicao
        ? `${rule.baseRoute}?artigo=${encodeURIComponent(num)}`
        : `${rule.baseRoute}/${encodeURIComponent(num)}`;
      return `[${fullMatch}](#legal:${url})`;
    });
  }

  // 6. Restaura tokens mascarados
  for (let i = 0; i < masks.length; i++) {
    processed = processed.replace(`@@LEGAL_MASK_${i}@@`, masks[i]);
  }

  return processed;
}

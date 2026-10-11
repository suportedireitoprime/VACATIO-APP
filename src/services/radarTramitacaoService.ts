/**
 * Serviço de monitoramento de proposições legislativas em tramitação
 * no Congresso Nacional (Câmara dos Deputados e Senado Federal).
 * 
 * Focado em Projetos de Lei (PL), Leis Complementares (PLP) e PECs
 * que ainda não foram aprovadas e estão em tramitação, destacando
 * proposições que alteram leis e artigos de códigos vigentes.
 */

export type CasaLegislativa = 'todas' | 'camara' | 'senado';
export type TipoProposicao = 'todos' | 'PL' | 'PLP' | 'PEC';

export interface TramitacaoPasso {
  dataHora: string;
  sequencia?: number;
  siglaOrgao?: string;
  descricao: string;
  despacho?: string;
}

export interface ProposicaoTramitando {
  id: string; // Ex: 'camara-2647402' ou 'senado-175925'
  idOriginal: string | number;
  casa: 'camara' | 'senado';
  siglaTipo: string;
  numero: string | number;
  ano: string | number;
  codigoIdentificacao: string; // Ex: "PL 5539/2026"
  ementa: string;
  dataApresentacao?: string;
  dataUltimaTramitacao?: string;
  autorNome: string;
  autorPartido?: string;
  autorUf?: string;
  autorFotoUrl?: string;
  autorCargo?: string;
  situacao: string;
  orgao?: string;
  urlInteiroTeor?: string;
  urlTramitacao?: string;
  alteraLegislacao: boolean;
  leiAlvo?: string;
}

const CAMARA_API = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO_API = 'https://legis.senado.leg.br/dadosabertos';

const CACHE_KEY = 'vacatio_radar_tramitacao_cache_v2';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

interface CachePayload {
  timestamp: number;
  itens: ProposicaoTramitando[];
}

let memoryCache: CachePayload | null = null;

/**
 * Detecta se a ementa do projeto altera ou revoga artigos de legislação existente
// Mapeamento de Leis Federais célebres para exibição amigável
const NOMES_LEIS_CONHECIDAS: Record<string, string> = {
  '11.771': 'Lei Geral do Turismo',
  '12.764': 'Direitos da Pessoa com TEA / Autismo',
  '11.738': 'Piso Salarial do Magistério',
  '4.769': 'Profissão de Administrador',
  '11.340': 'Lei Maria da Penha',
  '13.146': 'Estatuto da Pessoa com Deficiência',
  '10.741': 'Estatuto da Pessoa Idosa',
  '14.423': 'Estatuto da Pessoa Idosa',
  '12.965': 'Marco Civil da Internet',
  '13.709': 'LGPD (Proteção de Dados)',
  '11.343': 'Lei de Drogas',
  '12.850': 'Organizações Criminosas',
  '9.296': 'Interceptação Telefônica',
  '9.099': 'Juizados Especiais (JEC)',
  '7.210': 'Lei de Execução Penal (LEP)',
  '8.112': 'Estatuto dos Servidores Públicos',
  '9.394': 'LDB (Diretrizes e Bases da Educação)',
  '8.080': 'Lei Orgânica da Saúde (SUS)',
  '8.142': 'Participação da Comunidade no SUS',
  '12.527': 'Lei de Acesso à Informação (LAI)',
  '10.826': 'Estatuto do Desarmamento',
  '9.605': 'Lei de Crimes Ambientais',
  '14.133': 'Nova Lei de Licitações',
  '8.666': 'Lei de Licitações',
  '8.429': 'Lei de Improbidade Administrativa',
  '11.101': 'Lei de Falências e Recuperação Judicial',
  '6.404': 'Lei das S.A. (Sociedades Anônimas)',
  '13.303': 'Lei das Estatais',
  '9.503': 'Código de Trânsito Brasileiro (CTB)',
  '5.172': 'Código Tributário Nacional (CTN)',
  '8.078': 'Código de Defesa do Consumidor (CDC)',
  '10.406': 'Código Civil (CC)',
  '2.848': 'Código Penal (CP)',
  '3.689': 'Código de Processo Penal (CPP)',
  '13.105': 'Código de Processo Civil (CPC)',
  '5.452': 'CLT (Leis do Trabalho)',
  '8.069': 'Estatuto da Criança e do Adolescente (ECA)',
  '8.906': 'Estatuto da OAB',
  '12.651': 'Código Florestal',
};

/**
 * Detecta se a ementa do projeto altera ou revoga artigos de legislação existente
 * e extrai o nome simplificado do código/lei afetada para exibição em destaque.
 */
export function extrairLeiAlterada(ementa: string): { alteraLegislacao: boolean; leiAlvo?: string } {
  if (!ementa) return { alteraLegislacao: false };

  const texto = ementa.toLowerCase();
  const termosAlteracao = [
    'altera a lei',
    'altera o decreto-lei',
    'altera o código',
    'altera a consolidação',
    'altera a constituição',
    'altera o estatuto',
    'altera o §',
    'altera o art',
    'acrescenta dispositivo',
    'acrescenta o art',
    'acrescenta parágrafo',
    'revoga o',
    'revoga a',
    'nova redação ao',
    'nova redação à',
  ];

  const ehAlteracao = termosAlteracao.some((termo) => texto.includes(termo));

  // 1. Reconhecimento de Códigos Principais e Constituição
  if (texto.includes('código penal') || texto.includes('decreto-lei nº 2.848')) {
    return { alteraLegislacao: true, leiAlvo: 'Código Penal (CP)' };
  }
  if (texto.includes('código civil') || texto.includes('lei nº 10.406')) {
    return { alteraLegislacao: true, leiAlvo: 'Código Civil (CC)' };
  }
  if (texto.includes('consolidação das leis do trabalho') || texto.includes('clt') || texto.includes('decreto-lei nº 5.452')) {
    return { alteraLegislacao: true, leiAlvo: 'CLT (Leis do Trabalho)' };
  }
  if (texto.includes('código de processo civil') || texto.includes('cpc') || texto.includes('lei nº 13.105')) {
    return { alteraLegislacao: true, leiAlvo: 'Código de Processo Civil (CPC)' };
  }
  if (texto.includes('código de processo penal') || texto.includes('cpp') || texto.includes('decreto-lei nº 3.689')) {
    return { alteraLegislacao: true, leiAlvo: 'Código de Processo Penal (CPP)' };
  }
  if (texto.includes('código de defesa do consumidor') || texto.includes('cdc') || texto.includes('lei nº 8.078')) {
    return { alteraLegislacao: true, leiAlvo: 'Código de Defesa do Consumidor (CDC)' };
  }
  if (texto.includes('código tributário') || texto.includes('ctn') || texto.includes('lei nº 5.172')) {
    return { alteraLegislacao: true, leiAlvo: 'Código Tributário Nacional (CTN)' };
  }
  if (texto.includes('código de trânsito') || texto.includes('ctb') || texto.includes('lei nº 9.503')) {
    return { alteraLegislacao: true, leiAlvo: 'Código de Trânsito Brasileiro (CTB)' };
  }
  if (texto.includes('constituição federal') || texto.includes('cf/88') || texto.includes('adct')) {
    return { alteraLegislacao: true, leiAlvo: 'Constituição Federal (CF/88)' };
  }
  if (texto.includes('maria da penha') || texto.includes('lei nº 11.340')) {
    return { alteraLegislacao: true, leiAlvo: 'Lei Maria da Penha' };
  }
  if (texto.includes('estatuto da criança') || texto.includes('eca') || texto.includes('lei nº 8.069')) {
    return { alteraLegislacao: true, leiAlvo: 'Estatuto da Criança e do Adolescente (ECA)' };
  }
  if (texto.includes('estatuto da oab') || texto.includes('lei nº 8.906')) {
    return { alteraLegislacao: true, leiAlvo: 'Estatuto da OAB' };
  }

  // 2. Tentar casar com o mapa de leis conhecidas pelo número
  for (const [numeroLei, nomeLei] of Object.entries(NOMES_LEIS_CONHECIDAS)) {
    if (texto.includes(numeroLei)) {
      return { alteraLegislacao: true, leiAlvo: `${nomeLei} (Lei ${numeroLei})` };
    }
  }

  // 3. Extrair nome popular entre parênteses na ementa: ex: (Lei Geral do Turismo), (Marco Civil...)
  const regexParenteses = /\(([^)]*(?:Lei|Estatuto|Código|Política|Marco|Regulamentação|Plano|Diretrizes)[^)]*)\)/i;
  const matchParen = ementa.match(regexParenteses);
  if (matchParen) {
    const nomeCurto = matchParen[1].trim();
    // Tentar achar o número da lei antes do parêntese
    const regexNum = /lei\s+(?:complementar\s+)?n[ºo°]?\s*([\d\.]+)/i;
    const matchNum = ementa.match(regexNum);
    const numPart = matchNum ? ` (${matchNum[1]})` : '';
    return { alteraLegislacao: true, leiAlvo: `${nomeCurto}${numPart}` };
  }

  // 4. Regex genérico para capturar menção a lei específica (ex: "Altera a Lei nº 11.771")
  const regexLei = /(?:altera|acrescenta|modifica|revoga)\s+(?:a\s+|o\s+)?(lei\s+(?:complementar\s+)?n[ºo°]?\s*[\d\.]+)/i;
  const match = ementa.match(regexLei);
  if (match) {
    return { alteraLegislacao: true, leiAlvo: match[1].replace(/n[ºo°]?\s*/i, 'nº ') };
  }

  return { alteraLegislacao: ehAlteracao, leiAlvo: ehAlteracao ? 'Legislação Federal' : undefined };
}

/**
 * Busca proposições da Câmara dos Deputados
 */
async function fetchProposicoesCamara(limite = 25): Promise<ProposicaoTramitando[]> {
  try {
    const url = `${CAMARA_API}/proposicoes?siglaTipo=PL,PLP,PEC&ordem=DESC&ordenarPor=id&itens=${limite}&pagina=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const json = await res.json();
    const dados = json?.dados || [];

    // Enriquecer com autor e situação em pequenos lotes com timeout seguro
    const promessas = dados.map(async (p: any): Promise<ProposicaoTramitando> => {
      const { alteraLegislacao, leiAlvo } = extrairLeiAlterada(p.ementa || '');
      let autorNome = 'Deputado(a) Federal';
      let autorPartido: string | undefined;
      let autorUf: string | undefined;
      let autorFotoUrl: string | undefined;
      let situacao = 'Em tramitação';
      let orgao = 'Câmara dos Deputados';
      let urlInteiroTeor: string | undefined;

      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 3500));
        const fetchDetalhe = Promise.all([
          fetch(p.uri, { headers: { Accept: 'application/json' } }).then((r) => r.json()),
          fetch(`${p.uri}/autores`, { headers: { Accept: 'application/json' } }).then((r) => r.json()).catch(() => null),
        ]);

        const [det, aut]: any = await Promise.race([fetchDetalhe, timeoutPromise]);

        if (det?.dados) {
          const st = det.dados.statusProposicao;
          if (st) {
            situacao = st.descricaoSituacao || st.descricaoTramitacao || situacao;
            orgao = st.siglaOrgao || orgao;
          }
          urlInteiroTeor = det.dados.urlInteiroTeor;
        }

        if (aut?.dados && aut.dados.length > 0) {
          const primeiroAutor = aut.dados[0];
          autorNome = primeiroAutor.nome ? `Dep. ${primeiroAutor.nome}` : autorNome;
          if (primeiroAutor.uri) {
            // Extrai ID do deputado para buscar foto e partido
            const parts = primeiroAutor.uri.split('/');
            const depId = parts[parts.length - 1];
            if (depId && !isNaN(Number(depId))) {
              autorFotoUrl = `https://www.camara.leg.br/internet/deputado/bandep/${depId}.jpg`;
            }
          }
        }
      } catch {
        // Fallback silencioso mantendo o projeto na lista
      }

      return {
        id: `camara-${p.id}`,
        idOriginal: p.id,
        casa: 'camara',
        siglaTipo: p.siglaTipo || 'PL',
        numero: p.numero,
        ano: p.ano,
        codigoIdentificacao: `${p.siglaTipo} ${p.numero}/${p.ano}`,
        ementa: p.ementa || 'Sem ementa disponível.',
        dataApresentacao: p.dataApresentacao,
        dataUltimaTramitacao: p.dataApresentacao,
        autorNome,
        autorPartido,
        autorUf,
        autorFotoUrl,
        autorCargo: 'Deputado(a) Federal',
        situacao,
        orgao,
        urlInteiroTeor,
        urlTramitacao: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${p.id}`,
        alteraLegislacao,
        leiAlvo,
      };
    });

    return await Promise.all(promessas);
  } catch (err) {
    console.warn('[RadarTramitacao] Erro ao buscar Câmara:', err);
    return [];
  }
}

/**
 * Busca proposições do Senado Federal (PL, PLP, PEC em tramitação)
 */
async function fetchProposicoesSenado(ano = 2026): Promise<ProposicaoTramitando[]> {
  try {
    const tipos = ['PL', 'PLP', 'PEC'];
    const promessas = tipos.map(async (sigla) => {
      const url = `${SENADO_API}/materia/pesquisa/lista.json?sigla=${sigla}&ano=${ano}&tramitando=S`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return [];
      const json = await res.json();
      return json?.PesquisaBasicaMateria?.Materias?.Materia || [];
    });

    const resultados = await Promise.all(promessas);
    const listaGeral = resultados.flat();

    // Inverte para os mais recentes ficarem no início
    const ordenados = [...listaGeral].reverse().slice(0, 30);

    return ordenados.map((m: any) => {
      const { alteraLegislacao, leiAlvo } = extrairLeiAlterada(m.Ementa || '');
      const autorOriginal = m.Autor || 'Senador(a)';
      // Ex: "Senador Randolfe Rodrigues (PT/AP)"
      let autorNome = autorOriginal;
      let autorPartido: string | undefined;
      let autorUf: string | undefined;

      const matchPartido = autorOriginal.match(/\(([^/]+)\/([^)]+)\)/);
      if (matchPartido) {
        autorPartido = matchPartido[1].trim();
        autorUf = matchPartido[2].trim();
      }

      return {
        id: `senado-${m.Codigo}`,
        idOriginal: m.Codigo,
        casa: 'senado',
        siglaTipo: m.Sigla || 'PL',
        numero: String(parseInt(m.Numero || '0', 10)),
        ano: m.Ano || ano,
        codigoIdentificacao: m.DescricaoIdentificacao || `${m.Sigla} ${m.Numero}/${m.Ano}`,
        ementa: m.Ementa || 'Sem ementa disponível.',
        dataApresentacao: m.Data,
        dataUltimaTramitacao: m.Data,
        autorNome,
        autorPartido,
        autorUf,
        autorCargo: 'Senador(a) Federal',
        situacao: 'Em tramitação no Senado',
        orgao: 'Senado Federal',
        urlInteiroTeor: `https://legis.senado.leg.br/dadosabertos/materia/textos/${m.Codigo}`,
        urlTramitacao: `https://www25.senado.leg.br/web/atividade/materias/-/materia/${m.Codigo}`,
        alteraLegislacao,
        leiAlvo,
      };
    });
  } catch (err) {
    console.warn('[RadarTramitacao] Erro ao buscar Senado:', err);
    return [];
  }
}

/**
 * Carrega a lista completa de matérias em tramitação das duas casas
 */
export async function getProposicoesEmTramitacao(forcarAtualizacao = false): Promise<ProposicaoTramitando[]> {
  // 1. Tentar cache em memória
  if (!forcarAtualizacao && memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.itens;
  }

  // 2. Tentar sessionStorage
  if (!forcarAtualizacao && typeof window !== 'undefined') {
    try {
      const gravado = sessionStorage.getItem(CACHE_KEY);
      if (gravado) {
        const parsed: CachePayload = JSON.parse(gravado);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.itens.length > 0) {
          memoryCache = parsed;
          return parsed.itens;
        }
      }
    } catch {
      // Ignora erro de storage
    }
  }

  // 3. Buscar dados de ambas as fontes
  const [camara, senado] = await Promise.all([
    fetchProposicoesCamara(25),
    fetchProposicoesSenado(2026),
  ]);

  // Se o Senado em 2026 tiver poucos itens, pode complementar com ano anterior se necessário
  let senadoFinal = senado;
  if (senadoFinal.length < 5) {
    const senadoAnterior = await fetchProposicoesSenado(2025);
    senadoFinal = [...senadoFinal, ...senadoAnterior.slice(0, 15)];
  }

  // Combina e intercala/ordena
  const combinadas = [...camara, ...senadoFinal].sort((a, b) => {
    const dataA = a.dataUltimaTramitacao || a.dataApresentacao || '';
    const dataB = b.dataUltimaTramitacao || b.dataApresentacao || '';
    return dataB.localeCompare(dataA);
  });

  // Salvar em cache
  const payload: CachePayload = {
    timestamp: Date.now(),
    itens: combinadas,
  };
  memoryCache = payload;

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      // Quota de storage cheia
    }
  }

  return combinadas;
}

/**
 * Busca histórico detalhado de tramitação de um projeto
 */
export async function fetchHistoricoTramitacao(p: ProposicaoTramitando): Promise<TramitacaoPasso[]> {
  try {
    if (p.casa === 'camara') {
      const url = `${CAMARA_API}/proposicoes/${p.idOriginal}/tramitacoes`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return [];
      const json = await res.json();
      const dados = json?.dados || [];
      return dados.map((t: any) => ({
        dataHora: t.dataHora,
        sequencia: t.sequencia,
        siglaOrgao: t.siglaOrgao,
        descricao: t.descricaoTramitacao,
        despacho: t.despacho,
      })).reverse();
    } else {
      // Senado
      const url = `${SENADO_API}/materia/movimentacoes/${p.idOriginal}.json`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return [];
      const json = await res.json();
      const movs = json?.MovimentacaoMateria?.Materia?.Movimentacoes?.Movimentacao || [];
      const lista = Array.isArray(movs) ? movs : [movs];
      return lista.map((m: any) => ({
        dataHora: m.DataMovimentacao || m.DataHora,
        siglaOrgao: m.Local || m.SiglaLocal,
        descricao: m.DescricaoMovimentacao || m.TextoMovimentacao || 'Movimentação legislativa',
        despacho: m.Despacho,
      })).reverse();
    }
  } catch (err) {
    console.warn('[RadarTramitacao] Erro ao buscar histórico:', err);
    return [];
  }
}

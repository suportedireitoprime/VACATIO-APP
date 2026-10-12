export type EsferaLegis = 'FEDERAL' | 'ESTADUAL' | 'MUNICIPAL' | 'INTERNACIONAL';

export interface FonteLegislacao {
  id: string;
  nome: string;
  sigla: string;
  esfera: EsferaLegis;
  subesfera?: string; // Ex: 'Planalto', 'Congresso', 'SP', 'RJ', 'Capital SP', 'União Europeia'
  categoria: 'Diário Oficial' | 'Legislação Compilada' | 'Parlamento / Assembleia' | 'Tribunal / Jurisprudência' | 'Tratados Internacionais';
  url: string;
  urlBusca?: string;
  descricao: string;
  orgaoResponsavel: string;
  status: 'operacional' | 'em_monitoramento' | 'manutencao';
  frequenciaAtualizacao: 'Diária' | 'Em tempo real' | 'Semanal' | 'Mensal';
  totalAtosEstimados?: number;
  tipoFormatos: Array<'HTML' | 'PDF' | 'JSON / API' | 'XML'>;
  permiteBuscaTexto: boolean;
}

export const FONTES_LEGISLACAO: FonteLegislacao[] = [
  // ─── ESFERA FEDERAL ───
  {
    id: 'fed-planalto',
    nome: 'Portal da Legislação do Planalto',
    sigla: 'Planalto',
    esfera: 'FEDERAL',
    subesfera: 'Presidência da República',
    categoria: 'Legislação Compilada',
    url: 'https://www.planalto.gov.br/legislacao',
    urlBusca: 'https://www.planalto.gov.br/legislacao/pesquisa.html',
    descricao: 'Fonte oficial e canônica para Constituição Federal, Códigos, Leis Ordinárias, Decretos-Leis, Medidas Provisórias e Decretos Federais.',
    orgaoResponsavel: 'Secretaria-Geral da Presidência da República / Subchefia para Assuntos Jurídicos (SAJ)',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 198000,
    tipoFormatos: ['HTML'],
    permiteBuscaTexto: true,
  },
  {
    id: 'fed-in-dou',
    nome: 'Diário Oficial da União (DOU)',
    sigla: 'DOU',
    esfera: 'FEDERAL',
    subesfera: 'Imprensa Nacional',
    categoria: 'Diário Oficial',
    url: 'https://www.in.gov.br',
    urlBusca: 'https://www.in.gov.br/consulta',
    descricao: 'Publicação oficial de leis sancionadas, decretos presidenciais, portarias normativas ministeriais e instruções normativas (Seção 1).',
    orgaoResponsavel: 'Imprensa Nacional / Casa Civil da Presidência da República',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 8500000,
    tipoFormatos: ['HTML', 'PDF', 'JSON / API'],
    permiteBuscaTexto: true,
  },
  {
    id: 'fed-senado-lexml',
    nome: 'Rede de Informação Legislativa e Jurídica',
    sigla: 'LexML',
    esfera: 'FEDERAL',
    subesfera: 'Senado Federal',
    categoria: 'Legislação Compilada',
    url: 'https://www.lexml.gov.br',
    urlBusca: 'https://www.lexml.gov.br/busca',
    descricao: 'Portal unificado e federado de legislação e jurisprudência dos poderes Executivo, Legislativo e Judiciário em âmbito federal e estadual.',
    orgaoResponsavel: 'Senado Federal / Comunidade LexML Brasil',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 4200000,
    tipoFormatos: ['HTML', 'XML', 'PDF'],
    permiteBuscaTexto: true,
  },
  {
    id: 'fed-camara-deputados',
    nome: 'Legislação da Câmara dos Deputados',
    sigla: 'CDeputados',
    esfera: 'FEDERAL',
    subesfera: 'Câmara dos Deputados',
    categoria: 'Parlamento / Assembleia',
    url: 'https://www2.camara.leg.br/atividade-legislativa/legislacao',
    urlBusca: 'https://www.camara.leg.br/busca-portal',
    descricao: 'Acervo de Projetos de Lei (PLs), Emendas Constitucionais (PECs), Decretos Legislativos e tramitação em plenário.',
    orgaoResponsavel: 'Câmara dos Deputados',
    status: 'operacional',
    frequenciaAtualizacao: 'Em tempo real',
    totalAtosEstimados: 310000,
    tipoFormatos: ['HTML', 'JSON / API', 'PDF'],
    permiteBuscaTexto: true,
  },
  {
    id: 'fed-stf-sumulas',
    nome: 'Portal de Jurisprudência e Súmulas Vinculantes do STF',
    sigla: 'STF Legis',
    esfera: 'FEDERAL',
    subesfera: 'Supremo Tribunal Federal',
    categoria: 'Tribunal / Jurisprudência',
    url: 'https://portal.stf.jus.br/jurisprudencia/sumulas.asp',
    urlBusca: 'https://jurisprudencia.stf.jus.br',
    descricao: 'Súmulas Vinculantes com efeito erga omnes, Súmulas Tradicionais e teses de Repercussão Geral.',
    orgaoResponsavel: 'Supremo Tribunal Federal',
    status: 'operacional',
    frequenciaAtualizacao: 'Em tempo real',
    totalAtosEstimados: 1250,
    tipoFormatos: ['HTML', 'JSON / API'],
    permiteBuscaTexto: true,
  },
  {
    id: 'fed-cfoab-normas',
    nome: 'Conselho Federal da OAB — Repositório Normativo',
    sigla: 'CFOAB',
    esfera: 'FEDERAL',
    subesfera: 'Ordem dos Advogados do Brasil',
    categoria: 'Legislação Compilada',
    url: 'https://www.oab.org.br/legislacao',
    urlBusca: 'https://www.oab.org.br/leis-normas',
    descricao: 'Regulamento Geral da OAB, Código de Ética e Disciplina (CED), Provimentos e Resoluções Normativas do CFOAB.',
    orgaoResponsavel: 'Conselho Federal da OAB',
    status: 'operacional',
    frequenciaAtualizacao: 'Semanal',
    totalAtosEstimados: 1450,
    tipoFormatos: ['HTML', 'PDF'],
    permiteBuscaTexto: true,
  },

  // ─── ESFERA ESTADUAL (27 UFs) ───
  {
    id: 'est-sp-alesp',
    nome: 'Assembleia Legislativa do Estado de São Paulo',
    sigla: 'ALESP',
    esfera: 'ESTADUAL',
    subesfera: 'SP',
    categoria: 'Parlamento / Assembleia',
    url: 'https://www.al.sp.gov.br/legislacao',
    urlBusca: 'https://www.al.sp.gov.br/norma/pesquisa',
    descricao: 'Constituição Estadual de SP, Leis Ordinárias Paulistas, Decretos Estaduais e Resoluções da ALESP.',
    orgaoResponsavel: 'Assembleia Legislativa de São Paulo',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 78000,
    tipoFormatos: ['HTML', 'PDF'],
    permiteBuscaTexto: true,
  },
  {
    id: 'est-rj-alerj',
    nome: 'Assembleia Legislativa do Estado do Rio de Janeiro',
    sigla: 'ALERJ',
    esfera: 'ESTADUAL',
    subesfera: 'RJ',
    categoria: 'Parlamento / Assembleia',
    url: 'http://alfrj.rj.gov.br',
    urlBusca: 'http://alerjln1.alerj.rj.gov.br/scpro.nsf',
    descricao: 'Legislação Fluminense, Constituição Estadual do Rio de Janeiro e Leis Complementares.',
    orgaoResponsavel: 'Assembleia Legislativa do Rio de Janeiro',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 52000,
    tipoFormatos: ['HTML'],
    permiteBuscaTexto: true,
  },
  {
    id: 'est-mg-almg',
    nome: 'Assembleia Legislativa de Minas Gerais',
    sigla: 'ALMG',
    esfera: 'ESTADUAL',
    subesfera: 'MG',
    categoria: 'Parlamento / Assembleia',
    url: 'https://www.almg.gov.br/legislacao',
    urlBusca: 'https://www.almg.gov.br/legislacao/pesquisa',
    descricao: 'Base normativa completa do Estado de Minas Gerais: Leis Delegadas, Leis Ordinárias e Decretos.',
    orgaoResponsavel: 'Assembleia Legislativa de Minas Gerais',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 69000,
    tipoFormatos: ['HTML', 'PDF', 'JSON / API'],
    permiteBuscaTexto: true,
  },
  {
    id: 'est-rs-alrs',
    nome: 'Assembleia Legislativa do Rio Grande do Sul',
    sigla: 'ALRS',
    esfera: 'ESTADUAL',
    subesfera: 'RS',
    categoria: 'Parlamento / Assembleia',
    url: 'http://www.al.rs.gov.br/legislativo',
    urlBusca: 'http://www.al.rs.gov.br/legislativo/PesquisaAvancada.aspx',
    descricao: 'Legislação Estadual Gaúcha: Constituição Estadual do RS, Decretos e Leis Ordinárias.',
    orgaoResponsavel: 'Assembleia Legislativa do Rio Grande do Sul',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 44000,
    tipoFormatos: ['HTML', 'PDF'],
    permiteBuscaTexto: true,
  },
  {
    id: 'est-pr-legis',
    nome: 'Sistema Estadual de Legislação do Paraná',
    sigla: 'LegisPR',
    esfera: 'ESTADUAL',
    subesfera: 'PR',
    categoria: 'Legislação Compilada',
    url: 'https://www.legislacao.pr.gov.br',
    urlBusca: 'https://www.legislacao.pr.gov.br/legislacao/pesquisaAtoNormativo.do',
    descricao: 'Portal unificado de atos normativos estaduais do Poder Executivo e Legislativo do Paraná.',
    orgaoResponsavel: 'Casa Civil do Estado do Paraná',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 39000,
    tipoFormatos: ['HTML', 'PDF'],
    permiteBuscaTexto: true,
  },
  {
    id: 'est-ba-legislabahia',
    nome: 'Portal Legisla Bahia',
    sigla: 'LegislaBA',
    esfera: 'ESTADUAL',
    subesfera: 'BA',
    categoria: 'Legislação Compilada',
    url: 'https://legislabahia.ba.gov.br',
    urlBusca: 'https://legislabahia.ba.gov.br/pesquisa',
    descricao: 'Legislação consolidada da Bahia, Decretos Estaduais e Atos da Mesa Diretora.',
    orgaoResponsavel: 'Governo do Estado da Bahia',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 34000,
    tipoFormatos: ['HTML'],
    permiteBuscaTexto: true,
  },
  {
    id: 'est-sc-alesc',
    nome: 'Portal Leis ALESC — Santa Catarina',
    sigla: 'ALESC',
    esfera: 'ESTADUAL',
    subesfera: 'SC',
    categoria: 'Parlamento / Assembleia',
    url: 'http://leis.alesc.sc.gov.br',
    urlBusca: 'http://leis.alesc.sc.gov.br/consulta',
    descricao: 'Base de dados consolidada das leis estaduais de Santa Catarina.',
    orgaoResponsavel: 'Assembleia Legislativa de Santa Catarina',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 29000,
    tipoFormatos: ['HTML', 'PDF'],
    permiteBuscaTexto: true,
  },
  {
    id: 'est-df-sinj',
    nome: 'Sistema Integrado de Normas Jurídicas do DF',
    sigla: 'SINJ-DF',
    esfera: 'ESTADUAL',
    subesfera: 'DF',
    categoria: 'Legislação Compilada',
    url: 'http://www.sinj.df.gov.br',
    urlBusca: 'http://www.sinj.df.gov.br/sinj/PesquisaAvancada.aspx',
    descricao: 'Lei Orgânica do Distrito Federal, Leis Distritais, Decretos do GDF e Portarias Normativas.',
    orgaoResponsavel: 'Casa Civil do Distrito Federal',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 36000,
    tipoFormatos: ['HTML', 'PDF'],
    permiteBuscaTexto: true,
  },
  {
    id: 'est-go-casacivil',
    nome: 'Legisla Goiás — Casa Civil',
    sigla: 'LegislaGO',
    esfera: 'ESTADUAL',
    subesfera: 'GO',
    categoria: 'Legislação Compilada',
    url: 'https://legisla.casacivil.go.gov.br',
    urlBusca: 'https://legisla.casacivil.go.gov.br/pesquisa_legislacao',
    descricao: 'Legislação completa do Estado de Goiás com compilação e histórico de redações.',
    orgaoResponsavel: 'Casa Civil do Estado de Goiás',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 28000,
    tipoFormatos: ['HTML', 'PDF'],
    permiteBuscaTexto: true,
  },
  {
    id: 'est-ce-belt',
    nome: 'BELT — Base Estadual de Leis e Textos do Ceará',
    sigla: 'BELT-CE',
    esfera: 'ESTADUAL',
    subesfera: 'CE',
    categoria: 'Parlamento / Assembleia',
    url: 'https://belt.al.ce.gov.br',
    urlBusca: 'https://belt.al.ce.gov.br/index.php/legislacao-do-ceara',
    descricao: 'Acervo legislativo do Estado do Ceará gerido pela Assembleia Legislativa Cearense.',
    orgaoResponsavel: 'Assembleia Legislativa do Estado do Ceará',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 25000,
    tipoFormatos: ['HTML'],
    permiteBuscaTexto: true,
  },

  // ─── ESFERA MUNICIPAL (Capitais & Cidades) ───
  {
    id: 'mun-sp-saopaulo',
    nome: 'Portal Legislação Paulistana — Capital SP',
    sigla: 'LegislaSP Capital',
    esfera: 'MUNICIPAL',
    subesfera: 'São Paulo (SP)',
    categoria: 'Legislação Compilada',
    url: 'https://legislacao.prefeitura.sp.gov.br',
    urlBusca: 'https://legislacao.prefeitura.sp.gov.br/pesquisa',
    descricao: 'Lei Orgânica do Município de São Paulo, Plano Diretor Estratégico (PDE), Leis Municipais e Decretos.',
    orgaoResponsavel: 'Prefeitura do Município de São Paulo / Casa Civil',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 54000,
    tipoFormatos: ['HTML', 'PDF'],
    permiteBuscaTexto: true,
  },
  {
    id: 'mun-rj-riodejaneiro',
    nome: 'Câmara Municipal do Rio de Janeiro',
    sigla: 'CMRJ',
    esfera: 'MUNICIPAL',
    subesfera: 'Rio de Janeiro (RJ)',
    categoria: 'Parlamento / Assembleia',
    url: 'https://www.camara.rio/legislacao',
    urlBusca: 'https://mail.camara.rj.gov.br/APL/Legislativos/contlei.nsf',
    descricao: 'Lei Orgânica Carioca, Plano Diretor, Leis Ordinárias Municipais e Decretos Legislativos.',
    orgaoResponsavel: 'Câmara Municipal do Rio de Janeiro',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 31000,
    tipoFormatos: ['HTML'],
    permiteBuscaTexto: true,
  },
  {
    id: 'mun-mg-belohorizonte',
    nome: 'Câmara Municipal de Belo Horizonte',
    sigla: 'CMBH',
    esfera: 'MUNICIPAL',
    subesfera: 'Belo Horizonte (MG)',
    categoria: 'Parlamento / Assembleia',
    url: 'https://www.cmbh.mg.gov.br/atividade-legislativa/pesquisar-legislacao',
    urlBusca: 'https://www.cmbh.mg.gov.br/pesquisa-normas',
    descricao: 'Lei Orgânica de BH, Código de Posturas, Plano Diretor e Decretos da Capital Mineira.',
    orgaoResponsavel: 'Câmara Municipal de Belo Horizonte',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 23000,
    tipoFormatos: ['HTML', 'PDF'],
    permiteBuscaTexto: true,
  },
  {
    id: 'mun-pr-curitiba',
    nome: 'Leis Municipais de Curitiba',
    sigla: 'CMC Curitiba',
    esfera: 'MUNICIPAL',
    subesfera: 'Curitiba (PR)',
    categoria: 'Parlamento / Assembleia',
    url: 'https://www.curitiba.pr.leg.br/atividade-parlamentar/legislacao',
    urlBusca: 'https://leismunicipais.com.br/legislacao-curitiba-pr',
    descricao: 'Normas urbanísticas, Lei Orgânica de Curitiba e Código Tributário Municipal.',
    orgaoResponsavel: 'Câmara Municipal de Curitiba',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 19500,
    tipoFormatos: ['HTML', 'PDF'],
    permiteBuscaTexto: true,
  },
  {
    id: 'mun-rs-portoalegre',
    nome: 'Câmara Municipal de Porto Alegre',
    sigla: 'CMPA',
    esfera: 'MUNICIPAL',
    subesfera: 'Porto Alegre (RS)',
    categoria: 'Parlamento / Assembleia',
    url: 'https://www.camarapoa.rs.gov.br/legislacao',
    urlBusca: 'https://www.camarapoa.rs.gov.br/processo-legislativo',
    descricao: 'Lei Orgânica de Porto Alegre e Legislação Municipal compilada.',
    orgaoResponsavel: 'Câmara Municipal de Porto Alegre',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 18000,
    tipoFormatos: ['HTML', 'PDF'],
    permiteBuscaTexto: true,
  },
  {
    id: 'mun-ba-salvador',
    nome: 'Legislação Municipal de Salvador',
    sigla: 'CMS Salvador',
    esfera: 'MUNICIPAL',
    subesfera: 'Salvador (BA)',
    categoria: 'Parlamento / Assembleia',
    url: 'https://www.cms.ba.gov.br/legislacao',
    urlBusca: 'https://www.cms.ba.gov.br/pesquisa-normas',
    descricao: 'Lei Orgânica de Salvador, PDDU (Plano de Desenvolvimento Urbano) e Decretos do Executivo.',
    orgaoResponsavel: 'Câmara Municipal de Salvador',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 16500,
    tipoFormatos: ['HTML'],
    permiteBuscaTexto: true,
  },
  {
    id: 'mun-leismunicipais-hub',
    nome: 'Portal LeisMunicipais.com.br (Indexador Nacional)',
    sigla: 'LeisMunicipais',
    esfera: 'MUNICIPAL',
    subesfera: '5.570 Municípios',
    categoria: 'Diário Oficial',
    url: 'https://leismunicipais.com.br',
    urlBusca: 'https://leismunicipais.com.br/busca',
    descricao: 'Maior repositório e indexador unificado de legislação municipal do Brasil com mais de 3.500 municípios conectados.',
    orgaoResponsavel: 'Rede LeisMunicipais / Diários Oficiais das Cidades',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 3800000,
    tipoFormatos: ['HTML', 'PDF'],
    permiteBuscaTexto: true,
  },

  // ─── ESFERA INTERNACIONAL ───
  {
    id: 'int-ue-eurlex',
    nome: 'EUR-Lex — Legislação da União Europeia',
    sigla: 'EUR-Lex',
    esfera: 'INTERNACIONAL',
    subesfera: 'União Europeia',
    categoria: 'Tratados Internacionais',
    url: 'https://eur-lex.europa.eu',
    urlBusca: 'https://eur-lex.europa.eu/search.html',
    descricao: 'Tratados da UE, Regulamentos, Diretivas Comunitárias (ex: GDPR) e Acordos Internacionais em português.',
    orgaoResponsavel: 'Serviço das Publicações da União Europeia',
    status: 'operacional',
    frequenciaAtualizacao: 'Diária',
    totalAtosEstimados: 980000,
    tipoFormatos: ['HTML', 'PDF', 'XML'],
    permiteBuscaTexto: true,
  },
  {
    id: 'int-imo-maritimo',
    nome: 'IMO — Organização Marítima Internacional',
    sigla: 'IMO Docs',
    esfera: 'INTERNACIONAL',
    subesfera: 'Nações Unidas (ONU)',
    categoria: 'Tratados Internacionais',
    url: 'https://www.imo.org',
    urlBusca: 'https://docs.imo.org',
    descricao: 'Convenções internacionais marítimas (SOLAS, MARPOL, STCW) ratificadas pelo Brasil.',
    orgaoResponsavel: 'International Maritime Organization (UN Agency)',
    status: 'operacional',
    frequenciaAtualizacao: 'Semanal',
    totalAtosEstimados: 8500,
    tipoFormatos: ['HTML', 'PDF'],
    permiteBuscaTexto: true,
  },
  {
    id: 'int-onu-tratados',
    nome: 'Coleção de Tratados das Nações Unidas',
    sigla: 'UN Treaties',
    esfera: 'INTERNACIONAL',
    subesfera: 'Organização das Nações Unidas',
    categoria: 'Tratados Internacionais',
    url: 'https://treaties.un.org',
    urlBusca: 'https://treaties.un.org/pages/ParticipationStatus.aspx',
    descricao: 'Pactos e tratados de Direitos Humanos, Direito Internacional e Convenções de Viena e Genebra.',
    orgaoResponsavel: 'United Nations Treaty Collection',
    status: 'operacional',
    frequenciaAtualizacao: 'Semanal',
    totalAtosEstimados: 65000,
    tipoFormatos: ['HTML', 'PDF'],
    permiteBuscaTexto: true,
  },
  {
    id: 'int-corte-idh',
    nome: 'Corte Interamericana de Direitos Humanos',
    sigla: 'Corte IDH',
    esfera: 'INTERNACIONAL',
    subesfera: 'Sistema OEA',
    categoria: 'Tribunal / Jurisprudência',
    url: 'https://www.corteidh.or.cr',
    urlBusca: 'https://www.corteidh.or.cr/jurisprudencia.cfm',
    descricao: 'Convenção Americana sobre Direitos Humanos (Pacto de San José da Costa Rica) e sentenças condenatórias vinculantes.',
    orgaoResponsavel: 'Organização dos Estados Americanos (OEA)',
    status: 'operacional',
    frequenciaAtualizacao: 'Semanal',
    totalAtosEstimados: 2400,
    tipoFormatos: ['HTML', 'PDF'],
    permiteBuscaTexto: true,
  },
];

// ─── ESTATÍSTICAS E HELPERS ───

export interface EstatisticasFontes {
  totalFontes: number;
  totalAtosEstimados: number;
  totalFederal: number;
  totalEstadual: number;
  totalMunicipal: number;
  totalInternacional: number;
  operacionais: number;
}

export function getEstatisticasFontes(): EstatisticasFontes {
  const totalFontes = FONTES_LEGISLACAO.length;
  const totalAtosEstimados = FONTES_LEGISLACAO.reduce((acc, f) => acc + (f.totalAtosEstimados || 0), 0);
  const totalFederal = FONTES_LEGISLACAO.filter(f => f.esfera === 'FEDERAL').length;
  const totalEstadual = FONTES_LEGISLACAO.filter(f => f.esfera === 'ESTADUAL').length;
  const totalMunicipal = FONTES_LEGISLACAO.filter(f => f.esfera === 'MUNICIPAL').length;
  const totalInternacional = FONTES_LEGISLACAO.filter(f => f.esfera === 'INTERNACIONAL').length;
  const operacionais = FONTES_LEGISLACAO.filter(f => f.status === 'operacional').length;

  return {
    totalFontes,
    totalAtosEstimados,
    totalFederal,
    totalEstadual,
    totalMunicipal,
    totalInternacional,
    operacionais,
  };
}

export function obterEsferasComContador(): { esfera: EsferaLegis; total: number }[] {
  return [
    { esfera: 'FEDERAL', total: FONTES_LEGISLACAO.filter(f => f.esfera === 'FEDERAL').length },
    { esfera: 'ESTADUAL', total: FONTES_LEGISLACAO.filter(f => f.esfera === 'ESTADUAL').length },
    { esfera: 'MUNICIPAL', total: FONTES_LEGISLACAO.filter(f => f.esfera === 'MUNICIPAL').length },
    { esfera: 'INTERNACIONAL', total: FONTES_LEGISLACAO.filter(f => f.esfera === 'INTERNACIONAL').length },
  ];
}

export function filtrarFontes(esfera: EsferaLegis | 'TODAS', termo: string, uf?: string): FonteLegislacao[] {
  let resultado = FONTES_LEGISLACAO;

  if (esfera !== 'TODAS') {
    resultado = resultado.filter(f => f.esfera === esfera);
  }

  if (uf && uf !== 'TODOS') {
    resultado = resultado.filter(f => 
      f.subesfera?.toLowerCase().includes(uf.toLowerCase()) ||
      f.sigla.toLowerCase().includes(uf.toLowerCase()) ||
      f.nome.toLowerCase().includes(uf.toLowerCase())
    );
  }

  if (termo && termo.trim()) {
    const q = termo.toLowerCase().trim();
    resultado = resultado.filter(f =>
      f.nome.toLowerCase().includes(q) ||
      f.sigla.toLowerCase().includes(q) ||
      f.descricao.toLowerCase().includes(q) ||
      f.orgaoResponsavel.toLowerCase().includes(q) ||
      (f.subesfera && f.subesfera.toLowerCase().includes(q))
    );
  }

  return resultado;
}

// ─── MAPEAMENTO FEDERATIVO DOS 27 ESTADOS (UFs) ───

export interface EstadoBrasilInfo {
  uf: string;
  nome: string;
  regiao: 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';
  capital: string;
  totalMunicipios: number;
  totalAtosEstimados: number;
  assembleia: string;
  urlAssembleia: string;
  urlDiario?: string;
  status: 'operacional' | 'em_monitoramento';
  // Posição no grid cartográfico interativo
  gridPos: { col: number; row: number };
}

export const ESTADOS_BRASIL: EstadoBrasilInfo[] = [
  // Região Norte
  { uf: 'RR', nome: 'Roraima', regiao: 'Norte', capital: 'Boa Vista', totalMunicipios: 15, totalAtosEstimados: 48000, assembleia: 'ALE-RR', urlAssembleia: 'https://al.rr.leg.br', status: 'em_monitoramento', gridPos: { col: 3, row: 1 } },
  { uf: 'AP', nome: 'Amapá', regiao: 'Norte', capital: 'Macapá', totalMunicipios: 16, totalAtosEstimados: 52000, assembleia: 'ALAP', urlAssembleia: 'https://al.ap.leg.br', status: 'em_monitoramento', gridPos: { col: 5, row: 1 } },
  { uf: 'AM', nome: 'Amazonas', regiao: 'Norte', capital: 'Manaus', totalMunicipios: 62, totalAtosEstimados: 135000, assembleia: 'ALEAM', urlAssembleia: 'https://aleam.gov.br', status: 'em_monitoramento', gridPos: { col: 2, row: 2 } },
  { uf: 'PA', nome: 'Pará', regiao: 'Norte', capital: 'Belém', totalMunicipios: 144, totalAtosEstimados: 210000, assembleia: 'ALEPA', urlAssembleia: 'https://alepa.pa.gov.br', status: 'em_monitoramento', gridPos: { col: 4, row: 2 } },
  { uf: 'AC', nome: 'Acre', regiao: 'Norte', capital: 'Rio Branco', totalMunicipios: 22, totalAtosEstimados: 42000, assembleia: 'ALEAC', urlAssembleia: 'https://al.ac.leg.br', status: 'em_monitoramento', gridPos: { col: 1, row: 3 } },
  { uf: 'RO', nome: 'Rondônia', regiao: 'Norte', capital: 'Porto Velho', totalMunicipios: 52, totalAtosEstimados: 89000, assembleia: 'ALE-RO', urlAssembleia: 'https://al.ro.leg.br', status: 'em_monitoramento', gridPos: { col: 2, row: 3 } },
  { uf: 'TO', nome: 'Tocantins', regiao: 'Norte', capital: 'Palmas', totalMunicipios: 139, totalAtosEstimados: 115000, assembleia: 'AL-TO', urlAssembleia: 'https://al.to.leg.br', status: 'em_monitoramento', gridPos: { col: 4, row: 3 } },

  // Região Nordeste
  { uf: 'MA', nome: 'Maranhão', regiao: 'Nordeste', capital: 'São Luís', totalMunicipios: 217, totalAtosEstimados: 198000, assembleia: 'ALEMA', urlAssembleia: 'https://al.ma.leg.br', status: 'em_monitoramento', gridPos: { col: 5, row: 2 } },
  { uf: 'PI', nome: 'Piauí', regiao: 'Nordeste', capital: 'Teresina', totalMunicipios: 224, totalAtosEstimados: 185000, assembleia: 'ALEPI', urlAssembleia: 'https://alepi.pi.gov.br', status: 'em_monitoramento', gridPos: { col: 6, row: 2 } },
  { uf: 'CE', nome: 'Ceará', regiao: 'Nordeste', capital: 'Fortaleza', totalMunicipios: 184, totalAtosEstimados: 310000, assembleia: 'ALECE', urlAssembleia: 'https://al.ce.leg.br', status: 'operacional', gridPos: { col: 7, row: 2 } },
  { uf: 'RN', nome: 'Rio Grande do Norte', regiao: 'Nordeste', capital: 'Natal', totalMunicipios: 167, totalAtosEstimados: 142000, assembleia: 'ALRN', urlAssembleia: 'https://al.rn.leg.br', status: 'em_monitoramento', gridPos: { col: 8, row: 2 } },
  { uf: 'PB', nome: 'Paraíba', regiao: 'Nordeste', capital: 'João Pessoa', totalMunicipios: 223, totalAtosEstimados: 176000, assembleia: 'ALPB', urlAssembleia: 'https://al.pb.leg.br', status: 'em_monitoramento', gridPos: { col: 8, row: 3 } },
  { uf: 'PE', nome: 'Pernambuco', regiao: 'Nordeste', capital: 'Recife', totalMunicipios: 185, totalAtosEstimados: 290000, assembleia: 'ALEPE', urlAssembleia: 'https://alepe.pe.gov.br', status: 'em_monitoramento', gridPos: { col: 7, row: 3 } },
  { uf: 'AL', nome: 'Alagoas', regiao: 'Nordeste', capital: 'Maceió', totalMunicipios: 102, totalAtosEstimados: 124000, assembleia: 'ALE-AL', urlAssembleia: 'https://al.al.leg.br', status: 'em_monitoramento', gridPos: { col: 8, row: 4 } },
  { uf: 'SE', nome: 'Sergipe', regiao: 'Nordeste', capital: 'Aracaju', totalMunicipios: 75, totalAtosEstimados: 98000, assembleia: 'ALESE', urlAssembleia: 'https://al.se.leg.br', status: 'em_monitoramento', gridPos: { col: 7, row: 4 } },
  { uf: 'BA', nome: 'Bahia', regiao: 'Nordeste', capital: 'Salvador', totalMunicipios: 417, totalAtosEstimados: 540000, assembleia: 'ALBA', urlAssembleia: 'https://al.ba.gov.br', status: 'operacional', gridPos: { col: 6, row: 4 } },

  // Região Centro-Oeste
  { uf: 'MT', nome: 'Mato Grosso', regiao: 'Centro-Oeste', capital: 'Cuiabá', totalMunicipios: 141, totalAtosEstimados: 245000, assembleia: 'ALMT', urlAssembleia: 'https://al.mt.gov.br', status: 'em_monitoramento', gridPos: { col: 3, row: 4 } },
  { uf: 'GO', nome: 'Goiás', regiao: 'Centro-Oeste', capital: 'Goiânia', totalMunicipios: 246, totalAtosEstimados: 320000, assembleia: 'ALEGO', urlAssembleia: 'https://portal.al.go.leg.br', status: 'operacional', gridPos: { col: 4, row: 4 } },
  { uf: 'DF', nome: 'Distrito Federal', regiao: 'Centro-Oeste', capital: 'Brasília', totalMunicipios: 1, totalAtosEstimados: 480000, assembleia: 'CLDF', urlAssembleia: 'https://cl.df.gov.br', status: 'operacional', gridPos: { col: 5, row: 4 } },
  { uf: 'MS', nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste', capital: 'Campo Grande', totalMunicipios: 79, totalAtosEstimados: 168000, assembleia: 'ALEMS', urlAssembleia: 'https://al.ms.leg.br', status: 'em_monitoramento', gridPos: { col: 3, row: 5 } },

  // Região Sudeste
  { uf: 'MG', nome: 'Minas Gerais', regiao: 'Sudeste', capital: 'Belo Horizonte', totalMunicipios: 853, totalAtosEstimados: 920000, assembleia: 'ALMG', urlAssembleia: 'https://almg.gov.br', status: 'operacional', gridPos: { col: 5, row: 5 } },
  { uf: 'ES', nome: 'Espírito Santo', regiao: 'Sudeste', capital: 'Vitória', totalMunicipios: 78, totalAtosEstimados: 195000, assembleia: 'ALES', urlAssembleia: 'https://al.es.leg.br', status: 'em_monitoramento', gridPos: { col: 6, row: 5 } },
  { uf: 'RJ', nome: 'Rio de Janeiro', regiao: 'Sudeste', capital: 'Rio de Janeiro', totalMunicipios: 92, totalAtosEstimados: 850000, assembleia: 'ALERJ', urlAssembleia: 'https://alerj.rj.gov.br', status: 'operacional', gridPos: { col: 6, row: 6 } },
  { uf: 'SP', nome: 'São Paulo', regiao: 'Sudeste', capital: 'São Paulo', totalMunicipios: 645, totalAtosEstimados: 1250000, assembleia: 'ALESP', urlAssembleia: 'https://al.sp.gov.br', status: 'operacional', gridPos: { col: 5, row: 6 } },

  // Região Sul
  { uf: 'PR', nome: 'Paraná', regiao: 'Sul', capital: 'Curitiba', totalMunicipios: 399, totalAtosEstimados: 430000, assembleia: 'ALEP', urlAssembleia: 'https://assembleia.pr.leg.br', status: 'operacional', gridPos: { col: 4, row: 6 } },
  { uf: 'SC', nome: 'Santa Catarina', regiao: 'Sul', capital: 'Florianópolis', totalMunicipios: 295, totalAtosEstimados: 380000, assembleia: 'ALESC', urlAssembleia: 'https://alesc.sc.gov.br', status: 'operacional', gridPos: { col: 4, row: 7 } },
  { uf: 'RS', nome: 'Rio Grande do Sul', regiao: 'Sul', capital: 'Porto Alegre', totalMunicipios: 497, totalAtosEstimados: 610000, assembleia: 'ALRS', urlAssembleia: 'https://al.rs.gov.br', status: 'operacional', gridPos: { col: 3, row: 7 } },
];

// ─── EXPORTAÇÃO DE RELATÓRIOS (CSV / JSON) ───

export function exportarFontesCSV(fontes: FonteLegislacao[] = FONTES_LEGISLACAO) {
  const colunas = [
    'ID',
    'Nome',
    'Sigla',
    'Esfera',
    'Subesfera / UF',
    'Categoria',
    'Órgão Responsável',
    'Status',
    'Frequência de Atualização',
    'Atos Estimados',
    'Formatos',
    'Busca por Texto',
    'URL Oficial',
    'URL de Busca'
  ];

  const escapeCSV = (str: string | undefined | number | boolean) => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const linhas = fontes.map(f => [
    escapeCSV(f.id),
    escapeCSV(f.nome),
    escapeCSV(f.sigla),
    escapeCSV(f.esfera),
    escapeCSV(f.subesfera || ''),
    escapeCSV(f.categoria),
    escapeCSV(f.orgaoResponsavel),
    escapeCSV(f.status),
    escapeCSV(f.frequenciaAtualizacao),
    escapeCSV(f.totalAtosEstimados || 0),
    escapeCSV(f.tipoFormatos.join('; ')),
    escapeCSV(f.permiteBuscaTexto ? 'Sim' : 'Não'),
    escapeCSV(f.url),
    escapeCSV(f.urlBusca || '')
  ].join(','));

  const conteudoCSV = '\uFEFF' + [colunas.join(','), ...linhas].join('\r\n');
  const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `vacatio-fontes-legislacao-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportarFontesJSON(fontes: FonteLegislacao[] = FONTES_LEGISLACAO) {
  const payload = {
    exportadoEm: new Date().toISOString(),
    sistema: 'VACATIO UNOS Legislação',
    versao: '1.0',
    totalFontes: fontes.length,
    fontes,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `vacatio-fontes-legislacao-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}



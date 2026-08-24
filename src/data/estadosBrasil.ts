export interface Estado {
  uf: string;
  nome: string;
  capital: string;
  portalUrl: string;
  regiao: 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';
}

export const ESTADOS: Estado[] = [
  { uf: 'AC', nome: 'Acre', capital: 'Rio Branco', portalUrl: 'http://www.legis.ac.gov.br/', regiao: 'Norte' },
  { uf: 'AL', nome: 'Alagoas', capital: 'Maceió', portalUrl: 'http://www.legislacao.al.gov.br/', regiao: 'Nordeste' },
  { uf: 'AP', nome: 'Amapá', capital: 'Macapá', portalUrl: 'http://www.al.ap.gov.br/legislacao', regiao: 'Norte' },
  { uf: 'AM', nome: 'Amazonas', capital: 'Manaus', portalUrl: 'https://sapl.al.am.leg.br/', regiao: 'Norte' },
  { uf: 'BA', nome: 'Bahia', capital: 'Salvador', portalUrl: 'https://legislabahia.ba.gov.br/', regiao: 'Nordeste' },
  { uf: 'CE', nome: 'Ceará', capital: 'Fortaleza', portalUrl: 'https://belt.al.ce.gov.br/', regiao: 'Nordeste' },
  { uf: 'DF', nome: 'Distrito Federal', capital: 'Brasília', portalUrl: 'http://www.sinj.df.gov.br/', regiao: 'Centro-Oeste' },
  { uf: 'ES', nome: 'Espírito Santo', capital: 'Vitória', portalUrl: 'http://www3.al.es.gov.br/legislacao', regiao: 'Sudeste' },
  { uf: 'GO', nome: 'Goiás', capital: 'Goiânia', portalUrl: 'https://legisla.casacivil.go.gov.br/', regiao: 'Centro-Oeste' },
  { uf: 'MA', nome: 'Maranhão', capital: 'São Luís', portalUrl: 'http://www.stc.ma.gov.br/', regiao: 'Nordeste' },
  { uf: 'MT', nome: 'Mato Grosso', capital: 'Cuiabá', portalUrl: 'https://www.al.mt.gov.br/legislacao', regiao: 'Centro-Oeste' },
  { uf: 'MS', nome: 'Mato Grosso do Sul', capital: 'Campo Grande', portalUrl: 'http://www.al.ms.gov.br/legislacao', regiao: 'Centro-Oeste' },
  { uf: 'MG', nome: 'Minas Gerais', capital: 'Belo Horizonte', portalUrl: 'https://www.almg.gov.br/legislacao/', regiao: 'Sudeste' },
  { uf: 'PA', nome: 'Pará', capital: 'Belém', portalUrl: 'https://www.sistemas.pa.gov.br/sisleis/', regiao: 'Norte' },
  { uf: 'PB', nome: 'Paraíba', capital: 'João Pessoa', portalUrl: 'https://sapl.al.pb.leg.br/', regiao: 'Nordeste' },
  { uf: 'PR', nome: 'Paraná', capital: 'Curitiba', portalUrl: 'https://www.legislacao.pr.gov.br/', regiao: 'Sul' },
  { uf: 'PE', nome: 'Pernambuco', capital: 'Recife', portalUrl: 'https://legis.alepe.pe.gov.br/', regiao: 'Nordeste' },
  { uf: 'PI', nome: 'Piauí', capital: 'Teresina', portalUrl: 'http://www.legislacao.pi.gov.br/', regiao: 'Nordeste' },
  { uf: 'RJ', nome: 'Rio de Janeiro', capital: 'Rio de Janeiro', portalUrl: 'http://alfrj.rj.gov.br/', regiao: 'Sudeste' },
  { uf: 'RN', nome: 'Rio Grande do Norte', capital: 'Natal', portalUrl: 'http://www.al.rn.gov.br/legislacao', regiao: 'Nordeste' },
  { uf: 'RS', nome: 'Rio Grande do Sul', capital: 'Porto Alegre', portalUrl: 'http://www.al.rs.gov.br/legislativo/', regiao: 'Sul' },
  { uf: 'RO', nome: 'Rondônia', capital: 'Porto Velho', portalUrl: 'https://sapl.al.ro.leg.br/', regiao: 'Norte' },
  { uf: 'RR', nome: 'Roraima', capital: 'Boa Vista', portalUrl: 'http://www.al.rr.leg.br/', regiao: 'Norte' },
  { uf: 'SC', nome: 'Santa Catarina', capital: 'Florianópolis', portalUrl: 'http://leis.alesc.sc.gov.br/', regiao: 'Sul' },
  { uf: 'SP', nome: 'São Paulo', capital: 'São Paulo', portalUrl: 'https://www.legislacao.sp.gov.br/legislacao/index.htm', regiao: 'Sudeste' },
  { uf: 'SE', nome: 'Sergipe', capital: 'Aracaju', portalUrl: 'https://al.se.leg.br/legislacao/', regiao: 'Nordeste' },
  { uf: 'TO', nome: 'Tocantins', capital: 'Palmas', portalUrl: 'http://www.al.to.leg.br/legislacao', regiao: 'Norte' },
];

export const TIPOS_ESTADUAIS = [
  { id: 'constituicao_estadual', label: 'Constituição Estadual' },
  { id: 'lei_complementar', label: 'Lei Complementar' },
  { id: 'lei', label: 'Lei Ordinária' },
  { id: 'decreto', label: 'Decreto' },
  { id: 'decreto_lei', label: 'Decreto-Lei' },
] as const;

export type TipoEstadual = typeof TIPOS_ESTADUAIS[number]['id'];

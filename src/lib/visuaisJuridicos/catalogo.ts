import { LEIS_CATALOG } from '@/data/leisCatalog';
import type { VisualCategoria } from './types';

export interface CatalogoItem {
  key: string;
  label: string;
  sub?: string;
  /** Contexto enviado à IA para ancorar o conteúdo na fonte correta. */
  contexto: string;
  /** Somente leis: id e tabela para carregar a lista de artigos. */
  leiId?: string;
  tabela?: string;
}

export const MATERIAS: CatalogoItem[] = [
  ['Direito Penal', 'Crime, pena, tipicidade'],
  ['Direito Civil', 'Contratos, família, sucessões'],
  ['Direito Constitucional', 'CF/88, direitos fundamentais'],
  ['Direito Processual Civil', 'CPC, recursos, sentença'],
  ['Direito Processual Penal', 'CPP, inquérito, prisões'],
  ['Direito Administrativo', 'Atos, licitações, improbidade'],
  ['Direito Tributário', 'Tributos, obrigação, lançamento'],
  ['Direito do Trabalho', 'CLT, contrato de trabalho'],
  ['Direito Empresarial', 'Sociedades, títulos, falência'],
  ['Direito do Consumidor', 'CDC, responsabilidade'],
  ['Direito Previdenciário', 'Benefícios, custeio'],
  ['Direito Ambiental', 'Licenciamento, crimes ambientais'],
  ['Direito Eleitoral', 'Elegibilidade, propaganda'],
  ['Direito Internacional', 'Tratados, migração'],
  ['Ética Profissional (OAB)', 'Estatuto e Código de Ética'],
  ['Teoria Geral do Direito', 'Fontes, norma, interpretação'],
].map(([label, sub]) => ({
  key: `materia:${label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`,
  label,
  sub,
  contexto: `Matéria jurídica brasileira: ${label}. Panorama geral dos institutos centrais da disciplina.`,
}));

export const LEIS: CatalogoItem[] = LEIS_CATALOG.map((l) => ({
  key: `lei:${l.id}`,
  label: l.nome,
  sub: `${l.sigla} — ${l.descricao}`,
  contexto: `${l.nome} (${l.sigla}) — ${l.descricao}. Legislação brasileira vigente.`,
  leiId: l.id,
  tabela: l.tabela_nome,
}));

export const JURISPRUDENCIA: CatalogoItem[] = [
  ['sumulas-vinculantes', 'Súmulas Vinculantes do STF', 'Efeito vinculante para todo o Judiciário'],
  ['sumulas-stf', 'Súmulas do STF', 'Entendimento consolidado do Supremo'],
  ['sumulas-stj', 'Súmulas do STJ', 'Entendimento consolidado do Superior Tribunal de Justiça'],
  ['repercussao-geral', 'Repercussão Geral (STF)', 'Requisitos, efeitos e processamento'],
  ['recursos-repetitivos', 'Recursos Repetitivos (STJ)', 'Tema, afetação e suspensão'],
  ['controle-concentrado', 'Controle Concentrado', 'ADI, ADC, ADO e ADPF'],
  ['habeas-corpus', 'Habeas Corpus na jurisprudência', 'Cabimento e hipóteses firmadas'],
  ['precedentes-obrigatorios', 'Precedentes Obrigatórios', 'Art. 927 do CPC e sua aplicação'],
].map(([key, label, sub]) => ({
  key: `juris:${key}`,
  label,
  sub,
  contexto: `Jurisprudência brasileira: ${label}. ${sub}. Use apenas entendimentos efetivamente consolidados.`,
}));

export function itensDaCategoria(categoria: VisualCategoria): CatalogoItem[] {
  if (categoria === 'materias') return MATERIAS;
  if (categoria === 'leis') return LEIS;
  return JURISPRUDENCIA;
}

export const CATEGORIA_INFO: Record<VisualCategoria, { label: string; desc: string }> = {
  materias: { label: 'Matérias', desc: 'Panorama de uma disciplina jurídica inteira' },
  leis: { label: 'Leis', desc: 'Códigos, estatutos e leis do Vade Mecum — com artigo opcional' },
  jurisprudencia: { label: 'Jurisprudência', desc: 'Súmulas, precedentes e teses dos tribunais' },
};

/**
 * Visuais jurídicos automáticos — contrato de dados.
 *
 * A IA NUNCA decide posição, tamanho ou cor: ela devolve apenas conteúdo
 * estruturado dentro dos limites abaixo. O desenho é feito pelo motor de
 * layout do app (`layout.ts`), que mede o texto real antes de posicionar —
 * é isso que elimina sobreposição e texto fora da caixa.
 */

export type VisualTipo = 'mapa_mental' | 'infografico' | 'fluxograma' | 'diagrama';
export type VisualCategoria = 'materias' | 'leis' | 'jurisprudencia';
export type VisualEstilo = 'limpo' | 'rascunho';

export interface VisualBase {
  titulo: string;
  subtitulo?: string;
  fonte: string;
}

export interface MapaMentalContent extends VisualBase {
  central: string;
  ramos: { titulo: string; itens: string[]; nota?: string }[];
}

export interface InfograficoContent extends VisualBase {
  cards: { titulo: string; texto: string }[];
  rodape?: string;
}

export interface FluxogramaContent extends VisualBase {
  entrada: string;
  decisoes: { pergunta: string; seNao: string; base?: string }[];
  resultado: string;
}

export interface DiagramaContent extends VisualBase {
  raiz: string;
  grupos: { titulo: string; itens: string[]; nota?: string }[];
}

export type VisualContent =
  | ({ tipo: 'mapa_mental' } & MapaMentalContent)
  | ({ tipo: 'infografico' } & InfograficoContent)
  | ({ tipo: 'fluxograma' } & FluxogramaContent)
  | ({ tipo: 'diagrama' } & DiagramaContent);

export interface VisualRecord {
  id: string;
  tipo: VisualTipo;
  categoria: VisualCategoria;
  item_key: string;
  item_label: string;
  titulo: string;
  conteudo: VisualContent;
  fonte: string | null;
  views: number;
  created_at: string;
}

/** Limites calculados para perfeita harmonia visual no canvas do app. */
export const LIMITES = {
  mapa_mental: { titulo: 90, subtitulo: 120, central: 40, ramos: [3, 6], ramoTitulo: 45, itens: [2, 5], item: 100, nota: 100 },
  infografico: { titulo: 90, subtitulo: 120, cards: [3, 6], cardTitulo: 50, cardTexto: 200, rodape: 140 },
  fluxograma: { titulo: 90, subtitulo: 120, entrada: 80, decisoes: [2, 5], pergunta: 90, seNao: 110, base: 50, resultado: 100 },
  diagrama: { titulo: 90, subtitulo: 120, raiz: 50, grupos: [2, 4], grupoTitulo: 45, itens: [2, 5], item: 90, nota: 100 },
} as const;

const clamp = (v: unknown, max: number): string => {
  const s = String(v ?? '').replace(/\s+/g, ' ').replace(/\.{2,}/g, '').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
};

const list = <T,>(v: unknown, [min, max]: readonly [number, number] | number[], map: (x: any) => T): T[] => {
  const arr = Array.isArray(v) ? v.slice(0, max as number).map(map) : [];
  return arr.length >= (min as number) ? arr : arr;
};

/**
 * Normaliza o JSON que veio da IA para o formato exato que o layout espera.
 * Nunca lança: corta, resume e descarta o que estiver fora do contrato.
 */
export function normalizeContent(tipo: VisualTipo, raw: any): VisualContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const L: any = LIMITES[tipo];
  const base = {
    titulo: clamp(raw.titulo, L.titulo),
    subtitulo: raw.subtitulo ? clamp(raw.subtitulo, L.subtitulo) : undefined,
    fonte: clamp(raw.fonte, 90),
  };
  if (!base.titulo) return null;

  if (tipo === 'mapa_mental') {
    const ramos = list(raw.ramos, L.ramos, (r: any) => ({
      titulo: clamp(r?.titulo, L.ramoTitulo),
      itens: list(r?.itens, L.itens, (i: any) => clamp(i, L.item)).filter(Boolean),
      nota: r?.nota ? clamp(r.nota, L.nota) : undefined,
    })).filter((r) => r.titulo && r.itens.length);
    if (ramos.length < 3) return null;
    return { tipo, ...base, central: clamp(raw.central || base.titulo, L.central), ramos };
  }

  if (tipo === 'infografico') {
    const cards = list(raw.cards, L.cards, (c: any) => ({
      titulo: clamp(c?.titulo, L.cardTitulo),
      texto: clamp(c?.texto, L.cardTexto),
    })).filter((c) => c.titulo && c.texto);
    if (cards.length < 3) return null;
    return { tipo, ...base, cards, rodape: raw.rodape ? clamp(raw.rodape, L.rodape) : undefined };
  }

  if (tipo === 'fluxograma') {
    const decisoes = list(raw.decisoes, L.decisoes, (d: any) => ({
      pergunta: clamp(d?.pergunta, L.pergunta),
      seNao: clamp(d?.seNao, L.seNao),
      base: d?.base ? clamp(d.base, L.base) : undefined,
    })).filter((d) => d.pergunta && d.seNao);
    if (decisoes.length < 2) return null;
    return {
      tipo,
      ...base,
      entrada: clamp(raw.entrada, L.entrada) || 'Fato concreto',
      decisoes,
      resultado: clamp(raw.resultado, L.resultado) || 'Consequência jurídica',
    };
  }

  const grupos = list(raw.grupos, L.grupos, (g: any) => ({
    titulo: clamp(g?.titulo, L.grupoTitulo),
    itens: list(g?.itens, L.itens, (i: any) => clamp(i, L.item)).filter(Boolean),
    nota: g?.nota ? clamp(g.nota, L.nota) : undefined,
  })).filter((g) => g.titulo && g.itens.length);
  if (grupos.length < 2) return null;
  return { tipo: 'diagrama', ...base, raiz: clamp(raw.raiz || base.titulo, L.raiz), grupos };

}

export const TIPO_INFO: Record<VisualTipo, { label: string; desc: string; para: string }> = {
  mapa_mental: {
    label: 'Mapa mental',
    desc: 'Visão geral ramificada de um tema, com os pontos-chave em torno do conceito central.',
    para: 'Revisar um capítulo inteiro em poucos minutos.',
  },
  infografico: {
    label: 'Infográfico',
    desc: 'Requisitos, elementos ou classificações em cartões numerados e comentados.',
    para: 'Memorizar requisitos e elementos de um instituto.',
  },
  fluxograma: {
    label: 'Fluxograma',
    desc: 'Passo a passo de decisões (sim/não) até a consequência jurídica.',
    para: 'Aplicar a norma a um caso concreto sem pular etapa.',
  },
  diagrama: {
    label: 'Diagrama',
    desc: 'Hierarquia e relação entre conceitos, do gênero às espécies.',
    para: 'Entender como o instituto se organiza dentro do sistema.',
  },
};

import type { VisualTipo } from './types';

export const SLUG_TIPO: Record<string, VisualTipo> = {
  'mapa-mental': 'mapa_mental',
  infografico: 'infografico',
  fluxograma: 'fluxograma',
  diagrama: 'diagrama',
};

export const TIPO_SLUG: Record<VisualTipo, string> = {
  mapa_mental: 'mapa-mental',
  infografico: 'infografico',
  fluxograma: 'fluxograma',
  diagrama: 'diagrama',
};

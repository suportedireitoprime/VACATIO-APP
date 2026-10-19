import { type AulaAudio } from '@/contexts/AudioaulasPlayerContext';
import { type LousaItem } from './lousaTipos';
import roteiroFilosofia01 from './filosofia-01-comecando.json';

const normalizar = (s: string) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * Verifica se a aula possui roteiro dinâmico de Lousa Mágica disponível.
 */
export const temLousaMagica = (aula: AulaAudio | null | undefined): boolean => {
  if (!aula) return false;
  if (aula.id === 300) return true;
  const titNorm = normalizar(aula.titulo);
  if (titNorm.includes('comecando pelo comeco')) return true;
  return false;
};

/**
 * Retorna os eventos da Lousa Mágica para a aula informada.
 */
export const obterLousaDaAula = (aula: AulaAudio | null | undefined): LousaItem[] | null => {
  if (!aula) return null;
  if (aula.id === 300 || normalizar(aula.titulo).includes('comecando pelo comeco')) {
    return roteiroFilosofia01 as LousaItem[];
  }
  return null;
};

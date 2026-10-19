/**
 * Tipos e interfaces da Lousa Mágica para Audioaulas Dinâmicas.
 */

export interface LousaItem {
  t: number;           // Instante em segundos em que o item é escrito/perguntado
  text: string;        // Texto exibido a giz ou no post-it
  kind: 'titulo' | 'ponto' | 'pergunta';
  items?: string[];    // Subitens enumerados com marcador dourado
}

export interface LousaRoteiro {
  aulaId: number;
  titulo: string;
  materia: string;
  duracaoEstimadaSegundos?: number;
  eventos: LousaItem[];
}

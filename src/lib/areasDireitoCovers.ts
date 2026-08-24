// Capas ilustradas + paleta única por área do direito.
// Cada capa foi gerada com uma paleta dominante distinta; o `tint` abaixo
// espelha essa paleta para tingir o card no `BibliotecaCategoria`.

import { pickAsset } from '@/lib/assetUrl';

import administrativoAsset from '@/assets/biblioteca/areas/direito-administrativo.jpg.asset.json';
import administrativoBundled from '@/assets/biblioteca/areas/direito-administrativo.jpg';
import ambientalBundled from '@/assets/biblioteca/areas/direito-ambiental.png';
import civilBundled from '@/assets/biblioteca/areas/direito-civil.png';
import concorrencialBundled from '@/assets/biblioteca/areas/direito-concorrencial.png';
import constitucionalBundled from '@/assets/biblioteca/areas/direito-constitucional.png';
import desportivoBundled from '@/assets/biblioteca/areas/direito-desportivo.png';
import trabalhoBundled from '@/assets/biblioteca/areas/direito-do-trabalho.png';
import empresarialBundled from '@/assets/biblioteca/areas/direito-empresarial.png';
import financeiroBundled from '@/assets/biblioteca/areas/direito-financeiro.png';
import intPrivadoBundled from '@/assets/biblioteca/areas/direito-internacional-privado.png';
import intPublicoBundled from '@/assets/biblioteca/areas/direito-internacional-publico.png';
import penalAsset from '@/assets/biblioteca/areas/direito-penal.png.asset.json';
import penalBundled from '@/assets/biblioteca/areas/direito-penal.png';
import previdenciarioBundled from '@/assets/biblioteca/areas/direito-previdenciario.png';
import procCivilBundled from '@/assets/biblioteca/areas/direito-processual-civil.png';
import procTrabalhoBundled from '@/assets/biblioteca/areas/direito-processual-do-trabalho.png';
import procPenalBundled from '@/assets/biblioteca/areas/direito-processual-penal.png';
import tributarioBundled from '@/assets/biblioteca/areas/direito-tributario.png';
import urbanisticoBundled from '@/assets/biblioteca/areas/direito-urbanistico.png';
import humanosBundled from '@/assets/biblioteca/areas/direitos-humanos.png';
import formacaoBundled from '@/assets/biblioteca/areas/formacao-complementar.png';
import leiEspecialBundled from '@/assets/biblioteca/areas/lei-penal-especial.png';
import pesquisaBundled from '@/assets/biblioteca/areas/pesquisa-cientifica.png';
import politicasBundled from '@/assets/biblioteca/areas/politicas-publicas.png';
import portuguesBundled from '@/assets/biblioteca/areas/portugues.png';
import praticaBundled from '@/assets/biblioteca/areas/pratica-profissional.png';
import revisaoOabBundled from '@/assets/biblioteca/areas/revisao-oab.png';
import teoriaBundled from '@/assets/biblioteca/areas/teoria-e-filosofia-do-direito.png';

const administrativo = pickAsset(administrativoBundled, administrativoAsset.url);
const ambiental = ambientalBundled;
const civil = civilBundled;
const concorrencial = concorrencialBundled;
const constitucional = constitucionalBundled;
const desportivo = desportivoBundled;
const trabalho = trabalhoBundled;
const empresarial = empresarialBundled;
const financeiro = financeiroBundled;
const intPrivado = intPrivadoBundled;
const intPublico = intPublicoBundled;
const penal = pickAsset(penalBundled, penalAsset.url);
const previdenciario = previdenciarioBundled;
const procCivil = procCivilBundled;
const procTrabalho = procTrabalhoBundled;
const procPenal = procPenalBundled;
const tributario = tributarioBundled;
const urbanistico = urbanisticoBundled;
const humanos = humanosBundled;
const formacao = formacaoBundled;
const leiEspecial = leiEspecialBundled;
const pesquisa = pesquisaBundled;
const politicas = politicasBundled;
const portugues = portuguesBundled;
const pratica = praticaBundled;
const revisaoOab = revisaoOabBundled;
const teoria = teoriaBundled;

export interface AreaCover {
  cover: string;
  /** cor HSLA para tingir o gradiente do card */
  tint: string;
}

// key = área normalizada (lower, sem acento)
const MAP: Record<string, AreaCover> = {
  'direito administrativo': { cover: administrativo, tint: 'hsla(215, 55%, 42%, 0.85)' },
  'direito ambiental': { cover: ambiental, tint: 'hsla(104, 56%, 36%, 0.88)' },
  'direito civil': { cover: civil, tint: 'hsla(24, 68%, 53%, 0.9)' },
  'direito concorrencial': { cover: concorrencial, tint: 'hsla(43, 76%, 66%, 0.9)' },
  'direito constitucional': { cover: constitucional, tint: 'hsla(224, 65%, 40%, 0.9)' },
  'direito desportivo': { cover: desportivo, tint: 'hsla(34, 95%, 54%, 0.9)' },
  'direito do trabalho': { cover: trabalho, tint: 'hsla(28, 88%, 56%, 0.9)' },
  'direito empresarial': { cover: empresarial, tint: 'hsla(216, 30%, 48%, 0.9)' },
  'direito financeiro': { cover: financeiro, tint: 'hsla(217, 24%, 38%, 0.92)' },
  'direito internacional privado': { cover: intPrivado, tint: 'hsla(188, 63%, 60%, 0.9)' },
  'direito internacional publico': { cover: intPublico, tint: 'hsla(192, 56%, 50%, 0.9)' },
  'direito penal': { cover: penal, tint: 'hsla(357, 87%, 48%, 0.95)' },
  'direito previndenciario': { cover: previdenciario, tint: 'hsla(28, 92%, 58%, 0.9)' },
  'direito previdenciario': { cover: previdenciario, tint: 'hsla(28, 92%, 58%, 0.9)' },
  'direito processual civil': { cover: procCivil, tint: 'hsla(38, 77%, 56%, 0.9)' },
  'direito processual do trabalho': { cover: procTrabalho, tint: 'hsla(18, 45%, 42%, 0.9)' },
  'direito processual penal': { cover: procPenal, tint: 'hsla(198, 36%, 44%, 0.92)' },
  'direito tributario': { cover: tributario, tint: 'hsla(45, 88%, 52%, 0.9)' },
  'direito urbanistico': { cover: urbanistico, tint: 'hsla(29, 82%, 70%, 0.92)' },
  'direitos humanos': { cover: humanos, tint: 'hsla(22, 58%, 46%, 0.88)' },
  'formacao complementar': { cover: formacao, tint: 'hsla(262, 34%, 31%, 0.92)' },
  'lei penal especial': { cover: leiEspecial, tint: 'hsla(337, 62%, 28%, 0.92)' },
  'pesquisa cientifica': { cover: pesquisa, tint: 'hsla(194, 78%, 47%, 0.9)' },
  'politicas publicas': { cover: politicas, tint: 'hsla(324, 88%, 50%, 0.88)' },
  'portugues': { cover: portugues, tint: 'hsla(33, 43%, 72%, 0.92)' },
  'pratica profissional': { cover: pratica, tint: 'hsla(20, 72%, 18%, 0.92)' },
  'revisao oab': { cover: revisaoOab, tint: 'hsla(27, 74%, 22%, 0.92)' },
  'teoria e filosofia do direito': { cover: teoria, tint: 'hsla(229, 26%, 26%, 0.92)' },
};

const norm = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export function getAreaCover(area: string | null | undefined): AreaCover | null {
  if (!area) return null;
  return MAP[norm(area)] ?? null;
}

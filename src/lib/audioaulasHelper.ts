import { srcOf } from '@/lib/assetUrl';
import capaAudioaulas from '@/assets/atalho-audioaulas.webp.asset.json';

// Importação das 22 capas oficiais 3x4 do Google Drive
import capaPenal from '@/assets/audio-areas/01-direito-penal.webp';
import capaConstitucional from '@/assets/audio-areas/02-direito-constitucional.webp';
import capaFilosofia from '@/assets/audio-areas/03-teoria-e-filosofia-do-direito.webp';
import capaAmbiental from '@/assets/audio-areas/04-direito-ambiental.webp';
import capaUrbanistico from '@/assets/audio-areas/05-direito-urbanistico.webp';
import capaFormacaoComplementar from '@/assets/audio-areas/06-formacao-complementar.webp';
import capaInternacionalPrivado from '@/assets/audio-areas/07-direito-internacional-privado.webp';
import capaDesportivo from '@/assets/audio-areas/08-direito-desportivo.webp';
import capaTrabalho from '@/assets/audio-areas/09-direito-do-trabalho.webp';
import capaPortugues from '@/assets/audio-areas/10-portugues.webp';
import capaPrevidenciario from '@/assets/audio-areas/11-direito-previdenciario.webp';
import capaEmpresarial from '@/assets/audio-areas/12-direito-empresarial.webp';
import capaPoliticasPublicas from '@/assets/audio-areas/13-politicas-publicas.webp';
import capaProcessualPenal from '@/assets/audio-areas/14-direito-processual-penal.webp';
import capaFinanceiro from '@/assets/audio-areas/15-direito-financeiro.webp';
import capaProcessualTrabalho from '@/assets/audio-areas/16-direito-processual-do-trabalho.webp';
import capaAdministrativo from '@/assets/audio-areas/17-direito-administrativo.webp';
import capaDireitosHumanos from '@/assets/audio-areas/18-direitos-humanos.webp';
import capaLeiPenalEspecial from '@/assets/audio-areas/19-lei-penal-especial.webp';
import capaTributario from '@/assets/audio-areas/20-direito-tributario.webp';
import capaCivil from '@/assets/audio-areas/21-direito-civil.webp';
import capaProcessualCivil from '@/assets/audio-areas/22-direito-processual-civil.webp';

export const CAPA_HUB = srcOf(capaAudioaulas);

export interface AudioaulaCatalogoArea {
  nome: string;
  capa: string;
  descricao?: string;
}

export const AUDIOAULAS_CATALOGO_AREAS: AudioaulaCatalogoArea[] = [
  { nome: 'Direito Penal', capa: capaPenal, descricao: 'Crimes, penas e tipicidade penal' },
  { nome: 'Direito Constitucional', capa: capaConstitucional, descricao: 'Direitos fundamentais e organização do Estado' },
  { nome: 'Teoria e Filosofia do Direito', capa: capaFilosofia, descricao: 'Filosofia, hermenêutica e teoria da norma' },
  { nome: 'Direito Civil', capa: capaCivil, descricao: 'Pessoas, obrigações, contratos e coisas' },
  { nome: 'Direito Administrativo', capa: capaAdministrativo, descricao: 'Regime jurídico público e atos administrativos' },
  { nome: 'Direito Tributário', capa: capaTributario, descricao: 'Sistema tributário, impostos e execuções' },
  { nome: 'Direito do Trabalho', capa: capaTrabalho, descricao: 'CLT, relações laborais e súmulas do TST' },
  { nome: 'Direito Processual Civil', capa: capaProcessualCivil, descricao: 'Novo CPC, recursos e tutelas' },
  { nome: 'Direito Processual Penal', capa: capaProcessualPenal, descricao: 'Inquérito, provas, ação e prisões processuais' },
  { nome: 'Direito Processual do Trabalho', capa: capaProcessualTrabalho, descricao: 'Rito trabalhista, recursos e execução' },
  { nome: 'Direito Empresarial', capa: capaEmpresarial, descricao: 'Sociedades, títulos de crédito e falência' },
  { nome: 'Direito Previdenciário', capa: capaPrevidenciario, descricao: 'Benefícios, custeio e RGPS/RPPS' },
  { nome: 'Direito Financeiro', capa: capaFinanceiro, descricao: 'Orçamento público, LRF e dívida ativa' },
  { nome: 'Direito Ambiental', capa: capaAmbiental, descricao: 'Proteção ecológica, licenciamento e crimes' },
  { nome: 'Direito Urbanístico', capa: capaUrbanistico, descricao: 'Estatuto da Cidade, zoneamento e ordenamento' },
  { nome: 'Direitos Humanos', capa: capaDireitosHumanos, descricao: 'Pactos internacionais, tratados e garantias' },
  { nome: 'Lei Penal Especial', capa: capaLeiPenalEspecial, descricao: 'Drogas, armas, Maria da Penha e lavagem' },
  { nome: 'Direito Internacional Privado', capa: capaInternacionalPrivado, descricao: 'LINDB, cooperação internacional e tratados' },
  { nome: 'Direito Desportivo', capa: capaDesportivo, descricao: 'Justiça desportiva, Lei Geral e atletas' },
  { nome: 'Políticas Públicas', capa: capaPoliticasPublicas, descricao: 'Gestão estatal, programas e controle social' },
  { nome: 'Português', capa: capaPortugues, descricao: 'Língua portuguesa aplicada e redação jurídica' },
  { nome: 'Formação Complementar', capa: capaFormacaoComplementar, descricao: 'Soft skills, oratória e prática forense' },
];

const CAPAS_MAPPING: { re: RegExp; url: string }[] = [
  // Mais específicos primeiro
  { re: /processual\s+penal|processo\s+penal|cpp/i, url: capaProcessualPenal },
  { re: /processual\s+civil|processo\s+civil|cpc/i, url: capaProcessualCivil },
  { re: /processual\s+do\s+trabalho|processo\s+do\s+trabalho|processo\s+trabalhista/i, url: capaProcessualTrabalho },
  { re: /lei\s+penal\s+especial|legisla[çc][ãa]o\s+penal\s+especial/i, url: capaLeiPenalEspecial },
  { re: /internacional/i, url: capaInternacionalPrivado },
  { re: /direitos?\s+humanos?/i, url: capaDireitosHumanos },
  { re: /previdenci[aá]ri/i, url: capaPrevidenciario },
  { re: /urban[íi]stic/i, url: capaUrbanistico },
  { re: /ambient/i, url: capaAmbiental },
  { re: /tribut[aá]ri|ctn/i, url: capaTributario },
  { re: /financeir/i, url: capaFinanceiro },
  { re: /administrativ/i, url: capaAdministrativo },
  { re: /empresari|comercial/i, url: capaEmpresarial },
  { re: /pol[íi]ticas?\s+p[úu]blicas?/i, url: capaPoliticasPublicas },
  { re: /desportiv/i, url: capaDesportivo },
  { re: /forma[çc][ãa]o\s+complementar/i, url: capaFormacaoComplementar },
  { re: /portugu[êe]s|l[íi]ngua\s+portuguesa/i, url: capaPortugues },
  { re: /filosofia|teoria\s+da\s+norma|hermen[êe]utica|teoria\s+e\s+filosofia/i, url: capaFilosofia },
  { re: /trabalh|clt/i, url: capaTrabalho },
  { re: /constitui|cf88|crfb/i, url: capaConstitucional },
  { re: /penal|crime/i, url: capaPenal },
  { re: /civil/i, url: capaCivil },
];

export const capaDaArea = (area: string): string => {
  if (!area) return CAPA_HUB;
  const match = CAPAS_MAPPING.find((c) => c.re.test(area));
  return match ? match.url : CAPA_HUB;
};

export const normalizar = (s: string) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const VELOCIDADES = [1, 1.25, 1.5, 2];

import { get as idbGet, set as idbSet } from 'idb-keyval';
import { supabase } from '@/integrations/supabase/client';

export interface ArtigoAudioItem {
  id: string;
  numero: string;
  texto: string;
  ordem?: number;
}

export interface AudioAulaLeiConfig {
  leiId: string;
  leiNome: string;
  driveFolderUrl: string;
  audioLinks: Record<string, string>; // chave: numero do artigo (ex: "Art. 1º" ou "1"), valor: link do Google Drive/arquivo
  updatedAt: string;
}

const STORAGE_KEY = 'vacatio:audio_aulas_configs_v1';
const TEMPLATE_KEY = 'vacatio:audio_aulas_prompt_template_v1';

export const DEFAULT_PROMPT_TEMPLATE = `Você é o locutor e professor oficial do aplicativo VACATIO Vade Mecum.

DIRETRIZES E REGRAS MANDATÓRIAS:
1. Inicie sempre com uma saudação calorosa, inspiradora e profissional a todos os estudantes e operadores do Direito.
2. Diga com clareza e entusiasmo: "Olá! Seja muito bem-vindo a mais uma áudio-aula exclusiva do VACATIO Vade Mecum."
3. ATENÇÃO ABSOLUTA: NÃO cite em hipótese alguma o nome de apresentadores individuais (nunca invente nem mencione nomes pessoais de locutores). Você representa a voz institucional do VACATIO Vade Mecum.
4. Apresente o conteúdo com a frase: "Hoje vamos analisar detalhadamente o {NUMERO_ARTIGO} da lei {NOME_LEI}."
5. Faça a leitura pontual, solene e precisa do texto oficial do artigo:
"{TEXTO_ARTIGO}"
6. Em seguida, desenvolva uma explicação didática e fluida:
   - Qual a finalidade principal e o bem jurídico tutelado por esta norma;
   - Impactos práticos nas decisões judiciais, no cotidiano da advocacia e em provas de concursos públicos;
   - Um exemplo prático da vida real para fixação imediata do conteúdo pelo ouvinte.
7. Encerre com uma mensagem motivacional e convide o estudante a continuar aprofundando seus estudos no VACATIO Vade Mecum.`;

/**
 * Retorna o template de prompt atual (customizado pelo admin ou o padrão oficial).
 */
export function getStoredPromptTemplate(): string {
  try {
    const custom = localStorage.getItem(TEMPLATE_KEY);
    if (custom && custom.trim().length > 20) {
      return custom;
    }
  } catch (err) {
    console.warn('[AudioAulas] Falha ao ler template de prompt:', err);
  }
  return DEFAULT_PROMPT_TEMPLATE;
}

/**
 * Salva um novo template de prompt no localStorage.
 */
export function savePromptTemplate(template: string): void {
  try {
    localStorage.setItem(TEMPLATE_KEY, template);
  } catch (err) {
    console.warn('[AudioAulas] Falha ao salvar template:', err);
  }
}

/**
 * Restaura o template de prompt padrão do VACATIO Vade Mecum.
 */
export function resetPromptTemplate(): string {
  try {
    localStorage.removeItem(TEMPLATE_KEY);
  } catch (err) {
    console.warn('[AudioAulas] Falha ao resetar template:', err);
  }
  return DEFAULT_PROMPT_TEMPLATE;
}

/**
 * Verifica se um registro é de fato um Artigo da legislação,
 * descartando registros estruturais como 'PARTE GERAL', 'TÍTULO I', 'CAPÍTULO I', etc.
 */
export function isArtigoReal(numero?: string | null): boolean {
  if (!numero) return false;
  const trimmed = numero.trim();
  if (!trimmed) return false;

  // Se começar com palavras reservadas de estrutura, NÃO é artigo
  const upper = trimmed.toUpperCase();
  if (/^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O|DISPOSI[ÇC]|PREÂMBULO|PREAMBULO)/i.test(upper)) {
    return false;
  }

  // Artigo com numeração ou artigo único
  if (/\b(?:art(?:igo)?\.?\s*)?(\d+)/i.test(trimmed)) {
    return true;
  }

  if (/art(?:igo)?\.?\s*[úu]nico/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Normaliza e formata o rótulo do artigo (ex: '1' -> 'Art. 1º', '121' -> 'Art. 121').
 */
export function formatArtigoLabel(numero?: string | null): string {
  if (!numero) return '';
  const trimmed = numero.trim();

  // Artigo único
  if (/art(?:igo)?\.?\s*[úu]nico/i.test(trimmed)) {
    return 'Art. Único';
  }

  // Procura padrão numérico com possível sufixo (ex.: 121, 1º, 14-A, etc.)
  const match = trimmed.match(/(?:art(?:igo)?\.?\s*)?(\d+)(?:[º°o]|\.º)?(?:-([a-zA-Z]))?/i);
  if (match) {
    const numInt = Number(match[1]);
    const sufixo = match[2] ? `-${match[2].toUpperCase()}` : '';
    if (numInt >= 1 && numInt <= 9) {
      return `Art. ${numInt}º${sufixo}`;
    }
    return `Art. ${numInt}${sufixo}`;
  }

  if (trimmed.startsWith('Art.')) return trimmed;
  return `Art. ${trimmed}`;
}

/**
 * Gera o texto do prompt completo para um artigo específico.
 */
export function generatePromptForArticle(params: {
  numeroArtigo: string;
  textoArtigo: string;
  nomeLei: string;
  template?: string;
}): string {
  const tpl = params.template || getStoredPromptTemplate();
  const numLimpo = formatArtigoLabel(params.numeroArtigo);
  const textoLimpo = (params.textoArtigo || '').trim();

  return tpl
    .replace(/\{NUMERO_ARTIGO\}/g, numLimpo)
    .replace(/\{NOME_LEI\}/g, params.nomeLei.trim())
    .replace(/\{TEXTO_ARTIGO\}/g, textoLimpo);
}

/**
 * Escapa valores para CSV conforme especificação RFC 4180.
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  // Se contiver aspas, vírgula, ponto e vírgula ou quebra de linha, envolve em aspas e duplica aspas internas
  if (/[",\n\r;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Monta o conteúdo da planilha CSV conforme especificado pelo usuário:
 * Coluna A: Número do Artigo (apenas artigos reais formatados, ex: Art. 1º)
 * Coluna B: Texto do Artigo
 * Coluna C: Prompt em texto
 */
export function buildAudioAulasCsv(params: {
  artigos: ArtigoAudioItem[];
  nomeLei: string;
  template?: string;
}): string {
  const { artigos, nomeLei, template } = params;
  const header = ['Numero_Artigo', 'Texto_Artigo', 'Prompt_Gerador'];
  
  const rows: string[] = [];
  rows.push(header.map(escapeCsvCell).join(','));

  // Filtra apenas artigos legítimos da lei (desconsiderando títulos e partes estruturais)
  const artigosReais = artigos.filter((a) => isArtigoReal(a.numero));

  for (const art of artigosReais) {
    const numLimpo = formatArtigoLabel(art.numero);
    const prompt = generatePromptForArticle({
      numeroArtigo: numLimpo,
      textoArtigo: art.texto,
      nomeLei,
      template,
    });

    const colA = escapeCsvCell(numLimpo);
    const colB = escapeCsvCell(art.texto);
    const colC = escapeCsvCell(prompt);

    rows.push(`${colA},${colB},${colC}`);
  }

  // Adiciona BOM UTF-8 (\uFEFF) para compatibilidade perfeita com Excel / Google Sheets
  return '\uFEFF' + rows.join('\r\n');
}

/**
 * Dispara o download do arquivo CSV no navegador.
 */
export function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Obtém todas as configurações de áudio-aulas salvas (links do Drive, etc.).
 */
export async function getAllAudioAulasConfigs(): Promise<Record<string, AudioAulaLeiConfig>> {
  let configs: Record<string, AudioAulaLeiConfig> = {};
  
  // 1. Tenta localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      configs = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[AudioAulas] Erro ao carregar do localStorage:', err);
  }

  // 2. Se vazio, tenta IndexedDB
  if (Object.keys(configs).length === 0) {
    try {
      const fromIdb = await idbGet<Record<string, AudioAulaLeiConfig>>(STORAGE_KEY);
      if (fromIdb && typeof fromIdb === 'object') {
        configs = fromIdb;
      }
    } catch (err) {
      console.warn('[AudioAulas] Erro ao carregar do IDB:', err);
    }
  }

  return configs;
}

/**
 * Obtém a configuração de áudio-aulas para uma lei específica.
 */
export async function getAudioAulaLeiConfig(leiId: string): Promise<AudioAulaLeiConfig | null> {
  const all = await getAllAudioAulasConfigs();
  return all[leiId] || null;
}

/**
 * Salva a configuração de uma lei (link da pasta do Google Drive e links dos áudios por artigo).
 */
export async function saveAudioAulaLeiConfig(config: AudioAulaLeiConfig): Promise<void> {
  const all = await getAllAudioAulasConfigs();
  all[config.leiId] = {
    ...config,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn('[AudioAulas] Falha ao salvar no localStorage:', err);
  }

  try {
    await idbSet(STORAGE_KEY, all);
  } catch (err) {
    console.warn('[AudioAulas] Falha ao salvar no IndexedDB:', err);
  }
}

/**
 * Converte links do Google Drive para stream de áudio reproduzível (quando aplicável)
 * ou normaliza o link para abertura direta.
 */
export function formatDriveStreamUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Se já for uma URL direta de áudio (.mp3, .m4a, .ogg, etc.)
  if (/\.(mp3|m4a|wav|ogg|aac)(\?.*)?$/i.test(trimmed)) {
    return trimmed;
  }

  // Se for link de arquivo do Google Drive
  // Formatos: https://drive.google.com/file/d/FILE_ID/view... ou id=FILE_ID
  const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    const fileId = fileIdMatch[1];
    // Stream direto do Google Drive
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return trimmed;
}

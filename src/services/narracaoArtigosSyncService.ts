import { supabase } from '@/integrations/supabase/client';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { getR2PublicUrl, uploadToR2 } from '@/lib/r2Storage';



export interface ArtigoNarracaoItem {
  id: string;
  numero: string;
  numeroFormatado: string;
  texto: string;
  ordem: number;
  narracao_url: string | null;
  temAudio: boolean;
}

export interface SyncLogEntry {
  timestamp: string;
  tipo: 'info' | 'sucesso' | 'aviso' | 'erro';
  mensagem: string;
}

const STORAGE_KEY_DRIVE_URLS = 'vacatio_narracao_drive_folders';
const STORAGE_KEY_CRON_STATE = 'vacatio_narracao_cron_state';

/**
 * Valida se é um artigo real (exclui cabeçalhos como "LIVRO I", "PARTE GERAL")
 */
export function isArtigoReal(numero?: string | null): boolean {
  if (!numero) return false;
  const trimmed = numero.trim();
  if (!trimmed) return false;
  const upper = trimmed.toUpperCase();
  if (/^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O|DISPOSI[ÇC]|PREÂMBULO|PREAMBULO)/i.test(upper)) {
    return false;
  }
  if (/\b(?:art(?:igo)?\.?\s*)?(\d+)/i.test(trimmed)) return true;
  if (/art(?:igo)?\.?\s*[úu]nico/i.test(trimmed)) return true;
  return false;
}

/**
 * Formata o label do artigo para exibição
 */
export function formatArtigoLabel(numero?: string | null): string {
  if (!numero) return '';
  const trimmed = numero.trim();
  if (/art(?:igo)?\.?\s*[úu]nico/i.test(trimmed)) return 'Art. Único';
  const cleanDots = trimmed.replace(/\./g, '');
  const match = cleanDots.match(/(?:art(?:igo)?\s*)?(\d+)(?:[º°o])?(?:-([a-zA-Z]))?/i);
  if (match) {
    const numInt = Number(match[1]);
    const sufixo = match[2] ? `-${match[2].toUpperCase()}` : '';
    if (numInt >= 1 && numInt <= 9) return `Art. ${numInt}º${sufixo}`;
    const numDisplay = numInt >= 1000 ? numInt.toLocaleString('pt-BR') : `${numInt}`;
    return `Art. ${numDisplay}${sufixo}`;
  }
  if (trimmed.startsWith('Art.')) return trimmed;
  return `Art. ${trimmed}`;
}

/**
 * Valida se a URL de áudio é de um servidor ativo e válido
 * Descarta domínios descontinuados/mortos como izspjvegxdfgkgibpyst
 */
export function isAudioUrlValida(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.includes('izspjvegxdfgkgibpyst.supabase.co')) return false;
  return true;
}

/**
 * Normaliza o número do artigo para comparação (ex: "Art. 3º-A" -> "3-a", "12" -> "12", "1.000" -> "1000")
 */
export function normalizeArtigoKey(numero?: string | null): string {
  if (!numero) return '';
  const trimmed = numero.trim().toLowerCase();
  if (trimmed.includes('único') || trimmed.includes('unico')) return 'unico';
  const withoutDots = trimmed.replace(/\./g, '');
  const match = withoutDots.match(/(?:art(?:igo)?\s*)?(\d+)(?:[º°o])?(?:-([a-z]))?/i);
  if (match) {
    const num = match[1];
    const suf = match[2] ? `-${match[2]}` : '';
    return `${num}${suf}`;
  }
  return withoutDots.replace(/\D/g, '');
}

/**
 * Tenta extrair a chave do artigo a partir de um nome de arquivo
 * Exemplos aceitos:
 * - "art_1.mp3" -> "1"
 * - "artigo_2_v2.wav" -> "2"
 * - "Art. 3º-A.mp3" -> "3-a"
 * - "CPP_Art_57.mp3" -> "57"
 * - "art_1000.mp3" ou "art_1.000.mp3" -> "1000"
 * - "art_3__A_v2_1783361822923.wav" -> "3-a"
 * - "12.mp3" -> "12"
 */
export function matchArtigoKeyFromFilename(filename: string): string | null {
  let clean = filename.replace(/\.(mp3|wav|m4a|ogg|opus)$/i, '').trim();
  // Remove timestamp no final (ex: _1791935156084)
  clean = clean.replace(/_\d{10,}$/, '');
  const cleanNoDots = clean.replace(/\./g, '');

  // Caso com sufixo letra (ex: art_3-a, art_3__A, Artigo 3-A, art_91-a)
  const regexComLetra = /(?:art(?:igo)?|_art)?[\s_.-]*(\d+)[\s_.-]*(?:[º°o]|\.º)?[\s_.-]*([a-zA-Z])(?:\b|_|$)/i;
  const matchLetra = cleanNoDots.match(regexComLetra);
  if (matchLetra) {
    return `${matchLetra[1]}-${matchLetra[2].toLowerCase()}`;
  }

  // Caso simples: art_57 ou Artigo 12 ou CPP_Art_5 ou art_1000
  const regexSimples = /(?:art(?:igo)?|_art)?[\s_.-]*(\d+)(?:[º°o]|\.º)?/i;
  const matchSimples = cleanNoDots.match(regexSimples);
  if (matchSimples) {
    return matchSimples[1];
  }

  return null;
}

/**
 * Carrega a lista de links de pastas salvas no localStorage
 */
export function getSavedDriveUrls(): Record<string, string> {
  const defaults: Record<string, string> = {
    cp: 'https://drive.google.com/drive/folders/1lwO3rzWUCFvmbGllwLvQQtX4eSXXXYQW',
    'cf9e9292-4fe0-4b23-ae89-611edbb92503': 'https://drive.google.com/drive/folders/1lwO3rzWUCFvmbGllwLvQQtX4eSXXXYQW',
    cpp: 'https://drive.google.com/drive/folders/1VFY7Ic2dv9hGzVX8aZboLijh0kaKlMF4',
    '246e8691-ebe2-478d-991d-f3930635151a': 'https://drive.google.com/drive/folders/1VFY7Ic2dv9hGzVX8aZboLijh0kaKlMF4',
    cc: 'https://drive.google.com/drive/folders/1DJ0PJOlGVzLamMc2YfSW8OyvR1qK67g7',
    '32ae6146-3fd4-42e7-8879-81413f0f41cc': 'https://drive.google.com/drive/folders/1DJ0PJOlGVzLamMc2YfSW8OyvR1qK67g7',
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRIVE_URLS);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

/**
 * Salva o link do Drive para uma lei específica
 */
export function saveDriveUrl(leiIdOrSlug: string, url: string): void {
  try {
    const current = getSavedDriveUrls();
    current[leiIdOrSlug] = url.trim();
    localStorage.setItem(STORAGE_KEY_DRIVE_URLS, JSON.stringify(current));
  } catch (err) {
    console.error('Erro ao salvar Drive URL no localStorage:', err);
  }
}

export interface LeiNarracaoItem {
  id: string;
  slug: string;
  nome: string;
  categoria?: string;
  categoriaFormatada: 'Códigos' | 'Estatutos' | 'Constituição' | 'Leis Ordinárias' | 'Geral';
  totalArtigos: number;
  totalComAudio: number;
  totalPendentes: number;
  percentual: number;
  driveFolderUrl?: string;
}

/**
 * Normaliza e formata a categoria da lei
 */
export function formatCategoriaLei(lei: { slug?: string; nome?: string; categoria?: string }): 'Códigos' | 'Estatutos' | 'Constituição' | 'Leis Ordinárias' | 'Geral' {
  const slug = (lei.slug || '').toLowerCase();
  const nome = (lei.nome || '').toLowerCase();
  const cat = (lei.categoria || '').toLowerCase();

  if (slug === 'cf' || slug === 'cf88' || nome.includes('constituição') || nome.includes('constituicao')) {
    return 'Constituição';
  }
  if (cat === 'codigo' || nome.includes('código') || nome.includes('codigo') || slug === 'clt') {
    return 'Códigos';
  }
  if (cat === 'estatuto' || nome.includes('estatuto')) {
    return 'Estatutos';
  }
  if (cat === 'lei') {
    return 'Leis Ordinárias';
  }
  return 'Geral';
}

/**
 * Busca todas as leis principais com métricas de narração
 */
export async function fetchLeisComMetricasNarracao(): Promise<LeiNarracaoItem[]> {
  const { data: leis, error } = await supabase
    .from('vade_mecum_leis')
    .select('id, slug, nome, categoria')
    .order('nome', { ascending: true });

  if (error || !leis) {
    console.error('Erro ao buscar leis:', error);
    return [];
  }

  const driveUrls = getSavedDriveUrls();

  // Executar contagens com concorrência controlada
  const results = await Promise.all(
    leis.map(async (lei) => {
      const { data: artigos } = await supabase
        .from('vade_mecum_artigos')
        .select('id, numero, narracao_url')
        .eq('lei_id', lei.id);

      const artigosReais = (artigos || []).filter(a => isArtigoReal(a.numero));
      const totalArtigos = artigosReais.length;
      if (totalArtigos === 0) return null; // Pula leis sem artigos

      const slug = (lei.slug || '').toLowerCase();
      const storageKeys = new Set<string>();
      if (slug) {
        try {
          const { data: storageFiles } = await supabase.storage.from('narracoes').list(`vademecum/${slug}`);
          if (storageFiles) {
            for (const sf of storageFiles) {
              const k = matchArtigoKeyFromFilename(sf.name);
              if (k) storageKeys.add(k);
            }
          }
        } catch {}
      }

      const comAudio = artigosReais.filter(a => {
        const key = normalizeArtigoKey(a.numero);
        if (storageKeys.has(key)) return true;
        return isAudioUrlValida(a.narracao_url);
      }).length;
      const pendentes = Math.max(0, totalArtigos - comAudio);
      const percentual = totalArtigos > 0 ? Math.round((comAudio / totalArtigos) * 100) : 0;
      const categoriaFormatada = formatCategoriaLei(lei);

      return {
        id: lei.id,
        slug: lei.slug || '',
        nome: lei.nome,
        categoria: lei.categoria || 'Geral',
        categoriaFormatada,
        totalArtigos,
        totalComAudio: comAudio,
        totalPendentes: pendentes,
        percentual,
        driveFolderUrl: driveUrls[lei.id] || driveUrls[lei.slug || ''] || '',
      } as LeiNarracaoItem;
    })
  );

  const filtrados = results.filter((r): r is LeiNarracaoItem => r !== null);

  // Ordenação prioritária: Códigos primeiro (com CPP e CP no topo), depois Estatutos, Constituição, etc.
  return filtrados.sort((a, b) => {
    // CPP sempre em primeiro
    if (a.slug === 'cpp') return -1;
    if (b.slug === 'cpp') return 1;
    if (a.slug === 'cp') return -1;
    if (b.slug === 'cp') return 1;

    // Ordem das categorias
    const pesoCat: Record<string, number> = {
      'Códigos': 1,
      'Estatutos': 2,
      'Constituição': 3,
      'Leis Ordinárias': 4,
      'Geral': 5,
    };
    const pesoA = pesoCat[a.categoriaFormatada] || 99;
    const pesoB = pesoCat[b.categoriaFormatada] || 99;
    if (pesoA !== pesoB) return pesoA - pesoB;

    return a.nome.localeCompare(b.nome);
  });
}

/**
 * Catálogo Canônico Oficial de Legislação com Narração em Áudio.
 * 31 legislações completas (11 Códigos + 20 Estatutos) totalizando 9.684 áudios gravados.
 */
export const CATALOGO_OFICIAL_AUDIO_LEIS: LeiNarracaoItem[] = [
  // 11 CÓDIGOS (7.773 áudios gravados)
  {
    id: '32ae6146-3fd4-42e7-8879-81413f0f41cc',
    slug: 'cc',
    nome: 'Código Civil',
    categoria: 'codigo',
    categoriaFormatada: 'Códigos',
    totalArtigos: 2093,
    totalComAudio: 2093,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: 'cf9e9292-4fe0-4b23-ae89-611edbb92503',
    slug: 'cp',
    nome: 'Código Penal',
    categoria: 'codigo',
    categoriaFormatada: 'Códigos',
    totalArtigos: 432,
    totalComAudio: 432,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '246e8691-ebe2-478d-991d-f3930635151a',
    slug: 'cpp',
    nome: 'Código de Processo Penal',
    categoria: 'codigo',
    categoriaFormatada: 'Códigos',
    totalArtigos: 847,
    totalComAudio: 847,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '251213c5-d502-4792-9f68-050be95357ee',
    slug: 'cpc',
    nome: 'Código de Processo Civil',
    categoria: 'codigo',
    categoriaFormatada: 'Códigos',
    totalArtigos: 1072,
    totalComAudio: 1072,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '71f6e7af-093f-4a7f-8976-287413b40722',
    slug: 'clt',
    nome: 'Consolidação das Leis do Trabalho',
    categoria: 'codigo',
    categoriaFormatada: 'Códigos',
    totalArtigos: 1045,
    totalComAudio: 1045,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: 'cd50fe48-c5bd-4b1e-a216-a4859b72e94e',
    slug: 'ctn',
    nome: 'Código Tributário Nacional',
    categoria: 'codigo',
    categoriaFormatada: 'Códigos',
    totalArtigos: 244,
    totalComAudio: 244,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '96a8236f-a738-49ec-a5d2-e2188441d078',
    slug: 'ctb',
    nome: 'Código de Trânsito Brasileiro',
    categoria: 'codigo',
    categoriaFormatada: 'Códigos',
    totalArtigos: 391,
    totalComAudio: 391,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '6a272efa-e7dd-4d91-a6af-6741fde98afd',
    slug: 'cdc',
    nome: 'Código de Defesa do Consumidor',
    categoria: 'codigo',
    categoriaFormatada: 'Códigos',
    totalArtigos: 130,
    totalComAudio: 130,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '032fd183-60bc-4d86-bd67-4c80f3c41de3',
    slug: 'ce',
    nome: 'Código Eleitoral',
    categoria: 'codigo',
    categoriaFormatada: 'Códigos',
    totalArtigos: 389,
    totalComAudio: 389,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: 'ee02b8a2-3ba3-42f8-96d2-9fae55561127',
    slug: 'cpm',
    nome: 'Código Penal Militar',
    categoria: 'codigo',
    categoriaFormatada: 'Códigos',
    totalArtigos: 411,
    totalComAudio: 411,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '10d15c80-d3c3-4c4c-991f-a70cb97e9901',
    slug: 'cppm',
    nome: 'Código de Processo Penal Militar',
    categoria: 'codigo',
    categoriaFormatada: 'Códigos',
    totalArtigos: 719,
    totalComAudio: 719,
    totalPendentes: 0,
    percentual: 100,
  },

  // 20 ESTATUTOS (1.911 áudios gravados)
  {
    id: '2986d542-bf86-4c70-b30f-8e16684db5ab',
    slug: 'estatuto-oab',
    nome: 'Estatuto da Advocacia e da OAB',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 96,
    totalComAudio: 96,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '7d6ca5bb-a4fc-4177-91ef-57bd4fa073bc',
    slug: 'estatuto-eca',
    nome: 'ECA - Estatuto da Criança e do Adolescente',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 328,
    totalComAudio: 328,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '12cfcfeb-01a7-45d8-85fa-6d19afa2d17a',
    slug: 'estatuto-cidade',
    nome: 'Estatuto da Cidade',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 62,
    totalComAudio: 62,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: 'e0b50d58-a9e0-48d3-85f1-b0e7befbd396',
    slug: 'estatuto-desarmamento',
    nome: 'Estatuto do Desarmamento',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 40,
    totalComAudio: 40,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '42ec31fd-9175-46f9-9379-9ba4fe14a960',
    slug: 'estatuto-indio',
    nome: 'Estatuto do Índio',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 68,
    totalComAudio: 68,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '4153f9bc-9f1c-470c-b56f-5a40827be429',
    slug: 'estatuto-igualdade-racial',
    nome: 'Estatuto da Igualdade Racial',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 65,
    totalComAudio: 65,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: 'e6a915b2-20cb-42d9-9499-0bea514df1ec',
    slug: 'estatuto-juventude',
    nome: 'Estatuto da Juventude',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 48,
    totalComAudio: 48,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: 'd7a519eb-e1f7-4f80-8071-dbd929cb8abf',
    slug: 'estatuto-militares',
    nome: 'Estatuto dos Militares',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 166,
    totalComAudio: 166,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '84602b35-1ba4-4731-89d8-0d5a1b5b138e',
    slug: 'estatuto-metropole',
    nome: 'Estatuto da Metrópole',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 27,
    totalComAudio: 27,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: 'a99a1029-80e2-4c73-ba6c-db7d316006d0',
    slug: 'estatuto-cancer',
    nome: 'Estatuto da Pessoa com Câncer',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 15,
    totalComAudio: 15,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '6274cd3d-2cfc-49ab-bba6-90a5f9db10ea',
    slug: 'estatuto-pessoa-deficiencia',
    nome: 'Estatuto da Pessoa com Deficiência',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 129,
    totalComAudio: 129,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '6937d927-5090-4d41-bffa-16fcec0515a1',
    slug: 'estatuto-idoso',
    nome: 'Estatuto da Pessoa Idosa',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 118,
    totalComAudio: 118,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '9d3ffc41-d3c6-4bc9-915d-9b0632405d14',
    slug: 'estatuto-refugiado',
    nome: 'Estatuto dos Refugiados',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 49,
    totalComAudio: 49,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: '9a4ffdad-51f0-4092-96bb-04e37bb9608f',
    slug: 'estatuto-seguranca-privada',
    nome: 'Estatuto da Segurança Privada',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 72,
    totalComAudio: 72,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: 'f5e5c531-b696-485e-93d2-80ebd808b1c1',
    slug: 'lei-servidor',
    nome: 'Estatuto dos Servidores Públicos Federais',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 263,
    totalComAudio: 263,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: 'dd4c7ac8-f17a-4b31-99aa-5ab8ed0adcef',
    slug: 'estatuto-torcedor',
    nome: 'Estatuto do Torcedor',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 59,
    totalComAudio: 59,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: 'e96e10f3-fd24-407c-9fff-c57f04dcb0e0',
    slug: 'estatuto-terra',
    nome: 'Estatuto da Terra',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 129,
    totalComAudio: 129,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: 'a563c538-8246-4984-aae5-ab26946c5eff',
    slug: 'estatuto-mpe',
    nome: 'Estatuto da Microempresa e EPP',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 132,
    totalComAudio: 132,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: 'eggm',
    slug: 'eggm',
    nome: 'Estatuto Geral das Guardas Municipais',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 23,
    totalComAudio: 23,
    totalPendentes: 0,
    percentual: 100,
  },
  {
    id: 'emot',
    slug: 'emot',
    nome: 'Estatuto do Motorista',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 22,
    totalComAudio: 22,
    totalPendentes: 0,
    percentual: 100,
  },
];

export async function fetchLeisDisponiveisComAudio(mode: 'leis' | 'aulas' = 'leis'): Promise<LeiNarracaoItem[]> {
  const driveUrls = getSavedDriveUrls();

  if (mode === 'aulas') {
    // MODO ÁUDIO AULAS: Busca configurações salvas
    try {
      const configs = await getAllAudioAulasConfigs();
      const entries = Object.entries(configs);

      // Leis com links ou pasta no Drive configurada
      const validKeys = entries
        .filter(([_, conf]) => {
          const hasLinks = conf.audioLinks && Object.values(conf.audioLinks).some((v) => Boolean(v && v.trim()));
          const hasDrive = Boolean(conf.driveFolderUrl && conf.driveFolderUrl.trim());
          return hasLinks || hasDrive;
        })
        .map(([k]) => k);

      if (validKeys.length === 0) {
        validKeys.push('cp');
      }

      const { data: leisDb } = await supabase
        .from('vade_mecum_leis')
        .select('id, slug, nome, categoria');

      const result: LeiNarracaoItem[] = [];
      for (const key of validKeys) {
        const conf = configs[key];
        const leiDb = leisDb?.find((l) => l.id === key || l.slug === key);
        const leiCatalog = LEIS_CATALOG.find((l) => l.id === key || l.tabela_nome === key);
        const nome = leiDb?.nome || leiCatalog?.nome || conf?.leiNome || key.toUpperCase();
        const slug = leiDb?.slug || leiCatalog?.id || key;
        const totalAudios = conf?.audioLinks ? Object.values(conf.audioLinks).filter(Boolean).length : 0;

        result.push({
          id: leiDb?.id || key,
          slug,
          nome,
          categoria: leiDb?.categoria || 'codigo',
          categoriaFormatada: formatCategoriaLei({ slug, nome, categoria: leiDb?.categoria }),
          totalArtigos: 361,
          totalComAudio: totalAudios || 10,
          totalPendentes: 0,
          percentual: 100,
          driveFolderUrl: conf?.driveFolderUrl || driveUrls[slug] || '',
        });
      }

      return result.sort((a, b) => a.nome.localeCompare(b.nome));
    } catch (err) {
      console.warn('[fetchLeisDisponiveisComAudio] Erro ao listar aulas:', err);
      return [];
    }
  }

  // MODO ÁUDIO LEIS (Narrações):
  try {
    const { data: leisDb } = await supabase
      .from('vade_mecum_leis')
      .select('id, slug, nome, categoria');

    const result: LeiNarracaoItem[] = CATALOGO_OFICIAL_AUDIO_LEIS.map((conf) => {
      const dbSlug = conf.slug.toLowerCase();
      const leiDb = leisDb?.find(
        (l) => (l.slug && l.slug.toLowerCase() === dbSlug) || l.id === conf.id || l.id === conf.slug
      );
      const leiId = leiDb?.id || conf.id;
      const nome = leiDb?.nome || conf.nome;

      return {
        ...conf,
        id: leiId,
        nome,
        driveFolderUrl: driveUrls[leiId] || driveUrls[conf.slug] || '',
      };
    });

    return result;
  } catch (err) {
    console.warn('[fetchLeisDisponiveisComAudio] Erro ao sincronizar catálogo de leis, usando catálogo canônico:', err);
    return CATALOGO_OFICIAL_AUDIO_LEIS;
  }
}

interface RawArtigoRow {
  id: string;
  numero: string;
  texto: string | null;
  ordem: number | null;
  narracao_url: string | null;
}

/**
 * Busca todos os artigos reais de uma lei com detalhes de narração
 * Verifica também diretamente os arquivos no bucket 'narracoes' do Supabase Storage
 */
export async function fetchArtigosDaLeiComNarracao(leiId: string, leiSlug?: string): Promise<ArtigoNarracaoItem[]> {
  const all: RawArtigoRow[] = [];
  let from = 0;
  const chunkSize = 1000;

  while (true) {
    const to = from + chunkSize - 1;
    const { data, error } = await supabase
      .from('vade_mecum_artigos')
      .select('id, numero, texto, ordem, narracao_url')
      .eq('lei_id', leiId)
      .order('ordem', { ascending: true })
      .range(from, to);

    if (error || !data || data.length === 0) break;
    all.push(...data);
    if (data.length < chunkSize) break;
    from += chunkSize;
  }

  // Mapear arquivos existentes diretamente no Supabase Storage (bucket narracoes)
  const storageAudiosMap = new Map<string, string>();
  const slug = (leiSlug || '').toLowerCase();
  if (slug) {
    try {
      // 1. Bucket narracoes
      const { data: storageFiles } = await supabase.storage.from('narracoes').list(`vademecum/${slug}`, { limit: 1000 });
      if (storageFiles && storageFiles.length > 0) {
        for (const file of storageFiles) {
          if (!file.name || !/\.(mp3|wav|m4a|ogg)$/i.test(file.name)) continue;
          const key = matchArtigoKeyFromFilename(file.name);
          if (key) {
            // Servir diretamente via CDN do Cloudflare R2
            const r2Url = getR2PublicUrl(`narracoes/vademecum/${slug}/${file.name}`);
            storageAudiosMap.set(key, r2Url);
          }
        }
      }

      // 2. Bucket narracao-artigos (onde ficam as narrações massivas do drive)
      const { data: storageArtigosFiles } = await supabase.storage.from('narracao-artigos').list(slug, { limit: 1000 });
      if (storageArtigosFiles && storageArtigosFiles.length > 0) {
        for (const file of storageArtigosFiles) {
          if (!file.name || !/\.(mp3|wav|m4a|ogg)$/i.test(file.name)) continue;
          const key = matchArtigoKeyFromFilename(file.name);
          if (key && !storageAudiosMap.has(key)) {
            const r2Url = getR2PublicUrl(`narracao-artigos/${slug}/${file.name}`);
            storageAudiosMap.set(key, r2Url);
          }
        }
      }
    } catch (err) {
      console.warn('[fetchArtigosDaLeiComNarracao] Erro ao listar Storage:', err);
    }
  }

  return all
    .filter(a => isArtigoReal(a.numero))
    .map(a => {
      const keyArtigo = normalizeArtigoKey(a.numero);
      const urlStorage = storageAudiosMap.get(keyArtigo);
      const audioDbOk = isAudioUrlValida(a.narracao_url);
      // Apenas áudio oficial de narração (Cloudflare R2 / banco ou storage)
      const audioUrlFinal = (audioDbOk ? a.narracao_url : null) || urlStorage || null;
      const temAudioFinal = !!audioUrlFinal;

      return {
        id: a.id,
        numero: a.numero,
        numeroFormatado: formatArtigoLabel(a.numero),
        texto: a.texto || '',
        ordem: a.ordem ?? 0,
        narracao_url: audioUrlFinal,
        temAudio: temAudioFinal,
      };
    });
}

/**
 * Faz o upload de um arquivo de áudio para o Supabase Storage e vincula ao artigo
 */
export async function vincularAudioAoArtigo(params: {
  leiId: string;
  leiSlug: string;
  leiNome: string;
  artigoId: string;
  artigoNumero: string;
  fileBlob: Blob;
  mimeType?: string;
  fileName?: string;
}): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
  try {
    const { leiId, leiSlug, leiNome, artigoId, artigoNumero, fileBlob, fileName } = params;

    const ext = fileName && fileName.endsWith('.wav') ? 'wav' : 'mp3';
    const numLimpo = normalizeArtigoKey(artigoNumero);
    const storagePath = `vademecum/${leiSlug || 'lei'}/art_${numLimpo}_${Date.now()}.${ext}`;

    // 1. Upload padrão para o Cloudflare R2 (com fallback para Supabase Storage)
    let audioUrl = '';
    try {
      const { url } = await uploadToR2(`narracoes/${storagePath}`, fileBlob, ext === 'wav' ? 'audio/wav' : 'audio/mpeg');
      audioUrl = url;

      // Salva também na pasta categorizada (codigos, estatutos, constituicao)
      try {
        const cat = (leiSlug || '').includes('codigo') || ['cp','cc','cpp','cpc','clt','ctn','cdc','ctb','ce','cpm','cppm'].includes(leiSlug || '')
          ? 'codigos'
          : (leiSlug || '').includes('estatuto') || ['eoab','eca','ei','epd','eir','ec','ed'].includes(leiSlug || '')
          ? 'estatutos'
          : (leiSlug || '').includes('constitu') || leiSlug === 'cf88'
          ? 'constituicao'
          : 'codigos';
        await uploadToR2(`narracoes/${cat}/${leiSlug || 'lei'}/art_${numLimpo}_${Date.now()}.${ext}`, fileBlob, ext === 'wav' ? 'audio/wav' : 'audio/mpeg');
      } catch {}
    } catch (r2Err) {
      console.warn('[vincularAudio] R2 upload falhou, tentando Supabase Storage:', r2Err);
      const { error: uploadError } = await supabase.storage
        .from('narracoes')
        .upload(storagePath, fileBlob, {
          contentType: ext === 'wav' ? 'audio/wav' : 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('[vincularAudio] Erro no upload:', uploadError);
        return { success: false, error: uploadError.message };
      }

      const { data: pubData } = supabase.storage
        .from('narracoes')
        .getPublicUrl(storagePath);
      audioUrl = pubData.publicUrl;
    }

    // 2. Atualizar tabela vade_mecum_artigos
    const { error: updateArtigoError } = await supabase
      .from('vade_mecum_artigos')
      .update({ narracao_url: audioUrl })
      .eq('id', artigoId);

    if (updateArtigoError) {
      console.warn('[vincularAudio] Aviso ao atualizar vade_mecum_artigos:', updateArtigoError);
    }

    // 4. Upsert na tabela narracoes_artigos
    try {
      await supabase.from('narracoes_artigos').upsert(
        {
          tabela_nome: leiSlug || leiId,
          artigo_numero: artigoNumero,
          lei_nome: leiNome,
          audio_url: audioUrl,
        },
        { onConflict: 'tabela_nome,artigo_numero' }
      );
    } catch (e) {
      console.warn('[vincularAudio] Aviso ao upsertar narracoes_artigos:', e);
    }

    return { success: true, audioUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return { success: false, error: msg };
  }
}

/**
 * Cache em memória para arquivos listados por pasta no Storage
 */
const storageAudiosCache = new Map<string, Map<string, string>>();

/**
 * Limpa o cache de áudios em memória (útil após novo upload)
 */
export function invalidateStorageAudiosCache(slug?: string): void {
  if (slug) {
    storageAudiosCache.delete(slug.toLowerCase());
  } else {
    storageAudiosCache.clear();
  }
}

/**
 * Busca a URL de áudio pré-gravada de um artigo específico
// In-memory cache de URLs de áudio para acesso instantâneo (0ms)
const resolvedNarracoesCache = new Map<string, string>();

/**
 * Consulta síncrona instantânea ao cache de narração
 */
export function getCachedNarracaoUrl(params: {
  artigoId?: string;
  tabelaNome?: string;
  leiSlug?: string;
  artigoNumero?: string;
  narracaoUrl?: string | null;
}): string | null {
  const { artigoId, tabelaNome, leiSlug, artigoNumero, narracaoUrl } = params;
  if (isAudioUrlValida(narracaoUrl)) return narracaoUrl!.trim();
  if (artigoId && resolvedNarracoesCache.has(artigoId)) {
    return resolvedNarracoesCache.get(artigoId)!;
  }
  const key = normalizeArtigoKey(artigoNumero);
  const slug = (leiSlug || tabelaNome || '').trim().toLowerCase();
  if (slug && key) {
    const compositeKey = `${slug}::${key}`;
    if (resolvedNarracoesCache.has(compositeKey)) {
      return resolvedNarracoesCache.get(compositeKey)!;
    }
  }
  return null;
}

/**
 * Busca a URL do áudio de narração do artigo (Instantânea com cache, DB ou Cloudflare R2)
 */
export async function getNarracaoArtigo(params: {
  tabelaNome?: string;
  leiSlug?: string;
  artigoNumero?: string;
  artigoId?: string;
  narracaoUrl?: string | null;
}): Promise<{ audioUrl: string; wordTimings?: Array<{ word: string; start: number; end: number }> } | null> {
  const { tabelaNome, leiSlug, artigoNumero, artigoId, narracaoUrl } = params;

  // 1. Se já fornecida URL válida
  if (isAudioUrlValida(narracaoUrl)) {
    const url = narracaoUrl!.trim();
    if (artigoId) resolvedNarracoesCache.set(artigoId, url);
    return { audioUrl: url };
  }

  // 2. Checar no cache em memória
  const cached = getCachedNarracaoUrl(params);
  if (cached) {
    return { audioUrl: cached };
  }

  const key = normalizeArtigoKey(artigoNumero);
  const slug = (leiSlug || tabelaNome || '').trim().toLowerCase();

  // 3. Checar em vade_mecum_artigos diretamente pelo artigoId (tabela principal e mais rápida)
  if (artigoId) {
    try {
      const { data: artRow } = await supabase
        .from('vade_mecum_artigos')
        .select('narracao_url')
        .eq('id', artigoId)
        .maybeSingle();

      if (artRow?.narracao_url && isAudioUrlValida(artRow.narracao_url)) {
        const url = artRow.narracao_url.trim();
        resolvedNarracoesCache.set(artigoId, url);
        if (slug && key) resolvedNarracoesCache.set(`${slug}::${key}`, url);
        return { audioUrl: url };
      }
    } catch {}
  }

  // 4. Checar no banco de dados (tabela 'narracoes_artigos')
  try {
    const slugs = new Set<string>();
    if (leiSlug) slugs.add(leiSlug.trim().toLowerCase());
    if (tabelaNome) {
      const raw = tabelaNome.trim();
      const prefix = raw.toLowerCase().replace(/_.*$/, '');
      if (prefix) slugs.add(prefix);
      slugs.add(raw.toLowerCase());
    }
    const candidateSlugs = Array.from(slugs);
    if (candidateSlugs.length > 0 && key) {
      const orFilter = candidateSlugs.map(s => `tabela_nome.eq.${s}`).join(',');
      const { data: rows } = await supabase
        .from('narracoes_artigos')
        .select('audio_url, word_timings, artigo_numero')
        .or(orFilter)
        .limit(30);

      if (rows && rows.length > 0) {
        for (const r of rows) {
          if (r.audio_url && isAudioUrlValida(r.audio_url)) {
            const rKey = normalizeArtigoKey(r.artigo_numero);
            if (rKey === key) {
              const url = r.audio_url.trim();
              if (artigoId) resolvedNarracoesCache.set(artigoId, url);
              if (slug) resolvedNarracoesCache.set(`${slug}::${key}`, url);
              return {
                audioUrl: url,
                wordTimings: Array.isArray(r.word_timings) ? (r.word_timings as Array<{ word: string; start: number; end: number }>) : undefined,
              };
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[getNarracaoArtigo] Erro ao buscar em narracoes_artigos:', err);
  }

  return null;
}

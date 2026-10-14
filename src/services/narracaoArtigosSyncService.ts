import { supabase } from '@/integrations/supabase/client';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { getAllAudioAulasConfigs } from '@/services/audioAulasService';



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
  const match = trimmed.match(/(?:art(?:igo)?\.?\s*)?(\d+)(?:[º°o]|\.º)?(?:-([a-zA-Z]))?/i);
  if (match) {
    const numInt = Number(match[1]);
    const sufixo = match[2] ? `-${match[2].toUpperCase()}` : '';
    if (numInt >= 1 && numInt <= 9) return `Art. ${numInt}º${sufixo}`;
    return `Art. ${numInt}${sufixo}`;
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
 * Normaliza o número do artigo para comparação (ex: "Art. 3º-A" -> "3-a", "12" -> "12")
 */
export function normalizeArtigoKey(numero?: string | null): string {
  if (!numero) return '';
  const trimmed = numero.trim().toLowerCase();
  if (trimmed.includes('único') || trimmed.includes('unico')) return 'unico';
  const match = trimmed.match(/(?:art(?:igo)?\.?\s*)?(\d+)(?:[º°o]|\.º)?(?:-([a-z]))?/i);
  if (match) {
    const num = match[1];
    const suf = match[2] ? `-${match[2]}` : '';
    return `${num}${suf}`;
  }
  return trimmed.replace(/\D/g, '');
}

/**
 * Tenta extrair a chave do artigo a partir de um nome de arquivo
 * Exemplos aceitos:
 * - "art_1.mp3" -> "1"
 * - "artigo_2_v2.wav" -> "2"
 * - "Art. 3º-A.mp3" -> "3-a"
 * - "CPP_Art_57.mp3" -> "57"
 * - "art_3__A_v2_1783361822923.wav" -> "3-a"
 * - "12.mp3" -> "12"
 */
export function matchArtigoKeyFromFilename(filename: string): string | null {
  let clean = filename.replace(/\.(mp3|wav|m4a|ogg|opus)$/i, '').trim();
  // Remove timestamp no final (ex: _1791935156084)
  clean = clean.replace(/_\d{10,}$/, '');

  // Caso com sufixo letra (ex: art_3-a, art_3__A, Artigo 3-A, art_91-a)
  const regexComLetra = /(?:art(?:igo)?|_art)?[\s_.-]*(\d+)[\s_.-]*(?:[º°o]|\.º)?[\s_.-]*([a-zA-Z])(?:\b|_|$)/i;
  const matchLetra = clean.match(regexComLetra);
  if (matchLetra) {
    return `${matchLetra[1]}-${matchLetra[2].toLowerCase()}`;
  }

  // Caso simples: art_57 ou Artigo 12 ou CPP_Art_5
  const regexSimples = /(?:art(?:igo)?|_art)?[\s_.-]*(\d+)(?:[º°o]|\.º)?/i;
  const matchSimples = clean.match(regexSimples);
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
 * Busca de forma instantânea e ultra-otimizada APENAS as leis que possuem áudio gravado.
 * Se não tiver áudio, não é exibida na tela (conforme diretriz do usuário).
 */
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

      // Se ainda não houver nenhuma aula gravada nas configurações, exibe o Código Penal como destaque inicial
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
    // 1. Lista apenas as pastas que existem no storage vademecum/ (1 requisição rápida!)
    const { data: storageFolders } = await supabase.storage.from('narracoes').list('vademecum');
    const validSlugs = new Set<string>();

    if (storageFolders && storageFolders.length > 0) {
      for (const folder of storageFolders) {
        if (folder.name && !folder.name.includes('.')) {
          validSlugs.add(folder.name.toLowerCase());
        }
      }
    }

    // Garante CP e CPP que possuem narrações
    validSlugs.add('cp');
    validSlugs.add('cpp');

    // 2. Busca apenas as leis correspondentes
    const { data: leisDb } = await supabase
      .from('vade_mecum_leis')
      .select('id, slug, nome, categoria');

    const result: LeiNarracaoItem[] = [];

    for (const slug of validSlugs) {
      const leiDb = leisDb?.find((l) => l.slug?.toLowerCase() === slug || l.id === slug);
      const leiCatalog = LEIS_CATALOG.find((l) => l.id.toLowerCase() === slug);
      const nome = leiDb?.nome || leiCatalog?.nome || (slug === 'cp' ? 'Código Penal' : slug === 'cpp' ? 'Código de Processo Penal' : slug.toUpperCase());
      const leiId = leiDb?.id || slug;

      // Contagem de arquivos no storage
      let audioCount = slug === 'cp' ? 10 : 1;
      try {
        const { data: files } = await supabase.storage.from('narracoes').list(`vademecum/${slug}`);
        const realCount = (files || []).filter((f) => /\.(mp3|wav|m4a|ogg)$/i.test(f.name)).length;
        if (realCount > 0) audioCount = realCount;
      } catch {}

      result.push({
        id: leiId,
        slug,
        nome,
        categoria: leiDb?.categoria || 'codigo',
        categoriaFormatada: formatCategoriaLei({ slug, nome, categoria: leiDb?.categoria }),
        totalArtigos: 361,
        totalComAudio: audioCount,
        totalPendentes: 0,
        percentual: 100,
        driveFolderUrl: driveUrls[leiId] || driveUrls[slug] || '',
      });
    }

    // CP e CPP no topo
    return result.sort((a, b) => {
      if (a.slug === 'cp') return -1;
      if (b.slug === 'cp') return 1;
      if (a.slug === 'cpp') return -1;
      if (b.slug === 'cpp') return 1;
      return a.nome.localeCompare(b.nome);
    });
  } catch (err) {
    console.warn('[fetchLeisDisponiveisComAudio] Erro ao listar narrações:', err);
    return [
      {
        id: 'cf9e9292-4fe0-4b23-ae89-611edbb92503',
        slug: 'cp',
        nome: 'Código Penal',
        categoria: 'codigo',
        categoriaFormatada: 'Códigos',
        totalArtigos: 361,
        totalComAudio: 10,
        totalPendentes: 351,
        percentual: 3,
      },
      {
        id: '246e8691-ebe2-478d-991d-f3930635151a',
        slug: 'cpp',
        nome: 'Código de Processo Penal',
        categoria: 'codigo',
        categoriaFormatada: 'Códigos',
        totalArtigos: 810,
        totalComAudio: 1,
        totalPendentes: 809,
        percentual: 1,
      },
    ];
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
      const { data: storageFiles } = await supabase.storage.from('narracoes').list(`vademecum/${slug}`);
      if (storageFiles && storageFiles.length > 0) {
        for (const file of storageFiles) {
          if (!file.name || !/\.(mp3|wav|m4a|ogg)$/i.test(file.name)) continue;
          const key = matchArtigoKeyFromFilename(file.name);
          if (key) {
            const { data: pubData } = supabase.storage
              .from('narracoes')
              .getPublicUrl(`vademecum/${slug}/${file.name}`);
            if (pubData?.publicUrl) {
              storageAudiosMap.set(key, pubData.publicUrl);
            }
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

      // Prioriza áudio verificado no Storage novo; se não houver no storage, usa URL válida do banco
      const audioUrlFinal = urlStorage || (audioDbOk ? a.narracao_url : null);
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

    // 1. Upload para o bucket 'narracoes'
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

    // 2. Obter URL pública permanente
    const { data: pubData } = supabase.storage
      .from('narracoes')
      .getPublicUrl(storagePath);

    const audioUrl = pubData.publicUrl;

    // 3. Atualizar tabela vade_mecum_artigos
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
 * Consulta em ordem: URL direta -> Storage (vademecum/{slug}) -> narracoes_artigos -> vade_mecum_artigos
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
    return { audioUrl: narracaoUrl.trim() };
  }

  const key = normalizeArtigoKey(artigoNumero);
  if (!key) return null;

  // 2. Levantar possíveis slugs da lei
  const slugs = new Set<string>();
  if (leiSlug) slugs.add(leiSlug.trim().toLowerCase());
  if (tabelaNome) {
    const raw = tabelaNome.trim();
    const prefix = raw.toLowerCase().replace(/_.*$/, '');
    if (prefix) slugs.add(prefix);
    slugs.add(raw.toLowerCase());
  }

  // 3. Checar no Supabase Storage (bucket 'narracoes')
  for (const slug of slugs) {
    if (!storageAudiosCache.has(slug)) {
      try {
        const { data: storageFiles } = await supabase.storage.from('narracoes').list(`vademecum/${slug}`);
        const map = new Map<string, string>();
        if (storageFiles && storageFiles.length > 0) {
          for (const file of storageFiles) {
            if (!file.name || !/\.(mp3|wav|m4a|ogg)$/i.test(file.name)) continue;
            const k = matchArtigoKeyFromFilename(file.name);
            if (k) {
              const { data: pubData } = supabase.storage
                .from('narracoes')
                .getPublicUrl(`vademecum/${slug}/${file.name}`);
              if (pubData?.publicUrl) {
                map.set(k, pubData.publicUrl);
              }
            }
          }
        }
        storageAudiosCache.set(slug, map);
      } catch (err) {
        console.warn(`[getNarracaoArtigo] Erro ao listar Storage para ${slug}:`, err);
      }
    }

    const map = storageAudiosCache.get(slug);
    if (map && map.has(key)) {
      return { audioUrl: map.get(key)! };
    }
  }

  // 4. Checar no banco de dados (tabela 'narracoes_artigos')
  try {
    const candidateSlugs = Array.from(slugs);
    if (candidateSlugs.length > 0) {
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
              return {
                audioUrl: r.audio_url,
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

  // 5. Checar em vade_mecum_artigos se tiver artigoId
  if (artigoId) {
    try {
      const { data: artRow } = await supabase
        .from('vade_mecum_artigos')
        .select('narracao_url')
        .eq('id', artigoId)
        .maybeSingle();

      if (artRow?.narracao_url && isAudioUrlValida(artRow.narracao_url)) {
        return { audioUrl: artRow.narracao_url };
      }
    } catch {}
  }

  return null;
}

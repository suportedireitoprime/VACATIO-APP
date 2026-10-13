import { supabase } from '@/integrations/supabase/client';



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
  const clean = filename.replace(/\.(mp3|wav|m4a|ogg|opus)$/i, '').trim();

  // Caso com sufixo letra (ex: art_3__A ou art-3-a ou Artigo 3-A)
  const regexComLetra = /(?:art(?:igo)?|_art)?[\s_.-]*(\d+)[\s_.-]*(?:[º°o]|\.º)?[\s_.-]*([a-zA-Z])\b/i;
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRIVE_URLS);
    if (!raw) {
      // Padrão inicial: pasta do CPP informada pelo usuário
      return {
        cpp: 'https://drive.google.com/drive/folders/1VFY7Ic2dv9hGzVX8aZboLijh0kaKlMF4',
        '246e8691-ebe2-478d-991d-f3930635151a': 'https://drive.google.com/drive/folders/1VFY7Ic2dv9hGzVX8aZboLijh0kaKlMF4',
      };
    }
    return JSON.parse(raw);
  } catch {
    return {};
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

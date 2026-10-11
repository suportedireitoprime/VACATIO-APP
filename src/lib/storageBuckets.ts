/**
 * Fase 47: Segregação e Mapeamento Canônico de Buckets do Supabase Storage (Item 47 do Relatório).
 * Define as políticas de visibilidade (público vs privado/assinado) e caminhos padronizados.
 */

export const STORAGE_BUCKETS = {
  /** Capas de livros, clássicos do direito, ministros e pílulas (Público com CDN Cache) */
  COVERS: 'biblioteca-obras',
  /** Capas de artigos e notícias do blog editorial (Público) */
  BLOG: 'blog-capas',
  /** Banners de notificações push (Público) */
  PUSH: 'push-covers',
  /** Áudios de introdução, pílulas e trilhas sonoras (Público) */
  AUDIOS: 'audios',
  /** Bundles JSON de sincronização do modo offline (Público) */
  OFFLINE_BUNDLES: 'offline-bundles',
  /** Fontes e imagens de flashcards (Público) */
  FLASHCARDS_FONTES: 'flashcards-fontes',
  /** Áudios gravados de aulas e notas de voz de usuários (Privado - requer Signed URL) */
  AULAS_AUDIO: 'aulas-audio',
  /** Anotações de voz individuais de artigos (Privado - requer Signed URL) */
  ANOTACOES_AUDIO: 'anotacoes-audio',
} as const;

export type StorageBucketKey = keyof typeof STORAGE_BUCKETS;
export type StorageBucketName = (typeof STORAGE_BUCKETS)[StorageBucketKey];

/** Buckets que exigem autenticação / URL assinada (não possuem acesso direto via /public/) */
const PRIVATE_BUCKETS = new Set<string>([
  STORAGE_BUCKETS.AULAS_AUDIO,
  STORAGE_BUCKETS.ANOTACOES_AUDIO,
]);

/**
 * Verifica se um bucket requer URLs assinadas temporárias ou se é público.
 */
export const isBucketPrivate = (bucketName: string): boolean => {
  return PRIVATE_BUCKETS.has(bucketName.trim().toLowerCase());
};

/**
 * Constrói a URL pública canônica para um bucket do Supabase Storage.
 * Lança aviso se invocado para um bucket privado.
 */
export const getPublicBucketUrl = (bucketName: string, path: string): string => {
  const cleanBucket = (bucketName || '').replace(/^\/+|\/+$/g, '');
  const cleanPath = (path || '').replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');

  if (isBucketPrivate(cleanBucket)) {
    console.warn(`[storageBuckets] Tentativa de gerar URL pública para bucket privado: "${cleanBucket}". Utilize createSignedUrl().`);
  }

  return `https://dnjrgpldcwcpoywamorr.supabase.co/storage/v1/object/public/${cleanBucket}/${cleanPath}`;
};

/**
 * Retorna o bucket padrão adequado para um tipo específico de asset da aplicação.
 */
export const getBucketForAssetType = (type: 'cover' | 'blog' | 'push' | 'audio' | 'bundle' | 'voice'): StorageBucketName => {
  switch (type) {
    case 'cover':
      return STORAGE_BUCKETS.COVERS;
    case 'blog':
      return STORAGE_BUCKETS.BLOG;
    case 'push':
      return STORAGE_BUCKETS.PUSH;
    case 'audio':
      return STORAGE_BUCKETS.AUDIOS;
    case 'bundle':
      return STORAGE_BUCKETS.OFFLINE_BUNDLES;
    case 'voice':
      return STORAGE_BUCKETS.AULAS_AUDIO;
    default:
      return STORAGE_BUCKETS.COVERS;
  }
};

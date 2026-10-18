import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

// Configurações do Cloudflare R2
export const R2_CONFIG = {
  accountId: import.meta.env.VITE_R2_ACCOUNT_ID || 'f654819db5e99f6d7f9475abf6e3f834',
  bucketName: import.meta.env.VITE_R2_BUCKET_NAME || 'vacatio-midias',
  publicUrl: (import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev').replace(/\/+$/, ''),
  accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || import.meta.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || import.meta.env.R2_SECRET_ACCESS_KEY || '',
  endpoint: import.meta.env.VITE_R2_ENDPOINT || import.meta.env.R2_ENDPOINT || 'https://f654819db5e99f6d7f9475abf6e3f834.r2.cloudflarestorage.com',
};

// Instância única do cliente S3 para o R2 (Edge-compatible)
let s3ClientInstance: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: R2_CONFIG.endpoint,
      credentials: {
        accessKeyId: R2_CONFIG.accessKeyId,
        secretAccessKey: R2_CONFIG.secretAccessKey,
      },
    });
  }
  return s3ClientInstance;
}

/**
 * Retorna a URL pública ultra-rápida na CDN da Cloudflare para uma chave de arquivo.
 * Exemplo: getR2PublicUrl('vademecum/art-157.mp3') -> 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev/vademecum/art-157.mp3'
 */
export function getR2PublicUrl(key: string): string {
  if (!key) return '';
  // Se já for uma URL completa, retorna diretamente
  if (/^https?:\/\//i.test(key)) return key;
  const cleanKey = key.replace(/^\/+/, '');
  return `${R2_CONFIG.publicUrl}/${cleanKey}`;
}

/**
 * Faz o upload de um arquivo diretamente para o Cloudflare R2 com custo zero de banda.
 */
export async function uploadToR2(
  key: string,
  data: Blob | Uint8Array | ArrayBuffer | string,
  contentType?: string
): Promise<{ url: string; key: string }> {
  const cleanKey = key.replace(/^\/+/, '');
  const client = getR2Client();

  let body: any = data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    body = new Uint8Array(await data.arrayBuffer());
    if (!contentType && data.type) {
      contentType = data.type;
    }
  } else if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
    body = new Uint8Array(data);
  }

  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: cleanKey,
    Body: body,
    ContentType: contentType || 'application/octet-stream',
  });

  await client.send(command);

  return {
    key: cleanKey,
    url: getR2PublicUrl(cleanKey),
  };
}

/**
 * Exclui um arquivo do Cloudflare R2.
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  try {
    const cleanKey = key.replace(/^\/+/, '');
    const client = getR2Client();
    const command = new DeleteObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: cleanKey,
    });
    await client.send(command);
    return true;
  } catch (error) {
    console.error('Erro ao excluir do R2:', error);
    return false;
  }
}

/**
 * Verifica se um arquivo existe no Cloudflare R2.
 */
export async function existsInR2(key: string): Promise<boolean> {
  try {
    const cleanKey = key.replace(/^\/+/, '');
    const client = getR2Client();
    const command = new HeadObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: cleanKey,
    });
    await client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lista arquivos dentro de uma pasta/prefixo no R2.
 */
export async function listR2Objects(prefix = ''): Promise<string[]> {
  try {
    const client = getR2Client();
    const command = new ListObjectsV2Command({
      Bucket: R2_CONFIG.bucketName,
      Prefix: prefix.replace(/^\/+/, ''),
    });
    const response = await client.send(command);
    return (response.Contents || []).map((item) => item.Key || '').filter(Boolean);
  } catch (error) {
    console.error('Erro ao listar arquivos do R2:', error);
    return [];
  }
}

/**
 * Converte URLs antigas do Supabase Storage para a nova CDN da Cloudflare R2.
 */
export function convertSupabaseUrlToR2(url: string): string {
  if (!url) return '';
  if (url.includes('.r2.dev') || url.includes('.r2.cloudflarestorage.com')) return url;

  // Padrão do Supabase Storage: /storage/v1/object/public/{bucket}/{caminho}
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
  if (match) {
    const [, bucket, path] = match;
    // No R2, mantemos a pasta do bucket como prefixo para organização
    return getR2PublicUrl(`${bucket}/${path}`);
  }

  return url;
}

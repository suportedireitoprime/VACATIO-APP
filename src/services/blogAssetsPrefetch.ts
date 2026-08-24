/**
 * Prefetch das capas de blog para o filesystem nativo (Capacitor).
 * — Web: no-op (o browser + CDN já resolvem).
 * — Nativo: baixa em background e mantém manifesto local para dedup.
 *
 * Chamada no boot do app depois de `lawsBundle`. Reroda ao voltar para foreground.
 */
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { supabase } from '@/integrations/supabase/client';

const COVERS_DIR = 'blog-covers';
const MANIFEST_PATH = `${COVERS_DIR}/manifest.json`;
const MAX_POSTS = 100;
const CONCURRENCY = 3;

type Manifest = Record<string, { url: string; savedAt: number }>;

async function readManifest(): Promise<Manifest> {
  try {
    const res = await Filesystem.readFile({
      path: MANIFEST_PATH,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    return JSON.parse(typeof res.data === 'string' ? res.data : '');
  } catch { return {}; }
}

async function writeManifest(m: Manifest) {
  try {
    await Filesystem.mkdir({ path: COVERS_DIR, directory: Directory.Data, recursive: true }).catch(() => {});
    await Filesystem.writeFile({
      path: MANIFEST_PATH,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
      data: JSON.stringify(m),
    });
  } catch { /* ignore */ }
}

async function downloadCover(postId: string, url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const blob = await res.blob();
    const base64: string = await new Promise((ok, err) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result).split(',')[1] || '');
      r.onerror = () => err(r.error);
      r.readAsDataURL(blob);
    });
    await Filesystem.writeFile({
      path: `${COVERS_DIR}/${postId}.png`,
      directory: Directory.Data,
      data: base64,
    });
    return true;
  } catch (e) {
    console.warn('[blogAssetsPrefetch] falhou', postId, e);
    return false;
  }
}

/** Retorna URI local file:// caso o arquivo exista, ou null. */
export async function getLocalCoverUri(postId: string): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const res = await Filesystem.getUri({
      path: `${COVERS_DIR}/${postId}.png`,
      directory: Directory.Data,
    });
    // Confirma existência
    await Filesystem.stat({ path: `${COVERS_DIR}/${postId}.png`, directory: Directory.Data });
    return Capacitor.convertFileSrc(res.uri);
  } catch { return null; }
}

let running = false;

export async function prefetchBlogCovers() {
  if (!Capacitor.isNativePlatform()) return;
  if (running) return;
  running = true;
  try {
    await Filesystem.mkdir({ path: COVERS_DIR, directory: Directory.Data, recursive: true }).catch(() => {});
    const manifest = await readManifest();

    // Consulta os últimos posts publicados (regular + editorial)
    const [{ data: edicao }, { data: hard }] = await Promise.all([
      supabase.from('blog_edicao_posts').select('id, imagem_url').eq('publicado', true).order('created_at', { ascending: false }).limit(MAX_POSTS),
      Promise.resolve({ data: [] as any[] }), // reservado pra `blogPosts` estáticos se um dia virarem tabela
    ]);
    const posts = [...(edicao || []), ...(hard || [])].filter(p => p.imagem_url).slice(0, MAX_POSTS);

    // Fila com concorrência limitada
    const queue = [...posts];
    async function worker() {
      while (queue.length) {
        const p = queue.shift()!;
        const cached = manifest[p.id];
        if (cached?.url === p.imagem_url) continue;
        const ok = await downloadCover(p.id, p.imagem_url);
        if (ok) manifest[p.id] = { url: p.imagem_url, savedAt: Date.now() };
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    await writeManifest(manifest);
  } finally {
    running = false;
  }
}

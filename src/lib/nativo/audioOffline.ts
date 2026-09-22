/**
 * Download offline de áudio (leis cantadas / audioaulas / narrações).
 * Nativo: grava o arquivo em Directory.Data e devolve a URI local para o
 * <audio> tocar sem internet. Web: no-op (retorna null e o player usa a URL remota).
 */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isNative = () => Capacitor.isNativePlatform();
const CHAVE_INDICE = 'audio_offline_indice_v1';
const PASTA = 'audio-offline';

export interface AudioOffline {
  id: string;
  titulo: string;
  subtitulo?: string;
  categoria: 'leis-cantadas' | 'audioaulas' | 'narracao' | 'outro';
  path: string;
  uri: string;
  bytes: number;
  urlOriginal: string;
  baixadoEm: number;
}

type Indice = Record<string, AudioOffline>;

let cache: Indice | null = null;
const ouvintes = new Set<() => void>();

function notificar() {
  ouvintes.forEach((fn) => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
  try {
    window.dispatchEvent(new Event('audio-offline:mudou'));
  } catch {
    /* noop */
  }
}

export function assinarAudioOffline(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

async function lerIndice(): Promise<Indice> {
  if (cache) return cache;
  try {
    const { value } = await Preferences.get({ key: CHAVE_INDICE });
    cache = value ? (JSON.parse(value) as Indice) : {};
  } catch {
    cache = {};
  }
  return cache;
}

async function salvarIndice(indice: Indice) {
  cache = indice;
  try {
    await Preferences.set({ key: CHAVE_INDICE, value: JSON.stringify(indice) });
  } catch {
    /* noop */
  }
  notificar();
}

function extensao(url: string) {
  const limpa = url.split('?')[0];
  const m = limpa.match(/\.(mp3|m4a|aac|ogg|wav|opus)$/i);
  return m ? m[1].toLowerCase() : 'mp3';
}

export const suportaAudioOffline = () => isNative();

/** Lista tudo que já está baixado, mais recente primeiro. */
export async function listarAudiosOffline(): Promise<AudioOffline[]> {
  const indice = await lerIndice();
  return Object.values(indice).sort((a, b) => b.baixadoEm - a.baixadoEm);
}

export async function estaBaixado(id: string): Promise<boolean> {
  const indice = await lerIndice();
  return Boolean(indice[id]);
}

/** URI local pronta para o player, ou null se não houver cópia offline. */
export async function uriLocal(id: string): Promise<string | null> {
  if (!isNative()) return null;
  const indice = await lerIndice();
  const item = indice[id];
  if (!item) return null;
  try {
    const { Capacitor: Cap } = await import('@capacitor/core');
    return Cap.convertFileSrc(item.uri);
  } catch {
    return item.uri;
  }
}

/** Resolve a melhor fonte disponível: arquivo local se existir, senão a URL remota. */
export async function fonteDeAudio(id: string, urlRemota: string): Promise<string> {
  const local = await uriLocal(id);
  return local ?? urlRemota;
}

export interface BaixarAudioOpts {
  id: string;
  url: string;
  titulo: string;
  subtitulo?: string;
  categoria?: AudioOffline['categoria'];
}

/** Baixa e guarda o áudio no aparelho. Retorna o registro ou null (web/erro). */
export async function baixarAudioOffline(opts: BaixarAudioOpts): Promise<AudioOffline | null> {
  if (!isNative()) return null;
  const indice = await lerIndice();
  if (indice[opts.id]) return indice[opts.id];

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const path = `${PASTA}/${opts.id}.${extensao(opts.url)}`;
    try {
      await Filesystem.mkdir({ path: PASTA, directory: Directory.Data, recursive: true });
    } catch {
      /* pasta já existe */
    }
    const res = await Filesystem.downloadFile({
      url: opts.url,
      path,
      directory: Directory.Data,
      recursive: true,
    });
    const uri = res.path ?? (await Filesystem.getUri({ path, directory: Directory.Data })).uri;
    let bytes = 0;
    try {
      const stat = await Filesystem.stat({ path, directory: Directory.Data });
      bytes = stat.size ?? 0;
    } catch {
      /* noop */
    }
    const registro: AudioOffline = {
      id: opts.id,
      titulo: opts.titulo,
      subtitulo: opts.subtitulo,
      categoria: opts.categoria ?? 'outro',
      path,
      uri,
      bytes,
      urlOriginal: opts.url,
      baixadoEm: Date.now(),
    };
    await salvarIndice({ ...indice, [opts.id]: registro });
    return registro;
  } catch (e) {
    console.warn('[audioOffline] falha no download', e);
    return null;
  }
}

export async function removerAudioOffline(id: string): Promise<void> {
  const indice = await lerIndice();
  const item = indice[id];
  if (!item) return;
  if (isNative()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      await Filesystem.deleteFile({ path: item.path, directory: Directory.Data });
    } catch {
      /* arquivo já removido */
    }
  }
  const copia = { ...indice };
  delete copia[id];
  await salvarIndice(copia);
}

export async function limparAudiosOffline(): Promise<void> {
  const indice = await lerIndice();
  for (const id of Object.keys(indice)) await removerAudioOffline(id);
}

/** Total ocupado em bytes. */
export async function tamanhoTotalOffline(): Promise<number> {
  const itens = await listarAudiosOffline();
  return itens.reduce((soma, i) => soma + (i.bytes || 0), 0);
}

export function formatarBytes(bytes: number): string {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

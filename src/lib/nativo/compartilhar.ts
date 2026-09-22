import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { copiar } from './copiar';
import { blobParaBase64 } from './baixarArquivo';

type Args = {
  titulo?: string;
  texto?: string;
  url?: string;
  /** Arquivo opcional (imagem/PDF gerado) a ser compartilhado. */
  arquivo?: { blob: Blob; nome: string };
};

function nomeSeguro(nome: string) {
  return nome.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_');
}

/**
 * Abre a folha de compartilhamento.
 * Nativo: @capacitor/share (folha do sistema, aceita arquivos).
 * Web: navigator.share; sem suporte, copia o conteúdo.
 */
export async function compartilhar({ titulo, texto, url, arquivo }: Args): Promise<boolean> {
  const conteudo = [texto, url].filter(Boolean).join('\n\n');

  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share');
      let files: string[] | undefined;
      if (arquivo) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { uri } = await Filesystem.writeFile({
          path: nomeSeguro(arquivo.nome),
          data: await blobParaBase64(arquivo.blob),
          directory: Directory.Cache,
          recursive: true,
        });
        files = [uri];
      }
      await Share.share({
        title: titulo,
        text: texto,
        url: files ? undefined : url,
        files,
        dialogTitle: titulo || 'Compartilhar',
      });
      return true;
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      if (/cancel/i.test(msg)) return false;
      console.error('Falha ao compartilhar no nativo:', e);
    }
  }

  // Web
  try {
    if (arquivo && typeof navigator !== 'undefined' && 'canShare' in navigator) {
      const file = new File([arquivo.blob], nomeSeguro(arquivo.nome), { type: arquivo.blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: titulo, text: texto, files: [file] });
        return true;
      }
    }
    if (navigator.share) {
      await navigator.share({ title: titulo, text: texto, url });
      return true;
    }
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    if (/abort|cancel/i.test(msg)) return false;
  }

  if (conteudo) {
    await copiar(conteudo, 'Link copiado para compartilhar');
    return true;
  }
  toast.error('Compartilhamento não disponível');
  return false;
}

/** Há folha de compartilhamento disponível? (sempre true no app nativo) */
export function podeCompartilhar(): boolean {
  return (
    Capacitor.isNativePlatform() ||
    (typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  );
}

/**
 * Compartilhamento com a API do sistema, aceitando o formato do Web Share API
 * ({ title, text, url }) para substituir chamadas a navigator.share.
 */
export async function compartilharNativo(opts: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<void> {
  await compartilhar({ titulo: opts.title, texto: opts.text, url: opts.url });
}

import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

/** Converte um Blob em base64 puro (sem o prefixo data:). */
export async function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => {
      const res = String(fr.result || '');
      const virgula = res.indexOf(',');
      resolve(virgula >= 0 ? res.slice(virgula + 1) : res);
    };
    fr.readAsDataURL(blob);
  });
}

function nomeSeguro(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_');
}

function baixarNaWeb(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type OpcoesDownload = {
  /** Título da folha de compartilhamento no app nativo. */
  titulo?: string;
  /** Mostra toast de sucesso (padrão: true). */
  toastSucesso?: boolean;
  /**
   * No app nativo, pergunta antes (menu do sistema: salvar em Documentos ou
   * compartilhar). Padrão: true. Passe false para ir direto ao compartilhar.
   */
  menu?: boolean;
};

/**
 * Salva um arquivo gerado no app.
 *
 * Nativo (Android/iOS): grava em Cache com @capacitor/filesystem e abre um menu
 * de ações do sistema (@capacitor/action-sheet) com "Salvar em Documentos" ou
 * "Compartilhar" (@capacitor/share). O clique programático em `<a download>` de
 * um blob não funciona no WebView — por isso o caminho nativo é obrigatório.
 *
 * Web/PWA: download normal do navegador.
 */
export async function baixarBlob(
  blob: Blob,
  nomeArquivo: string,
  opcoes: OpcoesDownload = {},
): Promise<void> {
  const nome = nomeSeguro(nomeArquivo);
  const { titulo, toastSucesso = true, menu = true } = opcoes;

  if (!Capacitor.isNativePlatform()) {
    baixarNaWeb(blob, nome);
    return;
  }

  try {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);

    const data = await blobParaBase64(blob);
    const { uri } = await Filesystem.writeFile({
      path: nome,
      data,
      directory: Directory.Cache,
      recursive: true,
    });

    // Objeto (não `let`) para o TS não estreitar o tipo dentro dos callbacks.
    const escolha: { acao: 'salvar' | 'compartilhar' } = { acao: 'compartilhar' };
    let cancelou = false;
    if (menu) {
      const { menuAcoes } = await import('./menuAcoes');
      let escolheu = false;
      const mostrou = await menuAcoes({
        titulo: titulo || nome,
        mensagem: 'O que fazer com este arquivo?',
        acoes: [
          { titulo: 'Salvar no dispositivo', onSelect: () => { escolha.acao = 'salvar'; escolheu = true; } },
          { titulo: 'Compartilhar', onSelect: () => { escolha.acao = 'compartilhar'; escolheu = true; } },
        ],
      });
      // Menu nativo exibido mas nenhuma ação escolhida = cancelou.
      cancelou = mostrou && !escolheu;
    }
    if (cancelou) return;

    if (escolha.acao === 'salvar') {
      await Filesystem.writeFile({
        path: nome,
        data,
        directory: Directory.Documents,
        recursive: true,
      });
      if (toastSucesso) toast.success('Salvo em Documentos');
      return;
    }

    await Share.share({
      title: titulo || nome,
      files: [uri],
      dialogTitle: titulo || 'Salvar ou compartilhar',
    });
    if (toastSucesso) toast.success('Arquivo pronto');
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    // Usuário fechou a folha de compartilhamento — não é erro.
    if (/cancel/i.test(msg)) return;
    console.error('Falha ao salvar arquivo no app nativo:', e);
    try {
      baixarNaWeb(blob, nome);
    } catch {
      toast.error('Não consegui salvar o arquivo');
    }
  }
}


/** Baixa um arquivo a partir de uma URL remota (áudio, imagem, PDF hospedado). */
export async function baixarUrl(
  url: string,
  nomeArquivo: string,
  opcoes: OpcoesDownload = {},
): Promise<void> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    await baixarBlob(await resp.blob(), nomeArquivo, opcoes);
  } catch (e) {
    console.error('Falha ao baixar URL:', e);
    toast.error('Não consegui baixar este arquivo');
  }
}

/** Salva uma imagem a partir de um dataURL (canvas.toDataURL). */
export async function baixarDataUrl(
  dataUrl: string,
  nomeArquivo: string,
  opcoes: OpcoesDownload = {},
): Promise<void> {
  const resp = await fetch(dataUrl);
  await baixarBlob(await resp.blob(), nomeArquivo, opcoes);
}

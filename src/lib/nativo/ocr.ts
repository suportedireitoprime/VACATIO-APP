/**
 * OCR nativo — ML Kit Document Scanner + Text Recognition (offline, no device).
 * Fallback web: retorna null para o chamador usar o fluxo antigo (foto + IA).
 */
import { Capacitor } from '@capacitor/core';

export interface LeituraOcr {
  /** Texto completo reconhecido. */
  texto: string;
  /** URI/base64 da primeira página escaneada (para thumbnail). */
  imagem?: string;
}

export const temOcrNativo = () => Capacitor.isNativePlatform();

/**
 * Abre o scanner de documentos nativo (recorte automático, filtros, várias páginas)
 * e devolve o texto reconhecido no aparelho.
 */
export async function escanearTexto(opts?: { paginas?: number }): Promise<LeituraOcr | null> {
  if (!temOcrNativo()) return null;
  try {
    const { DocumentScanner } = await import('@capacitor-mlkit/document-scanner');
    const { TextRecognition } = await import('@capacitor-mlkit/text-recognition');

    const { scannedImages } = await DocumentScanner.scanDocument({
      galleryImportAllowed: true,
      pageLimit: opts?.paginas ?? 3,
      resultFormats: 'JPEG',
      scannerMode: 'FULL',
    });

    if (!scannedImages?.length) return null;

    const partes: string[] = [];
    for (const path of scannedImages) {
      try {
        const { text } = await TextRecognition.processImage({ path });
        if (text?.trim()) partes.push(text.trim());
      } catch (e) {
        console.warn('[ocr] falha ao ler página', e);
      }
    }

    return { texto: partes.join('\n\n'), imagem: scannedImages[0] };
  } catch (e) {
    console.warn('[ocr] scanner nativo indisponível', e);
    return null;
  }
}

/** Reconhece texto de uma imagem já existente (caminho/URI nativo). */
export async function lerTextoDaImagem(path: string): Promise<string | null> {
  if (!temOcrNativo()) return null;
  try {
    const { TextRecognition } = await import('@capacitor-mlkit/text-recognition');
    const { text } = await TextRecognition.processImage({ path });
    return text?.trim() || null;
  } catch {
    return null;
  }
}

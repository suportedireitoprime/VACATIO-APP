import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export type FotoEscolhida = { blob: Blob; nome: string; dataUrl: string };

/**
 * Escolhe uma foto (câmera ou galeria).
 * Nativo: @capacitor/camera (galeria/câmera do sistema).
 * Web: retorna null — o chamador deve manter o <input type="file"> como fallback.
 */
export async function escolherFoto(origem: 'galeria' | 'camera' = 'galeria'): Promise<FotoEscolhida | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const foto = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: origem === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      promptLabelHeader: 'Foto',
      promptLabelPhoto: 'Escolher da galeria',
      promptLabelPicture: 'Tirar foto',
      promptLabelCancel: 'Cancelar',
    });
    const url = foto.webPath || foto.path;
    if (!url) return null;
    const resp = await fetch(url);
    const blob = await resp.blob();
    const ext = foto.format || 'jpeg';
    const dataUrl = await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ''));
      fr.readAsDataURL(blob);
    });
    return { blob, nome: `foto-${Date.now()}.${ext}`, dataUrl };
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    if (/cancel/i.test(msg)) return null;
    console.error('Falha ao escolher foto:', e);
    toast.error('Não consegui abrir a galeria');
    return null;
  }
}

/** Indica se o seletor nativo de fotos está disponível. */
export const temSeletorNativo = () => Capacitor.isNativePlatform();

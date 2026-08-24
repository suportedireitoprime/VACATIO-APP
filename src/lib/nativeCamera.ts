import { Capacitor } from '@capacitor/core';

/**
 * Wrapper da câmera nativa. Retorna base64 pronto pra enviar pro OCR
 * (Mistral / Tesseract) ou pra upload de PDF/foto na Biblioteca.
 */
type Source = 'camera' | 'photos' | 'prompt';

export interface TakePhotoOptions {
  source?: Source;      // default 'prompt' (deixa o usuário escolher)
  quality?: number;     // 0-100, default 80
  allowEditing?: boolean;
  width?: number;
  height?: number;
}

export interface PhotoResult {
  ok: boolean;
  base64?: string;      // sem prefixo data:
  dataUrl?: string;     // com prefixo data:image/...
  format?: string;      // 'jpeg' | 'png'
  reason?: string;
}

export async function takePhoto(opts: TakePhotoOptions = {}): Promise<PhotoResult> {
  if (!Capacitor.isNativePlatform()) return { ok: false, reason: 'not_native' };
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

    // Pede permissão explicitamente (o plugin também faz on-demand)
    try {
      const perm = await Camera.checkPermissions();
      if (perm.camera !== 'granted' || perm.photos !== 'granted') {
        await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      }
    } catch {}

    const source =
      opts.source === 'camera' ? CameraSource.Camera :
      opts.source === 'photos' ? CameraSource.Photos :
      CameraSource.Prompt;

    // Downsample defaults — o plugin @capacitor/camera decodifica o bitmap
    // inteiro em memória (IonCameraFlow.handleMediaResult). Passar
    // width/height + quality faz o plugin usar BitmapFactory.Options
    // com inSampleSize, reduzindo memória em 4-16x e evitando OOM em
    // fotos de 12MP+ que o Play Console flagged.
    const maxWidth  = opts.width  ?? 2048;
    const maxHeight = opts.height ?? 2048;
    const quality   = opts.quality ?? 70;

    const photo = await Camera.getPhoto({
      quality,
      allowEditing: opts.allowEditing ?? false,
      resultType: CameraResultType.Base64,
      source,
      width: maxWidth,
      height: maxHeight,
      correctOrientation: true,
    });

    const format = photo.format || 'jpeg';
    return {
      ok: true,
      base64: photo.base64String,
      dataUrl: photo.base64String ? `data:image/${format};base64,${photo.base64String}` : undefined,
      format,
    };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? 'unknown' };
  }
}

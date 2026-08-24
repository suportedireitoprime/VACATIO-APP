import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

const isNative = () => Capacitor.isNativePlatform();

export async function ensureScannerReady(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const sup = await BarcodeScanner.isSupported();
    if (!sup.supported) return false;
    const perm = await BarcodeScanner.checkPermissions();
    if (perm.camera === 'granted' || perm.camera === 'limited') return true;
    const req = await BarcodeScanner.requestPermissions();
    return req.camera === 'granted' || req.camera === 'limited';
  } catch {
    return false;
  }
}

export async function scanOnce(): Promise<string | null> {
  if (!isNative()) return null;
  const ok = await ensureScannerReady();
  if (!ok) throw new Error('Câmera não autorizada');
  // Ensure ML Kit module installed (Android)
  try {
    const mod = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (!mod.available) {
      await BarcodeScanner.installGoogleBarcodeScannerModule();
    }
  } catch {}
  const { barcodes } = await BarcodeScanner.scan({
    formats: [BarcodeFormat.QrCode, BarcodeFormat.Code128, BarcodeFormat.Ean13],
  });
  return barcodes?.[0]?.rawValue ?? null;
}

/**
 * Handles a scanned vacatio:// deep link.
 * Formats aceitos:
 *   vacatio://study/<lei>/<artigo>
 *   vacatio://coupon/<code>
 *   vacatio://room/<id>
 * Retorna a rota interna para navigate() ou null.
 */
export function resolveScannedLink(raw: string): { path: string; toast?: string } | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) {
    return { path: s };
  }
  const m = s.match(/^vacatio:\/\/([^/]+)\/?(.*)$/i);
  if (!m) return null;
  const [, kind, rest] = m;
  if (kind === 'study') {
    const [lei, artigo] = rest.split('/');
    if (!lei) return null;
    return { path: `/categoria/${lei}${artigo ? `?art=${artigo}` : ''}` };
  }
  if (kind === 'coupon') {
    return { path: `/premium?coupon=${encodeURIComponent(rest)}`, toast: 'Cupom aplicado!' };
  }
  if (kind === 'room') {
    return { path: `/estudos?room=${encodeURIComponent(rest)}`, toast: 'Entrando na sala de estudo' };
  }
  return null;
}

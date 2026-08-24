// Deriva ícones/splash a partir de uma imagem-base 1024×1024.
// Retorna Blobs prontos para upload.

const canvasBlob = (canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> =>
  new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), type));

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });

export type Variants = {
  icon: Blob;
  iconForeground: Blob;
  iconBackground: Blob;
  splash: Blob;
  splashDark: Blob;
  notificationIcon: Blob;
};

/**
 * Gera todas as variantes a partir de uma imagem-fonte 1024×1024.
 * - icon.png: imagem completa em fundo escuro
 * - icon-foreground.png: logo centralizado a 66% em transparência (adaptive)
 * - icon-background.png: cor sólida (bg)
 * - splash.png: logo pequeno centralizado em 2732×2732 (bg escuro)
 * - splash-dark.png: idem com bg escuro (padrão)
 * - notification-icon.png: 96×96 monocromático branco transparente
 */
export async function generateVariants(source: File, bg = '#EFE039'): Promise<Variants> {
  const url = URL.createObjectURL(source);
  try {
    const img = await loadImage(url);

    // icon (1024)
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 1024; iconCanvas.height = 1024;
    const ic = iconCanvas.getContext('2d')!;
    ic.fillStyle = bg;
    ic.fillRect(0, 0, 1024, 1024);
    ic.drawImage(img, 0, 0, 1024, 1024);
    const icon = await canvasBlob(iconCanvas);

    // adaptive foreground — logo centralizado a 66%
    const fgCanvas = document.createElement('canvas');
    fgCanvas.width = 1024; fgCanvas.height = 1024;
    const fg = fgCanvas.getContext('2d')!;
    fg.clearRect(0, 0, 1024, 1024);
    const size = Math.floor(1024 * 0.66);
    const off = Math.floor((1024 - size) / 2);
    fg.drawImage(img, off, off, size, size);
    const iconForeground = await canvasBlob(fgCanvas);

    // adaptive background — cor sólida
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 1024; bgCanvas.height = 1024;
    const bc = bgCanvas.getContext('2d')!;
    bc.fillStyle = bg;
    bc.fillRect(0, 0, 1024, 1024);
    const iconBackground = await canvasBlob(bgCanvas);

    // splash 2732 (bg escuro + logo 25%)
    const splashCanvas = document.createElement('canvas');
    splashCanvas.width = 2732; splashCanvas.height = 2732;
    const sc = splashCanvas.getContext('2d')!;
    sc.fillStyle = bg;
    sc.fillRect(0, 0, 2732, 2732);
    const lsize = Math.floor(2732 * 0.25);
    const loff = Math.floor((2732 - lsize) / 2);
    sc.drawImage(img, loff, loff, lsize, lsize);
    const splash = await canvasBlob(splashCanvas);
    const splashDark = splash; // mesmo (tema escuro é o padrão)

    // notification icon 96×96, branco monocromático transparente
    const notiCanvas = document.createElement('canvas');
    notiCanvas.width = 96; notiCanvas.height = 96;
    const nc = notiCanvas.getContext('2d')!;
    nc.clearRect(0, 0, 96, 96);
    nc.drawImage(img, 8, 8, 80, 80);
    const data = nc.getImageData(0, 0, 96, 96);
    // converter para branco: alpha vira alpha original, rgb=255
    for (let i = 0; i < data.data.length; i += 4) {
      const a = data.data[i + 3];
      if (a > 0) {
        // usar luminância pra decidir alpha final (transparente = fundo)
        const lum = (data.data[i] * 0.299 + data.data[i + 1] * 0.587 + data.data[i + 2] * 0.114) / 255;
        data.data[i] = 255;
        data.data[i + 1] = 255;
        data.data[i + 2] = 255;
        data.data[i + 3] = Math.floor(a * (0.3 + 0.7 * (1 - lum)));
      }
    }
    nc.putImageData(data, 0, 0);
    const notificationIcon = await canvasBlob(notiCanvas);

    return { icon, iconForeground, iconBackground, splash, splashDark, notificationIcon };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).replace(/^data:[^;]+;base64,/, ''));
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });

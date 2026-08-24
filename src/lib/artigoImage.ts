import html2canvas from 'html2canvas';
import brasaoUrl from '@/assets/brasao-republica.webp';
import type { ArtigoPdfInput, ArtigoPdfModo } from './artigoPdf';

const APP_NAME = 'Vacatio — Vade Mecum';
const APP_URL = 'vacatio.com.br';
const LOGO_URL = '/icon-512.png';
const YELLOW = '#EFE039';
const GRAY_DARK = '#2D2D30';
const GRAY_MID = '#5A5C62';
const GRAY_SOFT = '#EBECF0';
const TEXT = '#1E1E22';

function stripMd(text: string): string {
  return text
    .replace(/---SECAO---|---EXEMPLO---/g, '\n\n')
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function slug(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60);
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function paragraphs(text: string): string {
  return stripMd(text)
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin:0 0 12px 0;line-height:1.55;">${esc(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

export type ArtigoImageInput = ArtigoPdfInput;

export async function gerarArtigoImage(data: ArtigoImageInput) {
  const width = 1080; // Instagram-like feed width
  // Build HTML
  const modoLabel = data.modo === 'lei-seca' ? 'Lei seca' : 'Artigo comentado';

  const body: string[] = [];
  body.push(`<h3 style="font-size:22px;font-weight:800;color:${GRAY_DARK};margin:0 0 8px 0;letter-spacing:0.5px;text-transform:uppercase;">Texto do artigo</h3>`);
  body.push(`<div style="height:2px;background:${GRAY_SOFT};margin:0 0 14px 0;"></div>`);
  body.push(`<p style="font-size:26px;line-height:1.5;color:${TEXT};margin:0 0 12px 0;font-weight:600;">${esc(data.caput)}</p>`);
  for (const inc of data.incisos || []) {
    body.push(`<p style="font-size:22px;line-height:1.5;color:${TEXT};margin:0 0 10px 0;">${esc(inc)}</p>`);
  }
  for (const par of data.paragrafos || []) {
    body.push(`<p style="font-size:22px;line-height:1.5;color:${TEXT};margin:0 0 10px 0;">${esc(par)}</p>`);
  }

  if (data.modo === 'completo') {
    if (data.explicacao) {
      body.push(`<div style="height:24px"></div>`);
      body.push(`<h3 style="font-size:22px;font-weight:800;color:${GRAY_DARK};margin:0 0 8px 0;letter-spacing:0.5px;text-transform:uppercase;">Explicação</h3>`);
      body.push(`<div style="height:2px;background:${GRAY_SOFT};margin:0 0 14px 0;"></div>`);
      body.push(`<div style="font-size:22px;color:${TEXT};">${paragraphs(data.explicacao)}</div>`);
    }
    if (data.exemplo) {
      body.push(`<div style="height:24px"></div>`);
      body.push(`<h3 style="font-size:22px;font-weight:800;color:${GRAY_DARK};margin:0 0 8px 0;letter-spacing:0.5px;text-transform:uppercase;">Exemplo prático</h3>`);
      body.push(`<div style="height:2px;background:${GRAY_SOFT};margin:0 0 14px 0;"></div>`);
      body.push(`<div style="font-size:22px;color:${TEXT};">${paragraphs(data.exemplo)}</div>`);
    }
    if (data.historico && data.historico.length > 0) {
      body.push(`<div style="height:24px"></div>`);
      body.push(`<h3 style="font-size:22px;font-weight:800;color:${GRAY_DARK};margin:0 0 8px 0;letter-spacing:0.5px;text-transform:uppercase;">Histórico</h3>`);
      body.push(`<div style="height:2px;background:${GRAY_SOFT};margin:0 0 14px 0;"></div>`);
      for (const h of data.historico) {
        const prefix = h.ano > 0 ? `<strong style="color:${GRAY_DARK}">${h.ano} — </strong>` : '';
        body.push(`<p style="font-size:22px;line-height:1.5;color:${TEXT};margin:0 0 10px 0;">${prefix}${esc(h.texto)}</p>`);
      }
    }
  }

  const html = `
    <div style="width:${width}px;background:${GRAY_SOFT};font-family:Helvetica,Arial,sans-serif;color:${TEXT};position:relative;overflow:hidden;">
      <!-- Header amarelo -->
      <div style="background:${YELLOW};padding:44px 56px 36px 56px;display:flex;align-items:center;gap:24px;position:relative;">
        <img src="${LOGO_URL}" style="width:96px;height:96px;border-radius:20px;object-fit:contain;background:#fff;padding:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);" crossorigin="anonymous" />
        <div style="flex:1;">
          <div style="font-size:30px;font-weight:800;color:${GRAY_DARK};letter-spacing:0.3px;">${esc(APP_NAME)}</div>
          <div style="font-size:20px;color:${GRAY_DARK};opacity:0.75;margin-top:4px;">${modoLabel} • ${APP_URL}</div>
        </div>
      </div>
      <div style="height:3px;background:${GRAY_DARK};"></div>

      <!-- Corpo -->
      <div style="padding:48px 56px 32px 56px;position:relative;">
        <img src="${brasaoUrl}" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:520px;height:520px;object-fit:contain;opacity:0.05;pointer-events:none;" crossorigin="anonymous" />

        <div style="position:relative;z-index:2;">
          <div style="font-size:56px;font-weight:900;color:${TEXT};line-height:1.05;margin:0 0 6px 0;">Art. ${esc(data.numero)}</div>
          <div style="font-size:22px;color:${GRAY_MID};font-style:italic;margin:0 0 10px 0;">${esc(data.leiLabel)}</div>
          <div style="width:80px;height:6px;background:${YELLOW};border-radius:3px;margin:0 0 28px 0;"></div>

          ${body.join('')}
        </div>
      </div>

      <!-- Footer -->
      <div style="background:${GRAY_DARK};color:#fff;padding:28px 56px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:20px;font-weight:700;">Baixe o app</div>
          <div style="font-size:16px;opacity:0.75;margin-top:2px;">${APP_URL}</div>
        </div>
        <div style="display:flex;gap:12px;">
          <div style="background:${YELLOW};color:${GRAY_DARK};padding:10px 20px;border-radius:8px;font-size:16px;font-weight:800;">App Store</div>
          <div style="background:${YELLOW};color:${GRAY_DARK};padding:10px 20px;border-radius:8px;font-size:16px;font-weight:800;">Google Play</div>
        </div>
      </div>
    </div>
  `;

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.style.pointerEvents = 'none';
  host.innerHTML = html;
  document.body.appendChild(host);

  // Espera imagens carregarem
  const imgs = Array.from(host.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if ((img as HTMLImageElement).complete) return resolve();
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        })
    )
  );

  try {
    const canvas = await html2canvas(host.firstElementChild as HTMLElement, {
      backgroundColor: '#EBECF0',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    await new Promise<void>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return resolve();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slug(data.leiLabel)}-art-${slug(data.numero)}-${data.modo}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      }, 'image/png');
    });
  } finally {
    host.remove();
  }
}

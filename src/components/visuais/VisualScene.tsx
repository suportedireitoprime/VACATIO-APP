import { useMemo } from 'react';
import { buildScene, PALETA, type Scene, type SceneNode } from '@/lib/visuaisJuridicos/layout';
import type { VisualContent, VisualEstilo } from '@/lib/visuaisJuridicos/types';

const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

function renderNode(node: SceneNode, i: number) {
  switch (node.k) {
    case 'rect':
      return (
        <rect
          key={i}
          x={node.x}
          y={node.y}
          width={node.w}
          height={node.h}
          rx={node.r ?? 0}
          fill={node.fill ?? 'none'}
          stroke={node.stroke ?? 'none'}
          strokeWidth={node.sw ?? 0}
        />
      );
    case 'circle':
      return (
        <circle
          key={i}
          cx={node.cx}
          cy={node.cy}
          r={node.r}
          fill={node.fill ?? 'none'}
          stroke={node.stroke ?? 'none'}
          strokeWidth={node.sw ?? 0}
        />
      );
    case 'path':
      return (
        <path
          key={i}
          d={node.d}
          fill={node.fill ?? 'none'}
          stroke={node.stroke ?? PALETA.ink}
          strokeWidth={node.sw ?? 2}
          strokeDasharray={node.dash}
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={node.transform}
          opacity={node.opacity}
          markerEnd={node.arrow ? 'url(#vj-arrow)' : undefined}
        />
      );

    default:
      return (
        <text
          key={i}
          x={node.x}
          y={node.y}
          fontSize={node.size}
          fontWeight={node.weight ?? 400}
          fill={node.fill ?? PALETA.ink}
          textAnchor={node.anchor ?? 'start'}
          fontFamily={node.serif ? SERIF : SANS}
          fontStyle={node.italic ? 'italic' : undefined}
          letterSpacing={node.spacing}
        >
          {node.text}
        </text>
      );
  }
}

export function sceneToSvgMarkup(scene: Scene, estilo: VisualEstilo): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // Em atributos XML as aspas duplas da pilha de fontes precisam ser escapadas,
  // senão o SVG fica inválido e a exportação (PNG/PDF) falha ao carregar.
  const fam = (serif?: boolean) => esc(serif ? SERIF : SANS);

  const body = scene.nodes
    .map((n) => {
      if (n.k === 'rect')
        return `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.r ?? 0}" fill="${n.fill ?? 'none'}" stroke="${n.stroke ?? 'none'}" stroke-width="${n.sw ?? 0}"/>`;
      if (n.k === 'circle')
        return `<circle cx="${n.cx}" cy="${n.cy}" r="${n.r}" fill="${n.fill ?? 'none'}" stroke="${n.stroke ?? 'none'}" stroke-width="${n.sw ?? 0}"/>`;
      if (n.k === 'path')
        return `<path d="${n.d}" fill="${n.fill ?? 'none'}" stroke="${n.stroke ?? PALETA.ink}" stroke-width="${n.sw ?? 2}" stroke-linecap="round" stroke-linejoin="round"${n.transform ? ` transform="${n.transform}"` : ''}${n.opacity !== undefined ? ` opacity="${n.opacity}"` : ''}${n.dash ? ` stroke-dasharray="${n.dash}"` : ''}${n.arrow ? ' marker-end="url(#vj-arrow)"' : ''}/>`;

      return `<text x="${n.x}" y="${n.y}" font-size="${n.size}" font-weight="${n.weight ?? 400}" fill="${n.fill ?? PALETA.ink}" text-anchor="${n.anchor ?? 'start'}" font-family="${fam(n.serif)}"${n.italic ? ' font-style="italic"' : ''}${n.spacing ? ` letter-spacing="${n.spacing}"` : ''}>${esc(n.text)}</text>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.w} ${scene.h}" width="${scene.w}" height="${scene.h}"><defs><marker id="vj-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${PALETA.wine}"/></marker><filter id="vj-rough"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter></defs><g${estilo === 'rascunho' ? ' filter="url(#vj-rough)"' : ''}>${body}</g></svg>`;
}

interface Props {
  content: VisualContent;
  estilo?: VisualEstilo;
  className?: string;
}

/** Renderiza o visual como SVG — nítido em qualquer zoom e na exportação. */
export default function VisualScene({ content, estilo = 'limpo', className }: Props) {
  const scene = useMemo(() => buildScene(content), [content]);
  return (
    <svg
      viewBox={`0 0 ${scene.w} ${scene.h}`}
      className={className}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label={content.titulo}
    >
      <defs>
        <marker id="vj-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={PALETA.wine} />
        </marker>
        <filter id="vj-rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={2} seed={7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={2.2} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter={estilo === 'rascunho' ? 'url(#vj-rough)' : undefined}>{scene.nodes.map(renderNode)}</g>
    </svg>
  );
}

/** Renderiza o visual num canvas de alta resolução. */
async function renderCanvas(content: VisualContent, estilo: VisualEstilo) {
  const scene = buildScene(content);
  const markup = sceneToSvgMarkup(scene, estilo);
  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('falha ao renderizar'));
      img.src = url;
    });
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = scene.w * scale;
    canvas.height = scene.h * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas indisponível');
    ctx.fillStyle = PALETA.paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { canvas, scene };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Salva/compartilha o arquivo: nativo via Filesystem + Share, web via link de blob. */
async function entregarArquivo(dataUrl: string, nomeArquivo: string, mime: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const nativo = (window as any)?.Capacitor?.isNativePlatform?.() === true;

  if (nativo) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const escrito = await Filesystem.writeFile({
      path: nomeArquivo,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({ title: nomeArquivo, files: [escrito.uri] });
    return;
  }

  // Web: converte para Blob (evita limite de tamanho de URLs data:).
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = nomeArquivo;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
}

/** Exporta o visual em PDF (página ajustada ao formato do visual). */
export async function exportarPdf(content: VisualContent, estilo: VisualEstilo, nome: string) {
  const { canvas } = await renderCanvas(content, estilo);
  const { default: JsPDF } = await import('jspdf');
  const w = canvas.width / 2;
  const h = canvas.height / 2;
  const pdf = new JsPDF({ orientation: w >= h ? 'landscape' : 'portrait', unit: 'pt', format: [w, h] });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
  const dataUrl = pdf.output('datauristring');
  await entregarArquivo(dataUrl, `${nome}.pdf`, 'application/pdf');
  void espelhar(content, dataUrl, 'application/pdf');
}

/** Exporta o visual em PNG de alta resolução. */
export async function exportarPng(content: VisualContent, estilo: VisualEstilo, nome: string) {
  const { canvas } = await renderCanvas(content, estilo);
  const dataUrl = canvas.toDataURL('image/png');
  await entregarArquivo(dataUrl, `${nome}.png`, 'image/png');
  void espelhar(content, dataUrl, 'image/png');
}

/** Envia uma cópia do arquivo para a pasta do Google Drive (best-effort). */
async function espelhar(content: VisualContent, dataUrl: string, mime: string) {
  // Omitido no Vacatio App
}



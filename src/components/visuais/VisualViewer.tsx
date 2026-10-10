import { useEffect, useRef, useState } from 'react';
import { Download, FileImage, FileText, Loader2, PenTool, Sparkles, Square, X } from 'lucide-react';
import VisualScene, { exportarPdf, exportarPng } from './VisualScene';
import type { VisualContent, VisualEstilo, VisualRecord } from '@/lib/visuaisJuridicos/types';
import { TIPO_INFO } from '@/lib/visuaisJuridicos/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface Props {
  registro: VisualRecord;
  onClose: () => void;
}

/** Visualizador com zoom/pan por gesto, alternância de estilo e download em PNG ou PDF. */
export default function VisualViewer({ registro, onClose }: Props) {
  useBodyScrollLock(true);
  const [estilo, setEstilo] = useState<VisualEstilo>('limpo');
  const [zoom, setZoom] = useState(1);
  const [baixando, setBaixando] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const content = registro.conteudo as VisualContent;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Zoom por roda do mouse / pinça do trackpad, proporcional ao delta.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      setZoom((z) => Math.min(4, Math.max(1, +(z * Math.exp(-dy * 0.0018)).toFixed(3))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);


  const baixar = async (formato: 'png' | 'pdf') => {
    setBaixando(true);
    try {
      const nome = `${registro.tipo}-${registro.item_key.replace(/[^a-z0-9]+/gi, '-')}`;
      if (formato === 'pdf') await exportarPdf(content, estilo, nome);
      else await exportarPng(content, estilo, nome);
      toast.success(formato === 'pdf' ? 'PDF salvo' : 'Imagem salva');
    } catch {
      toast.error('Não foi possível gerar o arquivo');
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:py-4">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 py-0.5">
          <p className="line-clamp-1 text-base font-semibold leading-snug">
            {TIPO_INFO[registro.tipo].label}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {registro.item_label}
          </p>
        </div>
        <button
          onClick={() => setEstilo((e) => (e === 'limpo' ? 'rascunho' : 'limpo'))}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 text-xs font-semibold sm:text-sm"
        >
          {estilo === 'limpo' ? <Square className="h-3.5 w-3.5" /> : <PenTool className="h-3.5 w-3.5" />}
          {estilo === 'limpo' ? 'Limpo' : 'Rascunho'}
        </button>
      </header>

      <div ref={wrapRef} className="flex-1 overflow-auto bg-muted/40 p-2 sm:p-3">
        <div style={{ width: `${zoom * 100}%`, transition: 'width .18s ease' }} className="mx-auto">
          <div className="overflow-hidden rounded-xl shadow-lg">
            <VisualScene content={content} estilo={estilo} />
          </div>
        </div>
      </div>

      <footer className="flex items-center gap-2 border-t border-border px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-1 rounded-full border border-border px-1">
          <button className="px-3 py-1.5 text-lg leading-none" aria-label="Diminuir zoom" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}>
            −
          </button>
          <span className="w-10 text-center text-xs font-semibold">{Math.round(zoom * 100)}%</span>
          <button className="px-3 py-1.5 text-lg leading-none" aria-label="Aumentar zoom" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}>
            +
          </button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={baixando} className="ml-auto gap-2">
              {baixando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[80]">
            <DropdownMenuItem onSelect={() => baixar('pdf')} className="gap-2">
              <FileText className="h-4 w-4" /> PDF
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => baixar('png')} className="gap-2">
              <FileImage className="h-4 w-4" /> PNG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </footer>

      <p className="sr-only">
        <Sparkles className="h-3 w-3" /> Visual gerado automaticamente e compartilhado com todos os usuários.
      </p>
    </div>
  );
}


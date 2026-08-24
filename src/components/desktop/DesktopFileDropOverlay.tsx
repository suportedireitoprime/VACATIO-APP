/**
 * Overlay global de arrastar-e-soltar arquivos (Fase 8).
 *
 * Ativo apenas no desktop (≥1024px). Detecta arrastar arquivo do sistema
 * operacional para dentro da janela e dispara ação por tipo:
 *   • áudio  → navega para /anotacoes-audio com o arquivo (event bus)
 *   • pdf    → navega para /bibliotecas com o arquivo (event bus)
 *   • outros → mostra toast informando que o formato não é suportado ainda
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileAudio, FileText, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useIsDesktop } from '@/hooks/use-desktop';

export const DESKTOP_FILE_DROP_EVENT = 'desktop:file-drop';

export function dispatchDesktopFileDrop(file: File, target: 'audio' | 'pdf') {
  window.dispatchEvent(
    new CustomEvent(DESKTOP_FILE_DROP_EVENT, { detail: { file, target } }),
  );
}

function classify(file: File): 'audio' | 'pdf' | 'unknown' {
  const t = (file.type || '').toLowerCase();
  const name = file.name.toLowerCase();
  if (t.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|opus|aac|flac|webm)$/.test(name)) return 'audio';
  if (t === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  return 'unknown';
}

export default function DesktopFileDropOverlay() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!isDesktop) return;
    let counter = 0;

    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes('Files');

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      counter += 1;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onLeave = () => {
      counter = Math.max(0, counter - 1);
      if (counter === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      counter = 0;
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      const kind = classify(file);
      if (kind === 'audio') {
        toast.success('Áudio recebido — abrindo transcrição…', {
          description: file.name,
          icon: <FileAudio className="w-4 h-4" />,
        });
        dispatchDesktopFileDrop(file, 'audio');
        navigate('/anotacoes-audio', { state: { droppedFile: true } });
      } else if (kind === 'pdf') {
        toast.success('PDF recebido — abrindo Biblioteca…', {
          description: file.name,
          icon: <FileText className="w-4 h-4" />,
        });
        dispatchDesktopFileDrop(file, 'pdf');
        navigate('/bibliotecas', { state: { droppedFile: true } });
      } else {
        toast.error('Formato não suportado', {
          description: 'Solte um arquivo de áudio (MP3, M4A, WAV) ou PDF.',
        });
      }
    };

    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [isDesktop, navigate]);

  if (!isDesktop) return null;

  return (
    <AnimatePresence>
      {dragging && (
        <motion.div
          key="drop-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center bg-background/80 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={{ scale: 0.94, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="rounded-3xl border-2 border-dashed border-primary bg-card px-10 py-8 shadow-2xl flex flex-col items-center gap-3 max-w-md text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg text-foreground">Solte o arquivo aqui</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Áudio de aula (MP3, M4A, WAV) para transcrever, ou PDF para a sua Biblioteca.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1"><FileAudio className="w-3.5 h-3.5" /> Áudio</span>
              <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> PDF</span>
              <span className="inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Outros</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

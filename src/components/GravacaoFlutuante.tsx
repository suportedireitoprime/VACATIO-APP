import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, Pause, Play, Square, X } from 'lucide-react';
import { useRecording, formatHms } from '@/contexts/RecordingContext';

/** Card flutuante global mostrado enquanto uma gravação de aula está ativa. */
export function GravacaoFlutuante() {
  const { status, elapsedMs, title, pause, resume, stop, cancel } = useRecording();
  const navigate = useNavigate();
  const location = useLocation();

  if (status === 'idle') return null;
  // Não mostra na própria tela de gravação — lá o controle já está em destaque
  if (location.pathname.startsWith('/anotacoes/audio')) return null;

  const isRec = status === 'recording';
  const isSaving = status === 'saving';

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-3 rounded-full border border-primary/40 bg-background/90 px-3 py-2 shadow-xl backdrop-blur-md"
      style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + 84px)` }}
      role="status"
      aria-label="Gravação de aula em andamento"
    >
      <button
        onClick={() => navigate('/anotacoes/audio')}
        className="flex items-center gap-2 pr-1 text-left"
      >
        <span className={`relative flex h-3 w-3`}>
          {isRec && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />}
          <span className={`relative inline-flex rounded-full h-3 w-3 ${isRec ? 'bg-destructive' : 'bg-muted-foreground'}`} />
        </span>
        <span className="text-xs">
          <span className="block font-mono font-semibold tabular-nums">{formatHms(elapsedMs)}</span>
          <span className="block max-w-[120px] truncate text-[10px] text-muted-foreground">{title || 'Aula'}</span>
        </span>
      </button>

      {isSaving ? (
        <span className="text-xs text-muted-foreground pr-2">salvando…</span>
      ) : (
        <div className="flex items-center gap-1">
          {isRec ? (
            <button aria-label="Pausar" onClick={pause} className="rounded-full p-2 hover:bg-muted">
              <Pause className="h-4 w-4" />
            </button>
          ) : (
            <button aria-label="Retomar" onClick={resume} className="rounded-full p-2 hover:bg-muted">
              <Play className="h-4 w-4" />
            </button>
          )}
          <button aria-label="Parar e salvar" onClick={() => stop()} className="rounded-full bg-primary p-2 text-primary-foreground">
            <Square className="h-4 w-4" />
          </button>
          <button aria-label="Descartar" onClick={cancel} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

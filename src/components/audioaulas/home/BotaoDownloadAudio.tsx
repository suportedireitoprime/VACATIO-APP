import React, { useState, useEffect } from 'react';
import { Download, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { type AulaAudio, audioIdOf } from '@/contexts/AudioaulasPlayerContext';
import {
  baixarAudioOffline,
  removerAudioOffline,
  estaBaixado,
  suportaAudioOffline,
  assinarAudioOffline,
} from '@/lib/nativo/audioOffline';

export const BotaoDownloadAudio = React.memo(function BotaoDownloadAudio({ 
  aula, 
  grande = false 
}: { 
  aula: AulaAudio; 
  grande?: boolean 
}) {
  const id = audioIdOf(aula);
  const [baixado, setBaixado] = useState(false);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    const checar = () => {
      void estaBaixado(id).then(setBaixado);
    };
    checar();
    return assinarAudioOffline(checar);
  }, [id]);

  if (!suportaAudioOffline() || !aula.url_audio) return null;

  const alternar = async () => {
    if (baixado) {
      await removerAudioOffline(id);
      toast.success('Download removido');
      return;
    }
    setBaixando(true);
    const ok = await baixarAudioOffline({
      id,
      url: aula.url_audio!,
      titulo: aula.titulo,
      subtitulo: aula.tema || aula.area,
      categoria: 'audioaulas',
    });
    setBaixando(false);
    toast[ok ? 'success' : 'error'](ok ? 'Aula disponível offline' : 'Não foi possível baixar');
  };

  const size = grande ? 'h-11 w-11' : 'h-8 w-8';
  const icon = grande ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        void alternar();
      }}
      disabled={baixando}
      aria-label={baixado ? 'Remover download' : 'Baixar aula'}
      className={`${size} grid place-items-center rounded-full shrink-0 transition hover:bg-white/10 active:opacity-70 disabled:opacity-60 ${
        grande ? 'border border-white/10 bg-white/10 backdrop-blur' : ''
      }`}
    >
      {baixando ? (
        <Loader2 className={`${icon} animate-spin text-muted-foreground`} />
      ) : baixado ? (
        <Check className={`${icon} text-emerald-400`} />
      ) : (
        <Download className={`${icon} text-muted-foreground`} />
      )}
    </button>
  );
});

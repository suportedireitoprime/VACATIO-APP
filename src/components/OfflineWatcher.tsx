import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Avisa o usuário assim que o aparelho perde ou recupera a conexão.
 * Montado uma única vez no App.
 */
const OfflineWatcher = () => {
  const online = useOnlineStatus();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (!online) {
        toast.warning('Você está sem internet', {
          description: 'As leis, anotações e downloads continuam funcionando normalmente.',
          duration: 6000,
        });
      }
      return;
    }
    if (online) {
      toast.success('Conexão restabelecida', { duration: 3000 });
    } else {
      toast.warning('Você está sem internet', {
        description: 'Funções com IA, vídeo e conteúdo novo ficam indisponíveis até reconectar.',
        duration: 6000,
      });
    }
  }, [online]);

  return null;
};

export default OfflineWatcher;

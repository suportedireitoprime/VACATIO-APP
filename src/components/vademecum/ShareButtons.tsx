import { WhatsappShareButton, TelegramShareButton, WhatsappIcon, TelegramIcon } from 'react-share';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildSmartLink } from '@/lib/nativeDeepLinks';

interface ShareButtonsProps {
  artigoNumero: string;
  artigoTexto: string;
  leiNome?: string;
  leiSlug?: string;
}

const ShareButtons = ({ artigoNumero, artigoTexto, leiNome, leiSlug }: ShareButtonsProps) => {
  const text = `Art. ${artigoNumero}${leiNome ? ` do ${leiNome}` : ''}\n\n${artigoTexto.slice(0, 300)}${artigoTexto.length > 300 ? '…' : ''}\n\nvia Vacatio - Vade Mecum`;
  const url = leiSlug
    ? buildSmartLink('lei', { slug: leiSlug, artigo: artigoNumero })
    : (typeof window !== 'undefined' ? window.location.href : '');

  const handleNativeShare = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title: `Art. ${artigoNumero}`, text, url, dialogTitle: 'Compartilhar artigo' });
        return;
      }
    } catch {/* fall through */}
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: `Art. ${artigoNumero}`, text, url });
        return;
      } catch {/* user cancelled or unsupported */}
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success('Link copiado', { position: 'top-center' });
    } catch {
      toast.error('Compartilhamento indisponível', { position: 'top-center' });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleNativeShare}
        aria-label="Compartilhar via sistema"
        className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
      >
        <Share2 className="w-4 h-4" />
      </button>
      <WhatsappShareButton url={url} title={text}>
        <WhatsappIcon size={32} round />
      </WhatsappShareButton>
      <TelegramShareButton url={url} title={text}>
        <TelegramIcon size={32} round />
      </TelegramShareButton>
    </div>
  );
};

export default ShareButtons;

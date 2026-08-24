import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Type, Mic, FileText, Image as ImageIcon } from 'lucide-react';
import { haptic } from '@/lib/nativeHaptics';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import HorusPremiumFeatureSheet, { type HorusCapabilityKey } from './HorusPremiumFeatureSheet';

interface Cap {
  key: HorusCapabilityKey;
  label: string;
  icon: any;
  premium: boolean;
  description: string;
  hex: string;
}

const CAPS: Cap[] = [
  { key: 'texto',  label: 'Texto',  icon: Type,      premium: false, description: 'Receber e responder mensagens de texto no WhatsApp.', hex: '#0EA5E9' },
  { key: 'audio',  label: 'Áudio',  icon: Mic,       premium: true,  description: 'Transcrever e entender áudios enviados no WhatsApp.', hex: '#22C55E' },
  { key: 'pdf',    label: 'PDF',    icon: FileText,  premium: true,  description: 'Ler e analisar arquivos PDF enviados no chat.', hex: '#EC4899' },
  { key: 'imagem', label: 'Imagem', icon: ImageIcon, premium: true,  description: 'Interpretar fotos, prints e documentos por imagem.', hex: '#8B5CF6' },
];

const STORAGE_KEY = 'horus_capabilities_v1';
const DEFAULTS: Record<HorusCapabilityKey, boolean> = { texto: true, audio: false, pdf: false, imagem: false };

interface Props {
  isVerified: boolean;
  isPremium: boolean;
  onRequestVerify: () => void;
}

export default function HorusCapabilitiesRow({ isVerified, isPremium, onRequestVerify }: Props) {
  const [enabled, setEnabled] = useState<Record<HorusCapabilityKey, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULTS;
  });
  const [premiumSheet, setPremiumSheet] = useState<HorusCapabilityKey | null>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled)); } catch {}
  }, [enabled]);

  function handleToggle(cap: Cap) {
    haptic.selection();
    if (!isVerified) {
      toast.error('Verifique seu WhatsApp primeiro');
      onRequestVerify();
      return;
    }
    if (cap.premium && !isPremium) {
      setPremiumSheet(cap.key);
      return;
    }
    setEnabled((prev) => ({ ...prev, [cap.key]: !prev[cap.key] }));
  }

  return (
    <>
      <div className="mx-auto w-full max-w-sm">
        <p className="font-body text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80 text-center mb-3">
          O Horus pode receber
        </p>
        <div className="flex flex-col gap-2 capability-list-reflect">
          {CAPS.map((cap, i) => {
            const Icon = cap.icon;
            const locked = !isVerified || (cap.premium && !isPremium);
            const active = isVerified && (!cap.premium || isPremium) && enabled[cap.key];
            const c = cap.hex;

            return (
              <motion.div
                key={cap.key}
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: i * 0.12,
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                }}
                className="relative flex items-center gap-3.5 px-3.5 py-3 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md transition-all overflow-hidden"
              >
                <div className="absolute inset-0 pointer-events-none z-0">
                  <div className="list-item-reflect absolute inset-0" style={{ animationDelay: `${i * 2}s` }} />
                </div>
                <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl shrink-0 z-10">
                  <Icon
                    className="relative z-10 w-7 h-7"
                    strokeWidth={2}
                    style={{ color: c }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <span
                    className="font-body text-[13.5px] font-semibold"
                    style={{ color: c }}
                  >
                    {cap.label}
                  </span>
                  <p className="font-body text-[11px] leading-snug text-muted-foreground/70 mt-0.5 line-clamp-2">
                    {cap.description}
                  </p>
                </div>

                <Switch
                  checked={active}
                  onCheckedChange={() => handleToggle(cap)}
                  aria-label={`Ativar ${cap.label}`}
                  className="shrink-0"
                  style={{
                    backgroundColor: active ? '#34d399' : '#fb7185',
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      <HorusPremiumFeatureSheet
        open={premiumSheet !== null}
        onClose={() => setPremiumSheet(null)}
        capability={premiumSheet}
      />
    </>
  );
}

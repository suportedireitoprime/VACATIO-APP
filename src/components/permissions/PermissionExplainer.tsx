import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Camera, Bell, FileText, X, LucideIcon } from 'lucide-react';

export type PermissionKind = 'microphone' | 'camera' | 'notifications' | 'files';

const CONFIG: Record<PermissionKind, { icon: LucideIcon; title: string; body: string }> = {
  microphone: {
    icon: Mic,
    title: 'Precisamos do microfone',
    body: 'Pra você poder gravar anotações em áudio e conversar com a IA Jurídica por voz. Nada é enviado sem sua ação.',
  },
  camera: {
    icon: Camera,
    title: 'Precisamos da câmera',
    body: 'Pra escanear QR Codes de leis ou digitalizar páginas de livros pra biblioteca.',
  },
  notifications: {
    icon: Bell,
    title: 'Ativar notificações',
    body: 'Pra te avisar de novas leis, alterações que você acompanha e lembretes de estudo.',
  },
  files: {
    icon: FileText,
    title: 'Acesso a arquivos',
    body: 'Pra importar PDFs de livros e provas pra sua biblioteca pessoal.',
  },
};

interface Props {
  open: boolean;
  kind: PermissionKind;
  onAllow: () => void | Promise<void>;
  onDeny: () => void;
}

export function PermissionExplainer({ open, kind, onAllow, onDeny }: Props) {
  const cfg = CONFIG[kind];
  const Icon = cfg.icon;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            onClick={onDeny}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 240, damping: 26 }}
            className="fixed inset-x-4 bottom-6 z-[81] max-w-md mx-auto rounded-2xl bg-card border border-border shadow-2xl p-6"
          >
            <button
              onClick={onDeny}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
              <Icon className="w-7 h-7 text-primary" />
            </div>

            <h3 className="font-display text-lg font-bold text-foreground mb-2">{cfg.title}</h3>
            <p className="font-body text-sm text-muted-foreground leading-relaxed mb-5">{cfg.body}</p>

            <div className="flex gap-2">
              <button
                onClick={onDeny}
                className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-body font-medium text-sm hover:bg-secondary/70 transition-colors"
              >
                Agora não
              </button>
              <button
                onClick={onAllow}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-body font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Permitir
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

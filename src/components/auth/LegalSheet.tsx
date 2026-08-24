import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { X } from 'lucide-react';

type LegalKind = 'privacidade' | 'termos';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: LegalKind;
}

const TITLES: Record<LegalKind, string> = {
  privacidade: 'Política de Privacidade',
  termos: 'Termos de Uso',
};

export function LegalSheet({ open, onOpenChange, kind }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[92vh] bg-[#141414] border-white/10">
        <DrawerHeader className="flex items-center justify-between border-b border-white/10 py-3">
          <DrawerTitle className="font-display text-base font-bold text-white">
            {TITLES[kind]}
          </DrawerTitle>
          <DrawerClose
            aria-label="Fechar"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-white" />
          </DrawerClose>
        </DrawerHeader>
        <div className="flex-1 overflow-hidden">
          {open && (
            <iframe
              src={`/${kind}?embed=1`}
              title={TITLES[kind]}
              className="w-full h-full border-0 bg-background"
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

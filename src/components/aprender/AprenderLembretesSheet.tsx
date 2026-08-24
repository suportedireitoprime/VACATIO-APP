import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Flame, CalendarDays, Bell, ChevronRight } from 'lucide-react';
import { haptic } from '@/lib/nativeHaptics';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type OptId = 'horario' | 'localizacao' | 'streak' | 'semanal' | 'push';

const OPTIONS: {
  id: OptId;
  label: string;
  desc: string;
  icon: typeof Clock;
  tint: string;
}[] = [
  { id: 'horario', label: 'Horário fixo', desc: 'Estude no mesmo horário todo dia.', icon: Clock, tint: '#FFD500' },
  { id: 'localizacao', label: 'Por localização', desc: 'Ao chegar em um lugar (casa, trabalho).', icon: MapPin, tint: '#F9A8A8' },
  { id: 'streak', label: 'Não perder streak', desc: 'Aviso antes do dia acabar.', icon: Flame, tint: '#FB923C' },
  { id: 'semanal', label: 'Resumo semanal', desc: 'Domingo: seu progresso da semana.', icon: CalendarDays, tint: '#93C5FD' },
  { id: 'push', label: 'Notificações push', desc: 'Permitir alertas no aparelho.', icon: Bell, tint: '#C4B5FD' },
];

const AprenderLembretesSheet = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const [state, setState] = useState<Record<OptId, boolean>>({
    horario: true, localizacao: true, streak: true, semanal: true, push: true,
  });

  const toggle = (id: OptId) => {
    haptic.selection();
    setState((s) => ({ ...s, [id]: !s[id] }));
  };

  const goConfigure = () => {
    onOpenChange(false);
    navigate('/preferencias-lembretes');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90dvh] rounded-t-3xl border-t p-0 flex flex-col"
      >
        <div className="relative">
          <div className="bg-hero-yellow px-5 pt-6 pb-8 rounded-t-3xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-black/15" />
            <SheetHeader className="text-left space-y-1">
              <SheetTitle className="font-display text-2xl text-black tracking-tight">
                Lembretes
              </SheetTitle>
              <SheetDescription className="text-black/70 text-sm">
                Escolha como quer ser lembrado de estudar.
              </SheetDescription>
            </SheetHeader>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = state[opt.id];
            return (
              <button
                key={opt.id}
                onClick={() => toggle(opt.id)}
                className={`w-full flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                  active ? 'border-primary/40 bg-card shadow-sm' : 'border-border bg-card/50'
                }`}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: active ? opt.tint : 'hsl(var(--muted))' }}
                >
                  <Icon className="h-5 w-5 text-black" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-body text-[15px] font-semibold text-foreground leading-tight">
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                    {opt.desc}
                  </p>
                </div>
                <Switch checked={active} onCheckedChange={() => toggle(opt.id)} />
              </button>
            );
          })}

          <button
            onClick={goConfigure}
            className="mt-3 w-full flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40"
          >
            <div>
              <p className="font-body text-[15px] font-semibold text-foreground">Configurações avançadas</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Horários, fuso, WhatsApp e histórico.</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
          <Button className="w-full h-12 rounded-xl font-semibold" onClick={goConfigure}>
            Salvar preferências
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AprenderLembretesSheet;

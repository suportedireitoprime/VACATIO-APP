import { useEffect, useState } from 'react';
import { Loader2, Save, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  useHeroMotifsConfig,
  HERO_MOTIFS_DEFAULT,
  HERO_MOTIFS_LIMITS,
} from '@/hooks/useHeroMotifsConfig';

export default function HeroMotifsSettings() {
  const { config, loading, save } = useHeroMotifsConfig();
  const [slots, setSlots] = useState<number>(HERO_MOTIFS_DEFAULT.slots_count);
  const [intervalMs, setIntervalMs] = useState<number>(HERO_MOTIFS_DEFAULT.interval_ms);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSlots(config.slots_count);
    setIntervalMs(config.interval_ms);
  }, [config.slots_count, config.interval_ms]);

  const dirty = slots !== config.slots_count || intervalMs !== config.interval_ms;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await save({ slots_count: slots, interval_ms: intervalMs });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Configuração salva');
  };

  const handleReset = () => {
    setSlots(HERO_MOTIFS_DEFAULT.slots_count);
    setIntervalMs(HERO_MOTIFS_DEFAULT.interval_ms);
  };

  return (
    <section className="rounded-2xl border bg-card p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold">Ícones jurídicos do painel</h2>
          <p className="text-xs text-muted-foreground">
            Ajuste quantos ícones (balança, martelo, livro, espada) aparecem no painel amarelo e com que
            frequência trocam de posição.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="slots">Número de ícones visíveis</Label>
              <span className="text-sm font-mono font-semibold">{slots}</span>
            </div>
            <Slider
              id="slots"
              min={HERO_MOTIFS_LIMITS.slots.min}
              max={HERO_MOTIFS_LIMITS.slots.max}
              step={1}
              value={[slots]}
              onValueChange={([v]) => setSlots(v)}
            />
            <p className="text-[11px] text-muted-foreground">
              Entre {HERO_MOTIFS_LIMITS.slots.min} e {HERO_MOTIFS_LIMITS.slots.max} ícones distribuídos pelas
              bordas do painel.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="interval">Intervalo de rotação</Label>
              <span className="text-sm font-mono font-semibold">
                {(intervalMs / 1000).toFixed(1)}s
              </span>
            </div>
            <Input
              id="interval"
              type="number"
              min={HERO_MOTIFS_LIMITS.intervalMs.min}
              max={HERO_MOTIFS_LIMITS.intervalMs.max}
              step={100}
              value={intervalMs}
              onChange={(e) => setIntervalMs(Number(e.target.value) || 0)}
            />
            <p className="text-[11px] text-muted-foreground">
              Em milissegundos ({HERO_MOTIFS_LIMITS.intervalMs.min}–{HERO_MOTIFS_LIMITS.intervalMs.max}).
              Padrão: 3000 ms.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={handleReset} disabled={loading || saving}>
          <RotateCcw className="w-4 h-4 mr-2" /> Restaurar padrão
        </Button>
        <Button onClick={handleSave} disabled={loading || saving || !dirty}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>
    </section>
  );
}

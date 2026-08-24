import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Play, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HERO_ANIMATION_LIST } from '@/lib/heroAnimations';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import HeroAnimationPreview from './HeroAnimationPreview';
import type { HeroHomeImage } from '@/hooks/useHeroHomeImages';

type Props = {
  image: HeroHomeImage;
  onPresetChange: (id: string, preset: string) => void;
  onActiveChange: (id: string, ativo: boolean) => void;
  onDelete: (id: string) => void;
  onRefreshUrl: (id: string) => void;
};

export default function HeroImageCard({ image, onPresetChange, onActiveChange, onDelete, onRefreshUrl }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="bg-card rounded-xl border p-3 flex flex-col gap-3 shadow-sm"
      >
        <div className="flex gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Arrastar"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <div
            className="w-20 h-24 rounded-lg overflow-hidden shrink-0 relative"
            style={{ background: 'linear-gradient(135deg, hsl(340 55% 12%), hsl(45 95% 55%))' }}
          >
            <img
              src={image.imagem_url}
              alt={image.tag}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[95%] w-auto object-contain object-bottom"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2'; }}
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <Badge variant="secondary" className="truncate max-w-full">{image.tag}</Badge>
            <div className="text-[10px] text-muted-foreground font-mono truncate">#{image.ordem}</div>
            <div className="flex items-center gap-2">
              <Switch
                checked={image.ativo}
                onCheckedChange={(v) => onActiveChange(image.id, v)}
              />
              <span className="text-xs text-muted-foreground">{image.ativo ? 'Ativa' : 'Inativa'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">Efeito</label>
          <Select value={image.animation_preset} onValueChange={(v) => onPresetChange(image.id, v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {HERO_ANIMATION_LIST.map((a) => (
                <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setPreviewOpen(true)}>
            <Play className="w-3 h-3 mr-1" /> Prévia
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => onRefreshUrl(image.id)} title="Renovar URL assinada">
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm(`Apagar "${image.tag}"? Essa ação não pode ser desfeita.`)) onDelete(image.id);
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Prévia — {image.tag}</DialogTitle>
          </DialogHeader>
          <HeroAnimationPreview
            imageUrl={image.imagem_url}
            animationKey={image.animation_preset}
            className="aspect-[3/4]"
          />
          <p className="text-xs text-muted-foreground text-center">
            Efeito: <strong>{HERO_ANIMATION_LIST.find(a => a.key === image.animation_preset)?.label}</strong>
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

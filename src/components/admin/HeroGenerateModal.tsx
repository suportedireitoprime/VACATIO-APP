import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, RotateCw, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { HERO_ANIMATION_LIST } from '@/lib/heroAnimations';
import HeroAnimationPreview from './HeroAnimationPreview';

type Preview = { storage_path: string; imagem_url: string; prompt_used: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved: () => void;
};

const TAG_SUGESTOES = [
  'advogado sênior',
  'advogada jovem',
  'juiz de toga',
  'promotor',
  'estudante universitária',
  'estudante universitário',
  'professor de direito',
  'servidor público',
  'defensor público',
  'concurseiro OAB',
  'delegado',
  'desembargadora',
];

export default function HeroGenerateModal({ open, onOpenChange, onApproved }: Props) {
  const [tag, setTag] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [animationKey, setAnimationKey] = useState('ken-burns');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTag('');
    setCustomPrompt('');
    setAnimationKey('ken-burns');
    setPreview(null);
  };

  const handleClose = async () => {
    if (preview) {
      // discard pending
      await supabase.functions.invoke('hero-home-runner/discard', {
        body: { storage_path: preview.storage_path },
      }).catch(() => {});
    }
    reset();
    onOpenChange(false);
  };

  const generate = async () => {
    if (!tag.trim()) { toast.error('Informe uma tag'); return; }
    setLoading(true);
    // discard previous pending if any
    if (preview) {
      await supabase.functions.invoke('hero-home-runner/discard', {
        body: { storage_path: preview.storage_path },
      }).catch(() => {});
      setPreview(null);
    }
    const { data, error } = await supabase.functions.invoke('hero-home-runner/generate', {
      body: { tag: tag.trim(), custom_prompt: customPrompt.trim() || undefined },
    });
    setLoading(false);
    if (error || !data?.ok) {
      toast.error(data?.error || error?.message || 'Falha na geração');
      return;
    }
    setPreview({
      storage_path: data.storage_path,
      imagem_url: data.imagem_url,
      prompt_used: data.prompt_used,
    });
  };

  const approve = async () => {
    if (!preview) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('hero-home-runner/approve', {
      body: {
        storage_path: preview.storage_path,
        tag: tag.trim(),
        prompt_used: preview.prompt_used,
        animation_preset: animationKey,
      },
    });
    setSaving(false);
    if (error || !data?.ok) {
      toast.error(data?.error || error?.message || 'Falha ao aprovar');
      return;
    }
    toast.success('Imagem aprovada e adicionada à home!');
    reset();
    onOpenChange(false);
    onApproved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Gerar nova imagem para a home
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Left: form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag">Tag do personagem</Label>
              <Input
                id="tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="ex.: advogada jovem, juiz sênior..."
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {TAG_SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTag(s)}
                    className="text-[11px] px-2 py-1 rounded-full bg-muted hover:bg-primary/20 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt customizado (opcional)</Label>
              <Textarea
                id="prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Deixe vazio para usar o template padrão âmbar/dourado. Se preencher, substitui completamente o prompt."
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Efeito de entrada</Label>
              <Select value={animationKey} onValueChange={setAnimationKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HERO_ANIMATION_LIST.map((a) => (
                    <SelectItem key={a.key} value={a.key}>
                      <div className="flex flex-col">
                        <span className="font-medium">{a.label}</span>
                        <span className="text-xs text-muted-foreground">{a.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={generate} disabled={loading || saving} className="w-full">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</> :
                preview ? <><RotateCw className="w-4 h-4 mr-2" /> Regenerar</> :
                <><Sparkles className="w-4 h-4 mr-2" /> Gerar imagem</>}
            </Button>
          </div>

          {/* Right: preview */}
          <div className="space-y-3">
            <Label>Prévia (com animação em loop)</Label>
            {preview ? (
              <>
                <HeroAnimationPreview
                  imageUrl={preview.imagem_url}
                  animationKey={animationKey}
                  className="aspect-[3/4]"
                />
                <div className="flex gap-2">
                  <Button onClick={approve} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Aprovar
                  </Button>
                  <Button onClick={handleClose} variant="outline" disabled={saving}>
                    <X className="w-4 h-4 mr-2" /> Descartar
                  </Button>
                </div>
              </>
            ) : (
              <div className="aspect-[3/4] flex items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground text-center p-6">
                Preencha a tag e clique em "Gerar imagem" para ver a prévia com a animação escolhida.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

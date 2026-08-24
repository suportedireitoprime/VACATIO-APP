import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ImageIcon, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import HeroImageCard from '@/components/admin/HeroImageCard';
import HeroGenerateModal from '@/components/admin/HeroGenerateModal';
import HeroMotifsSettings from '@/components/admin/HeroMotifsSettings';
import type { HeroHomeImage } from '@/hooks/useHeroHomeImages';

export default function AdminHeroHome() {
  const navigate = useNavigate();
  const [images, setImages] = useState<HeroHomeImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [genOpen, setGenOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('hero_home_images')
      .select('*')
      .order('ordem', { ascending: true });
    if (error) toast.error(error.message);
    else setImages((data ?? []) as HeroHomeImage[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePresetChange = async (id: string, preset: string) => {
    setImages((prev) => prev.map((i) => i.id === id ? { ...i, animation_preset: preset } : i));
    const { error } = await (supabase as any)
      .from('hero_home_images')
      .update({ animation_preset: preset })
      .eq('id', id);
    if (error) toast.error(error.message);
  };

  const handleActiveChange = async (id: string, ativo: boolean) => {
    setImages((prev) => prev.map((i) => i.id === id ? { ...i, ativo } : i));
    const { error } = await (supabase as any)
      .from('hero_home_images')
      .update({ ativo })
      .eq('id', id);
    if (error) toast.error(error.message);
  };

  const handleDelete = async (id: string) => {
    const { data, error } = await supabase.functions.invoke('hero-home-runner/delete', { body: { id } });
    if (error || !data?.ok) {
      toast.error(data?.error || error?.message || 'Falha ao apagar');
      return;
    }
    toast.success('Imagem apagada');
    setImages((prev) => prev.filter((i) => i.id !== id));
  };

  const handleRefreshUrl = async (id: string) => {
    const { data, error } = await supabase.functions.invoke('hero-home-runner/refresh-url', { body: { id } });
    if (error || !data?.ok) {
      toast.error(data?.error || error?.message || 'Falha');
      return;
    }
    toast.success('URL renovada');
    setImages((prev) => prev.map((i) => i.id === id ? { ...i, imagem_url: data.imagem_url } : i));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = images.findIndex((i) => i.id === active.id);
    const newIdx = images.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(images, oldIdx, newIdx).map((img, idx) => ({ ...img, ordem: idx }));
    setImages(reordered);
    // Bulk update ordem
    await Promise.all(
      reordered.map((img) =>
        (supabase as any).from('hero_home_images').update({ ordem: img.ordem }).eq('id', img.id),
      ),
    );
  };

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader
        title="Imagens do início do app"
        subtitle="Gerencie os personagens que aparecem no painel amarelo da home"
        onBack={() => navigate(-1)}
        leading={<ImageIcon className="w-5 h-5 text-amber-500" />}
        rightAction={
          <Button onClick={() => setGenOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Gerar nova
          </Button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <HeroMotifsSettings />

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : images.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhuma imagem cadastrada ainda.</p>
            <p className="text-xs text-muted-foreground">Enquanto isso, a home usa as capas fixas do app. Gere a primeira para começar.</p>
            <Button onClick={() => setGenOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Gerar primeira imagem
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              Arraste os cards para reordenar. A ordem define a sequência de rotação (6s cada) no painel amarelo.
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {images.map((img) => (
                    <HeroImageCard
                      key={img.id}
                      image={img}
                      onPresetChange={handlePresetChange}
                      onActiveChange={handleActiveChange}
                      onDelete={handleDelete}
                      onRefreshUrl={handleRefreshUrl}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </main>

      <HeroGenerateModal open={genOpen} onOpenChange={setGenOpen} onApproved={load} />
    </div>
  );
}

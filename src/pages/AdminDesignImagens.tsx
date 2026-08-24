import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, Plus, Save, Trash2, Star, ImageIcon } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';

type DesignPrompt = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  prompt_base: string;
  exemplos: Array<{ subject: string; palette?: string; preview_url?: string }>;
  paleta: string[];
  categoria_alvo: string | null;
  is_default: boolean;
  ativo: boolean;
  preview_url: string | null;
};

const CATEGORIAS_BLOG = ['Filosofia', 'STF', 'Curiosidades', 'Clássicos', 'Leis'];

const emptyPreset = (): Partial<DesignPrompt> => ({
  slug: '',
  nome: '',
  descricao: '',
  prompt_base: '',
  exemplos: [],
  paleta: [],
  categoria_alvo: null,
  is_default: false,
  ativo: true,
});

export default function AdminDesignImagens() {
  const navigate = useNavigate();
  const [presets, setPresets] = useState<DesignPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<DesignPrompt> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('design_imagens_prompts')
      .select('*')
      .order('is_default', { ascending: false })
      .order('nome');
    if (error) toast.error(error.message);
    else setPresets((data ?? []) as DesignPrompt[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.nome || !editing?.slug || !editing?.prompt_base) {
      toast.error('Nome, slug e prompt base são obrigatórios');
      return;
    }
    setSaving(true);
    const payload = {
      slug: editing.slug,
      nome: editing.nome,
      descricao: editing.descricao ?? null,
      prompt_base: editing.prompt_base,
      exemplos: editing.exemplos ?? [],
      paleta: editing.paleta ?? [],
      categoria_alvo: editing.categoria_alvo || null,
      is_default: !!editing.is_default,
      ativo: editing.ativo ?? true,
      preview_url: editing.preview_url ?? null,
    };
    const q = editing.id
      ? (supabase as any).from('design_imagens_prompts').update(payload).eq('id', editing.id)
      : (supabase as any).from('design_imagens_prompts').insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Preset salvo');
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir este preset?')) return;
    const { error } = await (supabase as any).from('design_imagens_prompts').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Excluído');
    load();
  };

  return (
    <div className="min-h-dvh bg-background pb-16">
      <PageHeader
        title="Design de Imagens"
        onBack={() => navigate(-1)}
        leading={<Palette className="w-5 h-5 text-primary" />}
        rightAction={
          <Button size="sm" onClick={() => setEditing(emptyPreset())}>
            <Plus className="w-4 h-4 mr-1" /> Novo
          </Button>
        }
      />

      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <p className="text-sm text-muted-foreground">
          Presets de estilo reutilizáveis para geração de imagens em toda a aplicação.
          Cada preset guarda o <strong>prompt base travado</strong> (estilo/paleta/composição), assuntos
          de exemplo e previews. Quando um preset tem uma <strong>categoria alvo</strong>, ele é usado
          automaticamente para posts do blog dessa categoria. O preset marcado como <strong>Default</strong>{' '}
          é usado quando nenhum outro combina.
        </p>

        {loading ? (
          <div className="text-center text-muted-foreground py-8">Carregando…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {presets.map((p) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="overflow-hidden">
                  {p.preview_url && (
                    <div className="aspect-[3/2] bg-secondary overflow-hidden">
                      <img src={p.preview_url} alt={p.nome} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-sm truncate">{p.nome}</h3>
                          {p.is_default && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{p.slug}</p>
                      </div>
                      {p.categoria_alvo && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                          {p.categoria_alvo}
                        </span>
                      )}
                    </div>
                    {p.descricao && (
                      <p className="text-xs text-muted-foreground line-clamp-3">{p.descricao}</p>
                    )}
                    {Array.isArray(p.paleta) && p.paleta.length > 0 && (
                      <div className="flex gap-1">
                        {p.paleta.slice(0, 6).map((c, i) => (
                          <div key={i} className="w-5 h-5 rounded border border-border" style={{ background: c }} />
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEditing(p)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setEditing(null)}>
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-background w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold">{editing.id ? 'Editar preset' : 'Novo preset'}</h2>
              <Button size="sm" onClick={save} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> Salvar
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome *</Label>
                  <Input value={editing.nome || ''} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Slug *</Label>
                  <Input value={editing.slug || ''} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="meu-estilo" />
                </div>
              </div>

              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea rows={2} value={editing.descricao || ''} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} />
              </div>

              <div>
                <Label className="text-xs">Prompt base (estilo travado) *</Label>
                <Textarea
                  rows={12}
                  className="font-mono text-xs"
                  value={editing.prompt_base || ''}
                  onChange={(e) => setEditing({ ...editing, prompt_base: e.target.value })}
                  placeholder="Descreva estilo, composição, paleta, restrições. O assunto (Subject: …) é acrescentado automaticamente."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Categoria alvo (blog)</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={editing.categoria_alvo || ''}
                    onChange={(e) => setEditing({ ...editing, categoria_alvo: e.target.value || null })}
                  >
                    <option value="">— nenhuma —</option>
                    {CATEGORIAS_BLOG.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Preview URL</Label>
                  <Input value={editing.preview_url || ''} onChange={(e) => setEditing({ ...editing, preview_url: e.target.value })} />
                </div>
              </div>

              <div>
                <Label className="text-xs">Paleta (cores hex, separadas por vírgula)</Label>
                <Input
                  value={(editing.paleta || []).join(', ')}
                  onChange={(e) => setEditing({ ...editing, paleta: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="#7a1f2b, #c9a961, …"
                />
                <div className="flex gap-1 mt-1.5">
                  {(editing.paleta || []).map((c, i) => (
                    <div key={i} className="w-6 h-6 rounded border border-border" style={{ background: c }} />
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs">Exemplos (JSON — cada item: subject, palette, preview_url)</Label>
                <Textarea
                  rows={5}
                  className="font-mono text-xs"
                  value={JSON.stringify(editing.exemplos || [], null, 2)}
                  onChange={(e) => {
                    try { setEditing({ ...editing, exemplos: JSON.parse(e.target.value) }); }
                    catch { /* ignore parse mid-typing */ }
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Switch checked={!!editing.is_default} onCheckedChange={(v) => setEditing({ ...editing, is_default: v })} />
                  <Label className="text-sm">Default (usado quando nenhuma categoria bate)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editing.ativo ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
                  <Label className="text-sm">Ativo</Label>
                </div>
              </div>

              {Array.isArray(editing.exemplos) && editing.exemplos.length > 0 && (
                <div>
                  <Label className="text-xs mb-1 block">Previews dos exemplos</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {editing.exemplos.map((ex: any, i: number) => (
                      <div key={i} className="aspect-[3/2] rounded border border-border overflow-hidden bg-secondary">
                        {ex.preview_url ? (
                          <img src={ex.preview_url} alt={ex.subject} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

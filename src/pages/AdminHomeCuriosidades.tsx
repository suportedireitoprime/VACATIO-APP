import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Lightbulb, Loader2, Sparkles, Trash2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import type { HomeCuriosidade } from '@/hooks/useHomeCuriosidades';

const CORES = [
  '#FACC15', '#FB923C', '#F87171', '#EC4899', '#A78BFA',
  '#60A5FA', '#38BDF8', '#34D399', '#FBBF24', '#F472B6',
];

export default function AdminHomeCuriosidades() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HomeCuriosidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [texto, setTexto] = useState('');
  const [cor, setCor] = useState(CORES[0]);
  const [hint, setHint] = useState('');
  const [gen, setGen] = useState<null | { imagem_url: string; storage_path: string }>(null);
  const [genImgLoading, setGenImgLoading] = useState(false);
  const [genTextLoading, setGenTextLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('home_curiosidades')
      .select('*')
      .order('ordem', { ascending: true });
    if (error) toast.error(error.message);
    else setItems((data ?? []) as HomeCuriosidade[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleGenText = async () => {
    setGenTextLoading(true);
    const { data, error } = await supabase.functions.invoke('home-curiosidade-runner/generate-text', {
      body: { hint },
    });
    setGenTextLoading(false);
    if (error || !data?.ok) return toast.error(data?.error || error?.message || 'Falhou');
    setTexto(data.texto);
  };

  const handleGenImage = async () => {
    if (!texto.trim()) return toast.error('Escreva o texto primeiro');
    setGenImgLoading(true);
    const { data, error } = await supabase.functions.invoke('home-curiosidade-runner/generate-image', {
      body: { texto, cor },
    });
    setGenImgLoading(false);
    if (error || !data?.ok) return toast.error(data?.error || error?.message || 'Falhou');
    setGen({ imagem_url: data.imagem_url, storage_path: data.storage_path });
  };

  const handleCreate = async () => {
    if (!texto.trim()) return toast.error('Texto obrigatório');
    setCreating(true);
    const { data, error } = await supabase.functions.invoke('home-curiosidade-runner/create', {
      body: {
        texto,
        cor,
        imagem_url: gen?.imagem_url || '',
        imagem_path: gen?.storage_path || '',
      },
    });
    setCreating(false);
    if (error || !data?.ok) return toast.error(data?.error || error?.message || 'Falhou');
    toast.success('Curiosidade publicada');
    setTexto(''); setHint(''); setGen(null);
    load();
  };

  const handleDelete = async (id: string) => {
    const { data, error } = await supabase.functions.invoke('home-curiosidade-runner/delete', { body: { id } });
    if (error || !data?.ok) return toast.error(data?.error || error?.message || 'Falhou');
    toast.success('Apagada');
    setItems((p) => p.filter((i) => i.id !== id));
  };

  const handleRefreshUrl = async (id: string) => {
    const { data, error } = await supabase.functions.invoke('home-curiosidade-runner/refresh-url', { body: { id } });
    if (error || !data?.ok) return toast.error(data?.error || error?.message || 'Falhou');
    toast.success('URL renovada');
    setItems((p) => p.map((i) => i.id === id ? { ...i, imagem_url: data.imagem_url } : i));
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    setItems((p) => p.map((i) => i.id === id ? { ...i, ativo } : i));
    const { error } = await (supabase as any)
      .from('home_curiosidades')
      .update({ ativo })
      .eq('id', id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader
        title="Curiosidades da Home"
        subtitle="Cards leves misturados com os stats do painel"
        onBack={() => navigate(-1)}
        leading={<Lightbulb className="w-5 h-5 text-amber-500" />}
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Criar nova */}
        <section className="rounded-2xl border bg-card p-4 space-y-4">
          <h2 className="font-display font-bold text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova curiosidade
          </h2>

          <div className="grid gap-2">
            <Label>Dica opcional para a IA (tema/lei)</Label>
            <div className="flex gap-2">
              <Input value={hint} onChange={(e) => setHint(e.target.value)} placeholder="ex: CF/88, OAB, direito penal…" />
              <Button variant="outline" onClick={handleGenText} disabled={genTextLoading}>
                {genTextLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1.5" /> Gerar texto</>}
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Texto da curiosidade (máx 240)</Label>
            <Textarea value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 240))} rows={3} />
            <p className="text-[11px] text-muted-foreground text-right">{texto.length}/240</p>
          </div>

          <div className="grid gap-2">
            <Label>Cor de destaque</Label>
            <div className="flex gap-2 flex-wrap">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition ${cor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Capa vazada (opcional, gerada por IA)</Label>
              <Button variant="outline" size="sm" onClick={handleGenImage} disabled={genImgLoading || !texto.trim()}>
                {genImgLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1.5" /> Gerar imagem</>}
              </Button>
            </div>
            {gen?.imagem_url && (
              <div className="rounded-xl overflow-hidden border bg-black">
                <img src={gen.imagem_url} alt="preview" className="w-full h-40 object-contain" />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleCreate} disabled={creating || !texto.trim()}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Publicar curiosidade
            </Button>
          </div>
        </section>

        {/* Lista */}
        <section>
          <h2 className="font-display font-bold text-base mb-3">Curiosidades cadastradas ({items.length})</h2>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhuma curiosidade ainda.</p>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {items.map((it) => (
                <div key={it.id} className={`rounded-2xl border bg-card p-3 space-y-2 ${!it.ativo ? 'opacity-60' : ''}`}>
                  <div className="relative rounded-xl overflow-hidden bg-black h-32">
                    {it.imagem_url ? (
                      <img src={it.imagem_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Lightbulb className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                    )}
                    <span
                      className="absolute top-2 left-2 w-4 h-4 rounded-full border-2 border-white/70"
                      style={{ background: it.cor }}
                    />
                  </div>
                  <p className="text-sm leading-snug">{it.texto}</p>
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs">
                      <Switch checked={it.ativo} onCheckedChange={(v) => toggleAtivo(it.id, v)} />
                      {it.ativo ? <><Eye className="w-3.5 h-3.5" /> Ativa</> : <><EyeOff className="w-3.5 h-3.5" /> Oculta</>}
                    </label>
                    <div className="flex gap-1">
                      {it.imagem_path && (
                        <Button variant="ghost" size="icon" onClick={() => handleRefreshUrl(it.id)} title="Renovar URL">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(it.id)} title="Apagar">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

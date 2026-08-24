import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, Plus, Sparkles, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

type Funcao = {
  id: string; nome: string; descricao: string | null; prompt: string;
  icone: string | null; keywords: string[]; ativo: boolean;
  apenas_premium: boolean; ordem: number;
  prioridade: number; requer_cadastro: boolean; modelo: string;
  temperatura: number; max_tokens: number;
  eh_onboarding: boolean; eh_fallback: boolean;
  usar_busca_web: boolean;
  usa_estatisticas: boolean;
};

const empty: Partial<Funcao> = {
  nome: '', descricao: '', prompt: '', icone: 'Sparkles', keywords: [],
  ativo: true, apenas_premium: false, ordem: 0,
  prioridade: 100, requer_cadastro: true, modelo: 'gemini-2.5-flash-lite',
  temperatura: 0.6, max_tokens: 2048, usar_busca_web: true, usa_estatisticas: true,
};

export function HorusFuncoesTab() {
  const [items, setItems] = useState<Funcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Funcao> | null>(null);
  const [saving, setSaving] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState('');

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('horus_funcoes').select('*').order('prioridade', { ascending: true }).order('ordem');
    if (error) toast.error('Falha ao carregar funções');
    setItems((data as any) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing({ ...empty }); setKeywordsInput(''); }
  function openEdit(f: Funcao) { setEditing(f); setKeywordsInput((f.keywords || []).join(', ')); }

  async function save() {
    if (!editing?.nome || !editing?.prompt) { toast.error('Nome e prompt são obrigatórios'); return; }
    setSaving(true);
    const kw = keywordsInput.split(',').map((s) => s.trim()).filter(Boolean);
    const payload = { ...editing, keywords: kw } as any;
    const { error } = editing.id
      ? await supabase.from('horus_funcoes').update(payload).eq('id', editing.id)
      : await supabase.from('horus_funcoes').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Salvo');
    setEditing(null); load();
  }

  async function toggleAtivo(f: Funcao) {
    await supabase.from('horus_funcoes').update({ ativo: !f.ativo }).eq('id', f.id);
    load();
  }
  async function remove(f: Funcao) {
    if (!confirm(`Excluir "${f.nome}"?`)) return;
    await supabase.from('horus_funcoes').delete().eq('id', f.id);
    toast.success('Excluída');
    load();
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-body text-xs text-muted-foreground">{items.length} função(ões) cadastradas</p>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" />Nova função</Button>
      </div>

      {items.map((f) => (
        <div key={f.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm flex items-center gap-2">
                  <span>{f.nome}</span>
                  {f.eh_onboarding && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">Onboarding</span>}
                  {f.eh_fallback && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">Fallback</span>}
                  {!f.requer_cadastro && !f.eh_onboarding && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Público</span>}
                </p>
                <p className="font-body text-xs text-muted-foreground line-clamp-2">{f.descricao}</p>
                {f.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {f.keywords.map((k) => (
                      <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{k}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Switch checked={f.ativo} onCheckedChange={() => toggleAtivo(f)} />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => openEdit(f)}><Edit2 className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="sm" onClick={() => remove(f)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
          </div>
        </div>
      ))}

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader><SheetTitle>{editing?.id ? 'Editar função' : 'Nova função'}</SheetTitle></SheetHeader>
          {editing && (
            <div className="space-y-3 mt-4">
              <div><Label>Nome</Label><Input value={editing.nome || ''} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
              <div><Label>Descrição</Label><Input value={editing.descricao || ''} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} /></div>
              <div><Label>Prompt (instrução para o Horus)</Label><Textarea rows={5} value={editing.prompt || ''} onChange={(e) => setEditing({ ...editing, prompt: e.target.value })} /></div>
              <div><Label>Palavras-chave (separadas por vírgula)</Label><Input value={keywordsInput} onChange={(e) => setKeywordsInput(e.target.value)} placeholder="resumir, lei, artigo" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Ícone (Lucide)</Label><Input value={editing.icone || ''} onChange={(e) => setEditing({ ...editing, icone: e.target.value })} /></div>
                <div><Label>Prioridade (menor = antes)</Label><Input type="number" value={editing.prioridade ?? 100} onChange={(e) => setEditing({ ...editing, prioridade: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Modelo</Label><Input value={editing.modelo || ''} onChange={(e) => setEditing({ ...editing, modelo: e.target.value })} placeholder="gemini-2.5-flash-lite" /></div>
                <div><Label>Ordem</Label><Input type="number" value={editing.ordem ?? 0} onChange={(e) => setEditing({ ...editing, ordem: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Temperatura (0-1)</Label><Input type="number" step="0.1" min="0" max="2" value={editing.temperatura ?? 0.6} onChange={(e) => setEditing({ ...editing, temperatura: Number(e.target.value) })} /></div>
                <div><Label>Max tokens</Label><Input type="number" value={editing.max_tokens ?? 800} onChange={(e) => setEditing({ ...editing, max_tokens: Number(e.target.value) })} /></div>
              </div>
              <div className="flex items-center justify-between"><Label>Ativa</Label><Switch checked={editing.ativo ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} /></div>
              <div className="flex items-center justify-between"><Label>Requer usuário cadastrado</Label><Switch checked={editing.requer_cadastro ?? true} onCheckedChange={(v) => setEditing({ ...editing, requer_cadastro: v })} /></div>
              <div className="flex items-center justify-between"><Label>Apenas premium</Label><Switch checked={editing.apenas_premium ?? false} onCheckedChange={(v) => setEditing({ ...editing, apenas_premium: v })} /></div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Usar busca web (Google)</Label>
                  <p className="text-[10px] text-muted-foreground">Permite ao agente consultar o Google em tempo real para notícias, leis novas e atualidades.</p>
                </div>
                <Switch checked={editing.usar_busca_web ?? true} onCheckedChange={(v) => setEditing({ ...editing, usar_busca_web: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Usar estatísticas do aluno</Label>
                  <p className="text-[10px] text-muted-foreground">Injeta contexto do usuário (matéria mais estudada, streak, plano, último artigo) para respostas personalizadas.</p>
                </div>
                <Switch checked={editing.usa_estatisticas ?? true} onCheckedChange={(v) => setEditing({ ...editing, usa_estatisticas: v })} />
              </div>
              <Button onClick={save} disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
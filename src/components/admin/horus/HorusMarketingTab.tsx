import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Send, Megaphone, Trash2, Sparkles, Flame, BookOpen, Gift, Bell, Crown, GraduationCap, Heart } from 'lucide-react';
import { toast } from 'sonner';

type Campaign = {
  id: string; titulo: string; mensagem: string; publico_alvo: string;
  status: string; total_alvo: number; total_enviado: number; total_falha: number;
  agendada_para: string | null; created_at: string;
};

const empty = { titulo: '', mensagem: '', publico_alvo: 'all', media_url: '', agendada_para: '' };

type Template = {
  id: string;
  nome: string;
  descricao: string;
  icon: any;
  color: string;
  titulo: string;
  mensagem: string;
  publico_alvo: string;
};

const TEMPLATES: Template[] = [
  {
    id: 'boas-vindas',
    nome: 'Boas-vindas',
    descricao: 'Mensagem calorosa para novos usuários',
    icon: Heart,
    color: '#EC4899',
    titulo: 'Boas-vindas ao Vade Mecum',
    publico_alvo: 'all',
    mensagem: 'Oi {{nome}}! 👋\n\nQue bom te ver por aqui. Sou o *Horus*, teu assistente jurídico no WhatsApp.\n\nPosso te ajudar com:\n• Dúvidas sobre leis e artigos\n• Explicações de jurisprudência\n• Resumos rápidos pra estudo\n\nManda tua primeira pergunta quando quiser! 📚',
  },
  {
    id: 'streak-motivacional',
    nome: 'Motivação de estudo',
    descricao: 'Incentiva quem está estudando com frequência',
    icon: Flame,
    color: '#F59E0B',
    titulo: 'Bora manter a sequência',
    publico_alvo: 'all',
    mensagem: '🔥 E aí, {{nome}}!\n\nTua constância nos estudos tá impressionante. Não perde o ritmo hoje!\n\nQue tal *10 minutinhos* revisando o que viu ontem? Já ajuda muito a fixar.\n\nAbre o app e continua de onde parou 👇\nhttps://vade-mecum-brilhante.lovable.app',
  },
  {
    id: 'novidade-lei',
    nome: 'Nova lei publicada',
    descricao: 'Avisa sobre atualização legislativa',
    icon: Bell,
    color: '#3B82F6',
    titulo: 'Nova lei no radar',
    publico_alvo: 'all',
    mensagem: '📢 Alerta legislativo, {{nome}}!\n\nUma nova lei foi publicada e pode impactar teus estudos.\n\n*Confere agora* pra ficar por dentro antes da galera:\nhttps://vade-mecum-brilhante.lovable.app\n\nQualquer dúvida, é só me perguntar por aqui 😉',
  },
  {
    id: 'promo-premium',
    nome: 'Oferta Premium',
    descricao: 'Converte usuários free em assinantes',
    icon: Crown,
    color: '#A855F7',
    titulo: 'Oferta especial Premium',
    publico_alvo: 'free',
    mensagem: '👑 {{nome}}, oferta exclusiva pra você!\n\nQuer *acesso ilimitado* a:\n• Todos os resumos jurídicos\n• Videoaulas premium\n• Narrações dos artigos\n• Sem anúncios\n\n🎁 Assina agora com condição especial:\nhttps://vade-mecum-brilhante.lovable.app\n\nDúvidas? Manda aqui!',
  },
  {
    id: 'retomar-leitura',
    nome: 'Retomar leitura',
    descricao: 'Reengaja quem deixou livro pela metade',
    icon: BookOpen,
    color: '#10B981',
    titulo: 'Aquele livro tá te esperando',
    publico_alvo: 'all',
    mensagem: '📖 Ei {{nome}}!\n\nAquele livro que você começou tá esperando você voltar 😊\n\nSó *10 páginas por dia* e em pouco tempo você termina. Bora?\n\nAbre pelo app e continua de onde parou 👇\nhttps://vade-mecum-brilhante.lovable.app',
  },
  {
    id: 'dica-estudo',
    nome: 'Dica de estudo',
    descricao: 'Compartilha uma técnica útil',
    icon: GraduationCap,
    color: '#0EA5E9',
    titulo: 'Dica rápida pra teu estudo',
    publico_alvo: 'all',
    mensagem: '💡 Dica rápida, {{nome}}:\n\n*Técnica dos 25 minutos*:\n1️⃣ Estuda 25 min focado\n2️⃣ Pausa de 5 min\n3️⃣ Repete 4x\n4️⃣ Pausa longa de 20 min\n\nFunciona demais pra concurso e OAB. Testa hoje! 🚀',
  },
  {
    id: 'expira-plano',
    nome: 'Plano expirando',
    descricao: 'Avisa premium que a assinatura vai acabar',
    icon: Gift,
    color: '#EF4444',
    titulo: 'Seu Premium está acabando',
    publico_alvo: 'premium',
    mensagem: '⏰ Oi {{nome}}!\n\nTeu plano Premium tá chegando ao fim em breve.\n\nRenova agora pra continuar aproveitando:\n• Resumos ilimitados\n• Videoaulas exclusivas\n• Narrações completas\n\n👉 https://vade-mecum-brilhante.lovable.app\n\nQualquer dúvida, tô por aqui!',
  },
  {
    id: 'em-branco',
    nome: 'Em branco',
    descricao: 'Começar do zero, sem template',
    icon: Sparkles,
    color: '#94A3B8',
    titulo: '',
    publico_alvo: 'all',
    mensagem: '',
  },
];

export function HorusMarketingTab() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('horus_campaigns').select('*').order('created_at', { ascending: false });
    setItems((data as any) || []); setLoading(false);
  }
  useEffect(() => {
    load();
    const ch = supabase.channel('horus_campaigns_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'horus_campaigns' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function save() {
    if (!editing?.titulo || !editing?.mensagem) { toast.error('Título e mensagem obrigatórios'); return; }
    setSaving(true);
    const payload = {
      titulo: editing.titulo,
      mensagem: editing.mensagem,
      media_url: editing.media_url || null,
      publico_alvo: editing.publico_alvo,
      agendada_para: editing.agendada_para ? new Date(editing.agendada_para).toISOString() : null,
      status: editing.agendada_para ? 'agendada' : 'rascunho',
    };
    const { error } = await supabase.from('horus_campaigns').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Campanha criada'); setEditing(null); load();
  }

  async function runNow(c: Campaign) {
    if (!confirm(`Disparar "${c.titulo}" agora?`)) return;
    const { error } = await supabase.functions.invoke('horus-campaign-run', { body: { campaign_id: c.id } });
    if (error) toast.error(error.message);
    else toast.success('Disparo iniciado');
    load();
  }
  async function remove(c: Campaign) {
    if (!confirm(`Excluir "${c.titulo}"?`)) return;
    await supabase.from('horus_campaigns').delete().eq('id', c.id);
    load();
  }

  const [pickingTemplate, setPickingTemplate] = useState(false);

  function openNewCampaign() {
    setPickingTemplate(true);
  }

  function applyTemplate(t: Template) {
    setPickingTemplate(false);
    setEditing({
      ...empty,
      titulo: t.titulo,
      mensagem: t.mensagem,
      publico_alvo: t.publico_alvo,
    });
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-body text-xs text-muted-foreground">{items.length} campanha(s)</p>
        <Button size="sm" onClick={openNewCampaign}><Plus className="w-4 h-4 mr-1" />Nova campanha</Button>
      </div>

      {items.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma campanha ainda.</p>}

      {items.map((c) => {
        const pct = c.total_alvo > 0 ? Math.round(((c.total_enviado + c.total_falha) / c.total_alvo) * 100) : 0;
        return (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <Megaphone className="w-5 h-5 text-primary mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm">{c.titulo}</p>
                  <p className="font-body text-xs text-muted-foreground line-clamp-2">{c.mensagem}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{c.publico_alvo}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      c.status === 'concluida' ? 'bg-green-500/10 text-green-500' :
                      c.status === 'enviando' ? 'bg-blue-500/10 text-blue-500' :
                      c.status === 'falha' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                    }`}>{c.status}</span>
                    {c.total_alvo > 0 && <span className="text-[10px] text-muted-foreground">{c.total_enviado}/{c.total_alvo} · {pct}%</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              {(c.status === 'rascunho' || c.status === 'agendada' || c.status === 'falha') && (
                <Button size="sm" onClick={() => runNow(c)}><Send className="w-3.5 h-3.5 mr-1" />Enviar agora</Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => remove(c)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
            </div>
          </div>
        );
      })}

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Nova campanha</SheetTitle></SheetHeader>
          {editing && (
            <div className="space-y-3 mt-4">
              <div><Label>Título</Label><Input value={editing.titulo} onChange={(e) => setEditing({ ...editing, titulo: e.target.value })} /></div>
              <div><Label>Mensagem</Label><Textarea rows={5} value={editing.mensagem} onChange={(e) => setEditing({ ...editing, mensagem: e.target.value })} placeholder="Use {{nome}} para personalizar" /></div>
              <div><Label>URL de mídia (opcional)</Label><Input value={editing.media_url} onChange={(e) => setEditing({ ...editing, media_url: e.target.value })} /></div>
              <div>
                <Label>Público-alvo</Label>
                <Select value={editing.publico_alvo} onValueChange={(v) => setEditing({ ...editing, publico_alvo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuários vinculados</SelectItem>
                    <SelectItem value="premium">Apenas premium</SelectItem>
                    <SelectItem value="free">Apenas free</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Agendar para (opcional)</Label><Input type="datetime-local" value={editing.agendada_para} onChange={(e) => setEditing({ ...editing, agendada_para: e.target.value })} /></div>
              <Button onClick={save} disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar campanha'}</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet de seleção de template */}
      <Sheet open={pickingTemplate} onOpenChange={setPickingTemplate}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Escolha um template</SheetTitle>
            <p className="text-xs text-muted-foreground text-left">Prontos pra usar. Você pode editar tudo depois.</p>
          </SheetHeader>
          <div className="grid grid-cols-1 gap-2 mt-4">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 text-left transition"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${t.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: t.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{t.nome}</p>
                    <p className="text-xs text-muted-foreground">{t.descricao}</p>
                    {t.mensagem && (
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 italic">
                        "{t.mensagem.slice(0, 90)}..."
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
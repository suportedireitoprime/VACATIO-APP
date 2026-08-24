import { useEffect, useState } from 'react';
import { Bell, Plus, Clock, BookOpen, Smartphone, MessageCircle, Loader2, Sparkles, MapPin, Trash2, Home, GraduationCap, Briefcase, Building2, Map, Layers, AlarmClock, Grid2x2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/vademecum/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LembreteSheet from '@/components/lembretes/LembreteSheet';
import { toast } from 'sonner';

interface UnifiedReminder {
  _type: 'reading' | 'location';
  id: string;
  enabled: boolean;
  title: string;
  subtitle: string;
  icon: any;
  image?: string;
  raw: any;
  created_at: string;
}

const DAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const MeusLembretes = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [rows, setRows] = useState<UnifiedReminder[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'time' | 'reading' | 'location'>('all');
  const [reminderToDelete, setReminderToDelete] = useState<UnifiedReminder | null>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: rData }, { data: lData }] = await Promise.all([
      supabase.from('reading_reminders').select('*').eq('user_id', user.id),
      supabase.from('location_reminders').select('*').eq('user_id', user.id)
    ]);

    const readMap = (rData || []).map((r: any) => ({
      _type: 'reading' as const,
      id: r.id,
      enabled: r.enabled,
      title: r.livro_titulo || 'Rotina de leitura',
      subtitle: (r.time_of_day || '').slice(0, 5),
      icon: BookOpen,
      image: r.livro_capa,
      raw: r,
      created_at: r.created_at || ''
    }));

    const locMap = (lData || []).map((l: any) => {
      let Icon = MapPin;
      const lbl = (l.label || '').toLowerCase();
      if (lbl.includes('casa')) Icon = Home;
      else if (lbl.includes('faculdade') || lbl.includes('universidade')) Icon = GraduationCap;
      else if (lbl.includes('trabalho') || lbl.includes('escritório')) Icon = Briefcase;
      else if (lbl.includes('fórum') || lbl.includes('tribunal')) Icon = Building2;
      
      return {
        _type: 'location' as const,
        id: l.id,
        enabled: l.active,
        title: l.label || 'Localização',
        subtitle: l.address,
        message: l.message,
        icon: Icon,
        raw: l,
        created_at: l.created_at || ''
      };
    });

    const unified = [...readMap, ...locMap].sort((a, b) => {
       return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    setRows(unified);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);
  useEffect(() => { if (!sheetOpen) load();   }, [sheetOpen]);

  const toggleEnabled = async (r: UnifiedReminder) => {
    if (r._type === 'reading') {
      const { error } = await supabase.from('reading_reminders').update({ enabled: !r.enabled, next_fire_at: null }).eq('id', r.id);
      if (error) toast.error(error.message);
      else load();
    } else {
      const { error } = await supabase.from('location_reminders').update({ active: !r.enabled }).eq('id', r.id);
      if (error) toast.error(error.message);
      else load();
    }
  };

  const removeReminder = (r: UnifiedReminder) => {
    setReminderToDelete(r);
  };

  const confirmDelete = async () => {
    if (!reminderToDelete) return;
    const r = reminderToDelete;
    setReminderToDelete(null);
    if (r._type === 'reading') {
      const { error } = await supabase.from('reading_reminders').delete().eq('id', r.id);
      if (error) toast.error(error.message);
      else { toast.success('Lembrete removido'); load(); }
    } else {
      const { error } = await supabase.from('location_reminders').delete().eq('id', r.id);
      if (error) toast.error(error.message);
      else { toast.success('Lembrete removido'); load(); }
    }
  };

  const filteredRows = rows.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'location') return r._type === 'location';
    if (filter === 'reading') return r._type === 'reading' && r.raw.livro_id;
    if (filter === 'time') return r._type === 'reading' && !r.raw.livro_id;
    return true;
  });

  const getButtonClasses = () => {
    if (filter === 'location') return "border-emerald-500/50 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10";
    if (filter === 'reading') return "border-blue-500/50 bg-blue-500/5 text-blue-500 hover:bg-blue-500/10";
    return "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10";
  };

  const handleNovoLembrete = () => {
    if (filter === 'location') {
      navigate('/lembretes/local');
    } else {
      setEditing(null);
      setSheetOpen(true);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="max-w-3xl mx-auto">
          <PageHeader
            title="Meus Lembretes"
            subtitle=""
            onBack={() => navigate(-1)}
          />
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-3 pb-32 mt-2">
        <button
          onClick={handleNovoLembrete}
          className={`w-full h-14 rounded-2xl border-2 border-dashed font-body font-semibold flex items-center justify-center gap-2 transition ${getButtonClasses()}`}
        >
          <Plus className="w-5 h-5" />
          Novo lembrete
        </button>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Ainda sem lembretes nesta categoria.
            </p>
          </div>
        ) : (
          filteredRows.map(r => (
            <div key={r.id} className="rounded-2xl bg-card border border-border overflow-hidden">
              <button
                onClick={() => { 
                  if (r._type === 'reading') {
                    setEditing(r.raw); setSheetOpen(true); 
                  } else {
                    navigate('/lembretes/local');
                  }
                }}
                className="w-full p-4 flex gap-3 text-left hover:bg-secondary/30 transition-colors"
              >
                {r.image ? (
                  <img src={r.image} alt="" className="w-14 h-20 rounded-lg object-cover" />
                ) : (
                  <div className="w-14 h-20 rounded-lg bg-secondary/60 flex items-center justify-center text-muted-foreground">
                    <r.icon className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-body font-bold text-[15px] text-foreground truncate">
                      {r.title}
                    </p>
                    {r._type === 'location' && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide shrink-0">
                        {r.title}
                      </span>
                    )}
                  </div>
                  
                  {r._type === 'location' && r.raw.message && (
                    <p className="text-[13.5px] text-foreground/90 font-medium mt-0.5 line-clamp-2 leading-tight">
                      {r.raw.message}
                    </p>
                  )}
                  
                  <p className="text-[12.5px] text-muted-foreground mt-1 flex items-center gap-1.5 line-clamp-2 leading-snug">
                    {r._type === 'reading' ? <Clock className="w-3.5 h-3.5 shrink-0" /> : <MapPin className="w-3 h-3 shrink-0" />}
                    {r.subtitle}
                  </p>
                  
                  {r._type === 'reading' && r.raw.days_of_week && (
                    <div className="flex gap-1 mt-2.5">
                      {DAYS_SHORT.map((d, i) => (
                        <span
                          key={i}
                          className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center ${
                            r.raw.days_of_week.includes(i) ? 'bg-primary/80 text-primary-foreground' : 'bg-muted text-muted-foreground/50'
                          }`}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(r.raw.channels || []).includes('push') && <ChBadge icon={Bell} label="Push" />}
                    {(r.raw.channels || []).includes('local') && <ChBadge icon={Smartphone} label="App" />}
                    {(r.raw.channels || []).includes('horus_whatsapp') && <ChBadge icon={MessageCircle} label="WhatsApp" />}
                  </div>
                </div>
              </button>
              <div className="px-4 pb-3 flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeReminder(r); }}
                    className="w-7 h-7 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {r.enabled 
                      ? (r.raw.next_fire_at ? `Próximo: ${new Date(r.raw.next_fire_at).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : (r._type === 'location' ? 'Monitorando localização' : 'Agendando…')) 
                      : 'Desativado'}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleEnabled(r); }}
                  className={`relative w-10 h-6 rounded-full transition ${r.enabled ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${r.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Menu (App Style - 100% igual ao inicio) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="pointer-events-auto bg-card/95 backdrop-blur-md border-t border-border rounded-t-3xl shadow-lg shadow-black/10 pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] md:border md:rounded-full md:shadow-2xl md:shadow-black/30 md:pb-0">
          <div className="grid grid-cols-5 items-end px-1 pt-3.5 pb-3.5 max-w-lg mx-auto md:gap-2 md:px-4 md:py-2">
            <FilterTab icon={Grid2x2} label="Todos" active={filter === 'all'} onClick={() => setFilter('all')} />
            <FilterTab icon={AlarmClock} label="Horário" active={filter === 'time'} onClick={() => setFilter('time')} />
            <FilterTab icon={Map} label="Geolocalização" active={filter === 'location'} onClick={() => setFilter('location')} />
            <FilterTab icon={BookOpen} label="Leitura" active={filter === 'reading'} onClick={() => setFilter('reading')} />
            <FilterTab icon={Layers} label="Áreas" active={false} onClick={() => navigate('/biblioteca')} />
          </div>
        </div>
      </div>

      <LembreteSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        reminderId={editing?.id || null}
        livroId={editing?.livro_id || undefined}
        livroArea={editing?.livro_area || undefined}
        livroTitulo={editing?.livro_titulo || undefined}
        livroCapa={editing?.livro_capa || undefined}
      />

      <AlertDialog open={!!reminderToDelete} onOpenChange={(open) => !open && setReminderToDelete(null)}>
        <AlertDialogContent className="w-[90%] max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lembrete?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lembrete <strong className="text-foreground">"{reminderToDelete?.title}"</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function ChBadge({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-[10px] font-body text-muted-foreground">
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function FilterTab({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-end py-1.5 transition-colors ${active ? 'text-primary' : 'text-foreground hover:text-primary'}`}
    >
      <span className="relative flex flex-col items-center gap-1.5 overflow-hidden px-2 py-1 rounded-lg">
        <Icon className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={active ? 2 : 1.5} />
        {active && (
          <div className="absolute -inset-2 bg-primary/10 rounded-full blur-md -z-10" />
        )}
        <span className={`font-body text-[11px] sm:text-[12px] leading-tight ${active ? 'font-bold' : ''}`}>
          {label}
        </span>
      </span>
    </button>
  );
}

export default MeusLembretes;

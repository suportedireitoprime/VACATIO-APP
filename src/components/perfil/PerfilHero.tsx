import { useState } from 'react';
import { User, Pencil, Crown, CheckCircle2, Loader2, Mail, Chrome, Apple } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Provider = 'google' | 'apple' | 'email' | string;

const providerLabel: Record<string, { name: string; Icon: typeof Chrome }> = {
  google: { name: 'Conta Google', Icon: Chrome },
  apple: { name: 'Conta Apple', Icon: Apple },
  email: { name: 'E-mail e senha', Icon: Mail },
};

interface Props {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  isPremium: boolean;
  provider: Provider;
  emailConfirmed: boolean;
  contexto?: string | null;
  onNameChange: (name: string) => void;
}

export function PerfilHero({
  userId, displayName, avatarUrl, isPremium, provider, emailConfirmed, contexto, onNameChange,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(displayName);
  const [saving, setSaving] = useState(false);

  const prov = providerLabel[provider] ?? providerLabel.email;
  const iniciais = displayName
    .split(' ').filter(Boolean).slice(0, 2)
    .map((n) => n[0]?.toUpperCase()).join('');

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: newName.trim() } });
      if (error) throw error;
      await supabase.from('profiles').update({ display_name: newName.trim() }).eq('id', userId);
      onNameChange(newName.trim());
      toast.success('Nome atualizado!');
      setEditing(false);
    } catch {
      toast.error('Erro ao atualizar nome');
    } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden ring-2 ring-primary/40 shadow-lg shadow-primary/20">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : iniciais ? (
            <span className="font-display text-2xl font-bold text-primary">{iniciais}</span>
          ) : (
            <User className="w-10 h-10 text-primary" />
          )}
        </div>
        {isPremium && (
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center ring-2 ring-background shadow">
            <Crown className="w-4 h-4 text-black" />
          </div>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2 w-full max-w-xs">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Seu nome" className="text-center" />
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>✕</Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-bold text-foreground">{displayName}</h2>
          <button onClick={() => { setNewName(displayName); setEditing(true); }} aria-label="Editar nome">
            <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      )}

      {contexto && (
        <p className="text-xs text-muted-foreground font-body text-center px-4">{contexto}</p>
      )}

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <prov.Icon className="w-3.5 h-3.5" />
        <span>Conectado via {prov.name}</span>
        {emailConfirmed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
      </div>
    </div>
  );
}

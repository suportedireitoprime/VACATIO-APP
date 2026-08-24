import { useState } from 'react';
import { GraduationCap, Scale, Landmark, Briefcase, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export type PerfilId = 'faculdade' | 'oab' | 'concurso' | 'advogado';

export const PERFIS: { id: PerfilId; label: string; icon: typeof GraduationCap }[] = [
  { id: 'faculdade', label: 'Estudante de Direito', icon: GraduationCap },
  { id: 'oab',       label: 'Rumo à OAB',           icon: Scale },
  { id: 'concurso',  label: 'Concurseiro Jurídico', icon: Landmark },
  { id: 'advogado',  label: 'Advogado(a)',          icon: Briefcase },
];

interface Props {
  userId: string;
  selected: string[];
  onChange: (next: string[], contexto: string) => void;
}

export function AtuacaoCard({ userId, selected, onChange }: Props) {
  const [saving, setSaving] = useState(false);

  const toggle = async (id: PerfilId) => {
    const next = selected.includes(id) ? selected.filter((p) => p !== id) : [...selected, id];
    const contexto = PERFIS.filter((p) => next.includes(p.id)).map((p) => p.label).join(' + ');
    onChange(next, contexto);
    setSaving(true);
    try {
      await supabase.from('profiles').update({ perfil_tipos: next, perfil_contexto: contexto }).eq('id', userId);
    } finally { setSaving(false); }
  };

  return (
    <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg font-bold text-foreground leading-tight">Minha atuação</p>
          <p className="text-xs text-muted-foreground font-body mt-1 leading-snug">
            Personalize o app conforme seu momento.
          </p>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PERFIS.map(({ id, label, icon: Icon }) => {
          const on = selected.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                on ? 'border-primary bg-primary/10 text-foreground'
                   : 'border-border bg-background/40 text-muted-foreground hover:border-primary/40'
              }`}
            >
              <Icon className={`w-4 h-4 ${on ? 'text-primary' : ''}`} />
              <span className="text-xs font-medium font-body flex-1">{label}</span>
              {on && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

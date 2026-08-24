import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ExternalLink, Dumbbell, Brain, BookOpen, MapPin, DollarSign, Calendar, Activity, Loader2 } from 'lucide-react';
import HorusSectionHero from '@/components/horus/HorusSectionHero';
import { WallaceCostPanel } from './WallaceCostPanel';

const ICONS: Record<string, any> = { Brain, BookOpen, MapPin, DollarSign, Calendar, Activity };

type Poder = {
  id: string;
  slug: string;
  nome: string;
  categoria: string;
  descricao: string;
  tipo: string;
  ativo: boolean;
  base_url: string | null;
  docs_url: string | null;
  icone: string | null;
  cor: string | null;
  ordem: number;
};

export function HorusPoderesTab() {
  const [poderes, setPoderes] = useState<Poder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('horus_poderes')
      .select('*')
      .order('ordem');
    if (error) toast.error(error.message);
    else setPoderes((data as Poder[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (p: Poder) => {
    setSaving(p.slug);
    const { error } = await supabase
      .from('horus_poderes')
      .update({ ativo: !p.ativo })
      .eq('id', p.id);
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success(`${p.nome} ${!p.ativo ? 'ativado' : 'desativado'}`);
    setPoderes(prev => prev.map(x => x.id === p.id ? { ...x, ativo: !x.ativo } : x));
  };

  const ativos = poderes.filter(p => p.ativo).length;

  return (
    <div className="space-y-4">
      <HorusSectionHero
        icon={Dumbbell}
        eyebrow="Superpoderes"
        title="Poderes do Horus"
        description="APIs open-source e públicas que o Horus consulta na hora certa pra responder melhor. Ligue e desligue à vontade."
      />

      <WallaceCostPanel />

      <div className="text-sm text-muted-foreground px-1">
        {ativos} de {poderes.length} poderes ativos
      </div>


      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <ul className="flex flex-col gap-3">
          {poderes.map(p => {
            const Icon = (p.icone && ICONS[p.icone]) || Dumbbell;
            const cor = p.cor || '#F59E0B';
            return (
              <li key={p.id} className="rounded-2xl bg-card border border-border p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${cor}22` }}
                  >
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: cor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-base leading-tight">{p.nome}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${cor}22`, color: cor }}
                          >
                            {p.tipo === 'open_source' ? 'Open Source' : 'API Pública'}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {p.categoria.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                      <Switch
                        checked={p.ativo}
                        disabled={saving === p.slug}
                        onCheckedChange={() => toggle(p)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 leading-snug">{p.descricao}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {p.docs_url && (
                        <a
                          href={p.docs_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Documentação <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {p.slug === 'langfuse' && p.ativo && (
                        <a
                          href="https://cloud.langfuse.com"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: `${cor}22`, color: cor }}
                        >
                          Abrir Dashboard <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

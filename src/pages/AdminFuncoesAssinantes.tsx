import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Crown, RefreshCw, Copy } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { invalidateFeatureLimits, type FeatureLimitConfig } from '@/hooks/useFeatureLimit';
import { isAdminEmail } from '@/lib/adminEmails';

const CATEGORIES: Record<string, string> = {
  blog: 'Blog & Notícias',
  leis: 'Legislação',
  grifos: 'Grifos',
  estudo: 'Estudo',
  biblioteca: 'Biblioteca',
  ia: 'Inteligência Artificial',
  radar: 'Radar Legislativo',
};

const PERIOD_LABELS: Record<string, string> = {
  daily: 'Por dia',
  monthly: 'Por mês',
  lifetime: 'Vitalício',
};

const AdminFuncoesAssinantes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);
  const [rows, setRows] = useState<FeatureLimitConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('feature_limits' as any).select('*').order('sort_order');
    setRows((data || []) as any);
    setLoading(false);
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1); firstOfMonth.setHours(0, 0, 0, 0);
    const { data: usage } = await supabase
      .from('feature_usage' as any)
      .select('feature_key')
      .gte('used_at', firstOfMonth.toISOString());
    const counts: Record<string, number> = {};
    (usage || []).forEach((r: any) => { counts[r.feature_key] = (counts[r.feature_key] || 0) + 1; });
    setStats(counts);
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const g: Record<string, FeatureLimitConfig[]> = {};
    rows.forEach(r => { (g[r.category] ??= []).push(r); });
    return g;
  }, [rows]);

  const update = (key: string, patch: Partial<FeatureLimitConfig>) => {
    setRows(rs => rs.map(r => r.feature_key === key ? { ...r, ...patch } : r));
  };

  const save = async (row: FeatureLimitConfig) => {
    setSaving(row.feature_key);
    const { error } = await supabase.from('feature_limits' as any).update({
      limit_value: row.limit_value,
      period: row.period,
      enabled: row.enabled,
      label: row.label,
      description: row.description,
    }).eq('feature_key', row.feature_key);
    setSaving(null);
    if (error) return toast.error('Erro: ' + error.message);
    await invalidateFeatureLimits();
    toast.success(`${row.label} atualizado`);
  };

  const copyMarkdown = () => {
    const lines = ['# Paywall & Limites Free\n', '| Feature | Categoria | Limite | Período | Ativo |', '|---|---|---|---|---|'];
    rows.forEach(r => {
      lines.push(`| ${r.label} | ${CATEGORIES[r.category] || r.category} | ${r.limit_value === 0 ? '🔒 Premium only' : r.limit_value} | ${PERIOD_LABELS[r.period]} | ${r.enabled ? '✅' : '❌'} |`);
    });
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Markdown copiado');
  };

  if (!isAdmin) {
    return <div className="min-h-dvh flex items-center justify-center text-muted-foreground">Acesso restrito.</div>;
  }

  return (
    <div className="min-h-dvh bg-background pb-16">
      <PageHeader
        title="Funções Assinantes"
        subtitle="Limites free editáveis · Admin bypassa tudo"
        onBack={() => navigate(-1)}
        rightAction={
          <div className="flex items-center gap-2">
            <button onClick={load} className="w-11 h-11 rounded-full bg-muted flex items-center justify-center" title="Recarregar">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={copyMarkdown} className="w-11 h-11 rounded-full bg-muted flex items-center justify-center" title="Copiar como Markdown">
              <Copy className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <div className="p-4 space-y-6 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
          <Crown className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-foreground/80">
            <strong>Como funciona:</strong> defina quantas vezes o usuário free pode usar cada função e em que período. <code>0</code> = apenas assinantes.
            Escopo (ex: Biblioteca por coleção) é fixo no código. Alterações valem imediatamente para toda a base.
          </div>
        </div>

        {loading && <div className="text-center text-muted-foreground text-sm py-8">Carregando…</div>}

        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="rounded-2xl border border-border/60 overflow-hidden">
            <div className="px-4 py-3 bg-secondary/40 border-b border-border/60">
              <h2 className="font-display font-bold text-sm">{CATEGORIES[cat] || cat}</h2>
            </div>
            <div className="divide-y divide-border/50">
              {items.map(r => (
                <div key={r.feature_key} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-foreground">{r.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{r.description}</div>
                      <div className="text-[10px] text-muted-foreground/70 mt-1 font-mono">{r.feature_key}{r.scope_key ? ` · escopo: ${r.scope_key}` : ''} · usos no mês: {stats[r.feature_key] || 0}</div>
                    </div>
                    <label className="flex items-center gap-2 text-[11px] shrink-0">
                      <input
                        type="checkbox"
                        checked={r.enabled}
                        onChange={e => update(r.feature_key, { enabled: e.target.checked })}
                        className="w-4 h-4"
                      />
                      Ativo
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Limite</label>
                      <input
                        type="number"
                        min={0}
                        value={r.limit_value}
                        onChange={e => update(r.feature_key, { limit_value: parseInt(e.target.value) || 0 })}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Período</label>
                      <select
                        value={r.period}
                        onChange={e => update(r.feature_key, { period: e.target.value as any })}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                      >
                        <option value="daily">Por dia</option>
                        <option value="monthly">Por mês</option>
                        <option value="lifetime">Vitalício</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => save(r)}
                        disabled={saving === r.feature_key}
                        className="w-full h-[38px] rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
                      >
                        <Save className="w-4 h-4" />
                        {saving === r.feature_key ? '...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminFuncoesAssinantes;

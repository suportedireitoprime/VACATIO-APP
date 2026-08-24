import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileSignature, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureLimit } from '@/hooks/useFeatureLimit';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';

interface Peticao {
  id: string;
  titulo: string;
  area_direito: string | null;
  status: string;
  etapa: number;
  updated_at: string;
}

export default function PeticaoInicial() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canUse, blocked, isPremium, remaining, config } = useFeatureLimit('peticao_inicial');
  const [items, setItems] = useState<Peticao[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('peticoes_iniciais' as any)
      .select('id, titulo, area_direito, status, etapa, updated_at')
      .order('updated_at', { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const criar = async () => {
    if (!user) return;
    if (!canUse) {
      toast.error('Você atingiu o limite. Assine para gerar mais petições.');
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from('peticoes_iniciais' as any)
      .insert({ user_id: user.id, titulo: 'Nova petição', status: 'rascunho', etapa: 1 })
      .select('id')
      .single();
    setCreating(false);
    if (error || !data) {
      toast.error(error?.message ?? 'Erro ao criar');
      return;
    }
    navigate(`/ferramentas/peticao-inicial/${(data as any).id}`);
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir esta petição?')) return;
    const { error } = await supabase.from('peticoes_iniciais' as any).delete().eq('id', id);
    if (error) toast.error(error.message);
    else setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const mobileHeader = (
    <PageHeader
      title="Petição Inicial"
      subtitle="Crie petições com IA e jurisprudência real"
      onBack={() => navigate('/ferramentas')}
    />
  );

  return (
    <DesktopPageLayout
      activeId="ferramentas"
      title="Petição Inicial"
      subtitle="Crie petições com IA e jurisprudência real"
      mobileHeader={mobileHeader}
    >
      <div className="px-4 sm:px-6 py-4 space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#EFE039] to-[#D4B800] p-5 text-gray-900 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-black/10 grid place-items-center shrink-0">
              <FileSignature className="w-6 h-6" strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <p className="font-display text-lg font-bold leading-tight">
                Nova petição inicial
              </p>
              <p className="text-sm opacity-80 mt-1">
                Grave ou digite os fatos. A IA classifica, redige e cita jurisprudências reais
                do STF e STJ com link.
              </p>
              {!isPremium && config && (
                <p className="text-xs mt-2 opacity-70">
                  {remaining} restantes este mês (grátis: {config.limit_value}/mês)
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={criar}
            disabled={creating || blocked}
            className="mt-4 w-full bg-gray-900 text-white hover:bg-gray-800 h-12 rounded-xl font-bold"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-5 h-5 mr-2" />
            )}
            Criar nova petição
          </Button>
        </div>

        <div>
          <h2 className="font-display text-base font-bold text-foreground mb-3">
            Minhas petições
          </h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Carregando…</div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Você ainda não gerou nenhuma petição.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border"
                >
                  <button
                    onClick={() => navigate(`/ferramentas/peticao-inicial/${p.id}`)}
                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                  >
                    <FileSignature className="w-5 h-5 text-[#D4B800] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{p.titulo}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.area_direito ?? 'Sem classificação'} • {p.status === 'finalizada' ? 'Finalizada' : `Etapa ${p.etapa}/7`}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="w-9 h-9 grid place-items-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    aria-label="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DesktopPageLayout>
  );
}

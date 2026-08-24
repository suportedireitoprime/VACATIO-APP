import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, Library, Loader2, Sparkles, Trash2, Volume2, WifiOff } from 'lucide-react';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { estimateAudiosSize, removeAllAudios, getDownloadedAudioIds } from '@/services/audioDownloadService';
import GerenciarAudiosLeiSheet from '@/components/vademecum/GerenciarAudiosLeiSheet';
import { formatBytes } from '@/data/offlineCatalog';

interface LeiSugerida { tabela_nome: string; count: number }

export default function ModoOfflineLeis() {
  const navigate = useNavigate();
  const [audioStats, setAudioStats] = useState({ count: 0, bytes: 0 });
  const [narracoesPorLei, setNarracoesPorLei] = useState<Record<string, number>>({});
  const [baixadosPorLei, setBaixadosPorLei] = useState<Record<string, number>>({});
  const [sugestoes, setSugestoes] = useState<LeiSugerida[]>([]);
  const [selectedLei, setSelectedLei] = useState<{ tabela: string; nome: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setAudioStats(await estimateAudiosSize());

    const { data: contagens } = await supabase
      .from('narracoes_artigos')
      .select('tabela_nome')
      .limit(10000);
    const groups: Record<string, number> = {};
    (contagens || []).forEach((r: any) => {
      groups[r.tabela_nome] = (groups[r.tabela_nome] || 0) + 1;
    });
    setNarracoesPorLei(groups);

    const baixados: Record<string, number> = {};
    await Promise.all(
      LEIS_CATALOG.map(async lei => {
        const set = await getDownloadedAudioIds(lei.tabela_nome);
        if (set.size > 0) baixados[lei.tabela_nome] = set.size;
      })
    );
    setBaixadosPorLei(baixados);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user?.id) {
        const { data: views } = await supabase
          .from('artigos_visualizacoes')
          .select('tabela_codigo')
          .eq('user_id', user.user.id)
          .order('created_at', { ascending: false })
          .limit(200);
        const freq: Record<string, number> = {};
        (views || []).forEach((v: any) => {
          if (v.tabela_codigo) freq[v.tabela_codigo] = (freq[v.tabela_codigo] || 0) + 1;
        });
        setSugestoes(
          Object.entries(freq)
            .filter(([tabela]) => groups[tabela])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([tabela_nome, count]) => ({ tabela_nome, count }))
        );
      }
    } catch { /* offline */ }

    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const leis = useMemo(
    () => [...LEIS_CATALOG].sort(
      (a, b) => (narracoesPorLei[b.tabela_nome] || 0) - (narracoesPorLei[a.tabela_nome] || 0),
    ),
    [narracoesPorLei]
  );

  const handleClearAudios = async () => {
    if (!confirm('Remover todos os áudios baixados? Você poderá baixá-los novamente quando quiser.')) return;
    await removeAllAudios();
    toast.success('Áudios removidos');
    refresh();
  };

  const mobileHeader = (
    <PageHeader
      title="Leis offline"
      subtitle="Textos e narrações"
      onBack={() => navigate('/modo-offline')}
      leading={
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
          <Library className="w-5 h-5 text-primary" />
        </div>
      }
    />
  );

  return (
    <DesktopPageLayout activeId="ferramentas" title="Leis offline" subtitle="Textos e narrações" mobileHeader={mobileHeader}>
      <div className="px-4 sm:px-6 py-4 lg:max-w-none lg:px-0 lg:py-0 space-y-5">

        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-foreground">Todos os textos já estão offline</h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Constituição, códigos, estatutos e súmulas. Escolha abaixo quais narrações quer baixar.
            </p>
          </div>
        </section>

        {sugestoes.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-display font-bold text-sm text-foreground">Sugestões pra você</h3>
            </div>
            <div className="grid gap-2">
              {sugestoes.map(sug => {
                const lei = LEIS_CATALOG.find(l => l.tabela_nome === sug.tabela_nome);
                if (!lei) return null;
                const total = narracoesPorLei[lei.tabela_nome] || 0;
                const baixados = baixadosPorLei[lei.tabela_nome] || 0;
                return (
                  <button
                    key={lei.id}
                    onClick={() => setSelectedLei({ tabela: lei.tabela_nome, nome: lei.nome })}
                    className="w-full flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3.5 hover:bg-primary/10 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: (lei.iconColor || '#3b82f6') + '20' }}>
                      <Volume2 className="w-5 h-5" style={{ color: lei.iconColor || '#3b82f6' }} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-display font-bold text-sm text-foreground truncate">{lei.nome}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {baixados > 0 ? `${baixados} baixados · ` : ''}{total} narrações disponíveis
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <h3 className="font-display font-bold text-sm text-foreground">Todas as leis</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {audioStats.count} áudio{audioStats.count !== 1 ? 's' : ''} · {formatBytes(audioStats.bytes)}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : leis.length === 0 ? (
            <div className="rounded-xl bg-muted/40 border border-border p-5 text-center">
              <WifiOff className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Nenhuma lei no catálogo.</p>
            </div>
          ) : (
            <div className="grid gap-1.5">
              {leis.map(lei => {
                const total = narracoesPorLei[lei.tabela_nome] || 0;
                const baixados = baixadosPorLei[lei.tabela_nome] || 0;
                const done = baixados >= total && total > 0;
                return (
                  <button
                    key={lei.id}
                    onClick={() => setSelectedLei({ tabela: lei.tabela_nome, nome: lei.nome })}
                    className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: (lei.iconColor || '#3b82f6') + '18' }}>
                      <Library className="w-4 h-4" style={{ color: lei.iconColor || '#3b82f6' }} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-sm text-foreground truncate">{lei.nome}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Texto offline · {total > 0 ? `${baixados}/${total} narrações` : 'sem narração gerada'}
                      </p>
                    </div>
                    {done && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {audioStats.count > 0 && (
            <button
              onClick={handleClearAudios}
              className="text-[11px] text-destructive hover:underline flex items-center gap-1 px-1 pt-1"
            >
              <Trash2 className="w-3 h-3" /> Limpar todos os áudios
            </button>
          )}
        </section>
      </div>

      {selectedLei && (
        <GerenciarAudiosLeiSheet
          open={!!selectedLei}
          onClose={() => { setSelectedLei(null); refresh(); }}
          tabelaNome={selectedLei.tabela}
          leiNome={selectedLei.nome}
        />
      )}
    </DesktopPageLayout>
  );
}

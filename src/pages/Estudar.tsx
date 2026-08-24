import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Layers, Target, ChevronRight, Search, Loader2, BarChart3, Network, BookOpen, ClipboardList, Film } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import QuizView from '@/components/estudar/QuizView';
import FlashcardView from '@/components/estudar/FlashcardView';
import DesempenhoView from '@/components/estudar/DesempenhoView';
import MindMapView from '@/components/estudar/MindMapView';
import QuestoesDashboard from '@/components/estudar/QuestoesDashboard';

import { Input } from '@/components/ui/input';
import { useStudyStats } from '@/hooks/useStudyStats';
import { Progress } from '@/components/ui/progress';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { useSubscription } from '@/hooks/useSubscription';
import { usePremiumUsage } from '@/hooks/usePremiumUsage';
import PremiumGate from '@/components/PremiumGate';

import { LEIS_COMPACTAS as LEIS } from '@/data/leisCatalog';

type View = 'menu' | 'select-lei' | 'select-artigo' | 'questoes' | 'flashcards' | 'mapa_mental' | 'desempenho' | 'questoes-dashboard';

const Estudar = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<View>('menu');
  const [selectedMode, setSelectedMode] = useState<'questoes' | 'flashcards' | 'mapa_mental'>('questoes');
  const [selectedLei, setSelectedLei] = useState<typeof LEIS[0] | null>(null);
  const [artigos, setArtigos] = useState<{ numero: string; rotulo?: string; caput?: string }[]>([]);
  const [selectedArtigo, setSelectedArtigo] = useState('');
  const [loadingArtigos, setLoadingArtigos] = useState(false);
  const [searchArtigo, setSearchArtigo] = useState('');
  const [showPremiumGate, setShowPremiumGate] = useState(false);

  const { isPremium } = useSubscription();
  const { canUse, registerUsage } = usePremiumUsage();
  const { loading: statsLoading, lawStats, articleStats, totalSessions, totalQuestions, avgPct } = useStudyStats();

  useEffect(() => {
    const mode = searchParams.get('mode') as 'questoes' | 'flashcards' | 'mapa_mental' | null;
    const tabela = searchParams.get('tabela');
    const artigo = searchParams.get('artigo');
    if (mode && tabela && artigo) {
      const lei = LEIS.find(l => l.tabela === tabela);
      if (lei) {
        setSelectedMode(mode);
        setSelectedLei(lei);
        setSelectedArtigo(artigo);
        setView(mode);
      }
    }
  }, [searchParams]);

  const loadArtigos = async (tabela: string) => {
    setLoadingArtigos(true);
    const { data } = await supabase
      .from(tabela as any)
      .select('numero, rotulo, caput')
      .order('ordem_numero', { ascending: true });
    setArtigos((data as any[]) || []);
    setLoadingArtigos(false);
  };

  const handleSelectMode = (mode: 'questoes' | 'flashcards' | 'mapa_mental') => {
    if (mode === 'questoes') {
      setSelectedMode(mode);
      setView('questoes-dashboard');
      return;
    }
    setSelectedMode(mode);
    setView('select-lei');
  };

  const handleSelectLei = (lei: typeof LEIS[0]) => {
    setSelectedLei(lei);
    loadArtigos(lei.tabela);
    setView('select-artigo');
  };

  const handleSelectArtigo = (numero: string) => {
    if (!isPremium) {
      const gateKey = selectedMode; // 'questoes' | 'flashcards' | 'mapa_mental'
      if (!canUse(gateKey)) {
        setShowPremiumGate(true);
        return;
      }
      registerUsage(gateKey, `${selectedLei?.tabela}_${numero}`);
    }
    setSelectedArtigo(numero);
    setView(selectedMode);
  };

  const handleBack = () => {
    switch (view) {
      case 'select-lei': setView('menu'); break;
      case 'select-artigo': setView('select-lei'); break;
      case 'questoes':
      case 'flashcards':
      case 'mapa_mental': setView('select-artigo'); break;
      case 'desempenho': setView('menu'); break;
      case 'questoes-dashboard': setView('menu'); break;
      default: navigate(-1);
    }
  };

  const filteredArtigos = useMemo(() => {
    if (!searchArtigo.trim()) return artigos;
    const q = searchArtigo.toLowerCase();
    return artigos.filter(a =>
      a.numero.toLowerCase().includes(q) ||
      (a.rotulo && a.rotulo.toLowerCase().includes(q))
    );
  }, [artigos, searchArtigo]);

  if (view === 'questoes' && selectedLei && selectedArtigo) {
    return <QuizView tabelaNome={selectedLei.tabela} artigoNumero={selectedArtigo} leiNome={selectedLei.nome} onBack={handleBack} />;
  }
  if (view === 'flashcards' && selectedLei && selectedArtigo) {
    return <FlashcardView tabelaNome={selectedLei.tabela} artigoNumero={selectedArtigo} leiNome={selectedLei.nome} onBack={handleBack} />;
  }
  if (view === 'mapa_mental' && selectedLei && selectedArtigo) {
    return <MindMapView tabelaNome={selectedLei.tabela} artigoNumero={selectedArtigo} leiNome={selectedLei.nome} onBack={handleBack} />;
  }
  if (view === 'desempenho') {
    return <DesempenhoView onBack={handleBack} />;
  }

  const topLaws = lawStats.slice(0, 3);

  const mobileHeader = (
    <PageHeader
      title="Estudar"
      subtitle="Questões e flashcards por artigo"
      onBack={() => navigate(-1)}
      leading={
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary" />
        </div>
      }
    />
  );

  const questoesMobileHeader = (
    <PageHeader
      title="Questões"
      subtitle="6 tipos de questão por artigo"
      onBack={handleBack}
      leading={
        <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center">
          <Target className="w-5 h-5 text-rose-500" />
        </div>
      }
    />
  );


  if (view === 'questoes-dashboard') {
    return (
      <DesktopPageLayout activeId="estudar" title="Questões" subtitle="Pratique por disciplina" mobileHeader={questoesMobileHeader}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 lg:max-w-none lg:px-0 lg:py-0">
          <QuestoesDashboard
            onSelectLei={(lei) => {
              const found = LEIS.find(l => l.tabela === lei.tabela);
              if (found) {
                setSelectedLei(found);
                loadArtigos(found.tabela);
                setView('select-artigo');
              }
            }}
            onNavigateDesempenho={() => setView('desempenho')}
            onBack={handleBack}
          />
        </div>
      </DesktopPageLayout>
    );
  }

  return (
    <>
    <DesktopPageLayout
      activeId="estudar"
      title="Estudar"
      subtitle="Questões e flashcards por artigo"
      mobileHeader={mobileHeader}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5 lg:max-w-none lg:px-0 lg:py-0">
        {/* Menu principal */}
        {view === 'menu' && (
          <>
            {/* Study tools list */}
            <div className="space-y-2">
              {[
                { label: 'Questões', desc: '6 tipos de questão por artigo', icon: Target, gradient: 'from-rose-500 to-red-700', onClick: () => handleSelectMode('questoes') },
                { label: 'Flashcards', desc: 'Cards com animação flip', icon: Layers, gradient: 'from-amber-500 to-orange-600', onClick: () => handleSelectMode('flashcards') },
                { label: 'Mapa Mental', desc: 'Visualização hierárquica', icon: Network, gradient: 'from-purple-600 to-purple-900', onClick: () => handleSelectMode('mapa_mental') },
                
                

                
              ].map((item, i) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all text-left group"
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0`}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </motion.button>
              ))}
            </div>
          </>
        )}

        {/* Seletor de Lei */}
        {view === 'select-lei' && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-3">Escolha a lei para {selectedMode === 'questoes' ? 'gerar questões' : 'gerar flashcards'}:</p>
            {LEIS.map((lei, i) => (
              <motion.button
                key={lei.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => handleSelectLei(lei)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:border-primary/40 transition-all text-left group"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{lei.nome}</p>
                  <p className="text-xs text-muted-foreground">{lei.sigla}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            ))}
          </div>
        )}

        {/* Seletor de Artigo */}
        {view === 'select-artigo' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Escolha o artigo de <span className="text-foreground font-semibold">{selectedLei?.nome}</span>:</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar artigo..."
                value={searchArtigo}
                onChange={(e) => setSearchArtigo(e.target.value)}
                className="pl-9"
              />
            </div>
            {loadingArtigos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2 pr-1">
                {filteredArtigos.map((a) => {
                  const key = `${selectedLei?.tabela}:${a.numero}`;
                  const stats = articleStats[key];
                  const pct = stats?.pct ?? 0;
                  const hasStats = !!stats;
                  const displayNumero = a.numero.startsWith('Art.') ? a.numero : `Art. ${a.numero}`;
                  const caputPreview = a.caput ? a.caput.slice(0, 90) + (a.caput.length > 90 ? '…' : '') : '';

                  return (
                    <button
                      key={a.numero}
                      onClick={() => handleSelectArtigo(a.numero)}
                      className="w-full text-left p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-all space-y-2 border-l-4 border-l-primary"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground">{displayNumero}</span>
                        {hasStats && (
                          <span className={`text-[11px] font-bold ${pct >= 70 ? 'text-emerald-500' : pct >= 40 ? 'text-primary' : 'text-red-500'}`}>
                            {pct}%
                          </span>
                        )}
                      </div>
                      {caputPreview && (
                        <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">{caputPreview}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          {hasStats ? (
                            <div className="h-full rounded-full flex">
                              <div className="bg-emerald-500 h-full" style={{ width: `${pct}%` }} />
                              <div className="bg-red-500/60 h-full" style={{ width: `${100 - pct}%` }} />
                            </div>
                          ) : (
                            <div className="h-full w-full bg-muted/20 rounded-full" />
                          )}
                        </div>
                        {hasStats && (
                          <span className="text-[9px] text-muted-foreground whitespace-nowrap">{stats.correct}/{stats.total}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DesktopPageLayout>
    <PremiumGate open={showPremiumGate} onClose={() => setShowPremiumGate(false)} feature={selectedMode === 'questoes' ? 'questoes' : selectedMode === 'flashcards' ? 'flashcards' : 'mapa_mental'} />
    </>
  );
};

export default Estudar;

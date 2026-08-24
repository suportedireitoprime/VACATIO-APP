import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, RotateCw, Target, Trophy, BarChart3, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import GeracaoAnimacaoOverlay from '@/components/vademecum/GeracaoAnimacaoOverlay';

interface QuestionMC {
  tipo: string;
  enunciado: string;
  alternativas: Record<string, string>;
  gabarito: string;
  comentario?: string;
  exemplo_pratico?: string;
}

interface Props {
  tabelaNome: string;
  artigoNumero: string;
  leiNome: string;
  onBack: () => void;
}

interface HistoryEntry { total: number; correct: number; created_at: string }

const QuizView = ({ tabelaNome, artigoNumero, leiNome, onBack }: Props) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuestionMC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [finished, setFinished] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('study_sessions')
      .select('total, correct, created_at')
      .eq('user_id', user.id)
      .eq('tabela_nome', tabelaNome)
      .eq('artigo_numero', artigoNumero)
      .eq('mode', 'questoes')
      .order('created_at', { ascending: false })
      .limit(20);
    setHistory((data as HistoryEntry[]) || []);
  };

  const load = async (forceRegen = false) => {
    setLoading(true);
    setError(null);
    setIndex(0);
    setSelected(null);
    setAnswers({});
    setFinished(false);
    try {
      if (!forceRegen) {
        const { data: cached } = await supabase
          .from('study_questions' as any)
          .select('questions')
          .eq('tabela_nome', tabelaNome)
          .eq('artigo_numero', artigoNumero)
          .maybeSingle();
        if (cached && (cached as any).questions?.length) {
          const mc = ((cached as any).questions as any[]).filter(q => q.tipo === 'multipla_escolha');
          if (mc.length) {
            setQuestions(mc as QuestionMC[]);
            setLoading(false);
            return;
          }
        }
      }
      const { data, error: fnErr } = await supabase.functions.invoke('gerar-estudo', {
        body: { tabela_nome: tabelaNome, artigo_numero: artigoNumero, mode: 'questoes' },
      });
      if (fnErr) throw fnErr;
      const mc = ((data?.data || []) as any[]).filter(q => q.tipo === 'multipla_escolha');
      if (!mc.length) throw new Error('Não recebemos questões.');
      setQuestions(mc as QuestionMC[]);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar questões.');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => { load(false); loadHistory();   }, [tabelaNome, artigoNumero, user?.id]);

  const current = questions[index];
  const answered = selected !== null;
  const isCorrect = answered && selected === current?.gabarito;
  const correctCount = useMemo(
    () => questions.reduce((acc, q, i) => acc + (answers[i] === q.gabarito ? 1 : 0), 0),
    [answers, questions]
  );

  const handleAnswer = (letter: string) => {
    if (answered) return;
    setSelected(letter);
    setAnswers(prev => ({ ...prev, [index]: letter }));
  };

  const next = async () => {
    if (index < questions.length - 1) {
      setIndex(i => i + 1);
      setSelected(null);
    } else {
      setFinished(true);
      // Persistir sessão
      if (user && questions.length) {
        const total = questions.length;
        const correct = questions.reduce((acc, q, i) => acc + (answers[i] === q.gabarito ? 1 : 0), 0)
          + (selected === current?.gabarito ? 1 : 0);
        await supabase.from('study_sessions').insert({
          user_id: user.id,
          tabela_nome: tabelaNome,
          artigo_numero: artigoNumero,
          mode: 'questoes',
          total,
          correct,
        });
        loadHistory();
      }
    }
  };

  const restart = () => {
    setIndex(0); setSelected(null); setAnswers({}); setFinished(false);
  };

  const avgPct = useMemo(() => {
    if (!history.length) return 0;
    const totalQ = history.reduce((a, h) => a + h.total, 0);
    const totalC = history.reduce((a, h) => a + h.correct, 0);
    return totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
  }, [history]);

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader
        title="Questões"
        subtitle={`${leiNome} · Art. ${artigoNumero}`}
        onBack={onBack}
        leading={
          <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center">
            <Target className="w-5 h-5 text-rose-500" />
          </div>
        }
        rightAction={
          <button
            onClick={() => setShowHistory(v => !v)}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted"
            aria-label="Histórico"
          >
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </button>
        }
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Painel histórico */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="p-4 rounded-2xl bg-card border border-border">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <Stat label="Tentativas" value={history.length} />
                  <Stat label="Questões" value={history.reduce((a, h) => a + h.total, 0)} />
                  <Stat label="Acerto médio" value={`${avgPct}%`} />
                </div>
                {history.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {history.slice(0, 10).map((h, i) => {
                      const pct = h.total ? Math.round((h.correct / h.total) * 100) : 0;
                      return (
                        <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{new Date(h.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="font-semibold text-foreground">{h.correct}/{h.total} · {pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhuma tentativa ainda. Responda para ver seu progresso.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <GeracaoAnimacaoOverlay
          open={loading}
          titulo="Gerando questões com IA"
          steps={["Lendo o artigo", "Elaborando questões", "Salvando", "Pronto"]}
          estTotalSec={35}
          onCancel={onBack}
          cancelLabel="Voltar"
        />
        {loading ? null : error ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={() => load(false)} variant="outline">Tentar novamente</Button>
          </div>
        ) : finished ? (
          <div className="text-center space-y-5 py-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-rose-500 to-red-700 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <div>
              <p className="text-3xl font-display font-bold text-foreground">
                {correctCount} / {questions.length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {Math.round((correctCount / questions.length) * 100)}% de acerto
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
              <Button onClick={restart} variant="outline" className="flex-1">
                <RotateCw className="w-4 h-4 mr-2" /> Refazer
              </Button>
              <Button onClick={onBack} className="flex-1">Voltar</Button>
            </div>
          </div>
        ) : current ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-muted-foreground font-medium">
                Questão {index + 1} / {questions.length}
              </span>
              <button
                onClick={() => { setRegenerating(true); load(true); }}
                disabled={regenerating}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5"
              >
                <RotateCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                Gerar novas
              </button>
            </div>

            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-card border border-border mb-4"
            >
              <p className="text-sm md:text-base text-foreground leading-relaxed font-medium">
                {current.enunciado}
              </p>
            </motion.div>

            <div className="space-y-2">
              {Object.entries(current.alternativas).map(([letter, text]) => {
                const isSelected = selected === letter;
                const isRight = letter === current.gabarito;
                const state = !answered
                  ? 'idle'
                  : isRight
                    ? 'correct'
                    : isSelected
                      ? 'wrong'
                      : 'idle';
                return (
                  <motion.button
                    key={letter}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer(letter)}
                    disabled={answered}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      state === 'correct' ? 'bg-emerald-500/10 border-emerald-500/60' :
                      state === 'wrong' ? 'bg-rose-500/10 border-rose-500/60' :
                      'bg-card border-border hover:border-primary/40'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                      state === 'correct' ? 'bg-emerald-500 text-white' :
                      state === 'wrong' ? 'bg-rose-500 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {state === 'correct' ? <CheckCircle2 className="w-4 h-4" /> :
                       state === 'wrong' ? <XCircle className="w-4 h-4" /> : letter}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed flex-1">{text}</p>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {answered && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 p-4 rounded-xl border ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-rose-500/10 border-rose-500/40'}`}
                >
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isCorrect ? 'Correto!' : `Resposta certa: ${current.gabarito}`}
                  </p>
                  {current.comentario && (
                    <p className="text-sm text-foreground leading-relaxed">{current.comentario}</p>
                  )}
                  {current.exemplo_pratico && (
                    <div className="mt-3 pt-3 border-t border-border/50 flex gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">{current.exemplo_pratico}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {answered && (
              <Button onClick={next} className="w-full mt-4">
                {index < questions.length - 1 ? 'Próxima' : 'Finalizar'}
              </Button>
            )}

            <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-red-700 transition-all"
                style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="text-center">
    <p className="text-lg font-display font-bold text-foreground">{value}</p>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
  </div>
);

export default QuizView;

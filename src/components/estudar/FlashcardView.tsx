import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, RotateCw, Sparkles, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';
import GeracaoAnimacaoOverlay from '@/components/vademecum/GeracaoAnimacaoOverlay';

interface Flashcard {
  frente: string;
  verso: string;
  exemplo_pratico?: string;
}

interface Props {
  tabelaNome: string;
  artigoNumero: string;
  leiNome: string;
  artigoTexto?: string;
  onBack: () => void;
  hideHeader?: boolean;
}

const FlashcardView = ({ tabelaNome, artigoNumero, leiNome, artigoTexto, onBack, hideHeader }: Props) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const numLimpo = useMemo(() => {
    return String(artigoNumero || '').replace(/^[^\d]*/, '').replace(/\D.*$/, '').trim() || String(artigoNumero || '').trim();
  }, [artigoNumero]);

  const load = async (forceRegen = false) => {
    setLoading(true);
    setError(null);
    setFlipped(false);
    setIndex(0);

    const cacheKey1 = `vacatio_flashcards_v2_${(leiNome || tabelaNome).toLowerCase().replace(/\s+/g, '_')}_art_${numLimpo}`;
    const cacheKey2 = `vacatio_flashcards_v2_${(tabelaNome || leiNome).toLowerCase().replace(/\s+/g, '_')}_art_${numLimpo}`;

    try {
      if (!forceRegen) {
        // 1. Tenta carregar do Supabase (compartilhado entre todas as telas)
        const { data: cached } = await supabase
          .from('study_flashcards' as any)
          .select('cards')
          .or(`tabela_nome.eq.${tabelaNome},tabela_nome.eq.${leiNome}`)
          .eq('artigo_numero', numLimpo)
          .maybeSingle();

        if (cached && Array.isArray((cached as any).cards) && (cached as any).cards.length) {
          setCards((cached as any).cards as Flashcard[]);
          setLoading(false);
          return;
        }

        // 2. Tenta carregar do cache local
        try {
          const localData = localStorage.getItem(cacheKey1) || localStorage.getItem(cacheKey2);
          if (localData) {
            const parsed = JSON.parse(localData);
            const lista = parsed?.cards || parsed?.flashcards || parsed;
            if (Array.isArray(lista) && lista.length) {
              setCards(lista as Flashcard[]);
              setLoading(false);
              return;
            }
          }
        } catch {
          // ignora falha de parse
        }
      }

      // 3. Invoca a Edge Function gerar-estudo compartilhada
      const { data, error: fnErr } = await supabase.functions.invoke('gerar-estudo', {
        body: {
          tabela_nome: tabelaNome,
          lei_nome: leiNome,
          artigo_numero: numLimpo,
          artigo_texto: artigoTexto,
          mode: 'flashcards'
        },
      });

      if (fnErr) {
        console.warn('Falha na invocação da Edge Function gerar-estudo:', fnErr);
      }

      const list = (data?.data || []) as Flashcard[];
      if (!list.length) {
        throw new Error('Não recebemos flashcards.');
      }

      // Salva no localStorage para sincronização imediata
      try {
        localStorage.setItem(cacheKey1, JSON.stringify(list));
      } catch {}

      setCards(list);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar flashcards.');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    load(false);
  }, [tabelaNome, leiNome, numLimpo]);

  const next = () => { setFlipped(false); setIndex(i => Math.min(cards.length - 1, i + 1)); };
  const prev = () => { setFlipped(false); setIndex(i => Math.max(0, i - 1)); };

  const current = cards[index];

  return (
    <div className={hideHeader ? "flex-1 w-full bg-background overflow-y-auto" : "min-h-dvh bg-background"}>
      {!hideHeader && (
        <PageHeader
          title="Flashcards"
          subtitle={`${leiNome} · Art. ${numLimpo}`}
          onBack={onBack}
          leading={
            <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
          }
        />
      )}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <GeracaoAnimacaoOverlay
          open={loading}
          titulo="Gerando flashcards com IA"
          steps={["Lendo o artigo", "Criando flashcards", "Salvando", "Pronto"]}
          estTotalSec={35}
          onCancel={onBack}
          cancelLabel="Voltar"
        />
        {loading ? null : error ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={() => load(false)} variant="outline">Tentar novamente</Button>
          </div>
        ) : current ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-muted-foreground font-medium">
                {index + 1} / {cards.length}
              </span>
              <button
                onClick={() => { setRegenerating(true); load(true); }}
                disabled={regenerating}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5"
              >
                <RotateCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                Gerar novos
              </button>
            </div>

            {/* Flip card */}
            <div
              className="relative w-full h-[420px] cursor-pointer select-none"
              style={{ perspective: '1200px' }}
              onClick={() => setFlipped(f => !f)}
            >
              <motion.div
                className="relative w-full h-full"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Frente */}
                <div
                  className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 flex flex-col items-center justify-center text-center shadow-xl"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <p className="text-[10px] uppercase tracking-widest text-white/70 mb-4">Pergunta</p>
                  <p className="text-xl md:text-2xl font-display font-bold text-white leading-snug">
                    {current.frente}
                  </p>
                  <p className="text-[11px] text-white/60 mt-6">Toque para ver a resposta</p>
                </div>

                {/* Verso */}
                <div
                  className="absolute inset-0 rounded-3xl bg-card border-2 border-amber-500/40 p-6 flex flex-col shadow-xl overflow-y-auto"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <p className="text-[10px] uppercase tracking-widest text-amber-500 mb-2">Resposta</p>
                  <p className="text-[17px] md:text-lg font-medium text-foreground leading-[1.55] whitespace-pre-wrap">
                    {current.verso}
                  </p>
                  {current.exemplo_pratico && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        <p className="text-[10px] uppercase tracking-widest text-amber-500 font-semibold">
                          Exemplo prático
                        </p>
                      </div>
                      <p className="text-[16px] md:text-[17px] font-medium text-foreground/85 leading-[1.55] whitespace-pre-wrap">
                        {current.exemplo_pratico}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Nav */}
            <div className="flex items-center justify-between mt-6 gap-3">
              <Button variant="outline" onClick={prev} disabled={index === 0} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
              <Button variant="outline" onClick={next} disabled={index >= cards.length - 1} className="flex-1">
                Próximo <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Progresso */}
            <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all"
                style={{ width: `${((index + 1) / cards.length) * 100}%` }}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default FlashcardView;
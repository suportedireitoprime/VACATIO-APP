import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Save } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { db } from '@/services/offlineDb';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { v4 as uuidv4 } from 'uuid';

interface NovaAnotacaoSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type Step = 'categoria' | 'lei' | 'artigo_texto';

const CATEGORIAS = [
  { id: 'Constituição', label: 'Constituição', tipo: 'constituicao' },
  { id: 'Códigos', label: 'Códigos', tipo: 'codigo' },
  { id: 'Estatutos', label: 'Estatutos', tipo: 'estatuto' },
  { id: 'Outras Leis', label: 'Outras Leis', tipo: 'lei-especial' },
];

export default function NovaAnotacaoSheet({ open, onClose, onSaved }: NovaAnotacaoSheetProps) {
  const [step, setStep] = useState<Step>('categoria');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [selectedLeiId, setSelectedLeiId] = useState<string>('');
  const [artigo, setArtigo] = useState('');
  const [texto, setTexto] = useState('');

  useEscapeKey(onClose, open);

  if (!open) return null;

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep('categoria');
      setSelectedCategoria('');
      setSelectedLeiId('');
      setArtigo('');
      setTexto('');
    }, 300);
  };

  const handleSave = async () => {
    if (!selectedLeiId) return;
    if (!texto.trim()) {
      toast.error('Digite sua anotação');
      return;
    }

    const lei = LEIS_CATALOG.find(l => l.id === selectedLeiId);
    if (!lei) return;

    // Se artigo vazio, marcamos como "geral"
    const artigoNumero = artigo.trim() || 'geral';
    const artigoId = `${lei.tabela_nome}::${artigoNumero}`;
    
    const payload = {
      texto: '', // anotação manual não tem texto grifado da lei
      comentario: texto.trim(),
      cor: 'hsl(var(--primary))', // cor padrão
      createdAt: Date.now(),
      manual: true
    };

    try {
      await db.highlights.add({
        id: uuidv4(),
        artigoId,
        data: JSON.stringify(payload)
      });

      // Salva no Supabase se logado
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        await supabase
          .from('artigos_anotacoes')
          .upsert({
            tabela_codigo: lei.tabela_nome,
            numero_artigo: artigoNumero,
            anotacao: texto.trim(),
            user_id: sessionData.session.user.id
          }, {
            onConflict: 'tabela_codigo, numero_artigo, user_id'
          });
      }

      toast.success('Anotação salva!');
      onSaved();
      handleClose();
    } catch (err: any) {
      toast.error('Erro ao salvar anotação');
      console.error(err);
    }
  };

  const leisDaCategoria = LEIS_CATALOG.filter(l => {
    if (selectedCategoria === 'constituicao') return l.tipo === 'constituicao';
    if (selectedCategoria === 'codigo') return l.tipo === 'codigo';
    if (selectedCategoria === 'estatuto') return l.tipo === 'estatuto';
    if (selectedCategoria === 'lei-especial') return l.tipo === 'lei-especial';
    return false;
  });

  const sheetContent = (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end pointer-events-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm pointer-events-auto"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-h-[85dvh] bg-card rounded-t-3xl shadow-2xl flex flex-col pointer-events-auto border-t border-border overflow-hidden"
      >
        <div className="flex-none p-4 pb-2 border-b border-border/50 flex items-center justify-between">
          {step !== 'categoria' ? (
            <button onClick={() => setStep(step === 'artigo_texto' ? 'lei' : 'categoria')} className="p-2 -ml-2 rounded-full hover:bg-secondary/80">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <h2 className="font-display text-lg font-bold">Nova anotação</h2>
          <button onClick={handleClose} className="p-2 -mr-2 rounded-full hover:bg-secondary/80 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence mode="wait">
            {step === 'categoria' && (
              <motion.div
                key="categoria"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                <p className="text-sm font-semibold text-muted-foreground mb-2">Escolha a categoria</p>
                {CATEGORIAS.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategoria(cat.tipo); setStep('lei'); }}
                    className="w-full p-4 rounded-2xl bg-secondary/30 border border-border text-left font-body hover:bg-secondary/60 transition"
                  >
                    {cat.label}
                  </button>
                ))}
              </motion.div>
            )}

            {step === 'lei' && (
              <motion.div
                key="lei"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                <p className="text-sm font-semibold text-muted-foreground mb-2">Selecione a lei</p>
                {leisDaCategoria.map(lei => (
                  <button
                    key={lei.id}
                    onClick={() => { setSelectedLeiId(lei.id); setStep('artigo_texto'); }}
                    className="w-full p-4 rounded-2xl bg-secondary/30 border border-border text-left hover:bg-secondary/60 transition"
                  >
                    <p className="font-bold text-foreground text-sm">{lei.sigla}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{lei.nome}</p>
                  </button>
                ))}
              </motion.div>
            )}

            {step === 'artigo_texto' && (
              <motion.div
                key="artigo_texto"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4 pb-12"
              >
                <div>
                  <label className="text-sm font-semibold text-muted-foreground block mb-1">Artigo (Opcional)</label>
                  <input 
                    type="text"
                    value={artigo}
                    onChange={(e) => setArtigo(e.target.value)}
                    placeholder="Ex: 121 (Deixe vazio para anotar sobre a lei toda)"
                    className="w-full bg-background border border-border rounded-xl p-3 font-body text-sm outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground block mb-1">Sua anotação</label>
                  <textarea 
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Escreva sua anotação ou resumo..."
                    rows={5}
                    className="w-full bg-background border border-border rounded-xl p-3 font-body text-sm outline-none focus:border-primary/50 resize-none"
                  />
                </div>
                
                <button
                  onClick={handleSave}
                  className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <Save className="w-5 h-5" />
                  Salvar anotação
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>{open && sheetContent}</AnimatePresence>,
    document.body
  ) : null;
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StickyNote, Trash2, Plus, Sparkles, Book, FileText, Scale, Grid2x2, Landmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { db, type OfflineHighlight } from '@/services/offlineDb';
import { PageHeader } from '@/components/vademecum/PageHeader';
import NovaAnotacaoSheet from '@/components/anotacoes/NovaAnotacaoSheet';
import { LEIS_CATALOG } from '@/data/leisCatalog';

interface NoteItem {
  id: string;
  artigoId: string;
  tabelaNome: string;
  artigoNumero: string;
  texto: string;
  comentario?: string;
  cor?: string;
  createdAt?: number;
  manual?: boolean;
}

function parseHighlight(h: OfflineHighlight): NoteItem | null {
  try {
    const parsed = JSON.parse(h.data);
    const [tabelaNome = '', artigoNumero = ''] = (h.artigoId || '').split('::');
    return {
      id: h.id,
      artigoId: h.artigoId,
      tabelaNome,
      artigoNumero,
      texto: parsed.text || parsed.selectedText || parsed.trecho || '',
      comentario: parsed.comentario || parsed.comment || parsed.note,
      cor: parsed.cor || parsed.color,
      createdAt: parsed.createdAt || parsed.updatedAt,
      manual: !!parsed.manual
    };
  } catch {
    return null;
  }
}

const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: Grid2x2 },
  { id: 'constituicao', label: 'Constituição', icon: Landmark },
  { id: 'codigo', label: 'Códigos', icon: Book },
  { id: 'estatuto', label: 'Estatutos', icon: FileText },
  { id: 'lei-especial', label: 'Leis Especiais', icon: Scale },
];

const getTipoDaTabela = (tabelaNome: string): string => {
  const lei = LEIS_CATALOG.find(l => l.tabela_nome === tabelaNome);
  return lei?.tipo || 'lei-especial';
};

const getNomeBonitoDaTabela = (tabelaNome: string): string => {
  const lei = LEIS_CATALOG.find(l => l.tabela_nome === tabelaNome);
  return lei?.sigla || tabelaNome.replace(/_/g, ' ');
};

const Anotacoes = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    const all = await db.highlights.toArray();
    const parsed = all
      .map(parseHighlight)
      .filter((n): n is NoteItem => !!n && (!!n.texto || !!n.comentario))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    setNotes(parsed);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredNotes = notes.filter((n) => {
    if (activeCategory === 'all') return true;
    const tipo = getTipoDaTabela(n.tabelaNome);
    return tipo === activeCategory;
  });

  const handleDelete = async (id: string) => {
    await db.highlights.delete(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="max-w-3xl mx-auto">
          <PageHeader
            title="Minhas Anotações"
            subtitle={`${notes.length} ${notes.length === 1 ? 'item' : 'itens'}`}
            onBack={() => navigate(-1)}
          />
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-3 pb-32 mt-2">
        <button
          onClick={() => setSheetOpen(true)}
          className="w-full h-14 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 text-primary hover:bg-primary/10 font-body font-semibold flex items-center justify-center gap-2 transition"
        >
          <Plus className="w-5 h-5" />
          Nova anotação
        </button>

        {loading ? (
          <div className="text-center text-muted-foreground text-sm py-16">Carregando...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Ainda sem anotações nesta categoria.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl bg-card border border-border p-3.5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: n.cor || 'hsl(var(--primary))' }}
                    />
                    <span className="font-body text-[11px] text-muted-foreground font-semibold truncate">
                      {getNomeBonitoDaTabela(n.tabelaNome)} {n.artigoNumero !== 'geral' && n.artigoNumero ? `• Art. ${n.artigoNumero}` : ''}
                    </span>
                    {n.manual && (
                      <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">Manual</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(n.id)}
                    aria-label="Excluir anotação"
                    className="w-7 h-7 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {n.texto && (
                  <p
                    className="font-body text-sm text-foreground leading-snug px-2 py-1.5 rounded-md"
                    style={{ backgroundColor: (n.cor || 'hsl(var(--primary))') + '22' }}
                  >
                    "{n.texto}"
                  </p>
                )}
                {n.comentario && (
                  <p className="font-body text-[13px] text-foreground leading-snug mt-2">
                    {n.comentario}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Fixed Bottom Menu */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-background/80 backdrop-blur-lg border-t border-border/50 pb-safe">
        <div className="max-w-3xl mx-auto px-2">
          <div className="flex items-center overflow-x-auto hide-scrollbar gap-2 py-2 snap-x">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`snap-start shrink-0 flex flex-col items-center justify-center px-4 py-1.5 rounded-xl transition-colors ${
                    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="relative flex flex-col items-center gap-1.5 px-2 py-1">
                    <Icon className="w-6 h-6" strokeWidth={active ? 2 : 1.5} />
                    {active && <div className="absolute -inset-2 rounded-full blur-md -z-10 bg-primary/10" />}
                    <span className={`font-body text-[11px] leading-tight ${active ? 'font-bold' : ''}`}>
                      {cat.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <NovaAnotacaoSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={load}
      />
    </div>
  );
};

export default Anotacoes;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StickyNote, Search, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { db, type OfflineHighlight } from '@/services/offlineDb';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/vademecum/PageHeader';


interface NoteItem {
  id: string;
  artigoId: string;
  tabelaNome: string;
  artigoNumero: string;
  texto: string;
  comentario?: string;
  cor?: string;
  createdAt?: number;
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
    };
  } catch {
    return null;
  }
}

const Anotacoes = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

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

  const filtered = notes.filter((n) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      n.texto.toLowerCase().includes(s) ||
      (n.comentario || '').toLowerCase().includes(s) ||
      n.artigoNumero.toLowerCase().includes(s) ||
      n.tabelaNome.toLowerCase().includes(s)
    );
  });

  const handleDelete = async (id: string) => {
    await db.highlights.delete(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader
        variant="dark"
        title="Anotações"
        subtitle={`${notes.length} ${notes.length === 1 ? 'grifo' : 'grifos'} salvos`}
        onBack={() => navigate(-1)}
      />


      <main className="px-4 pt-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar em suas anotações..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-11 bg-card border-border"
          />
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground text-sm py-16">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <StickyNote className="w-8 h-8 text-primary" />
            </div>
            <p className="font-display text-lg text-foreground mb-1">
              {q ? 'Nada encontrado' : 'Sem anotações ainda'}
            </p>
            <p className="text-muted-foreground text-sm">
              {q
                ? 'Tente outra palavra ou número de artigo.'
                : 'Grife um trecho em qualquer artigo para começar sua biblioteca pessoal.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n, i) => (
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
                    <span className="font-body text-[11px] text-muted-foreground truncate">
                      {n.tabelaNome.replace(/_/g, ' ')} • Art. {n.artigoNumero || '—'}
                    </span>
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
                  <p className="font-body text-[13px] text-muted-foreground leading-snug mt-2 italic">
                    — {n.comentario}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Anotacoes;

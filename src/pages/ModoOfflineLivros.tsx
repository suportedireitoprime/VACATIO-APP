import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileDown, Trash2, RefreshCw } from 'lucide-react';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { toast } from 'sonner';
import { formatBytes } from '@/data/offlineCatalog';
import { listCachedPdfs, clearAllPdfs } from '@/services/bibliotecaPdfCache';

export default function ModoOfflineLivros() {
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState<{ name: string; uri: string; size: number }[]>([]);

  const refresh = () => { listCachedPdfs().then(setPdfs).catch(() => setPdfs([])); };
  useEffect(() => { refresh(); }, []);

  const bytes = pdfs.reduce((s, p) => s + (p.size || 0), 0);

  const handleClear = async () => {
    if (!confirm('Remover todos os livros baixados?')) return;
    await clearAllPdfs();
    toast.success('Livros removidos');
    refresh();
  };

  const mobileHeader = (
    <PageHeader
      title="Livros offline"
      subtitle="Biblioteca no aparelho"
      onBack={() => navigate('/modo-offline')}
      leading={
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
      }
    />
  );

  return (
    <DesktopPageLayout activeId="ferramentas" title="Livros offline" subtitle="Biblioteca no aparelho" mobileHeader={mobileHeader}>
      <div className="px-4 sm:px-6 py-4 lg:max-w-none lg:px-0 lg:py-0 space-y-5">

        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileDown className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">
                {pdfs.length > 0 ? `${pdfs.length} livro${pdfs.length !== 1 ? 's' : ''} salvo${pdfs.length !== 1 ? 's' : ''}` : 'Nenhum livro baixado ainda'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {pdfs.length > 0 ? formatBytes(bytes) : 'Abra um livro e toque em "Baixar para offline".'}
              </p>
            </div>
            <button onClick={refresh} className="w-9 h-9 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center" aria-label="Atualizar">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate('/biblioteca')} className="flex-1 min-w-[140px] h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold">
              Escolher livros
            </button>
            <button onClick={() => navigate('/biblioteca-offline')} className="flex-1 min-w-[140px] h-10 rounded-xl border border-border text-xs font-semibold text-foreground">
              Capas e leitura nativa
            </button>
          </div>
        </section>

        {pdfs.length > 0 && (
          <section className="space-y-2">
            <h3 className="font-display font-bold text-sm text-foreground px-1">Baixados</h3>
            <div className="grid gap-1.5">
              {pdfs.map(p => (
                <div key={p.uri} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.name.replace(/\.pdf$/i, '')}</p>
                    <p className="text-[11px] text-muted-foreground">{formatBytes(p.size || 0)}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleClear} className="text-[11px] text-destructive hover:underline flex items-center gap-1 px-1 pt-1">
              <Trash2 className="w-3 h-3" /> Limpar livros baixados
            </button>
          </section>
        )}
      </div>
    </DesktopPageLayout>
  );
}

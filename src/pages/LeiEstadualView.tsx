import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Artigo {
  id: string;
  numero: string | null;
  texto: string;
  epigrafe: string | null;
  ordem: number | null;
}

interface Lei {
  id: string;
  slug: string;
  nome: string;
  nome_curto: string | null;
  total_artigos: number | null;
}

const LeiEstadualView = () => {
  const { uf, slug } = useParams<{ uf: string; slug: string }>();
  const navigate = useNavigate();
  const [lei, setLei] = useState<Lei | null>(null);
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: leiRow } = await supabase
        .from('vade_mecum_leis' as any)
        .select('id, slug, nome, nome_curto, total_artigos')
        .eq('slug', slug)
        .maybeSingle();
      if (!leiRow) { setLoading(false); return; }
      setLei(leiRow as any);
      const { data: arts } = await supabase
        .from('vade_mecum_artigos' as any)
        .select('id, numero, texto, epigrafe, ordem')
        .eq('lei_id', (leiRow as any).id)
        .order('ordem', { ascending: true })
        .limit(5000);
      setArtigos((arts as any as Artigo[]) || []);
      setLoading(false);
    })();
  }, [slug]);

  const filtered = q
    ? artigos.filter(a =>
        (a.texto || '').toLowerCase().includes(q.toLowerCase()) ||
        (a.numero || '').toLowerCase().includes(q.toLowerCase())
      )
    : artigos;

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto">
          <PageHeader
            title={lei?.nome_curto || lei?.nome || 'Lei estadual'}
            subtitle={lei ? `${artigos.length} artigos${uf ? ' · ' + uf.toUpperCase() : ''}` : ''}
            onBack={() => navigate(-1)}
          />
        </div>
      </div>

      <div className="px-4 py-3 max-w-5xl mx-auto">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar artigo..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10 bg-secondary border-border font-body"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !lei ? (
          <p className="text-center text-sm text-muted-foreground py-12">Lei não encontrada.</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhum artigo.</p>
        ) : (
          <div className="space-y-3 pb-24">
            {filtered.map((a) => (
              <div key={a.id} className="rounded-lg border border-border/60 bg-card p-4">
                {a.epigrafe && (
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{a.epigrafe}</p>
                )}
                {a.numero && (
                  <p className="text-[13px] font-semibold text-primary mb-1">Art. {a.numero}</p>
                )}
                <p className="text-[14px] whitespace-pre-wrap leading-relaxed">{a.texto}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeiEstadualView;

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, RefreshCw, WifiOff, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/vademecum/PageHeader';
import ArtigoBlocosMarkdown from '@/components/aprender/ArtigoBlocosMarkdown';
import { CATEGORIAS_EDUCACIONAIS } from '@/data/artigosEducacionais';
import { supabase } from '@/integrations/supabase/client';
import { isOffline } from '@/lib/offlineFeatures';
import { Button } from '@/components/ui/button';

interface ArtigoPayload {
  conteudo_md: string;
  fontes?: string[];
}

const cacheKey = (slug: string) => `artigo-edu:${slug}`;

function readCache(slug: string): ArtigoPayload | null {
  try {
    const raw = localStorage.getItem(cacheKey(slug));
    return raw ? (JSON.parse(raw) as ArtigoPayload) : null;
  } catch {
    return null;
  }
}

export default function ArtigoEducacional() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const artigo = useMemo(() => {
    for (const cat of CATEGORIAS_EDUCACIONAIS) {
      const found = cat.artigos.find((a) => a.slug === slug);
      if (found) return found;
    }
    return null;
  }, [slug]);

  const [data, setData] = useState<ArtigoPayload | null>(() => readCache(slug));
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar(force = false) {
    if (!artigo) return;
    if (!force && data?.conteudo_md) return;

    if (isOffline()) {
      if (!data?.conteudo_md) setErro('offline');
      return;
    }

    setLoading(true);
    setErro(null);
    try {
      const { data: res, error } = await supabase.functions.invoke('gerar-artigo-educacional', {
        body: { slug: artigo.slug, titulo: artigo.titulo, categoria: artigo.categoria },
      });
      if (error) throw error;
      const payload = res as ArtigoPayload;
      if (!payload?.conteudo_md) throw new Error('Conteúdo vazio');
      setData(payload);
      try {
        localStorage.setItem(cacheKey(artigo.slug), JSON.stringify(payload));
      } catch { /* cota cheia — segue sem cache */ }
    } catch (e) {
      console.error('[ArtigoEducacional]', e);
      setErro('falha');
      if (force) toast.error('Não foi possível carregar o artigo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setData(readCache(slug));
    setErro(null);
  }, [slug]);

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, artigo]);

  if (!artigo) {
    return (
      <div className="min-h-dvh bg-background">
        <PageHeader title="Artigo" onBack={() => navigate('/aprender')} />
        <div className="p-6 text-center text-muted-foreground text-sm">Artigo não encontrado.</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader
        title={artigo.titulo}
        subtitle={artigo.categoria}
        onBack={() => navigate(-1)}
        rightAction={
          <button
            type="button"
            onClick={() => carregar(true)}
            aria-label="Recarregar artigo"
            disabled={loading}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
          >
            <RefreshCw className={`w-[18px] h-[18px] text-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <main className="px-4 py-5 max-w-3xl mx-auto pb-24">
        <p className="text-[13px] text-muted-foreground mb-4">{artigo.descricao}</p>

        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Preparando o artigo…</p>
          </div>
        )}

        {!loading && !data && erro === 'offline' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <WifiOff className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Você está sem internet. Este artigo ainda não foi baixado — abra-o uma vez com conexão para lê-lo offline depois.
            </p>
          </div>
        )}

        {!loading && !data && erro === 'falha' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <p className="text-sm text-muted-foreground">Não conseguimos carregar este artigo agora.</p>
            <Button onClick={() => carregar(true)} size="sm">Tentar novamente</Button>
          </div>
        )}

        {data?.conteudo_md && <ArtigoBlocosMarkdown content={data.conteudo_md} />}

        {!!data?.fontes?.length && (
          <section className="mt-8 pt-5 border-t border-border/60">
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Fontes</h2>
            <ul className="space-y-1.5">
              {data.fontes.map((f, i) => (
                <li key={i}>
                  <a
                    href={f}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12.5px] text-primary inline-flex items-center gap-1 break-all"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    {f}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

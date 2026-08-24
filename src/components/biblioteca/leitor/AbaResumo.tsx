import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tema } from '@/hooks/useLeitorPrefs';

interface Props {
  paginaMd: string;
  livroTitulo: string;
  capituloTitulo: string;
  paginaNum: number;
  cacheKey: string;
  tema: Tema;
  fonteFamily: string;
}

export default function AbaResumo({ paginaMd, livroTitulo, capituloTitulo, paginaNum, cacheKey, tema, fonteFamily }: Props) {
  const [resumo, setResumo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const dark = tema.isDark;

  const gerar = async (force = false) => {
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setResumo(cached);
        return;
      }
    }
    setLoading(true);
    setErro(null);
    try {
      const { data, error } = await supabase.functions.invoke('biblioteca-enriquecer', {
        body: {
          action: 'resumo',
          pagina_md: paginaMd,
          livro_titulo: livroTitulo,
          capitulo_titulo: capituloTitulo,
          pagina_num: paginaNum,
        },
      });
      if (error) throw error;
      const md = String(data?.resumo_md || '').trim();
      if (!md) throw new Error('vazio');
      setResumo(md);
      sessionStorage.setItem(cacheKey, md);
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (msg.includes('429') || msg.includes('rate_limit')) setErro('Limite temporário atingido. Aguarde alguns instantes.');
      else if (msg.includes('402') || msg.includes('creditos')) setErro('Créditos de IA esgotados no workspace.');
      else setErro('Não foi possível gerar o resumo agora.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    gerar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  if (loading && !resumo) {
    return (
      <div className="p-6 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2 animate-pulse">
            <div className="h-4 w-1/4 rounded" style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
            <div className="h-3 w-full rounded" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }} />
            <div className="h-3 w-11/12 rounded" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }} />
            <div className="h-3 w-3/4 rounded" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }} />
          </div>
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-6 flex flex-col items-center gap-3 text-center">
        <AlertCircle className="w-8 h-8 opacity-60" />
        <p className="text-sm opacity-80 max-w-xs">{erro}</p>
        <button
          onClick={() => gerar(true)}
          className="mt-2 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          <RefreshCw className="w-4 h-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  if (!resumo) return null;

  return (
    <div className="px-5 py-4 pb-24">
      <div className="flex items-center justify-between pb-2">
        <p className="text-xs uppercase tracking-wider opacity-60">Resumo da página {paginaNum}</p>
        <button
          onClick={() => gerar(true)}
          disabled={loading}
          className="text-xs opacity-70 hover:opacity-100 flex items-center gap-1 disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Regenerar
        </button>
      </div>
      <article
        className="prose prose-sm max-w-none"
        style={{ fontFamily: fonteFamily, color: tema.text }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: (p) => <h2 className="text-base font-bold mt-5 mb-2 text-primary" {...p} />,
            h3: (p) => <h3 className="text-sm font-semibold mt-4 mb-1" {...p} />,
            p: (p) => <p className="mb-3 leading-relaxed" {...p} />,
            ul: (p) => <ul className="mb-3 pl-5 space-y-1 list-disc" {...p} />,
            li: (p) => <li className="leading-snug" {...p} />,
            strong: (p) => <strong className="font-semibold text-primary" {...p} />,
          }}
        >
          {resumo}
        </ReactMarkdown>
      </article>
    </div>
  );
}

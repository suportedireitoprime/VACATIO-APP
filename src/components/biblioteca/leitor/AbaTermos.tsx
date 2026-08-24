import { useEffect, useState } from 'react';
import { ChevronDown, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import type { Tema } from '@/hooks/useLeitorPrefs';

interface Termo {
  termo: string;
  categoria: string;
  significado: string;
  contexto?: string;
  aplicacao?: string;
}

interface Props {
  paginaMd: string;
  livroTitulo: string;
  capituloTitulo: string;
  paginaNum: number;
  cacheKey: string;
  tema: Tema;
}

const CAT_COR: Record<string, string> = {
  jurídico: 'hsl(45 90% 50%)',
  juridico: 'hsl(45 90% 50%)',
  latim: 'hsl(280 60% 60%)',
  técnico: 'hsl(200 70% 55%)',
  tecnico: 'hsl(200 70% 55%)',
  histórico: 'hsl(20 70% 55%)',
  historico: 'hsl(20 70% 55%)',
  pessoa: 'hsl(340 60% 60%)',
  conceito: 'hsl(160 55% 45%)',
};

export default function AbaTermos({ paginaMd, livroTitulo, capituloTitulo, paginaNum, cacheKey, tema }: Props) {
  const [termos, setTermos] = useState<Termo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const dark = tema.isDark;

  const gerar = async (force = false) => {
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          setTermos(JSON.parse(cached));
          return;
        } catch {}
      }
    }
    setLoading(true);
    setErro(null);
    try {
      const { data, error } = await supabase.functions.invoke('biblioteca-enriquecer', {
        body: { action: 'termos',
          pagina_md: paginaMd,
          livro_titulo: livroTitulo,
          capitulo_titulo: capituloTitulo,
          pagina_num: paginaNum,
        },
      });
      if (error) throw error;
      const arr = Array.isArray(data?.termos) ? data.termos : [];
      setTermos(arr);
      sessionStorage.setItem(cacheKey, JSON.stringify(arr));
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (msg.includes('429') || msg.includes('rate_limit')) setErro('Limite temporário atingido. Aguarde alguns instantes.');
      else if (msg.includes('402') || msg.includes('creditos')) setErro('Créditos de IA esgotados no workspace.');
      else setErro('Não foi possível gerar os termos agora.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    gerar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  if (loading && !termos) {
    return (
      <div className="p-6 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
            <div className="h-4 w-1/3 rounded mb-2" style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
            <div className="h-3 w-full rounded" style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />
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

  if (!termos || termos.length === 0) {
    return (
      <div className="p-6 text-center text-sm opacity-70">
        <p>Nenhum termo que exige explicação foi encontrado nesta página.</p>
        <button
          onClick={() => gerar(true)}
          className="mt-4 text-xs underline opacity-80 hover:opacity-100"
        >
          Reprocessar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2 pb-24">
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="text-xs uppercase tracking-wider opacity-60">
          {termos.length} termo{termos.length > 1 ? 's' : ''} desta página
        </p>
        <button
          onClick={() => gerar(true)}
          disabled={loading}
          className="text-xs opacity-70 hover:opacity-100 flex items-center gap-1 disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Regenerar
        </button>
      </div>
      {termos.map((t, i) => {
        const cor = CAT_COR[t.categoria?.toLowerCase()] || 'hsl(var(--primary))';
        const open = openIdx === i;
        return (
          <motion.button
            key={i}
            onClick={() => setOpenIdx(open ? null : i)}
            className="w-full text-left rounded-xl p-4 border transition"
            style={{
              background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderColor: tema.border,
            }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-[15px]">{t.termo}</h3>
                  <span
                    className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ background: `${cor}22`, color: cor }}
                  >
                    {t.categoria}
                  </span>
                </div>
                <p className="text-sm opacity-85 leading-snug">{t.significado}</p>
                {open && (t.contexto || t.aplicacao) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 pt-2 border-t space-y-2"
                    style={{ borderColor: tema.border }}
                  >
                    {t.contexto && (
                      <p className="text-xs opacity-70 italic">
                        <span className="font-semibold not-italic opacity-90">Nesta página: </span>
                        {t.contexto}
                      </p>
                    )}
                    {t.aplicacao && (
                      <p
                        className="text-xs leading-relaxed rounded-lg p-2"
                        style={{
                          background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                        }}
                      >
                        <span className="font-semibold opacity-90">Exemplo prático: </span>
                        <span className="opacity-80">{t.aplicacao}</span>
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
              {(t.contexto || t.aplicacao) && (
                <ChevronDown
                  className={`w-4 h-4 mt-1 shrink-0 transition-transform opacity-60 ${open ? 'rotate-180' : ''}`}
                />
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

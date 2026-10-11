import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { COLECOES, findColecao, normalizeLivro, type LivroNormalizado } from '@/lib/bibliotecaColecoes';
import { useVisibleColecoes } from '@/hooks/useVisibleColecoes';
import { withBundleFallback, bundle } from '@/services/offlineBundle';
import { getPersistedColecao, setPersistedColecao } from '@/services/offlineDb';
import { scheduleWarmBiblioteca } from '@/services/bibliotecaWarmup';
import { startCapasPrefetch } from '@/services/bibliotecaCapasPrefetch';
import { startLeituraNativaPrefetch } from '@/services/leituraNativaPrefetch';

const PERFORMANCE_IDS = ['fora-da-toga', 'oratoria', 'lideranca', 'portugues', 'pesquisa'];

export type AbaBiblioteca = 'performance' | 'acervos' | 'materias';

export function useBibliotecasData() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const abaUrl = searchParams.get('aba') as AbaBiblioteca;
  const materiaUrl = searchParams.get('materia');

  const [livroAberto, setLivroAberto] = useState<LivroNormalizado | null>(null);
  const [customPdfUrl, setCustomPdfUrl] = useState<string | null>(null);
  const [customPdfTitle, setCustomPdfTitle] = useState<string>('');
  // Counts derivados do cache do React Query ou rede — nunca bloqueia render.
  const { data: counts = {} } = useQuery({
    queryKey: ['biblioteca-counts'],
    staleTime: 60 * 60 * 1000, // 1h — quase nunca muda
    gcTime: 24 * 60 * 60 * 1000,
    placeholderData: (prev: Record<string, number> | undefined) => prev ?? {},
    queryFn: async (): Promise<Record<string, number>> => {
      const result: Record<string, number> = {};
      // Tenta derivar dos dados já cacheados pelo warmup
      for (const c of COLECOES) {
        const cached = queryClient.getQueryData<LivroNormalizado[]>(['biblioteca-colecao', c.id]);
        if (cached?.length) {
          result[c.id] = cached.length;
        }
      }
      // Só busca contagem via rede para coleções sem cache
      const missing = COLECOES.filter((c) => !result[c.id]);
      if (missing.length > 0) {
        await Promise.all(
          missing.map(async (c) => {
            try {
              const { count } = await supabase.from(c.table).select('id', { count: 'exact', head: true });
              result[c.id] = count || 0;
            } catch {
              result[c.id] = 0;
            }
          }),
        );
      }
      return result;
    },
  });

  const location = useLocation();

  useEffect(() => {
    if (location.state?.openLivro) {
      setLivroAberto(location.state.openLivro as LivroNormalizado);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Ponte nativa Capacitor
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      let isMounted = true;
      let closeHandler: { remove: () => void } | null = null;

      (async () => {
        try {
          const { NativeBiblioteca } = await import('@/plugins/NativeBibliotecaPlugin');
          const { data: auth } = await supabase.auth.getSession();
          const token = auth.session?.access_token || '';

          if (!isMounted) return;

          closeHandler = await NativeBiblioteca.addListener('onClose', () => {
            navigate(-1);
          });

          await NativeBiblioteca.openBiblioteca({
            aba: abaUrl || 'acervos',
            materia: materiaUrl || '',
            accessToken: token,
          });
        } catch (e) {
          console.warn('Fallback para interface web da biblioteca:', e);
        }
      })();

      return () => {
        isMounted = false;
        closeHandler?.remove();
      };
    }
  }, [abaUrl, materiaUrl, navigate]);

  const aba: AbaBiblioteca =
    abaUrl && ['performance', 'acervos', 'materias'].includes(abaUrl) ? abaUrl : 'acervos';
  const materiaAberta = materiaUrl || null;

  const setAba = (newAba: AbaBiblioteca) => {
    setSearchParams(
      (prev) => {
        prev.set('aba', newAba);
        prev.delete('materia');
        return prev;
      },
      { replace: true },
    );
  };

  const setMateriaAberta = (novaMateria: string | null) => {
    setSearchParams(
      (prev) => {
        if (novaMateria) prev.set('materia', novaMateria);
        else prev.delete('materia');
        return prev;
      },
      { replace: true },
    );
  };

  const colecoesVisiveis = useVisibleColecoes();

  useEffect(() => {
    getPersistedColecao('areas').then((cached) => {
      if (cached && cached.length > 0) {
        const current = queryClient.getQueryData(['biblioteca-colecao', 'areas']);
        if (!current) {
          queryClient.setQueryData(['biblioteca-colecao', 'areas'], cached);
        }
      }
    });
  }, [queryClient]);

  const colecoesPerformance = useMemo(
    () => colecoesVisiveis.filter((c) => PERFORMANCE_IDS.includes(c.id)),
    [colecoesVisiveis],
  );
  const colecoesAcervos = colecoesVisiveis;

  const { data: materias = [] } = useQuery({
    queryKey: ['biblioteca-materias-count'],
    staleTime: 60 * 60 * 1000, // 1h cache
    placeholderData: (prev) => prev ?? [],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('biblioteca-contagem-areas');
        if (error) throw error;
        if (data?.data) {
          setPersistedColecao('materias-count', data.data).catch(() => {});
          return data.data as { name: string; capa?: string; count: number }[];
        }
        return [];
      } catch (err) {
        const cached = await getPersistedColecao<{ name: string; capa?: string; count: number }>('materias-count');
        if (cached && cached.length > 0) return cached;
        throw err;
      }
    },
  });

  // SEO & Título dinâmico por aba da biblioteca
  useEffect(() => {
    const rotulos = {
      acervos: 'Biblioteca - Acervos | Vade Mecum PRIME',
      performance: 'Biblioteca - Performance & Desenvolvimento | Vade Mecum PRIME',
      materias: 'Biblioteca - Matérias do Direito | Vade Mecum PRIME',
    };
    document.title = rotulos[aba] || 'Biblioteca Jurídica | Vade Mecum PRIME';
  }, [aba]);

  useEffect(() => {
    const cancel = scheduleWarmBiblioteca(queryClient);
    if (!Capacitor.isNativePlatform()) return cancel;
    startCapasPrefetch({ wifiOnly: false }).catch(() => {});
    startLeituraNativaPrefetch({ wifiOnly: true }).catch(() => {});
    return cancel;
  }, [queryClient]);

  return {
    navigate,
    aba,
    setAba,
    materiaAberta,
    setMateriaAberta,
    counts,
    materias,
    livroAberto,
    setLivroAberto,
    customPdfUrl,
    setCustomPdfUrl,
    customPdfTitle,
    setCustomPdfTitle,
    colecoesPerformance,
    colecoesAcervos,
  };
}

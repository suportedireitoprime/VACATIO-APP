import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useBuscaConteudo } from '@/hooks/useBuscaConteudo';
import CategoriaFiltroBar, { type CategoriaKey } from './CategoriaFiltroBar';
import ResultadoConteudoCard from './ResultadoConteudoCard';
import BuscaChecklist from './BuscaChecklist';
import SugestoesAprendidas from './SugestoesAprendidas';
import { useSugestoesBusca, registrarBuscaClick } from '@/hooks/useSugestoesBusca';

const SUGESTOES = ['princípios', 'dolo', 'boa-fé', 'devido processo legal', 'contrato', 'posse', 'habeas corpus'];

export default function ConteudoBusca({
  query, onNavigate,
}: { query: string; onNavigate?: () => void }) {
  const [categoria, setCategoria] = useState<CategoriaKey>('tudo');
  const { resultados, loading } = useBuscaConteudo(query, 'tudo');
  const { sugestoes } = useSugestoesBusca(query, query.trim().length >= 2);
  const navigate = useNavigate();

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of resultados) c[r.entity_type] = (c[r.entity_type] || 0) + 1;
    return c;
  }, [resultados]);

  const filtrados = useMemo(
    () => categoria === 'tudo' ? resultados : resultados.filter((r) => r.entity_type === categoria),
    [resultados, categoria],
  );

  const termoCurto = query.trim().length < 2;

  const irPara = (route: string) => {
    onNavigate?.();
    navigate(route);
  };

  return (
    <div className="space-y-3">
      {!termoCurto && (
        <CategoriaFiltroBar ativo={categoria} counts={counts} onChange={setCategoria} />
      )}

      {!termoCurto && sugestoes.length > 0 && (
        <SugestoesAprendidas
          sugestoes={sugestoes}
          onClick={(s) => {
            if (!s.top_route) return;
            registrarBuscaClick(query, {
              entity_type: s.top_entity_type || 'sugestao',
              entity_id: s.top_route,
              title: s.top_title,
              subtitle: s.top_subtitle,
              thumb_url: s.top_thumb_url,
              route: s.top_route,
            });
            irPara(s.top_route);
          }}
        />
      )}

      {!termoCurto && (
        <BuscaChecklist query={query} loading={loading} resultCount={filtrados.length} />
      )}

      {termoCurto && (
        <div className="px-4 py-8 space-y-4">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Pesquise qualquer termo. Trazemos videoaulas, livros, blog, resumos, notícias e filmes que citam o assunto.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground py-2 px-1 font-semibold">
              Sugestões
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    const ev = new CustomEvent('search:sugestao', { detail: s });
                    window.dispatchEvent(ev);
                  }}
                  className="px-3 py-1.5 rounded-full bg-muted text-sm text-foreground hover:bg-primary/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!termoCurto && !loading && filtrados.length === 0 && (
        <p className="text-center text-muted-foreground text-base py-10 px-4">
          Nada encontrado para "{query}". Tente outro termo.
        </p>
      )}

      {!termoCurto && filtrados.length > 0 && (
        <div className="space-y-2 px-2">
          {filtrados.map((item, i) => (
            <ResultadoConteudoCard
              key={`${item.entity_type}-${item.entity_id}-${i}`}
              item={item}
              termo={query}
              index={i}
              onClick={() => {
                registrarBuscaClick(query, {
                  entity_type: item.entity_type,
                  entity_id: item.entity_id,
                  entity_table: item.entity_table,
                  title: item.title,
                  subtitle: item.subtitle,
                  thumb_url: item.thumb_url,
                  route: item.route,
                });
                irPara(item.route);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

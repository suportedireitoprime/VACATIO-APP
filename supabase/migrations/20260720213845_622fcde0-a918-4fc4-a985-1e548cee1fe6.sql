
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Tabela de contagem de buscas (termos populares)
CREATE TABLE IF NOT EXISTS public.search_hits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  termo text NOT NULL,
  termo_norm text NOT NULL,
  tipo text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_search_hits_norm ON public.search_hits (termo_norm);
CREATE INDEX IF NOT EXISTS idx_search_hits_created ON public.search_hits (created_at DESC);

GRANT SELECT, INSERT ON public.search_hits TO anon;
GRANT SELECT, INSERT ON public.search_hits TO authenticated;
GRANT ALL ON public.search_hits TO service_role;

ALTER TABLE public.search_hits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "search_hits insert público" ON public.search_hits;
CREATE POLICY "search_hits insert público" ON public.search_hits FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "search_hits select público" ON public.search_hits;
CREATE POLICY "search_hits select público" ON public.search_hits FOR SELECT USING (true);

-- Função RPC de busca universal
CREATE OR REPLACE FUNCTION public.buscar_conteudo(_termo text, _tipo text DEFAULT NULL, _limit int DEFAULT 40)
RETURNS TABLE(
  entity_type text,
  entity_id text,
  entity_table text,
  title text,
  subtitle text,
  snippet text,
  thumb_url text,
  route text,
  score real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := lower(unaccent(coalesce(_termo, '')));
  pat text := '%' || q || '%';
BEGIN
  IF length(q) < 2 THEN RETURN; END IF;

  RETURN QUERY
  WITH
  vids AS (
    SELECT 'videoaula'::text AS entity_type,
           v.video_id::text AS entity_id,
           'videoaula_conteudo'::text AS entity_table,
           v.titulo AS title,
           v.canal AS subtitle,
           left(coalesce(v.resumo_md, v.transcricao, ''), 180) AS snippet,
           NULL::text AS thumb_url,
           ('/videoaula/' || v.video_id) AS route,
           (similarity(lower(unaccent(coalesce(v.titulo,''))), q) * 2
            + similarity(lower(unaccent(coalesce(v.resumo_md,''))), q))::real AS score
    FROM public.videoaula_conteudo v
    WHERE (_tipo IS NULL OR _tipo = 'videoaula')
      AND (lower(unaccent(coalesce(v.titulo,'') || ' ' || coalesce(v.canal,'') || ' ' || coalesce(v.resumo_md,''))) LIKE pat)
    ORDER BY score DESC
    LIMIT _limit
  ),
  livros AS (
    SELECT * FROM (
      SELECT 'livro'::text AS entity_type, l.id::text AS entity_id, 'biblioteca_classicos'::text AS entity_table,
             l.livro AS title, l.autor AS subtitle, left(coalesce(l.sobre,''),180) AS snippet,
             coalesce(l.capa_horizontal, l.imagem) AS thumb_url,
             ('/biblioteca/classicos/' || l.id) AS route,
             (similarity(lower(unaccent(coalesce(l.livro,''))), q) * 2 + similarity(lower(unaccent(coalesce(l.sobre,''))), q))::real AS score
      FROM public.biblioteca_classicos l
      WHERE lower(unaccent(coalesce(l.livro,'')||' '||coalesce(l.autor,'')||' '||coalesce(l.sobre,'')||' '||coalesce(l.area,''))) LIKE pat
      UNION ALL
      SELECT 'livro', l.id::text, 'biblioteca_estudos', l.tema, l.area, left(coalesce(l.sobre,''),180),
             coalesce(l.capa_horizontal, l.capa_livro),
             ('/biblioteca/estudos/' || l.id),
             (similarity(lower(unaccent(coalesce(l.tema,''))), q) * 2 + similarity(lower(unaccent(coalesce(l.sobre,''))), q))::real
      FROM public.biblioteca_estudos l
      WHERE lower(unaccent(coalesce(l.tema,'')||' '||coalesce(l.area,'')||' '||coalesce(l.sobre,''))) LIKE pat
      UNION ALL
      SELECT 'livro', l.id::text, 'biblioteca_oab', l.tema, l.area, left(coalesce(l.sobre,''),180),
             coalesce(l.capa_horizontal, l.capa_livro),
             ('/biblioteca/oab/' || l.id),
             (similarity(lower(unaccent(coalesce(l.tema,''))), q) * 2 + similarity(lower(unaccent(coalesce(l.sobre,''))), q))::real
      FROM public.biblioteca_oab l
      WHERE lower(unaccent(coalesce(l.tema,'')||' '||coalesce(l.area,'')||' '||coalesce(l.sobre,''))) LIKE pat
      UNION ALL
      SELECT 'livro', l.id::text, 'biblioteca_portugues', l.livro, l.autor, left(coalesce(l.sobre,''),180),
             coalesce(l.capa_horizontal, l.imagem),
             ('/biblioteca/portugues/' || l.id),
             (similarity(lower(unaccent(coalesce(l.livro,''))), q) * 2 + similarity(lower(unaccent(coalesce(l.sobre,''))), q))::real
      FROM public.biblioteca_portugues l
      WHERE lower(unaccent(coalesce(l.livro,'')||' '||coalesce(l.autor,'')||' '||coalesce(l.sobre,''))) LIKE pat
      UNION ALL
      SELECT 'livro', l.id::text, 'biblioteca_pesquisa_cientifica', l.livro, l.autor, left(coalesce(l.sobre,''),180),
             coalesce(l.capa_horizontal, l.imagem),
             ('/biblioteca/pesquisa/' || l.id),
             (similarity(lower(unaccent(coalesce(l.livro,''))), q) * 2 + similarity(lower(unaccent(coalesce(l.sobre,''))), q))::real
      FROM public.biblioteca_pesquisa_cientifica l
      WHERE lower(unaccent(coalesce(l.livro,'')||' '||coalesce(l.autor,'')||' '||coalesce(l.sobre,''))) LIKE pat
      UNION ALL
      SELECT 'livro', l.id::text, 'biblioteca_lideranca', l.livro, l.autor, left(coalesce(l.sobre,''),180),
             coalesce(l.capa_horizontal, l.imagem),
             ('/biblioteca/lideranca/' || l.id),
             (similarity(lower(unaccent(coalesce(l.livro,''))), q) * 2 + similarity(lower(unaccent(coalesce(l.sobre,''))), q))::real
      FROM public.biblioteca_lideranca l
      WHERE lower(unaccent(coalesce(l.livro,'')||' '||coalesce(l.autor,'')||' '||coalesce(l.sobre,''))) LIKE pat
      UNION ALL
      SELECT 'livro', l.id::text, 'biblioteca_fora_da_toga', l.livro, l.autor, left(coalesce(l.sobre,''),180),
             coalesce(l.capa_horizontal, l.capa_livro),
             ('/biblioteca/fora-da-toga/' || l.id),
             (similarity(lower(unaccent(coalesce(l.livro,''))), q) * 2 + similarity(lower(unaccent(coalesce(l.sobre,''))), q))::real
      FROM public.biblioteca_fora_da_toga l
      WHERE lower(unaccent(coalesce(l.livro,'')||' '||coalesce(l.autor,'')||' '||coalesce(l.sobre,''))) LIKE pat
    ) x
    WHERE (_tipo IS NULL OR _tipo = 'livro')
    ORDER BY score DESC
    LIMIT _limit
  ),
  blog AS (
    SELECT 'blog'::text, b.id::text, 'blog_edicao_posts'::text,
           b.titulo, b.categoria, left(coalesce(b.resumo, b.headline_push,''),180),
           coalesce(b.imagem_thumb_url, b.imagem_url),
           ('/blog/' || b.id),
           (similarity(lower(unaccent(coalesce(b.titulo,''))), q) * 2 + similarity(lower(unaccent(coalesce(b.resumo,''))), q))::real
    FROM public.blog_edicao_posts b
    WHERE (_tipo IS NULL OR _tipo = 'blog')
      AND b.publicado = true
      AND lower(unaccent(coalesce(b.titulo,'')||' '||coalesce(b.resumo,'')||' '||coalesce(b.headline_push,''))) LIKE pat
    ORDER BY 9 DESC
    LIMIT _limit
  ),
  resumos AS (
    SELECT 'resumo'::text, r.id::text, 'resumos_juridicos'::text,
           r.tema, coalesce(r.subtema, r.area), left(coalesce(r.markdown,''),180),
           NULL::text,
           ('/resumos/' || r.id),
           (similarity(lower(unaccent(coalesce(r.tema,''))), q) * 2 + similarity(lower(unaccent(coalesce(r.markdown,''))), q))::real
    FROM public.resumos_juridicos r
    WHERE (_tipo IS NULL OR _tipo = 'resumo')
      AND lower(unaccent(coalesce(r.tema,'')||' '||coalesce(r.subtema,'')||' '||coalesce(r.area,'')||' '||coalesce(r.markdown,''))) LIKE pat
    ORDER BY 9 DESC
    LIMIT _limit
  ),
  noticias AS (
    SELECT 'noticia'::text, n.id::text, 'noticias_juridicas'::text,
           n.titulo, coalesce(n.fonte, n.categoria), left(coalesce(n.resumo,''),180),
           n.imagem_url,
           ('/noticias/' || n.id),
           (similarity(lower(unaccent(coalesce(n.titulo,''))), q) * 2 + similarity(lower(unaccent(coalesce(n.resumo,''))), q))::real
    FROM public.noticias_juridicas n
    WHERE (_tipo IS NULL OR _tipo = 'noticia')
      AND lower(unaccent(coalesce(n.titulo,'')||' '||coalesce(n.resumo,'')||' '||coalesce(n.conteudo_md,''))) LIKE pat
    ORDER BY 9 DESC
    LIMIT _limit
  ),
  obras AS (
    SELECT 'obra'::text, o.id::text, 'tematica_juridica_obras'::text,
           o.titulo, o.tipo, left(coalesce(o.sinopse,''),180),
           coalesce(o.poster_url, o.backdrop_url),
           ('/tematica/' || o.id),
           (similarity(lower(unaccent(coalesce(o.titulo,''))), q) * 2 + similarity(lower(unaccent(coalesce(o.sinopse,''))), q))::real
    FROM public.tematica_juridica_obras o
    WHERE (_tipo IS NULL OR _tipo = 'obra')
      AND o.ativo = true
      AND lower(unaccent(coalesce(o.titulo,'')||' '||coalesce(o.titulo_original,'')||' '||coalesce(o.sinopse,''))) LIKE pat
    ORDER BY 9 DESC
    LIMIT _limit
  )
  SELECT * FROM vids
  UNION ALL SELECT * FROM livros
  UNION ALL SELECT * FROM blog
  UNION ALL SELECT * FROM resumos
  UNION ALL SELECT * FROM noticias
  UNION ALL SELECT * FROM obras
  ORDER BY score DESC NULLS LAST
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.buscar_conteudo(text, text, int) TO anon, authenticated, service_role;

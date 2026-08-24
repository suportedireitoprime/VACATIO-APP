
-- 1) Rewrite buscar_conteudo with correct book routes
CREATE OR REPLACE FUNCTION public.buscar_conteudo(_termo text, _tipo text DEFAULT NULL::text, _limit integer DEFAULT 40)
 RETURNS TABLE(entity_type text, entity_id text, entity_table text, title text, subtitle text, snippet text, thumb_url text, route text, score real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
             ('/bibliotecas/classicos?livro=' || l.id) AS route,
             (similarity(lower(unaccent(coalesce(l.livro,''))), q) * 2 + similarity(lower(unaccent(coalesce(l.sobre,''))), q))::real AS score
      FROM public.biblioteca_classicos l
      WHERE lower(unaccent(coalesce(l.livro,'')||' '||coalesce(l.autor,'')||' '||coalesce(l.sobre,'')||' '||coalesce(l.area,''))) LIKE pat
      UNION ALL
      SELECT 'livro', l.id::text, 'biblioteca_estudos', l.tema, l.area, left(coalesce(l.sobre,''),180),
             coalesce(l.capa_horizontal, l.capa_livro),
             ('/bibliotecas/areas?livro=' || l.id),
             (similarity(lower(unaccent(coalesce(l.tema,''))), q) * 2 + similarity(lower(unaccent(coalesce(l.sobre,''))), q))::real
      FROM public.biblioteca_estudos l
      WHERE lower(unaccent(coalesce(l.tema,'')||' '||coalesce(l.area,'')||' '||coalesce(l.sobre,''))) LIKE pat
      UNION ALL
      SELECT 'livro', l.id::text, 'biblioteca_oab', l.tema, l.area, left(coalesce(l.sobre,''),180),
             coalesce(l.capa_horizontal, l.capa_livro),
             ('/bibliotecas/oab?livro=' || l.id),
             (similarity(lower(unaccent(coalesce(l.tema,''))), q) * 2 + similarity(lower(unaccent(coalesce(l.sobre,''))), q))::real
      FROM public.biblioteca_oab l
      WHERE lower(unaccent(coalesce(l.tema,'')||' '||coalesce(l.area,'')||' '||coalesce(l.sobre,''))) LIKE pat
      UNION ALL
      SELECT 'livro', l.id::text, 'biblioteca_portugues', l.livro, l.autor, left(coalesce(l.sobre,''),180),
             coalesce(l.capa_horizontal, l.imagem),
             ('/bibliotecas/portugues?livro=' || l.id),
             (similarity(lower(unaccent(coalesce(l.livro,''))), q) * 2 + similarity(lower(unaccent(coalesce(l.sobre,''))), q))::real
      FROM public.biblioteca_portugues l
      WHERE lower(unaccent(coalesce(l.livro,'')||' '||coalesce(l.autor,'')||' '||coalesce(l.sobre,''))) LIKE pat
      UNION ALL
      SELECT 'livro', l.id::text, 'biblioteca_pesquisa_cientifica', l.livro, l.autor, left(coalesce(l.sobre,''),180),
             coalesce(l.capa_horizontal, l.imagem),
             ('/bibliotecas/pesquisa?livro=' || l.id),
             (similarity(lower(unaccent(coalesce(l.livro,''))), q) * 2 + similarity(lower(unaccent(coalesce(l.sobre,''))), q))::real
      FROM public.biblioteca_pesquisa_cientifica l
      WHERE lower(unaccent(coalesce(l.livro,'')||' '||coalesce(l.autor,'')||' '||coalesce(l.sobre,''))) LIKE pat
      UNION ALL
      SELECT 'livro', l.id::text, 'biblioteca_lideranca', l.livro, l.autor, left(coalesce(l.sobre,''),180),
             coalesce(l.capa_horizontal, l.imagem),
             ('/bibliotecas/lideranca?livro=' || l.id),
             (similarity(lower(unaccent(coalesce(l.livro,''))), q) * 2 + similarity(lower(unaccent(coalesce(l.sobre,''))), q))::real
      FROM public.biblioteca_lideranca l
      WHERE lower(unaccent(coalesce(l.livro,'')||' '||coalesce(l.autor,'')||' '||coalesce(l.sobre,''))) LIKE pat
      UNION ALL
      SELECT 'livro', l.id::text, 'biblioteca_fora_da_toga', l.livro, l.autor, left(coalesce(l.sobre,''),180),
             coalesce(l.capa_horizontal, l.capa_livro),
             ('/bibliotecas/fora-da-toga?livro=' || l.id),
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
           ('/noticias?item=' || n.id),
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
$function$;

-- 2) search_learning table
CREATE TABLE IF NOT EXISTS public.search_learning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  termo_norm text NOT NULL UNIQUE,
  termo_display text NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  top_entity_type text,
  top_entity_id text,
  top_entity_table text,
  top_title text,
  top_subtitle text,
  top_thumb_url text,
  top_route text,
  top_clicks integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.search_learning TO anon, authenticated;
GRANT ALL ON public.search_learning TO service_role;

ALTER TABLE public.search_learning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_learning_read_all" ON public.search_learning
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_search_learning_termo_norm_trgm
  ON public.search_learning USING gin (termo_norm gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_learning_clicks
  ON public.search_learning (clicks DESC, hits DESC);

CREATE TRIGGER trg_search_learning_updated_at
  BEFORE UPDATE ON public.search_learning
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) sugerir_busca RPC
CREATE OR REPLACE FUNCTION public.sugerir_busca(_prefix text, _limit integer DEFAULT 6)
 RETURNS TABLE(termo_display text, top_title text, top_subtitle text, top_thumb_url text, top_route text, top_entity_type text, clicks integer, hits integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH q AS (SELECT lower(unaccent(coalesce(_prefix, ''))) AS p)
  SELECT sl.termo_display, sl.top_title, sl.top_subtitle, sl.top_thumb_url,
         sl.top_route, sl.top_entity_type, sl.clicks, sl.hits
  FROM public.search_learning sl, q
  WHERE length(q.p) >= 2
    AND sl.top_route IS NOT NULL
    AND (sl.termo_norm LIKE q.p || '%'
         OR sl.termo_norm LIKE '%' || q.p || '%'
         OR q.p = ANY(sl.tags))
  ORDER BY (sl.termo_norm LIKE q.p || '%') DESC, sl.clicks DESC, sl.hits DESC
  LIMIT greatest(_limit, 1);
$function$;

GRANT EXECUTE ON FUNCTION public.sugerir_busca(text, integer) TO anon, authenticated, service_role;

-- 4) registrar_busca_click RPC (safe: only updates aggregates, no PII)
CREATE OR REPLACE FUNCTION public.registrar_busca_click(
  _termo text,
  _entity_type text,
  _entity_id text,
  _entity_table text,
  _title text,
  _subtitle text,
  _thumb_url text,
  _route text
) RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  norm_termo text := lower(unaccent(coalesce(_termo,'')));
  new_tags text[];
BEGIN
  IF length(norm_termo) < 2 OR _entity_id IS NULL OR _route IS NULL THEN RETURN; END IF;

  new_tags := ARRAY(
    SELECT DISTINCT lower(unaccent(t))
    FROM regexp_split_to_table(coalesce(_title,'') || ' ' || coalesce(_subtitle,''), '\s+') AS t
    WHERE length(t) >= 3
    LIMIT 20
  );

  INSERT INTO public.search_learning AS sl
    (termo_norm, termo_display, hits, clicks,
     top_entity_type, top_entity_id, top_entity_table, top_title, top_subtitle, top_thumb_url, top_route, top_clicks, tags)
  VALUES
    (norm_termo, _termo, 1, 1,
     _entity_type, _entity_id, _entity_table, _title, _subtitle, _thumb_url, _route, 1, new_tags)
  ON CONFLICT (termo_norm) DO UPDATE SET
    hits = sl.hits + 1,
    clicks = sl.clicks + 1,
    termo_display = EXCLUDED.termo_display,
    tags = ARRAY(SELECT DISTINCT unnest(sl.tags || EXCLUDED.tags)),
    top_entity_type = CASE WHEN sl.top_entity_id = EXCLUDED.top_entity_id THEN sl.top_entity_type ELSE
                        CASE WHEN sl.top_clicks < 1 THEN EXCLUDED.top_entity_type ELSE sl.top_entity_type END END,
    top_entity_id = CASE WHEN sl.top_entity_id = EXCLUDED.top_entity_id THEN sl.top_entity_id ELSE
                      CASE WHEN sl.top_clicks < 1 THEN EXCLUDED.top_entity_id ELSE sl.top_entity_id END END,
    top_entity_table = CASE WHEN sl.top_entity_id = EXCLUDED.top_entity_id THEN sl.top_entity_table ELSE
                         CASE WHEN sl.top_clicks < 1 THEN EXCLUDED.top_entity_table ELSE sl.top_entity_table END END,
    top_title = CASE WHEN sl.top_entity_id = EXCLUDED.top_entity_id THEN EXCLUDED.top_title ELSE
                  CASE WHEN sl.top_clicks < 1 THEN EXCLUDED.top_title ELSE sl.top_title END END,
    top_subtitle = CASE WHEN sl.top_entity_id = EXCLUDED.top_entity_id THEN EXCLUDED.top_subtitle ELSE
                     CASE WHEN sl.top_clicks < 1 THEN EXCLUDED.top_subtitle ELSE sl.top_subtitle END END,
    top_thumb_url = CASE WHEN sl.top_entity_id = EXCLUDED.top_entity_id THEN EXCLUDED.top_thumb_url ELSE
                      CASE WHEN sl.top_clicks < 1 THEN EXCLUDED.top_thumb_url ELSE sl.top_thumb_url END END,
    top_route = CASE WHEN sl.top_entity_id = EXCLUDED.top_entity_id THEN EXCLUDED.top_route ELSE
                  CASE WHEN sl.top_clicks < 1 THEN EXCLUDED.top_route ELSE sl.top_route END END,
    top_clicks = CASE WHEN sl.top_entity_id = EXCLUDED.top_entity_id THEN sl.top_clicks + 1 ELSE
                   CASE WHEN sl.top_clicks < 1 THEN 1 ELSE sl.top_clicks END END;

  -- Se o item clicado ultrapassar o top atual em cliques dentro do mesmo termo,
  -- promove-o (simples: contamos cliques via search_hits futuro; MVP mantém primeiro clique).
END;
$function$;

GRANT EXECUTE ON FUNCTION public.registrar_busca_click(text, text, text, text, text, text, text, text) TO anon, authenticated, service_role;

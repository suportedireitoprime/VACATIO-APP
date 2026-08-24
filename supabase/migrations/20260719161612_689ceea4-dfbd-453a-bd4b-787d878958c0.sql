CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

CREATE TABLE IF NOT EXISTS public.locais_juridicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  osm_id text UNIQUE,
  categoria text NOT NULL,
  nome text NOT NULL,
  endereco text,
  cidade text,
  uf text,
  cep text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  telefone text,
  site text,
  email text,
  horario jsonb,
  tags jsonb,
  fonte text NOT NULL DEFAULT 'osm',
  wikimedia_commons text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.locais_juridicos TO anon, authenticated;
GRANT ALL ON public.locais_juridicos TO service_role;

ALTER TABLE public.locais_juridicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Locais são públicos para leitura"
  ON public.locais_juridicos FOR SELECT
  USING (true);

CREATE POLICY "Admins gerenciam locais"
  ON public.locais_juridicos FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE INDEX IF NOT EXISTS locais_categoria_uf_idx
  ON public.locais_juridicos (categoria, uf);

CREATE INDEX IF NOT EXISTS locais_geo_idx
  ON public.locais_juridicos USING gist (ll_to_earth(lat, lng));

CREATE TRIGGER locais_juridicos_updated_at
  BEFORE UPDATE ON public.locais_juridicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.locais_categorias_seed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  nome text NOT NULL,
  endereco text,
  cidade text,
  uf text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  telefone text,
  site text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.locais_categorias_seed TO anon, authenticated;
GRANT ALL ON public.locais_categorias_seed TO service_role;

ALTER TABLE public.locais_categorias_seed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seed público leitura"
  ON public.locais_categorias_seed FOR SELECT USING (ativo = true);

CREATE POLICY "Admins gerenciam seed"
  ON public.locais_categorias_seed FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER locais_categorias_seed_updated_at
  BEFORE UPDATE ON public.locais_categorias_seed
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- RPC para buscar locais mais próximos
CREATE OR REPLACE FUNCTION public.locais_proximos(
  _lat double precision,
  _lng double precision,
  _categorias text[] DEFAULT NULL,
  _limite integer DEFAULT 50,
  _raio_km integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  osm_id text,
  categoria text,
  nome text,
  endereco text,
  cidade text,
  uf text,
  lat double precision,
  lng double precision,
  telefone text,
  site text,
  horario jsonb,
  fonte text,
  dist_km double precision
)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT
    l.id, l.osm_id, l.categoria, l.nome, l.endereco, l.cidade, l.uf,
    l.lat, l.lng, l.telefone, l.site, l.horario, l.fonte,
    (earth_distance(ll_to_earth(l.lat, l.lng), ll_to_earth(_lat, _lng)) / 1000.0) AS dist_km
  FROM public.locais_juridicos l
  WHERE (_categorias IS NULL OR l.categoria = ANY(_categorias))
    AND earth_box(ll_to_earth(_lat, _lng), _raio_km * 1000) @> ll_to_earth(l.lat, l.lng)
  ORDER BY earth_distance(ll_to_earth(l.lat, l.lng), ll_to_earth(_lat, _lng))
  LIMIT greatest(_limite, 1);
$$;

GRANT EXECUTE ON FUNCTION public.locais_proximos(double precision, double precision, text[], integer, integer)
  TO anon, authenticated, service_role;

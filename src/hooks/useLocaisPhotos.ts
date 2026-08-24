import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlaceReview {
  authorAttribution?: { displayName?: string; photoUri?: string };
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  publishTime?: string;
}

export interface PhotoResult {
  id: string;
  photo_url: string | null;
  photo_attribution: string | null;
  rating?: number | null;
  user_ratings_total?: number | null;
  editorial_summary?: string | null;
  google_maps_uri?: string | null;
  reviews?: PlaceReview[] | null;
}

/**
 * Hidrata fotos + metadados (Google Places) para uma lista de locais.
 */
export function useLocaisPhotos(localIds: string[]) {
  const [photos, setPhotos] = useState<Record<string, PhotoResult>>({});
  const pedidosRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!localIds.length) return;
    const pendentes = localIds.filter((id) => !pedidosRef.current.has(id));
    if (!pendentes.length) return;
    pendentes.forEach((id) => pedidosRef.current.add(id));

    (async () => {
      const { data: cached } = await supabase
        .from('locais_juridicos')
        .select('id, photo_url, photo_attribution, rating, user_ratings_total, editorial_summary, google_maps_uri, reviews')
        .in('id', pendentes);

      const jaTem = new Set<string>();
      if (cached) {
        const inicial: Record<string, PhotoResult> = {};
        for (const row of cached as any[]) {
          if (row.photo_url) {
            inicial[row.id] = {
              id: row.id,
              photo_url: row.photo_url,
              photo_attribution: row.photo_attribution,
              rating: row.rating,
              user_ratings_total: row.user_ratings_total,
              editorial_summary: row.editorial_summary,
              google_maps_uri: row.google_maps_uri,
              reviews: row.reviews,
            };
            jaTem.add(row.id);
          }
        }
        if (Object.keys(inicial).length) {
          setPhotos((prev) => ({ ...prev, ...inicial }));
        }
      }

      const faltando = pendentes.filter((id) => !jaTem.has(id));
      if (!faltando.length) return;

      for (let i = 0; i < faltando.length; i += 20) {
        const lote = faltando.slice(i, i + 20);
        const { data, error } = await supabase.functions.invoke(
          'locais-overpass-sync',
          { body: { action: 'photos', local_ids: lote } },
        );
        if (error) {
          console.error('locais-overpass-sync photos', error);
          continue;
        }
        const novos: Record<string, PhotoResult> = {};
        for (const p of (data?.photos ?? []) as PhotoResult[]) {
          if (p.photo_url) novos[p.id] = p;
        }
        setPhotos((prev) => ({ ...prev, ...novos }));
      }
    })();
  }, [localIds]);

  return photos;
}

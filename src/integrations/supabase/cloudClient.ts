import { createClient } from '@supabase/supabase-js';

// Lovable Cloud project (separate from the external legislation Supabase used
// by `client.ts`). Tables like `jurisprudencia_prontas`, `artigos_grifos`,
// `artigos_anotacoes`, `artigo_ai_cache`, etc. live here.
const CLOUD_URL = 'https://loghkxvzllthmxxxjbby.supabase.co';
const CLOUD_PUBLISHABLE_KEY = 'sb_publishable_hv8boBAiDZoC9CbwUslnsw_SXLoLDsy';

export const supabaseCloud = createClient<any>(CLOUD_URL, CLOUD_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: false,
    autoRefreshToken: false,
  },
});
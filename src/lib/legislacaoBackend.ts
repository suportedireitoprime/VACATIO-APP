// Backend externo (projeto "iftdrbxvekrhzstayjwp") onde vivem TODAS as leis,
// artigos, súmulas, narrações e edge functions do Vade Mecum.
//
// IMPORTANTE: NÃO usar `import.meta.env.VITE_SUPABASE_URL` como fallback aqui.
// O `.env` deste projeto (Lovable Cloud) aponta para o backend próprio do app
// (usuários, boards, dicionário...), que NÃO contém as tabelas
// `vade_mecum_leis` / `vade_mecum_artigos`. Se usarmos o env, as chamadas
// batem no projeto errado e voltam vazias (Constituição/Códigos sem artigos).
export const LEIS_SUPABASE_URL = 'https://iftdrbxvekrhzstayjwp.supabase.co';
export const LEIS_SUPABASE_PROJECT_ID = 'iftdrbxvekrhzstayjwp';
export const LEIS_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGRyYnh2ZWtyaHpzdGF5andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc5OTksImV4cCI6MjA5OTQxMzk5OX0.7nyvQlO5IDI6E4dLYHl6yrqqaNd53RxJcDOTQ7yNh40';

export const leisAuthHeaders = () => ({
  apikey: LEIS_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${LEIS_SUPABASE_ANON_KEY}`,
});
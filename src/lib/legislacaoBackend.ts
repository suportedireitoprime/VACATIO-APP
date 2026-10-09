// Backend externo (projeto "tlpxubeagmxapkysgobk") onde vivem TODAS as leis,
// artigos, súmulas, narrações e edge functions do Vade Mecum.
//
// IMPORTANTE: NÃO usar `import.meta.env.VITE_SUPABASE_URL` como fallback aqui.
// O `.env` deste projeto (App Cloud) aponta para o backend próprio do app
// (usuários, boards, dicionário...), que NÃO contém as tabelas
// `vade_mecum_leis` / `vade_mecum_artigos`. Se usarmos o env, as chamadas
// batem no projeto errado e voltam vazias (Constituição/Códigos sem artigos).
export const LEIS_SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
export const LEIS_SUPABASE_PROJECT_ID = 'tlpxubeagmxapkysgobk';
export const LEIS_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo';

export const leisAuthHeaders = () => ({
  apikey: LEIS_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${LEIS_SUPABASE_ANON_KEY}`,
});
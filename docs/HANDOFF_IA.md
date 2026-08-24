# Handoff para IA — OAB na Risca / Vade Mecum 2026

> **Leia isto ANTES de fazer qualquer alteração.** Este documento é a fonte de verdade sobre como o app funciona, quais modelos de IA usar, quais APIs estão em produção e como o build é gerado. Se algo aqui conflitar com o que você "acha que sabe", o documento vence.

---

## 1. Identidade do projeto

- **Nome comercial:** OAB na Risca
- **Nome interno / repo:** Vade Mecum 2026 (`vade-comenta-legal`)
- **Pacote Android:** `br.com.vacatio.app`
- **Público-alvo:** estudantes de OAB, concurseiros e operadores do Direito
- **URL Lovable publicada:** https://vade-comenta-legal.lovable.app
- **Google Play:** publicado como "OAB na Risca"

---

## 2. Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Vite 5 + React 18 + TypeScript 5 + Tailwind v3 + shadcn/ui |
| Animações | framer-motion (spring 200/25, slide right-to-left) |
| Native | Capacitor Android (iOS **não** está configurado) |
| Backend | Supabase (projeto `iftdrbxvekrhzstayjwp`) |
| Edge Functions | ~60 funções em Deno + `npm:` imports |
| Banco | Postgres com RLS estrito, pg_cron, ~60 tabelas, ~160 migrations |
| Offline device | Dexie (IndexedDB), TanStack Virtual, Fuse.js |
| PDF/OCR | react-pdf, Tesseract.js (client) + Mistral OCR (server) |

---

## 3. Regras de IA — **OBRIGATÓRIAS**

Todas as chamadas de IA passam pelo **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1`) autenticado com `LOVABLE_API_KEY`. **Não** chame Google/OpenAI diretamente para texto ou imagem.

### Texto (chat, geração, análise, extração)
- **Padrão obrigatório:** `google/gemini-2.5-flash`
- **Só para batch barato/classificação:** `google/gemini-2.5-flash-lite`
- **Não usar** `gpt-*`, `gemini-pro`, `gemini-1.5-*` — o app inteiro é padronizado em 2.5 Flash por custo.

### Imagem (geração/edição)
- **Padrão:** o modelo Gemini mais barato disponível — `google/gemini-2.5-flash-image` (Nano Banana) ou `google/gemini-3.1-flash-lite-image` (Nano Banana 2 Lite)
- **Não usar** `gpt-image-2` nem `google/gemini-3-pro-image` (caros demais para este projeto).

### Voz / TTS (narração)
- **Modelo:** `google/gemini-2.5-flash-tts`
- **Voz:** `Kore`
- **Formato:** WAV, 24kHz, mono, 16-bit, header de 44 bytes
- **Onde:** edge function `narrar-artigo` e `narrar-frase`

### Transcrição / STT
- `openai/whisper-1` (única exceção OpenAI, usado no grifar-por-voz)

### Prompt style (jurídico)
- Tom de estudante de Direito (não de IA genérica).
- Sempre citar artigo específico quando gerar headline / resumo.
- Nunca inventar jurisprudência; se não tiver certeza, dizer isso.

---

## 4. APIs externas e para que servem

| Secret | Serviço | Onde é usado |
|---|---|---|
| `LOVABLE_API_KEY` | Lovable AI Gateway | Todas as chamadas de IA (texto/imagem/TTS/STT) |
| `MISTRAL_API_KEY` | Mistral OCR | `biblioteca-ocr-mistral`, `processar-pdf` (6 páginas / 6k chars por página) |
| `PERPLEXITY_API_KEY` | Perplexity | Enriquecimento de biblioteca com pesquisa web |
| `TINIFY_API_KEY` | TinyPNG | Proxy de imagens: TinyPNG → cache WebP → fallback wsrv.nl |
| `BROWSERLESS_API_KEY` | Browserless | Scraping de SPAs (Migalhas, Planalto) — HTML puro via `fetch` primeiro; Browserless só quando precisa JS |
| `YOUTUBE_API_KEY` | YouTube Data API v3 | Busca de videoaulas + extração de `captionTracks` |
| `TMDB_API_KEY` | TMDB | Metadata de filmes/séries na Temática Jurídica |
| `RESEND_API_KEY` | Resend | Envio de newsletter e boletins |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Google Play Developer | Validação de compras + PubSub de assinaturas |
| `FCM_SERVICE_ACCOUNT_JSON` | Firebase Cloud Messaging | Push notifications (Android) |
| `GITHUB_API_KEY` | GitHub REST API | Sync de secrets do Supabase → GitHub Actions |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | Google AI (legado) | Alguns edge functions antigos ainda leem — **novos devem usar Gateway** |

---

## 5. Como funciona o build (crítico — leia antes de mexer em native)

**Não builda no computador local.** Todo release do Android sai pelo GitHub Actions.

- **Workflow:** `.github/workflows/build-android.yml`
- **Trigger:** manual (`workflow_dispatch`) em `Actions → Build Android (.aab + .apk) → Run workflow`
- **O que acontece a cada run:**
  1. `rm -rf android && bunx cap add android` — regenera do zero
  2. Injeta `google-services.json` (Firebase) via secret
  3. Aplica deep links, shortcuts, Play Billing, ícone adaptativo, splash
  4. Assina com keystore vindo dos secrets (`admin-download-secret` permite baixar as senhas)
  5. Gera `app-vacatio-<versão>.aab` + `.apk`

### Versionamento automático
- **Regra:** `versionName` cresce automaticamente por `run_number`.
  - Fase 1: `1.0.65` (run #3) → `1.0.99` (run #37), +1 por build
  - Fase 2: `1.1.0` (run #38) → `1.1.0.99` (run #137)
  - Fase 3: `1.2.0` (run #138) → …
- **`versionCode`:** timestamp `YYJJJHHMM` — sempre crescente, garante que o Google Play aceita.

### A pasta `android/` **NÃO está no Git** (padrão Capacitor).
Toda mudança em Android tem que ir **no workflow**, não em arquivos nativos. Se mexer em `AndroidManifest`, `build.gradle`, ícone ou splash, edite o passo correspondente em `build-android.yml`.

### Detalhes complementares
- Guia de assets nativos: `/admin-native-assets` no app (ícone, splash, `google-services.json`)
- Guia passo a passo em prosa: `/admin-atualizacao`
- Secrets Android para download em `.txt`: `/admin-secrets` (protegido por senha `ADMIN_DOWNLOAD_PASSWORD` + whitelist `ADMIN_DOWNLOAD_EMAILS`)

---

## 6. Estrutura do admin

Rota raiz: `/admin-funcoes` (renderiza `AdminFuncoes.tsx`). Categorias:

| Seção | Rotas |
|---|---|
| Notificações Push | `/admin-push`, `/teste-push` |
| Geração de Conteúdo | `/admin-blog-edicao`, `/admin-overlay-frases`, `/geracao-admin`, `/narracao`, `/explicacao-lei`, `/newsletter`, `/admin-biblioteca-editar`, `/radar/deputados`, `/simulado-admin`, `/gamificacao`, `/mapa-mental` |
| Passo a passo — Atualização | `/admin-atualizacao`, `/admin-native-assets`, `/admin-handoff` (este documento) |
| Secrets & Credenciais | `/admin-secrets` |
| Configurações | `/configuracoes` |
| Monitoramento | `/admin-monitor`, `/admin-monitor-usuarios` |
| Depuração | crash de teste (só native) |

Acesso: via `user_roles` com role `admin`, checado por `has_role(auth.uid(), 'admin')` (função SECURITY DEFINER).

---

## 7. Tabelas-chave

| Tabela | Papel |
|---|---|
| `leis`, `artigos_lei` | Corpo dos códigos e leis (Vade Mecum) |
| `incisos`, `paragrafos` | Hierarquia detalhada de artigos |
| `artigo_ai_cache` | Cache de todo conteúdo gerado por IA (upsert por unique index) |
| `artigo_educacional_cache` | Cache de artigos "Aprender" |
| `biblioteca_livros`, `biblioteca_imagens`, `biblioteca_favoritos` | Biblioteca com OCR |
| `radar_proposicoes`, `radar_deputados`, `radar_senadores`, `radar_votacoes`, `radar_ranking`, `radar_pl_headlines` | Radar 360 (Câmara/Senado, sync 3h/6h) |
| `legislacao_alteracoes` | Diff de mudanças em leis |
| `noticias_camara` | Feed do radar |
| `mentor_conversas`, `mentor_mensagens`, `mentor_perfil`, `mentor_historico_resumo` | Assistente IA |
| `simulados`, `simulado_questoes`, `simulado_process_logs` | Provas OAB + pipeline OCR |
| `blog_edicao_posts`, `blog_edicao_temas`, `blog_edicao_config`, `blog_edicao_logs` | Blog automático (IA + push) |
| `narracoes_artigos` | Áudios Gemini TTS |
| `profiles`, `user_preferences`, `user_activity_log`, `user_reminders` | Usuário |
| `user_roles` | **Roles em tabela separada — nunca no profile** |
| `premium_usage`, `assinaturas`, `play_subscriptions` | Freemium + Play Billing |
| `device_tokens` | FCM push |
| `overlay_frases` | Frases mostradas durante geração de IA |
| `anotacoes_artigo`, `artigos_grifos`, `artigos_favoritos`, `artigos_visualizacoes` | Interações com artigos |
| `sumulas`, `decretos`, `constituicoes_estaduais` | Legislação complementar |

---

## 8. Regras de negócio inegociáveis

- **Roles:** sempre em `user_roles` + função `has_role`. Jamais em `profiles`.
- **Freemium:** `PremiumGate` bloqueia features específicas; `usePremiumUsage` conta 3/mês por feature.
- **Parsing legal:**
  - `Art.` (maiúsculo) inicia novo artigo
  - `(\d)o` → `$1º` (ordinal)
  - Texto revogado entre `()` recebe `bg-purple-500/20`
  - Ignorar `<strike>` e `<s>`
  - Unificar linhas consecutivas
- **Cache de IA:** todo output persiste em `artigo_ai_cache` (unique index para upsert seguro).
- **RLS:** toda tabela nova em `public` precisa `GRANT` explícito + policies. Sem exceção.
- **Sem limite 1000 rows:** REST tem cap 10k; para queries grandes, use RPCs.
- **CF88 ADCT:** artigos do ADCT recebem offset `+10000` em `ordem_numero` para listar no final.
- **Radar headlines:** 50-100 chars, sempre citando artigo específico.

---

## 9. Convenções de UI

- **Tema padrão:** Dark Wine (HSL 340 55% 12%) + Ivory (40 15% 92%). Logo "V" branco com balança.
- **Nunca hardcodar cores** (`text-white`, `bg-black`, `bg-[#...]`). Sempre tokens semânticos.
- **Layout:**
  - Mobile: single column
  - Desktop: 3 colunas (sidebar fixo + `max-w-5xl` centro + right news sidebar)
- **Sheets:** 88vh mobile, `max-w-lg` desktop, spring animations
- **Study sheets:** `max-w-3xl` desktop
- **Listas grandes:** `useDeferredValue` com delay de 350ms
- **Transições:** spring 200/25, slide right-to-left, exceto Home e Auth
- **Feature overlays:** `z-[60]`, fixed, slide-in da direita
- **Elementos sobre fundo amarelo:** usar `bg-black/20 backdrop-blur` para contraste
- **AI Assistant:** slide-up overlay
- **Grifo Mágico:** 5 categorias, FAB amber-300

---

## 10. Publicação e deploy

- **Frontend:** clicar **Publish** no Lovable (Update no dialog) publica em `vade-comenta-legal.lovable.app`
- **Backend (edge functions + migrations):** deploy automático e imediato quando Lovable Cloud está ativo
- **Android:** GitHub Actions (seção 5)
- **Custom domain:** configurável em Project Settings → Domains (só depois de publicar uma vez)

---

## 11. Links úteis

- **Preview Lovable:** https://id-preview--c0fdbf4f-89ce-48d8-98f3-a34af8f74615.lovable.app
- **Produção:** https://vade-comenta-legal.lovable.app
- **Supabase Dashboard:** https://supabase.com/dashboard/project/iftdrbxvekrhzstayjwp
- **GitHub:** repositório vinculado (ver botão "Abrir repositório" em `/admin-funcoes`)
- **Docs Lovable:** https://docs.lovable.dev

---

## 12. O que **NÃO** fazer

- ❌ Trocar `google/gemini-2.5-flash` por gpt-* ou por Gemini Pro sem consultar o dono.
- ❌ Chamar Google/OpenAI diretamente sem passar pelo Lovable AI Gateway.
- ❌ Editar arquivos em `android/` — a pasta é recriada a cada build.
- ❌ Mover roles pra tabela `profiles`.
- ❌ Criar tabela nova sem `GRANT` + `ENABLE RLS` + policies.
- ❌ Hardcodar cores fora dos tokens do design system.
- ❌ Assumir que o build roda local — build é só via GitHub Actions.
- ❌ Usar `full_page=True` em screenshots Playwright.
- ❌ Remover o cache `artigo_ai_cache` "porque tá vazio" — ele é populado sob demanda.

---

## 13. Como manter este documento

Este arquivo mora em `docs/HANDOFF_IA.md`, é versionado no Git e **acompanha remix**. Toda vez que mudar algo estrutural (novo modelo, nova API, nova regra de build, nova feature grande), edite aqui. Não precisa mexer em nenhum código — a tela `/admin-handoff` lê direto do arquivo via `?raw` do Vite.

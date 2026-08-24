# Google Play — Data Safety Form (Vacatio)

Guia pronto para colar no Play Console → **App content → Data safety**.
Base: LGPD + política do Google Play (2024/2025).

## 1. Data collection & sharing (visão geral)

| Pergunta | Resposta |
| --- | --- |
| Seu app coleta ou compartilha algum dos tipos de dados exigidos? | **Sim** |
| Todos os dados coletados são criptografados em trânsito? | **Sim** (HTTPS/TLS 1.2+ obrigatório, `cleartextTraffic=false`) |
| Fornece um jeito de o usuário pedir para excluir seus dados? | **Sim** — via app (Meu espaço → Excluir conta) e email `wn7corporation@gmail.com` |

## 2. Data types coletados

### Personal info
- **Name** — coletado, vinculado ao usuário, obrigatório · **Finalidade:** funcionalidade do app, conta
- **Email address** — coletado, vinculado, obrigatório · **Finalidade:** conta, comunicação
- **User IDs** — coletado, vinculado, obrigatório · **Finalidade:** conta (Supabase `auth.users.id`)

### Financial info
- **Purchase history** — se pagamentos ativos (Stripe/Paddle): coletado, vinculado · **Finalidade:** compras no app

### Photos and videos
- **Photos** — coletado se o usuário usar OCR/scanner (ML Kit) · **Finalidade:** funcionalidade do app · **Processado localmente** (ML Kit on-device) — marcar "processed ephemerally"

### Audio
- **Voice or sound recordings** — coletado se o usuário usar Speech Recognition · **Finalidade:** funcionalidade · **Processado localmente**

### Files and docs
- **Files and docs** — PDFs de livros/leis enviados pelo usuário · **Finalidade:** funcionalidade

### App activity
- **App interactions** — coletado, vinculado · **Finalidade:** analytics, funcionalidade
- **In-app search history** — coletado, vinculado · **Finalidade:** funcionalidade
- **Other user-generated content** — anotações, marca-textos · **Finalidade:** funcionalidade

### App info and performance
- **Crash logs** — Firebase Crashlytics · vinculado · **Finalidade:** analytics
- **Diagnostics** — vinculado · **Finalidade:** analytics
- **Other app performance data** — vinculado · **Finalidade:** analytics

### Device or other IDs
- **Device or other IDs** — Firebase Installation ID · vinculado · **Finalidade:** analytics, prevenção de fraude

## 3. Data types **NÃO** coletados (declarar explicitamente NÃO)

- Location (precise ou approximate)
- Health & fitness
- Messages
- Calendar
- Contacts
- Web browsing history
- Installed apps
- Race and ethnicity, political info, sexual orientation, religious beliefs

## 4. Compartilhamento com terceiros

| Terceiro | Dados | Finalidade |
| --- | --- | --- |
| Supabase (backend) | email, nome, user id, conteúdo do usuário | funcionalidade |
| Firebase Crashlytics | crash logs, device id, diagnostics | analytics |
| Google Sign-In / Credential Manager | email, nome, google id | autenticação |
| Google AI Gateway (Lovable) | prompts do usuário (leituras, comentários) | funcionalidade IA · **NÃO usados para treinamento** |
| Mistral AI (OCR) | imagens de páginas de PDF | funcionalidade · retidas até 30 dias |

## 5. Práticas de segurança

- Dados criptografados em trânsito: **Sim** (TLS 1.2+)
- Usuário pode pedir exclusão dos dados: **Sim** (in-app + email)
- Follows **Play Families Policy**: N/A (13+)
- Independent security review: **Não** (a marcar Sim se contratar auditoria)
- Committed to **Play's Data safety section**: **Sim**

## 6. Links obrigatórios

- Política de privacidade: `https://vacatio.com.br/privacidade`
- Termos de uso: `https://vacatio.com.br/termos`
- Contato DPO: `wn7corporation@gmail.com`

## 7. Permissões runtime declaradas

| Permissão | Justificativa (rationale) |
| --- | --- |
| CAMERA | Escanear páginas de leis/livros para OCR |
| POST_NOTIFICATIONS | Avisos de refino de livro pronto, novas leis |
| READ_MEDIA_IMAGES | Selecionar PDFs/imagens da galeria para leitura |
| RECORD_AUDIO | Ditado por voz na busca e anotações |
| USE_BIOMETRIC | Desbloqueio biométrico do app |
| INTERNET | Sincronização de conteúdo e IA |

## 8. Checklist pré-submissão

- [ ] Preencher o formulário Data Safety no Play Console com os itens acima
- [ ] Publicar `/privacidade` e `/termos` (rotas já existem — validar conteúdo LGPD)
- [ ] Publicar `public/.well-known/assetlinks.json` no domínio `vacatio.com.br` (substituir `REPLACE_WITH_RELEASE_SHA256_FINGERPRINT`)
- [ ] Extrair SHA-256 da chave de release: `keytool -list -v -keystore release.keystore -alias <alias>`
- [ ] Marcar "Ads": **Não** (o app não exibe ads)

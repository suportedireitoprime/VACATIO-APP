# Evolution Go (WhatsApp) — mapa da API, o que já usamos e oportunidades

> Fontes: https://docs.evolutionfoundation.com.br/evolution-go ·
> OpenAPI oficial: `/api-reference/openapi/Evolution-Go/{send-message,evo-go-message,evo-go-chat,evo-go-label,evo-go-group,evo-go-instance,user,newsletter,community}.yaml`
> Webhooks: https://docs.evolutionfoundation.com.br/evolution-go/webhooks
> Sincronizado em: 2026-07-27

Cliente do projeto: `supabase/functions/_shared/evolution.ts` (instância única = Horus).

---

## A) Catálogo da API

### 1. Envio de mensagens (`send-message.yaml`)
Todos aceitam os campos comuns: `number`, `delay`, `id`, `quoted { messageId, participant }`,
`mentionedJid`, `mentionAll`.

| Endpoint | Payload específico | Status no projeto |
| --- | --- | --- |
| `POST /send/text` | `text` | ✅ `evolution.sendText` |
| `POST /send/media` | `type` (image/video/audio/document), `url` (URL pública **ou** base64), `caption`, `filename`, `mimetype` | ✅ parcial — só `image` (`sendImageCta`) e `document` (`sendDocument`) |
| `POST /send/link` | `url`, `title`, `description`, `text`, `imgUrl` (preview rico) | ❌ |
| `POST /send/location` | `latitude`, `longitude`, `name`, `address` | ❌ |
| `POST /send/contact` | `vcard { fullName, phone, organization }` | ❌ |
| `POST /send/poll` | `question`, `options[]`, `maxAnswer` | ❌ |
| `POST /send/sticker` | `sticker` (URL/base64) | ❌ |
| `POST /send/button` *(não documentado, existe no Evolution Go)* | `title`, `description`, `footer`, `buttons[{type: reply\|url\|copy, displayText, id, url, copyCode}]` | ✅ `sendButtons`, `sendCtaUrl`, `sendCopyCode` |

### 2. Mensagens (`evo-go-message.yaml`)
| Endpoint | Payload | Status |
| --- | --- | --- |
| `POST /message/presence` | `number`, `state` (composing/paused), `isAudio` | ✅ `sendPresence` / `startTyping` |
| `POST /message/react` | `number`, `id`, `reaction` (emoji, `""` remove) | ❌ |
| `POST /message/markread` | `number`, `id[]` | ❌ |
| `POST /message/edit` | `chat`, `messageId`, `message` | ❌ |
| `POST /message/delete` | `chat`, `messageId` (apagar p/ todos) | ❌ |
| `POST /message/status` | `id` → entregue/lido | ❌ |
| `POST /message/downloadimage` | `url`, `mediaKey`, `directPath`, `fileSHA256`… | ✅ equivalente via `downloadMedia` (`/chat/getBase64FromMediaMessage`) |

### 3. Chats e etiquetas
`POST /chat/archive`, `/chat/mute`, `/chat/pin`, `/chat/unpin` — body `{ number }`.
`POST /label/chat`, `/label/message`, `/label/edit`, `/unlabel/chat`, `/unlabel/message` —
`{ jid, labelId, messageId, name, color, deleted }`. **Nada implementado.**

### 4. Usuários / contatos (`user.yaml`)
`POST /user/check` (`{ number: [] }` → o número tem WhatsApp?), `/user/info`, `/user/avatar`
(`{ number, preview }`), `GET /user/contacts`, `GET /user/privacy`, `/user/block`,
`/user/unblock`, `GET /user/blocklist`, `POST /user/profile` (foto do perfil). **Nada implementado.**

### 5. Grupos, comunidades e canais
`group/create|info|invitelink|join|list|myall|name|participant|photo`,
`community/create|add|remove`, `newsletter/create|info|link|list|messages|subscribe`.
**Nada implementado.**

### 6. Instância (`evo-go-instance.yaml`)
`instance/create|connect|disconnect|logout|pair|qr|status|all|delete|proxy`.
✅ Implementado: create, connect (+ webhook), qr, status, delete/reset.
❌ `POST /instance/pair` (pairing code por telefone, sem QR) e proxy.

### 7. Webhook — eventos assináveis
`ALL`, `MESSAGE`, `SEND_MESSAGE`, `READ_RECEIPT`, `PRESENCE`, `HISTORY_SYNC`,
`CHAT_PRESENCE`, `CALL`, `CONNECTION`, `LABEL`, `CONTACT`, `GROUP`, `NEWSLETTER`, `QRCODE`.
Payload: `{ event, data, instanceId, instanceToken }`; mensagens trazem
`Info.{Chat,Sender,ID,Type,MediaType,PushName,Timestamp,IsGroup,IsFromMe}` e flags
`IsViewOnce`, `IsEdit`, `IsEphemeral`.
Hoje assinamos uma lista mista v2/Go em `evolution.ts` (`WEBHOOK_EVENTS`) — nomes inválidos
são ignorados pelo Go; os válidos são os 14 acima.

---

## B) O que já está implementado (`_shared/evolution.ts`)

- `sendText` (com variantes de número BR e retry de payload)
- `sendButtons`, `sendCopyCode` (botão copiar código), `sendCtaUrl` (botão link), `sendImageCta`
- `sendDocument` (PDF gerado pelo Horus — `_shared/horusOferta.ts`)
- `sendPresence` / `startTyping` (animação "digitando", keepalive 6s)
- `downloadMedia` (áudio/imagem/PDF recebidos → base64 para o Gemini)
- Instância: `createInstance`, `startConnection`, `getQr`, `connectionState`, `setWebhook`, `resetInstance`
- Tracking de cliques: `buildHorusTrackedUrl` + função `horus-click`

---

## C) Oportunidades (ordenadas por impacto/esforço)

**Alto impacto, baixo esforço**
1. **Reação como "recebi" (`/message/react`)** — Horus reage 👀/🦉 na mensagem do aluno assim que
   começa a processar e ✅ ao terminar. Feedback instantâneo mais barato que texto.
2. **Marcar como lido (`/message/markread`)** — evita a sensação de "não viu"; hoje o chat fica
   sempre com não-lidas do lado do usuário.
3. **Enquetes (`/send/poll`)** — quiz jurídico diário/simulado no WhatsApp com alternativas nativas
   (usa `HISTORY_SYNC`/`MESSAGE` para captar o voto). Encaixa direto no que já existe de "Praticar".
4. **Áudio/PTT (`/send/media type=audio`)** — o app já tem TTS (`mentorTts`, `gemini-2.5-flash-preview-tts`):
   responder explicações em áudio quando o aluno mandou áudio.
5. **Preview rico de link (`/send/link`)** — usar em Radar 360, blog e videoaulas no lugar do link cru.
6. **Editar mensagem (`/message/edit`)** — enviar "🦉 pensando…" e editar com a resposta final,
   em vez de mensagens soltas; ótimo para respostas longas/streaming.

**Médio**
7. **`/user/check` antes de disparo de marketing** — filtra números sem WhatsApp e reduz risco de ban
   nas campanhas em massa (`horus-marketing`).
8. **Etiquetas (`/label/*`)** — classificar conversas (lead, aluno premium, suporte, cancelamento)
   direto no WhatsApp Business e refletir isso no painel Admin > Horus > Conversas.
9. **Localização (`/send/location`)** — integrar com o mapa de locais jurídicos (fóruns, cartórios):
   Horus manda o pin nativo em vez de endereço em texto.
10. **Contato (`/send/contact`)** — enviar vCard do suporte/comercial no fluxo de upgrade.
11. **Apagar para todos (`/message/delete`)** — desfazer disparo errado de campanha.
12. **Status de entrega (`/message/status`, evento `READ_RECEIPT`)** — métricas reais de entrega/leitura
    por campanha no painel de Marketing (hoje só temos cliques).

**Exploratório**
13. **Canal/Newsletter (`newsletter/*`)** — canal "Radar 360" no WhatsApp: uma publicação alcança todos
    os inscritos sem disparo 1-a-1 (zero risco de bloqueio).
14. **Grupos (`group/*`)** — turmas de estudo por concurso, com o Horus como admin postando desafios.
15. **Figurinhas (`/send/sticker`)** — pacote de figurinhas do mascote (marketing viral).
16. **Pairing code (`/instance/pair`)** — conectar a instância sem QR, útil no painel admin.
17. **Eventos `CALL`** — responder automaticamente quem liga para o número do Horus.
18. **Arquivar/silenciar/fixar chats** — higiene da caixa quando o volume crescer.

**Correção sugerida**: enxugar `WEBHOOK_EVENTS` para os nomes válidos do Evolution Go e assinar
`READ_RECEIPT`, `LABEL` e `CALL` conscientemente conforme as features acima forem entrando.
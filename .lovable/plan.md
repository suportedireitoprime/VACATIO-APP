## Objetivo

Fazer o push funcionar de ponta a ponta (permissão → token → entrega → abertura), passar a enxergar quem desinstalou, e reforçar o pedido de permissão no cadastro. iOS fica fora por enquanto (app ainda não publicado na App Store).

## Situação verificada agora

- Últimos 30 dias: 2.307 `sent`, 39 `failed`, apenas 13 `opened`, 9 `delivered`, 4 `converted`.
- `delivered` só é registrado quando o app está **aberto** (foreground). Com o app fechado, o FCM entrega direto ao sistema e nada volta pro banco — por isso a métrica parece "quebrada".
- Tokens inválidos (`404 / UNREGISTERED`) são **apagados** de `device_tokens` — perdemos o histórico de quem desinstalou.
- 100% dos tokens são Android (esperado, iOS ainda não lançado).
- O dossiê do usuário no admin não mostra nada sobre push (token, última notificação, abertura, desinstalação).

## 1. Corrigir entrega e abertura (tracking real)

- Android: incluir `receipt`/`delivery` via payload de dados sempre presente, e registrar `delivered` também quando a notificação é tocada (hoje o `opened` chega sem passar por `delivered`, então o funil fica furado). Marcar `delivered` implicitamente no backend quando houver `opened`.
- Registrar `platform` nos eventos vindos do `push-track` (hoje vários chegam nulos).
- Corrigir o dedupe: `opened` de cold-start pode ser perdido quando a notificação já foi limpa da bandeja — passar a persistir a última campanha aberta no armazenamento nativo e enviar no próximo boot.
- Adicionar um painel de funil (enviado → entregue → aberto → convertido) por campanha usando os dados corrigidos.

## 2. Rastrear desinstalação e reengajamento

- Migração em `device_tokens`: novas colunas `invalidated_at`, `invalid_reason`, `last_success_at`.
- `send-push` deixa de **apagar** tokens inválidos: passa a marcá-los como invalidados (`UNREGISTERED` = app desinstalado ou dados limpos) e a ignorá-los no envio.
- No dossiê do usuário (admin), nova seção **Notificações** mostrando:
  - Nome, e-mail e telefone (WhatsApp/Horus) no topo, junto do status.
  - Status do push: `Ativo` / `Sem token (nunca permitiu)` / `Desinstalou em dd/mm`.
  - Plataforma do dispositivo e data do último envio bem-sucedido.
  - Últimas notificações enviadas para aquele usuário, com enviado/entregue/aberto.
  - Botão "Enviar push de teste para este usuário".
- Na lista de usuários, um indicador visual para quem está sem token ou desinstalou, para montar as listas de reengajamento.

## 3. iOS — adiado

Sem ação: o app ainda não está disponível na App Store, então a ausência de tokens iOS é esperada.

## 4. Melhorar a permissão de notificação no onboarding

- Garantir que o passo de permissão apareça para **todo** novo cadastro (e-mail, Google e Apple), inclusive quando a triagem é pulada.
- Reforçar a tela: promessa concreta ("notícias e mudanças de lei da sua área, resumo do dia, lembretes"), prova de valor e um único botão primário grande.
- Trocar "Agora não" por um comportamento de re-pedido: quem recusar recebe um lembrete contextual (banner discreto) depois de alguns dias ou ao usar uma função que dependa de aviso, em vez de nunca mais ser perguntado.
- Após conceder, disparar um push de boas-vindas para confirmar na hora que está funcionando.
- Registrar em `app_events` os estados `permission_prompt_shown`, `granted`, `denied`, para medir a taxa de aceite.

## Detalhes técnicos

- Arquivos: `src/lib/nativePush.ts`, `src/hooks/useNativePermissions.ts`, `src/components/onboarding/NotificacoesPermissaoStep.tsx`, `src/pages/Onboarding.tsx`, `src/components/admin/UserDossieSheet.tsx`, `src/components/admin/PushDiagnosticoTab.tsx`.
- Edge functions: `send-push` (não deletar tokens, marcar invalidação), `push-track` (platform + dedupe + delivered implícito).
- Migração: colunas novas em `device_tokens` e uma função de leitura para o dossiê (nome/telefone/status do push) restrita a admin.

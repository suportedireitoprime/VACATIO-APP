---
name: Native Onda 1 - Infra e engajamento
description: Plugins Capacitor da Onda 1 - In-App Review, App Update, Screen Orientation, Secure Storage, A11y
type: feature
---

## Onda 1 implementada (plugins Capacitor)

**In-App Review** (`@capacitor-community/in-app-review`)
- `src/lib/inAppReview.ts`: `seedFirstOpen()`, `trackReviewEvent()`, `maybeRequestReview()`
- Regras: 5+ eventos positivos OU 7+ dias de instalação; cooldown 90 dias
- Triggers: `StudyTimer.handleComplete` (fim de sessão de estudo), `Simulado` (result >= 60%)
- Persistência: Preferences (`iar_last_shown_ts`, `iar_event_count`, `iar_first_open_ts`)

**App Update** (`@capawesome/capacitor-app-update`)
- `src/lib/appUpdate.ts`: `checkForAppUpdate()` chamado 4s após boot
- Modo flexible por padrão (toast "Reiniciar" quando baixa)
- Força imediato quando `Preferences.force_update_min_version` > versão atual

**Screen Orientation** (`@capacitor/screen-orientation`)
- Portrait travado globalmente no boot (`useNativePermissions`)
- Override por tela via `useLockOrientation('landscape' | 'any')` em `src/hooks/useLockOrientation.ts`

**Secure Storage** (`@aparajita/capacitor-secure-storage`)
- `src/lib/secureStorage.ts`: wrapper com API igual a Web Storage (async)
- Substitui `localStorage` no `supabase.auth.storage`
- Migração transparente: no primeiro `getItem` nativo, se não existe no Keystore mas existe no localStorage, migra e apaga o localStorage
- Web fallback: usa localStorage direto

**A11y sweep**
- Focus-visible global: ring `hsl(var(--primary))` em `button, a, [role="button"]` via `index.css`
- Tap targets mínimos 44x44 no bottom nav via CSS regra
- `aria-label` nos botões de fechar (Ferramentas sheet, Assistente sheet, StudyTimer)
- `aria-hidden="true"` nos ícones dentro desses botões

Todos os plugins degradam para no-op em web via `Capacitor.isNativePlatform()`. Nenhum patch de AndroidManifest necessário — plugins auto-configuram via `cap sync`.

# Facebook SDK (rastreio de instalação via Meta Ads)

O SDK nativo do Facebook é injetado no build Android automaticamente pelo
workflow `.github/workflows/build-android.yml` — passo **"Add Facebook SDK for
install/ad tracking (Meta Ads)"**. Não precisa mexer em nada em cada release.

## Credenciais usadas

| Campo | Valor |
| --- | --- |
| App ID | `1590734976033061` |
| Client Token | `d0f7c8833c75e815d78c81ac5f4b6fb3` |
| Key Hash (release) | `k0U9TvEZJ7sGGUXYJg3WfqhJgVw=` ✅ validado no Meta for Developers |
| Package name | `br.com.vacatio.app` |

O Key Hash é gerado a cada build no passo de assinatura do workflow (procure
"📘 FACEBOOK KEY HASH" no log). Ele precisa estar cadastrado em
developers.facebook.com → app → Configurações → Básico → Android → "Hashes de
chaves".

## O que o passo faz

1. Grava as strings `facebook_app_id`, `fb_login_protocol_scheme` e
   `facebook_client_token` em `android/app/src/main/res/values/strings.xml`.
2. Adiciona no `AndroidManifest.xml`, dentro de `<application>`, os
   `<meta-data>` obrigatórios do SDK (`ApplicationId`, `ClientToken`,
   `AutoInitEnabled`, `AutoLogAppEventsEnabled`,
   `AdvertiserIDCollectionEnabled`) e garante a permissão `INTERNET`.
3. Adiciona `implementation 'com.facebook.android:facebook-android-sdk:17.0.2'`
   às `dependencies` do `android/app/build.gradle`.

Com `AutoInitEnabled=true` + `AutoLogAppEventsEnabled=true` o SDK envia o
evento de instalação e as sessões automaticamente para o Meta — nenhum código
Java/Kotlin adicional é necessário.

## Build local (fora do CI)

Se você gerar um AAB/APK localmente com `npx cap sync android` + Android
Studio, as três alterações acima precisam ser aplicadas manualmente à pasta
`android/` gerada (ou copie os trechos do workflow). Como recomendação, rode
sempre pelo workflow `Build Android (.aab + .apk)` — ele já cuida disso.

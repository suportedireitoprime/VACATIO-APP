# Apple Developer — Credenciais e IDs

Arquivo de referência com dados da conta Apple Developer usada nos builds e publicação iOS do Vacatio. Novos IDs/chaves enviados pelo usuário vão sendo acrescentados aqui.

> ⚠️ Este arquivo contém apenas **identificadores públicos** (Team ID, Developer ID, App IDs, etc.). **Nunca** salvar aqui certificados (.p12), chaves privadas (.p8), senhas ou API Keys — esses vão em Secrets (Supabase / Workspace Build Secrets / GitHub Actions Secrets).

## Conta

| Campo | Valor |
|---|---|
| Titular | Wesley Nunes |
| Team ID | `DKVT35Y3W5` |
| Issuer ID (App Store Connect API) | `1604c7ca-cdb0-49ec-aea1-058e12abdafe` |
| Developer ID (Apple ID interno) | _pendente_ |

## Outros IDs

_(A preencher conforme o usuário for enviando: Bundle ID, App Store Connect App ID, Key ID da API Key, Issuer ID, Provisioning Profile UUID, Push Auth Key ID, etc.)_

- Bundle ID: `br.com.vacatio.app` (Description: `Vacatio App`, tipo: Explicit)
- App Store Connect App ID: _pendente (criar em App Store Connect → Apps → +)_
- App Store Connect API Key ID: `53WLPB97Z9` (arquivo `AuthKey_53WLPB97Z9.p8`)
- App Store Connect Issuer ID: `1604c7ca-cdb0-49ec-aea1-058e12abdafe`
- APNs Auth Key ID: _pendente_

## Onde os secrets sensíveis ficam

- **Certificados (.p12) e Provisioning Profiles**: GitHub Actions Secrets do workflow `build-ios.yml`.
- **App Store Connect API Key (.p8)**: Também em GitHub Actions Secrets (base64), usada pelo `xcrun altool` para subir ao TestFlight.
- **APNs Auth Key (.p8)**: Supabase Edge Function Secrets (para envio de push).

## Criptografia — ITSAppUsesNonExemptEncryption

O Vacatio usa **apenas HTTPS/TLS padrão do iOS + Keychain**, sem criptografia proprietária. Isso o torna **isento** da documentação de export de criptografia (ERN) da Apple.

O workflow `build-ios.yml` insere automaticamente no `Info.plist`:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

Com essa flag, o App Store Connect **não pede** documentação de criptografia a cada build.

## Secrets do GitHub Actions (workflow build-ios.yml)

| Secret | Origem | Status |
|---|---|---|
| `APPLE_TEAM_ID` | `DKVT35Y3W5` | ✅ salvo no Supabase — adicionar também no GitHub |
| `APPLE_BUNDLE_ID` | `br.com.vacatio.app` | ✅ |
| `APPLE_APP_STORE_CONNECT_KEY_ID` | `53WLPB97Z9` | ✅ |
| `APPLE_APP_STORE_CONNECT_ISSUER_ID` | `1604c7ca-cdb0-49ec-aea1-058e12abdafe` | ✅ |
| `APPLE_APP_STORE_CONNECT_KEY_P8_BASE64` | conteúdo do `.p8` em base64 | ✅ |
| `APPLE_DISTRIBUTION_CERT_P12_BASE64` | `.p12` gerado a partir do `.cer` + `.key` (base64) | ⏳ pendente |
| `APPLE_DISTRIBUTION_CERT_PASSWORD` | senha usada na exportação do `.p12` | ⏳ pendente |
| `APPLE_PROVISIONING_PROFILE_BASE64` | `.mobileprovision` (App Store) em base64 | ⏳ pendente |
| `KEYCHAIN_PASSWORD` | qualquer senha aleatória (só existe no runner) | ⏳ pendente |

⚠️ Os secrets acima precisam ser **também** copiados em **GitHub → Settings → Secrets and variables → Actions** — o workflow roda em `macos-14` fora do Supabase.

## Gerar chave privada + CSR (Apple Distribution)

Sem rodar `openssl` no terminal. Use o gerador integrado do app:

1. Abra `/admin-apple-csr` (aparece em Admin → Secrets → botão "Apple CSR" ou direto na URL).
2. Preencha email da conta Apple, Common Name (Wesley Nunes) e país (BR).
3. Clique em **Gerar chave + CSR**. A geração acontece 100% no navegador (RSA 2048, SHA-256) — a chave privada nunca é enviada a servidor.
4. Baixe os dois arquivos:
   - `apple_distribution.key` — chave privada (guardar em local seguro; é insubstituível).
   - `apple_distribution.certSigningRequest` — envie em developer.apple.com → Certificates → "+" → Apple Distribution.
5. Baixe o `.cer` emitido pela Apple.
6. Combine `.key` + `.cer` em `.p12` — o próprio `/admin-apple-csr` faz isso no navegador, ou use:
   ```bash
   openssl x509 -in apple_distribution.cer -inform DER -out cert.pem
   openssl pkcs12 -export -inkey apple_distribution.key -in cert.pem -out apple_distribution.p12
   base64 -i apple_distribution.p12 | pbcopy   # cola em APPLE_DISTRIBUTION_CERT_P12_BASE64
   ```

## Provisioning Profile (App Store)

1. developer.apple.com → Profiles → **+** → **App Store** (iOS).
2. App ID: `br.com.vacatio.app`.
3. Certificado: o Apple Distribution recém-criado.
4. Nome sugerido: **`Vacatio App Store`** (o `ios-export-options.plist` já aponta para esse nome).
5. Baixe o `.mobileprovision` e converta:
   ```bash
   base64 -i Vacatio_App_Store.mobileprovision | pbcopy
   ```
   Cole em `APPLE_PROVISIONING_PROFILE_BASE64`.

## Rodar o build

**GitHub → Actions → "Build iOS (.ipa → TestFlight)" → Run workflow.**

O workflow:
1. Regenera `ios/` do zero via `cap add ios`.
2. Injeta `ITSAppUsesNonExemptEncryption=false`.
3. Assina com o `.p12` + `.mobileprovision` importados dos secrets.
4. `xcodebuild archive` + `exportArchive` gera o `.ipa`.
5. `xcrun altool` envia direto pro TestFlight usando a API Key.

Após ~15 min, o build aparece em App Store Connect → TestFlight → Builds. Depois de processado (~10 min), fica disponível pra selecionar no botão **+** da seção **Build** da versão 1.0, desbloqueando o "Adicionar para revisão".



# 📱 Vacatio — App Nativo (Capacitor)

Este guia mostra como transformar o app web em um **AAB** para publicar na
Google Play Store. iOS segue o mesmo caminho no futuro.

---

## 1. Pré-requisitos

- Node 18+ e `npm`
- **Android Studio** (para gerar o AAB e assinar)
- Java 17 (o Android Studio já instala)
- Para iOS: um Mac com **Xcode**

---

## 2. Primeira configuração no seu computador

```bash
# 1. Clonar o repositório (Export to Github na Lovable → git clone)
git clone <seu-repo>
cd <seu-repo>

# 2. Instalar dependências
npm install

# 3. Adicionar as plataformas nativas
npx cap add android
# quando quiser iOS (só em Mac):
# npx cap add ios

# 4. Copiar as permissões — ver seção "Permissões Android" abaixo

# 5. Build web + sincronizar para nativo
npm run build
npx cap sync

# 6. Abrir no Android Studio
npx cap open android
```

---

## 3. Permissões Android

Após rodar `npx cap add android`, abra
`android/app/src/main/AndroidManifest.xml` e cole os `<uses-permission>` abaixo
**dentro da tag `<manifest>`** (antes de `<application>`):

```xml
<!-- Internet e rede -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Câmera + galeria -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />

<!-- Áudio (gravação) -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

<!-- Notificações (Android 13+ exige runtime prompt) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Foreground service para narração de artigos com tela apagada
     (obrigatório em Android 14+ quando o áudio TTS continua em background) -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

<!-- Armazenamento (compat legacy) -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="28" />

<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.microphone" android:required="false" />
```

---

## 4. Modo desenvolvimento (hot-reload direto do Lovable)

O `capacitor.config.ts` **já vem configurado** com hot-reload apontando para
a preview Lovable. Ao rodar `npx cap run android`, o app instalado abre a
preview em tempo real — qualquer alteração no chat da Lovable já aparece no
celular.

```bash
npm run build && npx cap sync android
npx cap run android      # requer emulador rodando ou celular USB
```

---

## 5. Ícone e Splash Screen

1. Coloque um logo **1024×1024** em `resources/icon.png`
2. Coloque uma splash **2732×2732** (fundo `#1a0a14` centralizado) em
   `resources/splash.png`
3. Gere todos os tamanhos:

```bash
npx capacitor-assets generate --android
```

---

## 6. Gerar o AAB para a Google Play

### 6.1 — Remover o hot-reload

**Antes do release**, edite `capacitor.config.ts` e **remova o bloco `server`
inteiro**. Sem isso, o app publicado vai continuar puxando código da preview
e falhará em produção.

### 6.2 — Build + sync

```bash
npm run build
npx cap sync android
```

### 6.3 — Assinar e gerar o bundle

```bash
npx cap open android
```

No Android Studio:

1. Menu **Build → Generate Signed Bundle / APK…**
2. Escolha **Android App Bundle** → Next
3. **Create new keystore…** (guarde a senha! sem ela você não consegue mais
   atualizar o app na Play):
   - Key store path: `~/keystores/oab-na-risca.jks`
   - Alias: `oab-na-risca`
   - Validade: 25 anos
4. Selecione **release** → Finish
5. O `.aab` fica em `android/app/release/app-release.aab`

### 6.4 — Publicar

1. [Google Play Console](https://play.google.com/console) → criar app
2. Preencher ficha da loja (screenshots, descrição, política de privacidade)
3. **Produção → Criar nova versão** → upload do `.aab`
4. Aguardar revisão (algumas horas a 3 dias)

---

## 7. Login Google nativo no Android

O login Google nativo depende de três configurações batendo exatamente entre si:

1. **Google Cloud/Firebase — OAuth Web**
   - Deve existir um OAuth Client ID do tipo **Web application**.
   - Esse é o Client ID usado pelo app para gerar o `idToken` aceito pelo Supabase.
   - Atual atual: `833040915353-t4op5194chqh14kbig98h0pe8c0j8irq.apps.googleusercontent.com`.

2. **Google Cloud/Firebase — OAuth Android**
   - Deve existir um OAuth Client ID do tipo **Android**.
   - Package name obrigatório: `br.com.vacatio.app`.
   - SHA-1 obrigatório: precisa ser o SHA-1 da chave que assinou o app instalado.
     - APK baixado do GitHub Actions: use o SHA-1 do keystore do workflow.
     - AAB publicado na Play Store: adicione também o SHA-1 da **App signing key certificate** em Play Console → Setup → App integrity.
   - Atual no `google-services.json`: `833040915353-gkvhq1b2f4d1aou1mkd1nshhlubgvrdk.apps.googleusercontent.com`, SHA-1 `59968bb95a9868c98ccc8388de0d568df576b4b6`.

3. **Supabase Auth → Providers → Google**
   - Ative o provider Google.
   - Em Client IDs, cadastre todos separados por vírgula, com o **Web primeiro**:

   ```text
   833040915353-t4op5194chqh14kbig98h0pe8c0j8irq.apps.googleusercontent.com,833040915353-gkvhq1b2f4d1aou1mkd1nshhlubgvrdk.apps.googleusercontent.com
   ```

Se, depois de escolher a conta Google, aparecer `The user canceled the sign-in flow`, `12501` ou `DEVELOPER_ERROR 10`, trate como erro de OAuth/SHA-1 até provar o contrário: o Google Play Services está recusando o app antes de entregar o token ao Supabase.

O workflow Android valida automaticamente se o `google-services.json` tem OAuth Web, OAuth Android para `br.com.vacatio.app`, e se o SHA-1 da chave de release está cadastrado.

---

## 8. Push Notifications reais (Firebase Cloud Messaging)

O código já registra e salva os tokens do usuário na tabela `device_tokens`.
Para enviar push de verdade:

1. Criar projeto no [Firebase Console](https://console.firebase.google.com)
2. Adicionar app Android com o `applicationId` `br.com.vacatio.app`
3. Baixar `google-services.json` e colar em `android/app/`
4. Aplicar o setup do Gradle (está em `android-config/GRADLE_SETUP.md`)
5. Criar a chave de conta de serviço para a edge function enviar push:

   - Firebase Console → clique em ⚙️ **Configurações do projeto** (canto
     superior esquerdo, ao lado do nome do projeto)
   - Aba **Contas de serviço** (Service accounts)
   - Clique em **Gerar nova chave privada** (Generate new private key)
   - Confirme → vai baixar um arquivo `.json`
   - Abra o arquivo e **copie todo o conteúdo** (começa com `{"type":"service_account",...}`)
   - Cole em **Project Settings → Secrets → `FCM_SERVICE_ACCOUNT_JSON`**

   Isso permite que a edge function `send-push` chame a FCM HTTP v1 API.

6. Para chamar a função de push, faça um POST para:

   ```bash
   POST /functions/v1/send-push
   Authorization: Bearer <anon_key>
   Content-Type: application/json

   {
     "user_ids": ["uuid-do-usuario"],
     "title": "Título",
     "body": "Mensagem do push"
   }
   ```

---

## 9. Atualizando o app depois de mudar código no Lovable

```bash
git pull            # baixa as mudanças do Lovable
npm install         # se houver novas dependências
npm run build
npx cap sync
# reabra no Android Studio ou rode: npx cap run android
```

📖 Ler também:
<https://lovable.dev/blog/2025-04-25-native-mobile-apps-with-lovable-and-capacitor>
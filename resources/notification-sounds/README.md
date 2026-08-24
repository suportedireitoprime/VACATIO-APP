# Sons de Notificação Personalizados

Três sons curtos (~2s) gerados por TTS:
- `oab_estudante` — "Notificação, estudante!"
- `oab_concurseiro` — "Notificação, concurseiro!"
- `oab_advogado` — "Notificação, advogado!"

## Como instalar no projeto nativo

Faça isto **uma vez** após rodar `npx cap add android` / `npx cap add ios`
(e sempre que os arquivos aqui forem atualizados).

### Android

Copie os `.mp3` para a pasta `raw` do Android:

```bash
mkdir -p android/app/src/main/res/raw
cp resources/notification-sounds/android/*.mp3 android/app/src/main/res/raw/
```

⚠️ O nome do arquivo deve ficar **em minúsculas**, sem hífen, sem espaço.
No payload FCM/canal use o nome **sem extensão** (`oab_estudante`).

### iOS

Copie os `.caf` para dentro do target do app no Xcode:

```bash
cp resources/notification-sounds/ios/*.caf ios/App/App/
```

Depois abra o Xcode e arraste os três arquivos para dentro do target
**App** (marque "Copy items if needed" e o target **App**), ou eles não
serão empacotados no `.ipa`.

No payload APNs use o nome **com extensão** (`oab_estudante.caf`).

## Uso no app

```ts
import { configurarCanaisDeNotificacao } from "@/lib/nativeNotificationChannels";

// Chame uma vez, logo após permissão de push ser concedida:
await configurarCanaisDeNotificacao();
```

## Payloads de exemplo

**FCM (Android):**
```json
{
  "android": {
    "notification": {
      "channel_id": "oab-estudante",
      "sound": "oab_estudante"
    }
  }
}
```

**APNs (iOS):**
```json
{
  "aps": {
    "sound": "oab_estudante.caf",
    "alert": { "title": "...", "body": "..." }
  }
}
```

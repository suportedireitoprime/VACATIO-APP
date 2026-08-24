# Native App Assets

Estas imagens são a fonte única (source of truth) para os ícones e splash
screens do aplicativo nativo (Android / iOS).

## Como regenerar assets nativos

Após clonar o projeto (`git pull`), rode uma única vez:

```bash
npm install --save-dev @capacitor/assets
npx capacitor-assets generate
```

Isso vai gerar automaticamente **todos** os tamanhos requeridos por
Android (mdpi → xxxhdpi) e iOS, e colocá-los nas pastas corretas:

- `android/app/src/main/res/mipmap-*/`
- `ios/App/App/Assets.xcassets/`

## Arquivos aqui

| Arquivo | Uso |
|---|---|
| `icon.png` | Ícone principal (1024×1024) |
| `icon-foreground.png` | Camada foreground do ícone adaptativo (Android) |
| `icon-background.png` | Camada background do ícone adaptativo (Android) |
| `splash.png` | Splash screen claro (2732×2732) |
| `splash-dark.png` | Splash screen escuro |
| `notification-icon.png` | Ícone monocromático para push (Android) |

## Não precisa mais baixar do Supabase

Antes o workflow do GitHub baixava essas imagens via Signed URL do bucket
`mobile-config`. Agora elas vivem no repositório e entram direto no APK/AAB.

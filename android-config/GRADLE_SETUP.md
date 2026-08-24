# Configuração Gradle para FCM (após `npx cap add android`)

A pasta `android/` só existe na sua máquina, então essas edições precisam ser
feitas manualmente uma única vez.

## 1) Copiar o `google-services.json`
```bash
cp android-config/google-services.json android/app/google-services.json
```

## 2) `android/build.gradle` (raiz)
Dentro do bloco `buildscript { dependencies { ... } }` adicione:
```gradle
classpath 'com.google.gms:google-services:4.4.2'
```

## 3) `android/app/build.gradle`
No **final do arquivo** adicione:
```gradle
apply plugin: 'com.google.gms.google-services'
```

E dentro de `dependencies { ... }`:
```gradle
implementation platform('com.google.firebase:firebase-bom:33.3.0')
implementation 'com.google.firebase:firebase-messaging'
```

## 4) Sincronizar
```bash
npx cap sync android
```

Pronto — o plugin `@capacitor/push-notifications` já vai funcionar com FCM.
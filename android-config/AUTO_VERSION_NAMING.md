# Renomear o AAB/APK automaticamente com a versão

A pasta `android/` só existe na sua máquina (é gerada pelo `npx cap add android`),
então essa configuração precisa ser feita **uma única vez** no seu computador.
Depois disso, toda vez que você rodar `./gradlew bundleRelease` (ou `assembleRelease`),
o arquivo sairá como:

```
app-vacatio-1.0.65.aab
app-vacatio-1.0.66.aab
...
app-vacatio-1.0.99.aab
app-vacatio-1.1.0.aab
app-vacatio-1.1.0.1.aab
app-vacatio-1.1.0.2.aab
...
```

## Regra de versão

- Incrementa o **PATCH** a cada build: `1.0.65`, `1.0.66`, … , `1.0.99`.
- Quando o PATCH passaria de 99, sobe o **MINOR** e zera o PATCH: `1.1.0`.
- A partir daí, entra um **4º dígito** que também vai até 99: `1.1.0.1`, `1.1.0.2`, … , `1.1.0.99`.
- Passando de 99 no 4º dígito, sobe o MINOR de novo e recomeça: `1.2.0`, depois `1.2.0.1`, …
- O `versionCode` (número interno exigido pelo Google Play) é um contador separado que **sempre cresce em +1**, independente do nome.

---

## 1) Criar `android/app/version.properties`

Como você já publicou a **1.0.64** (versionCode `261971452`), o arquivo começa refletindo
esse último estado. O Gradle vai ler, avançar para o próximo (1.0.65) e regravar.

```properties
VERSION_CODE=261971452
MAJOR=1
MINOR=0
PATCH=64
BUILD4=0
```

> Se um dia quiser reiniciar de outro ponto, basta editar esses valores.
> `BUILD4=0` significa "ainda não estamos usando o 4º dígito".

## 2) Editar `android/app/build.gradle`

### 2.1 — No **topo do arquivo** (antes de `android { ... }`)

Cole este bloco. Ele lê, calcula a próxima versão e regrava o `version.properties`:

```gradle
// ==== Versão automática (PATCH → MINOR → 4º dígito, corte em 99) ====
def versionPropsFile = file('version.properties')
def props = new Properties()
if (versionPropsFile.canRead()) {
    props.load(new FileInputStream(versionPropsFile))
}

def curCode   = (props['VERSION_CODE']  ?: '0').toString().toInteger()
def curMajor  = (props['MAJOR']         ?: '1').toString().toInteger()
def curMinor  = (props['MINOR']         ?: '0').toString().toInteger()
def curPatch  = (props['PATCH']         ?: '0').toString().toInteger()
def curBuild4 = (props['BUILD4']        ?: '0').toString().toInteger()

def nextMajor  = curMajor
def nextMinor  = curMinor
def nextPatch  = curPatch
def nextBuild4 = curBuild4

if (curBuild4 > 0) {
    // Já estamos no esquema de 4 dígitos: incrementa o 4º
    nextBuild4 = curBuild4 + 1
    if (nextBuild4 > 99) {
        // Passou de 99 → sobe MINOR e volta para X.Y.0 (sem 4º dígito)
        nextMinor  = curMinor + 1
        nextPatch  = 0
        nextBuild4 = 0
    }
} else {
    // Ainda no esquema clássico X.Y.PATCH
    nextPatch = curPatch + 1
    if (nextPatch > 99) {
        // 1.0.99 → 1.1.0
        nextMinor = curMinor + 1
        nextPatch = 0
        nextBuild4 = 0
    } else if (curPatch == 0 && curMinor > 0 && curBuild4 == 0
               && !(curMajor == 1 && curMinor == 0)) {
        // Estávamos exatamente em X.Y.0 (recém-promovido por MINOR): próximo é X.Y.0.1
        nextPatch  = 0
        nextBuild4 = 1
    }
}

// Regra especial: se a versão que ACABAMOS de gerar é X.Y.0 vinda de um roll de MINOR,
// a PRÓXIMA build precisa virar X.Y.0.1 — o bloco acima já cuida disso lendo o estado atual.

def appVersionName = nextBuild4 > 0
        ? "${nextMajor}.${nextMinor}.${nextPatch}.${nextBuild4}"
        : "${nextMajor}.${nextMinor}.${nextPatch}"

def appVersionCode = curCode + 1

// Persiste o novo estado
props['VERSION_CODE'] = appVersionCode.toString()
props['MAJOR']        = nextMajor.toString()
props['MINOR']        = nextMinor.toString()
props['PATCH']        = nextPatch.toString()
props['BUILD4']       = nextBuild4.toString()
props.store(versionPropsFile.newWriter(), null)

println "==> Nova versão: ${appVersionName} (versionCode ${appVersionCode})"
// ====================================================================
```

### 2.2 — Dentro de `android { defaultConfig { ... } }`

Substitua as linhas `versionCode` e `versionName` existentes por:

```gradle
versionCode appVersionCode
versionName appVersionName
```

### 2.3 — Ainda dentro de `android { ... }` (fora de `defaultConfig`)

Cole este bloco. Ele renomeia o **APK** e o **AAB** com o padrão `app-vacatio-<versão>`:

```gradle
// Renomeia o APK (assembleRelease / assembleDebug)
applicationVariants.all { variant ->
    variant.outputs.all { output ->
        def ext = output.outputFile.name.endsWith('.aab') ? 'aab' : 'apk'
        outputFileName = "app-vacatio-${appVersionName}.${ext}"
    }
}

// Renomeia o AAB (bundleRelease / bundleDebug) — o Gradle não expõe outputs para o bundle,
// então renomeamos após a task terminar.
tasks.configureEach { task ->
    if (task.name.startsWith('bundle') &&
        (task.name.endsWith('Release') || task.name.endsWith('Debug'))) {
        task.doLast {
            def outDir = file("${buildDir}/outputs/bundle/${task.name.replaceFirst('bundle','').uncapitalize()}")
            outDir.listFiles()?.each { f ->
                if (f.name.endsWith('.aab') && !f.name.startsWith('app-vacatio-')) {
                    def target = new File(f.parent, "app-vacatio-${appVersionName}.aab")
                    if (target.exists()) target.delete()
                    f.renameTo(target)
                }
            }
        }
    }
}
```

## 3) Rodar a build

```bash
npx cap sync android
cd android
./gradlew bundleRelease
```

Como o `version.properties` está em `PATCH=64`, a próxima build sairá como:

```
android/app/build/outputs/bundle/release/app-vacatio-1.0.65.aab
```

E as próximas: `1.0.66`, `1.0.67`, … , `1.0.99`, `1.1.0`, `1.1.0.1`, `1.1.0.2`, …

## 4) Dica: commitar o `version.properties`

Se você builda em mais de uma máquina e quer que o contador seja global,
comite o arquivo `android/app/version.properties` no Git.
Se builda só numa máquina, pode deixá-lo no `.gitignore`.

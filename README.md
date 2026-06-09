# Nextime — Agendamento de Serviços

> **Disciplina:** Desenvolvimento Mobile — Unieuro 2025
> **Professor:** Dr. Aldo Henrique
> **Projeto:** Projeto 2 — APIs Públicas e Recursos Nativos

---

## Sobre o Aplicativo

O **Nextime** é um aplicativo mobile de agendamento de serviços que conecta clientes a prestadores de serviço. Prestadores cadastram serviços, gerenciam agenda e se comunicam via chat. Clientes exploram prestadores, filtram por localização, agendamento e acompanham reservas.

**Slogan:** _Agendamentos simples. Clientes satisfeitos._

---

## Tecnologias

| Tecnologia | Versão | Uso |
|---|---|---|
| Apache Cordova | 12.x | Empacotamento Android |
| Leaflet.js | 1.9.4 | Mapa interativo OpenStreetMap (GPS) |
| JavaScript ES6+ | — | Lógica da aplicação |
| localStorage | Web API | Persistência e cache de APIs |
| cordova-plugin-camera | ^7.0.0 | Câmera e galeria |
| cordova-plugin-local-notification | ^0.9.0-beta.3 | Notificações locais Android |

---

## APIs Integradas

### 1. IBGE — Municípios ⭐ `dados.gov.br` (OBRIGATÓRIA)
**Endpoint:** `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/{codigo}`
**Uso:** enriquece o resultado do ViaCEP com microrregião e mesorregião do município.

### 2. ViaCEP (brasileira)
**Endpoint:** `https://viacep.com.br/ws/{cep}/json/`
**Uso:** preenche automaticamente cidade/bairro/estado no cadastro.

### 3. BrasilAPI CNPJ — Receita Federal (brasileira/governamental)
**Endpoint:** `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`
**Uso:** valida CNPJ na Receita Federal e preenche razão social.

### 4. BrasilAPI Feriados (brasileira)
**Endpoint:** `https://brasilapi.com.br/api/feriados/v1/{ano}`
**Uso:** feriados nacionais no calendário do prestador.

### 5. DiceBear Avatars (internacional)
**Endpoint:** `https://api.dicebear.com/9.x/initials/svg?seed={nome}`
**Uso:** avatares automáticos com iniciais para usuários sem foto.

### 6. OpenStreetMap / Nominatim (GPS)
**Endpoint:** `https://nominatim.openstreetmap.org/search?q={cidade,uf}&format=json`
**Uso:** geocodifica cidades dos prestadores para distância (Haversine) e mapa Leaflet.

---

## Recursos Nativos

### Câmera (`cordova-plugin-camera`)
- Foto de perfil via câmera frontal ou galeria
- Acesso: aba Perfil → botão Editar → Câmera / Galeria

### GPS (Geolocalização nativa)
- Botão "Perto de mim" na tela Explorar
- Usa `navigator.geolocation.getCurrentPosition()`
- Abre mapa interativo (Leaflet + OpenStreetMap)
- Filtra prestadores num raio de 10 km com cálculo Haversine

### Notificações Locais (`cordova-plugin-local-notification`)
- Arquivo `www/js/notificacoes.js`
- Notificação automática ao confirmar/recusar agendamentos
- Botões "Permitir notificações" e "Enviar notificação de teste" na aba Perfil

---

## Estrutura do Projeto

```
nextime-mobile/
├── config.xml
├── package.json
├── README.md
├── plugins/
│   ├── cordova-plugin-camera/
│   ├── cordova-plugin-local-notification/
│   └── cordova-plugin-device/
└── www/
    ├── index.html
    ├── cordova_plugins.js       ← registro dos plugins no runtime
    ├── css/
    │   └── app.css
    ├── js/
    │   ├── app.js               ← lógica principal
    │   ├── api-service.js       ← chamadas a APIs externas
    │   ├── manager.js           ← gerenciadores de dados
    │   ├── model.js             ← modelos (User, Service, Appointment)
    │   ├── notificacoes.js      ← notificações locais
    │   └── sync.js              ← sincronização Supabase
    └── plugins/
        └── cordova-plugin-local-notification/
            └── www/
                └── local-notification.js  ← plugin carregado pelo Cordova runtime
```

---

## Pré-requisitos

Instale e configure tudo abaixo **uma única vez** antes de buildar.

### 1. JDK 17
- Baixar: https://www.oracle.com/java/technologies/downloads/#java17
- Instalar normalmente no Windows
- Caminho padrão após instalar: `C:\Program Files\Java\jdk-17`

### 2. Android Studio + SDK
- Baixar: https://developer.android.com/studio
- Durante a instalação, marcar **Android SDK** para ser instalado junto
- Após abrir o Android Studio: **More Actions → SDK Manager**
  - Aba **SDK Platforms**: instalar **Android 14 (API 36)**
  - Aba **SDK Tools**: instalar **Android SDK Build-Tools 36.0.0** e **Android SDK Platform-Tools**
- Caminho padrão do SDK: `C:\Users\SEU_USUARIO\AppData\Local\Android\sdk`

### 3. Gradle 8.14.2
- Baixar: https://gradle.org/releases/ → `gradle-8.14.2-bin.zip`
- Extrair para `D:\Download\` (ou qualquer pasta fixa)
- A estrutura deve ficar: `D:\Download\gradle-8.14.2\bin\gradle.bat`

> **Atenção:** o Gradle 9.x não é compatível com o `cordova-android` 15. Use o 8.14.2.

### 4. Node.js + Cordova
```bash
# instalar Node.js LTS: https://nodejs.org
npm install -g cordova
```

---

## Como Rodar (Android)

### A. Configurar variáveis de ambiente (fazer toda vez que abrir o terminal)

Abra o **PowerShell** na pasta do projeto e execute:

```powershell
$env:JAVA_HOME    = "C:\Program Files\Java\jdk-17"
$env:ANDROID_HOME = "C:\Users\SEU_USUARIO\AppData\Local\Android\sdk"
$env:Path         = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;D:\Download\gradle-8.14.2\bin;$env:Path"
```

> Substitua `SEU_USUARIO` pelo seu nome de usuário do Windows (ex: `Lucas`).

### B. Instalar dependências (só na primeira vez)

```powershell
npm install
```

### C. Verificar se o ambiente está ok

```powershell
npx cordova requirements android
```

Deve mostrar todos os requisitos como `installed` ou `ok`.

### D. Gerar o APK

```powershell
npm run android
```

O APK gerado fica em:
```
platforms\android\app\build\outputs\apk\debug\app-debug.apk
```

---

## Como Instalar no Celular

### Opção 1: Pelo cabo USB (recomendado para desenvolvimento)

1. No celular, ative **Opções do desenvolvedor**:
   - Configurações → Sobre o telefone → toque **7 vezes** em "Número da versão"
2. Ative **Depuração USB**:
   - Configurações → Sistema → Opções do desenvolvedor → Depuração USB
3. Conecte o celular no PC pelo cabo e aceite a permissão no celular
4. No PowerShell (com as variáveis do passo A configuradas):

```powershell
adb devices
# deve listar seu aparelho

adb install -r platforms\android\app\build\outputs\apk\debug\app-debug.apk
```

### Opção 2: Transferir o APK diretamente

1. Copie o arquivo `app-debug.apk` para o celular via USB, Google Drive ou WhatsApp
2. No celular, abra o arquivo pelo gerenciador de arquivos
3. Se solicitado, permita **instalar apps desconhecidos**
4. Instalar

---

## Sincronização com Supabase (funcionalidade extra)

O arquivo `www/js/sync.js` integra com o **Supabase** (PostgreSQL na nuvem).

### Configuração

1. Criar projeto gratuito em [supabase.com](https://supabase.com)
2. No **SQL Editor**, criar a tabela:

```sql
create table registros (
  id         bigserial primary key,
  titulo     text,
  dados      jsonb,
  lat        float8,
  lng        float8,
  criado_em  timestamptz default now()
);
```

3. Em **Settings → API**, copiar:
   - **Project URL**
   - **anon public key**

4. Abrir `www/js/sync.js` e substituir:

```js
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_KEY = 'SUA_CHAVE_ANON';
```

---

## Persistência Local

Todos os dados ficam no `localStorage` do dispositivo:

| Chave | Conteúdo |
|---|---|
| `nx2_users` | Usuários cadastrados |
| `nx2_session` | Sessão atual |
| `nx2_appointments` | Agendamentos |
| `nx2_services_{id}` | Serviços do prestador |
| `nx2_chat_{aptId}` | Mensagens do chat |
| `nx2_cache_*` | Cache das APIs (TTL 24h) |

---

## Checklist das Entregas

### Entrega 1 ✅
- [x] Projeto Cordova criado e configurado
- [x] README criado
- [x] Estrutura organizada em arquivos separados
- [x] API IBGE/dados.gov.br funcionando
- [x] API ViaCEP funcionando
- [x] Plugins instalados

### Entrega 2 ✅
- [x] APIs integradas na interface com loading visual (spinners)
- [x] Tratamento de erros com mensagens ao usuário
- [x] GPS funcionando: mapa Leaflet + marcadores de prestadores
- [x] Câmera funcionando: foto de perfil
- [x] Cache/persistência via localStorage
- [x] Navegação funcional entre todas as telas

### Entrega 3 / Aula 7 ✅
- [x] Notificações locais (`cordova-plugin-local-notification`)
- [x] Sincronização com banco externo Supabase (`sync.js`)
- [x] APK Android gerando com sucesso (`npm run android`)
- [x] APK instalável no dispositivo físico

---

## ⚠️ Correções Necessárias Após `cordova prepare`

> Toda vez que rodar `cordova prepare android` ou `cordova platform rm android && cordova platform add android`, os arquivos abaixo são regenerados e precisam ser corrigidos manualmente antes do build.

### 1. `platforms/android/cordova-plugin-local-notification/app-localnotification.gradle`

Trocar `compile` por `implementation` e adicionar dependências AndroidX:

```gradle
// DE:
compile("me.leolin:ShortcutBadger:1.1.22@aar")

// PARA:
implementation("me.leolin:ShortcutBadger:1.1.22@aar")
implementation("androidx.media:media:1.7.0")
implementation("androidx.collection:collection:1.4.0")
```

### 2. `plugins/cordova-plugin-local-notification/src/android/build/localnotification.gradle`

Mesma correção (essa é a fonte — editar aqui evita regerar):

```gradle
implementation("me.leolin:ShortcutBadger:1.1.22@aar")
implementation("androidx.media:media:1.7.0")
implementation("androidx.collection:collection:1.4.0")
```

### 3. Imports AndroidX nos arquivos `.java` do plugin

Rodar no PowerShell dentro da pasta do projeto:

```powershell
$files = Get-ChildItem -Recurse -File `
  plugins\cordova-plugin-local-notification\src\android, `
  platforms\android\app\src\main\java\de\appplant `
  -Include *.java

foreach ($file in $files) {
  $text = Get-Content -Raw -LiteralPath $file.FullName
  $text = $text.Replace('android.support.v4.app.NotificationCompat',        'androidx.core.app.NotificationCompat')
  $text = $text.Replace('android.support.v4.app.NotificationManagerCompat', 'androidx.core.app.NotificationManagerCompat')
  $text = $text.Replace('android.support.v4.app.RemoteInput',               'androidx.core.app.RemoteInput')
  $text = $text.Replace('android.support.v4.media.app.NotificationCompat.MediaStyle', 'androidx.media.app.NotificationCompat.MediaStyle')
  $text = $text.Replace('android.support.v4.util.ArraySet',    'androidx.collection.ArraySet')
  $text = $text.Replace('android.support.v4.util.Pair',        'androidx.core.util.Pair')
  $text = $text.Replace('android.support.v4.content.FileProvider', 'androidx.core.content.FileProvider')
  # MediaSessionCompat é exceção: mantém o pacote support mesmo no AndroidX
  Set-Content -LiteralPath $file.FullName -Value $text -NoNewline
}
```

> **Nota:** `android.support.v4.media.session.MediaSessionCompat` **não** deve ser trocado — esse import permanece com o pacote antigo mesmo no build moderno.

### 4. `platforms/android/android.json` — remover permissões duplicadas

Se aparecer erro de `WRITE_EXTERNAL_STORAGE duplicado` no build, abrir `platforms/android/android.json` e remover as entradas:

```json
"android.permission.READ_EXTERNAL_STORAGE"
"android.permission.WRITE_EXTERNAL_STORAGE"
```

do bloco de `"munge"` que **não** vierem do `cordova-plugin-camera`. As do plugin de câmera já incluem `maxSdkVersion=32` e devem ser mantidas.

---

## Avisos Esperados no Build (não são erros)

```
Script file doesn't exist and will be skipped: hooks\before_prepare\copy_docs_to_www.js
```
Hook opcional que não existe — ignorar.

```
ANDROID_SDK_ROOT=... (DEPRECATED)
```
Variável antiga coexistindo com `ANDROID_HOME` — não afeta o build.

```
Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.
```
O build usa Gradle 8.14.2 internamente — esse aviso é sobre o futuro Gradle 9, não afeta nada agora.
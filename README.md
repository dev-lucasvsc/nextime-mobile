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
| Apache Cordova | 12.x | Empacotamento Android/iOS |
| Framework7 | integrado | Integração nativa (back button, teclado, splash) |
| Leaflet.js | 1.9.4 | Mapa interativo OpenStreetMap (GPS) |
| JavaScript ES6+ | — | Lógica da aplicação |
| localStorage | Web API | Persistência e cache de APIs |
| cordova-plugin-camera | ^7.0.0 | Câmera e galeria |

---

## APIs Integradas

### 1. IBGE — Municípios ⭐ `dados.gov.br` (OBRIGATÓRIA)
**Endpoint:** `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/{codigo}`
**Uso:** enriquece o resultado do ViaCEP com microrregião e mesorregião do município.

### 2. ViaCEP (brasileira)
**Endpoint:** `https://viacep.com.br/ws/{cep}/json/`
**Uso:** preenche automaticamente cidade/bairro/estado no cadastro. Loading spinner durante busca.

### 3. BrasilAPI CNPJ — Receita Federal (brasileira/governamental)
**Endpoint:** `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`
**Uso:** valida CNPJ na Receita Federal, preenche razão social. Loading spinner durante consulta.

### 4. BrasilAPI Feriados (brasileira)
**Endpoint:** `https://brasilapi.com.br/api/feriados/v1/{ano}`
**Uso:** feriados nacionais no calendário do prestador (ponto amarelo nos dias).

### 5. DiceBear Avatars (internacional)
**Endpoint:** `https://api.dicebear.com/9.x/initials/svg?seed={nome}`
**Uso:** avatares automáticos com iniciais para usuários sem foto.

### 6. OpenStreetMap / Nominatim (GPS)
**Endpoint:** `https://nominatim.openstreetmap.org/search?q={cidade,uf}&format=json`
**Uso:** geocodifica cidades dos prestadores para cálculo de distância (Haversine) e exibição no mapa Leaflet.

---

## Recursos Nativos

### Câmera (`cordova-plugin-camera`)
- Foto de perfil via câmera frontal ou galeria
- Acesso: aba Perfil → botão Editar → Câmera / Galeria

### GPS (Geolocalização nativa)
- Botão "Perto de mim" na tela Explorar
- Usa `navigator.geolocation.getCurrentPosition()`
- Abre mapa interativo (Leaflet + OpenStreetMap) com marcador do usuário e marcadores dos prestadores
- Filtra prestadores num raio de 10 km com cálculo Haversine
- Badge de distância em km em cada card de prestador

---

## Persistência

Todos os dados e cache de APIs são salvos no `localStorage`:

| Chave | Conteúdo | TTL |
|---|---|---|
| `nx2_users` | Usuários cadastrados | Permanente |
| `nx2_session` | Sessão atual | Permanente |
| `nx2_appointments` | Agendamentos | Permanente |
| `nx2_services_{id}` | Serviços do prestador | Permanente |
| `nx2_chat_{aptId}` | Mensagens do chat | Permanente |
| `nx2_cache_ibge_municipio_{cod}` | Cache IBGE | 24h |
| `nx2_cache_viacep_{cep}` | Cache ViaCEP | 24h |
| `nx2_cache_brasilapi_cnpj_{cnpj}` | Cache CNPJ | 24h |
| `nx2_cache_feriados_{ano}` | Cache feriados | 24h |

---

## Estrutura do Projeto

```
nextime-mobile/
├── config.xml
├── package.json
├── README.md
└── www/
    ├── index.html
    ├── css/
    │   └── app.css
    └── js/
        ├── app.js          ← Lógica principal
        ├── api-service.js  ← Chamadas a APIs externas
        ├── manager.js      ← Gerenciadores de dados
        └── model.js        ← Modelos (User, Service, Appointment...)
```

---

## Como Rodar

```bash
npm install
npm start              # browser
cordova run browser    # browser via Cordova

# Android
cordova platform add android
cordova build android
# APK: platforms/android/app/build/outputs/apk/debug/
```

---

## Checklist das Entregas

### Entrega 1 ✅
- [x] Projeto Cordova criado e configurado
- [x] Framework7 configurado
- [x] README criado
- [x] Estrutura organizada em arquivos separados
- [x] API 1 (IBGE/dados.gov.br) funcionando
- [x] API 2 (ViaCEP) funcionando
- [x] Plugins instalados

### Entrega 2 ✅
- [x] APIs integradas na interface com loading visual (spinners animados)
- [x] Tratamento de erros com mensagens ao usuário
- [x] GPS funcionando: mapa Leaflet + marcadores de prestadores
- [x] Câmera funcionando: foto de perfil
- [x] Cache/persistência via localStorage
- [x] Navegação funcional entre todas as telas

### Entrega 3 ✅
- [x] Aplicativo funcional e estável
- [x] Todas as funcionalidades integradas
- [x] README.md final atualizado
- [x] Build Android pronto (`cordova build android`)
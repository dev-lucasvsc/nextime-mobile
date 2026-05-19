# 📅 Nextime

> **Agendamentos simples. Clientes satisfeitos.**

Aplicativo mobile de agendamento de serviços com gestão de clientes, desenvolvido com **Apache Cordova** para a disciplina de Desenvolvimento Mobile — Unieuro 2025.

---

## 📋 Descrição

O **Nextime** conecta **clientes** e **prestadores de serviço** em uma plataforma unificada de agendamento. Clientes encontram prestadores e agendam horários; prestadores gerenciam sua agenda, serviços e se comunicam com os clientes via chat integrado.

O app funciona inteiramente no navegador (plataforma `browser` do Cordova), persistindo os dados via `localStorage`, sem necessidade de backend.

---

## ✨ Funcionalidades

### 👤 Perfil Cliente
- Cadastro com CPF, foto de perfil (câmera ou galeria) e endereço via CEP
- Busca de prestadores disponíveis
- Agendamento de serviços com seleção de data, hora e observação
- Acompanhamento de status dos agendamentos (pendente, confirmado, concluído, cancelado, recusado)
- Chat por agendamento com o prestador
- Calendário mensal com navegação

### 🔧 Perfil Prestador
- Cadastro com CNPJ (validado via Receita Federal), foto e endereço
- Gestão de serviços (nome, duração, preço, descrição)
- Painel de agendamentos com filtros por status e data
- Confirmação, recusa ou conclusão de agendamentos
- Chat por agendamento com o cliente
- Visualização de feriados nacionais no calendário

### 🌐 APIs Integradas

| API | Finalidade | Fonte |
|-----|-----------|-------|
| **IBGE** | Lista de municípios brasileiros | dados.gov.br |
| **ViaCEP** | Preenchimento automático de endereço por CEP | viacep.com.br |
| **BrasilAPI — CNPJ** | Validação e dados cadastrais de empresas (Receita Federal) | brasilapi.com.br |
| **BrasilAPI — Feriados** | Feriados nacionais para o calendário | brasilapi.com.br |
| **DiceBear** | Geração automática de avatar por iniciais do nome | dicebear.com |

---

## 🗂️ Estrutura do Projeto

```
nextime-mobile/
├── config.xml              # Configuração Cordova (ID, versão, plugins)
├── package.json            # Dependências e scripts npm
├── www/                    # Código-fonte da aplicação
│   ├── index.html          # Estrutura HTML principal (todas as telas)
│   ├── css/
│   │   └── app.css         # Estilos globais (tema escuro, componentes)
│   └── js/
│       ├── model.js        # Classes de dados: User, Service, Appointment, ChatMessage
│       ├── manager.js      # Lógica de negócio: AuthManager, ServiceManager,
│       │                   # AppointmentManager, ChatManager
│       ├── api-service.js  # Integração com APIs externas (IBGE, ViaCEP, BrasilAPI, DiceBear)
│       ├── app.js          # Controlador principal: navegação, eventos, renderização
│       └── cordova-app.js  # Inicialização Cordova (câmera, deviceready)
├── plugins/
│   └── cordova-plugin-camera/   # Plugin de câmera/galeria
└── platforms/
    └── browser/            # Build para plataforma browser
```

---

## 🚀 Como Executar

### Pré-requisitos

- [Node.js](https://nodejs.org/) (v14 ou superior)
- [Apache Cordova](https://cordova.apache.org/) (v13)

```bash
npm install -g cordova
```

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/seuusuario/nextime-mobile.git
cd nextime-mobile

# 2. Instale as dependências
npm install

# 3. Execute no browser
npm start
# ou
cordova run browser
```

O aplicativo abrirá automaticamente em `http://localhost:8000`.

---

## 🧩 Arquitetura

O projeto segue uma arquitetura **MVC simplificada**, sem frameworks externos:

- **Model** (`model.js`): Classes `User`, `Service`, `Appointment` e `ChatMessage` com geração automática de IDs únicos.
- **Manager** (`manager.js`): Camada de negócio que lê e persiste dados no `localStorage`. Classes `AuthManager`, `ServiceManager`, `AppointmentManager` e `ChatManager`.
- **View + Controller** (`index.html` + `app.js`): Renderização dinâmica de componentes e gerenciamento de eventos do usuário.
- **Serviços** (`api-service.js`): Módulo isolado de chamadas às APIs externas, com cache local de 24h via `localStorage`.

---

## 📦 Dependências

| Pacote | Versão | Uso |
|--------|--------|-----|
| `cordova` | ^13.0.0 | Framework mobile |
| `cordova-browser` | ^7.0.0 | Plataforma browser |
| `cordova-plugin-camera` | ^7.0.0 | Acesso à câmera e galeria |

**Fontes externas (CDN):**
- Google Fonts — `Syne` e `DM Sans`
- Google Material Icons Round

---

## 🎨 Design

- Tema escuro com fundo `#0a0a0f`
- Tipografia principal: **Syne** (títulos) e **DM Sans** (corpo)
- Sistema de sheets (bottom sheets) para formulários e detalhes
- Componentes: badges de status coloridos, avatares gerados automaticamente, toast de notificações, tabs de navegação

---

## 👥 Autores

**Lucas e Parceiro** — Unieuro 2025
Disciplina: Desenvolvimento Mobile

---

## 📄 Licença

Este projeto está licenciado sob a licença **MIT**. Consulte o arquivo `LICENSE` para mais detalhes.

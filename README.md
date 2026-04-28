<div align="center">

# nextime

**Aplicativo mobile de agendamento de serviços**

[![Cordova](https://img.shields.io/badge/Apache_Cordova-12.0-35434F?logo=apache-cordova&logoColor=white)](https://cordova.apache.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-00d4aa)](./LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-00d4aa)]()

> Plataforma que conecta clientes e prestadores de serviço — agendamento, chat e gestão de receita em um único app.

*Disciplina de Desenvolvimento Mobile — Unieuro 2026*
*Lucas & João Gabriel*

</div>

---

## Sumário

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Como Executar](#como-executar)
- [Arquitetura](#arquitetura)
- [Armazenamento de Dados](#armazenamento-de-dados)
- [Perfis de Usuário](#perfis-de-usuário)
- [Ciclo de Vida do Agendamento](#ciclo-de-vida-do-agendamento)
- [Licença](#licença)

---

## Sobre o Projeto

O **Nextime** é um aplicativo mobile desenvolvido com Apache Cordova que resolve o problema da gestão manual de agendamentos entre clientes e prestadores de serviço. Clientes podem descobrir profissionais, solicitar agendamentos e se comunicar via chat integrado. Prestadores gerenciam sua agenda, cadastram serviços e acompanham receita pelo dashboard.

O projeto foi desenvolvido como trabalho prático da disciplina de Desenvolvimento Mobile na Unieuro, utilizando JavaScript puro, HTML5 e localStorage — sem dependência de backend externo.

---

## Funcionalidades

### Para o Prestador de Serviço
- ✅ Cadastro com CNPJ, nome do negócio e foto de perfil
- 📅 Agenda diária com navegação por mês e seleção de dia
- 🛠️ Gestão de serviços: cadastrar, editar e remover com nome, preço e duração
- ⚡ Ações sobre agendamentos: confirmar, recusar, concluir e cancelar
- 📊 Dashboard com receita mensal e métricas por status
- 💬 Chat integrado por agendamento com cada cliente
- 🔒 Edição de foto de perfil e troca de senha

### Para o Cliente
- 🔍 Explorar prestadores com busca por nome e serviço
- 📆 Agendar serviços com data, hora e observação
- 🔔 Acompanhar status dos agendamentos em tempo real
- 💬 Chat direto com o prestador por agendamento
- 📋 Histórico completo de agendamentos
- 🔒 Edição de foto de perfil e troca de senha

---

## Tecnologias

| Tecnologia | Versão | Uso |
|---|---|---|
| Apache Cordova | ^12.0.0 | Plataforma mobile/browser |
| cordova-browser | ^7.0.0 | Target de execução |
| cordova-plugin-camera | ^7.0.0 | Acesso à câmera e galeria |
| JavaScript | ES6+ | Toda a lógica da aplicação |
| HTML5 | — | Interface (Single Page Application) |
| CSS Custom Properties | — | Design system e tema |
| localStorage | — | Persistência de dados |
| Material Icons | CDN | Biblioteca de ícones |
| Plus Jakarta Sans | CDN | Tipografia — títulos e valores |
| Space Grotesk | CDN | Tipografia — corpo de texto |

---

## Estrutura do Projeto

```
nextime-mobile-main/
├── config.xml              # Configuração Cordova (id, plugins, permissões)
├── package.json            # Dependências e scripts npm
└── docs/
    ├── index.html          # Toda a interface (telas, sheets, modais)
    ├── css/
    │   └── app.css         # Design system, variáveis CSS e componentes
    └── js/
        ├── model.js        # Classes de dados: User, Service, Appointment, ChatMessage
        ├── manager.js      # Camada de acesso ao localStorage (CRUD)
        └── app.js          # Lógica de UI, eventos e renderização
```

---

## Como Executar

### Pré-requisitos

- [Node.js](https://nodejs.org/) instalado
- Apache Cordova instalado globalmente

```bash
npm install -g cordova
```

### Instalação

```bash
# Clone o repositório
git clone https://github.com/dev-lucasvsc/nextime-mobile.git
cd nextime-mobile-main

# Instale as dependências
npm install

# Adicione a plataforma browser
cordova platform add browser
```

### Executando

```bash
npm start
# ou
cordova run browser
```

O app abrirá automaticamente no navegador padrão.

---

## Arquitetura

O projeto segue uma separação clara em três camadas:

```
┌─────────────────────────────────────┐
│            app.js (View)            │
│   Lógica de UI, eventos, render     │
├─────────────────────────────────────┤
│          manager.js (Manager)       │
│  AuthManager  ServiceManager        │
│  AppointmentManager  ChatManager    │
├─────────────────────────────────────┤
│           model.js (Model)          │
│  User  Service  Appointment         │
│  ChatMessage  Mask                  │
├─────────────────────────────────────┤
│           localStorage              │
│       Persistência de dados         │
└─────────────────────────────────────┘
```

### model.js — Entidades

| Classe | Campos principais |
|---|---|
| `User` | id, nome, email, senha, perfil, cpf/cnpj, foto |
| `Service` | id, nome, duracao, preco, descricao, prestadorId |
| `Appointment` | id, clienteId, prestadorId, servicoId, data, hora, status |
| `ChatMessage` | id, aptId, remetenteId, texto, timestamp |

### manager.js — Acesso a Dados

| Classe | Responsabilidade |
|---|---|
| `AuthManager` | Cadastro, login, logout, sessão ativa |
| `ServiceManager` | CRUD de serviços por prestador |
| `AppointmentManager` | CRUD de agendamentos, filtros, métricas |
| `ChatManager` | Envio e leitura de mensagens por agendamento |

---

## Armazenamento de Dados

Toda a persistência é feita via `localStorage` do browser, sem backend externo.

| Chave | Tipo | Conteúdo |
|---|---|---|
| `nx2_users` | `Array<User>` | Todos os usuários cadastrados |
| `nx2_session` | `User` | Usuário da sessão ativa |
| `nx2_services_{prestadorId}` | `Array<Service>` | Serviços de um prestador |
| `nx2_appointments` | `Array<Appointment>` | Todos os agendamentos |
| `nx2_chat_{aptId}` | `Array<ChatMessage>` | Mensagens de um agendamento |

> ⚠️ **Atenção:** por ser um protótipo acadêmico, as senhas são armazenadas em texto puro e os dados são locais ao browser. Limpar os dados do navegador apaga toda a base.

---

## Perfis de Usuário

O app possui dois perfis com interfaces completamente distintas:

**Cliente**
- Cadastro com CPF
- Acesso às abas: Explorar, Meus Agendamentos, Chats, Perfil

**Prestador**
- Cadastro com CNPJ e nome do negócio
- Acesso às abas: Agenda, Serviços, Dashboard, Chats, Perfil

---

## Ciclo de Vida do Agendamento

```
                    ┌─────────────┐
                    │   pendente  │  ← criado pelo cliente
                    └──────┬──────┘
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │ confirmado  │          │  recusado   │
       └──────┬──────┘          └─────────────┘
       ┌──────┴──────┐
       ▼             ▼
┌───────────┐  ┌───────────┐
│ concluido │  │ cancelado │
└───────────┘  └───────────┘
```

| Status | Cor | Ação |
|---|---|---|
| `pendente` | 🟡 Amarelo | Aguardando resposta do prestador |
| `confirmado` | 🔵 Azul | Prestador aceitou |
| `concluido` | 🟢 Verde | Serviço realizado |
| `cancelado` | 🔴 Vermelho | Cancelado após confirmação |
| `recusado` | ⚫ Cinza | Prestador recusou a solicitação |


---

<div align="center">

Feito por **Lucas & João Gabriel** — Unieuro 2026

</div>

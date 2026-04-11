# 🗓️ Nextime — Agendamento de Serviços

> Aplicativo mobile desenvolvido com Apache Cordova para a disciplina de **Desenvolvimento Mobile** — Centro Universitário Unieuro (2025).

---

## 👥 Integrantes

| Nome | RA |
|------|----|
| Lucas Vasconcelos Pessoa de Oliveira | xxxxxxx |
| Nome do Parceiro | xxxxxxx |

---

## 📱 Sobre o App

O **Nextime** é um aplicativo de agendamento de serviços para autônomos e pequenos negócios. Permite cadastrar clientes (com foto de perfil via câmera/galeria), gerenciar serviços com preço e duração, criar agendamentos com horário e status, e visualizar um resumo financeiro mensal.

---

## ✅ Funcionalidades Implementadas

- **Autenticação** — cadastro e login por e-mail/senha, dados separados por usuário via localStorage
- **CRUD de Clientes** — cadastrar, editar, excluir clientes com nome, telefone, e-mail e **foto de perfil**
- **Foto de Perfil** — captura via câmera do dispositivo ou galeria, salva como base64 no localStorage
- **CRUD de Serviços** — nome, preço, duração e descrição
- **CRUD de Agendamentos** — cliente, serviço, data, hora, status e observação
- **Status do Agendamento** — Pendente, Confirmado, Concluído, Cancelado com atualização rápida
- **Visualização por Dia** — strip de dias do mês com indicador de agendamento
- **Navegação por Mês** — visualizar qualquer mês
- **Resumo Mensal** — receita total, contagem por status, lista de agendamentos do mês agrupada por data
- **Persistência** — todos os dados salvos no localStorage por usuário

---

## 🛠️ Tecnologias Utilizadas

- Apache Cordova 12
- Plugin: `cordova-plugin-camera`
- Framework7 v8 (UI/UX mobile)
- HTML5 + CSS3 (tema dark personalizado)
- JavaScript ES6+ (classes, arrow functions, template literals, destructuring)
- localStorage (persistência por usuário)
- Google Fonts — Plus Jakarta Sans + Space Grotesk
- Material Icons

---

## 📁 Estrutura do Projeto

```
Nextime/
├── config.xml          ← ID: br.com.nextime.app, plugin camera
├── package.json
├── README.md
└── www/
    ├── index.html      ← SPA com Framework7
    ├── css/
    │   └── app.css     ← Tema dark ciano/esmeralda
    └── js/
        ├── model.js    ← Classes: User, Client, Service, Appointment, STATUS_LIST
        ├── manager.js  ← Classes: AuthManager, ClientManager, ServiceManager, AppointmentManager
        └── app.js      ← Inicialização, eventos, renderização
```

---

## ▶️ Como Executar

```bash
# 1. Instalar dependências
npm install

# 2. Adicionar plataforma browser
cordova platform add browser

# 3. Adicionar plugin de câmera
cordova plugin add cordova-plugin-camera

# 4. Executar
cordova run browser
```

Acesse em: `http://localhost:8000`

> **Nota sobre câmera no browser:** O plugin `cordova-plugin-camera` funciona nativamente em dispositivos Android/iOS. No browser, o app utiliza `<input type="file" capture="user">` como fallback, que abre a câmera em dispositivos móveis e a galeria em desktops.

---

## 🏗️ Arquitetura de Classes

### `model.js`
- **`User`** — id, nome, email, senha
- **`Client`** — id, nome, telefone, email, foto (base64), usuarioId
- **`Service`** — id, nome, duracao, preco, descricao, usuarioId
- **`Appointment`** — id, clienteId, servicoId, data, hora, status, observacao, usuarioId
- **`STATUS_LIST`** — array de status com id, label, color e icon

### `manager.js`
- **`AuthManager`** — cadastrar(), login(), logout(), getUsuarioAtual(), estaLogado()
- **`ClientManager`** — adicionar(), listar(), buscarPorId(), atualizar(), remover(), atualizarFoto()
- **`ServiceManager`** — adicionar(), listar(), buscarPorId(), atualizar(), remover()
- **`AppointmentManager`** — adicionar(), listar(), listarPorMes(), buscarPorId(), atualizar(), atualizarStatus(), remover(), receitaMes(), contagemPorStatus()

---

## 🎨 Design

Tema dark com paleta ciano/esmeralda. Tipografia: **Plus Jakarta Sans** (display) + **Space Grotesk** (corpo). Interface responsiva de 320px a 768px.

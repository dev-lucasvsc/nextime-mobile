/**
 * manager.js — Gerenciadores de dados do Nextime
 * Disciplina: Desenvolvimento Mobile — Unieuro 2025
 */

// ─────────────────────────────────────────────
// AuthManager
// ─────────────────────────────────────────────
class AuthManager {
  constructor() {
    this.USERS_KEY   = 'nextime_users';
    this.SESSION_KEY = 'nextime_session';
  }

  _getUsers() { return JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]'); }
  _saveUsers(u) { localStorage.setItem(this.USERS_KEY, JSON.stringify(u)); }

  cadastrar(nome, email, senha) {
    const users = this._getUsers();
    if (users.find(u => u.email === email.toLowerCase().trim()))
      throw new Error('E-mail já cadastrado.');
    const user = new User({ nome, email, senha });
    users.push(user);
    this._saveUsers(users);
    return user;
  }

  login(email, senha) {
    const user = this._getUsers().find(
      u => u.email === email.toLowerCase().trim() && u.senha === senha
    );
    if (!user) throw new Error('E-mail ou senha inválidos.');
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
    return user;
  }

  logout() { localStorage.removeItem(this.SESSION_KEY); }
  getUsuarioAtual() { return JSON.parse(localStorage.getItem(this.SESSION_KEY) || 'null'); }
  estaLogado() { return !!this.getUsuarioAtual(); }
}

// ─────────────────────────────────────────────
// ClientManager — CRUD de clientes
// ─────────────────────────────────────────────
class ClientManager {
  constructor(usuarioId) {
    this.usuarioId = usuarioId;
    this.KEY = `nextime_clients_${usuarioId}`;
  }

  _getAll() { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); }
  _saveAll(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); }

  adicionar(dados) {
    const list = this._getAll();
    const client = new Client({ ...dados, usuarioId: this.usuarioId });
    list.push(client);
    this._saveAll(list);
    return client;
  }

  listar() {
    return this._getAll().sort((a, b) => a.nome.localeCompare(b.nome));
  }

  buscarPorId(id) { return this._getAll().find(c => c.id === id) || null; }

  atualizar(id, dados) {
    const list = this._getAll();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Cliente não encontrado.');
    list[idx] = { ...list[idx], ...dados };
    this._saveAll(list);
    return list[idx];
  }

  remover(id) {
    this._saveAll(this._getAll().filter(c => c.id !== id));
  }

  atualizarFoto(id, fotoBase64) {
    return this.atualizar(id, { foto: fotoBase64 });
  }
}

// ─────────────────────────────────────────────
// ServiceManager — CRUD de serviços
// ─────────────────────────────────────────────
class ServiceManager {
  constructor(usuarioId) {
    this.usuarioId = usuarioId;
    this.KEY = `nextime_services_${usuarioId}`;
  }

  _getAll() { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); }
  _saveAll(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); }

  adicionar(dados) {
    const list = this._getAll();
    const svc = new Service({ ...dados, usuarioId: this.usuarioId });
    list.push(svc);
    this._saveAll(list);
    return svc;
  }

  listar() {
    return this._getAll().sort((a, b) => a.nome.localeCompare(b.nome));
  }

  buscarPorId(id) { return this._getAll().find(s => s.id === id) || null; }

  atualizar(id, dados) {
    const list = this._getAll();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Serviço não encontrado.');
    list[idx] = { ...list[idx], ...dados };
    this._saveAll(list);
    return list[idx];
  }

  remover(id) {
    this._saveAll(this._getAll().filter(s => s.id !== id));
  }
}

// ─────────────────────────────────────────────
// AppointmentManager — CRUD de agendamentos
// ─────────────────────────────────────────────
class AppointmentManager {
  constructor(usuarioId) {
    this.usuarioId = usuarioId;
    this.KEY = `nextime_appointments_${usuarioId}`;
  }

  _getAll() { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); }
  _saveAll(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); }

  adicionar(dados) {
    const list = this._getAll();
    const apt = new Appointment({ ...dados, usuarioId: this.usuarioId });
    list.push(apt);
    this._saveAll(list);
    return apt;
  }

  listar({ data = null, status = null } = {}) {
    let list = this._getAll();
    if (data)   list = list.filter(a => a.data === data);
    if (status) list = list.filter(a => a.status === status);
    return list.sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      return a.hora.localeCompare(b.hora);
    });
  }

  listarPorMes(mes, ano) {
    return this._getAll().filter(a => {
      const d = new Date(a.data + 'T00:00:00');
      return d.getMonth() === mes && d.getFullYear() === ano;
    }).sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      return a.hora.localeCompare(b.hora);
    });
  }

  buscarPorId(id) { return this._getAll().find(a => a.id === id) || null; }

  atualizar(id, dados) {
    const list = this._getAll();
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Agendamento não encontrado.');
    list[idx] = { ...list[idx], ...dados };
    this._saveAll(list);
    return list[idx];
  }

  atualizarStatus(id, status) {
    return this.atualizar(id, { status });
  }

  remover(id) {
    this._saveAll(this._getAll().filter(a => a.id !== id));
  }

  // ── Cálculos financeiros ──
  receitaMes(mes, ano, serviceManager) {
    return this.listarPorMes(mes, ano)
      .filter(a => a.status === 'concluido')
      .reduce((acc, a) => {
        const svc = serviceManager.buscarPorId(a.servicoId);
        return acc + (svc ? svc.preco : 0);
      }, 0);
  }

  contagemPorStatus(mes, ano) {
    const list = this.listarPorMes(mes, ano);
    return STATUS_LIST.reduce((acc, s) => {
      acc[s.id] = list.filter(a => a.status === s.id).length;
      return acc;
    }, {});
  }
}

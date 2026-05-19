/**
 * manager.js — Nextime v2
 * Disciplina: Desenvolvimento Mobile — Unieuro 2025
 */

// ─────────────────────────────────────────────
// AuthManager
// ─────────────────────────────────────────────
class AuthManager {
  constructor() {
    this.USERS_KEY   = 'nx2_users';
    this.SESSION_KEY = 'nx2_session';
  }
  _getUsers()    { return JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]'); }
  _saveUsers(u)  { localStorage.setItem(this.USERS_KEY, JSON.stringify(u)); }

  cadastrar({ nome, email, senha, perfil, cpf, cnpj, nomeNegocio, foto,
                cep, cidade, bairro, estado, situacaoCnpj, razaoSocial, fantasia }) {
    const users = this._getUsers();
    if (users.find(u => u.email === email.toLowerCase().trim()))
      throw new Error('E-mail já cadastrado.');
    const user = new User({
      nome, email, senha, perfil,
      cpf:          cpf          || null,
      cnpj:         cnpj         || null,
      nomeNegocio:  nomeNegocio  || null,
      foto:         foto         || null,
      cep:          cep          || null,
      cidade:       cidade       || null,
      bairro:       bairro       || null,
      estado:       estado       || null,
      situacaoCnpj: situacaoCnpj || null,
    });
    // campos extras não presentes no constructor User mas úteis
    if (razaoSocial) user.razaoSocial = razaoSocial;
    if (fantasia)    user.fantasia    = fantasia;
    users.push(user);
    this._saveUsers(users);
    return user;
  }

  atualizarFoto(userId, fotoBase64) {
    const users = this._getUsers();
    const idx   = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('Usuário não encontrado.');
    users[idx].foto = fotoBase64;
    this._saveUsers(users);
    const session = this.getUsuarioAtual();
    if (session && session.id === userId) {
      session.foto = fotoBase64;
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    }
    return users[idx];
  }

  login(email, senha) {
    const user = this._getUsers().find(u => u.email === email.toLowerCase().trim() && u.senha === senha);
    if (!user) throw new Error('E-mail ou senha inválidos.');
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
    return user;
  }

  logout()           { localStorage.removeItem(this.SESSION_KEY); }

  atualizarPerfil(userId, campos) {
    const users = this._getUsers();
    const idx   = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('Usuário não encontrado.');
    users[idx] = { ...users[idx], ...campos };
    this._saveUsers(users);
    // atualizar sessão também
    const session = this.getUsuarioAtual();
    if (session && session.id === userId) {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(users[idx]));
    }
    return users[idx];
  }
  getUsuarioAtual()  { return JSON.parse(localStorage.getItem(this.SESSION_KEY) || 'null'); }
  estaLogado()       { return !!this.getUsuarioAtual(); }

  listarPrestadores() {
    return this._getUsers().filter(u => u.perfil === 'prestador');
  }

  buscarPorId(id) {
    return this._getUsers().find(u => u.id === id) || null;
  }
}


// ServiceManager — serviços de um prestador

class ServiceManager {
  constructor(prestadorId) {
    this.prestadorId = prestadorId;
    this.KEY = `nx2_services_${prestadorId}`;
  }
  _getAll()       { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); }
  _saveAll(data)  { localStorage.setItem(this.KEY, JSON.stringify(data)); }

  adicionar(dados) {
    const list = this._getAll();
    const svc  = new Service({ ...dados, prestadorId: this.prestadorId });
    list.push(svc);
    this._saveAll(list);
    return svc;
  }
  listar()        { return this._getAll().sort((a, b) => a.nome.localeCompare(b.nome)); }
  buscarPorId(id) { return this._getAll().find(s => s.id === id) || null; }
  atualizar(id, dados) {
    const list = this._getAll();
    const idx  = list.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Serviço não encontrado.');
    list[idx] = { ...list[idx], ...dados };
    this._saveAll(list);
    return list[idx];
  }
  remover(id) { this._saveAll(this._getAll().filter(s => s.id !== id)); }

  // Listar serviços de qualquer prestador (estático)
  static listarDePrestador(prestadorId) {
    return JSON.parse(localStorage.getItem(`nx2_services_${prestadorId}`) || '[]');
  }
}

// AppointmentManager — agendamentos globais

class AppointmentManager {
  constructor() { this.KEY = 'nx2_appointments'; }
  _getAll()      { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); }
  _saveAll(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); }

  adicionar(dados) {
    const list = this._getAll();
    const apt  = new Appointment(dados);
    list.push(apt);
    this._saveAll(list);
    return apt;
  }

  buscarPorId(id)  { return this._getAll().find(a => a.id === id) || null; }

  // Para o cliente: agendamentos que ele fez
  listarDeCliente(clienteId) {
    return this._getAll()
      .filter(a => a.clienteId === clienteId)
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }

  // Para o prestador: agendamentos recebidos
  listarDePrestador(prestadorId, { mes = null, ano = null } = {}) {
    let list = this._getAll().filter(a => a.prestadorId === prestadorId);
    if (mes !== null && ano !== null) {
      list = list.filter(a => {
        const d = new Date(a.data + 'T00:00:00');
        return d.getMonth() === mes && d.getFullYear() === ano;
      });
    }
    return list.sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data);
      return a.hora.localeCompare(b.hora);
    });
  }

  listarDePrestadorPorData(prestadorId, data) {
    return this._getAll()
      .filter(a => a.prestadorId === prestadorId && a.data === data)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }

  atualizar(id, dados) {
    const list = this._getAll();
    const idx  = list.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Agendamento não encontrado.');
    list[idx] = { ...list[idx], ...dados };
    this._saveAll(list);
    return list[idx];
  }

  atualizarStatus(id, status) { return this.atualizar(id, { status }); }
  remover(id) { this._saveAll(this._getAll().filter(a => a.id !== id)); }

  contagemPorStatusPrestador(prestadorId, mes, ano) {
    const list = this.listarDePrestador(prestadorId, { mes, ano });
    return STATUS_LIST.reduce((acc, s) => {
      acc[s.id] = list.filter(a => a.status === s.id).length;
      return acc;
    }, {});
  }

  receitaMesPrestador(prestadorId, mes, ano) {
    return this.listarDePrestador(prestadorId, { mes, ano })
      .filter(a => a.status === 'concluido')
      .reduce((acc, a) => {
        const svc = ServiceManager.listarDePrestador(prestadorId).find(s => s.id === a.servicoId);
        return acc + (svc ? svc.preco : 0);
      }, 0);
  }
}


// ChatManager — mensagens por agendamento

class ChatManager {
  _key(aptId)     { return `nx2_chat_${aptId}`; }
  _getAll(aptId)  { return JSON.parse(localStorage.getItem(this._key(aptId)) || '[]'); }
  _save(aptId, msgs) { localStorage.setItem(this._key(aptId), JSON.stringify(msgs)); }

  enviar(aptId, remetenteId, texto) {
    if (!texto.trim()) return null;
    const msgs = this._getAll(aptId);
    const msg  = new ChatMessage({ aptId, remetenteId, texto: texto.trim() });
    msgs.push(msg);
    this._save(aptId, msgs);
    return msg;
  }

  listar(aptId) {
    return this._getAll(aptId).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}
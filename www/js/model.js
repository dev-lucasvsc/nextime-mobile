/**
 * model.js — Modelos de dados do Nextime
 * Disciplina: Desenvolvimento Mobile — Unieuro 2025
 */

class User {
  constructor({ id = null, nome, email, senha }) {
    this.id = id || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.nome = nome;
    this.email = email.toLowerCase().trim();
    this.senha = senha; // sem hash — propósito acadêmico
    this.criadoEm = new Date().toISOString();
  }
}

class Client {
  constructor({ id = null, nome, telefone = '', email = '', foto = null, usuarioId }) {
    this.id = id || `cli_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.nome = nome;
    this.telefone = telefone;
    this.email = email;
    this.foto = foto; // base64 da foto de perfil (câmera ou galeria)
    this.usuarioId = usuarioId;
    this.criadoEm = new Date().toISOString();
  }
}

class Service {
  constructor({ id = null, nome, duracao, preco, descricao = '', usuarioId }) {
    this.id = id || `svc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.nome = nome;
    this.duracao = parseInt(duracao); // duração em minutos
    this.preco = parseFloat(preco);
    this.descricao = descricao;
    this.usuarioId = usuarioId;
    this.criadoEm = new Date().toISOString();
  }
}

class Appointment {
  constructor({ id = null, clienteId, servicoId, data, hora, status = 'pendente', observacao = '', usuarioId }) {
    this.id = id || `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.clienteId = clienteId;
    this.servicoId = servicoId;
    this.data = data; // 'YYYY-MM-DD'
    this.hora = hora; // 'HH:MM'
    this.status = status; // 'pendente' | 'confirmado' | 'concluido' | 'cancelado'
    this.observacao = observacao;
    this.usuarioId = usuarioId;
    this.criadoEm = new Date().toISOString();
  }
}

// Status disponíveis
const STATUS_LIST = [
  { id: 'pendente',   label: 'Pendente',   color: '#f59e0b', icon: '🕐' },
  { id: 'confirmado', label: 'Confirmado', color: '#3b82f6', icon: '✅' },
  { id: 'concluido',  label: 'Concluído',  color: '#22d3a0', icon: '🎉' },
  { id: 'cancelado',  label: 'Cancelado',  color: '#ff5370', icon: '❌' },
];

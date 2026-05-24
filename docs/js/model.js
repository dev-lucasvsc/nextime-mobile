/**
 * model.js — Nextime v2
 * Disciplina: Desenvolvimento Mobile — Unieuro 2025
 */

class User {
  constructor({ id = null, nome, email, senha, perfil, cpf = null, cnpj = null, nomeNegocio = null, foto = null, cep = null, cidade = null, bairro = null, estado = null, situacaoCnpj = null }) {
    this.id          = id || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.nome        = nome;
    this.email       = email.toLowerCase().trim();
    this.senha       = senha;
    this.perfil      = perfil;       // 'cliente' | 'prestador'
    this.cpf         = cpf;          // apenas clientes (fictício)
    this.cnpj        = cnpj;         // apenas prestadores (fictício)
    this.nomeNegocio = nomeNegocio;  // apenas prestadores
    this.cep         = cep || null;        // endereço via ViaCEP
    this.cidade      = cidade || null;
    this.bairro      = bairro || null;
    this.estado      = estado || null;
    this.situacaoCnpj= situacaoCnpj || null; // situação Receita Federal
    this.foto        = foto;         // base64 da foto de perfil (câmera ou galeria)
    this.criadoEm    = new Date().toISOString();
  }
}

class Service {
  constructor({ id = null, nome, duracao, preco, descricao = '', prestadorId }) {
    this.id         = id || `svc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.nome       = nome;
    this.duracao    = parseInt(duracao);
    this.preco      = parseFloat(preco);
    this.descricao  = descricao;
    this.prestadorId = prestadorId;
    this.criadoEm   = new Date().toISOString();
  }
}

class Appointment {
  constructor({ id = null, clienteId, prestadorId, servicoId, data, hora, status = 'pendente', observacao = '' }) {
    this.id          = id || `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.clienteId   = clienteId;
    this.prestadorId = prestadorId;
    this.servicoId   = servicoId;
    this.data        = data;
    this.hora        = hora;
    this.status      = status; // 'pendente'|'confirmado'|'concluido'|'cancelado'|'recusado'
    this.observacao  = observacao;
    this.criadoEm    = new Date().toISOString();
  }
}

class ChatMessage {
  constructor({ id = null, aptId, remetenteId, texto }) {
    this.id          = id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.aptId       = aptId;
    this.remetenteId = remetenteId;
    this.texto       = texto;
    this.timestamp   = new Date().toISOString();
  }
}

// Status disponíveis
const STATUS_LIST = [
  { id: 'pendente',   label: 'Pendente',   color: '#f59e0b', icon: '🕐' },
  { id: 'confirmado', label: 'Confirmado', color: '#3b82f6', icon: '✅' },
  { id: 'concluido',  label: 'Concluído',  color: '#22d3a0', icon: '🎉' },
  { id: 'cancelado',  label: 'Cancelado',  color: '#ff4d6d', icon: '❌' },
  { id: 'recusado',   label: 'Recusado',   color: '#6b7280', icon: '🚫' },
];

// ── Máscaras ──
const Mask = {
  cpf(v) {
    v = v.replace(/\D/g, '').slice(0, 11);
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) =>
      d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a
    );
  },
  cnpj(v) {
    v = v.replace(/\D/g, '').slice(0, 14);
    return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, d, e) =>
      e ? `${a}.${b}.${c}/${d}-${e}` :
      d ? `${a}.${b}.${c}/${d}` :
      c ? `${a}.${b}.${c}` :
      b ? `${a}.${b}` : a
    );
  },
  apply(input, tipo) {
    input.addEventListener('input', (e) => {
      // Quantidade de dígitos antes do cursor (ignora pontuação)
      const beforeCursor = input.value.slice(0, input.selectionStart).replace(/\D/g, '').length;
      input.value = Mask[tipo](input.value);
      // Reposicionar cursor: contar dígitos até atingir beforeCursor novamente
      let digits = 0, newPos = 0;
      for (let i = 0; i < input.value.length; i++) {
        if (/\d/.test(input.value[i])) digits++;
        if (digits === beforeCursor) { newPos = i + 1; break; }
      }
      try { input.setSelectionRange(newPos, newPos); } catch(_) {}
    });
  }
};
/**
 * app.js — Nextime (sem Framework7)
 */

// ─── Estado global ───
const authManager = new AuthManager();
let clientManager  = null;
let serviceManager = null;
let aptManager     = null;

const hoje = new Date();
let currentMes   = hoje.getMonth();
let currentAno   = hoje.getFullYear();
let selectedDate = hoje.toISOString().split('T')[0];
let resMes = hoje.getMonth();
let resAno = hoje.getFullYear();
let fotoTemp = null;

// ─── Helpers ───
const fmt = {
  moeda: v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
  mesAno: (m, a) => {
    const n = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${n[m]} ${a}`;
  },
  dataExibicao: d => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  },
  diasNoMes: (m, a) => new Date(a, m + 1, 0).getDate(),
};

const iniciaisNome = nome => nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

function showToast(msg) {
  const t = document.getElementById('nx-toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ─── SISTEMA DE TABS ───
function initTabs() {
  document.querySelectorAll('.nx-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      document.querySelectorAll('.nx-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.nx-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(targetId).classList.add('active');
    });
  });
}

// ─── SISTEMA DE SHEETS ───
function openSheet(name) {
  document.getElementById('overlay-' + name).classList.add('open');
  document.getElementById('sheet-' + name).classList.add('open');
}
function closeSheet(name) {
  document.getElementById('overlay-' + name).classList.remove('open');
  document.getElementById('sheet-' + name).classList.remove('open');
}

function initSheets() {
  // Fechar por overlay
  document.querySelectorAll('.nx-overlay').forEach(el => {
    const name = el.id.replace('overlay-', '');
    el.addEventListener('click', () => closeSheet(name));
  });
  // Fechar por botão ✕
  document.querySelectorAll('.nx-sheet-close').forEach(btn => {
    btn.addEventListener('click', () => closeSheet(btn.dataset.sheet));
  });
}

// ─── AUTH ───
let modoAuth = 'login';

window.handleAuthToggle = function () {
  modoAuth = modoAuth === 'login' ? 'cadastro' : 'login';
  document.getElementById('login-error').textContent = '';
  const isCad = modoAuth === 'cadastro';
  document.getElementById('auth-nome').style.display = isCad ? 'block' : 'none';
  document.getElementById('auth-submit-btn').textContent = isCad ? 'Criar Conta' : 'Entrar';
  document.getElementById('auth-toggle-label').textContent = isCad ? 'Fazer login' : 'Cadastre-se';
};

window.handleAuthSubmit = function () {
  document.getElementById('login-error').textContent = '';
  const email = document.getElementById('auth-email').value.trim();
  const senha = document.getElementById('auth-senha').value;
  try {
    if (modoAuth === 'cadastro') {
      const nome = document.getElementById('auth-nome').value.trim();
      if (!nome)            throw new Error('Informe seu nome.');
      if (!email)           throw new Error('Informe o e-mail.');
      if (senha.length < 4) throw new Error('Senha com mínimo 4 caracteres.');
      authManager.cadastrar(nome, email, senha);
      authManager.login(email, senha);
    } else {
      if (!email || !senha) throw new Error('Preencha e-mail e senha.');
      authManager.login(email, senha);
    }
    iniciarApp();
  } catch (e) {
    document.getElementById('login-error').textContent = e.message;
  }
};

// ─── INICIAR APP ───
function iniciarApp() {
  const user = authManager.getUsuarioAtual();
  clientManager  = new ClientManager(user.id);
  serviceManager = new ServiceManager(user.id);
  aptManager     = new AppointmentManager(user.id);

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  initTabs();
  initSheets();
  bindEventos();

  renderAgenda();
  renderClientes();
  renderServicos();
  renderResumo();
}

if (authManager.estaLogado()) iniciarApp();

// ─── BIND DE EVENTOS ───
function bindEventos() {

  // Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    authManager.logout();
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-senha').value = '';
    modoAuth = 'login';
  });

  // Navegação de mês (Agenda)
  document.getElementById('btn-mes-prev').addEventListener('click', () => {
    if (currentMes === 0) { currentMes = 11; currentAno--; } else currentMes--;
    selectedDate = `${currentAno}-${String(currentMes + 1).padStart(2,'0')}-01`;
    renderAgenda();
  });
  document.getElementById('btn-mes-next').addEventListener('click', () => {
    if (currentMes === 11) { currentMes = 0; currentAno++; } else currentMes++;
    selectedDate = `${currentAno}-${String(currentMes + 1).padStart(2,'0')}-01`;
    renderAgenda();
  });

  // FAB: novo agendamento
  document.getElementById('fab-add-apt').addEventListener('click', () => {
    limparFormApt();
    document.getElementById('sheet-apt-title').textContent = 'Novo Agendamento';
    document.getElementById('apt-edit-id').value = '';
    preencherSelectsApt();
    openSheet('apt');
  });

  // Salvar agendamento
  document.getElementById('btn-salvar-apt').addEventListener('click', () => {
    const id         = document.getElementById('apt-edit-id').value;
    const clienteId  = document.getElementById('apt-cliente').value;
    const servicoId  = document.getElementById('apt-servico').value;
    const data       = document.getElementById('apt-data').value;
    const hora       = document.getElementById('apt-hora').value;
    const status     = document.getElementById('apt-status').value;
    const observacao = document.getElementById('apt-obs').value.trim();

    if (!clienteId) { showToast('Selecione um cliente.'); return; }
    if (!servicoId) { showToast('Selecione um serviço.'); return; }
    if (!data)      { showToast('Informe a data.'); return; }
    if (!hora)      { showToast('Informe o horário.'); return; }

    try {
      if (id) {
        aptManager.atualizar(id, { clienteId, servicoId, data, hora, status, observacao });
        showToast('Agendamento atualizado!');
      } else {
        aptManager.adicionar({ clienteId, servicoId, data, hora, status, observacao });
        showToast('Agendamento criado!');
      }
      closeSheet('apt');
      selectedDate = data;
      const d = new Date(data + 'T00:00:00');
      currentMes = d.getMonth();
      currentAno = d.getFullYear();
      renderAgenda();
      renderResumo();
    } catch (e) { showToast(e.message); }
  });

  // Add cliente
  document.getElementById('btn-add-cliente').addEventListener('click', () => {
    limparFormCliente();
    document.getElementById('sheet-cli-title').textContent = 'Novo Cliente';
    document.getElementById('cli-edit-id').value = '';
    openSheet('cliente');
  });

  // Câmera / Galeria
  document.getElementById('btn-camera').addEventListener('click', () => {
    const input = document.getElementById('foto-file-input');
    input.setAttribute('capture', 'user');
    input.click();
  });
  document.getElementById('btn-galeria').addEventListener('click', () => {
    const input = document.getElementById('foto-file-input');
    input.removeAttribute('capture');
    input.click();
  });
  document.getElementById('foto-file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      fotoTemp = ev.target.result;
      document.getElementById('foto-img').src = fotoTemp;
      document.getElementById('foto-img').style.display = 'block';
      document.getElementById('foto-placeholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  // Salvar cliente
  document.getElementById('btn-salvar-cliente').addEventListener('click', () => {
    const id       = document.getElementById('cli-edit-id').value;
    const nome     = document.getElementById('cli-nome').value.trim();
    const telefone = document.getElementById('cli-telefone').value.trim();
    const email    = document.getElementById('cli-email').value.trim();
    if (!nome) { showToast('Informe o nome do cliente.'); return; }
    try {
      if (id) {
        const dados = { nome, telefone, email };
        if (fotoTemp) dados.foto = fotoTemp;
        clientManager.atualizar(id, dados);
        showToast('Cliente atualizado!');
      } else {
        clientManager.adicionar({ nome, telefone, email, foto: fotoTemp });
        showToast('Cliente cadastrado!');
      }
      closeSheet('cliente');
      renderClientes();
    } catch (e) { showToast(e.message); }
  });

  // Add serviço
  document.getElementById('btn-add-servico').addEventListener('click', () => {
    limparFormServico();
    document.getElementById('sheet-svc-title').textContent = 'Novo Serviço';
    document.getElementById('svc-edit-id').value = '';
    openSheet('servico');
  });

  // Salvar serviço
  document.getElementById('btn-salvar-servico').addEventListener('click', () => {
    const id      = document.getElementById('svc-edit-id').value;
    const nome    = document.getElementById('svc-nome').value.trim();
    const preco   = document.getElementById('svc-preco').value;
    const duracao = document.getElementById('svc-duracao').value;
    const desc    = document.getElementById('svc-desc').value.trim();
    if (!nome)    { showToast('Informe o nome do serviço.'); return; }
    if (!preco)   { showToast('Informe o preço.'); return; }
    if (!duracao) { showToast('Informe a duração.'); return; }
    try {
      if (id) {
        serviceManager.atualizar(id, { nome, preco, duracao, descricao: desc });
        showToast('Serviço atualizado!');
      } else {
        serviceManager.adicionar({ nome, preco, duracao, descricao: desc });
        showToast('Serviço cadastrado!');
      }
      closeSheet('servico');
      renderServicos();
    } catch (e) { showToast(e.message); }
  });

  // Exportação
  bindExport();

  // Navegação de mês (Resumo)
  document.getElementById('btn-res-prev').addEventListener('click', () => {
    if (resMes === 0) { resMes = 11; resAno--; } else resMes--;
    renderResumo();
  });
  document.getElementById('btn-res-next').addEventListener('click', () => {
    if (resMes === 11) { resMes = 0; resAno++; } else resMes++;
    renderResumo();
  });
}

// ─── HELPERS FORMULÁRIOS ───
function limparFormApt() {
  ['apt-cliente','apt-servico','apt-data','apt-hora','apt-obs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('apt-status').value = 'pendente';
  document.getElementById('apt-edit-id').value = '';
}

function limparFormCliente() {
  fotoTemp = null;
  ['cli-nome','cli-telefone','cli-email'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('foto-img').style.display = 'none';
  document.getElementById('foto-placeholder').style.display = 'block';
  document.getElementById('foto-img').src = '';
}

function limparFormServico() {
  ['svc-nome','svc-preco','svc-duracao','svc-desc'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function preencherSelectsApt() {
  const selCli = document.getElementById('apt-cliente');
  const selSvc = document.getElementById('apt-servico');
  const clientes = clientManager.listar();
  const servicos = serviceManager.listar();

  selCli.innerHTML = '<option value="">Selecione um cliente</option>';
  clientes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nome;
    selCli.appendChild(opt);
  });

  selSvc.innerHTML = '<option value="">Selecione um serviço</option>';
  servicos.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.nome} — ${fmt.moeda(s.preco)}`;
    selSvc.appendChild(opt);
  });
}

// ─── RENDER: AGENDA ───
function renderAgenda() {
  document.getElementById('mes-label').textContent = fmt.mesAno(currentMes, currentAno);

  const totalDias = fmt.diasNoMes(currentMes, currentAno);
  const strip = document.getElementById('days-strip');
  strip.innerHTML = '';

  const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  for (let d = 1; d <= totalDias; d++) {
    const dateStr = `${currentAno}-${String(currentMes + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dt = new Date(dateStr + 'T00:00:00');
    const apts = aptManager.listar({ data: dateStr });

    const chip = document.createElement('div');
    chip.className = 'day-chip' + (dateStr === selectedDate ? ' active' : '');
    chip.innerHTML = `<span style="font-size:10px;">${DIAS[dt.getDay()]}</span><span class="day-num">${d}</span>${apts.length ? '<span class="day-dot"></span>' : ''}`;
    chip.addEventListener('click', () => {
      selectedDate = dateStr;
      renderAgenda();
      // Scroll para o chip
      chip.scrollIntoView({ inline: 'center', behavior: 'smooth' });
    });
    strip.appendChild(chip);
  }

  // Scroll automático para dia selecionado
  setTimeout(() => {
    const active = strip.querySelector('.day-chip.active');
    if (active) active.scrollIntoView({ inline: 'center', behavior: 'auto' });
  }, 50);

  // Hero
  const apts = aptManager.listar({ data: selectedDate });
  const dt = new Date(selectedDate + 'T00:00:00');
  const isHoje = selectedDate === hoje.toISOString().split('T')[0];
  document.getElementById('hero-label').textContent = isHoje ? 'Hoje' : fmt.dataExibicao(selectedDate);
  document.getElementById('hero-count').textContent = `${apts.length} agendamento${apts.length !== 1 ? 's' : ''}`;

  const receita = apts
    .filter(a => a.status === 'concluido')
    .reduce((acc, a) => {
      const svc = serviceManager.buscarPorId(a.servicoId);
      return acc + (svc ? svc.preco : 0);
    }, 0);
  document.getElementById('hero-receita').textContent = receita > 0 ? `Receita: ${fmt.moeda(receita)}` : '—';

  // Lista
  const lista = document.getElementById('lista-agenda');
  const empty = document.getElementById('empty-agenda');
  lista.innerHTML = '';

  if (apts.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  apts.forEach(apt => {
    const cliente = clientManager.buscarPorId(apt.clienteId);
    const servico = serviceManager.buscarPorId(apt.servicoId);
    const status  = STATUS_LIST.find(s => s.id === apt.status) || STATUS_LIST[0];

    const card = document.createElement('div');
    card.className = 'apt-card';
    card.innerHTML = `
      <div class="apt-hora">${apt.hora}</div>
      <div class="apt-info">
        <div class="apt-cliente">${cliente ? cliente.nome : '—'}</div>
        <div class="apt-servico">${servico ? servico.nome + ' · ' + fmt.moeda(servico.preco) : '—'}</div>
        <span class="status-badge status-${apt.status}">${status.icon} ${status.label}</span>
        <div class="apt-actions">
          ${STATUS_LIST.map(s => s.id !== apt.status
            ? `<button class="apt-action-btn" data-id="${apt.id}" data-status="${s.id}">${s.icon} ${s.label}</button>`
            : '').join('')}
          <button class="apt-action-btn accent" data-edit="${apt.id}">✏️ Editar</button>
          <button class="apt-action-btn danger" data-del="${apt.id}">🗑️ Remover</button>
        </div>
      </div>
    `;
    lista.appendChild(card);
  });

  // Eventos dos botões dos cards
  lista.querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      aptManager.atualizarStatus(btn.dataset.id, btn.dataset.status);
      renderAgenda();
      renderResumo();
    });
  });
  lista.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => abrirEdicaoApt(btn.dataset.edit));
  });
  lista.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Remover agendamento?')) return;
      aptManager.remover(btn.dataset.del);
      renderAgenda();
      renderResumo();
    });
  });
}

function abrirEdicaoApt(id) {
  const apt = aptManager.buscarPorId(id);
  if (!apt) return;
  document.getElementById('sheet-apt-title').textContent = 'Editar Agendamento';
  document.getElementById('apt-edit-id').value  = apt.id;
  preencherSelectsApt();
  setTimeout(() => {
    document.getElementById('apt-cliente').value = apt.clienteId;
    document.getElementById('apt-servico').value = apt.servicoId;
    document.getElementById('apt-data').value    = apt.data;
    document.getElementById('apt-hora').value    = apt.hora;
    document.getElementById('apt-status').value  = apt.status;
    document.getElementById('apt-obs').value     = apt.observacao || '';
  }, 10);
  openSheet('apt');
}

// ─── RENDER: CLIENTES ───
function renderClientes() {
  const clientes = clientManager.listar();
  const ul    = document.getElementById('lista-clientes-ul');
  const empty = document.getElementById('empty-clientes');
  ul.innerHTML = '';

  if (clientes.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  clientes.forEach(c => {
    const fotoHtml = c.foto
      ? `<div class="nx-avatar"><img src="${c.foto}" /></div>`
      : `<div class="nx-avatar">${iniciaisNome(c.nome)}</div>`;

    const li = document.createElement('li');
    li.className = 'nx-list-item';
    li.innerHTML = `
      ${fotoHtml}
      <div class="nx-list-item-info">
        <div class="nx-list-item-name">${c.nome}</div>
        <div class="nx-list-item-sub">${c.telefone || c.email || 'Sem contato'}</div>
      </div>
      <div class="nx-list-item-actions">
        <button class="nx-action-btn edit" data-id="${c.id}">Editar</button>
        <button class="nx-action-btn del"  data-id="${c.id}">Remover</button>
      </div>
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll('.edit').forEach(btn => {
    btn.addEventListener('click', () => abrirEdicaoCliente(btn.dataset.id));
  });
  ul.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Remover cliente?')) return;
      clientManager.remover(btn.dataset.id);
      renderClientes();
    });
  });
}

function abrirEdicaoCliente(id) {
  const c = clientManager.buscarPorId(id);
  if (!c) return;
  fotoTemp = null;
  document.getElementById('sheet-cli-title').textContent = 'Editar Cliente';
  document.getElementById('cli-edit-id').value   = c.id;
  document.getElementById('cli-nome').value      = c.nome;
  document.getElementById('cli-telefone').value  = c.telefone || '';
  document.getElementById('cli-email').value     = c.email    || '';
  if (c.foto) {
    document.getElementById('foto-img').src = c.foto;
    document.getElementById('foto-img').style.display = 'block';
    document.getElementById('foto-placeholder').style.display = 'none';
  } else {
    document.getElementById('foto-img').style.display = 'none';
    document.getElementById('foto-placeholder').style.display = 'block';
  }
  openSheet('cliente');
}

// ─── RENDER: SERVIÇOS ───
function renderServicos() {
  const servicos = serviceManager.listar();
  const ul    = document.getElementById('lista-servicos-ul');
  const empty = document.getElementById('empty-servicos');
  ul.innerHTML = '';

  if (servicos.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  servicos.forEach(s => {
    const li = document.createElement('li');
    li.className = 'nx-list-item';
    li.innerHTML = `
      <div class="nx-svc-icon">✂️</div>
      <div class="nx-list-item-info">
        <div class="nx-list-item-name">${s.nome}</div>
        <div class="nx-list-item-sub">${s.duracao} min${s.descricao ? ' · ' + s.descricao : ''}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <span class="nx-list-item-after">${fmt.moeda(s.preco)}</span>
        <div class="nx-list-item-actions">
          <button class="nx-action-btn edit" data-id="${s.id}">Editar</button>
          <button class="nx-action-btn del"  data-id="${s.id}">Remover</button>
        </div>
      </div>
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll('.edit').forEach(btn => {
    btn.addEventListener('click', () => abrirEdicaoServico(btn.dataset.id));
  });
  ul.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Remover serviço?')) return;
      serviceManager.remover(btn.dataset.id);
      renderServicos();
    });
  });
}

function abrirEdicaoServico(id) {
  const s = serviceManager.buscarPorId(id);
  if (!s) return;
  document.getElementById('sheet-svc-title').textContent = 'Editar Serviço';
  document.getElementById('svc-edit-id').value  = s.id;
  document.getElementById('svc-nome').value     = s.nome;
  document.getElementById('svc-preco').value    = s.preco;
  document.getElementById('svc-duracao').value  = s.duracao;
  document.getElementById('svc-desc').value     = s.descricao || '';
  openSheet('servico');
}

// ─── RENDER: DASHBOARD ───
function renderResumo() {
  document.getElementById('res-mes-label').textContent = fmt.mesAno(resMes, resAno);

  const apts     = aptManager.listarPorMes(resMes, resAno);
  const contagem = aptManager.contagemPorStatus(resMes, resAno);
  const total    = apts.length;
  const concluidos = contagem.concluido || 0;

  // ── Hero ──
  const receitaRealizada = apts
    .filter(a => a.status === 'concluido')
    .reduce((acc, a) => { const s = serviceManager.buscarPorId(a.servicoId); return acc + (s ? s.preco : 0); }, 0);

  document.getElementById('res-receita').textContent    = fmt.moeda(receitaRealizada);
  document.getElementById('res-concluidos').textContent = `${concluidos} serviço${concluidos !== 1 ? 's' : ''} concluído${concluidos !== 1 ? 's' : ''}`;

  const taxa = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  document.getElementById('res-taxa').textContent = taxa + '%';
  document.getElementById('res-barra-conclusao').style.width = taxa + '%';

  // ── Stats ──
  document.getElementById('res-total').textContent       = total;
  document.getElementById('res-concluidos-n').textContent = concluidos;
  document.getElementById('res-pendentes').textContent    = contagem.pendente   || 0;
  document.getElementById('res-cancelados').textContent   = contagem.cancelado  || 0;

  // ── Balanço financeiro ──
  const receitaPotencial = apts
    .filter(a => a.status !== 'cancelado')
    .reduce((acc, a) => { const s = serviceManager.buscarPorId(a.servicoId); return acc + (s ? s.preco : 0); }, 0);
  const receitaPerdida = apts
    .filter(a => a.status === 'cancelado')
    .reduce((acc, a) => { const s = serviceManager.buscarPorId(a.servicoId); return acc + (s ? s.preco : 0); }, 0);
  const receitaAberto = apts
    .filter(a => a.status === 'pendente' || a.status === 'confirmado')
    .reduce((acc, a) => { const s = serviceManager.buscarPorId(a.servicoId); return acc + (s ? s.preco : 0); }, 0);

  document.getElementById('bal-realizada').textContent = fmt.moeda(receitaRealizada);
  document.getElementById('bal-potencial').textContent = fmt.moeda(receitaPotencial);
  document.getElementById('bal-perdida').textContent   = fmt.moeda(receitaPerdida);
  document.getElementById('bal-aberto').textContent    = fmt.moeda(receitaAberto);

  // Barra financeira proporcional
  const totalFin = receitaRealizada + receitaPerdida + receitaAberto;
  const barFin = document.getElementById('bar-financeira');
  barFin.innerHTML = '';
  if (totalFin > 0) {
    const segments = [
      { val: receitaRealizada, color: 'var(--nx-green)' },
      { val: receitaAberto,    color: 'var(--nx-yellow)' },
      { val: receitaPerdida,   color: 'var(--nx-red)' },
    ];
    segments.forEach(seg => {
      if (seg.val <= 0) return;
      const pct = (seg.val / totalFin * 100).toFixed(1);
      const el = document.createElement('div');
      el.style.cssText = `flex:0 0 ${pct}%;height:100%;background:${seg.color};border-radius:99px;`;
      barFin.appendChild(el);
    });
  }

  // ── Gráfico: agendamentos por dia da semana ──
  const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const porDia = [0,0,0,0,0,0,0];
  apts.forEach(a => {
    const d = new Date(a.data + 'T00:00:00');
    porDia[d.getDay()]++;
  });
  const maxDia = Math.max(...porDia, 1);
  const chartEl = document.getElementById('chart-semana');
  chartEl.innerHTML = '';
  porDia.forEach((qtd, i) => {
    const pct = Math.max((qtd / maxDia) * 100, qtd > 0 ? 8 : 0);
    const col = document.createElement('div');
    col.className = 'bar-col';
    col.innerHTML = `
      <div class="bar-val">${qtd > 0 ? qtd : ''}</div>
      <div class="bar-fill-wrap">
        <div class="bar-fill ${qtd > 0 ? 'has-data' : ''}" style="height:${pct}%;"></div>
      </div>
      <div class="bar-day">${DIAS_SEMANA[i]}</div>
    `;
    chartEl.appendChild(col);
  });

  // ── Ranking: serviços mais realizados ──
  const rankSvcEl = document.getElementById('ranking-servicos');
  const contagemSvc = {};
  const receitaSvc  = {};
  apts.filter(a => a.status === 'concluido').forEach(a => {
    const s = serviceManager.buscarPorId(a.servicoId);
    if (!s) return;
    contagemSvc[s.id] = (contagemSvc[s.id] || 0) + 1;
    receitaSvc[s.id]  = (receitaSvc[s.id]  || 0) + s.preco;
  });
  const rankSvc = Object.entries(contagemSvc)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  rankSvcEl.innerHTML = '';
  if (rankSvc.length === 0) {
    rankSvcEl.innerHTML = '<div class="empty-state" style="padding:16px 0;"><div class="emoji" style="font-size:28px;">✂️</div><p>Nenhum serviço concluído ainda.</p></div>';
  } else {
    const maxSvc = rankSvc[0][1];
    rankSvc.forEach(([id, qtd], i) => {
      const s = serviceManager.buscarPorId(id);
      if (!s) return;
      const posClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      const pct = (qtd / maxSvc * 100).toFixed(0);
      const item = document.createElement('div');
      item.className = 'rank-item';
      item.innerHTML = `
        <div class="rank-pos ${posClass}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</div>
        <div class="rank-info">
          <div class="rank-name">${s.nome}</div>
          <div class="rank-bar-wrap"><div class="rank-bar" style="width:${pct}%;"></div></div>
          <div class="rank-sub">${fmt.moeda(receitaSvc[id])} gerado</div>
        </div>
        <div class="rank-right">
          <div class="rank-count">${qtd}</div>
          <div class="rank-count-label">vezes</div>
        </div>
      `;
      rankSvcEl.appendChild(item);
    });
  }

  // ── Ranking: clientes mais frequentes ──
  const rankCliEl = document.getElementById('ranking-clientes');
  const contagemCli = {};
  apts.forEach(a => {
    contagemCli[a.clienteId] = (contagemCli[a.clienteId] || 0) + 1;
  });
  const rankCli = Object.entries(contagemCli)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  rankCliEl.innerHTML = '';
  if (rankCli.length === 0) {
    rankCliEl.innerHTML = '<div class="empty-state" style="padding:16px 0;"><div class="emoji" style="font-size:28px;">👤</div><p>Sem agendamentos no mês.</p></div>';
  } else {
    const maxCli = rankCli[0][1];
    rankCli.forEach(([id, qtd], i) => {
      const c = clientManager.buscarPorId(id);
      if (!c) return;
      const posClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      const pct = (qtd / maxCli * 100).toFixed(0);
      const iniciais = iniciaisNome(c.nome);
      const fotoHtml = c.foto
        ? `<div class="nx-avatar" style="width:36px;height:36px;font-size:12px;"><img src="${c.foto}" /></div>`
        : `<div class="nx-avatar" style="width:36px;height:36px;font-size:12px;">${iniciais}</div>`;
      const item = document.createElement('div');
      item.className = 'rank-item';
      item.innerHTML = `
        <div class="rank-pos ${posClass}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</div>
        ${fotoHtml}
        <div class="rank-info">
          <div class="rank-name">${c.nome}</div>
          <div class="rank-bar-wrap"><div class="rank-bar" style="width:${pct}%;"></div></div>
          <div class="rank-sub">${c.telefone || c.email || 'Sem contato'}</div>
        </div>
        <div class="rank-right">
          <div class="rank-count">${qtd}</div>
          <div class="rank-count-label">agend.</div>
        </div>
      `;
      rankCliEl.appendChild(item);
    });
  }

  // ── Lista completa de agendamentos ──
  const listaEl = document.getElementById('lista-resumo-apts');
  const emptyEl = document.getElementById('empty-resumo');
  listaEl.innerHTML = '';

  if (apts.length === 0) { emptyEl.style.display = 'block'; return; }
  emptyEl.style.display = 'none';

  const porData = {};
  apts.forEach(a => { if (!porData[a.data]) porData[a.data] = []; porData[a.data].push(a); });

  Object.entries(porData).sort(([a],[b]) => a.localeCompare(b)).forEach(([data, lista]) => {
    const header = document.createElement('div');
    header.className = 'section-title';
    header.textContent = fmt.dataExibicao(data);
    listaEl.appendChild(header);

    lista.forEach(apt => {
      const cliente = clientManager.buscarPorId(apt.clienteId);
      const servico = serviceManager.buscarPorId(apt.servicoId);
      const status  = STATUS_LIST.find(s => s.id === apt.status) || STATUS_LIST[0];

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--nx-border);';
      row.innerHTML = `
        <div>
          <div style="font-weight:600;font-size:14px;">${apt.hora} — ${cliente ? cliente.nome : '—'}</div>
          <div style="font-size:12px;color:var(--nx-muted);">${servico ? servico.nome : '—'}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
          <span class="status-badge status-${apt.status}">${status.icon} ${status.label}</span>
          ${servico ? `<span style="font-size:12px;color:var(--nx-accent);font-weight:700;">${fmt.moeda(servico.preco)}</span>` : ''}
        </div>
      `;
      listaEl.appendChild(row);
    });
  });
}

// ═══════════════════════════════════════════
// EXPORTAÇÃO: CSV
// ═══════════════════════════════════════════
function exportarCSV() {
  const apts = aptManager.listarPorMes(resMes, resAno);
  if (apts.length === 0) { showToast('Sem dados para exportar.'); return; }

  const mesStr = fmt.mesAno(resMes, resAno).replace(' ', '_');

  // ── Aba 1: Agendamentos ──
  const linhasApts = [
    ['Data', 'Hora', 'Cliente', 'Telefone', 'Serviço', 'Preço (R$)', 'Duração (min)', 'Status', 'Observação']
  ];
  apts.forEach(a => {
    const c = clientManager.buscarPorId(a.clienteId);
    const s = serviceManager.buscarPorId(a.servicoId);
    linhasApts.push([
      a.data,
      a.hora,
      c ? c.nome : '—',
      c ? (c.telefone || '') : '',
      s ? s.nome : '—',
      s ? s.preco.toFixed(2).replace('.', ',') : '0,00',
      s ? s.duracao : '',
      a.status,
      a.observacao || ''
    ]);
  });

  // ── Aba 2: Resumo financeiro ──
  const concluidos  = apts.filter(a => a.status === 'concluido');
  const cancelados  = apts.filter(a => a.status === 'cancelado');
  const emAberto    = apts.filter(a => a.status === 'pendente' || a.status === 'confirmado');

  const somaPreco = lista => lista.reduce((acc, a) => {
    const s = serviceManager.buscarPorId(a.servicoId);
    return acc + (s ? s.preco : 0);
  }, 0);

  const receitaRealizada = somaPreco(concluidos);
  const receitaPerdida   = somaPreco(cancelados);
  const receitaAberto    = somaPreco(emAberto);
  const taxa = apts.length > 0 ? ((concluidos.length / apts.length) * 100).toFixed(1) : '0.0';

  const linhasResumo = [
    ['Indicador', 'Valor'],
    ['Mês de referência', fmt.mesAno(resMes, resAno)],
    ['Total de agendamentos', apts.length],
    ['Concluídos', concluidos.length],
    ['Pendentes', apts.filter(a => a.status === 'pendente').length],
    ['Confirmados', apts.filter(a => a.status === 'confirmado').length],
    ['Cancelados', cancelados.length],
    ['Taxa de conclusão (%)', taxa],
    ['Receita realizada (R$)', receitaRealizada.toFixed(2).replace('.', ',')],
    ['Receita em aberto (R$)', receitaAberto.toFixed(2).replace('.', ',')],
    ['Receita perdida (R$)', receitaPerdida.toFixed(2).replace('.', ',')],
  ];

  // ── Aba 3: Ranking serviços ──
  const contagemSvc = {};
  const receitaSvc  = {};
  concluidos.forEach(a => {
    const s = serviceManager.buscarPorId(a.servicoId);
    if (!s) return;
    contagemSvc[s.id] = (contagemSvc[s.id] || 0) + 1;
    receitaSvc[s.id]  = (receitaSvc[s.id]  || 0) + s.preco;
  });
  const linhasRankSvc = [['Posição', 'Serviço', 'Qtd Realizados', 'Receita (R$)']];
  Object.entries(contagemSvc)
    .sort((a, b) => b[1] - a[1])
    .forEach(([id, qtd], i) => {
      const s = serviceManager.buscarPorId(id);
      if (!s) return;
      linhasRankSvc.push([i + 1, s.nome, qtd, receitaSvc[id].toFixed(2).replace('.', ',')]);
    });

  // ── Aba 4: Ranking clientes ──
  const contagemCli = {};
  apts.forEach(a => { contagemCli[a.clienteId] = (contagemCli[a.clienteId] || 0) + 1; });
  const linhasRankCli = [['Posição', 'Cliente', 'Telefone', 'Qtd Agendamentos']];
  Object.entries(contagemCli)
    .sort((a, b) => b[1] - a[1])
    .forEach(([id, qtd], i) => {
      const c = clientManager.buscarPorId(id);
      if (!c) return;
      linhasRankCli.push([i + 1, c.nome, c.telefone || '', qtd]);
    });

  // Montar CSV multi-seção (único arquivo)
  const csvLinhas = (linhas) => linhas.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')
  ).join('\r\n');

  const csv = [
    '=== RESUMO FINANCEIRO ===',
    csvLinhas(linhasResumo),
    '',
    '=== AGENDAMENTOS DO MÊS ===',
    csvLinhas(linhasApts),
    '',
    '=== RANKING DE SERVIÇOS ===',
    csvLinhas(linhasRankSvc),
    '',
    '=== RANKING DE CLIENTES ===',
    csvLinhas(linhasRankCli),
  ].join('\r\n');

  const bom = '\uFEFF'; // BOM para Excel reconhecer UTF-8
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `Nextime_${mesStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exportado!');
}

// ═══════════════════════════════════════════
// EXPORTAÇÃO: PDF
// ═══════════════════════════════════════════
function exportarPDF() {
  if (typeof window.jspdf === 'undefined') {
    showToast('Aguarde o carregamento do PDF...');
    return;
  }

  const apts = aptManager.listarPorMes(resMes, resAno);
  if (apts.length === 0) { showToast('Sem dados para exportar.'); return; }

  showToast('Gerando PDF...');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const VERDE   = [0, 180, 140];
  const ESCURO  = [15, 20, 25];
  const CINZA   = [100, 120, 140];
  const BRANCO  = [255, 255, 255];
  const mesStr  = fmt.mesAno(resMes, resAno);
  const W       = doc.internal.pageSize.getWidth();

  // ── Cabeçalho ──
  doc.setFillColor(...ESCURO);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(...VERDE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('nextime', 14, 12);
  doc.setTextColor(...BRANCO);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Dashboard — ' + mesStr, 14, 20);
  doc.setTextColor(...CINZA);
  doc.setFontSize(8);
  doc.text('Gerado em ' + new Date().toLocaleDateString('pt-BR'), W - 14, 20, { align: 'right' });

  let y = 36;

  // ── Calcular dados ──
  const concluidos = apts.filter(a => a.status === 'concluido');
  const cancelados = apts.filter(a => a.status === 'cancelado');
  const pendentes  = apts.filter(a => a.status === 'pendente');
  const confirmados= apts.filter(a => a.status === 'confirmado');

  const somaPreco = lista => lista.reduce((acc, a) => {
    const s = serviceManager.buscarPorId(a.servicoId);
    return acc + (s ? s.preco : 0);
  }, 0);

  const receitaRealizada = somaPreco(concluidos);
  const receitaPerdida   = somaPreco(cancelados);
  const receitaAberto    = somaPreco(pendentes) + somaPreco(confirmados);
  const taxa = apts.length > 0 ? ((concluidos.length / apts.length) * 100).toFixed(1) : '0.0';

  // ── Seção: KPIs ──
  const kpis = [
    { label: 'Receita Realizada', valor: fmt.moeda(receitaRealizada), cor: VERDE },
    { label: 'Em Aberto',         valor: fmt.moeda(receitaAberto),    cor: [59, 130, 246] },
    { label: 'Receita Perdida',   valor: fmt.moeda(receitaPerdida),   cor: [255, 77, 109] },
    { label: 'Taxa de Conclusão', valor: taxa + '%',                  cor: VERDE },
  ];

  const kpiW = (W - 28 - 9) / 4;
  kpis.forEach((k, i) => {
    const x = 14 + i * (kpiW + 3);
    doc.setFillColor(23, 30, 39);
    doc.roundedRect(x, y, kpiW, 22, 2, 2, 'F');
    doc.setTextColor(...k.cor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    // quebrar texto longo
    const valLines = doc.splitTextToSize(k.valor, kpiW - 4);
    doc.text(valLines[0], x + kpiW / 2, y + 10, { align: 'center' });
    doc.setTextColor(...CINZA);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(k.label, x + kpiW / 2, y + 17, { align: 'center' });
  });
  y += 30;

  // ── Seção: Agendamentos ──
  doc.setTextColor(...CINZA);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('AGENDAMENTOS DO MÊS', 14, y);
  y += 4;

  doc.autoTable({
    startY: y,
    head: [['Data', 'Hora', 'Cliente', 'Serviço', 'Preço', 'Status']],
    body: apts.map(a => {
      const c = clientManager.buscarPorId(a.clienteId);
      const s = serviceManager.buscarPorId(a.servicoId);
      const statusLabel = { pendente: 'Pendente', confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado' };
      return [
        a.data.split('-').reverse().join('/'),
        a.hora,
        c ? c.nome : '—',
        s ? s.nome : '—',
        s ? fmt.moeda(s.preco) : '—',
        statusLabel[a.status] || a.status,
      ];
    }),
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [200, 210, 220],
      fillColor: [15, 20, 25],
      lineColor: [37, 48, 64],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [23, 30, 39],
      textColor: VERDE,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [20, 27, 36] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 14 },
      4: { cellWidth: 24 },
      5: { cellWidth: 22 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Rodapé em cada página
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFillColor(...ESCURO);
      doc.rect(0, pageH - 10, W, 10, 'F');
      doc.setTextColor(...CINZA);
      doc.setFontSize(7);
      doc.text(`Nextime · ${mesStr} · Página ${data.pageNumber}`, W / 2, pageH - 3, { align: 'center' });
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Seção: Ranking Serviços ──
  const contagemSvc = {};
  const receitaSvc  = {};
  concluidos.forEach(a => {
    const s = serviceManager.buscarPorId(a.servicoId);
    if (!s) return;
    contagemSvc[s.id] = (contagemSvc[s.id] || 0) + 1;
    receitaSvc[s.id]  = (receitaSvc[s.id]  || 0) + s.preco;
  });
  const rankSvc = Object.entries(contagemSvc).sort((a, b) => b[1] - a[1]).slice(0, 10);

  if (rankSvc.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setTextColor(...CINZA);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SERVIÇOS MAIS REALIZADOS', 14, y);
    y += 4;

    doc.autoTable({
      startY: y,
      head: [['#', 'Serviço', 'Qtd Realizados', 'Receita Gerada']],
      body: rankSvc.map(([id, qtd], i) => {
        const s = serviceManager.buscarPorId(id);
        return [i + 1, s ? s.nome : '—', qtd, fmt.moeda(receitaSvc[id] || 0)];
      }),
      styles: { fontSize: 8, cellPadding: 2.5, textColor: [200, 210, 220], fillColor: [15, 20, 25], lineColor: [37, 48, 64], lineWidth: 0.2 },
      headStyles: { fillColor: [23, 30, 39], textColor: VERDE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [20, 27, 36] },
      columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 30 }, 3: { cellWidth: 36 } },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ── Seção: Ranking Clientes ──
  const contagemCli = {};
  apts.forEach(a => { contagemCli[a.clienteId] = (contagemCli[a.clienteId] || 0) + 1; });
  const rankCli = Object.entries(contagemCli).sort((a, b) => b[1] - a[1]).slice(0, 10);

  if (rankCli.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setTextColor(...CINZA);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CLIENTES MAIS FREQUENTES', 14, y);
    y += 4;

    doc.autoTable({
      startY: y,
      head: [['#', 'Cliente', 'Telefone', 'Agendamentos']],
      body: rankCli.map(([id, qtd], i) => {
        const c = clientManager.buscarPorId(id);
        return [i + 1, c ? c.nome : '—', c ? (c.telefone || '—') : '—', qtd];
      }),
      styles: { fontSize: 8, cellPadding: 2.5, textColor: [200, 210, 220], fillColor: [15, 20, 25], lineColor: [37, 48, 64], lineWidth: 0.2 },
      headStyles: { fillColor: [23, 30, 39], textColor: VERDE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [20, 27, 36] },
      columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 36 }, 3: { cellWidth: 30 } },
      margin: { left: 14, right: 14 },
    });
  }

  // Salvar
  const mesArq = fmt.mesAno(resMes, resAno).replace(' ', '_');
  doc.save(`Nextime_${mesArq}.pdf`);
  showToast('PDF exportado!');
}

// ── Bind dos botões de exportação (chamado dentro de bindEventos) ──
function bindExport() {
  document.getElementById('btn-export-csv').addEventListener('click', exportarCSV);
  document.getElementById('btn-export-pdf').addEventListener('click', exportarPDF);
}

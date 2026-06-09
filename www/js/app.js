// ── Ícone dinâmico por nome do serviço ──
function _iconePorServico(nome) {
  const n = (nome || '').toLowerCase();
  if (n.includes('cabelo') || n.includes('corte') || n.includes('barba') || n.includes('barbearia')) return '💈';
  if (n.includes('musculação') || n.includes('academia') || n.includes('treino') || n.includes('personal')) return '🏋️';
  if (n.includes('unhas') || n.includes('manicure') || n.includes('pedicure')) return '💅';
  if (n.includes('massage') || n.includes('massagem')) return '💆';
  if (n.includes('estetica') || n.includes('estética') || n.includes('skincare') || n.includes('facial')) return '✨';
  if (n.includes('maquiagem') || n.includes('makeup')) return '💄';
  if (n.includes('yoga') || n.includes('pilates')) return '🧘';
  if (n.includes('dentist') || n.includes('odonto')) return '🦷';
  if (n.includes('consult') || n.includes('médico') || n.includes('medico')) return '🩺';
  if (n.includes('aula') || n.includes('curso') || n.includes('ensino')) return '📚';
  if (n.includes('limpeza') || n.includes('faxina')) return '🧹';
  if (n.includes('pet') || n.includes('cão') || n.includes('gato') || n.includes('banho')) return '🐾';
  return '⚡';
}

const authManager = new AuthManager();
const aptManager  = new AppointmentManager();
const chatManager = new ChatManager();
let svcManager    = null; // instanciado após login do prestador

const hoje = new Date();
let currentMes   = hoje.getMonth();
let currentAno   = hoje.getFullYear();
let selectedDate = hoje.toISOString().split('T')[0];
let resMes = hoje.getMonth();
let resAno = hoje.getFullYear();

let currentUser    = null;
let currentChatApt = null; // agendamento aberto no chat
let fotoTemp       = null; // base64 temporário da foto capturada


// HELPERS

const fmt = {
  moeda: v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
  mesAno: (m, a) => {
    const n = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${n[m]} ${a}`;
  },
  dataExibicao: d => new Date(d+'T00:00:00').toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short' }),
  horaMin: iso => { const d = new Date(iso); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; },
  diasNoMes: (m,a) => new Date(a, m+1, 0).getDate(),
};

const iniciaisNome = n => n.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase();

function showToast(msg) {
  const t = document.getElementById('nx-toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// Avatar: usa ApiDiceBear do api-service.js
function avatarHtml(user, cls='') {
  if (user && user.foto) {
    return `<div class="avatar ${cls}"><img src="${user.foto}" alt="${user.nome}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/></div>`;
  }
  const url = ApiDiceBear.avatarUrl(user ? user.nome : 'U');
  return `<div class="avatar ${cls}"><img src="${url}" alt="${user ? user.nome : '?'}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/></div>`;
}

function statusBadge(status) {
  const s = STATUS_LIST.find(x => x.id === status) || STATUS_LIST[0];
  return `<span class="status-badge status-${status}">${s.icon} ${s.label}</span>`;
}


// SISTEMA DE SHEETS

function openSheet(name) {
  document.getElementById('overlay-'+name).classList.add('open');
  document.getElementById('sheet-'+name).classList.add('open');
}
function closeSheet(name) {
  document.getElementById('overlay-'+name).classList.remove('open');
  document.getElementById('sheet-'+name).classList.remove('open');
}


// SISTEMA DE TABS

function initTabs(barId) {
  const bar = document.getElementById(barId);
  if (bar.dataset.initialized) return;
  bar.dataset.initialized = 'true';
  bar.querySelectorAll('.nx-tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.nx-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      document.querySelectorAll('.nx-tab').forEach(t => t.classList.remove('active'));
      if (tabId) document.getElementById(tabId).classList.add('active');
      if (tabId === 'tab-chats-p')   renderChatsPrestador();
      if (tabId === 'tab-chats-c')   renderChatsCliente();
      if (tabId === 'tab-meus-apts') renderMeusAgendamentos();
      if (tabId === 'tab-explorar')  renderPrestadores();
      if (tabId === 'tab-resumo-p')  renderResumo();
    });
  });
}

function irParaTab(barId, tabId) {
  const bar = document.getElementById(barId);
  bar.querySelectorAll('.nx-tab-btn').forEach(b => b.classList.remove('active'));
  const btnPerfil = document.getElementById(barId === 'tabbar-prestador' ? 'btn-perfil-p' : 'btn-perfil-c');
  if (btnPerfil) btnPerfil.classList.add('active');
  document.querySelectorAll('.nx-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
}


// AUTH

let modoAuth     = 'login';
let perfilSelecionado = 'cliente';

function setupAuth() {
  // Seleção de perfil
  document.querySelectorAll('.perfil-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      perfilSelecionado = btn.dataset.perfil;
      document.querySelectorAll('.perfil-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      atualizarCamposPerfil();
    });
  });

  // Toggle login/cadastro
  document.getElementById('auth-toggle-label').addEventListener('click', () => {
    modoAuth = modoAuth === 'login' ? 'cadastro' : 'login';
    document.getElementById('login-error').textContent = '';
    const isCad = modoAuth === 'cadastro';
    document.getElementById('auth-toggle-text').textContent  = isCad ? 'Já tem conta?' : 'Não tem conta?';
    document.getElementById('auth-toggle-label').textContent = isCad ? ' Fazer login' : ' Cadastre-se';
    document.getElementById('perfil-wrap').style.display     = isCad ? 'block' : 'none';
    atualizarCamposCadastro(isCad);
  });

  // Submit
  document.getElementById('auth-submit-btn').addEventListener('click', handleAuthSubmit);

  // ── Enter navega para o próximo campo visível; no último submete ──
  function getVisibleInputs() {
    return Array.from(document.querySelectorAll(
      '#login-screen input:not([type=hidden]):not([readonly])'
    )).filter(el => el.offsetParent !== null && el.style.display !== 'none');
  }
  document.getElementById('login-screen').addEventListener('keydown', function(e) {
    if (e.key !== 'Enter') return;
    const inputs = getVisibleInputs();
    const idx    = inputs.indexOf(document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    // Disparar blur para acionar validações (CNPJ, CEP)
    document.activeElement.dispatchEvent(new Event('blur'));
    if (idx < inputs.length - 1) {
      inputs[idx + 1].focus();
    } else {
      handleAuthSubmit();
    }
  });

  // Máscaras
  Mask.apply(document.getElementById('auth-cpf'),  'cpf');
  Mask.apply(document.getElementById('auth-cnpj'), 'cnpj');

  // ── API 2: ViaCEP + IBGE — endereço e microrregião pelo CEP ──
  const cepInput = document.getElementById('auth-cep');
  if (cepInput) {
    cepInput.addEventListener('blur', async () => {
      const cep = cepInput.value.replace(/\D/g,'');
      if (cep.length !== 8) return;
      const statusEl = document.getElementById('auth-cep-status');
      if (statusEl) {
        statusEl.innerHTML = '<span class="api-loading"><span class="api-spinner"></span> Buscando CEP…</span>';
        statusEl.style.color = 'var(--text-muted)';
        statusEl.style.display = 'block';
      }
      try {
        const data = await ApiViaCEP.buscarCEP(cep);
        const cidade = document.getElementById('auth-cidade');
        const bairro = document.getElementById('auth-bairro');
        const estado = document.getElementById('auth-estado');
        if (cidade) cidade.value = data.localidade || '';
        if (bairro) bairro.value = data.bairro      || '';
        if (estado) estado.value = data.uf           || '';
        const micro = data.microrregiao ? ` · ${data.microrregiao}` : '';
        if (statusEl) {
          statusEl.innerHTML = `<span style="color:var(--accent)">✅ ${data.bairro ? data.bairro+', ' : ''}${data.localidade} — ${data.uf}${micro}</span>`;
          statusEl.style.display = 'block';
        }
      } catch(e) {
        if (statusEl) {
          statusEl.innerHTML = `<span style="color:var(--red)">⚠️ ${e.message}</span>`;
          statusEl.style.display = 'block';
        }
      }
    });
  }

  // ── API 3: BrasilAPI CNPJ — valida CNPJ via Receita Federal (sem CORS) ──
  const cnpjInput = document.getElementById('auth-cnpj');
  if (cnpjInput) {
    cnpjInput.addEventListener('blur', async () => {
      if (perfilSelecionado !== 'prestador') return;
      const cnpj = cnpjInput.value.replace(/\D/g,'');
      if (cnpj.length !== 14) return;
      const statusEl = document.getElementById('auth-cnpj-status');
      if (statusEl) {
        statusEl.innerHTML = '<span class="api-loading"><span class="api-spinner"></span> Consultando Receita Federal…</span>';
        statusEl.style.display = 'block';
      }
      try {
        const data = await ApiReceitaWS.consultarCNPJ(cnpj);
        // Preencher Razão Social (somente leitura, vem da Receita)
        const razaoInput = document.getElementById('auth-razao');
        if (razaoInput) razaoInput.value = data.razaoSocial || '';
        // Preencher Nome Fantasia (editável, pré-preenchido)
        const fantasiaInput = document.getElementById('auth-fantasia');
        if (fantasiaInput && !fantasiaInput.value.trim()) {
          fantasiaInput.value = data.fantasia || data.razaoSocial || '';
        }
        // Manter compatibilidade: preencher auth-negocio também
        const negocioInput = document.getElementById('auth-negocio');
        if (negocioInput && !negocioInput.value.trim()) {
          negocioInput.value = data.fantasia || data.razaoSocial || '';
        }
        if (statusEl) {
          statusEl.innerHTML = `<span style="color:var(--accent)">✅ ${data.razaoSocial} — ${data.situacao}</span>`;
          statusEl.style.display = 'block';
        }
        cnpjInput.dataset.situacaoCnpj = data.situacao;
      } catch(e) {
        if (statusEl) {
          statusEl.innerHTML = `<span style="color:var(--red)">⚠️ ${e.message}</span>`;
          statusEl.style.display = 'block';
        }
        cnpjInput.dataset.situacaoCnpj = '';
      }
    });
  }

  // ── Câmera / Galeria no cadastro
  const _aBtnCam    = document.getElementById('auth-btn-camera');
  const _aBtnGal    = document.getElementById('auth-btn-galeria');
  const _aFotoInput = document.getElementById('auth-foto-input');
  if (_aBtnCam)    _aBtnCam.addEventListener('click', () => { const i = document.getElementById('auth-foto-input'); if(i){i.setAttribute('capture','user');i.click();} });
  if (_aBtnGal)    _aBtnGal.addEventListener('click', () => { const i = document.getElementById('auth-foto-input'); if(i){i.removeAttribute('capture');i.click();} });
  if (_aFotoInput) _aFotoInput.addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      fotoTemp = ev.target.result;
      const img = document.getElementById('auth-foto-img');
      const ph  = document.getElementById('auth-foto-placeholder');
      if (img) { img.src = fotoTemp; img.style.display = 'block'; }
      if (ph)  ph.style.display = 'none';
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
}

function atualizarCamposCadastro(isCad) {
  const campos = ['auth-nome','auth-negocio','auth-razao','auth-fantasia','auth-cpf','auth-cnpj'];
  campos.forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; });
  const fw = document.getElementById('auth-foto-wrap');
  if (fw) fw.style.display = isCad ? 'flex' : 'none';
  if (isCad) {
    const nome = document.getElementById('auth-nome');
    if (nome) nome.style.display = 'block';
    atualizarCamposPerfil();
  } else {
    fotoTemp = null;
    const img = document.getElementById('auth-foto-img');
    const ph  = document.getElementById('auth-foto-placeholder');
    if (img) img.style.display = 'none';
    if (ph)  ph.style.display  = 'block';
    // Limpar e ocultar campos de endereço/cadastro ao voltar para login
    ['auth-cep','auth-cep-status','auth-cidade','auth-bairro','auth-estado',
     'auth-nome','auth-negocio','auth-razao','auth-fantasia','auth-cpf','auth-cnpj','auth-cnpj-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.value = ''; }
    });
    const pfw = document.getElementById('perfil-wrap');
    if (pfw) pfw.style.display = 'none';
  }
}

function atualizarCamposPerfil() {
  if (modoAuth === 'cadastro') {
    document.getElementById('auth-nome').style.display = 'block';
  }
  const ehPrestador = perfilSelecionado === 'prestador';
  document.getElementById('auth-negocio').style.display    = ehPrestador ? 'block' : 'none';
  document.getElementById('auth-cpf').style.display        = ehPrestador ? 'none'  : 'block';
  document.getElementById('auth-cnpj').style.display       = ehPrestador ? 'block' : 'none';
  // Campos Razão Social e Nome Fantasia (só prestador)
  const razaoEl = document.getElementById('auth-razao');
  const fantasiaEl = document.getElementById('auth-fantasia');
  if (razaoEl)    razaoEl.style.display    = ehPrestador ? 'block' : 'none';
  if (fantasiaEl) fantasiaEl.style.display = ehPrestador ? 'block' : 'none';
  // CEP e endereço: ambos os perfis no cadastro
  const isCad = modoAuth === 'cadastro';
  const camposCnpj = ['auth-cnpj-status', 'auth-negocio', 'auth-cnpj'];
  camposCnpj.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = ehPrestador ? 'block' : 'none';
  });
  // Placeholder do CEP muda conforme perfil
  const cepEl = document.getElementById('auth-cep');
  if (cepEl) {
    cepEl.placeholder = ehPrestador ? 'CEP da empresa' : 'Seu CEP (para filtros de proximidade)';
    cepEl.style.display = isCad ? 'block' : 'none';
  }
  ['auth-cep-status','auth-cidade','auth-bairro','auth-estado'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isCad ? 'block' : 'none';
  });
}

function handleAuthSubmit() {
  document.getElementById('login-error').textContent = '';
  const email = document.getElementById('auth-email').value.trim();
  const senha = document.getElementById('auth-senha').value;

  try {
    if (modoAuth === 'cadastro') {
      const nome = document.getElementById('auth-nome').value.trim();
      if (!nome)            throw new Error('Informe seu nome.');
      if (!email)           throw new Error('Informe o e-mail.');
      if (senha.length < 4) throw new Error('Senha com mínimo 4 caracteres.');

      const dados = { nome, email, senha, perfil: perfilSelecionado, foto: fotoTemp };

      if (perfilSelecionado === 'cliente') {
        const cpf = document.getElementById('auth-cpf').value.trim();
        if (!cpf) throw new Error('Informe o CPF.');
        dados.cpf = cpf;
        // Salvar localização do cliente (para filtros de proximidade)
        const cidadeEl = document.getElementById('auth-cidade');
        const bairroEl = document.getElementById('auth-bairro');
        const estadoEl = document.getElementById('auth-estado');
        const cepEl    = document.getElementById('auth-cep');
        dados.cep    = cepEl    ? cepEl.value.replace(/\D/g,'') || null : null;
        dados.cidade = cidadeEl ? cidadeEl.value.trim() || null : null;
        dados.bairro = bairroEl ? bairroEl.value.trim() || null : null;
        dados.estado = estadoEl ? estadoEl.value.trim() || null : null;
      } else {
        const cnpj       = document.getElementById('auth-cnpj').value.trim();
        const nomeNegocio = document.getElementById('auth-negocio').value.trim();
        if (!cnpj)        throw new Error('Informe o CNPJ.');
        if (!nomeNegocio) throw new Error('Informe o nome do negócio.');
        dados.cnpj        = cnpj;
        dados.nomeNegocio = nomeNegocio;
        // Razão Social e Nome Fantasia
        const razaoEl    = document.getElementById('auth-razao');
        const fantasiaEl = document.getElementById('auth-fantasia');
        dados.razaoSocial = razaoEl    ? razaoEl.value.trim()    || null : null;
        dados.fantasia    = fantasiaEl ? fantasiaEl.value.trim() || null : null;
        // Dados vindos das APIs
        const cnpjEl = document.getElementById('auth-cnpj');
        dados.situacaoCnpj = cnpjEl ? cnpjEl.dataset.situacaoCnpj || null : null;
        const cidadeEl = document.getElementById('auth-cidade');
        const bairroEl = document.getElementById('auth-bairro');
        const estadoEl = document.getElementById('auth-estado');
        const cepEl    = document.getElementById('auth-cep');
        dados.cep    = cepEl    ? cepEl.value.replace(/\D/g,'') || null : null;
        dados.cidade = cidadeEl ? cidadeEl.value.trim() || null : null;
        dados.bairro = bairroEl ? bairroEl.value.trim() || null : null;
        dados.estado = estadoEl ? estadoEl.value.trim() || null : null;
      }

      authManager.cadastrar(dados);
      fotoTemp = null; // limpar após cadastro
      authManager.login(email, senha);
    } else {
      if (!email || !senha) throw new Error('Preencha e-mail e senha.');
      authManager.login(email, senha);
    }
    iniciarApp();
  } catch (e) {
    document.getElementById('login-error').textContent = e.message;
  }
}

function handleLogout() {
  authManager.logout();
  currentUser = null;
  svcManager  = null;
  document.getElementById('app').style.display          = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-senha').value = '';
  document.getElementById('login-error').textContent = '';
  modoAuth = 'login';
  document.getElementById('auth-toggle-text').textContent  = 'Não tem conta?';
  document.getElementById('auth-toggle-label').textContent = ' Cadastre-se';
  document.getElementById('perfil-wrap').style.display = 'none';
  atualizarCamposCadastro(false);
}


// INICIAR APP

function iniciarApp() {
  currentUser = authManager.getUsuarioAtual();
  // ── Migração: recarregar currentUser do storage (tem campos novos) ──
  // Garante que dados salvos em sessões anteriores sejam atualizados
  if (currentUser) {
    const fresh = authManager.buscarPorId(currentUser.id);
    if (fresh) currentUser = fresh;
  }
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display          = 'block';

  // Esconder ambos os perfis
  document.getElementById('tabs-prestador').style.display = 'none';
  document.getElementById('tabs-cliente').style.display   = 'none';

  if (currentUser.perfil === 'prestador') {
    svcManager = new ServiceManager(currentUser.id);
    document.getElementById('tabs-prestador').style.display = 'block';
    document.getElementById('topbar-title-p').textContent   =
      currentUser.nomeNegocio || currentUser.nome;
    initTabs('tabbar-prestador');
    bindEventosPrestador();
    renderAgenda();
    renderServicosPrestador();
    renderResumo();
  } else {
    document.getElementById('tabs-cliente').style.display = 'block';
    initTabs('tabbar-cliente');
    bindEventosCliente();
    renderPrestadores();
    renderMeusAgendamentos();
    renderChatsCliente();
  }

  // Sheets comuns
  bindSheetSenha();
  document.querySelectorAll('.nx-overlay').forEach(el => {
    const name = el.id.replace('overlay-','');
    el.addEventListener('click', () => closeSheet(name));
  });
  document.querySelectorAll('.nx-sheet-close').forEach(btn => {
    btn.addEventListener('click', () => closeSheet(btn.dataset.sheet));
  });

  // Sheet de perfil: câmera/galeria
  const _pCam = document.getElementById('perfil-btn-camera');
  const _pGal = document.getElementById('perfil-btn-galeria');
  const _pInp = document.getElementById('perfil-foto-input');
  const _pSav = document.getElementById('btn-salvar-foto-perfil');
  if (_pCam) _pCam.addEventListener('click', () => { const i=document.getElementById('perfil-foto-input'); if(i){i.setAttribute('capture','user');i.click();} });
  if (_pGal) _pGal.addEventListener('click', () => { const i=document.getElementById('perfil-foto-input'); if(i){i.removeAttribute('capture');i.click();} });
  if (_pInp) _pInp.addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      fotoTemp = ev.target.result;
      const img = document.getElementById('perfil-foto-img');
      const ph  = document.getElementById('perfil-foto-placeholder');
      if (img) { img.src = fotoTemp; img.style.display = 'block'; }
      if (ph)  ph.style.display = 'none';
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
  if (_pSav) _pSav.addEventListener('click', salvarFotoPerfil);

  // Chat
  bindChat();
}

// iniciarApp() é chamado dentro do DOMContentLoaded (ver fim do arquivo)

// ── PRESTADOR: AGENDA ──

function bindEventosPrestador() {
  document.getElementById('btn-logout-p').addEventListener('click', handleLogout);
  document.getElementById('btn-perfil-p').addEventListener('click', () => {
    irParaTab('tabbar-prestador', 'tab-perfil-p');
    renderTelaPerfil('p');
  });
  document.getElementById('btn-editar-perfil-p').addEventListener('click', abrirSheetEditarPerfil);
  document.getElementById('btn-trocar-senha-p').addEventListener('click', () => openSheet('senha'));
  document.getElementById('btn-mes-prev').addEventListener('click', () => {
    if (currentMes === 0) { currentMes=11; currentAno--; } else currentMes--;
    selectedDate = `${currentAno}-${String(currentMes+1).padStart(2,'0')}-01`;
    renderAgenda();
  });
  document.getElementById('btn-mes-next').addEventListener('click', () => {
    if (currentMes === 11) { currentMes=0; currentAno++; } else currentMes++;
    selectedDate = `${currentAno}-${String(currentMes+1).padStart(2,'0')}-01`;
    renderAgenda();
  });
  document.getElementById('btn-res-prev').addEventListener('click', () => {
    if (resMes===0) { resMes=11; resAno--; } else resMes--;
    renderResumo();
  });
  document.getElementById('btn-res-next').addEventListener('click', () => {
    if (resMes===11) { resMes=0; resAno++; } else resMes++;
    renderResumo();
  });
  document.getElementById('btn-add-servico').addEventListener('click', () => {
    limparFormServico();
    document.getElementById('sheet-svc-title').textContent = 'Novo Serviço';
    openSheet('servico');
  });
  document.getElementById('btn-salvar-servico').addEventListener('click', salvarServico);
}

// API 4: BrasilAPI Feriados — delegado ao api-service.js
async function carregarFeriados(ano) {
  return await ApiBrasilAPI.buscarFeriados(ano);
}

function renderAgenda() {
  document.getElementById('mes-label').textContent = fmt.mesAno(currentMes, currentAno);
  renderDaysStrip();
  renderListaAgenda();
}

async function renderDaysStrip() {
  const strip    = document.getElementById('days-strip');
  const dias     = fmt.diasNoMes(currentMes, currentAno);
  const nomes    = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const apts     = aptManager.listarDePrestador(currentUser.id, { mes: currentMes, ano: currentAno });
  const feriados = await carregarFeriados(currentAno);

  // Loading state brevíssimo para mostrar que feriados são buscados na API
  strip.innerHTML = '<div class="api-loading-inline"><span class="api-spinner"></span></div>';
  await new Promise(r => setTimeout(r, 0));
  strip.innerHTML = '';
  for (let d = 1; d <= dias; d++) {
    const ds       = `${currentAno}-${String(currentMes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dt       = new Date(ds+'T00:00:00');
    const tem      = apts.some(a => a.data === ds);
    const ativo    = ds === selectedDate;
    const feriado  = feriados[ds];

    const chip = document.createElement('div');
    chip.className = `day-chip${ativo ? ' active' : ''}${feriado ? ' feriado' : ''}`;
    chip.title = feriado || '';
    chip.innerHTML = `
      <span style="font-size:10px;">${nomes[dt.getDay()]}</span>
      <span class="day-num">${d}</span>
      ${feriado ? '<div class="day-dot" style="background:var(--nx-yellow);"></div>'
                : tem ? '<div class="day-dot"></div>' : '<div style="height:7px;"></div>'}
    `;
    chip.addEventListener('click', () => {
      selectedDate = ds;
      renderDaysStrip();
      renderListaAgenda();
      if (feriado) showToast(`🎉 Feriado: ${feriado}`);
    });
    strip.appendChild(chip);
  }
  const active = strip.querySelector('.day-chip.active');
  if (active) active.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
}

function renderListaAgenda() {
  const apts    = aptManager.listarDePrestadorPorData(currentUser.id, selectedDate);
  const listaEl = document.getElementById('lista-agenda');
  const emptyEl = document.getElementById('empty-agenda');

  document.getElementById('hero-label').textContent  = fmt.dataExibicao(selectedDate);
  document.getElementById('hero-count').textContent  = `${apts.length} agendamento${apts.length!==1?'s':''}`;
  const rec = apts.filter(a=>a.status==='concluido').reduce((acc,a)=>{
    const s = svcManager.buscarPorId(a.servicoId); return acc+(s?s.preco:0);
  },0);
  document.getElementById('hero-receita').textContent = rec>0 ? `Receita: ${fmt.moeda(rec)}` : 'Nenhum concluído';

  listaEl.innerHTML = '';
  if (apts.length === 0) { emptyEl.style.display='block'; return; }
  emptyEl.style.display = 'none';

  apts.forEach(apt => {
    const cliente = authManager.buscarPorId(apt.clienteId);
    const svc     = svcManager.buscarPorId(apt.servicoId);
    const nomeC   = cliente ? cliente.nome : 'Cliente removido';
    const nomeS   = svc ? svc.nome : '—';

    const card = document.createElement('div');
    card.className = 'apt-card';
    card.innerHTML = `
      <div class="apt-card-header">
        <div class="apt-hora">${apt.hora}</div>
        ${avatarHtml(cliente || { nome: nomeC })}
        <div style="flex:1;">
          <div style="font-weight:600;font-size:15px;">${nomeC}</div>
          <div style="font-size:12px;color:var(--nx-muted);">${nomeS}${svc?' · '+fmt.moeda(svc.preco):''}</div>
        </div>
        ${statusBadge(apt.status)}
      </div>
      ${apt.observacao ? `<div style="font-size:12px;color:var(--nx-muted);margin-bottom:8px;">📝 ${apt.observacao}</div>` : ''}
      <div class="apt-actions">
        ${apt.status==='pendente' ? `
          <button class="apt-action-btn success" data-action="confirmar" data-id="${apt.id}">✅ Confirmar</button>
          <button class="apt-action-btn danger"  data-action="recusar"   data-id="${apt.id}">🚫 Recusar</button>` : ''}
        ${apt.status==='confirmado' ? `
          <button class="apt-action-btn success" data-action="concluir" data-id="${apt.id}">🎉 Concluir</button>
          <button class="apt-action-btn danger"  data-action="cancelar" data-id="${apt.id}">❌ Cancelar</button>` : ''}
        <button class="apt-action-btn chat" data-action="chat" data-id="${apt.id}">💬 Chat</button>
      </div>
    `;
    card.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { action, id } = btn.dataset;
        if (action==='confirmar') { aptManager.atualizarStatus(id,'confirmado'); renderAgenda(); renderResumo(); showToast('Agendamento confirmado!'); }
        if (action==='recusar')  { aptManager.atualizarStatus(id,'recusado');   renderAgenda(); renderResumo(); showToast('Agendamento recusado.'); }
        if (action==='concluir') { aptManager.atualizarStatus(id,'concluido');  renderAgenda(); renderResumo(); showToast('Serviço concluído!'); }
        if (action==='cancelar') { aptManager.atualizarStatus(id,'cancelado');  renderAgenda(); renderResumo(); showToast('Agendamento cancelado.'); }
        if (action==='chat')     { abrirChat(id); }
      });
    });
    listaEl.appendChild(card);
  });
}


// ── PRESTADOR: SERVIÇOS ──

function renderServicosPrestador() {
  const servicos = svcManager.listar();
  const ul    = document.getElementById('lista-servicos-ul');
  const empty = document.getElementById('empty-servicos');
  ul.innerHTML = '';
  if (servicos.length === 0) { empty.style.display='block'; return; }
  empty.style.display = 'none';

  servicos.forEach(s => {
    const li = document.createElement('li');
    li.className = 'nx-list-item';
    li.innerHTML = `
      <div style="width:44px;height:44px;border-radius:12px;background:var(--nx-accent-dim);border:1px solid rgba(0,212,170,0.3);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${_iconePorServico(s.nome)}</div>
      <div class="nx-list-item-info">
        <div class="nx-list-item-title">${s.nome}</div>
        <div class="nx-list-item-sub">${s.duracao} min${s.descricao?' · '+s.descricao:''}</div>
      </div>
      <div class="nx-list-item-right">
        <span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:15px;color:var(--nx-accent);">${fmt.moeda(s.preco)}</span>
        <div style="display:flex;gap:6px;">
          <button class="apt-action-btn accent" data-action="editar" data-id="${s.id}">Editar</button>
          <button class="apt-action-btn danger"  data-action="remover" data-id="${s.id}">Remover</button>
        </div>
      </div>
    `;
    li.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (btn.dataset.action === 'editar')  abrirEdicaoServico(s.id);
        if (btn.dataset.action === 'remover') { if(confirm('Remover serviço?')){ svcManager.remover(s.id); renderServicosPrestador(); } }
      });
    });
    ul.appendChild(li);
  });
}

function limparFormServico() {
  ['svc-nome','svc-preco','svc-duracao','svc-desc'].forEach(id => document.getElementById(id).value='');
  document.getElementById('svc-edit-id').value = '';
}

function abrirEdicaoServico(id) {
  const s = svcManager.buscarPorId(id);
  if (!s) return;
  document.getElementById('sheet-svc-title').textContent = 'Editar Serviço';
  document.getElementById('svc-edit-id').value  = s.id;
  document.getElementById('svc-nome').value     = s.nome;
  document.getElementById('svc-preco').value    = s.preco;
  document.getElementById('svc-duracao').value  = s.duracao;
  document.getElementById('svc-desc').value     = s.descricao||'';
  openSheet('servico');
}

function salvarServico() {
  const id      = document.getElementById('svc-edit-id').value;
  const nome    = document.getElementById('svc-nome').value.trim();
  const preco   = parseFloat(document.getElementById('svc-preco').value);
  const duracao = parseInt(document.getElementById('svc-duracao').value);
  const descricao = document.getElementById('svc-desc').value.trim();
  if (!nome)              { showToast('Informe o nome.'); return; }
  if (!preco||preco<=0)   { showToast('Preço inválido.'); return; }
  if (!duracao||duracao<5){ showToast('Duração mínima: 5 min.'); return; }
  try {
    if (id) { svcManager.atualizar(id,{nome,preco,duracao,descricao}); showToast('Serviço atualizado!'); }
    else    { svcManager.adicionar({nome,preco,duracao,descricao});     showToast('Serviço cadastrado!'); }
    closeSheet('servico');
    renderServicosPrestador();
  } catch(e) { showToast(e.message); }
}

// PRESTADOR: DASHBOARD 

function renderResumo() {
  document.getElementById('res-mes-label').textContent = fmt.mesAno(resMes, resAno);
  const apts     = aptManager.listarDePrestador(currentUser.id, { mes:resMes, ano:resAno });
  const contagem = aptManager.contagemPorStatusPrestador(currentUser.id, resMes, resAno);
  const receita  = aptManager.receitaMesPrestador(currentUser.id, resMes, resAno);

  document.getElementById('res-receita').textContent         = fmt.moeda(receita);
  document.getElementById('res-concluidos-label').textContent = `${contagem.concluido||0} serviços concluídos`;
  document.getElementById('res-total').textContent            = apts.length;
  document.getElementById('res-concluidos-n').textContent     = contagem.concluido||0;
  document.getElementById('res-pendentes').textContent        = contagem.pendente||0;
  document.getElementById('res-recusados').textContent        = (contagem.recusado||0)+(contagem.cancelado||0);

  const listaEl = document.getElementById('lista-resumo-apts');
  const emptyEl = document.getElementById('empty-resumo');
  listaEl.innerHTML = '';
  if (apts.length===0) { emptyEl.style.display='block'; return; }
  emptyEl.style.display='none';

  const porData = {};
  apts.forEach(a => { if (!porData[a.data]) porData[a.data]=[]; porData[a.data].push(a); });
  Object.entries(porData).sort(([a],[b])=>a.localeCompare(b)).forEach(([data,lista]) => {
    const h = document.createElement('div');
    h.className='section-title'; h.style.paddingTop='8px';
    h.textContent = fmt.dataExibicao(data);
    listaEl.appendChild(h);
    lista.forEach(apt => {
      const c = authManager.buscarPorId(apt.clienteId);
      const s = ServiceManager.listarDePrestador(currentUser.id).find(x=>x.id===apt.servicoId);
      const row = document.createElement('div');
      row.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--nx-border);';
      row.innerHTML=`<div><div style="font-weight:600;font-size:14px;">${apt.hora} — ${c?c.nome:'—'}</div><div style="font-size:12px;color:var(--nx-muted);">${s?s.nome:'—'}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">${statusBadge(apt.status)}${s?`<span style="font-size:12px;color:var(--nx-accent);font-weight:700;">${fmt.moeda(s.preco)}</span>`:''}</div>`;
      listaEl.appendChild(row);
    });
  });
}


//  PRESTADOR: CHATS 

function renderChatsPrestador() {
  const apts  = aptManager.listarDePrestador(currentUser.id);
  const ul    = document.getElementById('lista-chats-p');
  const empty = document.getElementById('empty-chats-p');
  ul.innerHTML = '';
  const validos = apts.filter(a => a.status !== 'recusado' && a.status !== 'cancelado');
  if (validos.length===0) { empty.style.display='block'; return; }
  empty.style.display='none';
  validos.forEach(apt => {
    const cliente = authManager.buscarPorId(apt.clienteId);
    const svc     = ServiceManager.listarDePrestador(currentUser.id).find(s=>s.id===apt.servicoId);
    const msgs    = chatManager.listar(apt.id);
    const ultima  = msgs.length>0 ? msgs[msgs.length-1] : null;
    const li = document.createElement('li');
    li.className = 'nx-list-item';
    li.innerHTML = `
      ${avatarHtml(cliente||{nome:'?'})}
      <div class="nx-list-item-info">
        <div class="nx-list-item-title">${cliente?cliente.nome:'—'}</div>
        <div class="nx-list-item-sub">${svc?svc.nome:'—'} · ${apt.data}</div>
        ${ultima?`<div style="font-size:11px;color:var(--nx-muted);margin-top:2px;">${ultima.texto.slice(0,40)}${ultima.texto.length>40?'…':''}</div>`:''}
      </div>
      <div class="nx-list-item-right">${statusBadge(apt.status)}</div>
    `;
    li.addEventListener('click', () => abrirChat(apt.id));
    ul.appendChild(li);
  });
}


//  CLIENTE: EXPLORAR 

function bindEventosCliente() {
  document.getElementById('btn-logout-c').addEventListener('click', handleLogout);
  document.getElementById('btn-perfil-c').addEventListener('click', () => {
    irParaTab('tabbar-cliente', 'tab-perfil-c');
    renderTelaPerfil('c');
  });
  document.getElementById('btn-editar-perfil-c').addEventListener('click', abrirSheetEditarPerfil);
  document.getElementById('btn-trocar-senha-c').addEventListener('click', () => openSheet('senha'));
  document.getElementById('search-prestador').addEventListener('input', renderPrestadores);
  initFiltros();
  document.getElementById('btn-confirmar-agendamento').addEventListener('click', confirmarAgendamento);
}


// ── Estado dos filtros de localização ──
let filtroUF       = '';
let filtroCidade   = '';
let filtroServico  = '';
let filtroProxLat  = null;
let filtroProxLng  = null;
const RAIO_KM      = 10;

// Haversine: distância em km entre dois pontos lat/lng
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Geocoding via Nominatim ──
// Prioridade: CEP (mais preciso) → cidade+UF (fallback)
// Cache em localStorage (24h) para evitar requisições repetidas

const _geoMemCache = {}; // cache em memória por aba

async function _nominatimBuscar(query, cacheKey) {
  // 1. cache em memória
  if (_geoMemCache[cacheKey] !== undefined) return _geoMemCache[cacheKey];

  // 2. cache no localStorage (24h)
  const lsKey = `nx2_geo_${cacheKey}`;
  try {
    const raw = localStorage.getItem(lsKey);
    if (raw) {
      const { coords, ts } = JSON.parse(raw);
      if (Date.now() - ts < 86400000) {
        _geoMemCache[cacheKey] = coords;
        return coords;
      }
      localStorage.removeItem(lsKey);
    }
  } catch(_) {}

  // 3. bloquear requisições duplicadas simultâneas
  _geoMemCache[cacheKey] = null;

  try {
    console.log('[Geo] Buscando:', query);
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'Nextime/2.0' } }
    );
    const d = await r.json();
    if (d && d.length) {
      const coords = { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
      _geoMemCache[cacheKey] = coords;
      // salvar no localStorage
      try {
        localStorage.setItem(lsKey, JSON.stringify({ coords, ts: Date.now() }));
      } catch(_) {}
      console.log('[Geo] Resultado:', cacheKey, coords);
      return coords;
    }
  } catch(e) {
    console.warn('[Geo] Erro:', e.message);
  }

  _geoMemCache[cacheKey] = null;
  return null;
}

async function coordenadasDePrestador(p) {
  // Tentar CEP primeiro (mais preciso — endereço específico)
  if (p.cep) {
    const cep = p.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      const coords = await _nominatimBuscar(`${cep}, Brasil`, `cep_${cep}`);
      if (coords) return coords;
    }
  }

  // Fallback: bairro + cidade + UF (mais preciso que só cidade)
  if (p.cidade && p.estado) {
    const query = p.bairro
      ? `${p.bairro}, ${p.cidade}, ${p.estado}, Brasil`
      : `${p.cidade}, ${p.estado}, Brasil`;
    const key = p.bairro
      ? `bairro_${p.bairro}_${p.cidade}_${p.estado}`
      : `cidade_${p.cidade}_${p.estado}`;
    return await _nominatimBuscar(query, key);
  }

  return null;
}

function popularFiltrosUF() {
  const todos = authManager.listarPrestadores();
  const ufs = [...new Set(todos.map(p => p.estado).filter(Boolean))].sort();
  const selUF = document.getElementById('filtro-uf');
  selUF.innerHTML = '<option value="">Estado (UF)</option>';
  ufs.forEach(uf => {
    const opt = document.createElement('option');
    opt.value = uf; opt.textContent = uf;
    selUF.appendChild(opt);
  });
}

function popularFiltrosCidade(uf) {
  const todos = authManager.listarPrestadores();
  const cidades = [...new Set(
    todos.filter(p => !uf || p.estado === uf).map(p => p.cidade).filter(Boolean)
  )].sort();
  const selCidade = document.getElementById('filtro-cidade');
  selCidade.innerHTML = '<option value="">Cidade</option>';
  cidades.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    selCidade.appendChild(opt);
  });
  selCidade.disabled = cidades.length === 0;
}

function atualizarBotaoLimpar() {
  const ativo = filtroUF || filtroCidade || filtroServico || filtroProxLat !== null;
  document.getElementById('filtro-limpar').style.display = ativo ? 'flex' : 'none';
}

function popularFiltrosServico() {
  const todos = authManager.listarPrestadores();
  const servicos = new Set();
  todos.forEach(p => {
    ServiceManager.listarDePrestador(p.id).forEach(s => {
      if (s.nome) servicos.add(s.nome.trim());
    });
  });
  const sel = document.getElementById('filtro-servico');
  if (!sel) return;
  const atual = sel.value;
  sel.innerHTML = '<option value="">Serviço</option>';
  [...servicos].sort().forEach(nome => {
    const opt = document.createElement('option');
    opt.value = nome; opt.textContent = nome;
    if (nome === atual) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.disabled = servicos.size === 0;
}

function initFiltros() {
  popularFiltrosUF();
  popularFiltrosCidade('');
  popularFiltrosServico();

  document.getElementById('filtro-servico').addEventListener('change', function() {
    filtroServico = this.value;
    atualizarBotaoLimpar();
    renderPrestadores();
  });

  document.getElementById('filtro-uf').addEventListener('change', function() {
    filtroUF = this.value;
    filtroCidade = '';
    popularFiltrosCidade(filtroUF);
    document.getElementById('filtro-cidade').value = '';
    atualizarBotaoLimpar();
    renderPrestadores();
  });

  document.getElementById('filtro-cidade').addEventListener('change', function() {
    filtroCidade = this.value;
    atualizarBotaoLimpar();
    renderPrestadores();
  });

  document.getElementById('filtro-proximidade').addEventListener('click', function() {
    if (filtroProxLat !== null) {
      // Toggle off
      filtroProxLat = filtroProxLng = null;
      this.classList.remove('active');
      document.getElementById('filtro-prox-status').style.display = 'none';
      atualizarBotaoLimpar();
      renderPrestadores();
      return;
    }
    const statusEl = document.getElementById('filtro-prox-status');
    statusEl.innerHTML = '<span class="api-loading"><span class="api-spinner"></span> Obtendo localização GPS…</span>';
    statusEl.style.display = 'block';
    if (!navigator.geolocation) {
      statusEl.innerHTML = '<span style="color:var(--red)">⚠️ Geolocalização não disponível neste dispositivo.</span>';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        filtroProxLat = pos.coords.latitude;
        filtroProxLng = pos.coords.longitude;
        this.classList.add('active');
        statusEl.innerHTML = `<span style="color:var(--accent)">📍 Mostrando prestadores em até ${RAIO_KM} km de você</span>`;
        // Abrir mapa com localização do usuário
        abrirMapaUsuario(filtroProxLat, filtroProxLng);
        atualizarBotaoLimpar();
        renderPrestadores();
      },
      err => {
        statusEl.innerHTML = '<span style="color:var(--red)">⚠️ Não foi possível obter sua localização. Verifique as permissões.</span>';
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  });

  document.getElementById('filtro-limpar').addEventListener('click', function() {
    filtroUF = ''; filtroCidade = ''; filtroServico = '';
    filtroProxLat = filtroProxLng = null;
    document.getElementById('filtro-uf').value = '';
    document.getElementById('filtro-cidade').value = '';
    const fsEl = document.getElementById('filtro-servico');
    if (fsEl) fsEl.value = '';
    document.getElementById('filtro-proximidade').classList.remove('active');
    document.getElementById('filtro-prox-status').style.display = 'none';
    popularFiltrosCidade('');
    this.style.display = 'none';
    renderPrestadores();
  });
}

async function renderPrestadores() {
  const query   = (document.getElementById('search-prestador').value||'').toLowerCase();
  const todos   = authManager.listarPrestadores();
  const listaEl = document.getElementById('lista-prestadores');
  const emptyEl = document.getElementById('empty-prestadores');
  const countEl = document.getElementById('filtro-count');
  // Loading state
  listaEl.innerHTML = '<div class="api-loading-block"><span class="api-spinner"></span><span>Carregando prestadores…</span></div>';
  emptyEl.style.display = 'none';
  await new Promise(r => setTimeout(r, 0)); // yield para render

  // Filtro de texto
  let filtrados = todos.filter(p => {
    const svcs = ServiceManager.listarDePrestador(p.id);
    return !query ||
      p.nome.toLowerCase().includes(query) ||
      (p.nomeNegocio||'').toLowerCase().includes(query) ||
      svcs.some(s => s.nome.toLowerCase().includes(query));
  });

  // Filtro UF
  if (filtroUF) filtrados = filtrados.filter(p => p.estado === filtroUF);
  // Filtro Cidade
  if (filtroCidade) filtrados = filtrados.filter(p => p.cidade === filtroCidade);
  // Filtro Serviço — mantém só prestadores que oferecem o serviço filtrado
  if (filtroServico) {
    filtrados = filtrados.filter(p => {
      return ServiceManager.listarDePrestador(p.id)
        .some(s => s.nome.trim() === filtroServico);
    });
  }

  // Filtro por proximidade (geolocalização + geocoding do prestador)
  let distancias = {};
  if (filtroProxLat !== null) {
    const comCoords = await Promise.all(filtrados.map(async p => {
      const coords = await coordenadasDePrestador(p);
      if (!coords) return null;
      const km = haversineKm(filtroProxLat, filtroProxLng, coords.lat, coords.lng);
      distancias[p.id] = km;
      return km <= RAIO_KM ? p : null;
    }));
    filtrados = comCoords.filter(Boolean);
    // Ordenar por distância
    filtrados.sort((a,b) => (distancias[a.id]||999) - (distancias[b.id]||999));
  }

  if (countEl) countEl.textContent = filtrados.length > 0 ? `${filtrados.length} resultado${filtrados.length>1?'s':''}` : '';
  if (filtrados.length===0) { listaEl.innerHTML = ''; emptyEl.style.display='block'; return; }
  emptyEl.style.display='none';
  listaEl.innerHTML = ''; // limpar spinner antes de inserir cards

  filtrados.forEach(p => {
    const svcs = ServiceManager.listarDePrestador(p.id);
    const card = document.createElement('div');
    card.className = 'prestador-card';
    const distKm  = distancias[p.id];
    const distBadge = distKm !== undefined
      ? `<span style="background:var(--nx-accent);color:#000;font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;margin-left:4px;">${distKm < 1 ? '<1' : distKm.toFixed(1)} km</span>`
      : '';
    card.innerHTML = `
      <div class="prestador-card-header">
        ${avatarHtml(p,'lg')}
        <div class="prestador-card-info">
          <div class="prestador-card-nome">${p.nome} ${distBadge}</div>
          <div class="prestador-card-negocio">🏢 ${p.nomeNegocio||'—'}</div>
          <div style="font-size:11px;color:var(--nx-muted);margin-top:2px;">CNPJ: ${p.cnpj||'—'}${p.situacaoCnpj ? ' · '+p.situacaoCnpj : ''}</div>
          ${p.cidade ? `<div style="font-size:11px;color:var(--nx-muted);margin-top:1px;">📍 ${p.bairro ? p.bairro+', ' : ''}${p.cidade}${p.estado ? ' — '+p.estado : ''}</div>` : ''}
        </div>
      </div>
      ${svcs.length===0
        ? `<div style="padding:14px 16px;font-size:13px;color:var(--nx-muted);">Sem serviços cadastrados ainda.</div>`
        : svcs.map(s => `
          <div class="servico-row">
            <div>
              <div class="servico-nome">${s.nome}</div>
              <div class="servico-meta">${s.duracao} min${s.descricao?' · '+s.descricao:''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="servico-preco">${fmt.moeda(s.preco)}</span>
              <button class="servico-agendar" data-prestador="${p.id}" data-svc="${s.id}">Agendar</button>
            </div>
          </div>
        `).join('')
      }
    `;
    card.querySelectorAll('.servico-agendar').forEach(btn => {
      btn.addEventListener('click', () => abrirSheetAgendar(btn.dataset.prestador, btn.dataset.svc));
    });
    listaEl.appendChild(card);
  });
}

async function abrirSheetAgendar(prestadorId, servicoId) {
  const svc = ServiceManager.listarDePrestador(prestadorId).find(s=>s.id===servicoId);
  if (!svc) return;
  document.getElementById('agendar-prestador-id').value = prestadorId;
  document.getElementById('agendar-servico-id').value   = servicoId;
  document.getElementById('agendar-svc-nome').textContent  = svc.nome;
  document.getElementById('agendar-svc-preco').textContent = fmt.moeda(svc.preco);
  document.getElementById('agendar-svc-dur').textContent   = `${svc.duracao} minutos`;
  document.getElementById('agendar-data').value = hoje.toISOString().split('T')[0];
  document.getElementById('agendar-hora').value = '';
  document.getElementById('agendar-obs').value  = '';

  // Mostrar endereço do prestador + distância
  const prestador = authManager.buscarPorId(prestadorId);
  const locWrap   = document.getElementById('agendar-localizacao-wrap');
  const locEndr   = document.getElementById('agendar-prestador-endereco');
  const distWrap  = document.getElementById('agendar-distancia-wrap');
  if (prestador && prestador.cidade) {
    locEndr.textContent = [prestador.bairro, prestador.cidade, prestador.estado].filter(Boolean).join(', ');
    locWrap.style.display = 'block';
    // Calcular distância se tiver geolocalização do usuário
    distWrap.style.display = 'none';
    if (filtroProxLat !== null) {
      const coords = await coordenadasDePrestador(prestador);
      if (coords) {
        const km = haversineKm(filtroProxLat, filtroProxLng, coords.lat, coords.lng);
        const badge = document.getElementById('agendar-distancia-badge');
        const label = document.getElementById('agendar-distancia-label');
        badge.textContent = km < 1 ? 'Menos de 1 km' : `${km.toFixed(1)} km`;
        label.textContent = km <= RAIO_KM ? 'de você — próximo!' : 'de você';
        distWrap.style.display = 'flex';
        distWrap.style.alignItems = 'center';
      }
    }
  } else {
    locWrap.style.display = 'none';
  }

  openSheet('agendar');
}

function confirmarAgendamento() {
  const prestadorId = document.getElementById('agendar-prestador-id').value;
  const servicoId   = document.getElementById('agendar-servico-id').value;
  const data        = document.getElementById('agendar-data').value;
  const hora        = document.getElementById('agendar-hora').value;
  const observacao  = document.getElementById('agendar-obs').value.trim();

  if (!data) { showToast('Informe a data.'); return; }
  if (!hora) { showToast('Informe o horário.'); return; }

  try {
    aptManager.adicionar({ clienteId: currentUser.id, prestadorId, servicoId, data, hora, observacao, status:'pendente' });
    closeSheet('agendar');
    renderMeusAgendamentos();
    renderChatsCliente();
    showToast('Solicitação enviada! Aguarde confirmação.');
  } catch(e) { showToast(e.message); }
}

//  CLIENTE: MEUS AGENDAMENTOS 

function renderMeusAgendamentos() {
  const apts  = aptManager.listarDeCliente(currentUser.id);
  const ul    = document.getElementById('lista-meus-apts');
  const empty = document.getElementById('empty-meus-apts');
  ul.innerHTML = '';
  if (apts.length===0) { empty.style.display='block'; return; }
  empty.style.display='none';

  apts.forEach(apt => {
    const prestador = authManager.buscarPorId(apt.prestadorId);
    const svcs      = ServiceManager.listarDePrestador(apt.prestadorId);
    const svc       = svcs.find(s=>s.id===apt.servicoId);
    const li = document.createElement('li');
    li.className = 'nx-list-item';
    li.innerHTML = `
      ${avatarHtml(prestador||{nome:'?'})}
      <div class="nx-list-item-info">
        <div class="nx-list-item-title">${prestador?prestador.nomeNegocio||prestador.nome:'—'}</div>
        <div class="nx-list-item-sub">${svc?svc.nome:'—'} · ${apt.data} ${apt.hora}</div>
      </div>
      <div class="nx-list-item-right">
        ${statusBadge(apt.status)}
        ${svc?`<span style="font-size:13px;color:var(--nx-accent);font-weight:700;">${fmt.moeda(svc.preco)}</span>`:''}
        <button class="apt-action-btn chat" data-id="${apt.id}" style="margin-top:4px;">💬 Chat</button>
      </div>
    `;
    li.querySelector('.apt-action-btn').addEventListener('click', e => { e.stopPropagation(); abrirChat(apt.id); });
    ul.appendChild(li);
  });
}


// CLIENTE: CHATS 

function renderChatsCliente() {
  const apts  = aptManager.listarDeCliente(currentUser.id);
  const ul    = document.getElementById('lista-chats-c');
  const empty = document.getElementById('empty-chats-c');
  ul.innerHTML = '';
  const validos = apts.filter(a => a.status !== 'recusado');
  if (validos.length===0) { empty.style.display='block'; return; }
  empty.style.display='none';

  validos.forEach(apt => {
    const prestador = authManager.buscarPorId(apt.prestadorId);
    const svcs      = ServiceManager.listarDePrestador(apt.prestadorId);
    const svc       = svcs.find(s=>s.id===apt.servicoId);
    const msgs      = chatManager.listar(apt.id);
    const ultima    = msgs.length>0 ? msgs[msgs.length-1] : null;
    const li = document.createElement('li');
    li.className = 'nx-list-item';
    li.innerHTML = `
      ${avatarHtml(prestador||{nome:'?'})}
      <div class="nx-list-item-info">
        <div class="nx-list-item-title">${prestador?prestador.nomeNegocio||prestador.nome:'—'}</div>
        <div class="nx-list-item-sub">${svc?svc.nome:'—'} · ${apt.data}</div>
        ${ultima?`<div style="font-size:11px;color:var(--nx-muted);margin-top:2px;">${ultima.texto.slice(0,40)}${ultima.texto.length>40?'…':''}</div>`:''}
      </div>
      <div class="nx-list-item-right">${statusBadge(apt.status)}</div>
    `;
    li.addEventListener('click', () => abrirChat(apt.id));
    ul.appendChild(li);
  });
}

// ── CHAT ──

function bindChat() {
  document.getElementById('btn-chat-back').addEventListener('click', fecharChat);
  document.getElementById('btn-chat-send').addEventListener('click', enviarMensagem);
  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); }
  });
}

function abrirChat(aptId) {
  const apt = aptManager.buscarPorId(aptId);
  if (!apt) return;
  currentChatApt = apt;

  // Definir nome e serviço no header
  const outroId = currentUser.perfil === 'prestador' ? apt.clienteId : apt.prestadorId;
  const outro   = authManager.buscarPorId(outroId);
  const svcs    = ServiceManager.listarDePrestador(apt.prestadorId);
  const svc     = svcs.find(s=>s.id===apt.servicoId);

  document.getElementById('chat-nome').textContent    = outro ? outro.nome : '—';
  document.getElementById('chat-servico').textContent = svc ? svc.nome : '—';
  // Avatar no chat: foto ou iniciais
  const chatAvatarEl = document.getElementById('chat-avatar');
  if (outro && outro.foto) {
    chatAvatarEl.innerHTML = `<img src="${outro.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  } else {
    chatAvatarEl.textContent = outro ? iniciaisNome(outro.nome) : '?';
  }

  renderMensagens();
  document.getElementById('chat-screen').classList.add('open');
  document.getElementById('chat-input').focus();
}

function fecharChat() {
  document.getElementById('chat-screen').classList.remove('open');
  currentChatApt = null;
  // re-render listas de chat
  if (currentUser.perfil === 'prestador') renderChatsPrestador();
  else renderChatsCliente();
}

function renderMensagens() {
  if (!currentChatApt) return;
  const msgs = chatManager.listar(currentChatApt.id);
  const el   = document.getElementById('chat-msgs');
  el.innerHTML = '';

  if (msgs.length === 0) {
    el.innerHTML = `<div class="chat-empty">Nenhuma mensagem ainda.<br>Diga olá! 👋</div>`;
    return;
  }

  msgs.forEach(msg => {
    const isMine = msg.remetenteId === currentUser.id;
    const hora   = fmt.horaMin(msg.timestamp);
    const div    = document.createElement('div');
    div.className = `chat-bubble ${isMine?'mine':'other'}`;
    div.innerHTML = `${msg.texto}<div class="chat-bubble-time">${hora}</div>`;
    el.appendChild(div);
  });

  // scroll para o fim
  el.scrollTop = el.scrollHeight;
}

function enviarMensagem() {
  if (!currentChatApt) return;
  const input = document.getElementById('chat-input');
  const texto = input.value.trim();
  if (!texto) return;
  chatManager.enviar(currentChatApt.id, currentUser.id, texto);
  input.value = '';
  renderMensagens();
}

// ── PERFIL: foto de perfil ──

// Preenche a tela de perfil (aba real, sufixo 'p' ou 'c')
function renderTelaPerfil(sufixo) {
  const u = authManager.getUsuarioAtual();
  if (!u) return;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('perfil-nome-' + sufixo, u.nome);
  setEl('perfil-email-' + sufixo, u.email);
  setEl('perfil-doc-' + sufixo, u.perfil === 'cliente' ? `CPF: ${u.cpf || '—'}` : `CNPJ: ${u.cnpj || '—'}${u.situacaoCnpj ? ' · '+u.situacaoCnpj : ''}`);
  // Endereço via ViaCEP
  const endEl = document.getElementById('perfil-endereco-' + sufixo);
  if (endEl) {
    endEl.textContent = u.cidade ? `${u.bairro ? u.bairro+', ' : ''}${u.cidade} — ${u.estado||''}` : '';
    const endWrap = document.getElementById('perfil-endereco-wrap-' + sufixo);
    if (endWrap) endWrap.style.display = u.cidade ? 'flex' : 'none';
  }

  // Negócio (só prestador)
  const negWrap = document.getElementById('perfil-negocio-wrap-p');
  const negTxt  = document.getElementById('perfil-negocio-p');
  if (negWrap && negTxt) {
    if (u.nomeNegocio) { negTxt.textContent = u.nomeNegocio; negWrap.style.display = 'flex'; }
    else negWrap.style.display = 'none';
  }

  // Foto
  const img = document.getElementById('perfil-foto-img-' + sufixo);
  const ph  = document.getElementById('perfil-foto-placeholder-' + sufixo);
  if (u.foto) {
    if (img) { img.src = u.foto; img.style.display = 'block'; }
    if (ph)  ph.style.display = 'none';
  } else {
    if (img) img.style.display = 'none';
    if (ph)  ph.style.display  = 'block';
  }
}

// Abre sheet de edição de foto (botão lápis no topbar)
function abrirSheetEditarPerfil() {
  const u = authManager.getUsuarioAtual();
  if (!u) return;
  fotoTemp = null;
  const img = document.getElementById('perfil-foto-img');
  const ph  = document.getElementById('perfil-foto-placeholder');
  if (u.foto) {
    if (img) { img.src = u.foto; img.style.display = 'block'; }
    if (ph)  ph.style.display = 'none';
  } else {
    if (img) img.style.display = 'none';
    if (ph)  ph.style.display  = 'block';
  }
  openSheet('perfil');
}

// Mantido por compatibilidade (não usado diretamente mais)
function abrirSheetPerfil() { abrirSheetEditarPerfil(); }

function salvarFotoPerfil() {
  if (!fotoTemp) { showToast('Selecione uma foto primeiro.'); return; }
  try {
    authManager.atualizarFoto(currentUser.id, fotoTemp);
    currentUser = authManager.getUsuarioAtual();
    showToast('Foto atualizada!');
    closeSheet('perfil');
    fotoTemp = null;
    // Atualizar foto na tela de perfil e nas listas
    const sufixo = currentUser.perfil === 'prestador' ? 'p' : 'c';
    renderTelaPerfil(sufixo);
    if (currentUser.perfil === 'prestador') {
      renderAgenda();
      renderChatsPrestador();
    } else {
      renderMeusAgendamentos();
      renderChatsCliente();
    }
  } catch(e) { showToast(e.message); }
}

// ── Trocar Senha ──
function bindSheetSenha() {
  const btnSalvar = document.getElementById('btn-salvar-senha');
  if (!btnSalvar) return;
  btnSalvar.addEventListener('click', () => {
    const atual    = document.getElementById('senha-atual').value;
    const nova     = document.getElementById('senha-nova').value;
    const confirma = document.getElementById('senha-confirma').value;
    const errEl    = document.getElementById('senha-error');
    errEl.textContent = '';

    if (!atual || !nova || !confirma) { errEl.textContent = 'Preencha todos os campos.'; return; }
    if (nova !== confirma)            { errEl.textContent = 'As senhas não coincidem.'; return; }
    if (nova.length < 4)              { errEl.textContent = 'A nova senha deve ter ao menos 4 caracteres.'; return; }

    try {
      const users = JSON.parse(localStorage.getItem('nx2_users') || '[]');
      const idx   = users.findIndex(u => u.id === currentUser.id);
      if (idx === -1) throw new Error('Usuário não encontrado.');
      if (users[idx].senha !== atual) { errEl.textContent = 'Senha atual incorreta.'; return; }
      users[idx].senha = nova;
      localStorage.setItem('nx2_users', JSON.stringify(users));
      // Atualizar sessão
      const session = { ...currentUser, senha: nova };
      // sessão por aba — sessionStorage
      sessionStorage.setItem('nx2_session', JSON.stringify(session));
      currentUser = session;
      // Limpar campos
      ['senha-atual','senha-nova','senha-confirma'].forEach(id => document.getElementById(id).value = '');
      closeSheet('senha');
      showToast('Senha atualizada com sucesso!');
    } catch(e) { errEl.textContent = e.message; }
  });
}


// ── GPS: MAPA DE LOCALIZAÇÃO ──

let _mapaLeaflet = null;

function abrirMapaUsuario(lat, lng) {
  openSheet('mapa');
  setTimeout(() => {
    const container = document.getElementById('mapa-leaflet');
    if (!container) return;
    if (_mapaLeaflet) {
      _mapaLeaflet.setView([lat, lng], 13);
    } else {
      _mapaLeaflet = L.map('mapa-leaflet').setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>'
      }).addTo(_mapaLeaflet);
    }
    // Limpar marcadores
    _mapaLeaflet.eachLayer(layer => {
      if (layer instanceof L.Marker) _mapaLeaflet.removeLayer(layer);
    });
    // Marcador do usuário
    const iconUser = L.divIcon({
      className: '',
      html: '<div style="width:18px;height:18px;background:#2dd4a0;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 5px rgba(45,212,160,0.25);"></div>',
      iconSize: [18,18], iconAnchor: [9,9]
    });
    L.marker([lat, lng], { icon: iconUser })
      .addTo(_mapaLeaflet)
      .bindPopup('<b>📍 Você está aqui</b>')
      .openPopup();
    // Marcadores dos prestadores
    authManager.listarPrestadores().forEach(async p => {
      if (!p.cidade) return;
      const coords = await coordenadasDePrestador(p);
      if (!coords) return;
      const km = haversineKm(lat, lng, coords.lat, coords.lng);
      const cor = km <= RAIO_KM ? '#2dd4a0' : '#5b8dee';
      const iconP = L.divIcon({
        className: '',
        html: `<div style="background:${cor};color:#000;font-size:10px;font-weight:800;padding:4px 8px;border-radius:8px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.35);">${p.nomeNegocio||p.nome}</div>`,
        iconAnchor: [40,20]
      });
      L.marker([coords.lat, coords.lng], { icon: iconP })
        .addTo(_mapaLeaflet)
        .bindPopup(`<b>${p.nomeNegocio||p.nome}</b><br>${p.cidade}${p.estado?', '+p.estado:''}<br><b>${km.toFixed(1)} km</b> de você`);
    });
    setTimeout(() => _mapaLeaflet.invalidateSize(), 300);
  }, 150);
}


// SETUP INICIAL

document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  if (authManager.estaLogado()) iniciarApp();
});
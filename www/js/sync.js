
// ─────────────────────────────────────────────
// CONFIGURAÇÃO SUPABASE
// ─────────────────────────────────────────────
const SUPABASE_URL = 'https://ipowilwiassjrzkhqcjr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwb3dpbHdpYXNzanJ6a2hxY2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTEzMzMsImV4cCI6MjA5NjUyNzMzM30.zLcWFXin28BSeTn0L9gsmuXMd-3tPWDHUC0BRmQtEg4';

const SYNC_CONFIGURADO =
  SUPABASE_URL.startsWith('https://') &&
  SUPABASE_URL.includes('.supabase.co') &&
  !SUPABASE_KEY.includes('COLOQUE_SUA');

// ─────────────────────────────────────────────
// HEADERS PADRÃO
// ─────────────────────────────────────────────
function _headersSupabase() {
  return {
    'apikey':        SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  };
}

// ─────────────────────────────────────────────
// PUSH — envia um registro para o Supabase
// ─────────────────────────────────────────────
async function enviarParaNuvem(registro) {
  if (!SYNC_CONFIGURADO) {
    console.warn('[Sync] Supabase não configurado. Configure a URL e KEY em sync.js');
    return null;
  }
  try {
    const payload = { ...registro };
    if (payload.lat == null) delete payload.lat;
    if (payload.lng == null) delete payload.lng;

    const resp = await fetch(SUPABASE_URL + '/rest/v1/registros', {
      method:  'POST',
      headers: _headersSupabase(),
      body:    JSON.stringify(payload)
    });
    if (!resp.ok) {
      const detalhe = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${detalhe}`);
    }
    const criado = await resp.json();
    console.log('[Sync] Salvo na nuvem:', criado);
    return Array.isArray(criado) ? criado[0] : criado;
  } catch (e) {
    console.error('[Sync] Falha ao enviar:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// PULL — busca registros do Supabase
// ─────────────────────────────────────────────
async function buscarDaNuvem() {
  if (!SYNC_CONFIGURADO) return [];
  try {
    const resp = await fetch(
      SUPABASE_URL + '/rest/v1/registros?order=criado_em.desc&limit=50',
      { headers: _headersSupabase() }
    );
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const dados = await resp.json();
    console.log('[Sync] Registros da nuvem:', dados.length);
    return dados;
  } catch (e) {
    console.error('[Sync] Falha ao buscar:', e.message);
    return [];
  }
}

// ─────────────────────────────────────────────
// SYNC COMPLETO — envia pendentes + puxa da nuvem
// ─────────────────────────────────────────────
async function sincronizar() {
  if (!SYNC_CONFIGURADO) throw new Error('Supabase não configurado em sync.js');

  // 1. Pegar fila de pendentes do localStorage
  const pendentes = JSON.parse(localStorage.getItem('nx2_pendentes') || '[]');
  let enviados = 0;
  const falhas = [];

  // 2. Enviar cada pendente
  for (const reg of pendentes) {
    const resultado = await enviarParaNuvem(reg);
    if (resultado) enviados++;
    else falhas.push(reg);
  }

  // 3. Manter na fila apenas o que falhou
  localStorage.setItem('nx2_pendentes', JSON.stringify(falhas));

  // 4. Puxar dados da nuvem e salvar em cache
  const remoto = await buscarDaNuvem();
  localStorage.setItem('nx2_cache_nuvem', JSON.stringify(remoto));
  localStorage.setItem('nx2_cache_nuvem_ts', Date.now().toString());

  console.log(`[Sync] ${enviados} enviados, ${falhas.length} falhas, ${remoto.length} recebidos`);
  return remoto;
}

// ─────────────────────────────────────────────
// SALVAR REGISTRO LOCAL (fila pendente)
// Chamado pelo botão "Salvar Local"
// ─────────────────────────────────────────────
function salvarRegistroExemplo(resultadoId) {
  const el        = document.getElementById(resultadoId);
  const pendentes = JSON.parse(localStorage.getItem('nx2_pendentes') || '[]');

  // Pegar última posição GPS (se existir)
  const posSalva = JSON.parse(localStorage.getItem('ultima_posicao') || 'null');

  const novo = {
    titulo: 'Registro Nextime ' + new Date().toLocaleString('pt-BR'),
    dados:  {
      app:        'Nextime',
      versao:     '2.0',
      gerado_em:  new Date().toISOString(),
      agendamentos: JSON.parse(localStorage.getItem('nx2_appointments') || '[]').length
    },
    lat: posSalva ? parseFloat(posSalva.lat) : null,
    lng: posSalva ? parseFloat(posSalva.lng) : null
  };

  pendentes.push(novo);
  localStorage.setItem('nx2_pendentes', JSON.stringify(pendentes));

  if (el) {
    el.textContent = `✅ Salvo localmente. Pendentes: ${pendentes.length}`;
    el.style.color = 'var(--accent)';
  }
  console.log('[Sync] Registro salvo na fila:', novo);
}

// ─────────────────────────────────────────────
// EXECUTAR SYNC (chamado pelo botão)
// ─────────────────────────────────────────────
async function executarSync(resultadoId) {
  const el = document.getElementById(resultadoId);

  if (!SYNC_CONFIGURADO) {
    if (el) {
      el.textContent = '⚠️ Configure a URL e KEY do Supabase em js/sync.js';
      el.style.color = 'var(--yellow)';
    }
    return;
  }

  if (el) {
    el.innerHTML = '<span class="api-loading"><span class="api-spinner"></span> Sincronizando com a nuvem…</span>';
    el.style.color = 'var(--text-muted)';
  }

  try {
    const remoto = await sincronizar();
    if (el) {
      el.textContent = `✅ Sincronizado! ${remoto.length} registro(s) na nuvem.`;
      el.style.color = 'var(--accent)';
    }
  } catch (e) {
    if (el) {
      el.textContent = '⚠️ Erro: ' + e.message;
      el.style.color = 'var(--red)';
    }
  }
}

// ─────────────────────────────────────────────
// STATUS DE CONFIGURAÇÃO
// ─────────────────────────────────────────────
function syncConfigurado() {
  return SYNC_CONFIGURADO;
}

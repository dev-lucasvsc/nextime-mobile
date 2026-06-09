/**
 * notificacoes.js — Nextime v2
 * Disciplina: Desenvolvimento Mobile — Unieuro 2025
 *
 * Implementa notificações locais com duas abordagens:
 *  - Notification API do navegador (npm start / browser)
 *  - cordova-plugin-local-notification (APK Android)
 */

// ─────────────────────────────────────────────
// FLAG: plugin pronto após deviceready
// ─────────────────────────────────────────────
let _cordovaNotifPronto = false;

document.addEventListener('deviceready', function() {
  _cordovaNotifPronto = true;
  console.log('[Notif] deviceready disparou — plugin pronto:', !!(window.cordova && cordova.plugins && cordova.plugins.notification));
}, false);

// Garantir que a flag seja setada mesmo se deviceready já disparou
if (typeof cordova !== 'undefined' && cordova.plugins) {
  _cordovaNotifPronto = true;
}

// Helper: verifica se o plugin está disponível
function _pluginDisponivel() {
  return (
    (window.cordova || typeof cordova !== 'undefined') &&
    typeof cordova !== 'undefined' &&
    cordova.plugins &&
    cordova.plugins.notification &&
    cordova.plugins.notification.local
  );
}

// ─────────────────────────────────────────────
// PEDIR PERMISSÃO
// ─────────────────────────────────────────────
function pedirPermissaoNotif(resultadoId) {
  const el = document.getElementById(resultadoId);

  // Caso 1: APK Cordova com plugin instalado e pronto
  if (_pluginDisponivel()) {
    cordova.plugins.notification.local.requestPermission(function(granted) {
      if (el) {
        el.textContent  = granted ? '✅ Permissão concedida!' : '⚠️ Permissão negada.';
        el.style.color  = granted ? 'var(--accent)' : 'var(--red)';
      }
    });
    return;
  }

  // Caso 2: navegador (Notification API)
  if (!('Notification' in window)) {
    if (el) { el.textContent = '⚠️ Notificações locais só funcionam no APK instalado.'; el.style.color = 'var(--red)'; }
    return;
  }

  if (Notification.permission === 'granted') {
    if (el) { el.textContent = '✅ Permissão já concedida!'; el.style.color = 'var(--accent)'; }
    return;
  }

  Notification.requestPermission().then(function(resultado) {
    if (el) {
      const ok = resultado === 'granted';
      el.textContent = ok
        ? '✅ Permissão concedida!'
        : '⚠️ Permissão negada. Habilite nas configurações do navegador.';
      el.style.color = ok ? 'var(--accent)' : 'var(--red)';
    }
  });
}

// ─────────────────────────────────────────────
// ENVIAR NOTIFICAÇÃO IMEDIATA
// ─────────────────────────────────────────────
function enviarNotificacao(resultadoId) {
  const el     = document.getElementById(resultadoId);
  const titulo = 'Nextime';
  const texto  = 'Notificação de teste — ' + _formatarHoraNotif(Date.now());

  // Caso 1: APK Cordova
  if (_pluginDisponivel()) {
    cordova.plugins.notification.local.schedule({
      id:         Date.now(),
      title:      titulo,
      text:       texto,
      foreground: true,
      icon:       'res://ic_launcher'
    });
    if (el) { el.textContent = '✅ Notificação enviada (Cordova).'; el.style.color = 'var(--accent)'; }
    return;
  }

  // Caso 2: navegador
  if (!('Notification' in window)) {
    if (el) { el.textContent = '⚠️ Notificações não suportadas.'; el.style.color = 'var(--red)'; }
    return;
  }

  if (Notification.permission !== 'granted') {
    if (el) { el.textContent = '⚠️ Clique em "Permitir notificações" primeiro.'; el.style.color = 'var(--yellow)'; }
    return;
  }

  const notif = new Notification(titulo, {
    body: texto,
    icon: 'img/logo.png'
  });

  notif.onclick = function() { window.focus(); notif.close(); };

  if (el) { el.textContent = '✅ Notificação enviada às ' + _formatarHoraNotif(Date.now()); el.style.color = 'var(--accent)'; }
}

// ─────────────────────────────────────────────
// AGENDAR NOTIFICAÇÃO (só APK)
// ─────────────────────────────────────────────
function agendarNotificacao(segundos, titulo, texto) {
  if (!_pluginDisponivel()) {
    console.log('[Notif] Agendamento só funciona no APK instalado.');
    return false;
  }
  cordova.plugins.notification.local.schedule({
    id:         Date.now(),
    title:      titulo,
    text:       texto,
    trigger:    { at: new Date(Date.now() + segundos * 1000) },
    foreground: true
  });
  return true;
}

// ─────────────────────────────────────────────
// NOTIFICAÇÃO DE AGENDAMENTO (integrada ao fluxo do app)
// Chamada automaticamente quando um agendamento é confirmado/recusado
// ─────────────────────────────────────────────
function notificarStatusAgendamento(status, nomeServico, nomeUsuario) {
  const msgs = {
    confirmado: { titulo: '✅ Agendamento confirmado!', texto: `${nomeServico} com ${nomeUsuario} foi confirmado.` },
    recusado:   { titulo: '❌ Agendamento recusado',    texto: `${nomeServico} foi recusado por ${nomeUsuario}.` },
    concluido:  { titulo: '🎉 Serviço concluído!',      texto: `${nomeServico} foi marcado como concluído.` },
    cancelado:  { titulo: '⚠️ Agendamento cancelado',   texto: `${nomeServico} foi cancelado.` },
  };

  const msg = msgs[status];
  if (!msg) return;

  // APK
  if (_pluginDisponivel()) {
    cordova.plugins.notification.local.schedule({
      id: Date.now(), title: msg.titulo, text: msg.texto, foreground: true
    });
    return;
  }

  // Browser
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(msg.titulo, { body: msg.texto, icon: 'img/logo.png' });
  }
}

// ─────────────────────────────────────────────
// UTILITÁRIO INTERNO
// ─────────────────────────────────────────────
function _formatarHoraNotif(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
/* global AFRAME */
// Écran d'accueil (nom, code de salle) puis connexion à la partie.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var scene = document.querySelector('a-scene');

  function randomRoom() {
    var letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    var bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    for (var i = 0; i < 4; i++) out += letters[bytes[i] % letters.length];
    return out;
  }

  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* stockage indisponible */ }
  }

  $('name').value = load('dominoes.name') || '';
  $('room').value = (params.get('room') || '').toUpperCase();
  $('mic').checked = load('dominoes.mic') === '1';
  $('new-room').addEventListener('click', function () { $('room').value = randomRoom(); });
  $('room').addEventListener('input', function () {
    this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
  if (!$('room').value) $('join').textContent = 'Créer une salle et jouer';
  $('room').addEventListener('input', function () {
    $('join').textContent = this.value ? 'Rejoindre la table' : 'Créer une salle et jouer';
  });

  var toastTimer = null;
  function toast(text, error) {
    var el = $('toast');
    el.textContent = text;
    el.className = 'show' + (error ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = ''; }, 3500);
  }
  window.addEventListener('domino-toast', function (e) { toast(e.detail.text, e.detail.error); });

  function inviteLink(room) {
    return location.origin + location.pathname + '?room=' + room;
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    var ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok ? Promise.resolve() : Promise.reject(new Error('copie impossible'));
  }

  $('join-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('name').value.trim();
    var room = $('room').value.trim().toUpperCase() || randomRoom();
    if (!name) {
      $('join-error').textContent = 'Indiquez votre prénom.';
      return;
    }
    if (!/^[A-Z0-9]{3,8}$/.test(room)) {
      $('join-error').textContent = 'Le code de salle fait 3 à 8 lettres ou chiffres.';
      return;
    }
    save('dominoes.name', name);
    save('dominoes.mic', $('mic').checked ? '1' : '0');
    history.replaceState(null, '', '?room=' + room);

    // Les contextes audio doivent être débloqués par un geste de l'utilisateur.
    window.DominoSound.context();
    try { AFRAME.THREE.AudioContext.getContext().resume(); } catch (err) { /* ignoré */ }

    $('lobby').hidden = true;
    $('hud').hidden = false;
    $('hud-room').textContent = 'Salle ' + room;

    var start = function () { connect(room, name, $('mic').checked); };
    if (scene.hasLoaded) start();
    else scene.addEventListener('loaded', start);
  });

  // Panneau d'état et boutons en HTML (hors VR), alimentés par le composant de jeu.
  window.addEventListener('domino-panel', function (e) {
    var box = $('status');
    box.innerHTML = '';
    e.detail.forEach(function (line, i) {
      var style = typeof line === 'string' ? { text: line } : line;
      var div = document.createElement('div');
      div.textContent = style.text;
      if (style.color) div.style.color = style.color;
      if (style.bold || i === 0) div.style.fontWeight = '700';
      box.appendChild(div);
    });
  });

  window.addEventListener('domino-buttons', function (e) {
    var bar = $('actions');
    bar.innerHTML = '';
    var game = document.getElementById('game').components['domino-game'];
    e.detail.forEach(function (b) {
      if (b.id === 'mic' || b.id === 'up' || b.id === 'down') return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = b.label;
      btn.disabled = b.enabled === false;
      btn.style.background = b.color;
      btn.addEventListener('click', function () { game.onButton(b.id); });
      bar.appendChild(btn);
    });
    bar.hidden = !bar.childElementCount;
  });

  scene.addEventListener('enter-vr', function () { document.body.classList.add('in-vr'); });
  scene.addEventListener('exit-vr', function () { document.body.classList.remove('in-vr'); });

  function connect(room, name, wantMic) {
    var game = document.getElementById('game').components['domino-game'];
    $('status').hidden = false;
    var conn = new window.DominoNet.Connection(room, name);
    var voice = window.RTCPeerConnection ? new window.DominoVoice.VoiceChat(conn) : null;
    game.connect(conn, voice);

    conn.on('status', function (status) {
      $('hud-status').textContent = status === 'connected' ? '● en ligne' : '○ reconnexion…';
      $('hud-status').className = status;
    });

    function setMicLabel(on) {
      $('hud-mic').textContent = on ? '🎤 Micro : oui' : '🎤 Micro : non';
      $('hud-mic').classList.toggle('on', on);
    }
    window.addEventListener('domino-mic', function (e) { setMicLabel(e.detail); });
    $('hud-mic').hidden = !voice;
    $('hud-mic').addEventListener('click', function () { game.toggleMic(); });

    $('copy-link').addEventListener('click', function () {
      copy(inviteLink(room)).then(function () {
        toast('Lien copié : envoyez-le à vos amis !');
      }, function () {
        window.prompt('Copiez ce lien et envoyez-le à vos amis :', inviteLink(room));
      });
    });

    if (wantMic && voice) {
      voice.setMic(true).then(function () {
        game.setMic(true);
        setMicLabel(true);
      }).catch(function (err) {
        toast('Micro indisponible : ' + err.message, true);
      });
    }
  }
})();

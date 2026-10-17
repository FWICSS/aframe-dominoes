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

  // Classement et bandeau de tour en HTML (hors VR), alimentés par le composant de jeu.
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  window.addEventListener('domino-hud', function (e) {
    var hud = e.detail;
    var board = $('scoreboard');
    board.innerHTML = '';
    board.appendChild(el('h2', null, 'Classement'));
    if (hud.progress) board.appendChild(el('p', 'progress', hud.progress));
    var list = el('ol');
    hud.scores.forEach(function (row) {
      var li = el('li', (row.me ? 'me' : '') + (row.turn ? ' turn' : ''));
      if (row.turn) li.setAttribute('aria-current', 'true');
      li.appendChild(el('span', 'name', row.name + (row.me ? ' (vous)' : '')));
      if (row.score != null) li.appendChild(el('span', 'score', row.score + ' pts'));
      if (row.extra) li.appendChild(el('span', 'extra', row.extra));
      list.appendChild(li);
    });
    board.appendChild(list);
    board.hidden = !hud.scores.length;

    var banner = $('banner');
    banner.innerHTML = '';
    banner.className = hud.alert ? 'alert' : '';
    if (hud.title) banner.appendChild(el('strong', null, hud.title));
    if (hud.hint && hud.hint !== hud.title) banner.appendChild(el('span', null, hud.hint));
    hud.details.forEach(function (d) { banner.appendChild(el('small', null, typeof d === 'string' ? d : d.text)); });
    banner.hidden = !banner.childElementCount;
  });

  window.addEventListener('domino-buttons', function (e) {
    var bar = $('actions');
    bar.innerHTML = '';
    var game = document.getElementById('game').components['domino-game'];
    e.detail.forEach(function (b) {
      if (b.id === 'mic' || b.id === 'up' || b.id === 'down' || b.id === 'emotes' || b.id.indexOf('emote:') === 0) return;
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
    $('emotes').hidden = false;
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

    // Barre de réactions rapides.
    var bar = $('emotes');
    game.emotes().forEach(function (text, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'secondary';
      btn.textContent = text;
      btn.title = 'Envoyer « ' + text + ' » aux autres joueurs';
      btn.addEventListener('click', function () { game.sendEmote(i); });
      bar.appendChild(btn);
    });
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

// Connexion WebSocket au serveur de jeu, avec reconnexion automatique.
(function () {
  'use strict';

  function randomId() {
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  // Identifiant stable pour l'onglet : permet de retrouver sa place après un rechargement.
  function clientId() {
    var id = null;
    try { id = sessionStorage.getItem('dominoes.clientId'); } catch (e) { /* stockage indisponible */ }
    if (!id) {
      id = randomId();
      try { sessionStorage.setItem('dominoes.clientId', id); } catch (e) { /* idem */ }
    }
    return id;
  }

  function Connection(room, name) {
    this.room = room;
    this.name = name;
    this.clientId = clientId();
    this.handlers = {};
    this.retry = 0;
    this.closed = false;
    this.open();
  }

  Connection.prototype.on = function (type, fn) {
    (this.handlers[type] = this.handlers[type] || []).push(fn);
    return this;
  };

  Connection.prototype.emit = function (type, data) {
    (this.handlers[type] || []).forEach(function (fn) { fn(data); });
  };

  Connection.prototype.open = function () {
    var self = this;
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    var ws = new WebSocket(proto + '//' + location.host + '/ws');
    this.ws = ws;
    ws.onopen = function () {
      self.retry = 0;
      ws.send(JSON.stringify({ t: 'join', room: self.room, name: self.name, clientId: self.clientId }));
      self.emit('status', 'connected');
    };
    ws.onmessage = function (e) {
      var msg;
      try { msg = JSON.parse(e.data); } catch (err) { return; }
      self.emit(msg.t, msg);
    };
    ws.onclose = function (e) {
      if (self.ws !== ws) return;
      self.emit('status', 'disconnected');
      if (self.closed || e.code === 4000) return;
      var delay = Math.min(10000, 500 * Math.pow(2, self.retry++));
      setTimeout(function () { if (!self.closed) self.open(); }, delay);
    };
  };

  Connection.prototype.send = function (msg) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  };

  Connection.prototype.close = function () {
    this.closed = true;
    if (this.ws) this.ws.close();
  };

  window.DominoNet = { Connection: Connection };
})();

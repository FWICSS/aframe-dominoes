// Chat vocal pair-à-pair (WebRTC) ; la signalisation passe par le serveur de jeu.
// Chaque paire de joueurs ouvre une connexion : celui qui a le plus petit identifiant fait l'offre.
(function () {
  'use strict';

  var ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

  function VoiceChat(conn) {
    this.conn = conn;
    this.myId = null;
    this.peers = new Map(); // id -> { pc, queue, remoteSet }
    this.micStream = null;
    this.onStream = function () {};
    this.onPeerGone = function () {};
    var self = this;
    conn.on('rtc', function (msg) { self.handleSignal(msg.from, msg.data); });
    conn.on('status', function (status) { if (status === 'connected') self.closeAll(); });
  }

  VoiceChat.prototype.micTrack = function () {
    return this.micStream ? this.micStream.getAudioTracks()[0] : null;
  };

  VoiceChat.prototype.setMic = function (enabled) {
    var self = this;
    if (!enabled) {
      if (this.micStream) this.micStream.getTracks().forEach(function (t) { t.stop(); });
      this.micStream = null;
      this.applyTrack();
      return Promise.resolve(false);
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error('Micro indisponible (HTTPS requis)'));
    }
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    }).then(function (stream) {
      self.micStream = stream;
      self.applyTrack();
      return true;
    });
  };

  VoiceChat.prototype.applyTrack = function () {
    var track = this.micTrack();
    this.peers.forEach(function (peer) {
      peer.pc.getTransceivers().forEach(function (tr) {
        if (tr.sender) tr.sender.replaceTrack(track).catch(function () {});
      });
    });
  };

  // ids : joueurs humains connectés dans la salle (hors soi-même).
  VoiceChat.prototype.updatePeers = function (myId, ids) {
    var self = this;
    this.myId = myId;
    var wanted = new Set(ids);
    this.peers.forEach(function (_, id) { if (!wanted.has(id)) self.closePeer(id); });
    ids.forEach(function (id) {
      if (!self.peers.has(id) && myId < id) self.call(id);
    });
  };

  VoiceChat.prototype.createPeer = function (id) {
    var self = this;
    var pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    var peer = { pc: pc, queue: [], remoteSet: false };
    this.peers.set(id, peer);
    pc.onicecandidate = function (e) {
      if (e.candidate) self.conn.send({ t: 'rtc', to: id, data: { type: 'ice', candidate: e.candidate } });
    };
    pc.ontrack = function (e) {
      var stream = e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]);
      self.onStream(id, stream);
    };
    pc.oniceconnectionstatechange = function () {
      if (pc.iceConnectionState === 'failed') {
        self.closePeer(id);
        // L'appelant retentera à la prochaine mise à jour de la salle.
      }
    };
    return peer;
  };

  VoiceChat.prototype.call = function (id) {
    var self = this;
    var peer = this.createPeer(id);
    var tr = peer.pc.addTransceiver('audio', { direction: 'sendrecv' });
    var track = this.micTrack();
    if (track) tr.sender.replaceTrack(track);
    peer.pc.createOffer()
      .then(function (offer) { return peer.pc.setLocalDescription(offer); })
      .then(function () {
        self.conn.send({ t: 'rtc', to: id, data: { type: 'offer', sdp: peer.pc.localDescription } });
      })
      .catch(function (err) { console.warn('offre WebRTC', err); });
  };

  VoiceChat.prototype.flush = function (peer) {
    peer.remoteSet = true;
    peer.queue.forEach(function (c) { peer.pc.addIceCandidate(c).catch(function () {}); });
    peer.queue = [];
  };

  VoiceChat.prototype.handleSignal = function (from, data) {
    var self = this;
    if (!data || typeof data.type !== 'string') return;
    var peer = this.peers.get(from);
    if (data.type === 'offer') {
      if (peer) this.closePeer(from);
      peer = this.createPeer(from);
      peer.pc.setRemoteDescription(data.sdp)
        .then(function () {
          self.flush(peer);
          var track = self.micTrack();
          peer.pc.getTransceivers().forEach(function (tr) {
            tr.direction = 'sendrecv';
            if (track) tr.sender.replaceTrack(track);
          });
          return peer.pc.createAnswer();
        })
        .then(function (answer) { return peer.pc.setLocalDescription(answer); })
        .then(function () {
          self.conn.send({ t: 'rtc', to: from, data: { type: 'answer', sdp: peer.pc.localDescription } });
        })
        .catch(function (err) { console.warn('réponse WebRTC', err); });
    } else if (data.type === 'answer' && peer) {
      peer.pc.setRemoteDescription(data.sdp).then(function () { self.flush(peer); }).catch(function () {});
    } else if (data.type === 'ice' && peer) {
      if (peer.remoteSet) peer.pc.addIceCandidate(data.candidate).catch(function () {});
      else peer.queue.push(data.candidate);
    }
  };

  VoiceChat.prototype.closePeer = function (id) {
    var peer = this.peers.get(id);
    if (!peer) return;
    peer.pc.close();
    this.peers.delete(id);
    this.onPeerGone(id);
  };

  VoiceChat.prototype.closeAll = function () {
    var self = this;
    Array.from(this.peers.keys()).forEach(function (id) { self.closePeer(id); });
  };

  window.DominoVoice = { VoiceChat: VoiceChat };
})();

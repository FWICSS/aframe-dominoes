/* global AFRAME */
// Avatars des autres joueurs : tête, buste, mains, nom et voix spatialisée.
(function () {
  'use strict';
  var THREE = AFRAME.THREE;
  var W = window.DominoWorld;
  var TX = window.DominoTextures;
  var TILE = window.DominoLayout.TILE;

  var COLORS = ['#e07a5f', '#3d8bd9', '#81b29a', '#f2cc8f', '#b48ead', '#ef8fb5', '#6cc4c4', '#c9a227'];
  var UP = new THREE.Vector3(0, 1, 0);

  function colorFor(id) {
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return COLORS[h % COLORS.length];
  }

  function Avatar(parentEl, member) {
    this.id = member.id;
    this.isBot = member.isBot;
    this.color = colorFor(member.id);
    this.root = new THREE.Group();
    parentEl.object3D.add(this.root);

    var skin = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.6 });
    var dark = new THREE.MeshStandardMaterial({ color: '#1d1d24', roughness: 0.3, metalness: 0.4 });
    var cloth = new THREE.MeshStandardMaterial({ color: new THREE.Color(this.color).multiplyScalar(0.55), roughness: 0.9 });

    // Tête (regarde vers -z).
    this.head = new THREE.Group();
    var skull = this.isBot
      ? new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.19, 0.2), skin)
      : new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), skin);
    skull.castShadow = true;
    this.head.add(skull);
    var visor = new THREE.Mesh(new THREE.BoxGeometry(this.isBot ? 0.17 : 0.15, 0.055, 0.05), dark);
    visor.position.set(0, 0.015, this.isBot ? -0.09 : -0.075);
    this.head.add(visor);
    var eyeMat = new THREE.MeshBasicMaterial({ color: this.isBot ? '#7ff7ff' : '#ffffff' });
    [-0.035, 0.035].forEach(function (x) {
      var eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), eyeMat);
      eye.position.set(x, 0.017, this.isBot ? -0.116 : -0.101);
      this.head.add(eye);
    }, this);
    if (this.isBot) {
      var antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 6), dark);
      antenna.position.y = 0.135;
      this.head.add(antenna);
      var tip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff5d5d' }));
      tip.position.y = 0.18;
      this.head.add(tip);
    }
    this.root.add(this.head);

    // Buste (suit la tête en position, et seulement son cap).
    this.body = new THREE.Group();
    var torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.32, 6, 16), cloth);
    torso.position.y = -0.42;
    torso.scale.set(1, 1, 0.65);
    torso.castShadow = true;
    this.body.add(torso);
    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.1, 10), skin);
    neck.position.y = -0.14;
    this.body.add(neck);
    this.root.add(this.body);

    // Mains.
    this.hands = [0, 1].map(function () {
      var hand = new THREE.Group();
      var palm = new THREE.Mesh(new THREE.SphereGeometry(0.038, 14, 10), skin);
      palm.scale.set(1, 0.7, 1.25);
      palm.castShadow = true;
      hand.add(palm);
      var held = new THREE.Mesh(W.roundedBox(TILE.W, TILE.T, TILE.L, 0.0028), new THREE.MeshStandardMaterial({ map: TX.tileBack(), roughness: 0.35 }));
      held.position.set(0, -0.02, -0.045);
      held.visible = false;
      hand.add(held);
      hand.userData.held = held;
      this.root.add(hand);
      return hand;
    }, this);

    // Étiquette du nom.
    this.labelCanvas = TX.canvas(512, 128);
    this.labelTex = TX.toTexture(this.labelCanvas);
    this.label = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.08), new THREE.MeshBasicMaterial({ map: this.labelTex, transparent: true, depthWrite: false }));
    this.root.add(this.label);
    this.labelKey = null;

    // Bulle de réaction au-dessus de la tête.
    this.bubbleCanvas = TX.canvas(512, 160);
    this.bubbleTex = TX.toTexture(this.bubbleCanvas);
    this.bubble = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.094), new THREE.MeshBasicMaterial({ map: this.bubbleTex, transparent: true, depthWrite: false }));
    this.bubble.visible = false;
    this.bubbleUntil = 0;
    this.root.add(this.bubble);

    this.target = {
      head: { p: new THREE.Vector3(), q: new THREE.Quaternion() },
      hands: [
        { p: new THREE.Vector3(), q: new THREE.Quaternion(), live: false },
        { p: new THREE.Vector3(), q: new THREE.Quaternion(), live: false },
      ],
    };
    this.hasPose = false;
    this.lastPose = 0;
    this.tablePos = null;
    this.audio = null;
    this.initialised = false;
  }

  Avatar.prototype.setInfo = function (member, isTurn, speaking) {
    var text = (member.isBot ? '🤖 ' : '') + member.name + (member.connected ? '' : ' (absent)');
    var key = text + isTurn + speaking;
    if (key === this.labelKey) return;
    this.labelKey = key;
    TX.drawLabel(this.labelCanvas.getContext('2d'), 512, 128, {
      text: text,
      fontSize: 54,
      background: isTurn ? 'rgba(201, 148, 26, 0.92)' : 'rgba(20, 16, 12, 0.78)',
      border: speaking ? '#7CFC9A' : null,
      radius: 40,
    });
    this.labelTex.needsUpdate = true;
  };

  Avatar.prototype.showEmote = function (text) {
    TX.drawLabel(this.bubbleCanvas.getContext('2d'), 512, 160, {
      text: text, fontSize: /^\p{Extended_Pictographic}/u.test(text) ? 96 : 60, background: 'rgba(255, 250, 235, 0.95)', color: '#2a2016', radius: 60,
    });
    this.bubbleTex.needsUpdate = true;
    this.bubble.visible = true;
    this.bubbleUntil = performance.now() + 2600;
  };

  Avatar.prototype.setTablePos = function (tablePos) {
    this.tablePos = tablePos;
  };

  // Pose par défaut d'un joueur assis à sa place (bots, joueurs sur ordinateur).
  Avatar.prototype.restPose = function (time) {
    var tp = this.tablePos == null ? 0.5 : this.tablePos;
    var q = W.seatQuaternion(tp);
    var dist = this.tablePos == null ? 1.4 : W.C.SEAT_R;
    var bob = Math.sin(time / 900 + tp) * 0.01;
    this.target.head.p.set(0, 1.18 + bob, dist).applyQuaternion(q);
    var look = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.45);
    this.target.head.q.copy(q).multiply(look);
    var self = this;
    [-1, 1].forEach(function (side, i) {
      var h = self.target.hands[i];
      h.p.set(side * 0.2, W.C.TABLE_Y + 0.05, W.C.SEAT_R - 0.3).applyQuaternion(q);
      h.q.copy(q);
    });
  };

  function readPose(arr, out) {
    out.p.set(arr[0], arr[1], arr[2]);
    out.q.set(arr[3], arr[4], arr[5], arr[6]);
  }

  Avatar.prototype.setPose = function (msg) {
    if (!msg.h) return;
    readPose(msg.h, this.target.head);
    var self = this;
    [msg.l, msg.r].forEach(function (pose, i) {
      var h = self.target.hands[i];
      h.live = !!pose;
      if (pose) readPose(pose, h);
      self.hands[i].userData.held.visible = !!(msg.g && msg.g[i]);
    });
    this.hasPose = true;
    this.lastPose = performance.now();
  };

  Avatar.prototype.tick = function (time, dt) {
    var live = this.hasPose && performance.now() - this.lastPose < 3000;
    if (!live) this.restPose(time);
    var k = this.initialised ? 1 - Math.pow(0.001, dt / 1000) : 1;
    this.initialised = true;
    this.head.position.lerp(this.target.head.p, k);
    this.head.quaternion.slerp(this.target.head.q, k);

    // Buste : sous la tête, orienté selon le cap de la tête uniquement.
    var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.head.quaternion);
    var yaw = Math.atan2(-fwd.x, -fwd.z);
    this.body.position.copy(this.head.position).add(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(0.06));
    this.body.quaternion.setFromAxisAngle(UP, yaw);

    var self = this;
    this.hands.forEach(function (hand, i) {
      var t = self.target.hands[i];
      if (live && !t.live) {
        // Joueur sans manettes : mains au repos devant lui.
        var side = i === 0 ? -1 : 1;
        t.p.set(side * 0.2, -0.38, -0.3).applyAxisAngle(UP, yaw).add(self.head.position);
        t.q.setFromAxisAngle(UP, yaw);
      }
      hand.position.lerp(t.p, k);
      hand.quaternion.slerp(t.q, k);
    });

    this.label.position.copy(this.head.position).add(new THREE.Vector3(0, 0.2, 0));
    if (this.bubble.visible) {
      var left = this.bubbleUntil - performance.now();
      this.bubble.visible = left > 0;
      this.bubble.position.copy(this.label.position).add(new THREE.Vector3(0, 0.1 + Math.min(0.03, (2600 - left) / 8000), 0));
      this.bubble.quaternion.copy(this.label.quaternion);
    }
    var cam = this.root.parent && AFRAME.scenes[0] && AFRAME.scenes[0].camera;
    if (cam) {
      var camPos = new THREE.Vector3();
      cam.getWorldPosition(camPos);
      camPos.y = this.label.position.y;
      this.label.lookAt(camPos);
    }
  };

  // Voix spatialisée : le son vient de la tête de l'avatar.
  Avatar.prototype.attachAudio = function (listener, stream) {
    this.detachAudio();
    var el = new Audio();
    el.muted = true; // nécessaire pour que Chrome alimente la Web Audio API avec le flux WebRTC
    el.srcObject = stream;
    el.play().catch(function () {});
    this.audioEl = el;
    try {
      var audio = new THREE.PositionalAudio(listener);
      audio.setMediaStreamSource(stream);
      audio.setRefDistance(0.8);
      audio.setRolloffFactor(1.2);
      this.head.add(audio);
      this.audio = audio;
    } catch (err) {
      el.muted = false;
    }
    // Indicateur « parle » : analyse du volume.
    try {
      var ctx = listener.context;
      var analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      this.analyser = analyser;
      this.levels = new Uint8Array(analyser.frequencyBinCount);
    } catch (err) {
      this.analyser = null;
    }
  };

  Avatar.prototype.isSpeaking = function () {
    if (!this.analyser) return false;
    this.analyser.getByteFrequencyData(this.levels);
    var sum = 0;
    for (var i = 0; i < this.levels.length; i++) sum += this.levels[i];
    return sum / this.levels.length > 18;
  };

  Avatar.prototype.detachAudio = function () {
    if (this.audio) {
      try { this.audio.disconnect(); } catch (e) { /* déjà déconnecté */ }
      this.head.remove(this.audio);
      this.audio = null;
    }
    if (this.audioEl) {
      this.audioEl.srcObject = null;
      this.audioEl = null;
    }
    this.analyser = null;
  };

  Avatar.prototype.dispose = function () {
    this.detachAudio();
    if (this.root.parent) this.root.parent.remove(this.root);
    this.root.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
    });
    this.labelTex.dispose();
    this.bubbleTex.dispose();
  };

  window.DominoAvatars = { Avatar: Avatar, colorFor: colorFor };
})();

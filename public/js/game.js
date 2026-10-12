/* global AFRAME */
// Cœur du client : affiche la partie reçue du serveur, anime les dominos et gère
// les interactions (souris, laser des manettes, saisie à la main / pincement).
(function () {
  'use strict';
  var THREE = AFRAME.THREE;
  var LAY = window.DominoLayout;
  var TILE = LAY.TILE;
  var W = window.DominoWorld;
  var C = W.C;
  var TX = window.DominoTextures;
  var SND = window.DominoSound;
  var Avatar = window.DominoAvatars.Avatar;

  var HAND_TILT = THREE.MathUtils.degToRad(70);
  var HAND_SPACING = TILE.W + 0.006;
  var GRAB_RADIUS = 0.09;
  var DROP_RADIUS = 0.13;
  var BUTTON_PINCH_RADIUS = 0.06;
  var POSE_INTERVAL = 66;
  var X_AXIS = new THREE.Vector3(1, 0, 0);
  var Y_AXIS = new THREE.Vector3(0, 1, 0);
  var Z_AXIS = new THREE.Vector3(0, 0, 1);
  var TOTAL_TILES = 28;
  // Réactions rapides (même ordre que côté serveur : on n'échange que l'index).
  var EMOTES = ['👍', '😂', 'Bien joué !', 'Oups !', 'À toi !', 'Hmm…'];

  // --- Matériaux et maillages des dominos ------------------------------------

  var tileGeo = W.roundedBox(TILE.W, TILE.T, TILE.L, 0.0028);
  var shared = null;
  var faceMats = {};
  var ghostMats = {};

  function sharedMats() {
    if (!shared) {
      shared = {
        side: new THREE.MeshStandardMaterial({ map: TX.tileSide(), roughness: 0.35 }),
        back: new THREE.MeshStandardMaterial({ map: TX.tileBack(), roughness: 0.35 }),
        pile: new THREE.MeshStandardMaterial({ map: TX.tileBack(), roughness: 0.35, emissive: '#000000' }),
      };
    }
    return shared;
  }

  function faceMat(id) {
    if (!faceMats[id]) faceMats[id] = new THREE.MeshStandardMaterial({ map: TX.tileFace(id), roughness: 0.3, emissive: '#000000' });
    return faceMats[id];
  }

  function ghostMat(id) {
    if (!ghostMats[id]) {
      ghostMats[id] = new THREE.MeshStandardMaterial({
        map: TX.tileFace(id), transparent: true, opacity: 0.5, emissive: '#2f7d32', emissiveIntensity: 0.6, depthWrite: false,
      });
    }
    return ghostMats[id];
  }

  // Ordre des faces de BoxGeometry : +x, -x, +y (face), -y (dos), +z, -z.
  function createTileMesh(kind, id) {
    var m = sharedMats();
    var top;
    var bottom = m.back;
    var side = m.side;
    if (kind === 'face') top = faceMat(id);
    else if (kind === 'ghost') top = bottom = side = ghostMat(id);
    else if (kind === 'pile') top = bottom = m.pile;
    else top = m.back;
    var mesh = new THREE.Mesh(tileGeo, [side, side, top, bottom, side, side]);
    mesh.castShadow = kind !== 'ghost';
    mesh.receiveShadow = kind !== 'ghost';
    return mesh;
  }

  // --- Transformations ----------------------------------------------------------

  function yawQuat(yaw) {
    return new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  }

  function flat(x, z, yaw, faceDown, lift) {
    var q = yawQuat(yaw);
    if (faceDown) q.multiply(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, Math.PI));
    return { p: new THREE.Vector3(x, C.TABLE_Y + TILE.T / 2 + (lift || 0), z), q: q };
  }

  // Domino debout devant un joueur, appuyé contre son chevalet, face tournée vers lui.
  function standing(tablePos, x, lift) {
    var sq = W.seatQuaternion(tablePos);
    var s = Math.sin(HAND_TILT);
    var c = Math.cos(HAND_TILT);
    var p = new THREE.Vector3(x, C.TABLE_Y + (s * TILE.L) / 2 + (c * TILE.T) / 2 + (lift || 0), C.HAND_Z - (c * TILE.L) / 2 + (s * TILE.T) / 2);
    p.applyQuaternion(sq);
    var q = sq.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, HAND_TILT));
    return { p: p, q: q };
  }

  // Domino posé à plat devant un joueur (mains révélées en fin de manche).
  function revealed(tablePos, x) {
    var sq = W.seatQuaternion(tablePos);
    var p = new THREE.Vector3(x, C.TABLE_Y + TILE.T / 2, C.HAND_Z - 0.06).applyQuaternion(sq);
    return { p: p, q: sq.clone() };
  }

  function hash(i) {
    var x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  // Pioche : dominos face cachée rangés en petit tas un peu désordonné.
  function pileSlot(i, cx, cz, angle) {
    var layer = Math.floor(i / 9);
    var cell = i % 9;
    var col = (cell % 3) - 1;
    var row = Math.floor(cell / 3) - 1;
    var lx = col * 0.042 + (hash(i) - 0.5) * 0.006 + (layer % 2) * 0.01;
    var lz = row * 0.064 + (hash(i + 50) - 0.5) * 0.006;
    var ca = Math.cos(angle);
    var sa = Math.sin(angle);
    var x = cx + lx * ca + lz * sa;
    var z = cz - lx * sa + lz * ca;
    var t = flat(x, z, angle + (hash(i + 99) - 0.5) * 0.3, true, layer * (TILE.T + 0.0005));
    return t;
  }

  function sameTransform(a, b) {
    return a.p.distanceToSquared(b.p) < 1e-8 && Math.abs(a.q.dot(b.q)) > 0.99999;
  }

  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // --- Composant principal ------------------------------------------------------

  AFRAME.registerComponent('domino-game', {
    init: function () {
      var self = this;
      this.sceneEl = this.el.sceneEl;
      this.rig = document.getElementById('rig');
      this.cameraEl = document.getElementById('camera');
      this.world = W.build(this.sceneEl, this.el);
      this.tiles = new Map();
      this.avatars = new Map();
      this.state = null;
      this.selected = null;
      this.handOrder = [];
      this.myPos = undefined;
      this.rigHeight = 0;
      this.heightAxis = 0;
      this.toastText = null;
      this.toastUntil = 0;
      this.lastPoseSent = 0;
      this.buttonsKey = null;
      this.micOn = false;
      this.listener = null;

      this.anchor = document.createElement('a-entity');
      this.el.appendChild(this.anchor);
      this.panel = document.createElement('a-entity');
      this.panel.setAttribute('ui-panel', { width: 0.76, height: 0.38 });
      this.panel.setAttribute('position', '0 1.7 -0.32');
      this.panel.setAttribute('rotation', '20 0 0');
      this.anchor.appendChild(this.panel);
      this.panel.addEventListener('loaded', function () { self.renderPanel(); });
      this.console = document.createElement('a-entity');
      this.console.setAttribute('position', '0.46 0.9 0.66');
      this.console.setAttribute('rotation', '-50 -35 0');
      this.anchor.appendChild(this.console);

      this.setupHands();
      this.sceneEl.addEventListener('enter-vr', function () { self.resetView(); });
      this.sceneEl.addEventListener('exit-vr', function () { self.resetView(); });
      this.placeRig(null);
      this.renderPanel();
    },

    // Appelé par app.js une fois connecté.
    connect: function (conn, voice) {
      var self = this;
      this.conn = conn;
      this.voice = voice;
      conn.on('state', function (s) { self.onState(s); });
      conn.on('pose', function (m) {
        var av = self.avatars.get(m.id);
        if (av) av.setPose(m);
      });
      conn.on('error', function (m) { self.toast(m.message, true); });
      conn.on('emote', function (m) {
        var text = EMOTES[m.e];
        if (!text) return;
        if (m.id === (self.state && self.state.you)) {
          self.toast('Vous : ' + text);
          return;
        }
        var av = self.avatars.get(m.id);
        if (av) av.showEmote(text);
        SND.click();
      });
      conn.on('status', function (status) {
        if (status === 'disconnected') self.toast('Connexion perdue, reconnexion…', true);
      });
      if (voice) {
        voice.onStream = function (id, stream) {
          var av = self.avatars.get(id);
          if (av) av.attachAudio(self.audioListener(), stream);
          else self.pendingStreams = Object.assign(self.pendingStreams || {}, { [id]: stream });
        };
        voice.onPeerGone = function (id) {
          var av = self.avatars.get(id);
          if (av) av.detachAudio();
        };
      }
    },

    audioListener: function () {
      if (!this.listener) {
        this.listener = new THREE.AudioListener();
        this.sceneEl.camera.add(this.listener);
      }
      if (this.listener.context.state === 'suspended') this.listener.context.resume();
      return this.listener;
    },

    // --- Placement du joueur -------------------------------------------------

    placeRig: function (tablePos) {
      this.myPos = tablePos;
      var angle = tablePos == null ? Math.PI / 4 : (tablePos * Math.PI) / 2;
      var dist = tablePos == null ? 1.45 : C.SEAT_R;
      this.rig.object3D.position.set(Math.sin(angle) * dist, this.rigHeight, Math.cos(angle) * dist);
      this.rig.object3D.rotation.set(0, angle, 0);
      this.anchor.object3D.rotation.set(0, angle, 0);
      // Les spectateurs sont debout plus loin : on rapproche les boutons d'eux.
      this.console.object3D.position.set(0.46, tablePos == null ? 1.1 : 0.9, tablePos == null ? 1.2 : 0.66);
      this.resetView();
    },

    // Le pupitre de boutons 3D ne sert qu'en VR ; hors VR, l'interface HTML prend le relais.
    syncConsole: function () {
      var inVR = this.sceneEl.is('vr-mode');
      this.console.object3D.visible = inVR;
      this.console.querySelectorAll('[ui-button]').forEach(function (b) {
        if (inVR) b.classList.add('clickable');
        else b.classList.remove('clickable');
      });
    },

    resetView: function () {
      var inVR = this.sceneEl.is('vr-mode');
      this.syncConsole();
      if (!inVR) {
        this.cameraEl.object3D.position.set(0, this.myPos == null ? 1.6 : 1.22, 0);
      }
      var lc = this.cameraEl.components['look-controls'];
      if (lc && lc.pitchObject && !inVR) {
        lc.pitchObject.rotation.x = this.myPos == null ? -0.55 : -0.62;
        lc.yawObject.rotation.y = 0;
      }
    },

    // --- Réception de l'état -------------------------------------------------

    onState: function (s) {
      var prev = this.state;
      this.state = s;
      var me = s.members.find(function (m) { return m.id === s.you; });
      var myPos = me ? me.tablePos : null;
      if (myPos !== this.myPos || !prev) this.placeRig(myPos);

      var g = s.game;
      var prevG = prev && prev.game;
      if (this.selected && !this.holding() && (!g || !this.legalSides(this.selected).length)) this.selected = null;

      this.updateFurniture();
      this.syncAvatars();
      this.handleEvents(prevG, g, prev);
      this.renderTiles(prevG);
      this.refreshHighlights();
      this.renderPanel();
      this.renderButtons();

      if (this.voice) {
        var others = s.members.filter(function (m) { return !m.isBot && m.connected && m.id !== s.you; }).map(function (m) { return m.id; });
        this.voice.updatePeers(s.you, others);
      }
      window.dispatchEvent(new CustomEvent('domino-state', { detail: s }));
    },

    seatPositions: function () {
      var map = {};
      this.state.members.forEach(function (m) { if (m.seat >= 0) map[m.seat] = m.tablePos; });
      return map;
    },

    mySeat: function () {
      return this.state && this.state.game ? this.state.mySeat : -1;
    },

    isMyTurn: function () {
      var g = this.state && this.state.game;
      return !!g && g.phase === 'playing' && g.turn === this.mySeat();
    },

    legalSides: function (tileId) {
      var g = this.state && this.state.game;
      if (!g || !this.isMyTurn()) return [];
      return g.legal.filter(function (m) { return m.tileId === tileId; }).map(function (m) { return m.side; });
    },

    updateFurniture: function () {
      var s = this.state;
      var g = s.game;
      var occupied = {};
      s.members.forEach(function (m) { if (m.tablePos != null) occupied[m.tablePos] = true; });
      var turnPos = g && g.phase === 'playing' ? this.seatPositions()[g.turn] : null;
      for (var p = 0; p < 4; p++) {
        this.world.chairs[p].visible = p !== this.myPos;
        this.world.racks[p].visible = !!occupied[p];
        this.world.markers[p].visible = p === turnPos;
      }
    },

    handleEvents: function (prevG, g, prev) {
      if (!g) return;
      var ev = g.lastEvent;
      var key = JSON.stringify(ev) + g.round;
      var isNew = this.lastEventKey !== undefined && this.lastEventKey !== key;
      this.lastEventKey = key;
      var names = g.seats.map(function (seat) { return seat.name; });
      if (isNew && ev) {
        if (ev.type === 'draw') SND.slide();
        if (ev.type === 'pass') this.toast(names[ev.seat] + ' passe son tour');
        if (ev.type === 'roundEnd') {
          if (g.roundResult.winner === this.mySeat()) SND.win();
          else if (this.mySeat() >= 0) SND.lose();
          else SND.win();
          this.pulse(0.6, 120);
        }
      }
      var myTurnNow = this.isMyTurn();
      var wasMyTurn = !!prevG && prevG.phase === 'playing' && prevG.turn === prev.mySeat && prevG.round === g.round;
      if (myTurnNow && !wasMyTurn) {
        SND.yourTurn();
        this.pulse(0.4, 80);
      }
    },

    // --- Avatars ----------------------------------------------------------------

    syncAvatars: function () {
      var self = this;
      var s = this.state;
      var g = s.game;
      var seen = new Set();
      s.members.forEach(function (m) {
        if (m.id === s.you) return;
        seen.add(m.id);
        var av = self.avatars.get(m.id);
        if (!av) {
          av = new Avatar(self.el, m);
          self.avatars.set(m.id, av);
          if (self.pendingStreams && self.pendingStreams[m.id]) {
            av.attachAudio(self.audioListener(), self.pendingStreams[m.id]);
            delete self.pendingStreams[m.id];
          }
        }
        av.member = m;
        av.setTablePos(m.tablePos);
        av.isTurn = !!g && g.phase === 'playing' && g.turn === m.seat;
      });
      this.avatars.forEach(function (av, id) {
        if (!seen.has(id)) {
          av.dispose();
          self.avatars.delete(id);
        }
      });
    },

    // --- Dominos ----------------------------------------------------------------

    desiredTiles: function () {
      var s = this.state;
      var g = s.game;
      var out = new Map();
      var self = this;
      function add(key, item) { item.key = key; out.set(key, item); }

      if (!g) {
        // Salle d'attente : tous les dominos mélangés au centre de la table.
        for (var i = 0; i < TOTAL_TILES; i++) {
          add('B:' + i, { kind: 'pile', role: 'pile', t: pileSlot(i, 0, 0, Math.PI / 4) });
        }
        return out;
      }

      var reveal = (g.phase === 'roundOver' || g.phase === 'gameOver') && g.roundResult;
      var places = LAY.layoutChain(g.chain, g.center);
      g.chain.forEach(function (t, idx) {
        var pl = places[idx];
        add('T:' + t.id, { kind: 'face', id: t.id, role: 'chain', index: idx, t: flat(pl.x, pl.z, pl.yaw, false) });
      });

      var seatPos = this.seatPositions();
      var mySeat = this.mySeat();
      var myTurn = this.isMyTurn();
      var inHand = 0;
      g.seats.forEach(function (seat, sIdx) {
        var tp = seatPos[sIdx];
        if (tp == null) return;
        inHand += seat.handCount;
        if (reveal) {
          var ids = g.roundResult.hands[sIdx];
          ids.forEach(function (id, k) {
            var x = (k - (ids.length - 1) / 2) * (TILE.W + 0.005);
            add('T:' + id, { kind: 'face', id: id, role: 'reveal', seat: sIdx, t: revealed(tp, x) });
          });
        } else if (sIdx === mySeat && g.hand) {
          var hand = self.orderedHand(g.hand);
          hand.forEach(function (id, k) {
            var x = (k - (hand.length - 1) / 2) * HAND_SPACING;
            var legal = myTurn && self.legalSides(id).length > 0;
            var selected = self.selected === id;
            add('T:' + id, {
              kind: 'face', id: id, role: 'hand', seat: sIdx, legal: legal, selected: selected,
              clickable: true, t: standing(tp, x, selected ? 0.03 : 0),
            });
          });
        } else {
          for (var k = 0; k < seat.handCount; k++) {
            var x = (k - (seat.handCount - 1) / 2) * HAND_SPACING;
            add('H:' + tp + ':' + k, { kind: 'back', role: 'hand', seat: sIdx, t: standing(tp, x) });
          }
        }
      });

      var pileCount = TOTAL_TILES - g.chain.length - inHand;
      var canDraw = g.canDraw;
      for (var b = 0; b < pileCount; b++) {
        add('B:' + b, { kind: 'pile', role: 'pile', clickable: canDraw, t: pileSlot(b, C.PILE.x, C.PILE.z, Math.PI / 4) });
      }

      // Aperçus « fantômes » des emplacements possibles pour le domino choisi.
      if (!reveal && this.selected) {
        this.legalSides(this.selected).forEach(function (side) {
          var pl = LAY.previewPlacement(g.chain, g.center, self.selected, side);
          var oriented = LAY.orientFor(g.chain, self.selected, side);
          add('G:' + side, { kind: 'ghost', id: self.selected, role: 'ghost', side: side, clickable: true, oriented: oriented, t: flat(pl.x, pl.z, pl.yaw, false, 0.0015) });
        });
      }
      return out;
    },

    renderTiles: function (prevG) {
      var self = this;
      var g = this.state.game;
      var desired = this.desiredTiles();
      var removed = [];
      this.tiles.forEach(function (entry, key) {
        var want = desired.get(key);
        if (!want || want.kind !== entry.kind || (want.kind === 'ghost' && want.id !== entry.id)) {
          removed.push({ key: key, p: entry.el.object3D.position.clone(), q: entry.el.object3D.quaternion.clone() });
          self.destroyTile(key);
        }
      });
      function takeRemoved(prefix) {
        for (var i = removed.length - 1; i >= 0; i--) {
          if (removed[i].key.indexOf(prefix) === 0) return removed.splice(i, 1)[0];
        }
        return null;
      }

      var ev = g && g.lastEvent;
      var newRound = g && (!prevG || prevG.round !== g.round);
      var seatPos = g ? this.seatPositions() : {};
      var dealIndex = 0;
      desired.forEach(function (want, key) {
        var entry = self.tiles.get(key);
        if (entry) {
          var arc = entry.role !== want.role && want.role !== 'ghost' ? 0.07 : 0;
          var onDone = entry.role === 'hand' && want.role === 'chain' ? function () { SND.clack(); } : null;
          entry.role = want.role;
          self.updateTile(entry, want);
          if (self.holding() && self.holding().key === key) return;
          self.moveTile(entry, want.t, { arc: arc, onDone: onDone });
          return;
        }
        entry = self.createTile(key, want);
        var from = null;
        var opts = { arc: 0.07 };
        if (want.role === 'chain' && ev && ev.type === 'play' && ev.tileId === want.id) {
          from = takeRemoved('H:' + seatPos[ev.seat] + ':');
          opts.onDone = function () { SND.clack(); };
          opts.dur = 650;
        } else if (want.role === 'reveal') {
          from = takeRemoved('H:' + seatPos[want.seat] + ':');
        } else if (want.role === 'hand' && newRound) {
          from = { p: new THREE.Vector3(0, C.TABLE_Y + 0.01, 0), q: want.t.q };
          opts.delay = dealIndex++ * 45;
          opts.onDone = function () { SND.clack(0.25); };
        } else if (want.role === 'hand' && ev && ev.type === 'draw') {
          from = takeRemoved('B:');
        }
        if (from) {
          entry.el.object3D.position.copy(from.p);
          entry.el.object3D.quaternion.copy(from.q);
          self.moveTile(entry, want.t, opts);
        } else {
          entry.el.object3D.position.copy(want.t.p);
          entry.el.object3D.quaternion.copy(want.t.q);
          entry.base = want.t;
          if (want.role === 'chain' && prevG) SND.clack();
        }
      });
    },

    createTile: function (key, want) {
      var self = this;
      var el = document.createElement('a-entity');
      var mesh = createTileMesh(want.kind, want.id);
      el.setObject3D('mesh', mesh);
      el.addEventListener('click', function () { self.onTileClick(key); });
      el.addEventListener('mouseenter', function () { self.hoverKey = key; self.refreshHighlights(); });
      el.addEventListener('mouseleave', function () { if (self.hoverKey === key) self.hoverKey = null; self.refreshHighlights(); });
      this.el.appendChild(el);
      var entry = { key: key, el: el, mesh: mesh, kind: want.kind, id: want.id, role: want.role, base: null, tween: null };
      this.tiles.set(key, entry);
      this.updateTile(entry, want);
      return entry;
    },

    updateTile: function (entry, want) {
      entry.want = want;
      entry.id = want.id;
      if (want.clickable) entry.el.classList.add('clickable');
      else entry.el.classList.remove('clickable');
    },

    destroyTile: function (key) {
      var entry = this.tiles.get(key);
      if (!entry) return;
      if (entry.el.parentNode) entry.el.parentNode.removeChild(entry.el);
      this.tiles.delete(key);
    },

    moveTile: function (entry, t, opts) {
      opts = opts || {};
      if (entry.base && sameTransform(entry.base, t) && !opts.force) return;
      entry.base = t;
      var now = performance.now();
      entry.tween = {
        fromP: entry.el.object3D.position.clone(),
        fromQ: entry.el.object3D.quaternion.clone(),
        toP: t.p,
        toQ: t.q,
        start: now + (opts.delay || 0),
        dur: opts.dur || 420,
        arc: opts.arc || 0,
        onDone: opts.onDone || null,
      };
    },

    refreshHighlights: function () {
      var self = this;
      var g = this.state && this.state.game;
      this.tiles.forEach(function (entry) {
        var w = entry.want;
        if (!w) return;
        if (w.kind === 'face') {
          var mat = faceMat(w.id);
          var hover = self.hoverKey === entry.key && w.clickable;
          var glow = w.selected ? 0x4a4214 : w.legal ? (hover ? 0x3a3510 : 0x1f1c08) : hover ? 0x151515 : 0x000000;
          mat.emissive.setHex(glow);
        }
      });
      var drawable = g && g.canDraw;
      var hoverPile = this.hoverKey && this.hoverKey.indexOf('B:') === 0;
      sharedMats().pile.emissive.setHex(drawable ? (hoverPile ? 0x3a3510 : 0x1f1c08) : 0x000000);
    },

    // --- Actions du joueur --------------------------------------------------------

    onTileClick: function (key) {
      var entry = this.tiles.get(key);
      var g = this.state && this.state.game;
      if (!entry || !g) return;
      if (key.indexOf('G:') === 0) {
        this.playTile(this.selected, entry.want.side);
        return;
      }
      if (key.indexOf('B:') === 0) {
        if (g.canDraw) this.conn.send({ t: 'draw' });
        return;
      }
      if (entry.role === 'chain' && this.selected) {
        var sides = this.legalSides(this.selected);
        if (entry.want.index === 0 && sides.indexOf('left') >= 0) this.playTile(this.selected, 'left');
        else if (entry.want.index === g.chain.length - 1 && sides.indexOf('right') >= 0) this.playTile(this.selected, 'right');
        return;
      }
      if (entry.role !== 'hand') return;
      if (!this.isMyTurn()) {
        this.toast('Patience, ce n\'est pas votre tour');
        return;
      }
      var legal = this.legalSides(entry.id);
      if (!legal.length) {
        SND.error();
        this.toast(g.canDraw ? 'Ce domino ne se pose pas : piochez !' : 'Ce domino ne se pose pas ici');
        return;
      }
      if (legal.length === 1) {
        this.playTile(entry.id, legal[0]);
        return;
      }
      this.selected = this.selected === entry.id ? null : entry.id;
      this.renderTiles(g);
      this.refreshHighlights();
      this.renderButtons();
    },

    playTile: function (tileId, side) {
      if (!tileId || !side) return;
      this.conn.send({ t: 'play', tileId: tileId, side: side });
      this.selected = null;
    },

    toast: function (text, isError) {
      this.toastText = text;
      this.toastError = !!isError;
      this.toastUntil = performance.now() + 3500;
      if (isError) SND.error();
      this.renderPanel();
      window.dispatchEvent(new CustomEvent('domino-toast', { detail: { text: text, error: !!isError } }));
    },

    pulse: function (intensity, ms) {
      this.hands.forEach(function (h) {
        var tc = h.el.components['tracked-controls'];
        var src = tc && tc.controller;
        var act = src && src.gamepad && src.gamepad.hapticActuators && src.gamepad.hapticActuators[0];
        if (act && act.pulse) {
          try { act.pulse(intensity, ms); } catch (e) { /* non supporté */ }
        }
      });
    },

    // --- Mains VR : saisie des dominos -----------------------------------------

    setupHands: function () {
      var self = this;
      this.hands = ['left', 'right'].map(function (side, i) {
        var el = document.getElementById(side + 'Hand');
        var ht = document.getElementById(side + 'HandTracking');
        var hand = { index: i, el: el, ht: ht, proxy: new THREE.Object3D(), pinchPos: new THREE.Vector3(), pinching: false, held: null };
        el.addEventListener('gripdown', function () { self.grabStart(hand, self.controllerPos(hand)); });
        el.addEventListener('gripup', function () { self.grabEnd(hand); });
        el.addEventListener('thumbstickmoved', function (e) { self.heightAxis = Math.abs(e.detail.y) > 0.6 ? e.detail.y : 0; });
        if (ht) {
          ht.addEventListener('pinchstarted', function (e) {
            hand.pinching = true;
            self.rigToWorld(e.detail.position, hand.pinchPos);
            if (!self.pressNearbyButton(hand.pinchPos)) self.grabStart(hand, hand.pinchPos);
          });
          ht.addEventListener('pinchmoved', function (e) { self.rigToWorld(e.detail.position, hand.pinchPos); });
          ht.addEventListener('pinchended', function () {
            hand.pinching = false;
            self.grabEnd(hand);
          });
        }
        return hand;
      });
    },

    rigToWorld: function (v, out) {
      out.copy(v);
      this.rig.object3D.updateMatrixWorld();
      return this.rig.object3D.localToWorld(out);
    },

    controllerPos: function (hand) {
      var v = new THREE.Vector3();
      hand.el.object3D.getWorldPosition(v);
      return v;
    },

    pressNearbyButton: function (pos) {
      var best = null;
      var bestD = BUTTON_PINCH_RADIUS;
      var v = new THREE.Vector3();
      this.console.querySelectorAll('[ui-button]').forEach(function (b) {
        b.object3D.getWorldPosition(v);
        var d = v.distanceTo(pos);
        if (d < bestD) { best = b; bestD = d; }
      });
      if (best) best.components['ui-button'].press();
      return !!best;
    },

    holding: function () {
      for (var i = 0; i < this.hands.length; i++) if (this.hands[i].held) return this.hands[i].held;
      return null;
    },

    updateProxy: function (hand) {
      if (hand.pinching) {
        hand.proxy.position.copy(hand.pinchPos);
        hand.proxy.quaternion.copy(this.rig.object3D.quaternion);
      } else {
        hand.el.object3D.updateMatrixWorld();
        hand.el.object3D.matrixWorld.decompose(hand.proxy.position, hand.proxy.quaternion, hand.proxy.scale);
      }
      hand.proxy.scale.set(1, 1, 1);
      hand.proxy.updateMatrixWorld(true);
    },

    // Ordre d'affichage de sa main, choisi par le joueur (les nouveaux dominos vont à droite).
    orderedHand: function (hand) {
      var set = new Set(hand);
      var order = this.handOrder.filter(function (id) { return set.has(id); });
      hand.forEach(function (id) { if (order.indexOf(id) < 0) order.push(id); });
      this.handOrder = order;
      return order;
    },

    sortHand: function () {
      this.handOrder.sort(function (x, y) {
        var a = x.split('-').map(Number);
        var b = y.split('-').map(Number);
        return a[0] - b[0] || a[1] - b[1];
      });
      if (this.state && this.state.game) this.renderTiles(this.state.game);
    },

    // Domino relâché près de sa main : on le range à l'emplacement visé.
    reorderAt: function (id, pos) {
      if (this.myPos == null) return false;
      var local = pos.clone().applyQuaternion(W.seatQuaternion(this.myPos).invert());
      if (Math.abs(local.z - C.HAND_Z) > 0.12 || local.y > C.TABLE_Y + 0.3) return false;
      var order = this.handOrder.filter(function (h) { return h !== id; });
      var idx = Math.round(local.x / HAND_SPACING + order.length / 2);
      order.splice(Math.max(0, Math.min(order.length, idx)), 0, id);
      this.handOrder = order;
      return true;
    },

    grabStart: function (hand, pos) {
      if (hand.held || this.holding()) return;
      var best = null;
      var bestD = GRAB_RADIUS;
      var self = this;
      this.tiles.forEach(function (entry) {
        if (entry.role !== 'hand' || entry.kind !== 'face') return;
        var d = entry.el.object3D.position.distanceTo(pos);
        if (d < bestD) { best = entry; bestD = d; }
      });
      if (!best) return;
      this.updateProxy(hand);
      var rel = new THREE.Matrix4().copy(hand.proxy.matrixWorld).invert().multiply(best.el.object3D.matrixWorld);
      best.tween = null;
      hand.held = { key: best.key, id: best.id, rel: rel };
      this.selected = this.legalSides(best.id).length ? best.id : null;
      this.renderTiles(this.state.game);
      this.refreshHighlights();
      this.pulse(0.5, 40);
      SND.slide();
    },

    grabEnd: function (hand) {
      if (!hand.held) return;
      var held = hand.held;
      hand.held = null;
      var entry = this.tiles.get(held.key);
      var g = this.state.game;
      if (!entry || !g) return;
      var pos = entry.el.object3D.position;
      var target = this.nearestGhost(pos);
      var sides = this.legalSides(held.id);
      if (!target && sides.length === 1 && Math.abs(pos.x) < 0.42 && Math.abs(pos.z) < 0.42 && pos.y < C.TABLE_Y + 0.25 &&
          new THREE.Vector2(pos.x, pos.z).length() < C.HAND_Z - 0.06) {
        target = sides[0];
      }
      if (target) {
        this.playTile(held.id, target);
        this.pulse(0.8, 50);
      } else {
        // Retour dans la main (éventuellement à une nouvelle place).
        this.reorderAt(held.id, pos);
        entry.base = null;
        this.selected = null;
        this.renderTiles(g);
        this.refreshHighlights();
      }
    },

    nearestGhost: function (pos) {
      var best = null;
      var bestD = DROP_RADIUS;
      this.tiles.forEach(function (entry) {
        if (entry.kind !== 'ghost') return;
        var d = entry.el.object3D.position.distanceTo(pos);
        if (d < bestD) { best = entry.want.side; bestD = d; }
      });
      return best;
    },

    // --- Interface (panneau + boutons) -----------------------------------------

    renderPanel: function () {
      var comp = this.panel.components['ui-panel'];
      if (!comp || !comp.canvas) return;
      var lines = [];
      var s = this.state;
      var gold = '#ffd166';
      if (!s) {
        lines.push({ text: 'Dominos VR', bold: true, size: 72, color: gold });
        lines.push('Connexion au serveur…');
      } else if (!s.game) {
        var seated = s.members.filter(function (m) { return m.seat >= 0; });
        var host = s.members.find(function (m) { return m.id === s.hostId; });
        lines.push({ text: 'Salle ' + s.room + ' — salle d\'attente', bold: true, size: 64, color: gold });
        lines.push('À table (' + seated.length + '/4) : ' + seated.map(function (m) { return m.name; }).join(', '));
        lines.push('Mode : ' + (s.settings.mode === 'draw' ? 'avec pioche' : 'bloqué (sans pioche)') + ' · objectif ' + s.settings.targetScore + ' pts');
        lines.push(s.you === s.hostId
          ? (seated.length < 2 ? 'Invitez des amis ou ajoutez un bot, puis « Démarrer ».' : 'Prêt ? Appuyez sur « Démarrer » →')
          : 'En attente de ' + (host ? host.name : 'l\'hôte') + ' pour démarrer…');
      } else {
        var g = s.game;
        var mySeat = s.mySeat;
        var names = g.seats.map(function (seat) { return seat.name; });
        if (g.phase === 'playing') {
          lines.push({ text: 'Manche ' + g.round + ' · objectif ' + g.targetScore + ' pts' + (g.mode === 'draw' ? ' · pioche : ' + g.boneyardCount : ''), size: 42, color: '#cdbf9f' });
          if (g.turn === mySeat) {
            var hint = g.canDraw ? 'Aucun domino ne se pose : piochez.' : g.canPass ? 'Aucun coup possible : passez.' :
              g.chain.length === 0 && g.openingTile ? 'Ouvrez avec le ' + g.openingTile.replace('-', '|') + '.' : 'Choisissez un domino en surbrillance.';
            lines.push({ text: 'À vous de jouer !', bold: true, color: gold });
            lines.push({ text: hint, color: gold, size: 46 });
          } else {
            lines.push({ text: 'Au tour de ' + names[g.turn] + '…', bold: true });
          }
        } else {
          var r = g.roundResult;
          var title = r.reason === 'domino' ? 'Domino ! ' + names[r.winner] + ' gagne la manche (+' + r.points + ')'
            : r.winner == null ? 'Partie bloquée : égalité, personne ne marque' : 'Partie bloquée : ' + names[r.winner] + ' gagne (+' + r.points + ')';
          if (g.phase === 'gameOver') {
            lines.push({ text: '🏆 ' + names[g.winner] + ' remporte la partie !', bold: true, size: 64, color: gold });
            lines.push({ text: title, size: 46 });
          } else {
            lines.push({ text: title, bold: true, color: gold });
          }
        }
        g.seats.forEach(function (seat, i) {
          var extra = g.roundResult && g.phase !== 'playing' ? ' · reste ' + g.roundResult.totals[i] : ' · ' + seat.handCount + ' domino' + (seat.handCount > 1 ? 's' : '');
          lines.push({
            text: (i === g.turn && g.phase === 'playing' ? '▶ ' : '   ') + seat.name + (i === mySeat ? ' (vous)' : '') + ' : ' + seat.score + ' pts' + extra,
            color: i === mySeat ? '#9fe0b0' : '#f5ecd8',
            size: 50,
          });
        });
      }
      if (this.toastText && performance.now() < this.toastUntil) {
        lines.push({ text: this.toastText, color: this.toastError ? '#ff8a80' : '#9ad0ff', size: 48 });
      }
      comp.draw({ lines: lines, fontSize: 50, scale: 1.45, textAlign: 'left', align: 'top', background: 'rgba(24, 18, 12, 0.82)', border: '#8a6a3a', radius: 36 });
      // Même contenu pour l'interface HTML (ordinateur / mobile).
      window.dispatchEvent(new CustomEvent('domino-panel', { detail: lines }));
    },

    buttonList: function () {
      var s = this.state;
      var list = [];
      if (!s) return list;
      var me = s.members.find(function (m) { return m.id === s.you; });
      var seated = me && me.seat >= 0;
      var g = s.game;
      if (!g) {
        var seats = s.members.filter(function (m) { return m.seat >= 0; });
        if (s.you === s.hostId) {
          list.push({ id: 'start', label: '▶ Démarrer', color: '#2e7d4f', enabled: seats.length >= 2 });
          list.push({ id: 'addBot', label: '+ Bot', color: '#4a5a8a', enabled: seats.length < 4 });
          list.push({ id: 'removeBot', label: '− Bot', color: '#4a5a8a', enabled: s.members.some(function (m) { return m.isBot; }) });
          list.push({ id: 'mode', label: s.settings.mode === 'draw' ? 'Mode : pioche' : 'Mode : bloqué', color: '#6a4a8a' });
          list.push({ id: 'target', label: 'Objectif : ' + s.settings.targetScore, color: '#6a4a8a' });
        }
        if (!seated && seats.length < 4) list.push({ id: 'sit', label: 'S\'asseoir', color: '#2e7d4f' });
        if (seated && s.you !== s.hostId) list.push({ id: 'stand', label: 'Se lever', color: '#7a4a3a' });
      } else if (g.phase === 'playing') {
        if (this.isMyTurn()) {
          if (g.canDraw) list.push({ id: 'draw', label: 'Piocher', color: '#2e7d4f' });
          if (g.canPass) list.push({ id: 'pass', label: 'Passer', color: '#8a5a2a' });
        }
        if (this.selected) list.push({ id: 'cancel', label: 'Annuler', color: '#7a4a3a' });
        if (g.hand && g.hand.length > 1) list.push({ id: 'sort', label: 'Trier ma main', color: '#4a5a6a' });
      } else if (seated) {
        if (g.phase === 'roundOver') list.push({ id: 'nextRound', label: 'Manche suivante', color: '#2e7d4f' });
        if (g.phase === 'gameOver') list.push({ id: 'newGame', label: 'Nouvelle partie', color: '#2e7d4f' });
      }
      if (this.emoteMenu) {
        // Le pupitre affiche alors uniquement les réactions.
        list = EMOTES.map(function (text, i) { return { id: 'emote:' + i, label: text, color: '#7a5a2a' }; });
        list.push({ id: 'emotes', label: '← Retour', color: '#4a4a4a' });
        return list;
      }
      list.push({ id: 'emotes', label: '💬 Réactions', color: '#7a5a2a' });
      if (this.voice) list.push({ id: 'mic', label: this.micOn ? '🎤 Micro : oui' : '🎤 Micro : non', color: this.micOn ? '#2e7d4f' : '#5a5a5a' });
      list.push({ id: 'up', label: '▲ Hauteur', color: '#4a4a4a' });
      list.push({ id: 'down', label: '▼ Hauteur', color: '#4a4a4a' });
      return list;
    },

    renderButtons: function () {
      var self = this;
      var list = this.buttonList();
      var key = JSON.stringify(list);
      if (key === this.buttonsKey) return;
      this.buttonsKey = key;
      window.dispatchEvent(new CustomEvent('domino-buttons', { detail: list }));
      while (this.console.firstChild) this.console.removeChild(this.console.firstChild);
      var bw = 0.135;
      var bh = 0.046;
      var gap = 0.012;
      list.forEach(function (b, i) {
        var col = i % 2;
        var row = Math.floor(i / 2);
        var el = document.createElement('a-entity');
        el.setAttribute('ui-button', { label: b.label, width: bw, height: bh, color: b.color, enabled: b.enabled !== false });
        el.setAttribute('position', ((col - 0.5) * (bw + gap)) + ' ' + (-row * (bh + gap)) + ' 0');
        el.addEventListener('press', function () { self.onButton(b.id); });
        self.console.appendChild(el);
      });
      setTimeout(function () { self.syncConsole(); }, 0);
    },

    onButton: function (id) {
      var s = this.state;
      var conn = this.conn;
      var self = this;
      if (id.indexOf('emote:') === 0) {
        this.sendEmote(Number(id.slice(6)));
        this.emoteMenu = false;
        this.renderButtons();
        return;
      }
      switch (id) {
        case 'start': conn.send({ t: 'start' }); break;
        case 'addBot': conn.send({ t: 'addBot' }); break;
        case 'removeBot': conn.send({ t: 'removeBot' }); break;
        case 'mode': conn.send({ t: 'settings', mode: s.settings.mode === 'draw' ? 'block' : 'draw' }); break;
        case 'target': {
          var targets = [50, 100, 150, 200];
          conn.send({ t: 'settings', targetScore: targets[(targets.indexOf(s.settings.targetScore) + 1) % targets.length] });
          break;
        }
        case 'sit': conn.send({ t: 'sit' }); break;
        case 'stand': conn.send({ t: 'stand' }); break;
        case 'draw': conn.send({ t: 'draw' }); break;
        case 'pass': conn.send({ t: 'pass' }); break;
        case 'sort': this.sortHand(); break;
        case 'emotes':
          this.emoteMenu = !this.emoteMenu;
          this.renderButtons();
          break;
        case 'cancel':
          this.selected = null;
          this.renderTiles(s.game);
          this.refreshHighlights();
          this.renderButtons();
          break;
        case 'nextRound': conn.send({ t: 'nextRound' }); break;
        case 'newGame': conn.send({ t: 'newGame' }); break;
        case 'mic': this.toggleMic(); break;
        case 'up': this.adjustHeight(0.05); break;
        case 'down': this.adjustHeight(-0.05); break;
        default:
      }
      self.pulse(0.3, 25);
    },

    sendEmote: function (index) {
      if (this.conn) this.conn.send({ t: 'emote', e: index });
    },

    emotes: function () {
      return EMOTES;
    },

    toggleMic: function () {
      var self = this;
      if (!this.voice) return;
      this.voice.setMic(!this.micOn).then(function (on) {
        self.micOn = on;
        self.renderButtons();
        window.dispatchEvent(new CustomEvent('domino-mic', { detail: on }));
      }).catch(function (err) {
        self.toast('Micro : ' + (err.message || 'accès refusé'), true);
      });
    },

    setMic: function (on) {
      this.micOn = on;
      this.renderButtons();
    },

    adjustHeight: function (dy) {
      this.rigHeight = Math.max(-0.6, Math.min(0.6, this.rigHeight + dy));
      this.rig.object3D.position.y = this.rigHeight;
    },

    // --- Boucle d'animation ----------------------------------------------------

    tick: function (time, dt) {
      var now = performance.now();
      var self = this;
      dt = Math.min(dt || 16, 100);

      // Animations des dominos.
      this.tiles.forEach(function (entry) {
        var tw = entry.tween;
        if (!tw) return;
        var t = (now - tw.start) / tw.dur;
        if (t < 0) return;
        if (t >= 1) {
          entry.el.object3D.position.copy(tw.toP);
          entry.el.object3D.quaternion.copy(tw.toQ);
          entry.tween = null;
          if (tw.onDone) tw.onDone();
          return;
        }
        var e = ease(t);
        entry.el.object3D.position.lerpVectors(tw.fromP, tw.toP, e);
        entry.el.object3D.position.y += Math.sin(Math.PI * e) * tw.arc;
        entry.el.object3D.quaternion.slerpQuaternions(tw.fromQ, tw.toQ, e);
      });

      // Domino tenu en main (VR).
      var hoverGhost = null;
      this.hands.forEach(function (hand) {
        if (!hand.held) return;
        var entry = self.tiles.get(hand.held.key);
        if (!entry) { hand.held = null; return; }
        self.updateProxy(hand);
        var m = new THREE.Matrix4().multiplyMatrices(hand.proxy.matrixWorld, hand.held.rel);
        m.decompose(entry.el.object3D.position, entry.el.object3D.quaternion, entry.el.object3D.scale);
        entry.el.object3D.scale.set(1, 1, 1);
        hoverGhost = self.nearestGhost(entry.el.object3D.position);
      });

      // Fantômes : pulsation, plus vive quand le domino tenu est au-dessus.
      var pulse = 0.35 + Math.sin(now / 250) * 0.15;
      Object.keys(ghostMats).forEach(function (id) { ghostMats[id].opacity = pulse; });
      this.tiles.forEach(function (entry) {
        if (entry.kind === 'ghost') entry.el.object3D.scale.setScalar(entry.want.side === hoverGhost ? 1.08 : 1);
      });

      // Liseré du tour qui « respire ».
      this.world.markerMat.opacity = 0.55 + Math.sin(now / 300) * 0.35;

      // Avatars.
      this.avatars.forEach(function (av) {
        av.tick(time, dt);
        if (av.member) av.setInfo(av.member, av.isTurn, av.isSpeaking());
      });

      // Hauteur au joystick.
      if (this.heightAxis) this.adjustHeight(-this.heightAxis * dt * 0.0006);

      // Rafraîchit le panneau quand un message temporaire expire.
      if (this.toastText && now > this.toastUntil) {
        this.toastText = null;
        this.renderPanel();
      }

      if (this.conn && now - this.lastPoseSent > POSE_INTERVAL) {
        this.lastPoseSent = now;
        this.sendPose();
      }
    },

    sendPose: function () {
      var cam = this.sceneEl.camera;
      if (!cam) return;
      var p = new THREE.Vector3();
      var q = new THREE.Quaternion();
      cam.getWorldPosition(p);
      cam.getWorldQuaternion(q);
      var msg = { t: 'pose', h: pack(p, q), l: null, r: null, g: [false, false] };
      var self = this;
      if (this.sceneEl.is('vr-mode')) {
        this.hands.forEach(function (hand, i) {
          var pose = null;
          var tc = hand.el.components['tracked-controls'];
          if (tc && tc.controller && hand.el.object3D.visible) {
            hand.el.object3D.getWorldPosition(p);
            hand.el.object3D.getWorldQuaternion(q);
            pose = pack(p, q);
          } else if (hand.ht) {
            var htc = hand.ht.components['hand-tracking-controls'];
            if (htc && htc.hasPoses && htc.wristObject3D) {
              self.rigToWorld(htc.wristObject3D.position, p);
              q.copy(self.rig.object3D.quaternion).multiply(htc.wristObject3D.quaternion);
              pose = pack(p, q);
            }
          }
          if (i === 0) msg.l = pose;
          else msg.r = pose;
          msg.g[i] = !!hand.held;
        });
      }
      this.conn.send(msg);
    },
  });

  function pack(p, q) {
    return [r4(p.x), r4(p.y), r4(p.z), r4(q.x), r4(q.y), r4(q.z), r4(q.w)];
  }

  function r4(n) {
    return Math.round(n * 10000) / 10000;
  }
})();

'use strict';

const { DominoGame } = require('./game');
const { chooseAction } = require('./bot');

const MAX_SEATS = 4;
const BOT_DELAY_MS = 1400;
const AFK_TAKEOVER_MS = 20000;
const LOBBY_GRACE_MS = 30000;
const BOT_NAMES = ['Robotine', 'Domibot', 'Bip-Bop', 'Mécano'];

// Positions autour de la table (0 = sud, 1 = est, 2 = nord, 3 = ouest) selon le nombre de joueurs.
const TABLE_POSITIONS = { 1: [0], 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };

// Une pose = position (3) + quaternion (4).
function cleanPose(p) {
  if (!Array.isArray(p) || p.length !== 7) return null;
  return p.every((n) => typeof n === 'number' && Number.isFinite(n)) ? p : null;
}

class Room {
  constructor(code, { botDelay = BOT_DELAY_MS, afkTakeover = AFK_TAKEOVER_MS, rng = Math.random } = {}) {
    this.code = code;
    this.members = new Map();
    this.seats = [];
    this.hostId = null;
    this.settings = { mode: 'draw', targetScore: 100 };
    this.game = null;
    this.botDelay = botDelay;
    this.afkTakeover = afkTakeover;
    this.rng = rng;
    this.turnTimer = null;
    this.botCount = 0;
    this.lastActivity = Date.now();
  }

  get phase() {
    return this.game ? this.game.phase : 'lobby';
  }

  get humansOnline() {
    return [...this.members.values()].filter((m) => !m.isBot && m.connected).length;
  }

  join(id, name, socket) {
    this.lastActivity = Date.now();
    let member = this.members.get(id);
    if (member) {
      // Reconnexion : on récupère sa place.
      if (member.socket && member.socket !== socket) member.socket.close(4000, 'remplacé');
      member.socket = socket;
      member.connected = true;
      member.name = name || member.name;
      clearTimeout(member.leaveTimer);
    } else {
      member = { id, name, socket, connected: true, isBot: false };
      this.members.set(id, member);
      if (this.phase === 'lobby' && this.seats.length < MAX_SEATS) this.seats.push(id);
    }
    if (!this.hostId || !this.members.get(this.hostId)?.connected) this.hostId = id;
    this.send(member, { t: 'welcome', id, room: this.code });
    this.broadcastState();
    return member;
  }

  leave(id, socket) {
    const member = this.members.get(id);
    if (!member || member.socket !== socket) return;
    member.connected = false;
    member.socket = null;
    if (this.hostId === id) this.pickHost();
    member.leaveTimer = setTimeout(() => {
      if (!member.connected && this.phase === 'lobby') this.removeMember(id);
    }, LOBBY_GRACE_MS);
    member.leaveTimer.unref?.();
    this.broadcastState();
    this.scheduleTurn();
  }

  removeMember(id) {
    this.members.delete(id);
    this.seats = this.seats.filter((s) => s !== id);
    if (this.hostId === id) this.pickHost();
    this.broadcastState();
  }

  pickHost() {
    const next = [...this.members.values()].find((m) => !m.isBot && m.connected);
    this.hostId = next ? next.id : null;
  }

  // --- Messages des clients ---------------------------------------------------

  handle(id, msg) {
    const member = this.members.get(id);
    if (!member) return;
    this.lastActivity = Date.now();
    try {
      switch (msg.t) {
        case 'pose':
          this.relayPose(id, msg);
          return;
        case 'rtc':
          this.relayRtc(id, msg);
          return;
        case 'settings':
          this.requireHost(id);
          this.requireLobby();
          if (msg.mode === 'draw' || msg.mode === 'block') this.settings.mode = msg.mode;
          if ([50, 100, 150, 200].includes(msg.targetScore)) this.settings.targetScore = msg.targetScore;
          break;
        case 'addBot':
          this.requireHost(id);
          this.requireLobby();
          this.addBot();
          break;
        case 'removeBot':
          this.requireHost(id);
          this.requireLobby();
          this.removeBot();
          break;
        case 'sit':
          this.requireLobby();
          if (!this.seats.includes(id) && this.seats.length < MAX_SEATS) this.seats.push(id);
          break;
        case 'stand':
          this.requireLobby();
          this.seats = this.seats.filter((s) => s !== id);
          break;
        case 'start':
          this.requireHost(id);
          this.startGame();
          break;
        case 'play':
          this.game.play(this.seatOf(id), String(msg.tileId), msg.side === 'left' ? 'left' : 'right');
          break;
        case 'draw':
          this.game.draw(this.seatOf(id));
          break;
        case 'pass':
          this.game.pass(this.seatOf(id));
          break;
        case 'nextRound':
          if (this.seatOf(id) < 0) throw new Error('réservé aux joueurs');
          this.game.nextRound();
          break;
        case 'newGame':
          if (this.seatOf(id) < 0) throw new Error('réservé aux joueurs');
          if (this.phase !== 'gameOver') throw new Error('partie en cours');
          this.backToLobby();
          break;
        default:
          return;
      }
    } catch (err) {
      this.send(member, { t: 'error', message: err.message });
      return;
    }
    this.broadcastState();
    this.scheduleTurn();
  }

  requireHost(id) {
    if (id !== this.hostId) throw new Error('réservé à l\'hôte');
  }

  requireLobby() {
    if (this.phase !== 'lobby') throw new Error('partie en cours');
  }

  seatOf(id) {
    if (!this.game) return -1;
    return this.seats.indexOf(id);
  }

  addBot() {
    if (this.seats.length >= MAX_SEATS) throw new Error('table complète');
    this.botCount += 1;
    const id = `bot-${this.botCount}`;
    const name = BOT_NAMES[(this.botCount - 1) % BOT_NAMES.length];
    this.members.set(id, { id, name, socket: null, connected: true, isBot: true });
    this.seats.push(id);
  }

  removeBot() {
    const botId = [...this.seats].reverse().find((s) => this.members.get(s)?.isBot);
    if (!botId) throw new Error('aucun bot');
    this.members.delete(botId);
    this.seats = this.seats.filter((s) => s !== botId);
  }

  startGame() {
    this.requireLobby();
    // Les joueurs partis pendant l'attente libèrent leur place.
    for (const id of [...this.seats]) {
      const m = this.members.get(id);
      if (!m || !m.connected) this.seats = this.seats.filter((s) => s !== id);
    }
    if (this.seats.length < 2) throw new Error('il faut au moins 2 joueurs (ajoutez un bot)');
    this.game = new DominoGame({ ...this.settings, rng: this.rng });
    this.game.start(this.seats.map((id) => ({ name: this.members.get(id).name })));
  }

  backToLobby() {
    this.game = null;
    for (const [id, m] of this.members) {
      if (!m.connected) this.members.delete(id);
    }
    this.seats = this.seats.filter((id) => this.members.has(id));
    for (const m of this.members.values()) {
      if (!this.seats.includes(m.id) && this.seats.length < MAX_SEATS) this.seats.push(m.id);
    }
  }

  // --- Tours automatiques (bots et joueurs absents) --------------------------

  scheduleTurn() {
    clearTimeout(this.turnTimer);
    if (!this.game || this.game.phase !== 'playing') return;
    const seat = this.game.turn;
    const member = this.members.get(this.seats[seat]);
    if (!member) return;
    let delay;
    if (member.isBot) delay = this.botDelay;
    else if (!member.connected) delay = this.afkTakeover;
    else return;
    const round = this.game.round;
    this.turnTimer = setTimeout(() => {
      if (!this.game || this.game.round !== round || this.game.turn !== seat || this.game.phase !== 'playing') return;
      const action = chooseAction(this.game, seat);
      if (!action) return;
      if (action.type === 'play') this.game.play(seat, action.tileId, action.side);
      else if (action.type === 'draw') this.game.draw(seat);
      else this.game.pass(seat);
      this.broadcastState();
      this.scheduleTurn();
    }, delay);
    this.turnTimer.unref?.();
  }

  // --- Diffusion --------------------------------------------------------------

  tablePositions() {
    const layout = TABLE_POSITIONS[Math.max(1, this.seats.length)];
    const map = new Map();
    this.seats.forEach((id, i) => map.set(id, layout[i]));
    return map;
  }

  stateFor(member) {
    const positions = this.tablePositions();
    const seat = this.seatOf(member.id);
    return {
      t: 'state',
      room: this.code,
      you: member.id,
      hostId: this.hostId,
      phase: this.phase,
      settings: this.settings,
      mySeat: this.game ? seat : this.seats.indexOf(member.id),
      members: [...this.members.values()].map((m) => ({
        id: m.id,
        name: m.name,
        isBot: m.isBot,
        connected: m.connected,
        seat: this.seats.indexOf(m.id),
        tablePos: positions.has(m.id) ? positions.get(m.id) : null,
      })),
      game: this.game ? this.game.viewFor(seat) : null,
    };
  }

  broadcastState() {
    for (const m of this.members.values()) {
      if (m.socket) this.send(m, this.stateFor(m));
    }
  }

  relayPose(id, msg) {
    const out = JSON.stringify({
      t: 'pose', id, h: cleanPose(msg.h), l: cleanPose(msg.l), r: cleanPose(msg.r),
      g: Array.isArray(msg.g) ? msg.g.slice(0, 2).map(Boolean) : null,
    });
    for (const m of this.members.values()) {
      if (m.id !== id && m.socket && m.socket.readyState === 1) m.socket.send(out);
    }
  }

  relayRtc(id, msg) {
    const target = this.members.get(String(msg.to));
    if (target && target.socket) this.send(target, { t: 'rtc', from: id, data: msg.data });
  }

  send(member, payload) {
    if (member.socket && member.socket.readyState === 1) member.socket.send(JSON.stringify(payload));
  }

  dispose() {
    clearTimeout(this.turnTimer);
    for (const m of this.members.values()) clearTimeout(m.leaveTimer);
  }
}

module.exports = { Room, TABLE_POSITIONS, MAX_SEATS };

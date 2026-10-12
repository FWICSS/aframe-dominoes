'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { createServer } = require('../server');

async function startServer(t) {
  const srv = createServer({ port: 0, roomOptions: { botDelay: 5, afkTakeover: 40 } });
  await new Promise((r) => srv.server.on('listening', r));
  t.after(() => srv.close());
  return srv.server.address().port;
}

// Client de test : garde le dernier état reçu, les erreurs et les poses relayées.
async function connect(port, room, name, clientId) {
  const ws = new WebSocket(`ws://localhost:${port}/ws`);
  const c = { ws, state: null, errors: [], poses: [] };
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.t === 'state') c.state = msg;
    if (msg.t === 'error') c.errors.push(msg.message);
    if (msg.t === 'pose') c.poses.push(msg);
  });
  c.send = (m) => ws.send(JSON.stringify(m));
  await new Promise((r) => ws.on('open', r));
  c.send({ t: 'join', room, name, clientId });
  await waitFor(() => c.state);
  return c;
}

async function waitFor(fn, timeout = 3000) {
  const start = Date.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() - start > timeout) throw new Error('délai dépassé');
    await new Promise((r) => setTimeout(r, 5));
  }
}

// Fait jouer des clients humains (premier coup légal) jusqu'à la fin de la manche.
async function playRound(clients) {
  const ref = clients[0];
  for (let i = 0; i < 500; i++) {
    if (ref.state.game.phase !== 'playing') return;
    const g = ref.state.game;
    const player = clients.find((c) => c.state.mySeat === g.turn && c.state.game.turn === g.turn);
    if (player) {
      const view = player.state.game;
      const before = JSON.stringify(view.lastEvent) + view.chain.length + view.hand.length;
      if (view.legal.length) player.send({ t: 'play', tileId: view.legal[0].tileId, side: view.legal[0].side });
      else if (view.canDraw) player.send({ t: 'draw' });
      else player.send({ t: 'pass' });
      await waitFor(() => JSON.stringify(player.state.game.lastEvent) + player.state.game.chain.length + (player.state.game.hand || []).length !== before);
    } else {
      await new Promise((r) => setTimeout(r, 10));
    }
  }
  throw new Error('la manche ne se termine pas');
}

test('partie en réseau : salle, bot, coups validés par le serveur, vues privées', async (t) => {
  const port = await startServer(t);
  const alice = await connect(port, 'test1', 'Alice<b>', 'alice-0001');
  assert.equal(alice.state.room, 'TEST1');
  assert.equal(alice.state.hostId, 'alice-0001');
  assert.equal(alice.state.members[0].name, 'Aliceb', 'nom nettoyé');
  const bob = await connect(port, 'TEST1', 'Bob', 'bob-00000001');

  bob.send({ t: 'start' });
  await waitFor(() => bob.errors.length);
  assert.match(bob.errors[0], /hôte/);

  alice.send({ t: 'addBot' });
  await waitFor(() => alice.state.members.length === 3);
  alice.send({ t: 'start' });
  await waitFor(() => alice.state.game && bob.state.game);

  const ga = alice.state.game;
  const gb = bob.state.game;
  assert.equal(ga.hand.length, 5);
  assert.equal(gb.hand.length, 5);
  assert.ok(!ga.hand.some((id) => gb.hand.includes(id)), 'mains distinctes');
  assert.equal(ga.seats[1].hand, undefined, 'la main de Bob n\'est pas envoyée à Alice');
  assert.equal(ga.seats[1].handCount, 5);
  assert.deepEqual(alice.state.members.map((m) => m.tablePos), [0, 1, 2]);

  alice.send({ t: 'play', tileId: gb.hand[0], side: 'right' });
  await waitFor(() => alice.errors.length);

  await playRound([alice, bob]);
  assert.ok(alice.state.game.roundResult);
  alice.send({ t: 'nextRound' });
  await waitFor(() => alice.state.game.round === 2 && alice.state.game.phase === 'playing');

  bob.send({ t: 'pose', h: [0, 1.2, 0.8, 0, 0, 0, 1], l: ['x'], r: null });
  const pose = await waitFor(() => alice.poses[0]);
  assert.equal(pose.id, 'bob-00000001');
  assert.equal(pose.l, null);
});

test('reconnexion : un joueur retrouve sa place et sa main', async (t) => {
  const port = await startServer(t);
  const alice = await connect(port, 'RECO', 'Alice', 'alice-0003');
  const bob = await connect(port, 'RECO', 'Bob', 'bob-00000003');
  alice.send({ t: 'start' });
  await waitFor(() => bob.state.game);
  const hand = bob.state.game.hand;
  bob.ws.close();
  await waitFor(() => alice.state.members.find((m) => m.id === 'bob-00000003' && !m.connected));
  const bob2 = await connect(port, 'RECO', 'Bob', 'bob-00000003');
  await waitFor(() => bob2.state.game);
  assert.equal(bob2.state.mySeat, 1);
  assert.ok(bob2.state.game.hand.length >= hand.length - 1);
});

test('un joueur déconnecté est remplacé par un bot pendant son tour', async (t) => {
  const port = await startServer(t);
  const alice = await connect(port, 'AFK', 'Alice', 'alice-0002');
  const bob = await connect(port, 'AFK', 'Bob', 'bob-00000002');
  alice.send({ t: 'start' });
  await waitFor(() => alice.state.game);
  bob.ws.close();
  await playRound([alice]);
  assert.notEqual(alice.state.game.phase, 'playing');
});

test('fin de partie puis retour en salle d\'attente, spectateur placé à table', async (t) => {
  const port = await startServer(t);
  const alice = await connect(port, 'FIN', 'Alice', 'alice-0004');
  alice.send({ t: 'settings', mode: 'block', targetScore: 50 });
  alice.send({ t: 'addBot' });
  await waitFor(() => alice.state.members.length === 2 && alice.state.settings.targetScore === 50);
  alice.send({ t: 'start' });
  await waitFor(() => alice.state.game);
  const late = await connect(port, 'FIN', 'Zoé', 'zoe-00000004');
  assert.equal(late.state.mySeat, -1, 'arrivé en cours de partie : spectateur');
  assert.equal(late.state.game.hand, null);
  for (let i = 0; i < 30 && alice.state.game.phase !== 'gameOver'; i++) {
    await playRound([alice]);
    if (alice.state.game.phase === 'roundOver') {
      const round = alice.state.game.round;
      alice.send({ t: 'nextRound' });
      await waitFor(() => alice.state.game.round === round + 1);
    }
  }
  assert.equal(alice.state.game.phase, 'gameOver');
  assert.ok(alice.state.game.seats[alice.state.game.winner].score >= 50);
  alice.send({ t: 'newGame' });
  await waitFor(() => alice.state.phase === 'lobby' && late.state.phase === 'lobby');
  assert.ok(late.state.members.find((m) => m.id === 'zoe-00000004').seat >= 0, 'le spectateur rejoint la table');
});

test('réactions relayées (limitées) et configuration ICE', async (t) => {
  const port = await startServer(t);
  const alice = await connect(port, 'EMO', 'Alice', 'alice-0005');
  const bob = await connect(port, 'EMO', 'Bob', 'bob-00000005');
  const got = [];
  alice.ws.on('message', (raw) => { const m = JSON.parse(raw); if (m.t === 'emote') got.push(m); });
  bob.send({ t: 'emote', e: 2 });
  bob.send({ t: 'emote', e: 3 }); // trop rapproché : ignoré
  bob.send({ t: 'emote', e: 99 }); // invalide : ignoré
  await waitFor(() => got.length);
  await new Promise((r) => setTimeout(r, 100));
  assert.deepEqual(got.map((m) => [m.id, m.e]), [['bob-00000005', 2]]);

  const cfg = await (await fetch(`http://localhost:${port}/config.json`)).json();
  assert.ok(Array.isArray(cfg.iceServers) && cfg.iceServers.length > 0);
});

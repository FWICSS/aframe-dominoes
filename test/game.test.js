'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DominoGame, createSet, handSize } = require('../server/game');
const { chooseAction } = require('../server/bot');

// Générateur pseudo-aléatoire déterministe pour des tests reproductibles.
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function tile(id) {
  const [a, b] = id.split('-').map(Number);
  return { id, a, b };
}

test('le jeu double-six contient 28 dominos uniques', () => {
  const set = createSet();
  assert.equal(set.length, 28);
  assert.equal(new Set(set.map((t) => t.id)).size, 28);
});

test('distribution selon le mode et le nombre de joueurs', () => {
  assert.equal(handSize('draw', 2), 7);
  assert.equal(handSize('draw', 4), 5);
  assert.equal(handSize('block', 4), 7);
  const g = new DominoGame({ mode: 'draw', rng: seeded(1) });
  g.start([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
  assert.deepEqual(g.seats.map((s) => s.hand.length), [5, 5, 5]);
  assert.equal(g.boneyard.length, 13);
});

test('le plus gros double ouvre la première manche', () => {
  const g = new DominoGame({ rng: seeded(2) });
  g.start([{ name: 'A' }, { name: 'B' }]);
  g.seats[0].hand = ['1-2', '3-3', '0-5'].map(tile);
  g.seats[1].hand = ['5-5', '6-4', '2-2'].map(tile);
  const opener = g.findOpener();
  assert.equal(opener.seat, 1);
  assert.equal(opener.tile.id, '5-5');
});

test('seul le domino d\'ouverture est jouable au premier coup', () => {
  const g = new DominoGame({ rng: seeded(3) });
  g.start([{ name: 'A' }, { name: 'B' }]);
  const moves = g.legalMoves(g.turn);
  assert.equal(moves.length, 1);
  assert.equal(moves[0].tileId, g.openingTile);
  assert.deepEqual(g.legalMoves((g.turn + 1) % 2), []);
});

test('les dominos posés sont orientés pour que les bouts correspondent', () => {
  const g = new DominoGame({ mode: 'block' });
  g.start([{ name: 'A' }, { name: 'B' }]);
  g.turn = 0;
  g.openingTile = null;
  g.seats[0].hand = ['6-6', '2-6', '1-5'].map(tile);
  g.seats[1].hand = ['4-6', '0-1', '3-3'].map(tile);
  g.play(0, '6-6', 'right');
  g.play(1, '4-6', 'left');
  g.play(0, '2-6', 'right');
  assert.deepEqual(g.chain.map((t) => [t.a, t.b]), [[4, 6], [6, 6], [6, 2]]);
  assert.equal(g.center, 1);
  assert.deepEqual(g.ends, { left: 4, right: 2 });
  assert.throws(() => g.play(1, '0-1', 'left'), /illégal/);
});

test('on ne peut pas jouer hors de son tour', () => {
  const g = new DominoGame({ rng: seeded(4) });
  g.start([{ name: 'A' }, { name: 'B' }]);
  const other = (g.turn + 1) % 2;
  const t = g.seats[other].hand[0];
  assert.throws(() => g.play(other, t.id, 'right'));
});

test('pioche obligatoire puis passe quand la pioche est vide', () => {
  const g = new DominoGame({ mode: 'draw' });
  g.start([{ name: 'A' }, { name: 'B' }]);
  g.turn = 0;
  g.openingTile = null;
  g.seats[0].hand = ['6-6', '0-0'].map(tile);
  g.seats[1].hand = ['1-2', '3-4'].map(tile);
  g.boneyard = ['2-5'].map(tile);
  g.play(0, '6-6', 'right');
  assert.equal(g.turn, 1);
  assert.equal(g.canPass(1), false);
  assert.equal(g.canDraw(1), true);
  g.draw(1);
  assert.equal(g.seats[1].hand.length, 3);
  assert.equal(g.turn, 1, 'piocher ne termine pas le tour');
  assert.equal(g.canDraw(1), false);
  assert.equal(g.canPass(1), true);
  g.pass(1);
  assert.equal(g.turn, 0);
});

test('« domino ! » : le gagnant marque les points des adversaires', () => {
  const g = new DominoGame({ mode: 'block', targetScore: 100 });
  g.start([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
  g.turn = 0;
  g.openingTile = null;
  g.seats[0].hand = ['3-4'].map(tile);
  g.seats[1].hand = ['6-6', '1-0'].map(tile);
  g.seats[2].hand = ['5-2'].map(tile);
  g.play(0, '3-4', 'right');
  assert.equal(g.phase, 'roundOver');
  assert.equal(g.roundResult.reason, 'domino');
  assert.equal(g.roundResult.winner, 0);
  assert.equal(g.roundResult.points, 13 + 7);
  assert.equal(g.seats[0].score, 20);
  g.nextRound();
  assert.equal(g.turn, 0, 'le gagnant ouvre la manche suivante');
  assert.equal(g.openingTile, null);
  assert.equal(g.round, 2);
});

test('partie bloquée : la main la plus légère gagne, égalité = personne', () => {
  const g = new DominoGame({ mode: 'block' });
  g.start([{ name: 'A' }, { name: 'B' }]);
  g.turn = 0;
  g.openingTile = null;
  g.seats[0].hand = ['0-0', '5-5'].map(tile);
  g.seats[1].hand = ['1-2', '3-6'].map(tile);
  g.play(0, '0-0', 'right');
  g.pass(1);
  assert.equal(g.canPass(0), true);
  g.pass(0);
  assert.equal(g.phase, 'roundOver');
  assert.equal(g.roundResult.reason, 'blocked');
  assert.equal(g.roundResult.winner, 0);
  assert.equal(g.roundResult.points, 12);

  const tie = new DominoGame({ mode: 'block' });
  tie.start([{ name: 'A' }, { name: 'B' }]);
  tie.turn = 0;
  tie.openingTile = null;
  tie.seats[0].hand = ['0-0', '2-4'].map(tile);
  tie.seats[1].hand = ['3-0', '1-5'].map(tile);
  tie.play(0, '0-0', 'right');
  tie.play(1, '3-0', 'right');
  tie.pass(0);
  tie.pass(1);
  assert.equal(tie.roundResult.winner, null);
  assert.equal(tie.roundResult.points, 0);
});

test('la partie se termine à l\'objectif', () => {
  const g = new DominoGame({ mode: 'block', targetScore: 50 });
  g.start([{ name: 'A' }, { name: 'B' }]);
  g.seats[0].score = 45;
  g.turn = 0;
  g.openingTile = null;
  g.seats[0].hand = ['1-1'].map(tile);
  g.seats[1].hand = ['6-6'].map(tile);
  g.play(0, '1-1', 'right');
  assert.equal(g.phase, 'gameOver');
  assert.equal(g.winner, 0);
  assert.throws(() => g.nextRound());
});

test('la vue d\'un joueur ne révèle pas les mains adverses', () => {
  const g = new DominoGame({ rng: seeded(5) });
  g.start([{ name: 'A' }, { name: 'B' }]);
  const view = g.viewFor(0);
  assert.equal(view.hand.length, 7);
  assert.equal(view.seats[1].handCount, 7);
  assert.equal(JSON.stringify(view).includes('"hand":[') && view.seats[1].hand, undefined);
  const spectator = g.viewFor(-1);
  assert.equal(spectator.hand, null);
  assert.deepEqual(spectator.legal, []);
});

test('des bots jouent des parties complètes sans coup illégal', () => {
  for (const mode of ['draw', 'block']) {
    for (let players = 2; players <= 4; players++) {
      for (let seed = 1; seed <= 25; seed++) {
        const g = new DominoGame({ mode, targetScore: 100, rng: seeded(seed * 31 + players) });
        g.start(Array.from({ length: players }, (_, i) => ({ name: `P${i}` })));
        let guard = 0;
        while (g.phase !== 'gameOver') {
          if (g.phase === 'roundOver') {
            g.nextRound();
            continue;
          }
          const action = chooseAction(g, g.turn);
          assert.ok(action, 'le bot doit toujours avoir une action');
          if (action.type === 'play') g.play(g.turn, action.tileId, action.side);
          else if (action.type === 'draw') g.draw(g.turn);
          else g.pass(g.turn);
          assert.ok(++guard < 20000);

          const all = [...g.chain.map((t) => t.id), ...g.boneyard.map((t) => t.id), ...g.sleeping.map((t) => t.id), ...g.seats.flatMap((s) => s.hand.map((t) => t.id))];
          assert.equal(all.length, 28);
          assert.equal(new Set(all).size, 28);
          for (let i = 1; i < g.chain.length; i++) assert.equal(g.chain[i - 1].b, g.chain[i].a);
        }
        assert.ok(g.seats[g.winner].score >= 100);
      }
    }
  }
});

test('partie en 100 points : le gagnant de chaque manche marque les points restant chez les autres', () => {
  const g = new DominoGame({ mode: 'block', targetScore: 100 });
  g.start([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
  // Manche 1 : A pose son dernier domino ; B garde 6-6 + 5-4 (21), C garde 6-5 (11) → A marque 32.
  g.turn = 0;
  g.openingTile = null;
  g.seats[0].hand = ['2-3'].map(tile);
  g.seats[1].hand = ['6-6', '5-4'].map(tile);
  g.seats[2].hand = ['6-5'].map(tile);
  g.play(0, '2-3', 'right');
  assert.equal(g.roundResult.points, 32);
  assert.equal(g.seats[0].score, 32);
  assert.equal(g.phase, 'roundOver', 'pas encore 100 points');
  // Manche décisive : A arrive à 98 puis gagne encore 10 points → 108, fin de partie.
  g.nextRound();
  g.seats[0].score = 98;
  g.turn = 0;
  g.openingTile = null;
  g.seats[0].hand = ['1-1'].map(tile);
  g.seats[1].hand = ['4-6'].map(tile);
  g.seats[2].hand = ['0-0'].map(tile);
  g.play(0, '1-1', 'right');
  assert.equal(g.roundResult.points, 10);
  assert.equal(g.seats[0].score, 108);
  assert.equal(g.phase, 'gameOver');
  assert.equal(g.winner, 0);
});

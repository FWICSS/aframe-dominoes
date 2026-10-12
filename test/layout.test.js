'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { layoutChain, previewPlacement, footprint, orientFor, LIMIT, TILE } = require('../public/js/layout');
const { DominoGame } = require('../server/game');
const { chooseAction } = require('../server/bot');

function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function overlap(r1, r2, eps = 1e-6) {
  return r1.minX < r2.maxX - eps && r2.minX < r1.maxX - eps && r1.minZ < r2.maxZ - eps && r2.minZ < r1.maxZ - eps;
}

function distance(r1, r2) {
  const dx = Math.max(0, r1.minX - r2.maxX, r2.minX - r1.maxX);
  const dz = Math.max(0, r1.minZ - r2.maxZ, r2.minZ - r1.maxZ);
  return Math.hypot(dx, dz);
}

// Le chiffre visible à chaque extrémité locale du domino placé.
function endsInWorld(tile, place) {
  const top = Number(tile.id.split('-')[0]);
  const bottom = Number(tile.id.split('-')[1]);
  const ux = Math.sin(place.yaw);
  const uz = Math.cos(place.yaw);
  const h = TILE.L / 4;
  return [
    { value: top, x: place.x - ux * h, z: place.z - uz * h },
    { value: bottom, x: place.x + ux * h, z: place.z + uz * h },
  ];
}

test('le premier domino est au centre', () => {
  const [p] = layoutChain([{ id: '2-5', a: 2, b: 5 }], 0);
  assert.equal(p.x, 0);
  assert.equal(p.z, 0);
});

test('orientFor retourne le domino pour coller au bout', () => {
  const chain = [{ id: '3-6', a: 3, b: 6 }];
  assert.deepEqual(orientFor(chain, '1-3', 'left'), { id: '1-3', a: 1, b: 3 });
  assert.deepEqual(orientFor(chain, '2-6', 'right'), { id: '2-6', a: 6, b: 2 });
});

test('aucune chaîne ne se chevauche, ne sort de la table, et les chiffres se touchent', () => {
  let maxRows = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const g = new DominoGame({ mode: 'draw', rng: seeded(seed) });
    g.start([{ name: 'A' }, { name: 'B' }]);
    while (g.phase === 'playing') {
      const action = chooseAction(g, g.turn);
      if (action.type === 'play') {
        const preview = previewPlacement(g.chain, g.center, action.tileId, action.side);
        g.play(g.turn, action.tileId, action.side);
        const placed = layoutChain(g.chain, g.center);
        const idx = g.chain.findIndex((t) => t.id === action.tileId);
        assert.deepEqual(preview, placed[idx], 'l\'aperçu correspond à la position finale');
      } else if (action.type === 'draw') g.draw(g.turn);
      else g.pass(g.turn);
    }
    const places = layoutChain(g.chain, g.center);
    const rects = g.chain.map((t, i) => footprint(t, places[i]));
    for (let i = 0; i < rects.length; i++) {
      assert.ok(rects[i].maxX <= LIMIT + TILE.L && rects[i].minX >= -LIMIT - TILE.L, 'dans la zone de jeu (x)');
      assert.ok(Math.abs(rects[i].maxZ) < 0.3 && Math.abs(rects[i].minZ) < 0.3, 'dans la zone de jeu (z)');
      maxRows = Math.max(maxRows, Math.abs(places[i].z));
      for (let j = i + 1; j < rects.length; j++) {
        assert.ok(!overlap(rects[i], rects[j]), `chevauchement ${g.chain[i].id} / ${g.chain[j].id} (graine ${seed})`);
      }
    }
    for (let i = 1; i < g.chain.length; i++) {
      assert.ok(distance(rects[i - 1], rects[i]) < 0.004, `${g.chain[i - 1].id} et ${g.chain[i].id} se touchent`);
      // Les moitiés qui portent le même chiffre sont les plus proches l'une de l'autre.
      const prev = g.chain[i - 1];
      const cur = g.chain[i];
      if (prev.a === prev.b || cur.a === cur.b) continue;
      const e1 = endsInWorld(prev, places[i - 1]);
      const e2 = endsInWorld(cur, places[i]);
      let best = null;
      for (const p of e1) for (const q of e2) {
        const d = Math.hypot(p.x - q.x, p.z - q.z);
        if (!best || d < best.d) best = { d, p, q };
      }
      assert.equal(best.p.value, best.q.value, `les chiffres se raccordent (${prev.id} → ${cur.id}, graine ${seed})`);
    }
  }
  assert.ok(maxRows > 0, 'au moins une partie a tourné');
});

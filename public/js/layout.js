// Disposition de la chaîne de dominos sur la table (en mètres, repère de la table).
// La chaîne part du centre et serpente : quand une ligne atteint le bord de la
// zone de jeu, elle tourne d'un quart de tour puis repart dans l'autre sens.
// Utilisable dans le navigateur (window.DominoLayout) et dans Node (tests).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DominoLayout = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Domino réel ≈ 5 × 2,5 × 1 cm ; légèrement agrandi pour rester lisible en VR.
  var TILE = { W: 0.028, L: 0.056, T: 0.011 };
  var GAP = 0.0015;
  var LIMIT = 0.3;

  // Chiffre affiché en haut de la texture (= extrémité locale -z du domino).
  function topValue(id) {
    return Number(String(id).split('-')[0]);
  }

  // Lacet pour qu'un domino aligné selon u = (ux, uz) montre `inner` côté -u.
  function yawFor(id, inner, ux, uz) {
    var yaw = Math.atan2(ux, uz);
    return topValue(id) === inner ? yaw : yaw + Math.PI;
  }

  function walk(tiles, out, start, dir, turnDir) {
    var px = start, pz = 0;
    var dx = dir, tz = turnDir;
    var justTurned = false;
    tiles.forEach(function (item) {
      var t = item.tile;
      // Juste après un virage, un double est posé dans l'axe pour ne pas mordre sur le virage.
      var dbl = t.a === t.b && !justTurned;
      var len = dbl ? TILE.W : TILE.L;
      // Un double en travers ne doit jamais précéder un virage : on vérifie qu'un domino tient encore après lui.
      var needed = dbl ? TILE.W + GAP + TILE.L : len;
      justTurned = false;
      if (Math.abs(px + dx * needed) > LIMIT) {
        // Domino de virage, dans le sens perpendiculaire.
        out[item.index] = {
          x: px + dx * (TILE.W / 2),
          z: pz + tz * (TILE.L / 2 - TILE.W / 2),
          yaw: yawFor(t.id, item.inner, 0, tz),
          turn: true,
        };
        px += dx * TILE.W;
        pz += tz * (TILE.L + GAP);
        dx = -dx;
        justTurned = true;
        return;
      }
      if (dbl) {
        out[item.index] = { x: px + dx * (TILE.W / 2), z: pz, yaw: Math.atan2(dx, 0) + Math.PI / 2 };
      } else {
        out[item.index] = { x: px + dx * (TILE.L / 2), z: pz, yaw: yawFor(t.id, item.inner, dx, 0) };
      }
      px += dx * (len + GAP);
    });
  }

  // chain : [{ id, a, b }] orientés de gauche à droite ; center : index du premier domino posé.
  // Retourne pour chaque domino { x, z, yaw }.
  function layoutChain(chain, center) {
    var out = new Array(chain.length);
    if (!chain.length) return out;
    var c = chain[center];
    var cDouble = c.a === c.b;
    out[center] = cDouble ? { x: 0, z: 0, yaw: 0 } : { x: 0, z: 0, yaw: yawFor(c.id, c.a, 1, 0) };
    var ext = (cDouble ? TILE.W : TILE.L) / 2 + GAP;

    var right = [];
    for (var i = center + 1; i < chain.length; i++) right.push({ tile: chain[i], index: i, inner: chain[i].a });
    var left = [];
    for (var j = center - 1; j >= 0; j--) left.push({ tile: chain[j], index: j, inner: chain[j].b });

    walk(right, out, ext, 1, -1);
    walk(left, out, -ext, -1, 1);
    return out;
  }

  // Oriente un domino de la main pour qu'il se raccorde au bout `side` de la chaîne.
  function orientFor(chain, tileId, side) {
    var parts = String(tileId).split('-').map(Number);
    var a = parts[0], b = parts[1];
    if (!chain.length) return { id: tileId, a: a, b: b };
    if (side === 'left') {
      var l = chain[0].a;
      return b === l ? { id: tileId, a: a, b: b } : { id: tileId, a: b, b: a };
    }
    var r = chain[chain.length - 1].b;
    return a === r ? { id: tileId, a: a, b: b } : { id: tileId, a: b, b: a };
  }

  // Position qu'occuperait un domino joué d'un côté (pour l'aperçu « fantôme »).
  function previewPlacement(chain, center, tileId, side) {
    var tile = orientFor(chain, tileId, side);
    if (!chain.length) return layoutChain([tile], 0)[0];
    if (side === 'left') return layoutChain([tile].concat(chain), center + 1)[0];
    var next = chain.concat([tile]);
    return layoutChain(next, center)[next.length - 1];
  }

  // Emprise au sol (rectangle aligné) d'un domino placé, pour les tests de chevauchement.
  function footprint(tile, place) {
    var alongX = Math.abs(Math.sin(place.yaw)) > 0.5;
    var hx = (alongX ? TILE.L : TILE.W) / 2;
    var hz = (alongX ? TILE.W : TILE.L) / 2;
    return { minX: place.x - hx, maxX: place.x + hx, minZ: place.z - hz, maxZ: place.z + hz };
  }

  return {
    TILE: TILE,
    LIMIT: LIMIT,
    layoutChain: layoutChain,
    orientFor: orientFor,
    previewPlacement: previewPlacement,
    footprint: footprint,
    topValue: topValue,
  };
});

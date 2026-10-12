'use strict';

const { pips, isDouble } = require('./game');

// Choisit l'action d'un joueur automatique : poser le domino le plus lourd
// (les doubles en priorité), en gardant un bout ouvert pour lequel il a encore des dominos.
function chooseAction(game, seat) {
  const moves = game.legalMoves(seat);
  if (moves.length === 0) {
    if (game.canDraw(seat)) return { type: 'draw' };
    if (game.canPass(seat)) return { type: 'pass' };
    return null;
  }
  const hand = game.seats[seat].hand;
  const byId = new Map(hand.map((t) => [t.id, t]));
  const ends = game.ends;

  let best = null;
  for (const m of moves) {
    const tile = byId.get(m.tileId);
    let score = pips(tile) + (isDouble(tile) ? 6 : 0);
    if (ends) {
      const end = m.side === 'left' ? ends.left : ends.right;
      const open = tile.a === end ? tile.b : tile.a;
      score += hand.filter((t) => t !== tile && (t.a === open || t.b === open)).length * 2;
    }
    if (!best || score > best.score) best = { score, move: m };
  }
  return { type: 'play', tileId: best.move.tileId, side: best.move.side };
}

module.exports = { chooseAction };

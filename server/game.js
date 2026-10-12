'use strict';

// Règles du jeu de dominos (double-six), indépendantes du réseau.
//
// Deux variantes :
//  - "draw"  (pioche) : on pioche tant qu'on ne peut pas jouer, on passe si la pioche est vide.
//  - "block" (bloqué) : pas de pioche, on passe si on ne peut pas jouer.
//
// Une manche se termine quand un joueur pose son dernier domino (« domino ! »)
// ou quand plus personne ne peut jouer (partie bloquée). Le gagnant de la manche
// marque la somme des points restant dans les mains adverses.
//
// Deux formats de partie :
//  - "points"      : la partie se termine quand un joueur atteint le score objectif ;
//  - "competition" : 12 manches (12 « poses ») ; la première pose revient au plus
//                    gros double, puis la pose tourne à chaque manche (3 poses
//                    chacun à 4 joueurs) ; le plus haut total l'emporte.

const MAX_PIP = 6;
const COMPETITION_ROUNDS = 12;

function createSet(max = MAX_PIP) {
  const tiles = [];
  for (let a = 0; a <= max; a++) {
    for (let b = a; b <= max; b++) {
      tiles.push({ id: `${a}-${b}`, a, b });
    }
  }
  return tiles;
}

function shuffle(array, rng = Math.random) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const pips = (t) => t.a + t.b;
const isDouble = (t) => t.a === t.b;
const handPips = (hand) => hand.reduce((sum, t) => sum + pips(t), 0);

function handSize(mode, playerCount) {
  if (mode === 'draw' && playerCount > 2) return 5;
  return 7;
}

class DominoGame {
  constructor({ mode = 'draw', format = 'points', targetScore = 100, rng = Math.random } = {}) {
    if (mode !== 'draw' && mode !== 'block') throw new Error(`mode inconnu : ${mode}`);
    if (format !== 'points' && format !== 'competition') throw new Error(`format inconnu : ${format}`);
    this.mode = mode;
    this.format = format;
    this.totalRounds = format === 'competition' ? COMPETITION_ROUNDS : null;
    this.targetScore = targetScore;
    this.rng = rng;
    this.phase = 'idle';
    this.seats = [];
    this.round = 0;
  }

  // players : [{ name }] dans l'ordre de jeu (2 à 4 joueurs).
  start(players) {
    if (players.length < 2 || players.length > 4) throw new Error('2 à 4 joueurs requis');
    this.seats = players.map((p) => ({ name: p.name, hand: [], score: 0 }));
    this.round = 0;
    this.lastWinner = null;
    this.startRound();
  }

  startRound() {
    this.round += 1;
    const tiles = shuffle(createSet(), this.rng);
    const size = handSize(this.mode, this.seats.length);
    for (const seat of this.seats) seat.hand = tiles.splice(0, size);
    this.boneyard = this.mode === 'draw' ? tiles : [];
    this.sleeping = this.mode === 'draw' ? [] : tiles; // dominos écartés en mode bloqué
    this.chain = [];
    this.center = 0;
    this.passes = 0;
    this.roundResult = null;
    this.lastEvent = { type: 'round', round: this.round };
    this.phase = 'playing';

    if (this.format === 'competition' && this.round > 1) {
      // La pose tourne à partir du premier ouvreur, avec le domino de son choix.
      this.turn = (this.firstOpener + this.round - 1) % this.seats.length;
      this.openingTile = null;
    } else if (this.lastWinner != null) {
      // Le gagnant de la manche précédente ouvre avec le domino de son choix.
      this.turn = this.lastWinner;
      this.openingTile = null;
    } else {
      // Sinon : le plus gros double ouvre (à défaut, le domino le plus lourd).
      const { seat, tile } = this.findOpener();
      this.turn = seat;
      this.openingTile = tile.id;
      if (this.round === 1) this.firstOpener = seat;
    }
  }

  findOpener() {
    let best = null;
    this.seats.forEach((s, seat) => {
      for (const tile of s.hand) {
        const rank = (isDouble(tile) ? 100 : 0) + pips(tile) * 10 + Math.max(tile.a, tile.b);
        if (!best || rank > best.rank) best = { seat, tile, rank };
      }
    });
    return best;
  }

  get ends() {
    if (this.chain.length === 0) return null;
    return { left: this.chain[0].a, right: this.chain[this.chain.length - 1].b };
  }

  legalMoves(seat) {
    if (this.phase !== 'playing' || seat !== this.turn) return [];
    const hand = this.seats[seat].hand;
    if (this.chain.length === 0) {
      return hand
        .filter((t) => !this.openingTile || t.id === this.openingTile)
        .map((t) => ({ tileId: t.id, side: 'right' }));
    }
    const { left, right } = this.ends;
    const moves = [];
    for (const t of hand) {
      if (t.a === left || t.b === left) moves.push({ tileId: t.id, side: 'left' });
      if (t.a === right || t.b === right) moves.push({ tileId: t.id, side: 'right' });
    }
    return moves;
  }

  canDraw(seat) {
    return this.phase === 'playing' && seat === this.turn && this.mode === 'draw' &&
      this.boneyard.length > 0 && this.legalMoves(seat).length === 0;
  }

  canPass(seat) {
    return this.phase === 'playing' && seat === this.turn &&
      this.boneyard.length === 0 && this.legalMoves(seat).length === 0;
  }

  play(seat, tileId, side) {
    const move = this.legalMoves(seat).find((m) => m.tileId === tileId && (m.side === side || this.chain.length === 0));
    if (!move) throw new Error('coup illégal');
    const hand = this.seats[seat].hand;
    const idx = hand.findIndex((t) => t.id === tileId);
    const [tile] = hand.splice(idx, 1);
    let placed;

    if (this.chain.length === 0) {
      placed = { id: tile.id, a: tile.a, b: tile.b, seat };
      this.chain.push(placed);
      this.center = 0;
      this.openingTile = null;
    } else if (move.side === 'left') {
      const end = this.ends.left;
      placed = tile.b === end ? { id: tile.id, a: tile.a, b: tile.b, seat } : { id: tile.id, a: tile.b, b: tile.a, seat };
      this.chain.unshift(placed);
      this.center += 1;
    } else {
      const end = this.ends.right;
      placed = tile.a === end ? { id: tile.id, a: tile.a, b: tile.b, seat } : { id: tile.id, a: tile.b, b: tile.a, seat };
      this.chain.push(placed);
    }

    this.passes = 0;
    this.lastEvent = { type: 'play', seat, tileId, side: move.side };

    if (hand.length === 0) {
      this.endRound('domino', seat);
    } else {
      this.nextTurn();
    }
    return this.lastEvent;
  }

  draw(seat) {
    if (!this.canDraw(seat)) throw new Error('pioche impossible');
    const tile = this.boneyard.pop();
    this.seats[seat].hand.push(tile);
    this.lastEvent = { type: 'draw', seat, tileId: tile.id };
    return this.lastEvent;
  }

  pass(seat) {
    if (!this.canPass(seat)) throw new Error('passe impossible');
    this.passes += 1;
    this.lastEvent = { type: 'pass', seat };
    if (this.passes >= this.seats.length) {
      this.endRound('blocked', null);
    } else {
      this.nextTurn();
    }
    return this.lastEvent;
  }

  nextTurn() {
    this.turn = (this.turn + 1) % this.seats.length;
  }

  endRound(reason, winner) {
    const totals = this.seats.map((s) => handPips(s.hand));
    if (reason === 'blocked') {
      const min = Math.min(...totals);
      const lowest = totals.map((t, i) => (t === min ? i : -1)).filter((i) => i >= 0);
      winner = lowest.length === 1 ? lowest[0] : null;
    }
    let points = 0;
    if (winner != null) {
      points = totals.reduce((sum, t, i) => (i === winner ? sum : sum + t), 0);
      this.seats[winner].score += points;
    }
    this.lastWinner = winner;
    this.roundResult = {
      reason,
      winner,
      points,
      totals,
      hands: this.seats.map((s) => s.hand.map((t) => t.id)),
    };
    const top = Math.max(...this.seats.map((s) => s.score));
    const finished = this.format === 'competition' ? this.round >= this.totalRounds : top >= this.targetScore;
    if (finished) {
      this.phase = 'gameOver';
      this.winners = this.seats.map((s, i) => (s.score === top ? i : -1)).filter((i) => i >= 0);
      this.winner = this.winners[0];
    } else {
      this.phase = 'roundOver';
    }
    this.lastEvent = { type: 'roundEnd', reason, winner };
  }

  nextRound() {
    if (this.phase !== 'roundOver') throw new Error('la manche n\'est pas terminée');
    this.startRound();
  }

  // Vue de la partie pour un siège donné (-1 = spectateur) : on ne révèle que sa propre main.
  viewFor(seat) {
    const own = seat >= 0 && this.seats[seat];
    return {
      phase: this.phase,
      mode: this.mode,
      format: this.format,
      totalRounds: this.totalRounds,
      targetScore: this.targetScore,
      round: this.round,
      turn: this.turn,
      chain: this.chain.map((t) => ({ ...t })),
      center: this.center,
      ends: this.ends,
      boneyardCount: this.boneyard.length,
      openingTile: this.openingTile,
      seats: this.seats.map((s) => ({ name: s.name, score: s.score, handCount: s.hand.length })),
      hand: own ? own.hand.map((t) => t.id) : null,
      legal: own ? this.legalMoves(seat) : [],
      canDraw: own ? this.canDraw(seat) : false,
      canPass: own ? this.canPass(seat) : false,
      lastEvent: this.lastEvent,
      roundResult: this.roundResult,
      winner: this.phase === 'gameOver' ? this.winner : null,
      winners: this.phase === 'gameOver' ? this.winners : null,
    };
  }
}

module.exports = { COMPETITION_ROUNDS, DominoGame, createSet, shuffle, pips, isDouble, handPips, handSize };

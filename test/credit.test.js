'use strict';

// Crédit « Conçu et développé par TAFRAP Studio » de l'écran d'accueil (TASK-054 du dépôt tafrap) :
// le lien porte ?ref=dominos pour que tafrap.fr sache d'où vient le visiteur, s'ouvre dans un nouvel
// onglet avec noopener et garde la provenance (pas de noreferrer).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

test('l\'écran d\'accueil crédite TAFRAP Studio avec le lien suivi', () => {
  const credit = html.match(/<p class="credit"><a ([^>]*)>([^<]*)<span class="sr-only">([^<]*)<\/span><\/a><\/p>/);
  assert.ok(credit, 'paragraphe de crédit introuvable');
  const [, attributs, texte, annonce] = credit;
  assert.equal(texte, 'Conçu et développé par TAFRAP Studio');
  assert.equal(attributs, 'href="https://tafrap.fr/?ref=dominos" target="_blank" rel="noopener"');
  assert.match(annonce, /nouvel onglet/);
});

test('le crédit est dans le formulaire d\'accueil, visible avant de rejoindre la table', () => {
  const formulaire = html.slice(html.indexOf('<form id="join-form"'), html.indexOf('</form>'));
  assert.ok(formulaire.includes('class="credit"'));
});

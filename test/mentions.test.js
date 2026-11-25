'use strict';

// Mentions légales (obligation LCEN, article 6) : TAFRAP Studio éditeur et hébergeur, décision de
// Dimitri du 2026-11-24. La page doit être servie, liée depuis l'accueil, et décrire les données
// réellement traitées (prénom, stockage local, micro), sans champ laissé vide.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('../server/index.js');

const racine = path.join(__dirname, '..', 'public');
const page = fs.readFileSync(path.join(racine, 'mentions-legales.html'), 'utf8');
const accueil = fs.readFileSync(path.join(racine, 'index.html'), 'utf8');

test('la page nomme l\'éditeur, son SIRET et le directeur de la publication', () => {
  assert.match(page, /TAFRAP Studio/);
  assert.match(page, /131 880 668 00010/);
  assert.match(page, /Directeur de la publication :<\/dt><dd>Dimitri Aigle/);
  assert.match(page, /<h2>Hébergement<\/h2>/);
  assert.doesNotMatch(page, /à compléter|Dim's Info|92070724700010/);
});

test('la page décrit le prénom, le stockage local et le micro', () => {
  for (const mot of ['Prénom', 'localStorage', 'sessionStorage', 'Micro', 'STUN']) {
    assert.ok(page.includes(mot), `mention absente : ${mot}`);
  }
});

test('l\'accueil renvoie vers les mentions légales depuis le formulaire', () => {
  const formulaire = accueil.slice(accueil.indexOf('<form id="join-form"'), accueil.indexOf('</form>'));
  assert.ok(formulaire.includes('href="mentions-legales.html"'));
});

test('le serveur sert la page en HTML', async () => {
  const { server, close } = createServer({ port: 0 });
  await new Promise((r) => server.once('listening', r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/mentions-legales.html`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(await res.text(), /Mentions légales/);
  await close();
});

'use strict';

// Aperçu d'un lien partagé et icône d'onglet (TASK-009) : sans og:image en URL absolue, WhatsApp,
// LinkedIn et Facebook affichent un lien nu ; sans favicon, l'onglet n'a pas d'icône.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');

function meta(attr, name) {
  const m = html.match(new RegExp(`<meta ${attr}="${name.replace(':', '\\:')}" content="([^"]*)">`));
  return m && m[1];
}

test('les balises Open Graph et Twitter sont complètes', () => {
  for (const name of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:image:alt']) {
    assert.ok(meta('property', name), `${name} manquante`);
  }
  assert.equal(meta('name', 'twitter:card'), 'summary_large_image');
  assert.ok(meta('name', 'twitter:image'));
});

test('l\'image de partage est une URL absolue qui pointe vers un fichier du site', () => {
  for (const url of [meta('property', 'og:image'), meta('name', 'twitter:image')]) {
    assert.match(url, /^https:\/\/dominos\.tafrap\.fr\//);
    assert.ok(fs.existsSync(path.join(PUBLIC, new URL(url).pathname)), `${url} absente de public/`);
  }
  assert.equal(meta('property', 'og:image:width'), '1200');
  assert.equal(meta('property', 'og:image:height'), '630');
});

test('les icônes déclarées existent', () => {
  const liens = [...html.matchAll(/<link rel="(?:icon|apple-touch-icon)" href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(liens.sort(), ['/apple-touch-icon.png', '/favicon.ico', '/favicon.svg']);
  for (const href of liens) assert.ok(fs.existsSync(path.join(PUBLIC, href)), `${href} absent de public/`);
});

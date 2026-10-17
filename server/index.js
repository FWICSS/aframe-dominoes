'use strict';

// Serveur HTTP(S) + WebSocket : sert le site et synchronise les parties.
//
//   PORT=3000 node server/index.js
//   SSL_KEY=key.pem SSL_CERT=cert.pem node server/index.js   (HTTPS, nécessaire pour la VR sur un casque en réseau local)

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { Room } = require('./room');

const ROOT = path.join(__dirname, '..', 'public');
// Le nom du fichier distribué porte la version d'A-Frame : on le lit dans son package.json
// pour qu'une montée de version ne casse pas le service du script.
const AFRAME_DIR = path.join(__dirname, '..', 'node_modules', 'aframe');
const AFRAME_VERSION = JSON.parse(fs.readFileSync(path.join(AFRAME_DIR, 'package.json'), 'utf8')).version;
const VENDOR = {
  '/vendor/aframe.min.js': path.join(AFRAME_DIR, 'dist', `aframe-v${AFRAME_VERSION}.min.js`),
};
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};
const ROOM_CODE = /^[A-Z0-9]{3,8}$/;
const ROOM_IDLE_MS = 10 * 60 * 1000;

// Serveurs STUN/TURN proposés aux navigateurs pour le chat vocal.
// ICE_SERVERS='[{"urls":"turn:turn.exemple.fr:3478","username":"u","credential":"p"}]'
function iceServers() {
  const fallback = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  if (!process.env.ICE_SERVERS) return fallback;
  try {
    const list = JSON.parse(process.env.ICE_SERVERS);
    if (Array.isArray(list) && list.length) return list;
  } catch {
    console.warn('ICE_SERVERS invalide (JSON attendu), STUN par défaut utilisé');
  }
  return fallback;
}

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/config.json') {
    const body = JSON.stringify({ iceServers: iceServers() });
    res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' }).end(body);
    return;
  }
  let file = VENDOR[url.pathname];
  if (!file) {
    const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    file = path.join(ROOT, path.normalize(rel));
    if (!file.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end();
      return;
    }
  }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Introuvable');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
}

function createServer({ port = 3000, key, cert, roomOptions = {} } = {}) {
  const server = key && cert
    ? https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, serveStatic)
    : http.createServer(serveStatic);
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
  const rooms = new Map();

  wss.on('connection', (socket) => {
    let room = null;
    let memberId = null;
    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });

    socket.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (!msg || typeof msg.t !== 'string') return;

      if (msg.t === 'join') {
        if (room) return;
        const code = String(msg.room || '').toUpperCase();
        if (!ROOM_CODE.test(code)) {
          socket.send(JSON.stringify({ t: 'error', message: 'code de salle invalide' }));
          return;
        }
        const name = String(msg.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16) || 'Joueur';
        memberId = /^[a-zA-Z0-9-]{8,64}$/.test(msg.clientId) ? msg.clientId : crypto.randomUUID();
        room = rooms.get(code);
        if (!room) {
          room = new Room(code, roomOptions);
          rooms.set(code, room);
        }
        room.join(memberId, name, socket);
        return;
      }
      if (room) room.handle(memberId, msg);
    });

    socket.on('close', () => {
      if (room) room.leave(memberId, socket);
    });
  });

  // Détection des connexions mortes + nettoyage des salles vides.
  const interval = setInterval(() => {
    for (const socket of wss.clients) {
      if (!socket.isAlive) {
        socket.terminate();
        continue;
      }
      socket.isAlive = false;
      socket.ping();
    }
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (room.humansOnline === 0 && now - room.lastActivity > ROOM_IDLE_MS) {
        room.dispose();
        rooms.delete(code);
      }
    }
  }, 30000);
  interval.unref();

  server.on('close', () => clearInterval(interval));
  server.listen(port);

  function close() {
    for (const room of rooms.values()) room.dispose();
    for (const socket of wss.clients) socket.terminate();
    wss.close();
    return new Promise((resolve) => server.close(resolve));
  }
  return { server, wss, rooms, close };
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const { server } = createServer({ port, key: process.env.SSL_KEY, cert: process.env.SSL_CERT });
  server.on('listening', () => {
    const proto = process.env.SSL_KEY ? 'https' : 'http';
    const p = server.address().port;
    console.log(`Dominos VR prêt sur ${proto}://localhost:${p}`);
    // Adresses à ouvrir depuis un casque ou un téléphone sur le même réseau.
    for (const list of Object.values(require('os').networkInterfaces())) {
      for (const addr of list || []) {
        if (addr.family === 'IPv4' && !addr.internal) console.log(`  sur le réseau local : ${proto}://${addr.address}:${p}`);
      }
    }
    if (proto === 'http') console.log('  (la VR sur casque exige HTTPS : voir le README)');
  });
}

module.exports = { createServer };

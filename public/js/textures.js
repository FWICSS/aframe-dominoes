/* global AFRAME */
// Textures dessinées dans des <canvas> : aucune image à télécharger.
(function () {
  'use strict';
  var THREE = AFRAME.THREE;
  var cache = {};

  function canvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function toTexture(c, repeat) {
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    if (repeat) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat[0], repeat[1]);
    }
    return tex;
  }

  // Générateur pseudo-aléatoire pour que les textures soient identiques chez tout le monde.
  function rng(seed) {
    return function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  function noise(ctx, w, h, amount, seed) {
    var rand = rng(seed || 7);
    var img = ctx.getImageData(0, 0, w, h);
    for (var i = 0; i < img.data.length; i += 4) {
      var n = (rand() - 0.5) * amount;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  }

  // Disposition classique des points sur une moitié de domino (grille 3 × 3).
  var PIPS = {
    0: [],
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
  };

  function ivory(ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#fbf7ec');
    g.addColorStop(1, '#ece4d0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 6, 3);
  }

  function drawHalf(ctx, value, x0, y0, size) {
    var pad = size * 0.22;
    var step = (size - pad * 2) / 2;
    var r = size * 0.085;
    PIPS[value].forEach(function (p) {
      // Colonne = p[0], ligne = p[1].
      var cx = x0 + pad + p[0] * step;
      var cy = y0 + pad + p[1] * step;
      var g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
      g.addColorStop(0, '#3a3a3a');
      g.addColorStop(1, '#0b0b0b');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 0.5, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    });
  }

  // Face d'un domino : valeur du haut = premier chiffre de l'identifiant (extrémité -z).
  function tileFace(id) {
    var key = 'face:' + id;
    if (cache[key]) return cache[key];
    var parts = id.split('-').map(Number);
    var c = canvas(128, 256);
    var ctx = c.getContext('2d');
    ivory(ctx, 128, 256);
    drawHalf(ctx, parts[0], 0, 0, 128);
    drawHalf(ctx, parts[1], 0, 128, 128);
    // Ligne centrale gravée + rivet en laiton.
    ctx.fillStyle = '#5b5346';
    ctx.fillRect(14, 125, 100, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(14, 131, 100, 1.5);
    var g = ctx.createRadialGradient(62, 126, 1, 64, 128, 9);
    g.addColorStop(0, '#fff2b0');
    g.addColorStop(0.5, '#c9a43a');
    g.addColorStop(1, '#7a5d16');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(64, 128, 8, 0, Math.PI * 2);
    ctx.fill();
    cache[key] = toTexture(c);
    return cache[key];
  }

  function tileBack() {
    if (cache.back) return cache.back;
    var c = canvas(128, 256);
    var ctx = c.getContext('2d');
    ivory(ctx, 128, 256);
    ctx.strokeStyle = 'rgba(120, 100, 70, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, 100, 228);
    ctx.fillStyle = 'rgba(120, 100, 70, 0.35)';
    ctx.beginPath();
    ctx.moveTo(64, 96);
    ctx.lineTo(90, 128);
    ctx.lineTo(64, 160);
    ctx.lineTo(38, 128);
    ctx.closePath();
    ctx.fill();
    cache.back = toTexture(c);
    return cache.back;
  }

  function tileSide() {
    if (cache.side) return cache.side;
    var c = canvas(64, 16);
    var ctx = c.getContext('2d');
    ivory(ctx, 64, 16);
    cache.side = toTexture(c);
    return cache.side;
  }

  function wood(seed, base, dark, repeat) {
    var key = 'wood:' + seed + base + (repeat || '');
    if (cache[key]) return cache[key];
    var c = canvas(512, 512);
    var ctx = c.getContext('2d');
    var rand = rng(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 160; i++) {
      var y = rand() * 512;
      ctx.strokeStyle = dark;
      ctx.globalAlpha = 0.05 + rand() * 0.12;
      ctx.lineWidth = 1 + rand() * 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (var x = 0; x <= 512; x += 32) {
        ctx.lineTo(x, y + Math.sin(x / 60 + i) * 4 + (rand() - 0.5) * 2);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    noise(ctx, 512, 512, 10, seed);
    cache[key] = toTexture(c, repeat);
    return cache[key];
  }

  function planks() {
    if (cache.planks) return cache.planks;
    var c = canvas(512, 512);
    var ctx = c.getContext('2d');
    var rand = rng(11);
    var colors = ['#8a5a36', '#7c4f2e', '#94653f', '#6f4527'];
    for (var row = 0; row < 8; row++) {
      var offset = rand() * 256;
      for (var col = -1; col < 3; col++) {
        ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
        ctx.fillRect(col * 256 + offset, row * 64, 256, 64);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(col * 256 + offset, row * 64, 2, 64);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, row * 64, 512, 2);
      for (var k = 0; k < 14; k++) {
        ctx.strokeStyle = 'rgba(40,20,5,0.15)';
        ctx.beginPath();
        var yy = row * 64 + 4 + rand() * 56;
        ctx.moveTo(0, yy);
        ctx.bezierCurveTo(170, yy + 3, 340, yy - 3, 512, yy + 1);
        ctx.stroke();
      }
    }
    noise(ctx, 512, 512, 12, 5);
    cache.planks = toTexture(c, [6, 6]);
    return cache.planks;
  }

  function felt() {
    if (cache.felt) return cache.felt;
    var c = canvas(256, 256);
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(128, 128, 10, 128, 128, 180);
    g.addColorStop(0, '#1f6b43');
    g.addColorStop(1, '#154d30');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    noise(ctx, 256, 256, 18, 9);
    cache.felt = toTexture(c);
    return cache.felt;
  }

  function wallpaper() {
    if (cache.wall) return cache.wall;
    var c = canvas(256, 256);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#d8c9a8';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(150, 110, 70, 0.18)';
    for (var x = 0; x < 256; x += 32) ctx.fillRect(x, 0, 10, 256);
    noise(ctx, 256, 256, 8, 13);
    cache.wall = toTexture(c, [12, 3]);
    return cache.wall;
  }

  function rug() {
    if (cache.rug) return cache.rug;
    var c = canvas(512, 512);
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#7a1f22';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#d6a64a';
    ctx.lineWidth = 10;
    ctx.strokeRect(30, 30, 452, 452);
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 60, 392, 392);
    ctx.fillStyle = 'rgba(214, 166, 74, 0.5)';
    for (var i = 0; i < 8; i++) {
      ctx.save();
      ctx.translate(256, 256);
      ctx.rotate((i * Math.PI) / 4);
      ctx.beginPath();
      ctx.ellipse(0, -90, 25, 70, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    noise(ctx, 512, 512, 16, 17);
    cache.rug = toTexture(c);
    return cache.rug;
  }

  function painting(seed) {
    var key = 'painting:' + seed;
    if (cache[key]) return cache[key];
    var c = canvas(256, 192);
    var ctx = c.getContext('2d');
    var rand = rng(seed);
    var sky = ctx.createLinearGradient(0, 0, 0, 192);
    sky.addColorStop(0, ['#f2b880', '#9cc3e6', '#c7a0d8'][seed % 3]);
    sky.addColorStop(1, '#fbeedd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 256, 192);
    for (var l = 0; l < 3; l++) {
      ctx.fillStyle = ['#5f7f4f', '#3f5f3a', '#2b4128'][l];
      ctx.beginPath();
      ctx.moveTo(0, 192);
      for (var x = 0; x <= 256; x += 16) ctx.lineTo(x, 100 + l * 25 + Math.sin(x / 40 + seed + l) * 15 + rand() * 6);
      ctx.lineTo(256, 192);
      ctx.fill();
    }
    noise(ctx, 256, 192, 14, seed);
    cache[key] = toTexture(c);
    return cache[key];
  }

  // Étiquette de texte (supporte les accents, contrairement aux polices SDF d'A-Frame).
  function drawLabel(ctx, w, h, opts) {
    ctx.clearRect(0, 0, w, h);
    var r = opts.radius == null ? 24 : opts.radius;
    ctx.fillStyle = opts.background || 'rgba(20, 16, 12, 0.85)';
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(w, 0, w, h, r);
    ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r);
    ctx.arcTo(0, 0, w, 0, r);
    ctx.closePath();
    ctx.fill();
    if (opts.border) {
      ctx.strokeStyle = opts.border;
      ctx.lineWidth = 6;
      ctx.stroke();
    }
    var lines = opts.lines || [opts.text || ''];
    var scale = opts.scale || 1;
    var size = (opts.fontSize || 48) * scale;
    var lineH = size * 1.25;
    var y = opts.align === 'top' ? size * 1.1 + 12 : h / 2 - ((lines.length - 1) * lineH) / 2;
    ctx.textAlign = opts.textAlign || 'center';
    ctx.textBaseline = 'middle';
    var x = ctx.textAlign === 'left' ? 28 : w / 2;
    lines.forEach(function (line, i) {
      var style = typeof line === 'string' ? { text: line } : line;
      ctx.font = (style.bold || (i === 0 && opts.boldFirst) ? 'bold ' : '') + (style.size ? style.size * scale : size) + 'px system-ui, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = style.color || opts.color || '#f5ecd8';
      ctx.fillText(style.text, x, y + i * lineH);
    });
  }

  window.DominoTextures = {
    tileFace: tileFace,
    tileBack: tileBack,
    tileSide: tileSide,
    wood: wood,
    planks: planks,
    felt: felt,
    wallpaper: wallpaper,
    rug: rug,
    painting: painting,
    drawLabel: drawLabel,
    toTexture: toTexture,
    canvas: canvas,
  };
})();

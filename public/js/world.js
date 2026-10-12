/* global AFRAME */
// Décor : salon chaleureux, table de jeu avec tapis feutré, chaises et suspension.
(function () {
  'use strict';
  var THREE = AFRAME.THREE;
  var TX = window.DominoTextures;

  var C = {
    TABLE_Y: 0.74, // hauteur du feutre
    TABLE_HALF: 0.62,
    FELT_HALF: 0.56,
    SEAT_R: 0.85, // distance centre de table → joueur
    HAND_Z: 0.43, // distance centre de table → dominos en main
    PILE: { x: 0.43, z: 0.43 },
  };

  function mesh(geometry, material, opts) {
    var m = new THREE.Mesh(geometry, material);
    opts = opts || {};
    if (opts.pos) m.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
    if (opts.rot) m.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
    m.castShadow = !!opts.cast;
    m.receiveShadow = opts.receive !== false;
    return m;
  }

  function box(w, h, d, material, pos, opts) {
    opts = opts || {};
    opts.pos = pos;
    return mesh(new THREE.BoxGeometry(w, h, d), material, opts);
  }

  // Pavé aux arêtes arrondies (comme un vrai domino) qui garde les 6 groupes de
  // matériaux de BoxGeometry. Les sommets proches des bords sont resserrés puis
  // projetés sur un quart de cercle de rayon r ; les UV des grandes faces sont
  // recalculées pour que les points restent bien placés.
  function roundedBox(w, h, d, r) {
    var SEG = 8;
    var g = new THREE.BoxGeometry(1, 1, 1, SEG, SEG, SEG);
    var half = [w / 2, h / 2, d / 2];
    // Répartition des lignes de la grille sur une demi-longueur : centre, puis serrées près du bord.
    function remap(u, hl) {
      var k = Math.round(Math.abs(u) * SEG);
      var stops = [0, (hl - r) * 0.5, hl - r, hl - r * 0.3, hl];
      return Math.sign(u) * stops[k];
    }
    var pos = g.attributes.position;
    var nor = g.attributes.normal;
    var uv = g.attributes.uv;
    var v = new THREE.Vector3();
    var c = new THREE.Vector3();
    var n = new THREE.Vector3();
    for (var i = 0; i < pos.count; i++) {
      v.set(remap(pos.getX(i), half[0]), remap(pos.getY(i), half[1]), remap(pos.getZ(i), half[2]));
      c.set(
        THREE.MathUtils.clamp(v.x, -half[0] + r, half[0] - r),
        THREE.MathUtils.clamp(v.y, -half[1] + r, half[1] - r),
        THREE.MathUtils.clamp(v.z, -half[2] + r, half[2] - r)
      );
      n.subVectors(v, c);
      if (n.lengthSq() > 1e-12) {
        n.normalize();
        v.copy(c).addScaledVector(n, r);
        nor.setXYZ(i, n.x, n.y, n.z);
      }
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    // UV planaires pour la face (+y) et le dos (-y) : groupes 2 et 3.
    var index = g.index;
    [2, 3].forEach(function (gi) {
      var grp = g.groups[gi];
      for (var j = grp.start; j < grp.start + grp.count; j++) {
        var k = index.getX(j);
        var x = (pos.getX(k) + half[0]) / w;
        var z = (pos.getZ(k) + half[2]) / d;
        uv.setXY(k, x, gi === 2 ? 1 - z : z);
      }
    });
    pos.needsUpdate = nor.needsUpdate = uv.needsUpdate = true;
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }

  function seatQuaternion(tablePos) {
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (tablePos * Math.PI) / 2);
  }

  function buildRoom(root) {
    var floorMat = new THREE.MeshStandardMaterial({ map: TX.planks(), roughness: 0.75 });
    var floor = mesh(new THREE.PlaneGeometry(9, 9), floorMat, { rot: [-Math.PI / 2, 0, 0] });
    root.add(floor);

    var rugMat = new THREE.MeshStandardMaterial({ map: TX.rug(), roughness: 1 });
    root.add(mesh(new THREE.PlaneGeometry(3, 3), rugMat, { pos: [0, 0.003, 0], rot: [-Math.PI / 2, 0, 0] }));

    var wallMat = new THREE.MeshStandardMaterial({ map: TX.wallpaper(), roughness: 0.95 });
    var baseMat = new THREE.MeshStandardMaterial({ color: '#4a2e1c', roughness: 0.6 });
    var H = 2.8;
    [[0, -4.5, 0], [0, 4.5, Math.PI], [-4.5, 0, Math.PI / 2], [4.5, 0, -Math.PI / 2]].forEach(function (w) {
      var wall = mesh(new THREE.PlaneGeometry(9, H), wallMat, { pos: [w[0], H / 2, w[1]], rot: [0, w[2], 0] });
      root.add(wall);
      var base = box(9, 0.12, 0.03, baseMat, [w[0], 0.06, w[1]], { rot: [0, w[2], 0] });
      base.position.x += Math.sin(w[2]) * 0.015;
      base.position.z += Math.cos(w[2]) * 0.015;
      root.add(base);
    });
    var ceiling = mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: 1 }),
      { pos: [0, H, 0], rot: [Math.PI / 2, 0, 0] });
    root.add(ceiling);

    // Fenêtre lumineuse (ciel du soir).
    var sky = TX.canvas(256, 256);
    var sctx = sky.getContext('2d');
    var grad = sctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#355c8c');
    grad.addColorStop(0.6, '#f0a868');
    grad.addColorStop(1, '#f7d9a8');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 256, 256);
    var windowMat = new THREE.MeshBasicMaterial({ map: TX.toTexture(sky) });
    var frameMat = new THREE.MeshStandardMaterial({ color: '#f3efe6', roughness: 0.5 });
    var win = new THREE.Group();
    win.add(mesh(new THREE.PlaneGeometry(1.6, 1.2), windowMat, { receive: false }));
    win.add(box(1.7, 0.06, 0.05, frameMat, [0, 0.63, 0.01]));
    win.add(box(1.7, 0.06, 0.05, frameMat, [0, -0.63, 0.01]));
    win.add(box(0.06, 1.3, 0.05, frameMat, [-0.83, 0, 0.01]));
    win.add(box(0.06, 1.3, 0.05, frameMat, [0.83, 0, 0.01]));
    win.add(box(0.03, 1.2, 0.03, frameMat, [0, 0, 0.01]));
    win.add(box(1.6, 0.03, 0.03, frameMat, [0, 0, 0.01]));
    win.position.set(4.49, 1.5, -1);
    win.rotation.y = -Math.PI / 2;
    root.add(win);

    // Tableaux.
    var frameWood = new THREE.MeshStandardMaterial({ map: TX.wood(5, '#6b4423', '#2e1a0c'), roughness: 0.5 });
    [[-1.4, 1, 1.0, 0.75], [1.3, 2, 0.8, 0.6], [-4.49, 3, 1.1, 0.8]].forEach(function (p, i) {
      var g = new THREE.Group();
      g.add(box(p[2] + 0.08, p[3] + 0.08, 0.03, frameWood, [0, 0, 0]));
      g.add(mesh(new THREE.PlaneGeometry(p[2], p[3]), new THREE.MeshStandardMaterial({ map: TX.painting(p[1]), roughness: 0.9 }), { pos: [0, 0, 0.017] }));
      if (i < 2) {
        g.position.set(p[0], 1.6, -4.47);
      } else {
        g.position.set(-4.47, 1.6, 0.8);
        g.rotation.y = Math.PI / 2;
      }
      root.add(g);
    });

    // Bibliothèque.
    var shelfMat = new THREE.MeshStandardMaterial({ map: TX.wood(8, '#5a3820', '#24140a'), roughness: 0.7 });
    var shelf = new THREE.Group();
    shelf.add(box(1.4, 1.9, 0.05, shelfMat, [0, 0.95, -0.15]));
    shelf.add(box(0.05, 1.9, 0.35, shelfMat, [-0.68, 0.95, 0]));
    shelf.add(box(0.05, 1.9, 0.35, shelfMat, [0.68, 0.95, 0]));
    var bookColors = ['#7a2e2e', '#2e4a7a', '#3f6b3a', '#a07a2a', '#5a3a6b', '#1f1f1f'];
    var seed = 3;
    function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var level = 0; level < 5; level++) {
      var y = 0.05 + level * 0.42;
      shelf.add(box(1.36, 0.03, 0.33, shelfMat, [0, y, 0]));
      var x = -0.62;
      while (x < 0.58 && level > 0) {
        var bw = 0.03 + rand() * 0.04;
        var bh = 0.22 + rand() * 0.12;
        shelf.add(box(bw, bh, 0.22, new THREE.MeshStandardMaterial({ color: bookColors[Math.floor(rand() * bookColors.length)], roughness: 0.8 }), [x + bw / 2, y + 0.015 + bh / 2, 0.02]));
        x += bw + 0.004;
        if (rand() < 0.08) x += 0.12;
      }
    }
    shelf.position.set(-2.6, 0, -4.3);
    root.add(shelf);

    // Plante.
    var pot = mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.35, 20), new THREE.MeshStandardMaterial({ color: '#a4552f', roughness: 0.8 }), { pos: [3.8, 0.175, -3.8], cast: true });
    root.add(pot);
    var leafMat = new THREE.MeshStandardMaterial({ color: '#2f6b35', roughness: 0.7 });
    for (var i = 0; i < 9; i++) {
      var leaf = mesh(new THREE.SphereGeometry(0.16, 10, 8), leafMat, { pos: [3.8 + Math.cos(i) * 0.12, 0.55 + (i % 3) * 0.18, -3.8 + Math.sin(i * 1.7) * 0.12], cast: true });
      leaf.scale.set(1, 1.4, 0.6);
      leaf.rotation.y = i;
      root.add(leaf);
    }
  }

  function buildLamp(sceneEl, root) {
    var shadeMat = new THREE.MeshStandardMaterial({ color: '#2f4f3a', roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide });
    var cord = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.55, 6), new THREE.MeshStandardMaterial({ color: '#111' }), { pos: [0, 2.8 - 0.275, 0] });
    root.add(cord);
    var shade = mesh(new THREE.ConeGeometry(0.28, 0.2, 32, 1, true), shadeMat, { pos: [0, 2.16, 0], receive: false });
    root.add(shade);
    var bulb = mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff3d0' }), { pos: [0, 2.1, 0], receive: false });
    root.add(bulb);

    var spot = document.createElement('a-entity');
    spot.setAttribute('position', '0 2.08 0');
    spot.setAttribute('light', {
      type: 'spot', color: '#ffe7c2', intensity: 5, angle: 50, penumbra: 0.65, distance: 6, decay: 1,
      castShadow: true, shadowMapWidth: 2048, shadowMapHeight: 2048, shadowBias: -0.0004,
      shadowCameraNear: 0.5, shadowCameraFar: 3.5, target: '#table-center',
    });
    sceneEl.appendChild(spot);

    var hemi = document.createElement('a-entity');
    hemi.setAttribute('light', { type: 'hemisphere', color: '#fff4e0', groundColor: '#5a4030', intensity: 1.1 });
    sceneEl.appendChild(hemi);

    var windowLight = document.createElement('a-entity');
    windowLight.setAttribute('position', '4 2 -1');
    windowLight.setAttribute('light', { type: 'directional', color: '#ffc68a', intensity: 0.6 });
    sceneEl.appendChild(windowLight);
  }

  function buildTable(root) {
    var woodMat = new THREE.MeshStandardMaterial({ map: TX.wood(21, '#6e3f1f', '#2b1307'), roughness: 0.45, metalness: 0.05 });
    var feltMat = new THREE.MeshStandardMaterial({ map: TX.felt(), roughness: 1 });
    var Y = C.TABLE_Y;
    var g = new THREE.Group();
    var size = C.TABLE_HALF * 2;
    g.add(box(size, 0.045, size, woodMat, [0, Y - 0.026, 0], { cast: true }));
    g.add(box(C.FELT_HALF * 2, 0.004, C.FELT_HALF * 2, feltMat, [0, Y - 0.002, 0]));
    // Rebord en bois.
    var rimW = C.TABLE_HALF - C.FELT_HALF;
    var rimC = C.FELT_HALF + rimW / 2;
    g.add(box(size, 0.014, rimW, woodMat, [0, Y + 0.003, rimC], { cast: true }));
    g.add(box(size, 0.014, rimW, woodMat, [0, Y + 0.003, -rimC], { cast: true }));
    g.add(box(rimW, 0.014, C.FELT_HALF * 2, woodMat, [rimC, Y + 0.003, 0], { cast: true }));
    g.add(box(rimW, 0.014, C.FELT_HALF * 2, woodMat, [-rimC, Y + 0.003, 0], { cast: true }));
    // Ceinture et pieds tournés.
    var apronH = 0.09;
    [[0, 0.56, size - 0.1, 0.025], [0, -0.56, size - 0.1, 0.025]].forEach(function (a) {
      g.add(box(a[2], apronH, a[3], woodMat, [a[0], Y - 0.05 - apronH / 2, a[1]]));
      g.add(box(a[3], apronH, a[2], woodMat, [a[1], Y - 0.05 - apronH / 2, a[0]]));
    });
    var legGeo = new THREE.CylinderGeometry(0.03, 0.022, Y - 0.05, 12);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s) {
      g.add(mesh(legGeo, woodMat, { pos: [s[0] * 0.55, (Y - 0.05) / 2, s[1] * 0.55], cast: true }));
    });
    root.add(g);
    return { woodMat: woodMat };
  }

  function buildChair(woodMat) {
    var g = new THREE.Group();
    var cushion = new THREE.MeshStandardMaterial({ color: '#7a2a2a', roughness: 0.9 });
    g.add(box(0.44, 0.035, 0.42, woodMat, [0, 0.45, 0], { cast: true }));
    g.add(box(0.4, 0.03, 0.38, cushion, [0, 0.48, 0], { cast: true }));
    var legGeo = new THREE.BoxGeometry(0.035, 0.45, 0.035);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s) {
      g.add(mesh(legGeo, woodMat, { pos: [s[0] * 0.19, 0.225, s[1] * 0.18], cast: true }));
    });
    g.add(box(0.035, 0.5, 0.035, woodMat, [-0.19, 0.72, 0.18], { cast: true }));
    g.add(box(0.035, 0.5, 0.035, woodMat, [0.19, 0.72, 0.18], { cast: true }));
    g.add(box(0.42, 0.12, 0.025, woodMat, [0, 0.9, 0.18], { cast: true }));
    g.add(box(0.42, 0.05, 0.025, woodMat, [0, 0.68, 0.18], { cast: true }));
    return g;
  }

  // Petit chevalet en bois devant chaque joueur, contre lequel reposent ses dominos.
  function buildRack(woodMat) {
    var g = new THREE.Group();
    g.add(box(0.56, 0.016, 0.022, woodMat, [0, C.TABLE_Y + 0.008, C.HAND_Z - 0.024], { cast: true }));
    return g;
  }

  function build(sceneEl, rootEl) {
    var root = rootEl.object3D;
    buildRoom(root);
    var table = buildTable(root);
    buildLamp(sceneEl, root);

    var chairs = [];
    var racks = [];
    var markers = [];
    var markerMat = new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.9 });
    for (var p = 0; p < 4; p++) {
      var q = seatQuaternion(p);
      var chair = buildChair(table.woodMat);
      chair.position.set(0, 0, C.SEAT_R + 0.02).applyQuaternion(q);
      chair.quaternion.copy(q);
      root.add(chair);
      chairs.push(chair);

      var rack = buildRack(table.woodMat);
      rack.quaternion.copy(q);
      rack.visible = false;
      root.add(rack);
      racks.push(rack);

      // Liseré lumineux sur le rebord : indique à qui est le tour.
      var marker = box(0.5, 0.004, 0.012, markerMat, [0, 0, 0], { receive: false });
      marker.position.set(0, C.TABLE_Y + 0.011, C.FELT_HALF + 0.03).applyQuaternion(q);
      marker.quaternion.copy(q);
      marker.visible = false;
      root.add(marker);
      markers.push(marker);
    }
    return { chairs: chairs, racks: racks, markers: markers, markerMat: markerMat };
  }

  window.DominoWorld = { build: build, C: C, seatQuaternion: seatQuaternion, roundedBox: roundedBox };
})();

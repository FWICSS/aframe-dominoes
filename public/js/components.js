/* global AFRAME */
// Composants d'interface utilisables à la souris, au laser (manettes) ou à la main (pincement).
(function () {
  'use strict';
  var THREE = AFRAME.THREE;
  var TX = window.DominoTextures;

  // Panneau de texte dessiné sur un canvas.
  AFRAME.registerComponent('ui-panel', {
    schema: {
      width: { default: 0.6 },
      height: { default: 0.25 },
      resolution: { default: 1600 },
    },
    init: function () {
      var d = this.data;
      this.canvas = TX.canvas(d.resolution, Math.round((d.resolution * d.height) / d.width));
      this.ctx = this.canvas.getContext('2d');
      this.texture = TX.toTexture(this.canvas);
      var mat = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false });
      this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(d.width, d.height), mat);
      this.el.setObject3D('mesh', this.mesh);
      this.key = null;
    },
    // opts : voir DominoTextures.drawLabel. Ne redessine que si le contenu change.
    draw: function (opts) {
      var key = JSON.stringify(opts);
      if (key === this.key) return;
      this.key = key;
      TX.drawLabel(this.ctx, this.canvas.width, this.canvas.height, opts);
      this.texture.needsUpdate = true;
    },
    remove: function () {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.texture.dispose();
    },
  });

  // Bouton 3D : émet « press » quand on clique (souris / gâchette) ou qu'on le pince.
  AFRAME.registerComponent('ui-button', {
    schema: {
      label: { default: '' },
      width: { default: 0.12 },
      height: { default: 0.045 },
      color: { default: '#3b6e4f' },
      enabled: { default: true },
    },
    init: function () {
      var self = this;
      var d = this.data;
      this.canvas = TX.canvas(512, Math.round((512 * d.height) / d.width));
      this.texture = TX.toTexture(this.canvas);
      this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true });
      var mesh = new THREE.Mesh(new THREE.PlaneGeometry(d.width, d.height), this.material);
      this.el.setObject3D('mesh', mesh);
      this.hover = false;
      this.el.classList.add('clickable');
      this.el.classList.add('ui-button');
      this.el.addEventListener('mouseenter', function () { self.hover = true; self.redraw(); });
      this.el.addEventListener('mouseleave', function () { self.hover = false; self.redraw(); });
      this.el.addEventListener('click', function () { self.press(); });
    },
    update: function () {
      this.redraw();
    },
    press: function () {
      var now = performance.now();
      if (!this.data.enabled || now - (this.lastPress || 0) < 300) return;
      this.lastPress = now;
      if (window.DominoSound) window.DominoSound.click();
      this.el.emit('press');
    },
    redraw: function () {
      var d = this.data;
      var color = d.enabled ? (this.hover ? shade(d.color, 0.25) : d.color) : '#555555';
      TX.drawLabel(this.canvas.getContext('2d'), this.canvas.width, this.canvas.height, {
        text: d.label,
        background: color,
        border: this.hover && d.enabled ? '#ffe9a8' : 'rgba(0,0,0,0.4)',
        fontSize: Math.round(this.canvas.height * 0.42),
        color: d.enabled ? '#ffffff' : '#bbbbbb',
        radius: 28,
      });
      this.texture.needsUpdate = true;
      this.el.object3D.scale.setScalar(this.hover && d.enabled ? 1.06 : 1);
    },
    remove: function () {
      this.texture.dispose();
      this.material.dispose();
    },
  });

  function shade(hex, amount) {
    var c = new THREE.Color(hex);
    c.lerp(new THREE.Color('#ffffff'), amount);
    return '#' + c.getHexString();
  }

  // Oriente l'objet vers la caméra (étiquettes de nom).
  AFRAME.registerComponent('billboard', {
    init: function () {
      this.target = new THREE.Vector3();
      this.pos = new THREE.Vector3();
    },
    tick: function () {
      var cam = this.el.sceneEl.camera;
      if (!cam) return;
      var target = this.target;
      var pos = this.pos;
      cam.getWorldPosition(target);
      this.el.object3D.getWorldPosition(pos);
      target.y = pos.y;
      this.el.object3D.lookAt(target);
    },
  });
})();

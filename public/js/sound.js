// Bruitages synthétisés avec la Web Audio API (pas de fichiers audio).
(function () {
  'use strict';
  var ctx = null;

  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // « Clac » d'un domino posé sur la table : bruit bref filtré + petite résonance.
  function clack(strength) {
    var ac = audio();
    if (!ac) return;
    var s = strength == null ? 1 : strength;
    var t = ac.currentTime;
    var len = Math.floor(ac.sampleRate * 0.06);
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
    var src = ac.createBufferSource();
    src.buffer = buf;
    var filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200 + Math.random() * 600;
    filter.Q.value = 2.5;
    var gain = ac.createGain();
    gain.gain.value = 0.9 * s;
    src.connect(filter).connect(gain).connect(ac.destination);
    src.start(t);

    var osc = ac.createOscillator();
    osc.frequency.value = 900 + Math.random() * 200;
    var og = ac.createGain();
    og.gain.setValueAtTime(0.12 * s, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(og).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  function tone(freq, start, duration, volume, type) {
    var ac = audio();
    if (!ac) return;
    var t = ac.currentTime + start;
    var osc = ac.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    var g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  window.DominoSound = {
    context: audio,
    clack: clack,
    slide: function () { clack(0.35); },
    yourTurn: function () {
      tone(660, 0, 0.25, 0.12);
      tone(880, 0.12, 0.35, 0.12);
    },
    win: function () {
      [523, 659, 784, 1046].forEach(function (f, i) { tone(f, i * 0.12, 0.4, 0.12, 'triangle'); });
    },
    lose: function () {
      [392, 330, 262].forEach(function (f, i) { tone(f, i * 0.15, 0.4, 0.1, 'triangle'); });
    },
    error: function () { tone(180, 0, 0.18, 0.12, 'square'); },
    click: function () { tone(1200, 0, 0.05, 0.06); },
  };
})();

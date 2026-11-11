/**
 * Pip's Golden Trail - Zero-Lag WebAudio Sound & Music Engine
 * - One AudioContext created in onStart(), closed in onDestroy().
 * - Pre-computes raw Float32 PCM waveforms during onInit() before MyPC.ready() so
 *   starting audio on the first frame takes < 0.2ms with zero main-thread stutter.
 * - Pre-renders musical note AudioBuffers so stepMusic() never creates OscillatorNodes
 *   or GainNodes during gameplay (zero audio-graph GC pressure).
 */
(function (root) {
  'use strict';

  var ctx = null;
  var musicGain = null;
  var sfxGain = null;
  var buffers = {};
  var noteBuffers = {};
  var pcmCache = {};
  var notePcmCache = {};
  var SAMPLE_RATE = 22050;

  var volMusic = 0.7;
  var volSfx = 0.8;
  var muted = false;
  var paused = false;
  var currentTrack = 'title';
  var seqTick = 0;
  var seqNoteIdx = 0;
  var fastMusic = false;

  // Original musical motifs (Hz) per world & state
  var TRACKS = {
    title:  [261.6, 329.6, 392.0, 523.3, 392.0, 329.6, 293.7, 349.2, 440.0, 587.3, 440.0, 349.2],
    w1:     [293.7, 369.9, 440.0, 587.3, 554.4, 440.0, 369.9, 329.6, 440.0, 493.9, 587.3, 440.0],
    w2:     [246.9, 261.6, 311.1, 369.9, 392.0, 369.9, 311.1, 261.6, 293.7, 311.1, 369.9, 246.9],
    w3:     [261.6, 329.6, 392.0, 493.9, 523.3, 493.9, 392.0, 329.6, 349.2, 440.0, 523.3, 392.0],
    w4:     [329.6, 392.0, 493.9, 659.3, 587.3, 493.9, 392.0, 369.9, 440.0, 587.3, 493.9, 392.0],
    w5:     [220.0, 261.6, 329.6, 349.2, 329.6, 261.6, 246.9, 293.7, 349.2, 440.0, 392.0, 329.6],
    w6:     [196.0, 233.1, 261.6, 277.2, 261.6, 233.1, 196.0, 185.0, 220.0, 261.6, 233.1, 196.0],
    w7:     [349.2, 440.0, 523.3, 698.5, 659.3, 523.3, 440.0, 392.0, 493.9, 587.3, 698.5, 523.3],
    w8:     [220.0, 246.9, 261.6, 329.6, 293.7, 261.6, 220.0, 196.0, 246.9, 293.7, 329.6, 220.0],
    w9:     [392.0, 493.9, 587.3, 784.0, 659.3, 587.3, 493.9, 440.0, 523.3, 659.3, 784.0, 587.3],
    w10:    [440.0, 554.4, 659.3, 880.0, 784.0, 659.3, 554.4, 493.9, 587.3, 740.0, 880.0, 659.3],
    castle: [164.8, 174.6, 196.0, 174.6, 164.8, 146.8, 164.8, 196.0, 220.0, 196.0, 174.6, 164.8],
    boss:   [220.0, 233.1, 293.7, 233.1, 220.0, 261.6, 311.1, 293.7, 349.2, 311.1, 261.6, 220.0],
    star:   [523.3, 659.3, 784.0, 1046.5, 784.0, 659.3, 587.3, 698.5, 880.0, 1174.7, 880.0, 698.5]
  };

  function makePcm(durationSec, fn) {
    var len = Math.max(1, Math.floor(SAMPLE_RATE * durationSec));
    var data = new Float32Array(len);
    for (var i = 0; i < len; i++) {
      var t = i / SAMPLE_RATE;
      var p = i / len;
      data[i] = fn(t, p) * (1 - p);
    }
    return data;
  }

  /**
   * Precompute PCM arrays once during load/init so onStart() never stalls the first frame
   */
  function precomputeWaveforms() {
    if (pcmCache.jump) return;
    pcmCache.jump = makePcm(0.12, function (t, p) {
      return Math.sin(6.28318 * (280 + p * 340) * t) * 0.45;
    });
    pcmCache.spin = makePcm(0.14, function (t, p) {
      return Math.sin(6.28318 * (420 + Math.sin(p * 18) * 160) * t) * 0.42;
    });
    pcmCache.coin = makePcm(0.13, function (t, p) {
      var f = p < 0.35 ? 987.8 : 1318.5;
      return Math.sin(6.28318 * f * t) * 0.45;
    });
    pcmCache.big_coin = makePcm(0.2, function (t, p) {
      var f = p < 0.33 ? 784 : p < 0.66 ? 987.8 : 1568;
      return Math.sin(6.28318 * f * t) * 0.5;
    });
    pcmCache.medal = makePcm(0.26, function (t, p) {
      var f = p < 0.25 ? 587.3 : p < 0.5 ? 740 : p < 0.75 ? 880 : 1174.7;
      return Math.sin(6.28318 * f * t) * 0.52;
    });
    pcmCache.powerup = makePcm(0.24, function (t, p) {
      var f = 330 + Math.floor(p * 6) * 85;
      return (Math.sin(6.28318 * f * t) > 0 ? 0.35 : -0.35);
    });
    pcmCache.stomp = makePcm(0.1, function (t, p) {
      return Math.sin(6.28318 * (220 - p * 110) * t) * 0.5;
    });
    pcmCache.kick = makePcm(0.1, function (t, p) {
      return Math.sin(6.28318 * (180 + p * 260) * t) * 0.5;
    });
    pcmCache.hurt = makePcm(0.18, function (t, p) {
      return Math.sin(6.28318 * (340 - p * 210) * t) * 0.5;
    });
    pcmCache.break = makePcm(0.12, function (t) {
      return (Math.random() * 2 - 1) * Math.cos(t * 90) * 0.45;
    });
    pcmCache.bump = makePcm(0.07, function (t) {
      return Math.sin(6.28318 * 130 * t) * 0.45;
    });
    pcmCache.checkpoint = makePcm(0.2, function (t, p) {
      var f = p < 0.5 ? 523.3 : 784.0;
      return Math.sin(6.28318 * f * t) * 0.45;
    });
    pcmCache.boss_hit = makePcm(0.2, function (t, p) {
      return Math.sin(6.28318 * (160 + (1 - p) * 220) * t) * 0.55;
    });
    pcmCache.flag = makePcm(0.32, function (t, p) {
      var notes = [523.3, 659.3, 784.0, 1046.5];
      var f = notes[Math.min(3, Math.floor(p * 4))];
      return Math.sin(6.28318 * f * t) * 0.5;
    });
    pcmCache.life = makePcm(0.28, function (t, p) {
      var notes = [330, 392, 659.3, 523.3, 587.3, 784];
      var f = notes[Math.min(5, Math.floor(p * 6))];
      return Math.sin(6.28318 * f * t) * 0.48;
    });
    pcmCache.shoot = makePcm(0.08, function (t, p) {
      return Math.sin(6.28318 * (620 - p * 340) * t) * 0.4;
    });
    pcmCache.bounce = makePcm(0.13, function (t, p) {
      return Math.sin(6.28318 * (240 + p * 420) * t) * 0.45;
    });
    pcmCache.pipBlip = makePcm(0.07, function (t, p) {
      return Math.sin(6.28318 * (540 + p * 180) * t) * 0.35;
    });
    pcmCache.juniperBlip = makePcm(0.07, function (t, p) {
      return Math.sin(6.28318 * (430 + p * 150) * t) * 0.35;
    });

    // Precompute all unique music note frequencies
    for (var tk in TRACKS) {
      var arr = TRACKS[tk];
      for (var i = 0; i < arr.length; i++) {
        var freq = arr[i];
        var key = String(freq);
        if (!notePcmCache[key]) {
          (function (f) {
            notePcmCache[key] = makePcm(0.16, function (t, p) {
              var wave = Math.sin(6.28318 * f * t) + 0.3 * Math.sin(12.56636 * f * t);
              return wave * 0.16 * (1 - p);
            });
          })(freq);
        }
      }
    }
  }

  function uploadBuffersToContext() {
    if (!ctx) return;
    precomputeWaveforms();
    for (var k in pcmCache) {
      var pcm = pcmCache[k];
      var buf = ctx.createBuffer(1, pcm.length, SAMPLE_RATE);
      buf.getChannelData(0).set(pcm);
      buffers[k] = buf;
    }
    for (var nk in notePcmCache) {
      var npcm = notePcmCache[nk];
      var nbuf = ctx.createBuffer(1, npcm.length, SAMPLE_RATE);
      nbuf.getChannelData(0).set(npcm);
      noteBuffers[nk] = nbuf;
    }
  }

  function startAudio() {
    if (ctx) {
      if (ctx.state === 'suspended') {
        try { ctx.resume(); } catch (e) {}
      }
      return;
    }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      musicGain = ctx.createGain();
      sfxGain = ctx.createGain();
      musicGain.gain.value = muted ? 0 : volMusic * 0.22;
      sfxGain.gain.value = muted ? 0 : volSfx * 0.45;
      musicGain.connect(ctx.destination);
      sfxGain.connect(ctx.destination);
      uploadBuffersToContext();
    } catch (e) {
      ctx = null;
    }
  }

  function setVolume(v) {
    if (!v) return;
    if (typeof v.music === 'number') volMusic = Math.max(0, Math.min(1, v.music));
    if (typeof v.sfx === 'number') volSfx = Math.max(0, Math.min(1, v.sfx));
    if (musicGain && ctx) musicGain.gain.value = (muted || paused) ? 0 : volMusic * 0.22;
    if (sfxGain && ctx) sfxGain.gain.value = (muted || paused) ? 0 : volSfx * 0.45;
  }

  function playSfx(name) {
    if (!ctx || paused || muted || volSfx <= 0.01) return;
    var buf = buffers[name] || buffers.coin;
    if (!buf) return;
    try {
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(sfxGain);
      src.start(0);
    } catch (e) {}
  }

  function setTrack(trackName, isFast) {
    currentTrack = TRACKS[trackName] ? trackName : 'w1';
    fastMusic = !!isFast;
  }

  function stepMusic() {
    if (!ctx || paused || muted || volMusic <= 0.01) return;
    if (ctx.state !== 'running') return;
    seqTick++;
    var interval = fastMusic ? 10 : 15;
    if (seqTick < interval) return;
    seqTick = 0;

    var notes = fastMusic ? TRACKS.star : (TRACKS[currentTrack] || TRACKS.w1);
    var freq = notes[seqNoteIdx % notes.length];
    seqNoteIdx++;

    var nbuf = noteBuffers[String(freq)];
    if (!nbuf) return;
    try {
      var src = ctx.createBufferSource();
      src.buffer = nbuf;
      src.connect(musicGain);
      src.start(0);
    } catch (e) {}
  }

  function pauseAudio() {
    paused = true;
    if (ctx && ctx.state === 'running') {
      try { ctx.suspend(); } catch (e) {}
    }
  }

  function resumeAudio() {
    paused = false;
    if (ctx && ctx.state === 'suspended') {
      try { ctx.resume(); } catch (e) {}
    }
  }

  function destroyAudio() {
    paused = true;
    if (ctx) {
      try { ctx.close(); } catch (e) {}
      ctx = null;
      musicGain = null;
      sfxGain = null;
      buffers = {};
      noteBuffers = {};
    }
  }

  // Precompute PCM waveforms immediately at script load time so onStart() is instant
  precomputeWaveforms();

  var GT = root.GT || (root.GT = {});
  GT.audio = {
    start: startAudio,
    setVolume: setVolume,
    playSfx: playSfx,
    setTrack: setTrack,
    stepMusic: stepMusic,
    pause: pauseAudio,
    resume: resumeAudio,
    destroy: destroyAudio
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

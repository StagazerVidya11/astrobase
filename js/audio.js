(function (global) {
  'use strict';

  var ASTROBASE = (global.ASTROBASE = global.ASTROBASE || {});

  var ctx = null;
  var ambientTimer = null;
  var ambientNodes = [];
  var stepCooldown = 0;

  var state = {
    sfxEnabled: true,
    musicEnabled: true,
    unlocked: false
  };

  function ensureContext() {
    if (!ctx) {
      var AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        ctx = new AudioCtx();
      } catch (err) {
        return null;
      }
    }
    if (ctx && ctx.state === 'suspended') {
      try {
        ctx.resume();
      } catch (err) {
        return null;
      }
    }
    return ctx;
  }

  function playTone(freq, duration, type, volume, delay, slideTo) {
    if (!state.sfxEnabled) return;
    var ac = ensureContext();
    if (!ac) return;

    try {
      var now = ac.currentTime + (delay || 0);
      var osc = ac.createOscillator();
      var gain = ac.createGain();

      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
      }

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume || 0.08, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (err) {
      // Fail silently if audio playback is restricted
    }
  }

  function startAmbient() {
    if (!state.musicEnabled || ambientTimer) return;
    var ac = ensureContext();
    if (!ac) return;

    var chords = [
      [146.83, 220.0, 293.66],
      [164.81, 246.94, 329.63],
      [130.81, 196.0, 261.63],
      [146.83, 220.0, 329.63]
    ];
    var step = 0;

    function playChord() {
      if (!state.musicEnabled || !ctx || ctx.state !== 'running') return;
      var notes = chords[step % chords.length];
      step += 1;
      for (var i = 0; i < notes.length; i += 1) {
        try {
          var now = ctx.currentTime;
          var osc = ctx.createOscillator();
          var filter = ctx.createBiquadFilter();
          var gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(notes[i], now);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(520, now);

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(0.018, now + 0.8);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 3.7);
          ambientNodes.push(osc);
          if (ambientNodes.length > 12) {
            ambientNodes.shift();
          }
        } catch (err) {
          // Ignore ambient audio failure
        }
      }
    }

    playChord();
    ambientTimer = global.setInterval(playChord, 3800);
  }

  function stopAmbient() {
    if (ambientTimer) {
      global.clearInterval(ambientTimer);
      ambientTimer = null;
    }
    for (var i = 0; i < ambientNodes.length; i += 1) {
      try {
        ambientNodes[i].stop();
      } catch (err) {
        // Already stopped
      }
    }
    ambientNodes = [];
  }

  ASTROBASE.Audio = {
    unlock: function () {
      state.unlocked = true;
      ensureContext();
      if (state.musicEnabled) {
        startAmbient();
      }
    },
    configure: function (opts) {
      if (typeof opts.sfxEnabled === 'boolean') state.sfxEnabled = opts.sfxEnabled;
      if (typeof opts.musicEnabled === 'boolean') state.musicEnabled = opts.musicEnabled;
      if (state.musicEnabled && state.unlocked) {
        startAmbient();
      } else {
        stopAmbient();
      }
    },
    isMuted: function () {
      return !state.sfxEnabled && !state.musicEnabled;
    },
    playClick: function () {
      playTone(540, 0.06, 'square', 0.05, 0, 680);
    },
    playStep: function () {
      var now = Date.now();
      if (now - stepCooldown < 240) return;
      stepCooldown = now;
      playTone(130, 0.045, 'triangle', 0.04, 0, 95);
    },
    playBuild: function () {
      playTone(220, 0.1, 'square', 0.08, 0, 330);
      playTone(330, 0.12, 'square', 0.08, 0.09, 440);
      playTone(523.25, 0.16, 'triangle', 0.09, 0.18);
    },
    playCollect: function () {
      playTone(523.25, 0.08, 'triangle', 0.08, 0);
      playTone(659.25, 0.1, 'triangle', 0.08, 0.07);
      playTone(783.99, 0.14, 'triangle', 0.08, 0.14);
    },
    playRepair: function () {
      playTone(280, 0.08, 'sawtooth', 0.06, 0, 420);
      playTone(420, 0.12, 'triangle', 0.07, 0.08, 620);
    },
    playAlert: function () {
      playTone(440, 0.14, 'sawtooth', 0.07, 0, 340);
      playTone(340, 0.16, 'sawtooth', 0.07, 0.16, 280);
    },
    playEndDay: function () {
      playTone(392, 0.12, 'triangle', 0.07, 0);
      playTone(493.88, 0.14, 'triangle', 0.07, 0.1);
      playTone(587.33, 0.2, 'triangle', 0.08, 0.2);
    },
    playMissionComplete: function () {
      playTone(523.25, 0.1, 'square', 0.07, 0);
      playTone(659.25, 0.1, 'square', 0.07, 0.1);
      playTone(783.99, 0.12, 'square', 0.07, 0.2);
      playTone(1046.5, 0.25, 'triangle', 0.09, 0.32);
    },
    playVictory: function () {
      var notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      for (var i = 0; i < notes.length; i += 1) {
        playTone(notes[i], 0.22, 'triangle', 0.08, i * 0.11);
      }
    },
    playFailure: function () {
      playTone(311.13, 0.22, 'sawtooth', 0.07, 0, 260);
      playTone(246.94, 0.25, 'sawtooth', 0.07, 0.2, 180);
      playTone(174.61, 0.38, 'triangle', 0.08, 0.42, 130);
    }
  };
})(window);

(function (global) {
  'use strict';

  var ASTROBASE = (global.ASTROBASE = global.ASTROBASE || {});

  var SAVE_KEY = 'astrobase_save_v1';
  var SETTINGS_KEY = 'astrobase_settings_v1';

  var DEFAULT_SETTINGS = {
    sfxEnabled: true,
    musicEnabled: true,
    difficulty: 'guided'
  };

  function safeGet(key) {
    try {
      return global.localStorage ? global.localStorage.getItem(key) : null;
    } catch (err) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      if (global.localStorage) {
        global.localStorage.setItem(key, value);
        return true;
      }
    } catch (err) {
      return false;
    }
    return false;
  }

  function safeRemove(key) {
    try {
      if (global.localStorage) {
        global.localStorage.removeItem(key);
        return true;
      }
    } catch (err) {
      return false;
    }
    return false;
  }

  function isValidSave(data) {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.day !== 'number' || data.day < 1) return false;
    if (!data.resources || typeof data.resources.oxygen !== 'number') return false;
    if (!Array.isArray(data.buildings)) return false;
    if (!data.player || typeof data.player.x !== 'number' || typeof data.player.y !== 'number') return false;
    if (!data.missions || typeof data.missions.currentIndex !== 'number') return false;
    return true;
  }

  ASTROBASE.Storage = {
    loadSettings: function () {
      var raw = safeGet(SETTINGS_KEY);
      if (!raw) return Object.assign({}, DEFAULT_SETTINGS);
      try {
        var parsed = JSON.parse(raw);
        return {
          sfxEnabled: typeof parsed.sfxEnabled === 'boolean' ? parsed.sfxEnabled : DEFAULT_SETTINGS.sfxEnabled,
          musicEnabled: typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : DEFAULT_SETTINGS.musicEnabled,
          difficulty: parsed.difficulty === 'standard' || parsed.difficulty === 'explorer' ? parsed.difficulty : 'guided'
        };
      } catch (err) {
        return Object.assign({}, DEFAULT_SETTINGS);
      }
    },
    saveSettings: function (settings) {
      return safeSet(SETTINGS_KEY, JSON.stringify(settings));
    },
    loadSave: function () {
      var raw = safeGet(SAVE_KEY);
      if (!raw) return null;
      try {
        var parsed = JSON.parse(raw);
        if (!isValidSave(parsed)) {
          return null;
        }
        return parsed;
      } catch (err) {
        return null;
      }
    },
    saveGame: function (payload) {
      var copy = Object.assign({}, payload, {
        savedAt: new Date().toISOString(),
        version: 1
      });
      return safeSet(SAVE_KEY, JSON.stringify(copy));
    },
    clearSave: function () {
      return safeRemove(SAVE_KEY);
    },
    hasValidSave: function () {
      return this.loadSave() !== null;
    }
  };
})(window);

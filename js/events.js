(function (global) {
  'use strict';

  var ASTROBASE = (global.ASTROBASE = global.ASTROBASE || {});

  var EVENT_DEFS = {
    dust_storm: {
      type: 'dust_storm',
      title: 'Martian Dust Storm',
      severity: 'warning',
      duration: 2,
      explanation: 'Fast winds kicked up fine red dust across Jezero Plains, dimming sunlight.',
      effect: 'Solar Panels produce 50% less Energy for 2 Sols. Exposed equipment may need repair.',
      response: 'Check your Solar Panels, repair any damaged modules using Base Parts, and watch Energy reserves.'
    },
    oxygen_leak: {
      type: 'oxygen_leak',
      title: 'Oxygen Seal Leak',
      severity: 'danger',
      duration: 2,
      explanation: 'A micro-meteorite or thermal shift loosened an airlock seal.',
      effect: 'Drains 10 extra Oxygen each Sol until sealed.',
      response: 'Walk to an Oxygen Generator or Habitat Dome and press Interact to seal the leak (10 Parts).'
    },
    water_shortage: {
      type: 'water_shortage',
      title: 'Frozen Water Line',
      severity: 'warning',
      duration: 2,
      explanation: 'Cold Martian night temperatures partially froze an extraction pipe.',
      effect: 'Water Extractor output is halved and 6 Water is lost each Sol until cleared.',
      response: 'Walk to your Water Extractor (or Landing Pod) and press Interact to thaw the pipe (10 Parts).'
    },
    power_failure: {
      type: 'power_failure',
      title: 'Power Breaker Trip',
      severity: 'warning',
      duration: 1,
      explanation: 'A static dust charge tripped the circuit breaker on one colony module.',
      effect: 'One facility is temporarily powered OFF until you reset its breaker.',
      response: 'Walk to the building marked OFF and press Interact to restart it (no cost!).'
    },
    radiation_warning: {
      type: 'radiation_warning',
      title: 'Solar Radiation Warning',
      severity: 'danger',
      duration: 1,
      explanation: 'A solar flare is sending high-energy particles toward Mars.',
      effect: 'Ending the Sol outdoors will reduce Crew Health by 18.',
      response: 'Walk onto a Habitat Dome and press Interact to shelter safely inside before ending the Sol.'
    }
  };

  ASTROBASE.Events = {
    DEFS: EVENT_DEFS,
    triggerSpecific: function (gameState, type) {
      var def = EVENT_DEFS[type];
      if (!def) return null;

      var ev = {
        type: def.type,
        title: def.title,
        severity: def.severity,
        daysLeft: def.duration,
        explanation: def.explanation,
        effect: def.effect,
        response: def.response
      };

      // Apply immediate physical side effect
      if (type === 'dust_storm' && gameState.buildings.length > 0) {
        var candidates = gameState.buildings.filter(function (b) {
          return !b.damaged && b.type !== 'habitat';
        });
        if (candidates.length > 0) {
          var pick = candidates[Math.floor(Math.random() * candidates.length)];
          pick.damaged = true;
        }
      } else if (type === 'power_failure' && gameState.buildings.length > 0) {
        var powered = gameState.buildings.filter(function (b) {
          return b.type !== 'habitat' && !b.poweredOff && !b.damaged;
        });
        if (powered.length > 0) {
          var target = powered[Math.floor(Math.random() * powered.length)];
          target.poweredOff = true;
        }
      }

      gameState.activeEvent = ev;
      return ev;
    },
    maybeTriggerForNextDay: function (gameState) {
      // If an event is still active, tick down its timer
      if (gameState.activeEvent) {
        gameState.activeEvent.daysLeft -= 1;
        if (gameState.activeEvent.type === 'dust_storm' && gameState.activeEvent.daysLeft <= 0) {
          gameState.flags.stormSurvived = true;
        }
        if (gameState.activeEvent.daysLeft <= 0) {
          gameState.activeEvent = null;
        }
        return null;
      }

      // Mission 5 guarantees a dust storm if not yet endured
      var currentMission = ASTROBASE.Missions.getCurrentMission(gameState.missions);
      if (currentMission && currentMission.id === 'm5_storm' && !gameState.flags.stormSurvived) {
        return this.triggerSpecific(gameState, 'dust_storm');
      }

      // Never trigger hazardous events on Sol 1
      if (gameState.day < 2) return null;

      var preset = ASTROBASE.Resources.DIFFICULTY_PRESETS[gameState.difficulty] || ASTROBASE.Resources.DIFFICULTY_PRESETS.guided;
      if (Math.random() > preset.eventChance) return null;

      var pool = ['dust_storm'];
      if (gameState.buildings.some(function (b) { return b.type === 'oxygen'; })) {
        pool.push('oxygen_leak');
      }
      if (gameState.buildings.some(function (b) { return b.type === 'water'; })) {
        pool.push('water_shortage');
      }
      if (gameState.buildings.some(function (b) { return b.type !== 'habitat'; })) {
        pool.push('power_failure');
      }
      if (gameState.buildings.some(function (b) { return b.type === 'habitat'; })) {
        pool.push('radiation_warning');
      }

      var chosen = pool[Math.floor(Math.random() * pool.length)];
      return this.triggerSpecific(gameState, chosen);
    }
  };
})(window);

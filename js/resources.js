(function (global) {
  'use strict';

  var ASTROBASE = (global.ASTROBASE = global.ASTROBASE || {});

  var DIFFICULTY_PRESETS = {
    guided: {
      label: 'Guided Cadet (Recommended)',
      description: 'Gentle daily consumption and generous spare parts for learning.',
      starting: { oxygen: 100, water: 100, food: 100, energy: 100, crewHealth: 100, parts: 140 },
      baseDrain: { oxygen: 5, water: 5, food: 4, energy: 4 },
      eventChance: 0.48
    },
    standard: {
      label: 'Standard Survival',
      description: 'Balanced Mars colony drain and regular storm pressure.',
      starting: { oxygen: 100, water: 100, food: 100, energy: 100, crewHealth: 100, parts: 110 },
      baseDrain: { oxygen: 7, water: 7, food: 6, energy: 5 },
      eventChance: 0.62
    },
    explorer: {
      label: 'Explorer Sandbox',
      description: 'Extra starting supplies and mild resource drain.',
      starting: { oxygen: 115, water: 115, food: 115, energy: 115, crewHealth: 100, parts: 200 },
      baseDrain: { oxygen: 3, water: 3, food: 3, energy: 2 },
      eventChance: 0.35
    }
  };

  var RESOURCE_INFO = {
    oxygen: {
      id: 'oxygen',
      name: 'Oxygen',
      unit: 'Colony Units',
      whatItDoes: 'Keeps breathable air inside your habitat and spacesuit tanks.',
      whyNeeded: 'Mars has a very thin atmosphere made mostly of carbon dioxide, so astronauts cannot breathe outside air.',
      missionHelp: 'Build and power an Oxygen Generator so oxygen stays above zero every day.',
      fact: 'Mars air is about 95% carbon dioxide and less than 1% oxygen!',
      note: 'Simplified game units are used here for easy play and do not represent real-world engineering values.'
    },
    water: {
      id: 'water',
      name: 'Water',
      unit: 'Colony Units',
      whatItDoes: 'Hydrates the crew and waters crops inside your Greenhouse.',
      whyNeeded: 'Humans need clean water daily to stay healthy, and greenhouses need water to grow fresh food.',
      missionHelp: 'Construct a Water Extractor to pull frozen water from Martian soil and ice.',
      fact: 'Scientists have discovered water ice hidden just beneath the Martian dust in many regions!',
      note: 'Simplified game units are used here for easy play and do not represent real-world engineering values.'
    },
    food: {
      id: 'food',
      name: 'Food',
      unit: 'Colony Units',
      whatItDoes: 'Gives astronauts energy to explore, build, and repair equipment.',
      whyNeeded: 'Sending food rockets from Earth takes many months, so colonies must eventually grow their own.',
      missionHelp: 'Build a Greenhouse with steady Water and Energy to harvest fresh crops each Sol.',
      fact: 'Space greenhouses use special red and blue LED lights to help plants grow efficiently!',
      note: 'Simplified game units are used here for easy play and do not represent real-world engineering values.'
    },
    energy: {
      id: 'energy',
      name: 'Energy',
      unit: 'Colony Units',
      whatItDoes: 'Powers your Oxygen Generator, Water Extractor, Greenhouse, and Research Lab.',
      whyNeeded: 'Without electricity, life-support machines shut down.',
      missionHelp: 'Place Solar Panels early, and build extra panels so dust storms do not leave you short.',
      fact: 'Mars receives less than half as much sunlight as Earth because it is farther from the Sun.',
      note: 'Simplified game units are used here for easy play and do not represent real-world engineering values.'
    },
    crewHealth: {
      id: 'crewHealth',
      name: 'Crew Health',
      unit: 'Health Points',
      whatItDoes: 'Measures how safe, rested, and healthy your astronaut crew is.',
      whyNeeded: 'If Oxygen, Water, Food, or radiation safety fails, crew health drops quickly.',
      missionHelp: 'Keep survival supplies stocked, build a Habitat, and take shelter inside during radiation alerts.',
      fact: 'Astronaut habitats use thick walls and water tanks to help shield crews from space radiation.',
      note: 'Simplified game units are used here for easy play and do not represent real-world engineering values.'
    },
    parts: {
      id: 'parts',
      name: 'Base Parts',
      unit: 'Colony Units',
      whatItDoes: 'Used to construct new base buildings and repair damaged equipment.',
      whyNeeded: 'Astronauts unpack parts from landing crates and recycle materials in the lab.',
      missionHelp: 'Walk up to supply crates on the map to collect extra Parts, or build a Research Lab.',
      fact: 'Future astronauts may 3D-print tools and shelter bricks right out of Martian dust!',
      note: 'Simplified game units are used here for easy play and do not represent real-world engineering values.'
    }
  };

  function clampResource(key, val) {
    var max = key === 'crewHealth' ? 100 : key === 'parts' ? 999 : 200;
    return Math.max(0, Math.min(max, Math.round(val)));
  }

  ASTROBASE.Resources = {
    DIFFICULTY_PRESETS: DIFFICULTY_PRESETS,
    RESOURCE_INFO: RESOURCE_INFO,
    createInitial: function (difficulty) {
      var preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.guided;
      return Object.assign({}, preset.starting);
    },
    clampAll: function (res) {
      var keys = ['oxygen', 'water', 'food', 'energy', 'crewHealth', 'parts'];
      for (var i = 0; i < keys.length; i += 1) {
        var k = keys[i];
        res[k] = clampResource(k, res[k]);
      }
      return res;
    },
    getStatusLabel: function (key, value) {
      if (key === 'parts') {
        return value < 25 ? 'LOW' : 'OK';
      }
      if (value <= 0) return 'EMPTY';
      if (value <= 20) return 'CRIT';
      if (value <= 40) return 'LOW';
      return 'OK';
    },
    simulateDay: function (gameState) {
      var difficulty = gameState.difficulty || 'guided';
      var preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.guided;
      var before = Object.assign({}, gameState.resources);
      var r = Object.assign({}, before);
      var buildings = gameState.buildings || [];
      var activeEvent = gameState.activeEvent;
      var BuildingDefs = ASTROBASE.Buildings.DEFS;

      var produced = { oxygen: 0, water: 0, food: 0, energy: 0, parts: 0, research: 0 };
      var consumed = {
        oxygen: preset.baseDrain.oxygen,
        water: preset.baseDrain.water,
        food: preset.baseDrain.food,
        energy: preset.baseDrain.energy
      };
      var notes = [];
      var hasHabitat = false;

      // 1. Solar energy first
      for (var i = 0; i < buildings.length; i += 1) {
        var b = buildings[i];
        if (b.type === 'habitat' && !b.damaged) {
          hasHabitat = true;
        }
        if (b.type === 'solar') {
          if (b.damaged || b.poweredOff) {
            notes.push('A Solar Panel is offline and generated 0 Energy.');
            continue;
          }
          var solarGain = BuildingDefs.solar.produces.energy;
          if (activeEvent && activeEvent.type === 'dust_storm') {
            solarGain = Math.floor(solarGain * 0.5);
          }
          produced.energy += solarGain;
        }
      }

      if (activeEvent && activeEvent.type === 'dust_storm') {
        notes.push('Dust storm cut solar panel output by 50%.');
      }

      r.energy = clampResource('energy', r.energy + produced.energy);

      // 2. Active equipment consuming energy / water
      for (var j = 0; j < buildings.length; j += 1) {
        var bld = buildings[j];
        var def = BuildingDefs[bld.type];
        if (!def || bld.type === 'solar' || bld.type === 'habitat') continue;

        if (bld.damaged) {
          notes.push(def.name + ' is damaged and needs repair.');
          continue;
        }
        if (bld.poweredOff) {
          notes.push(def.name + ' paused due to power interruption.');
          continue;
        }

        var energyNeed = def.consumes.energy || 0;
        var waterNeed = def.consumes.water || 0;

        if (r.energy < energyNeed) {
          notes.push(def.name + ' did not have enough Energy to run.');
          continue;
        }
        if (waterNeed > 0 && r.water < waterNeed) {
          notes.push(def.name + ' paused because Water was too low.');
          continue;
        }

        r.energy -= energyNeed;
        consumed.energy += energyNeed;

        if (waterNeed > 0) {
          r.water -= waterNeed;
          consumed.water += waterNeed;
        }

        if (def.produces.oxygen) {
          produced.oxygen += def.produces.oxygen;
          r.oxygen += def.produces.oxygen;
        }
        if (def.produces.water) {
          var waterGain = def.produces.water;
          if (activeEvent && activeEvent.type === 'water_shortage') {
            waterGain = Math.max(4, Math.floor(waterGain * 0.5));
          }
          produced.water += waterGain;
          r.water += waterGain;
        }
        if (def.produces.food) {
          produced.food += def.produces.food;
          r.food += def.produces.food;
        }
        if (def.produces.parts) {
          produced.parts += def.produces.parts;
          r.parts += def.produces.parts;
        }
        if (def.produces.research) {
          produced.research += def.produces.research;
        }
      }

      // 3. Apply environmental event extra drain
      if (activeEvent && activeEvent.type === 'oxygen_leak') {
        consumed.oxygen += 10;
        notes.push('Unrepaired oxygen leak drained 10 extra Oxygen.');
      }
      if (activeEvent && activeEvent.type === 'water_shortage') {
        consumed.water += 6;
        notes.push('Ice line blockage reduced water output and drained 6 Water.');
      }

      // 4. Finalize survival resource levels from starting values + net production - consumption
      r.oxygen = clampResource('oxygen', before.oxygen + produced.oxygen - consumed.oxygen);
      r.water = clampResource('water', before.water + produced.water - consumed.water);
      r.food = clampResource('food', before.food + produced.food - consumed.food);
      r.energy = clampResource('energy', before.energy + produced.energy - consumed.energy);
      r.parts = clampResource('parts', before.parts + produced.parts);

      // 5. Crew health update
      var healthDelta = 0;
      if (r.oxygen <= 0) {
        healthDelta -= 35;
        notes.push('Critical: Oxygen ran out! Crew health dropped sharply.');
      } else if (r.oxygen <= 25) {
        healthDelta -= 8;
        notes.push('Warning: Low Oxygen strained the crew.');
      }

      if (r.water <= 0) {
        healthDelta -= 30;
        notes.push('Critical: Water ran out! Crew health dropped sharply.');
      } else if (r.water <= 25) {
        healthDelta -= 6;
        notes.push('Warning: Low Water affected crew hydration.');
      }

      if (r.food <= 0) {
        healthDelta -= 25;
        notes.push('Critical: Food ran out! Crew health dropped.');
      } else if (r.food <= 25) {
        healthDelta -= 5;
        notes.push('Warning: Low Food tired out the crew.');
      }

      if (r.energy <= 0) {
        healthDelta -= 6;
        notes.push('Warning: Reserve power hit 0, chilling base heaters.');
      }

      if (activeEvent && activeEvent.type === 'radiation_warning') {
        if (gameState.player.sheltered) {
          notes.push('Astronaut stayed safe inside Habitat during solar radiation.');
        } else {
          healthDelta -= 18;
          notes.push('Radiation exposure! Return inside a Habitat during radiation warnings.');
        }
      }

      if (healthDelta === 0 && hasHabitat && r.oxygen > 30 && r.water > 30 && r.food > 30) {
        if (before.crewHealth < 100) {
          healthDelta = 6;
          notes.push('Good life support inside the Habitat restored +6 Crew Health.');
        }
      }

      r.crewHealth = clampResource('crewHealth', before.crewHealth + healthDelta);

      var deltas = {
        oxygen: r.oxygen - before.oxygen,
        water: r.water - before.water,
        food: r.food - before.food,
        energy: r.energy - before.energy,
        crewHealth: r.crewHealth - before.crewHealth,
        parts: r.parts - before.parts
      };

      return {
        resources: r,
        deltas: deltas,
        produced: produced,
        consumed: consumed,
        researchGained: produced.research,
        notes: notes
      };
    }
  };
})(window);

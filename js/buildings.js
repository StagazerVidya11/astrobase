(function (global) {
  'use strict';

  var ASTROBASE = (global.ASTROBASE = global.ASTROBASE || {});

  var DEFS = {
    habitat: {
      id: 'habitat',
      name: 'Habitat Dome',
      shortName: 'Habitat',
      cost: { parts: 35, energy: 10 },
      repairCost: { parts: 15 },
      produces: { health: 6 },
      consumes: {},
      summary: 'Pressurized living dome for crew rest and radiation shelter.',
      effectText: 'Protects astronaut during radiation warnings and helps heal crew.',
      edu: {
        whatItDoes: 'Provides a warm, pressurized home with airlocks and thick protective walls.',
        whyNeeded: 'Mars temperatures drop well below freezing and solar radiation can be dangerous outside.',
        missionHelp: 'Walk onto a Habitat Dome and press Interact to shelter inside during solar warnings.',
        fact: 'At night near Mars equator, temperatures can plunge to about minus 73 degrees Celsius!'
      }
    },
    solar: {
      id: 'solar',
      name: 'Solar Panel',
      shortName: 'Solar',
      cost: { parts: 25, energy: 0 },
      repairCost: { parts: 10 },
      produces: { energy: 16 },
      consumes: {},
      summary: 'Captures Martian sunlight to generate base electricity.',
      effectText: '+16 Energy per Sol (50% during dust storms).',
      edu: {
        whatItDoes: 'Converts sunlight into electricity to power life-support systems.',
        whyNeeded: 'Mars colonies need steady power for air, water, and warmth.',
        missionHelp: 'Build multiple Solar Panels so oxygen and water machines keep running during storms.',
        fact: 'NASA Mars rovers like Spirit and Opportunity used solar wings—and dust storms sometimes coated them!'
      }
    },
    oxygen: {
      id: 'oxygen',
      name: 'Oxygen Generator',
      shortName: 'O2 Gen',
      cost: { parts: 30, energy: 10 },
      repairCost: { parts: 15 },
      produces: { oxygen: 15 },
      consumes: { energy: 6 },
      summary: 'Splits Martian CO2 or stored oxygen reserves into breathable air.',
      effectText: '+15 Oxygen per Sol · Uses 6 Energy.',
      edu: {
        whatItDoes: 'Produces breathable oxygen gas for the colony domes and spacesuits.',
        whyNeeded: 'Crew members use oxygen every hour to stay alive.',
        missionHelp: 'Keep this generator powered and repair leaks quickly if alarms sound.',
        fact: 'The Perseverance rover tested a device called MOXIE that made oxygen directly from Mars air!'
      }
    },
    water: {
      id: 'water',
      name: 'Water Extractor',
      shortName: 'Water Ext',
      cost: { parts: 30, energy: 10 },
      repairCost: { parts: 15 },
      produces: { water: 15 },
      consumes: { energy: 6 },
      summary: 'Melts and filters underground Martian ice into clean water.',
      effectText: '+15 Water per Sol · Uses 6 Energy.',
      edu: {
        whatItDoes: 'Drills into icy Martian soil, melts ice, and purifies water.',
        whyNeeded: 'Astronauts need drinking water and greenhouses need water for growing plants.',
        missionHelp: 'Place early to keep both crew hydration and greenhouse crops thriving.',
        fact: 'Water on Mars is mostly frozen as ice under the soil and at the polar ice caps.'
      }
    },
    greenhouse: {
      id: 'greenhouse',
      name: 'Greenhouse',
      shortName: 'Greenhouse',
      cost: { parts: 40, energy: 10 },
      repairCost: { parts: 18 },
      produces: { food: 14, oxygen: 3 },
      consumes: { energy: 6, water: 5 },
      summary: 'Hydroponic dome growing fresh vegetables and extra oxygen.',
      effectText: '+14 Food, +3 Oxygen per Sol · Uses 6 Energy, 5 Water.',
      edu: {
        whatItDoes: 'Grows leafy greens and crops indoors under controlled lighting and moisture.',
        whyNeeded: 'Resupply rockets from Earth take months, so astronauts grow fresh food locally.',
        missionHelp: 'Make sure you have extra Water and Energy before placing your Greenhouse.',
        fact: 'Plants also release oxygen as they grow, giving a helpful bonus to base life support!'
      }
    },
    lab: {
      id: 'lab',
      name: 'Research Laboratory',
      shortName: 'Research Lab',
      cost: { parts: 45, energy: 15 },
      repairCost: { parts: 20 },
      produces: { research: 25, parts: 5 },
      consumes: { energy: 8 },
      summary: 'Analyzes Mars rocks and unlocks scientific research milestones.',
      effectText: '+25 Research, +5 Parts per Sol · Uses 8 Energy.',
      edu: {
        whatItDoes: 'Studies Martian soil samples, weather data, and recycles spare parts.',
        whyNeeded: 'Scientific research teaches us how Mars formed and how to make colonies safer.',
        missionHelp: 'Build a Lab and power it for several Sols to reach 100% Research Progress.',
        fact: 'Mars looks rusty red because its surface dust is full of iron oxide—the same compound as rust!'
      }
    }
  };

  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawBuilding(ctx, b, tileSize, tick, isSelected) {
    var x = b.gx * tileSize;
    var y = b.gy * tileSize;
    var s = tileSize;
    var p = s / 15; // 15x15 pixel grid per tile

    // Ground pad shadow
    px(ctx, x + p, y + p * 1.5, s - p * 2, s - p * 2, 'rgba(15, 10, 12, 0.42)');
    // Base metallic foundation
    px(ctx, x + p, y + p, s - p * 2, s - p * 2, '#334155');
    px(ctx, x + p * 1.5, y + p * 1.5, s - p * 3, s - p * 3, '#475569');

    if (b.type === 'habitat') {
      // Pressurized silver/orange dome
      px(ctx, x + p * 2.5, y + p * 3, p * 10, p * 9, '#cbd5e1');
      px(ctx, x + p * 3.5, y + p * 2, p * 8, p * 11, '#e2e8f0');
      px(ctx, x + p * 4.5, y + p * 3.5, p * 6, p * 6, '#f8fafc');
      // Orange mission stripe
      px(ctx, x + p * 2.5, y + p * 7, p * 10, p * 1.5, '#ea580c');
      // Viewport window & airlock door
      px(ctx, x + p * 5.5, y + p * 4.5, p * 4, p * 2, '#38bdf8');
      px(ctx, x + p * 6, y + p * 9.5, p * 3, p * 3.5, '#1e293b');
      px(ctx, x + p * 6.5, y + p * 10, p * 2, p * 2.5, '#f59e0b');
    } else if (b.type === 'solar') {
      // Support pole & dual deep-blue PV wings
      px(ctx, x + p * 6.5, y + p * 4, p * 2, p * 8, '#94a3b8');
      px(ctx, x + p * 2, y + p * 3, p * 11, p * 4, '#1d4ed8');
      px(ctx, x + p * 2, y + p * 8.5, p * 11, p * 4, '#1d4ed8');
      // Grid lines + solar glint
      for (var i = 3; i <= 11; i += 2) {
        px(ctx, x + p * i, y + p * 3, p * 0.6, p * 4, '#60a5fa');
        px(ctx, x + p * i, y + p * 8.5, p * 0.6, p * 4, '#60a5fa');
      }
      if (Math.floor(tick / 40) % 3 === 0 && !b.damaged) {
        px(ctx, x + p * 3, y + p * 3.5, p * 2, p * 1, '#bae6fd');
      }
    } else if (b.type === 'oxygen') {
      // Twin cyan oxygen tanks + compressor
      px(ctx, x + p * 2.5, y + p * 3, p * 4, p * 9, '#0284c7');
      px(ctx, x + p * 3.2, y + p * 4, p * 2.5, p * 7, '#38bdf8');
      px(ctx, x + p * 8.5, y + p * 3, p * 4, p * 9, '#0284c7');
      px(ctx, x + p * 9.2, y + p * 4, p * 2.5, p * 7, '#38bdf8');
      // Center pipe + indicator light
      px(ctx, x + p * 6.5, y + p * 6.5, p * 2, p * 2, '#e2e8f0');
      var o2Blink = (Math.floor(tick / 20) % 2 === 0) && !b.damaged && !b.poweredOff;
      px(ctx, x + p * 7, y + p * 7, p * 1, p * 1, o2Blink ? '#67e8f9' : '#0f172a');
    } else if (b.type === 'water') {
      // Drill rig + water storage tank
      px(ctx, x + p * 2.5, y + p * 3, p * 5, p * 9, '#1e40af');
      px(ctx, x + p * 3.5, y + p * 4, p * 3, p * 7, '#60a5fa');
      // Drill tower
      px(ctx, x + p * 8.5, y + p * 2.5, p * 4, p * 9.5, '#64748b');
      px(ctx, x + p * 9.5, y + p * 4, p * 2, p * 7, '#f59e0b');
      var drillOffset = (!b.damaged && !b.poweredOff && Math.floor(tick / 12) % 2 === 0) ? p * 0.6 : 0;
      px(ctx, x + p * 10, y + p * 9 + drillOffset, p * 1, p * 3, '#e2e8f0');
    } else if (b.type === 'greenhouse') {
      // Glass dome with vibrant green crops inside
      px(ctx, x + p * 2, y + p * 2.5, p * 11, p * 10, '#14532d');
      px(ctx, x + p * 3, y + p * 3.5, p * 9, p * 8, '#166534');
      // Crop rows
      px(ctx, x + p * 3.5, y + p * 4.5, p * 3.5, p * 2, '#4ade80');
      px(ctx, x + p * 8, y + p * 4.5, p * 3.5, p * 2, '#22c55e');
      px(ctx, x + p * 3.5, y + p * 8, p * 3.5, p * 2, '#22c55e');
      px(ctx, x + p * 8, y + p * 8, p * 3.5, p * 2, '#4ade80');
      // Glass reflection bars
      px(ctx, x + p * 2, y + p * 2.5, p * 11, p * 0.8, '#bbf7d0');
      px(ctx, x + p * 2, y + p * 12, p * 11, p * 0.8, '#86efac');
    } else if (b.type === 'lab') {
      // Science module with radar dish & purple/amber accents
      px(ctx, x + p * 2, y + p * 3, p * 11, p * 9.5, '#e2e8f0');
      px(ctx, x + p * 3, y + p * 4, p * 9, p * 7.5, '#1e293b');
      px(ctx, x + p * 3.5, y + p * 4.5, p * 4, p * 2.5, '#a855f7');
      px(ctx, x + p * 8.5, y + p * 4.5, p * 3, p * 2.5, '#38bdf8');
      // Dish on corner
      px(ctx, x + p * 9, y + p * 8, p * 3, p * 3, '#cbd5e1');
      var dishBlink = Math.floor(tick / 25) % 2 === 0;
      px(ctx, x + p * 10, y + p * 9, p * 1, p * 1, dishBlink && !b.damaged ? '#f59e0b' : '#475569');
    }

    // Status overlays: damaged or powered off
    if (b.damaged) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 3, y + 3, s - 6, s - 6);
      px(ctx, x + s - p * 4.5, y + p * 1, p * 3.5, p * 3.5, '#dc2626');
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + Math.round(p * 3) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', x + s - p * 2.75, y + p * 2.8);
    } else if (b.poweredOff) {
      px(ctx, x + p * 1, y + p * 1, p * 4.5, p * 3, '#b45309');
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold ' + Math.round(p * 2.2) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('OFF', x + p * 3.25, y + p * 2.5);
    }

    if (isSelected) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3);
    }
  }

  ASTROBASE.Buildings = {
    DEFS: DEFS,
    ORDER: ['habitat', 'solar', 'oxygen', 'water', 'greenhouse', 'lab'],
    canAfford: function (type, resources) {
      var def = DEFS[type];
      if (!def) return false;
      return resources.parts >= (def.cost.parts || 0) && resources.energy >= (def.cost.energy || 0);
    },
    payCost: function (type, resources) {
      var def = DEFS[type];
      if (!def) return;
      resources.parts = Math.max(0, resources.parts - (def.cost.parts || 0));
      resources.energy = Math.max(0, resources.energy - (def.cost.energy || 0));
    },
    createInstance: function (type, gx, gy, day) {
      return {
        id: type + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        type: type,
        gx: gx,
        gy: gy,
        builtOnDay: day,
        damaged: false,
        poweredOff: false
      };
    },
    drawBuilding: drawBuilding
  };
})(window);

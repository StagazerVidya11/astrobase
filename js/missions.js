(function (global) {
  'use strict';

  var ASTROBASE = (global.ASTROBASE = global.ASTROBASE || {});

  var CAMPAIGN = [
    {
      id: 'm1_base',
      number: 1,
      title: 'Establish the Mars Base',
      summary: 'Inspect your landing pod and construct essential life-support buildings.',
      rewardText: '+30 Base Parts, +15 Energy',
      reward: { parts: 30, energy: 15 },
      achievement: 'Base Pioneer',
      objectives: [
        {
          id: 'inspect_pod',
          text: 'Inspect the Landing Pod (walk near & press Interact)',
          check: function (gs) {
            return !!gs.flags.inspectedLandingPod;
          }
        },
        {
          id: 'build_habitat',
          text: 'Build a Habitat Dome',
          check: function (gs) {
            return countType(gs.buildings, 'habitat') >= 1;
          }
        },
        {
          id: 'build_solar',
          text: 'Install a Solar Panel',
          check: function (gs) {
            return countType(gs.buildings, 'solar') >= 1;
          }
        },
        {
          id: 'build_oxygen',
          text: 'Build an Oxygen Generator',
          check: function (gs) {
            return countType(gs.buildings, 'oxygen') >= 1;
          }
        }
      ]
    },
    {
      id: 'm2_water',
      number: 2,
      title: 'Secure Water Supply',
      summary: 'Extract frozen water from Martian soil and finish a day with healthy reserves.',
      rewardText: '+35 Base Parts, +15 Water',
      reward: { parts: 35, water: 15 },
      achievement: 'Ice Harvester',
      objectives: [
        {
          id: 'build_water',
          text: 'Build a Water Extractor',
          check: function (gs) {
            return countType(gs.buildings, 'water') >= 1;
          }
        },
        {
          id: 'hold_water',
          text: 'Finish a Sol (End Day) with 60+ Water',
          check: function (gs) {
            return !!gs.flags.waterDayMaintained;
          }
        }
      ]
    },
    {
      id: 'm3_food',
      number: 3,
      title: 'Grow Food on Mars',
      summary: 'Construct a Greenhouse and harvest your first fresh Martian crops.',
      rewardText: '+40 Base Parts, +15 Food',
      reward: { parts: 40, food: 15 },
      achievement: 'Martian Botanist',
      objectives: [
        {
          id: 'build_greenhouse',
          text: 'Build a Greenhouse',
          check: function (gs) {
            return countType(gs.buildings, 'greenhouse') >= 1;
          }
        },
        {
          id: 'harvest_food',
          text: 'Power the Greenhouse through End Day to harvest food',
          check: function (gs) {
            return !!gs.flags.greenhouseHarvested;
          }
        }
      ]
    },
    {
      id: 'm4_research',
      number: 4,
      title: 'Scientific Research',
      summary: 'Build a Research Laboratory and reach 100% research data.',
      rewardText: '+45 Base Parts, +20 Energy',
      reward: { parts: 45, energy: 20 },
      achievement: 'Red Planet Scientist',
      objectives: [
        {
          id: 'build_lab',
          text: 'Build a Research Laboratory',
          check: function (gs) {
            return countType(gs.buildings, 'lab') >= 1;
          }
        },
        {
          id: 'complete_research',
          text: 'Reach 100% Research (run Lab across Sols or scan Mars rocks)',
          check: function (gs) {
            return gs.research >= 100;
          }
        }
      ]
    },
    {
      id: 'm5_storm',
      number: 5,
      title: 'Survive the Dust Storm',
      summary: 'Weather a Martian dust storm, keep equipment repaired, and protect the crew.',
      rewardText: 'Colony Certified Self-Sustaining!',
      reward: { parts: 50 },
      achievement: 'Storm Survivor',
      objectives: [
        {
          id: 'endure_storm',
          text: 'Survive through a Martian Dust Storm (End Day during/after storm)',
          check: function (gs) {
            return !!gs.flags.stormSurvived;
          }
        },
        {
          id: 'all_repaired',
          text: 'Keep all base buildings repaired (0 damaged)',
          check: function (gs) {
            return gs.buildings.every(function (b) {
              return !b.damaged;
            });
          }
        },
        {
          id: 'survive_sols',
          text: 'Reach Sol 06 or higher with all resources above 0',
          check: function (gs) {
            return gs.day >= 6 && gs.resources.crewHealth > 0;
          }
        }
      ]
    }
  ];

  function countType(buildings, type) {
    var count = 0;
    for (var i = 0; i < buildings.length; i += 1) {
      if (buildings[i].type === type) count += 1;
    }
    return count;
  }

  ASTROBASE.Missions = {
    CAMPAIGN: CAMPAIGN,
    createInitial: function () {
      return {
        currentIndex: 0,
        completedIds: [],
        campaignDone: false
      };
    },
    getCurrentMission: function (missionsState) {
      if (!missionsState || missionsState.campaignDone) return null;
      return CAMPAIGN[missionsState.currentIndex] || null;
    },
    evaluate: function (gameState) {
      var mState = gameState.missions;
      if (!mState || mState.campaignDone) return null;

      var mission = CAMPAIGN[mState.currentIndex];
      if (!mission) {
        mState.campaignDone = true;
        return null;
      }

      var allDone = true;
      for (var i = 0; i < mission.objectives.length; i += 1) {
        if (!mission.objectives[i].check(gameState)) {
          allDone = false;
          break;
        }
      }

      if (!allDone) return null;

      // Grant rewards & advance
      if (mState.completedIds.indexOf(mission.id) === -1) {
        mState.completedIds.push(mission.id);
      }

      var reward = mission.reward || {};
      var keys = Object.keys(reward);
      for (var j = 0; j < keys.length; j += 1) {
        var k = keys[j];
        gameState.resources[k] = (gameState.resources[k] || 0) + reward[k];
      }
      ASTROBASE.Resources.clampAll(gameState.resources);

      if (mission.achievement && gameState.achievements.indexOf(mission.achievement) === -1) {
        gameState.achievements.push(mission.achievement);
      }

      var completedMission = mission;
      if (mState.currentIndex + 1 < CAMPAIGN.length) {
        mState.currentIndex += 1;
      } else {
        mState.campaignDone = true;
      }

      return completedMission;
    }
  };
})(window);

(function (global) {
  'use strict';

  var ASTROBASE = (global.ASTROBASE = global.ASTROBASE || {});

  var settings = ASTROBASE.Storage.loadSettings();
  var gameState = null;
  var screenMode = 'menu'; // 'menu' | 'playing' | 'paused' | 'ended'
  var lastTime = 0;
  var tick = 0;

  var keysDown = {};
  var dpadState = { up: false, down: false, left: false, right: false };
  var tapMoveTarget = null;

  var uiState = {
    placingType: null,
    hoverTile: null,
    nearbyTarget: null,
    selectedTarget: null
  };

  function createFreshState(difficulty) {
    var diff = difficulty || settings.difficulty || 'guided';
    return {
      day: 1,
      difficulty: diff,
      resources: ASTROBASE.Resources.createInitial(diff),
      buildings: [],
      interactables: ASTROBASE.World.createInitialInteractables(),
      player: ASTROBASE.Player.createInitial(),
      missions: ASTROBASE.Missions.createInitial(),
      activeEvent: null,
      research: 0,
      victoryShown: false,
      achievements: [],
      flags: {
        inspectedLandingPod: false,
        waterDayMaintained: false,
        greenhouseHarvested: false,
        stormSurvived: false
      },
      stats: {
        buildingsBuilt: 0,
        totalOxygenProduced: 0,
        totalWaterProduced: 0,
        totalFoodProduced: 0
      }
    };
  }

  function autosave() {
    if (!gameState) return;
    ASTROBASE.Storage.saveGame(gameState);
    ASTROBASE.UI.updateMenuSaveState(gameState);
  }

  function startNewGame() {
    gameState = createFreshState(settings.difficulty);
    uiState.placingType = null;
    uiState.hoverTile = null;
    uiState.selectedTarget = null;
    tapMoveTarget = null;
    screenMode = 'playing';
    ASTROBASE.UI.showScreen('game');
    resizeCanvasToFit();
    ASTROBASE.UI.setTab('missions');
    autosave();
    refreshUI();
    ASTROBASE.UI.showToast('Welcome to Mars! Inspect your Landing Pod to begin Mission 1.');
  }

  function continueSavedGame() {
    var saved = ASTROBASE.Storage.loadSave();
    if (!saved) {
      ASTROBASE.UI.showToast('No valid saved mission found. Starting a new mission.');
      startNewGame();
      return;
    }
    gameState = saved;
    if (!gameState.stats) {
      gameState.stats = { buildingsBuilt: gameState.buildings.length, totalOxygenProduced: 0, totalWaterProduced: 0, totalFoodProduced: 0 };
    }
    if (!gameState.achievements) gameState.achievements = [];
    if (!gameState.flags) {
      gameState.flags = { inspectedLandingPod: false, waterDayMaintained: false, greenhouseHarvested: false, stormSurvived: false };
    }
    uiState.placingType = null;
    uiState.hoverTile = null;
    uiState.selectedTarget = null;
    tapMoveTarget = null;
    screenMode = 'playing';
    ASTROBASE.UI.showScreen('game');
    resizeCanvasToFit();
    refreshUI();
    ASTROBASE.UI.showToast('Resumed Sol ' + String(gameState.day).padStart(2, '0') + '.');
  }

  function refreshUI() {
    if (!gameState) return;
    ASTROBASE.UI.renderHUD(gameState, uiState, {
      onSelectBuild: selectBuildType,
      onInteractTarget: interactWithTarget
    });
  }

  function selectBuildType(type) {
    uiState.placingType = type;
    if (type && !uiState.hoverTile) {
      var ts = ASTROBASE.World.TILE_SIZE;
      uiState.hoverTile = {
        gx: Math.min(ASTROBASE.World.COLS - 1, Math.floor(gameState.player.x / ts) + 1),
        gy: Math.max(1, Math.floor(gameState.player.y / ts))
      };
    }
    refreshUI();
  }

  function attemptPlaceBuilding(gx, gy) {
    if (!uiState.placingType || !gameState) return false;
    var type = uiState.placingType;
    var def = ASTROBASE.Buildings.DEFS[type];

    if (!ASTROBASE.Buildings.canAfford(type, gameState.resources)) {
      ASTROBASE.Audio.playAlert();
      ASTROBASE.UI.showToast('Not enough Parts or Energy to build ' + def.name + '.');
      return false;
    }

    if (!ASTROBASE.World.canBuildAt(gx, gy, gameState)) {
      ASTROBASE.Audio.playAlert();
      ASTROBASE.UI.showToast('Cannot build there — pick open Martian ground.');
      return false;
    }

    ASTROBASE.Buildings.payCost(type, gameState.resources);
    var instance = ASTROBASE.Buildings.createInstance(type, gx, gy, gameState.day);
    gameState.buildings.push(instance);
    gameState.stats.buildingsBuilt += 1;
    uiState.placingType = null;
    uiState.selectedTarget = { category: 'building', ref: instance, id: instance.id };

    ASTROBASE.World.addPopup(gx, gy, '+' + def.shortName, '#10b981');
    ASTROBASE.Audio.playBuild();

    var completed = ASTROBASE.Missions.evaluate(gameState);
    if (completed) {
      ASTROBASE.Audio.playMissionComplete();
      ASTROBASE.UI.showToast('Mission Complete: ' + completed.title + '! Reward: ' + completed.rewardText);
    } else {
      ASTROBASE.UI.showToast(def.name + ' constructed!');
    }

    autosave();
    refreshUI();
    return true;
  }

  function interactWithTarget(target) {
    if (!target || !gameState) return;

    if (target.category === 'interactable') {
      var it = target.ref;
      if (it.kind === 'pod') {
        if (gameState.activeEvent && gameState.activeEvent.type === 'water_shortage') {
          if (gameState.resources.parts >= 10) {
            gameState.resources.parts -= 10;
            gameState.activeEvent = null;
            ASTROBASE.Audio.playRepair();
            ASTROBASE.World.addPopup(it.gx, it.gy, 'Pipe Thawed!', '#38bdf8');
            ASTROBASE.UI.showToast('Frozen water pipe thawed using 10 Parts!');
            autosave();
            refreshUI();
            return;
          }
          ASTROBASE.Audio.playAlert();
          ASTROBASE.UI.showToast('Need 10 Parts to thaw the frozen water pipe.');
          return;
        }
        gameState.flags.inspectedLandingPod = true;
        ASTROBASE.Audio.playClick();
        ASTROBASE.UI.openModal('Landing Pod — Mission Control', function (body) {
          var p = document.createElement('p');
          p.textContent = 'Touchdown confirmed at Jezero Plains! All initial survival tanks are online.';
          var p2 = document.createElement('p');
          p2.textContent = 'Check your Missions tab on the right (or Base Menu on mobile) to build your Habitat, Solar Panel, and Oxygen Generator.';
          body.appendChild(p);
          body.appendChild(p2);
        });
        var mDone = ASTROBASE.Missions.evaluate(gameState);
        if (mDone) {
          ASTROBASE.Audio.playMissionComplete();
          ASTROBASE.UI.showToast('Mission Complete: ' + mDone.title + '!');
        }
        autosave();
        refreshUI();
        return;
      }

      if (it.kind === 'crate' && !it.collected) {
        it.collected = true;
        gameState.resources.parts = Math.min(999, gameState.resources.parts + it.amount);
        ASTROBASE.Audio.playCollect();
        ASTROBASE.World.addPopup(it.gx, it.gy, '+' + it.amount + ' Parts', '#fbbf24');
        ASTROBASE.UI.showToast('Collected +' + it.amount + ' Base Parts from Supply Crate!');
        var allCratesDone = gameState.interactables.every(function (x) {
          return x.kind !== 'crate' || x.collected;
        });
        if (allCratesDone && gameState.achievements.indexOf('Crate Explorer') === -1) {
          gameState.achievements.push('Crate Explorer');
        }
        uiState.selectedTarget = null;
        autosave();
        refreshUI();
        return;
      }

      if (it.kind === 'sample' && !it.collected) {
        it.collected = true;
        gameState.research = Math.min(100, gameState.research + it.amount);
        ASTROBASE.Audio.playCollect();
        ASTROBASE.World.addPopup(it.gx, it.gy, '+' + it.amount + '% Research', '#e879f9');
        ASTROBASE.UI.showToast('Scanned ' + it.label + ' (+' + it.amount + '% Research)!');
        var mComp = ASTROBASE.Missions.evaluate(gameState);
        if (mComp) {
          ASTROBASE.Audio.playMissionComplete();
          ASTROBASE.UI.showToast('Mission Complete: ' + mComp.title + '!');
        }
        uiState.selectedTarget = null;
        autosave();
        refreshUI();
        return;
      }
    }

    if (target.category === 'building') {
      var b = target.ref;
      var def = ASTROBASE.Buildings.DEFS[b.type];

      if (b.damaged) {
        var rCost = def.repairCost.parts || 10;
        if (gameState.resources.parts >= rCost) {
          gameState.resources.parts -= rCost;
          b.damaged = false;
          ASTROBASE.Audio.playRepair();
          ASTROBASE.World.addPopup(b.gx, b.gy, 'Repaired!', '#10b981');
          ASTROBASE.UI.showToast(def.name + ' repaired using ' + rCost + ' Parts!');
          var mRep = ASTROBASE.Missions.evaluate(gameState);
          if (mRep) {
            ASTROBASE.Audio.playMissionComplete();
          }
          autosave();
          refreshUI();
        } else {
          ASTROBASE.Audio.playAlert();
          ASTROBASE.UI.showToast('Need ' + rCost + ' Parts to repair ' + def.name + '.');
        }
        return;
      }

      if (b.poweredOff) {
        b.poweredOff = false;
        ASTROBASE.Audio.playRepair();
        ASTROBASE.World.addPopup(b.gx, b.gy, 'Power On!', '#fbbf24');
        ASTROBASE.UI.showToast(def.name + ' breaker reset and back online!');
        if (gameState.activeEvent && gameState.activeEvent.type === 'power_failure') {
          gameState.activeEvent = null;
        }
        autosave();
        refreshUI();
        return;
      }

      if (
        gameState.activeEvent &&
        gameState.activeEvent.type === 'oxygen_leak' &&
        (b.type === 'oxygen' || b.type === 'habitat')
      ) {
        if (gameState.resources.parts >= 10) {
          gameState.resources.parts -= 10;
          gameState.activeEvent = null;
          ASTROBASE.Audio.playRepair();
          ASTROBASE.World.addPopup(b.gx, b.gy, 'Leak Sealed!', '#38bdf8');
          ASTROBASE.UI.showToast('Airlock oxygen leak sealed!');
          autosave();
          refreshUI();
        } else {
          ASTROBASE.Audio.playAlert();
          ASTROBASE.UI.showToast('Need 10 Parts to seal the oxygen leak.');
        }
        return;
      }

      if (
        gameState.activeEvent &&
        gameState.activeEvent.type === 'water_shortage' &&
        b.type === 'water'
      ) {
        if (gameState.resources.parts >= 10) {
          gameState.resources.parts -= 10;
          gameState.activeEvent = null;
          ASTROBASE.Audio.playRepair();
          ASTROBASE.World.addPopup(b.gx, b.gy, 'Pipe Cleared!', '#60a5fa');
          ASTROBASE.UI.showToast('Water Extractor pipe thawed and flowing!');
          autosave();
          refreshUI();
        } else {
          ASTROBASE.Audio.playAlert();
          ASTROBASE.UI.showToast('Need 10 Parts to thaw the water line.');
        }
        return;
      }

      if (b.type === 'habitat') {
        var ts = ASTROBASE.World.TILE_SIZE;
        gameState.player.x = (b.gx + 0.5) * ts;
        gameState.player.y = (b.gy + 0.5) * ts;
        gameState.player.sheltered = !gameState.player.sheltered;
        ASTROBASE.Audio.playClick();
        if (
          gameState.player.sheltered &&
          gameState.activeEvent &&
          gameState.activeEvent.type === 'radiation_warning' &&
          gameState.achievements.indexOf('Safety First') === -1
        ) {
          gameState.achievements.push('Safety First');
        }
        ASTROBASE.UI.showToast(
          gameState.player.sheltered ? 'Sheltered safely inside Habitat Dome.' : 'Stepped outside Habitat Dome.'
        );
        autosave();
        refreshUI();
        return;
      }

      // Default inspect opens educational topic
      ASTROBASE.Audio.playClick();
      ASTROBASE.UI.selectLearnTopic('b_' + b.type);
      ASTROBASE.UI.setTab('learn');
    }
  }

  function handleEndDay() {
    if (!gameState || screenMode !== 'playing' || ASTROBASE.UI.isModalOpen()) return;

    var dayCompleted = gameState.day;
    var report = ASTROBASE.Resources.simulateDay(gameState);
    gameState.resources = report.resources;
    gameState.research = Math.min(100, gameState.research + report.researchGained);

    gameState.stats.totalOxygenProduced += report.produced.oxygen;
    gameState.stats.totalWaterProduced += report.produced.water;
    gameState.stats.totalFoodProduced += report.produced.food;

    // Check mission flags for End Day milestones
    if (gameState.buildings.some(function (b) { return b.type === 'water' && !b.damaged; }) && gameState.resources.water >= 60) {
      gameState.flags.waterDayMaintained = true;
    }
    if (report.produced.food > 0) {
      gameState.flags.greenhouseHarvested = true;
    }

    // Check failure conditions
    var failReason = null;
    if (gameState.resources.crewHealth <= 0) {
      failReason = 'Crew Health reached 0 due to harsh Martian survival conditions.';
    } else if (gameState.resources.oxygen <= 0) {
      failReason = 'Colony Oxygen reserves dropped to 0 before life support could recover.';
    } else if (gameState.resources.water <= 0) {
      failReason = 'Colony Water reserves reached 0, halting hydration and greenhouse farming.';
    } else if (gameState.resources.food <= 0) {
      failReason = 'Colony Food reserves reached 0.';
    }

    if (failReason) {
      screenMode = 'ended';
      ASTROBASE.Audio.playFailure();
      refreshUI();
      ASTROBASE.UI.showFailureModal(failReason, ASTROBASE.Storage.hasValidSave(), {
        onReloadSave: function () {
          continueSavedGame();
        },
        onRestart: function () {
          startNewGame();
        },
        onMainMenu: function () {
          screenMode = 'menu';
          ASTROBASE.UI.showScreen('menu');
          ASTROBASE.UI.updateMenuSaveState(ASTROBASE.Storage.loadSave());
        }
      });
      return;
    }

    // Advance day
    gameState.day += 1;

    // Evaluate mission progression before triggering next event
    var completedMission = ASTROBASE.Missions.evaluate(gameState);
    if (completedMission) {
      ASTROBASE.Audio.playMissionComplete();
    } else {
      ASTROBASE.Audio.playEndDay();
    }

    // Trigger/tick environmental event for the new day
    var newEvent = ASTROBASE.Events.maybeTriggerForNextDay(gameState);
    if (newEvent) {
      ASTROBASE.Audio.playAlert();
    }

    // Re-evaluate in case stormSurvived just completed Mission 5
    if (!completedMission) {
      completedMission = ASTROBASE.Missions.evaluate(gameState);
    }

    autosave();
    refreshUI();

    ASTROBASE.UI.showDailyReport(dayCompleted, report, completedMission, newEvent, function () {
      if (gameState.missions.campaignDone && !gameState.victoryShown) {
        gameState.victoryShown = true;
        autosave();
        ASTROBASE.Audio.playVictory();
        ASTROBASE.UI.showVictoryModal(gameState, {
          onKeepPlaying: function () {
            screenMode = 'playing';
          },
          onMainMenu: function () {
            screenMode = 'menu';
            ASTROBASE.UI.showScreen('menu');
            ASTROBASE.UI.updateMenuSaveState(ASTROBASE.Storage.loadSave());
          }
        });
      }
    });
  }

  function openPauseSettings() {
    if (!gameState) return;
    screenMode = 'paused';
    ASTROBASE.UI.showSettings(settings, true, {
      onUpdateSettings: function (updated) {
        settings = updated;
        gameState.difficulty = updated.difficulty;
        ASTROBASE.Storage.saveSettings(settings);
        ASTROBASE.Audio.configure(settings);
        refreshUI();
      },
      onResetSave: function () {
        ASTROBASE.Storage.clearSave();
        ASTROBASE.UI.updateMenuSaveState(null);
        screenMode = 'menu';
        ASTROBASE.UI.showScreen('menu');
        ASTROBASE.UI.showToast('Saved colony data erased.');
      },
      onExitToMenu: function () {
        autosave();
        screenMode = 'menu';
        ASTROBASE.UI.showScreen('menu');
        ASTROBASE.UI.updateMenuSaveState(ASTROBASE.Storage.loadSave());
      },
      onResume: function () {
        screenMode = 'playing';
      }
    });
  }

  function getCanvasTileFromEvent(ev) {
    var canvas = document.getElementById('game-canvas');
    var rect = canvas.getBoundingClientRect();
    var scaleX = ASTROBASE.World.WIDTH / rect.width;
    var scaleY = ASTROBASE.World.HEIGHT / rect.height;
    var clientX = ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX;
    var clientY = ev.touches && ev.touches[0] ? ev.touches[0].clientY : ev.clientY;
    var wx = (clientX - rect.left) * scaleX;
    var wy = (clientY - rect.top) * scaleY;
    return {
      wx: wx,
      wy: wy,
      gx: Math.max(0, Math.min(ASTROBASE.World.COLS - 1, Math.floor(wx / ASTROBASE.World.TILE_SIZE))),
      gy: Math.max(0, Math.min(ASTROBASE.World.ROWS - 1, Math.floor(wy / ASTROBASE.World.TILE_SIZE)))
    };
  }

  function bindEvents() {
    // Unlock Web Audio on first user gesture
    function unlockOnce() {
      ASTROBASE.Audio.unlock();
      ASTROBASE.Audio.configure(settings);
      document.removeEventListener('pointerdown', unlockOnce);
      document.removeEventListener('keydown', unlockOnce);
    }
    document.addEventListener('pointerdown', unlockOnce);
    document.addEventListener('keydown', unlockOnce);

    // Main Menu buttons
    document.getElementById('btn-continue').addEventListener('click', function () {
      ASTROBASE.Audio.playClick();
      continueSavedGame();
    });

    document.getElementById('btn-new-game').addEventListener('click', function () {
      ASTROBASE.Audio.playClick();
      if (ASTROBASE.Storage.hasValidSave()) {
        ASTROBASE.UI.showConfirm(
          'Start a New Mission?',
          'Starting a new mission will overwrite your existing saved colony when you autosave.',
          'Start New Mission',
          startNewGame
        );
      } else {
        startNewGame();
      }
    });

    document.getElementById('btn-how-to-play').addEventListener('click', function () {
      ASTROBASE.Audio.playClick();
      ASTROBASE.UI.showHowToPlay();
    });

    document.getElementById('btn-about').addEventListener('click', function () {
      ASTROBASE.Audio.playClick();
      ASTROBASE.UI.showAbout();
    });

    document.getElementById('btn-menu-settings').addEventListener('click', function () {
      ASTROBASE.Audio.playClick();
      ASTROBASE.UI.showSettings(settings, false, {
        onUpdateSettings: function (updated) {
          settings = updated;
          ASTROBASE.Storage.saveSettings(settings);
          ASTROBASE.Audio.configure(settings);
        },
        onResetSave: function () {
          ASTROBASE.Storage.clearSave();
          ASTROBASE.UI.updateMenuSaveState(null);
          ASTROBASE.UI.showToast('Saved colony data erased.');
        }
      });
    });

    // Top bar & dock controls
    document.getElementById('btn-audio-toggle').addEventListener('click', function () {
      var anyOn = settings.sfxEnabled || settings.musicEnabled;
      settings.sfxEnabled = !anyOn;
      settings.musicEnabled = !anyOn;
      ASTROBASE.Storage.saveSettings(settings);
      ASTROBASE.Audio.configure(settings);
      refreshUI();
    });

    document.getElementById('btn-pause').addEventListener('click', function () {
      ASTROBASE.Audio.playClick();
      openPauseSettings();
    });

    document.getElementById('btn-event-details').addEventListener('click', function () {
      if (!gameState || !gameState.activeEvent) return;
      ASTROBASE.Audio.playClick();
      ASTROBASE.UI.showEventModal(gameState.activeEvent);
    });

    document.getElementById('btn-interact').addEventListener('click', function () {
      if (uiState.nearbyTarget) interactWithTarget(uiState.nearbyTarget);
      else if (uiState.selectedTarget) interactWithTarget(uiState.selectedTarget);
      else ASTROBASE.UI.showToast('Walk closer to a building, supply crate, or Landing Pod.');
    });

    document.getElementById('btn-context-interact').addEventListener('click', function () {
      if (uiState.nearbyTarget) interactWithTarget(uiState.nearbyTarget);
    });

    document.getElementById('btn-end-day').addEventListener('click', handleEndDay);
    document.getElementById('btn-mobile-end-day').addEventListener('click', handleEndDay);
    document.getElementById('btn-mobile-interact').addEventListener('click', function () {
      if (uiState.nearbyTarget) interactWithTarget(uiState.nearbyTarget);
      else if (uiState.selectedTarget) interactWithTarget(uiState.selectedTarget);
      else ASTROBASE.UI.showToast('Move close to an object to interact.');
    });

    document.getElementById('btn-mobile-dock').addEventListener('click', function () {
      ASTROBASE.Audio.playClick();
      ASTROBASE.UI.toggleMobileDock(true);
    });

    document.getElementById('btn-close-mobile-dock').addEventListener('click', function () {
      ASTROBASE.Audio.playClick();
      ASTROBASE.UI.toggleMobileDock(false);
    });

    document.getElementById('btn-confirm-place').addEventListener('click', function () {
      if (uiState.hoverTile) {
        attemptPlaceBuilding(uiState.hoverTile.gx, uiState.hoverTile.gy);
      }
    });

    document.getElementById('btn-cancel-place').addEventListener('click', function () {
      ASTROBASE.Audio.playClick();
      selectBuildType(null);
    });

    // Resource meters click -> educational info
    var meters = document.querySelectorAll('.res-meter');
    for (var m = 0; m < meters.length; m += 1) {
      (function (meter) {
        meter.addEventListener('click', function () {
          ASTROBASE.Audio.playClick();
          var resKey = meter.getAttribute('data-resource');
          ASTROBASE.UI.showResourceEducationModal(resKey);
        });
      })(meters[m]);
    }

    // Dock tabs
    var tabs = document.querySelectorAll('.dock-tab');
    for (var t = 0; t < tabs.length; t += 1) {
      (function (tab) {
        tab.addEventListener('click', function () {
          ASTROBASE.Audio.playClick();
          ASTROBASE.UI.setTab(tab.getAttribute('data-tab'));
        });
      })(tabs[t]);
    }

    // Canvas hover, click & touch
    var canvas = document.getElementById('game-canvas');
    canvas.addEventListener('mousemove', function (ev) {
      if (!gameState || screenMode !== 'playing') return;
      var pos = getCanvasTileFromEvent(ev);
      uiState.hoverTile = { gx: pos.gx, gy: pos.gy };
    });

    canvas.addEventListener('click', function (ev) {
      if (!gameState || screenMode !== 'playing') return;
      var pos = getCanvasTileFromEvent(ev);

      if (uiState.placingType) {
        if (uiState.hoverTile && uiState.hoverTile.gx === pos.gx && uiState.hoverTile.gy === pos.gy) {
          attemptPlaceBuilding(pos.gx, pos.gy);
        } else {
          uiState.hoverTile = { gx: pos.gx, gy: pos.gy };
          ASTROBASE.UI.showToast('Tap again or press Place Here to confirm.');
        }
        return;
      }
      uiState.hoverTile = { gx: pos.gx, gy: pos.gy };

      var b = ASTROBASE.World.getBuildingAt(pos.gx, pos.gy, gameState);
      if (b) {
        uiState.selectedTarget = { category: 'building', ref: b, id: b.id };
        ASTROBASE.Audio.playClick();
        refreshUI();
        return;
      }

      var it = ASTROBASE.World.getInteractableAt(pos.gx, pos.gy, gameState);
      if (it) {
        uiState.selectedTarget = { category: 'interactable', ref: it, id: it.id };
        ASTROBASE.Audio.playClick();
        refreshUI();
        return;
      }

      // Walk smoothly to tapped Mars ground spot
      if (pos.gy >= 1 && ASTROBASE.World.isWalkableTile(pos.gx, pos.gy)) {
        tapMoveTarget = {
          x: (pos.gx + 0.5) * ASTROBASE.World.TILE_SIZE,
          y: (pos.gy + 0.5) * ASTROBASE.World.TILE_SIZE
        };
      }
    });

    // Touch D-Pad bindings
    var dpadBtns = document.querySelectorAll('.dpad-btn');
    for (var d = 0; d < dpadBtns.length; d += 1) {
      (function (btn) {
        var dir = btn.getAttribute('data-dir');
        function setPressed(val, ev) {
          if (ev) ev.preventDefault();
          dpadState[dir] = val;
          btn.classList.toggle('is-active', val);
          if (val) tapMoveTarget = null;
        }
        btn.addEventListener('pointerdown', function (e) { setPressed(true, e); });
        btn.addEventListener('pointerup', function (e) { setPressed(false, e); });
        btn.addEventListener('pointerleave', function (e) { setPressed(false, e); });
        btn.addEventListener('pointercancel', function (e) { setPressed(false, e); });
      })(dpadBtns[d]);
    }

    // Keyboard controls
    document.addEventListener('keydown', function (ev) {
      var code = ev.code;
      keysDown[code] = true;

      if (code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight' || code === 'Space') {
        if (screenMode === 'playing' && !ASTROBASE.UI.isModalOpen()) {
          ev.preventDefault();
        }
      }

      if (code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD' ||
          code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight') {
        tapMoveTarget = null;
      }

      if (ASTROBASE.UI.isModalOpen()) {
        if (code === 'Escape') {
          ASTROBASE.UI.closeModal();
          if (screenMode === 'paused') screenMode = 'playing';
        }
        return;
      }

      if (screenMode !== 'playing') return;

      if (code === 'Escape') {
        if (uiState.placingType) {
          selectBuildType(null);
        } else {
          openPauseSettings();
        }
      } else if (code === 'KeyE') {
        if (uiState.nearbyTarget) interactWithTarget(uiState.nearbyTarget);
      } else if (code === 'Space') {
        handleEndDay();
      } else if (code === 'KeyB') {
        ASTROBASE.UI.setTab('build');
      }
    });

    document.addEventListener('keyup', function (ev) {
      keysDown[ev.code] = false;
    });

    global.addEventListener('resize', resizeCanvasToFit);
  }

  function resizeCanvasToFit() {
    var wrapper = document.getElementById('canvas-wrapper');
    var canvas = document.getElementById('game-canvas');
    if (!wrapper || !canvas) return;
    var rect = wrapper.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    var aspect = ASTROBASE.World.WIDTH / ASTROBASE.World.HEIGHT;
    var w = rect.width;
    var h = w / aspect;
    if (h > rect.height) {
      h = rect.height;
      w = h * aspect;
    }
    canvas.style.width = Math.floor(w) + 'px';
    canvas.style.height = Math.floor(h) + 'px';
  }

  function getMovementVector() {
    var vx = 0;
    var vy = 0;
    if (keysDown.KeyW || keysDown.ArrowUp || dpadState.up) vy -= 1;
    if (keysDown.KeyS || keysDown.ArrowDown || dpadState.down) vy += 1;
    if (keysDown.KeyA || keysDown.ArrowLeft || dpadState.left) vx -= 1;
    if (keysDown.KeyD || keysDown.ArrowRight || dpadState.right) vx += 1;

    if (vx === 0 && vy === 0 && tapMoveTarget && gameState) {
      var dx = tapMoveTarget.x - gameState.player.x;
      var dy = tapMoveTarget.y - gameState.player.y;
      var dist = Math.hypot(dx, dy);
      if (dist > 8) {
        vx = dx / dist;
        vy = dy / dist;
      } else {
        tapMoveTarget = null;
      }
    }

    return { x: vx, y: vy };
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    var dt = Math.min(0.05, (timestamp - lastTime) / 1000);
    lastTime = timestamp;
    tick += 1;

    if (screenMode === 'playing' && gameState && !ASTROBASE.UI.isModalOpen()) {
      var vec = getMovementVector();
      ASTROBASE.Player.update(gameState.player, dt, vec, gameState);

      var prevId = uiState.nearbyTarget ? uiState.nearbyTarget.id : null;
      uiState.nearbyTarget = ASTROBASE.Player.getNearbyTarget(gameState.player, gameState);
      var newId = uiState.nearbyTarget ? uiState.nearbyTarget.id : null;
      if (prevId !== newId) {
        refreshUI();
      }

      var canvas = document.getElementById('game-canvas');
      var ctx = canvas.getContext('2d');
      ASTROBASE.World.draw(ctx, gameState, tick, uiState);
    }

    global.requestAnimationFrame(loop);
  }

  function init() {
    ASTROBASE.Audio.configure(settings);
    ASTROBASE.UI.drawMenuPreview();
    ASTROBASE.UI.updateMenuSaveState(ASTROBASE.Storage.loadSave());
    ASTROBASE.UI.showScreen('menu');
    bindEvents();
    resizeCanvasToFit();
    global.requestAnimationFrame(loop);
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);

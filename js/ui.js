(function (global) {
  'use strict';

  var ASTROBASE = (global.ASTROBASE = global.ASTROBASE || {});

  var toastTimer = null;
  var activeModalClose = null;
  var currentLearnKey = 'oxygen';

  function el(id) {
    return document.getElementById(id);
  }

  function formatDelta(val) {
    if (val > 0) return '+' + val;
    return String(val);
  }

  function deltaClass(val) {
    if (val > 0) return 'delta-pos';
    if (val < 0) return 'delta-neg';
    return 'delta-zero';
  }

  function createNode(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === 'string') node.textContent = text;
    return node;
  }

  function getLearnCatalog() {
    var catalog = {};
    var resInfo = ASTROBASE.Resources.RESOURCE_INFO;
    var resKeys = Object.keys(resInfo);
    for (var i = 0; i < resKeys.length; i += 1) {
      var rk = resKeys[i];
      var r = resInfo[rk];
      catalog[rk] = {
        id: rk,
        label: r.name,
        title: r.name + ' (' + r.unit + ')',
        whatItDoes: r.whatItDoes,
        whyNeeded: r.whyNeeded,
        missionHelp: r.missionHelp,
        fact: r.fact,
        note: r.note
      };
    }

    var bDefs = ASTROBASE.Buildings.DEFS;
    var bOrder = ASTROBASE.Buildings.ORDER;
    for (var j = 0; j < bOrder.length; j += 1) {
      var bk = bOrder[j];
      var b = bDefs[bk];
      catalog['b_' + bk] = {
        id: 'b_' + bk,
        label: b.shortName,
        title: b.name,
        whatItDoes: b.edu.whatItDoes,
        whyNeeded: b.edu.whyNeeded,
        missionHelp: b.edu.missionHelp,
        fact: b.edu.fact,
        note: 'Gameplay numbers are simplified for fun learning and do not imply NASA endorsement.'
      };
    }

    catalog.safety = {
      id: 'safety',
      label: 'Mars Safety',
      title: 'Radiation & Astronaut Safety',
      whatItDoes: 'Spacesuits and Habitat Domes protect explorers from extreme cold, thin air, and solar particles.',
      whyNeeded: 'Earth has a thick atmosphere and magnetic field that block most space radiation; Mars does not.',
      missionHelp: 'Watch for Solar Radiation Warnings and shelter inside your Habitat Dome before ending the day.',
      fact: 'Martian dust storms can cover giant areas of the planet for weeks at a time!',
      note: 'ASTROBASE simplifies space hazards into turn-based missions for young learners.'
    };

    return catalog;
  }

  ASTROBASE.UI = {
    drawMenuPreview: function () {
      var canvas = el('menu-preview-canvas');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var w = canvas.width;
      var h = canvas.height;

      // Sky gradient bands (16-bit style)
      ctx.fillStyle = '#140c1c';
      ctx.fillRect(0, 0, w, 46);
      ctx.fillStyle = '#2d142c';
      ctx.fillRect(0, 46, w, 24);
      ctx.fillStyle = '#511845';
      ctx.fillRect(0, 66, w, 16);

      // Stars
      ctx.fillStyle = '#fef3c7';
      var stars = [[24, 14], [72, 28], [130, 12], [190, 22], [250, 16], [295, 30], [52, 42]];
      for (var i = 0; i < stars.length; i += 1) {
        ctx.fillRect(stars[i][0], stars[i][1], 2, 2);
      }

      // Distant Mars ridge
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(0, 74, w, 22);
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(20, 68, 74, 10);
      ctx.fillRect(140, 64, 96, 14);

      // Ground
      ctx.fillStyle = '#b84a27';
      ctx.fillRect(0, 92, w, h - 92);
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(0, 92, w, 4);

      // Mini Habitat + Solar + Greenhouse + Astronaut
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(54, 72, 42, 28);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(54, 84, 42, 5);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(66, 76, 18, 6);

      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(114, 80, 32, 16);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(120, 80, 2, 16);
      ctx.fillRect(130, 80, 2, 16);

      ctx.fillStyle = '#166534';
      ctx.fillRect(222, 74, 42, 26);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(228, 80, 12, 8);
      ctx.fillRect(246, 80, 12, 8);

      // Astronaut
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(176, 80, 12, 10);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(178, 82, 8, 5);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(177, 90, 10, 10);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(177, 100, 4, 4);
      ctx.fillRect(183, 100, 4, 4);
    },

    showScreen: function (name) {
      el('screen-menu').hidden = name !== 'menu';
      el('screen-game').hidden = name !== 'game';
    },

    updateMenuSaveState: function (saveData) {
      var btnContinue = el('btn-continue');
      var summary = el('menu-save-summary');
      if (saveData) {
        btnContinue.hidden = false;
        summary.hidden = false;
        var mNum = Math.min(saveData.missions.currentIndex + 1, ASTROBASE.Missions.CAMPAIGN.length);
        summary.textContent =
          'Saved Mission: Sol ' +
          String(saveData.day).padStart(2, '0') +
          ' · Mission ' +
          mNum +
          '/' +
          ASTROBASE.Missions.CAMPAIGN.length +
          ' · Health ' +
          saveData.resources.crewHealth +
          ' · Buildings ' +
          saveData.buildings.length;
      } else {
        btnContinue.hidden = true;
        summary.hidden = true;
      }
    },

    showToast: function (msg) {
      var toast = el('toast');
      toast.textContent = msg;
      toast.hidden = false;
      if (toastTimer) global.clearTimeout(toastTimer);
      toastTimer = global.setTimeout(function () {
        toast.hidden = true;
      }, 2800);
    },

    openModal: function (title, bodyBuilder, footerButtons, onClose) {
      el('modal-title').textContent = title;
      var body = el('modal-body');
      var footer = el('modal-footer');
      body.innerHTML = '';
      footer.innerHTML = '';

      if (typeof bodyBuilder === 'function') {
        bodyBuilder(body);
      }

      var closeBtn = el('btn-modal-close');
      activeModalClose = onClose || null;

      if (Array.isArray(footerButtons) && footerButtons.length > 0) {
        for (var i = 0; i < footerButtons.length; i += 1) {
          (function (cfg) {
            var btn = createNode('button', 'btn ' + (cfg.variant || 'btn-secondary'), cfg.label);
            btn.type = 'button';
            btn.addEventListener('click', function () {
              ASTROBASE.Audio.playClick();
              if (cfg.closeFirst !== false) {
                ASTROBASE.UI.closeModal(true);
              }
              if (cfg.onClick) cfg.onClick();
            });
            footer.appendChild(btn);
          })(footerButtons[i]);
        }
      } else {
        var okBtn = createNode('button', 'btn btn-primary', 'Close');
        okBtn.type = 'button';
        okBtn.addEventListener('click', function () {
          ASTROBASE.Audio.playClick();
          ASTROBASE.UI.closeModal();
        });
        footer.appendChild(okBtn);
      }

      closeBtn.onclick = function () {
        ASTROBASE.Audio.playClick();
        ASTROBASE.UI.closeModal();
      };

      el('modal-backdrop').hidden = false;
    },

    closeModal: function (skipCallback) {
      el('modal-backdrop').hidden = true;
      if (!skipCallback && typeof activeModalClose === 'function') {
        var cb = activeModalClose;
        activeModalClose = null;
        cb();
      } else {
        activeModalClose = null;
      }
    },

    isModalOpen: function () {
      return !el('modal-backdrop').hidden;
    },

    setTab: function (tabName) {
      var tabs = document.querySelectorAll('.dock-tab');
      var panes = document.querySelectorAll('.dock-pane');
      for (var i = 0; i < tabs.length; i += 1) {
        var t = tabs[i];
        var active = t.getAttribute('data-tab') === tabName;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      }
      for (var j = 0; j < panes.length; j += 1) {
        var p = panes[j];
        var show = p.id === 'pane-' + tabName;
        p.classList.toggle('active', show);
        p.hidden = !show;
      }
    },

    toggleMobileDock: function (open) {
      el('side-dock').classList.toggle('is-mobile-open', !!open);
    },

    renderHUD: function (gameState, uiState, handlers) {
      // Day label
      el('hud-day-label').textContent = 'Sol ' + String(gameState.day).padStart(2, '0');

      // Resource Strip
      var map = [
        ['oxygen', 'res-oxygen', 'state-oxygen'],
        ['water', 'res-water', 'state-water'],
        ['food', 'res-food', 'state-food'],
        ['energy', 'res-energy', 'state-energy'],
        ['crewHealth', 'res-health', 'state-health'],
        ['parts', 'res-parts', 'state-parts']
      ];
      for (var i = 0; i < map.length; i += 1) {
        var key = map[i][0];
        var val = gameState.resources[key];
        var valEl = el(map[i][1]);
        var stEl = el(map[i][2]);
        var meter = valEl.closest('.res-meter');
        var status = ASTROBASE.Resources.getStatusLabel(key, val);

        valEl.textContent = String(val);
        stEl.textContent = status;
        meter.classList.toggle('is-low', status === 'LOW');
        meter.classList.toggle('is-critical', status === 'CRIT' || status === 'EMPTY');
      }

      // Audio toggle label
      var audioBtn = el('btn-audio-toggle');
      var muted = ASTROBASE.Audio.isMuted();
      audioBtn.textContent = muted ? 'Sound Off' : 'Sound On';
      audioBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');

      // Event Banner
      var banner = el('event-banner');
      if (gameState.activeEvent) {
        banner.hidden = false;
        banner.classList.toggle('is-danger', gameState.activeEvent.severity === 'danger');
        el('event-banner-title').textContent =
          gameState.activeEvent.title + ' (' + gameState.activeEvent.daysLeft + ' Sol left)';
        el('event-banner-desc').textContent = gameState.activeEvent.response;
      } else {
        banner.hidden = true;
      }

      // Placement bar
      var placeBar = el('placement-bar');
      if (uiState.placingType) {
        var pDef = ASTROBASE.Buildings.DEFS[uiState.placingType];
        placeBar.hidden = false;
        el('placement-label').textContent =
          'Placing ' + pDef.name + ' (' + pDef.cost.parts + ' Parts' + (pDef.cost.energy ? ', ' + pDef.cost.energy + ' Energy' : '') + ') — Tap green ground';
      } else {
        placeBar.hidden = true;
      }

      // Context prompt near player
      var ctxPrompt = el('context-prompt');
      if (!uiState.placingType && uiState.nearbyTarget) {
        var actionText = this.describeTargetAction(uiState.nearbyTarget, gameState);
        ctxPrompt.hidden = false;
        el('context-prompt-text').textContent = actionText.label;
        el('btn-context-interact').textContent = actionText.verb;
      } else {
        ctxPrompt.hidden = true;
      }

      // Render Mission Card
      this.renderMissionCard(gameState);

      // Render Inspector Card
      this.renderInspectorCard(gameState, uiState, handlers);

      // Render Build List
      this.renderBuildList(gameState, uiState, handlers);

      // Render Learn Tab
      this.renderLearnTab();
    },

    describeTargetAction: function (target, gameState) {
      if (!target) return { label: '', verb: 'Interact' };
      if (target.category === 'interactable') {
        var it = target.ref;
        if (it.kind === 'pod') {
          if (gameState.activeEvent && gameState.activeEvent.type === 'water_shortage') {
            return { label: 'Landing Pod — Thaw Frozen Pipe (10 Parts)', verb: 'Fix Pipe' };
          }
          return { label: 'Landing Pod — Mission Control & Telemetry', verb: 'Inspect' };
        }
        if (it.kind === 'crate') {
          return { label: 'Supply Crate (+' + it.amount + ' Base Parts)', verb: 'Collect' };
        }
        if (it.kind === 'sample') {
          return { label: it.label + ' (+' + it.amount + '% Research)', verb: 'Scan Sample' };
        }
      }
      if (target.category === 'building') {
        var b = target.ref;
        var def = ASTROBASE.Buildings.DEFS[b.type];
        if (b.damaged) {
          return { label: def.name + ' is Damaged (' + def.repairCost.parts + ' Parts)', verb: 'Repair' };
        }
        if (b.poweredOff) {
          return { label: def.name + ' Breaker Tripped', verb: 'Reset Power' };
        }
        if (
          gameState.activeEvent &&
          gameState.activeEvent.type === 'oxygen_leak' &&
          (b.type === 'oxygen' || b.type === 'habitat')
        ) {
          return { label: def.name + ' — Airlock Leak Detected (10 Parts)', verb: 'Seal Leak' };
        }
        if (
          gameState.activeEvent &&
          gameState.activeEvent.type === 'water_shortage' &&
          b.type === 'water'
        ) {
          return { label: def.name + ' — Ice Blockage (10 Parts)', verb: 'Thaw Pipe' };
        }
        if (b.type === 'habitat') {
          return {
            label: gameState.player.sheltered ? 'Inside Habitat Dome (Safe)' : 'Habitat Dome — Crew Shelter',
            verb: gameState.player.sheltered ? 'Exit Shelter' : 'Shelter Inside'
          };
        }
        return { label: def.name, verb: 'Inspect' };
      }
      return { label: 'Martian Surface', verb: 'Inspect' };
    },

    renderMissionCard: function (gameState) {
      var container = el('mission-card');
      container.innerHTML = '';

      var mission = ASTROBASE.Missions.getCurrentMission(gameState.missions);
      if (!mission) {
        container.appendChild(createNode('h3', 'section-heading', 'Campaign Complete'));
        container.appendChild(createNode('p', 'section-title', 'Mars Colony Self-Sustaining'));
        container.appendChild(
          createNode('p', 'section-copy', 'All 5 missions finished! Keep expanding your base or review your achievements.')
        );
        return;
      }

      container.appendChild(
        createNode('h3', 'section-heading', 'Mission ' + mission.number + ' of ' + ASTROBASE.Missions.CAMPAIGN.length)
      );
      container.appendChild(createNode('p', 'section-title', mission.title));
      container.appendChild(createNode('p', 'section-copy', mission.summary));

      var doneCount = 0;
      var ul = createNode('ul', 'objective-list');
      for (var i = 0; i < mission.objectives.length; i += 1) {
        var obj = mission.objectives[i];
        var done = obj.check(gameState);
        if (done) doneCount += 1;
        var li = createNode('li', 'objective-item' + (done ? ' is-done' : ''));
        li.appendChild(createNode('span', 'objective-mark', done ? '[OK]' : '[  ]'));
        li.appendChild(createNode('span', '', obj.text));
        ul.appendChild(li);
      }
      container.appendChild(ul);

      var pct = Math.round((doneCount / mission.objectives.length) * 100);
      var bar = createNode('div', 'mission-progress-bar');
      var fill = createNode('div', 'mission-progress-fill');
      fill.style.width = pct + '%';
      bar.appendChild(fill);
      container.appendChild(bar);

      container.appendChild(createNode('p', 'section-copy', 'Reward: ' + mission.rewardText));
      if (gameState.research > 0 || gameState.buildings.some(function (b) { return b.type === 'lab'; })) {
        container.appendChild(
          createNode('p', 'section-copy tabular-nums', 'Research Progress: ' + Math.min(100, gameState.research) + '%')
        );
      }
    },

    renderInspectorCard: function (gameState, uiState, handlers) {
      var container = el('inspector-card');
      container.innerHTML = '';

      var target = uiState.selectedTarget || uiState.nearbyTarget;
      container.appendChild(createNode('h3', 'section-heading', 'Inspector'));

      if (!target) {
        container.appendChild(
          createNode('p', 'section-copy', 'Walk near or click any building, supply crate, or Landing Pod to inspect it.')
        );
        return;
      }

      if (target.category === 'interactable') {
        var it = target.ref;
        container.appendChild(createNode('p', 'section-title', it.label));
        if (it.kind === 'pod') {
          container.appendChild(
            createNode('p', 'section-copy', 'Your spacecraft lander. Stores emergency tools and colony mission logs.')
          );
        } else if (it.kind === 'crate') {
          container.appendChild(
            createNode('p', 'section-copy', 'Dropped cargo pod containing +' + it.amount + ' Base Parts for construction.')
          );
        } else if (it.kind === 'sample') {
          container.appendChild(
            createNode('p', 'section-copy', 'Interesting Martian rock formation. Scanning adds +' + it.amount + '% Research.')
          );
        }
        var actInfo = this.describeTargetAction(target, gameState);
        var btn = createNode('button', 'btn btn-primary btn-compact', actInfo.verb);
        btn.type = 'button';
        btn.addEventListener('click', function () {
          handlers.onInteractTarget(target);
        });
        container.appendChild(btn);
        return;
      }

      if (target.category === 'building') {
        var b = target.ref;
        var def = ASTROBASE.Buildings.DEFS[b.type];
        container.appendChild(createNode('p', 'section-title', def.name));
        container.appendChild(createNode('p', 'section-copy', def.effectText));

        var statusText = 'Status: Operational';
        if (b.damaged) statusText = 'Status: Damaged — Needs Repair (' + def.repairCost.parts + ' Parts)';
        else if (b.poweredOff) statusText = 'Status: Powered Off — Reset Breaker';
        container.appendChild(createNode('p', 'section-copy', statusText));

        var row = createNode('div', 'build-card-actions');
        var bInfo = this.describeTargetAction(target, gameState);
        if (b.damaged || b.poweredOff || b.type === 'habitat' || (gameState.activeEvent && (gameState.activeEvent.type === 'oxygen_leak' || gameState.activeEvent.type === 'water_shortage'))) {
          var actBtn = createNode('button', 'btn btn-primary btn-compact', bInfo.verb);
          actBtn.type = 'button';
          actBtn.addEventListener('click', function () {
            handlers.onInteractTarget(target);
          });
          row.appendChild(actBtn);
        }
        var learnBtn = createNode('button', 'btn btn-secondary btn-compact', 'Science Info');
        learnBtn.type = 'button';
        learnBtn.addEventListener('click', function () {
          ASTROBASE.UI.selectLearnTopic('b_' + b.type);
          ASTROBASE.UI.setTab('learn');
        });
        row.appendChild(learnBtn);
        container.appendChild(row);
      }
    },

    renderBuildList: function (gameState, uiState, handlers) {
      var list = el('build-list');
      list.innerHTML = '';

      var order = ASTROBASE.Buildings.ORDER;
      for (var i = 0; i < order.length; i += 1) {
        (function (type) {
          var def = ASTROBASE.Buildings.DEFS[type];
          var affordable = ASTROBASE.Buildings.canAfford(type, gameState.resources);
          var isSelected = uiState.placingType === type;

          var card = createNode('div', 'build-card' + (isSelected ? ' is-selected' : ''));
          var head = createNode('div', 'build-card-head');
          head.appendChild(createNode('h4', 'build-card-name', def.name));
          var costStr = def.cost.parts + ' Parts' + (def.cost.energy ? ' · ' + def.cost.energy + ' Energy' : '');
          head.appendChild(createNode('span', 'build-card-cost tabular-nums', costStr));
          card.appendChild(head);

          card.appendChild(createNode('p', 'build-card-desc', def.summary));
          card.appendChild(createNode('div', 'build-card-meta', def.effectText));

          var actions = createNode('div', 'build-card-actions');
          var placeBtn = createNode(
            'button',
            'btn btn-compact ' + (isSelected ? 'btn-danger' : 'btn-primary'),
            isSelected ? 'Cancel' : affordable ? 'Place Building' : 'Need Resources'
          );
          placeBtn.type = 'button';
          placeBtn.disabled = !affordable && !isSelected;
          placeBtn.addEventListener('click', function () {
            ASTROBASE.Audio.playClick();
            handlers.onSelectBuild(isSelected ? null : type);
            ASTROBASE.UI.toggleMobileDock(false);
          });

          var infoBtn = createNode('button', 'btn btn-secondary btn-compact', 'Info');
          infoBtn.type = 'button';
          infoBtn.addEventListener('click', function () {
            ASTROBASE.Audio.playClick();
            ASTROBASE.UI.selectLearnTopic('b_' + type);
            ASTROBASE.UI.setTab('learn');
          });

          actions.appendChild(placeBtn);
          actions.appendChild(infoBtn);
          card.appendChild(actions);
          list.appendChild(card);
        })(order[i]);
      }
    },

    selectLearnTopic: function (key) {
      currentLearnKey = key;
      this.renderLearnTab();
    },

    renderLearnTab: function () {
      var catalog = getLearnCatalog();
      if (!catalog[currentLearnKey]) currentLearnKey = 'oxygen';

      var topicsEl = el('learn-topics');
      var detailEl = el('learn-detail');
      topicsEl.innerHTML = '';
      detailEl.innerHTML = '';

      var keys = Object.keys(catalog);
      for (var i = 0; i < keys.length; i += 1) {
        (function (k) {
          var item = catalog[k];
          var btn = createNode(
            'button',
            'btn btn-secondary learn-topic-btn' + (k === currentLearnKey ? ' active' : ''),
            item.label
          );
          btn.type = 'button';
          btn.addEventListener('click', function () {
            ASTROBASE.Audio.playClick();
            ASTROBASE.UI.selectLearnTopic(k);
          });
          topicsEl.appendChild(btn);
        })(keys[i]);
      }

      var cur = catalog[currentLearnKey];
      detailEl.appendChild(createNode('h4', '', cur.title));
      detailEl.appendChild(createNode('p', '', 'What it does: ' + cur.whatItDoes));
      detailEl.appendChild(createNode('p', '', 'Why astronauts need it: ' + cur.whyNeeded));
      detailEl.appendChild(createNode('p', '', 'Mission tip: ' + cur.missionHelp));
      detailEl.appendChild(createNode('p', 'learn-fact', 'Mars Fact: ' + cur.fact));
      detailEl.appendChild(createNode('p', 'learn-note', cur.note));
    },

    showResourceEducationModal: function (resKey) {
      var catalog = getLearnCatalog();
      var item = catalog[resKey];
      if (!item) return;
      this.selectLearnTopic(resKey);
      this.openModal(item.title, function (body) {
        body.appendChild(createNode('p', '', item.whatItDoes));
        body.appendChild(createNode('p', '', 'Why astronauts need it: ' + item.whyNeeded));
        body.appendChild(createNode('p', '', 'Mission tip: ' + item.missionHelp));
        body.appendChild(createNode('p', 'learn-fact', 'Mars Fact: ' + item.fact));
        body.appendChild(createNode('p', 'learn-note', item.note));
      });
    },

    showEventModal: function (ev) {
      if (!ev) return;
      this.openModal(ev.title, function (body) {
        body.appendChild(createNode('p', '', ev.explanation));
        body.appendChild(createNode('p', '', 'Gameplay Effect: ' + ev.effect));
        body.appendChild(createNode('p', '', 'Recommended Action: ' + ev.response));
        body.appendChild(createNode('p', 'learn-note', 'Remaining duration: ' + ev.daysLeft + ' Sol(s).'));
      });
    },

    showDailyReport: function (dayCompleted, report, completedMission, newEvent, onContinue) {
      this.openModal(
        'Sol ' + String(dayCompleted).padStart(2, '0') + ' Daily Report',
        function (body) {
          var grid = createNode('div', 'report-grid');
          var rows = [
            ['Oxygen', report.deltas.oxygen, report.resources.oxygen],
            ['Water', report.deltas.water, report.resources.water],
            ['Food', report.deltas.food, report.resources.food],
            ['Energy', report.deltas.energy, report.resources.energy],
            ['Crew Health', report.deltas.crewHealth, report.resources.crewHealth],
            ['Base Parts', report.deltas.parts, report.resources.parts]
          ];
          for (var i = 0; i < rows.length; i += 1) {
            var row = createNode('div', 'report-row');
            row.appendChild(createNode('span', '', rows[i][0] + ' (' + rows[i][2] + ')'));
            row.appendChild(createNode('span', 'tabular-nums ' + deltaClass(rows[i][1]), formatDelta(rows[i][1])));
            grid.appendChild(row);
          }
          body.appendChild(grid);

          if (report.researchGained > 0) {
            body.appendChild(
              createNode('p', 'delta-pos', 'Research Lab uploaded +' + report.researchGained + '% Research Progress.')
            );
          }

          if (report.notes.length > 0) {
            var ul = createNode('ul', 'objective-list');
            for (var j = 0; j < report.notes.length; j += 1) {
              ul.appendChild(createNode('li', '', report.notes[j]));
            }
            body.appendChild(ul);
          }

          if (completedMission) {
            var mBox = createNode('div', 'panel-section');
            mBox.appendChild(createNode('h4', 'section-heading', 'Mission Completed: ' + completedMission.title));
            mBox.appendChild(createNode('p', 'section-copy', 'Reward unlocked: ' + completedMission.rewardText));
            body.appendChild(mBox);
          }

          if (newEvent) {
            var eBox = createNode('div', 'panel-section');
            eBox.appendChild(createNode('h4', 'section-heading', 'Incoming Alert: ' + newEvent.title));
            eBox.appendChild(createNode('p', 'section-copy', newEvent.explanation));
            eBox.appendChild(createNode('p', 'section-copy', 'Action needed: ' + newEvent.response));
            body.appendChild(eBox);
          }
        },
        [{ label: 'Start Next Sol', variant: 'btn-primary', onClick: onContinue }],
        onContinue
      );
    },

    showVictoryModal: function (gameState, handlers) {
      this.openModal(
        'Victory — Mars Base Certified!',
        function (body) {
          body.appendChild(
            createNode(
              'p',
              '',
              'Congratulations, Junior Astronaut! Your base sustained its crew, grew fresh food, completed Mars research, and weathered a dust storm.'
            )
          );
          var stats = createNode('div', 'report-grid');
          var items = [
            ['Sols Survived', String(gameState.day)],
            ['Buildings Built', String(gameState.stats.buildingsBuilt)],
            ['Oxygen Produced', String(gameState.stats.totalOxygenProduced)],
            ['Food Harvested', String(gameState.stats.totalFoodProduced)]
          ];
          for (var i = 0; i < items.length; i += 1) {
            var row = createNode('div', 'report-row');
            row.appendChild(createNode('span', '', items[i][0]));
            row.appendChild(createNode('span', 'tabular-nums', items[i][1]));
            stats.appendChild(row);
          }
          body.appendChild(stats);

          var achText =
            gameState.achievements.length > 0 ? gameState.achievements.join(', ') : 'Mission Graduate';
          body.appendChild(createNode('p', '', 'Achievements Unlocked: ' + achText));
        },
        [
          { label: 'Keep Exploring', variant: 'btn-secondary', onClick: handlers.onKeepPlaying },
          { label: 'Main Menu', variant: 'btn-primary', onClick: handlers.onMainMenu }
        ]
      );
    },

    showFailureModal: function (reason, hasSave, handlers) {
      this.openModal(
        'Mission Failed',
        function (body) {
          body.appendChild(createNode('p', '', reason));
          body.appendChild(
            createNode(
              'p',
              'section-copy',
              'Tip: Balance Solar Panels with life-support equipment, collect orange Supply Crates for extra Parts, and repair leaks quickly.'
            )
          );
        },
        [
          ...(hasSave
            ? [{ label: 'Load Last Autosave', variant: 'btn-secondary', onClick: handlers.onReloadSave }]
            : []),
          { label: 'Restart Mission', variant: 'btn-primary', onClick: handlers.onRestart },
          { label: 'Main Menu', variant: 'btn-secondary', onClick: handlers.onMainMenu }
        ]
      );
    },

    showHowToPlay: function () {
      this.openModal('How to Play ASTROBASE', function (body) {
        var steps = [
          'Move your astronaut with WASD or Arrow keys (or the on-screen D-Pad / tap on touch devices).',
          'Walk near the Landing Pod, orange Supply Crates, or purple Rock Samples and press E / Interact.',
          'Open the Build tab to place Habitat Domes, Solar Panels, Oxygen Generators, Water Extractors, Greenhouses, and Research Labs on open Martian soil.',
          'Click End Day (Space) when ready to produce supplies, advance research, and view your Daily Report.',
          'Respond to alerts: seal oxygen leaks, thaw water pipes, reset tripped power breakers, and shelter inside a Habitat during Solar Radiation Warnings!'
        ];
        var ul = createNode('ul', 'objective-list');
        for (var i = 0; i < steps.length; i += 1) {
          ul.appendChild(createNode('li', '', (i + 1) + '. ' + steps[i]));
        }
        body.appendChild(ul);
      });
    },

    showAbout: function () {
      this.openModal('About ASTROBASE', function (body) {
        body.appendChild(
          createNode(
            'p',
            '',
            'ASTROBASE – Junior Astronaut Mission Trainer is an interactive 2D Mars colony survival and management game built with HTML5, CSS3, Canvas 2D, and vanilla JavaScript.'
          )
        );
        body.appendChild(
          createNode(
            'p',
            '',
            'Young players explore core space sustainability ideas—breathable oxygen, ice water extraction, solar electricity, greenhouse farming, scientific discovery, and radiation protection.'
          )
        );
        body.appendChild(
          createNode(
            'p',
            'learn-note',
            'Educational Disclaimer: All resource numbers, building outputs, and weather durations use simplified fictional game units for age-appropriate play. This project is not an official NASA product or engineering simulator.'
          )
        );
      });
    },

    showSettings: function (settings, inGame, callbacks) {
      this.openModal(inGame ? 'Pause & Settings' : 'Settings', function (body) {
        var sfxRow = createNode('div', 'settings-row');
        sfxRow.appendChild(createNode('span', '', 'Sound Effects'));
        var sfxBtn = createNode('button', 'btn btn-compact', settings.sfxEnabled ? 'Enabled' : 'Muted');
        sfxBtn.type = 'button';
        sfxBtn.addEventListener('click', function () {
          settings.sfxEnabled = !settings.sfxEnabled;
          sfxBtn.textContent = settings.sfxEnabled ? 'Enabled' : 'Muted';
          callbacks.onUpdateSettings(settings);
        });
        sfxRow.appendChild(sfxBtn);
        body.appendChild(sfxRow);

        var musRow = createNode('div', 'settings-row');
        musRow.appendChild(createNode('span', '', 'Space Ambient Audio'));
        var musBtn = createNode('button', 'btn btn-compact', settings.musicEnabled ? 'Enabled' : 'Muted');
        musBtn.type = 'button';
        musBtn.addEventListener('click', function () {
          settings.musicEnabled = !settings.musicEnabled;
          musBtn.textContent = settings.musicEnabled ? 'Enabled' : 'Muted';
          callbacks.onUpdateSettings(settings);
        });
        musRow.appendChild(musBtn);
        body.appendChild(musRow);

        var diffRow = createNode('div', 'settings-row');
        diffRow.appendChild(createNode('span', '', 'Difficulty Preset'));
        var select = createNode('select', 'settings-select');
        var presets = ASTROBASE.Resources.DIFFICULTY_PRESETS;
        var keys = Object.keys(presets);
        for (var i = 0; i < keys.length; i += 1) {
          var opt = document.createElement('option');
          opt.value = keys[i];
          opt.textContent = presets[keys[i]].label;
          if (settings.difficulty === keys[i]) opt.selected = true;
          select.appendChild(opt);
        }
        select.addEventListener('change', function () {
          settings.difficulty = select.value;
          callbacks.onUpdateSettings(settings);
        });
        diffRow.appendChild(select);
        body.appendChild(diffRow);

        var resetRow = createNode('div', 'settings-row');
        resetRow.appendChild(createNode('span', '', 'Saved Colony Data'));
        var resetBtn = createNode('button', 'btn btn-danger btn-compact', 'Reset Save');
        resetBtn.type = 'button';
        resetBtn.addEventListener('click', function () {
          ASTROBASE.UI.showConfirm(
            'Reset Saved Mission?',
            'This will permanently erase your saved Mars colony progress from this browser.',
            'Yes, Reset Save',
            function () {
              callbacks.onResetSave();
            }
          );
        });
        resetRow.appendChild(resetBtn);
        body.appendChild(resetRow);
      }, inGame
        ? [
            { label: 'Main Menu', variant: 'btn-secondary', onClick: callbacks.onExitToMenu },
            { label: 'Resume Game', variant: 'btn-primary', onClick: callbacks.onResume }
          ]
        : [{ label: 'Done', variant: 'btn-primary' }]);
    },

    showConfirm: function (title, message, confirmLabel, onConfirm) {
      this.openModal(
        title,
        function (body) {
          body.appendChild(createNode('p', '', message));
        },
        [
          { label: 'Cancel', variant: 'btn-secondary' },
          { label: confirmLabel || 'Confirm', variant: 'btn-danger', onClick: onConfirm }
        ]
      );
    }
  };
})(window);

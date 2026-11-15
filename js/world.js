(function (global) {
  'use strict';

  var ASTROBASE = (global.ASTROBASE = global.ASTROBASE || {});

  var COLS = 16;
  var ROWS = 11;
  var TILE_SIZE = 60;

  // 0 = regolith, 1 = ridge/horizon (impassable), 2 = rock boulder (impassable), 3 = crater (impassable), 4 = landing pad
  var BASE_MAP = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 2, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0],
    [0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
    [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ];

  function createInitialInteractables() {
    return [
      { id: 'pod', kind: 'pod', gx: 2, gy: 5, label: 'Landing Pod', collected: false, scanned: false },
      { id: 'crate_1', kind: 'crate', gx: 5, gy: 2, label: 'Supply Crate', amount: 25, collected: false },
      { id: 'crate_2', kind: 'crate', gx: 13, gy: 2, label: 'Supply Crate', amount: 25, collected: false },
      { id: 'crate_3', kind: 'crate', gx: 12, gy: 8, label: 'Supply Crate', amount: 25, collected: false },
      { id: 'crate_4', kind: 'crate', gx: 3, gy: 9, label: 'Supply Crate', amount: 25, collected: false },
      { id: 'sample_1', kind: 'sample', gx: 8, gy: 1, label: 'Basalt Core Sample', amount: 25, collected: false },
      { id: 'sample_2', kind: 'sample', gx: 14, gy: 6, label: 'Iron Dust Sample', amount: 25, collected: false }
    ];
  }

  function createDustParticles() {
    var list = [];
    for (var i = 0; i < 42; i += 1) {
      list.push({
        x: Math.random() * COLS * TILE_SIZE,
        y: TILE_SIZE + Math.random() * (ROWS - 1) * TILE_SIZE,
        len: 6 + Math.random() * 14,
        speed: 1.5 + Math.random() * 3.5,
        alpha: 0.15 + Math.random() * 0.35
      });
    }
    return list;
  }

  var dustParticles = createDustParticles();
  var floatingPopups = [];

  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  ASTROBASE.World = {
    COLS: COLS,
    ROWS: ROWS,
    TILE_SIZE: TILE_SIZE,
    WIDTH: COLS * TILE_SIZE,
    HEIGHT: ROWS * TILE_SIZE,
    createInitialInteractables: createInitialInteractables,
    addPopup: function (gx, gy, text, color) {
      floatingPopups.push({
        x: (gx + 0.5) * TILE_SIZE,
        y: gy * TILE_SIZE + 12,
        text: text,
        color: color || '#fbbf24',
        life: 75
      });
    },
    getTile: function (gx, gy) {
      if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return 1;
      return BASE_MAP[gy][gx];
    },
    isWalkableTile: function (gx, gy) {
      var t = this.getTile(gx, gy);
      return t === 0 || t === 4;
    },
    canBuildAt: function (gx, gy, gameState) {
      if (gx < 0 || gy < 1 || gx >= COLS || gy >= ROWS) return false;
      var t = this.getTile(gx, gy);
      if (t !== 0) return false; // cannot build on rocks, craters, mountains, or landing pad

      // Prevent building directly on top of uncollected crates/samples
      var items = gameState.interactables || [];
      for (var i = 0; i < items.length; i += 1) {
        if (!items[i].collected && items[i].gx === gx && items[i].gy === gy) {
          return false;
        }
      }

      // Prevent overlap with existing buildings
      var buildings = gameState.buildings || [];
      for (var j = 0; j < buildings.length; j += 1) {
        if (buildings[j].gx === gx && buildings[j].gy === gy) {
          return false;
        }
      }
      return true;
    },
    getBuildingAt: function (gx, gy, gameState) {
      var buildings = gameState.buildings || [];
      for (var i = 0; i < buildings.length; i += 1) {
        if (buildings[i].gx === gx && buildings[i].gy === gy) {
          return buildings[i];
        }
      }
      return null;
    },
    getInteractableAt: function (gx, gy, gameState) {
      var items = gameState.interactables || [];
      for (var i = 0; i < items.length; i += 1) {
        var it = items[i];
        if (it.collected) continue;
        if (it.kind === 'pod' && gx >= 2 && gx <= 3 && gy >= 5 && gy <= 6) return it;
        if (it.gx === gx && it.gy === gy) return it;
      }
      return null;
    },
    draw: function (ctx, gameState, tick, uiState) {
      var ts = TILE_SIZE;
      var p = ts / 15;

      // 1. Draw horizon mountain strip (row 0) & Martian ground tiles
      for (var gy = 0; gy < ROWS; gy += 1) {
        for (var gx = 0; gx < COLS; gx += 1) {
          var t = BASE_MAP[gy][gx];
          var x = gx * ts;
          var y = gy * ts;

          if (t === 1) {
            // Martian twilight sky + distant red-plum mountain ridge
            px(ctx, x, y, ts, ts, '#1a1122');
            px(ctx, x, y + p * 6, ts, p * 9, '#5e231c');
            px(ctx, x + ((gx % 3) * p * 2), y + p * 3, p * 9, p * 4, '#7c2d12');
            px(ctx, x, y + p * 11, ts, p * 4, '#9a3412');
            if ((gx * 7) % 5 === 0) {
              px(ctx, x + p * 5, y + p * 2, p, p, '#fef3c7');
            }
            if (gx === 13) {
              // Tiny Phobos moon pixel
              px(ctx, x + p * 8, y + p * 2, p * 2.5, p * 2, '#cbd5e1');
            }
            continue;
          }

          // Base regolith checkerboard subtle warmth
          var alt = (gx + gy) % 2 === 0;
          px(ctx, x, y, ts, ts, alt ? '#b84a27' : '#c0502c');

          // Subtle pixel dust speckles
          if ((gx * 13 + gy * 7) % 4 === 0) {
            px(ctx, x + p * 3, y + p * 4, p * 2, p * 1.5, '#9a3412');
            px(ctx, x + p * 10, y + p * 11, p * 1.5, p * 1.5, '#d97757');
          } else if ((gx * 5 + gy * 11) % 3 === 0) {
            px(ctx, x + p * 8, y + p * 3, p * 2, p, '#d97757');
          }

          if (t === 4) {
            // Landing pad platform
            px(ctx, x + 2, y + 2, ts - 4, ts - 4, '#475569');
            px(ctx, x + p * 1.5, y + p * 1.5, ts - p * 3, ts - p * 3, '#64748b');
            px(ctx, x + p * 2, y + p * 2, p * 2, p * 1, '#f59e0b');
            px(ctx, x + ts - p * 4, y + ts - p * 3, p * 2, p * 1, '#f59e0b');
          } else if (t === 2) {
            // Martian boulder obstacle
            px(ctx, x + p * 2.5, y + p * 4, p * 10, p * 8.5, '#7c2d12');
            px(ctx, x + p * 3.5, y + p * 2.5, p * 7.5, p * 8, '#9a3412');
            px(ctx, x + p * 4.5, y + p * 3.5, p * 4, p * 3, '#c2410c');
          } else if (t === 3) {
            // Crater obstacle
            px(ctx, x + p * 2, y + p * 3, p * 11, p * 9, '#7c2d12');
            px(ctx, x + p * 3.5, y + p * 4.5, p * 8, p * 6, '#5c1d0c');
            px(ctx, x + p * 3, y + p * 3, p * 9, p * 1.5, '#d97757');
          }
        }
      }

      // Subtle build grid lines when placing a building
      if (uiState && uiState.placingType) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = 1;
        for (var c = 0; c <= COLS; c += 1) {
          ctx.beginPath();
          ctx.moveTo(c * ts, ts);
          ctx.lineTo(c * ts, ROWS * ts);
          ctx.stroke();
        }
        for (var r = 1; r <= ROWS; r += 1) {
          ctx.beginPath();
          ctx.moveTo(0, r * ts);
          ctx.lineTo(COLS * ts, r * ts);
          ctx.stroke();
        }
      }

      // 2. Draw interactables (Landing Pod, Supply Crates, Science Rock Samples)
      var items = gameState.interactables || [];
      for (var i = 0; i < items.length; i += 1) {
        var it = items[i];
        if (it.collected) continue;
        var ix = it.gx * ts;
        var iy = it.gy * ts;
        var isSel = uiState && uiState.selectedTarget && uiState.selectedTarget.id === it.id;

        if (it.kind === 'pod') {
          // 2x2 Landing Pod centered on (2,5)-(3,6)
          px(ctx, ix + p * 5, iy + p * 5, ts * 2 - p * 10, ts * 2 - p * 10, '#cbd5e1');
          px(ctx, ix + p * 7, iy + p * 6, ts * 2 - p * 14, ts * 2 - p * 12, '#f8fafc');
          px(ctx, ix + p * 9, iy + p * 11, ts * 2 - p * 18, p * 3, '#ea580c');
          px(ctx, ix + ts - p * 2.5, iy + p * 7, p * 5, p * 3, '#38bdf8');
          // Beacon pulse
          var blink = Math.floor(tick / 18) % 2 === 0;
          px(ctx, ix + ts - p, iy + p * 4, p * 2, p * 2, blink ? '#fbbf24' : '#78350f');
          if (isSel) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3;
            ctx.strokeRect(ix + 2, iy + 2, ts * 2 - 4, ts * 2 - 4);
          }
        } else if (it.kind === 'crate') {
          px(ctx, ix + p * 3.5, iy + p * 4, p * 8, p * 7.5, '#d97706');
          px(ctx, ix + p * 4.5, iy + p * 5, p * 6, p * 5.5, '#f59e0b');
          px(ctx, ix + p * 6.5, iy + p * 4, p * 2, p * 7.5, '#fef3c7');
          if (isSel) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.strokeRect(ix + 3, iy + 3, ts - 6, ts - 6);
          }
        } else if (it.kind === 'sample') {
          px(ctx, ix + p * 4, iy + p * 5, p * 7, p * 6, '#581c87');
          px(ctx, ix + p * 5, iy + p * 4, p * 5, p * 5, '#7e22ce');
          var sparkle = Math.floor(tick / 16) % 2 === 0;
          px(ctx, ix + p * 7, iy + p * 5, p * 1.5, p * 1.5, sparkle ? '#e879f9' : '#a855f7');
          if (isSel) {
            ctx.strokeStyle = '#e879f9';
            ctx.lineWidth = 3;
            ctx.strokeRect(ix + 3, iy + 3, ts - 6, ts - 6);
          }
        }
      }

      // 3. Draw buildings
      var buildings = gameState.buildings || [];
      for (var bIdx = 0; bIdx < buildings.length; bIdx += 1) {
        var b = buildings[bIdx];
        var bSel = uiState && uiState.selectedTarget && uiState.selectedTarget.id === b.id;
        ASTROBASE.Buildings.drawBuilding(ctx, b, ts, tick, bSel);
      }

      // 4. Draw placement preview tile
      if (uiState && uiState.placingType && uiState.hoverTile) {
        var hx = uiState.hoverTile.gx;
        var hy = uiState.hoverTile.gy;
        var valid = this.canBuildAt(hx, hy, gameState);
        ctx.fillStyle = valid ? 'rgba(16, 185, 129, 0.34)' : 'rgba(239, 68, 68, 0.36)';
        ctx.fillRect(hx * ts + 2, hy * ts + 2, ts - 4, ts - 4);
        ctx.strokeStyle = valid ? '#10b981' : '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(hx * ts + 2, hy * ts + 2, ts - 4, ts - 4);
      }

      // 5. Draw Astronaut
      ASTROBASE.Player.draw(ctx, gameState.player, ts, tick);

      // 6. Environmental storm / radiation atmospheric effects
      if (gameState.activeEvent) {
        if (gameState.activeEvent.type === 'dust_storm') {
          ctx.fillStyle = 'rgba(180, 83, 9, 0.24)';
          ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
          for (var d = 0; d < dustParticles.length; d += 1) {
            var dp = dustParticles[d];
            dp.x += dp.speed;
            if (dp.x > this.WIDTH) dp.x = -dp.len;
            ctx.fillStyle = 'rgba(253, 186, 116, ' + dp.alpha + ')';
            ctx.fillRect(Math.round(dp.x), Math.round(dp.y), Math.round(dp.len), 3);
          }
        } else if (gameState.activeEvent.type === 'radiation_warning') {
          var pulse = 0.08 + 0.06 * Math.sin(tick * 0.12);
          ctx.fillStyle = 'rgba(239, 68, 68, ' + pulse.toFixed(3) + ')';
          ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        }
      }

      // 7. Floating feedback popups
      for (var f = floatingPopups.length - 1; f >= 0; f -= 1) {
        var pop = floatingPopups[f];
        pop.y -= 0.45;
        pop.life -= 1;
        ctx.globalAlpha = Math.max(0, Math.min(1, pop.life / 25));
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0b101b';
        ctx.fillText(pop.text, Math.round(pop.x) + 1, Math.round(pop.y) + 1);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, Math.round(pop.x), Math.round(pop.y));
        ctx.globalAlpha = 1;
        if (pop.life <= 0) {
          floatingPopups.splice(f, 1);
        }
      }
    }
  };
})(window);

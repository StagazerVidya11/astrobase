(function (global) {
  'use strict';

  var ASTROBASE = (global.ASTROBASE = global.ASTROBASE || {});

  var SPEED = 220; // px per second in logical world space

  function createInitial() {
    var ts = ASTROBASE.World.TILE_SIZE;
    return {
      x: 4.5 * ts,
      y: 5.5 * ts,
      facing: 'down',
      walking: false,
      sheltered: false
    };
  }

  function canStandAt(wx, wy) {
    var ts = ASTROBASE.World.TILE_SIZE;
    var r = 14;
    var corners = [
      [wx - r, wy - r],
      [wx + r, wy - r],
      [wx - r, wy + r],
      [wx + r, wy + r]
    ];
    for (var i = 0; i < corners.length; i += 1) {
      var gx = Math.floor(corners[i][0] / ts);
      var gy = Math.floor(corners[i][1] / ts);
      if (!ASTROBASE.World.isWalkableTile(gx, gy)) {
        return false;
      }
    }
    return true;
  }

  function update(player, dt, inputVec, gameState) {
    var dx = inputVec.x;
    var dy = inputVec.y;
    var mag = Math.hypot(dx, dy);

    if (mag > 0.05) {
      dx /= mag;
      dy /= mag;
      player.walking = true;

      if (Math.abs(dx) > Math.abs(dy)) {
        player.facing = dx > 0 ? 'right' : 'left';
      } else {
        player.facing = dy > 0 ? 'down' : 'up';
      }

      var stepX = dx * SPEED * dt;
      var stepY = dy * SPEED * dt;

      var nx = Math.max(20, Math.min(ASTROBASE.World.WIDTH - 20, player.x + stepX));
      if (canStandAt(nx, player.y)) {
        player.x = nx;
      }
      var ny = Math.max(ASTROBASE.World.TILE_SIZE + 20, Math.min(ASTROBASE.World.HEIGHT - 20, player.y + stepY));
      if (canStandAt(player.x, ny)) {
        player.y = ny;
      }

      ASTROBASE.Audio.playStep();

      // Leaving habitat tile exits shelter automatically
      var ts = ASTROBASE.World.TILE_SIZE;
      var curB = ASTROBASE.World.getBuildingAt(Math.floor(player.x / ts), Math.floor(player.y / ts), gameState);
      if (!curB || curB.type !== 'habitat') {
        player.sheltered = false;
      }
    } else {
      player.walking = false;
    }
  }

  function getNearbyTarget(player, gameState) {
    var ts = ASTROBASE.World.TILE_SIZE;
    var pgx = Math.floor(player.x / ts);
    var pgy = Math.floor(player.y / ts);

    var best = null;
    var bestDist = 999;

    // Check buildings within 1 tile radius
    var buildings = gameState.buildings || [];
    for (var i = 0; i < buildings.length; i += 1) {
      var b = buildings[i];
      var dist = Math.hypot((b.gx + 0.5) * ts - player.x, (b.gy + 0.5) * ts - player.y);
      if (dist <= ts * 1.15 && dist < bestDist) {
        bestDist = dist;
        best = { category: 'building', ref: b, id: b.id };
      }
    }

    // Check interactables within 1 tile radius
    var items = gameState.interactables || [];
    for (var j = 0; j < items.length; j += 1) {
      var it = items[j];
      if (it.collected) continue;
      var cx = it.kind === 'pod' ? (it.gx + 1) * ts : (it.gx + 0.5) * ts;
      var cy = it.kind === 'pod' ? (it.gy + 1) * ts : (it.gy + 0.5) * ts;
      var reach = it.kind === 'pod' ? ts * 1.7 : ts * 1.1;
      var d = Math.hypot(cx - player.x, cy - player.y);
      if (d <= reach && d < bestDist) {
        bestDist = d;
        best = { category: 'interactable', ref: it, id: it.id };
      }
    }

    // Also include tile under player if exact match
    if (!best) {
      var directB = ASTROBASE.World.getBuildingAt(pgx, pgy, gameState);
      if (directB) {
        best = { category: 'building', ref: directB, id: directB.id };
      }
    }

    return best;
  }

  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function draw(ctx, player, tileSize, tick) {
    var x = Math.round(player.x);
    var y = Math.round(player.y);
    var stride = player.walking ? Math.sin(tick * 0.35) * 3 : 0;

    // Shadow on Martian soil
    ctx.fillStyle = 'rgba(15, 10, 12, 0.45)';
    ctx.fillRect(x - 12, y + 12, 24, 6);

    // Backpack oxygen tank
    px(ctx, x - 11, y - 6, 22, 14, '#94a3b8');

    // Legs with walking animation
    px(ctx, x - 8, y + 7 + (stride > 0 ? -2 : 0), 6, 9, '#e2e8f0');
    px(ctx, x + 2, y + 7 + (stride < 0 ? -2 : 0), 6, 9, '#e2e8f0');
    // Orange boots
    px(ctx, x - 8, y + 13 + (stride > 0 ? -2 : 0), 6, 4, '#ea580c');
    px(ctx, x + 2, y + 13 + (stride < 0 ? -2 : 0), 6, 4, '#ea580c');

    // Suit torso
    px(ctx, x - 9, y - 6, 18, 15, '#f8fafc');
    px(ctx, x - 9, y + 1, 18, 3, '#ea580c');

    // Helmet & visor
    px(ctx, x - 10, y - 20, 20, 16, '#ffffff');
    if (player.facing === 'up') {
      px(ctx, x - 7, y - 18, 14, 10, '#cbd5e1');
    } else if (player.facing === 'left') {
      px(ctx, x - 10, y - 16, 11, 9, '#f59e0b');
      px(ctx, x - 8, y - 15, 4, 3, '#fef3c7');
    } else if (player.facing === 'right') {
      px(ctx, x - 1, y - 16, 11, 9, '#f59e0b');
      px(ctx, x + 3, y - 15, 4, 3, '#fef3c7');
    } else {
      px(ctx, x - 7, y - 16, 14, 9, '#f59e0b');
      px(ctx, x - 5, y - 15, 4, 3, '#fef3c7');
    }

    if (player.sheltered) {
      px(ctx, x - 24, y - 34, 48, 13, '#065f46');
      ctx.fillStyle = '#ecfdf5';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SAFE', x, y - 24);
    }
  }

  ASTROBASE.Player = {
    createInitial: createInitial,
    update: update,
    getNearbyTarget: getNearbyTarget,
    draw: draw
  };
})(window);

/**
 * Pip's Golden Trail - High-Performance 2D Canvas Renderer
 * - Pre-renders tile layers into 16-tile chunk canvases (zero per-tile overhead on static tiles).
 * - Renders 3 parallax background layers per world, original fox/hedgehog heroes, 33 original enemies,
 *   8 bosses with >=0.5s telegraph rings & 3-state health pip bar, 5-scene wordless intro,
 *   enemy parade ending credits, World Map, Helper Hut, and TV-safe high-contrast HUD.
 */
(function (root) {
  'use strict';

  var GT = root.GT || (root.GT = {});
  var TUNE = GT.TUNE;
  var TILE = GT.TILE;
  var WORLDS = GT.WORLDS;
  var POWERUPS = GT.POWERUPS;
  var ENEMY_CATALOG = GT.ENEMY_CATALOG;
  var ENEMY_BY_ID = GT.ENEMY_BY_ID;

  var W = 960;
  var H = 540;
  var chunkCanvases = [];
  var cachedLevelId = '';

  function buildChunkCanvases(level) {
    chunkCanvases = [];
    cachedLevelId = level.id;
    var numChunks = Math.ceil(level.width / TUNE.chunkWidthTiles);
    for (var c = 0; c < numChunks; c++) {
      var off = document.createElement('canvas');
      off.width = TUNE.chunkWidthTiles * TUNE.tileSize;
      off.height = level.height * TUNE.tileSize;
      chunkCanvases.push(off);
      renderSingleChunk(level, c);
    }
  }

  function renderSingleChunk(level, chunkIdx) {
    var off = chunkCanvases[chunkIdx];
    if (!off) return;
    var g = off.getContext('2d');
    var ts = TUNE.tileSize;
    g.clearRect(0, 0, off.width, off.height);

    var wInfo = WORLDS[(level.world || 1) - 1] || WORLDS[0];
    var startTx = chunkIdx * TUNE.chunkWidthTiles;
    var endTx = Math.min(level.width, startTx + TUNE.chunkWidthTiles);

    for (var ty = 0; ty < level.height; ty++) {
      for (var tx = startTx; tx < endTx; tx++) {
        var t = level.grid[ty * level.width + tx];
        if (!t) continue;
        var lx = (tx - startTx) * ts;
        var ly = ty * ts;

        if (t === TILE.GROUND || t === TILE.ICE) {
          g.fillStyle = wInfo.dirtCol;
          g.fillRect(lx, ly, ts, ts);
          g.fillStyle = t === TILE.ICE ? '#bae6fd' : wInfo.groundCol;
          g.fillRect(lx, ly, ts, 9);
          g.strokeStyle = 'rgba(0,0,0,0.22)';
          g.strokeRect(lx + 0.5, ly + 0.5, ts - 1, ts - 1);
        } else if (t === TILE.BRICK || t === TILE.COIN_BRICK) {
          g.fillStyle = t === TILE.COIN_BRICK ? '#d97706' : '#b45309';
          g.fillRect(lx + 1, ly + 1, ts - 2, ts - 2);
          g.fillStyle = '#fde68a';
          g.fillRect(lx + 4, ly + 4, 10, 6);
          g.fillRect(lx + 18, ly + 14, 10, 6);
          g.strokeStyle = '#451a03';
          g.strokeRect(lx + 1, ly + 1, ts - 2, ts - 2);
        } else if (t === TILE.Q_COIN || t === TILE.Q_POWER || t === TILE.Q_STAR || t === TILE.Q_LIFE || t === TILE.GOLD_HELMET_BOX) {
          g.fillStyle = t === TILE.GOLD_HELMET_BOX ? '#f59e0b' : '#eab308';
          g.fillRect(lx + 1, ly + 1, ts - 2, ts - 2);
          g.strokeStyle = '#713f12';
          g.lineWidth = 2;
          g.strokeRect(lx + 2, ly + 2, ts - 4, ts - 4);
          g.fillStyle = '#fffbeb';
          g.font = 'bold 16px sans-serif';
          g.textAlign = 'center';
          g.fillText(t === TILE.GOLD_HELMET_BOX ? '♛' : '✦', lx + 16, ly + 22);
        } else if (t === TILE.SOLID_USED) {
          g.fillStyle = '#64748b';
          g.fillRect(lx + 1, ly + 1, ts - 2, ts - 2);
          g.strokeStyle = '#1e293b';
          g.strokeRect(lx + 1, ly + 1, ts - 2, ts - 2);
        } else if (t === TILE.STONE) {
          g.fillStyle = '#475569';
          g.fillRect(lx, ly, ts, ts);
          g.strokeStyle = '#94a3b8';
          g.strokeRect(lx + 2, ly + 2, ts - 4, ts - 4);
        } else if (t === TILE.SLOPE_L || t === TILE.SLOPE_R) {
          g.fillStyle = wInfo.groundCol;
          g.beginPath();
          if (t === TILE.SLOPE_L) {
            g.moveTo(lx, ly + ts);
            g.lineTo(lx + ts, ly);
            g.lineTo(lx + ts, ly + ts);
          } else {
            g.moveTo(lx, ly);
            g.lineTo(lx + ts, ly + ts);
            g.lineTo(lx, ly + ts);
          }
          g.closePath();
          g.fill();
        } else if (t === TILE.PLATFORM || t === TILE.BRIDGE_COLLAPSE) {
          g.fillStyle = '#d97706';
          g.fillRect(lx, ly, ts, 10);
          g.fillStyle = '#fef3c7';
          g.fillRect(lx + 2, ly + 2, ts - 4, 3);
        } else if (t === TILE.SPIKE) {
          g.fillStyle = '#e2e8f0';
          for (var sp = 0; sp < 4; sp++) {
            g.beginPath();
            g.moveTo(lx + sp * 8, ly + ts);
            g.lineTo(lx + sp * 8 + 4, ly + 8);
            g.lineTo(lx + sp * 8 + 8, ly + ts);
            g.fill();
          }
        } else if (t === TILE.PIPE_TOP_L || t === TILE.PIPE_TOP_R || t === TILE.PIPE_BODY_L || t === TILE.PIPE_BODY_R || t === TILE.TINY_PIPE) {
          g.fillStyle = t === TILE.TINY_PIPE ? '#38bdf8' : '#0d9488';
          g.fillRect(lx + 1, ly, ts - 2, ts);
          g.fillStyle = '#5eead4';
          g.fillRect(lx + 5, ly, 6, ts);
          g.strokeStyle = '#134e4a';
          g.strokeRect(lx + 1, ly, ts - 2, ts);
        } else if (t === TILE.VINE || t === TILE.FENCE) {
          g.strokeStyle = t === TILE.FENCE ? '#94a3b8' : '#22c55e';
          g.lineWidth = 4;
          g.beginPath();
          g.moveTo(lx + 16, ly);
          g.lineTo(lx + 16, ly + ts);
          g.stroke();
          g.fillStyle = t === TILE.FENCE ? '#cbd5e1' : '#4ade80';
          g.fillRect(lx + 6, ly + 8, 20, 6);
          g.fillRect(lx + 6, ly + 22, 20, 6);
        } else if (t === TILE.WATER || t === TILE.LAVA || t === TILE.POISON || t === TILE.QUICKSAND || t === TILE.SAND_GEYSER) {
          g.fillStyle = t === TILE.LAVA ? '#ea580c' : t === TILE.POISON ? '#9333ea' : (t === TILE.QUICKSAND || t === TILE.SAND_GEYSER) ? '#f59e0b' : 'rgba(14, 165, 233, 0.72)';
          g.fillRect(lx, ly + 4, ts, ts - 4);
        } else if (t === TILE.FUNGUS_CAP) {
          g.fillStyle = '#ec4899';
          g.beginPath();
          g.arc(lx + 16, ly + 20, 16, Math.PI, 0);
          g.fill();
          g.fillStyle = '#fbcfe8';
          g.arc(lx + 10, ly + 12, 3, 0, 6.28);
          g.arc(lx + 22, ly + 12, 3, 0, 6.28);
          g.fill();
        } else if (t === TILE.CONVEYOR_L || t === TILE.CONVEYOR_R) {
          g.fillStyle = '#334155';
          g.fillRect(lx, ly, ts, 14);
          g.fillStyle = '#fbbf24';
          g.font = 'bold 12px sans-serif';
          g.textAlign = 'center';
          g.fillText(t === TILE.CONVEYOR_L ? '◀◀' : '▶▶', lx + 16, ly + 11);
        } else if (t === TILE.SPRING_BLOCK) {
          g.fillStyle = '#38bdf8';
          g.fillRect(lx + 2, ly + 2, ts - 4, ts - 4);
          g.strokeStyle = '#0284c7';
          g.strokeRect(lx + 2, ly + 2, ts - 4, ts - 4);
        }
      }
    }
  }

  function drawParallax(ctx, worldId, cameraX, tick) {
    var wInfo = WORLDS[(worldId || 1) - 1] || WORLDS[0];
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, wInfo.skyTop);
    grad.addColorStop(1, wInfo.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Layer 1: Golden Trail sky river ribbons & distant peaks (0.15x camera scroll)
    ctx.fillStyle = 'rgba(255, 210, 63, 0.16)';
    for (var i = 0; i < 6; i++) {
      var sx = ((i * 220 - cameraX * 0.12) % (W + 220) + (W + 220)) % (W + 220) - 110;
      ctx.beginPath();
      ctx.arc(sx, 95 + Math.sin(tick * 0.02 + i) * 14, 38, 0, Math.PI * 2);
      ctx.fill();
    }

    // Layer 2: Distant mountains / dunes / citadel silhouettes (0.25x scroll)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
    for (var m = 0; m < 7; m++) {
      var mx = ((m * 200 - cameraX * 0.25) % 1400 + 1400) % 1400 - 200;
      ctx.beginPath();
      ctx.moveTo(mx, H);
      ctx.lineTo(mx + 110, 220 + (m % 2) * 40);
      ctx.lineTo(mx + 220, H);
      ctx.fill();
    }

    // Layer 3: Midground hills (0.5x scroll)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
    for (var h = 0; h < 8; h++) {
      var hx = ((h * 160 - cameraX * 0.5) % 1280 + 1280) % 1280 - 160;
      ctx.beginPath();
      ctx.arc(hx + 80, H - 30, 90, Math.PI, 0);
      ctx.fill();
    }
  }

  function drawDynamicTiles(ctx, level, state, camX, tick) {
    var ts = TUNE.tileSize;
    var startTx = Math.max(0, Math.floor(camX / ts) - 1);
    var endTx = Math.min(level.width, Math.ceil((camX + W) / ts) + 1);
    var pulse = Math.sin(tick * 0.12) * 2;

    for (var ty = 0; ty < level.height; ty++) {
      for (var tx = startTx; tx < endTx; tx++) {
        var t = level.grid[ty * level.width + tx];
        if (t < TILE.COIN && t !== TILE.SAND_GEYSER) continue;
        var sx = tx * ts - camX;
        var sy = ty * ts;

        if (t === TILE.COIN) {
          ctx.fillStyle = '#ffd23f';
          ctx.beginPath();
          ctx.ellipse(sx + 16, sy + 16, 7, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (t === TILE.BIG_COIN) {
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(sx + 16, sy + 16 + pulse, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        } else if (t === TILE.STAR_MEDAL_1 || t === TILE.STAR_MEDAL_2 || t === TILE.STAR_MEDAL_3) {
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(sx + 16, sy + 16 + pulse, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#713f12';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('★', sx + 16, sy + 22 + pulse);
        } else if (t === TILE.RED_RING || t === TILE.GOLD_GATE) {
          ctx.strokeStyle = t === TILE.RED_RING ? '#ef4444' : '#facc15';
          ctx.lineWidth = 4;
          ctx.strokeRect(sx + 4, sy - 16, 24, 48);
        } else if (t === TILE.RED_COIN) {
          if (state.redRingTimer > 0) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(sx + 16, sy + 16, 9, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (t === TILE.CHECKPOINT) {
          var activeCp = state.checkpoint && state.checkpoint.tx === tx;
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(sx + 14, sy - 16, 4, 48);
          ctx.fillStyle = activeCp ? '#22c55e' : '#f97316';
          ctx.beginPath();
          ctx.moveTo(sx + 18, sy - 16);
          ctx.lineTo(sx + 38, sy - 6);
          ctx.lineTo(sx + 18, sy + 4);
          ctx.fill();
        } else if (t === TILE.FLAGPOLE || t === TILE.SECRET_FLAG) {
          ctx.fillStyle = t === TILE.SECRET_FLAG ? '#f43f5e' : '#eab308';
          ctx.fillRect(sx + 14, sy, 5, ts);
          if (ty === 6) {
            ctx.beginPath();
            ctx.arc(sx + 16.5, sy, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = t === TILE.SECRET_FLAG ? '#ec4899' : '#2ec4b6';
            ctx.beginPath();
            ctx.moveTo(sx + 18, sy + 4);
            ctx.lineTo(sx + 48, sy + 16);
            ctx.lineTo(sx + 18, sy + 28);
            ctx.fill();
          }
        } else if (t === TILE.SAND_GEYSER && ((tick % 180) < 90)) {
          ctx.fillStyle = 'rgba(251, 191, 36, 0.55)';
          ctx.fillRect(sx + 4, sy - 80, 24, 84);
        }
      }
    }
  }

  /**
   * Draw Pip (fox-eared explorer) or Juniper (hedgehog with lantern)
   */
  function drawHero(ctx, p, camX, tick) {
    if (!p.active) return;
    if (p.hurtTimer > 0 && (Math.floor(p.hurtTimer / 3) % 2 === 1)) return;

    var sx = Math.round(p.x - camX);
    var sy = Math.round(p.y);
    var spec = POWERUPS[p.form] || POWERUPS.small;
    var bodyCol = p.starTimer > 0 ? (tick % 6 < 3 ? '#fde047' : '#38bdf8') : (p.index === 1 ? '#eab308' : spec.color);
    var scarfCol = p.index === 1 ? '#ef4444' : spec.scarf;

    ctx.save();
    ctx.translate(sx + p.w * 0.5, sy + p.h * 0.5);
    if (p.bubbled) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.32)';
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.scale(p.dir * p.scaleX, p.scaleY);

    var hw = p.w * 0.5;
    var hh = p.h * 0.5;

    // Fox ears (Pip) or Hedgehog quills (Juniper)
    ctx.fillStyle = bodyCol;
    ctx.beginPath();
    ctx.moveTo(-hw + 2, -hh + 6);
    ctx.lineTo(-hw - 3, -hh - 8);
    ctx.lineTo(-hw + 10, -hh + 2);
    ctx.moveTo(hw - 10, -hh + 2);
    ctx.lineTo(hw + 3, -hh - 8);
    ctx.lineTo(hw - 2, -hh + 6);
    ctx.fill();

    // Body & Explorer Tunic
    ctx.fillStyle = bodyCol;
    ctx.fillRect(-hw + 2, -hh + 4, p.w - 4, p.h - 8);

    // Explorer Cap
    ctx.fillStyle = '#0f766e';
    ctx.fillRect(-hw + 1, -hh + 1, p.w - 2, 6);
    ctx.fillRect(0, -hh + 3, hw + 5, 4);

    // Gold Block Helmet (Coin Rush moment!)
    if (p.goldHelmetTimer > 0) {
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 2;
      ctx.fillRect(-hw - 2, -hh - 8, p.w + 4, 16);
      ctx.strokeRect(-hw - 2, -hh - 8, p.w + 4, 16);
    }

    // Face & Eye
    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(0, -hh + 8, hw - 1, 9);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(hw - 6, -hh + 10, 4, 5);

    // Flowing Scarf (and Leaf Cape tail if Glider Pip)
    ctx.fillStyle = scarfCol;
    ctx.fillRect(-hw, -2, p.w, 5);
    var flutter = Math.sin(tick * 0.25) * 3;
    ctx.fillRect(-hw - 8, -2 + flutter, 9, 5);

    if (p.form === 'leaf' && p.tailSwipeTimer > 0) {
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(hw, -4, 24, 8);
    }

    // Juniper's warm lantern glow
    if (p.index === 1) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(hw + 5, 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Boots
    var stepOff = (p.anim === 'walk' || p.anim === 'run') ? (p.animFrame % 2 === 0 ? 3 : -3) : 0;
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-hw + 2 + stepOff, hh - 5, 8, 5);
    ctx.fillRect(hw - 10 - stepOff, hh - 5, 8, 5);

    ctx.restore();
  }

  function drawEnemiesAndBoss(ctx, state, camX, tick) {
    var enemies = state.enemies || [];
    var goldMode = state.goldEnemyTimer > 0;

    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.active) continue;
      var sx = e.x - camX;
      if (sx + e.w < -32 || sx > W + 32) continue;
      var def = ENEMY_BY_ID[e.type] || ENEMY_CATALOG[0];

      ctx.save();
      ctx.fillStyle = goldMode ? '#facc15' : def.color;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(sx, e.y, e.w, e.h, 6);
      ctx.fill();
      ctx.stroke();

      // Spike-top visual indicator for Spikeback, Cactling, Lava Blob, Chomper Vine, Crusher Block
      if (def.spikeTop) {
        ctx.fillStyle = '#fef08a';
        for (var k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(sx + 3 + k * 7, e.y);
          ctx.lineTo(sx + 6.5 + k * 7, e.y - 6);
          ctx.lineTo(sx + 10 + k * 7, e.y);
          ctx.fill();
        }
      }

      // Eyes
      ctx.fillStyle = '#ffffff';
      var eyeX = e.vx >= 0 ? sx + e.w - 9 : sx + 3;
      ctx.fillRect(eyeX, e.y + 5, 6, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(eyeX + 2, e.y + 7, 3, 3);
      ctx.restore();
    }

    // Draw Boss with >= 0.5s visual telegraph ring & state cues
    var b = state.boss;
    if (b && b.active && !b.defeated) {
      var bx = b.x - camX;
      var by = b.y;
      ctx.save();

      if (b.state === 'telegraph') {
        // High-visibility warning aura & sight line for >= 0.6s before attack
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(bx + b.w * 0.5, by + b.h * 0.5, b.w * 0.72 + Math.sin(tick * 0.4) * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('! TELEGRAPH !', bx + b.w * 0.5, by - 14);
      } else if (b.state === 'vulnerable') {
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▼ STOMP NOW ▼', bx + b.w * 0.5, by - 12);
      }

      ctx.fillStyle = b.invulnTimer > 0 && (tick % 4 < 2) ? '#ffffff' : b.def.color;
      ctx.strokeStyle = b.def.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(bx, by, b.w, b.h, 10);
      ctx.fill();
      ctx.stroke();

      // Boss Crown / Emblem
      ctx.fillStyle = '#facc15';
      ctx.fillRect(bx + 10, by - 8, b.w - 20, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 10, by + 12, 10, 10);
      ctx.fillRect(bx + b.w - 20, by + 12, 10, 10);
      ctx.restore();
    }
  }

  /**
   * Draw World-Matched HUD (keeps >= 85% of viewport clear, 3-state boss pips, reserve item box)
   */
  function drawHud(ctx, state, level, t) {
    var p = state.players[0];
    // Top-left cluster: Reserve Item Socket + Hero Form + Coins + Lives
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(24, 16, 300, 54, 10);
    ctx.fill();
    ctx.stroke();

    // Reserve Item Box (released with - / Select)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(32, 22, 42, 42);
    ctx.strokeStyle = '#fde047';
    ctx.strokeRect(32, 22, 42, 42);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('− RSV', 53, 34);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(p.reserveItem ? p.reserveItem.toUpperCase() : 'NONE', 53, 54);

    // Lives, Coins & Kid Mode Bubbles
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('● ' + state.coins, 86, 40);
    ctx.fillStyle = '#4ade80';
    ctx.fillText('♥ ' + state.lives, 162, 40);
    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 13px sans-serif';
    var formTag = (POWERUPS[p.form] ? POWERUPS[p.form].formName : 'Small Pip');
    if (state.kidMode) formTag += ' · Bubble ×' + state.kidBubbleLives;
    ctx.fillText(formTag, 86, 60);

    // Top-center cluster: Stage Code + 3 Star Medals + Boss Health Bar (if active)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.beginPath();
    ctx.roundRect(350, 16, 260, 54, 10);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText((level.code || '1-1') + ' · ' + (level.name || ''), 480, 36);

    for (var m = 0; m < 3; m++) {
      ctx.fillStyle = state.medals[m] ? '#facc15' : '#475569';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('★', 445 + m * 35, 60);
    }

    // Top-right cluster: Timer & Score / Mode
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.beginPath();
    ctx.roundRect(680, 16, 256, 54, 10);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('TIME ' + Math.max(0, Math.ceil(state.timeLeft || 0)), 920, 40);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(state.coinRushActive ? ('COIN RUSH ' + (state.coinRushIndex + 1) + '/3') : ('TOTAL ' + state.lifetimeCoins), 920, 60);

    // Boss 3-State Health Pip Bar when Boss is active
    if (state.boss && state.boss.active && !state.boss.defeated) {
      var b = state.boss;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      ctx.roundRect(310, 78, 340, 38, 8);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(b.name + (b.maxRooms > 1 ? ' (Room ' + b.room + '/3)' : ''), 324, 102);

      for (var hpIdx = 0; hpIdx < b.maxHp; hpIdx++) {
        var px = 545 + hpIdx * 32;
        ctx.fillStyle = hpIdx < b.hp ? '#ef4444' : '#334155';
        ctx.strokeStyle = '#fde047';
        ctx.fillRect(px, 86, 24, 20);
        ctx.strokeRect(px, 86, 24, 20);
      }
    }

    // Bottom single-line flat control bar (Nintendo places: B bottom, A right, X/Y run, - reserve, + menu)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(0, H - 28, W, 28);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('B (OK): Jump · A: Spin Jump · X/Y: Run & Fire/Throw · −: Reserve Item · +: Menu · LB/RB: Peek', W * 0.5, H - 10);
  }

  function drawStage(ctx, level, state, t, tick) {
    if (!level) return;
    if (cachedLevelId !== level.id || chunkCanvases.length === 0) {
      buildChunkCanvases(level);
    }
    if (level.dirtyChunk !== undefined && level.dirtyChunk >= 0) {
      renderSingleChunk(level, level.dirtyChunk);
      level.dirtyChunk = -1;
    }

    var camX = Math.round(state.cameraX || 0);
    drawParallax(ctx, level.world, camX, tick);

    // Draw only the visible ~2-3 pre-rendered tile chunks
    var chunkW = TUNE.chunkWidthTiles * TUNE.tileSize;
    var firstChunk = Math.max(0, Math.floor(camX / chunkW));
    var lastChunk = Math.min(chunkCanvases.length - 1, Math.ceil((camX + W) / chunkW));
    for (var c = firstChunk; c <= lastChunk; c++) {
      ctx.drawImage(chunkCanvases[c], c * chunkW - camX, 0);
    }

    drawDynamicTiles(ctx, level, state, camX, tick);

    // Guide Leaf in Kid Mode after 5 deaths
    if (state.kidMode && (state.stageDeaths || 0) >= TUNE.guideLeafDeathThreshold) {
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(level.startX + 48 - camX, level.startY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GUIDE LEAF', level.startX + 48 - camX, level.startY - 18);
    }

    // Projectiles (fireballs & gold rings)
    if (state.projectiles) {
      for (var i = 0; i < state.projectiles.length; i++) {
        var pr = state.projectiles[i];
        if (!pr.active) continue;
        ctx.fillStyle = pr.kind === 'gold_ring' ? '#facc15' : '#f97316';
        ctx.beginPath();
        ctx.arc(pr.x - camX + pr.w * 0.5, pr.y + pr.h * 0.5, pr.w * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawEnemiesAndBoss(ctx, state, camX, tick);

    for (var pIdx = state.players.length - 1; pIdx >= 0; pIdx--) {
      drawHero(ctx, state.players[pIdx], camX, tick);
    }

    drawHud(ctx, state, level, t);
  }

  /**
   * 5-Scene Wordless Story Intro (skippable with B / OK)
   */
  function drawIntro(ctx, sceneIdx, tick, t) {
    drawParallax(ctx, sceneIdx + 1, tick * 2, tick);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(140, 70, 680, 360, 18);
    ctx.fill();
    ctx.stroke();

    // Scene visual cut-outs (wordless visual storytelling with clear icons)
    var cx = 480;
    var cy = 230;
    ctx.textAlign = 'center';

    if (sceneIdx === 0) {
      // Scene 1: Golden Trail river of coins lighting the Meadow Kingdom
      for (var c = 0; c < 9; c++) {
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(240 + c * 60, cy - 30 + Math.sin(tick * 0.1 + c) * 18, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      drawHero(ctx, { active: true, x: 380, y: 270, w: 28, h: 36, dir: 1, form: 'big', scaleX: 1.4, scaleY: 1.4, index: 0, hurtTimer: 0, starTimer: 0 }, 0, tick);
      drawHero(ctx, { active: true, x: 540, y: 270, w: 28, h: 36, dir: -1, form: 'big', scaleX: 1.4, scaleY: 1.4, index: 1, hurtTimer: 0, starTimer: 0 }, 0, tick);
    } else if (sceneIdx === 1) {
      // Scene 2: The Rust Baron and his 7 Clockwork Captains vacuum up the Golden Trail
      ctx.fillStyle = '#334155';
      ctx.fillRect(380, 140, 200, 90);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(480, 185, 24, 0, Math.PI * 2);
      ctx.fill();
      for (var k = 0; k < 7; k++) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(230 + k * 78, 280, 36, 36);
      }
    } else if (sceneIdx === 2) {
      // Scene 3: The 7 Captains scatter to 7 Castles while the Baron locks Rust Citadel
      for (var w = 0; w < 8; w++) {
        ctx.fillStyle = WORLDS[w].groundCol;
        ctx.fillRect(210 + w * 70, 220 - (w % 2) * 30, 48, 70);
      }
    } else if (sceneIdx === 3) {
      // Scene 4: Pip & Juniper unroll the Golden Trail map & light the lantern
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(350, 160, 260, 140);
      ctx.strokeStyle = '#d97706';
      ctx.strokeRect(350, 160, 260, 140);
      drawHero(ctx, { active: true, x: 290, y: 240, w: 28, h: 36, dir: 1, form: 'flame', scaleX: 1.4, scaleY: 1.4, index: 0, hurtTimer: 0, starTimer: 0 }, 0, tick);
    } else {
      // Scene 5: Pip & Juniper leap onto the trail!
      drawHero(ctx, { active: true, x: 430, y: 210, w: 28, h: 36, dir: 1, form: 'leaf', scaleX: 1.5, scaleY: 1.5, index: 0, hurtTimer: 0, starTimer: 10 }, 0, tick);
      drawHero(ctx, { active: true, x: 510, y: 220, w: 28, h: 36, dir: 1, form: 'gold', scaleX: 1.5, scaleY: 1.5, index: 1, hurtTimer: 0, starTimer: 10 }, 0, tick);
    }

    // Scene progress dots & Skip prompt
    for (var s = 0; s < 5; s++) {
      ctx.fillStyle = s === sceneIdx ? '#facc15' : '#475569';
      ctx.beginPath();
      ctx.arc(420 + s * 30, 400, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(t.skipPrompt + ' (' + (sceneIdx + 1) + '/5)', 480, 475);
  }

  /**
   * Title Screen with Save Slots, Lifetime Coins, Co-op, Kid Mode & Coin Rush
   */
  function drawTitle(ctx, uiState, saveObj, t, tick) {
    drawParallax(ctx, 1, tick * 1.2, tick);

    // Meadow ground stage on bottom
    ctx.fillStyle = '#38b000';
    ctx.fillRect(0, H - 76, W, 76);
    drawHero(ctx, { active: true, x: 88, y: H - 114, w: 24, h: 38, dir: 1, form: 'big', scaleX: 1.3, scaleY: 1.3, index: 0, hurtTimer: 0, starTimer: 0 }, 0, tick);
    drawHero(ctx, { active: true, x: 148, y: H - 114, w: 24, h: 38, dir: 1, form: 'flame', scaleX: 1.3, scaleY: 1.3, index: 1, hurtTimer: 0, starTimer: 0 }, 0, tick);

    // Crest Banner (Top Negative Space)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(180, 26, 600, 118, 18);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(t.title, 480, 78);
    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(t.subtitle, 480, 108);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(t.lifetimeCoins + ': ' + saveObj.lifetimeCoins + '   ·   Coin Rush Best: ' + saveObj.coinRushBest, 480, 132);

    // Menu Items (large, obvious focus outline from 3m away)
    var slot = saveObj.slots[saveObj.activeSlot] || saveObj.slots[0];
    var clearedCount = Object.keys(slot.cleared || {}).length;
    var items = [
      t.startStory + ' — ' + t.slotLabel + ' ' + (saveObj.activeSlot + 1) + ' (' + clearedCount + '/90)',
      t.slotLabel + ': [ ' + (saveObj.activeSlot + 1) + ' / 3 ] (Left / Right)',
      t.coopMode + ': ' + (uiState.coopCount > 1 ? t.p2Coop : t.p1Only),
      t.kidMode + ': ' + (uiState.kidMode ? t.on : t.off),
      t.coinRush,
      t.watchIntro,
      t.controlsBtn
    ];

    for (var i = 0; i < items.length; i++) {
      var selected = uiState.menuIndex === i;
      var by = 162 + i * 44;
      ctx.fillStyle = selected ? '#0f766e' : 'rgba(15, 23, 42, 0.82)';
      ctx.strokeStyle = selected ? '#fde047' : '#475569';
      ctx.lineWidth = selected ? 4 : 2;
      ctx.beginPath();
      ctx.roundRect(230, by, 500, 38, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = selected ? '#fef08a' : '#f8fafc';
      ctx.font = selected ? 'bold 18px sans-serif' : '17px sans-serif';
      ctx.fillText((selected ? '▶ ' : '') + items[i], 480, by + 25);
    }

    // Special 1,000,000 Lifetime Coin Sovereign Badge
    if (saveObj.lifetimeCoins >= TUNE.millionCoinGoal) {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(t.millionUnlocked, 480, H - 42);
    }

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(0, H - 30, W, 30);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(t.remoteHint + ' · B: Confirm · A: Back · +: Menu', 480, H - 10);
  }

  /**
   * World Map Screen across all 10 Worlds (with locked/unlocked paths, secret exits, Beaver Hut, Warp Cannon, roaming enemy)
   */
  function drawWorldMap(ctx, mapState, saveObj, t, tick) {
    var w = mapState.world || 1;
    var wStages = (GT.STAGES_BY_WORLD && GT.STAGES_BY_WORLD[w]) || [];
    var extras = (GT.WORLD_EXTRAS && GT.WORLD_EXTRAS[w]) || {};
    var slot = saveObj.slots[saveObj.activeSlot] || saveObj.slots[0];

    drawParallax(ctx, w, tick * 0.5, tick);

    // Header Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(30, 18, 900, 62, 12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(t.worlds[w - 1] || ('World ' + w), 52, 56);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('♥ ' + slot.lives + '   ·   ● ' + slot.coins + '   ·   RSV: ' + (slot.reserveItem ? slot.reserveItem.toUpperCase() : 'NONE') + '   ·   ' + t.switchWorld, 908, 55);

    // Draw connecting paths between stage nodes
    ctx.lineWidth = 6;
    for (var i = 0; i < wStages.length - 1; i++) {
      var a = wStages[i];
      var b = wStages[i + 1];
      var ax = a.mapPos.x * 0.78 + 40;
      var ay = a.mapPos.y * 0.85 + 30;
      var bx = b.mapPos.x * 0.78 + 40;
      var by = b.mapPos.y * 0.85 + 30;
      ctx.strokeStyle = b.secretOnly ? '#f43f5e' : (slot.cleared[a.id] ? '#4ade80' : '#64748b');
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    // Draw Helper Hut & Warp Cannon icons
    if (extras.hut) {
      var hx = extras.hut.x * 0.78 + 40;
      var hy = extras.hut.y * 0.85 + 30;
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(hx - 24, hy - 20, 48, 40, 8);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('HUT (X)', hx, hy + 5);
    }
    if (extras.cannon) {
      var cx = extras.cannon.x * 0.78 + 40;
      var cy = extras.cannon.y * 0.85 + 30;
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#bae6fd';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('WARP W' + extras.cannon.toWorld, cx, cy + 4);
    }

    // Draw Stage Nodes
    for (var j = 0; j < wStages.length; j++) {
      var st = wStages[j];
      var nx = st.mapPos.x * 0.78 + 40;
      var ny = st.mapPos.y * 0.85 + 30;
      var cleared = !!slot.cleared[st.id];
      var selected = mapState.stageIndex === j;

      ctx.fillStyle = cleared ? '#22c55e' : (st.role === 'castle' ? '#dc2626' : st.role === 'tower' ? '#0284c7' : st.secretOnly ? '#ec4899' : '#eab308');
      ctx.strokeStyle = selected ? '#ffffff' : '#0f172a';
      ctx.lineWidth = selected ? 5 : 3;
      ctx.beginPath();
      ctx.arc(nx, ny, selected ? 22 : 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(st.code, nx, ny + 4);

      if (selected) {
        drawHero(ctx, { active: true, x: nx - 12, y: ny - 46, w: 22, h: 26, dir: 1, form: 'big', scaleX: 1.1, scaleY: 1.1, index: 0, hurtTimer: 0, starTimer: 0 }, 0, tick);
      }
    }

    // Selected Stage Footer Card
    var curStage = wStages[mapState.stageIndex] || wStages[0];
    if (curStage) {
      var sMedals = slot.medals[curStage.id] || [false, false, false];
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(140, H - 90, 680, 68, 12);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(curStage.code + ' — ' + curStage.name + '   [' + (sMedals[0] ? '★' : '☆') + (sMedals[1] ? '★' : '☆') + (sMedals[2] ? '★' : '☆') + ']', 480, H - 58);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(t.enterStage + '   ·   X/Y: Beaver Helper Hut   ·   −: Use Reserve   ·   +: Menu', 480, H - 32);
    }
  }

  /**
   * Beaver's Helper Hut Mini-Game (Pick 1 of 3 chests for a Reserve Power-up)
   */
  function drawHelperHut(ctx, hutState, t, tick) {
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(110, 60, 740, 410, 18);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(t.helperHutTitle, 480, 120);
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(hutState.revealed ? ('You won: ' + hutState.rewardName + '! Press B / OK') : t.helperHutPrompt, 480, 165);

    var rewards = ['Ember berry', 'Leaf cape', 'Gold petal'];
    for (var i = 0; i < 3; i++) {
      var cx = 240 + i * 200;
      var cy = 260;
      var sel = hutState.choice === i;
      ctx.fillStyle = sel ? '#d97706' : '#92400e';
      ctx.strokeStyle = sel ? '#fef08a' : '#451a03';
      ctx.lineWidth = sel ? 5 : 3;
      ctx.beginPath();
      ctx.roundRect(cx - 65, cy - 45, 130, 95, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(hutState.revealed && sel ? rewards[i] : ('CHEST ' + (i + 1)), cx, cy + 8);
    }
  }

  /**
   * Ending Credits with Every Original Enemy & Boss Parading Past
   */
  function drawEndingParade(ctx, tick, saveObj, t) {
    drawParallax(ctx, 1, tick * 1.5, tick);
    ctx.fillStyle = '#38b000';
    ctx.fillRect(0, H - 90, W, 90);

    var idx = Math.floor(tick / 90) % ENEMY_CATALOG.length;
    var eDef = ENEMY_CATALOG[idx];

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(160, 50, 640, 320, 18);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(t.baronDefeated, 480, 105);

    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Original Cast Parade (' + (idx + 1) + '/' + ENEMY_CATALOG.length + '): ' + eDef.name, 480, 155);

    // Draw parading enemy in center stage
    ctx.fillStyle = eDef.color;
    ctx.strokeStyle = eDef.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(440, 195, 80, 80, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('Art & Audio: 100% Original / CC0 Public Domain (See CREDITS.md)', 480, 315);
    ctx.fillStyle = '#fde047';
    ctx.fillText(t.skipPrompt, 480, 350);
  }

  /**
   * Modal overlay for Pause Menu, Controls, Stage Clear, or Game Over
   */
  function drawModal(ctx, modalState, t) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(210, 80, 540, 380, 16);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(modalState.title || '', 480, 132);

    if (modalState.subtitle) {
      ctx.fillStyle = '#bae6fd';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(modalState.subtitle, 480, 168);
    }

    var opts = modalState.options || [];
    for (var i = 0; i < opts.length; i++) {
      var sel = modalState.index === i;
      var by = 195 + i * 48;
      ctx.fillStyle = sel ? '#0f766e' : '#1e293b';
      ctx.strokeStyle = sel ? '#fde047' : '#475569';
      ctx.lineWidth = sel ? 4 : 2;
      ctx.beginPath();
      ctx.roundRect(270, by, 420, 38, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = sel ? '#fef08a' : '#ffffff';
      ctx.font = sel ? 'bold 18px sans-serif' : '17px sans-serif';
      ctx.fillText((sel ? '▶ ' : '') + opts[i].label, 480, by + 25);
    }
  }

  GT.render = {
    W: W,
    H: H,
    buildChunkCanvases: buildChunkCanvases,
    drawStage: drawStage,
    drawIntro: drawIntro,
    drawTitle: drawTitle,
    drawWorldMap: drawWorldMap,
    drawHelperHut: drawHelperHut,
    drawEndingParade: drawEndingParade,
    drawModal: drawModal
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

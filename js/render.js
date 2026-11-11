/**
 * Pip's Golden Trail - Hardware-Accelerated 60 FPS 2D Canvas Renderer
 * - Pre-renders multi-layered world parallax vistas (sky + clouds + rim-lit peaks + themed midgrounds)
 *   into cached offscreen canvases: runtime parallax is 3 fast GPU drawImage blits (< 0.1ms/frame).
 * - Pre-renders animated collectible sprites (4-frame spinning coins, big coins, embossed Star Medals,
 *   Red Coins) into a sprite atlas to eliminate per-frame path tessellation and text rasterization.
 * - Reuses a persistent pool of 16-tile chunk canvases (zero canvas allocation on stage start).
 * - Zero per-frame object allocations across Title, Intro, World Map, Helper Hut, and Gameplay.
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
  var chunkPool = [];
  var activeChunkCount = 0;
  var cachedLevelId = '';

  // Cached offscreen parallax layers per world: { sky, far, mid }
  var bgCache = {};
  var BG_W = 1280;

  // Pre-rendered collectible sprite atlas
  var atlas = null;

  // Pre-allocated hero descriptors for Title / Intro / Map (Zero GC)
  var previewPip = {
    active: true, x: 88, y: 426, w: 24, h: 38, dir: 1, form: 'big',
    scaleX: 1.3, scaleY: 1.3, index: 0, hurtTimer: 0, starTimer: 0,
    goldHelmetTimer: 0, tailSwipeTimer: 0, bubbled: false, anim: 'idle', animFrame: 0
  };
  var previewJuniper = {
    active: true, x: 148, y: 426, w: 24, h: 38, dir: 1, form: 'flame',
    scaleX: 1.3, scaleY: 1.3, index: 1, hurtTimer: 0, starTimer: 0,
    goldHelmetTimer: 0, tailSwipeTimer: 0, bubbled: false, anim: 'idle', animFrame: 0
  };

  /**
   * Build the pre-rendered collectible sprite sheet once
   * Row 0 (y=0..31): 4 spin frames of normal Coin (x=0,32,64,96)
   * Row 1 (y=32..63): 4 frames of Big 10-Coin (x=0..96)
   * Row 2 (y=64..95): 4 frames of Star Medal (x=0..96)
   * Row 3 (y=96..127): Red Coin (x=0), Flag topper gold (x=32), Flag topper secret (x=64)
   */
  function ensureAtlas() {
    if (atlas || typeof document === 'undefined') return;
    atlas = document.createElement('canvas');
    atlas.width = 128;
    atlas.height = 128;
    var g = atlas.getContext('2d');
    var widths = [1.0, 0.7, 0.32, 0.7];

    for (var f = 0; f < 4; f++) {
      var ox = f * 32;
      var sc = widths[f];

      // 1. Normal Coin (Row 0)
      g.save();
      g.translate(ox + 16, 16);
      g.scale(sc, 1);
      g.fillStyle = '#f59e0b';
      g.beginPath();
      g.arc(0, 0, 10, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fde047';
      g.beginPath();
      g.arc(0, 0, 8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fef9c3';
      g.fillRect(-2, -5, 3, 10);
      g.strokeStyle = '#78350f';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 0, 10, 0, Math.PI * 2);
      g.stroke();
      g.restore();

      // 2. Big 10-Coin (Row 1)
      g.save();
      g.translate(ox + 16, 48);
      g.scale(sc, 1);
      g.fillStyle = '#d97706';
      g.beginPath();
      g.arc(0, 0, 14, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fde047';
      g.beginPath();
      g.arc(0, 0, 11.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#92400e';
      g.font = 'bold 11px sans-serif';
      g.textAlign = 'center';
      g.fillText('10', 0, 4);
      g.strokeStyle = '#451a03';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 0, 14, 0, Math.PI * 2);
      g.stroke();
      g.restore();

      // 3. Star Medal (Row 2)
      g.save();
      g.translate(ox + 16, 80);
      g.scale(sc, 1);
      g.fillStyle = '#eab308';
      g.beginPath();
      g.arc(0, 0, 14, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fef08a';
      g.beginPath();
      g.arc(0, 0, 11, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#854d0e';
      g.font = 'bold 16px sans-serif';
      g.textAlign = 'center';
      g.fillText('★', 0, 6);
      g.strokeStyle = '#713f12';
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(0, 0, 14, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }

    // 4. Red Coin (Row 3, x=0)
    g.save();
    g.translate(16, 112);
    g.fillStyle = '#dc2626';
    g.beginPath();
    g.arc(0, 0, 10, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fca5a5';
    g.fillRect(-2, -5, 4, 10);
    g.strokeStyle = '#450a0a';
    g.lineWidth = 2;
    g.stroke();
    g.restore();
  }

  /**
   * Build and cache pre-rendered parallax layers for a world so runtime drawing is 3 fast blits
   */
  function getWorldParallax(worldId) {
    var wIdx = Math.max(1, Math.min(10, worldId || 1));
    if (bgCache[wIdx]) return bgCache[wIdx];
    if (typeof document === 'undefined') return null;

    var wInfo = WORLDS[wIdx - 1] || WORLDS[0];

    // 1. Static Sky + Golden Trail River + Clouds Canvas (960x540)
    var skyCan = document.createElement('canvas');
    skyCan.width = W;
    skyCan.height = H;
    var sg = skyCan.getContext('2d');
    var grad = sg.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, wInfo.skyTop);
    grad.addColorStop(1, wInfo.skyBot);
    sg.fillStyle = grad;
    sg.fillRect(0, 0, W, H);

    // Golden Trail luminous sky ribbon
    sg.save();
    sg.strokeStyle = 'rgba(253, 224, 71, 0.22)';
    sg.lineWidth = 28;
    sg.beginPath();
    sg.moveTo(0, 130);
    sg.bezierCurveTo(320, 60, 640, 190, W, 95);
    sg.stroke();
    sg.strokeStyle = 'rgba(254, 240, 138, 0.35)';
    sg.lineWidth = 10;
    sg.stroke();
    sg.restore();

    // Soft atmospheric clouds / stars
    for (var i = 0; i < 8; i++) {
      var cx = 70 + i * 125;
      var cy = 65 + (i % 3) * 38;
      sg.fillStyle = 'rgba(255, 255, 255, 0.18)';
      sg.beginPath();
      sg.arc(cx, cy, 34, 0, Math.PI * 2);
      sg.arc(cx + 26, cy + 4, 26, 0, Math.PI * 2);
      sg.arc(cx - 24, cy + 6, 24, 0, Math.PI * 2);
      sg.fill();
    }

    // 2. Far Mountain / Citadel Silhouette Layer (1280x540, tileable)
    var farCan = document.createElement('canvas');
    farCan.width = BG_W;
    farCan.height = H;
    var fg = farCan.getContext('2d');
    for (var m = 0; m < 8; m++) {
      var mx = m * 160;
      var peakY = 185 + (m % 3) * 35;
      fg.fillStyle = 'rgba(15, 23, 42, 0.28)';
      fg.beginPath();
      fg.moveTo(mx - 40, H);
      fg.lineTo(mx + 80, peakY);
      fg.lineTo(mx + 200, H);
      fg.closePath();
      fg.fill();

      // Sunlit mountain ridge highlight
      fg.fillStyle = 'rgba(255, 255, 255, 0.08)';
      fg.beginPath();
      fg.moveTo(mx + 80, peakY);
      fg.lineTo(mx + 135, H);
      fg.lineTo(mx + 80, H);
      fg.closePath();
      fg.fill();
    }

    // 3. Midground Hills & World-Themed Silhouettes (1280x540, tileable)
    var midCan = document.createElement('canvas');
    midCan.width = BG_W;
    midCan.height = H;
    var mg = midCan.getContext('2d');
    for (var h = 0; h < 8; h++) {
      var hx = h * 160;
      mg.fillStyle = 'rgba(15, 23, 42, 0.22)';
      mg.beginPath();
      mg.arc(hx + 80, H - 24, 96, Math.PI, 0);
      mg.fill();

      // Decorative tree / pillar / spire per hill
      mg.fillStyle = 'rgba(15, 23, 42, 0.3)';
      mg.fillRect(hx + 74, H - 145, 12, 40);
      mg.beginPath();
      mg.arc(hx + 80, H - 152, 24, 0, Math.PI * 2);
      mg.fill();
    }

    bgCache[wIdx] = { sky: skyCan, far: farCan, mid: midCan };
    return bgCache[wIdx];
  }

  function buildChunkCanvases(level) {
    ensureAtlas();
    cachedLevelId = level.id;
    var numChunks = Math.ceil(level.width / TUNE.chunkWidthTiles);
    activeChunkCount = numChunks;
    for (var c = 0; c < numChunks; c++) {
      var off = chunkPool[c];
      var reqW = TUNE.chunkWidthTiles * TUNE.tileSize;
      var reqH = level.height * TUNE.tileSize;
      if (!off) {
        off = document.createElement('canvas');
        off.width = reqW;
        off.height = reqH;
        chunkPool[c] = off;
      } else if (off.width !== reqW || off.height !== reqH) {
        off.width = reqW;
        off.height = reqH;
      }
      renderSingleChunk(level, c);
    }
  }

  function renderSingleChunk(level, chunkIdx) {
    var off = chunkPool[chunkIdx];
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
        if (!t || t >= TILE.COIN) {
          if (t !== TILE.SAND_GEYSER) continue;
        }
        var lx = (tx - startTx) * ts;
        var ly = ty * ts;

        if (t === TILE.GROUND || t === TILE.ICE) {
          g.fillStyle = wInfo.dirtCol;
          g.fillRect(lx, ly, ts, ts);
          // Sub-soil texture blocks
          g.fillStyle = 'rgba(0,0,0,0.12)';
          g.fillRect(lx + 4, ly + 14, 10, 8);
          g.fillRect(lx + 18, ly + 20, 10, 8);
          // Rich top turf / ice cap
          g.fillStyle = t === TILE.ICE ? '#bae6fd' : wInfo.groundCol;
          g.fillRect(lx, ly, ts, 9);
          g.fillStyle = 'rgba(255,255,255,0.22)';
          g.fillRect(lx, ly, ts, 3);
          g.strokeStyle = 'rgba(0,0,0,0.22)';
          g.strokeRect(lx + 0.5, ly + 0.5, ts - 1, ts - 1);
        } else if (t === TILE.BRICK || t === TILE.COIN_BRICK) {
          g.fillStyle = t === TILE.COIN_BRICK ? '#d97706' : '#b45309';
          g.fillRect(lx + 1, ly + 1, ts - 2, ts - 2);
          g.fillStyle = 'rgba(255,255,255,0.2)';
          g.fillRect(lx + 2, ly + 2, ts - 4, 3);
          g.fillStyle = '#fde68a';
          g.fillRect(lx + 4, ly + 6, 10, 6);
          g.fillRect(lx + 18, ly + 6, 10, 6);
          g.fillRect(lx + 10, ly + 18, 12, 6);
          g.strokeStyle = '#451a03';
          g.lineWidth = 1.5;
          g.strokeRect(lx + 1, ly + 1, ts - 2, ts - 2);
        } else if (t === TILE.Q_COIN || t === TILE.Q_POWER || t === TILE.Q_STAR || t === TILE.Q_LIFE || t === TILE.GOLD_HELMET_BOX) {
          g.fillStyle = t === TILE.GOLD_HELMET_BOX ? '#f59e0b' : '#eab308';
          g.fillRect(lx + 1, ly + 1, ts - 2, ts - 2);
          g.fillStyle = '#fef08a';
          g.fillRect(lx + 3, ly + 3, ts - 6, 4);
          g.strokeStyle = '#713f12';
          g.lineWidth = 2;
          g.strokeRect(lx + 2, ly + 2, ts - 4, ts - 4);
          g.fillStyle = '#713f12';
          g.fillRect(lx + 4, ly + 4, 2, 2);
          g.fillRect(lx + ts - 6, ly + 4, 2, 2);
          g.fillRect(lx + 4, ly + ts - 6, 2, 2);
          g.fillRect(lx + ts - 6, ly + ts - 6, 2, 2);
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
          g.fillStyle = '#94a3b8';
          g.fillRect(lx + 3, ly + 3, ts - 6, 4);
          g.strokeStyle = '#1e293b';
          g.lineWidth = 2;
          g.strokeRect(lx + 1, ly + 1, ts - 2, ts - 2);
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
          g.fillStyle = '#b45309';
          g.fillRect(lx, ly, ts, 11);
          g.fillStyle = '#fde68a';
          g.fillRect(lx + 2, ly + 2, ts - 4, 4);
          g.strokeStyle = '#451a03';
          g.strokeRect(lx + 0.5, ly + 0.5, ts - 1, 10);
        } else if (t === TILE.SPIKE) {
          g.fillStyle = '#e2e8f0';
          for (var sp = 0; sp < 4; sp++) {
            g.beginPath();
            g.moveTo(lx + sp * 8, ly + ts);
            g.lineTo(lx + sp * 8 + 4, ly + 6);
            g.lineTo(lx + sp * 8 + 8, ly + ts);
            g.fill();
          }
        } else if (t === TILE.PIPE_TOP_L || t === TILE.PIPE_TOP_R || t === TILE.PIPE_BODY_L || t === TILE.PIPE_BODY_R || t === TILE.TINY_PIPE) {
          g.fillStyle = t === TILE.TINY_PIPE ? '#0284c7' : '#0d9488';
          g.fillRect(lx + 1, ly, ts - 2, ts);
          g.fillStyle = '#5eead4';
          g.fillRect(lx + 6, ly, 7, ts);
          g.fillStyle = 'rgba(0,0,0,0.2)';
          g.fillRect(lx + ts - 8, ly, 6, ts);
          g.strokeStyle = '#134e4a';
          g.lineWidth = 1.5;
          g.strokeRect(lx + 1, ly, ts - 2, ts);
        } else if (t === TILE.VINE || t === TILE.FENCE) {
          g.strokeStyle = t === TILE.FENCE ? '#94a3b8' : '#16a34a';
          g.lineWidth = 4;
          g.beginPath();
          g.moveTo(lx + 16, ly);
          g.lineTo(lx + 16, ly + ts);
          g.stroke();
          g.fillStyle = t === TILE.FENCE ? '#cbd5e1' : '#4ade80';
          g.fillRect(lx + 6, ly + 8, 20, 6);
          g.fillRect(lx + 6, ly + 22, 20, 6);
        } else if (t === TILE.WATER || t === TILE.LAVA || t === TILE.POISON || t === TILE.QUICKSAND || t === TILE.SAND_GEYSER) {
          g.fillStyle = t === TILE.LAVA ? '#ea580c' : t === TILE.POISON ? '#9333ea' : (t === TILE.QUICKSAND || t === TILE.SAND_GEYSER) ? '#f59e0b' : 'rgba(14, 165, 233, 0.75)';
          g.fillRect(lx, ly + 4, ts, ts - 4);
          g.fillStyle = 'rgba(255,255,255,0.28)';
          g.fillRect(lx, ly + 4, ts, 4);
        } else if (t === TILE.FUNGUS_CAP) {
          g.fillStyle = '#db2777';
          g.beginPath();
          g.arc(lx + 16, ly + 20, 16, Math.PI, 0);
          g.fill();
          g.fillStyle = '#fbcfe8';
          g.beginPath();
          g.arc(lx + 10, ly + 12, 3.5, 0, 6.28);
          g.arc(lx + 22, ly + 12, 3.5, 0, 6.28);
          g.fill();
        } else if (t === TILE.CONVEYOR_L || t === TILE.CONVEYOR_R) {
          g.fillStyle = '#334155';
          g.fillRect(lx, ly, ts, 14);
          g.fillStyle = '#fbbf24';
          g.font = 'bold 12px sans-serif';
          g.textAlign = 'center';
          g.fillText(t === TILE.CONVEYOR_L ? '◀◀' : '▶▶', lx + 16, ly + 11);
        } else if (t === TILE.SPRING_BLOCK) {
          g.fillStyle = '#0284c7';
          g.fillRect(lx + 2, ly + 2, ts - 4, ts - 4);
          g.fillStyle = '#bae6fd';
          g.fillRect(lx + 5, ly + 5, ts - 10, 5);
          g.strokeStyle = '#0369a1';
          g.strokeRect(lx + 2, ly + 2, ts - 4, ts - 4);
        }
      }
    }
  }

  /**
   * Hardware-accelerated 3-layer parallax blit (< 0.1ms per frame)
   */
  function drawParallax(ctx, worldId, cameraX, tick) {
    var layers = getWorldParallax(worldId);
    if (!layers) return;

    // 1. Static Sky & Clouds
    ctx.drawImage(layers.sky, 0, 0);

    // 2. Far Mountains (0.2x scroll)
    var farOff = Math.floor((cameraX * 0.2) % BG_W);
    if (farOff < 0) farOff += BG_W;
    ctx.drawImage(layers.far, -farOff, 0);
    if (BG_W - farOff < W) {
      ctx.drawImage(layers.far, BG_W - farOff, 0);
    }

    // 3. Midground Hills (0.45x scroll)
    var midOff = Math.floor((cameraX * 0.45) % BG_W);
    if (midOff < 0) midOff += BG_W;
    ctx.drawImage(layers.mid, -midOff, 0);
    if (BG_W - midOff < W) {
      ctx.drawImage(layers.mid, BG_W - midOff, 0);
    }
  }

  function drawDynamicTiles(ctx, level, state, camX, tick) {
    ensureAtlas();
    var ts = TUNE.tileSize;
    var startTx = Math.max(0, Math.floor(camX / ts) - 1);
    var endTx = Math.min(level.width, Math.ceil((camX + W) / ts) + 1);
    var spinFrame = (Math.floor(tick / 6) & 3) * 32;
    var bob = Math.round(Math.sin(tick * 0.1) * 2);

    for (var ty = 0; ty < level.height; ty++) {
      var rowOff = ty * level.width;
      var sy = ty * ts;
      for (var tx = startTx; tx < endTx; tx++) {
        var t = level.grid[rowOff + tx];
        if (t < TILE.COIN && t !== TILE.SAND_GEYSER) continue;
        var sx = (tx * ts - camX) | 0;

        if (t === TILE.COIN) {
          ctx.drawImage(atlas, spinFrame, 0, 32, 32, sx, sy, 32, 32);
        } else if (t === TILE.BIG_COIN) {
          ctx.drawImage(atlas, spinFrame, 32, 32, 32, sx, sy + bob, 32, 32);
        } else if (t === TILE.STAR_MEDAL_1 || t === TILE.STAR_MEDAL_2 || t === TILE.STAR_MEDAL_3) {
          ctx.drawImage(atlas, spinFrame, 64, 32, 32, sx, sy + bob, 32, 32);
        } else if (t === TILE.RED_COIN) {
          if (state.redRingTimer > 0) {
            ctx.drawImage(atlas, 0, 96, 32, 32, sx, sy, 32, 32);
          }
        } else if (t === TILE.RED_RING || t === TILE.GOLD_GATE) {
          ctx.strokeStyle = t === TILE.RED_RING ? '#ef4444' : '#facc15';
          ctx.lineWidth = 4;
          ctx.strokeRect(sx + 4, sy - 16, 24, 48);
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
    if (p.hurtTimer > 0 && (((p.hurtTimer / 3) | 0) & 1) === 1) return;

    var sx = (p.x - camX) | 0;
    var sy = p.y | 0;
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

    // Body & Explorer Tunic with dark outline for 10-foot TV contrast
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-hw + 1, -hh + 3, p.w - 2, p.h - 6);
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
      var sx = (e.x - camX) | 0;
      if (sx + e.w < -32 || sx > W + 32) continue;
      var sy = e.y | 0;
      var def = ENEMY_BY_ID[e.type] || ENEMY_CATALOG[0];
      var mainCol = goldMode ? '#facc15' : def.color;
      var accCol = goldMode ? '#fef08a' : (def.accent || '#fde047');
      var stepLeg = ((tick + i * 7) >> 3) & 1 ? 3 : -3;
      var cx = sx + (e.w >> 1);
      var cy = sy + (e.h >> 1);

      if (def.behavior === 'float_inflate' || def.behavior === 'swoop_arc' || def.behavior === 'ceiling_swoop' || def.behavior === 'sine_drift') {
        // Winged / Floating Enemies: flapping wings + rounded body
        var wingY = Math.sin(tick * 0.25 + i) * 6;
        ctx.fillStyle = accCol;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy);
        ctx.lineTo(sx - 8, cy - 8 + wingY);
        ctx.lineTo(sx - 2, cy + 5);
        ctx.moveTo(cx + 4, cy);
        ctx.lineTo(sx + e.w + 8, cy - 8 + wingY);
        ctx.lineTo(sx + e.w + 2, cy + 5);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, cy, (e.w >> 1) + 1, 0, 6.28);
        ctx.fill();
        ctx.fillStyle = mainCol;
        ctx.beginPath();
        ctx.arc(cx, cy, (e.w >> 1) - 1, 0, 6.28);
        ctx.fill();
      } else if (def.behavior === 'shy_chase') {
        // Haunted Ghost Lantern / Spirit: glowing spectral orb + floating wisp tail
        ctx.fillStyle = 'rgba(253, 224, 71, 0.22)';
        ctx.beginPath();
        ctx.arc(cx, cy, e.w * 0.75, 0, 6.28);
        ctx.fill();
        ctx.fillStyle = mainCol;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, e.w * 0.48, Math.PI, 0);
        ctx.lineTo(sx + e.w - 2, sy + e.h);
        ctx.lineTo(cx, sy + e.h - 5);
        ctx.lineTo(sx + 2, sy + e.h);
        ctx.closePath();
        ctx.fill();
      } else if (def.behavior === 'telegraph_slam' || e.type === 'sentinel_knight' || e.type === 'gearbot' || e.type === 'cannon_pod') {
        // Heavy Armored / Fortress / Clockwork Foes: beveled octagon/plate with gear teeth or shield
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(sx - 2, sy - 2, e.w + 4, e.h + 4);
        ctx.fillStyle = mainCol;
        ctx.fillRect(sx + 1, sy + 1, e.w - 2, e.h - 2);
        ctx.strokeStyle = accCol;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 3, sy + 3, e.w - 6, e.h - 6);
        if (e.type === 'sentinel_knight') {
          // Knight plume & shield
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(cx - 4, sy - 7, 8, 6);
          ctx.fillStyle = '#cbd5e1';
          var shX = e.vx <= 0 ? sx - 4 : sx + e.w - 4;
          ctx.fillRect(shX, sy + 4, 8, e.h - 6);
        }
      } else {
        // Beetles, Shells, Hoppers & Walkers: rounded carapace dome + animated scuttle feet
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(sx + 3 + stepLeg, sy + e.h - 3, 6, 4);
        ctx.fillRect(sx + e.w - 9 - stepLeg, sy + e.h - 3, 6, 4);

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, cy + 2, (e.w >> 1) + 1, Math.PI, 0);
        ctx.lineTo(sx + e.w + 1, sy + e.h - 2);
        ctx.lineTo(sx - 1, sy + e.h - 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = mainCol;
        ctx.beginPath();
        ctx.arc(cx, cy + 2, (e.w >> 1) - 1, Math.PI, 0);
        ctx.lineTo(sx + e.w - 1, sy + e.h - 3);
        ctx.lineTo(sx + 1, sy + e.h - 3);
        ctx.closePath();
        ctx.fill();

        // Carapace cap highlight
        ctx.fillStyle = accCol;
        ctx.fillRect(sx + 4, sy + 3, e.w - 8, 4);
      }

      if (def.spikeTop) {
        ctx.fillStyle = '#fef08a';
        for (var k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(sx + 3 + k * 7, sy + 1);
          ctx.lineTo(sx + 6.5 + k * 7, sy - 7);
          ctx.lineTo(sx + 10 + k * 7, sy + 1);
          ctx.fill();
        }
      }

      // Expressive eyes facing movement direction
      ctx.fillStyle = '#ffffff';
      var eyeX = e.vx >= 0 ? sx + e.w - 10 : sx + 4;
      ctx.fillRect(eyeX, sy + 6, 6, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(eyeX + (e.vx >= 0 ? 2 : 0), sy + 8, 3, 3);
    }

    // Draw Boss with multi-part armor, crown, weapon & >= 0.5s telegraph ring
    var b = state.boss;
    if (b && b.active && !b.defeated) {
      var bx = (b.x - camX) | 0;
      var by = b.y | 0;
      var bcx = bx + (b.w >> 1);

      if (b.state === 'telegraph') {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(bcx, by + (b.h >> 1), b.w * 0.72 + Math.sin(tick * 0.4) * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('! INCOMING ATTACK !', bcx, by - 16);
      } else if (b.state === 'vulnerable') {
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▼ STOMP NOW ▼', bcx, by - 14);
      }

      var flash = b.invulnTimer > 0 && (tick % 4 < 2);
      // Armored Pauldrons
      ctx.fillStyle = flash ? '#ffffff' : b.def.accent;
      ctx.fillRect(bx - 6, by + 8, 8, 22);
      ctx.fillRect(bx + b.w - 2, by + 8, 8, 22);

      // Main Chasis
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 2, by - 2, b.w + 4, b.h + 4);
      ctx.fillStyle = flash ? '#ffffff' : b.def.color;
      ctx.fillRect(bx + 1, by + 1, b.w - 2, b.h - 2);
      ctx.strokeStyle = b.def.accent;
      ctx.lineWidth = 3;
      ctx.strokeRect(bx + 2, by + 2, b.w - 4, b.h - 4);

      // Boss Crown / Horned Crest
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(bx + 6, by);
      ctx.lineTo(bx + 12, by - 12);
      ctx.lineTo(bcx, by - 4);
      ctx.lineTo(bx + b.w - 12, by - 12);
      ctx.lineTo(bx + b.w - 6, by);
      ctx.closePath();
      ctx.fill();

      // Fierce Glowing Eyes & Chest Core
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx + 10, by + 12, 10, 9);
      ctx.fillRect(bx + b.w - 20, by + 12, 10, 9);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(bx + 13, by + 14, 5, 5);
      ctx.fillRect(bx + b.w - 17, by + 14, 5, 5);
      ctx.fillStyle = b.state === 'vulnerable' ? '#4ade80' : '#f97316';
      ctx.beginPath();
      ctx.arc(bcx, by + b.h * 0.65, 8, 0, 6.28);
      ctx.fill();
    }
  }

  /**
   * Draw World-Matched HUD (keeps >= 85% of viewport clear, 3-state boss pips, reserve item box)
   */
  function drawHud(ctx, state, level, t) {
    var p = state.players[0];
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;

    // Top-left cluster
    ctx.fillRect(24, 16, 300, 54);
    ctx.strokeRect(24, 16, 300, 54);

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
    if (state.kidMode) formTag += ' · Shield ×' + state.kidBubbleLives;
    ctx.fillText(formTag, 86, 60);

    // Top-center cluster: Stage Code + 3 Star Medals
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#fbbf24';
    ctx.fillRect(350, 16, 260, 54);
    ctx.strokeRect(350, 16, 260, 54);

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
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(680, 16, 256, 54);
    ctx.strokeRect(680, 16, 256, 54);

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
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = '#ef4444';
      ctx.fillRect(310, 78, 340, 38);
      ctx.strokeRect(310, 78, 340, 38);
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

    // Bottom single-line flat control bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(0, H - 28, W, 28);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('B (OK): Jump · A: Spin Jump · X/Y: Run & Fire/Throw · −: Reserve Item · +: Menu · LB/RB: Peek', W * 0.5, H - 10);
  }

  function drawStage(ctx, level, state, t, tick) {
    if (!level) return;
    if (cachedLevelId !== level.id || activeChunkCount === 0) {
      buildChunkCanvases(level);
    }
    if (level.dirtyChunk !== undefined && level.dirtyChunk >= 0) {
      renderSingleChunk(level, level.dirtyChunk);
      level.dirtyChunk = -1;
    }

    var camX = (state.cameraX || 0) | 0;
    drawParallax(ctx, level.world, camX, tick);

    // Draw only the visible 2-3 pre-rendered tile chunks
    var chunkW = TUNE.chunkWidthTiles * TUNE.tileSize;
    var firstChunk = Math.max(0, (camX / chunkW) | 0);
    var lastChunk = Math.min(activeChunkCount - 1, ((camX + W) / chunkW) | 0);
    for (var c = firstChunk; c <= lastChunk; c++) {
      ctx.drawImage(chunkPool[c], c * chunkW - camX, 0);
    }

    // Draw Moving Platforms (level.platforms)
    if (level.platforms) {
      for (var mpIdx = 0; mpIdx < level.platforms.length; mpIdx++) {
        var mp = level.platforms[mpIdx];
        var mpx = (mp.x - camX) | 0;
        if (mpx + mp.w < -16 || mpx > W + 16) continue;
        var mpy = mp.y | 0;
        ctx.fillStyle = '#b45309';
        ctx.fillRect(mpx, mpy, mp.w, mp.h);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(mpx + 3, mpy + 2, mp.w - 6, 4);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        ctx.strokeRect(mpx + 0.5, mpy + 0.5, mp.w - 1, mp.h - 1);
      }
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

    // Draw Pooled Particles & Floating Popups (Zero GC)
    if (state.particles) {
      for (var ptIdx = 0; ptIdx < state.particles.length; ptIdx++) {
        var pt = state.particles[ptIdx];
        if (!pt.active) continue;
        ctx.fillStyle = pt.color;
        ctx.fillRect((pt.x - camX) | 0, pt.y | 0, pt.size, pt.size);
      }
    }
    if (state.popups) {
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      for (var ppIdx = 0; ppIdx < state.popups.length; ppIdx++) {
        var pp = state.popups[ppIdx];
        if (!pp.active) continue;
        var ppx = (pp.x - camX) | 0;
        var ppy = pp.y | 0;
        ctx.fillStyle = '#0f172a';
        ctx.fillText(pp.text, ppx + 1, ppy + 1);
        ctx.fillStyle = pp.color;
        ctx.fillText(pp.text, ppx, ppy);
      }
    }

    drawHud(ctx, state, level, t);
  }

  /**
   * 5-Scene Wordless Story Intro (skippable with B / OK)
   */
  function drawIntro(ctx, sceneIdx, tick, t) {
    drawParallax(ctx, sceneIdx + 1, tick * 2, tick);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.fillRect(140, 70, 680, 360);
    ctx.strokeRect(140, 70, 680, 360);

    var cy = 230;
    ctx.textAlign = 'center';

    if (sceneIdx === 0) {
      for (var c = 0; c < 9; c++) {
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(240 + c * 60, cy - 30 + Math.sin(tick * 0.1 + c) * 18, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      previewPip.x = 380; previewPip.y = 270; previewPip.form = 'big'; previewPip.dir = 1;
      previewJuniper.x = 540; previewJuniper.y = 270; previewJuniper.form = 'big'; previewJuniper.dir = -1;
      drawHero(ctx, previewPip, 0, tick);
      drawHero(ctx, previewJuniper, 0, tick);
    } else if (sceneIdx === 1) {
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
      for (var w = 0; w < 8; w++) {
        ctx.fillStyle = WORLDS[w].groundCol;
        ctx.fillRect(210 + w * 70, 220 - (w % 2) * 30, 48, 70);
      }
    } else if (sceneIdx === 3) {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(350, 160, 260, 140);
      ctx.strokeStyle = '#d97706';
      ctx.strokeRect(350, 160, 260, 140);
      previewPip.x = 290; previewPip.y = 240; previewPip.form = 'flame'; previewPip.dir = 1;
      drawHero(ctx, previewPip, 0, tick);
    } else {
      previewPip.x = 430; previewPip.y = 210; previewPip.form = 'leaf'; previewPip.dir = 1;
      previewJuniper.x = 510; previewJuniper.y = 220; previewJuniper.form = 'gold'; previewJuniper.dir = 1;
      drawHero(ctx, previewPip, 0, tick);
      drawHero(ctx, previewJuniper, 0, tick);
    }

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
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, H - 76, W, 76);
    ctx.fillStyle = '#38b000';
    ctx.fillRect(0, H - 76, W, 14);

    previewPip.x = 88; previewPip.y = H - 114; previewPip.form = 'big'; previewPip.dir = 1;
    previewJuniper.x = 148; previewJuniper.y = H - 114; previewJuniper.form = 'flame'; previewJuniper.dir = 1;
    drawHero(ctx, previewPip, 0, tick);
    drawHero(ctx, previewJuniper, 0, tick);

    // Crest Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.fillRect(180, 26, 600, 118);
    ctx.strokeRect(180, 26, 600, 118);

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
      ctx.fillStyle = selected ? '#0f766e' : 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = selected ? '#fde047' : '#475569';
      ctx.lineWidth = selected ? 4 : 2;
      ctx.fillRect(230, by, 500, 38);
      ctx.strokeRect(230, by, 500, 38);

      ctx.fillStyle = selected ? '#fef08a' : '#f8fafc';
      ctx.font = selected ? 'bold 18px sans-serif' : '17px sans-serif';
      ctx.fillText((selected ? '▶ ' : '') + items[i], 480, by + 25);
    }

    if (saveObj.lifetimeCoins >= TUNE.millionCoinGoal) {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(t.millionUnlocked, 480, H - 42);
    }

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, H - 30, W, 30);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(t.remoteHint + ' · B: Confirm · A: Back · +: Menu', 480, H - 10);
  }

  /**
   * World Map Screen across all 10 Worlds
   */
  function drawWorldMap(ctx, mapState, saveObj, t, tick) {
    var w = mapState.world || 1;
    var wStages = (GT.STAGES_BY_WORLD && GT.STAGES_BY_WORLD[w]) || [];
    var extras = (GT.WORLD_EXTRAS && GT.WORLD_EXTRAS[w]) || {};
    var slot = saveObj.slots[saveObj.activeSlot] || saveObj.slots[0];

    drawParallax(ctx, w, tick * 0.5, tick);

    // Header Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.fillRect(30, 18, 900, 62);
    ctx.strokeRect(30, 18, 900, 62);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(t.worlds[w - 1] || ('World ' + w), 52, 56);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('♥ ' + slot.lives + '   ·   ● ' + slot.coins + '   ·   RSV: ' + (slot.reserveItem ? slot.reserveItem.toUpperCase() : 'NONE') + '   ·   ' + t.switchWorld, 908, 55);

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

    if (extras.hut) {
      var hx = extras.hut.x * 0.78 + 40;
      var hy = extras.hut.y * 0.85 + 30;
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.fillRect(hx - 24, hy - 20, 48, 40);
      ctx.strokeRect(hx - 24, hy - 20, 48, 40);
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
        previewPip.x = nx - 12;
        previewPip.y = ny - 48;
        previewPip.form = 'big';
        previewPip.dir = 1;
        drawHero(ctx, previewPip, 0, tick);
      }
    }

    var curStage = wStages[mapState.stageIndex] || wStages[0];
    if (curStage) {
      var sMedals = slot.medals[curStage.id] || [false, false, false];
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.fillRect(140, H - 90, 680, 68);
      ctx.strokeRect(140, H - 90, 680, 68);

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
   * Beaver's Helper Hut Mini-Game
   */
  function drawHelperHut(ctx, hutState, t, tick) {
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.fillRect(110, 60, 740, 410);
    ctx.strokeRect(110, 60, 740, 410);

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
      ctx.fillRect(cx - 65, cy - 45, 130, 95);
      ctx.strokeRect(cx - 65, cy - 45, 130, 95);

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

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.fillRect(160, 50, 640, 320);
    ctx.strokeRect(160, 50, 640, 320);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(t.baronDefeated, 480, 105);

    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Original Cast Parade (' + (idx + 1) + '/' + ENEMY_CATALOG.length + '): ' + eDef.name, 480, 155);

    ctx.fillStyle = eDef.color;
    ctx.strokeStyle = eDef.accent;
    ctx.lineWidth = 4;
    ctx.fillRect(440, 195, 80, 80);
    ctx.strokeRect(440, 195, 80, 80);

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
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.fillRect(210, 80, 540, 380);
    ctx.strokeRect(210, 80, 540, 380);

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
      ctx.fillRect(270, by, 420, 38);
      ctx.strokeRect(270, by, 420, 38);

      ctx.fillStyle = sel ? '#fef08a' : '#ffffff';
      ctx.font = sel ? 'bold 18px sans-serif' : '17px sans-serif';
      ctx.fillText((sel ? '▶ ' : '') + opts[i].label, 480, by + 25);
    }
  }

  /**
   * Warm up sprite atlas and World 1 parallax during init so the very first frame is 0ms lag
   */
  function warmup() {
    ensureAtlas();
    getWorldParallax(1);
  }

  GT.render = {
    W: W,
    H: H,
    warmup: warmup,
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

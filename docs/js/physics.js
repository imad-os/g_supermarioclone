/**
 * Pip's Golden Trail - Core 60 Hz Physics, Collision, Power-ups, Bosses & Save Logic
 * Frame-rate independent fixed 60 Hz step, zero-allocation update loops, swept sub-stepped
 * AABB + Slope collision (no tunneling at max speed, corner correction on block edges).
 */
(function (root) {
  'use strict';

  var tuneMod = (typeof root !== 'undefined' && root.GT && root.GT.TUNE)
    ? root.GT
    : (typeof require !== 'undefined' ? require('./tune.js') : {});
  var enemyMod = (typeof root !== 'undefined' && root.GT && root.GT.ENEMY_BY_ID)
    ? root.GT
    : (typeof require !== 'undefined' ? require('./enemies.js') : {});

  var TUNE = tuneMod.TUNE;
  var TILE = tuneMod.TILE;
  var POWERUPS = tuneMod.POWERUPS;
  var ENEMY_BY_ID = enemyMod.ENEMY_BY_ID;
  var BOSS_CATALOG = enemyMod.BOSS_CATALOG;

  function isSolidTile(t, isHeavyPound, isBigPound) {
    if (t === TILE.GROUND || t === TILE.Q_COIN || t === TILE.Q_POWER ||
        t === TILE.Q_STAR || t === TILE.Q_LIFE || t === TILE.COIN_BRICK ||
        t === TILE.SOLID_USED || t === TILE.PIPE_TOP_L || t === TILE.PIPE_TOP_R ||
        t === TILE.PIPE_BODY_L || t === TILE.PIPE_BODY_R || t === TILE.ICE ||
        t === TILE.CONVEYOR_L || t === TILE.CONVEYOR_R || t === TILE.FUNGUS_CAP ||
        t === TILE.SPRING_BLOCK || t === TILE.BRIDGE_COLLAPSE || t === TILE.GOLD_HELMET_BOX) {
      return true;
    }
    if (t === TILE.BRICK) {
      return !isBigPound;
    }
    if (t === TILE.STONE) {
      return !isHeavyPound;
    }
    return false;
  }

  function isOneWayTile(t) {
    return t === TILE.PLATFORM;
  }

  function isSlopeTile(t) {
    return t === TILE.SLOPE_L || t === TILE.SLOPE_R;
  }

  function isClimbTile(t) {
    return t === TILE.VINE || t === TILE.FENCE;
  }

  function getTileAt(level, tx, ty) {
    if (!level || !level.grid) return TILE.EMPTY;
    if (tx < 0 || tx >= level.width) return TILE.GROUND; // stage side bounds
    if (ty < 0) return TILE.EMPTY;
    if (ty >= level.height) return TILE.EMPTY;
    return level.grid[ty * level.width + tx] || TILE.EMPTY;
  }

  function setTileAt(level, tx, ty, val) {
    if (!level || !level.grid) return;
    if (tx < 0 || tx >= level.width || ty < 0 || ty >= level.height) return;
    level.grid[ty * level.width + tx] = val;
    level.dirtyChunk = tx >> 4;
  }

  /**
   * Create a pre-allocated player object (Pip, Juniper, Bramble, Clover)
   */
  function createPlayer(index, dev) {
    var names = ['Pip', 'Juniper', 'Bramble', 'Clover'];
    var colors = ['#f27a24', '#eab308', '#a855f7', '#ec4899'];
    var scarfs = ['#2ec4b6', '#ef4444', '#38bdf8', '#fde047'];
    return {
      index: index || 0,
      name: names[index % 4],
      dev: dev || 'keys',
      active: true,
      x: 64,
      y: 300,
      vx: 0,
      vy: 0,
      w: 22,
      h: 26,
      dir: 1,
      form: 'small',
      reserveItem: null,
      onGround: false,
      onSlope: false,
      onIce: false,
      inWater: false,
      climbing: false,
      crouching: false,
      sliding: false,
      wallSlideDir: 0,
      wallJumpLock: 0,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      jumpHoldTimer: 0,
      spinJumping: false,
      spinHoverTimer: 0,
      groundPounding: false,
      groundPoundPause: 0,
      tailSwipeTimer: 0,
      runCharge: 0,
      gliding: false,
      hurtTimer: 0,
      starTimer: 0,
      goldHelmetTimer: 0,
      goldHelmetStepCounter: 0,
      transformTimer: 0,
      bubbled: false,
      bubbleCooldown: 0,
      carrying: null,
      carriedBlockTile: 0,
      anim: 'idle',
      animFrame: 0,
      animTick: 0,
      scaleX: 1,
      scaleY: 1,
      fireballCount: 0,
      color: colors[index % 4],
      scarfColor: scarfs[index % 4],
      dead: false,
      reachedGoal: false,
      secretGoal: false,
      flagSlideY: 0,
      handicapMul: 1.0, // used by tools/play-levels.mjs handicapped bot
      prevJumpDown: false,
      prevSpinDown: false,
      prevRunDown: false,
      prevDownDown: false,
      prevReserveDown: false
    };
  }

  function applyFormSize(p, newForm) {
    var oldH = p.h;
    p.form = newForm;
    var spec = POWERUPS[newForm] || POWERUPS.small;
    p.w = spec.w;
    p.h = p.crouching && newForm !== 'tiny' ? Math.round(spec.h * 0.62) : spec.h;
    p.y += (oldH - p.h);
  }

  /**
   * Grant a power-up or store the previous/duplicate one in the Reserve box
   */
  function grantPowerup(p, state, itemType) {
    if (itemType === 'clover') {
      state.lives++;
      if (state.onEvent) state.onEvent('life', p.x, p.y);
      return;
    }
    if (itemType === 'star') {
      p.starTimer = TUNE.starDurationFrames;
      if (state.onEvent) state.onEvent('star', p.x, p.y);
      return;
    }
    if (p.form === itemType) {
      p.reserveItem = itemType;
    } else {
      if (p.form !== 'small' && !p.reserveItem) {
        p.reserveItem = p.form;
      }
      applyFormSize(p, itemType);
      p.transformTimer = TUNE.transformFreezeFrames;
    }
    if (state.onEvent) state.onEvent('powerup', p.x, p.y, itemType);
  }

  function releaseReserveItem(p, state) {
    if (!p.reserveItem) return false;
    var item = p.reserveItem;
    p.reserveItem = null;
    grantPowerup(p, state, item);
    return true;
  }

  function addCoins(state, count, x, y) {
    state.coins += count;
    state.stageCoins += count;
    state.lifetimeCoins += count;
    while (state.coins >= TUNE.coinsForExtraLife) {
      state.coins -= TUNE.coinsForExtraLife;
      state.lives++;
      if (state.onEvent) state.onEvent('life', x || 0, y || 0);
    }
    if (state.onEvent) state.onEvent('coin', x || 0, y || 0, count);
  }

  /**
   * Damage player according to form, Star-fruit, and Kid Mode bubble rules
   */
  function damagePlayer(p, state) {
    if (p.dead || p.reachedGoal || p.bubbled) return false;
    if (p.starTimer > 0 || p.hurtTimer > 0 || p.transformTimer > 0) return false;

    // Getting hit as Big or any power-up form returns to small!
    if (p.form !== 'small') {
      applyFormSize(p, 'small');
      p.hurtTimer = TUNE.hurtInvulnFrames;
      if (state.onEvent) state.onEvent('hurt', p.x, p.y);
      return false;
    }

    // Multiplayer co-op check: is another player alive and unbubbled?
    var otherAlive = false;
    if (state.players && state.players.length > 1) {
      for (var i = 0; i < state.players.length; i++) {
        var o = state.players[i];
        if (o !== p && o.active && !o.dead && !o.bubbled) {
          otherAlive = true;
          break;
        }
      }
    }

    // Kid Mode: 5 extra shield rescues before losing a life
    // In 1P solo mode, grant instant shield hop + invulnerability frames without locking player in a bubble!
    if (state.kidMode && state.kidBubbleLives > 0) {
      state.kidBubbleLives--;
      if (otherAlive) {
        p.bubbled = true;
        p.vx = 0;
        p.vy = -2;
      } else {
        p.vy = -5.2;
      }
      p.hurtTimer = TUNE.hurtInvulnFrames;
      if (state.onEvent) state.onEvent('hurt', p.x, p.y);
      return false;
    }

    // Multiplayer co-op: if another player is alive and not bubbled, enter bubble instead of full wipe
    if (otherAlive) {
      p.bubbled = true;
      p.vx = 0;
      p.vy = -2;
      p.hurtTimer = TUNE.hurtInvulnFrames;
      if (state.onEvent) state.onEvent('bubble', p.x, p.y);
      return false;
    }

    p.dead = true;
    p.vy = -9.5;
    p.vx = 0;
    state.lives--;
    state.stageDeaths = (state.stageDeaths || 0) + 1;
    if (state.onEvent) state.onEvent('death', p.x, p.y);
    return true;
  }

  /**
   * Interact with a block hit from below or side (or ground pounded from above)
   */
  function hitBlock(level, state, p, tx, ty, fromAbove) {
    var t = getTileAt(level, tx, ty);
    var wx = tx * TUNE.tileSize;
    var wy = ty * TUNE.tileSize;

    if (t === TILE.Q_COIN) {
      setTileAt(level, tx, ty, TILE.SOLID_USED);
      addCoins(state, 1, wx, wy);
      return true;
    }
    if (t === TILE.Q_POWER) {
      setTileAt(level, tx, ty, TILE.SOLID_USED);
      var worldOrder = ['big', 'flame', 'leaf', 'gold', 'tiny', 'heavy', 'flame', 'gold'];
      var pType = p.form === 'small' ? 'big' : (level.powerupReward || worldOrder[(level.world || 1) - 1] || 'flame');
      grantPowerup(p, state, pType);
      return true;
    }
    if (t === TILE.Q_STAR) {
      setTileAt(level, tx, ty, TILE.SOLID_USED);
      grantPowerup(p, state, 'star');
      return true;
    }
    if (t === TILE.Q_LIFE) {
      setTileAt(level, tx, ty, TILE.SOLID_USED);
      grantPowerup(p, state, 'clover');
      return true;
    }
    if (t === TILE.GOLD_HELMET_BOX) {
      setTileAt(level, tx, ty, TILE.SOLID_USED);
      p.goldHelmetTimer = TUNE.goldHelmetDurationFrames;
      addCoins(state, 5, wx, wy);
      return true;
    }
    if (t === TILE.COIN_BRICK) {
      var key = tx + ',' + ty;
      if (!state.coinBricks) state.coinBricks = {};
      var cb = state.coinBricks[key];
      if (!cb) {
        cb = { hits: 0, timer: TUNE.coinBrickWindowFrames };
        state.coinBricks[key] = cb;
      }
      cb.hits++;
      addCoins(state, 1, wx, wy);
      if (cb.hits >= TUNE.coinBrickMaxHits || cb.timer <= 0) {
        setTileAt(level, tx, ty, TILE.SOLID_USED);
      }
      return true;
    }
    if (t === TILE.BRICK) {
      if (p.form !== 'small' || fromAbove) {
        setTileAt(level, tx, ty, TILE.EMPTY);
        if (state.onEvent) state.onEvent('break', wx, wy);
        return true;
      } else {
        if (state.onEvent) state.onEvent('bump', wx, wy);
      }
    }
    if (t === TILE.STONE && fromAbove && p.form === 'heavy') {
      setTileAt(level, tx, ty, TILE.EMPTY);
      if (state.onEvent) state.onEvent('break', wx, wy);
      return true;
    }
    return false;
  }

  /**
   * Horizontal swept step with slope ascent & ceiling/ledge corner correction
   */
  function moveHorizontal(p, level, state, dx) {
    p.x += dx;
    var ts = TUNE.tileSize;
    var leftTile = Math.floor(p.x / ts);
    var rightTile = Math.floor((p.x + p.w - 0.001) / ts);
    var topTile = Math.floor((p.y + 2) / ts);
    var botTile = Math.floor((p.y + p.h - 2) / ts);

    // Check slope tiles at feet first
    var footX = Math.floor((p.x + p.w * 0.5) / ts);
    var footY = Math.floor((p.y + p.h - 1) / ts);
    var ft = getTileAt(level, footX, footY);
    if (isSlopeTile(ft)) {
      var localX = (p.x + p.w * 0.5) - footX * ts;
      var slopeY = ft === TILE.SLOPE_L
        ? (footY + 1) * ts - localX
        : footY * ts + localX;
      if (p.y + p.h >= slopeY - 4) {
        p.y = slopeY - p.h;
        p.onGround = true;
        p.onSlope = ft;
        return;
      }
    }

    var checkTx = dx > 0 ? rightTile : leftTile;
    for (var ty = topTile; ty <= botTile; ty++) {
      var t = getTileAt(level, checkTx, ty);
      if (isSlopeTile(t)) continue;
      // Tiny Pip can walk right through TINY_PIPE tiles!
      if (t === TILE.TINY_PIPE && p.form === 'tiny') continue;

      if (isSolidTile(t, false, false)) {
        // Carryable Spring Block pickup check
        if (t === TILE.SPRING_BLOCK && p.HoldingRun && !p.carrying && !p.carriedBlockTile) {
          setTileAt(level, checkTx, ty, TILE.EMPTY);
          p.carriedBlockTile = TILE.SPRING_BLOCK;
          return;
        }
        if (dx > 0) {
          p.x = checkTx * ts - p.w;
          if (!p.onGround && p.vy > 0) p.wallSlideDir = 1;
        } else if (dx < 0) {
          p.x = (checkTx + 1) * ts;
          if (!p.onGround && p.vy > 0) p.wallSlideDir = -1;
        }
        p.vx = 0;
        return;
      }
    }
  }

  /**
   * Vertical swept step with ceiling corner correction (6px) and one-way platform support
   */
  function moveVertical(p, level, state, dy) {
    var prevBottom = p.y + p.h;
    p.y += dy;
    var ts = TUNE.tileSize;
    var leftTile = Math.floor((p.x + 1) / ts);
    var rightTile = Math.floor((p.x + p.w - 1.001) / ts);

    if (dy < 0) {
      // Moving upward: check ceiling tiles
      var topTile = Math.floor(p.y / ts);
      var hitLeft = isSolidTile(getTileAt(level, leftTile, topTile), false, false);
      var hitRight = isSolidTile(getTileAt(level, rightTile, topTile), false, false);

      // Corner correction on block edges (up to TUNE.cornerCorrectionPx = 6px)
      if (hitLeft && !hitRight) {
        var rightEdgeOfLeftBlock = (leftTile + 1) * ts;
        var overlapL = rightEdgeOfLeftBlock - p.x;
        if (overlapL > 0 && overlapL <= TUNE.cornerCorrectionPx) {
          var nextTx = Math.floor((p.x + overlapL + p.w - 1) / ts);
          if (!isSolidTile(getTileAt(level, nextTx, topTile), false, false)) {
            p.x += overlapL;
            hitLeft = false;
          }
        }
      } else if (hitRight && !hitLeft) {
        var leftEdgeOfRightBlock = rightTile * ts;
        var overlapR = (p.x + p.w) - leftEdgeOfRightBlock;
        if (overlapR > 0 && overlapR <= TUNE.cornerCorrectionPx) {
          var prevTx = Math.floor((p.x - overlapR + 1) / ts);
          if (!isSolidTile(getTileAt(level, prevTx, topTile), false, false)) {
            p.x -= overlapR;
            hitRight = false;
          }
        }
      }

      if (hitLeft || hitRight) {
        var hitTx = hitLeft ? leftTile : rightTile;
        hitBlock(level, state, p, hitTx, topTile, false);
        p.y = (topTile + 1) * ts;
        p.vy = 0;
        p.jumpHoldTimer = 0;
      }
    } else if (dy > 0) {
      // Moving downward: check floor, slopes, one-way platforms, fungus caps, water surface for Tiny Pip
      var botTile = Math.floor((p.y + p.h) / ts);
      var midX = p.x + p.w * 0.5;
      var midTx = Math.floor(midX / ts);
      var midT = getTileAt(level, midTx, botTile);

      if (isSlopeTile(midT)) {
        var lx = midX - midTx * ts;
        var sy = midT === TILE.SLOPE_L ? (botTile + 1) * ts - lx : botTile * ts + lx;
        if (p.y + p.h >= sy) {
          p.y = sy - p.h;
          p.vy = 0;
          p.onGround = true;
          p.onSlope = midT;
          p.groundPounding = false;
          return;
        }
      }

      for (var tx = leftTile; tx <= rightTile; tx++) {
        var t = getTileAt(level, tx, botTile);

        // Tiny Pip runs across the surface of water when holding run or moving fast!
        if (t === TILE.WATER && p.form === 'tiny' && Math.abs(p.vx) >= 2.2 && prevBottom <= botTile * ts + 4) {
          p.y = botTile * ts - p.h;
          p.vy = 0;
          p.onGround = true;
          return;
        }

        // Quicksand: sinks slowly, jump anytime to escape
        if (t === TILE.QUICKSAND) {
          p.vy = Math.min(p.vy, 0.45);
          p.onGround = true;
          p.coyoteTimer = TUNE.coyoteFrames;
          return;
        }

        var oneWay = isOneWayTile(t) && prevBottom <= botTile * ts + 2 && !p.crouching;
        var solid = isSolidTile(t, false, false);

        if (solid || oneWay) {
          // Ground pound or Spin Jump breaking blocks from above
          if (p.groundPounding && (t === TILE.BRICK || t === TILE.STONE || t === TILE.Q_COIN || t === TILE.Q_POWER || t === TILE.COIN_BRICK)) {
            var broke = hitBlock(level, state, p, tx, botTile, true);
            if (broke && getTileAt(level, tx, botTile) === TILE.EMPTY) {
              continue;
            }
          }
          if (t === TILE.FUNGUS_CAP) {
            p.y = botTile * ts - p.h;
            p.vy = TUNE.fungusBounceVel * p.handicapMul;
            p.onGround = false;
            p.groundPounding = false;
            if (state.onEvent) state.onEvent('bounce', p.x, p.y);
            return;
          }
          if (t === TILE.SPRING_BLOCK) {
            p.y = botTile * ts - p.h;
            p.vy = TUNE.springBounceVel * p.handicapMul;
            p.onGround = false;
            p.groundPounding = false;
            if (state.onEvent) state.onEvent('bounce', p.x, p.y);
            return;
          }

          p.y = botTile * ts - p.h;
          p.vy = 0;
          p.onGround = true;
          p.onIce = (t === TILE.ICE);
          p.groundPounding = false;
          if (t === TILE.CONVEYOR_L) p.x -= TUNE.conveyorSpeed;
          if (t === TILE.CONVEYOR_R) p.x += TUNE.conveyorSpeed;
          return;
        }
      }

      // Check dynamic moving platforms (level.platforms)
      if (level.platforms && !p.crouching) {
        for (var pi = 0; pi < level.platforms.length; pi++) {
          var mp = level.platforms[pi];
          if (p.x + p.w > mp.x + 2 && p.x < mp.x + mp.w - 2) {
            if (prevBottom <= mp.y + 6 && p.y + p.h >= mp.y && p.y + p.h <= mp.y + mp.h + 10) {
              p.y = mp.y - p.h;
              p.vy = 0;
              p.onGround = true;
              p.groundPounding = false;
              if (mp.dx) p.x += mp.dx;
              return;
            }
          }
        }
      }
    }
  }

  /**
   * Swept sub-stepped movement so no entity ever tunnels through tiles even at high speed
   */
  function moveWithSubsteps(p, level, state) {
    p.onGround = false;
    p.onSlope = 0;
    p.onIce = false;
    p.wallSlideDir = 0;

    var maxDelta = Math.max(Math.abs(p.vx), Math.abs(p.vy));
    var steps = Math.max(1, Math.ceil(maxDelta / TUNE.maxSubstepPx));
    var stepX = p.vx / steps;
    var stepY = p.vy / steps;

    for (var s = 0; s < steps; s++) {
      if (stepX !== 0 && p.vx !== 0) moveHorizontal(p, level, state, stepX);
      if (stepY !== 0 && p.vy !== 0) moveVertical(p, level, state, stepY);
    }
    if (p.onGround) {
      p.coyoteTimer = TUNE.coyoteFrames;
    }
  }

  /**
   * Collect overlapping coins, Star Medals, Red Rings, Gold Gates, Checkpoints, Flagpoles
   */
  function checkTilePickupsAndTriggers(p, level, state) {
    var ts = TUNE.tileSize;
    var x0 = Math.floor(p.x / ts);
    var x1 = Math.floor((p.x + p.w - 0.01) / ts);
    var y0 = Math.floor(p.y / ts);
    var y1 = Math.floor((p.y + p.h - 0.01) / ts);

    p.inWater = false;
    var touchingClimb = false;

    for (var ty = y0; ty <= y1; ty++) {
      for (var tx = x0; tx <= x1; tx++) {
        var t = getTileAt(level, tx, ty);
        if (t === TILE.EMPTY) continue;
        var wx = tx * ts;
        var wy = ty * ts;

        if (t === TILE.COIN) {
          setTileAt(level, tx, ty, TILE.EMPTY);
          addCoins(state, 1, wx, wy);
        } else if (t === TILE.BIG_COIN) {
          setTileAt(level, tx, ty, TILE.EMPTY);
          addCoins(state, TUNE.bigCoinValue, wx, wy);
        } else if (t === TILE.STAR_MEDAL_1 || t === TILE.STAR_MEDAL_2 || t === TILE.STAR_MEDAL_3) {
          var mIdx = t - TILE.STAR_MEDAL_1;
          setTileAt(level, tx, ty, TILE.EMPTY);
          state.medals[mIdx] = true;
          addCoins(state, 5, wx, wy);
          if (state.onEvent) state.onEvent('medal', wx, wy, mIdx);
        } else if (t === TILE.RED_RING) {
          setTileAt(level, tx, ty, TILE.EMPTY);
          state.redRingTimer = TUNE.redRingDurationFrames;
          state.redCoinsCollected = 0;
          if (state.onEvent) state.onEvent('red_ring', wx, wy);
        } else if (t === TILE.RED_COIN && state.redRingTimer > 0) {
          setTileAt(level, tx, ty, TILE.EMPTY);
          state.redCoinsCollected = (state.redCoinsCollected || 0) + 1;
          addCoins(state, 2, wx, wy);
          if (state.redCoinsCollected >= 8) {
            state.redRingTimer = 0;
            grantPowerup(p, state, p.form === 'small' ? 'big' : 'clover');
          }
        } else if (t === TILE.GOLD_GATE) {
          setTileAt(level, tx, ty, TILE.EMPTY);
          state.goldEnemyTimer = TUNE.goldRingDurationFrames;
          if (state.onEvent) state.onEvent('gold_gate', wx, wy);
        } else if (t === TILE.CHECKPOINT) {
          if (!state.checkpoint || state.checkpoint.tx !== tx || state.checkpoint.stageId !== level.id) {
            state.checkpoint = { stageId: level.id, tx: tx, ty: ty, x: wx, y: wy - 12 };
            if (p.form === 'small') applyFormSize(p, 'big');
            if (state.onEvent) state.onEvent('checkpoint', wx, wy);
          }
        } else if (t === TILE.FLAGPOLE) {
          p.reachedGoal = true;
          p.secretGoal = false;
          state.stageCleared = true;
          state.secretExitUsed = false;
          if (state.onEvent) state.onEvent('flag', wx, wy, false);
        } else if (t === TILE.SECRET_FLAG) {
          p.reachedGoal = true;
          p.secretGoal = true;
          state.stageCleared = true;
          state.secretExitUsed = true;
          if (state.onEvent) state.onEvent('flag', wx, wy, true);
        } else if (t === TILE.SPIKE) {
          if (p.spinJumping && p.vy >= 0 && (p.y + p.h) <= wy + 16) {
            p.vy = TUNE.stompBounceVel;
            if (state.onEvent) state.onEvent('spin_safe', wx, wy);
          } else {
            damagePlayer(p, state);
          }
        } else if (t === TILE.LAVA || t === TILE.POISON) {
          if (p.starTimer <= 0) {
            damagePlayer(p, state);
          }
        } else if (t === TILE.WATER) {
          p.inWater = true;
        } else if (isClimbTile(t)) {
          touchingClimb = true;
        } else if (t === TILE.SAND_GEYSER) {
          if (((state.tick || 0) % 180) < 90) {
            p.vy = Math.max(p.vy - 1.1, -9.2);
          }
        }
      }
    }

    if (!touchingClimb) {
      p.climbing = false;
    }
    return touchingClimb;
  }

  /**
   * Spawn a fireball or gold ring projectile from Flame Pip / Gilded Pip (pooled, zero-GC)
   */
  function spawnPlayerProjectile(p, state) {
    if (!state.projectiles) return;
    if (p.form !== 'flame' && p.form !== 'gold') return;
    if (p.fireballCount >= TUNE.maxFireballsPerPlayer) return;

    for (var i = 0; i < state.projectiles.length; i++) {
      var pr = state.projectiles[i];
      if (!pr.active) {
        pr.active = true;
        pr.ownerIndex = p.index;
        pr.kind = p.form === 'gold' ? 'gold_ring' : 'fireball';
        pr.x = p.dir > 0 ? p.x + p.w : p.x - 10;
        pr.y = p.y + p.h * 0.4;
        pr.vx = p.dir * (pr.kind === 'gold_ring' ? TUNE.goldRingProjSpeedX : TUNE.fireballSpeedX);
        pr.vy = 1.5;
        pr.w = pr.kind === 'gold_ring' ? 16 : 10;
        pr.h = pr.kind === 'gold_ring' ? 16 : 10;
        pr.ttl = 120;
        p.fireballCount++;
        if (state.onEvent) state.onEvent('shoot', pr.x, pr.y, pr.kind);
        return;
      }
    }
  }

  /**
   * Fixed 60 Hz step for a single player
   * input: { left, right, up, down, jump, spin, run, reserve, bubble }
   */
  function updatePlayer(p, input, level, state) {
    if (!p.active || p.dead || p.reachedGoal) return;

    if (p.transformTimer > 0) {
      p.transformTimer--;
      return;
    }
    if (p.hurtTimer > 0) p.hurtTimer--;
    if (p.starTimer > 0) p.starTimer--;
    if (p.goldHelmetTimer > 0) p.goldHelmetTimer--;
    if (p.wallJumpLock > 0) p.wallJumpLock--;
    if (p.tailSwipeTimer > 0) p.tailSwipeTimer--;
    if (p.bubbleCooldown > 0) p.bubbleCooldown--;

    var jumpJustPressed = !!(input.jump && !p.prevJumpDown);
    var spinJustPressed = !!(input.spin && !p.prevSpinDown);
    var runJustPressed = !!(input.run && !p.prevRunDown);
    var downJustPressed = !!(input.down && !p.prevDownDown);
    var reserveJustPressed = !!(input.reserve && !p.prevReserveDown);

    p.prevJumpDown = !!input.jump;
    p.prevSpinDown = !!input.spin;
    p.prevRunDown = !!input.run;
    p.prevDownDown = !!input.down;
    p.prevReserveDown = !!input.reserve;
    p.HoldingRun = !!input.run;

    // Select (-) releases Reserve Item
    if (reserveJustPressed) {
      releaseReserveItem(p, state);
    }

    // On-demand bubble (A + LB in co-op) or pop out of bubble with B (jump)
    var hasCoopPartner = !!(state.players && state.players[1] && state.players[1].active);
    if (hasCoopPartner && input.bubble && !p.bubbled && p.bubbleCooldown <= 0) {
      p.bubbled = true;
      p.bubbleCooldown = 30;
      p.vx = 0;
      p.vy = 0;
      return;
    }
    if (p.bubbled) {
      var targetX = p.x;
      var targetY = 160;
      if (state.leader && state.leader !== p && !state.leader.bubbled) {
        targetX = state.leader.x - 24;
        targetY = state.leader.y - 16;
      }
      p.x += (targetX - p.x) * 0.08;
      p.y += (targetY - p.y) * 0.08;
      if (jumpJustPressed || !hasCoopPartner) {
        p.bubbled = false;
        p.vy = -4.5;
        p.hurtTimer = 45;
      }
      p.anim = 'float';
      return;
    }

    var hMul = p.handicapMul || 1.0;
    var dirInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    // Check climbable vines/fences
    var touchingClimb = checkTilePickupsAndTriggers(p, level, state);
    if (p.reachedGoal || p.dead) return;

    if (touchingClimb && (input.up || input.down) && !p.climbing) {
      p.climbing = true;
      p.vx = 0;
      p.vy = 0;
      p.groundPounding = false;
      p.spinJumping = false;
    }

    if (p.climbing) {
      p.vx = dirInput * TUNE.climbSpeed * hMul;
      p.vy = ((input.down ? 1 : 0) - (input.up ? 1 : 0)) * TUNE.climbSpeed * hMul;
      if (jumpJustPressed) {
        p.climbing = false;
        p.vy = TUNE.jumpVel * hMul;
      }
      moveWithSubsteps(p, level, state);
      p.anim = 'climb';
      return;
    }

    // Bonus pipe entry (Down on PIPE_TOP_L / PIPE_TOP_R, or right into TINY_PIPE as Tiny Pip)
    if (p.onGround && input.down && level.bonusWarp) {
      var footTx = Math.floor((p.x + p.w * 0.5) / TUNE.tileSize);
      var footTy = Math.floor((p.y + p.h + 2) / TUNE.tileSize);
      var pipeT = getTileAt(level, footTx, footTy);
      if ((pipeT === TILE.PIPE_TOP_L || pipeT === TILE.PIPE_TOP_R) && !state.usedBonusPipe) {
        state.usedBonusPipe = true;
        p.x = level.bonusWarp.x;
        p.y = level.bonusWarp.y;
        p.vx = 0;
        p.vy = 0;
        addCoins(state, 10, p.x, p.y);
        if (state.onEvent) state.onEvent('pipe', p.x, p.y);
        return;
      }
    }

    // Swimming physics (World 3 & water tiles)
    if (p.inWater || level.underwater) {
      var swimMax = TUNE.swimMaxSpeed * hMul;
      p.vx += dirInput * 0.22 * hMul;
      p.vx *= 0.9;
      if (p.vx > swimMax) p.vx = swimMax;
      if (p.vx < -swimMax) p.vx = -swimMax;
      if (dirInput !== 0) p.dir = dirInput;

      if (p.form === 'heavy') {
        p.vy = Math.min(p.vy + TUNE.swimGravity * 2.5, TUNE.heavyWaterSinkVy);
        if (p.onGround && jumpJustPressed) p.vy = TUNE.jumpVel * 0.72 * hMul;
      } else {
        p.vy = Math.min(p.vy + TUNE.swimGravity, TUNE.swimMaxFall);
        if (jumpJustPressed || spinJustPressed) {
          p.vy = TUNE.swimStrokeVy * hMul;
          if (state.onEvent) state.onEvent('swim', p.x, p.y);
        }
      }
      moveWithSubsteps(p, level, state);
      p.anim = 'swim';
      return;
    }

    // Ground pound initiation & pause
    if (!p.onGround && downJustPressed && !p.groundPounding && !p.sliding) {
      p.groundPounding = true;
      p.groundPoundPause = TUNE.groundPoundPauseFrames;
      p.vx = 0;
      p.vy = 0;
    }
    if (p.groundPounding) {
      if (p.groundPoundPause > 0) {
        p.groundPoundPause--;
        p.vx = 0;
        p.vy = 0;
      } else {
        p.vx = 0;
        p.vy = TUNE.groundPoundVel;
        moveWithSubsteps(p, level, state);
      }
      p.anim = 'groundPound';
      return;
    }

    // Crouch & Crouch-Slide on slopes
    if (p.onGround && input.down) {
      if (!p.crouching) {
        p.crouching = true;
        applyFormSize(p, p.form);
      }
      if (p.onSlope) {
        p.sliding = true;
        var slideDir = p.onSlope === TILE.SLOPE_L ? -1 : 1;
        p.vx = Math.max(-TUNE.crouchSlideMaxSpeed, Math.min(TUNE.crouchSlideMaxSpeed, p.vx + slideDir * TUNE.crouchSlideAccel));
      } else {
        p.sliding = false;
        p.vx *= 0.78;
      }
    } else if (p.crouching) {
      p.crouching = false;
      p.sliding = false;
      applyFormSize(p, p.form);
    }

    // Horizontal acceleration, running, wind resistance, and friction
    var running = !!(input.run || state.remoteAutoRun);
    var maxSpd = (p.form === 'tiny' ? TUNE.tinyMaxSpeed : p.form === 'heavy' ? TUNE.heavyMaxSpeed : (running ? TUNE.runMaxSpeed : TUNE.walkMaxSpeed)) * hMul;
    var accel = (running ? TUNE.runAccel : TUNE.walkAccel) * hMul;

    if (!p.crouching && p.wallJumpLock <= 0) {
      if (dirInput !== 0) {
        if (p.onGround && ((dirInput > 0 && p.vx < -0.8) || (dirInput < 0 && p.vx > 0.8))) {
          p.vx += dirInput * TUNE.skidDecel;
          p.anim = 'skid';
        } else {
          p.vx += dirInput * accel;
        }
        p.dir = dirInput;
      } else {
        var fric = p.onGround ? (p.onIce || level.icePhysics ? TUNE.iceFriction : TUNE.groundFriction) : TUNE.airDrag;
        p.vx *= fric;
        if (Math.abs(p.vx) < 0.08) p.vx = 0;
      }
    }

    // World 7 / Gust Sprite wind push (Heavy Pip is completely immune!)
    if (state.windForce && p.form !== 'heavy') {
      p.vx += state.windForce;
    }

    if (!p.sliding) {
      if (p.vx > maxSpd) p.vx = maxSpd;
      if (p.vx < -maxSpd) p.vx = -maxSpd;
    }

    // Track run charge for Glider Pip (Leaf cape) & Coin Rush Gold Helmet
    if (p.onGround && Math.abs(p.vx) >= TUNE.runMaxSpeed * 0.85 * hMul) {
      p.runCharge = Math.min(60, p.runCharge + 1);
    } else if (p.onGround && p.runCharge > 0) {
      p.runCharge--;
    }

    // Coin Rush Gold Helmet sprays coins while running!
    if (p.goldHelmetTimer > 0 && Math.abs(p.vx) > 2.2) {
      p.goldHelmetStepCounter++;
      if (p.goldHelmetStepCounter >= 12) {
        p.goldHelmetStepCounter = 0;
        addCoins(state, 1, p.x, p.y - 10);
      }
    }

    // Coyote time & Jump buffer
    if (p.onGround) {
      p.coyoteTimer = TUNE.coyoteFrames;
      p.spinJumping = false;
      p.gliding = false;
    } else if (p.coyoteTimer > 0) {
      p.coyoteTimer--;
    }

    if (jumpJustPressed || spinJustPressed) {
      p.jumpBufferTimer = TUNE.jumpBufferFrames;
    } else if (p.jumpBufferTimer > 0) {
      p.jumpBufferTimer--;
    }

    // Execute buffered Jump or Spin Jump (including Coyote Time)
    if (p.jumpBufferTimer > 0 && p.coyoteTimer > 0) {
      p.jumpBufferTimer = 0;
      p.coyoteTimer = 0;
      p.onGround = false;
      var speedRatio = Math.min(1, Math.abs(p.vx) / TUNE.runMaxSpeed);
      if (spinJustPressed) {
        p.vy = (TUNE.spinJumpVel + speedRatio * TUNE.speedJumpBonus * 0.7) * hMul;
        p.spinJumping = true;
        p.spinHoverTimer = TUNE.spinHoverFrames;
        if (state.onEvent) state.onEvent('spin', p.x, p.y);
      } else {
        p.vy = (TUNE.jumpVel + speedRatio * TUNE.speedJumpBonus) * hMul;
        p.jumpHoldTimer = TUNE.jumpHoldFrames;
        p.spinJumping = false;
        if (state.onEvent) state.onEvent('jump', p.x, p.y);
      }
      p.scaleX = 0.85;
      p.scaleY = 1.18;
    } else if (!p.onGround && spinJustPressed && !p.spinJumping) {
      // Mid-air A press triggers short Spin Hover (and Glider float for Leaf Cape)
      p.spinJumping = true;
      p.spinHoverTimer = TUNE.spinHoverFrames;
      if (p.vy > -2.5) p.vy = -2.8 * hMul;
      if (state.onEvent) state.onEvent('spin', p.x, p.y);
    }

    // Variable jump height cut when B is released early
    if (!input.jump && p.vy < 0 && p.jumpHoldTimer > 0) {
      p.vy *= TUNE.jumpCutMultiplier;
      p.jumpHoldTimer = 0;
    }
    if (p.jumpHoldTimer > 0) p.jumpHoldTimer--;

    // Gravity with form modifiers (Tiny Pip floaty, Heavy Pip heavy, Leaf Cape glide)
    var g = p.vy < 0 ? TUNE.gravity : TUNE.fallGravity;
    if (p.jumpHoldTimer > 0 && input.jump && p.vy < 0) {
      g *= TUNE.jumpHoldGravityMul;
    }
    if (p.spinHoverTimer > 0) {
      p.spinHoverTimer--;
      g *= TUNE.spinHoverGravityMul;
    }
    if (p.form === 'tiny') g *= TUNE.tinyGravityMul;
    if (p.form === 'heavy') g *= TUNE.heavyGravityMul;

    p.vy = Math.min(p.vy + g, TUNE.maxFallSpeed);

    // Leaf Cape (Glider Pip): slow glide when holding B or after run charge
    if (p.form === 'leaf' && p.vy > 0 && (input.jump || input.spin || p.runCharge > 20)) {
      p.vy = Math.min(p.vy, TUNE.gliderFallCap);
      p.gliding = true;
    } else {
      p.gliding = false;
    }

    // Power-up action (X / Y press): shoot fireball/gold ring, tail-swipe, or throw carried object
    if (runJustPressed) {
      if (p.form === 'flame' || p.form === 'gold') {
        spawnPlayerProjectile(p, state);
      } else if (p.form === 'leaf') {
        p.tailSwipeTimer = TUNE.tailSwipeFrames;
        if (state.onEvent) state.onEvent('swipe', p.x, p.y);
      }
    }

    // Release X/Y throws carried shell/enemy or Spring Block
    if (!input.run && (p.carrying || p.carriedBlockTile)) {
      if (p.carrying) {
        var ce = p.carrying;
        p.carrying = null;
        ce.carried = false;
        ce.x = p.dir > 0 ? p.x + p.w + 4 : p.x - ce.w - 4;
        ce.y = p.y + 4;
        ce.vx = input.up ? 0 : p.dir * TUNE.throwBlockSpeedX;
        ce.vy = input.up ? -9.5 : -2.0;
        ce.shellMoving = true;
        if (state.onEvent) state.onEvent('kick', ce.x, ce.y);
      } else if (p.carriedBlockTile) {
        var placeTx = Math.floor((p.x + p.w * 0.5 + p.dir * 26) / TUNE.tileSize);
        var placeTy = Math.floor((p.y + p.h - 8) / TUNE.tileSize);
        if (getTileAt(level, placeTx, placeTy) === TILE.EMPTY) {
          setTileAt(level, placeTx, placeTy, p.carriedBlockTile);
        }
        p.carriedBlockTile = 0;
      }
    }

    // Move with swept sub-steps (detects wallSlideDir if pushing into a wall in midair)
    var wasOnGround = p.onGround;
    moveWithSubsteps(p, level, state);

    // Wall slide & wall jump
    if (!p.onGround && p.wallSlideDir !== 0 && p.vy > 0) {
      p.vy = Math.min(p.vy, TUNE.wallSlideMaxVy);
      if (jumpJustPressed) {
        p.vx = -p.wallSlideDir * TUNE.wallJumpVx * hMul;
        p.vy = TUNE.wallJumpVy * hMul;
        p.dir = -p.wallSlideDir;
        p.wallJumpLock = TUNE.wallJumpLockFrames;
        p.wallSlideDir = 0;
        if (state.onEvent) state.onEvent('jump', p.x, p.y);
      }
    }

    // Squash & stretch recovery
    if (!wasOnGround && p.onGround) {
      p.scaleX = 1.22;
      p.scaleY = 0.78;
    }
    p.scaleX += (1 - p.scaleX) * 0.25;
    p.scaleY += (1 - p.scaleY) * 0.25;

    // Update carried entity position
    if (p.carrying) {
      p.carrying.x = p.dir > 0 ? p.x + p.w - 4 : p.x - p.carrying.w + 4;
      p.carrying.y = p.y + 4;
    }

    // Fall into bottomless pit
    if (p.y > level.height * TUNE.tileSize + 36) {
      if (state.kidMode && state.kidBubbleLives > 0) {
        state.kidBubbleLives--;
        p.y = (level.height - 5) * TUNE.tileSize;
        p.vy = -11.5;
        p.vx = 2.5;
        p.hurtTimer = TUNE.hurtInvulnFrames;
        if (state.onEvent) state.onEvent('bounce', p.x, p.y);
      } else {
        p.form = 'small';
        damagePlayer(p, state);
      }
      return;
    }

    // Set animation state
    if (!p.onGround) {
      if (p.wallSlideDir !== 0) p.anim = 'wallSlide';
      else if (p.spinJumping) p.anim = 'spin';
      else if (p.vy < 0) p.anim = 'jump';
      else p.anim = 'fall';
    } else if (p.sliding) {
      p.anim = 'slide';
    } else if (p.crouching) {
      p.anim = 'crouch';
    } else if (Math.abs(p.vx) > 0.2) {
      p.anim = Math.abs(p.vx) > TUNE.walkMaxSpeed * 1.05 ? 'run' : 'walk';
      p.animTick += Math.abs(p.vx) * 0.12;
      p.animFrame = Math.floor(p.animTick) % 4;
    } else {
      p.anim = 'idle';
      p.animFrame = 0;
    }
  }

  /**
   * Initialize or reset a Boss entity from BOSS_CATALOG
   */
  function createBossInstance(bossId, x, y) {
    var def = BOSS_CATALOG[bossId] || BOSS_CATALOG.captain_thorn;
    return {
      id: def.id,
      name: def.name,
      title: def.title,
      def: def,
      active: true,
      x: x,
      y: y,
      startX: x,
      startY: y,
      vx: -def.phases[0].speed,
      vy: 0,
      w: def.w,
      h: def.h,
      dir: -1,
      hp: def.maxHp,
      maxHp: def.maxHp,
      room: 1,
      maxRooms: def.rooms || 1,
      phase: 1,
      state: 'telegraph', // 'telegraph' -> 'attack' -> 'vulnerable' -> 'hurt'
      timer: def.telegraphFrames,
      invulnTimer: 0,
      defeated: false
    };
  }

  /**
   * Step Boss 3-Phase State Machine (guarantees >= 0.5s telegraph before every attack)
   */
  function updateBoss(boss, level, state) {
    if (!boss || !boss.active || boss.defeated) return;
    if (boss.invulnTimer > 0) boss.invulnTimer--;

    var phaseIdx = Math.min(boss.def.phases.length - 1, Math.max(0, boss.maxHp - boss.hp));
    boss.phase = phaseIdx + 1;
    var phaseCfg = boss.def.phases[phaseIdx];
    var spd = phaseCfg.speed * (state.kidMode ? TUNE.kidModeEnemySpeedMul : 1.0);

    boss.timer--;
    if (boss.state === 'telegraph') {
      boss.vx = 0;
      if (boss.timer <= 0) {
        boss.state = 'attack';
        boss.timer = 90;
        var target = (state.players && state.players[0]) ? state.players[0] : { x: boss.x - 100 };
        boss.dir = target.x < boss.x ? -1 : 1;
        boss.vx = boss.dir * spd;
        if (phaseCfg.pattern.indexOf('leap') >= 0 || phaseCfg.pattern.indexOf('bounce') >= 0) {
          boss.vy = -8.2;
        }
      }
    } else if (boss.state === 'attack') {
      boss.x += boss.vx;
      boss.y += boss.vy;
      boss.vy = Math.min(boss.vy + 0.38, 8.0);

      var floorY = (level.height - 2) * TUNE.tileSize - boss.h;
      if (boss.y >= floorY) {
        boss.y = floorY;
        boss.vy = 0;
      }

      var minX = (level.bossArenaLeft || (level.width - 24)) * TUNE.tileSize;
      var maxX = (level.width - 3) * TUNE.tileSize - boss.w;
      if (boss.x <= minX) {
        boss.x = minX;
        boss.dir = 1;
        boss.vx = Math.abs(boss.vx);
      } else if (boss.x >= maxX) {
        boss.x = maxX;
        boss.dir = -1;
        boss.vx = -Math.abs(boss.vx);
      }

      if (boss.timer <= 0) {
        boss.state = 'vulnerable';
        boss.vx = 0;
        boss.timer = phaseCfg.stunFrames || 90;
      }
    } else if (boss.state === 'vulnerable') {
      boss.vx = 0;
      if (boss.timer <= 0) {
        boss.state = 'telegraph';
        boss.timer = Math.max(TUNE.bossTelegraphMinFrames, boss.def.telegraphFrames);
      }
    }
  }

  function damageBoss(boss, state, amount) {
    if (!boss || boss.defeated || boss.invulnTimer > 0) return false;
    boss.hp -= (amount || 1);
    boss.invulnTimer = TUNE.bossInvulnFrames;

    if (boss.hp <= 0) {
      if (boss.room < boss.maxRooms) {
        // Rust Baron 3-room final battle transition!
        boss.room++;
        boss.hp = boss.maxHp;
        boss.state = 'telegraph';
        boss.timer = boss.def.telegraphFrames;
        if (state.onEvent) state.onEvent('boss_room', boss.x, boss.y, boss.room);
        return false;
      }
      boss.hp = 0;
      boss.defeated = true;
      boss.active = false;
      state.stageCleared = true;
      addCoins(state, 50, boss.x, boss.y);
      if (state.onEvent) state.onEvent('boss_defeated', boss.x, boss.y, boss.id);
      return true;
    }

    boss.state = 'telegraph';
    boss.timer = Math.max(TUNE.bossTelegraphMinFrames, boss.def.telegraphFrames);
    if (state.onEvent) state.onEvent('boss_hit', boss.x, boss.y, boss.hp);
    return false;
  }

  function aabbOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /**
   * Create & serialize 3-slot profile save data
   */
  function createDefaultSave() {
    return {
      version: 1,
      activeSlot: 0,
      lifetimeCoins: 0,
      coinRushBest: 0,
      slots: [
        { world: 1, stageIndex: 0, lives: 5, coins: 0, reserveItem: 'big', cleared: {}, medals: {}, secrets: {} },
        { world: 1, stageIndex: 0, lives: 5, coins: 0, reserveItem: null, cleared: {}, medals: {}, secrets: {} },
        { world: 1, stageIndex: 0, lives: 5, coins: 0, reserveItem: null, cleared: {}, medals: {}, secrets: {} }
      ]
    };
  }

  function sanitizeSaveData(raw) {
    var def = createDefaultSave();
    if (!raw || typeof raw !== 'object') return def;
    def.activeSlot = Math.max(0, Math.min(2, +raw.activeSlot || 0));
    def.lifetimeCoins = Math.max(0, Math.floor(+raw.lifetimeCoins || 0));
    def.coinRushBest = Math.max(0, Math.floor(+raw.coinRushBest || 0));
    if (Array.isArray(raw.slots)) {
      for (var i = 0; i < 3; i++) {
        var s = raw.slots[i];
        if (s && typeof s === 'object') {
          def.slots[i] = {
            world: Math.max(1, Math.min(10, +s.world || 1)),
            stageIndex: Math.max(0, +s.stageIndex || 0),
            lives: Math.max(1, Math.min(99, +s.lives || 5)),
            coins: Math.max(0, Math.min(99, +s.coins || 0)),
            reserveItem: typeof s.reserveItem === 'string' ? s.reserveItem : null,
            cleared: s.cleared && typeof s.cleared === 'object' ? s.cleared : {},
            medals: s.medals && typeof s.medals === 'object' ? s.medals : {},
            secrets: s.secrets && typeof s.secrets === 'object' ? s.secrets : {}
          };
        }
      }
    }
    return def;
  }

  var GT = root.GT || (root.GT = {});
  GT.physics = {
    isSolidTile: isSolidTile,
    isOneWayTile: isOneWayTile,
    isSlopeTile: isSlopeTile,
    isClimbTile: isClimbTile,
    getTileAt: getTileAt,
    setTileAt: setTileAt,
    createPlayer: createPlayer,
    applyFormSize: applyFormSize,
    grantPowerup: grantPowerup,
    releaseReserveItem: releaseReserveItem,
    addCoins: addCoins,
    damagePlayer: damagePlayer,
    hitBlock: hitBlock,
    moveWithSubsteps: moveWithSubsteps,
    updatePlayer: updatePlayer,
    createBossInstance: createBossInstance,
    updateBoss: updateBoss,
    damageBoss: damageBoss,
    aabbOverlap: aabbOverlap,
    createDefaultSave: createDefaultSave,
    sanitizeSaveData: sanitizeSaveData
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GT.physics;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

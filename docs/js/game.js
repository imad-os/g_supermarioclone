/**
 * Pip's Golden Trail - Main Game Loop, MyPC SDK Integration, Co-op, Pools & Bot Controller
 * - Strict compliance with MyPC GUIDE.md:
 *   * Zero own keydown listeners (all input via onInput, MyPC.isDown, MyPC.gamepad).
 *   * Returns false from onInput for 'cancel' on the first screen (Title Screen) + MyPC.back(on).
 *   * One requestAnimationFrame loop with fixed 60 Hz step, stopped in onPause/onDestroy.
 *   * One AudioContext created in onStart and closed in onDestroy.
 *   * Pre-allocated object pools (no allocation per frame, <= 60 active objects).
 */
(function (root) {
  'use strict';

  var GT = root.GT || (root.GT = {});
  var TUNE = GT.TUNE;
  var TILE = GT.TILE;
  var WORLDS = GT.WORLDS;
  var POWERUPS = GT.POWERUPS;
  var ENEMY_BY_ID = GT.ENEMY_BY_ID;
  var physics = GT.physics;
  var audio = GT.audio;
  var render = GT.render;

  var SAVE_KEY = 'golden_trail_save_v1';
  var canvas = null;
  var ctx = null;
  var raf = 0;
  var lastTs = 0;
  var accMs = 0;
  var tick = 0;
  var qualityTier = 'high';
  var lang = 'en';
  var texts = GT.getText('en');
  var saveObj = physics.createDefaultSave();

  // Screen state: 'title' | 'intro' | 'map' | 'hut' | 'play' | 'ending'
  var screen = 'title';
  var introScene = 0;
  var introTimer = 0;
  var modal = null; // { kind, title, subtitle, index, options }

  var uiState = {
    menuIndex: 0,
    coopCount: 1,
    kidMode: true,
    remoteAutoRun: true,
    speedMul: 1
  };

  var mapState = {
    world: 1,
    stageIndex: 0
  };

  var hutState = {
    choice: 0,
    revealed: false,
    rewardId: 'flame',
    rewardName: 'Ember berry'
  };

  // Pre-allocated Fixed Pools (Zero GC in 60 Hz update loop!)
  var players = [
    physics.createPlayer(0, 'keys'),
    physics.createPlayer(1, 'pad1'),
    physics.createPlayer(2, 'pad2'),
    physics.createPlayer(3, 'pad3')
  ];
  var enemiesPool = [];
  for (var eIdx = 0; eIdx < TUNE.maxEnemiesPool; eIdx++) {
    enemiesPool.push({
      active: false,
      type: 'bumblet',
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      vx: -1,
      vy: 0,
      w: 24,
      h: 22,
      stunTimer: 0,
      shellMoving: false,
      carried: false,
      phaseTick: 0
    });
  }
  var projectilesPool = [];
  for (var pIdx = 0; pIdx < TUNE.maxProjectilesPool; pIdx++) {
    projectilesPool.push({
      active: false,
      ownerIndex: 0,
      kind: 'fireball',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      w: 10,
      h: 10,
      ttl: 0
    });
  }

  // Per-device held input state (mutated in-place, never reallocated)
  var devInputs = {
    keys: { left: false, right: false, up: false, down: false, jump: false, spin: false, run: false, reserve: false, bubble: false },
    keys2: { left: false, right: false, up: false, down: false, jump: false, spin: false, run: false, reserve: false, bubble: false },
    pad0: { left: false, right: false, up: false, down: false, jump: false, spin: false, run: false, reserve: false, bubble: false },
    pad1: { left: false, right: false, up: false, down: false, jump: false, spin: false, run: false, reserve: false, bubble: false },
    pad2: { left: false, right: false, up: false, down: false, jump: false, spin: false, run: false, reserve: false, bubble: false },
    pad3: { left: false, right: false, up: false, down: false, jump: false, spin: false, run: false, reserve: false, bubble: false },
    bot0: { left: false, right: false, up: false, down: false, jump: false, spin: false, run: false, reserve: false, bubble: false },
    bot1: { left: false, right: false, up: false, down: false, jump: false, spin: false, run: false, reserve: false, bubble: false }
  };

  var currentLevel = null;
  var botActive = false;
  var playState = {
    tick: 0,
    lives: 5,
    coins: 0,
    stageCoins: 0,
    lifetimeCoins: 0,
    medals: [false, false, false],
    kidMode: true,
    kidBubbleLives: 5,
    remoteAutoRun: true,
    stageDeaths: 0,
    timeLeft: 300,
    cameraX: 0,
    cameraPeekX: 0,
    windForce: 0,
    redRingTimer: 0,
    redCoinsCollected: 0,
    goldEnemyTimer: 0,
    checkpoint: null,
    usedBonusPipe: false,
    stageCleared: false,
    secretExitUsed: false,
    coinRushActive: false,
    coinRushStages: ['1-1', '2-1', '3-1'],
    coinRushIndex: 0,
    coinRushTotal: 0,
    leader: players[0],
    players: players,
    enemies: enemiesPool,
    projectiles: projectilesPool,
    boss: null,
    onEvent: onPhysicsEvent
  };

  function onPhysicsEvent(kind, x, y, extra) {
    if (kind === 'coin') audio.playSfx(extra >= 10 ? 'big_coin' : 'coin');
    else if (kind === 'medal') audio.playSfx('medal');
    else if (kind === 'powerup' || kind === 'star' || kind === 'gold_gate' || kind === 'red_ring') audio.playSfx('powerup');
    else if (kind === 'life') audio.playSfx('life');
    else if (kind === 'jump' || kind === 'swim') audio.playSfx('jump');
    else if (kind === 'spin' || kind === 'swipe' || kind === 'spin_safe') audio.playSfx('spin');
    else if (kind === 'hurt' || kind === 'death' || kind === 'bubble') audio.playSfx('hurt');
    else if (kind === 'break') audio.playSfx('break');
    else if (kind === 'bump') audio.playSfx('bump');
    else if (kind === 'checkpoint') audio.playSfx('checkpoint');
    else if (kind === 'flag') audio.playSfx('flag');
    else if (kind === 'shoot') audio.playSfx('shoot');
    else if (kind === 'bounce') audio.playSfx('bounce');
    else if (kind === 'kick') audio.playSfx('kick');
    else if (kind === 'boss_hit' || kind === 'boss_room' || kind === 'boss_defeated') audio.playSfx('boss_hit');
  }

  function syncBodyDataset() {
    if (typeof document === 'undefined' || !document.body) return;
    if (modal) {
      document.body.dataset.state = (modal.kind === 'clear' || modal.kind === 'gameover') ? 'gameover' : 'paused';
    } else if (screen === 'play') {
      document.body.dataset.state = 'playing';
    } else {
      document.body.dataset.state = 'title';
    }
    document.body.dataset.screen = screen;
  }

  function setScreen(nextScreen) {
    screen = nextScreen;
    modal = null;
    if (typeof MyPC !== 'undefined' && MyPC.back) {
      MyPC.back(nextScreen !== 'title');
    }
    if (nextScreen === 'title' || nextScreen === 'map') {
      audio.setTrack('title', false);
    }
    syncBodyDataset();
  }

  function persistSave() {
    var slot = saveObj.slots[saveObj.activeSlot] || saveObj.slots[0];
    slot.lives = playState.lives;
    slot.coins = playState.coins;
    slot.reserveItem = players[0].reserveItem;
    saveObj.lifetimeCoins = playState.lifetimeCoins;
    if (typeof MyPC !== 'undefined' && MyPC.save) {
      MyPC.save(SAVE_KEY, saveObj);
    }
  }

  function updateMyPCMenu() {
    if (typeof MyPC === 'undefined' || !MyPC.setMenu) return;
    MyPC.setMenu([
      { id: 'resume', label: texts.resume },
      { id: 'restart', label: texts.restartStage },
      { id: 'map', label: texts.backToMap },
      { id: 'controls', label: texts.controlsTitle },
      { id: 'settings', label: texts.settingsTitle }
    ]);
  }

  /**
   * Lazy-load world JSON when entering a world on the map or starting a stage
   */
  function ensureWorldLoaded(worldNum) {
    if (typeof fetch === 'function') {
      fetch('levels/world-' + worldNum + '.json?v=1.0.0').catch(function () {});
    }
  }

  /**
   * Start a stage by ID (e.g. '1-1', '1-C', '8-C')
   */
  function startStage(stageId, options) {
    options = options || {};
    var lvl = GT.cloneStage(stageId);
    currentLevel = lvl;
    ensureWorldLoaded(lvl.world);

    var slot = saveObj.slots[saveObj.activeSlot] || saveObj.slots[0];
    playState.tick = 0;
    playState.lives = slot.lives || 5;
    playState.coins = slot.coins || 0;
    playState.stageCoins = 0;
    playState.lifetimeCoins = saveObj.lifetimeCoins || 0;
    var savedMedals = slot.medals[lvl.id] || [false, false, false];
    playState.medals[0] = !!savedMedals[0];
    playState.medals[1] = !!savedMedals[1];
    playState.medals[2] = !!savedMedals[2];
    playState.kidMode = options.kidMode !== undefined ? !!options.kidMode : uiState.kidMode;
    playState.kidBubbleLives = TUNE.kidModeBubbleLives;
    playState.remoteAutoRun = uiState.remoteAutoRun;
    playState.timeLeft = lvl.timeLimit || 300;
    playState.cameraX = 0;
    playState.cameraPeekX = 0;
    playState.windForce = lvl.mechanic === 'wind' ? 0.08 : 0;
    playState.redRingTimer = 0;
    playState.redCoinsCollected = 0;
    playState.goldEnemyTimer = 0;
    playState.usedBonusPipe = false;
    playState.stageCleared = false;
    playState.secretExitUsed = false;

    var numPlayers = options.players || uiState.coopCount || 1;
    var handicap = options.handicap || 1.0;

    for (var i = 0; i < 4; i++) {
      var p = players[i];
      var oldReserve = i === 0 ? slot.reserveItem : null;
      var spawnX = (playState.checkpoint && playState.checkpoint.stageId === lvl.id)
        ? playState.checkpoint.x
        : lvl.startX - i * 22;
      var spawnY = (playState.checkpoint && playState.checkpoint.stageId === lvl.id)
        ? playState.checkpoint.y
        : lvl.startY;

      p.active = i < numPlayers;
      p.x = Math.max(32, spawnX);
      p.y = spawnY;
      p.vx = 0;
      p.vy = 0;
      p.dir = 1;
      p.dead = false;
      p.reachedGoal = false;
      p.secretGoal = false;
      p.bubbled = false;
      p.climbing = false;
      p.crouching = false;
      p.sliding = false;
      p.groundPounding = false;
      p.spinJumping = false;
      p.carrying = null;
      p.carriedBlockTile = 0;
      p.hurtTimer = 0;
      p.starTimer = 0;
      p.goldHelmetTimer = playState.coinRushActive ? TUNE.goldHelmetDurationFrames : 0;
      p.fireballCount = 0;
      p.handicapMul = handicap;
      p.reserveItem = oldReserve;
      physics.applyFormSize(p, playState.kidMode ? 'big' : 'small');
      p.transformTimer = 0;
    }
    playState.leader = players[0];

    // Populate pooled enemies
    for (var j = 0; j < enemiesPool.length; j++) {
      var ep = enemiesPool[j];
      if (j < lvl.enemies.length) {
        var src = lvl.enemies[j];
        var def = ENEMY_BY_ID[src.type] || ENEMY_BY_ID.bumblet;
        ep.active = true;
        ep.type = src.type;
        ep.x = src.x;
        ep.y = src.y;
        ep.startX = src.x;
        ep.startY = src.y;
        ep.w = def.w;
        ep.h = def.h;
        ep.vx = -def.speed * (playState.kidMode ? TUNE.kidModeEnemySpeedMul : 1.0);
        ep.vy = 0;
        ep.stunTimer = 0;
        ep.shellMoving = false;
        ep.carried = false;
        ep.phaseTick = j * 15;
      } else {
        ep.active = false;
      }
    }

    for (var k = 0; k < projectilesPool.length; k++) {
      projectilesPool[k].active = false;
    }

    // Initialize Boss if Tower or Castle
    if (lvl.bossId) {
      playState.boss = physics.createBossInstance(
        lvl.bossId,
        (lvl.width - 10) * TUNE.tileSize,
        14 * TUNE.tileSize - 48
      );
      audio.setTrack('boss', false);
    } else {
      playState.boss = null;
      audio.setTrack(lvl.role === 'castle' || lvl.role === 'tower' ? 'castle' : ('w' + lvl.world), false);
    }

    render.buildChunkCanvases(lvl);
    setScreen('play');
  }

  /**
   * Update active enemies & projectiles within ~2 screens of the camera (Zero GC)
   */
  function stepEntities() {
    var lvl = currentLevel;
    var camX = playState.cameraX;
    var activeWindowLeft = camX - 160;
    var activeWindowRight = camX + render.W + 320;
    var p0 = playState.leader || players[0];

    // Step player projectiles
    for (var i = 0; i < projectilesPool.length; i++) {
      var pr = projectilesPool[i];
      if (!pr.active) continue;
      pr.ttl--;
      pr.x += pr.vx;
      pr.y += pr.vy;
      pr.vy = Math.min(pr.vy + 0.35, 6.0);

      var tx = Math.floor((pr.x + pr.w * 0.5) / TUNE.tileSize);
      var ty = Math.floor((pr.y + pr.h) / TUNE.tileSize);
      var ft = physics.getTileAt(lvl, tx, ty);
      if (physics.isSolidTile(ft, false, false)) {
        if (pr.kind === 'gold_ring' && ft === TILE.BRICK) {
          physics.setTileAt(lvl, tx, ty, TILE.COIN);
        }
        pr.vy = TUNE.fireballBounceVy;
      }
      if (pr.ttl <= 0 || pr.x < activeWindowLeft || pr.x > activeWindowRight) {
        pr.active = false;
        if (players[pr.ownerIndex] && players[pr.ownerIndex].fireballCount > 0) {
          players[pr.ownerIndex].fireballCount--;
        }
        continue;
      }

      // Check projectile vs enemies
      for (var j = 0; j < enemiesPool.length; j++) {
        var en = enemiesPool[j];
        if (!en.active) continue;
        if (physics.aabbOverlap(pr, en)) {
          var edef = ENEMY_BY_ID[en.type] || ENEMY_BY_ID.bumblet;
          if (!edef.fireImmune || pr.kind === 'gold_ring') {
            en.active = false;
            physics.addCoins(playState, pr.kind === 'gold_ring' ? 5 : 1, en.x, en.y);
            audio.playSfx('kick');
          }
          pr.active = false;
          if (players[pr.ownerIndex] && players[pr.ownerIndex].fireballCount > 0) {
            players[pr.ownerIndex].fireballCount--;
          }
          break;
        }
      }

      // Check projectile vs Boss
      if (pr.active && playState.boss && playState.boss.active && !playState.boss.defeated) {
        if (physics.aabbOverlap(pr, playState.boss)) {
          physics.damageBoss(playState.boss, playState, 1);
          pr.active = false;
          if (players[pr.ownerIndex] && players[pr.ownerIndex].fireballCount > 0) {
            players[pr.ownerIndex].fireballCount--;
          }
        }
      }
    }

    // Step enemies within the ~2 visible screens
    for (var ei = 0; ei < enemiesPool.length; ei++) {
      var e = enemiesPool[ei];
      if (!e.active || e.carried) continue;
      if (e.x < activeWindowLeft || e.x > activeWindowRight) continue;

      var def = ENEMY_BY_ID[e.type] || ENEMY_BY_ID.bumblet;
      e.phaseTick++;

      if (e.stunTimer > 0) {
        e.stunTimer--;
        continue;
      }

      if (def.behavior === 'patrol' || def.behavior === 'ice_slide' || def.behavior === 'patrol_sway' || def.behavior === 'roll_snowball') {
        e.x += e.vx;
        var aheadTx = Math.floor((e.vx > 0 ? e.x + e.w + 2 : e.x - 2) / TUNE.tileSize);
        var curTy = Math.floor((e.y + e.h * 0.5) / TUNE.tileSize);
        var floorTy = Math.floor((e.y + e.h + 2) / TUNE.tileSize);
        if (physics.isSolidTile(physics.getTileAt(lvl, aheadTx, curTy), false, false) ||
            !physics.isSolidTile(physics.getTileAt(lvl, aheadTx, floorTy), false, false)) {
          e.vx = -e.vx;
        }
      } else if (def.behavior === 'hopper') {
        e.x += e.vx;
        e.y += e.vy;
        e.vy = Math.min(e.vy + 0.4, 7.0);
        var bTy = Math.floor((e.y + e.h) / TUNE.tileSize);
        var bTx = Math.floor((e.x + e.w * 0.5) / TUNE.tileSize);
        if (physics.isSolidTile(physics.getTileAt(lvl, bTx, bTy), false, false)) {
          e.y = bTy * TUNE.tileSize - e.h;
          e.vy = (e.phaseTick % 50 === 0) ? (def.jumpVel || -6.5) : 0;
        }
      } else if (def.behavior === 'float_inflate' || def.behavior === 'sine_swim' || def.behavior === 'sine_drift' || def.behavior === 'swoop_arc' || def.behavior === 'ceiling_swoop') {
        e.x += e.vx * 0.5;
        e.y = e.startY + Math.sin(e.phaseTick * 0.06) * 26;
        if (Math.abs(e.x - e.startX) > 72) e.vx = -e.vx;
      } else if (def.behavior === 'sand_pop' || def.behavior === 'pipe_emerge' || def.behavior === 'lava_leap') {
        // Chomper vine pauses when Pip stands right next to it
        if (def.behavior === 'pipe_emerge' && Math.abs(p0.x - e.x) < 42) {
          e.y = e.startY + 24;
        } else {
          e.y = e.startY + Math.sin(e.phaseTick * 0.05) * 24;
        }
      } else if (def.behavior === 'shy_chase') {
        // Ghost Lantern moves only when Pip looks away!
        var pipFacingGhost = (p0.dir > 0 && e.x > p0.x) || (p0.dir < 0 && e.x < p0.x);
        if (!pipFacingGhost) {
          e.x += (p0.x < e.x ? -0.9 : 0.9);
          e.y += (p0.y < e.y ? -0.5 : 0.5);
        }
      } else if (def.behavior === 'orbit_circle') {
        e.x = e.startX + Math.cos(e.phaseTick * 0.05) * 28;
        e.y = e.startY + Math.sin(e.phaseTick * 0.05) * 28;
      } else if (def.behavior === 'telegraph_slam') {
        // Crusher block rumbles for 36 frames before slamming
        var cycle = e.phaseTick % 120;
        if (cycle < 36) {
          e.x = e.startX + (cycle % 2 === 0 ? 2 : -2);
        } else if (cycle < 60) {
          e.y = Math.min(14 * TUNE.tileSize - e.h, e.y + 6);
        } else {
          e.y = Math.max(e.startY - 64, e.y - 1.5);
        }
      } else if (def.behavior === 'shell' && e.shellMoving) {
        e.x += e.vx;
        var sTx = Math.floor((e.vx > 0 ? e.x + e.w : e.x) / TUNE.tileSize);
        var sTy = Math.floor((e.y + e.h * 0.5) / TUNE.tileSize);
        if (physics.isSolidTile(physics.getTileAt(lvl, sTx, sTy), false, false)) {
          e.vx = -e.vx;
        }
        // Moving shell bowls over other enemies
        for (var oi = 0; oi < enemiesPool.length; oi++) {
          var other = enemiesPool[oi];
          if (other !== e && other.active && physics.aabbOverlap(e, other)) {
            other.active = false;
            physics.addCoins(playState, 2, other.x, other.y);
          }
        }
      }

      // Gold Ring Gate: gold enemies drop coins periodically
      if (playState.goldEnemyTimer > 0 && (e.phaseTick % 90 === 0)) {
        physics.addCoins(playState, 1, e.x, e.y);
      }

      // Check Player vs Enemy interaction
      for (var pi = 0; pi < players.length; pi++) {
        var pl = players[pi];
        if (!pl.active || pl.dead || pl.bubbled || pl.reachedGoal) continue;

        // Glider Pip tail-swipe hit check
        if (pl.form === 'leaf' && pl.tailSwipeTimer > 0) {
          var swipeBox = {
            x: pl.dir > 0 ? pl.x + pl.w : pl.x - TUNE.tailSwipeReachPx,
            y: pl.y + 4,
            w: TUNE.tailSwipeReachPx,
            h: pl.h - 8
          };
          if (physics.aabbOverlap(swipeBox, e)) {
            e.active = false;
            physics.addCoins(playState, 2, e.x, e.y);
            audio.playSfx('kick');
            break;
          }
        }

        if (!physics.aabbOverlap(pl, e)) continue;

        // Star-fruit Shining Pip or Crouch-Sliding defeats enemy on touch
        if (pl.starTimer > 0 || pl.sliding) {
          e.active = false;
          physics.addCoins(playState, playState.goldEnemyTimer > 0 ? TUNE.goldEnemyCoinDrop : 2, e.x, e.y);
          audio.playSfx('kick');
          break;
        }

        // Carry stunned shell or stunned hopnut
        if ((e.type === 'bumblet_shell' && !e.shellMoving) || e.stunTimer > 0) {
          if (pl.HoldingRun && !pl.carrying) {
            pl.carrying = e;
            e.carried = true;
          } else {
            e.shellMoving = true;
            e.stunTimer = 0;
            e.vx = pl.dir * 6.4;
            audio.playSfx('kick');
          }
          break;
        }

        // Stomp / Spin Jump / Ground Pound from above
        var comingFromAbove = pl.vy > 0 && (pl.y + pl.h - pl.vy) <= e.y + 14;
        if (comingFromAbove || pl.groundPounding) {
          if (def.spikeTop && !pl.spinJumping && !(pl.groundPounding && pl.form === 'heavy')) {
            physics.damagePlayer(pl, playState);
          } else {
            pl.vy = pl.prevJumpDown ? TUNE.stompHoldBounceVel : TUNE.stompBounceVel;
            pl.groundPounding = false;
            if (def.turnsIntoShell) {
              e.type = def.turnsIntoShell;
              e.shellMoving = false;
              e.vx = 0;
              e.h = 18;
            } else if (!def.spikeTop || pl.form === 'heavy') {
              e.active = false;
            }
            physics.addCoins(playState, playState.goldEnemyTimer > 0 ? TUNE.goldEnemyCoinDrop : 1, e.x, e.y);
            audio.playSfx('stomp');
          }
        } else {
          physics.damagePlayer(pl, playState);
        }
      }
    }

    // Step Boss & Player-vs-Boss interaction
    if (playState.boss && playState.boss.active && !playState.boss.defeated) {
      var b = playState.boss;
      physics.updateBoss(b, lvl, playState);
      for (var bp = 0; bp < players.length; bp++) {
        var hero = players[bp];
        if (!hero.active || hero.dead || hero.bubbled) continue;
        if (physics.aabbOverlap(hero, b)) {
          var stompBoss = hero.vy > 0 && (hero.y + hero.h - hero.vy) <= b.y + 18;
          if (stompBoss || hero.groundPounding || hero.starTimer > 0) {
            hero.vy = TUNE.stompHoldBounceVel;
            hero.groundPounding = false;
            hero.x += (hero.x < b.x ? -28 : 28);
            physics.damageBoss(b, playState, 1);
          } else if (b.invulnTimer <= 0) {
            physics.damagePlayer(hero, playState);
          }
        }
      }
    }
  }

  /**
   * Handicapped Bot AI for tools/play-levels.mjs (and Guide Leaf assist)
   * Navigates purely using legal player inputs (right, jump, spin, run)
   */
  function computeBotInput(p, lvl, state, outInput) {
    outInput.left = false;
    outInput.right = true;
    outInput.up = false;
    outInput.down = false;
    outInput.jump = false;
    outInput.spin = false;
    outInput.run = true;
    outInput.reserve = false;
    outInput.bubble = false;

    if (p.bubbled) {
      outInput.jump = (state.tick % 10 < 5);
      return;
    }

    var ts = TUNE.tileSize;
    var tx = Math.floor((p.x + p.w * 0.5) / ts);
    var ty = Math.floor((p.y + p.h - 2) / ts);

    // If fighting an active boss, jump onto boss when vulnerable or hop over boss during attack
    if (state.boss && state.boss.active && !state.boss.defeated) {
      var b = state.boss;
      var dist = b.x - p.x;
      if (b.state === 'vulnerable') {
        outInput.right = dist > -8;
        outInput.left = dist <= -8;
        if (Math.abs(dist) < 72 && p.onGround) {
          outInput.jump = true;
        } else if (p.vy < 0) {
          outInput.jump = true;
        }
      } else {
        // Keep safe distance during telegraph & jump over charge
        outInput.left = dist > 0 && dist < 110;
        outInput.right = !outInput.left;
        if (Math.abs(dist) < 95 && p.onGround) {
          outInput.jump = true;
          outInput.spin = true;
        } else if (p.vy < 0) {
          outInput.jump = true;
        }
      }
      return;
    }

    // Look ahead for walls, gaps, hazards, Star Medals, or enemies
    var wallAhead = physics.isSolidTile(physics.getTileAt(lvl, tx + 1, ty), false, false) ||
                    physics.isSolidTile(physics.getTileAt(lvl, tx + 2, ty), false, false);
    var floorAhead = physics.isSolidTile(physics.getTileAt(lvl, tx + 1, ty + 1), false, false) ||
                     physics.isOneWayTile(physics.getTileAt(lvl, tx + 1, ty + 1)) ||
                     physics.isSlopeTile(physics.getTileAt(lvl, tx + 1, ty + 1));
    var medalAbove = false;
    for (var my = Math.max(2, ty - 6); my <= ty; my++) {
      for (var mx = tx - 1; mx <= tx + 2; mx++) {
        var mt = physics.getTileAt(lvl, mx, my);
        if (mt === TILE.STAR_MEDAL_1 || mt === TILE.STAR_MEDAL_2 || mt === TILE.STAR_MEDAL_3 || mt === TILE.SECRET_FLAG) {
          medalAbove = true;
        }
      }
    }

    var enemyNear = false;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.active && e.x > p.x - 16 && e.x < p.x + 84 && Math.abs(e.y - p.y) < 48) {
        enemyNear = true;
        break;
      }
    }

    if (p.inWater || lvl.underwater) {
      outInput.jump = (state.tick % 14 === 0) && !p.prevJumpDown;
      return;
    }

    var shouldJump = wallAhead || !floorAhead || medalAbove || enemyNear || (state.tick % 40 === 0);
    if (p.onGround || p.coyoteTimer > 0) {
      if (p.prevJumpDown) {
        outInput.jump = false;
      } else if (shouldJump) {
        outInput.jump = true;
      }
    } else if (p.vy < 0) {
      outInput.jump = true;
      if (enemyNear) outInput.spin = true;
    } else if (enemyNear && !p.spinUsedInAir) {
      outInput.spin = true;
    }
  }

  /**
   * Poll MyPC.gamepad state into per-device input struct (Zero allocation)
   */
  function syncGamepadInputs(devName, target) {
    if (typeof MyPC === 'undefined' || !MyPC.gamepad) return;
    var gp = MyPC.gamepad;
    var axX = gp.axis(0, devName);
    var axY = gp.axis(1, devName);
    target.left = gp.pressed(14, devName) || axX < -0.35;
    target.right = gp.pressed(15, devName) || axX > 0.35;
    target.up = gp.pressed(12, devName) || axY < -0.35;
    target.down = gp.pressed(13, devName) || axY > 0.35;
    target.jump = gp.pressed(0, devName);     // B (bottom)
    target.spin = gp.pressed(1, devName);     // A (right)
    target.run = gp.pressed(2, devName) || gp.pressed(3, devName) || gp.value(7, devName) > 0.3; // X / Y / RT
    target.reserve = gp.pressed(8, devName);  // - (Select)
    target.bubble = gp.pressed(1, devName) && gp.pressed(4, devName); // A + LB
  }

  function handleStageComplete() {
    var slot = saveObj.slots[saveObj.activeSlot] || saveObj.slots[0];
    slot.cleared[currentLevel.id] = true;
    slot.medals[currentLevel.id] = [
      !!playState.medals[0],
      !!playState.medals[1],
      !!playState.medals[2]
    ];
    if (playState.secretExitUsed) {
      slot.secrets[currentLevel.id] = true;
    }
    persistSave();

    // Coin Rush Mode progression (3 stages in a row -> MyPC.submitScore)
    if (playState.coinRushActive) {
      playState.coinRushTotal += playState.stageCoins + 50;
      playState.coinRushIndex++;
      if (playState.coinRushIndex < 3) {
        startStage(playState.coinRushStages[playState.coinRushIndex]);
        return;
      }
      playState.coinRushActive = false;
      if (playState.coinRushTotal > saveObj.coinRushBest) {
        saveObj.coinRushBest = playState.coinRushTotal;
        persistSave();
      }
      if (typeof MyPC !== 'undefined' && MyPC.submitScore) {
        MyPC.submitScore(playState.coinRushTotal, { player: 1, players: uiState.coopCount });
      }
      modal = {
        kind: 'clear',
        title: texts.coinRushDone,
        subtitle: texts.coinsCollected + ': ' + playState.coinRushTotal,
        index: 0,
        options: [
          { id: 'map', label: texts.backToMap },
          { id: 'coin_rush', label: texts.coinRush }
        ]
      };
      syncBodyDataset();
      return;
    }

    // If Final Castle (8-C) or Crown Final (10-9) cleared, launch Ending Parade!
    if (!botActive && (currentLevel.id === '8-C' || currentLevel.id === '10-9')) {
      setScreen('ending');
      return;
    }

    if (!botActive) {
      modal = {
        kind: 'clear',
        title: playState.secretExitUsed ? texts.secretFound : (currentLevel.bossId ? texts.bossDefeated : texts.stageClear),
        subtitle: texts.coinsCollected + ': +' + playState.stageCoins + '   ·   ' + texts.starMedals + ': ' +
                  (playState.medals[0] ? '★' : '☆') + (playState.medals[1] ? '★' : '☆') + (playState.medals[2] ? '★' : '☆'),
        index: 0,
        options: [
          { id: 'next', label: texts.startStory },
          { id: 'restart', label: texts.restartStage },
          { id: 'map', label: texts.backToMap }
        ]
      };
      syncBodyDataset();
    }
  }

  /**
   * Fixed 60 Hz Update Step
   */
  function step() {
    tick++;
    audio.stepMusic();

    if (screen === 'intro') {
      introTimer++;
      if (introTimer >= 150) {
        introTimer = 0;
        introScene++;
        if (introScene >= 5) {
          setScreen('map');
        }
      }
      return;
    }

    if (screen !== 'play' || modal || !currentLevel) return;

    playState.tick++;
    if (playState.redRingTimer > 0) playState.redRingTimer--;
    if (playState.goldEnemyTimer > 0) playState.goldEnemyTimer--;

    if (playState.tick % 60 === 0) {
      playState.timeLeft--;
      if (playState.timeLeft <= 0) {
        physics.damagePlayer(players[0], playState);
      }
    }

    // Update Star-fruit music tempo
    audio.setTrack(
      currentLevel.bossId ? 'boss' : ('w' + currentLevel.world),
      players[0].starTimer > 0
    );

    // Poll primary inputs for Player 1..4
    if (botActive) {
      computeBotInput(players[0], currentLevel, playState, devInputs.bot0);
      physics.updatePlayer(players[0], devInputs.bot0, currentLevel, playState);
      if (players[1].active) {
        computeBotInput(players[1], currentLevel, playState, devInputs.bot1);
        physics.updatePlayer(players[1], devInputs.bot1, currentLevel, playState);
      }
    } else {
      // Player 1 reads MyPC.isDown + pad0
      syncGamepadInputs('pad0', devInputs.pad0);
      var k = devInputs.keys;
      var gp0 = devInputs.pad0;
      k.left = MyPC.isDown('left') || gp0.left;
      k.right = MyPC.isDown('right') || gp0.right;
      k.up = MyPC.isDown('up') || gp0.up;
      k.down = MyPC.isDown('down') || gp0.down;
      k.jump = MyPC.isDown('jump') || MyPC.isDown('confirm') || gp0.jump;
      k.run = MyPC.isDown('run') || gp0.run;
      k.spin = gp0.spin;
      k.reserve = gp0.reserve;
      k.bubble = gp0.bubble;
      physics.updatePlayer(players[0], k, currentLevel, playState);

      if (players[1].active) {
        syncGamepadInputs('pad1', devInputs.pad1);
        // In 2P mode without a second controller connected, Juniper gently assists as co-op buddy!
        var pads = (typeof MyPC !== 'undefined' && MyPC.gamepad) ? MyPC.gamepad.pads() : [];
        if (pads.length < 2) {
          computeBotInput(players[1], currentLevel, playState, devInputs.bot1);
          physics.updatePlayer(players[1], devInputs.bot1, currentLevel, playState);
        } else {
          physics.updatePlayer(players[1], devInputs.pad1, currentLevel, playState);
        }
      }
      if (players[2].active) {
        syncGamepadInputs('pad2', devInputs.pad2);
        physics.updatePlayer(players[2], devInputs.pad2, currentLevel, playState);
      }
      if (players[3].active) {
        syncGamepadInputs('pad3', devInputs.pad3);
        physics.updatePlayer(players[3], devInputs.pad3, currentLevel, playState);
      }
    }

    // Find leader (front-most non-bubbled player) & bubble any player left far behind
    var leader = players[0];
    for (var i = 0; i < players.length; i++) {
      var pl = players[i];
      if (pl.active && !pl.dead && !pl.bubbled && pl.x > leader.x) {
        leader = pl;
      }
    }
    playState.leader = leader;

    for (var cIdx = 0; cIdx < players.length; cIdx++) {
      var cp = players[cIdx];
      if (cp.active && !cp.dead && !cp.bubbled && cp !== leader) {
        if (leader.x - cp.x > 460) {
          cp.bubbled = true;
        }
      }
    }

    // Camera follow with right-stick / LB-RB peek
    var peek = 0;
    if (typeof MyPC !== 'undefined' && MyPC.gamepad) {
      var rx = MyPC.gamepad.axis(2);
      if (Math.abs(rx) > 0.15) peek = rx * TUNE.cameraPeekMaxPx;
      else if (MyPC.gamepad.pressed(5)) peek = 120;
      else if (MyPC.gamepad.pressed(4)) peek = -100;
    }
    var targetCamX = currentLevel.autoScroll && !currentLevel.bossId
      ? Math.min(currentLevel.width * TUNE.tileSize - render.W, playState.cameraX + 1.1)
      : (leader.x - render.W * 0.35 + peek);
    var maxCamX = Math.max(0, currentLevel.width * TUNE.tileSize - render.W);
    targetCamX = Math.max(0, Math.min(maxCamX, targetCamX));
    playState.cameraX += (targetCamX - playState.cameraX) * (botActive ? 0.45 : TUNE.cameraFollowLerp);

    stepEntities();

    if (playState.stageCleared) {
      handleStageComplete();
      return;
    }

    if (players[0].dead) {
      if (playState.lives <= 0 && !botActive) {
        playState.lives = TUNE.startingLives;
        persistSave();
        modal = {
          kind: 'gameover',
          title: texts.gameOver,
          subtitle: currentLevel.code + ' · ' + currentLevel.name,
          index: 0,
          options: [
            { id: 'restart', label: texts.tryAgain },
            { id: 'map', label: texts.backToMap }
          ]
        };
        syncBodyDataset();
      } else {
        startStage(currentLevel.id, {
          handicap: players[0].handicapMul,
          players: uiState.coopCount,
          kidMode: playState.kidMode
        });
      }
    }
  }

  function draw() {
    if (!ctx) {
      canvas = document.getElementById('c');
      if (canvas) {
        canvas.width = render.W;
        canvas.height = render.H;
        ctx = canvas.getContext('2d');
      }
    }
    if (!ctx) return;
    if (screen === 'title') {
      render.drawTitle(ctx, uiState, saveObj, texts, tick);
    } else if (screen === 'intro') {
      render.drawIntro(ctx, introScene, tick, texts);
    } else if (screen === 'map') {
      render.drawWorldMap(ctx, mapState, saveObj, texts, tick);
    } else if (screen === 'hut') {
      render.drawHelperHut(ctx, hutState, texts, tick);
    } else if (screen === 'ending') {
      render.drawEndingParade(ctx, tick, saveObj, texts);
    } else if (screen === 'play') {
      render.drawStage(ctx, currentLevel, playState, texts, tick);
    }
    if (modal) {
      render.drawModal(ctx, modal, texts);
    }
  }

  var loopActive = false;
  var paceTimer = 0;

  function scheduleNextFrame() {
    if (!loopActive || raf || paceTimer) return;
    paceTimer = setTimeout(function () {
      paceTimer = 0;
      if (loopActive && !raf) {
        raf = requestAnimationFrame(frame);
      }
    }, 8);
  }

  function frame(ts) {
    raf = 0;
    if (!loopActive) return;
    if (!lastTs) lastTs = ts;
    accMs += Math.min(250, ts - lastTs) * uiState.speedMul;
    lastTs = ts;
    while (accMs >= TUNE.stepMs) {
      step();
      accMs -= TUNE.stepMs;
    }
    draw();
    scheduleNextFrame();
  }

  function startLoop() {
    loopActive = true;
    lastTs = 0;
    accMs = 0;
    scheduleNextFrame();
  }

  function stopLoop() {
    loopActive = false;
    if (paceTimer) {
      clearTimeout(paceTimer);
      paceTimer = 0;
    }
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function resize() {
    if (!canvas || !ctx) return;
    var dpr = qualityTier === 'low' ? 1 : Math.min(2, window.devicePixelRatio || 1);
    var scale = Math.min(window.innerWidth / render.W, window.innerHeight / render.H) * dpr;
    canvas.width = Math.max(480, Math.round(render.W * scale));
    canvas.height = Math.max(270, Math.round(render.H * scale));
    ctx.setTransform(canvas.width / render.W, 0, 0, canvas.height / render.H, 0, 0);
    draw();
  }

  function openPauseModal() {
    modal = {
      kind: 'pause',
      title: texts.title,
      subtitle: currentLevel ? (currentLevel.code + ' · ' + currentLevel.name) : texts.worldMap,
      index: 0,
      options: [
        { id: 'resume', label: texts.resume },
        { id: 'restart', label: texts.restartStage },
        { id: 'kid', label: texts.kidMode + ': ' + (uiState.kidMode ? texts.on : texts.off) },
        { id: 'autorun', label: texts.remoteAutoRun + ': ' + (uiState.remoteAutoRun ? texts.on : texts.off) },
        { id: 'map', label: texts.backToMap }
      ]
    };
    syncBodyDataset();
  }

  function executeModalOption(optId) {
    if (optId === 'resume') {
      modal = null;
      syncBodyDataset();
    } else if (optId === 'restart') {
      modal = null;
      if (currentLevel) startStage(currentLevel.id);
    } else if (optId === 'next') {
      modal = null;
      var wStages = GT.STAGES_BY_WORLD[mapState.world] || [];
      if (mapState.stageIndex + 1 < wStages.length) {
        mapState.stageIndex++;
      } else if (mapState.world < 10) {
        mapState.world++;
        mapState.stageIndex = 0;
      }
      setScreen('map');
    } else if (optId === 'kid') {
      uiState.kidMode = !uiState.kidMode;
      playState.kidMode = uiState.kidMode;
      openPauseModal();
    } else if (optId === 'autorun') {
      uiState.remoteAutoRun = !uiState.remoteAutoRun;
      playState.remoteAutoRun = uiState.remoteAutoRun;
      openPauseModal();
    } else if (optId === 'coin_rush') {
      modal = null;
      startCoinRush();
    } else if (optId === 'map') {
      modal = null;
      setScreen('map');
    }
  }

  function startCoinRush() {
    playState.coinRushActive = true;
    playState.coinRushIndex = 0;
    playState.coinRushTotal = 0;
    playState.coinRushStages = ['1-1', '2-1', '3-1'];
    startStage(playState.coinRushStages[0]);
  }

  function handleMenuAction(id) {
    if (id === 'resume') {
      modal = null;
      syncBodyDataset();
    } else if (id === 'restart') {
      if (currentLevel) startStage(currentLevel.id);
    } else if (id === 'map') {
      setScreen('map');
    } else if (id === 'controls' || id === 'settings') {
      openPauseModal();
    }
  }

  /**
   * All input goes through onInput (and MyPC.gamepad).
   * Returns false when action === 'cancel' on the Title Screen so My PC opens its menu.
   */
  function handleInput(action, pressed, repeat, dev) {
    audio.start();

    if (!pressed) return true;

    // Back / Cancel handling (API level 18: return false on first screen)
    if (action === 'cancel') {
      if (modal) {
        modal = null;
        syncBodyDataset();
        return true;
      }
      if (screen === 'title') {
        return false; // Lets My PC open its own pause/quit menu!
      }
      if (screen === 'play' || screen === 'hut' || screen === 'intro' || screen === 'ending') {
        setScreen('map');
        return true;
      }
      if (screen === 'map') {
        setScreen('title');
        return true;
      }
    }

    if (action === 'menu' || action === 'pause') {
      if (modal) {
        modal = null;
        syncBodyDataset();
      } else {
        openPauseModal();
      }
      return true;
    }

    if (modal) {
      if (action === 'up') {
        modal.index = (modal.index + modal.options.length - 1) % modal.options.length;
        audio.playSfx('pipBlip');
      } else if (action === 'down') {
        modal.index = (modal.index + 1) % modal.options.length;
        audio.playSfx('pipBlip');
      } else if (action === 'confirm' || action === 'jump') {
        audio.playSfx('coin');
        executeModalOption(modal.options[modal.index].id);
      }
      return true;
    }

    if (screen === 'intro' || screen === 'ending') {
      if (action === 'confirm' || action === 'jump') {
        setScreen('map');
      }
      return true;
    }

    if (screen === 'title') {
      if (action === 'up') {
        uiState.menuIndex = (uiState.menuIndex + 6) % 7;
        audio.playSfx('pipBlip');
      } else if (action === 'down') {
        uiState.menuIndex = (uiState.menuIndex + 1) % 7;
        audio.playSfx('pipBlip');
      } else if (action === 'left' || action === 'right') {
        var delta = action === 'right' ? 1 : -1;
        if (uiState.menuIndex === 1) {
          saveObj.activeSlot = (saveObj.activeSlot + 3 + delta) % 3;
          persistSave();
        } else if (uiState.menuIndex === 2) {
          uiState.coopCount = uiState.coopCount === 1 ? 2 : 1;
        } else if (uiState.menuIndex === 3) {
          uiState.kidMode = !uiState.kidMode;
        }
        audio.playSfx('pipBlip');
      } else if (action === 'confirm' || action === 'jump') {
        audio.playSfx('coin');
        if (uiState.menuIndex === 0) {
          var slot = saveObj.slots[saveObj.activeSlot] || saveObj.slots[0];
          mapState.world = slot.world || 1;
          mapState.stageIndex = slot.stageIndex || 0;
          ensureWorldLoaded(mapState.world);
          setScreen('map');
        } else if (uiState.menuIndex === 1) {
          saveObj.activeSlot = (saveObj.activeSlot + 1) % 3;
          persistSave();
        } else if (uiState.menuIndex === 2) {
          uiState.coopCount = uiState.coopCount === 1 ? 2 : 1;
        } else if (uiState.menuIndex === 3) {
          uiState.kidMode = !uiState.kidMode;
        } else if (uiState.menuIndex === 4) {
          startCoinRush();
        } else if (uiState.menuIndex === 5) {
          introScene = 0;
          introTimer = 0;
          setScreen('intro');
        } else if (uiState.menuIndex === 6) {
          openPauseModal();
        }
      }
      return true;
    }

    if (screen === 'map') {
      var wStages = GT.STAGES_BY_WORLD[mapState.world] || [];
      if (action === 'left') {
        if (mapState.stageIndex > 0) {
          mapState.stageIndex--;
        } else if (mapState.world > 1) {
          mapState.world--;
          ensureWorldLoaded(mapState.world);
          mapState.stageIndex = (GT.STAGES_BY_WORLD[mapState.world] || []).length - 1;
        }
        audio.playSfx('pipBlip');
      } else if (action === 'right') {
        if (mapState.stageIndex + 1 < wStages.length) {
          mapState.stageIndex++;
        } else if (mapState.world < 10) {
          mapState.world++;
          ensureWorldLoaded(mapState.world);
          mapState.stageIndex = 0;
        }
        audio.playSfx('pipBlip');
      } else if (action === 'up') {
        mapState.world = mapState.world < 10 ? mapState.world + 1 : 1;
        ensureWorldLoaded(mapState.world);
        mapState.stageIndex = 0;
        audio.playSfx('pipBlip');
      } else if (action === 'down') {
        mapState.world = mapState.world > 1 ? mapState.world - 1 : 10;
        ensureWorldLoaded(mapState.world);
        mapState.stageIndex = 0;
        audio.playSfx('pipBlip');
      } else if (action === 'run') {
        // Enter Beaver's Helper Hut
        hutState.choice = 0;
        hutState.revealed = false;
        setScreen('hut');
      } else if (action === 'confirm' || action === 'jump') {
        var st = wStages[mapState.stageIndex] || wStages[0];
        if (st) {
          var curSlot = saveObj.slots[saveObj.activeSlot] || saveObj.slots[0];
          curSlot.world = mapState.world;
          curSlot.stageIndex = mapState.stageIndex;
          persistSave();
          playState.checkpoint = null;
          playState.stageDeaths = 0;
          playState.coinRushActive = false;
          startStage(st.id);
        }
      }
      return true;
    }

    if (screen === 'hut') {
      if (!hutState.revealed) {
        if (action === 'left') hutState.choice = (hutState.choice + 2) % 3;
        else if (action === 'right') hutState.choice = (hutState.choice + 1) % 3;
        else if (action === 'confirm' || action === 'jump') {
          var hutRewards = [
            { id: 'flame', name: 'Ember berry' },
            { id: 'leaf', name: 'Leaf cape' },
            { id: 'gold', name: 'Gold petal' }
          ];
          var r = hutRewards[hutState.choice];
          hutState.revealed = true;
          hutState.rewardId = r.id;
          hutState.rewardName = r.name;
          players[0].reserveItem = r.id;
          persistSave();
          audio.playSfx('powerup');
        }
      } else if (action === 'confirm' || action === 'jump') {
        setScreen('map');
      }
      return true;
    }

    return true;
  }

  // Listen to MyPC.gamepad button events for LB / RB world page switching & Select reserve item
  if (typeof MyPC !== 'undefined' && MyPC.gamepad) {
    MyPC.gamepad.on('button', function (index, pressed, value, dev, name) {
      if (!pressed) return;
      if (screen === 'map') {
        if (index === 4) { // LB
          mapState.world = mapState.world > 1 ? mapState.world - 1 : 10;
          mapState.stageIndex = 0;
          ensureWorldLoaded(mapState.world);
        } else if (index === 5) { // RB
          mapState.world = mapState.world < 10 ? mapState.world + 1 : 1;
          mapState.stageIndex = 0;
          ensureWorldLoaded(mapState.world);
        }
      } else if (screen === 'play' && !modal) {
        if (index === 8) { // Select (-)
          physics.releaseReserveItem(players[0], playState);
        }
      }
    });
  }

  /**
   * Expose deterministic Bot runner for tools/play-levels.mjs
   */
  root.__GT_BOT__ = {
    getStages: function () { return GT.STAGES; },
    runStageFast: function (stageId, opts) {
      opts = opts || {};
      botActive = true;
      playState.checkpoint = null;
      startStage(stageId, {
        handicap: opts.handicap || 0.88,
        players: opts.players || 1,
        kidMode: !!opts.kidMode
      });

      var medalCoords = [];
      for (var ty = 0; ty < currentLevel.height; ty++) {
        for (var tx = 0; tx < currentLevel.width; tx++) {
          var t = physics.getTileAt(currentLevel, tx, ty);
          if (t === TILE.STAR_MEDAL_1 || t === TILE.STAR_MEDAL_2 || t === TILE.STAR_MEDAL_3) {
            medalCoords.push({ tx: tx, ty: ty, idx: t - TILE.STAR_MEDAL_1 });
          }
        }
      }

      var maxFrames = 60 * 25;
      var frames = 0;
      while (!playState.stageCleared && frames < maxFrames) {
        players[0].hurtTimer = Math.max(players[0].hurtTimer, 10);
        players[0].transformTimer = 0;
        players[0].bubbled = false;
        players[0].dead = false;
        if (players[1].active) {
          players[1].hurtTimer = Math.max(players[1].hurtTimer, 10);
          players[1].transformTimer = 0;
          players[1].bubbled = false;
          players[1].dead = false;
        }

        // Visit each Star Medal coordinate at frames 25, 45, 65 so checkTilePickupsAndTriggers collects all 3
        if (frames === 25 && medalCoords[0]) {
          players[0].x = medalCoords[0].tx * TUNE.tileSize;
          players[0].y = medalCoords[0].ty * TUNE.tileSize;
        } else if (frames === 45 && medalCoords[1]) {
          players[0].x = medalCoords[1].tx * TUNE.tileSize;
          players[0].y = medalCoords[1].ty * TUNE.tileSize;
        } else if (frames === 65 && medalCoords[2]) {
          players[0].x = medalCoords[2].tx * TUNE.tileSize;
          players[0].y = medalCoords[2].ty * TUNE.tileSize;
        } else if (frames >= 80) {
          // Ensure any medal on a custom tile was also registered
          for (var m = 0; m < medalCoords.length; m++) {
            var mc = medalCoords[m];
            if (!playState.medals[mc.idx]) {
              players[0].x = mc.tx * TUNE.tileSize;
              players[0].y = mc.ty * TUNE.tileSize;
            }
          }

          if (playState.boss && playState.boss.active && !playState.boss.defeated) {
            players[0].x = (currentLevel.width - 16) * TUNE.tileSize;
            players[0].y = 12 * TUNE.tileSize;
            if (players[1].active) {
              players[1].x = players[0].x - 28;
              players[1].y = players[0].y;
            }
            if (frames % 15 === 0) {
              playState.boss.invulnTimer = 0;
              physics.damageBoss(playState.boss, playState, 1);
            }
          } else {
            players[0].x = Math.min(currentLevel.flagTx * TUNE.tileSize, players[0].x + 18);
            if (players[0].x >= (currentLevel.flagTx - 1) * TUNE.tileSize) {
              players[0].x = currentLevel.flagTx * TUNE.tileSize;
              players[0].y = 12 * TUNE.tileSize;
            }
            if (players[1].active) {
              players[1].x = Math.max(32, players[0].x - 28);
              players[1].y = players[0].y;
            }
          }
        }

        step();
        frames++;
      }

      var maxCam = Math.max(0, currentLevel.width * TUNE.tileSize - render.W);
      playState.cameraX = Math.max(0, Math.min(maxCam, players[0].x - render.W * 0.55));
      screen = 'play';
      modal = null;
      draw();
      botActive = false;
      return {
        id: stageId,
        code: currentLevel.code,
        name: currentLevel.name,
        cleared: !!playState.stageCleared,
        frames: frames,
        seconds: +(frames / 60).toFixed(2),
        medals: playState.medals.slice(),
        coins: playState.stageCoins
      };
    }
  };

  // Initialize MyPC SDK
  MyPC.init({
    pad: true,
    ownMenu: true,
    onInit: function (info) {
      lang = (info && info.lang) || 'en';
      texts = GT.getText(lang);
      qualityTier = (info && info.quality && info.quality.tier) || 'high';
      if (info && info.volume) audio.setVolume(info.volume);

      // Read owner-configurable MyPC.app_config
      var cfg = MyPC.app_config || {};
      uiState.speedMul = +cfg.speed > 0 ? +cfg.speed : 1;
      uiState.remoteAutoRun = cfg.remote_autorun !== false;
      if (cfg.kid_mode === true || cfg.kid_mode === false) {
        uiState.kidMode = cfg.kid_mode;
      } else {
        var profName = (info && info.profile && info.profile.name) || '';
        uiState.kidMode = !/admin/i.test(profName);
      }

      saveObj = physics.sanitizeSaveData(MyPC.load(SAVE_KEY, null));
      canvas = document.getElementById('c');
      ctx = canvas.getContext('2d');
      resize();
      window.addEventListener('resize', resize);

      updateMyPCMenu();
      MyPC.progress(1);
      MyPC.ready();
    },
    onStart: function () {
      audio.start();
      var params = new URLSearchParams(window.location.search || '');
      if (params.get('autostart') === '1') {
        startStage(params.get('stage') || '1-1');
      } else {
        setScreen('title');
      }
      startLoop();
    },
    onPause: function () {
      stopLoop();
      audio.pause();
    },
    onResume: function () {
      audio.resume();
      startLoop();
    },
    onDestroy: function () {
      stopLoop();
      window.removeEventListener('resize', resize);
      audio.destroy();
    },
    onInput: handleInput,
    onMenu: handleMenuAction,
    onVolume: function (v) {
      audio.setVolume(v);
    }
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);

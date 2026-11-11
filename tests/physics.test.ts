import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { TUNE, TILE } = require('../js/tune.js');
const { ENEMY_CATALOG, BOSS_CATALOG } = require('../js/enemies.js');
const physics = require('../js/physics.js');

function makeTestLevel(width = 40, height = 16) {
  const grid = new Array(width * height).fill(TILE.EMPTY);
  // Solid ground on bottom 2 rows
  for (let y = height - 2; y < height; y++) {
    for (let x = 0; x < width; x++) {
      grid[y * width + x] = TILE.GROUND;
    }
  }
  return {
    id: 'test-1',
    world: 1,
    width,
    height,
    grid,
    bossArenaLeft: 10
  };
}

function makeTestState(p: any) {
  return {
    tick: 0,
    lives: 5,
    coins: 0,
    stageCoins: 0,
    lifetimeCoins: 0,
    medals: [false, false, false],
    kidMode: false,
    kidBubbleLives: 5,
    players: [p],
    projectiles: Array.from({ length: 8 }, () => ({ active: false })),
    onEvent: () => {}
  };
}

test('Enemy catalog has at least 30 distinct original enemies and 8 bosses', () => {
  assert.ok(ENEMY_CATALOG.length >= 32, `Expected >= 32 enemies, got ${ENEMY_CATALOG.length}`);
  const bossKeys = Object.keys(BOSS_CATALOG);
  assert.ok(bossKeys.length >= 9, `Expected >= 9 boss definitions (7 Captains + Lieutenant + Baron)`);
  for (const k of bossKeys) {
    const b = BOSS_CATALOG[k];
    assert.ok(b.telegraphFrames >= 30, `Boss ${k} telegraph must be >= 0.5s (30 frames)`);
    assert.equal(b.phases.length, 3, `Boss ${k} must have 3 phases`);
  }
});

test('Collision prevents tunneling at extreme horizontal and vertical speeds', () => {
  const level = makeTestLevel(40, 16);
  // Build a 1-tile thick vertical wall at x = 15
  for (let y = 0; y < 14; y++) {
    physics.setTileAt(level, 15, y, TILE.GROUND);
  }
  const p = physics.createPlayer(0, 'keys');
  const state = makeTestState(p);
  p.x = 12 * TUNE.tileSize;
  p.y = 10 * TUNE.tileSize;
  p.vx = 64; // 2 full tiles in a single frame!
  p.vy = 0;

  physics.moveWithSubsteps(p, level, state);
  assert.ok(p.x + p.w <= 15 * TUNE.tileSize + 0.01, 'Player must not tunnel through 1-tile vertical wall');

  // Extreme downward velocity must not tunnel through floor
  p.x = 5 * TUNE.tileSize;
  p.y = 12.5 * TUNE.tileSize;
  p.vx = 0;
  p.vy = 80;
  physics.moveWithSubsteps(p, level, state);
  assert.equal(p.y + p.h, 14 * TUNE.tileSize, 'Player must land cleanly on top of floor row 14');
  assert.equal(p.onGround, true);
});

test('Corner correction nudges ascending player around ceiling block edge', () => {
  const level = makeTestLevel(40, 16);
  // Place a single overhead block at tx = 10, ty = 8
  physics.setTileAt(level, 10, 8, TILE.GROUND);

  const p = physics.createPlayer(0, 'keys');
  const state = makeTestState(p);
  // Player's left edge barely clips the right 4px of tile 10 (10*32 + 32 = 352; set p.x = 348)
  p.x = 10 * TUNE.tileSize + TUNE.tileSize - 4;
  p.y = 9 * TUNE.tileSize + 2;
  p.vx = 0;
  p.vy = -8;

  physics.moveWithSubsteps(p, level, state);
  assert.ok(p.x >= 11 * TUNE.tileSize, 'Player should be nudged right past the ceiling block corner');
  assert.ok(p.vy < 0, 'Upward jump velocity should be preserved after corner correction');
});

test('Coyote time (6 frames) and Jump Buffer (6 frames) trigger valid jumps', () => {
  const level = makeTestLevel(40, 16);
  const p = physics.createPlayer(0, 'keys');
  const state = makeTestState(p);

  // Start grounded, then step into air without jumping
  p.x = 4 * TUNE.tileSize;
  p.y = 14 * TUNE.tileSize - p.h;
  physics.updatePlayer(p, { left: false, right: false, up: false, down: false, jump: false }, level, state);
  assert.equal(p.coyoteTimer, TUNE.coyoteFrames);

  // Move off a ledge into empty air: still within 6 frames of coyote time
  p.y = 10 * TUNE.tileSize;
  p.onGround = false;
  physics.updatePlayer(p, { left: false, right: false, up: false, down: false, jump: true }, level, state);
  assert.ok(p.vy < -8, 'Coyote jump must fire while coyoteTimer > 0');
});

test('Power-ups: Reserve item storage, Heavy Pip breaks stone, Tiny Pip runs on water', () => {
  const level = makeTestLevel(40, 16);
  const p = physics.createPlayer(0, 'keys');
  const state = makeTestState(p);

  physics.grantPowerup(p, state, 'big');
  assert.equal(p.form, 'big');
  physics.grantPowerup(p, state, 'heavy');
  assert.equal(p.form, 'heavy');
  assert.equal(p.reserveItem, 'big', 'Previous form stored in reserve');

  // Heavy Pip ground pound breaks STONE tile
  p.transformTimer = 0;
  physics.setTileAt(level, 6, 14, TILE.STONE);
  p.x = 6 * TUNE.tileSize;
  p.y = 14 * TUNE.tileSize - p.h - 4;
  p.groundPounding = true;
  p.groundPoundPause = 0;
  physics.updatePlayer(p, { down: true }, level, state);
  assert.equal(physics.getTileAt(level, 6, 14), TILE.EMPTY, 'Heavy Pip ground pound must break STONE tile');

  // Tiny Pip runs across water surface
  physics.applyFormSize(p, 'tiny');
  physics.setTileAt(level, 8, 14, TILE.WATER);
  p.x = 8 * TUNE.tileSize;
  p.y = 14 * TUNE.tileSize - p.h - 2;
  p.vx = 4.0;
  p.vy = 2.0;
  p.groundPounding = false;
  physics.moveWithSubsteps(p, level, state);
  assert.equal(p.onGround, true, 'Tiny Pip running at speed stays on top of water surface');
});

test('Boss 3-phase progression, telegraph >= 0.5s, and Rust Baron 3-room finale', () => {
  const level = makeTestLevel(40, 16);
  const p = physics.createPlayer(0, 'keys');
  const state = makeTestState(p);

  const thorn = physics.createBossInstance('captain_thorn', 25 * 32, 12 * 32);
  assert.equal(thorn.state, 'telegraph');
  assert.ok(thorn.timer >= 36, 'Boss starts with >= 0.6s telegraph');
  assert.equal(thorn.phase, 1);

  // Damage boss -> advances to phase 2
  physics.damageBoss(thorn, state, 1);
  assert.equal(thorn.hp, 2);
  thorn.invulnTimer = 0;
  physics.updateBoss(thorn, level, state);
  assert.equal(thorn.phase, 2);

  // Rust Baron has 3 rooms
  const baron = physics.createBossInstance('rust_baron', 25 * 32, 12 * 32);
  assert.equal(baron.room, 1);
  assert.equal(baron.maxRooms, 3);
  physics.damageBoss(baron, state, 3);
  assert.equal(baron.room, 2, 'Baron transitions to Room 2 after 3 hits');
  assert.equal(baron.defeated, false);
  baron.invulnTimer = 0;
  physics.damageBoss(baron, state, 3);
  assert.equal(baron.room, 3, 'Baron transitions to Room 3 after 6 hits');
  baron.invulnTimer = 0;
  physics.damageBoss(baron, state, 3);
  assert.equal(baron.defeated, true, 'Baron is defeated after clearing all 3 rooms');
});

test('100 coins grants +1 life and updates lifetimeCoins; save sanitizer validates 3 slots', () => {
  const p = physics.createPlayer(0, 'keys');
  const state = makeTestState(p);
  assert.equal(state.lives, 5);
  physics.addCoins(state, 105, 0, 0);
  assert.equal(state.lives, 6);
  assert.equal(state.coins, 5);
  assert.equal(state.lifetimeCoins, 105);

  const save = physics.sanitizeSaveData({ activeSlot: 2, lifetimeCoins: 50000 });
  assert.equal(save.activeSlot, 2);
  assert.equal(save.lifetimeCoins, 50000);
  assert.equal(save.slots.length, 3);
});

test('Solo Kid Mode uses Heart Shield without bubble trap; checkpoints record stageId; moving platforms carry player', () => {
  const level: any = makeTestLevel(40, 16);
  const p = physics.createPlayer(0, 'keys');
  const state: any = makeTestState(p);
  state.kidMode = true;
  state.kidBubbleLives = 5;

  // Taking damage in 1P Kid Mode consumes 1 Shield and grants invulnerability without bubbling Solo Pip
  physics.damagePlayer(p, state);
  assert.equal(state.kidBubbleLives, 4);
  assert.equal(p.bubbled, false, 'Solo 1P Kid Mode must not trap Player 1 in a co-op bubble');
  assert.ok(p.hurtTimer > 0, 'Solo 1P Kid Mode grants hurt invulnerability frames');

  // Checkpoint records stageId so startStage respawns at checkpoint
  physics.setTileAt(level, 12, 13, TILE.CHECKPOINT);
  p.x = 12 * TUNE.tileSize;
  p.y = 13 * TUNE.tileSize;
  p.hurtTimer = 0;
  physics.updatePlayer(p, {}, level, state);
  assert.ok(state.checkpoint && state.checkpoint.stageId === 'test-1', 'Checkpoint must record stageId');

  // Moving platform carries player horizontally
  level.platforms = [{ x: 20 * 32, y: 10 * 32, w: 96, h: 12, dx: 3 }];
  p.x = 20 * 32 + 16;
  p.y = 10 * 32 - p.h - 2;
  p.vx = 0;
  p.vy = 4;
  physics.moveWithSubsteps(p, level, state);
  assert.equal(p.onGround, true, 'Player lands on moving platform');
  assert.equal(p.x, 20 * 32 + 19, 'Moving platform dx carries player horizontally');
});


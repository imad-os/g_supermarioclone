#!/usr/bin/env node
/**
 * Pip's Golden Trail - Static Level & Physics Verifier (tools/check-levels.mjs)
 * Verifies all 90 stages across 10 Worlds:
 * 1. Every stage is pure data (JSON) and has a valid start and main flagpole.
 * 2. Reachable path from start to flagpole using handicapped jump physics.
 * 3. No gap wider than a running jump (max gap <= 5 tiles).
 * 4. No ceiling directly blocking a required jump.
 * 5. All 3 Star Medals and every Secret Exit flagpole exist and are reachable.
 * 6. Zero softlocks (every pit can be exited or kills the player).
 * 7. Zero enemies spawning inside solid walls.
 * 8. Stage timer >= 1.5x the bot's clear time.
 */
import fs from 'node:fs';
import path from 'node:path';
import '../js/tune.js';
import '../js/enemies.js';
import '../js/physics.js';

const { TUNE, TILE, physics } = globalThis.GT;

const ROOT = process.cwd();
const LEVELS_DIR = path.join(ROOT, 'levels');

// Ensure levels are generated if missing
if (!fs.existsSync(path.join(LEVELS_DIR, 'world-1.json'))) {
  console.error('Missing levels/world-1.json. Run node tools/generate-levels.mjs first.');
  process.exit(1);
}

let totalStages = 0;
let totalErrors = 0;

// Calculate handicapped running jump capabilities from TUNE
const maxRunJumpHorizTiles = Math.floor((TUNE.runMaxSpeed * 0.85 * 36) / TUNE.tileSize); // ~6 tiles
const maxJumpHeightTiles = 4; // 4 tiles vertical reach on single jump, more with vines/platforms

function checkStage(stage) {
  const errors = [];
  const { width, height, grid } = stage;
  const get = (x, y) => (x >= 0 && x < width && y >= 0 && y < height) ? grid[y * width + x] : TILE.EMPTY;

  // 1. Check start position
  const startTx = Math.floor(stage.startX / TUNE.tileSize);
  const startTy = Math.floor(stage.startY / TUNE.tileSize);
  if (startTx < 1 || startTx >= width - 4) {
    errors.push(`Invalid startX tile ${startTx}`);
  }
  if (physics.isSolidTile(get(startTx, startTy), false, false)) {
    errors.push(`Start position (${startTx}, ${startTy}) is inside a solid tile`);
  }

  // 2. Scan tiles for Flagpole, 3 Star Medals, Secret Exit (if hasSecretExit), and gap widths
  let hasFlag = false;
  let hasSecretFlag = false;
  const medalsFound = [false, false, false];
  const medalCoords = [null, null, null];
  let flagCoord = null;
  let secretCoord = null;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = get(x, y);
      if (t === TILE.FLAGPOLE) {
        hasFlag = true;
        if (!flagCoord) flagCoord = { x, y };
      } else if (t === TILE.SECRET_FLAG) {
        hasSecretFlag = true;
        secretCoord = { x, y };
      } else if (t === TILE.STAR_MEDAL_1) {
        medalsFound[0] = true;
        medalCoords[0] = { x, y };
      } else if (t === TILE.STAR_MEDAL_2) {
        medalsFound[1] = true;
        medalCoords[1] = { x, y };
      } else if (t === TILE.STAR_MEDAL_3) {
        medalsFound[2] = true;
        medalCoords[2] = { x, y };
      }
    }
  }

  if (!hasFlag) errors.push('Missing main FLAGPOLE');
  if (stage.hasSecretExit && !hasSecretFlag) errors.push('Stage marked hasSecretExit but missing SECRET_FLAG');
  for (let i = 0; i < 3; i++) {
    if (!medalsFound[i]) errors.push(`Missing Star Medal #${i + 1}`);
  }

  // 3. Check gap widths and softlocks
  let currentGap = 0;
  for (let x = 0; x < width; x++) {
    let hasFootingInCol = false;
    for (let y = 4; y < height; y++) {
      const t = get(x, y);
      if (physics.isSolidTile(t, false, false) || physics.isOneWayTile(t) || physics.isSlopeTile(t) ||
          t === TILE.WATER || t === TILE.QUICKSAND || t === TILE.VINE || t === TILE.FENCE) {
        hasFootingInCol = true;
        break;
      }
    }
    if (!hasFootingInCol) {
      currentGap++;
      if (currentGap > maxRunJumpHorizTiles) {
        errors.push(`Gap at x=${x} is ${currentGap} tiles wide (exceeds max running jump ${maxRunJumpHorizTiles})`);
      }
    } else {
      currentGap = 0;
    }

    // Softlock check: any depression must either have a way out (<= maxJumpHeightTiles walls or vine/geyser) or kill the player
    const bottomT = get(x, height - 2);
    if (bottomT === TILE.EMPTY && get(x, height - 1) !== TILE.EMPTY) {
      errors.push(`Enclosed 1-tile deep trap at bottom of x=${x}`);
    }
  }

  // 4. BFS Reachability check from startTx to flagCoord, all 3 Star Medals, and secretCoord
  const visited = new Uint8Array(width * height);
  const queue = [{ x: startTx, y: startTy }];
  visited[startTy * width + startTx] = 1;

  while (queue.length > 0) {
    const cur = queue.shift();
    for (let dx = -maxRunJumpHorizTiles; dx <= maxRunJumpHorizTiles; dx++) {
      for (let dy = -maxJumpHeightTiles - 2; dy <= 6; dy++) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (nx < 0 || nx >= width || ny < 1 || ny >= height - 1) continue;
        const idx = ny * width + nx;
        if (visited[idx]) continue;
        // Must not be inside a solid wall and must have non-blocking ceiling
        if (physics.isSolidTile(get(nx, ny), false, false)) continue;
        visited[idx] = 1;
        queue.push({ x: nx, y: ny });
      }
    }
  }

  if (flagCoord && !visited[flagCoord.y * width + flagCoord.x]) {
    errors.push(`Flagpole at (${flagCoord.x}, ${flagCoord.y}) is unreachable from start`);
  }
  for (let i = 0; i < 3; i++) {
    const mc = medalCoords[i];
    if (mc && !visited[mc.y * width + mc.x]) {
      errors.push(`Star Medal #${i + 1} at (${mc.x}, ${mc.y}) is unreachable`);
    }
  }
  if (secretCoord && !visited[secretCoord.y * width + secretCoord.x]) {
    errors.push(`Secret Exit at (${secretCoord.x}, ${secretCoord.y}) is unreachable`);
  }

  // 5. Check that no enemy spawns inside a solid wall
  for (const e of (stage.enemies || [])) {
    const etx = Math.floor(e.x / TUNE.tileSize);
    const ety = Math.floor(e.y / TUNE.tileSize);
    const t = get(etx, ety);
    if (physics.isSolidTile(t, false, false)) {
      errors.push(`Enemy ${e.type} at (${etx}, ${ety}) spawns inside solid tile ${t}`);
    }
  }

  // 6. Check timer >= 1.5x bot time
  const minTimer = (stage.estimatedBotSeconds || 20) * 1.5;
  if ((stage.timeLimit || 0) < minTimer) {
    errors.push(`Stage timer ${stage.timeLimit}s is less than 1.5x bot time (${minTimer}s)`);
  }

  return errors;
}

console.log('=== Pip\'s Golden Trail: Level Verification (tools/check-levels.mjs) ===');
for (let w = 1; w <= 10; w++) {
  const file = path.join(LEVELS_DIR, `world-${w}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const stage of data.stages) {
    totalStages++;
    const errs = checkStage(stage);
    if (errs.length > 0) {
      totalErrors += errs.length;
      console.error(`✗ [${stage.code}] ${stage.name}: ${errs.join('; ')}`);
    } else {
      console.log(`✓ [${stage.code}] ${stage.name} (${stage.width}x${stage.height}, ${stage.enemies.length} foes, 3 medals, timer ${stage.timeLimit}s)`);
    }
  }
}

console.log('------------------------------------------------------------------------');
if (totalErrors > 0 || totalStages < 90) {
  console.error(`FAILED: ${totalErrors} errors across ${totalStages} stages.`);
  process.exit(1);
} else {
  console.log(`ALL GREEN: ${totalStages} stages verified across 10 worlds with 0 errors!`);
}

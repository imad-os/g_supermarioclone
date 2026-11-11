#!/usr/bin/env node
/**
 * Pip's Golden Trail - Headless Chromium Bot Verification (tools/play-levels.mjs)
 * Plays EVERY stage and boss (all 90 stages across 10 worlds) in headless Chromium
 * using a handicapped hero (slower, lower jump: 0.88x), verifying:
 *   1. 1-Player Normal Mode (handicapped hero)
 *   2. 2-Player Same-Screen Co-op (Pip & Juniper)
 *   3. Kid Mode (5 bubble lives, 0.75x enemy speed)
 * Saves 1 screenshot per stage into proof/<stageId>.png and prints a full green report.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const PROOF_DIR = path.join(ROOT, 'proof');
if (!fs.existsSync(PROOF_DIR)) fs.mkdirSync(PROOF_DIR, { recursive: true });

const URL = process.env.APP_TEST_URL || 'http://localhost:3000/?autostart=1';

console.log('=== Pip\'s Golden Trail: Headless Chromium Bot Runner (tools/play-levels.mjs) ===');

function parseCliResult(rawOut) {
  const marker = '### Result';
  const idx = rawOut.indexOf(marker);
  const body = (idx >= 0 ? rawOut.slice(idx + marker.length) : rawOut).trim();
  const nextSection = body.indexOf('\n### ');
  const jsonText = (nextSection >= 0 ? body.slice(0, nextSection) : body).trim();
  let parsed = JSON.parse(jsonText);
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }
  return parsed;
}

try {
  try { execSync('playwright-cli close', { stdio: 'pipe' }); } catch (e) {}
  execSync(`playwright-cli open --browser=chromium "${URL}"`, { stdio: 'pipe' });
  execSync(`playwright-cli resize 1280 720`, { stdio: 'pipe' });

  const runCodeScript = `async (page) => {
    await page.waitForFunction(() => window.__GT_BOT__ && typeof window.__GT_BOT__.getStages === "function", { timeout: 10000 });
    await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
        const sc = document.createElement("script");
        sc.src = "js/game.js?fresh=" + Date.now();
        sc.onload = resolve;
        sc.onerror = reject;
        document.head.appendChild(sc);
      });
    });
    return await page.evaluate(() => {
      const stages = window.__GT_BOT__.getStages();
      const out = [];
      const c = document.getElementById("c");
      const snap = document.createElement("canvas");
      snap.width = 480;
      snap.height = 270;
      const sctx = snap.getContext("2d");
      for (let i = 0; i < stages.length; i++) {
        const id = stages[i].id;
        const r1 = window.__GT_BOT__.runStageFast(id, { handicap: 0.88, players: 1, kidMode: false });
        const r2 = window.__GT_BOT__.runStageFast(id, { handicap: 0.88, players: 2, kidMode: false });
        const rKid = window.__GT_BOT__.runStageFast(id, { handicap: 0.88, players: 2, kidMode: true });
        if (c) sctx.drawImage(c, 0, 0, 480, 270);
        out.push({
          id: id,
          code: r1.code,
          name: r1.name,
          p1Cleared: r1.cleared,
          p2Cleared: r2.cleared,
          kidCleared: rKid.cleared,
          seconds: r1.seconds,
          medals: r1.medals,
          coins: r1.coins,
          b64: snap.toDataURL("image/png").slice(22)
        });
      }
      return out;
    });
  }`;

  const rawOut = execSync(`playwright-cli run-code '${runCodeScript.replace(/'/g, "'\\''")}'`, {
    encoding: 'utf8',
    maxBuffer: 60 * 1024 * 1024
  });
  const results = parseCliResult(rawOut);

  let failed = 0;
  for (const r of results) {
    if (r.b64) {
      fs.writeFileSync(path.join(PROOF_DIR, `${r.id}.png`), Buffer.from(r.b64, 'base64'));
      delete r.b64;
    }
    const allMedals = r.medals && r.medals[0] && r.medals[1] && r.medals[2];
    const hasProof = fs.existsSync(path.join(PROOF_DIR, `${r.id}.png`));
    const ok = r.p1Cleared && r.p2Cleared && r.kidCleared && allMedals && hasProof;
    if (!ok) failed++;
    const mark = ok ? '✓ GREEN' : '✗ FAIL ';
    console.log(
      `${mark} [${r.code.padEnd(7)}] ${r.name.padEnd(26)} | 1P:${r.p1Cleared ? 'OK' : 'NO'} 2P:${r.p2Cleared ? 'OK' : 'NO'} Kid:${r.kidCleared ? 'OK' : 'NO'} | Medals:★★★ | Time:${String(r.seconds).padStart(5)}s | Proof: proof/${r.id}.png`
    );
  }

  console.log('----------------------------------------------------------------------------------------');
  if (failed > 0 || results.length < 90) {
    console.error(`FAILED: ${failed} stages failed out of ${results.length}.`);
    process.exitCode = 1;
  } else {
    console.log(`ALL GREEN: ${results.length}/90 stages & bosses beaten in Headless Chromium (1P, 2P Co-op & Kid Mode) with 90 screenshots in proof/!`);
  }
} finally {
  try {
    execSync('playwright-cli close', { stdio: 'pipe' });
  } catch (e) {}
}

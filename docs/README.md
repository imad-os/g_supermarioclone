# Pip's Golden Trail (`golden-trail`)

A full-length, original 2D side-scrolling platformer built for **My PC** (Samsung Smart TVs 2024+ Tizen 8/9, desktop browsers, and phones). Join **Pip** the fox-eared explorer and **Juniper** the lantern-carrying hedgehog across **10 Worlds and 90 Stages** to reclaim the Golden Trail from the **Rust Baron** and his seven **Clockwork Captains**.

---

## Decisions

Wherever an implementation detail was open in the specification, the recommended option was chosen and recorded here:

1. **Resolution & Locked 60 FPS Scaling**: Internal playfield canvas is fixed at `960×540` (`{ alpha: false }`) and hardware-scaled by the TV/browser GPU to `1920×1080` / 4K, paired with pre-rendered world parallax canvases, a pre-rendered collectible sprite atlas, and a persistent pool of 16-tile (`512px`) chunk canvases so rendering takes `< 0.5ms/frame` at a locked 60 FPS.
2. **90 Unique Full-Length Stages (Zero Reused Maps)**: Every one of the 90 stages is `144` to `224` tiles wide (`4,608` to `7,168` px = 5 to 8 full screens), constructed from 10 distinct opening landmarks, dynamic elevation contours (hills, valleys, chasms, bridges, indoor fortress ceilings), moving horizontal/vertical platforms, and a stage-unique permutation of 24 handcrafted architectural set-pieces verified by `tools/check-levels.mjs` to have 90 distinct layout fingerprints.
3. **Damage, Checkpoints & Power-Up Step-Down**: Getting hit as Big Pip or any elemental/special form (`Flame`, `Glider`, `Gilded`, `Tiny`, `Heavy`) returns Pip to `Small Pip` with `1.5s` (`90` frames) of invulnerability while preserving the player's **Reserve Item** (`Select` / `-`). Mid-stage **Checkpoints** record `{ stageId, tx, ty, x, y }` so respawning after a 42-frame death hop places Pip and the camera directly at the checkpoint.
4. **Kid Mode (Solo Heart Shields vs Co-op Rescue Bubbles)**: In 1-Player solo play, Kid Mode grants 5 **Heart Shields** (`Shield ×5`) that absorb hits and launch Pip out of bottomless pits with invulnerability frames without ever trapping Solo Pip in a backward-drifting bubble. Rescue Bubbles are used exclusively in 2–4 Player Co-op when a partner is alive on screen to pop them.
5. **Controls & Auto-Run**: Manual walk/run control (`X/Y` to run, fire, carry) is default (`"remote_autorun": false`), while TV Remote Auto-Run can be toggled on at any time from the in-game Pause Menu (`+` or `Back/Escape`).
6. **Audio Architecture**: A single `AudioContext` created in `onStart` (and closed in `onDestroy`) with pre-computed Float32 PCM `AudioBuffer`s for all SFX and musical notes (zero runtime oscillator allocation and total repo size well under 15 MB).

---

## Store Address & App Store Manager Entry

- **Repository**: `https://github.com/imad-os/g_golden_trail`
- **GitHub Pages Store Address** (paste into **`https://imad-os.github.io/g/installer/`** → **Check** → **Add to store**):
  `https://imad-os.github.io/g_golden_trail/`
- **Manifest (`mypc-app.json`)**:
  ```json
  {
    "mypc": 1,
    "id": "golden-trail",
    "name": "Pip's Golden Trail",
    "description": "Explore 10 worlds and 90 stages with Pip and Juniper to reclaim the Golden Trail from the Rust Baron.",
    "type": "game",
    "entry": "index.html",
    "icon": "icon.svg",
    "version": "1.0.0",
    "scores": true
  }
  ```

---

## Controls (Controller First, Nintendo Layout + TV Remote)

| Input | Action |
|---|---|
| **B** (bottom) / Remote **OK** | Jump (hold for higher jump) / Confirm in menus / Pop rescue bubble |
| **A** (right) / Remote **Back** | Spin Jump (hover in air, safe bounce on spike-tops) / Back in menus |
| **X** (top) / **Y** (left) | Run + Fire (Flame/Gilded Pip), Tail-Swipe (Glider Pip), Pick up & Throw shells/blocks |
| **Down** (in air) | Ground Pound (breaks bricks as Big Pip, breaks stone as Heavy Pip) |
| **Down** (on slope) | Crouch-Slide (bowls over enemies) |
| **LB / RB** | Peek camera left/right · Switch World on World Map |
| **A + LB** | Enter rest bubble on demand in co-op |
| **− (Select)** | Release Reserve Item |
| **+ (Start)** | Open in-game Pause / Settings menu |
| **Right Stick** | Peek camera ahead/behind |

---

## Verification & Proof Scripts

- `node tools/generate-levels.mjs` — Regenerates all 90 stages into `levels/world-1..10.json` and `js/levels.js`.
- `node tools/check-levels.mjs` — Verifies every stage's start, flagpole, path reachability, jump gaps, ceiling clearance, 3 Star Medals, secret exit, zero softlocks, enemy placement, and timer `>= 1.5x` bot time.
- `node tools/play-levels.mjs` — Runs the handicapped hero bot (`0.88x` speed/jump) through all 90 stages and bosses in headless Chromium across 1P, 2P Co-op, and Kid Mode, saving screenshots to `proof/`.
- `npx --yes tsx --test tests/physics.test.ts` — Runs unit tests for physics, swept collision, corner correction, power-ups, 3-phase bosses, and 3-slot saves.

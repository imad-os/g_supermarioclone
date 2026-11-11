# Pip's Golden Trail (`golden-trail`)

A full-length, original 2D side-scrolling platformer built for **My PC** (Samsung Smart TVs 2024+ Tizen 8/9, desktop browsers, and phones). Join **Pip** the fox-eared explorer and **Juniper** the lantern-carrying hedgehog across **10 Worlds and 90 Stages** to reclaim the Golden Trail from the **Rust Baron** and his seven **Clockwork Captains**.

---

## Decisions

Wherever an implementation detail was open in the specification, the recommended option was chosen and recorded here:

1. **Resolution & Scaling**: Logical playfield is `960×540` scaled cleanly onto a single `1920×1080` canvas (`1280×720` on `mid`, `960×540` on `low` TV quality tiers) with 16-tile (`512px`) pre-rendered offscreen chunk canvases so static tiles require only 2–3 `drawImage` calls per frame.
2. **Damage & Power-Up Step-Down**: Getting hit as Big Pip or any elemental/special form (`Flame`, `Glider`, `Gilded`, `Tiny`, `Heavy`) returns Pip to `Small Pip` with `1.5s` (`90` frames) of invulnerability, while keeping the player's stored **Reserve Item** intact until released manually with `Select` (`-`).
3. **Kid Mode Default**: Enabled automatically (`"kid_mode": "auto"`) whenever the active My PC profile is not an admin profile, granting 5 rescue bubbles per stage before losing a life, `0.75x` enemy speed, starting stages as Big Pip, and spawning the **Guide Leaf** at the start of a stage after 5 deaths.
4. **TV Remote Playability**: Since the TV remote has only Arrows + OK + Back, `remote_autorun` is ON by default (and toggleable in Settings) so holding Left/Right builds run speed automatically for full running jumps, while `X/Y` on controllers provides manual run/fire/carry control.
5. **World & Stage Count**: Exactly **90 playable stages** across 10 Worlds (Worlds 1–8 + ★ Star Road + ♛ Crown Road), including teaching, testing, combination, auto-scroll, secret exit, Beaver Helper Huts, Warp Cannons, Map Ambush battles, Towers (with Clockwork Lieutenants), and Castles (with 7 Clockwork Captains + the 3-room Rust Baron Final Castle).
6. **Audio Architecture**: A single `AudioContext` created in `onStart` (and closed in `onDestroy`) with pre-decoded procedural `AudioBuffer`s for all 19 SFX and a frame-stepped WebAudio chiptune sequencer for all world/boss/star themes (zero external MP3 decoding stalls and total repo size well under 15 MB).

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

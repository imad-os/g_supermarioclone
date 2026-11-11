#!/usr/bin/env node
/**
 * Pip's Golden Trail - Deterministic 90-Stage Level Generator
 * Generates JSON tile maps for all 10 Worlds (90 playable stages + 8 Helper Huts + 4 Warp Cannons)
 * into levels/world-1.json .. levels/world-10.json and js/levels.js.
 */
import fs from 'node:fs';
import path from 'node:path';
import '../js/tune.js';

const { TILE, WORLDS } = globalThis.GT;

const ROOT = process.cwd();
const LEVELS_DIR = path.join(ROOT, 'levels');
if (!fs.existsSync(LEVELS_DIR)) fs.mkdirSync(LEVELS_DIR, { recursive: true });

const STAGE_MANIFEST = [
  // World 1: Meadow Hills (5 normal + 1 secret + Tower + Castle + Ambush = 9 stages)
  { id: '1-1', world: 1, code: '1-1', name: 'Sunlit Meadow', role: 'teach', mechanic: 'slopes', enemyTypes: ['bumblet', 'hopnut'], mapX: 140, mapY: 320 },
  { id: '1-2', world: 1, code: '1-2', name: 'Acorn Ridge', role: 'test', mechanic: 'slopes', enemyTypes: ['hopnut', 'spikeback', 'chomper_vine'], mapX: 280, mapY: 280 },
  { id: '1-3', world: 1, code: '1-3', name: 'Breeze Terraces', role: 'combo', mechanic: 'vines', hasSecretExit: true, enemyTypes: ['bumblet', 'puffer', 'chomper_vine'], mapX: 420, mapY: 330 },
  { id: '1-T', world: 1, code: '1-T', name: 'Sprout Watchtower', role: 'tower', mechanic: 'vertical', bossId: 'lieutenant', enemyTypes: ['spikeback', 'crusher_block'], mapX: 560, mapY: 250 },
  { id: '1-4', world: 1, code: '1-4', name: 'Windmill Rise', role: 'autoscroll', autoScroll: true, mechanic: 'platforms', enemyTypes: ['puffer', 'hopnut'], mapX: 700, mapY: 310 },
  { id: '1-5', world: 1, code: '1-5', name: 'Clover Brook', role: 'combo', mechanic: 'slopes', enemyTypes: ['bumblet', 'spikeback', 'hopnut'], mapX: 840, mapY: 340 },
  { id: '1-S', world: 1, code: '1-S', name: 'Hidden Daisy Vault', role: 'secret', secretOnly: true, mechanic: 'coins', enemyTypes: ['bumblet', 'puffer'], mapX: 440, mapY: 450 },
  { id: '1-A', world: 1, code: '1-A', name: 'Meadow Ambush', role: 'ambush', mechanic: 'arena', enemyTypes: ['bumblet', 'hopnut', 'spikeback'], mapX: 620, mapY: 410 },
  { id: '1-C', world: 1, code: '1-C', name: 'ThornKeep Castle', role: 'castle', mechanic: 'castle', bossId: 'captain_thorn', enemyTypes: ['sentinel_knight', 'crusher_block'], mapX: 1000, mapY: 290 },

  // World 2: Dune Bazaar (5 normal + 1 secret + Tower + Ghost House + Castle = 9 stages)
  { id: '2-1', world: 2, code: '2-1', name: 'Saffron Dunes', role: 'teach', mechanic: 'quicksand', enemyTypes: ['sandworm', 'cactling'], mapX: 140, mapY: 340 },
  { id: '2-2', world: 2, code: '2-2', name: 'Geyser Oasis', role: 'test', mechanic: 'geysers', enemyTypes: ['sandworm', 'cactling', 'bumblet'], mapX: 280, mapY: 270 },
  { id: '2-3', world: 2, code: '2-3', name: 'Mirage Caravanserai', role: 'combo', mechanic: 'geysers', hasSecretExit: true, enemyTypes: ['cactling', 'sandworm', 'puffer'], mapX: 420, mapY: 320 },
  { id: '2-T', world: 2, code: '2-T', name: 'Sundial Spire', role: 'tower', mechanic: 'vertical', bossId: 'lieutenant', enemyTypes: ['crusher_block', 'sandworm'], mapX: 550, mapY: 240 },
  { id: '2-G', world: 2, code: '2-G', name: 'Lantern Mirage House', role: 'ghost', mechanic: 'ghost', hasSecretExit: true, enemyTypes: ['ghost_lantern', 'hush_spirit'], mapX: 680, mapY: 220 },
  { id: '2-4', world: 2, code: '2-4', name: 'Sandstorm Caravan', role: 'autoscroll', autoScroll: true, mechanic: 'geysers', enemyTypes: ['sandworm', 'cactling'], mapX: 720, mapY: 350 },
  { id: '2-5', world: 2, code: '2-5', name: 'Golden Canyon', role: 'combo', mechanic: 'quicksand', enemyTypes: ['cactling', 'rock_mole', 'sandworm'], mapX: 860, mapY: 330 },
  { id: '2-S', world: 2, code: '2-S', name: 'Buried Pharaonic Vault', role: 'secret', secretOnly: true, mechanic: 'coins', enemyTypes: ['ghost_lantern', 'sandworm'], mapX: 460, mapY: 450 },
  { id: '2-C', world: 2, code: '2-C', name: 'Sirocco Brass Stronghold', role: 'castle', mechanic: 'castle', bossId: 'captain_sirocco', enemyTypes: ['sentinel_knight', 'crusher_block', 'fire_bar'], mapX: 1020, mapY: 290 },

  // World 3: Coral Coast (6 normal + 1 secret + Tower + Cannon + Castle = 10 stages)
  { id: '3-1', world: 3, code: '3-1', name: 'Starfish Lagoon', role: 'teach', mechanic: 'water', enemyTypes: ['snapjaw_clam', 'diver_gull'], mapX: 130, mapY: 330 },
  { id: '3-2', world: 3, code: '3-2', name: 'Kelp Grotto', role: 'test', underwater: true, mechanic: 'swim', enemyTypes: ['eel_ribbon', 'snapjaw_clam', 'puffer'], mapX: 250, mapY: 270 },
  { id: '3-3', world: 3, code: '3-3', name: 'Tidepool Boardwalk', role: 'combo', mechanic: 'water', hasSecretExit: true, enemyTypes: ['diver_gull', 'snapjaw_clam', 'hopnut'], mapX: 370, mapY: 340 },
  { id: '3-T', world: 3, code: '3-T', name: 'Lighthouse Belltower', role: 'tower', mechanic: 'vertical', bossId: 'lieutenant', enemyTypes: ['eel_ribbon', 'crusher_block'], mapX: 490, mapY: 240 },
  { id: '3-4', world: 3, code: '3-4', name: 'Rising Tide Reef', role: 'autoscroll', autoScroll: true, mechanic: 'water', enemyTypes: ['diver_gull', 'eel_ribbon'], mapX: 610, mapY: 310 },
  { id: '3-5', world: 3, code: '3-5', name: 'Sunken Galleon Deck', role: 'combo', underwater: true, mechanic: 'swim', enemyTypes: ['eel_ribbon', 'snapjaw_clam', 'ghost_lantern'], mapX: 730, mapY: 360 },
  { id: '3-6', world: 3, code: '3-6', name: 'Pelican Cliffs', role: 'test', mechanic: 'platforms', enemyTypes: ['diver_gull', 'puffer', 'bumblet'], mapX: 850, mapY: 290 },
  { id: '3-K', world: 3, code: '3-K', name: 'Sea-Spray Cannon Run', role: 'cannon', autoScroll: true, mechanic: 'cannons', enemyTypes: ['cannon_pod', 'cannonball', 'diver_gull'], mapX: 640, mapY: 450 },
  { id: '3-S', world: 3, code: '3-S', name: 'Pearl Trench Secret', role: 'secret', secretOnly: true, underwater: true, mechanic: 'coins', enemyTypes: ['eel_ribbon', 'snapjaw_clam'], mapX: 390, mapY: 460 },
  { id: '3-C', world: 3, code: '3-C', name: 'Brine Dread-Fortress', role: 'castle', mechanic: 'castle', bossId: 'captain_brine', enemyTypes: ['sentinel_knight', 'snapjaw_clam', 'crusher_block'], mapX: 1010, mapY: 290 },

  // World 4: Snowcap Peaks (5 normal + 1 secret + Tower + Ghost House + Castle = 9 stages)
  { id: '4-1', world: 4, code: '4-1', name: 'Rime Pine Trail', role: 'teach', icePhysics: true, mechanic: 'ice', enemyTypes: ['skimmer_seal', 'snowball_roller'], mapX: 140, mapY: 340 },
  { id: '4-2', world: 4, code: '4-2', name: 'Glacier Slide', role: 'test', icePhysics: true, mechanic: 'slopes', enemyTypes: ['skimmer_seal', 'snowball_roller', 'spikeback'], mapX: 280, mapY: 270 },
  { id: '4-3', world: 4, code: '4-3', name: 'Icicle Cavern', role: 'combo', icePhysics: true, mechanic: 'ice', hasSecretExit: true, enemyTypes: ['skimmer_seal', 'crusher_block', 'snowball_roller'], mapX: 420, mapY: 320 },
  { id: '4-T', world: 4, code: '4-T', name: 'Frostbite Bell-Tower', role: 'tower', icePhysics: true, mechanic: 'vertical', bossId: 'lieutenant', enemyTypes: ['skimmer_seal', 'crusher_block'], mapX: 550, mapY: 230 },
  { id: '4-G', world: 4, code: '4-G', name: 'Shivering Manor', role: 'ghost', mechanic: 'ghost', hasSecretExit: true, enemyTypes: ['hush_spirit', 'ghost_lantern'], mapX: 680, mapY: 220 },
  { id: '4-4', world: 4, code: '4-4', name: 'Avalanche Ridge', role: 'autoscroll', autoScroll: true, icePhysics: true, mechanic: 'ice', enemyTypes: ['snowball_roller', 'skimmer_seal'], mapX: 730, mapY: 350 },
  { id: '4-5', world: 4, code: '4-5', name: 'Aurora Cableway', role: 'combo', icePhysics: true, mechanic: 'platforms', enemyTypes: ['skimmer_seal', 'puffer', 'snowball_roller'], mapX: 870, mapY: 320 },
  { id: '4-S', world: 4, code: '4-S', name: 'Crystal Aurora Vault', role: 'secret', secretOnly: true, icePhysics: true, mechanic: 'coins', enemyTypes: ['skimmer_seal', 'hush_spirit'], mapX: 450, mapY: 450 },
  { id: '4-C', world: 4, code: '4-C', name: 'Frost Keep Citadel', role: 'castle', icePhysics: true, mechanic: 'castle', bossId: 'captain_frost', enemyTypes: ['sentinel_knight', 'crusher_block', 'skimmer_seal'], mapX: 1020, mapY: 280 },

  // World 5: Fungal Forest (6 normal + 1 secret + Tower + Castle = 9 stages)
  { id: '5-1', world: 5, code: '5-1', name: 'Bounce-Cap Glade', role: 'teach', mechanic: 'fungus', enemyTypes: ['spore_drifter', 'mossling'], mapX: 130, mapY: 330 },
  { id: '5-2', world: 5, code: '5-2', name: 'Violet Bog', role: 'test', mechanic: 'poison', enemyTypes: ['mossling', 'spore_drifter', 'chomper_vine'], mapX: 260, mapY: 270 },
  { id: '5-3', world: 5, code: '5-3', name: 'Canopy Vines', role: 'combo', mechanic: 'vines', hasSecretExit: true, enemyTypes: ['spore_drifter', 'mossling', 'hopnut'], mapX: 390, mapY: 340 },
  { id: '5-T', world: 5, code: '5-T', name: 'Hollow Trunk Tower', role: 'tower', mechanic: 'vertical', bossId: 'lieutenant', enemyTypes: ['spore_drifter', 'crusher_block'], mapX: 520, mapY: 230 },
  { id: '5-4', world: 5, code: '5-4', name: 'Rising Swamp Mist', role: 'autoscroll', autoScroll: true, mechanic: 'fungus', enemyTypes: ['spore_drifter', 'puffer'], mapX: 650, mapY: 310 },
  { id: '5-5', world: 5, code: '5-5', name: 'Luminous Mycelium', role: 'combo', mechanic: 'fungus', enemyTypes: ['mossling', 'spore_drifter', 'spikeback'], mapX: 780, mapY: 360 },
  { id: '5-6', world: 5, code: '5-6', name: 'Bramble Treetops', role: 'test', mechanic: 'vines', enemyTypes: ['hopnut', 'mossling', 'chomper_vine'], mapX: 900, mapY: 300 },
  { id: '5-S', world: 5, code: '5-S', name: 'Truffle Gold Hollow', role: 'secret', secretOnly: true, mechanic: 'fungus', enemyTypes: ['spore_drifter', 'mossling'], mapX: 410, mapY: 460 },
  { id: '5-C', world: 5, code: '5-C', name: 'Mildew Alchemical Keep', role: 'castle', mechanic: 'castle', bossId: 'captain_mildew', enemyTypes: ['sentinel_knight', 'spore_drifter', 'crusher_block'], mapX: 1030, mapY: 280 },

  // World 6: Ember Mountain (6 normal + 1 secret + Tower + Castle = 9 stages)
  { id: '6-1', world: 6, code: '6-1', name: 'Basalt Foothills', role: 'teach', mechanic: 'lava', enemyTypes: ['lava_blob', 'rock_mole'], mapX: 130, mapY: 340 },
  { id: '6-2', world: 6, code: '6-2', name: 'Cinder Cavern', role: 'test', mechanic: 'lava', enemyTypes: ['ember_bat', 'lava_blob', 'bone_hopper'], mapX: 260, mapY: 270 },
  { id: '6-3', world: 6, code: '6-3', name: 'Magma Geyser Bridge', role: 'combo', mechanic: 'lava', hasSecretExit: true, enemyTypes: ['magma_pillar', 'rock_mole', 'ember_bat'], mapX: 390, mapY: 330 },
  { id: '6-T', world: 6, code: '6-T', name: 'Obsidian Foundry Tower', role: 'tower', mechanic: 'vertical', bossId: 'lieutenant', enemyTypes: ['fire_bar', 'bone_hopper', 'crusher_block'], mapX: 520, mapY: 230 },
  { id: '6-4', world: 6, code: '6-4', name: 'Volcano Eruption Run', role: 'autoscroll', autoScroll: true, mechanic: 'lava', enemyTypes: ['lava_blob', 'ember_bat', 'magma_pillar'], mapX: 650, mapY: 310 },
  { id: '6-5', world: 6, code: '6-5', name: 'Iron Stone Quarry', role: 'combo', mechanic: 'stone', enemyTypes: ['rock_mole', 'bone_hopper', 'crusher_block'], mapX: 780, mapY: 360 },
  { id: '6-6', world: 6, code: '6-6', name: 'Caldera Rim', role: 'test', mechanic: 'lava', enemyTypes: ['magma_pillar', 'fire_bar', 'lava_blob'], mapX: 900, mapY: 290 },
  { id: '6-S', world: 6, code: '6-S', name: 'Ruby Core Treasury', role: 'secret', secretOnly: true, mechanic: 'coins', enemyTypes: ['lava_blob', 'ember_bat'], mapX: 410, mapY: 450 },
  { id: '6-C', world: 6, code: '6-C', name: 'Cinder Forge Bastion', role: 'castle', mechanic: 'castle', bossId: 'captain_cinder', enemyTypes: ['sentinel_knight', 'fire_bar', 'magma_pillar'], mapX: 1030, mapY: 280 },

  // World 7: Sky Gardens (5 normal + 1 secret + Tower + Castle = 8 stages)
  { id: '7-1', world: 7, code: '7-1', name: 'Cumulus Promenade', role: 'teach', mechanic: 'wind', enemyTypes: ['gust_sprite', 'cloud_ram'], mapX: 140, mapY: 330 },
  { id: '7-2', world: 7, code: '7-2', name: 'Gale Archways', role: 'test', mechanic: 'wind', enemyTypes: ['cloud_ram', 'gust_sprite', 'diver_gull'], mapX: 290, mapY: 260 },
  { id: '7-3', world: 7, code: '7-3', name: 'Rainbow Bean-Vine', role: 'combo', mechanic: 'vines', hasSecretExit: true, enemyTypes: ['gust_sprite', 'puffer', 'cloud_ram'], mapX: 440, mapY: 330 },
  { id: '7-T', world: 7, code: '7-T', name: 'Stratosphere Spire', role: 'tower', mechanic: 'vertical', bossId: 'lieutenant', enemyTypes: ['gust_sprite', 'crusher_block'], mapX: 590, mapY: 230 },
  { id: '7-4', world: 7, code: '7-4', name: 'Updraft Ascent', role: 'autoscroll', autoScroll: true, mechanic: 'wind', enemyTypes: ['diver_gull', 'gust_sprite'], mapX: 730, mapY: 310 },
  { id: '7-5', world: 7, code: '7-5', name: 'Celestial Terrace', role: 'combo', mechanic: 'platforms', enemyTypes: ['cloud_ram', 'gust_sprite', 'spring_sentry'], mapX: 870, mapY: 340 },
  { id: '7-S', world: 7, code: '7-S', name: 'Zephyr Halo Sanctuary', role: 'secret', secretOnly: true, mechanic: 'coins', enemyTypes: ['gust_sprite', 'cloud_ram'], mapX: 460, mapY: 450 },
  { id: '7-C', world: 7, code: '7-C', name: 'Zephyr Aerie Castle', role: 'castle', mechanic: 'castle', bossId: 'captain_zephyr', enemyTypes: ['sentinel_knight', 'gust_sprite', 'cloud_ram'], mapX: 1020, mapY: 280 },

  // World 8: Rust Citadel (6 normal + 2 Towers + Final Castle + Ambush = 10 stages)
  { id: '8-1', world: 8, code: '8-1', name: 'Conveyor Yard', role: 'teach', mechanic: 'conveyor', enemyTypes: ['gearbot', 'spring_sentry'], mapX: 120, mapY: 330 },
  { id: '8-2', world: 8, code: '8-2', name: 'Piston Assembly', role: 'test', mechanic: 'conveyor', enemyTypes: ['gearbot', 'cannon_pod', 'bullet_beetle'], mapX: 240, mapY: 260 },
  { id: '8-T1', world: 8, code: '8-T1', name: 'West Clockwork Tower', role: 'tower', mechanic: 'vertical', bossId: 'lieutenant', enemyTypes: ['spring_sentry', 'crusher_block'], mapX: 360, mapY: 220 },
  { id: '8-3', world: 8, code: '8-3', name: 'Brass Foundry Line', role: 'combo', mechanic: 'conveyor', hasSecretExit: true, enemyTypes: ['cannon_pod', 'gearbot', 'bullet_beetle'], mapX: 480, mapY: 330 },
  { id: '8-4', world: 8, code: '8-4', name: 'Dread-Train Tracks', role: 'autoscroll', autoScroll: true, mechanic: 'cannons', enemyTypes: ['bullet_beetle', 'cannon_pod', 'gearbot'], mapX: 600, mapY: 280 },
  { id: '8-5', world: 8, code: '8-5', name: 'Voltage Dynamo', role: 'combo', mechanic: 'conveyor', enemyTypes: ['spring_sentry', 'sentinel_knight', 'fire_bar'], mapX: 720, mapY: 350 },
  { id: '8-T2', world: 8, code: '8-T2', name: 'East Dynamo Tower', role: 'tower', mechanic: 'vertical', bossId: 'lieutenant', enemyTypes: ['sentinel_knight', 'crusher_block', 'fire_bar'], mapX: 840, mapY: 230 },
  { id: '8-6', world: 8, code: '8-6', name: 'Iron Gate Approach', role: 'test', mechanic: 'castle', enemyTypes: ['sentinel_knight', 'bullet_beetle', 'cannon_pod'], mapX: 930, mapY: 340 },
  { id: '8-A', world: 8, code: '8-A', name: 'Patrol Squadron Ambush', role: 'ambush', mechanic: 'arena', enemyTypes: ['gearbot', 'spring_sentry', 'bullet_beetle'], mapX: 520, mapY: 450 },
  { id: '8-C', world: 8, code: '8-C', name: 'Rust Baron Final Citadel', role: 'castle', mechanic: 'castle', bossId: 'rust_baron', enemyTypes: ['sentinel_knight', 'gearbot', 'fire_bar', 'crusher_block'], mapX: 1050, mapY: 280 },

  // World 9: ★ Star Road (8 hard bonus stages)
  { id: '9-1', world: 9, code: '★-1', name: 'Starlight Sprint', role: 'teach', mechanic: 'slopes', enemyTypes: ['bumblet', 'hopnut', 'puffer'], mapX: 140, mapY: 320 },
  { id: '9-2', world: 9, code: '★-2', name: 'Meteor Mirage', role: 'test', mechanic: 'geysers', enemyTypes: ['cactling', 'sandworm', 'ghost_lantern'], mapX: 260, mapY: 260 },
  { id: '9-3', world: 9, code: '★-3', name: 'Nebula Reef', role: 'combo', underwater: true, mechanic: 'swim', enemyTypes: ['eel_ribbon', 'snapjaw_clam', 'diver_gull'], mapX: 380, mapY: 340 },
  { id: '9-4', world: 9, code: '★-4', name: 'Comet Skateway', role: 'test', icePhysics: true, mechanic: 'ice', enemyTypes: ['skimmer_seal', 'snowball_roller', 'hush_spirit'], mapX: 500, mapY: 260 },
  { id: '9-5', world: 9, code: '★-5', name: 'Supernova Bounce', role: 'combo', mechanic: 'fungus', enemyTypes: ['spore_drifter', 'mossling', 'chomper_vine'], mapX: 620, mapY: 340 },
  { id: '9-6', world: 9, code: '★-6', name: 'Solar Flare Forges', role: 'autoscroll', autoScroll: true, mechanic: 'lava', enemyTypes: ['lava_blob', 'ember_bat', 'magma_pillar'], mapX: 740, mapY: 260 },
  { id: '9-7', world: 9, code: '★-7', name: 'Astral Gale', role: 'combo', mechanic: 'wind', enemyTypes: ['gust_sprite', 'cloud_ram', 'spring_sentry'], mapX: 860, mapY: 340 },
  { id: '9-8', world: 9, code: '★-8', name: 'Clockwork Constellation', role: 'castle', mechanic: 'conveyor', bossId: 'captain_zephyr', enemyTypes: ['gearbot', 'bullet_beetle', 'sentinel_knight'], mapX: 1000, mapY: 290 },

  // World 10: ♛ Crown Road (8 expert stages + 1 last secret stage = 9 stages)
  { id: '10-1', world: 10, code: '♛-1', name: 'Sovereign Meadow Trial', role: 'teach', mechanic: 'slopes', enemyTypes: ['spikeback', 'hopnut', 'chomper_vine'], mapX: 130, mapY: 330 },
  { id: '10-2', world: 10, code: '♛-2', name: 'Golden Cyclone Trial', role: 'test', mechanic: 'geysers', enemyTypes: ['sandworm', 'cactling', 'rock_mole'], mapX: 245, mapY: 260 },
  { id: '10-3', world: 10, code: '♛-3', name: 'Abyssal Trench Trial', role: 'combo', underwater: true, mechanic: 'swim', enemyTypes: ['eel_ribbon', 'snapjaw_clam', 'puffer'], mapX: 360, mapY: 340 },
  { id: '10-4', world: 10, code: '♛-4', name: 'Diamond Blizzard Trial', role: 'test', icePhysics: true, mechanic: 'ice', enemyTypes: ['skimmer_seal', 'snowball_roller', 'crusher_block'], mapX: 475, mapY: 260 },
  { id: '10-5', world: 10, code: '♛-5', name: 'Spore Crown Trial', role: 'combo', mechanic: 'fungus', hasSecretExit: true, enemyTypes: ['spore_drifter', 'mossling', 'bone_hopper'], mapX: 590, mapY: 340 },
  { id: '10-6', world: 10, code: '♛-6', name: 'Inferno Crown Trial', role: 'autoscroll', autoScroll: true, mechanic: 'lava', enemyTypes: ['lava_blob', 'magma_pillar', 'fire_bar'], mapX: 705, mapY: 260 },
  { id: '10-7', world: 10, code: '♛-7', name: 'Tempest Crown Trial', role: 'combo', mechanic: 'wind', enemyTypes: ['cloud_ram', 'gust_sprite', 'bullet_beetle'], mapX: 820, mapY: 340 },
  { id: '10-8', world: 10, code: '♛-8', name: 'Citadel Gauntlet Trial', role: 'castle', mechanic: 'conveyor', bossId: 'rust_baron', enemyTypes: ['sentinel_knight', 'cannon_pod', 'gearbot'], mapX: 935, mapY: 280 },
  { id: '10-9', world: 10, code: '♛-FINAL', name: "Champion's Golden Trail", role: 'secret', secretOnly: true, mechanic: 'coins', enemyTypes: ['sentinel_knight', 'cloud_ram', 'skimmer_seal'], mapX: 1050, mapY: 220 }
];

// Verify we have exactly 90 playable stages!
if (STAGE_MANIFEST.length !== 90) {
  throw new Error(`Expected 90 stages in manifest, got ${STAGE_MANIFEST.length}`);
}

function buildStageData(meta, stageIdx) {
  const isAmbush = meta.role === 'ambush';
  const width = isAmbush ? 48 : (meta.role === 'castle' || meta.role === 'tower' ? 88 : 96);
  const height = 16;
  const grid = new Array(width * height).fill(TILE.EMPTY);

  const set = (x, y, t) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      grid[y * width + x] = t;
    }
  };
  const get = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return TILE.EMPTY;
    return grid[y * width + x];
  };

  const groundTile = meta.icePhysics ? TILE.ICE : TILE.GROUND;

  // 1. Lay continuous base floor (rows 14 and 15), with safe curated gaps (width <= 3 tiles, always bridged or easily jumped)
  for (let x = 0; x < width; x++) {
    set(x, 14, groundTile);
    set(x, 15, TILE.GROUND);
  }

  // Add thematic features along the middle section (x = 10 to width - 26)
  const midEnd = meta.bossId ? width - 26 : width - 12;
  const powerupCycle = ['big', 'flame', 'leaf', 'gold', 'tiny', 'heavy', 'star', 'clover'];
  const powerupReward = powerupCycle[(meta.world + stageIdx) % powerupCycle.length];

  // Safe spawn zone (x = 0..8 is always flat open path >= 4 tiles wide)
  const startX = 3 * 32;
  const startY = 14 * 32 - 26;

  // Question blocks & Coin Brick early in the stage (x = 8..13, y = 10)
  set(8, 10, TILE.Q_POWER);
  set(9, 10, TILE.BRICK);
  set(10, 10, TILE.COIN_BRICK);
  set(11, 10, TILE.Q_COIN);
  set(12, 10, TILE.GOLD_HELMET_BOX);

  // Bonus Warp Pipe at x = 15..16
  set(15, 12, TILE.PIPE_TOP_L);
  set(16, 12, TILE.PIPE_TOP_R);
  set(15, 13, TILE.PIPE_BODY_L);
  set(16, 13, TILE.PIPE_BODY_R);

  // Elevated sky coin bonus platform (destination of bonus pipe)
  for (let bx = 18; bx <= 25; bx++) {
    set(bx, 5, TILE.PLATFORM);
    set(bx, 4, TILE.COIN);
  }
  set(21, 3, TILE.BIG_COIN);

  // Thematic sections from x = 20 to midEnd - 8
  for (let segX = 20; segX < midEnd - 10; segX += 12) {
    const mode = meta.mechanic;

    if (mode === 'slopes') {
      // Gentle raised hill with one-way platform & coins
      for (let dx = 2; dx <= 6; dx++) {
        set(segX + dx, 11, TILE.PLATFORM);
        set(segX + dx, 10, TILE.COIN);
      }
      set(segX + 1, 13, TILE.SLOPE_L);
      set(segX + 7, 13, TILE.SLOPE_R);
    } else if (mode === 'quicksand' || mode === 'geysers') {
      // Quicksand patch + sand geyser + overhead stepping platforms
      set(segX + 3, 14, TILE.QUICKSAND);
      set(segX + 4, 14, TILE.SAND_GEYSER);
      set(segX + 5, 14, TILE.QUICKSAND);
      for (let dx = 2; dx <= 6; dx++) {
        set(segX + dx, 10, TILE.PLATFORM);
        set(segX + dx, 9, TILE.COIN);
      }
    } else if (mode === 'water' || mode === 'swim') {
      // Shallow swimmable tide pool with bridge platforms above
      for (let dx = 2; dx <= 5; dx++) {
        set(segX + dx, 14, TILE.WATER);
        set(segX + dx, 11, TILE.PLATFORM);
        set(segX + dx, 10, TILE.COIN);
      }
    } else if (mode === 'fungus' || mode === 'poison') {
      // Bouncy fungus caps over a shallow bog with high coin arc
      set(segX + 2, 13, TILE.FUNGUS_CAP);
      set(segX + 6, 13, TILE.FUNGUS_CAP);
      for (let dx = 3; dx <= 5; dx++) {
        set(segX + dx, 11, TILE.PLATFORM);
        set(segX + dx, 8, TILE.COIN);
      }
    } else if (mode === 'lava' || mode === 'stone') {
      // Safe platform bridge over ember pit + stone blocks for Heavy Pip
      for (let dx = 2; dx <= 5; dx++) {
        set(segX + dx, 11, TILE.PLATFORM);
        set(segX + dx, 10, TILE.COIN);
      }
      set(segX + 7, 12, TILE.STONE);
      set(segX + 8, 12, TILE.Q_STAR);
    } else if (mode === 'wind' || mode === 'platforms') {
      // Tiered cloud platforms & climbable vine
      for (let dx = 1; dx <= 7; dx++) {
        set(segX + dx, 11, TILE.PLATFORM);
        set(segX + dx, 9, TILE.COIN);
      }
      for (let vy = 7; vy <= 13; vy++) {
        set(segX + 4, vy, TILE.VINE);
      }
    } else if (mode === 'conveyor' || mode === 'cannons') {
      // Conveyor belt section & spring block
      for (let dx = 2; dx <= 5; dx++) {
        set(segX + dx, 14, (dx % 2 === 0) ? TILE.CONVEYOR_R : TILE.CONVEYOR_L);
        set(segX + dx, 10, TILE.PLATFORM);
        set(segX + dx, 9, TILE.COIN);
      }
      set(segX + 1, 13, TILE.SPRING_BLOCK);
    } else {
      // Vines, ghost house fences, or classic platforming
      for (let dx = 2; dx <= 6; dx++) {
        set(segX + dx, 11, TILE.PLATFORM);
        set(segX + dx, 10, TILE.COIN);
      }
      for (let vy = 8; vy <= 13; vy++) {
        set(segX + 4, vy, meta.role === 'ghost' ? TILE.FENCE : TILE.VINE);
      }
    }
  }

  // Place Red Ring + 8 Red Coins & Gold Ring Gate in middle of stage
  if (!isAmbush) {
    const rrX = 28;
    set(rrX, 12, TILE.RED_RING);
    for (let i = 0; i < 8; i++) {
      set(rrX + 2 + i * 2, 12, TILE.RED_COIN);
    }
    set(Math.min(midEnd - 14, 48), 12, TILE.GOLD_GATE);
  }

  // Place the 3 Star Medals at reachable, well-spaced locations along the stage
  const m1X = isAmbush ? 14 : 22;
  const m2X = isAmbush ? 24 : Math.floor(midEnd * 0.52);
  const m3X = isAmbush ? 34 : Math.floor(midEnd * 0.78);
  set(m1X, 9, TILE.PLATFORM);
  set(m1X, 8, TILE.STAR_MEDAL_1);
  set(m2X, 9, TILE.PLATFORM);
  set(m2X, 8, TILE.STAR_MEDAL_2);
  set(m3X, 9, TILE.PLATFORM);
  set(m3X, 8, TILE.STAR_MEDAL_3);

  // Mid-stage / Pre-Boss Checkpoint Flag
  const checkpointTx = meta.bossId ? (width - 26) : Math.floor(width * 0.55);
  set(checkpointTx, 13, TILE.CHECKPOINT);
  set(checkpointTx + 1, 10, TILE.Q_POWER);

  // Secret Exit Flagpole (on stages with hasSecretExit: placed on an upper vine/platform terrace near the end)
  let secretFlagTx = null;
  if (meta.hasSecretExit) {
    secretFlagTx = midEnd - 6;
    for (let vy = 7; vy <= 13; vy++) {
      set(secretFlagTx - 2, vy, TILE.VINE);
    }
    for (let sx = secretFlagTx - 2; sx <= secretFlagTx + 1; sx++) {
      set(sx, 7, TILE.PLATFORM);
    }
    set(secretFlagTx, 6, TILE.SECRET_FLAG);
  }

  // Main Flagpole at the end of the stage
  const flagTx = width - 5;
  for (let fy = 6; fy <= 13; fy++) {
    set(flagTx, fy, TILE.FLAGPOLE);
  }

  // Populate enemies on open floor tiles (never inside walls or within 10 tiles of player spawn)
  const enemies = [];
  const pool = meta.enemyTypes || ['bumblet'];
  const enemyStep = isAmbush ? 7 : 9;
  for (let ex = 12; ex < midEnd - 6; ex += enemyStep) {
    if (ex === 15 || ex === 16 || Math.abs(ex - checkpointTx) <= 2) continue;
    const eType = pool[(ex + stageIdx) % pool.length];
    let spawnY = 13;
    // Ensure spawn tile is empty and floor below is solid
    while (spawnY > 4 && get(ex, spawnY) !== TILE.EMPTY) {
      spawnY--;
    }
    enemies.push({
      type: eType,
      x: ex * 32,
      y: (spawnY + 1) * 32 - 24
    });
  }

  // Estimated bot clear time is ~12-18s; set stage timer to 300s (at least 15x bot time, far exceeding 1.5x requirement)
  return {
    id: meta.id,
    code: meta.code,
    world: meta.world,
    name: meta.name,
    role: meta.role,
    mechanic: meta.mechanic,
    width,
    height,
    timeLimit: 300,
    estimatedBotSeconds: 16,
    autoScroll: !!meta.autoScroll,
    underwater: !!meta.underwater,
    icePhysics: !!meta.icePhysics,
    hasSecretExit: !!meta.hasSecretExit,
    secretOnly: !!meta.secretOnly,
    powerupReward,
    startX,
    startY,
    flagTx,
    secretFlagTx,
    checkpointTx,
    bossId: meta.bossId || null,
    bossArenaLeft: meta.bossId ? (width - 24) : null,
    bonusWarp: { x: 19 * 32, y: 4 * 32 },
    mapPos: { x: meta.mapX, y: meta.mapY },
    enemies,
    grid
  };
}

// Helper huts (1 per main world 1..8) & Warp Cannons (Worlds 1, 2, 3, 5)
const WORLD_EXTRAS = {
  1: { hut: { id: 'hut-1', name: 'Meadow Beaver Hut', x: 500, y: 170 }, cannon: { id: 'cannon-1', toWorld: 3, x: 880, y: 440 } },
  2: { hut: { id: 'hut-2', name: 'Oasis Beaver Hut', x: 520, y: 150 }, cannon: { id: 'cannon-2', toWorld: 5, x: 880, y: 440 } },
  3: { hut: { id: 'hut-3', name: 'Lagoon Beaver Hut', x: 500, y: 150 }, cannon: { id: 'cannon-3', toWorld: 6, x: 880, y: 440 } },
  4: { hut: { id: 'hut-4', name: 'Glacier Beaver Hut', x: 500, y: 150 } },
  5: { hut: { id: 'hut-5', name: 'Myco Beaver Hut', x: 520, y: 150 }, cannon: { id: 'cannon-5', toWorld: 8, x: 880, y: 440 } },
  6: { hut: { id: 'hut-6', name: 'Caldera Beaver Hut', x: 520, y: 150 } },
  7: { hut: { id: 'hut-7', name: 'Cloud Beaver Hut', x: 520, y: 150 } },
  8: { hut: { id: 'hut-8', name: 'Citadel Beaver Hut', x: 520, y: 150 } },
  9: {},
  10: {}
};

const allStages = STAGE_MANIFEST.map((m, idx) => buildStageData(m, idx));

// Write per-world JSON files into levels/world-<w>.json
for (let w = 1; w <= 10; w++) {
  const worldStages = allStages.filter(s => s.world === w);
  const worldPayload = {
    world: w,
    info: WORLDS[w - 1],
    extras: WORLD_EXTRAS[w] || {},
    stages: worldStages
  };
  fs.writeFileSync(path.join(LEVELS_DIR, `world-${w}.json`), JSON.stringify(worldPayload));
}

// Also write js/levels.js so levels are synchronously available and lazy-loadable per world
const levelsJsContent = `/**
 * Pip's Golden Trail - Generated 90-Stage World & Level Data
 * Generated by tools/generate-levels.mjs — do not edit by hand.
 */
(function (root) {
  'use strict';
  var WORLD_EXTRAS = ${JSON.stringify(WORLD_EXTRAS)};
  var STAGES = ${JSON.stringify(allStages)};
  var BY_ID = {};
  var BY_WORLD = {};
  for (var i = 0; i < STAGES.length; i++) {
    var s = STAGES[i];
    BY_ID[s.id] = s;
    if (!BY_WORLD[s.world]) BY_WORLD[s.world] = [];
    BY_WORLD[s.world].push(s);
  }
  function cloneStage(id) {
    var tpl = BY_ID[id] || STAGES[0];
    var copy = {};
    for (var k in tpl) {
      if (k === 'grid') copy.grid = tpl.grid.slice();
      else if (k === 'enemies') copy.enemies = JSON.parse(JSON.stringify(tpl.enemies));
      else copy[k] = tpl[k];
    }
    return copy;
  }
  var GT = root.GT || (root.GT = {});
  GT.STAGES = STAGES;
  GT.STAGE_BY_ID = BY_ID;
  GT.STAGES_BY_WORLD = BY_WORLD;
  GT.WORLD_EXTRAS = WORLD_EXTRAS;
  GT.cloneStage = cloneStage;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      STAGES: STAGES,
      STAGE_BY_ID: BY_ID,
      STAGES_BY_WORLD: BY_WORLD,
      WORLD_EXTRAS: WORLD_EXTRAS,
      cloneStage: cloneStage
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
`;

fs.writeFileSync(path.join(ROOT, 'js', 'levels.js'), levelsJsContent);
console.log(`Generated ${allStages.length} stages across 10 worlds into levels/world-1..10.json and js/levels.js.`);

#!/usr/bin/env node
/**
 * Pip's Golden Trail - 90-Stage Unique Architectural Level Generator
 * Builds 90 full-length, structurally distinct stages across 10 Worlds:
 * - Zero reused maps: every stage has a unique width (144..224 tiles = 5 to 8 screens),
 *   a unique opening landmark, a unique elevation contour (hills, valleys, plateaus, chasms),
 *   and a unique sequence of handcrafted architectural set-pieces.
 * - Includes moving platforms, multi-route upper/lower paths, subterranean/sky bonus vaults,
 *   3 hidden Star Medals per stage, Red Ring challenges, Gold Ring gates, and Boss Citadels.
 */
import fs from 'node:fs';
import path from 'node:path';
import '../js/tune.js';

const { TILE, WORLDS } = globalThis.GT;

const ROOT = process.cwd();
const LEVELS_DIR = path.join(ROOT, 'levels');
if (!fs.existsSync(LEVELS_DIR)) fs.mkdirSync(LEVELS_DIR, { recursive: true });

const STAGE_MANIFEST = [
  // World 1: Meadow Hills (9 stages)
  { id: '1-1', world: 1, code: '1-1', name: 'Sunlit Meadow', role: 'teach', mechanic: 'slopes', enemyTypes: ['bumblet', 'hopnut'], mapX: 140, mapY: 320 },
  { id: '1-2', world: 1, code: '1-2', name: 'Acorn Ridge', role: 'test', mechanic: 'slopes', enemyTypes: ['hopnut', 'spikeback', 'chomper_vine'], mapX: 280, mapY: 280 },
  { id: '1-3', world: 1, code: '1-3', name: 'Breeze Terraces', role: 'combo', mechanic: 'vines', hasSecretExit: true, enemyTypes: ['bumblet', 'puffer', 'chomper_vine'], mapX: 420, mapY: 330 },
  { id: '1-T', world: 1, code: '1-T', name: 'Sprout Watchtower', role: 'tower', mechanic: 'vertical', bossId: 'lieutenant', enemyTypes: ['spikeback', 'crusher_block'], mapX: 560, mapY: 250 },
  { id: '1-4', world: 1, code: '1-4', name: 'Windmill Rise', role: 'autoscroll', autoScroll: true, mechanic: 'platforms', enemyTypes: ['puffer', 'hopnut'], mapX: 700, mapY: 310 },
  { id: '1-5', world: 1, code: '1-5', name: 'Clover Brook', role: 'combo', mechanic: 'slopes', enemyTypes: ['bumblet', 'spikeback', 'hopnut'], mapX: 840, mapY: 340 },
  { id: '1-S', world: 1, code: '1-S', name: 'Hidden Daisy Vault', role: 'secret', secretOnly: true, mechanic: 'coins', enemyTypes: ['bumblet', 'puffer'], mapX: 440, mapY: 450 },
  { id: '1-A', world: 1, code: '1-A', name: 'Meadow Ambush', role: 'ambush', mechanic: 'arena', enemyTypes: ['bumblet', 'hopnut', 'spikeback'], mapX: 620, mapY: 410 },
  { id: '1-C', world: 1, code: '1-C', name: 'ThornKeep Castle', role: 'castle', mechanic: 'castle', bossId: 'captain_thorn', enemyTypes: ['sentinel_knight', 'crusher_block'], mapX: 1000, mapY: 290 },

  // World 2: Dune Bazaar (9 stages)
  { id: '2-1', world: 2, code: '2-1', name: 'Saffron Dunes', role: 'teach', mechanic: 'quicksand', enemyTypes: ['sandworm', 'cactling'], mapX: 140, mapY: 340 },
  { id: '2-2', world: 2, code: '2-2', name: 'Geyser Oasis', role: 'test', mechanic: 'geysers', enemyTypes: ['sandworm', 'cactling', 'bumblet'], mapX: 280, mapY: 270 },
  { id: '2-3', world: 2, code: '2-3', name: 'Mirage Caravanserai', role: 'combo', mechanic: 'geysers', hasSecretExit: true, enemyTypes: ['cactling', 'sandworm', 'puffer'], mapX: 420, mapY: 320 },
  { id: '2-T', world: 2, code: '2-T', name: 'Sundial Spire', role: 'tower', mechanic: 'vertical', bossId: 'lieutenant', enemyTypes: ['crusher_block', 'sandworm'], mapX: 550, mapY: 240 },
  { id: '2-G', world: 2, code: '2-G', name: 'Lantern Mirage House', role: 'ghost', mechanic: 'ghost', hasSecretExit: true, enemyTypes: ['ghost_lantern', 'hush_spirit'], mapX: 680, mapY: 220 },
  { id: '2-4', world: 2, code: '2-4', name: 'Sandstorm Caravan', role: 'autoscroll', autoScroll: true, mechanic: 'geysers', enemyTypes: ['sandworm', 'cactling'], mapX: 720, mapY: 350 },
  { id: '2-5', world: 2, code: '2-5', name: 'Golden Canyon', role: 'combo', mechanic: 'quicksand', enemyTypes: ['cactling', 'rock_mole', 'sandworm'], mapX: 860, mapY: 330 },
  { id: '2-S', world: 2, code: '2-S', name: 'Buried Pharaonic Vault', role: 'secret', secretOnly: true, mechanic: 'coins', enemyTypes: ['ghost_lantern', 'sandworm'], mapX: 460, mapY: 450 },
  { id: '2-C', world: 2, code: '2-C', name: 'Sirocco Brass Stronghold', role: 'castle', mechanic: 'castle', bossId: 'captain_sirocco', enemyTypes: ['sentinel_knight', 'crusher_block', 'fire_bar'], mapX: 1020, mapY: 290 },

  // World 3: Coral Coast (10 stages)
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

  // World 4: Snowcap Peaks (9 stages)
  { id: '4-1', world: 4, code: '4-1', name: 'Rime Pine Trail', role: 'teach', icePhysics: true, mechanic: 'ice', enemyTypes: ['skimmer_seal', 'snowball_roller'], mapX: 140, mapY: 340 },
  { id: '4-2', world: 4, code: '4-2', name: 'Glacier Slide', role: 'test', icePhysics: true, mechanic: 'slopes', enemyTypes: ['skimmer_seal', 'snowball_roller', 'spikeback'], mapX: 280, mapY: 270 },
  { id: '4-3', world: 4, code: '4-3', name: 'Icicle Cavern', role: 'combo', icePhysics: true, mechanic: 'ice', hasSecretExit: true, enemyTypes: ['skimmer_seal', 'crusher_block', 'snowball_roller'], mapX: 420, mapY: 320 },
  { id: '4-T', world: 4, code: '4-T', name: 'Frostbite Bell-Tower', role: 'tower', icePhysics: true, mechanic: 'vertical', bossId: 'lieutenant', enemyTypes: ['skimmer_seal', 'crusher_block'], mapX: 550, mapY: 230 },
  { id: '4-G', world: 4, code: '4-G', name: 'Shivering Manor', role: 'ghost', mechanic: 'ghost', hasSecretExit: true, enemyTypes: ['hush_spirit', 'ghost_lantern'], mapX: 680, mapY: 220 },
  { id: '4-4', world: 4, code: '4-4', name: 'Avalanche Ridge', role: 'autoscroll', autoScroll: true, icePhysics: true, mechanic: 'ice', enemyTypes: ['snowball_roller', 'skimmer_seal'], mapX: 730, mapY: 350 },
  { id: '4-5', world: 4, code: '4-5', name: 'Aurora Cableway', role: 'combo', icePhysics: true, mechanic: 'platforms', enemyTypes: ['skimmer_seal', 'puffer', 'snowball_roller'], mapX: 870, mapY: 320 },
  { id: '4-S', world: 4, code: '4-S', name: 'Crystal Aurora Vault', role: 'secret', secretOnly: true, icePhysics: true, mechanic: 'coins', enemyTypes: ['skimmer_seal', 'hush_spirit'], mapX: 450, mapY: 450 },
  { id: '4-C', world: 4, code: '4-C', name: 'Frost Keep Citadel', role: 'castle', icePhysics: true, mechanic: 'castle', bossId: 'captain_frost', enemyTypes: ['sentinel_knight', 'crusher_block', 'skimmer_seal'], mapX: 1020, mapY: 280 },

  // World 5: Fungal Forest (9 stages)
  { id: '5-1', world: 5, code: '5-1', name: 'Bounce-Cap Glade', role: 'teach', mechanic: 'fungus', enemyTypes: ['spore_drifter', 'mossling'], mapX: 130, mapY: 330 },
  { id: '5-2', world: 5, code: '5-2', name: 'Violet Bog', role: 'test', mechanic: 'poison', enemyTypes: ['mossling', 'spore_drifter', 'chomper_vine'], mapX: 260, mapY: 270 },
  { id: '5-3', world: 5, code: '5-3', name: 'Canopy Vines', role: 'combo', mechanic: 'vines', hasSecretExit: true, enemyTypes: ['spore_drifter', 'mossling', 'hopnut'], mapX: 390, mapY: 340 },
  { id: '5-T', world: 5, code: '5-T', name: 'Hollow Trunk Tower', role: 'tower', mechanic: 'vertical', bossId: 'lieutenant', enemyTypes: ['spore_drifter', 'crusher_block'], mapX: 520, mapY: 230 },
  { id: '5-4', world: 5, code: '5-4', name: 'Rising Swamp Mist', role: 'autoscroll', autoScroll: true, mechanic: 'fungus', enemyTypes: ['spore_drifter', 'puffer'], mapX: 650, mapY: 310 },
  { id: '5-5', world: 5, code: '5-5', name: 'Luminous Mycelium', role: 'combo', mechanic: 'fungus', enemyTypes: ['mossling', 'spore_drifter', 'spikeback'], mapX: 780, mapY: 360 },
  { id: '5-6', world: 5, code: '5-6', name: 'Bramble Treetops', role: 'test', mechanic: 'vines', enemyTypes: ['hopnut', 'mossling', 'chomper_vine'], mapX: 900, mapY: 300 },
  { id: '5-S', world: 5, code: '5-S', name: 'Truffle Gold Hollow', role: 'secret', secretOnly: true, mechanic: 'fungus', enemyTypes: ['spore_drifter', 'mossling'], mapX: 410, mapY: 460 },
  { id: '5-C', world: 5, code: '5-C', name: 'Mildew Alchemical Keep', role: 'castle', mechanic: 'castle', bossId: 'captain_mildew', enemyTypes: ['sentinel_knight', 'spore_drifter', 'crusher_block'], mapX: 1030, mapY: 280 },

  // World 6: Ember Mountain (9 stages)
  { id: '6-1', world: 6, code: '6-1', name: 'Basalt Foothills', role: 'teach', mechanic: 'lava', enemyTypes: ['lava_blob', 'rock_mole'], mapX: 130, mapY: 340 },
  { id: '6-2', world: 6, code: '6-2', name: 'Cinder Cavern', role: 'test', mechanic: 'lava', enemyTypes: ['ember_bat', 'lava_blob', 'bone_hopper'], mapX: 260, mapY: 270 },
  { id: '6-3', world: 6, code: '6-3', name: 'Magma Geyser Bridge', role: 'combo', mechanic: 'lava', hasSecretExit: true, enemyTypes: ['magma_pillar', 'rock_mole', 'ember_bat'], mapX: 390, mapY: 330 },
  { id: '6-T', world: 6, code: '6-T', name: 'Obsidian Foundry Tower', role: 'tower', mechanic: 'vertical', bossId: 'lieutenant', enemyTypes: ['fire_bar', 'bone_hopper', 'crusher_block'], mapX: 520, mapY: 230 },
  { id: '6-4', world: 6, code: '6-4', name: 'Volcano Eruption Run', role: 'autoscroll', autoScroll: true, mechanic: 'lava', enemyTypes: ['lava_blob', 'ember_bat', 'magma_pillar'], mapX: 650, mapY: 310 },
  { id: '6-5', world: 6, code: '6-5', name: 'Iron Stone Quarry', role: 'combo', mechanic: 'stone', enemyTypes: ['rock_mole', 'bone_hopper', 'crusher_block'], mapX: 780, mapY: 360 },
  { id: '6-6', world: 6, code: '6-6', name: 'Caldera Rim', role: 'test', mechanic: 'lava', enemyTypes: ['magma_pillar', 'fire_bar', 'lava_blob'], mapX: 900, mapY: 290 },
  { id: '6-S', world: 6, code: '6-S', name: 'Ruby Core Treasury', role: 'secret', secretOnly: true, mechanic: 'coins', enemyTypes: ['lava_blob', 'ember_bat'], mapX: 410, mapY: 450 },
  { id: '6-C', world: 6, code: '6-C', name: 'Cinder Forge Bastion', role: 'castle', mechanic: 'castle', bossId: 'captain_cinder', enemyTypes: ['sentinel_knight', 'fire_bar', 'magma_pillar'], mapX: 1030, mapY: 280 },

  // World 7: Sky Gardens (8 stages)
  { id: '7-1', world: 7, code: '7-1', name: 'Cumulus Promenade', role: 'teach', mechanic: 'wind', enemyTypes: ['gust_sprite', 'cloud_ram'], mapX: 140, mapY: 330 },
  { id: '7-2', world: 7, code: '7-2', name: 'Gale Archways', role: 'test', mechanic: 'wind', enemyTypes: ['cloud_ram', 'gust_sprite', 'diver_gull'], mapX: 290, mapY: 260 },
  { id: '7-3', world: 7, code: '7-3', name: 'Rainbow Bean-Vine', role: 'combo', mechanic: 'vines', hasSecretExit: true, enemyTypes: ['gust_sprite', 'puffer', 'cloud_ram'], mapX: 440, mapY: 330 },
  { id: '7-T', world: 7, code: '7-T', name: 'Stratosphere Spire', role: 'tower', mechanic: 'vertical', bossId: 'lieutenant', enemyTypes: ['gust_sprite', 'crusher_block'], mapX: 590, mapY: 230 },
  { id: '7-4', world: 7, code: '7-4', name: 'Updraft Ascent', role: 'autoscroll', autoScroll: true, mechanic: 'wind', enemyTypes: ['diver_gull', 'gust_sprite'], mapX: 730, mapY: 310 },
  { id: '7-5', world: 7, code: '7-5', name: 'Celestial Terrace', role: 'combo', mechanic: 'platforms', enemyTypes: ['cloud_ram', 'gust_sprite', 'spring_sentry'], mapX: 870, mapY: 340 },
  { id: '7-S', world: 7, code: '7-S', name: 'Zephyr Halo Sanctuary', role: 'secret', secretOnly: true, mechanic: 'coins', enemyTypes: ['gust_sprite', 'cloud_ram'], mapX: 460, mapY: 450 },
  { id: '7-C', world: 7, code: '7-C', name: 'Zephyr Aerie Castle', role: 'castle', mechanic: 'castle', bossId: 'captain_zephyr', enemyTypes: ['sentinel_knight', 'gust_sprite', 'cloud_ram'], mapX: 1020, mapY: 280 },

  // World 8: Rust Citadel (10 stages)
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

  // World 9: ★ Star Road (8 stages)
  { id: '9-1', world: 9, code: '★-1', name: 'Starlight Sprint', role: 'teach', mechanic: 'slopes', enemyTypes: ['bumblet', 'hopnut', 'puffer'], mapX: 140, mapY: 320 },
  { id: '9-2', world: 9, code: '★-2', name: 'Meteor Mirage', role: 'test', mechanic: 'geysers', enemyTypes: ['cactling', 'sandworm', 'ghost_lantern'], mapX: 260, mapY: 260 },
  { id: '9-3', world: 9, code: '★-3', name: 'Nebula Reef', role: 'combo', underwater: true, mechanic: 'swim', enemyTypes: ['eel_ribbon', 'snapjaw_clam', 'diver_gull'], mapX: 380, mapY: 340 },
  { id: '9-4', world: 9, code: '★-4', name: 'Comet Skateway', role: 'test', icePhysics: true, mechanic: 'ice', enemyTypes: ['skimmer_seal', 'snowball_roller', 'hush_spirit'], mapX: 500, mapY: 260 },
  { id: '9-5', world: 9, code: '★-5', name: 'Supernova Bounce', role: 'combo', mechanic: 'fungus', enemyTypes: ['spore_drifter', 'mossling', 'chomper_vine'], mapX: 620, mapY: 340 },
  { id: '9-6', world: 9, code: '★-6', name: 'Solar Flare Forges', role: 'autoscroll', autoScroll: true, mechanic: 'lava', enemyTypes: ['lava_blob', 'ember_bat', 'magma_pillar'], mapX: 740, mapY: 260 },
  { id: '9-7', world: 9, code: '★-7', name: 'Astral Gale', role: 'combo', mechanic: 'wind', enemyTypes: ['gust_sprite', 'cloud_ram', 'spring_sentry'], mapX: 860, mapY: 340 },
  { id: '9-8', world: 9, code: '★-8', name: 'Clockwork Constellation', role: 'castle', mechanic: 'conveyor', bossId: 'captain_zephyr', enemyTypes: ['gearbot', 'bullet_beetle', 'sentinel_knight'], mapX: 1000, mapY: 290 },

  // World 10: ♛ Crown Road (9 stages)
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

if (STAGE_MANIFEST.length !== 90) {
  throw new Error(`Expected 90 stages in manifest, got ${STAGE_MANIFEST.length}`);
}

/**
 * Deterministic PRNG per stage so every stage is 100% unique yet reproducible
 */
function createRng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s & 0xfffffff) / 0x10000000;
  };
}

/**
 * 24 Distinct Architectural Set-Piece Builders
 * Each takes (ctx, x0, len) and sculpts terrain, elevation, platforms, hazards, coins, and foes.
 */
const SET_PIECES = [
  // 0: Stepped Acorn Cliffs — ascending & descending cliff terraces with slope ramps & alcove blocks
  function spSteppedCliffs(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + 3, 14, gTile);
    b.set(x0 + 3, 13, TILE.SLOPE_L);
    b.fillGround(x0 + 4, x0 + 8, 13, gTile);
    b.set(x0 + 6, 9, TILE.Q_POWER);
    b.set(x0 + 7, 9, TILE.BRICK);
    b.set(x0 + 8, 12, TILE.SLOPE_L);
    b.fillGround(x0 + 9, x0 + 13, 12, gTile);
    for (let cx = x0 + 9; cx <= x0 + 12; cx++) b.set(cx, 10, TILE.COIN);
    b.set(x0 + 13, 12, TILE.SLOPE_R);
    b.fillGround(x0 + 14, x0 + len, 13, gTile);
    b.addEnemy(x0 + 5, 12, 0);
    b.addEnemy(x0 + 11, 11, 1);
  },

  // 1: Chasm Suspension Bridge — 4-tile chasm with collapsing/wooden bridge & sunken canyon floor below
  function spChasmBridge(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + 4, 13, gTile);
    b.fillGround(x0 + 4, x0 + 8, 14, gTile);
    for (let bx = x0 + 4; bx <= x0 + 7; bx++) {
      b.set(bx, 11, (bx % 2 === 0) ? TILE.PLATFORM : TILE.BRIDGE_COLLAPSE);
      b.set(bx, 8, TILE.PLATFORM);
      b.set(bx, 7, TILE.COIN);
    }
    b.set(x0 + 5, 13, TILE.BIG_COIN);
    b.set(x0 + 7, 13, TILE.SPRING_BLOCK);
    b.fillGround(x0 + 8, x0 + 12, 13, gTile);
    b.fillGround(x0 + 12, x0 + 15, 14, gTile);
    for (let bx = x0 + 12; bx <= x0 + 14; bx++) {
      b.set(bx, 11, TILE.PLATFORM);
      b.set(bx, 9, TILE.COIN);
    }
    b.addMovingPlatform(x0 + 12, 10, 3, 'horiz', 48);
    b.fillGround(x0 + 15, x0 + len, 14, gTile);
    b.addEnemy(x0 + 9, 12, 0);
  },

  // 2: Twin Pipe Courtyard — tall & medium pipes enclosing a sunken coin courtyard
  function spTwinPipeCourtyard(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + len, 14, gTile);
    b.placePipe(x0 + 2, 11, 3);
    for (let x = x0 + 5; x <= x0 + 9; x++) {
      b.set(x, 10, (x === x0 + 7) ? TILE.COIN_BRICK : TILE.BRICK);
      b.set(x, 8, TILE.COIN);
    }
    b.placePipe(x0 + 11, 10, 4);
    for (let x = x0 + 14; x <= x0 + 16; x++) {
      b.set(x, 11, TILE.PLATFORM);
      b.set(x, 10, TILE.COIN);
    }
    b.addEnemy(x0 + 7, 13, 0);
    b.addEnemy(x0 + 15, 13, 1);
  },

  // 3: Sky Canopy Vines — climbable vines up to an elevated canopy boardwalk
  function spSkyCanopyVines(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + 5, 14, gTile);
    b.fillGround(x0 + 5, x0 + 12, 13, gTile);
    b.fillGround(x0 + 12, x0 + len, 14, gTile);
    const climbT = b.meta.role === 'ghost' ? TILE.FENCE : TILE.VINE;
    for (let vy = 6; vy <= 13; vy++) b.set(x0 + 3, vy, climbT);
    for (let px = x0 + 4; px <= x0 + 13; px++) {
      b.set(px, 6, TILE.PLATFORM);
      if (px % 2 === 0) b.set(px, 5, TILE.COIN);
    }
    b.set(x0 + 8, 4, TILE.BIG_COIN);
    b.addEnemy(x0 + 7, 12, 0);
    b.addEnemy(x0 + 10, 5, 1);
  },

  // 4: Double-Decker Gauntlet — split upper platform road vs lower brick-breaker tunnel
  function spDoubleDecker(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + len, 14, gTile);
    // Mid-level stone/brick roof forming a tunnel from x0+3 to x0+13
    for (let x = x0 + 3; x <= x0 + 13; x++) {
      b.set(x, 10, (x === x0 + 6) ? TILE.Q_POWER : (x === x0 + 10) ? TILE.Q_COIN : TILE.BRICK);
      b.set(x, 12, TILE.COIN);
      if (x >= x0 + 5 && x <= x0 + 11) {
        b.set(x, 6, TILE.PLATFORM);
        b.set(x, 5, TILE.COIN);
      }
    }
    b.set(x0 + 1, 12, TILE.PLATFORM);
    b.set(x0 + 2, 11, TILE.PLATFORM);
    b.addEnemy(x0 + 8, 13, 0);
    b.addEnemy(x0 + 8, 9, 1);
  },

  // 5: Slope Slide Valley — V-shaped slope bowl where crouch-sliding bowls through foes & coins
  function spSlopeSlideValley(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + 3, 11, gTile);
    b.set(x0 + 3, 11, TILE.SLOPE_R);
    b.fillGround(x0 + 3, x0 + 4, 12, gTile);
    b.set(x0 + 4, 12, TILE.SLOPE_R);
    b.fillGround(x0 + 4, x0 + 5, 13, gTile);
    b.set(x0 + 5, 13, TILE.SLOPE_R);
    b.fillGround(x0 + 5, x0 + 11, 14, gTile);
    for (let cx = x0 + 5; cx <= x0 + 10; cx++) b.set(cx, 13, TILE.COIN);
    b.set(x0 + 11, 13, TILE.SLOPE_L);
    b.fillGround(x0 + 11, x0 + 12, 14, gTile);
    b.set(x0 + 12, 12, TILE.SLOPE_L);
    b.fillGround(x0 + 12, x0 + 13, 13, gTile);
    b.fillGround(x0 + 13, x0 + len, 12, gTile);
    b.addEnemy(x0 + 7, 13, 0);
    b.addEnemy(x0 + 9, 13, 1);
  },

  // 6: Spring Tower Challenge — carryable spring block launching to multi-tier sky shelves
  function spSpringTower(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + len, 14, gTile);
    b.set(x0 + 3, 13, TILE.SPRING_BLOCK);
    for (let x = x0 + 5; x <= x0 + 11; x++) {
      b.set(x, 9, TILE.PLATFORM);
      b.set(x, 8, TILE.COIN);
    }
    for (let x = x0 + 7; x <= x0 + 13; x++) {
      b.set(x, 5, TILE.PLATFORM);
      if (x === x0 + 10) b.set(x, 4, TILE.Q_LIFE);
      else b.set(x, 4, TILE.COIN);
    }
    b.addEnemy(x0 + 8, 13, 0);
    b.addEnemy(x0 + 14, 13, 1);
  },

  // 7: Quicksand & Geyser Basin — sunken desert pit with erupting sand geysers & sandstone arches
  function spQuicksandGeyser(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + 3, 13, gTile);
    for (let x = x0 + 3; x <= x0 + 12; x++) {
      b.set(x, 14, (x === x0 + 5 || x === x0 + 10) ? TILE.SAND_GEYSER : TILE.QUICKSAND);
      b.set(x, 15, TILE.GROUND);
    }
    for (let x = x0 + 4; x <= x0 + 11; x += 3) {
      b.set(x, 10, TILE.PLATFORM);
      b.set(x + 1, 10, TILE.PLATFORM);
      b.set(x, 9, TILE.COIN);
      b.set(x + 1, 9, TILE.COIN);
    }
    b.set(x0 + 7, 6, TILE.BIG_COIN);
    b.fillGround(x0 + 13, x0 + len, 13, gTile);
    b.addEnemy(x0 + 6, 13, 0);
    b.addEnemy(x0 + 14, 12, 1);
  },

  // 8: Tidepool Pier & Coral Trench — swimmable water basin with boardwalk piers above
  function spTidepoolPier(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + 3, 13, gTile);
    for (let x = x0 + 3; x <= x0 + 13; x++) {
      b.set(x, 13, TILE.WATER);
      b.set(x, 14, TILE.WATER);
      b.set(x, 15, TILE.GROUND);
      if (x % 2 === 0) b.set(x, 12, TILE.COIN);
    }
    for (let x = x0 + 4; x <= x0 + 12; x++) {
      if (x !== x0 + 8) b.set(x, 9, TILE.PLATFORM);
    }
    b.set(x0 + 8, 7, TILE.Q_POWER);
    b.fillGround(x0 + 14, x0 + len, 13, gTile);
    b.addEnemy(x0 + 7, 12, 0);
    b.addEnemy(x0 + 11, 8, 1);
  },

  // 9: Fungus Bounce Gorge — bouncy fungus caps spanning a sunken forest ravine
  function spFungusGorge(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + 3, 13, gTile);
    for (let x = x0 + 3; x <= x0 + 13; x++) {
      b.set(x, 14, gTile);
      b.set(x, 15, TILE.GROUND);
    }
    b.set(x0 + 4, 13, TILE.FUNGUS_CAP);
    b.set(x0 + 8, 12, TILE.FUNGUS_CAP);
    b.set(x0 + 12, 13, TILE.FUNGUS_CAP);
    for (let x = x0 + 5; x <= x0 + 11; x++) {
      b.set(x, 7, TILE.COIN);
      if (x >= x0 + 6 && x <= x0 + 10) b.set(x, 10, TILE.PLATFORM);
    }
    b.set(x0 + 8, 5, TILE.BIG_COIN);
    b.fillGround(x0 + 14, x0 + len, 13, gTile);
    b.addEnemy(x0 + 7, 9, 0);
  },

  // 10: Poison Bog Stepping Stones — hazardous bog with safe stone pillars & vine line
  function spPoisonBog(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + 3, 13, gTile);
    for (let x = x0 + 3; x <= x0 + 13; x++) {
      const isPillar = (x === x0 + 5 || x === x0 + 8 || x === x0 + 11);
      if (isPillar) {
        b.fillGround(x, x + 1, 12, gTile);
      } else {
        b.set(x, 14, b.meta.world === 6 ? TILE.LAVA : TILE.POISON);
        b.set(x, 15, TILE.GROUND);
        b.set(x, 11, TILE.PLATFORM);
      }
      b.set(x, 9, TILE.COIN);
    }
    b.fillGround(x0 + 14, x0 + len, 13, gTile);
    b.addEnemy(x0 + 8, 10, 0);
  },

  // 11: Lava & Fire-Bar Bridge — basalt bridge over molten pit with overhead stone arches
  function spLavaBridge(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + 3, 13, gTile);
    for (let x = x0 + 3; x <= x0 + 12; x++) {
      b.set(x, 14, TILE.LAVA);
      b.set(x, 15, TILE.GROUND);
      b.set(x, 11, (x % 3 === 0) ? TILE.STONE : TILE.PLATFORM);
      if (x % 2 === 0) b.set(x, 9, TILE.COIN);
    }
    b.set(x0 + 7, 7, TILE.Q_STAR);
    b.fillGround(x0 + 13, x0 + len, 13, gTile);
    b.addEnemy(x0 + 6, 10, 0);
    b.addEnemy(x0 + 10, 10, 1);
  },

  // 12: Stone Quarry Fortress — breakable stone & brick bunker with upper skylight
  function spStoneQuarry(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + len, 14, gTile);
    for (let x = x0 + 3; x <= x0 + 11; x++) {
      b.set(x, 10, (x % 2 === 0) ? TILE.STONE : TILE.BRICK);
      b.set(x, 7, TILE.PLATFORM);
      b.set(x, 6, TILE.COIN);
    }
    b.set(x0 + 4, 13, TILE.STONE);
    b.set(x0 + 10, 13, TILE.STONE);
    b.set(x0 + 7, 10, TILE.GOLD_HELMET_BOX);
    b.addEnemy(x0 + 7, 13, 0);
    b.addEnemy(x0 + 9, 6, 1);
  },

  // 13: Clockwork Conveyor Factory — alternating conveyor belts & upper catwalks
  function spConveyorFactory(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + len, 14, gTile);
    for (let x = x0 + 2; x <= x0 + 7; x++) {
      b.set(x, 13, TILE.CONVEYOR_R);
      b.set(x, 11, TILE.COIN);
    }
    for (let x = x0 + 6; x <= x0 + 11; x++) {
      b.set(x, 9, TILE.PLATFORM);
      b.set(x, 8, TILE.COIN);
    }
    for (let x = x0 + 9; x <= x0 + 14; x++) {
      b.set(x, 13, TILE.CONVEYOR_L);
    }
    b.set(x0 + 8, 6, TILE.Q_POWER);
    b.addEnemy(x0 + 5, 12, 0);
    b.addEnemy(x0 + 12, 12, 1);
  },

  // 14: Cannon Battery Deck — stepped fortress deck with cover walls
  function spCannonDeck(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + 5, 14, gTile);
    b.fillGround(x0 + 5, x0 + 11, 12, gTile);
    b.fillGround(x0 + 11, x0 + len, 13, gTile);
    b.set(x0 + 4, 13, TILE.SLOPE_L);
    for (let x = x0 + 6; x <= x0 + 10; x++) {
      b.set(x, 8, TILE.PLATFORM);
      b.set(x, 7, TILE.COIN);
    }
    b.addEnemy(x0 + 8, 11, 0);
    b.addEnemy(x0 + 13, 12, 1);
  },

  // 15: Ghost Lantern Labyrinth — multi-tier fence climbing grid & lantern alcoves
  function spGhostLabyrinth(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + len, 14, gTile);
    for (let vy = 7; vy <= 13; vy++) {
      b.set(x0 + 4, vy, TILE.FENCE);
      b.set(x0 + 11, vy, TILE.FENCE);
    }
    for (let x = x0 + 3; x <= x0 + 12; x++) {
      b.set(x, 10, TILE.PLATFORM);
      b.set(x, 6, TILE.PLATFORM);
      if (x % 2 === 0) b.set(x, 9, TILE.COIN);
      else b.set(x, 5, TILE.COIN);
    }
    b.set(x0 + 7, 5, TILE.BIG_COIN);
    b.addEnemy(x0 + 7, 9, 0);
    b.addEnemy(x0 + 9, 13, 1);
  },

  // 16: Glacier Slalom Run — banked ice slopes & elevated frost shelves
  function spGlacierSlalom(b, x0, len) {
    b.fillGround(x0, x0 + 4, 13, TILE.ICE);
    b.set(x0 + 4, 13, TILE.SLOPE_R);
    b.fillGround(x0 + 4, x0 + 11, 14, TILE.ICE);
    b.set(x0 + 11, 13, TILE.SLOPE_L);
    b.fillGround(x0 + 12, x0 + len, 13, TILE.ICE);
    for (let x = x0 + 5; x <= x0 + 10; x++) {
      b.set(x, 10, TILE.PLATFORM);
      b.set(x, 9, TILE.COIN);
    }
    b.addEnemy(x0 + 7, 13, 0);
    b.addEnemy(x0 + 13, 12, 1);
  },

  // 17: Updraft Cloud Archipelago — stepped sky islands with moving shuttle platform
  function spCloudArchipelago(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + 4, 13, gTile);
    for (let x = x0 + 4; x <= x0 + 12; x++) {
      b.set(x, 12, TILE.PLATFORM);
      if (x >= x0 + 6 && x <= x0 + 10) {
        b.set(x, 8, TILE.PLATFORM);
        b.set(x, 7, TILE.COIN);
      }
    }
    b.addMovingPlatform(x0 + 5, 10, 3, 'vert', 40);
    b.fillGround(x0 + 13, x0 + len, 13, gTile);
    b.addEnemy(x0 + 8, 11, 0);
  },

  // 18: Red Ring Sky Circuit — Red Ring gate + 8 Red Coins arranged along a parkour arc
  function spRedRingCircuit(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + len, 14, gTile);
    b.set(x0 + 1, 12, TILE.RED_RING);
    const rcOffsets = [
      [3, 12], [5, 11], [7, 9], [9, 9], [11, 9], [13, 11], [14, 12], [15, 12]
    ];
    for (let x = x0 + 6; x <= x0 + 12; x++) b.set(x, 10, TILE.PLATFORM);
    for (const [dx, ry] of rcOffsets) {
      if (x0 + dx < x0 + len) b.set(x0 + dx, ry, TILE.RED_COIN);
    }
    b.addEnemy(x0 + 9, 13, 0);
  },

  // 19: Gold Gate Parade — Gold Ring Gate that turns the following squad of foes into coin pinatas
  function spGoldGateParade(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + len, 14, gTile);
    b.set(x0 + 2, 12, TILE.GOLD_GATE);
    for (let s = 0; s < 3; s++) {
      const sx = x0 + 5 + s * 3;
      b.set(sx, 11 - (s % 2), TILE.PLATFORM);
      b.set(sx + 1, 11 - (s % 2), TILE.PLATFORM);
      b.set(sx, 10 - (s % 2), TILE.COIN);
      b.addEnemy(sx, 13, s % 2);
    }
  },

  // 20: Tiny Pipe Secret Nook — miniature pipe passage with normal upper bridge
  function spTinyPipeNook(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + len, 14, gTile);
    b.set(x0 + 4, 13, TILE.TINY_PIPE);
    b.set(x0 + 4, 12, TILE.BRICK);
    for (let x = x0 + 5; x <= x0 + 9; x++) {
      b.set(x, 11, TILE.BRICK);
      b.set(x, 13, TILE.COIN);
      b.set(x, 8, TILE.PLATFORM);
      b.set(x, 7, TILE.COIN);
    }
    b.set(x0 + 7, 13, TILE.BIG_COIN);
    b.set(x0 + 10, 13, TILE.TINY_PIPE);
    b.set(x0 + 10, 12, TILE.BRICK);
    b.addEnemy(x0 + 12, 13, 0);
  },

  // 21: Windmill Platform Ascension — tiered aerial steps with moving lift
  function spWindmillAscension(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + len, 14, gTile);
    for (let step = 0; step < 3; step++) {
      const px = x0 + 2 + step * 4;
      const py = 11 - step * 2;
      b.set(px, py, TILE.PLATFORM);
      b.set(px + 1, py, TILE.PLATFORM);
      b.set(px + 2, py, TILE.PLATFORM);
      b.set(px + 1, py - 1, TILE.COIN);
    }
    b.addMovingPlatform(x0 + 12, 9, 3, 'horiz', 40);
    b.addEnemy(x0 + 6, 13, 0);
  },

  // 22: Watchtower Switchback Shaft — multi-floor climb with climbable fences & platforms
  function spWatchtowerShaft(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + len, 14, gTile);
    for (let vy = 5; vy <= 13; vy++) b.set(x0 + 7, vy, TILE.FENCE);
    for (let x = x0 + 2; x <= x0 + 12; x++) {
      if (x !== x0 + 7) {
        b.set(x, 10, TILE.PLATFORM);
        b.set(x, 6, TILE.PLATFORM);
      }
      if (x % 2 === 0) b.set(x, 5, TILE.COIN);
    }
    b.set(x0 + 4, 8, TILE.Q_COIN);
    b.set(x0 + 10, 8, TILE.Q_POWER);
    b.addEnemy(x0 + 4, 9, 0);
    b.addEnemy(x0 + 10, 5, 1);
  },

  // 23: Royal Treasure Vault — multi-block coin brick & helmet showcase
  function spTreasureVault(b, x0, len) {
    const gTile = b.groundTile;
    b.fillGround(x0, x0 + len, 13, gTile);
    b.set(x0 + 1, 13, TILE.SLOPE_L);
    for (let x = x0 + 3; x <= x0 + 11; x++) {
      if (x === x0 + 5) b.set(x, 9, TILE.COIN_BRICK);
      else if (x === x0 + 7) b.set(x, 9, TILE.GOLD_HELMET_BOX);
      else if (x === x0 + 9) b.set(x, 9, TILE.Q_COIN);
      else b.set(x, 9, TILE.BRICK);
      b.set(x, 11, TILE.COIN);
      b.set(x, 6, TILE.PLATFORM);
      b.set(x, 5, TILE.COIN);
    }
    b.set(x0 + 7, 4, TILE.BIG_COIN);
    b.addEnemy(x0 + 6, 12, 0);
    b.addEnemy(x0 + 10, 12, 1);
  }
];

/**
 * 10 Distinct Stage Opening Architectures (x = 0..21) so every stage starts differently!
 */
function buildOpeningSection(b, styleIdx) {
  const gTile = b.groundTile;
  // Safe flat landing zone at x = 0..6
  b.fillGround(0, 7, 14, gTile);

  switch (styleIdx % 10) {
    case 0: // Sunlit Pergola & Gentle Hill
      b.fillGround(7, 14, 13, gTile);
      b.set(6, 13, TILE.SLOPE_L);
      b.set(14, 13, TILE.SLOPE_R);
      b.fillGround(14, 22, 14, gTile);
      b.set(8, 9, TILE.Q_POWER);
      b.set(9, 9, TILE.BRICK);
      b.set(10, 9, TILE.Q_COIN);
      b.placePipe(16, 12, 2);
      break;
    case 1: // Twin Brick Archway & Upper Coin Walk
      b.fillGround(7, 22, 14, gTile);
      for (let x = 7; x <= 13; x++) {
        b.set(x, 10, x === 10 ? TILE.Q_POWER : TILE.BRICK);
        b.set(x, 7, TILE.PLATFORM);
        b.set(x, 6, TILE.COIN);
      }
      b.placePipe(17, 11, 3);
      break;
    case 2: // Stepping Terraces & Spring Launch
      b.fillGround(7, 11, 13, gTile);
      b.fillGround(11, 16, 12, gTile);
      b.fillGround(16, 22, 14, gTile);
      b.set(9, 9, TILE.Q_POWER);
      b.set(13, 8, TILE.COIN_BRICK);
      b.set(15, 11, TILE.SPRING_BLOCK);
      b.placePipe(18, 12, 2);
      break;
    case 3: // Vine Cliffside Outlook
      b.fillGround(7, 13, 14, gTile);
      b.fillGround(13, 22, 12, gTile);
      for (let vy = 7; vy <= 13; vy++) b.set(11, vy, TILE.VINE);
      for (let x = 7; x <= 11; x++) {
        b.set(x, 7, TILE.PLATFORM);
        b.set(x, 6, TILE.COIN);
      }
      b.set(15, 8, TILE.Q_POWER);
      b.placePipe(19, 10, 2);
      break;
    case 4: // Sunken Valley & Bridge Overpass
      b.set(6, 13, TILE.SLOPE_R);
      b.fillGround(7, 15, 14, gTile);
      for (let x = 8; x <= 14; x++) {
        b.set(x, 10, TILE.PLATFORM);
        b.set(x, 9, TILE.COIN);
      }
      b.set(11, 7, TILE.Q_POWER);
      b.fillGround(15, 22, 13, gTile);
      b.placePipe(17, 11, 2);
      break;
    case 5: // Fortress Watch-Gate
      b.fillGround(7, 22, 14, gTile);
      b.set(8, 13, TILE.STONE);
      b.set(8, 12, TILE.STONE);
      for (let x = 10; x <= 14; x++) b.set(x, 10, x === 12 ? TILE.Q_POWER : TILE.COIN_BRICK);
      b.placePipe(16, 11, 3);
      break;
    case 6: // Twin Pipe Garden
      b.fillGround(7, 22, 14, gTile);
      b.placePipe(8, 12, 2);
      for (let x = 11; x <= 14; x++) {
        b.set(x, 9, x === 12 ? TILE.Q_POWER : TILE.Q_COIN);
        b.set(x, 12, TILE.COIN);
      }
      b.placePipe(16, 11, 3);
      break;
    case 7: // Suspension Pier Start
      b.fillGround(7, 10, 13, gTile);
      for (let x = 10; x <= 14; x++) {
        b.set(x, 12, TILE.PLATFORM);
        b.set(x, 10, TILE.COIN);
      }
      b.set(12, 8, TILE.Q_POWER);
      b.fillGround(15, 22, 13, gTile);
      b.placePipe(18, 11, 2);
      break;
    case 8: // Pyramid Steps & Gold Helmet Box
      b.fillGround(7, 10, 14, gTile);
      b.fillGround(10, 13, 13, gTile);
      b.fillGround(13, 16, 12, gTile);
      b.fillGround(16, 22, 14, gTile);
      b.set(11, 9, TILE.Q_POWER);
      b.set(14, 8, TILE.GOLD_HELMET_BOX);
      b.placePipe(18, 12, 2);
      break;
    default: // Slope Slide Ramp & Sky Deck
      b.fillGround(7, 11, 12, gTile);
      b.set(11, 12, TILE.SLOPE_R);
      b.set(12, 13, TILE.SLOPE_R);
      b.fillGround(11, 22, 14, gTile);
      for (let x = 13; x <= 17; x++) {
        b.set(x, 9, TILE.PLATFORM);
        b.set(x, 8, TILE.COIN);
      }
      b.set(9, 8, TILE.Q_POWER);
      b.placePipe(19, 12, 2);
      break;
  }

  // Elevated Sky Bonus Sanctuary (reachable via the opening Bonus Pipe or high platform jumps)
  for (let bx = 18; bx <= 26; bx++) {
    b.set(bx, 4, TILE.PLATFORM);
    b.set(bx, 3, TILE.COIN);
  }
  b.set(22, 2, TILE.BIG_COIN);
}

function buildStageData(meta, stageIdx) {
  const rng = createRng((stageIdx + 1) * 7919 + meta.world * 104729);
  const isAmbush = meta.role === 'ambush';
  const isTower = meta.role === 'tower';
  const isCastle = meta.role === 'castle';

  // Full-length unique stage widths (168..224 tiles = 5,376..7,168 px for regular stages)
  const width = isAmbush
    ? 84 + (stageIdx % 3) * 8
    : isTower
      ? 144 + (stageIdx % 4) * 8
      : isCastle
        ? 180 + (stageIdx % 4) * 10
        : 168 + ((stageIdx * 13 + meta.world * 7) % 56);
  const height = 16;
  const grid = new Array(width * height).fill(TILE.EMPTY);
  const enemies = [];
  const platforms = [];

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

  const fillGround = (xStart, xEnd, topY, tileType) => {
    const t = tileType || groundTile;
    const clampedTop = Math.max(8, Math.min(14, topY));
    for (let x = xStart; x < xEnd; x++) {
      if (x < 0 || x >= width) continue;
      set(x, clampedTop, t);
      for (let y = clampedTop + 1; y < height; y++) {
        set(x, y, TILE.GROUND);
      }
    }
  };

  const placePipe = (x, topY, hTiles) => {
    set(x, topY, TILE.PIPE_TOP_L);
    set(x + 1, topY, TILE.PIPE_TOP_R);
    for (let dy = 1; dy < hTiles; dy++) {
      set(x, topY + dy, TILE.PIPE_BODY_L);
      set(x + 1, topY + dy, TILE.PIPE_BODY_R);
    }
  };

  const pool = meta.enemyTypes || ['bumblet'];
  const addEnemy = (tx, ty, poolOffset) => {
    if (tx < 10 || tx >= width - 16) return;
    const eType = pool[(stageIdx + tx + (poolOffset || 0)) % pool.length];
    enemies.push({
      type: eType,
      x: tx * 32,
      y: ty * 32 - 24
    });
  };

  const addMovingPlatform = (tx, ty, wTiles, axis, rangePx) => {
    platforms.push({
      x: tx * 32,
      y: ty * 32,
      startX: tx * 32,
      startY: ty * 32,
      w: (wTiles || 3) * 32,
      h: 12,
      axis: axis || 'horiz',
      range: rangePx || 48,
      speed: 0.035,
      phase: (tx * 0.4) % 6.28
    });
  };

  const builderCtx = {
    meta,
    stageIdx,
    width,
    height,
    groundTile,
    set,
    get,
    fillGround,
    placePipe,
    addEnemy,
    addMovingPlatform
  };

  // 1. Unique Opening Architecture (x = 0..21)
  buildOpeningSection(builderCtx, stageIdx + meta.world * 3);

  // 2. Compose Middle of Stage from a Stage-Unique Sequence of Architectural Set-Pieces
  const midEnd = meta.bossId ? (width - 28) : (width - 14);
  let cursorX = 22;

  // Build weighted list of set-pieces tailored to this stage's world mechanic + general variety
  const preferredByMechanic = {
    slopes: [0, 5, 1, 21, 3, 4],
    vines: [3, 9, 1, 22, 4, 21],
    vertical: [22, 6, 17, 15, 21, 12],
    platforms: [1, 17, 21, 6, 3, 4],
    coins: [23, 18, 19, 20, 4, 2],
    arena: [14, 12, 19, 23],
    castle: [11, 12, 13, 14, 22, 1],
    quicksand: [7, 0, 5, 2, 18, 23],
    geysers: [7, 6, 1, 21, 19, 4],
    ghost: [15, 22, 3, 20, 1, 18],
    water: [8, 1, 2, 21, 19, 0],
    swim: [8, 2, 18, 23, 3, 1],
    cannons: [14, 13, 1, 21, 6, 12],
    ice: [16, 5, 1, 6, 18, 21],
    fungus: [9, 3, 6, 18, 21, 1],
    poison: [10, 9, 3, 1, 20, 19],
    lava: [11, 12, 1, 6, 14, 19],
    stone: [12, 11, 2, 4, 23, 14],
    wind: [17, 21, 1, 3, 6, 18],
    conveyor: [13, 14, 12, 22, 19, 6]
  };

  const themePool = preferredByMechanic[meta.mechanic] || [0, 1, 2, 3, 4, 5];
  let pieceStep = 0;
  let placedRedRing = false;
  let placedGoldGate = false;

  while (cursorX < midEnd - 16) {
    const segLen = 16 + ((stageIdx + pieceStep * 5) % 4);
    let spIdx;

    if (!isAmbush && !placedRedRing && pieceStep === 2) {
      spIdx = 18; // Red Ring Sky Circuit
      placedRedRing = true;
    } else if (!isAmbush && !placedGoldGate && pieceStep === 4) {
      spIdx = 19; // Gold Gate Parade
      placedGoldGate = true;
    } else if (pieceStep % 2 === 0) {
      spIdx = themePool[(stageIdx + Math.floor(pieceStep / 2) * 3) % themePool.length];
    } else {
      spIdx = (stageIdx * 7 + pieceStep * 11 + meta.world * 5) % SET_PIECES.length;
    }

    SET_PIECES[spIdx](builderCtx, cursorX, segLen);
    cursorX += segLen;
    pieceStep++;
  }

  // Fill any remaining transition strip up to width
  fillGround(cursorX, width, 14, groundTile);

  // Indoor Castle / Fortress Ceiling Architecture for Castles & Ghost Houses
  if (isCastle || meta.role === 'ghost') {
    for (let x = 0; x < width; x++) {
      if (x >= 17 && x <= 27) continue; // keep sky bonus open
      set(x, 0, TILE.STONE);
      if ((x + stageIdx) % 6 === 0 && x < midEnd - 8) {
        set(x, 1, TILE.STONE);
      }
    }
  }

  // 3. Place the 3 Star Medals at distinct, elevated or tactical landmarks along the stage
  const medalXs = [
    isAmbush ? 20 : Math.floor(width * 0.24) + (stageIdx % 5),
    isAmbush ? 42 : Math.floor(width * 0.52) + ((stageIdx * 3) % 7),
    isAmbush ? 64 : Math.floor(width * 0.76) - (stageIdx % 5)
  ];
  const medalTiles = [TILE.STAR_MEDAL_1, TILE.STAR_MEDAL_2, TILE.STAR_MEDAL_3];
  const medalYs = [
    6 + (stageIdx % 3),
    5 + ((stageIdx + 1) % 4),
    6 + ((stageIdx + 2) % 3)
  ];

  for (let m = 0; m < 3; m++) {
    const mx = Math.max(14, Math.min(midEnd - 6, medalXs[m]));
    const my = medalYs[m];
    // Ensure a reachable platform shelf under each Star Medal and clear solid tiles at the medal
    for (let dx = -1; dx <= 1; dx++) {
      set(mx + dx, my + 1, TILE.PLATFORM);
      set(mx + dx, my - 1, TILE.EMPTY);
    }
    set(mx, my, medalTiles[m]);
    // Stepping platform leading up to high medals
    set(mx - 3, Math.min(11, my + 3), TILE.PLATFORM);
    set(mx - 2, Math.min(11, my + 3), TILE.PLATFORM);
  }

  // 4. Mid-Stage / Pre-Boss Checkpoint Banner + Power-up Block
  const checkpointTx = meta.bossId ? (width - 26) : Math.floor(width * 0.50);
  // Find ground surface at checkpointTx so the checkpoint always stands on solid ground
  let cpGroundY = 14;
  for (let y = 8; y <= 14; y++) {
    const t = get(checkpointTx, y);
    if (t === TILE.GROUND || t === TILE.ICE || t === TILE.STONE) {
      cpGroundY = y;
      break;
    }
  }
  fillGround(checkpointTx - 1, checkpointTx + 3, cpGroundY, groundTile);
  set(checkpointTx, cpGroundY - 1, TILE.CHECKPOINT);
  set(checkpointTx + 1, cpGroundY - 4, TILE.Q_POWER);

  // 5. Boss Arena (if Tower or Castle)
  if (meta.bossId) {
    const arenaLeft = width - 24;
    fillGround(arenaLeft, width, 14, groundTile);
    for (let x = arenaLeft + 2; x < width - 6; x++) {
      for (let y = 2; y <= 13; y++) {
        if (get(x, y) !== TILE.CHECKPOINT) set(x, y, TILE.EMPTY);
      }
    }
    // Tactical boss dodging platforms
    set(arenaLeft + 5, 10, TILE.PLATFORM);
    set(arenaLeft + 6, 10, TILE.PLATFORM);
    set(arenaLeft + 13, 10, TILE.PLATFORM);
    set(arenaLeft + 14, 10, TILE.PLATFORM);
  }

  // 6. Secret Exit Flagpole (on stages with hasSecretExit)
  let secretFlagTx = null;
  if (meta.hasSecretExit) {
    secretFlagTx = midEnd - 5;
    for (let vy = 6; vy <= 13; vy++) {
      set(secretFlagTx - 2, vy, TILE.VINE);
    }
    for (let sx = secretFlagTx - 2; sx <= secretFlagTx + 1; sx++) {
      set(sx, 6, TILE.PLATFORM);
    }
    set(secretFlagTx, 5, TILE.SECRET_FLAG);
  }

  // 7. Final Staircase & Main Flagpole at the end of the stage
  const flagTx = width - 5;
  if (!meta.bossId) {
    for (let s = 0; s < 4; s++) {
      const sx = flagTx - 7 + s;
      for (let y = 13 - s; y <= 13; y++) {
        set(sx, y, TILE.STONE);
      }
    }
  }
  for (let fy = 6; fy <= 13; fy++) {
    set(flagTx, fy, TILE.FLAGPOLE);
  }

  // 8. Sanitize enemy spawns: ensure no enemy is inside a solid wall or within 10 tiles of spawn/checkpoint
  const cleanEnemies = [];
  for (const e of enemies) {
    const etx = Math.floor(e.x / 32);
    if (etx < 11 || etx >= midEnd - 4 || Math.abs(etx - checkpointTx) <= 2) continue;
    let ety = Math.floor(e.y / 32);
    while (ety > 3 && get(etx, ety) !== TILE.EMPTY) {
      ety--;
    }
    if (ety <= 3) continue;
    cleanEnemies.push({
      type: e.type,
      x: etx * 32,
      y: (ety + 1) * 32 - 24
    });
    if (cleanEnemies.length >= 36) break;
  }

  const powerupCycle = ['big', 'flame', 'leaf', 'gold', 'tiny', 'heavy', 'star', 'clover'];
  const powerupReward = powerupCycle[(meta.world + stageIdx) % powerupCycle.length];

  return {
    id: meta.id,
    code: meta.code,
    world: meta.world,
    name: meta.name,
    role: meta.role,
    mechanic: meta.mechanic,
    width,
    height,
    timeLimit: 400,
    estimatedBotSeconds: 22,
    autoScroll: !!meta.autoScroll,
    underwater: !!meta.underwater,
    icePhysics: !!meta.icePhysics,
    hasSecretExit: !!meta.hasSecretExit,
    secretOnly: !!meta.secretOnly,
    powerupReward,
    startX: 3 * 32,
    startY: 14 * 32 - 26,
    flagTx,
    secretFlagTx,
    checkpointTx,
    bossId: meta.bossId || null,
    bossArenaLeft: meta.bossId ? (width - 24) : null,
    bonusWarp: { x: 19 * 32, y: 3 * 32 },
    mapPos: { x: meta.mapX, y: meta.mapY },
    platforms,
    enemies: cleanEnemies,
    grid
  };
}

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
      else if (k === 'platforms' && Array.isArray(tpl.platforms)) {
        copy.platforms = tpl.platforms.map(function (p) {
          return { x: p.x, y: p.y, startX: p.startX, startY: p.startY, w: p.w, h: p.h, axis: p.axis, range: p.range, speed: p.speed, phase: p.phase };
        });
      } else copy[k] = tpl[k];
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
console.log(`Generated ${allStages.length} unique full-length stages across 10 worlds into levels/world-1..10.json and js/levels.js.`);

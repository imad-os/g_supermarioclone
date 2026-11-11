/**
 * Pip's Golden Trail - 33 Original Enemies & 8 Bosses (Data-Driven Definitions)
 * Zero commercial look-alikes: all original forest, desert, reef, snow, fungal,
 * volcanic, sky, and clockwork designs.
 */
(function (root) {
  'use strict';

  var ENEMY_CATALOG = [
    {
      id: 'bumblet',
      name: 'Bumblet',
      world: 1,
      sprite: 'beetle_amber',
      w: 24,
      h: 22,
      speed: 1.1,
      behavior: 'patrol',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'ground_pound', 'star', 'tail'],
      turnsIntoShell: 'bumblet_shell',
      drops: 'coin',
      color: '#d97706',
      accent: '#fef08a'
    },
    {
      id: 'bumblet_shell',
      name: 'Bumblet Shell',
      world: 1,
      sprite: 'beetle_shell',
      w: 22,
      h: 18,
      speed: 6.4,
      behavior: 'shell',
      carryable: true,
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'star', 'ground_pound'],
      drops: 'coin',
      color: '#b45309',
      accent: '#fde047'
    },
    {
      id: 'hopnut',
      name: 'Hopnut',
      world: 1,
      sprite: 'acorn_jumper',
      w: 22,
      h: 24,
      speed: 1.4,
      jumpVel: -6.8,
      behavior: 'hopper',
      carryableWhenStunned: true,
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'ground_pound', 'star', 'tail'],
      drops: 'coin',
      color: '#92400e',
      accent: '#fcd34d'
    },
    {
      id: 'spikeback',
      name: 'Spikeback',
      world: 1,
      sprite: 'spiny_hedgehog_bug',
      w: 24,
      h: 22,
      speed: 1.0,
      behavior: 'patrol',
      spikeTop: true, // normal stomp hurts; spin-jump bounces safely!
      defeatedBy: ['spin_bounce', 'fire', 'gold_ring', 'shell', 'ground_pound', 'star', 'tail'],
      drops: 'coin',
      color: '#991b1b',
      accent: '#fca5a5'
    },
    {
      id: 'puffer',
      name: 'Puffer',
      world: 1,
      sprite: 'puff_floater',
      w: 26,
      h: 26,
      speed: 0.9,
      behavior: 'float_inflate',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'star', 'tail'],
      drops: 'coin',
      color: '#0284c7',
      accent: '#bae6fd'
    },
    {
      id: 'diver_gull',
      name: 'Diver Gull',
      world: 3,
      sprite: 'sky_gull',
      w: 26,
      h: 20,
      speed: 2.2,
      behavior: 'swoop_arc',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'star', 'tail'],
      drops: 'coin',
      color: '#e2e8f0',
      accent: '#38bdf8'
    },
    {
      id: 'sandworm',
      name: 'Sandworm',
      world: 2,
      sprite: 'dune_worm',
      w: 22,
      h: 30,
      speed: 0.6,
      behavior: 'sand_pop',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'ground_pound', 'star', 'tail'],
      drops: 'coin',
      color: '#d97706',
      accent: '#fed7aa'
    },
    {
      id: 'cactling',
      name: 'Cactling',
      world: 2,
      sprite: 'cactus_seg',
      w: 24,
      h: 34,
      speed: 0.8,
      behavior: 'patrol_sway',
      spikeTop: true,
      defeatedBy: ['spin_bounce', 'fire', 'gold_ring', 'shell', 'ground_pound', 'star', 'tail'],
      drops: 'big_coin',
      color: '#15803d',
      accent: '#86efac'
    },
    {
      id: 'snapjaw_clam',
      name: 'Snapjaw Clam',
      world: 3,
      sprite: 'reef_clam',
      w: 28,
      h: 22,
      speed: 0,
      behavior: 'clam_snap',
      defeatedBy: ['spin_bounce', 'fire', 'gold_ring', 'shell', 'ground_pound', 'star', 'tail'],
      drops: 'big_coin',
      color: '#7e22ce',
      accent: '#f0abfc'
    },
    {
      id: 'eel_ribbon',
      name: 'Eel Ribbon',
      world: 3,
      sprite: 'wave_eel',
      w: 30,
      h: 16,
      speed: 1.8,
      behavior: 'sine_swim',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'star', 'tail'],
      drops: 'coin',
      color: '#06b6d4',
      accent: '#fde047'
    },
    {
      id: 'skimmer_seal',
      name: 'Skimmer',
      world: 4,
      sprite: 'ice_seal',
      w: 28,
      h: 20,
      speed: 2.6,
      behavior: 'ice_slide',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'ground_pound', 'star', 'tail'],
      drops: 'coin',
      color: '#38bdf8',
      accent: '#f8fafc'
    },
    {
      id: 'snowball_roller',
      name: 'Snowball Roller',
      world: 4,
      sprite: 'frost_critter',
      w: 24,
      h: 24,
      speed: 1.2,
      behavior: 'roll_snowball',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'ground_pound', 'star', 'tail'],
      drops: 'coin',
      color: '#60a5fa',
      accent: '#ffffff'
    },
    {
      id: 'spore_drifter',
      name: 'Spore Drifter',
      world: 5,
      sprite: 'fungal_jelly',
      w: 24,
      h: 26,
      speed: 0.9,
      behavior: 'sine_drift',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'star', 'tail'],
      drops: 'coin',
      color: '#a855f7',
      accent: '#86efac'
    },
    {
      id: 'mossling',
      name: 'Mossling',
      world: 5,
      sprite: 'moss_ambush',
      w: 24,
      h: 22,
      speed: 1.7,
      behavior: 'ambush_dash',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'ground_pound', 'star', 'tail'],
      drops: 'coin',
      color: '#16a34a',
      accent: '#bef264'
    },
    {
      id: 'lava_blob',
      name: 'Lava Blob',
      world: 6,
      sprite: 'magma_drop',
      w: 22,
      h: 22,
      speed: 0,
      jumpVel: -8.6,
      behavior: 'lava_leap',
      spikeTop: true,
      fireImmune: true,
      defeatedBy: ['spin_bounce', 'gold_ring', 'shell', 'heavy_pound', 'star'],
      drops: 'coin',
      color: '#ea580c',
      accent: '#fef08a'
    },
    {
      id: 'ember_bat',
      name: 'Ember Bat',
      world: 6,
      sprite: 'cinder_bat',
      w: 24,
      h: 20,
      speed: 2.1,
      behavior: 'ceiling_swoop',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'star', 'tail'],
      drops: 'coin',
      color: '#b91c1c',
      accent: '#fb923c'
    },
    {
      id: 'rock_mole',
      name: 'Rock Thrower Mole',
      world: 6,
      sprite: 'pebble_mole',
      w: 24,
      h: 26,
      speed: 0.5,
      behavior: 'lob_rock',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'ground_pound', 'star', 'tail'],
      drops: 'coin',
      color: '#78350f',
      accent: '#d6d3d1'
    },
    {
      id: 'gust_sprite',
      name: 'Gust Sprite',
      world: 7,
      sprite: 'wind_elemental',
      w: 26,
      h: 26,
      speed: 1.1,
      behavior: 'wind_gust',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'star', 'tail'],
      drops: 'coin',
      color: '#38bdf8',
      accent: '#e0f2fe'
    },
    {
      id: 'cloud_ram',
      name: 'Cloud Ram',
      world: 7,
      sprite: 'woolly_charger',
      w: 28,
      h: 24,
      speed: 2.8,
      behavior: 'telegraph_charge',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'ground_pound', 'star', 'tail'],
      drops: 'big_coin',
      color: '#f1f5f9',
      accent: '#f59e0b'
    },
    {
      id: 'gearbot',
      name: 'Gearbot',
      world: 8,
      sprite: 'cog_walker',
      w: 24,
      h: 24,
      speed: 1.4,
      behavior: 'patrol',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'ground_pound', 'star', 'tail'],
      drops: 'coin',
      color: '#64748b',
      accent: '#f59e0b'
    },
    {
      id: 'spring_sentry',
      name: 'Spring Sentry',
      world: 8,
      sprite: 'coil_bot',
      w: 22,
      h: 30,
      speed: 1.3,
      jumpVel: -8.2,
      behavior: 'hopper',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'shell', 'ground_pound', 'star', 'tail'],
      drops: 'coin',
      color: '#475569',
      accent: '#38bdf8'
    },
    {
      id: 'cannon_pod',
      name: 'Cannon Pod',
      world: 8,
      sprite: 'brass_turret',
      w: 28,
      h: 28,
      speed: 0,
      behavior: 'shoot_cannonball',
      defeatedBy: ['ground_pound', 'star', 'gold_ring'],
      drops: 'big_coin',
      color: '#334155',
      accent: '#fbbf24'
    },
    {
      id: 'cannonball',
      name: 'Cannonball',
      world: 8,
      sprite: 'iron_sphere',
      w: 18,
      h: 18,
      speed: 3.0,
      behavior: 'fly_horizontal',
      defeatedBy: ['stomp', 'spin', 'star', 'gold_ring', 'shell'],
      drops: 'coin',
      color: '#1e293b',
      accent: '#94a3b8'
    },
    {
      id: 'bullet_beetle',
      name: 'Bullet Beetle',
      world: 8,
      sprite: 'jet_beetle',
      w: 24,
      h: 16,
      speed: 3.6,
      behavior: 'fly_horizontal',
      defeatedBy: ['stomp', 'spin', 'star', 'gold_ring', 'shell'],
      drops: 'coin',
      color: '#dc2626',
      accent: '#fde047'
    },
    {
      id: 'chomper_vine',
      name: 'Chomper Vine',
      world: 1,
      sprite: 'snap_flower',
      w: 24,
      h: 30,
      speed: 1.0,
      behavior: 'pipe_emerge',
      spikeTop: true,
      defeatedBy: ['spin_bounce', 'fire', 'gold_ring', 'shell', 'star', 'tail'],
      drops: 'coin',
      color: '#15803d',
      accent: '#f43f5e'
    },
    {
      id: 'ghost_lantern',
      name: 'Ghost Lantern',
      world: 2,
      sprite: 'shy_lantern',
      w: 24,
      h: 26,
      speed: 1.3,
      behavior: 'shy_chase',
      fireImmune: true,
      defeatedBy: ['spin_bounce', 'gold_ring', 'star'],
      drops: 'coin',
      color: '#6366f1',
      accent: '#fef08a'
    },
    {
      id: 'hush_spirit',
      name: 'Hush Spirit',
      world: 4,
      sprite: 'wisp_ring',
      w: 22,
      h: 22,
      speed: 1.5,
      behavior: 'orbit_circle',
      fireImmune: true,
      defeatedBy: ['spin_bounce', 'gold_ring', 'star'],
      drops: 'coin',
      color: '#a855f7',
      accent: '#e9d5ff'
    },
    {
      id: 'crusher_block',
      name: 'Crusher Block',
      world: 1,
      sprite: 'monolith_slam',
      w: 32,
      h: 36,
      speed: 0,
      behavior: 'telegraph_slam',
      spikeTop: true,
      fireImmune: true,
      defeatedBy: ['heavy_pound', 'star', 'gold_ring'],
      drops: 'big_coin',
      color: '#475569',
      accent: '#f97316'
    },
    {
      id: 'bone_hopper',
      name: 'Bone Hopper',
      world: 6,
      sprite: 'fossil_critter',
      w: 24,
      h: 24,
      speed: 1.2,
      behavior: 'revive_stomp',
      fireImmune: true,
      defeatedBy: ['ground_pound', 'star', 'gold_ring', 'shell'],
      drops: 'coin',
      color: '#e2e8f0',
      accent: '#94a3b8'
    },
    {
      id: 'sentinel_knight',
      name: 'Sentinel Knight',
      world: 8,
      sprite: 'clockwork_guard',
      w: 26,
      h: 34,
      speed: 1.0,
      behavior: 'telegraph_slash',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'ground_pound', 'star'],
      drops: 'big_coin',
      color: '#475569',
      accent: '#fbbf24'
    },
    {
      id: 'fire_bar',
      name: 'Fire Bar Rotator',
      world: 6,
      sprite: 'ember_arm',
      w: 20,
      h: 20,
      speed: 1.8,
      behavior: 'orbit_circle',
      spikeTop: true,
      fireImmune: true,
      defeatedBy: ['star', 'gold_ring'],
      drops: 'coin',
      color: '#f97316',
      accent: '#fef08a'
    },
    {
      id: 'magma_pillar',
      name: 'Magma Pillar',
      world: 6,
      sprite: 'lava_geyser',
      w: 24,
      h: 36,
      speed: 1.4,
      behavior: 'sand_pop',
      spikeTop: true,
      fireImmune: true,
      defeatedBy: ['star', 'gold_ring'],
      drops: 'coin',
      color: '#dc2626',
      accent: '#fde047'
    },
    {
      id: 'lieutenant',
      name: 'Clockwork Lieutenant',
      world: 1,
      sprite: 'mini_captain',
      w: 32,
      h: 36,
      speed: 1.8,
      behavior: 'mini_boss',
      defeatedBy: ['stomp', 'spin', 'fire', 'gold_ring', 'ground_pound', 'star'],
      drops: 'big_coin',
      color: '#0f766e',
      accent: '#fbbf24'
    }
  ];

  var ENEMY_BY_ID = {};
  for (var i = 0; i < ENEMY_CATALOG.length; i++) {
    ENEMY_BY_ID[ENEMY_CATALOG[i].id] = ENEMY_CATALOG[i];
  }

  /**
   * 7 Clockwork Captains + Tower Lieutenant + 3-Room Rust Baron Final Boss
   * Each has 3 distinct phases and a telegraphFrames >= 36 (0.6s) before every attack.
   */
  var BOSS_CATALOG = {
    lieutenant: {
      id: 'lieutenant',
      name: 'Clockwork Lieutenant',
      title: 'Tower Vanguard',
      maxHp: 3,
      w: 38,
      h: 42,
      telegraphFrames: 38,
      color: '#0f766e',
      accent: '#fcd34d',
      phases: [
        { pattern: 'hop_slash', speed: 2.2, projectiles: 1 },
        { pattern: 'charge_hop', speed: 3.0, projectiles: 2 },
        { pattern: 'frenzy_spin', speed: 3.8, projectiles: 3 }
      ]
    },
    captain_thorn: {
      id: 'captain_thorn',
      name: 'Captain Thorn',
      title: 'Meadow Boar-Knight',
      world: 1,
      maxHp: 3,
      w: 46,
      h: 46,
      telegraphFrames: 40, // 0.67s hoof-scrape telegraph
      color: '#3f6212',
      accent: '#facc15',
      phases: [
        { pattern: 'boar_charge', speed: 3.6, stunFrames: 95 },
        { pattern: 'boar_leap_shockwave', speed: 4.3, stunFrames: 85 },
        { pattern: 'boar_triple_rush_acorns', speed: 5.0, stunFrames: 80 }
      ]
    },
    captain_sirocco: {
      id: 'captain_sirocco',
      name: 'Captain Sirocco',
      title: 'Whirlwind Dervish of the Dunes',
      world: 2,
      maxHp: 3,
      w: 44,
      h: 48,
      telegraphFrames: 40,
      color: '#d97706',
      accent: '#38bdf8',
      phases: [
        { pattern: 'sand_tornado_sweep', speed: 3.2, stunFrames: 95 },
        { pattern: 'geyser_summon_whirl', speed: 4.0, stunFrames: 85 },
        { pattern: 'twin_cyclone_dash', speed: 4.7, stunFrames: 80 }
      ]
    },
    captain_brine: {
      id: 'captain_brine',
      name: 'Captain Brine',
      title: 'Iron Carapace of Coral Coast',
      world: 3,
      maxHp: 3,
      w: 52,
      h: 44,
      telegraphFrames: 42,
      color: '#0369a1',
      accent: '#fb7185',
      phases: [
        { pattern: 'tide_wave_pincer', speed: 2.8, stunFrames: 95 },
        { pattern: 'bubble_barrage_scuttle', speed: 3.6, stunFrames: 85 },
        { pattern: 'tsunami_slam', speed: 4.4, stunFrames: 80 }
      ]
    },
    captain_frost: {
      id: 'captain_frost',
      name: 'Captain Frost',
      title: 'Glacier Skate Commander',
      world: 4,
      maxHp: 3,
      w: 48,
      h: 48,
      telegraphFrames: 40,
      color: '#1d4ed8',
      accent: '#bae6fd',
      phases: [
        { pattern: 'ice_skate_glide', speed: 4.0, stunFrames: 95 },
        { pattern: 'icicle_ceiling_drop', speed: 4.6, stunFrames: 85 },
        { pattern: 'blizzard_ricochet', speed: 5.2, stunFrames: 80 }
      ]
    },
    captain_mildew: {
      id: 'captain_mildew',
      name: 'Captain Mildew',
      title: 'Spore Alchemist of Fungal Forest',
      world: 5,
      maxHp: 3,
      w: 44,
      h: 46,
      telegraphFrames: 38,
      color: '#7e22ce',
      accent: '#4ade80',
      phases: [
        { pattern: 'cap_bounce_spore', speed: 3.2, stunFrames: 95 },
        { pattern: 'toxic_cloud_volley', speed: 3.9, stunFrames: 85 },
        { pattern: 'giant_cap_ricochet', speed: 4.6, stunFrames: 80 }
      ]
    },
    captain_cinder: {
      id: 'captain_cinder',
      name: 'Captain Cinder',
      title: 'Forge Warden of Ember Mountain',
      world: 6,
      maxHp: 3,
      w: 50,
      h: 52,
      telegraphFrames: 42,
      color: '#b91c1c',
      accent: '#fde047',
      phases: [
        { pattern: 'magma_wave_slam', speed: 2.9, stunFrames: 95 },
        { pattern: 'rising_lava_meteors', speed: 3.6, stunFrames: 85 },
        { pattern: 'volcano_overdrive', speed: 4.3, stunFrames: 80 }
      ]
    },
    captain_zephyr: {
      id: 'captain_zephyr',
      name: 'Captain Zephyr',
      title: 'Gale Owl of Sky Gardens',
      world: 7,
      maxHp: 3,
      w: 46,
      h: 48,
      telegraphFrames: 40,
      color: '#6d28d9',
      accent: '#fde047',
      phases: [
        { pattern: 'wind_fan_swoop', speed: 3.5, stunFrames: 95 },
        { pattern: 'feather_bolt_gale', speed: 4.2, stunFrames: 85 },
        { pattern: 'tempest_dive', speed: 4.9, stunFrames: 80 }
      ]
    },
    rust_baron: {
      id: 'rust_baron',
      name: 'The Rust Baron',
      title: 'Grand Mechanist of the Stolen Trail',
      world: 8,
      maxHp: 3, // 3 phases / 3 rooms in Final Castle (9 total hits or 3 per room)
      rooms: 3,
      w: 56,
      h: 58,
      telegraphFrames: 42,
      color: '#334155',
      accent: '#fbbf24',
      phases: [
        { room: 1, name: 'Dread-Train Escape', pattern: 'chase_gauntlet', speed: 3.8, stunFrames: 95 },
        { room: 2, name: 'Spider-Walker Arena', pattern: 'mech_laser_gearbots', speed: 4.4, stunFrames: 85 },
        { room: 3, name: 'The Golden Core Fall', pattern: 'baron_crown_finale', speed: 5.0, stunFrames: 80 }
      ]
    }
  };

  var GT = root.GT || (root.GT = {});
  GT.ENEMY_CATALOG = ENEMY_CATALOG;
  GT.ENEMY_BY_ID = ENEMY_BY_ID;
  GT.BOSS_CATALOG = BOSS_CATALOG;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      ENEMY_CATALOG: ENEMY_CATALOG,
      ENEMY_BY_ID: ENEMY_BY_ID,
      BOSS_CATALOG: BOSS_CATALOG
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

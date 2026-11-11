/**
 * Pip's Golden Trail - Master Tuning & Constants (Fixed 60 Hz Step)
 * All movement, physics, power-up, coin, and boss numbers live in TUNE.
 */
(function (root) {
  'use strict';

  var TUNE = {
    // Frame timing
    fps: 60,
    stepMs: 1000 / 60,
    tileSize: 32,

    // Horizontal movement (pixels per 60Hz frame)
    walkAccel: 0.28,
    runAccel: 0.42,
    walkMaxSpeed: 3.4,
    runMaxSpeed: 5.6,
    tinyMaxSpeed: 5.9,
    heavyMaxSpeed: 3.0,
    groundFriction: 0.82,
    iceFriction: 0.96,
    airDrag: 0.94,
    skidDecel: 0.55,
    crouchSlideAccel: 0.35,
    crouchSlideMaxSpeed: 6.4,
    conveyorSpeed: 1.8,
    windPushForce: 0.22,

    // Jumping & vertical physics (pixels per 60Hz frame)
    gravity: 0.48,
    fallGravity: 0.62,
    maxFallSpeed: 10.5,
    jumpVel: -9.8,
    speedJumpBonus: -1.15, // extra upward velocity at full run
    jumpHoldFrames: 14,
    jumpHoldGravityMul: 0.46,
    jumpCutMultiplier: 0.48,
    spinJumpVel: -9.0,
    spinHoverFrames: 12,
    spinHoverGravityMul: 0.32,
    tinyGravityMul: 0.64,
    heavyGravityMul: 1.25,
    gliderFallCap: 1.8,
    fungusBounceVel: -13.2,
    springBounceVel: -14.0,
    stompBounceVel: -7.8,
    stompHoldBounceVel: -10.6,

    // Assist timings (in 60Hz frames)
    coyoteFrames: 6,
    jumpBufferFrames: 6,
    cornerCorrectionPx: 6,
    maxSubstepPx: 4, // prevents tunneling at any speed

    // Wall slide & wall jump
    wallSlideMaxVy: 2.2,
    wallJumpVx: 5.2,
    wallJumpVy: -9.4,
    wallJumpLockFrames: 10,

    // Ground pound
    groundPoundPauseFrames: 9,
    groundPoundVel: 12.0,

    // Swimming (World 3 Coral Coast & water tiles)
    swimGravity: 0.14,
    swimMaxFall: 3.2,
    swimStrokeVy: -4.8,
    swimMaxSpeed: 3.0,
    heavyWaterSinkVy: 5.5,

    // Climbing vines & fences
    climbSpeed: 2.6,

    // Power-up timers & limits (60Hz frames)
    starDurationFrames: 600,       // 10 s Shining Star-fruit
    goldRingDurationFrames: 600,   // 10 s Gold Ring Gate
    goldHelmetDurationFrames: 600, // 10 s Coin Rush Gold Block Helmet
    redRingDurationFrames: 720,    // 12 s Red Coin Ring window
    coinBrickWindowFrames: 240,    // 4 s for 10-hit Coin Brick
    coinBrickMaxHits: 10,
    hurtInvulnFrames: 90,          // 1.5 s invulnerability after hit
    transformFreezeFrames: 18,
    maxFireballsPerPlayer: 2,
    fireballSpeedX: 6.8,
    fireballBounceVy: -5.4,
    goldRingProjSpeedX: 5.6,
    tailSwipeFrames: 14,
    tailSwipeReachPx: 28,
    throwBlockSpeedX: 7.4,
    throwBlockSpeedY: -3.2,

    // Coins & Lives
    coinsForExtraLife: 100,
    bigCoinValue: 10,
    goldEnemyCoinDrop: 5,
    millionCoinGoal: 1000000,
    startingLives: 5,
    kidModeBubbleLives: 5,
    kidModeEnemySpeedMul: 0.75,
    guideLeafDeathThreshold: 5,

    // Boss & Combat
    bossTelegraphMinFrames: 36, // >= 0.6 s (exceeds 0.5s requirement)
    bossInvulnFrames: 45,
    bossMaxHp: 3,

    // Performance & Pools (strict Samsung TV budgets)
    logicalWidth: 1920,
    logicalHeight: 1080,
    viewWidth: 960,
    viewHeight: 540,
    chunkWidthTiles: 16,
    maxActiveObjects: 60,
    maxEnemiesPool: 40,
    maxProjectilesPool: 12,
    maxParticlesPool: 48,
    cameraPeekMaxPx: 160,
    cameraFollowLerp: 0.14
  };

  var TILE = {
    EMPTY: 0,
    GROUND: 1,
    BRICK: 2,
    Q_COIN: 3,
    Q_POWER: 4,
    Q_STAR: 5,
    Q_LIFE: 6,
    COIN_BRICK: 7,
    SOLID_USED: 8,
    STONE: 9,        // Breakable only by Heavy Pip ground pound
    SLOPE_L: 10,     // 45-degree up-right slope
    SLOPE_R: 11,     // 45-degree down-right slope
    PLATFORM: 12,    // One-way jump-through platform
    SPIKE: 13,       // Hazard on top (Spin Jump safe)
    PIPE_TOP_L: 14,
    PIPE_TOP_R: 15,
    PIPE_BODY_L: 16,
    PIPE_BODY_R: 17,
    TINY_PIPE: 18,   // Tiny Pip secret passage
    VINE: 19,        // Climbable vine
    FENCE: 20,       // Climbable fence panel
    WATER: 21,       // Swimmable water
    LAVA: 22,        // Instant hazard unless Shining
    POISON: 23,      // Fungal swamp hazard
    QUICKSAND: 24,   // Slow sinking sand (jump repeatedly to escape)
    ICE: 25,         // Low friction ice ground
    FUNGUS_CAP: 26,  // Super bouncy fungus cap
    CONVEYOR_L: 27,  // Moves entities left
    CONVEYOR_R: 28,  // Moves entities right
    SPRING_BLOCK: 29,// Carryable & bouncy spring block
    COIN: 30,        // Floating coin (1)
    BIG_COIN: 31,    // 10-coin piece
    STAR_MEDAL_1: 32,// Star Medal #1
    STAR_MEDAL_2: 33,// Star Medal #2
    STAR_MEDAL_3: 34,// Star Medal #3
    RED_RING: 35,    // Spawns 8 red coins
    RED_COIN: 36,    // Activated by Red Ring
    GOLD_GATE: 37,   // Turns enemies gold for 10s
    GOLD_HELMET_BOX: 38, // Grants Coin Rush Head-Block
    CHECKPOINT: 39,  // Mid-stage / pre-boss checkpoint banner
    FLAGPOLE: 40,    // Main stage clear flagpole
    SECRET_FLAG: 41, // Secret exit flagpole (opens alternate map path)
    BOSS_DOOR: 42,   // Enters boss arena room
    BRIDGE_COLLAPSE: 43, // Collapses briefly after stepped on
    SAND_GEYSER: 44  // Periodic upward sand column
  };

  var POWERUPS = {
    small: {
      id: 'small',
      itemName: 'None',
      formName: 'Small Pip',
      w: 22,
      h: 26,
      color: '#f27a24',
      scarf: '#2ec4b6'
    },
    big: {
      id: 'big',
      itemName: 'Sprout seed',
      formName: 'Big Pip',
      w: 24,
      h: 38,
      color: '#f27a24',
      scarf: '#4cd964',
      desc: 'Takes an extra hit and shatters bricks'
    },
    flame: {
      id: 'flame',
      itemName: 'Ember berry',
      formName: 'Flame Pip',
      w: 24,
      h: 38,
      color: '#ff4d2e',
      scarf: '#ffd23f',
      desc: 'Throws bouncing fireballs (X / Y, max 2)'
    },
    leaf: {
      id: 'leaf',
      itemName: 'Leaf cape',
      formName: 'Glider Pip',
      w: 24,
      h: 38,
      color: '#2ec4b6',
      scarf: '#80ed99',
      desc: 'Spin to float, glide after running, tail-swipe'
    },
    gold: {
      id: 'gold',
      itemName: 'Gold petal',
      formName: 'Gilded Pip',
      w: 24,
      h: 38,
      color: '#ffd23f',
      scarf: '#fff3a1',
      desc: 'Throws gold rings that turn bricks and foes into coins'
    },
    tiny: {
      id: 'tiny',
      itemName: 'Pebble',
      formName: 'Tiny Pip',
      w: 12,
      h: 14,
      color: '#6ec6ff',
      scarf: '#ffd23f',
      desc: 'Fits tiny pipes, runs across water, floaty jump'
    },
    heavy: {
      id: 'heavy',
      itemName: 'Iron acorn',
      formName: 'Heavy Pip',
      w: 26,
      h: 38,
      color: '#768799',
      scarf: '#d98200',
      desc: 'Sinks in water, ground-pounds stone, immune to wind'
    },
    star: {
      id: 'star',
      itemName: 'Star-fruit',
      formName: 'Shining Pip',
      w: 24,
      h: 38,
      color: '#fff3a1',
      scarf: '#ff6bd6',
      desc: 'Invincible for 10s, faster music, defeats on touch'
    },
    clover: {
      id: 'clover',
      itemName: 'Life clover',
      formName: '+1 Life',
      w: 20,
      h: 20,
      color: '#38b000',
      scarf: '#b7efc5',
      desc: 'Grants +1 extra life immediately'
    }
  };

  var WORLDS = [
    { id: 1, key: 'w1', name: 'Meadow Hills', theme: 'meadow', skyTop: '#4895ef', skyBot: '#b5e2fa', groundCol: '#38b000', dirtCol: '#8d5524', bossId: 'captain_thorn' },
    { id: 2, key: 'w2', name: 'Dune Bazaar', theme: 'desert', skyTop: '#f77f00', skyBot: '#fcbf49', groundCol: '#e9c46a', dirtCol: '#bc6c25', bossId: 'captain_sirocco' },
    { id: 3, key: 'w3', name: 'Coral Coast', theme: 'beach', skyTop: '#0077b6', skyBot: '#90e0ef', groundCol: '#ffd166', dirtCol: '#118ab2', bossId: 'captain_brine' },
    { id: 4, key: 'w4', name: 'Snowcap Peaks', theme: 'snow', skyTop: '#1d3557', skyBot: '#a8dadc', groundCol: '#f1faee', dirtCol: '#457b9d', bossId: 'captain_frost' },
    { id: 5, key: 'w5', name: 'Fungal Forest', theme: 'forest', skyTop: '#1b4332', skyBot: '#52b788', groundCol: '#74c69d', dirtCol: '#3c096c', bossId: 'captain_mildew' },
    { id: 6, key: 'w6', name: 'Ember Mountain', theme: 'lava', skyTop: '#370617', skyBot: '#9d0208', groundCol: '#495057', dirtCol: '#dc2f02', bossId: 'captain_cinder' },
    { id: 7, key: 'w7', name: 'Sky Gardens', theme: 'sky', skyTop: '#3a0ca3', skyBot: '#7209b7', groundCol: '#f8f9fa', dirtCol: '#b5179e', bossId: 'captain_zephyr' },
    { id: 8, key: 'w8', name: 'Rust Citadel', theme: 'machine', skyTop: '#11151c', skyBot: '#212d40', groundCol: '#7d8597', dirtCol: '#364156', bossId: 'rust_baron' },
    { id: 9, key: 'w9', name: '★ Star Road', theme: 'star', skyTop: '#0b092b', skyBot: '#240046', groundCol: '#ffd166', dirtCol: '#5a189a', bossId: 'captain_zephyr' },
    { id: 10, key: 'w10', name: '♛ Crown Road', theme: 'crown', skyTop: '#1a1423', skyBot: '#3d314a', groundCol: '#ffbe0b', dirtCol: '#8338ec', bossId: 'rust_baron' }
  ];

  var GT = root.GT || (root.GT = {});
  GT.TUNE = TUNE;
  GT.TILE = TILE;
  GT.POWERUPS = POWERUPS;
  GT.WORLDS = WORLDS;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TUNE: TUNE, TILE: TILE, POWERUPS: POWERUPS, WORLDS: WORLDS };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

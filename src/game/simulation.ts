import type {
  ArenaObstacle,
  EnemyState,
  GameState,
  HudSnapshot,
  PickupState,
  PlayerState,
  ProjectileState,
  SimInput,
  WeaponType,
  Vector2,
} from './types';

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1800;
export const ISO_HALF_WIDTH = 0.58;
export const ISO_HALF_HEIGHT = 0.31;

const PLAYER_RADIUS = 26;
const PLAYER_SPEED = 280;
const DASH_SPEED = 760;
const DASH_COST = 28;
const DASH_COOLDOWN = 1.85;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_MAX_SHIELD = 75;
const PLAYER_MAX_ENERGY = 100;
const PLAYER_SHIELD_REGEN_DELAY = 2.25;
const PLAYER_SHIELD_REGEN_RATE = 13;
const PLAYER_ENERGY_REGEN_RATE = 18;
const PLAYER_HEAT_COOLDOWN = 26;
const PLAYER_HEAT_RECOVERY_POINT = 34;

const CENTER_NODE = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
const WEAPON_ORDER: WeaponType[] = ['volley', 'scatter', 'rail'];

const WEAPON_PROFILES: Record<WeaponType, {
  name: string;
  detail: string;
  fireCooldown: number;
  projectileSpeed: number;
  projectileLife: number;
  projectileCount: number;
  spread: number;
  damage: number;
  heatPerShot: number;
  energyCost: number;
  width: number;
  color: string;
}> = {
  volley: {
    name: 'VX-9 Volley Rifle',
    detail: 'Balanced corp carbine for mobile lane control.',
    fireCooldown: 0.14,
    projectileSpeed: 980,
    projectileLife: 0.95,
    projectileCount: 1,
    spread: 0,
    damage: 28,
    heatPerShot: 14,
    energyCost: 0,
    width: 4,
    color: '#ff87dd',
  },
  scatter: {
    name: 'HX-5 Scattergun',
    detail: 'Close-range shredder that tears through swarms but burns hot.',
    fireCooldown: 0.26,
    projectileSpeed: 920,
    projectileLife: 0.58,
    projectileCount: 5,
    spread: 0.28,
    damage: 11,
    heatPerShot: 21,
    energyCost: 6,
    width: 3,
    color: '#ffd166',
  },
  rail: {
    name: 'ARC-12 Rail Lance',
    detail: 'High-voltage puncture shot with brutal burst damage.',
    fireCooldown: 0.42,
    projectileSpeed: 1280,
    projectileLife: 1.15,
    projectileCount: 1,
    spread: 0,
    damage: 58,
    heatPerShot: 28,
    energyCost: 16,
    width: 6,
    color: '#5ef7ff',
  },
};

export const DISTRICT_OBSTACLES: ArenaObstacle[] = [
  { id: 'relay-yard', x: 490, y: 360, width: 260, depth: 180, height: 145, glow: '#36f3ff', fill: '#15233c', label: 'Relay Yard' },
  { id: 'freight-stack', x: 920, y: 380, width: 220, depth: 150, height: 110, glow: '#ff56cf', fill: '#20173d', label: 'Freight Stack' },
  { id: 'market-gate', x: 1440, y: 330, width: 240, depth: 160, height: 135, glow: '#ffc65a', fill: '#342316', label: 'Market Gate' },
  { id: 'coolant-tanks', x: 650, y: 930, width: 210, depth: 160, height: 96, glow: '#6d8cff', fill: '#112640', label: 'Coolant Tanks' },
  { id: 'tower-spine', x: 1120, y: 940, width: 280, depth: 220, height: 180, glow: '#2ef0c9', fill: '#172434', label: 'Tower Spine' },
  { id: 'mag-rail', x: 1680, y: 970, width: 260, depth: 180, height: 100, glow: '#ff6b87', fill: '#2f1729', label: 'Mag Rail' },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function length(vector: Vector2) {
  return Math.hypot(vector.x, vector.y);
}

function normalize(vector: Vector2): Vector2 {
  const magnitude = length(vector) || 1;
  return { x: vector.x / magnitude, y: vector.y / magnitude };
}

function rotateVector(vector: Vector2, radians: number): Vector2 {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  };
}

function directionTo(from: Vector2, to: Vector2): Vector2 {
  return normalize({ x: to.x - from.x, y: to.y - from.y });
}

function distanceBetween(a: Vector2, b: Vector2) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function randomFromRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function moveCircleWithinBounds(position: Vector2, radius: number) {
  position.x = clamp(position.x, radius, WORLD_WIDTH - radius);
  position.y = clamp(position.y, radius, WORLD_HEIGHT - radius);
}

function resolveCircleVsRect(position: Vector2, radius: number, obstacle: ArenaObstacle) {
  const minX = obstacle.x - obstacle.width / 2;
  const maxX = obstacle.x + obstacle.width / 2;
  const minY = obstacle.y - obstacle.depth / 2;
  const maxY = obstacle.y + obstacle.depth / 2;
  const closestX = clamp(position.x, minX, maxX);
  const closestY = clamp(position.y, minY, maxY);
  const dx = position.x - closestX;
  const dy = position.y - closestY;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    const pushX = Math.abs(position.x - minX) < Math.abs(position.x - maxX) ? minX - radius : maxX + radius;
    position.x = pushX;
    return;
  }

  if (distance < radius) {
    const overlap = radius - distance;
    position.x += (dx / distance) * overlap;
    position.y += (dy / distance) * overlap;
  }
}

function createPlayer(): PlayerState {
  return {
    position: { x: 820, y: 1120 },
    velocity: { x: 0, y: 0 },
    health: PLAYER_MAX_HEALTH,
    maxHealth: PLAYER_MAX_HEALTH,
    shield: PLAYER_MAX_SHIELD,
    maxShield: PLAYER_MAX_SHIELD,
    energy: PLAYER_MAX_ENERGY,
    maxEnergy: PLAYER_MAX_ENERGY,
    weaponHeat: 0,
    overheated: false,
    fireCooldown: 0,
    dashCooldown: 0,
    shieldRegenDelay: 0,
    facing: { x: 1, y: 0 },
    currentWeapon: 'volley',
  };
}

function createInitialMission() {
  return {
    title: 'Sweep the relay yard',
    detail: 'Punch a hole through the mercenary cordon and keep the courier link alive.',
    progress: 0,
    status: 'Incursion live',
  };
}

function spawnPointAroundPerimeter(): Vector2 {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: randomFromRange(80, WORLD_WIDTH - 80), y: 80 };
  if (side === 1) return { x: WORLD_WIDTH - 80, y: randomFromRange(80, WORLD_HEIGHT - 80) };
  if (side === 2) return { x: randomFromRange(80, WORLD_WIDTH - 80), y: WORLD_HEIGHT - 80 };
  return { x: 80, y: randomFromRange(80, WORLD_HEIGHT - 80) };
}

function createEnemy(enemyId: number, wave: number): EnemyState {
  const roll = Math.random();
  const type = roll > 0.82 ? 'brute' : roll > 0.46 ? 'gunner' : 'runner';
  const spawn = spawnPointAroundPerimeter();

  if (type === 'brute') {
    return {
      id: enemyId,
      type,
      position: spawn,
      velocity: { x: 0, y: 0 },
      health: 90 + wave * 10,
      maxHealth: 90 + wave * 10,
      radius: 34,
      speed: 88 + wave * 3,
      damage: 22,
      contactCooldown: 0.4,
      glow: '#ff8655',
    };
  }

  if (type === 'gunner') {
    return {
      id: enemyId,
      type,
      position: spawn,
      velocity: { x: 0, y: 0 },
      health: 52 + wave * 6,
      maxHealth: 52 + wave * 6,
      radius: 24,
      speed: 128 + wave * 3,
      damage: 13,
      contactCooldown: 0.3,
      glow: '#fe63ff',
    };
  }

  return {
    id: enemyId,
    type,
    position: spawn,
    velocity: { x: 0, y: 0 },
    health: 36 + wave * 4,
    maxHealth: 36 + wave * 4,
    radius: 20,
    speed: 174 + wave * 5,
    damage: 9,
    contactCooldown: 0.24,
    glow: '#31efff',
  };
}

function createInitialState(): GameState {
  return {
    districtName: 'Neon District // Vanta Stack',
    player: createPlayer(),
    enemies: [],
    projectiles: [],
    pickups: [],
    obstacles: DISTRICT_OBSTACLES,
    score: 0,
    credits: 0,
    kills: 0,
    wave: 1,
    waveProgress: 0,
    threatLevel: 18,
    timeSeconds: 0,
    mission: createInitialMission(),
    districtStatus: 'Courier alive. Grid unstable.',
    districtSummary: 'Mercenary screens are still probing the relay yard. Keep pressure off the centre lane.',
    gameOver: false,
  };
}

export class NeonDistrictSimulation {
  private state: GameState;
  private input: SimInput;
  private nextEnemyId = 1;
  private nextProjectileId = 1;
  private nextPickupId = 1;
  private spawnTimer = 1.2;

  constructor() {
    this.state = createInitialState();
    this.input = {
      moveX: 0,
      moveY: 0,
      aimWorld: { ...CENTER_NODE },
      firing: false,
      dashPressed: false,
      swapPrevPressed: false,
      swapNextPressed: false,
    };
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  restart() {
    this.state = createInitialState();
    this.input = {
      moveX: 0,
      moveY: 0,
      aimWorld: { ...CENTER_NODE },
      firing: false,
      dashPressed: false,
      swapPrevPressed: false,
      swapNextPressed: false,
    };
    this.nextEnemyId = 1;
    this.nextProjectileId = 1;
    this.nextPickupId = 1;
    this.spawnTimer = 1.2;
  }

  setInput(nextInput: SimInput) {
    this.input = nextInput;
  }

  createHudSnapshot(): HudSnapshot {
    const weapon = WEAPON_PROFILES[this.state.player.currentWeapon];
    return {
      districtName: this.state.districtName,
      mission: this.state.mission,
      health: this.state.player.health,
      maxHealth: this.state.player.maxHealth,
      shield: this.state.player.shield,
      maxShield: this.state.player.maxShield,
      energy: this.state.player.energy,
      maxEnergy: this.state.player.maxEnergy,
      weaponHeat: this.state.player.weaponHeat,
      overheated: this.state.player.overheated,
      weaponName: weapon.name,
      weaponDetail: weapon.detail,
      score: this.state.score,
      credits: this.state.credits,
      kills: this.state.kills,
      wave: this.state.wave,
      waveProgress: this.state.waveProgress,
      threatLevel: this.state.threatLevel,
      districtStatus: this.state.districtStatus,
      districtSummary: this.state.districtSummary,
      timeSeconds: this.state.timeSeconds,
      enemyCount: this.state.enemies.length,
      gameOver: this.state.gameOver,
    };
  }

  private fireProjectile() {
    const player = this.state.player;
    const profile = WEAPON_PROFILES[player.currentWeapon];
    if (player.fireCooldown > 0 || player.overheated || player.energy < profile.energyCost) return;

    const aimVector = normalize({
      x: this.input.aimWorld.x - player.position.x,
      y: this.input.aimWorld.y - player.position.y,
    });

    if (!Number.isFinite(aimVector.x) || !Number.isFinite(aimVector.y)) return;

    const aimAngle = Math.atan2(aimVector.y, aimVector.x);
    const projectileCount = profile.projectileCount;

    for (let index = 0; index < projectileCount; index += 1) {
      const spreadOffset = projectileCount === 1
        ? 0
        : ((index / (projectileCount - 1)) - 0.5) * profile.spread;
      const shotVector = rotateVector({ x: Math.cos(aimAngle), y: Math.sin(aimAngle) }, spreadOffset);

      this.state.projectiles.push({
        id: this.nextProjectileId++,
        position: {
          x: player.position.x + shotVector.x * 34,
          y: player.position.y + shotVector.y * 34,
        },
        velocity: {
          x: shotVector.x * profile.projectileSpeed,
          y: shotVector.y * profile.projectileSpeed,
        },
        damage: profile.damage,
        life: profile.projectileLife,
        color: profile.color,
        width: profile.width,
      });
    }

    player.fireCooldown = profile.fireCooldown;
    player.energy = clamp(player.energy - profile.energyCost, 0, player.maxEnergy);
    player.weaponHeat = clamp(player.weaponHeat + profile.heatPerShot, 0, 115);
    if (player.weaponHeat >= 100) {
      player.overheated = true;
      this.state.districtStatus = 'Weapon spool overheated';
      this.state.districtSummary = 'Back off for a second. Let the smartgun shed heat before the next push.';
    }
  }

  private cycleWeapon(direction: -1 | 1) {
    const player = this.state.player;
    const currentIndex = WEAPON_ORDER.indexOf(player.currentWeapon);
    const nextIndex = (currentIndex + direction + WEAPON_ORDER.length) % WEAPON_ORDER.length;
    player.currentWeapon = WEAPON_ORDER[nextIndex];
    const weapon = WEAPON_PROFILES[player.currentWeapon];
    this.state.districtStatus = `Weapon switched // ${weapon.name}`;
    this.state.districtSummary = weapon.detail;
  }

  private spawnEnemy() {
    const activeCap = 5 + this.state.wave * 2;
    if (this.state.enemies.length >= activeCap) return;

    const spawnCount = this.state.wave >= 4 && Math.random() > 0.55 ? 2 : 1;
    for (let i = 0; i < spawnCount; i += 1) {
      this.state.enemies.push(createEnemy(this.nextEnemyId++, this.state.wave));
    }
  }

  private dropPickup(position: Vector2) {
    const roll = Math.random();
    const pickup: PickupState | null = roll > 0.88 ? {
      id: this.nextPickupId++,
      type: 'medkit',
      position: { ...position },
      amount: 20,
      life: 12,
    } : roll > 0.65 ? {
      id: this.nextPickupId++,
      type: 'energy',
      position: { ...position },
      amount: 26,
      life: 10,
    } : roll > 0.38 ? {
      id: this.nextPickupId++,
      type: 'credits',
      position: { ...position },
      amount: 55 + Math.round(Math.random() * 35),
      life: 9,
    } : null;

    if (pickup) {
      this.state.pickups.push(pickup);
    }
  }

  private applyMissionState() {
    const elapsed = this.state.timeSeconds;
    const player = this.state.player;

    if (this.state.kills < 12) {
      this.state.mission = {
        title: 'Sweep the relay yard',
        detail: 'Break the opening cordon and keep the courier path clear for uplink sync.',
        progress: clamp((this.state.kills / 12) * 100, 0, 100),
        status: 'Purge screen teams',
      };
    } else if (elapsed < 95) {
      this.state.mission = {
        title: 'Hold for courier sync',
        detail: 'The uplink crew needs more time. Stay mobile and stop the heavy push from sealing the centre.',
        progress: clamp(((elapsed - 30) / 65) * 100, 0, 100),
        status: 'Hold the lane',
      };
    } else if (this.state.credits < 1800) {
      this.state.mission = {
        title: 'Strip the blacksite',
        detail: 'Grab enough scrip and power cells to finance the exfil burn through the district wall.',
        progress: clamp((this.state.credits / 1800) * 100, 0, 100),
        status: 'Raid for credits',
      };
    } else {
      this.state.mission = {
        title: 'Push to extraction',
        detail: 'The run is hot. Survive the closing wave and keep the courier breathing until the elevator arrives.',
        progress: clamp((player.health + player.shield) / (player.maxHealth + player.maxShield) * 100, 0, 100),
        status: 'Exfil window open',
      };
    }

    const averageDurability = (player.health + player.shield) / (player.maxHealth + player.maxShield);
    const pressure = this.state.threatLevel;
    if (this.state.gameOver) {
      this.state.districtStatus = 'Run failed';
      this.state.districtSummary = 'You went dark in the stack. Hit reboot and drive the lane harder on the next pass.';
    } else if (pressure >= 72) {
      this.state.districtStatus = 'Kill zone unstable';
      this.state.districtSummary = 'Brutes are pushing the hard angles. Dash off-line and keep the centre fluid.';
    } else if (averageDurability < 0.42) {
      this.state.districtStatus = 'Courier lane bleeding';
      this.state.districtSummary = 'You are holding, but only just. Hunt medkits and stop face-tanking the rush.';
    } else if (this.state.mission.status === 'Exfil window open') {
      this.state.districtStatus = 'Extraction almost green';
      this.state.districtSummary = 'The hardest work is done. Keep spacing, clear the last rush, and stay alive.';
    } else {
      this.state.districtStatus = 'Lane still contested';
      this.state.districtSummary = 'You have the initiative for now. Pressure the flanks before the next wave locks in.';
    }
  }

  step(deltaSeconds: number) {
    const dt = clamp(deltaSeconds, 0, 0.05);
    const state = this.state;
    const player = state.player;

    if (state.gameOver) {
      return;
    }

    state.timeSeconds += dt;
    player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.shieldRegenDelay = Math.max(0, player.shieldRegenDelay - dt);

    player.weaponHeat = Math.max(0, player.weaponHeat - PLAYER_HEAT_COOLDOWN * dt);
    if (player.overheated && player.weaponHeat <= PLAYER_HEAT_RECOVERY_POINT) {
      player.overheated = false;
    }

    player.energy = clamp(player.energy + PLAYER_ENERGY_REGEN_RATE * dt, 0, player.maxEnergy);
    if (player.shieldRegenDelay === 0) {
      player.shield = clamp(player.shield + PLAYER_SHIELD_REGEN_RATE * dt, 0, player.maxShield);
    }

    const movement = normalize({ x: this.input.moveX, y: this.input.moveY });
    const moveStrength = Math.abs(this.input.moveX) + Math.abs(this.input.moveY) > 0 ? 1 : 0;
    const speed = PLAYER_SPEED * moveStrength;
    player.velocity = { x: movement.x * speed, y: movement.y * speed };

    if (moveStrength > 0) {
      player.facing = { ...movement };
    }

    if (this.input.swapPrevPressed) {
      this.cycleWeapon(-1);
    } else if (this.input.swapNextPressed) {
      this.cycleWeapon(1);
    }

    if (this.input.dashPressed && player.dashCooldown === 0 && player.energy >= DASH_COST) {
      const dashVector = moveStrength > 0 ? movement : normalize(player.facing);
      player.position.x += dashVector.x * DASH_SPEED * dt;
      player.position.y += dashVector.y * DASH_SPEED * dt;
      player.energy -= DASH_COST;
      player.dashCooldown = DASH_COOLDOWN;
    }

    player.position.x += player.velocity.x * dt;
    player.position.y += player.velocity.y * dt;
    moveCircleWithinBounds(player.position, PLAYER_RADIUS);
    state.obstacles.forEach((obstacle) => resolveCircleVsRect(player.position, PLAYER_RADIUS, obstacle));

    if (this.input.firing) {
      this.fireProjectile();
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      const spawnBaseline = Math.max(0.34, 1.55 - this.state.wave * 0.11);
      this.spawnTimer = spawnBaseline + Math.random() * 0.5;
    }

    const nextProjectiles: ProjectileState[] = [];
    state.projectiles.forEach((projectile) => {
      projectile.position.x += projectile.velocity.x * dt;
      projectile.position.y += projectile.velocity.y * dt;
      projectile.life -= dt;
      if (projectile.life <= 0) return;

      let hit = false;
      state.enemies.forEach((enemy) => {
        if (hit) return;
        const distance = distanceBetween(projectile.position, enemy.position);
        if (distance <= enemy.radius + 8) {
          enemy.health -= projectile.damage;
          hit = true;
        }
      });

      if (!hit) {
        nextProjectiles.push(projectile);
      }
    });
    state.projectiles = nextProjectiles;

    const nextEnemies: EnemyState[] = [];
    state.enemies.forEach((enemy) => {
      enemy.contactCooldown = Math.max(0, enemy.contactCooldown - dt);
      const chaseTarget = state.credits >= 1800 ? CENTER_NODE : player.position;
      const chaseVector = directionTo(enemy.position, chaseTarget);
      const wobble = enemy.type === 'runner' ? 0.28 : enemy.type === 'gunner' ? 0.18 : 0.08;
      const sideBias = Math.sin((state.timeSeconds + enemy.id) * (enemy.type === 'runner' ? 4.8 : 2.4)) * wobble;
      const steer = normalize({
        x: chaseVector.x - chaseVector.y * sideBias,
        y: chaseVector.y + chaseVector.x * sideBias,
      });

      enemy.velocity.x = lerp(enemy.velocity.x, steer.x * enemy.speed, 0.09);
      enemy.velocity.y = lerp(enemy.velocity.y, steer.y * enemy.speed, 0.09);
      enemy.position.x += enemy.velocity.x * dt;
      enemy.position.y += enemy.velocity.y * dt;
      moveCircleWithinBounds(enemy.position, enemy.radius);
      state.obstacles.forEach((obstacle) => resolveCircleVsRect(enemy.position, enemy.radius, obstacle));

      const collisionDistance = distanceBetween(enemy.position, player.position);
      if (collisionDistance <= enemy.radius + PLAYER_RADIUS - 6 && enemy.contactCooldown === 0) {
        const damage = enemy.damage;
        if (player.shield > 0) {
          const shieldLoss = Math.min(player.shield, damage);
          player.shield -= shieldLoss;
          if (shieldLoss < damage) {
            player.health = clamp(player.health - (damage - shieldLoss), 0, player.maxHealth);
          }
        } else {
          player.health = clamp(player.health - damage, 0, player.maxHealth);
        }
        player.shieldRegenDelay = PLAYER_SHIELD_REGEN_DELAY;
        enemy.contactCooldown = enemy.type === 'brute' ? 0.95 : 0.55;
      }

      if (enemy.health <= 0) {
        state.kills += 1;
        state.score += enemy.type === 'brute' ? 180 : enemy.type === 'gunner' ? 120 : 90;
        state.credits += enemy.type === 'brute' ? 140 : enemy.type === 'gunner' ? 90 : 60;
        this.dropPickup(enemy.position);
        const newWave = 1 + Math.floor(state.kills / 10);
        if (newWave > state.wave) {
          state.wave = newWave;
        }
      } else {
        nextEnemies.push(enemy);
      }
    });
    state.enemies = nextEnemies;

    const nextPickups: PickupState[] = [];
    state.pickups.forEach((pickup) => {
      pickup.life -= dt;
      if (pickup.life <= 0) return;

      if (distanceBetween(pickup.position, player.position) <= PLAYER_RADIUS + 14) {
        if (pickup.type === 'credits') {
          state.credits += pickup.amount;
          state.score += Math.round(pickup.amount * 1.5);
        } else if (pickup.type === 'energy') {
          player.energy = clamp(player.energy + pickup.amount, 0, player.maxEnergy);
        } else {
          player.health = clamp(player.health + pickup.amount, 0, player.maxHealth);
        }
      } else {
        nextPickups.push(pickup);
      }
    });
    state.pickups = nextPickups;

    if (player.health <= 0) {
      state.gameOver = true;
    }

    state.waveProgress = Math.round(((state.kills % 10) / 10) * 100);
    state.threatLevel = Math.round(
      clamp(
        15 + state.wave * 8 + state.enemies.length * 5 + Math.max(0, 55 - player.health) * 0.45,
        0,
        100,
      ),
    );

    this.applyMissionState();
  }
}

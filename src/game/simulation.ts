import {
  CONTRACTS_BY_ID,
  CYBERWARE_BY_ID,
  DEFAULT_CONTRACT_ID,
  DEFAULT_CYBERWARE_ID,
  WEAPON_UPGRADES_BY_ID,
} from './content';
import type {
  ArenaObstacle,
  ContractBeatDefinition,
  ContractBeatTrigger,
  ContractBeatSpawnDefinition,
  ContractHazardDefinition,
  ContractOptionalObjectiveDefinition,
  EnemyState,
  EnemyType,
  GameState,
  HazardState,
  HudSnapshot,
  PickupState,
  PlayerState,
  ProjectileState,
  SimulationEvent,
  TutorialState,
  SimInput,
  RunConfig,
  WeaponType,
  Vector2,
} from './types';

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1800;
export const ISO_HALF_WIDTH = 0.58;
export const ISO_HALF_HEIGHT = 0.31;

const DEFAULT_CONTRACT = CONTRACTS_BY_ID[DEFAULT_CONTRACT_ID];

export const TERMINAL_POINT: Vector2 = { ...DEFAULT_CONTRACT.terminalPoint };
export const TERMINAL_RADIUS = DEFAULT_CONTRACT.terminalRadius;
export const EXTRACTION_POINT: Vector2 = { ...DEFAULT_CONTRACT.extractionPoint };
export const EXTRACTION_RADIUS = DEFAULT_CONTRACT.extractionRadius;

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
const COVER_PROXIMITY = 44;
const COVER_DAMAGE_MULTIPLIER = 0.48;
const CENTER_NODE = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
const WEAPON_ORDER: WeaponType[] = ['volley', 'scatter', 'rail'];

function createDefaultRunConfig(): RunConfig {
  return {
    contract: DEFAULT_CONTRACT,
    cyberware: CYBERWARE_BY_ID[DEFAULT_CYBERWARE_ID],
    hostileHeat: 0,
    ownedWeaponUpgrades: [],
  };
}

type WeaponProfile = {
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
};

type EffectiveWeaponProfile = WeaponProfile & {
  upgradeTitle: string | null;
  upgradeDetail: string | null;
  shieldBreakMultiplier: number;
};

const WEAPON_PROFILES: Record<WeaponType, WeaponProfile> = {
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

function getWeaponProfile(weapon: WeaponType, runConfig: RunConfig): EffectiveWeaponProfile {
  const base = WEAPON_PROFILES[weapon];
  const upgradeId = runConfig.ownedWeaponUpgrades.find((candidate) => WEAPON_UPGRADES_BY_ID[candidate]?.weapon === weapon);
  const upgrade = upgradeId ? WEAPON_UPGRADES_BY_ID[upgradeId] : null;

  if (!upgrade) {
    return {
      ...base,
      upgradeTitle: null,
      upgradeDetail: null,
      shieldBreakMultiplier: 1,
    };
  }

  return {
    ...base,
    name: `${base.name} // ${upgrade.title}`,
    detail: `${base.detail} ${upgrade.detail}`,
    fireCooldown: Math.max(0.05, base.fireCooldown * (upgrade.modifiers.fireCooldownMultiplier ?? 1)),
    projectileSpeed: base.projectileSpeed + (upgrade.modifiers.projectileSpeedBonus ?? 0),
    projectileLife: base.projectileLife + (upgrade.modifiers.projectileLifeBonus ?? 0),
    projectileCount: Math.max(1, base.projectileCount + (upgrade.modifiers.projectileCountBonus ?? 0)),
    spread: base.spread * (upgrade.modifiers.spreadMultiplier ?? 1),
    damage: base.damage + (upgrade.modifiers.damageBonus ?? 0),
    heatPerShot: base.heatPerShot * (upgrade.modifiers.heatPerShotMultiplier ?? 1),
    energyCost: Math.max(0, Math.round(base.energyCost * (upgrade.modifiers.energyCostMultiplier ?? 1))),
    upgradeTitle: upgrade.title,
    upgradeDetail: upgrade.detail,
    shieldBreakMultiplier: upgrade.modifiers.shieldBreakMultiplier ?? 1,
  };
}

type EnemyProfile = {
  healthBase: number;
  healthWave: number;
  radius: number;
  speedBase: number;
  speedWave: number;
  damage: number;
  contactCooldown: number;
  attackRange: number;
  preferredRange: number;
  projectileSpeed: number;
  projectileLife: number;
  glow: string;
};

const ENEMY_PROFILES: Record<EnemyType, EnemyProfile> = {
  runner: { healthBase: 36, healthWave: 4, radius: 20, speedBase: 180, speedWave: 5, damage: 10, contactCooldown: 0.24, attackRange: 0, preferredRange: 0, projectileSpeed: 0, projectileLife: 0, glow: '#31efff' },
  gunner: { healthBase: 58, healthWave: 6, radius: 24, speedBase: 126, speedWave: 3, damage: 12, contactCooldown: 0.32, attackRange: 560, preferredRange: 360, projectileSpeed: 620, projectileLife: 1.15, glow: '#fe63ff' },
  brute: { healthBase: 96, healthWave: 11, radius: 34, speedBase: 92, speedWave: 3, damage: 22, contactCooldown: 0.44, attackRange: 0, preferredRange: 0, projectileSpeed: 0, projectileLife: 0, glow: '#ff8655' },
  sniper: { healthBase: 46, healthWave: 5, radius: 22, speedBase: 112, speedWave: 2, damage: 18, contactCooldown: 0.3, attackRange: 920, preferredRange: 720, projectileSpeed: 980, projectileLife: 1.45, glow: '#ffd76a' },
  shield: { healthBase: 82, healthWave: 8, radius: 28, speedBase: 108, speedWave: 3, damage: 15, contactCooldown: 0.38, attackRange: 0, preferredRange: 120, projectileSpeed: 0, projectileLife: 0, glow: '#74ffbc' },
  captain: { healthBase: 218, healthWave: 15, radius: 40, speedBase: 118, speedWave: 3, damage: 24, contactCooldown: 0.5, attackRange: 760, preferredRange: 280, projectileSpeed: 760, projectileLife: 1.35, glow: '#ff5d8c' },
};

export const DISTRICT_OBSTACLES: ArenaObstacle[] = [
  { id: 'relay-yard', x: 480, y: 360, width: 260, depth: 180, height: 145, glow: '#36f3ff', fill: '#15233c', label: 'Relay Yard' },
  { id: 'freight-stack', x: 890, y: 360, width: 210, depth: 150, height: 132, glow: '#ff56cf', fill: '#20173d', label: 'Freight Stack' },
  { id: 'market-gate', x: 1450, y: 330, width: 250, depth: 170, height: 148, glow: '#ffc65a', fill: '#342316', label: 'Market Gate' },
  { id: 'coolant-tanks', x: 650, y: 930, width: 220, depth: 160, height: 98, glow: '#6d8cff', fill: '#112640', label: 'Coolant Tanks' },
  { id: 'tower-spine', x: 1120, y: 930, width: 290, depth: 220, height: 196, glow: '#2ef0c9', fill: '#172434', label: 'Tower Spine' },
  { id: 'mag-rail', x: 1710, y: 980, width: 290, depth: 190, height: 108, glow: '#ff6b87', fill: '#2f1729', label: 'Mag Rail' },
  { id: 'night-market', x: 1770, y: 520, width: 190, depth: 120, height: 92, glow: '#ff8ad8', fill: '#2a1734', label: 'Night Market' },
  { id: 'signal-bridge', x: 1320, y: 650, width: 320, depth: 80, height: 86, glow: '#4af7ff', fill: '#12263b', label: 'Signal Bridge' },
  { id: 'arcology-west', x: 300, y: 820, width: 250, depth: 190, height: 182, glow: '#52ffcf', fill: '#112132', label: 'Arcology West' },
  { id: 'garden-roof', x: 1550, y: 1190, width: 200, depth: 150, height: 84, glow: '#7eff96', fill: '#163025', label: 'Garden Roof' },
  { id: 'ammo-kiosk', x: 1020, y: 1280, width: 120, depth: 100, height: 56, glow: '#ffe16f', fill: '#32270f', label: 'Ammo Kiosk' },
  { id: 'parking-bay', x: 720, y: 1260, width: 180, depth: 130, height: 48, glow: '#5ea7ff', fill: '#10223a', label: 'Parking Bay' },
  { id: 'service-yard', x: 1310, y: 1250, width: 220, depth: 140, height: 42, glow: '#67b8ff', fill: '#15243b', label: 'Service Yard' },
  { id: 'drainage-core', x: 430, y: 1180, width: 130, depth: 120, height: 62, glow: '#6af2ff', fill: '#13303d', label: 'Drainage Core' },
  { id: 'food-cart-a', x: 880, y: 760, width: 74, depth: 50, height: 40, glow: '#ffab5f', fill: '#3b2316', label: 'Stall A' },
  { id: 'food-cart-b', x: 960, y: 720, width: 74, depth: 50, height: 40, glow: '#6affd8', fill: '#17312a', label: 'Stall B' },
  { id: 'food-cart-c', x: 1030, y: 770, width: 74, depth: 50, height: 40, glow: '#ff71c8', fill: '#34162d', label: 'Stall C' },
  { id: 'cover-barricade-a', x: 915, y: 1030, width: 130, depth: 42, height: 28, glow: '#4ebcff', fill: '#11243b', label: 'Barricade A' },
  { id: 'cover-barricade-b', x: 1125, y: 1085, width: 126, depth: 42, height: 28, glow: '#5ef7ff', fill: '#12263d', label: 'Barricade B' },
  { id: 'cover-barricade-c', x: 1295, y: 835, width: 138, depth: 40, height: 28, glow: '#ff79cf', fill: '#2a1634', label: 'Barricade C' },
  { id: 'cover-barricade-d', x: 1540, y: 695, width: 126, depth: 42, height: 28, glow: '#ffc65a', fill: '#3a240f', label: 'Barricade D' },
  { id: 'cover-barricade-e', x: 610, y: 640, width: 120, depth: 40, height: 28, glow: '#72ffd6', fill: '#16322b', label: 'Barricade E' },
  { id: 'cover-barricade-f', x: 760, y: 520, width: 112, depth: 36, height: 24, glow: '#6da8ff', fill: '#10233a', label: 'Barricade F' },
];

type TutorialTracker = {
  stepIndex: number;
  moveDistance: number;
  shotsFired: number;
  dashUsed: boolean;
};

type NarrativePulse = {
  status: string;
  summary: string;
  timeRemaining: number;
};

type OptionalObjectiveState = GameState['optionalObjectiveState'];

const TOTAL_TUTORIAL_STEPS = 6;

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

function dot(a: Vector2, b: Vector2) {
  return a.x * b.x + a.y * b.y;
}

function perpendicular(vector: Vector2, sign: number): Vector2 {
  return { x: -vector.y * sign, y: vector.x * sign };
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

function obstacleBounds(obstacle: ArenaObstacle) {
  return {
    minX: obstacle.x - obstacle.width / 2,
    maxX: obstacle.x + obstacle.width / 2,
    minY: obstacle.y - obstacle.depth / 2,
    maxY: obstacle.y + obstacle.depth / 2,
  };
}

function pointInsideObstacle(point: Vector2, obstacle: ArenaObstacle, padding = 0) {
  const bounds = obstacleBounds(obstacle);
  return point.x >= bounds.minX - padding
    && point.x <= bounds.maxX + padding
    && point.y >= bounds.minY - padding
    && point.y <= bounds.maxY + padding;
}

function resolveCircleVsRect(position: Vector2, radius: number, obstacle: ArenaObstacle) {
  const bounds = obstacleBounds(obstacle);
  const closestX = clamp(position.x, bounds.minX, bounds.maxX);
  const closestY = clamp(position.y, bounds.minY, bounds.maxY);
  const dx = position.x - closestX;
  const dy = position.y - closestY;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    const pushX = Math.abs(position.x - bounds.minX) < Math.abs(position.x - bounds.maxX) ? bounds.minX - radius : bounds.maxX + radius;
    position.x = pushX;
    return;
  }

  if (distance < radius) {
    const overlap = radius - distance;
    position.x += (dx / distance) * overlap;
    position.y += (dy / distance) * overlap;
  }
}

function distanceToObstacleEdge(point: Vector2, obstacle: ArenaObstacle) {
  const bounds = obstacleBounds(obstacle);
  const dx = Math.max(bounds.minX - point.x, 0, point.x - bounds.maxX);
  const dy = Math.max(bounds.minY - point.y, 0, point.y - bounds.maxY);
  return Math.hypot(dx, dy);
}

function segmentBlockedByObstacle(from: Vector2, to: Vector2, obstacle: ArenaObstacle, padding = 8) {
  const steps = Math.max(2, Math.ceil(distanceBetween(from, to) / 22));
  for (let step = 1; step < steps; step += 1) {
    const t = step / steps;
    const point = { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) };
    if (pointInsideObstacle(point, obstacle, padding)) {
      return true;
    }
  }
  return false;
}

function hasLineOfSight(from: Vector2, to: Vector2, obstacles: ArenaObstacle[]) {
  return !obstacles.some((obstacle) => segmentBlockedByObstacle(from, to, obstacle));
}

function shouldTriggerContractTrigger(
  trigger: ContractBeatTrigger,
  phaseJustEntered: boolean,
  phaseElapsed: number,
  phaseProgress: number,
) {
  if (trigger.kind === 'phase-start') {
    return phaseJustEntered || phaseElapsed <= 0.05;
  }

  if (trigger.kind === 'phase-elapsed') {
    return phaseElapsed >= trigger.seconds;
  }

  return phaseProgress >= trigger.progress;
}

function isOptionalObjectivePhase(
  optionalObjective: ContractOptionalObjectiveDefinition | undefined,
  phase: GameState['objectivePhase'],
) {
  return optionalObjective ? optionalObjective.availablePhases.includes(phase as Extract<typeof phase, 'reach-terminal' | 'hack-terminal'>) : false;
}

function getHeatTier(runConfig: RunConfig) {
  return Math.floor(runConfig.hostileHeat / 24);
}

function createPlayer(startingWeapon: WeaponType, runConfig: RunConfig): PlayerState {
  const modifiers = runConfig.cyberware.modifiers;
  const maxHealth = PLAYER_MAX_HEALTH + (modifiers.maxHealthBonus ?? 0);
  const maxShield = PLAYER_MAX_SHIELD + (modifiers.maxShieldBonus ?? 0);
  const maxEnergy = PLAYER_MAX_ENERGY + (modifiers.maxEnergyBonus ?? 0);
  return {
    position: { ...runConfig.contract.startingPosition },
    velocity: { x: 0, y: 0 },
    health: maxHealth,
    maxHealth,
    shield: maxShield,
    maxShield,
    energy: maxEnergy,
    maxEnergy,
    weaponHeat: 0,
    overheated: false,
    fireCooldown: 0,
    dashCooldown: 0,
    shieldRegenDelay: 0,
    facing: { x: 0.8, y: -0.2 },
    currentWeapon: startingWeapon,
  };
}

function createInitialState(runConfig: RunConfig, startingWeapon: WeaponType): GameState {
  const contract = runConfig.contract;
  return {
    districtName: contract.districtName,
    contractId: contract.id,
    contractTitle: contract.title,
    contractClient: contract.client,
    contractZone: contract.zone,
    contractThreat: contract.threatLabel,
    player: createPlayer(startingWeapon, runConfig),
    enemies: [],
    projectiles: [],
    pickups: [],
    activeHazards: [],
    obstacles: DISTRICT_OBSTACLES,
    score: 0,
    credits: 0,
    kills: 0,
    wave: 1 + getHeatTier(runConfig),
    waveProgress: 0,
    threatLevel: 0,
    timeSeconds: 0,
    mission: { ...contract.initialMission },
    objectivePhase: 'recon',
    terminalPoint: { ...contract.terminalPoint },
    terminalRadius: contract.terminalRadius,
    terminalProgress: 0,
    optionalObjectiveLabel: contract.optionalObjective?.title ?? null,
    optionalObjectiveState: contract.optionalObjective ? 'available' : 'hidden',
    optionalObjectivePoint: contract.optionalObjective ? { ...contract.optionalObjective.position } : null,
    optionalObjectiveRadius: contract.optionalObjective?.radius ?? 0,
    optionalObjectiveProgress: 0,
    optionalObjectiveRewardCredits: 0,
    optionalObjectiveReputationBonus: 0,
    optionalObjectiveStatusText: contract.optionalObjective ? `${contract.optionalObjective.shortLabel} live // ${contract.optionalObjective.rewardLabel}` : null,
    optionalObjectiveSummary: contract.optionalObjective?.summary ?? null,
    extractionPoint: { ...contract.extractionPoint },
    extractionRadius: contract.extractionRadius,
    uploadTimeRemaining: 0,
    uploadDuration: contract.uploadDuration,
    extractionProgress: 0,
    extractionTimeRemaining: 0,
    extractionDuration: contract.extractionDuration,
    eliteCallsign: contract.elite?.callsign ?? null,
    eliteActive: false,
    eliteDefeated: false,
    eliteHealth: 0,
    eliteMaxHealth: 0,
    playerInCover: false,
    districtStatus: 'District quiet. Recon window open.',
    districtSummary: contract.reconSummary,
    combatActive: false,
    gameOver: false,
    victory: false,
    contractResolved: false,
  };
}

function createTutorialTracker(): TutorialTracker {
  return {
    stepIndex: 0,
    moveDistance: 0,
    shotsFired: 0,
    dashUsed: false,
  };
}

function spawnPointAroundPerimeter(): Vector2 {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: randomFromRange(80, WORLD_WIDTH - 80), y: 80 };
  if (side === 1) return { x: WORLD_WIDTH - 80, y: randomFromRange(80, WORLD_HEIGHT - 80) };
  if (side === 2) return { x: randomFromRange(80, WORLD_WIDTH - 80), y: WORLD_HEIGHT - 80 };
  return { x: 80, y: randomFromRange(80, WORLD_HEIGHT - 80) };
}

function spawnPointAroundTarget(target: Vector2, minRadius: number, maxRadius: number): Vector2 {
  const angle = randomFromRange(0, Math.PI * 2);
  const radius = randomFromRange(minRadius, maxRadius);
  return {
    x: clamp(target.x + Math.cos(angle) * radius, 90, WORLD_WIDTH - 90),
    y: clamp(target.y + Math.sin(angle) * radius, 90, WORLD_HEIGHT - 90),
  };
}

function createEnemy(enemyId: number, wave: number, type: EnemyType, hostileHeat = 0, spawnOverride?: Vector2): EnemyState {
  const profile = ENEMY_PROFILES[type];
  const spawn = spawnOverride ?? spawnPointAroundPerimeter();
  const heatTier = Math.floor(hostileHeat / 25);
  const bonusHealth = heatTier * (type === 'captain' ? 16 : 6);
  const bonusDamage = heatTier * (type === 'captain' ? 3 : 1.5);
  return {
    id: enemyId,
    type,
    position: spawn,
    velocity: { x: 0, y: 0 },
    facing: directionTo(spawn, CENTER_NODE),
    health: profile.healthBase + wave * profile.healthWave + bonusHealth,
    maxHealth: profile.healthBase + wave * profile.healthWave + bonusHealth,
    radius: profile.radius,
    speed: profile.speedBase + wave * profile.speedWave + heatTier,
    damage: profile.damage + bonusDamage,
    contactCooldown: profile.contactCooldown,
    fireCooldown: type === 'captain' ? 0.85 : type === 'sniper' ? 1.2 : type === 'gunner' ? 0.6 : 0,
    attackRange: profile.attackRange,
    preferredRange: profile.preferredRange,
    projectileSpeed: profile.projectileSpeed,
    projectileLife: profile.projectileLife,
    glow: profile.glow,
  };
}

export class NeonDistrictSimulation {
  private state: GameState;
  private input: SimInput;
  private tutorial: TutorialTracker;
  private eventQueue: SimulationEvent[];
  private runConfig: RunConfig = createDefaultRunConfig();
  private loadoutWeapon: WeaponType = 'volley';
  private nextEnemyId = 1;
  private nextProjectileId = 1;
  private nextPickupId = 1;
  private spawnTimer = 1.2;
  private eliteSpawned = false;
  private phaseElapsed = 0;
  private triggeredBeatIds = new Set<string>();
  private triggeredHazardIds = new Set<string>();
  private narrativePulse: NarrativePulse | null = null;

  constructor() {
    this.state = createInitialState(this.runConfig, this.loadoutWeapon);
    this.tutorial = createTutorialTracker();
    this.eventQueue = [];
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

  consumeEvents(): SimulationEvent[] {
    const events = this.eventQueue;
    this.eventQueue = [];
    return events;
  }

  restart() {
    this.state = createInitialState(this.runConfig, this.loadoutWeapon);
    this.tutorial = createTutorialTracker();
    this.eventQueue = [];
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
    this.eliteSpawned = false;
    this.phaseElapsed = 0;
    this.triggeredBeatIds = new Set<string>();
    this.triggeredHazardIds = new Set<string>();
    this.narrativePulse = null;
  }

  setLoadoutWeapon(weapon: WeaponType) {
    this.loadoutWeapon = weapon;
    if (!this.state.combatActive && !this.state.contractResolved) {
      this.state.player.currentWeapon = weapon;
    }
  }

  configureRun(nextRunConfig: RunConfig) {
    this.runConfig = {
      ...nextRunConfig,
      contract: nextRunConfig.contract,
      cyberware: nextRunConfig.cyberware,
      hostileHeat: clamp(nextRunConfig.hostileHeat, 0, 100),
    };

    if (!this.state.combatActive || this.state.contractResolved) {
      this.restart();
    }
  }

  activateSweep() {
    if (this.state.combatActive || this.state.contractResolved) return;
    const { contract } = this.runConfig;
    if (this.tutorial.stepIndex === 0) {
      this.tutorial.moveDistance = Math.max(this.tutorial.moveDistance, 260);
    }
    this.state.combatActive = true;
    this.state.objectivePhase = 'reach-terminal';
    this.state.districtStatus = 'Sweep live';
    this.state.districtSummary = `Hostiles are pushing back into ${contract.zone}. Break for the ${contract.terminalLabel} and ${contract.breachLabel}.`;
    this.phaseElapsed = 0;
    this.narrativePulse = null;
    this.emitEvent({ type: 'sweep-activated' });
  }

  setInput(nextInput: SimInput) {
    this.input = nextInput;
  }

  createHudSnapshot(): HudSnapshot {
    const weapon = getWeaponProfile(this.state.player.currentWeapon, this.runConfig);
    const leadingHazard = this.state.activeHazards[0] ?? null;
    return {
      districtName: this.state.districtName,
      contractId: this.state.contractId,
      contractTitle: this.state.contractTitle,
      contractClient: this.state.contractClient,
      contractZone: this.state.contractZone,
      contractThreat: this.state.contractThreat,
      mission: this.state.mission,
      tutorial: this.createTutorialState(),
      objectivePhase: this.state.objectivePhase,
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
      weaponUpgradeTitle: weapon.upgradeTitle,
      weaponUpgradeDetail: weapon.upgradeDetail,
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
      terminalPoint: this.state.terminalPoint,
      terminalRadius: this.state.terminalRadius,
      terminalProgress: this.state.terminalProgress,
      optionalObjectiveLabel: this.state.optionalObjectiveLabel,
      optionalObjectiveState: this.state.optionalObjectiveState,
      optionalObjectivePoint: this.state.optionalObjectivePoint,
      optionalObjectiveRadius: this.state.optionalObjectiveRadius,
      optionalObjectiveProgress: this.state.optionalObjectiveProgress,
      optionalObjectiveRewardCredits: this.state.optionalObjectiveRewardCredits,
      optionalObjectiveReputationBonus: this.state.optionalObjectiveReputationBonus,
      optionalObjectiveStatusText: this.state.optionalObjectiveStatusText,
      optionalObjectiveSummary: this.state.optionalObjectiveSummary,
      extractionPoint: this.state.extractionPoint,
      extractionRadius: this.state.extractionRadius,
      uploadTimeRemaining: this.state.uploadTimeRemaining,
      uploadDuration: this.state.uploadDuration,
      extractionProgress: this.state.extractionProgress,
      extractionTimeRemaining: this.state.extractionTimeRemaining,
      extractionDuration: this.state.extractionDuration,
      eliteCallsign: this.state.eliteCallsign,
      eliteActive: this.state.eliteActive,
      eliteDefeated: this.state.eliteDefeated,
      eliteHealth: this.state.eliteHealth,
      eliteMaxHealth: this.state.eliteMaxHealth,
      activeHazardCount: this.state.activeHazards.length,
      activeHazardLabel: leadingHazard?.label ?? null,
      activeHazardSummary: leadingHazard?.summary ?? null,
      playerInCover: this.state.playerInCover,
      combatActive: this.state.combatActive,
      gameOver: this.state.gameOver,
      victory: this.state.victory,
      contractResolved: this.state.contractResolved,
    };
  }

  private emitEvent(event: SimulationEvent) {
    this.eventQueue.push(event);
  }

  private advanceTutorial(title: string) {
    if (this.tutorial.stepIndex >= TOTAL_TUTORIAL_STEPS) return;
    this.tutorial.stepIndex += 1;
    this.emitEvent({
      type: 'tutorial-step',
      title,
      step: Math.min(this.tutorial.stepIndex + 1, TOTAL_TUTORIAL_STEPS),
      totalSteps: TOTAL_TUTORIAL_STEPS,
    });
  }

  private createTutorialState(): TutorialState {
    const contract = this.runConfig.contract;
    const stepIndex = this.tutorial.stepIndex;
    const player = this.state.player;
    const terminalDistance = distanceBetween(player.position, this.state.terminalPoint);
    const extractionDistance = distanceBetween(player.position, this.state.extractionPoint);

    if (stepIndex === 0) {
      return {
        step: 1,
        totalSteps: TOTAL_TUTORIAL_STEPS,
        title: 'Ghost the lanes',
        body: `Use WASD to move through ${contract.zone}. Learn the cover rhythm before you take the contract live.`,
        progress: clamp((this.tutorial.moveDistance / 260) * 100, 0, 100),
        status: 'Recon onboarding',
        completed: false,
      };
    }

    if (stepIndex === 1) {
      return {
        step: 2,
        totalSteps: TOTAL_TUTORIAL_STEPS,
        title: 'Prime the contract',
        body: 'Hit Activate Sweep when you are ready. The district goes hot the second you arm the run.',
        progress: this.state.combatActive ? 100 : 0,
        status: 'Awaiting hot drop',
        completed: false,
      };
    }

    if (stepIndex === 2) {
      return {
        step: 3,
        totalSteps: TOTAL_TUTORIAL_STEPS,
        title: `Reach the ${contract.terminalLabel}`,
        body: `Push through the lane cover and step into the ${contract.terminalLabel}. You need that breach before extraction can even exist.`,
        progress: this.state.objectivePhase === 'hack-terminal' || this.state.objectivePhase === 'hold-upload' || this.state.objectivePhase === 'extract' || this.state.objectivePhase === 'complete'
          ? 100
          : clamp((1 - terminalDistance / 1220) * 100, 0, 100),
        status: this.state.objectivePhase === 'reach-terminal' ? 'Terminal run' : 'Terminal reached',
        completed: false,
      };
    }

    if (stepIndex === 3) {
      return {
        step: 4,
        totalSteps: TOTAL_TUTORIAL_STEPS,
        title: 'Break the first screen',
        body: 'Aim with the mouse and crack the first response team. One clean kill is enough to show the lane is yours.',
        progress: Math.max(clamp((this.tutorial.shotsFired / 6) * 100, 0, 100), this.state.kills > 0 ? 100 : 0),
        status: 'Live fire',
        completed: false,
      };
    }

    if (stepIndex === 4) {
      return {
        step: 5,
        totalSteps: TOTAL_TUTORIAL_STEPS,
        title: 'Dash off-line',
        body: 'Tap Shift or Space to snap through danger and break angle pressure when the screen teams start to box you in.',
        progress: this.tutorial.dashUsed ? 100 : 0,
        status: 'Mobility drill',
        completed: false,
      };
    }

    if (stepIndex === 5) {
      return {
        step: 6,
        totalSteps: TOTAL_TUTORIAL_STEPS,
        title: 'Make extraction',
        body: `Once the ${contract.uploadLabel} finishes, burn to the ${contract.extractionLabel} and stay inside the exfil ring until the route locks.`,
        progress: this.state.victory
          ? 100
          : this.state.objectivePhase === 'extract'
            ? Math.max(this.state.extractionProgress, clamp((1 - extractionDistance / 1520) * 100, 0, 100))
            : 0,
        status: this.state.objectivePhase === 'extract' ? 'Exfil live' : this.state.victory ? 'Contract complete' : 'Waiting for upload',
        completed: false,
      };
    }

    return {
      step: TOTAL_TUTORIAL_STEPS,
      totalSteps: TOTAL_TUTORIAL_STEPS,
      title: 'Training complete',
      body: 'You have the basics. The route now reads like a contract: ingress, objective, hold, and extraction under pressure.',
      progress: 100,
      status: this.state.victory ? 'Contract complete' : this.state.gameOver ? 'Run failed' : 'Free combat',
      completed: true,
    };
  }

  private updateTutorial() {
    while (this.tutorial.stepIndex < TOTAL_TUTORIAL_STEPS) {
      if (this.tutorial.stepIndex === 0 && this.tutorial.moveDistance >= 260) {
        this.advanceTutorial('Movement sync complete');
        continue;
      }
      if (this.tutorial.stepIndex === 1 && this.state.combatActive) {
        this.advanceTutorial('Sweep armed');
        continue;
      }
      if (
        this.tutorial.stepIndex === 2
        && (this.state.objectivePhase === 'hack-terminal' || this.state.objectivePhase === 'hold-upload' || this.state.objectivePhase === 'extract' || this.state.objectivePhase === 'complete')
      ) {
        this.advanceTutorial('Relay terminal reached');
        continue;
      }
      if (this.tutorial.stepIndex === 3 && (this.tutorial.shotsFired >= 6 || this.state.kills >= 1)) {
        this.advanceTutorial('Opening screen broken');
        continue;
      }
      if (this.tutorial.stepIndex === 4 && this.tutorial.dashUsed) {
        this.advanceTutorial('Dash discipline logged');
        continue;
      }
      if (this.tutorial.stepIndex === 5 && this.state.victory) {
        this.advanceTutorial('Contract loop complete');
        continue;
      }
      break;
    }
  }

  private getRunModifiers() {
    return this.runConfig.cyberware.modifiers;
  }

  private setNarrativePulse(status: string, summary: string, duration = 4.8) {
    this.narrativePulse = {
      status,
      summary,
      timeRemaining: duration,
    };
  }

  private applyNarrativePulse() {
    if (!this.narrativePulse) return;
    this.state.districtStatus = this.narrativePulse.status;
    this.state.districtSummary = this.narrativePulse.summary;
  }

  private getLeadActiveHazard() {
    return this.state.activeHazards[0] ?? null;
  }

  private getOptionalObjectiveDefinition() {
    return this.runConfig.contract.optionalObjective ?? null;
  }

  private setOptionalObjectiveState(
    nextState: OptionalObjectiveState,
    statusText: string | null,
    summary: string | null,
  ) {
    this.state.optionalObjectiveState = nextState;
    this.state.optionalObjectiveStatusText = statusText;
    this.state.optionalObjectiveSummary = summary;
  }

  private completeOptionalObjective(optionalObjective: ContractOptionalObjectiveDefinition) {
    this.state.optionalObjectiveProgress = 100;
    this.state.optionalObjectiveRewardCredits = optionalObjective.bonusCredits;
    this.state.optionalObjectiveReputationBonus = optionalObjective.reputationBonus;
    this.state.score += optionalObjective.bonusCredits * 2;
    this.setOptionalObjectiveState(
      'completed',
      `${optionalObjective.shortLabel} secured // ${optionalObjective.rewardLabel}`,
      optionalObjective.completionSummary,
    );
    optionalObjective.ambushSpawns?.forEach((spawn) => this.spawnScriptedEnemy(spawn));
    this.setNarrativePulse(optionalObjective.completionStatus, optionalObjective.completionSummary, 5.4);
  }

  private skipOptionalObjective(optionalObjective: ContractOptionalObjectiveDefinition) {
    this.state.optionalObjectiveProgress = 0;
    this.setOptionalObjectiveState(
      'skipped',
      `${optionalObjective.shortLabel} skipped`,
      optionalObjective.skipSummary,
    );
    this.setNarrativePulse(optionalObjective.skipStatus, optionalObjective.skipSummary, 4.2);
  }

  private updateOptionalObjective(dt: number) {
    const optionalObjective = this.getOptionalObjectiveDefinition();
    if (!optionalObjective || this.state.contractResolved) return;
    if (this.state.optionalObjectiveState !== 'available') return;
    if (!isOptionalObjectivePhase(optionalObjective, this.state.objectivePhase)) return;
    if (!this.state.optionalObjectivePoint) return;

    const distance = distanceBetween(this.state.player.position, this.state.optionalObjectivePoint);
    const inRadius = distance <= this.state.optionalObjectiveRadius;
    this.state.optionalObjectiveProgress = inRadius
      ? clamp(this.state.optionalObjectiveProgress + (dt / optionalObjective.captureDuration) * 100, 0, 100)
      : clamp(this.state.optionalObjectiveProgress - dt * 24, 0, 100);

    this.state.optionalObjectiveStatusText = inRadius
      ? `${optionalObjective.shortLabel} breach // ${Math.round(this.state.optionalObjectiveProgress)}%`
      : `${optionalObjective.shortLabel} live // ${optionalObjective.rewardLabel}`;
    this.state.optionalObjectiveSummary = inRadius
      ? `${optionalObjective.detail} Hold the pocket long enough to finish the scrape, then get back onto the bridge route.`
      : optionalObjective.summary;

    if (this.state.optionalObjectiveProgress >= 100) {
      this.completeOptionalObjective(optionalObjective);
    }
  }

  private activateHazard(hazardDefinition: ContractHazardDefinition) {
    const existingHazard = this.state.activeHazards.find((hazard) => hazard.id === hazardDefinition.id);
    if (existingHazard) {
      existingHazard.remaining = Math.max(existingHazard.remaining, hazardDefinition.duration);
      existingHazard.maxDuration = Math.max(existingHazard.maxDuration, hazardDefinition.duration);
      existingHazard.damagePerSecond = Math.max(existingHazard.damagePerSecond, hazardDefinition.damagePerSecond);
      return;
    }

    const nextHazard: HazardState = {
      id: hazardDefinition.id,
      kind: hazardDefinition.kind,
      label: hazardDefinition.label,
      status: hazardDefinition.status,
      summary: hazardDefinition.summary,
      position: { ...hazardDefinition.position },
      radius: hazardDefinition.radius,
      remaining: hazardDefinition.duration,
      maxDuration: hazardDefinition.duration,
      damagePerSecond: hazardDefinition.damagePerSecond,
      affectsEnemies: hazardDefinition.affectsEnemies ?? true,
      color: hazardDefinition.color,
    };

    this.state.activeHazards.push(nextHazard);
    this.setNarrativePulse(hazardDefinition.status, hazardDefinition.summary, Math.min(5.4, Math.max(3.4, hazardDefinition.duration * 0.35)));
    this.emitEvent({
      type: 'hazard-triggered',
      kind: hazardDefinition.kind,
      label: hazardDefinition.label,
      position: { ...hazardDefinition.position },
    });
  }

  private spawnScriptedEnemy(beatSpawn: ContractBeatSpawnDefinition) {
    const enemy = createEnemy(
      this.nextEnemyId++,
      this.state.wave + (beatSpawn.waveOffset ?? 0),
      beatSpawn.type,
      this.runConfig.hostileHeat + (beatSpawn.heatOffset ?? 0),
      { ...beatSpawn.position },
    );
    enemy.facing = directionTo(enemy.position, this.state.player.position);
    moveCircleWithinBounds(enemy.position, enemy.radius);
    this.state.obstacles.forEach((obstacle) => resolveCircleVsRect(enemy.position, enemy.radius, obstacle));
    this.state.enemies.push(enemy);

    if (enemy.type === 'captain') {
      this.state.eliteActive = true;
      this.state.eliteHealth = enemy.health;
      this.state.eliteMaxHealth = enemy.maxHealth;
    }
  }

  private getCurrentPhaseProgress(phase: ContractBeatDefinition['phase']) {
    const player = this.state.player;

    if (phase === 'reach-terminal') {
      return clamp((1 - distanceBetween(player.position, this.state.terminalPoint) / 1220) * 100, 0, 100);
    }

    if (phase === 'hack-terminal') {
      return this.state.terminalProgress;
    }

    if (phase === 'hold-upload') {
      return clamp((1 - (this.state.uploadTimeRemaining / Math.max(this.state.uploadDuration, 0.01))) * 100, 0, 100);
    }

    return Math.max(
      this.state.extractionProgress,
      clamp((1 - distanceBetween(player.position, this.state.extractionPoint) / 1680) * 100, 0, 100),
    );
  }

  private applyAuthoredBeats(phaseJustEntered: boolean) {
    const beats = this.runConfig.contract.authoredBeats ?? [];
    if (beats.length === 0 || this.state.contractResolved) return;

    beats.forEach((beat) => {
      if (this.triggeredBeatIds.has(beat.id) || beat.phase !== this.state.objectivePhase) {
        return;
      }

      const shouldTrigger = shouldTriggerContractTrigger(
        beat.trigger,
        phaseJustEntered,
        this.phaseElapsed,
        this.getCurrentPhaseProgress(beat.phase),
      );

      if (!shouldTrigger) {
        return;
      }

      beat.spawns.forEach((spawn) => this.spawnScriptedEnemy(spawn));
      this.triggeredBeatIds.add(beat.id);
      this.setNarrativePulse(beat.status, beat.summary);
    });
  }

  private applyContractHazards(phaseJustEntered: boolean) {
    const hazards = this.runConfig.contract.hazards ?? [];
    if (hazards.length === 0 || this.state.contractResolved) return;

    hazards.forEach((hazard) => {
      if (this.triggeredHazardIds.has(hazard.id) || hazard.phase !== this.state.objectivePhase) {
        return;
      }

      const shouldTrigger = shouldTriggerContractTrigger(
        hazard.trigger,
        phaseJustEntered,
        this.phaseElapsed,
        this.getCurrentPhaseProgress(hazard.phase),
      );

      if (!shouldTrigger) {
        return;
      }

      this.activateHazard(hazard);
      this.triggeredHazardIds.add(hazard.id);
    });
  }

  private spawnEliteIfNeeded() {
    const { contract } = this.runConfig;
    if (!contract.elite || this.eliteSpawned || this.state.contractResolved) return;
    if (this.state.objectivePhase !== contract.elite.phase) return;

    const anchor = contract.elite.phase === 'hold-upload' ? this.state.terminalPoint : this.state.extractionPoint;
    const spawn = spawnPointAroundTarget(anchor, 220, 320);
    const elite = createEnemy(
      this.nextEnemyId++,
      this.state.wave + 1,
      contract.elite.type,
      this.runConfig.hostileHeat + 18,
      spawn,
    );
    elite.facing = directionTo(spawn, this.state.player.position);
    this.state.enemies.push(elite);
    this.state.eliteActive = true;
    this.state.eliteHealth = elite.health;
    this.state.eliteMaxHealth = elite.maxHealth;
    this.eliteSpawned = true;
    this.state.districtStatus = 'Elite contact confirmed';
    this.state.districtSummary = contract.elite.intro;
    this.setNarrativePulse('Elite contact confirmed', contract.elite.intro, 5.2);
    this.emitEvent({ type: 'elite-spawned', callsign: contract.elite.callsign });
  }

  private applyPlayerDamage(damage: number, affectedByCover: boolean, emitHitEvent = true) {
    const player = this.state.player;
    const finalDamage = affectedByCover && this.state.playerInCover ? damage * COVER_DAMAGE_MULTIPLIER : damage;
    const usedShield = player.shield > 0;

    if (player.shield > 0) {
      const shieldLoss = Math.min(player.shield, finalDamage);
      player.shield -= shieldLoss;
      if (shieldLoss < finalDamage) {
        player.health = clamp(player.health - (finalDamage - shieldLoss), 0, player.maxHealth);
      }
    } else {
      player.health = clamp(player.health - finalDamage, 0, player.maxHealth);
    }

    player.shieldRegenDelay = PLAYER_SHIELD_REGEN_DELAY;
    if (emitHitEvent) {
      this.emitEvent({ type: 'player-hit', usedShield });
    }

    if (player.health <= 0 && !this.state.contractResolved) {
      this.state.gameOver = true;
      this.state.contractResolved = true;
      this.emitEvent({ type: 'game-over' });
    }
  }

  private stepHazards(dt: number) {
    if (this.state.activeHazards.length === 0 || this.state.contractResolved) return;

    const player = this.state.player;
    const remainingHazards: HazardState[] = [];

    this.state.activeHazards.forEach((hazard) => {
      hazard.remaining -= dt;
      if (hazard.remaining <= 0) {
        return;
      }

      if (distanceBetween(player.position, hazard.position) <= hazard.radius) {
        this.applyPlayerDamage(hazard.damagePerSecond * dt, false, false);
        player.energy = clamp(player.energy - dt * (hazard.kind === 'blackout' ? 8 : 3), 0, player.maxEnergy);
      }

      if (hazard.affectsEnemies) {
        this.state.enemies.forEach((enemy) => {
          if (distanceBetween(enemy.position, hazard.position) <= hazard.radius + enemy.radius * 0.25) {
            enemy.health -= hazard.damagePerSecond * dt * (enemy.type === 'captain' ? 0.55 : enemy.type === 'brute' ? 0.8 : 1);
          }
        });
      }

      remainingHazards.push(hazard);
    });

    this.state.activeHazards = remainingHazards;
  }

  private fireProjectile() {
    const player = this.state.player;
    const profile = getWeaponProfile(player.currentWeapon, this.runConfig);
    if (player.fireCooldown > 0 || player.overheated || player.energy < profile.energyCost) return;

    const aimVector = normalize({
      x: this.input.aimWorld.x - player.position.x,
      y: this.input.aimWorld.y - player.position.y,
    });
    if (!Number.isFinite(aimVector.x) || !Number.isFinite(aimVector.y)) return;

    const aimAngle = Math.atan2(aimVector.y, aimVector.x);
    const projectileCount = profile.projectileCount;

    for (let index = 0; index < projectileCount; index += 1) {
      const spreadOffset = projectileCount === 1 ? 0 : ((index / (projectileCount - 1)) - 0.5) * profile.spread;
      const shotVector = rotateVector({ x: Math.cos(aimAngle), y: Math.sin(aimAngle) }, spreadOffset);
      this.state.projectiles.push({
        id: this.nextProjectileId++,
        owner: 'player',
        position: { x: player.position.x + shotVector.x * 34, y: player.position.y + shotVector.y * 34 },
        velocity: { x: shotVector.x * profile.projectileSpeed, y: shotVector.y * profile.projectileSpeed },
        damage: profile.damage,
        life: profile.projectileLife,
        color: profile.color,
        width: profile.width,
        shieldFrontMultiplier: player.currentWeapon === 'rail' ? 0.58 : 0.24,
        shieldBreakMultiplier: profile.shieldBreakMultiplier,
      });
    }

    this.tutorial.shotsFired += 1;
    player.fireCooldown = profile.fireCooldown;
    player.energy = clamp(player.energy - profile.energyCost, 0, player.maxEnergy);
    player.weaponHeat = clamp(player.weaponHeat + profile.heatPerShot, 0, 115);
    this.emitEvent({ type: 'shot-fired', weapon: player.currentWeapon, origin: { ...player.position }, direction: { ...aimVector } });

    if (player.weaponHeat >= 100) {
      player.overheated = true;
      this.state.districtStatus = 'Weapon spool overheated';
      this.state.districtSummary = 'Back off for a second. Let the smartgun shed heat before the next push.';
      this.emitEvent({ type: 'overheat' });
    }
  }

  private fireEnemyProjectile(enemy: EnemyState, aimVector: Vector2, spread = 0.04) {
    const shotVector = rotateVector(aimVector, randomFromRange(-spread, spread));
    const color = enemy.type === 'sniper' ? '#ffd86b' : enemy.type === 'captain' ? '#ff5d8c' : '#ff6fe1';
    const width = enemy.type === 'sniper' ? 5 : enemy.type === 'captain' ? 6 : 3;
    this.state.projectiles.push({
      id: this.nextProjectileId++,
      owner: 'enemy',
      position: { x: enemy.position.x + shotVector.x * (enemy.radius + 10), y: enemy.position.y + shotVector.y * (enemy.radius + 10) },
      velocity: { x: shotVector.x * enemy.projectileSpeed, y: shotVector.y * enemy.projectileSpeed },
      damage: enemy.damage,
      life: enemy.projectileLife,
      color,
      width,
    });
  }

  private cycleWeapon(direction: -1 | 1) {
    const player = this.state.player;
    const currentIndex = WEAPON_ORDER.indexOf(player.currentWeapon);
    const nextIndex = (currentIndex + direction + WEAPON_ORDER.length) % WEAPON_ORDER.length;
    player.currentWeapon = WEAPON_ORDER[nextIndex];
    const weapon = getWeaponProfile(player.currentWeapon, this.runConfig);
    this.state.districtStatus = `Weapon switched // ${weapon.name}`;
    this.state.districtSummary = weapon.detail;
    this.emitEvent({ type: 'weapon-swapped', weapon: player.currentWeapon });
  }

  private pickEnemyType(): EnemyType {
    const pool = this.runConfig.contract.enemyPacks[this.state.objectivePhase] ?? [];
    return pool.length === 0 ? 'runner' : pool[Math.floor(Math.random() * pool.length)];
  }

  private spawnEnemy() {
    if (!this.state.combatActive || this.state.contractResolved) return;

    const heatTier = getHeatTier(this.runConfig);
    const activeCap = (this.runConfig.contract.activeCaps[this.state.objectivePhase] ?? 8)
      + heatTier
      + (this.state.eliteActive ? 1 : 0);

    if (this.state.enemies.length >= activeCap) return;

    const aggressivePhase = this.state.objectivePhase === 'hold-upload' || this.state.objectivePhase === 'extract';
    const spawnCount = aggressivePhase && Math.random() > (0.58 - heatTier * 0.06) ? 2 : 1;
    for (let index = 0; index < spawnCount; index += 1) {
      this.state.enemies.push(createEnemy(this.nextEnemyId++, this.state.wave, this.pickEnemyType(), this.runConfig.hostileHeat));
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

  private updateCoverState() {
    const nearObstacle = this.state.obstacles.some((obstacle) => distanceToObstacleEdge(this.state.player.position, obstacle) <= COVER_PROXIMITY);
    if (!nearObstacle || this.state.enemies.length === 0) {
      this.state.playerInCover = false;
      return;
    }
    this.state.playerInCover = this.state.enemies.some((enemy) => enemy.attackRange > 0 && !hasLineOfSight(enemy.position, this.state.player.position, this.state.obstacles));
  }

  private updateObjectiveFlow(dt: number) {
    if (!this.state.combatActive || this.state.contractResolved) return;

    const { contract } = this.runConfig;
    const player = this.state.player;
    const terminalDistance = distanceBetween(player.position, this.state.terminalPoint);
    const extractionDistance = distanceBetween(player.position, this.state.extractionPoint);

    this.updateOptionalObjective(dt);

    if (this.state.objectivePhase === 'reach-terminal') {
      if (terminalDistance <= this.state.terminalRadius) {
        if (contract.optionalObjective && this.state.optionalObjectiveState === 'available' && !isOptionalObjectivePhase(contract.optionalObjective, 'hack-terminal')) {
          this.skipOptionalObjective(contract.optionalObjective);
        }
        this.state.objectivePhase = 'hack-terminal';
        this.state.districtStatus = `${contract.terminalLabel} secured`;
        this.state.districtSummary = `Hold inside the ${contract.terminalLabel} ring and ${contract.breachLabel}. Extraction only exists if the lock holds.`;
      }
      return;
    }

    if (this.state.objectivePhase === 'hack-terminal') {
      this.state.terminalProgress = terminalDistance <= this.state.terminalRadius
        ? clamp(this.state.terminalProgress + (dt / contract.terminalCaptureDuration) * 100, 0, 100)
        : clamp(this.state.terminalProgress - dt * 16, 0, 100);

      if (this.state.terminalProgress >= 100) {
        if (contract.optionalObjective && this.state.optionalObjectiveState === 'available') {
          this.skipOptionalObjective(contract.optionalObjective);
        }
        this.state.objectivePhase = 'hold-upload';
        this.state.uploadTimeRemaining = this.state.uploadDuration;
        this.state.districtStatus = `${contract.uploadLabel} live`;
        this.state.districtSummary = `The ${contract.uploadLabel} is live. Keep the ring breathing until the route closes clean.`;
      }
      return;
    }

    if (this.state.objectivePhase === 'hold-upload') {
      this.state.uploadTimeRemaining = clamp(this.state.uploadTimeRemaining - dt, 0, this.state.uploadDuration);
      if (this.state.uploadTimeRemaining <= 0) {
        this.state.objectivePhase = 'extract';
        this.state.extractionTimeRemaining = this.state.extractionDuration;
        this.state.districtStatus = 'Extraction green';
        this.state.districtSummary = `The ${contract.uploadLabel} landed. Burn for the ${contract.extractionLabel} and hold the exfil ring until the route locks.`;
      }
      return;
    }

    if (this.state.objectivePhase === 'extract') {
      this.state.extractionTimeRemaining = clamp(this.state.extractionTimeRemaining - dt, 0, this.state.extractionDuration);
      this.state.extractionProgress = extractionDistance <= this.state.extractionRadius
        ? clamp(this.state.extractionProgress + (dt / contract.extractionHoldDuration) * 100, 0, 100)
        : clamp(this.state.extractionProgress - dt * 55, 0, 100);

      if (this.state.extractionProgress >= 100) {
        this.state.victory = true;
        this.state.contractResolved = true;
        this.state.objectivePhase = 'complete';
        this.state.districtStatus = 'Contract complete';
        this.state.districtSummary = contract.victorySummary ?? `You closed ${contract.title}, rode the ${contract.extractionLabel}, and left the district alive.`;
        this.emitEvent({ type: 'mission-success' });
        return;
      }

      if (this.state.extractionTimeRemaining <= 0) {
        this.state.gameOver = true;
        this.state.contractResolved = true;
        this.state.districtStatus = 'Exfil window lost';
        this.state.districtSummary = contract.failureSummary ?? `The ${contract.extractionLabel} sealed and the route died under pressure. Run it again with cleaner tempo.`;
        this.emitEvent({ type: 'game-over' });
      }
    }
  }

  private applyMissionState() {
    const { contract } = this.runConfig;
    const player = this.state.player;
    const objectivePhase = this.state.objectivePhase;
    const activeHazard = this.getLeadActiveHazard();

    if (this.state.victory) {
      const optionalSuffix = this.state.optionalObjectiveState === 'completed' && contract.optionalObjective
        ? ` ${contract.optionalObjective.shortLabel} secured for ${contract.optionalObjective.rewardLabel}.`
        : '';
      this.state.mission = {
        title: `${contract.title} complete`,
        detail: `The ${contract.uploadLabel} landed and you made the ${contract.extractionLabel} before the district could close on you.${optionalSuffix}`,
        progress: 100,
        status: 'Extracted clean',
      };
      this.state.districtSummary = contract.victorySummary ?? this.state.districtSummary;
      return;
    }

    if (this.state.gameOver) {
      const failedByTimer = objectivePhase === 'extract' && this.state.extractionTimeRemaining <= 0;
      this.state.mission = {
        title: failedByTimer ? `Missed ${contract.extractionLabel}` : 'Run flatlined',
        detail: failedByTimer
          ? `The ${contract.extractionLabel} ghosted you. The route was there, but you did not make it in time.`
          : `${contract.zone} chewed you up before the contract could close. Reset and hit the line again.`,
        progress: 0,
        status: 'Contract failed',
      };
      if (!failedByTimer) {
        this.state.districtStatus = 'Run failed';
        this.state.districtSummary = `You went dark in ${contract.zone}. Reset the contract and drive the route harder on the next pass.`;
      } else if (contract.failureSummary) {
        this.state.districtSummary = contract.failureSummary;
      }
      return;
    }

    if (!this.state.combatActive) {
      const explorationProgress = clamp(((player.position.x / WORLD_WIDTH) * 45) + ((1 - player.position.y / WORLD_HEIGHT) * 55), 8, 100);
      this.state.mission = {
        title: contract.initialMission.title,
        detail: contract.initialMission.detail,
        progress: explorationProgress,
        status: 'Recon mode',
      };
      this.state.districtStatus = 'District quiet. Recon window open.';
      this.state.districtSummary = contract.reconSummary;
      return;
    }

    if (objectivePhase === 'reach-terminal') {
      const optionalStatus = contract.optionalObjective
        ? this.state.optionalObjectiveState === 'completed'
          ? `${contract.optionalObjective.shortLabel} secured`
          : this.state.optionalObjectiveState === 'skipped'
            ? `${contract.optionalObjective.shortLabel} skipped`
            : `Optional live // ${contract.optionalObjective.rewardLabel}`
        : null;
      this.state.mission = {
        title: `Reach the ${contract.terminalLabel}`,
        detail: contract.optionalObjective && this.state.optionalObjectiveState === 'available'
          ? `Push through the kill lanes, crack the ${contract.optionalObjective.shortLabel.toLowerCase()} for bonus proof if you want it, then ${contract.breachLabel} inside the ${contract.terminalLabel} before the district locks it down.`
          : `Push through the kill lanes and ${contract.breachLabel} inside the ${contract.terminalLabel} before the district locks it down.`,
        progress: clamp((1 - distanceBetween(player.position, this.state.terminalPoint) / 1220) * 100, 0, 100),
        status: optionalStatus ? `Terminal run // ${optionalStatus}` : 'Terminal run',
      };
      this.state.districtStatus = this.state.playerInCover ? 'Cover holding' : 'Lane still contested';
      this.state.districtSummary = this.state.optionalObjectiveState === 'available' && contract.optionalObjective
        ? `${contract.optionalObjective.summary} It pays more if you still extract, but the archive pocket will wake another Glasshouse response pack.`
        : this.state.playerInCover
        ? `The props are buying you life. Leapfrog cover and keep the ${contract.terminalLabel} in sight.`
        : `The district is live now. Use the barricades and street clutter to cut the route down into readable fights.`;
      return;
    }

    if (objectivePhase === 'hack-terminal') {
      this.state.mission = {
        title: `Secure the ${contract.terminalLabel}`,
        detail: `Hold inside the ring while you ${contract.breachLabel}. Leaving the zone lets the lock recover.`,
        progress: this.state.terminalProgress,
        status: this.state.optionalObjectiveState === 'completed' && contract.optionalObjective
          ? `Breach in progress // ${contract.optionalObjective.shortLabel} banked`
          : this.state.optionalObjectiveState === 'skipped' && contract.optionalObjective
            ? `Breach in progress // ${contract.optionalObjective.shortLabel} skipped`
            : 'Breach in progress',
      };
      this.state.districtStatus = activeHazard
        ? `${activeHazard.label} live`
        : this.state.playerInCover ? 'Tap shielded by cover' : 'Relay tap exposed';
      this.state.districtSummary = activeHazard
        ? `${activeHazard.summary} Hold the ring in short bursts and use the cover strips to reset between surges.`
        : this.state.playerInCover
          ? `Good. The props are screening the breach. Keep the close lanes clear and do not abandon the ${contract.terminalLabel}.`
          : `The breach is working but the route is open. Drag enemies through the cover strips instead of face-tanking the ring.`;
      return;
    }

    if (objectivePhase === 'hold-upload') {
      const optionalSummary = this.state.optionalObjectiveState === 'completed' && contract.optionalObjective
        ? `${contract.optionalObjective.shortLabel} secured. Hold long enough to cash the bonus shard out with the main ledger.`
        : this.state.optionalObjectiveState === 'skipped' && contract.optionalObjective
          ? `${contract.optionalObjective.shortLabel} stayed dark, so the main route needs to carry the whole contract by itself.`
          : null;
      this.state.mission = {
        title: `Hold for ${contract.uploadLabel}`,
        detail: `The ${contract.uploadLabel} is live. Stay mobile, rotate cover, and keep the lane alive until the district coughs it up.`,
        progress: clamp((1 - (this.state.uploadTimeRemaining / this.state.uploadDuration)) * 100, 0, 100),
        status: optionalSummary
          ? `${Math.ceil(this.state.uploadTimeRemaining)}s to close // ${this.state.optionalObjectiveState === 'completed' ? 'bonus shard on line' : 'main route only'}`
          : `${Math.ceil(this.state.uploadTimeRemaining)}s to close`,
      };
      this.state.districtStatus = this.state.eliteActive
        ? `Elite pressure // ${this.state.eliteCallsign ?? 'Unknown'}`
        : activeHazard
          ? `${activeHazard.label} active`
        : this.state.threatLevel >= 70
          ? 'Kill zone unstable'
          : this.state.playerInCover
            ? 'Holding in cover'
            : 'Upload under pressure';
      this.state.districtSummary = optionalSummary
        ? optionalSummary
        : this.state.eliteActive
        ? `${this.state.eliteCallsign} is on the lane. Break the angle discipline before the ring collapses.`
        : activeHazard
          ? `${activeHazard.summary} Time your movement through the safe pockets and do not get stranded in the hazard bloom.`
        : this.state.threatLevel >= 70
          ? 'Heavy contact. Brutes and shield carriers are trying to break the ring. Shift angles before they stack on you.'
          : this.state.playerInCover
            ? 'The lane still reads. Peek, burst, and reset before the next wave pushes through.'
            : 'You are exposed. The route wants disciplined movement, not panic drifting.';
      return;
    }

    if (objectivePhase === 'extract') {
      const optionalStatus = this.state.optionalObjectiveState === 'completed' && contract.optionalObjective
        ? `${contract.optionalObjective.shortLabel} secured`
        : this.state.optionalObjectiveState === 'skipped' && contract.optionalObjective
          ? `${contract.optionalObjective.shortLabel} skipped`
          : null;
      this.state.mission = {
        title: `Burn for the ${contract.extractionLabel}`,
        detail: `The ${contract.uploadLabel} is done. Push to the ${contract.extractionLabel} and stay inside the exfil ring until it locks.`,
        progress: Math.max(this.state.extractionProgress, clamp((1 - distanceBetween(player.position, this.state.extractionPoint) / 1680) * 100, 0, 100)),
        status: optionalStatus
          ? `${Math.ceil(this.state.extractionTimeRemaining)}s exfil window // ${optionalStatus}`
          : `${Math.ceil(this.state.extractionTimeRemaining)}s exfil window`,
      };
      this.state.districtStatus = this.state.eliteActive
        ? `Route contested // ${this.state.eliteCallsign ?? 'Unknown'}`
        : activeHazard
          ? `${activeHazard.label} across exfil`
        : this.state.playerInCover
          ? 'Exfil route screened'
          : 'Extraction route hot';
      this.state.districtSummary = this.state.eliteActive
        ? `${this.state.eliteCallsign} owns the route. Break the elite line and keep moving or the ${contract.extractionLabel} is gone.`
        : activeHazard
          ? `${activeHazard.summary} Move on rhythm, stay out of the bloom, and only commit to the ${contract.extractionLabel} when the lane opens.`
        : this.state.playerInCover
          ? 'Good spacing. Keep chaining props and move when the next opening appears.'
          : 'You have a route, but it is burning down. Dash across the open lanes and do not let the snipers settle.';
    }
  }

  private stepProjectiles(dt: number) {
    const nextProjectiles: ProjectileState[] = [];

    this.state.projectiles.forEach((projectile) => {
      projectile.position.x += projectile.velocity.x * dt;
      projectile.position.y += projectile.velocity.y * dt;
      projectile.life -= dt;

      if (projectile.life <= 0) return;
      if (
        projectile.position.x < -40
        || projectile.position.y < -40
        || projectile.position.x > WORLD_WIDTH + 40
        || projectile.position.y > WORLD_HEIGHT + 40
      ) {
        return;
      }
      if (this.state.obstacles.some((obstacle) => pointInsideObstacle(projectile.position, obstacle, 10))) {
        return;
      }

      if (projectile.owner === 'player') {
        let hitEnemy = false;
        this.state.enemies.forEach((enemy) => {
          if (hitEnemy) return;
          if (distanceBetween(projectile.position, enemy.position) > enemy.radius + 10) return;

          let damage = projectile.damage;
          if (enemy.type === 'shield') {
            const incomingDirection = normalize({ x: -projectile.velocity.x, y: -projectile.velocity.y });
            const shielded = dot(incomingDirection, enemy.facing) >= 0.58;
            if (shielded) {
              damage *= (projectile.shieldFrontMultiplier ?? 0.24) * (projectile.shieldBreakMultiplier ?? 1);
            }
          }

          enemy.health -= damage;
          hitEnemy = true;
        });

        if (!hitEnemy) {
          nextProjectiles.push(projectile);
        }
        return;
      }

      if (distanceBetween(projectile.position, this.state.player.position) <= PLAYER_RADIUS + 8) {
        this.applyPlayerDamage(projectile.damage, true);
        return;
      }

      nextProjectiles.push(projectile);
    });

    this.state.projectiles = nextProjectiles;
  }

  private stepEnemies(dt: number) {
    const player = this.state.player;
    const remainingEnemies: EnemyState[] = [];

    this.state.enemies.forEach((enemy) => {
      enemy.contactCooldown = Math.max(0, enemy.contactCooldown - dt);
      enemy.fireCooldown = Math.max(0, enemy.fireCooldown - dt);

      const toPlayer = directionTo(enemy.position, player.position);
      const distanceToPlayer = distanceBetween(enemy.position, player.position);
      const hasSight = hasLineOfSight(enemy.position, player.position, this.state.obstacles);
      const flankSign = Math.sin((this.state.timeSeconds * 0.9) + enemy.id) >= 0 ? 1 : -1;
      const lateral = normalize(perpendicular(toPlayer, flankSign));
      let desiredVelocity: Vector2 = { x: 0, y: 0 };

      if (enemy.type === 'runner') {
        const laneBias = Math.sin((this.state.timeSeconds * 2.9) + enemy.id * 0.77) * 0.65;
        const rushVector = normalize({
          x: toPlayer.x + lateral.x * laneBias,
          y: toPlayer.y + lateral.y * laneBias,
        });
        desiredVelocity = {
          x: rushVector.x * enemy.speed,
          y: rushVector.y * enemy.speed,
        };
        enemy.facing = rushVector;
      } else if (enemy.type === 'brute') {
        desiredVelocity = {
          x: toPlayer.x * enemy.speed,
          y: toPlayer.y * enemy.speed,
        };
        enemy.facing = toPlayer;
      } else if (enemy.type === 'shield') {
        const pushVector = distanceToPlayer > enemy.preferredRange
          ? toPlayer
          : normalize({
            x: toPlayer.x * 0.75 + lateral.x * 0.22,
            y: toPlayer.y * 0.75 + lateral.y * 0.22,
          });
        desiredVelocity = {
          x: pushVector.x * enemy.speed,
          y: pushVector.y * enemy.speed,
        };
        enemy.facing = toPlayer;
      } else if (enemy.type === 'gunner') {
        const spacingError = distanceToPlayer - enemy.preferredRange;
        const moveVector = normalize({
          x: toPlayer.x * clamp(spacingError / Math.max(enemy.preferredRange, 1), -1, 1) + lateral.x * 0.85,
          y: toPlayer.y * clamp(spacingError / Math.max(enemy.preferredRange, 1), -1, 1) + lateral.y * 0.85,
        });
        const reposition = !hasSight || distanceToPlayer < enemy.preferredRange * 0.7 || distanceToPlayer > enemy.attackRange * 0.9;
        desiredVelocity = reposition
          ? { x: moveVector.x * enemy.speed, y: moveVector.y * enemy.speed }
          : { x: lateral.x * enemy.speed * 0.42, y: lateral.y * enemy.speed * 0.42 };
        enemy.facing = hasSight ? toPlayer : moveVector;

        if (hasSight && distanceToPlayer <= enemy.attackRange && enemy.fireCooldown === 0) {
          this.fireEnemyProjectile(enemy, toPlayer, 0.065);
          enemy.fireCooldown = 1.15;
        }
      } else if (enemy.type === 'sniper') {
        const retreatVector = normalize({
          x: toPlayer.x * clamp((distanceToPlayer - enemy.preferredRange) / Math.max(enemy.preferredRange, 1), -1, 1) + lateral.x * 0.34,
          y: toPlayer.y * clamp((distanceToPlayer - enemy.preferredRange) / Math.max(enemy.preferredRange, 1), -1, 1) + lateral.y * 0.34,
        });
        const shouldMove = !hasSight || distanceToPlayer < enemy.preferredRange * 0.88;
        desiredVelocity = shouldMove
          ? { x: retreatVector.x * enemy.speed, y: retreatVector.y * enemy.speed }
          : { x: lateral.x * enemy.speed * 0.22, y: lateral.y * enemy.speed * 0.22 };
        enemy.facing = hasSight ? toPlayer : retreatVector;

        if (hasSight && distanceToPlayer <= enemy.attackRange && enemy.fireCooldown === 0) {
          this.fireEnemyProjectile(enemy, toPlayer, 0.018);
          enemy.fireCooldown = 1.9;
        }
      } else if (enemy.type === 'captain') {
        const pressureVector = distanceToPlayer > enemy.preferredRange
          ? normalize({
            x: toPlayer.x * 0.92 + lateral.x * 0.32,
            y: toPlayer.y * 0.92 + lateral.y * 0.32,
          })
          : normalize({
            x: -toPlayer.x * 0.2 + lateral.x * 0.78,
            y: -toPlayer.y * 0.2 + lateral.y * 0.78,
          });
        desiredVelocity = {
          x: pressureVector.x * enemy.speed,
          y: pressureVector.y * enemy.speed,
        };
        enemy.facing = hasSight ? toPlayer : pressureVector;

        if (hasSight && distanceToPlayer <= enemy.attackRange && enemy.fireCooldown === 0) {
          this.fireEnemyProjectile(enemy, toPlayer, 0.03);
          enemy.fireCooldown = 0.8;
        }
      }

      enemy.velocity.x = lerp(enemy.velocity.x, desiredVelocity.x, 0.14);
      enemy.velocity.y = lerp(enemy.velocity.y, desiredVelocity.y, 0.14);
      enemy.position.x += enemy.velocity.x * dt;
      enemy.position.y += enemy.velocity.y * dt;
      moveCircleWithinBounds(enemy.position, enemy.radius);
      this.state.obstacles.forEach((obstacle) => resolveCircleVsRect(enemy.position, enemy.radius, obstacle));

      const collisionDistance = distanceBetween(enemy.position, player.position);
      if (collisionDistance <= enemy.radius + PLAYER_RADIUS - 5 && enemy.contactCooldown === 0) {
        this.applyPlayerDamage(enemy.damage, false);
        enemy.contactCooldown = enemy.type === 'brute'
          ? 0.9
          : enemy.type === 'shield'
            ? 0.7
            : 0.5;
      }

      if (enemy.health <= 0) {
        this.state.kills += 1;
        this.state.score += enemy.type === 'captain'
          ? 420
          : enemy.type === 'brute'
            ? 220
            : enemy.type === 'sniper'
              ? 160
              : enemy.type === 'shield'
                ? 145
                : enemy.type === 'gunner'
                  ? 120
                  : 90;
        this.state.credits += enemy.type === 'captain'
          ? 180
          : enemy.type === 'brute'
            ? 140
            : enemy.type === 'sniper'
              ? 95
              : enemy.type === 'shield'
                ? 100
                : enemy.type === 'gunner'
                  ? 80
                  : 55;
        if (enemy.type === 'captain') {
          this.state.eliteActive = false;
          this.state.eliteDefeated = true;
          this.state.eliteHealth = 0;
          this.state.districtStatus = 'Elite contact broken';
          this.state.districtSummary = `The ${this.state.eliteCallsign ?? 'elite'} went down. The route is still hot, but the district is breathing again.`;
          this.setNarrativePulse(
            'Elite contact broken',
            `The ${this.state.eliteCallsign ?? 'elite'} went down. The route is still hot, but the district is breathing again.`,
            4.8,
          );
        }
        this.dropPickup(enemy.position);
        this.emitEvent({
          type: 'enemy-killed',
          enemyType: enemy.type,
          position: { ...enemy.position },
        });
        return;
      }

      if (enemy.type === 'captain') {
        this.state.eliteHealth = Math.max(0, enemy.health);
        this.state.eliteMaxHealth = enemy.maxHealth;
      }

      remainingEnemies.push(enemy);
    });

    this.state.enemies = remainingEnemies;
  }

  private stepPickups(dt: number) {
    const modifiers = this.getRunModifiers();
    const player = this.state.player;
    const remainingPickups: PickupState[] = [];

    this.state.pickups.forEach((pickup) => {
      pickup.life -= dt;
      if (pickup.life <= 0) return;

      if (distanceBetween(pickup.position, player.position) <= PLAYER_RADIUS + 14) {
        if (pickup.type === 'credits') {
          const adjustedAmount = Math.round(pickup.amount * (1 + (modifiers.pickupCreditMultiplier ?? 0)));
          this.state.credits += adjustedAmount;
          this.state.score += Math.round(adjustedAmount * 1.4);
        } else if (pickup.type === 'energy') {
          player.energy = clamp(player.energy + pickup.amount, 0, player.maxEnergy);
        } else {
          player.health = clamp(player.health + pickup.amount + (modifiers.medkitBonus ?? 0), 0, player.maxHealth);
        }

        this.emitEvent({
          type: 'pickup',
          pickupType: pickup.type,
          amount: pickup.amount,
          position: { ...pickup.position },
        });
        return;
      }

      remainingPickups.push(pickup);
    });

    this.state.pickups = remainingPickups;
  }

  step(deltaSeconds: number) {
    const dt = clamp(deltaSeconds, 0, 0.05);
    const state = this.state;
    const player = state.player;
    const modifiers = this.getRunModifiers();

    if (state.contractResolved) {
      this.applyMissionState();
      return;
    }

    state.timeSeconds += dt;
    if (this.narrativePulse) {
      this.narrativePulse.timeRemaining -= dt;
      if (this.narrativePulse.timeRemaining <= 0) {
        this.narrativePulse = null;
      }
    }
    player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.shieldRegenDelay = Math.max(0, player.shieldRegenDelay - dt);
    player.weaponHeat = Math.max(0, player.weaponHeat - (PLAYER_HEAT_COOLDOWN + (modifiers.heatCooldownBonus ?? 0)) * dt);

    if (player.overheated && player.weaponHeat <= PLAYER_HEAT_RECOVERY_POINT) {
      player.overheated = false;
    }

    player.energy = clamp(player.energy + (PLAYER_ENERGY_REGEN_RATE + (modifiers.energyRegenBonus ?? 0)) * dt, 0, player.maxEnergy);
    if (player.shieldRegenDelay === 0) {
      player.shield = clamp(player.shield + (PLAYER_SHIELD_REGEN_RATE + (modifiers.shieldRegenBonus ?? 0)) * dt, 0, player.maxShield);
    }

    const moveVector = normalize({ x: this.input.moveX, y: this.input.moveY });
    const moveStrength = Math.abs(this.input.moveX) + Math.abs(this.input.moveY) > 0 ? 1 : 0;
    const aimVector = normalize({
      x: this.input.aimWorld.x - player.position.x,
      y: this.input.aimWorld.y - player.position.y,
    });
    if (Number.isFinite(aimVector.x) && Number.isFinite(aimVector.y)) {
      player.facing = aimVector;
    }

    player.velocity = {
      x: moveVector.x * PLAYER_SPEED * moveStrength,
      y: moveVector.y * PLAYER_SPEED * moveStrength,
    };

    if (this.input.swapPrevPressed) {
      this.cycleWeapon(-1);
    } else if (this.input.swapNextPressed) {
      this.cycleWeapon(1);
    }

    const dashCost = DASH_COST * (modifiers.dashCostMultiplier ?? 1);
    const dashCooldown = DASH_COOLDOWN * (modifiers.dashCooldownMultiplier ?? 1);

    if (this.input.dashPressed && player.dashCooldown === 0 && player.energy >= dashCost) {
      const dashOrigin = { ...player.position };
      const dashVector = moveStrength > 0
        ? moveVector
        : (Number.isFinite(player.facing.x) && Number.isFinite(player.facing.y) ? normalize(player.facing) : { x: 1, y: 0 });
      const dashDistance = DASH_SPEED * 0.24;
      player.position.x += dashVector.x * dashDistance;
      player.position.y += dashVector.y * dashDistance;
      moveCircleWithinBounds(player.position, PLAYER_RADIUS);
      state.obstacles.forEach((obstacle) => resolveCircleVsRect(player.position, PLAYER_RADIUS, obstacle));
      player.energy = clamp(player.energy - dashCost, 0, player.maxEnergy);
      player.dashCooldown = dashCooldown;
      this.tutorial.dashUsed = true;
      this.emitEvent({
        type: 'dash',
        origin: dashOrigin,
        destination: { ...player.position },
      });
    }

    const positionBeforeMove = { ...player.position };
    player.position.x += player.velocity.x * dt;
    player.position.y += player.velocity.y * dt;
    moveCircleWithinBounds(player.position, PLAYER_RADIUS);
    state.obstacles.forEach((obstacle) => resolveCircleVsRect(player.position, PLAYER_RADIUS, obstacle));
    this.tutorial.moveDistance += distanceBetween(positionBeforeMove, player.position);

    if (this.input.firing) {
      this.fireProjectile();
    }

    if (state.combatActive) {
      this.spawnEliteIfNeeded();
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy();
        const heatTier = getHeatTier(this.runConfig);
        const phaseBaseline = state.objectivePhase === 'reach-terminal'
          ? 1.4
          : state.objectivePhase === 'hack-terminal'
            ? 1.1
            : state.objectivePhase === 'hold-upload'
              ? 0.82
              : 0.74;
        this.spawnTimer = Math.max(
          0.26,
          (phaseBaseline / this.runConfig.contract.spawnRateMultiplier) - state.wave * 0.06 - heatTier * 0.05 - (state.eliteActive ? 0.08 : 0),
        ) + Math.random() * 0.35;
      }
    }

    this.stepProjectiles(dt);
    this.stepHazards(dt);
    this.stepEnemies(dt);
    this.updateCoverState();
    this.stepPickups(dt);

    const phaseBeforeObjectiveUpdate = state.objectivePhase;
    this.updateObjectiveFlow(dt);
    const phaseJustEntered = phaseBeforeObjectiveUpdate !== state.objectivePhase;
    this.phaseElapsed = phaseJustEntered ? 0 : this.phaseElapsed + dt;
    this.applyAuthoredBeats(phaseJustEntered);
    this.applyContractHazards(phaseJustEntered);

    state.wave = 1 + Math.floor(state.kills / 8);
    state.waveProgress = Math.round(((state.kills % 8) / 8) * 100);
    state.threatLevel = state.combatActive
      ? Math.round(
        clamp(
          10
            + state.enemies.length * 6.5
            + state.wave * 7
            + (state.objectivePhase === 'hold-upload' ? 10 : 0)
            + (state.objectivePhase === 'extract' ? 14 : 0)
            + state.activeHazards.length * 8
            + Math.max(0, 55 - player.health) * 0.42,
          0,
          100,
        ),
      )
      : 0;

    this.updateTutorial();
    this.applyMissionState();
    this.applyNarrativePulse();
  }
}

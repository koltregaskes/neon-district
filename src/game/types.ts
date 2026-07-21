export interface Vector2 {
  x: number;
  y: number;
}

export interface ArenaObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  glow: string;
  fill: string;
  label: string;
}

export type WeaponType = 'volley' | 'scatter' | 'rail';
export type FactionKey = 'morrow' | 'helix' | 'glasshouse';
export type ContractId = 'morrow-relay' | 'blackout-spine' | 'ghostline-run' | 'choir-heist' | 'glassfall-siege' | 'redline-blackout';
export type CyberwareId = 'mesh' | 'heat-sink' | 'blink-weave' | 'scrapper-daemon';
export type WeaponUpgradeId = 'volley-overdrive' | 'scatter-prism' | 'rail-capacitor';
export type HazardKind = 'shock' | 'blackout' | 'corrosive';

export interface PlayerState {
  position: Vector2;
  velocity: Vector2;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  weaponHeat: number;
  overheated: boolean;
  fireCooldown: number;
  dashCooldown: number;
  shieldRegenDelay: number;
  facing: Vector2;
  currentWeapon: WeaponType;
}

export type EnemyType = 'runner' | 'gunner' | 'brute' | 'sniper' | 'shield' | 'captain';

export interface EnemyState {
  id: number;
  type: EnemyType;
  position: Vector2;
  velocity: Vector2;
  facing: Vector2;
  health: number;
  maxHealth: number;
  radius: number;
  speed: number;
  damage: number;
  contactCooldown: number;
  fireCooldown: number;
  attackRange: number;
  preferredRange: number;
  projectileSpeed: number;
  projectileLife: number;
  glow: string;
}

export interface ProjectileState {
  id: number;
  owner: 'player' | 'enemy';
  position: Vector2;
  velocity: Vector2;
  damage: number;
  life: number;
  color: string;
  width: number;
  shieldFrontMultiplier?: number;
  shieldBreakMultiplier?: number;
}

export type PickupType = 'credits' | 'energy' | 'medkit';

export interface PickupState {
  id: number;
  type: PickupType;
  position: Vector2;
  amount: number;
  life: number;
}

export interface MissionState {
  title: string;
  detail: string;
  progress: number;
  status: string;
}

export type MissionPhase = 'recon' | 'reach-terminal' | 'hack-terminal' | 'hold-upload' | 'extract' | 'complete';

export interface RunModifierSet {
  maxHealthBonus?: number;
  maxShieldBonus?: number;
  maxEnergyBonus?: number;
  shieldRegenBonus?: number;
  energyRegenBonus?: number;
  heatCooldownBonus?: number;
  dashCostMultiplier?: number;
  dashCooldownMultiplier?: number;
  pickupCreditMultiplier?: number;
  contractPayoutBonus?: number;
  medkitBonus?: number;
}

export interface CyberwareDefinition {
  id: CyberwareId;
  title: string;
  slotLabel: string;
  summary: string;
  detail: string;
  unlockVictories: number;
  modifiers: RunModifierSet;
}

export interface WeaponUpgradeModifierSet {
  damageBonus?: number;
  fireCooldownMultiplier?: number;
  projectileSpeedBonus?: number;
  projectileLifeBonus?: number;
  projectileCountBonus?: number;
  spreadMultiplier?: number;
  heatPerShotMultiplier?: number;
  energyCostMultiplier?: number;
  shieldBreakMultiplier?: number;
}

export interface WeaponUpgradeDefinition {
  id: WeaponUpgradeId;
  weapon: WeaponType;
  title: string;
  slotLabel: string;
  summary: string;
  detail: string;
  cost: number;
  modifiers: WeaponUpgradeModifierSet;
}

export interface ContractEliteDefinition {
  phase: Extract<MissionPhase, 'hold-upload' | 'extract'>;
  type: Extract<EnemyType, 'captain'>;
  callsign: string;
  intro: string;
  bonusPayout: number;
}

export interface ContractBeatSpawnDefinition {
  type: EnemyType;
  position: Vector2;
  waveOffset?: number;
  heatOffset?: number;
}

export interface ContractOptionalObjectiveDefinition {
  id: string;
  title: string;
  shortLabel: string;
  detail: string;
  summary: string;
  rewardLabel: string;
  position: Vector2;
  radius: number;
  captureDuration: number;
  availablePhases: Extract<MissionPhase, 'reach-terminal' | 'hack-terminal'>[];
  bonusCredits: number;
  reputationBonus: number;
  completionStatus: string;
  completionSummary: string;
  skipStatus: string;
  skipSummary: string;
  ambushSpawns?: ContractBeatSpawnDefinition[];
}

export type ContractBeatTrigger =
  | {
      kind: 'phase-start';
    }
  | {
      kind: 'phase-elapsed';
      seconds: number;
    }
  | {
      kind: 'phase-progress';
      progress: number;
    };

export interface ContractBeatDefinition {
  id: string;
  phase: Extract<MissionPhase, 'reach-terminal' | 'hack-terminal' | 'hold-upload' | 'extract'>;
  trigger: ContractBeatTrigger;
  status: string;
  summary: string;
  spawns: ContractBeatSpawnDefinition[];
}

export interface ContractHazardDefinition {
  id: string;
  phase: Extract<MissionPhase, 'hack-terminal' | 'hold-upload' | 'extract'>;
  trigger: ContractBeatTrigger;
  kind: HazardKind;
  label: string;
  status: string;
  summary: string;
  position: Vector2;
  radius: number;
  duration: number;
  damagePerSecond: number;
  affectsEnemies?: boolean;
  color: string;
}

export interface HazardState {
  id: string;
  kind: HazardKind;
  label: string;
  status: string;
  summary: string;
  position: Vector2;
  radius: number;
  remaining: number;
  maxDuration: number;
  damagePerSecond: number;
  affectsEnemies: boolean;
  color: string;
}

export interface ContractDefinition {
  id: ContractId;
  title: string;
  missionType: string;
  client: string;
  clientFaction: FactionKey;
  hostileFaction: FactionKey;
  zone: string;
  districtName: string;
  threatLabel: string;
  briefing: string;
  routeNotes: string;
  featuredLabel?: string;
  unlockVictories: number;
  basePayout: number;
  reputationOnSuccess: number;
  hostileHeatOnSuccess: number;
  hostileHeatOnFailure: number;
  startingPosition: Vector2;
  terminalPoint: Vector2;
  terminalRadius: number;
  terminalLabel: string;
  breachLabel: string;
  uploadLabel: string;
  terminalCaptureDuration: number;
  extractionPoint: Vector2;
  extractionRadius: number;
  extractionLabel: string;
  extractionHoldDuration: number;
  initialMission: MissionState;
  reconSummary: string;
  objectives: string[];
  uploadDuration: number;
  extractionDuration: number;
  spawnRateMultiplier: number;
  activeCaps: Partial<Record<MissionPhase, number>>;
  enemyPacks: Partial<Record<MissionPhase, EnemyType[]>>;
  elite?: ContractEliteDefinition;
  optionalObjective?: ContractOptionalObjectiveDefinition;
  authoredBeats?: ContractBeatDefinition[];
  hazards?: ContractHazardDefinition[];
  victorySummary?: string;
  failureSummary?: string;
}

export interface RunConfig {
  contract: ContractDefinition;
  cyberware: CyberwareDefinition;
  hostileHeat: number;
  ownedWeaponUpgrades: WeaponUpgradeId[];
}

export interface FactionStanding {
  reputation: number;
  heat: number;
}

export interface CampaignRunResult {
  contractId: ContractId;
  contractTitle: string;
  victory: boolean;
  timestamp: string;
  runtimeSeconds: number;
  kills: number;
  score: number;
  stageLabel: string;
  scavengedCredits: number;
  payoutCredits: number;
  totalCreditsAwarded: number;
  bankCredits: number;
  reputationDelta: number;
  hostileHeatDelta: number;
  clientFaction: FactionKey;
  hostileFaction: FactionKey;
  eliteDefeated: boolean;
  optionalObjectiveCompleted: boolean;
  optionalObjectiveLabel: string | null;
  optionalObjectiveRewardCredits: number;
  optionalObjectiveReputationBonus: number;
  unlocks: CyberwareId[];
  contractUnlocks: ContractId[];
}

export interface CampaignState {
  bankCredits: number;
  runs: number;
  victories: number;
  highestScore: number;
  lastSavedAt: string | null;
  completedContracts: ContractId[];
  ownedWeaponUpgrades: WeaponUpgradeId[];
  selectedContractId: ContractId;
  selectedWeapon: WeaponType;
  selectedCyberwareId: CyberwareId;
  factions: Record<FactionKey, FactionStanding>;
  lastResult: CampaignRunResult | null;
}

export interface TutorialState {
  step: number;
  totalSteps: number;
  title: string;
  body: string;
  progress: number;
  status: string;
  completed: boolean;
}

export interface SimInput {
  moveX: number;
  moveY: number;
  aimWorld: Vector2;
  firing: boolean;
  dashPressed: boolean;
  swapPrevPressed: boolean;
  swapNextPressed: boolean;
}

export interface GameState {
  districtName: string;
  contractId: ContractId;
  contractTitle: string;
  contractClient: string;
  contractZone: string;
  contractThreat: string;
  player: PlayerState;
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  pickups: PickupState[];
  activeHazards: HazardState[];
  obstacles: ArenaObstacle[];
  score: number;
  credits: number;
  kills: number;
  wave: number;
  waveProgress: number;
  threatLevel: number;
  timeSeconds: number;
  mission: MissionState;
  objectivePhase: MissionPhase;
  terminalPoint: Vector2;
  terminalRadius: number;
  terminalProgress: number;
  optionalObjectiveLabel: string | null;
  optionalObjectiveState: 'hidden' | 'available' | 'completed' | 'skipped';
  optionalObjectivePoint: Vector2 | null;
  optionalObjectiveRadius: number;
  optionalObjectiveProgress: number;
  optionalObjectiveRewardCredits: number;
  optionalObjectiveReputationBonus: number;
  optionalObjectiveStatusText: string | null;
  optionalObjectiveSummary: string | null;
  extractionPoint: Vector2;
  extractionRadius: number;
  uploadTimeRemaining: number;
  uploadDuration: number;
  extractionProgress: number;
  extractionTimeRemaining: number;
  extractionDuration: number;
  eliteCallsign: string | null;
  eliteActive: boolean;
  eliteDefeated: boolean;
  eliteHealth: number;
  eliteMaxHealth: number;
  playerInCover: boolean;
  districtStatus: string;
  districtSummary: string;
  combatActive: boolean;
  gameOver: boolean;
  victory: boolean;
  contractResolved: boolean;
}

export interface HudSnapshot {
  districtName: string;
  contractId: ContractId;
  contractTitle: string;
  contractClient: string;
  contractZone: string;
  contractThreat: string;
  mission: MissionState;
  tutorial: TutorialState;
  objectivePhase: MissionPhase;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  weaponHeat: number;
  overheated: boolean;
  weaponName: string;
  weaponDetail: string;
  weaponUpgradeTitle: string | null;
  weaponUpgradeDetail: string | null;
  score: number;
  credits: number;
  kills: number;
  wave: number;
  waveProgress: number;
  threatLevel: number;
  districtStatus: string;
  districtSummary: string;
  timeSeconds: number;
  enemyCount: number;
  terminalPoint: Vector2;
  terminalRadius: number;
  terminalProgress: number;
  optionalObjectiveLabel: string | null;
  optionalObjectiveState: 'hidden' | 'available' | 'completed' | 'skipped';
  optionalObjectivePoint: Vector2 | null;
  optionalObjectiveRadius: number;
  optionalObjectiveProgress: number;
  optionalObjectiveRewardCredits: number;
  optionalObjectiveReputationBonus: number;
  optionalObjectiveStatusText: string | null;
  optionalObjectiveSummary: string | null;
  extractionPoint: Vector2;
  extractionRadius: number;
  uploadTimeRemaining: number;
  uploadDuration: number;
  extractionProgress: number;
  extractionTimeRemaining: number;
  extractionDuration: number;
  eliteCallsign: string | null;
  eliteActive: boolean;
  eliteDefeated: boolean;
  eliteHealth: number;
  eliteMaxHealth: number;
  activeHazardCount: number;
  activeHazardLabel: string | null;
  activeHazardSummary: string | null;
  playerInCover: boolean;
  combatActive: boolean;
  gameOver: boolean;
  victory: boolean;
  contractResolved: boolean;
}

export type SimulationEvent =
  | {
      type: 'shot-fired';
      weapon: WeaponType;
      origin: Vector2;
      direction: Vector2;
    }
  | {
      type: 'dash';
      origin: Vector2;
      destination: Vector2;
    }
  | {
      type: 'weapon-swapped';
      weapon: WeaponType;
    }
  | {
      type: 'pickup';
      pickupType: PickupType;
      amount: number;
      position: Vector2;
    }
  | {
      type: 'enemy-killed';
      enemyType: EnemyType;
      position: Vector2;
    }
  | {
      type: 'player-hit';
      usedShield: boolean;
    }
  | {
      type: 'shield-contact';
      shieldBroken: boolean;
      position: Vector2;
    }
  | {
      type: 'sweep-activated';
    }
  | {
      type: 'overheat';
    }
  | {
      type: 'game-over';
    }
  | {
      type: 'mission-success';
    }
  | {
      type: 'elite-spawned';
      callsign: string;
    }
  | {
      type: 'extraction-window';
      duration: number;
    }
  | {
      type: 'hazard-triggered';
      kind: HazardKind;
      label: string;
      position: Vector2;
    }
  | {
      type: 'tutorial-step';
      title: string;
      step: number;
      totalSteps: number;
    };

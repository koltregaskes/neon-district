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

export type EnemyType = 'runner' | 'gunner' | 'brute';

export interface EnemyState {
  id: number;
  type: EnemyType;
  position: Vector2;
  velocity: Vector2;
  health: number;
  maxHealth: number;
  radius: number;
  speed: number;
  damage: number;
  contactCooldown: number;
  glow: string;
}

export interface ProjectileState {
  id: number;
  position: Vector2;
  velocity: Vector2;
  damage: number;
  life: number;
  color: string;
  width: number;
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
  player: PlayerState;
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  pickups: PickupState[];
  obstacles: ArenaObstacle[];
  score: number;
  credits: number;
  kills: number;
  wave: number;
  waveProgress: number;
  threatLevel: number;
  timeSeconds: number;
  mission: MissionState;
  districtStatus: string;
  districtSummary: string;
  combatActive: boolean;
  gameOver: boolean;
}

export interface HudSnapshot {
  districtName: string;
  mission: MissionState;
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
  combatActive: boolean;
  gameOver: boolean;
}

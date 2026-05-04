import {
  DISTRICT_OBSTACLES,
  ISO_HALF_HEIGHT,
  ISO_HALF_WIDTH,
  NeonDistrictSimulation,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../simulation';
import type { ArenaObstacle, EnemyState, HazardState, PickupState, SimulationEvent, Vector2 } from '../types';

type HudDispatch = (snapshot: ReturnType<NeonDistrictSimulation['createHudSnapshot']>) => void;
type EventDispatch = (events: SimulationEvent[]) => void;
type FxBurst = {
  position: Vector2;
  color: number;
  radius: number;
  life: number;
  maxLife: number;
};

type KeyMap = {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  SHIFT: Phaser.Input.Keyboard.Key;
  SPACE: Phaser.Input.Keyboard.Key;
  Q: Phaser.Input.Keyboard.Key;
  E: Phaser.Input.Keyboard.Key;
  R: Phaser.Input.Keyboard.Key;
};

const SORTED_DISTRICT_OBSTACLES = [...DISTRICT_OBSTACLES].sort((a, b) => a.y - b.y);

const ATMOSPHERE_FOG_BANKS = [
  { x: 300, y: 260, radiusX: 460, radiusY: 180, color: 0x2af1ff, alpha: 0.05 },
  { x: 1930, y: 340, radiusX: 420, radiusY: 150, color: 0xff5dc9, alpha: 0.05 },
  { x: 1350, y: 1320, radiusX: 520, radiusY: 220, color: 0x74ffcf, alpha: 0.045 },
];

const SKYLINE_MARKERS = [
  { x: 120, y: 180, width: 90, height: 240, color: 0x16314b },
  { x: 440, y: 120, width: 110, height: 320, color: 0x13283e },
  { x: 2060, y: 180, width: 120, height: 280, color: 0x1a2741 },
  { x: 2280, y: 320, width: 100, height: 240, color: 0x18263d },
];

const LANE_FEATURES = [
  { x: 980, y: 1040, width: 920, height: 120, color: 0x0c1525 },
  { x: 1120, y: 680, width: 880, height: 84, color: 0x101a2b },
  { x: 760, y: 860, width: 420, height: 86, color: 0x0b1221 },
];

const BEACON_POINTS = [
  { x: 920, y: 730, color: 0xff9b59 },
  { x: 990, y: 770, color: 0x72ffd6 },
  { x: 1065, y: 720, color: 0xff6bd8 },
  { x: 1650, y: 520, color: 0xffce6a },
  { x: 690, y: 1260, color: 0x6db8ff },
];

export class GameScene extends Phaser.Scene {
  private readonly simulation: NeonDistrictSimulation;
  private readonly dispatchHud: HudDispatch;
  private readonly dispatchEvents: EventDispatch;
  private graphics!: Phaser.GameObjects.Graphics;
  private gameOverTitle!: Phaser.GameObjects.Text;
  private gameOverBody!: Phaser.GameObjects.Text;
  private keys!: KeyMap;
  private lastDashDown = false;
  private lastRestartDown = false;
  private lastSwapPrevDown = false;
  private lastSwapNextDown = false;
  private lastHudUpdate = 0;
  private trauma = 0;
  private fxBursts: FxBurst[] = [];

  constructor(simulation: NeonDistrictSimulation, dispatchHud: HudDispatch, dispatchEvents: EventDispatch) {
    super('district-run');
    this.simulation = simulation;
    this.dispatchHud = dispatchHud;
    this.dispatchEvents = dispatchEvents;
  }

  create() {
    this.graphics = this.add.graphics();
    this.gameOverTitle = this.add.text(0, 0, 'RUN FLATLINED', {
      fontFamily: '"Bahnschrift", "Segoe UI", sans-serif',
      fontSize: '34px',
      color: '#f6fbff',
      fontStyle: '700',
    }).setDepth(10).setVisible(false);
    this.gameOverBody = this.add.text(0, 0, 'Press R or use Reboot Run to drop back into the district.', {
      fontFamily: '"Bahnschrift", "Segoe UI", sans-serif',
      fontSize: '16px',
      color: '#9fb4c9',
      wordWrap: { width: 440 },
    }).setDepth(10).setVisible(false);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SHIFT,SPACE,Q,E,R') as KeyMap;
    this.input.mouse?.disableContextMenu();
    this.scale.on('resize', () => this.renderScene(), this);
    this.renderScene();
    this.dispatchHud(this.simulation.createHudSnapshot());
  }

  update(time: number, delta: number) {
    const pointer = this.input.activePointer;
    const state = this.simulation.getState();
    const screenCenterX = this.scale.width * 0.5;
    const screenCenterY = this.scale.height * 0.57;
    const playerScreen = this.projectPoint(state.player.position, screenCenterX, screenCenterY, state.player.position);
    const aimWorld = this.screenToWorld(pointer.x, pointer.y, screenCenterX - playerScreen.x, screenCenterY - playerScreen.y);

    const moveX = (this.keys.D.isDown ? 1 : 0) - (this.keys.A.isDown ? 1 : 0);
    const moveY = (this.keys.S.isDown ? 1 : 0) - (this.keys.W.isDown ? 1 : 0);
    const dashDown = this.keys.SHIFT.isDown || this.keys.SPACE.isDown;
    const restartDown = this.keys.R.isDown;
    const swapPrevDown = this.keys.Q.isDown;
    const swapNextDown = this.keys.E.isDown;

    if (restartDown && !this.lastRestartDown && state.contractResolved) {
      this.simulation.restart();
    }

    this.simulation.setInput({
      moveX,
      moveY,
      aimWorld,
      firing: pointer.isDown && pointer.leftButtonDown(),
      dashPressed: dashDown && !this.lastDashDown,
      swapPrevPressed: swapPrevDown && !this.lastSwapPrevDown,
      swapNextPressed: swapNextDown && !this.lastSwapNextDown,
    });
    this.simulation.step(Math.min(delta / 1000, 0.05));
    this.handleEvents(this.simulation.consumeEvents());
    this.trauma = Math.max(0, this.trauma - (delta / 1000) * 1.8);
    for (let index = this.fxBursts.length - 1; index >= 0; index -= 1) {
      const burst = this.fxBursts[index];
      burst.life -= delta / 1000;
      if (burst.life <= 0) {
        this.fxBursts.splice(index, 1);
      }
    }

    this.lastDashDown = dashDown;
    this.lastRestartDown = restartDown;
    this.lastSwapPrevDown = swapPrevDown;
    this.lastSwapNextDown = swapNextDown;

    this.renderScene();

    if (time - this.lastHudUpdate > 50) {
      this.dispatchHud(this.simulation.createHudSnapshot());
      this.lastHudUpdate = time;
    }
  }

  private projectPoint(position: Vector2, anchorX: number, anchorY: number, cameraTarget: Vector2, elevation = 0) {
    const offsetX = anchorX - (cameraTarget.x - cameraTarget.y) * ISO_HALF_WIDTH;
    const offsetY = anchorY - (cameraTarget.x + cameraTarget.y) * ISO_HALF_HEIGHT;
    return {
      x: offsetX + (position.x - position.y) * ISO_HALF_WIDTH,
      y: offsetY + (position.x + position.y) * ISO_HALF_HEIGHT - elevation,
    };
  }

  private screenToWorld(screenX: number, screenY: number, offsetX: number, offsetY: number): Vector2 {
    const translatedX = screenX - offsetX;
    const translatedY = screenY - offsetY;
    return {
      x: (translatedX / ISO_HALF_WIDTH + translatedY / ISO_HALF_HEIGHT) * 0.5,
      y: (translatedY / ISO_HALF_HEIGHT - translatedX / ISO_HALF_WIDTH) * 0.5,
    };
  }

  private drawDiamond(center: Vector2, width: number, height: number, fillColor: number, alpha: number, lineColor?: number, lineAlpha = 0.35) {
    const halfW = width / 2;
    const halfH = height / 2;
    this.graphics.fillStyle(fillColor, alpha);
    this.graphics.beginPath();
    this.graphics.moveTo(center.x, center.y - halfH);
    this.graphics.lineTo(center.x + halfW, center.y);
    this.graphics.lineTo(center.x, center.y + halfH);
    this.graphics.lineTo(center.x - halfW, center.y);
    this.graphics.closePath();
    this.graphics.fillPath();
    if (lineColor !== undefined) {
      this.graphics.lineStyle(1, lineColor, lineAlpha);
      this.graphics.strokePath();
    }
  }

  private toScreenDirection(vector: Vector2) {
    const projected = {
      x: (vector.x - vector.y) * ISO_HALF_WIDTH,
      y: (vector.x + vector.y) * ISO_HALF_HEIGHT,
    };
    const magnitude = Math.hypot(projected.x, projected.y) || 1;
    return {
      x: projected.x / magnitude,
      y: projected.y / magnitude,
    };
  }

  private drawPrism(obstacle: ArenaObstacle, anchorX: number, anchorY: number, cameraTarget: Vector2) {
    const halfW = obstacle.width / 2;
    const halfD = obstacle.depth / 2;
    const baseNE = this.projectPoint({ x: obstacle.x + halfW, y: obstacle.y - halfD }, anchorX, anchorY, cameraTarget);
    const baseSE = this.projectPoint({ x: obstacle.x + halfW, y: obstacle.y + halfD }, anchorX, anchorY, cameraTarget);
    const baseSW = this.projectPoint({ x: obstacle.x - halfW, y: obstacle.y + halfD }, anchorX, anchorY, cameraTarget);
    const topNW = this.projectPoint({ x: obstacle.x - halfW, y: obstacle.y - halfD }, anchorX, anchorY, cameraTarget, obstacle.height);
    const topNE = this.projectPoint({ x: obstacle.x + halfW, y: obstacle.y - halfD }, anchorX, anchorY, cameraTarget, obstacle.height);
    const topSE = this.projectPoint({ x: obstacle.x + halfW, y: obstacle.y + halfD }, anchorX, anchorY, cameraTarget, obstacle.height);
    const topSW = this.projectPoint({ x: obstacle.x - halfW, y: obstacle.y + halfD }, anchorX, anchorY, cameraTarget, obstacle.height);

    const fill = Phaser.Display.Color.HexStringToColor(obstacle.fill).color;
    const glow = Phaser.Display.Color.HexStringToColor(obstacle.glow).color;

    this.graphics.fillStyle(fill, 0.95);
    this.graphics.beginPath();
    this.graphics.moveTo(baseSW.x, baseSW.y);
    this.graphics.lineTo(baseSE.x, baseSE.y);
    this.graphics.lineTo(topSE.x, topSE.y);
    this.graphics.lineTo(topSW.x, topSW.y);
    this.graphics.closePath();
    this.graphics.fillPath();

    this.graphics.fillStyle(fill, 0.82);
    this.graphics.beginPath();
    this.graphics.moveTo(baseNE.x, baseNE.y);
    this.graphics.lineTo(baseSE.x, baseSE.y);
    this.graphics.lineTo(topSE.x, topSE.y);
    this.graphics.lineTo(topNE.x, topNE.y);
    this.graphics.closePath();
    this.graphics.fillPath();

    this.graphics.fillStyle(glow, 0.15);
    this.graphics.beginPath();
    this.graphics.moveTo(topNW.x, topNW.y);
    this.graphics.lineTo(topNE.x, topNE.y);
    this.graphics.lineTo(topSE.x, topSE.y);
    this.graphics.lineTo(topSW.x, topSW.y);
    this.graphics.closePath();
    this.graphics.fillPath();

    this.graphics.lineStyle(2, glow, 0.8);
    this.graphics.beginPath();
    this.graphics.moveTo(topNW.x, topNW.y);
    this.graphics.lineTo(topNE.x, topNE.y);
    this.graphics.lineTo(topSE.x, topSE.y);
    this.graphics.lineTo(topSW.x, topSW.y);
    this.graphics.closePath();
    this.graphics.strokePath();

    const windowCount = Math.max(2, Math.floor(obstacle.height / 28));
    this.graphics.lineStyle(2, glow, 0.22);
    for (let index = 0; index < windowCount; index += 1) {
      const t = (index + 1) / (windowCount + 1);
      const leftX = Phaser.Math.Linear(baseSW.x, topSW.x, t);
      const leftY = Phaser.Math.Linear(baseSW.y, topSW.y, t);
      const rightX = Phaser.Math.Linear(baseSE.x, topSE.x, t);
      const rightY = Phaser.Math.Linear(baseSE.y, topSE.y, t);
      this.graphics.beginPath();
      this.graphics.moveTo(leftX + 12, leftY);
      this.graphics.lineTo(rightX - 12, rightY);
      this.graphics.strokePath();
    }

    if (obstacle.height >= 80) {
      const signPoint = this.projectPoint({ x: obstacle.x, y: obstacle.y }, anchorX, anchorY, cameraTarget, obstacle.height + 26);
      this.graphics.fillStyle(0x03070d, 0.78);
      this.graphics.fillRoundedRect(signPoint.x - 44, signPoint.y - 10, 88, 22, 8);
      this.graphics.lineStyle(1, glow, 0.8);
      this.graphics.strokeRoundedRect(signPoint.x - 44, signPoint.y - 10, 88, 22, 8);
      this.graphics.lineStyle(1, glow, 0.45);
      this.graphics.beginPath();
      this.graphics.moveTo(signPoint.x - 32, signPoint.y + 1);
      this.graphics.lineTo(signPoint.x + 32, signPoint.y + 1);
      this.graphics.strokePath();
    }
  }

  private drawEnemy(enemy: EnemyState, anchorX: number, anchorY: number, cameraTarget: Vector2) {
    const base = this.projectPoint(enemy.position, anchorX, anchorY, cameraTarget);
    const bodyColor = Phaser.Display.Color.HexStringToColor(enemy.glow).color;
    const bodyY = base.y - (enemy.type === 'brute' ? 26 : enemy.type === 'shield' ? 22 : enemy.type === 'captain' ? 28 : 18);
    const screenFacing = this.toScreenDirection(enemy.facing);
    this.graphics.fillStyle(0x02050d, 0.42);
    this.graphics.fillEllipse(base.x, base.y + 12, enemy.radius * 1.2, enemy.radius * 0.7);

    this.graphics.fillStyle(bodyColor, enemy.type === 'brute' ? 0.9 : 0.82);
    this.graphics.lineStyle(2, 0xffffff, 0.08);
    this.graphics.fillEllipse(base.x, bodyY, enemy.radius * 1.05, enemy.radius * (enemy.type === 'brute' ? 1.65 : 1.35));

    this.graphics.lineStyle(2, bodyColor, 0.8);
    this.graphics.strokeEllipse(base.x, bodyY, enemy.radius * 1.05, enemy.radius * (enemy.type === 'brute' ? 1.65 : 1.35));

    if (enemy.type === 'runner') {
      this.graphics.lineStyle(2, bodyColor, 0.55);
      this.graphics.beginPath();
      this.graphics.moveTo(base.x - screenFacing.x * 14, bodyY + 6 - screenFacing.y * 10);
      this.graphics.lineTo(base.x - screenFacing.x * 28 + screenFacing.y * 8, bodyY + 10 - screenFacing.y * 18);
      this.graphics.moveTo(base.x - screenFacing.x * 10, bodyY - 2 - screenFacing.y * 8);
      this.graphics.lineTo(base.x - screenFacing.x * 22 - screenFacing.y * 6, bodyY - 10 - screenFacing.y * 14);
      this.graphics.strokePath();
    } else if (enemy.type === 'gunner') {
      this.graphics.fillStyle(0x08131d, 0.9);
      this.graphics.fillRoundedRect(base.x - 16, bodyY - 10, 32, 10, 4);
      this.graphics.lineStyle(2, bodyColor, 0.8);
      this.graphics.beginPath();
      this.graphics.moveTo(base.x - 18, bodyY);
      this.graphics.lineTo(base.x - 30, bodyY + 8);
      this.graphics.moveTo(base.x + 18, bodyY);
      this.graphics.lineTo(base.x + 30, bodyY + 8);
      this.graphics.strokePath();
    } else if (enemy.type === 'sniper') {
      this.graphics.lineStyle(3, 0xfff0ae, 0.9);
      this.graphics.beginPath();
      this.graphics.moveTo(base.x, bodyY - enemy.radius * 0.75);
      this.graphics.lineTo(base.x + screenFacing.x * 26, bodyY - enemy.radius * 0.85 + screenFacing.y * 10);
      this.graphics.strokePath();
      this.graphics.fillStyle(0xfff0ae, 0.82);
      this.graphics.fillCircle(base.x + screenFacing.x * 10, bodyY - enemy.radius * 0.6 + screenFacing.y * 5, 3);
    } else if (enemy.type === 'shield') {
      const shieldX = base.x + screenFacing.x * 18;
      const shieldY = bodyY + screenFacing.y * 10;
      this.graphics.fillStyle(0x081924, 0.92);
      this.graphics.fillEllipse(shieldX, shieldY, 22, 36);
      this.graphics.lineStyle(2, 0x9dffd2, 0.78);
      this.graphics.strokeEllipse(shieldX, shieldY, 22, 36);
      this.graphics.lineStyle(2, bodyColor, 0.42);
      this.graphics.beginPath();
      this.graphics.moveTo(shieldX - screenFacing.y * 10, shieldY + screenFacing.x * 10);
      this.graphics.lineTo(shieldX + screenFacing.y * 10, shieldY - screenFacing.x * 10);
      this.graphics.strokePath();
    } else if (enemy.type === 'brute') {
      this.graphics.fillStyle(0xffc18f, 0.16);
      this.graphics.fillEllipse(base.x, bodyY, enemy.radius * 1.5, enemy.radius * 2);
    } else if (enemy.type === 'captain') {
      this.graphics.fillStyle(0xffbfd0, 0.16);
      this.graphics.fillEllipse(base.x, bodyY, enemy.radius * 1.8, enemy.radius * 2.2);
      this.graphics.lineStyle(3, 0xffbfd0, 0.75);
      this.graphics.beginPath();
      this.graphics.moveTo(base.x - 22, bodyY - 18);
      this.graphics.lineTo(base.x + 22, bodyY - 18);
      this.graphics.moveTo(base.x - 28, bodyY + 8);
      this.graphics.lineTo(base.x + 28, bodyY + 8);
      this.graphics.strokePath();
      this.graphics.fillStyle(0x091421, 0.92);
      this.graphics.fillEllipse(base.x + screenFacing.x * 20, bodyY + screenFacing.y * 10, 24, 36);
      this.graphics.lineStyle(2, 0xff97b4, 0.86);
      this.graphics.strokeEllipse(base.x + screenFacing.x * 20, bodyY + screenFacing.y * 10, 24, 36);
    }

    const healthWidth = enemy.radius * 1.6;
    this.graphics.fillStyle(0x05101a, 0.9);
    this.graphics.fillRect(base.x - healthWidth / 2, base.y - enemy.radius * 2.2, healthWidth, 5);
    this.graphics.fillStyle(bodyColor, 0.9);
    this.graphics.fillRect(base.x - healthWidth / 2, base.y - enemy.radius * 2.2, healthWidth * (enemy.health / enemy.maxHealth), 5);
  }

  private drawPlayer(anchorX: number, anchorY: number, cameraTarget: Vector2) {
    const state = this.simulation.getState();
    const player = state.player;
    const base = this.projectPoint(player.position, anchorX, anchorY, cameraTarget);
    const aim = player.facing;

    this.graphics.fillStyle(0x03111a, 0.45);
    this.graphics.fillEllipse(base.x, base.y + 14, 52, 24);

    this.graphics.fillStyle(0x24f0ff, 0.95);
    this.graphics.fillEllipse(base.x, base.y - 18, 46, 62);
    this.graphics.lineStyle(2, 0xb5fdff, 0.7);
    this.graphics.strokeEllipse(base.x, base.y - 18, 46, 62);

    if (state.playerInCover) {
      this.graphics.lineStyle(3, 0x7affb8, 0.64);
      this.graphics.strokeEllipse(base.x, base.y - 8, 62, 78);
    }

    const muzzleX = base.x + aim.x * 18;
    const muzzleY = base.y - 20 + aim.y * 10;
    const weaponColor = player.currentWeapon === 'scatter'
      ? 0xffd166
      : player.currentWeapon === 'rail'
        ? 0x5ef7ff
        : 0xff67cf;
    this.graphics.lineStyle(player.currentWeapon === 'rail' ? 6 : 5, weaponColor, player.overheated ? 0.25 : 0.88);
    this.graphics.beginPath();
    this.graphics.moveTo(base.x, base.y - 16);
    this.graphics.lineTo(muzzleX, muzzleY);
    this.graphics.strokePath();
  }

  private drawPickup(pickup: PickupState, anchorX: number, anchorY: number, cameraTarget: Vector2, timeSeconds: number) {
    const bob = Math.sin(timeSeconds * 4 + pickup.id) * 10 + 28;
    const point = this.projectPoint(pickup.position, anchorX, anchorY, cameraTarget, bob);
    const fill = pickup.type === 'credits' ? 0xffcc66 : pickup.type === 'energy' ? 0x5ef7ff : 0x86ff9d;
    this.drawDiamond(point, 24, 18, fill, 0.9, 0xffffff, 0.18);
  }

  private addFxBurst(position: Vector2, color: number, radius: number, life = 0.45) {
    this.fxBursts.push({
      position: { ...position },
      color,
      radius,
      life,
      maxLife: life,
    });
  }

  private handleEvents(events: SimulationEvent[]) {
    events.forEach((event) => {
      if (event.type === 'enemy-killed') {
        const color = event.enemyType === 'captain'
          ? 0xff5d8c
          : event.enemyType === 'brute'
            ? 0xff8c52
            : event.enemyType === 'gunner'
              ? 0xff68d6
              : 0x34f1ff;
        this.addFxBurst(event.position, color, event.enemyType === 'captain' ? 72 : event.enemyType === 'brute' ? 58 : 36, 0.42);
        this.trauma = Math.max(this.trauma, event.enemyType === 'captain' ? 0.38 : event.enemyType === 'brute' ? 0.3 : 0.16);
      } else if (event.type === 'pickup') {
        const color = event.pickupType === 'credits' ? 0xffd36b : event.pickupType === 'energy' ? 0x61f8ff : 0x8dffaf;
        this.addFxBurst(event.position, color, 24, 0.28);
      } else if (event.type === 'dash') {
        this.addFxBurst(event.origin, 0x36f3ff, 26, 0.2);
        this.addFxBurst(event.destination, 0x36f3ff, 44, 0.28);
        this.trauma = Math.max(this.trauma, 0.12);
      } else if (event.type === 'shot-fired' && event.weapon === 'rail') {
        this.addFxBurst(event.origin, 0x5ef7ff, 18, 0.16);
        this.trauma = Math.max(this.trauma, 0.08);
      } else if (event.type === 'player-hit') {
        this.trauma = Math.max(this.trauma, event.usedShield ? 0.22 : 0.42);
      } else if (event.type === 'hazard-triggered') {
        const color = event.kind === 'blackout'
          ? 0xbdb7ff
          : event.kind === 'corrosive'
            ? 0x9dff7a
            : 0x4cefff;
        this.addFxBurst(event.position, color, event.kind === 'blackout' ? 56 : 44, 0.38);
        this.trauma = Math.max(this.trauma, 0.2);
      } else if (event.type === 'overheat') {
        this.trauma = Math.max(this.trauma, 0.18);
      } else if (event.type === 'game-over') {
        this.trauma = Math.max(this.trauma, 0.5);
      } else if (event.type === 'mission-success') {
        this.addFxBurst(this.simulation.getState().extractionPoint, 0x7affb8, 68, 0.72);
        this.trauma = Math.max(this.trauma, 0.22);
      } else if (event.type === 'elite-spawned') {
        this.trauma = Math.max(this.trauma, 0.32);
      }
    });

    if (events.length > 0) {
      this.dispatchEvents(events);
    }
  }

  private drawAtmosphere(anchorX: number, anchorY: number, cameraTarget: Vector2, timeSeconds: number) {
    ATMOSPHERE_FOG_BANKS.forEach((bank, index) => {
      const point = this.projectPoint(
        { x: bank.x + Math.sin(timeSeconds * 0.22 + index) * 24, y: bank.y + Math.cos(timeSeconds * 0.18 + index) * 18 },
        anchorX,
        anchorY,
        cameraTarget,
      );
      this.graphics.fillStyle(bank.color, bank.alpha + Math.sin(timeSeconds * 0.45 + index) * 0.01);
      this.graphics.fillEllipse(point.x, point.y, bank.radiusX, bank.radiusY);
    });

    SKYLINE_MARKERS.forEach((marker, index) => {
      const point = this.projectPoint({ x: marker.x, y: marker.y }, anchorX, anchorY, cameraTarget, marker.height);
      this.graphics.fillStyle(marker.color, 0.42);
      this.graphics.fillRoundedRect(point.x - marker.width / 2, point.y, marker.width, marker.height, 18);
      this.graphics.fillStyle(index % 2 === 0 ? 0x30eeff : 0xff76d8, 0.14);
      this.graphics.fillRect(point.x - marker.width / 3, point.y + 28, marker.width / 1.5, marker.height - 58);
    });

    this.graphics.lineStyle(1, 0x7ceaff, 0.18);
    for (let index = 0; index < 34; index += 1) {
      const x = ((index * 72) + (timeSeconds * 180)) % (this.scale.width + 180);
      const y = (index * 39) % this.scale.height;
      this.graphics.beginPath();
      this.graphics.moveTo(x, y);
      this.graphics.lineTo(x - 26, y + 52);
      this.graphics.strokePath();
    }
  }

  private drawFxBursts(anchorX: number, anchorY: number, cameraTarget: Vector2) {
    this.fxBursts.forEach((burst) => {
      const point = this.projectPoint(burst.position, anchorX, anchorY, cameraTarget, 18);
      const alpha = burst.life / burst.maxLife;
      const radius = burst.radius * (1 + (1 - alpha) * 0.7);
      this.graphics.lineStyle(3, burst.color, alpha * 0.8);
      this.graphics.strokeEllipse(point.x, point.y, radius, radius * 0.65);
      this.graphics.fillStyle(burst.color, alpha * 0.08);
      this.graphics.fillEllipse(point.x, point.y, radius * 0.7, radius * 0.42);
    });
  }

  private drawObjectiveMarker(
    position: Vector2,
    anchorX: number,
    anchorY: number,
    cameraTarget: Vector2,
    color: number,
    radius: number,
    pulseSeed: number,
    active: boolean,
  ) {
    const pulse = 1 + Math.sin(this.simulation.getState().timeSeconds * 2.8 + pulseSeed) * (active ? 0.12 : 0.06);
    const base = this.projectPoint(position, anchorX, anchorY, cameraTarget, 10);
    const beacon = this.projectPoint(position, anchorX, anchorY, cameraTarget, active ? 76 : 56);
    this.graphics.lineStyle(2, color, active ? 0.45 : 0.22);
    this.graphics.beginPath();
    this.graphics.moveTo(base.x, base.y);
    this.graphics.lineTo(beacon.x, beacon.y + 12);
    this.graphics.strokePath();
    this.drawDiamond(beacon, active ? 34 : 26, active ? 22 : 18, color, active ? 0.5 : 0.28, color, active ? 0.88 : 0.46);
    this.graphics.lineStyle(2, color, active ? 0.42 : 0.2);
    this.graphics.strokeEllipse(base.x, base.y, radius * ISO_HALF_WIDTH * 1.05 * pulse, radius * ISO_HALF_HEIGHT * 1.55 * pulse);
    this.graphics.strokeEllipse(base.x, base.y, radius * ISO_HALF_WIDTH * 1.45 * pulse, radius * ISO_HALF_HEIGHT * 2.05 * pulse);
  }

  private drawHazardZone(hazard: HazardState, anchorX: number, anchorY: number, cameraTarget: Vector2) {
    const point = this.projectPoint(hazard.position, anchorX, anchorY, cameraTarget, 4);
    const color = Phaser.Display.Color.HexStringToColor(hazard.color).color;
    const pulse = 0.94 + Math.sin(statefulTime(this.simulation.getState().timeSeconds, hazard.id) * 4.2) * 0.08;
    const radiusX = hazard.radius * ISO_HALF_WIDTH * pulse;
    const radiusY = hazard.radius * ISO_HALF_HEIGHT * 1.55 * pulse;
    const lifeRatio = Phaser.Math.Clamp(hazard.remaining / Math.max(hazard.maxDuration, 0.001), 0, 1);
    const ringAlpha = 0.18 + (1 - lifeRatio) * 0.08;

    if (hazard.kind === 'blackout') {
      this.graphics.fillStyle(0x02040a, 0.34);
      this.graphics.fillEllipse(point.x, point.y, radiusX * 0.95, radiusY * 0.95);
    } else {
      this.graphics.fillStyle(color, 0.1);
      this.graphics.fillEllipse(point.x, point.y, radiusX * 0.9, radiusY * 0.9);
    }

    this.graphics.lineStyle(2, color, ringAlpha + 0.18);
    this.graphics.strokeEllipse(point.x, point.y, radiusX, radiusY);
    this.graphics.lineStyle(2, color, ringAlpha);
    this.graphics.strokeEllipse(point.x, point.y, radiusX * 0.72, radiusY * 0.72);

    const beacon = this.projectPoint(hazard.position, anchorX, anchorY, cameraTarget, 52);
    this.graphics.lineStyle(2, color, 0.28);
    this.graphics.beginPath();
    this.graphics.moveTo(point.x, point.y);
    this.graphics.lineTo(beacon.x, beacon.y + 10);
    this.graphics.strokePath();
    this.drawDiamond(beacon, 28, 18, color, 0.3, color, 0.7);
  }

  private renderScene() {
    const state = this.simulation.getState();
    const shake = this.trauma * this.trauma * 18;
    const anchorX = this.scale.width * 0.5 + Math.sin(state.timeSeconds * 83) * shake;
    const anchorY = this.scale.height * 0.57 + Math.cos(state.timeSeconds * 71) * shake;
    const cameraTarget = state.player.position;

    this.graphics.clear();
    this.gameOverTitle.setVisible(false);
    this.gameOverBody.setVisible(false);
    this.graphics.fillGradientStyle(0x040611, 0x040611, 0x090e1c, 0x090e1c, 1, 1, 1, 1);
    this.graphics.fillRect(0, 0, this.scale.width, this.scale.height);
    this.drawAtmosphere(anchorX, anchorY, cameraTarget, state.timeSeconds);

    const gridStartX = Math.floor((cameraTarget.x - 900) / 180) * 180;
    const gridEndX = Math.ceil((cameraTarget.x + 900) / 180) * 180;
    const gridStartY = Math.floor((cameraTarget.y - 900) / 180) * 180;
    const gridEndY = Math.ceil((cameraTarget.y + 900) / 180) * 180;

    for (let gx = gridStartX; gx <= gridEndX; gx += 180) {
      for (let gy = gridStartY; gy <= gridEndY; gy += 180) {
        if (gx < -180 || gy < -180 || gx > WORLD_WIDTH + 180 || gy > WORLD_HEIGHT + 180) continue;
        const tilePoint = this.projectPoint({ x: gx, y: gy }, anchorX, anchorY, cameraTarget);
        const pattern = ((gx / 180) + (gy / 180)) % 2 === 0;
        this.drawDiamond(tilePoint, 208, 104, pattern ? 0x0b1120 : 0x09101c, 0.76, pattern ? 0x16324a : 0x10263b, 0.25);
      }
    }

    LANE_FEATURES.forEach((lane) => {
      const lanePoint = this.projectPoint({ x: lane.x, y: lane.y }, anchorX, anchorY, cameraTarget);
      this.drawDiamond(lanePoint, lane.width * ISO_HALF_WIDTH, lane.height * ISO_HALF_HEIGHT, lane.color, 0.94, 0x244663, 0.34);
    });

    BEACON_POINTS.forEach((beacon) => {
      const base = this.projectPoint({ x: beacon.x, y: beacon.y }, anchorX, anchorY, cameraTarget, 28);
      this.graphics.fillStyle(beacon.color, 0.18);
      this.graphics.fillEllipse(base.x, base.y, 28, 18);
      this.graphics.lineStyle(2, beacon.color, 0.85);
      this.graphics.strokeEllipse(base.x, base.y, 18, 10);
    });

    SORTED_DISTRICT_OBSTACLES.forEach((obstacle) => this.drawPrism(obstacle, anchorX, anchorY, cameraTarget));

    const terminalActive = state.objectivePhase === 'reach-terminal' || state.objectivePhase === 'hack-terminal' || state.objectivePhase === 'hold-upload';
    const extractionActive = state.objectivePhase === 'extract' || state.victory;
    const optionalObjectiveVisible = Boolean(state.optionalObjectivePoint) && state.optionalObjectiveState !== 'hidden' && state.optionalObjectiveState !== 'skipped';
    const optionalObjectiveActive = state.optionalObjectiveState === 'available';
    this.drawObjectiveMarker(
      state.terminalPoint,
      anchorX,
      anchorY,
      cameraTarget,
      terminalActive ? 0x24f0ff : 0x1e6a83,
      state.terminalRadius,
      0,
      terminalActive,
    );
    this.drawObjectiveMarker(
      state.extractionPoint,
      anchorX,
      anchorY,
      cameraTarget,
      extractionActive ? 0x7affb8 : 0x2d6f54,
      state.extractionRadius,
      1.3,
      extractionActive,
    );
    if (optionalObjectiveVisible && state.optionalObjectivePoint) {
      this.drawObjectiveMarker(
        state.optionalObjectivePoint,
        anchorX,
        anchorY,
        cameraTarget,
        optionalObjectiveActive ? 0xffc96a : 0x7d5d28,
        state.optionalObjectiveRadius,
        2.1,
        optionalObjectiveActive,
      );
    }

    state.activeHazards.forEach((hazard) => this.drawHazardZone(hazard, anchorX, anchorY, cameraTarget));

    this.drawFxBursts(anchorX, anchorY, cameraTarget);

    state.pickups
      .slice()
      .sort((a, b) => a.position.y - b.position.y)
      .forEach((pickup) => this.drawPickup(pickup, anchorX, anchorY, cameraTarget, state.timeSeconds));

    state.enemies
      .slice()
      .sort((a, b) => a.position.y - b.position.y)
      .forEach((enemy) => this.drawEnemy(enemy, anchorX, anchorY, cameraTarget));

    this.drawPlayer(anchorX, anchorY, cameraTarget);

    state.projectiles.forEach((projectile) => {
      const start = this.projectPoint(projectile.position, anchorX, anchorY, cameraTarget, 18);
      const end = this.projectPoint(
        { x: projectile.position.x - projectile.velocity.x * 0.012, y: projectile.position.y - projectile.velocity.y * 0.012 },
        anchorX,
        anchorY,
        cameraTarget,
        18,
      );
      this.graphics.lineStyle(projectile.width, Phaser.Display.Color.HexStringToColor(projectile.color).color, 0.82);
      this.graphics.beginPath();
      this.graphics.moveTo(start.x, start.y);
      this.graphics.lineTo(end.x, end.y);
      this.graphics.strokePath();
    });

    if (state.gameOver || state.victory) {
      this.graphics.fillStyle(0x02040a, 0.62);
      this.graphics.fillRect(0, 0, this.scale.width, this.scale.height);
      const panelWidth = Math.min(this.scale.width - 80, 520);
      const panelHeight = 180;
      const panelX = (this.scale.width - panelWidth) / 2;
      const panelY = (this.scale.height - panelHeight) / 2;
      this.graphics.fillStyle(0x09101a, 0.92);
      this.graphics.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 18);
      this.graphics.lineStyle(2, state.victory ? 0x7affb8 : 0xff5c7f, 0.8);
      this.graphics.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 18);
      this.gameOverTitle
        .setText(state.victory ? 'CONTRACT COMPLETE' : 'RUN FLATLINED')
        .setPosition(panelX + 28, panelY + 28)
        .setVisible(true);
      this.gameOverBody
        .setText(
          state.victory
            ? 'Extraction locked and the data tap came home. Press R or use Run Another Contract to replay the slice.'
            : 'Press R or use Reboot Run to drop back into the district.',
        )
        .setPosition(panelX + 28, panelY + 82)
        .setVisible(true);
    }
  }
}

function statefulTime(timeSeconds: number, seed: string) {
  let accumulator = 0;
  for (let index = 0; index < seed.length; index += 1) {
    accumulator += seed.charCodeAt(index) * (index + 1);
  }
  return timeSeconds + accumulator * 0.0006;
}

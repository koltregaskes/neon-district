import Phaser from 'phaser';
import {
  DISTRICT_OBSTACLES,
  ISO_HALF_HEIGHT,
  ISO_HALF_WIDTH,
  NeonDistrictSimulation,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../simulation';
import type { ArenaObstacle, EnemyState, PickupState, Vector2 } from '../types';

type HudDispatch = (snapshot: ReturnType<NeonDistrictSimulation['createHudSnapshot']>) => void;

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

export class GameScene extends Phaser.Scene {
  private readonly simulation: NeonDistrictSimulation;
  private readonly dispatchHud: HudDispatch;
  private graphics!: Phaser.GameObjects.Graphics;
  private gameOverTitle!: Phaser.GameObjects.Text;
  private gameOverBody!: Phaser.GameObjects.Text;
  private keys!: KeyMap;
  private lastDashDown = false;
  private lastRestartDown = false;
  private lastSwapPrevDown = false;
  private lastSwapNextDown = false;
  private lastHudUpdate = 0;

  constructor(simulation: NeonDistrictSimulation, dispatchHud: HudDispatch) {
    super('district-run');
    this.simulation = simulation;
    this.dispatchHud = dispatchHud;
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

    if (restartDown && !this.lastRestartDown && state.gameOver) {
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
    this.graphics.fillStyle(0x02050d, 0.42);
    this.graphics.fillEllipse(base.x, base.y + 12, enemy.radius * 1.2, enemy.radius * 0.7);

    this.graphics.fillStyle(bodyColor, enemy.type === 'brute' ? 0.9 : 0.82);
    this.graphics.lineStyle(2, 0xffffff, 0.08);
    this.graphics.fillEllipse(base.x, base.y - (enemy.type === 'brute' ? 26 : 18), enemy.radius * 1.05, enemy.radius * (enemy.type === 'brute' ? 1.65 : 1.35));

    this.graphics.lineStyle(2, bodyColor, 0.8);
    this.graphics.strokeEllipse(base.x, base.y - (enemy.type === 'brute' ? 26 : 18), enemy.radius * 1.05, enemy.radius * (enemy.type === 'brute' ? 1.65 : 1.35));

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

  private renderScene() {
    const state = this.simulation.getState();
    const anchorX = this.scale.width * 0.5;
    const anchorY = this.scale.height * 0.57;
    const cameraTarget = state.player.position;

    this.graphics.clear();
    this.gameOverTitle.setVisible(false);
    this.gameOverBody.setVisible(false);
    this.graphics.fillGradientStyle(0x040611, 0x040611, 0x090e1c, 0x090e1c, 1, 1, 1, 1);
    this.graphics.fillRect(0, 0, this.scale.width, this.scale.height);

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

    const laneFeatures = [
      { x: 980, y: 1040, width: 920, height: 120, color: 0x0c1525 },
      { x: 1120, y: 680, width: 880, height: 84, color: 0x101a2b },
      { x: 760, y: 860, width: 420, height: 86, color: 0x0b1221 },
    ];

    laneFeatures.forEach((lane) => {
      const lanePoint = this.projectPoint({ x: lane.x, y: lane.y }, anchorX, anchorY, cameraTarget);
      this.drawDiamond(lanePoint, lane.width * ISO_HALF_WIDTH, lane.height * ISO_HALF_HEIGHT, lane.color, 0.94, 0x244663, 0.34);
    });

    const beaconPoints = [
      { x: 920, y: 730, color: 0xff9b59 },
      { x: 990, y: 770, color: 0x72ffd6 },
      { x: 1065, y: 720, color: 0xff6bd8 },
      { x: 1650, y: 520, color: 0xffce6a },
      { x: 690, y: 1260, color: 0x6db8ff },
    ];

    beaconPoints.forEach((beacon) => {
      const base = this.projectPoint({ x: beacon.x, y: beacon.y }, anchorX, anchorY, cameraTarget, 28);
      this.graphics.fillStyle(beacon.color, 0.18);
      this.graphics.fillEllipse(base.x, base.y, 28, 18);
      this.graphics.lineStyle(2, beacon.color, 0.85);
      this.graphics.strokeEllipse(base.x, base.y, 18, 10);
    });

    DISTRICT_OBSTACLES
      .slice()
      .sort((a, b) => a.y - b.y)
      .forEach((obstacle) => this.drawPrism(obstacle, anchorX, anchorY, cameraTarget));

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

    const extraction = this.projectPoint({ x: WORLD_WIDTH * 0.79, y: WORLD_HEIGHT * 0.22 }, anchorX, anchorY, cameraTarget, 64);
    this.drawDiamond(extraction, 48, 32, 0x24f0ff, 0.4, 0x24f0ff, 0.7);

    if (state.gameOver) {
      this.graphics.fillStyle(0x02040a, 0.62);
      this.graphics.fillRect(0, 0, this.scale.width, this.scale.height);
      const panelWidth = Math.min(this.scale.width - 80, 520);
      const panelHeight = 180;
      const panelX = (this.scale.width - panelWidth) / 2;
      const panelY = (this.scale.height - panelHeight) / 2;
      this.graphics.fillStyle(0x09101a, 0.92);
      this.graphics.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 18);
      this.graphics.lineStyle(2, 0xff5c7f, 0.8);
      this.graphics.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 18);
      this.gameOverTitle.setPosition(panelX + 28, panelY + 28).setVisible(true);
      this.gameOverBody.setPosition(panelX + 28, panelY + 82).setVisible(true);
    }
  }
}

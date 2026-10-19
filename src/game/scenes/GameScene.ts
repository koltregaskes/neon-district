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

type RenderProfile = {
  gridRadius: number;
  obstacleCullPadding: number;
  rainLineCount: number;
  drawSkylineMarkers: boolean;
  drawBeaconPoints: boolean;
  obstacleWindowStride: number;
  drawObstacleSigns: boolean;
  drawSecondaryObjectiveRing: boolean;
  drawHazardInnerRing: boolean;
  drawHazardBeacons: boolean;
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

type FigureSpec = {
  scale: number;
  bulk: number;
  armour: number;
  plate: number;
  trim: number;
  visor: number;
  ringColor: number;
  ringAlpha: number;
  weaponColor: number | null;
  weaponWidth: number;
  weaponLength: number;
  weaponAlpha: number;
  stride: number;
};

const PLAYER_RING_COLOR = 0x24f0ff;
const HOSTILE_RING_COLOR = 0xff3d7f;

function shadeColor(color: number, factor: number) {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

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

const SHELL_RENDER_PROFILE: RenderProfile = {
  gridRadius: 900,
  obstacleCullPadding: 260,
  rainLineCount: 34,
  drawSkylineMarkers: true,
  drawBeaconPoints: true,
  obstacleWindowStride: 1,
  drawObstacleSigns: true,
  drawSecondaryObjectiveRing: true,
  drawHazardInnerRing: true,
  drawHazardBeacons: true,
};

const COMBAT_RENDER_PROFILE: RenderProfile = {
  gridRadius: 660,
  obstacleCullPadding: 180,
  rainLineCount: 12,
  drawSkylineMarkers: false,
  drawBeaconPoints: false,
  obstacleWindowStride: 2,
  drawObstacleSigns: false,
  drawSecondaryObjectiveRing: true,
  drawHazardInnerRing: true,
  drawHazardBeacons: true,
};

const HOT_PHASE_RENDER_PROFILE: RenderProfile = {
  gridRadius: 560,
  obstacleCullPadding: 160,
  rainLineCount: 6,
  drawSkylineMarkers: false,
  drawBeaconPoints: false,
  obstacleWindowStride: 3,
  drawObstacleSigns: false,
  drawSecondaryObjectiveRing: false,
  drawHazardInnerRing: false,
  drawHazardBeacons: false,
};

export class GameScene extends Phaser.Scene {
  private readonly simulation: NeonDistrictSimulation;
  private readonly dispatchHud: HudDispatch;
  private readonly dispatchEvents: EventDispatch;
  private staticGraphics!: Phaser.GameObjects.Graphics;
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
  private cachedStaticProfile: RenderProfile | null = null;
  private cachedStaticCameraTarget: Vector2 | null = null;
  private cachedStaticAnchor: Vector2 | null = null;
  private cachedViewportWidth = 0;
  private cachedViewportHeight = 0;

  constructor(simulation: NeonDistrictSimulation, dispatchHud: HudDispatch, dispatchEvents: EventDispatch) {
    super('district-run');
    this.simulation = simulation;
    this.dispatchHud = dispatchHud;
    this.dispatchEvents = dispatchEvents;
  }

  create() {
    this.staticGraphics = this.add.graphics();
    this.graphics = this.add.graphics();
    this.staticGraphics.setDepth(0);
    this.graphics.setDepth(1);
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
    this.scale.on('resize', () => {
      this.invalidateStaticLayer();
      this.renderScene();
    }, this);
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

  private getRenderProfile() {
    const state = this.simulation.getState();
    if (state.objectivePhase === 'hold-upload' || state.objectivePhase === 'extract') {
      return HOT_PHASE_RENDER_PROFILE;
    }
    if (state.combatActive || state.activeHazards.length > 0 || state.enemies.length > 0) {
      return COMBAT_RENDER_PROFILE;
    }
    return SHELL_RENDER_PROFILE;
  }

  private isVisible(point: Vector2, paddingX: number, paddingY: number) {
    return point.x >= -paddingX
      && point.x <= this.scale.width + paddingX
      && point.y >= -paddingY
      && point.y <= this.scale.height + paddingY;
  }

  private withGraphics(target: Phaser.GameObjects.Graphics, draw: () => void) {
    const previous = this.graphics;
    this.graphics = target;
    try {
      draw();
    } finally {
      this.graphics = previous;
    }
  }

  private invalidateStaticLayer() {
    this.cachedStaticProfile = null;
    this.cachedStaticCameraTarget = null;
    this.cachedStaticAnchor = null;
    this.cachedViewportWidth = 0;
    this.cachedViewportHeight = 0;
  }

  private shouldRefreshStaticLayer(renderProfile: RenderProfile, cameraTarget: Vector2, anchorX: number, anchorY: number) {
    if (!this.cachedStaticProfile || !this.cachedStaticCameraTarget || !this.cachedStaticAnchor) {
      return true;
    }

    if (this.cachedViewportWidth !== this.scale.width || this.cachedViewportHeight !== this.scale.height) {
      return true;
    }

    if (this.cachedStaticProfile !== renderProfile) {
      return true;
    }

    if (this.trauma > 0.015) {
      return true;
    }

    const cameraDelta = Math.abs(cameraTarget.x - this.cachedStaticCameraTarget.x) + Math.abs(cameraTarget.y - this.cachedStaticCameraTarget.y);
    if (cameraDelta >= 12) {
      return true;
    }

    const anchorDelta = Math.abs(anchorX - this.cachedStaticAnchor.x) + Math.abs(anchorY - this.cachedStaticAnchor.y);
    return anchorDelta >= 2.5;
  }

  private drawStaticLayer(anchorX: number, anchorY: number, cameraTarget: Vector2, renderProfile: RenderProfile) {
    this.withGraphics(this.staticGraphics, () => {
      this.staticGraphics.clear();
      this.graphics.fillGradientStyle(0x040611, 0x040611, 0x090e1c, 0x090e1c, 1, 1, 1, 1);
      this.graphics.fillRect(0, 0, this.scale.width, this.scale.height);

      const gridRadius = renderProfile.gridRadius;
      const gridStartX = Math.floor((cameraTarget.x - gridRadius) / 180) * 180;
      const gridEndX = Math.ceil((cameraTarget.x + gridRadius) / 180) * 180;
      const gridStartY = Math.floor((cameraTarget.y - gridRadius) / 180) * 180;
      const gridEndY = Math.ceil((cameraTarget.y + gridRadius) / 180) * 180;

      for (let gx = gridStartX; gx <= gridEndX; gx += 180) {
        for (let gy = gridStartY; gy <= gridEndY; gy += 180) {
          if (gx < -180 || gy < -180 || gx > WORLD_WIDTH + 180 || gy > WORLD_HEIGHT + 180) continue;
          const tilePoint = this.projectPoint({ x: gx, y: gy }, anchorX, anchorY, cameraTarget);
          if (!this.isVisible(tilePoint, 180, 120)) continue;
          const pattern = ((gx / 180) + (gy / 180)) % 2 === 0;
          this.drawDiamond(tilePoint, 208, 104, pattern ? 0x0b1120 : 0x09101c, 0.76, pattern ? 0x16324a : 0x10263b, 0.25);
        }
      }

      LANE_FEATURES.forEach((lane) => {
        const lanePoint = this.projectPoint({ x: lane.x, y: lane.y }, anchorX, anchorY, cameraTarget);
        this.drawDiamond(lanePoint, lane.width * ISO_HALF_WIDTH, lane.height * ISO_HALF_HEIGHT, lane.color, 0.94, 0x244663, 0.34);
      });

      if (renderProfile.drawBeaconPoints) {
        BEACON_POINTS.forEach((beacon) => {
          const base = this.projectPoint({ x: beacon.x, y: beacon.y }, anchorX, anchorY, cameraTarget, 28);
          if (!this.isVisible(base, 40, 40)) return;
          this.graphics.fillStyle(beacon.color, 0.18);
          this.graphics.fillEllipse(base.x, base.y, 28, 18);
          this.graphics.lineStyle(2, beacon.color, 0.85);
          this.graphics.strokeEllipse(base.x, base.y, 18, 10);
        });
      }

      SORTED_DISTRICT_OBSTACLES.forEach((obstacle) => this.drawPrism(obstacle, anchorX, anchorY, cameraTarget, renderProfile));
    });

    this.cachedStaticProfile = renderProfile;
    this.cachedStaticCameraTarget = { ...cameraTarget };
    this.cachedStaticAnchor = { x: anchorX, y: anchorY };
    this.cachedViewportWidth = this.scale.width;
    this.cachedViewportHeight = this.scale.height;
  }

  // Two triangles rather than a path: fillPath runs a polygon triangulator on
  // every call, which is the expensive part when the static layer redraws.
  private fillQuad(a: Vector2, b: Vector2, c: Vector2, d: Vector2, color: number, alpha: number) {
    this.graphics.fillStyle(color, alpha);
    this.graphics.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
    this.graphics.fillTriangle(a.x, a.y, c.x, c.y, d.x, d.y);
  }

  // Lit window grid on one wall face. The face runs from `left` to `right` along
  // the ground and rises `height` px on screen. Which windows are lit is a stable
  // hash of the building, so the pattern does not flicker between redraws.
  private drawFaceWindows(
    left: Vector2,
    right: Vector2,
    height: number,
    seed: number,
    glow: number,
    stride: number,
    faceShade: number,
  ) {
    const faceLength = Math.hypot(right.x - left.x, right.y - left.y);
    const columns = Math.max(2, Math.floor(faceLength / 30));
    const rows = Math.max(1, Math.floor((height - 18) / 28));
    const colStep = 1 / columns;
    const rowStep = (height - 18) / rows;
    for (let row = 0; row < rows; row += stride) {
      for (let col = 0; col < columns; col += 1) {
        const hash = Math.abs(Math.sin(seed * 12.9898 + row * 78.233 + col * 37.719) * 43758.5453) % 1;
        if (hash < 0.5) continue;
        const u0 = col * colStep + colStep * 0.24;
        const u1 = col * colStep + colStep * 0.76;
        const v0 = 10 + row * rowStep + rowStep * 0.28;
        const v1 = 10 + row * rowStep + rowStep * 0.78;
        const p = (u: number, v: number) => ({
          x: Phaser.Math.Linear(left.x, right.x, u),
          y: Phaser.Math.Linear(left.y, right.y, u) - v,
        });
        const warm = hash > 0.86;
        const color = warm ? 0xffd9a0 : glow;
        const alpha = (warm ? 0.62 : 0.5) * faceShade + (hash - 0.5) * 0.3;
        this.fillQuad(p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1), color, alpha);
      }
    }
  }

  private drawPrism(
    obstacle: ArenaObstacle,
    anchorX: number,
    anchorY: number,
    cameraTarget: Vector2,
    renderProfile: RenderProfile,
  ) {
    const halfW = obstacle.width / 2;
    const halfD = obstacle.depth / 2;
    const baseNE = this.projectPoint({ x: obstacle.x + halfW, y: obstacle.y - halfD }, anchorX, anchorY, cameraTarget);
    const baseSE = this.projectPoint({ x: obstacle.x + halfW, y: obstacle.y + halfD }, anchorX, anchorY, cameraTarget);
    const baseSW = this.projectPoint({ x: obstacle.x - halfW, y: obstacle.y + halfD }, anchorX, anchorY, cameraTarget);
    const topNW = this.projectPoint({ x: obstacle.x - halfW, y: obstacle.y - halfD }, anchorX, anchorY, cameraTarget, obstacle.height);
    const topNE = this.projectPoint({ x: obstacle.x + halfW, y: obstacle.y - halfD }, anchorX, anchorY, cameraTarget, obstacle.height);
    const topSE = this.projectPoint({ x: obstacle.x + halfW, y: obstacle.y + halfD }, anchorX, anchorY, cameraTarget, obstacle.height);
    const topSW = this.projectPoint({ x: obstacle.x - halfW, y: obstacle.y + halfD }, anchorX, anchorY, cameraTarget, obstacle.height);
    const visible = [
      baseNE,
      baseSE,
      baseSW,
      topNW,
      topNE,
      topSE,
      topSW,
    ].some((point) => this.isVisible(point, renderProfile.obstacleCullPadding, renderProfile.obstacleCullPadding));

    if (!visible) {
      return;
    }

    const fill = Phaser.Display.Color.HexStringToColor(obstacle.fill).color;
    const glow = Phaser.Display.Color.HexStringToColor(obstacle.glow).color;
    const seed = obstacle.x * 0.013 + obstacle.y * 0.007 + obstacle.height;

    // Solid walls: the south face catches the street light, the east face sits in shade.
    this.fillQuad(baseSW, baseSE, topSE, topSW, shadeColor(fill, 1.25), 1);
    this.fillQuad(baseSE, baseNE, topNE, topSE, shadeColor(fill, 0.72), 1);

    // Street-level neon wash along the bottom of each wall.
    const washHeight = Math.min(26, obstacle.height * 0.3);
    const lift = (point: Vector2, by: number) => ({ x: point.x, y: point.y - by });
    this.fillQuad(baseSW, baseSE, lift(baseSE, washHeight), lift(baseSW, washHeight), glow, 0.12);
    this.fillQuad(baseSE, baseNE, lift(baseNE, washHeight), lift(baseSE, washHeight), glow, 0.07);

    this.drawFaceWindows(baseSW, baseSE, obstacle.height, seed, glow, renderProfile.obstacleWindowStride, 1);
    this.drawFaceWindows(baseSE, baseNE, obstacle.height, seed + 7, glow, renderProfile.obstacleWindowStride, 0.7);

    // Roof slab with a lit parapet edge and an inset service deck.
    this.fillQuad(topNW, topNE, topSE, topSW, shadeColor(fill, 1.55), 1);
    const roofCenter = {
      x: (topNW.x + topNE.x + topSE.x + topSW.x) / 4,
      y: (topNW.y + topNE.y + topSE.y + topSW.y) / 4,
    };
    const inset = (point: Vector2) => ({
      x: Phaser.Math.Linear(point.x, roofCenter.x, 0.16),
      y: Phaser.Math.Linear(point.y, roofCenter.y, 0.16),
    });
    this.fillQuad(inset(topNW), inset(topNE), inset(topSE), inset(topSW), shadeColor(fill, 1.1), 1);
    this.graphics.lineStyle(1, glow, 0.32);
    this.graphics.strokePoints([inset(topNW), inset(topNE), inset(topSE), inset(topSW)], true);

    // Vertical edges: the front corner is the brightest line on the building.
    this.graphics.lineStyle(1.5, glow, 0.38);
    this.graphics.lineBetween(baseSW.x, baseSW.y, topSW.x, topSW.y);
    this.graphics.lineBetween(baseNE.x, baseNE.y, topNE.x, topNE.y);
    this.graphics.lineStyle(2, glow, 0.7);
    this.graphics.lineBetween(baseSE.x, baseSE.y, topSE.x, topSE.y);

    this.graphics.lineStyle(2, glow, 0.9);
    this.graphics.strokePoints([topNW, topNE, topSE, topSW], true);

    // Kerb glow where the building meets the street.
    this.graphics.lineStyle(2, glow, 0.45);
    this.graphics.strokePoints([baseSW, baseSE, baseNE], false);

    if (renderProfile.drawObstacleSigns && obstacle.height >= 80) {
      // Rooftop sign as a plain quad. Rounded rects are built from arcs and were
      // the single most expensive thing in the static layer under software GL.
      const signPoint = this.projectPoint({ x: obstacle.x, y: obstacle.y }, anchorX, anchorY, cameraTarget, obstacle.height + 26);
      const signBox = [
        { x: signPoint.x - 44, y: signPoint.y - 10 },
        { x: signPoint.x + 44, y: signPoint.y - 10 },
        { x: signPoint.x + 44, y: signPoint.y + 12 },
        { x: signPoint.x - 44, y: signPoint.y + 12 },
      ];
      this.fillQuad(signBox[0], signBox[1], signBox[2], signBox[3], 0x03070d, 0.78);
      this.graphics.lineStyle(1, glow, 0.8);
      this.graphics.strokePoints(signBox, true);
      this.graphics.lineStyle(1, glow, 0.45);
      this.graphics.beginPath();
      this.graphics.moveTo(signPoint.x - 32, signPoint.y + 1);
      this.graphics.lineTo(signPoint.x + 32, signPoint.y + 1);
      this.graphics.strokePath();
    }
  }

  // A small isometric figure: team ring at the feet, legs, armoured torso, head
  // with a visor, and a weapon pointing along the screen-space facing. Everything
  // is Graphics, drawn per frame so facing and stride follow the simulation.
  private drawFigure(base: Vector2, facing: Vector2, spec: FigureSpec) {
    const g = this.graphics;
    const s = spec.scale;
    const hipY = base.y - 18 * s;
    const shoulderY = base.y - 38 * s;
    const headY = base.y - 48 * s;
    const side = { x: -facing.y, y: facing.x };

    g.fillStyle(0x02050d, 0.5);
    g.fillEllipse(base.x, base.y + 2, 40 * s, 15 * s);

    // Soft team-coloured aura behind the body so the silhouette lifts off the street.
    g.fillStyle(spec.ringColor, 0.14);
    g.fillEllipse(base.x, base.y - 28 * s, 34 * s, 58 * s);

    // Team ring with a facing notch, so the read is "who" and "which way" at a glance.
    g.fillStyle(spec.ringColor, 0.12);
    g.fillEllipse(base.x, base.y, 54 * s, 24 * s);
    g.lineStyle(2, spec.ringColor, spec.ringAlpha);
    g.strokeEllipse(base.x, base.y, 54 * s, 24 * s);
    const notch = { x: base.x + facing.x * 30 * s, y: base.y + facing.y * 13 * s };
    g.fillStyle(spec.ringColor, Math.min(1, spec.ringAlpha + 0.15));
    g.fillTriangle(
      notch.x + facing.x * 7 * s,
      notch.y + facing.y * 4 * s,
      notch.x + side.x * 5 * s,
      notch.y + side.y * 3 * s,
      notch.x - side.x * 5 * s,
      notch.y - side.y * 3 * s,
    );

    const weaponBehind = facing.y < -0.15;
    const drawWeapon = () => {
      if (spec.weaponColor === null) return;
      const grip = { x: base.x + facing.x * 6 * s + side.x * 5 * s, y: shoulderY + 6 * s + facing.y * 3 * s };
      const muzzle = { x: grip.x + facing.x * spec.weaponLength * s, y: grip.y + facing.y * spec.weaponLength * 0.55 * s };
      g.lineStyle(spec.weaponWidth * s + 2, 0x050b14, 0.85);
      g.lineBetween(grip.x, grip.y, muzzle.x, muzzle.y);
      g.lineStyle(spec.weaponWidth * s, spec.weaponColor, spec.weaponAlpha);
      g.lineBetween(grip.x, grip.y, muzzle.x, muzzle.y);
      g.fillStyle(spec.weaponColor, spec.weaponAlpha);
      g.fillCircle(muzzle.x, muzzle.y, 2.2 * s);
    };

    if (weaponBehind) drawWeapon();

    // Legs with a simple stride swing while moving.
    const swing = spec.stride * 5 * s;
    g.lineStyle(6.5 * s, spec.armour, 1);
    g.lineBetween(base.x - 5 * s, hipY, base.x - 6 * s + facing.x * swing, base.y - 3 - facing.y * swing * 0.4);
    g.lineBetween(base.x + 5 * s, hipY, base.x + 6 * s - facing.x * swing, base.y - 3 + facing.y * swing * 0.4);
    g.lineStyle(1.5, spec.trim, 0.55);
    g.lineBetween(base.x - 5 * s, hipY, base.x - 6 * s + facing.x * swing, base.y - 3 - facing.y * swing * 0.4);
    g.lineBetween(base.x + 5 * s, hipY, base.x + 6 * s - facing.x * swing, base.y - 3 + facing.y * swing * 0.4);

    // Torso: broad shoulders tapering to the waist.
    const torso = [
      { x: base.x - 13 * s * spec.bulk, y: shoulderY },
      { x: base.x + 13 * s * spec.bulk, y: shoulderY },
      { x: base.x + 8 * s, y: hipY },
      { x: base.x - 8 * s, y: hipY },
    ];
    g.fillStyle(spec.armour, 1);
    g.fillPoints(torso, true);
    // Lit chest plate on the side facing the street light.
    g.fillStyle(spec.plate, 0.9);
    g.fillPoints([
      { x: base.x - 9 * s * spec.bulk, y: shoulderY + 3 * s },
      { x: base.x + 9 * s * spec.bulk, y: shoulderY + 3 * s },
      { x: base.x + 5 * s, y: hipY - 4 * s },
      { x: base.x - 5 * s, y: hipY - 4 * s },
    ], true);
    g.lineStyle(2, spec.trim, 0.95);
    g.strokePoints(torso, true);
    // Chest light line, turned a little toward the facing.
    g.lineStyle(2, spec.trim, 0.85);
    g.lineBetween(base.x + facing.x * 3 * s - 5 * s, shoulderY + 7 * s, base.x + facing.x * 3 * s + 5 * s, shoulderY + 7 * s);

    // Head and visor. The visor dims when the figure faces away from the camera.
    g.fillStyle(spec.plate, 1);
    g.fillCircle(base.x, headY, 8 * s);
    g.lineStyle(1.5, spec.trim, 0.95);
    g.strokeCircle(base.x, headY, 8 * s);
    const visorAlpha = facing.y < -0.35 ? 0.25 : 0.95;
    g.lineStyle(3 * s, spec.visor, visorAlpha);
    g.lineBetween(
      base.x + facing.x * 1.5 * s - side.x * 4 * s,
      headY + 1 * s - side.y * 2 * s,
      base.x + facing.x * 5.5 * s + side.x * 3 * s,
      headY + 1 * s + side.y * 2 * s,
    );

    if (!weaponBehind) drawWeapon();
  }

  private drawEnemy(enemy: EnemyState, anchorX: number, anchorY: number, cameraTarget: Vector2) {
    const base = this.projectPoint(enemy.position, anchorX, anchorY, cameraTarget);
    const bodyColor = Phaser.Display.Color.HexStringToColor(enemy.glow).color;
    const screenFacing = this.toScreenDirection(enemy.facing);
    const scale = 1.2 * (enemy.type === 'brute' ? 1.32 : enemy.type === 'captain' ? 1.36 : enemy.type === 'shield' ? 1.12 : enemy.type === 'runner' ? 0.9 : 1);
    const bodyY = base.y - 30 * scale;
    const speed = Math.hypot(enemy.velocity.x, enemy.velocity.y);
    const stride = speed > 8 ? Math.sin(this.simulation.getState().timeSeconds * 14 + enemy.id) : 0;

    this.drawFigure(base, screenFacing, {
      scale,
      bulk: enemy.type === 'brute' ? 1.35 : enemy.type === 'captain' ? 1.2 : 1,
      armour: shadeColor(bodyColor, 0.3),
      plate: shadeColor(bodyColor, 0.55),
      trim: bodyColor,
      visor: 0xff3d6e,
      ringColor: HOSTILE_RING_COLOR,
      ringAlpha: enemy.type === 'captain' ? 0.95 : 0.72,
      weaponColor: enemy.type === 'brute' || enemy.type === 'runner' || enemy.type === 'shield' ? null : bodyColor,
      weaponWidth: enemy.type === 'sniper' ? 2.5 : 3.5,
      weaponLength: enemy.type === 'sniper' ? 30 : 20,
      weaponAlpha: 0.9,
      stride,
    });

    if (enemy.type === 'runner') {
      this.graphics.lineStyle(2, bodyColor, 0.55);
      this.graphics.beginPath();
      this.graphics.moveTo(base.x - screenFacing.x * 14, bodyY + 6 - screenFacing.y * 10);
      this.graphics.lineTo(base.x - screenFacing.x * 28 + screenFacing.y * 8, bodyY + 10 - screenFacing.y * 18);
      this.graphics.moveTo(base.x - screenFacing.x * 10, bodyY - 2 - screenFacing.y * 8);
      this.graphics.lineTo(base.x - screenFacing.x * 22 - screenFacing.y * 6, bodyY - 10 - screenFacing.y * 14);
      this.graphics.strokePath();
    } else if (enemy.type === 'gunner') {
      this.graphics.lineStyle(2, bodyColor, 0.8);
      this.graphics.beginPath();
      this.graphics.moveTo(base.x - 14, bodyY - 6);
      this.graphics.lineTo(base.x - 22, bodyY - 12);
      this.graphics.moveTo(base.x + 14, bodyY - 6);
      this.graphics.lineTo(base.x + 22, bodyY - 12);
      this.graphics.strokePath();
    } else if (enemy.type === 'sniper') {
      this.graphics.fillStyle(0xfff0ae, 0.82);
      this.graphics.fillCircle(base.x + screenFacing.x * 6, bodyY - 18 + screenFacing.y * 3, 2.5);
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
      this.graphics.fillStyle(0xffc18f, 0.12);
      this.graphics.fillEllipse(base.x, bodyY, enemy.radius * 1.5, enemy.radius * 2);
    } else if (enemy.type === 'captain') {
      this.graphics.fillStyle(0xffbfd0, 0.12);
      this.graphics.fillEllipse(base.x, bodyY, enemy.radius * 1.8, enemy.radius * 2.2);
      this.graphics.lineStyle(3, 0xffbfd0, 0.75);
      this.graphics.beginPath();
      this.graphics.moveTo(base.x - 20, bodyY - 26);
      this.graphics.lineTo(base.x + 20, bodyY - 26);
      this.graphics.strokePath();
      this.graphics.fillStyle(0x091421, 0.92);
      this.graphics.fillEllipse(base.x + screenFacing.x * 20, bodyY + screenFacing.y * 10, 24, 36);
      this.graphics.lineStyle(2, 0xff97b4, 0.86);
      this.graphics.strokeEllipse(base.x + screenFacing.x * 20, bodyY + screenFacing.y * 10, 24, 36);
    }

    const healthWidth = Math.max(30, enemy.radius * 1.6);
    const barY = base.y - 64 * scale;
    this.graphics.fillStyle(0x05101a, 0.9);
    this.graphics.fillRect(base.x - healthWidth / 2, barY, healthWidth, 5);
    this.graphics.fillStyle(bodyColor, 0.9);
    this.graphics.fillRect(base.x - healthWidth / 2, barY, healthWidth * (enemy.health / enemy.maxHealth), 5);
  }

  private drawPlayer(anchorX: number, anchorY: number, cameraTarget: Vector2) {
    const state = this.simulation.getState();
    const player = state.player;
    const base = this.projectPoint(player.position, anchorX, anchorY, cameraTarget);
    const facing = this.toScreenDirection(player.facing);
    const speed = Math.hypot(player.velocity.x, player.velocity.y);
    const stride = speed > 8 ? Math.sin(state.timeSeconds * 16) : 0;
    const weaponColor = player.currentWeapon === 'scatter'
      ? 0xffd166
      : player.currentWeapon === 'rail'
        ? 0x5ef7ff
        : 0xff67cf;

    if (state.playerInCover) {
      this.graphics.lineStyle(3, 0x7affb8, 0.64);
      this.graphics.strokeEllipse(base.x, base.y - 2, 86, 38);
    }

    this.drawFigure(base, facing, {
      scale: 1.36,
      bulk: 1,
      armour: 0x123a50,
      plate: 0x2a7d97,
      trim: 0x5ef7ff,
      visor: 0xb5fdff,
      ringColor: PLAYER_RING_COLOR,
      ringAlpha: 0.65 + Math.sin(state.timeSeconds * 3) * 0.15,
      weaponColor,
      weaponWidth: player.currentWeapon === 'rail' ? 4 : 3.5,
      weaponLength: player.currentWeapon === 'rail' ? 26 : 20,
      weaponAlpha: player.overheated ? 0.3 : 0.92,
      stride,
    });
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

  private drawAtmosphere(
    anchorX: number,
    anchorY: number,
    cameraTarget: Vector2,
    timeSeconds: number,
    renderProfile: RenderProfile,
  ) {
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

    if (renderProfile.drawSkylineMarkers) {
      SKYLINE_MARKERS.forEach((marker, index) => {
        const point = this.projectPoint({ x: marker.x, y: marker.y }, anchorX, anchorY, cameraTarget, marker.height);
        this.graphics.fillStyle(marker.color, 0.42);
        this.graphics.fillRoundedRect(point.x - marker.width / 2, point.y, marker.width, marker.height, 18);
        this.graphics.fillStyle(index % 2 === 0 ? 0x30eeff : 0xff76d8, 0.14);
        this.graphics.fillRect(point.x - marker.width / 3, point.y + 28, marker.width / 1.5, marker.height - 58);
      });
    }

    this.graphics.lineStyle(1, 0x7ceaff, 0.18);
    for (let index = 0; index < renderProfile.rainLineCount; index += 1) {
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
      const radius = burst.radius * 1.9;
      if (!this.isVisible(point, radius, radius)) {
        return;
      }
      const alpha = burst.life / burst.maxLife;
      const scaledRadius = burst.radius * (1 + (1 - alpha) * 0.7);
      this.graphics.lineStyle(3, burst.color, alpha * 0.8);
      this.graphics.strokeEllipse(point.x, point.y, scaledRadius, scaledRadius * 0.65);
      this.graphics.fillStyle(burst.color, alpha * 0.08);
      this.graphics.fillEllipse(point.x, point.y, scaledRadius * 0.7, scaledRadius * 0.42);
    });
  }

  private drawObjectiveMarker(
    position: Vector2,
    anchorX: number,
    anchorY: number,
    cameraTarget: Vector2,
    renderProfile: RenderProfile,
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
    if (renderProfile.drawSecondaryObjectiveRing) {
      this.graphics.strokeEllipse(base.x, base.y, radius * ISO_HALF_WIDTH * 1.45 * pulse, radius * ISO_HALF_HEIGHT * 2.05 * pulse);
    }
  }

  private drawHazardZone(hazard: HazardState, anchorX: number, anchorY: number, cameraTarget: Vector2, renderProfile: RenderProfile) {
    const point = this.projectPoint(hazard.position, anchorX, anchorY, cameraTarget, 4);
    const color = Phaser.Display.Color.HexStringToColor(hazard.color).color;
    const pulse = 0.94 + Math.sin(statefulTime(this.simulation.getState().timeSeconds, hazard.id) * 4.2) * 0.08;
    const radiusX = hazard.radius * ISO_HALF_WIDTH * pulse;
    const radiusY = hazard.radius * ISO_HALF_HEIGHT * 1.55 * pulse;
    if (!this.isVisible(point, radiusX + 40, radiusY + 40)) {
      return;
    }
    const lifeRatio = Phaser.Math.Clamp(hazard.remaining / Math.max(hazard.maxDuration, 0.001), 0, 1);
    const ringAlpha = 0.18 + (1 - lifeRatio) * 0.08;
    const hotPhaseProfile = renderProfile === HOT_PHASE_RENDER_PROFILE;

    if (hazard.kind === 'blackout') {
      this.graphics.fillStyle(0x02040a, hotPhaseProfile ? 0.28 : 0.34);
      this.graphics.fillEllipse(point.x, point.y, radiusX * 0.95, radiusY * 0.95);
    } else {
      this.graphics.fillStyle(color, hotPhaseProfile ? 0.07 : 0.1);
      this.graphics.fillEllipse(point.x, point.y, radiusX * 0.82, radiusY * 0.82);
    }

    this.graphics.lineStyle(2, color, ringAlpha + 0.18);
    this.graphics.strokeEllipse(point.x, point.y, radiusX, radiusY);
    if (renderProfile.drawHazardInnerRing) {
      this.graphics.lineStyle(2, color, ringAlpha);
      this.graphics.strokeEllipse(point.x, point.y, radiusX * 0.72, radiusY * 0.72);
    }

    if (renderProfile.drawHazardBeacons) {
      const beacon = this.projectPoint(hazard.position, anchorX, anchorY, cameraTarget, 52);
      this.graphics.lineStyle(2, color, 0.28);
      this.graphics.beginPath();
      this.graphics.moveTo(point.x, point.y);
      this.graphics.lineTo(beacon.x, beacon.y + 10);
      this.graphics.strokePath();
      this.drawDiamond(beacon, 28, 18, color, 0.3, color, 0.7);
    }
  }

  private renderScene() {
    const state = this.simulation.getState();
    const renderProfile = this.getRenderProfile();
    const shake = this.trauma * this.trauma * 18;
    const anchorX = this.scale.width * 0.5 + Math.sin(state.timeSeconds * 83) * shake;
    const anchorY = this.scale.height * 0.57 + Math.cos(state.timeSeconds * 71) * shake;
    const cameraTarget = state.player.position;

    if (this.shouldRefreshStaticLayer(renderProfile, cameraTarget, anchorX, anchorY)) {
      this.drawStaticLayer(anchorX, anchorY, cameraTarget, renderProfile);
    }

    this.graphics.clear();
    this.gameOverTitle.setVisible(false);
    this.gameOverBody.setVisible(false);
    this.drawAtmosphere(anchorX, anchorY, cameraTarget, state.timeSeconds, renderProfile);

    const terminalActive = state.objectivePhase === 'reach-terminal' || state.objectivePhase === 'hack-terminal' || state.objectivePhase === 'hold-upload';
    const extractionActive = state.objectivePhase === 'extract' || state.victory;
    const optionalObjectiveVisible = Boolean(state.optionalObjectivePoint) && state.optionalObjectiveState !== 'hidden' && state.optionalObjectiveState !== 'skipped';
    const optionalObjectiveActive = state.optionalObjectiveState === 'available';
    this.drawObjectiveMarker(
      state.terminalPoint,
      anchorX,
      anchorY,
      cameraTarget,
      renderProfile,
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
      renderProfile,
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
        renderProfile,
        optionalObjectiveActive ? 0xffc96a : 0x7d5d28,
        state.optionalObjectiveRadius,
        2.1,
        optionalObjectiveActive,
      );
    }

    state.activeHazards.forEach((hazard) => this.drawHazardZone(hazard, anchorX, anchorY, cameraTarget, renderProfile));

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

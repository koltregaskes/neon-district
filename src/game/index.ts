import Phaser from 'phaser';
import { NeonDistrictSimulation } from './simulation';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

export type NeonDistrictRuntime = {
  game: Phaser.Game;
  simulation: NeonDistrictSimulation;
  destroy: () => void;
  restart: () => void;
  activateSweep: () => void;
};

export function createNeonDistrictGame(
  mount: HTMLElement,
  onHudUpdate: (snapshot: ReturnType<NeonDistrictSimulation['createHudSnapshot']>) => void,
): NeonDistrictRuntime {
  const simulation = new NeonDistrictSimulation();
  const bootScene = new BootScene();
  const gameScene = new GameScene(simulation, onHudUpdate);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: mount,
    width: mount.clientWidth || 1280,
    height: mount.clientHeight || 720,
    backgroundColor: '#040611',
    render: {
      antialias: true,
      pixelArt: false,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%',
    },
    scene: [bootScene, gameScene],
  });

  const resizeObserver = new ResizeObserver(() => {
    const width = Math.max(640, mount.clientWidth);
    const height = Math.max(480, mount.clientHeight);
    game.scale.resize(width, height);
  });

  resizeObserver.observe(mount);

  return {
    game,
    simulation,
    destroy: () => {
      resizeObserver.disconnect();
      game.destroy(true);
    },
    restart: () => simulation.restart(),
    activateSweep: () => simulation.activateSweep(),
  };
}

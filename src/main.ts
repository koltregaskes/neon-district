import './style.css';
import { createNeonDistrictGame } from './game';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root not found');
}

app.innerHTML = `
  <div class="shell">
    <div class="top-ribbon">
      <div>
        <div class="eyebrow">Cyberpunk isometric shooter prototype</div>
        <h1>Neon District</h1>
      </div>
      <div class="run-actions">
        <button class="control-button" id="restartRunButton" type="button">Reboot Run</button>
      </div>
    </div>

    <div class="game-shell">
      <div class="game-frame">
        <div id="game-root" class="game-root"></div>

        <section class="hud-panel hud-panel--left">
          <div class="hud-chip">
            <span class="hud-chip__label">District</span>
            <strong id="districtName">Neon District // Vanta Stack</strong>
            <span id="districtStatus">Lane still contested</span>
          </div>

          <div class="meter-block">
            <div class="meter-row">
              <span>Health</span>
              <strong id="healthValue">100 / 100</strong>
            </div>
            <div class="meter"><span id="healthMeter"></span></div>
          </div>

          <div class="meter-block">
            <div class="meter-row">
              <span>Shield</span>
              <strong id="shieldValue">75 / 75</strong>
            </div>
            <div class="meter meter--shield"><span id="shieldMeter"></span></div>
          </div>

          <div class="meter-grid">
            <div class="meter-block meter-block--compact">
              <div class="meter-row">
                <span>Energy</span>
                <strong id="energyValue">100 / 100</strong>
              </div>
              <div class="meter meter--energy"><span id="energyMeter"></span></div>
            </div>

            <div class="meter-block meter-block--compact">
              <div class="meter-row">
                <span>Heat</span>
                <strong id="heatValue">0%</strong>
              </div>
              <div class="meter meter--heat"><span id="heatMeter"></span></div>
            </div>
          </div>
        </section>

        <section class="hud-panel hud-panel--right">
          <div class="mission-card">
            <div class="eyebrow">Current objective</div>
            <h2 id="missionTitle">Sweep the relay yard</h2>
            <p id="missionDetail">Punch a hole through the mercenary cordon and keep the courier link alive.</p>
            <div class="meter-row mission-row">
              <span id="missionStatus">Incursion live</span>
              <strong id="missionProgressValue">0%</strong>
            </div>
            <div class="meter meter--mission"><span id="missionMeter"></span></div>
          </div>

          <div class="narrative-card">
            <div class="eyebrow">Run brief</div>
            <p id="districtSummary">Mercenary screens are still probing the relay yard. Keep pressure off the centre lane.</p>
          </div>
        </section>

        <section class="hud-panel hud-panel--bottom">
          <div class="stat-cluster">
            <div class="stat">
              <span>Threat</span>
              <strong id="threatValue">18</strong>
            </div>
            <div class="stat">
              <span>Wave</span>
              <strong id="waveValue">1</strong>
            </div>
            <div class="stat">
              <span>Kills</span>
              <strong id="killsValue">0</strong>
            </div>
            <div class="stat">
              <span>Score</span>
              <strong id="scoreValue">0</strong>
            </div>
            <div class="stat">
              <span>Credits</span>
              <strong id="creditsValue">0</strong>
            </div>
            <div class="stat">
              <span>Weapon</span>
              <strong id="weaponValue">VX-9 Volley Rifle</strong>
            </div>
            <div class="stat">
              <span>Hostiles</span>
              <strong id="enemyCountValue">0</strong>
            </div>
          </div>

          <div class="controls-card">
            <div class="eyebrow">Controls</div>
            <ul>
              <li><strong>Move:</strong> WASD</li>
              <li><strong>Aim + fire:</strong> mouse</li>
              <li><strong>Dash:</strong> Shift or Space</li>
              <li><strong>Swap weapon:</strong> Q / E</li>
              <li><strong>Retry:</strong> R or Reboot Run</li>
            </ul>
          </div>
        </section>
      </div>

      <aside class="side-dossier">
        <div class="dossier-card">
          <div class="eyebrow">Target fantasy</div>
          <h2>The Ascent, browser-first</h2>
          <p>
            This prototype is the fast path to a cyberpunk combat game with readable isometric action,
            escalating pressure, and a thick neon mood. The long-term target is a denser district, better enemy AI,
            traversal toys, weapon archetypes, and co-op-friendly combat loops.
          </p>
        </div>

        <div class="dossier-card">
          <div class="eyebrow">Next build targets</div>
          <ul class="milestone-list">
            <li>Cover snap and readable flanking lanes</li>
            <li>Weapon archetypes and loot rarity</li>
            <li>Mission beats beyond survival pressure</li>
            <li>Street-level boss encounter</li>
            <li>Audio, hit feedback, and synthetic VO texture</li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
`;

const gameRoot = document.querySelector<HTMLElement>('#game-root');
const restartButton = document.querySelector<HTMLButtonElement>('#restartRunButton');

if (!gameRoot || !restartButton) {
  throw new Error('Game shell failed to mount');
}

const runtime = createNeonDistrictGame(gameRoot, (snapshot) => {
  const setText = (selector: string, value: string) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) element.textContent = value;
  };

  const setWidth = (selector: string, value: number, max: number) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) element.style.width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
  };

  setText('#districtName', snapshot.districtName);
  setText('#districtStatus', snapshot.gameOver ? 'Run flatlined' : snapshot.districtStatus);
  setText('#districtSummary', snapshot.districtSummary);

  setText('#healthValue', `${Math.round(snapshot.health)} / ${snapshot.maxHealth}`);
  setWidth('#healthMeter', snapshot.health, snapshot.maxHealth);

  setText('#shieldValue', `${Math.round(snapshot.shield)} / ${snapshot.maxShield}`);
  setWidth('#shieldMeter', snapshot.shield, snapshot.maxShield);

  setText('#energyValue', `${Math.round(snapshot.energy)} / ${snapshot.maxEnergy}`);
  setWidth('#energyMeter', snapshot.energy, snapshot.maxEnergy);

  setText('#heatValue', snapshot.overheated ? `OVERHEAT ${Math.round(snapshot.weaponHeat)}%` : `${Math.round(snapshot.weaponHeat)}%`);
  setWidth('#heatMeter', snapshot.weaponHeat, 100);
  setText('#weaponValue', snapshot.weaponName);

  setText('#missionTitle', snapshot.mission.title);
  setText('#missionDetail', snapshot.mission.detail);
  setText('#missionStatus', snapshot.mission.status);
  setText('#missionProgressValue', `${Math.round(snapshot.mission.progress)}%`);
  setWidth('#missionMeter', snapshot.mission.progress, 100);

  setText('#threatValue', `${Math.round(snapshot.threatLevel)}`);
  setText('#waveValue', `${snapshot.wave}`);
  setText('#killsValue', `${snapshot.kills}`);
  setText('#scoreValue', `${snapshot.score.toLocaleString()}`);
  setText('#creditsValue', `${snapshot.credits.toLocaleString()}`);
  setText('#enemyCountValue', `${snapshot.enemyCount}`);

  restartButton.textContent = snapshot.gameOver ? 'Reboot Run' : 'Reset Prototype';
});

restartButton.addEventListener('click', () => {
  runtime.restart();
});

window.addEventListener('beforeunload', () => {
  runtime.destroy();
});

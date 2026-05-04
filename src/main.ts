import './style.css';
import { crazyGameplayStart, crazyGameplayStop, crazyHappytime } from './integrations/crazygames';
import {
  CONTRACTS,
  CONTRACTS_BY_ID,
  CYBERWARE_BY_ID,
  CYBERWARE_OPTIONS,
  FACTION_DETAILS,
  WEAPON_UPGRADES,
} from './game/content';
import {
  createRunConfig,
  getFallbackContractId,
  getFallbackCyberwareId,
  isContractUnlocked,
  isCyberwareUnlocked,
  loadCampaignState,
  purchaseWeaponUpgrade,
  resetCampaignState,
  resolveCampaignRun,
  saveCampaignState,
} from './game/progression';
import type {
  CampaignRunResult,
  CampaignState,
  ContractDefinition,
  ContractId,
  CyberwareId,
  HudSnapshot,
  SimulationEvent,
  WeaponUpgradeId,
  WeaponType,
} from './game/types';
import type { NeonDistrictRuntime } from './game';
import type { NeonDistrictAudioDirector } from './game/audio';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root not found');
}

const launchParams = new URLSearchParams(window.location.search);
const showcaseMode = launchParams.get('showcase') === '1';
const reviewMode = launchParams.get('review') === '1' || showcaseMode;
const reviewSlice = launchParams.get('reviewSlice');
const showcaseReviewMode = showcaseMode || (reviewMode && reviewSlice === 'authored');
const bossReviewMode = reviewMode && reviewSlice === 'boss';
const hazardReviewMode = reviewMode && reviewSlice === 'hazard';
const autostartMode = launchParams.get('autostart') === '1' || showcaseMode;
const legacySkipBriefing = launchParams.get('skipBriefing') === '1';
const hotDropMode = launchParams.get('hotDrop') === '1';
const requestedContractId = launchParams.get('contract');

const getReviewSeedContractId = (): ContractId => {
  if (showcaseMode || reviewSlice === 'authored') {
    return 'choir-heist';
  }

  if (reviewSlice === 'boss') {
    return 'glassfall-siege';
  }

  if (reviewSlice === 'hazard') {
    return 'redline-blackout';
  }

  return 'ghostline-run';
};

const reviewSeedContractId = getReviewSeedContractId();

if (launchParams.get('resetProgress') === '1') {
  resetCampaignState();
}

app.innerHTML = `
  <div class="shell">
    <div class="briefing-overlay" id="briefingOverlay">
      <div class="briefing-panel">
        <div class="eyebrow">Phase Two Browser Slice</div>
        <div class="briefing-grid">
          <section class="briefing-hero">
            <p class="briefing-kicker" id="briefingKicker">Contract network // Vanta Stack</p>
            <h1>Neon District</h1>
            <p class="briefing-copy" id="briefingCopy">
              The district is open for repeat contracts now. Pick the lane, fit the augment,
              watch faction pressure climb, and turn the combat slice into the start of a real campaign loop.
            </p>
            <div class="briefing-tags">
              <span id="briefingMissionTypeTag">Data theft</span>
              <span id="briefingZoneTag">Vanta Stack // Relay Yard</span>
              <span id="briefingUnlockTag">Open contract</span>
            </div>
          </section>

          <div class="briefing-stack">
            <section class="briefing-card">
              <div class="eyebrow">Contract board</div>
              <h2>Open contracts</h2>
              <div class="contract-board" id="contractBoard"></div>
            </section>

            <section class="briefing-card">
              <div class="eyebrow">Loadout</div>
              <h2>Starting kit</h2>
              <div class="loadout-grid" id="loadoutGrid">
                <button class="loadout-option is-active" data-weapon="volley" type="button">
                  <strong>VX-9 Volley Rifle</strong>
                  <span>Balanced lane-control rifle for clean opening pressure.</span>
                </button>
                <button class="loadout-option" data-weapon="scatter" type="button">
                  <strong>HX-5 Scattergun</strong>
                  <span>Short-range breach tool for contracts that want you up close.</span>
                </button>
                <button class="loadout-option" data-weapon="rail" type="button">
                  <strong>ARC-12 Rail Lance</strong>
                  <span>Shield-puncture option for elites, snipers, and long lanes.</span>
                </button>
              </div>
            </section>

            <section class="briefing-card">
              <div class="eyebrow">Armory</div>
              <h2>Permanent tuning</h2>
              <div class="armory-grid" id="armoryGrid"></div>
            </section>

            <section class="briefing-card">
              <div class="eyebrow">Cyberware</div>
              <h2>Augment slot</h2>
              <div class="cyberware-grid" id="cyberwareGrid"></div>
            </section>

            <section class="briefing-card">
              <div class="eyebrow">Ops deck</div>
              <h2>Campaign state</h2>
              <div class="campaign-grid" id="campaignSnapshot"></div>
              <div class="faction-ledger" id="factionLedger"></div>
            </section>

            <section class="briefing-card">
              <div class="eyebrow">Options</div>
              <h2>Session setup</h2>
              <div class="option-list">
                <label class="option-toggle">
                  <input id="briefingStartMuted" type="checkbox" />
                  <span>Start muted until you toggle audio on.</span>
                </label>
                <label class="option-toggle">
                  <input id="briefingHideIntel" type="checkbox" />
                  <span>Enter with the intel dock collapsed for cleaner screenshots.</span>
                </label>
              </div>
              <p class="briefing-note" id="briefingNote">
                Phase Two progression saves locally in your browser. Add <code>?resetProgress=1</code> to the URL if you want a clean campaign review.
              </p>
            </section>
          </div>
        </div>

        <div class="briefing-actions">
          <button class="control-button control-button--alt" id="hotDropButton" type="button">Hot Drop</button>
          <button class="control-button" id="beginContractButton" type="button">Enter District</button>
        </div>
      </div>
    </div>

    <header class="top-ribbon">
      <div class="title-stack">
        <div class="eyebrow">Browser Vertical Slice // Contract Network</div>
        <h1>Neon District</h1>
        <p class="status-ticker" id="statusTicker">District quiet. Contract board live.</p>
      </div>

      <div class="ops-rail">
        <div class="ops-chip">
          <span>Bank</span>
          <strong id="bankTicker">0c</strong>
        </div>
        <div class="ops-chip">
          <span>Victories</span>
          <strong id="victoryTicker">0</strong>
        </div>
        <div class="ops-chip">
          <span>Heat</span>
          <strong id="heatTicker">0</strong>
        </div>
      </div>

      <div class="run-actions">
        <button class="control-button control-button--ghost" id="toggleIntelButton" type="button">Hide Intel</button>
        <button class="control-button control-button--alt" id="activateSweepButton" type="button">Activate Sweep</button>
        <button class="control-button" id="restartRunButton" type="button">Reset Contract</button>
        <button class="audio-toggle" id="audioToggleButton" type="button" aria-pressed="false">Audio On</button>
      </div>
    </header>

    <div class="game-shell" id="gameShell">
      <div class="game-frame">
        <section class="tactical-banner">
          <div class="eyebrow">Tactical guide</div>
          <strong id="tutorialTitle">Ghost the lanes</strong>
          <p id="tutorialBody">Use WASD to move through the district and read the cover rhythm before you light the contract up.</p>
          <div class="meter meter--tutorial"><span id="tutorialMeter"></span></div>
          <div class="banner-row">
            <span id="tutorialStepValue">1 / 6</span>
            <strong id="tutorialStatus">Recon onboarding</strong>
          </div>
        </section>

        <div id="game-root" class="game-root" tabindex="0"></div>

        <section class="mission-summary" id="missionSummary" aria-hidden="true" hidden>
          <div class="eyebrow" id="summaryEyebrow">Contract outcome</div>
          <h2 id="summaryTitle">Contract complete</h2>
          <p id="summaryBody">The route held and the payout cleared.</p>
          <div class="summary-grid">
            <div class="summary-stat"><span>Outcome</span><strong id="summaryOutcomeValue">Success</strong></div>
            <div class="summary-stat"><span>Runtime</span><strong id="summaryTimeValue">00:00</strong></div>
            <div class="summary-stat"><span>Kills</span><strong id="summaryKillsValue">0</strong></div>
            <div class="summary-stat"><span>Score</span><strong id="summaryScoreValue">0</strong></div>
            <div class="summary-stat"><span>Run credits</span><strong id="summaryRunCreditsValue">0c</strong></div>
            <div class="summary-stat"><span>Bank</span><strong id="summaryBankValue">0c</strong></div>
          </div>
          <div class="summary-meta">
            <div class="summary-line"><span>Faction shift</span><strong id="summaryFactionValue">No change</strong></div>
            <div class="summary-line"><span>Elite</span><strong id="summaryEliteValue">No elite attached</strong></div>
            <div class="summary-line"><span>Unlocks</span><strong id="summaryUnlocksValue">No new unlocks</strong></div>
          </div>
          <div class="summary-actions">
            <button class="control-button" id="summaryReplayButton" type="button">Run Another Contract</button>
            <button class="control-button control-button--ghost" id="summaryBriefingButton" type="button">Back to Briefing</button>
          </div>
        </section>

        <section class="hud-panel hud-panel--left">
          <div class="hud-chip">
            <span class="hud-chip__label">District</span>
            <strong id="districtName">Neon District // Vanta Stack</strong>
            <span id="districtStatus">District quiet. Contract board live.</span>
          </div>
          <div class="meter-block">
            <div class="meter-row"><span>Health</span><strong id="healthValue">100 / 100</strong></div>
            <div class="meter"><span id="healthMeter"></span></div>
          </div>
          <div class="meter-block">
            <div class="meter-row"><span>Shield</span><strong id="shieldValue">75 / 75</strong></div>
            <div class="meter meter--shield"><span id="shieldMeter"></span></div>
          </div>
          <div class="meter-grid">
            <div class="meter-block meter-block--compact">
              <div class="meter-row"><span>Energy</span><strong id="energyValue">100 / 100</strong></div>
              <div class="meter meter--energy"><span id="energyMeter"></span></div>
            </div>
            <div class="meter-block meter-block--compact">
              <div class="meter-row"><span>Heat</span><strong id="heatValue">0%</strong></div>
              <div class="meter meter--heat"><span id="heatMeter"></span></div>
            </div>
          </div>
        </section>

        <section class="hud-panel hud-panel--right">
          <div class="mission-card">
            <div class="eyebrow">Current objective</div>
            <h2 id="missionTitle">Walk Vanta Stack</h2>
            <p id="missionDetail">Move through the district, read the lanes, and get ready to light the contract.</p>
            <div class="meter-row mission-row"><span id="missionStatus">Recon mode</span><strong id="missionProgressValue">0%</strong></div>
            <div class="meter meter--mission"><span id="missionMeter"></span></div>
          </div>
          <div class="narrative-card">
            <div class="eyebrow">Encounter stack</div>
            <div class="intel-kv"><span>Cyberware</span><strong id="cyberwareTitleValue">Subdermal Mesh</strong></div>
            <div class="intel-kv"><span>Armory</span><strong id="armoryStatusValue">Stock calibration</strong></div>
            <div class="intel-kv"><span>Elite</span><strong id="eliteStatusValue">No elite on route</strong></div>
            <div class="intel-kv"><span>Hazards</span><strong id="hazardStatusValue">Pressure-only route</strong></div>
            <p id="eliteDetailValue">This contract is a baseline route check with no elite attached.</p>
          </div>
        </section>

        <section class="hud-panel hud-panel--bottom">
          <div class="stat-cluster">
            <div class="stat"><span>Threat</span><strong id="threatValue">0</strong></div>
            <div class="stat"><span>Stage</span><strong id="stageValue">Recon</strong></div>
            <div class="stat"><span>Kills</span><strong id="killsValue">0</strong></div>
            <div class="stat"><span>Score</span><strong id="scoreValue">0</strong></div>
            <div class="stat"><span>Credits</span><strong id="creditsValue">0</strong></div>
            <div class="stat"><span>Weapon</span><strong id="weaponValue">Volley</strong></div>
            <div class="stat"><span>Hostiles</span><strong id="enemyCountValue">0</strong></div>
          </div>
          <div class="controls-card">
            <div class="eyebrow">Quick tips</div>
            <ul>
              <li><strong>Move:</strong> WASD</li>
              <li><strong>Aim + fire:</strong> mouse</li>
              <li><strong>Dash:</strong> Shift or Space</li>
              <li><strong>Swap weapon:</strong> Q / E</li>
              <li><strong>Retry:</strong> R or Reset Contract</li>
            </ul>
          </div>
        </section>
      </div>

      <aside class="side-dossier" id="intelPanel">
        <div class="dossier-card dossier-card--contract">
          <div class="eyebrow">Contract</div>
          <h2 id="dossierContractTitle">Morrow Relay Recovery</h2>
          <p id="dossierContractCopy">
            Hold the courier lane long enough to restore the uplink, strip a little profit out of the kill zone,
            and leave before the district hard-seals.
          </p>
          <div class="intel-kv"><span>Client</span><strong id="dossierClientValue">Morrow Relay Co-op</strong></div>
          <div class="intel-kv"><span>Zone</span><strong id="dossierZoneValue">Vanta Stack // Relay Yard</strong></div>
          <div class="intel-kv"><span>Threat</span><strong id="dossierThreatValue">Helix retention screens</strong></div>
          <ul class="intel-list" id="dossierObjectiveList"></ul>
        </div>

        <div class="dossier-card dossier-card--intel">
          <div class="eyebrow">Street intel</div>
          <h2 id="intelHeadline">Recon window open</h2>
          <p id="intelBody">Move around, read the chokepoints, then trigger the sweep when you want live pressure.</p>
          <ul class="intel-list">
            <li><strong>Weapon profile:</strong> <span id="weaponDetailValue">Balanced corp carbine for mobile lane control.</span></li>
            <li><strong>Threat profile:</strong> <span id="threatDetailValue">Quiet stack. No contact yet.</span></li>
            <li><strong>Runtime:</strong> <span id="timeValue">00:00</span></li>
          </ul>
        </div>

        <div class="dossier-card dossier-card--controls">
          <div class="eyebrow">Campaign pressure</div>
          <div class="intel-kv"><span>Selected ware</span><strong id="dossierCyberwareValue">Subdermal Mesh</strong></div>
          <div class="intel-kv"><span>Client rep</span><strong id="dossierRepValue">0</strong></div>
          <div class="intel-kv"><span>Hostile heat</span><strong id="dossierHeatValue">0</strong></div>
          <p id="dossierFactionBody">
            The district remembers what you hit. Clean extractions build client trust and make hostile lanes run hotter on the next contract.
          </p>
        </div>
      </aside>
    </div>
  </div>
`;

const selectorElementCache = new Map<string, HTMLElement>();

function queryCachedElement<T extends HTMLElement>(selector: string) {
  const cached = selectorElementCache.get(selector);
  if (cached) {
    return cached as T;
  }

  const element = document.querySelector<T>(selector);
  if (element) {
    selectorElementCache.set(selector, element);
  }
  return element;
}

function requireElement<T extends HTMLElement>(selector: string) {
  const element = queryCachedElement<T>(selector);
  if (!element) {
    throw new Error(`Required element missing: ${selector}`);
  }
  return element;
}

const gameRoot = requireElement<HTMLElement>('#game-root');
const gameFrame = requireElement<HTMLElement>('.game-frame');
const gameShell = requireElement<HTMLElement>('#gameShell');
const intelPanel = requireElement<HTMLElement>('#intelPanel');
const briefingOverlay = requireElement<HTMLElement>('#briefingOverlay');
const contractBoard = requireElement<HTMLElement>('#contractBoard');
const loadoutGrid = requireElement<HTMLElement>('#loadoutGrid');
const armoryGrid = requireElement<HTMLElement>('#armoryGrid');
const cyberwareGrid = requireElement<HTMLElement>('#cyberwareGrid');
const campaignSnapshot = requireElement<HTMLElement>('#campaignSnapshot');
const factionLedger = requireElement<HTMLElement>('#factionLedger');
const briefingNote = requireElement<HTMLElement>('#briefingNote');
const dossierObjectiveList = requireElement<HTMLElement>('#dossierObjectiveList');
const startMutedCheckbox = requireElement<HTMLInputElement>('#briefingStartMuted');
const hideIntelCheckbox = requireElement<HTMLInputElement>('#briefingHideIntel');
const restartButton = requireElement<HTMLButtonElement>('#restartRunButton');
const activateSweepButton = requireElement<HTMLButtonElement>('#activateSweepButton');
const audioToggleButton = requireElement<HTMLButtonElement>('#audioToggleButton');
const toggleIntelButton = requireElement<HTMLButtonElement>('#toggleIntelButton');
const beginContractButton = requireElement<HTMLButtonElement>('#beginContractButton');
const hotDropButton = requireElement<HTMLButtonElement>('#hotDropButton');
const missionSummary = requireElement<HTMLElement>('#missionSummary');
const summaryReplayButton = requireElement<HTMLButtonElement>('#summaryReplayButton');
const summaryBriefingButton = requireElement<HTMLButtonElement>('#summaryBriefingButton');

const createReviewCampaignState = (): CampaignState => ({
  bankCredits: 1460,
  runs: 4,
  victories: 2,
  highestScore: 18420,
  completedContracts: ['morrow-relay', 'blackout-spine'],
  ownedWeaponUpgrades: ['rail-capacitor'],
  selectedContractId: reviewSeedContractId,
  selectedWeapon: 'rail',
  selectedCyberwareId: 'scrapper-daemon',
  factions: {
    morrow: { reputation: 18, heat: 0 },
    helix: { reputation: -9, heat: 24 },
    glasshouse: { reputation: -4, heat: 18 },
  },
  lastResult: null,
});

type RuntimeBootstrap = {
  runtime: NeonDistrictRuntime;
  audioDirector: NeonDistrictAudioDirector;
};

type PhaserWindow = Window & {
  Phaser?: typeof Phaser;
};

const PHASER_RUNTIME_URL = `${import.meta.env.BASE_URL}vendor/phaser.min.js`;

let runtime: NeonDistrictRuntime | null = null;
let runtimeLoadPromise: Promise<RuntimeBootstrap> | null = null;
let phaserRuntimePromise: Promise<void> | null = null;
let audioDirector: NeonDistrictAudioDirector | null = null;
let campaign = reviewMode ? createReviewCampaignState() : loadCampaignState();
let selectedContractId: ContractId = campaign.selectedContractId;
let selectedCyberwareId: CyberwareId = campaign.selectedCyberwareId;
let selectedWeapon: WeaponType = campaign.selectedWeapon;
let startMutedOnEntry = false;
let startIntelCollapsed = false;
let briefingDismissed = false;
let handledResolution = false;
let latestRunResult: CampaignRunResult | null = null;
let latestSnapshot: HudSnapshot | null = null;

const persistCampaignState = () => {
  if (!reviewMode) {
    saveCampaignState(campaign);
  }
};

const formatTime = (timeSeconds: number) => {
  const total = Math.max(0, Math.floor(timeSeconds));
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const formatCredits = (credits: number) => `${credits.toLocaleString()}c`;

const signedValue = (value: number) => (value > 0 ? `+${value}` : `${value}`);

const describePhase = (phase: string) => {
  switch (phase) {
    case 'reach-terminal':
      return 'Terminal Run';
    case 'hack-terminal':
      return 'Breach';
    case 'hold-upload':
      return 'Hold';
    case 'extract':
      return 'Extraction';
    case 'complete':
      return 'Complete';
    default:
      return 'Recon';
  }
};

const describeWeaponShort = (weaponName: string) => {
  if (weaponName.includes('Rail')) return 'Rail';
  if (weaponName.includes('Scatter')) return 'Scatter';
  if (weaponName.includes('Volley')) return 'Volley';
  return weaponName;
};

const describeThreat = (snapshot: HudSnapshot) => {
  if (snapshot.eliteActive && snapshot.eliteCallsign) {
    return `${snapshot.eliteCallsign} is on the route. Break the elite line before the district locks you into a bad trade.`;
  }
  if (snapshot.activeHazardLabel && snapshot.activeHazardSummary) {
    return `${snapshot.activeHazardLabel} is live. ${snapshot.activeHazardSummary}`;
  }
  if (snapshot.optionalObjectiveState === 'available' && snapshot.optionalObjectiveLabel && snapshot.optionalObjectiveSummary) {
    return `${snapshot.optionalObjectiveLabel} is live. ${snapshot.optionalObjectiveSummary}`;
  }
  if (snapshot.optionalObjectiveState === 'completed' && snapshot.optionalObjectiveLabel) {
    return `${snapshot.optionalObjectiveLabel} secured. Extract clean and the ledger leaves with proof, not just theft.`;
  }
  if (snapshot.victory) return 'Contract closed clean. The route held and the lift got you out.';
  if (snapshot.gameOver) return 'Run flatlined. Reset the contract and drive the lane harder on the next pass.';
  if (!snapshot.combatActive) return 'Quiet stack. No contact yet.';
  if (snapshot.threatLevel >= 78) return 'Kill zone unstable. Brutes and shields are forcing angles.';
  if (snapshot.threatLevel >= 48) return 'Contact thickening. Keep moving through cover lines.';
  return 'Opening sweep. You still own the pace.';
};

const describeUnlockState = (contract: ContractDefinition) => {
  if (contract.unlockVictories === 0) return 'Open contract';
  return `Unlocks after ${contract.unlockVictories} extraction${contract.unlockVictories === 1 ? '' : 's'}`;
};

const describeContractDebrief = (contract: ContractDefinition, summaryResult: CampaignRunResult) => {
  if (contract.id === 'choir-heist') {
    if (summaryResult.victory) {
      return summaryResult.optionalObjectiveCompleted
        ? 'Morrow left Choir Exchange with the dead-signal ledger and the ghost archive shard intact. Glasshouse did not just lose the bridge receipt; it lost the witness cache that kept the takeover deniable, and the district will feel that failure by morning.'
        : 'Morrow got the ledger off the signal bridge before the erase teams sealed the skyline. Glasshouse still lost the route proof, but the missing witness cache means Choir Exchange gets a hot victory instead of a total expose.'
    }

    return summaryResult.optionalObjectiveCompleted
      ? 'You cracked the witness cache, but Glasshouse killed the skyhook window before the proof could leave clean. For one bright minute the bridge had a voice, then the district watched it get strangled back into escrow.'
      : 'Glasshouse shut the skyhook and forced the ledger back under escrow before Morrow could move it. Choir Exchange remembers the miss as another night where the bridge stayed bought and the witnesses stayed buried.';
  }

  return summaryResult.victory
    ? 'The route held and the payout pushed your campaign forward.'
    : 'You kept what scrap you could, but the client will remember the miss and the hostile lane still got hotter.';
};

const setText = (selector: string, value: string) => {
  const element = queryCachedElement(selector);
  if (element && element.textContent !== value) {
    element.textContent = value;
  }
};

const setWidth = (selector: string, value: number, max: number) => {
  const element = queryCachedElement(selector);
  if (element) {
    const clampedMax = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
    const width = `${clampedMax}%`;
    if (element.style.width !== width) {
      element.style.width = width;
    }
  }
};

const getSelectedContract = () => CONTRACTS_BY_ID[selectedContractId];
const getSelectedCyberware = () => CYBERWARE_BY_ID[selectedCyberwareId];
const getOwnedUpgradeForWeapon = (weapon: WeaponType) => WEAPON_UPGRADES.find(
  (upgrade) => upgrade.weapon === weapon && campaign.ownedWeaponUpgrades.includes(upgrade.id),
) ?? null;

const persistSelections = () => {
  campaign = {
    ...campaign,
    selectedContractId,
    selectedCyberwareId,
    selectedWeapon,
  };
  persistCampaignState();
};

const getPreviewCampaignState = (): CampaignState => ({
  ...campaign,
  selectedContractId,
  selectedCyberwareId,
  selectedWeapon,
});

const renderContractBoard = () => {
  contractBoard.innerHTML = CONTRACTS.map((contract) => {
    const unlocked = isContractUnlocked(campaign, contract.id);
    const active = contract.id === selectedContractId;
    const client = FACTION_DETAILS[contract.clientFaction];
    const featuredLabel = contract.featuredLabel
      ? `<span class="contract-option__badge">${contract.featuredLabel}</span>`
      : '';
    return `
      <button class="contract-option${active ? ' is-active' : ''}${unlocked ? '' : ' is-locked'}" data-contract="${contract.id}" type="button" ${unlocked ? '' : 'disabled'}>
        <div class="contract-option__header">
          <div class="contract-option__title-row">
            <strong>${contract.title}</strong>
            ${featuredLabel}
          </div>
          <span>${contract.missionType}</span>
        </div>
        <p>${contract.routeNotes}</p>
        <div class="contract-option__meta">
          <span>${contract.zone}</span>
          <span>${formatCredits(contract.basePayout)}</span>
          <span style="color:${client.accent}">${client.shortName}</span>
          <span>${contract.elite?.callsign ?? 'No elite'}</span>
        </div>
      </button>
    `;
  }).join('');
};

const renderCyberwareBoard = () => {
  cyberwareGrid.innerHTML = CYBERWARE_OPTIONS.map((option) => {
    const unlocked = isCyberwareUnlocked(campaign, option.id);
    const active = option.id === selectedCyberwareId;
    return `
      <button class="cyberware-option${active ? ' is-active' : ''}${unlocked ? '' : ' is-locked'}" data-cyberware="${option.id}" type="button" ${unlocked ? '' : 'disabled'}>
        <div class="cyberware-option__header">
          <strong>${option.title}</strong>
          <span>${option.slotLabel}</span>
        </div>
        <p>${option.summary}</p>
        <div class="cyberware-option__footer">
          <span>${option.detail}</span>
          <span>${unlocked ? 'Unlocked' : `Locked until ${option.unlockVictories} extraction${option.unlockVictories === 1 ? '' : 's'}`}</span>
        </div>
      </button>
    `;
  }).join('');
};

const renderArmoryBoard = () => {
  armoryGrid.innerHTML = WEAPON_UPGRADES.map((upgrade) => {
    const owned = campaign.ownedWeaponUpgrades.includes(upgrade.id);
    const active = owned && upgrade.weapon === selectedWeapon;
    const affordable = campaign.bankCredits >= upgrade.cost;
    const actionLabel = owned
      ? active ? 'Installed on current loadout' : 'Owned'
      : affordable ? `Buy ${formatCredits(upgrade.cost)}` : `Need ${formatCredits(upgrade.cost)}`;

    return `
      <button class="armory-option${active ? ' is-active' : ''}${owned ? ' is-owned' : ''}${!owned && !affordable ? ' is-locked' : ''}" data-armory="${upgrade.id}" type="button" ${owned || affordable ? '' : 'disabled'}>
        <div class="armory-option__header">
          <strong>${upgrade.title}</strong>
          <span>${upgrade.slotLabel}</span>
        </div>
        <p>${upgrade.summary}</p>
        <div class="armory-option__footer">
          <span>${upgrade.detail}</span>
          <span>${actionLabel}</span>
        </div>
      </button>
    `;
  }).join('');
};

const renderCampaignSnapshot = () => {
  campaignSnapshot.innerHTML = `
    <div class="campaign-stat"><span>Bank</span><strong>${formatCredits(campaign.bankCredits)}</strong></div>
    <div class="campaign-stat"><span>Victories</span><strong>${campaign.victories}</strong></div>
    <div class="campaign-stat"><span>Closed contracts</span><strong>${campaign.completedContracts.length} / ${CONTRACTS.length}</strong></div>
    <div class="campaign-stat"><span>Armory fits</span><strong>${campaign.ownedWeaponUpgrades.length} / ${WEAPON_UPGRADES.length}</strong></div>
    <div class="campaign-stat"><span>High score</span><strong>${campaign.highestScore.toLocaleString()}</strong></div>
  `;
};

const renderFactionLedger = () => {
  const contract = getSelectedContract();
  factionLedger.innerHTML = Object.entries(FACTION_DETAILS).map(([factionKey, details]) => {
    const standing = campaign.factions[factionKey as keyof typeof campaign.factions];
    const isFocus = factionKey === contract.clientFaction || factionKey === contract.hostileFaction;
    const reputationWidth = Math.max(2, Math.min(100, ((standing.reputation + 100) / 200) * 100));
    const heatWidth = Math.max(0, Math.min(100, standing.heat));
    return `
      <div class="faction-row${isFocus ? ' is-focus' : ''}">
        <div class="faction-row__header">
          <strong style="color:${details.accent}">${details.name}</strong>
          <span>Rep ${signedValue(standing.reputation)} // Heat ${standing.heat}</span>
        </div>
        <p>${details.description}</p>
        <div class="faction-bars">
          <div class="faction-bar"><span class="faction-bar__fill faction-bar__fill--rep" style="width:${reputationWidth}%"></span></div>
          <div class="faction-bar faction-bar--heat"><span class="faction-bar__fill faction-bar__fill--heat" style="width:${heatWidth}%"></span></div>
        </div>
      </div>
    `;
  }).join('');
};

const syncLoadoutButtons = () => {
  loadoutGrid.querySelectorAll<HTMLElement>('[data-weapon]').forEach((option) => {
    option.classList.toggle('is-active', option.dataset.weapon === selectedWeapon);
  });
};

const renderContractCopy = () => {
  const contract = getSelectedContract();
  const cyberware = getSelectedCyberware();
  const armoryUpgrade = getOwnedUpgradeForWeapon(selectedWeapon);
  const clientStanding = campaign.factions[contract.clientFaction];
  const hostileStanding = campaign.factions[contract.hostileFaction];
  setText('#briefingKicker', `${contract.title} // ${contract.zone}`);
  setText('#briefingCopy', contract.briefing);
  setText('#briefingMissionTypeTag', contract.missionType);
  setText('#briefingZoneTag', contract.zone);
  setText('#briefingUnlockTag', contract.featuredLabel ? `${contract.featuredLabel} // ${describeUnlockState(contract)}` : describeUnlockState(contract));
  setText('#dossierContractTitle', contract.title);
  setText('#dossierContractCopy', contract.briefing);
  setText('#dossierClientValue', contract.client);
  setText('#dossierZoneValue', contract.zone);
  setText('#dossierThreatValue', contract.threatLabel);
  dossierObjectiveList.innerHTML = [
    ...contract.objectives.map((objective) => `<li>${objective}</li>`),
    ...(contract.optionalObjective ? [`<li><strong>Optional:</strong> ${contract.optionalObjective.summary} <span>${contract.optionalObjective.rewardLabel}</span></li>`] : []),
  ].join('');
  setText('#cyberwareTitleValue', cyberware.title);
  setText('#armoryStatusValue', armoryUpgrade ? armoryUpgrade.title : 'Stock calibration');
  setText('#hazardStatusValue', contract.hazards?.length ? `${contract.hazards.length} hazard window${contract.hazards.length === 1 ? '' : 's'}` : 'Pressure-only route');
  setText('#dossierCyberwareValue', cyberware.title);
  setText('#dossierRepValue', signedValue(clientStanding.reputation));
  setText('#dossierHeatValue', `${hostileStanding.heat}`);
  setText('#dossierFactionBody', `${FACTION_DETAILS[contract.clientFaction].shortName} is your client on this route. ${FACTION_DETAILS[contract.hostileFaction].shortName} heat is already at ${hostileStanding.heat}, so expect the next run to stay meaner for longer.`);
  setText('#bankTicker', formatCredits(campaign.bankCredits));
  setText('#victoryTicker', `${campaign.victories}`);
  setText('#heatTicker', `${campaign.factions[contract.hostileFaction].heat}`);
};

const renderBriefingUi = () => {
  renderContractBoard();
  renderArmoryBoard();
  renderCyberwareBoard();
  renderCampaignSnapshot();
  renderFactionLedger();
  renderContractCopy();
  syncLoadoutButtons();
  renderBriefingNote();
};

const setIntelCollapsed = (collapsed: boolean) => {
  gameShell.classList.toggle('game-shell--intel-collapsed', collapsed);
  intelPanel.setAttribute('aria-hidden', collapsed ? 'true' : 'false');
  toggleIntelButton.textContent = collapsed ? 'Show Intel' : 'Hide Intel';
};

const focusGameRoot = () => {
  try {
    gameRoot.focus({ preventScroll: true });
  } catch {
    gameRoot.focus();
  }
};

const focusBriefingEntry = () => {
  try {
    beginContractButton.focus({ preventScroll: true });
  } catch {
    beginContractButton.focus();
  }
};

const focusVisibleChrome = () => {
  try {
    toggleIntelButton.focus({ preventScroll: true });
  } catch {
    toggleIntelButton.focus();
  }
};

const renderBriefingNote = () => {
  briefingNote.innerHTML = reviewMode
    ? showcaseMode
      ? 'Showcase route active. <code>?showcase=1</code> jumps straight into the featured Dead Signal Choir Heist demo lane while keeping progress non-persistent.'
      : hazardReviewMode
        ? 'Hazard review slice active. <code>?review=1&reviewSlice=hazard</code> loads the Redline Blackout Run shell, and <code>?autostart=1&review=1&reviewSlice=hazard</code> enters that slice immediately.'
      : bossReviewMode
        ? 'Boss review slice active. <code>?review=1&reviewSlice=boss</code> loads the Glassfall Nullbreaker Siege shell, and <code>?autostart=1&review=1&reviewSlice=boss</code> enters that slice immediately.'
      : showcaseReviewMode
        ? 'Authored review slice active. <code>?review=1&reviewSlice=authored</code> loads the featured Dead Signal Choir Heist shell, and <code>?autostart=1&review=1&reviewSlice=authored</code> enters that slice immediately.'
      : 'Review seed active. <code>?review=1</code> opens a deterministic non-persistent campaign state, and <code>?autostart=1&review=1</code> enters the district immediately for manager review captures.'
    : 'Phase Two progression saves locally in your browser. Add <code>?resetProgress=1</code> to the URL if you want a clean campaign review.';
};

const setEntryLoadingState = (loading: boolean) => {
  beginContractButton.disabled = loading;
  hotDropButton.disabled = loading;
  beginContractButton.textContent = loading ? 'Booting District...' : 'Enter District';
  hotDropButton.textContent = loading ? 'Preparing Drop...' : 'Hot Drop';
  if (loading) {
    briefingNote.innerHTML = reviewMode
      ? showcaseMode
        ? 'Booting the showcase lane and district runtime...'
        : hazardReviewMode
        ? 'Booting the hazard review slice and district runtime...'
        : bossReviewMode
        ? 'Booting the boss review slice and district runtime...'
        : showcaseReviewMode
        ? 'Booting the featured authored review slice and district runtime...'
        : 'Booting the deterministic review seed and district runtime...'
      : 'Booting the district runtime and stitching the contract shell into the arena...';
  } else {
    renderBriefingNote();
  }
};

const updateAudioButton = () => {
  const muted = audioDirector ? audioDirector.isMuted() : startMutedOnEntry;
  audioToggleButton.textContent = muted ? 'Audio Off' : 'Audio On';
  audioToggleButton.setAttribute('aria-pressed', muted ? 'true' : 'false');
};

const unlockAudio = () => {
  if (!audioDirector) return;
  audioDirector.unlock();
  updateAudioButton();
};

const handleHudUpdate = (snapshot: HudSnapshot) => {
  latestSnapshot = snapshot;
  audioDirector?.sync(snapshot);

  if (snapshot.contractResolved && !handledResolution) {
    const { nextState, result } = resolveCampaignRun(campaign, {
      contract: getSelectedContract(),
      cyberware: getSelectedCyberware(),
      victory: snapshot.victory,
      runtimeSeconds: snapshot.timeSeconds,
      kills: snapshot.kills,
      score: snapshot.score,
      scavengedCredits: snapshot.credits,
      stageLabel: describePhase(snapshot.objectivePhase),
      eliteDefeated: snapshot.eliteDefeated,
      optionalObjectiveCompleted: snapshot.optionalObjectiveState === 'completed',
      optionalObjectiveLabel: snapshot.optionalObjectiveLabel,
      optionalObjectiveRewardCredits: snapshot.optionalObjectiveRewardCredits,
      optionalObjectiveReputationBonus: snapshot.optionalObjectiveReputationBonus,
    });
    campaign = nextState;
    selectedContractId = campaign.selectedContractId;
    selectedCyberwareId = campaign.selectedCyberwareId;
    selectedWeapon = campaign.selectedWeapon;
    latestRunResult = result;
    handledResolution = true;
    crazyGameplayStop();
    if (snapshot.victory) {
      crazyHappytime();
    }
    persistCampaignState();
    renderBriefingUi();
  } else if (!snapshot.contractResolved) {
    handledResolution = false;
    latestRunResult = null;
  }

  const contract = getSelectedContract();
  const cyberware = getSelectedCyberware();
  const summaryResult = snapshot.contractResolved ? latestRunResult : null;
  const unlockLabels = summaryResult
    ? [
      ...summaryResult.unlocks.map((unlockId) => CYBERWARE_BY_ID[unlockId].title),
      ...summaryResult.contractUnlocks.map((unlockId) => CONTRACTS_BY_ID[unlockId].title),
    ]
    : [];
  const optionalOutcomeText = summaryResult?.optionalObjectiveLabel
    ? summaryResult.optionalObjectiveCompleted
      ? `${summaryResult.optionalObjectiveLabel} cleared for ${formatCredits(summaryResult.optionalObjectiveRewardCredits)} and ${signedValue(summaryResult.optionalObjectiveReputationBonus)} ${FACTION_DETAILS[summaryResult.clientFaction].shortName} rep.`
      : `${summaryResult.optionalObjectiveLabel} was left dark and the main route closed without the bonus shard.`
    : '';

  setText('#districtName', snapshot.districtName);
  setText('#districtStatus', snapshot.victory ? 'Contract complete' : snapshot.gameOver ? 'Run flatlined' : snapshot.districtStatus);
  setText('#statusTicker', snapshot.victory ? `${snapshot.contractTitle} // Extraction clean` : snapshot.gameOver ? `${snapshot.contractTitle} // Route collapsed` : `${snapshot.districtStatus} // ${snapshot.tutorial.status}`);
  setText('#healthValue', `${Math.round(snapshot.health)} / ${snapshot.maxHealth}`);
  setWidth('#healthMeter', snapshot.health, snapshot.maxHealth);
  setText('#shieldValue', `${Math.round(snapshot.shield)} / ${snapshot.maxShield}`);
  setWidth('#shieldMeter', snapshot.shield, snapshot.maxShield);
  setText('#energyValue', `${Math.round(snapshot.energy)} / ${snapshot.maxEnergy}`);
  setWidth('#energyMeter', snapshot.energy, snapshot.maxEnergy);
  setText('#heatValue', snapshot.overheated ? `OVERHEAT ${Math.round(snapshot.weaponHeat)}%` : `${Math.round(snapshot.weaponHeat)}%`);
  setWidth('#heatMeter', snapshot.weaponHeat, 100);
  setText('#missionTitle', snapshot.mission.title);
  setText('#missionDetail', snapshot.mission.detail);
  setText('#missionStatus', snapshot.mission.status);
  setText('#missionProgressValue', `${Math.round(snapshot.mission.progress)}%`);
  setWidth('#missionMeter', snapshot.mission.progress, 100);
  setText('#tutorialTitle', snapshot.tutorial.title);
  setText('#tutorialBody', snapshot.tutorial.body);
  setText('#tutorialStepValue', `${snapshot.tutorial.step} / ${snapshot.tutorial.totalSteps}`);
  setText('#tutorialStatus', snapshot.tutorial.completed ? 'Contract tutorial complete' : snapshot.tutorial.status);
  setWidth('#tutorialMeter', snapshot.tutorial.progress, 100);
  setText('#threatValue', `${Math.round(snapshot.threatLevel)}`);
  setText('#stageValue', describePhase(snapshot.objectivePhase));
  setText('#killsValue', `${snapshot.kills}`);
  setText('#scoreValue', `${snapshot.score.toLocaleString()}`);
  setText('#creditsValue', `${snapshot.credits.toLocaleString()}`);
  setText('#weaponValue', describeWeaponShort(snapshot.weaponName));
  setText('#enemyCountValue', `${snapshot.enemyCount}`);
  setText('#intelHeadline', snapshot.mission.title);
  setText('#intelBody', snapshot.districtSummary);
  setText('#weaponDetailValue', snapshot.weaponDetail);
  setText('#threatDetailValue', describeThreat(snapshot));
  setText('#timeValue', formatTime(snapshot.timeSeconds));
  setText('#cyberwareTitleValue', cyberware.title);
  setText('#armoryStatusValue', snapshot.weaponUpgradeTitle ?? 'Stock calibration');
  setText('#eliteStatusValue', snapshot.eliteActive && snapshot.eliteCallsign ? `${snapshot.eliteCallsign} // ${Math.max(1, Math.round((snapshot.eliteHealth / Math.max(snapshot.eliteMaxHealth, 1)) * 100))}%` : snapshot.eliteDefeated ? `${snapshot.eliteCallsign ?? 'Elite'} down` : contract.elite ? `${contract.elite.callsign} scheduled` : 'No elite on route');
  setText('#hazardStatusValue', snapshot.activeHazardLabel ? `${snapshot.activeHazardLabel} // ${snapshot.activeHazardCount}` : contract.hazards?.length ? `${contract.hazards.length} hazard window${contract.hazards.length === 1 ? '' : 's'}` : 'Pressure-only route');
  setText('#eliteDetailValue', snapshot.eliteActive && snapshot.eliteCallsign ? `${snapshot.eliteCallsign} has the lane. Break the line and keep moving.` : snapshot.eliteDefeated ? 'The route is still hot, but the elite pressure is gone.' : contract.elite ? contract.elite.intro : 'This contract is a cleaner route check with no elite attached.');
  setText('#summaryEyebrow', summaryResult?.victory ? 'Contract complete' : summaryResult ? 'Contract failed' : 'Contract outcome');
  setText('#summaryTitle', summaryResult?.victory ? `${summaryResult.contractTitle} closed` : summaryResult ? `${summaryResult.contractTitle} lost` : 'Contract live');
  setText('#summaryBody', summaryResult
    ? `${describeContractDebrief(contract, summaryResult)} ${unlockLabels.length > 0 ? `New unlocks came online as the district reacted. ` : ''}${optionalOutcomeText}`.trim()
    : snapshot.districtSummary);
  setText('#summaryOutcomeValue', summaryResult ? (summaryResult.victory ? 'Success' : 'Failure') : 'Live');
  setText('#summaryTimeValue', formatTime(summaryResult?.runtimeSeconds ?? snapshot.timeSeconds));
  setText('#summaryKillsValue', `${summaryResult?.kills ?? snapshot.kills}`);
  setText('#summaryScoreValue', `${(summaryResult?.score ?? snapshot.score).toLocaleString()}`);
  setText('#summaryRunCreditsValue', formatCredits(summaryResult?.totalCreditsAwarded ?? 0));
  setText('#summaryBankValue', formatCredits(summaryResult?.bankCredits ?? campaign.bankCredits));
  setText('#summaryFactionValue', summaryResult ? `${signedValue(summaryResult.reputationDelta)} ${FACTION_DETAILS[summaryResult.clientFaction].shortName} rep // +${summaryResult.hostileHeatDelta} ${FACTION_DETAILS[summaryResult.hostileFaction].shortName} heat` : 'No faction shift yet');
  setText('#summaryEliteValue', summaryResult ? contract.elite ? summaryResult.eliteDefeated ? `${contract.elite.callsign} down // bonus secured` : `${contract.elite.callsign} remained on the board` : 'No elite attached' : contract.elite ? contract.elite.callsign : 'No elite attached');
  setText('#summaryUnlocksValue', unlockLabels.length > 0 ? unlockLabels.join(' // ') : 'No new unlocks');
  setText('#bankTicker', formatCredits(campaign.bankCredits));
  setText('#victoryTicker', `${campaign.victories}`);
  setText('#heatTicker', `${campaign.factions[contract.hostileFaction].heat}`);
  setText('#dossierCyberwareValue', cyberware.title);
  setText('#dossierRepValue', signedValue(campaign.factions[contract.clientFaction].reputation));
  setText('#dossierHeatValue', `${campaign.factions[contract.hostileFaction].heat}`);
  setText('#dossierFactionBody', `${FACTION_DETAILS[contract.clientFaction].shortName} trust sits at ${signedValue(campaign.factions[contract.clientFaction].reputation)}. ${FACTION_DETAILS[contract.hostileFaction].shortName} heat is ${campaign.factions[contract.hostileFaction].heat}, so the route is only getting meaner.`);
  restartButton.textContent = snapshot.victory ? 'Run Another Contract' : snapshot.gameOver ? 'Reboot Run' : 'Reset Contract';
  activateSweepButton.disabled = snapshot.combatActive || snapshot.contractResolved;
  activateSweepButton.textContent = snapshot.victory ? 'Contract Complete' : snapshot.gameOver ? 'Sweep Lost' : snapshot.combatActive ? 'Sweep Live' : 'Activate Sweep';
  gameShell.dataset.combat = snapshot.combatActive ? 'true' : 'false';
  gameShell.dataset.gameOver = snapshot.gameOver ? 'true' : 'false';
  gameShell.dataset.victory = snapshot.victory ? 'true' : 'false';
  missionSummary.hidden = !snapshot.contractResolved;
  missionSummary.setAttribute('aria-hidden', snapshot.contractResolved ? 'false' : 'true');
  gameFrame.dataset.summaryOpen = snapshot.contractResolved ? 'true' : 'false';
};

const handleSimulationEvents = (events: SimulationEvent[]) => {
  audioDirector?.handleEvents(events);
};

const ensurePhaserRuntimeLoaded = async () => {
  const phaserWindow = window as PhaserWindow;
  if (phaserWindow.Phaser) {
    return;
  }

  if (!phaserRuntimePromise) {
    phaserRuntimePromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-neon-phaser-runtime="true"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load the local Phaser runtime.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = PHASER_RUNTIME_URL;
      script.async = true;
      script.dataset.neonPhaserRuntime = 'true';
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', () => {
        script.remove();
        reject(new Error(`Failed to load the local Phaser runtime from ${PHASER_RUNTIME_URL}.`));
      }, { once: true });
      document.head.appendChild(script);
    }).then(() => {
      if (!phaserWindow.Phaser) {
        throw new Error('Phaser runtime loaded, but window.Phaser is unavailable.');
      }
    }).catch((error) => {
      phaserRuntimePromise = null;
      throw error;
    });
  }

  return phaserRuntimePromise;
};

const ensureRuntimeLoaded = async (): Promise<RuntimeBootstrap> => {
  if (runtime && audioDirector) {
    return { runtime, audioDirector };
  }

  if (!runtimeLoadPromise) {
    runtimeLoadPromise = (async () => {
      await ensurePhaserRuntimeLoaded();
      const [{ createNeonDistrictGame }, { NeonDistrictAudioDirector: AudioDirectorCtor }] = await Promise.all([
        import('./game'),
        import('./game/audio'),
      ]);

      const nextAudioDirector = new AudioDirectorCtor();
      audioDirector = nextAudioDirector;

      const nextRuntime = createNeonDistrictGame(gameRoot, handleHudUpdate, handleSimulationEvents);
      runtime = nextRuntime;
      applySelectionsToRuntime();
      updateAudioButton();

      if (launchParams.get('debugRuntime') === '1') {
        (window as Window & { __NEON_DISTRICT_RUNTIME__?: NeonDistrictRuntime }).__NEON_DISTRICT_RUNTIME__ = nextRuntime;
      }

      return {
        runtime: nextRuntime,
        audioDirector: nextAudioDirector,
      };
    })().catch((error) => {
      runtime?.destroy();
      runtime = null;
      audioDirector?.destroy();
      audioDirector = null;
      runtimeLoadPromise = null;
      updateAudioButton();
      throw error;
    });
  }

  return runtimeLoadPromise;
};

const applySelectionsToRuntime = () => {
  persistSelections();
  if (!runtime) {
    return;
  }
  runtime.setLoadoutWeapon(selectedWeapon);
  runtime.configureRun(createRunConfig(getPreviewCampaignState()));
};

const showBriefing = () => {
  briefingDismissed = false;
  renderBriefingUi();
  briefingOverlay.classList.remove('is-hidden');
  if (missionSummary.contains(document.activeElement)) {
    focusBriefingEntry();
  }
  missionSummary.hidden = true;
  missionSummary.setAttribute('aria-hidden', 'true');
  gameRoot.blur();
};

const dismissBriefing = async (activateSweep = false, shouldUnlock = true) => {
  setEntryLoadingState(true);
  setText('#statusTicker', reviewMode ? showcaseMode ? 'Booting showcase route.' : hazardReviewMode ? 'Booting hazard review slice.' : bossReviewMode ? 'Booting boss review slice.' : showcaseReviewMode ? 'Booting featured authored review slice.' : 'Booting deterministic review slice.' : 'Booting district runtime.');

  try {
    const { runtime: loadedRuntime, audioDirector: loadedAudioDirector } = await ensureRuntimeLoaded();
    applySelectionsToRuntime();
    loadedAudioDirector.setMuted(startMutedOnEntry);
    setIntelCollapsed(startIntelCollapsed);
    if (!briefingDismissed) {
      briefingDismissed = true;
      briefingOverlay.classList.add('is-hidden');
    }
    if (shouldUnlock) {
      unlockAudio();
    } else {
      updateAudioButton();
    }
    if (activateSweep) {
      loadedRuntime.activateSweep();
    }
    crazyGameplayStart();
    focusGameRoot();
  } catch (error) {
    console.error('Failed to boot Neon District runtime', error);
    setText('#statusTicker', 'District boot failed. Retry entry.');
    briefingNote.textContent = 'District boot failed. Retry entry or refresh the page.';
    briefingOverlay.classList.remove('is-hidden');
  } finally {
    setEntryLoadingState(false);
  }
};

updateAudioButton();
if (!isContractUnlocked(campaign, selectedContractId)) {
  selectedContractId = getFallbackContractId(campaign);
}
if (!isCyberwareUnlocked(campaign, selectedCyberwareId)) {
  selectedCyberwareId = getFallbackCyberwareId(campaign);
}
if (requestedContractId && requestedContractId in CONTRACTS_BY_ID) {
  const contractId = requestedContractId as ContractId;
  if (isContractUnlocked(campaign, contractId)) {
    selectedContractId = contractId;
  }
}
renderBriefingUi();
applySelectionsToRuntime();
setIntelCollapsed(false);

if (autostartMode || legacySkipBriefing || hotDropMode) {
  void dismissBriefing(hotDropMode, false);
}

restartButton.addEventListener('click', () => {
  unlockAudio();
  handledResolution = false;
  latestRunResult = null;
  runtime?.restart();
  crazyGameplayStart();
});
activateSweepButton.addEventListener('click', () => {
  unlockAudio();
  runtime?.activateSweep();
});
audioToggleButton.addEventListener('click', () => {
  if (!audioDirector) {
    startMutedOnEntry = !startMutedOnEntry;
    startMutedCheckbox.checked = startMutedOnEntry;
    updateAudioButton();
    return;
  }
  unlockAudio();
  audioDirector.toggleMute();
  startMutedOnEntry = audioDirector.isMuted();
  startMutedCheckbox.checked = startMutedOnEntry;
  updateAudioButton();
});
toggleIntelButton.addEventListener('click', () => {
  setIntelCollapsed(!gameShell.classList.contains('game-shell--intel-collapsed'));
});
beginContractButton.addEventListener('click', () => {
  void dismissBriefing(false, true);
});
hotDropButton.addEventListener('click', () => {
  void dismissBriefing(true, true);
});
loadoutGrid.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-weapon]');
  const weapon = target?.dataset.weapon as WeaponType | undefined;
  if (!weapon) return;
  selectedWeapon = weapon;
  persistSelections();
  runtime?.setLoadoutWeapon(selectedWeapon);
  renderBriefingUi();
});
armoryGrid.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-armory]');
  const upgradeId = target?.dataset.armory as WeaponUpgradeId | undefined;
  if (!upgradeId) return;
  const nextCampaign = purchaseWeaponUpgrade(campaign, upgradeId);
  if (!nextCampaign) return;
  campaign = nextCampaign;
  persistCampaignState();
  applySelectionsToRuntime();
  renderBriefingUi();
});
contractBoard.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-contract]');
  const contractId = target?.dataset.contract as ContractId | undefined;
  if (!contractId || !isContractUnlocked(campaign, contractId)) return;
  selectedContractId = contractId;
  persistSelections();
  applySelectionsToRuntime();
  renderBriefingUi();
});
cyberwareGrid.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-cyberware]');
  const cyberwareId = target?.dataset.cyberware as CyberwareId | undefined;
  if (!cyberwareId || !isCyberwareUnlocked(campaign, cyberwareId)) return;
  selectedCyberwareId = cyberwareId;
  persistSelections();
  applySelectionsToRuntime();
  renderBriefingUi();
});
startMutedCheckbox.addEventListener('change', () => {
  startMutedOnEntry = startMutedCheckbox.checked;
  audioDirector?.setMuted(startMutedOnEntry);
  updateAudioButton();
});
hideIntelCheckbox.addEventListener('change', () => {
  startIntelCollapsed = hideIntelCheckbox.checked;
});
summaryReplayButton.addEventListener('click', () => {
  unlockAudio();
  handledResolution = false;
  latestRunResult = null;
  runtime?.restart();
  focusGameRoot();
});
summaryBriefingButton.addEventListener('click', () => {
  focusVisibleChrome();
  handledResolution = false;
  latestRunResult = null;
  runtime?.restart();
  showBriefing();
});
window.addEventListener('pointerdown', () => {
  unlockAudio();
}, { once: true });
window.addEventListener('beforeunload', () => {
  audioDirector?.destroy();
  runtime?.destroy();
});

if (latestSnapshot) {
  renderBriefingUi();
}

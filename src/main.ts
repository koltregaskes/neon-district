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
  getCampaignLoadInfo,
  getLockedContracts,
  getLockedCyberware,
  getUnlockedContracts,
  getUnlockedCyberware,
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
const resetProgressRequested = launchParams.get('resetProgress') === '1';

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

if (resetProgressRequested) {
  resetCampaignState();
}

document.documentElement.style.setProperty(
  "--nd-shell-bg",
  `url("${new URL("assets/img/shell-bg.jpg", document.baseURI).href}")`,
);

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
            <section class="capture-docket" aria-label="Hero capture targets">
              <div class="capture-docket__header">
                <div>
                  <span class="eyebrow">Hero capture docket</span>
                  <strong>Stage the review route on purpose</strong>
                </div>
                <p id="captureDocketLead">Three target frames keep the featured route looking curated instead of lucky.</p>
              </div>
              <div class="capture-docket__grid" id="captureDocket"></div>
            </section>
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

            <section class="briefing-card briefing-card--playtest">
              <div class="eyebrow">Outsider pass</div>
              <h2>Playtest script</h2>
              <div class="playtest-grid">
                <div class="playtest-row">
                  <span>Route mode</span>
                  <strong id="playtestModeValue">Live profile // open contract</strong>
                  <p id="playtestModeDetail">Use the shell, not tribal memory: pick one contract, read the objective stack, and only then enter the district.</p>
                </div>
                <div class="playtest-row">
                  <span>First minute</span>
                  <strong id="playtestEntryValue">Walk, aim, dash, then trigger pressure on purpose</strong>
                  <p id="playtestEntryDetail">Start in Recon, check the lane geometry, then use Activate Sweep when you want live combat instead of guessing where the fight starts.</p>
                </div>
                <div class="playtest-row">
                  <span>Pressure check</span>
                  <strong id="playtestPressureValue">Name the first unfair spike fast</strong>
                  <p id="playtestPressureDetail">Once Sweep starts, watch for the first moment the route feels unreadable. If you cannot explain the spike, the pass is not ready to call clean.</p>
                </div>
                <div class="playtest-row">
                  <span>After a wipe</span>
                  <strong id="playtestRecoveryValue">Read the debrief before you retry</strong>
                  <p id="playtestRecoveryDetail">Failures still keep salvage and a named next move. Use Run Another Contract or R after checking what carried forward.</p>
                </div>
              </div>
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

        <section class="capture-directive" aria-live="polite">
          <div class="eyebrow" id="captureDirectiveLabel">Capture target</div>
          <strong id="captureDirectiveValue">Shell promise frame</strong>
          <p id="captureDirectiveDetail">Lead with a clean shell read before the district fills the frame.</p>
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
          <div class="summary-outlook">
            <div class="summary-callout">
              <span>Carry forward</span>
              <strong id="summaryCarryValue">No rewards logged</strong>
              <p id="summaryCarryDetail">Finish a contract to lock rewards and campaign state into the profile.</p>
            </div>
            <div class="summary-callout">
              <span>Losses and tradeoffs</span>
              <strong id="summaryLossValue">No losses logged</strong>
              <p id="summaryLossDetail">Successes keep the route moving; failures should still leave a readable recovery path.</p>
            </div>
            <div class="summary-callout">
              <span>District reaction</span>
              <strong id="summaryPressureValue">No pressure change</strong>
              <p id="summaryPressureDetail">Faction trust and hostile heat will update here after a resolved run.</p>
            </div>
            <div class="summary-callout">
              <span>Best next move</span>
              <strong id="summaryNextMoveValue">Pick the next ladder target</strong>
              <p id="summaryNextMoveDetail">The shell will point at the strongest contract, armory, or cyberware follow-up after each run.</p>
            </div>
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
            <div class="eyebrow">First minute</div>
            <ul>
              <li><strong>Move:</strong> WASD</li>
              <li><strong>Aim + fire:</strong> mouse</li>
              <li><strong>Dash:</strong> Shift or Space</li>
              <li><strong>Swap weapon:</strong> Q / E</li>
              <li><strong>Start clean:</strong> walk the lane in Recon, then trigger Sweep when you are ready</li>
              <li><strong>Retry:</strong> R or Reset Contract</li>
              <li><strong>After a wipe:</strong> read the debrief for carry-forward and next move before re-entering</li>
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
  lastSavedAt: null,
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

type ProgressionTarget = {
  kind: 'contract' | 'cyberware' | 'armory';
  id: string | null;
  title: string;
  state: string;
  detail: string;
  action: string;
  ready: boolean;
  completed: boolean;
};

type RunSummaryCallout = {
  value: string;
  detail: string;
};

const PHASER_RUNTIME_URL = `${import.meta.env.BASE_URL}vendor/phaser.min.js`;

let runtime: NeonDistrictRuntime | null = null;
let runtimeLoadPromise: Promise<RuntimeBootstrap> | null = null;
let phaserRuntimePromise: Promise<void> | null = null;
let audioDirector: NeonDistrictAudioDirector | null = null;
let campaign = reviewMode ? createReviewCampaignState() : loadCampaignState();
let campaignLoadInfo = reviewMode
  ? {
      source: 'fresh' as const,
      detail: 'Review seed active. This shell does not write into the live profile.',
      recovered: false,
      lastSavedAt: null,
    }
  : getCampaignLoadInfo();
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
    campaign = saveCampaignState(campaign);
    campaignLoadInfo = getCampaignLoadInfo();
  }
};

const formatTime = (timeSeconds: number) => {
  const total = Math.max(0, Math.floor(timeSeconds));
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const formatCredits = (credits: number) => `${credits.toLocaleString()}c`;

const formatTimestamp = (value: string | null) => {
  if (!value) return 'No save yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unreadable';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const buildCanonicalShellUrl = (mode: 'live' | 'reset' | 'review') => {
  const url = new URL(window.location.href);
  url.search = '';

  if (mode === 'reset') {
    url.searchParams.set('resetProgress', '1');
  } else if (mode === 'review') {
    url.searchParams.set('review', '1');
  }

  return `${url.pathname}${url.search}`;
};

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

const formatVictoryGap = (requiredVictories: number) => {
  const remaining = Math.max(0, requiredVictories - campaign.victories);
  return remaining === 1 ? '1 more live extraction' : `${remaining} more live extractions`;
};

const getContractProgressionTarget = (): ProgressionTarget => {
  const unlockedContracts = getUnlockedContracts(campaign)
    .filter((contract) => !campaign.completedContracts.includes(contract.id))
    .sort((a, b) => b.unlockVictories - a.unlockVictories || b.basePayout - a.basePayout);
  const readyContract = unlockedContracts.find((contract) => contract.id !== selectedContractId) ?? unlockedContracts[0];

  if (readyContract) {
    return {
      kind: 'contract',
      id: readyContract.id,
      title: readyContract.title,
      state: 'Ready now',
      detail: `${readyContract.missionType}. ${formatCredits(readyContract.basePayout)} base payout and ${FACTION_DETAILS[readyContract.hostileFaction].shortName} pressure on the route.`,
      action: `Deploy this route next to widen the contract ladder without another unlock grind.`,
      ready: true,
      completed: false,
    };
  }

  const nextLockedContract = getLockedContracts(campaign)
    .sort((a, b) => a.unlockVictories - b.unlockVictories || b.basePayout - a.basePayout)[0];

  if (nextLockedContract) {
    return {
      kind: 'contract',
      id: nextLockedContract.id,
      title: nextLockedContract.title,
      state: `Locked // ${formatVictoryGap(nextLockedContract.unlockVictories)}`,
      detail: `${nextLockedContract.missionType}. Opens at ${nextLockedContract.unlockVictories} victories and pays ${formatCredits(nextLockedContract.basePayout)} before bonuses.`,
      action: `Clear ${formatVictoryGap(nextLockedContract.unlockVictories)} to unlock this route.`,
      ready: false,
      completed: false,
    };
  }

  return {
    kind: 'contract',
    id: null,
    title: 'Contract ladder cleared',
    state: 'All routes open',
    detail: 'Every contract is already unlocked. Use the highest-pressure route as the next run target instead of grinding for access.',
    action: 'Push the best open route and use armory or cyberware choices to shape the next attempt.',
    ready: true,
    completed: true,
  };
};

const getPreferredUnlockedCyberware = () => {
  const unlockedAlternatives = getUnlockedCyberware(campaign)
    .filter((option) => option.id !== selectedCyberwareId);
  if (unlockedAlternatives.length === 0) return null;

  const contract = getSelectedContract();
  const priority: CyberwareId[] = [];
  if ((contract.hazards?.length ?? 0) > 0 || campaign.factions[contract.hostileFaction].heat >= 15 || campaign.lastResult?.victory === false) {
    priority.push('blink-weave');
  }
  if (selectedWeapon === 'rail' || selectedWeapon === 'scatter') {
    priority.push('heat-sink');
  }
  if (campaign.bankCredits < 900) {
    priority.push('scrapper-daemon');
  }
  priority.push('mesh', 'heat-sink', 'blink-weave', 'scrapper-daemon');

  return unlockedAlternatives.sort((a, b) => {
    const aRank = priority.indexOf(a.id);
    const bRank = priority.indexOf(b.id);
    const safeARank = aRank === -1 ? Number.MAX_SAFE_INTEGER : aRank;
    const safeBRank = bRank === -1 ? Number.MAX_SAFE_INTEGER : bRank;
    return safeARank - safeBRank || b.unlockVictories - a.unlockVictories;
  })[0];
};

const getCyberwareProgressionTarget = (): ProgressionTarget => {
  const readyCyberware = getPreferredUnlockedCyberware();
  if (readyCyberware) {
    return {
      kind: 'cyberware',
      id: readyCyberware.id,
      title: readyCyberware.title,
      state: 'Ready now',
      detail: readyCyberware.summary,
      action: `Swap this in before the next run to change how the route plays instead of only banking credits.`,
      ready: true,
      completed: false,
    };
  }

  const nextLockedCyberware = getLockedCyberware(campaign)
    .sort((a, b) => a.unlockVictories - b.unlockVictories)[0];
  if (nextLockedCyberware) {
    return {
      kind: 'cyberware',
      id: nextLockedCyberware.id,
      title: nextLockedCyberware.title,
      state: `Locked // ${formatVictoryGap(nextLockedCyberware.unlockVictories)}`,
      detail: nextLockedCyberware.summary,
      action: `Bank another win and this implant opens at ${nextLockedCyberware.unlockVictories} victories.`,
      ready: false,
      completed: false,
    };
  }

  return {
    kind: 'cyberware',
    id: null,
    title: 'Cyberware ladder cleared',
    state: 'All implants open',
    detail: 'Every cyberware option is unlocked. The next useful change is swapping implants to fit the route, not chasing a new gate.',
    action: 'Use the current contract and heat profile to decide which unlocked implant should shape the next attempt.',
    ready: true,
    completed: true,
  };
};

const getArmoryProgressionTarget = (): ProgressionTarget => {
  const unownedUpgrades = WEAPON_UPGRADES
    .filter((upgrade) => !campaign.ownedWeaponUpgrades.includes(upgrade.id));
  const preferredUpgrade = unownedUpgrades.find((upgrade) => upgrade.weapon === selectedWeapon)
    ?? [...unownedUpgrades].sort((a, b) => a.cost - b.cost)[0];

  if (preferredUpgrade) {
    const missingCredits = Math.max(0, preferredUpgrade.cost - campaign.bankCredits);
    return {
      kind: 'armory',
      id: preferredUpgrade.id,
      title: preferredUpgrade.title,
      state: missingCredits === 0 ? 'Ready to buy' : `Need ${formatCredits(missingCredits)}`,
      detail: preferredUpgrade.summary,
      action: missingCredits === 0
        ? `Buy this before the next drop so the selected ${describeWeaponShort(selectedWeapon)} loadout changes materially.`
        : `Bank ${formatCredits(missingCredits)} more to turn the next run into a real weapon upgrade instead of another stock pass.`,
      ready: missingCredits === 0,
      completed: false,
    };
  }

  return {
    kind: 'armory',
    id: null,
    title: 'Armory ladder cleared',
    state: 'All weapon fits owned',
    detail: 'Every permanent weapon tune is already bought. The next between-run decisions should come from contracts and cyberware swaps.',
    action: 'Use route choice and implant swaps to drive the next run.',
    ready: true,
    completed: true,
  };
};

const getPrimaryProgressionTarget = () => {
  const targets = [
    getContractProgressionTarget(),
    getArmoryProgressionTarget(),
    getCyberwareProgressionTarget(),
  ];
  return targets.find((target) => target.ready && !target.completed)
    ?? targets.find((target) => !target.completed)
    ?? targets[0];
};

const getRunCarryforwardSummary = (contract: ContractDefinition, summaryResult: CampaignRunResult): RunSummaryCallout => {
  if (summaryResult.victory) {
    const rewardParts = [
      `${formatCredits(summaryResult.scavengedCredits)} recovered in the lane`,
      `${formatCredits(summaryResult.payoutCredits)} contract payout cleared`,
    ];
    if (summaryResult.optionalObjectiveCompleted && summaryResult.optionalObjectiveRewardCredits > 0) {
      rewardParts.push(`${formatCredits(summaryResult.optionalObjectiveRewardCredits)} came from the optional objective`);
    }

    return {
      value: `${formatCredits(summaryResult.totalCreditsAwarded)} banked`,
      detail: `${rewardParts.join(', ')}. The run closed ${contract.title} with a live campaign gain, not just scoreboard noise.`,
    };
  }

  return {
    value: `${formatCredits(summaryResult.scavengedCredits)} salvaged`,
    detail: `${contract.title} failed, but the profile still kept field salvage instead of wiping the night clean. That preserved bank is the recovery fuel for the next attempt.`,
  };
};

const getRunLossSummary = (contract: ContractDefinition, summaryResult: CampaignRunResult): RunSummaryCallout => {
  if (summaryResult.victory) {
    const missedBonus = summaryResult.optionalObjectiveLabel && !summaryResult.optionalObjectiveCompleted
      ? `You left ${summaryResult.optionalObjectiveLabel} dark, so the cleanest witness or bonus route is still on the table next time.`
      : 'The clean extract avoided a profile setback, so the only remaining tradeoffs are route choice and what to chase next.';
    return {
      value: 'No payout loss',
      detail: missedBonus,
    };
  }

  const missedElite = contract.elite && !summaryResult.eliteDefeated
    ? ` ${contract.elite.callsign} stayed on the board, which also left the elite bonus unclaimed.`
    : '';
  const missedOptional = summaryResult.optionalObjectiveLabel && !summaryResult.optionalObjectiveCompleted
    ? ` ${summaryResult.optionalObjectiveLabel} also stayed unresolved, so its bonus did not land.`
    : '';
  return {
    value: `${formatCredits(contract.basePayout)} payout lost`,
    detail: `The contract payout did not clear because the route collapsed before extraction.${missedElite}${missedOptional} The next run still matters because the banked salvage and current unlock state survived the miss.`,
  };
};

const getRunPressureSummary = (summaryResult: CampaignRunResult): RunSummaryCallout => {
  const clientName = FACTION_DETAILS[summaryResult.clientFaction].shortName;
  const hostileName = FACTION_DETAILS[summaryResult.hostileFaction].shortName;
  const hostileHeat = campaign.factions[summaryResult.hostileFaction].heat;
  const clientRep = campaign.factions[summaryResult.clientFaction].reputation;
  const nextPressure = hostileHeat >= 20
    ? 'Expect the next drop to open hotter and stay meaner for longer.'
    : 'The lane is still controllable, but hostile pressure is clearly climbing.';

  return {
    value: `${signedValue(summaryResult.reputationDelta)} ${clientName} rep // +${summaryResult.hostileHeatDelta} ${hostileName} heat`,
    detail: `${clientName} now sits at ${signedValue(clientRep)} trust, while ${hostileName} heat is ${hostileHeat}. ${nextPressure}`,
  };
};

const getRunNextMoveSummary = (summaryResult: CampaignRunResult): RunSummaryCallout => {
  const primaryTarget = getPrimaryProgressionTarget();
  const unlockCount = summaryResult.unlocks.length + summaryResult.contractUnlocks.length;
  const unlockLead = unlockCount > 0
    ? `The district opened ${unlockCount} new ladder event${unlockCount === 1 ? '' : 's'}, so the shell can point at a stronger follow-up immediately.`
    : 'No new unlock fired on this run, so the best next move comes from the current contract, armory, and cyberware ladder.';

  return {
    value: primaryTarget.title,
    detail: `${primaryTarget.state}. ${primaryTarget.action} ${unlockLead}`,
  };
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
    ? contract.victorySummary ?? 'The route held and the payout pushed your campaign forward.'
    : contract.failureSummary ?? 'You kept what scrap you could, but the client will remember the miss and the hostile lane still got hotter.';
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

const setHtml = (selector: string, value: string) => {
  const element = queryCachedElement(selector);
  if (element && element.innerHTML !== value) {
    element.innerHTML = value;
  }
};

const getSelectedContract = () => CONTRACTS_BY_ID[selectedContractId];
const getSelectedCyberware = () => CYBERWARE_BY_ID[selectedCyberwareId];
const getOwnedUpgradeForWeapon = (weapon: WeaponType) => WEAPON_UPGRADES.find(
  (upgrade) => upgrade.weapon === weapon && campaign.ownedWeaponUpgrades.includes(upgrade.id),
) ?? null;

const getProfileModeLabel = () => {
  if (showcaseMode) return 'Showcase review seed';
  if (hazardReviewMode) return 'Hazard review seed';
  if (bossReviewMode) return 'Boss review seed';
  if (showcaseReviewMode) return 'Authored review seed';
  if (reviewMode) return 'Review seed';
  if (resetProgressRequested) return 'Live profile reset';
  return 'Live profile';
};

const getProfileHealthLabel = () => {
  if (reviewMode) return 'Non-persistent';
  if (campaignLoadInfo.recovered) return 'Recovered safely';
  if (campaign.lastSavedAt) return 'Save active';
  return 'Clean baseline';
};

const getProfileHealthDetail = () => {
  if (reviewMode) {
    return 'This route is isolated from browser saves and will not change the live campaign.';
  }

  if (resetProgressRequested) {
    return 'A reset was requested on this launch, so the live campaign restarted from a clean baseline before the shell loaded.';
  }

  return campaignLoadInfo.detail;
};

const getProfileRoutingDetail = () => reviewMode
  ? 'Seeded review runs in a separate non-persistent lane. Jump back to the live profile whenever you want to validate real progression.'
  : 'Live progression writes to the browser profile only. Use review mode for clean capture passes, or reset the live profile from the shell before a fresh proof run.';

const getResetExpectationDetail = () => reviewMode
  ? 'Review seed ignores live save writes. Returning to the live route restores the existing browser profile exactly as it was left.'
  : 'Reset clears the live bank, victories, unlocks, loadout picks, and last-run summary from local browser storage before the shell reloads.';

const renderPlaytestScript = () => {
  if (reviewMode) {
    setText('#playtestModeValue', showcaseMode
      ? 'Showcase seed // featured route'
      : showcaseReviewMode
        ? 'Authored review seed // featured contract'
        : bossReviewMode
          ? 'Boss review seed // escalation slice'
          : hazardReviewMode
            ? 'Hazard review seed // blackout survival'
            : 'Review seed // deterministic briefing pass');
    setText('#playtestModeDetail', showcaseMode
      ? 'Use this when you want the cleanest featured-route read. It stays non-persistent and drops straight into the flagship lane.'
      : 'Use the seeded shell to judge onboarding copy, route clarity, and recovery messaging without live-save noise.');
    setText('#playtestEntryValue', autostartMode
      ? 'Fast-entry route active'
      : 'Read the shell, then enter on purpose');
    setText('#playtestEntryDetail', autostartMode
      ? 'Autostart skips the shell and lands in Recon so reviewers can move, aim, dash, and choose when to trigger pressure.'
      : 'Stay on the shell long enough to read contract goal, controls, and the current best-next-move before the first fight.');
    setText('#playtestPressureValue', 'Call out the first readability spike');
    setText('#playtestPressureDetail', 'Use the seeded route to decide whether the first pressure jump feels earned, readable, and survivable without a manager explaining the lane.');
    setText('#playtestRecoveryValue', 'Check the debrief, then replay the same route');
    setText('#playtestRecoveryDetail', 'A failed review run should still tell you what carried forward, what hurt, and whether the next attempt feels worth taking.');
    return;
  }

  const primaryTarget = getPrimaryProgressionTarget();
  setText('#playtestModeValue', `${getProfileModeLabel()} // ${primaryTarget.title}`);
  setText('#playtestModeDetail', `Use the current shell to pick the next ladder target instead of relying on memory. Current route: ${primaryTarget.action}`);
  setText('#playtestEntryValue', 'Walk the lane before you wake it up');
  setText('#playtestEntryDetail', 'Every live contract opens in Recon. Move first, aim once, test dash spacing, then hit Activate Sweep when you are ready for pressure.');
  setText('#playtestPressureValue', 'Spot the first unfair spike quickly');
  setText('#playtestPressureDetail', 'The first wave should be readable enough that you can name what went wrong if it breaks down: angle pressure, shield stack, elite timing, or route clutter.');
  setText('#playtestRecoveryValue', 'Debrief first, retry second');
  setText('#playtestRecoveryDetail', 'Wipes preserve banked salvage, owned unlocks, and a named next move. Read the summary, then use Run Another Contract or R for the follow-up attempt.');
};

const getCaptureDocketEntries = (contract: ContractDefinition) => {
  const combatTitle = contract.elite?.callsign
    ? `${contract.elite.callsign} pressure frame`
    : `${contract.missionType} combat frame`;
  const combatDetail = contract.elite?.callsign
    ? `Hold one readable beat where ${contract.elite.callsign} owns the threat lane but the player silhouette and escape line still read cleanly.`
    : `Lock a mid-fight still where weapon identity, enemy spacing, and the route line remain legible in one glance.`;
  const extractionTitle = contract.optionalObjective
    ? `${contract.optionalObjective.shortLabel} aftermath`
    : 'Extraction countdown frame';
  const extractionDetail = contract.optionalObjective
    ? `Capture the route right after ${contract.optionalObjective.shortLabel} resolves so the district looks costly, unstable, and worth a promo still.`
    : 'Frame the route under timer pressure so the countdown feels procedural and narrowing instead of arcade-cleanup.';

  return [
    {
      label: 'Shell promise',
      title: `${contract.title} briefing frame`,
      detail: `Keep the active contract card, next action, and ${contract.zone} tags in one composed shell shot.`,
    },
    {
      label: contract.elite ? 'Pressure spike' : 'Combat read',
      title: combatTitle,
      detail: combatDetail,
    },
    {
      label: 'Aftermath',
      title: extractionTitle,
      detail: extractionDetail,
    },
  ];
};

const renderCaptureDocket = () => {
  const contract = getSelectedContract();
  const entries = getCaptureDocketEntries(contract);
  setText(
    '#captureDocketLead',
    reviewMode
      ? `Use the ${contract.title} review lane to collect one shell, one pressure, and one ending frame without relying on luck.`
      : `Use the live shell to set up one shell, one pressure, and one ending frame before the route state drifts.`,
  );
  setHtml(
    '#captureDocket',
    entries.map((entry) => `
      <article class="capture-mark">
        <span>${entry.label}</span>
        <strong>${entry.title}</strong>
        <p>${entry.detail}</p>
      </article>
    `).join(''),
  );
};

const getCaptureDirective = (snapshot: HudSnapshot | null, contract: ContractDefinition) => {
  if (!snapshot) {
    return {
      label: 'Capture target',
      title: `${contract.title} shell promise`,
      detail: `Open with the shell read: contract title, route stakes, and ${contract.zone} lighting in one clean frame.`,
      state: 'shell',
    };
  }

  if (snapshot.victory) {
    return {
      label: 'Aftermath frame',
      title: `${contract.title} secured`,
      detail: 'Hold the calmer aftermath beat long enough to catch smoke, debris, and a readable route resolution without reopening chaos.',
      state: 'aftermath',
    };
  }

  if (snapshot.gameOver) {
    return {
      label: 'Failure read',
      title: 'Collapsed route debrief',
      detail: 'Keep the failure state readable enough that an outside reviewer can understand the loss and the next move in one still.',
      state: 'failure',
    };
  }

  if (!snapshot.combatActive) {
    return {
      label: 'Entry frame',
      title: `${contract.zone} approach line`,
      detail: 'Take the first district step with one strong route line, one signage anchor, and enough negative space around the player silhouette.',
      state: 'entry',
    };
  }

  if (snapshot.objectivePhase === 'extract') {
    return {
      label: 'Countdown frame',
      title: 'Extraction pressure',
      detail: 'Catch the route while the extraction clock is narrowing so urgency reads before clutter does.',
      state: 'extract',
    };
  }

  if (snapshot.eliteActive && snapshot.eliteCallsign) {
    return {
      label: 'Pressure spike',
      title: `${snapshot.eliteCallsign} owns the lane`,
      detail: 'Favour the frame where the elite threat, escape path, and player counter-angle remain visible at the same time.',
      state: 'elite',
    };
  }

  if (snapshot.objectivePhase === 'hold-upload') {
    return {
      label: 'Combat frame',
      title: 'Shield-break hold line',
      detail: 'Look for the upload hold beat where weapon read, shield pressure, and route geometry stay decipherable in one glance.',
      state: 'hold',
    };
  }

  return {
    label: 'Combat read',
    title: `${contract.missionType} route pressure`,
    detail: 'Hold a mid-route frame where the player path, incoming angle, and the next objective all read without narration.',
    state: 'combat',
  };
};

const renderCaptureDirective = (snapshot: HudSnapshot | null = latestSnapshot) => {
  const directive = getCaptureDirective(snapshot, getSelectedContract());
  setText('#captureDirectiveLabel', directive.label);
  setText('#captureDirectiveValue', directive.title);
  setText('#captureDirectiveDetail', directive.detail);
  gameFrame.dataset.captureState = directive.state;
};

const confirmAndNavigateToReset = () => {
  const confirmed = window.confirm(
    'Reset the live Neon District profile? This clears local progression, banked credits, unlocks, and the saved last-run summary before reloading the shell.',
  );

  if (!confirmed) {
    return;
  }

  window.location.href = buildCanonicalShellUrl('reset');
};

const getLastRunLabel = () => {
  if (!campaign.lastResult) return 'No run logged yet';
  return `${campaign.lastResult.victory ? 'Success' : 'Failure'} // ${campaign.lastResult.contractTitle}`;
};

const getLastRunDetail = () => {
  if (!campaign.lastResult) {
    return reviewMode
      ? 'Review seed uses a fixed campaign snapshot and does not carry fresh run results between sessions.'
      : 'Complete one contract to lock a dated result, reward summary, and next-run context into the profile.';
  }

  const result = campaign.lastResult;
  const carry = getRunCarryforwardSummary(CONTRACTS_BY_ID[result.contractId], result);
  const nextMove = getRunNextMoveSummary(result);
  return `${carry.value}. ${nextMove.value}.`;
};

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
  const contractTarget = getContractProgressionTarget();
  contractBoard.innerHTML = CONTRACTS.map((contract) => {
    const unlocked = isContractUnlocked(campaign, contract.id);
    const active = contract.id === selectedContractId;
    const completed = campaign.completedContracts.includes(contract.id);
    const client = FACTION_DETAILS[contract.clientFaction];
    const victoryGap = unlocked ? '' : formatVictoryGap(contract.unlockVictories);
  const featuredLabel = contract.featuredLabel
      ? `<span class="contract-option__badge">${contract.featuredLabel}</span>`
      : '';
    return `
      <button class="contract-option${active ? ' is-active' : ''}${unlocked ? '' : ' is-locked'}${contractTarget.id === contract.id ? ' is-target' : ''}${contract.featuredLabel ? ' is-featured' : ''}" data-contract="${contract.id}" type="button" ${unlocked ? '' : 'disabled'}>
        <div class="contract-option__header">
          <div class="contract-option__title-row">
            <strong>${contract.title}</strong>
            ${featuredLabel}
            ${contractTarget.id === contract.id ? '<span class="contract-option__badge contract-option__badge--target">Next target</span>' : ''}
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
        <div class="contract-option__footer">
          <span>${unlocked ? (completed ? 'Route cleared' : 'Ready to deploy') : `Locked // ${victoryGap}`}</span>
          <span>${unlocked ? 'Select this route to move the contract ladder forward.' : `Win ${victoryGap} to open this contract.`}</span>
        </div>
      </button>
    `;
  }).join('');
};

const renderCyberwareBoard = () => {
  const cyberwareTarget = getCyberwareProgressionTarget();
  cyberwareGrid.innerHTML = CYBERWARE_OPTIONS.map((option) => {
    const unlocked = isCyberwareUnlocked(campaign, option.id);
    const active = option.id === selectedCyberwareId;
    const victoryGap = unlocked ? '' : formatVictoryGap(option.unlockVictories);
    return `
      <button class="cyberware-option${active ? ' is-active' : ''}${unlocked ? '' : ' is-locked'}${cyberwareTarget.id === option.id ? ' is-target' : ''}" data-cyberware="${option.id}" type="button" ${unlocked ? '' : 'disabled'}>
        <div class="cyberware-option__header">
          <strong>${option.title}</strong>
          <span>${cyberwareTarget.id === option.id ? 'Next target' : option.slotLabel}</span>
        </div>
        <p>${option.summary}</p>
        <div class="cyberware-option__footer">
          <span>${option.detail}</span>
          <span>${unlocked ? 'Unlocked and ready to slot' : `Win ${victoryGap} to unlock`}</span>
        </div>
      </button>
    `;
  }).join('');
};

const renderArmoryBoard = () => {
  const armoryTarget = getArmoryProgressionTarget();
  armoryGrid.innerHTML = WEAPON_UPGRADES.map((upgrade) => {
    const owned = campaign.ownedWeaponUpgrades.includes(upgrade.id);
    const active = owned && upgrade.weapon === selectedWeapon;
    const affordable = campaign.bankCredits >= upgrade.cost;
    const missingCredits = Math.max(0, upgrade.cost - campaign.bankCredits);
    const actionLabel = owned
      ? active ? 'Installed on current loadout' : 'Owned'
      : affordable ? `Buy ${formatCredits(upgrade.cost)}` : `Need ${formatCredits(missingCredits)}`;

    return `
      <button class="armory-option${active ? ' is-active' : ''}${owned ? ' is-owned' : ''}${!owned && !affordable ? ' is-locked' : ''}${armoryTarget.id === upgrade.id ? ' is-target' : ''}" data-armory="${upgrade.id}" type="button" ${owned || affordable ? '' : 'disabled'}>
        <div class="armory-option__header">
          <strong>${upgrade.title}</strong>
          <span>${armoryTarget.id === upgrade.id ? 'Next target' : upgrade.slotLabel}</span>
        </div>
        <p>${upgrade.summary}</p>
        <div class="armory-option__footer">
          <span>${upgrade.detail}</span>
          <span>${owned ? actionLabel : affordable ? `${actionLabel} before the next run` : `${actionLabel} from future contracts`}</span>
        </div>
      </button>
    `;
  }).join('');
};

const renderCampaignSnapshot = () => {
  const selectedContract = getSelectedContract();
  const unlockedContracts = CONTRACTS.filter((contract) => isContractUnlocked(campaign, contract.id)).length;
  const unlockedCyberware = CYBERWARE_OPTIONS.filter((option) => isCyberwareUnlocked(campaign, option.id)).length;
  const contractTarget = getContractProgressionTarget();
  const cyberwareTarget = getCyberwareProgressionTarget();
  const armoryTarget = getArmoryProgressionTarget();
  const primaryTarget = getPrimaryProgressionTarget();

  campaignSnapshot.innerHTML = `
    <div class="campaign-stat campaign-stat--mode">
      <span>Profile mode</span>
      <strong>${getProfileModeLabel()}</strong>
      <small>${getProfileHealthDetail()}</small>
    </div>
    <div class="campaign-stat campaign-stat--status">
      <span>Save health</span>
      <strong>${getProfileHealthLabel()}</strong>
      <small>${reviewMode ? 'Seeded state only' : formatTimestamp(campaign.lastSavedAt)}</small>
    </div>
    <div class="campaign-stat"><span>Bank</span><strong>${formatCredits(campaign.bankCredits)}</strong></div>
    <div class="campaign-stat"><span>Victories</span><strong>${campaign.victories}</strong></div>
    <div class="campaign-stat"><span>Closed contracts</span><strong>${campaign.completedContracts.length} / ${CONTRACTS.length}</strong></div>
    <div class="campaign-stat"><span>Unlocked contracts</span><strong>${unlockedContracts} / ${CONTRACTS.length}</strong></div>
    <div class="campaign-stat"><span>Unlocked cyberware</span><strong>${unlockedCyberware} / ${CYBERWARE_OPTIONS.length}</strong></div>
    <div class="campaign-stat"><span>Armory fits</span><strong>${campaign.ownedWeaponUpgrades.length} / ${WEAPON_UPGRADES.length}</strong></div>
    <div class="campaign-stat"><span>High score</span><strong>${campaign.highestScore.toLocaleString()}</strong></div>
    <div class="campaign-stat">
      <span>Selected route</span>
      <strong>${selectedContract.title}</strong>
      <small>${selectedContract.zone}</small>
    </div>
    <div class="campaign-stat campaign-stat--result">
      <span>Last run</span>
      <strong>${getLastRunLabel()}</strong>
      <small>${getLastRunDetail()}</small>
    </div>
    <div class="campaign-stat campaign-stat--focus">
      <span>Best next move</span>
      <strong>${primaryTarget.title}</strong>
      <small>${primaryTarget.state}. ${primaryTarget.action}</small>
    </div>
    <div class="campaign-stat campaign-stat--controls">
      <span>Profile controls</span>
      <strong>${reviewMode ? 'Switch routes safely' : 'Reset and review paths'}</strong>
      <small>${getProfileRoutingDetail()}</small>
      <div class="campaign-action-row">
        <button class="control-button control-button--ghost" data-profile-action="live" type="button">Open live profile</button>
        <button class="control-button control-button--ghost" data-profile-action="review" type="button">Open review seed</button>
        <button class="control-button control-button--alt" data-profile-action="reset" type="button">Reset live profile</button>
      </div>
    </div>
    <div class="campaign-stat campaign-stat--isolation">
      <span>Isolation contract</span>
      <strong>${reviewMode ? 'Review seed cannot touch the live save' : 'Live save stays separate from seeded review'}</strong>
      <small>${getResetExpectationDetail()}</small>
    </div>
    <div class="campaign-ladder">
      <div class="ladder-card${contractTarget.ready ? ' is-ready' : ''}">
        <span>Next contract target</span>
        <strong>${contractTarget.title}</strong>
        <small>${contractTarget.state}</small>
        <p>${contractTarget.detail}</p>
      </div>
      <div class="ladder-card${cyberwareTarget.ready ? ' is-ready' : ''}">
        <span>Next cyberware target</span>
        <strong>${cyberwareTarget.title}</strong>
        <small>${cyberwareTarget.state}</small>
        <p>${cyberwareTarget.detail}</p>
      </div>
      <div class="ladder-card${armoryTarget.ready ? ' is-ready' : ''}">
        <span>Next armory target</span>
        <strong>${armoryTarget.title}</strong>
        <small>${armoryTarget.state}</small>
        <p>${armoryTarget.detail}</p>
      </div>
    </div>
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
  renderCaptureDocket();
  renderCaptureDirective();
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
  const primaryTarget = getPrimaryProgressionTarget();
  briefingNote.innerHTML = reviewMode
    ? showcaseMode
      ? 'Showcase route active. <code>?showcase=1</code> jumps straight into the featured Dead Signal Choir Heist demo lane while keeping progress non-persistent.'
      : hazardReviewMode
        ? 'Hazard review slice active. <code>?review=1&reviewSlice=hazard</code> loads the Redline Blackout Run shell, and <code>?autostart=1&review=1&reviewSlice=hazard</code> enters that slice immediately.'
      : bossReviewMode
        ? 'Boss review slice active. <code>?review=1&reviewSlice=boss</code> loads the Glassfall Nullbreaker Siege shell, and <code>?autostart=1&review=1&reviewSlice=boss</code> enters that slice immediately.'
      : showcaseReviewMode
        ? 'Authored review slice active. <code>?review=1&reviewSlice=authored</code> loads the featured Dead Signal Choir Heist shell, and <code>?autostart=1&review=1&reviewSlice=authored</code> enters that slice immediately.'
      : 'Review seed active. <code>?review=1</code> opens a deterministic non-persistent campaign state, and <code>?autostart=1&review=1</code> enters the district immediately for a no-save outsider pass.'
    : `${getProfileHealthDetail()} Last save: <code>${formatTimestamp(campaign.lastSavedAt)}</code>. Best next move: <strong>${primaryTarget.title}</strong> // ${primaryTarget.action} If you want a clean outsider baseline first, add <code>?resetProgress=1</code> before review.`;
  renderPlaytestScript();
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
        : 'Booting the deterministic review seed and district runtime for the outsider pass...'
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
  const carrySummary = summaryResult ? getRunCarryforwardSummary(contract, summaryResult) : null;
  const lossSummary = summaryResult ? getRunLossSummary(contract, summaryResult) : null;
  const pressureSummary = summaryResult ? getRunPressureSummary(summaryResult) : null;
  const nextMoveSummary = summaryResult ? getRunNextMoveSummary(summaryResult) : null;

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
    ? `${describeContractDebrief(contract, summaryResult)} ${unlockLabels.length > 0 ? `New unlocks came online as the district reacted. ` : ''}${optionalOutcomeText} ${nextMoveSummary?.detail ?? ''}`.trim()
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
  setText('#summaryCarryValue', carrySummary?.value ?? 'No rewards logged');
  setText('#summaryCarryDetail', carrySummary?.detail ?? 'Finish a contract to lock rewards and campaign state into the profile.');
  setText('#summaryLossValue', lossSummary?.value ?? 'No losses logged');
  setText('#summaryLossDetail', lossSummary?.detail ?? 'Successes keep the route moving; failures should still leave a readable recovery path with preserved salvage, named losses, and a clear retry target.');
  setText('#summaryPressureValue', pressureSummary?.value ?? 'No pressure change');
  setText('#summaryPressureDetail', pressureSummary?.detail ?? 'Faction trust and hostile heat will update here after a resolved run.');
  setText('#summaryNextMoveValue', nextMoveSummary?.value ?? 'Pick the next ladder target');
  setText('#summaryNextMoveDetail', nextMoveSummary?.detail ?? 'The shell will point at the strongest contract, armory, or cyberware follow-up after each run.');
  setText('#bankTicker', formatCredits(campaign.bankCredits));
  setText('#victoryTicker', `${campaign.victories}`);
  setText('#heatTicker', `${campaign.factions[contract.hostileFaction].heat}`);
  setText('#dossierCyberwareValue', cyberware.title);
  setText('#dossierRepValue', signedValue(campaign.factions[contract.clientFaction].reputation));
  setText('#dossierHeatValue', `${campaign.factions[contract.hostileFaction].heat}`);
  setText('#dossierFactionBody', `${FACTION_DETAILS[contract.clientFaction].shortName} trust sits at ${signedValue(campaign.factions[contract.clientFaction].reputation)}. ${FACTION_DETAILS[contract.hostileFaction].shortName} heat is ${campaign.factions[contract.hostileFaction].heat}, so the route is only getting meaner.`);
  renderCaptureDirective(snapshot);
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
campaignSnapshot.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-profile-action]');
  const action = target?.dataset.profileAction;
  if (!action) return;

  if (action === 'reset') {
    confirmAndNavigateToReset();
    return;
  }

  if (action === 'live' || action === 'review') {
    window.location.href = buildCanonicalShellUrl(action);
  }
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

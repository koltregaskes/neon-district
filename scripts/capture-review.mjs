import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.join(repoRoot, 'output', 'playwright');
const sharedCaptureDir = path.resolve(repoRoot, '..', 'LOCAL-ONLY', 'captures', 'neon-district');
const reviewBaseUrl = 'http://127.0.0.1:4175/neon-district/';

function getReviewDate() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date()).reduce((accumulator, part) => {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day') {
      accumulator[part.type] = part.value;
    }
    return accumulator;
  }, {});

  if (parts.year && parts.month && parts.day) {
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  return new Date().toISOString().slice(0, 10);
}

const reviewDate = getReviewDate();
const reviewRunId = `${reviewDate}-${process.pid}`;
const previewOutLog = path.join(repoRoot, 'output', `preview-review-${reviewRunId}.out.log`);
const previewErrLog = path.join(repoRoot, 'output', `preview-review-${reviewRunId}.err.log`);

const evidenceFiles = {
  briefing: `review-briefing-desktop-${reviewDate}.png`,
  autostartDesktop: `review-autostart-desktop-${reviewDate}.png`,
  autostartMobile: `review-autostart-mobile-${reviewDate}.png`,
  authoredBriefing: `review-authored-briefing-desktop-${reviewDate}.png`,
  authoredArchiveLiveDesktop: `review-authored-archive-live-desktop-${reviewDate}.png`,
  authoredArchiveSecuredDesktop: `review-authored-archive-secured-desktop-${reviewDate}.png`,
  authoredArchiveSkippedDesktop: `review-authored-archive-skipped-desktop-${reviewDate}.png`,
  showcaseDesktop: `review-showcase-desktop-${reviewDate}.png`,
  showcaseMobile: `review-showcase-mobile-${reviewDate}.png`,
  authoredHoldDesktop: `review-authored-hold-desktop-${reviewDate}.png`,
  authoredSummaryDesktop: `review-authored-summary-desktop-${reviewDate}.png`,
  bossBriefing: `review-boss-briefing-desktop-${reviewDate}.png`,
  bossAutostartDesktop: `review-boss-autostart-desktop-${reviewDate}.png`,
  bossHoldDesktop: `review-boss-hold-desktop-${reviewDate}.png`,
  bossSummaryDesktop: `review-boss-summary-desktop-${reviewDate}.png`,
  hazardBriefing: `review-hazard-briefing-desktop-${reviewDate}.png`,
  hazardAutostartDesktop: `review-hazard-autostart-desktop-${reviewDate}.png`,
  hazardHoldDesktop: `review-hazard-hold-desktop-${reviewDate}.png`,
  hazardSummaryDesktop: `review-hazard-summary-desktop-${reviewDate}.png`,
};

const IGNORED_CONSOLE_PATTERNS = [
  /GPU stall due to ReadPixels/i,
];

async function ensureDirectories() {
  await mkdir(outputDir, { recursive: true });
  await mkdir(sharedCaptureDir, { recursive: true });
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isServerReady(url)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for preview server at ${url}`);
}

async function isServerReady(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

function startPreviewServer() {
  const stdout = createWriteStream(previewOutLog);
  const stderr = createWriteStream(previewErrLog);
  const preview = spawn('cmd', ['/c', 'npm', 'run', 'preview', '--', '--host', '127.0.0.1', '--port', '4175'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  preview.stdout.pipe(stdout);
  preview.stderr.pipe(stderr);

  const stop = async () => {
    stdout.end();
    stderr.end();

    if (preview.exitCode !== null) {
      return;
    }

    const killer = spawn('taskkill', ['/pid', String(preview.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    await once(killer, 'exit').catch(() => {});
  };

  return { preview, stop };
}

async function capturePage(browser, {
  url,
  filename,
  viewport,
  isMobile = false,
  ready,
  warnings,
  errors,
}) {
  const localPath = path.join(outputDir, filename);
  const sharedPath = path.join(sharedCaptureDir, filename);

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: isMobile ? 2 : 1,
    hasTouch: isMobile,
    isMobile,
  });
  const page = await context.newPage();

  page.on('console', (message) => {
    const type = message.type();
    if (type === 'warning' || type === 'error') {
      const text = message.text();
      if (!IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(text))) {
        warnings.push(`[${type}] ${text}`);
      }
    }
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.screenshot({ path: localPath, type: 'png' });
  await copyFile(localPath, sharedPath);
  await context.close();
}

async function waitForBriefing(page) {
  await page.waitForSelector('#briefingOverlay');
  await page.waitForFunction(() => {
    const overlay = document.getElementById('briefingOverlay');
    const board = document.querySelector('#contractBoard .contract-option');
    return Boolean(overlay && !overlay.classList.contains('is-hidden') && board);
  });
  await page.evaluate(() => {
    const panel = document.querySelector('.briefing-panel');
    if (panel instanceof HTMLElement) {
      panel.scrollTop = 0;
    }
  });
  await page.waitForTimeout(400);
}

async function waitForAutostart(page) {
  await page.waitForSelector('#briefingOverlay');
  await page.waitForFunction(() => {
    const overlay = document.getElementById('briefingOverlay');
    const district = document.getElementById('districtName');
    const tutorial = document.getElementById('tutorialStatus');
    return Boolean(
      overlay?.classList.contains('is-hidden')
      && district?.textContent
      && tutorial?.textContent,
    );
  }, undefined, { timeout: 60_000 });
  await page.waitForTimeout(1_200);
}

async function waitForRuntime(page) {
  await waitForAutostart(page);
  await page.waitForFunction(() => Boolean(window.__NEON_DISTRICT_RUNTIME__), undefined, { timeout: 60_000 });
}

async function stageAuthoredHold(page) {
  await waitForRuntime(page);
  await page.evaluate(() => {
    const runtime = window.__NEON_DISTRICT_RUNTIME__;
    const sim = runtime.simulation;
    runtime.restart();
    runtime.activateSweep();
    const state = sim.state;
    state.player.position = { ...state.terminalPoint };
    state.player.facing = { x: 0.9, y: -0.2 };
    state.player.health = state.player.maxHealth;
    state.player.shield = Math.max(30, state.player.maxShield * 0.45);
    state.player.energy = state.player.maxEnergy;
    state.combatActive = true;
    state.objectivePhase = 'hold-upload';
    state.terminalProgress = 100;
    state.uploadTimeRemaining = 11;
    state.extractionTimeRemaining = state.extractionDuration;
    state.extractionProgress = 0;
    state.enemies = [];
    state.projectiles = [];
    state.pickups = [];
    state.gameOver = false;
    state.contractResolved = false;
    state.victory = false;
    state.eliteActive = false;
    state.eliteDefeated = false;
    state.eliteHealth = 0;
    state.eliteMaxHealth = 0;
    state.credits = 140;
    state.kills = 4;
    state.score = 4680;
    sim.phaseElapsed = 7.6;
    sim.triggeredBeatIds = new Set(['arcade-tripwire', 'bridge-lock']);
    sim.narrativePulse = null;
    sim.applyAuthoredBeats(false);
    sim.applyMissionState();
    sim.applyNarrativePulse();
  });
  await page.waitForTimeout(800);
}

async function stageAuthoredArchiveLive(page) {
  await waitForRuntime(page);
  await page.evaluate(() => {
    const runtime = window.__NEON_DISTRICT_RUNTIME__;
    const sim = runtime.simulation;
    runtime.restart();
    runtime.activateSweep();
    const state = sim.state;
    if (!state.optionalObjectivePoint) {
      throw new Error('Authored archive point is not available in the current review seed.');
    }
    state.player.position = {
      x: state.optionalObjectivePoint.x + 38,
      y: state.optionalObjectivePoint.y + 26,
    };
    state.player.facing = { x: 0.72, y: -0.34 };
    state.player.health = state.player.maxHealth;
    state.player.shield = Math.max(34, state.player.maxShield * 0.58);
    state.player.energy = state.player.maxEnergy;
    state.combatActive = true;
    state.objectivePhase = 'reach-terminal';
    state.enemies = [];
    state.projectiles = [];
    state.pickups = [];
    state.gameOver = false;
    state.contractResolved = false;
    state.victory = false;
    state.credits = 120;
    state.kills = 2;
    state.score = 2840;
    state.optionalObjectiveProgress = 0;
    state.optionalObjectiveRewardCredits = 0;
    state.optionalObjectiveReputationBonus = 0;
    state.optionalObjectiveState = 'available';
    state.optionalObjectiveStatusText = `${state.optionalObjectiveLabel} live // +180c payout // +4 Morrow rep if extracted`;
    sim.phaseElapsed = 3.4;
    sim.triggeredBeatIds = new Set(['arcade-tripwire']);
    sim.narrativePulse = null;
    sim.applyMissionState();
    sim.applyNarrativePulse();
  });
  await page.waitForTimeout(800);
}

async function stageAuthoredArchiveSecured(page) {
  await waitForRuntime(page);
  await page.evaluate(() => {
    const runtime = window.__NEON_DISTRICT_RUNTIME__;
    const sim = runtime.simulation;
    const contract = sim.runConfig.contract;
    runtime.restart();
    runtime.activateSweep();
    const state = sim.state;
    if (!contract.optionalObjective) {
      throw new Error('Authored archive objective is missing from the current review seed.');
    }
    if (!state.optionalObjectivePoint) {
      throw new Error('Authored archive point is not available in the current review seed.');
    }
    state.player.position = {
      x: state.terminalPoint.x - 110,
      y: state.terminalPoint.y + 120,
    };
    state.player.facing = { x: 0.86, y: -0.22 };
    state.player.health = Math.max(54, state.player.maxHealth * 0.84);
    state.player.shield = Math.max(20, state.player.maxShield * 0.34);
    state.player.energy = state.player.maxEnergy;
    state.combatActive = true;
    state.objectivePhase = 'hack-terminal';
    state.terminalProgress = 42;
    state.enemies = [];
    state.projectiles = [];
    state.pickups = [];
    state.gameOver = false;
    state.contractResolved = false;
    state.victory = false;
    state.credits = 180;
    state.kills = 5;
    state.score = 6120;
    state.optionalObjectiveProgress = 100;
    state.optionalObjectiveRewardCredits = contract.optionalObjective.bonusCredits;
    state.optionalObjectiveReputationBonus = contract.optionalObjective.reputationBonus;
    state.optionalObjectiveState = 'completed';
    state.optionalObjectiveStatusText = `${contract.optionalObjective.shortLabel} secured // ${contract.optionalObjective.rewardLabel}`;
    state.optionalObjectiveSummary = contract.optionalObjective.completionSummary;
    sim.phaseElapsed = 1.6;
    sim.triggeredBeatIds = new Set(['arcade-tripwire', 'bridge-lock']);
    sim.narrativePulse = null;
    sim.applyMissionState();
    sim.applyNarrativePulse();
  });
  await page.waitForTimeout(800);
}

async function stageAuthoredArchiveSkipped(page) {
  await waitForRuntime(page);
  await page.evaluate(() => {
    const runtime = window.__NEON_DISTRICT_RUNTIME__;
    const sim = runtime.simulation;
    const contract = sim.runConfig.contract;
    runtime.restart();
    runtime.activateSweep();
    const state = sim.state;
    if (!contract.optionalObjective) {
      throw new Error('Authored archive objective is missing from the current review seed.');
    }
    state.player.position = {
      x: state.terminalPoint.x - 80,
      y: state.terminalPoint.y + 90,
    };
    state.player.facing = { x: 0.82, y: -0.18 };
    state.player.health = Math.max(50, state.player.maxHealth * 0.8);
    state.player.shield = Math.max(16, state.player.maxShield * 0.26);
    state.player.energy = state.player.maxEnergy;
    state.combatActive = true;
    state.objectivePhase = 'hack-terminal';
    state.terminalProgress = 36;
    state.enemies = [];
    state.projectiles = [];
    state.pickups = [];
    state.gameOver = false;
    state.contractResolved = false;
    state.victory = false;
    state.credits = 150;
    state.kills = 4;
    state.score = 5380;
    state.optionalObjectiveProgress = 0;
    state.optionalObjectiveRewardCredits = 0;
    state.optionalObjectiveReputationBonus = 0;
    state.optionalObjectiveState = 'skipped';
    state.optionalObjectiveStatusText = `${contract.optionalObjective.shortLabel} skipped`;
    state.optionalObjectiveSummary = contract.optionalObjective.skipSummary;
    sim.phaseElapsed = 1.1;
    sim.triggeredBeatIds = new Set(['arcade-tripwire', 'bridge-lock']);
    sim.narrativePulse = null;
    sim.applyMissionState();
    sim.applyNarrativePulse();
  });
  await page.waitForTimeout(800);
}

async function stageAuthoredSummary(page) {
  await waitForRuntime(page);
  await page.evaluate(() => {
    const runtime = window.__NEON_DISTRICT_RUNTIME__;
    const sim = runtime.simulation;
    runtime.restart();
    runtime.activateSweep();
    const state = sim.state;
    state.player.position = { ...state.extractionPoint };
    state.player.facing = { x: -1, y: 0 };
    state.player.health = state.player.maxHealth;
    state.player.shield = state.player.maxShield;
    state.player.energy = state.player.maxEnergy;
    state.combatActive = true;
    state.objectivePhase = 'complete';
    state.terminalProgress = 100;
    state.uploadTimeRemaining = 0;
    state.extractionTimeRemaining = 0;
    state.extractionProgress = 100;
    state.enemies = [];
    state.projectiles = [];
    state.pickups = [];
    state.gameOver = false;
    state.contractResolved = true;
    state.victory = true;
    state.eliteCallsign = state.eliteCallsign ?? 'Velvet Knife';
    state.eliteActive = false;
    state.eliteDefeated = true;
    state.eliteHealth = 0;
    state.eliteMaxHealth = 0;
    state.credits = 420;
    state.kills = 14;
    state.score = 18640;
    state.districtStatus = 'Contract complete';
    state.districtSummary = sim.runConfig.contract.victorySummary ?? state.districtSummary;
    sim.phaseElapsed = 0;
    sim.eliteSpawned = true;
    sim.triggeredBeatIds = new Set(['arcade-tripwire', 'bridge-lock', 'awning-overwatch', 'skyhook-scramble', 'rear-cutoff']);
    sim.narrativePulse = null;
    sim.applyMissionState();
  });
  await page.waitForTimeout(1200);
}

async function stageBossHold(page) {
  await waitForRuntime(page);
  await page.evaluate(() => {
    const runtime = window.__NEON_DISTRICT_RUNTIME__;
    const sim = runtime.simulation;
    runtime.restart();
    runtime.activateSweep();
    const state = sim.state;
    state.player.position = { x: state.terminalPoint.x - 70, y: state.terminalPoint.y + 90 };
    state.player.facing = { x: 0.88, y: -0.3 };
    state.player.health = Math.max(48, state.player.maxHealth * 0.78);
    state.player.shield = Math.max(18, state.player.maxShield * 0.28);
    state.player.energy = state.player.maxEnergy;
    state.combatActive = true;
    state.objectivePhase = 'hold-upload';
    state.terminalProgress = 100;
    state.uploadTimeRemaining = 12;
    state.extractionTimeRemaining = state.extractionDuration;
    state.extractionProgress = 0;
    state.enemies = [];
    state.projectiles = [];
    state.pickups = [];
    state.gameOver = false;
    state.contractResolved = false;
    state.victory = false;
    state.eliteActive = false;
    state.eliteDefeated = false;
    state.eliteHealth = 0;
    state.eliteMaxHealth = 0;
    state.credits = 260;
    state.kills = 9;
    state.score = 11680;
    sim.phaseElapsed = 9.1;
    sim.eliteSpawned = false;
    sim.triggeredBeatIds = new Set(['verge-screen', 'catwalk-sutures', 'vault-bolt', 'beacon-shear']);
    sim.narrativePulse = null;
    sim.spawnEliteIfNeeded();
    sim.spawnScriptedEnemy({ type: 'shield', position: { x: 960, y: 760 } });
    sim.spawnScriptedEnemy({ type: 'brute', position: { x: 1320, y: 1110 } });
    sim.applyAuthoredBeats(false);

    const boss = state.enemies.find((enemy) => enemy.type === 'captain');
    if (boss) {
      boss.position = { x: 1285, y: 820 };
      boss.facing = { x: -0.92, y: 0.16 };
      boss.health = Math.round(boss.maxHealth * 0.62);
      state.eliteHealth = boss.health;
      state.eliteMaxHealth = boss.maxHealth;
    }

    sim.applyMissionState();
    sim.applyNarrativePulse();
  });
  await page.waitForTimeout(900);
}

async function stageBossSummary(page) {
  await waitForRuntime(page);
  await page.evaluate(() => {
    const runtime = window.__NEON_DISTRICT_RUNTIME__;
    const sim = runtime.simulation;
    runtime.restart();
    runtime.activateSweep();
    const state = sim.state;
    state.player.position = { ...state.extractionPoint };
    state.player.facing = { x: -0.9, y: 0.15 };
    state.player.health = state.player.maxHealth;
    state.player.shield = state.player.maxShield;
    state.player.energy = state.player.maxEnergy;
    state.combatActive = true;
    state.objectivePhase = 'complete';
    state.terminalProgress = 100;
    state.uploadTimeRemaining = 0;
    state.extractionTimeRemaining = 0;
    state.extractionProgress = 100;
    state.enemies = [];
    state.projectiles = [];
    state.pickups = [];
    state.gameOver = false;
    state.contractResolved = true;
    state.victory = true;
    state.eliteCallsign = state.eliteCallsign ?? 'Cinder Bishop';
    state.eliteActive = false;
    state.eliteDefeated = true;
    state.eliteHealth = 0;
    state.eliteMaxHealth = 0;
    state.credits = 560;
    state.kills = 20;
    state.score = 24980;
    state.districtStatus = 'Contract complete';
    state.districtSummary = sim.runConfig.contract.victorySummary ?? state.districtSummary;
    sim.phaseElapsed = 0;
    sim.eliteSpawned = true;
    sim.triggeredBeatIds = new Set(['verge-screen', 'catwalk-sutures', 'vault-bolt', 'beacon-shear', 'siege-collapse', 'tram-breach', 'tram-last-stand']);
    sim.narrativePulse = null;
    sim.applyMissionState();
  });
  await page.waitForTimeout(1200);
}

async function stageHazardHold(page) {
  await waitForRuntime(page);
  await page.evaluate(() => {
    const runtime = window.__NEON_DISTRICT_RUNTIME__;
    const sim = runtime.simulation;
    runtime.restart();
    runtime.activateSweep();
    const state = sim.state;
    const contract = sim.runConfig.contract;
    const spillwayBloom = contract.hazards?.find((hazard) => hazard.id === 'spillway-bloom');
    const backwashArc = contract.hazards?.find((hazard) => hazard.id === 'backwash-arc');

    state.player.position = { x: state.terminalPoint.x + 32, y: state.terminalPoint.y + 44 };
    state.player.facing = { x: 0.78, y: -0.36 };
    state.player.health = Math.max(46, state.player.maxHealth * 0.7);
    state.player.shield = Math.max(12, state.player.maxShield * 0.2);
    state.player.energy = Math.max(28, state.player.maxEnergy * 0.42);
    state.combatActive = true;
    state.objectivePhase = 'hold-upload';
    state.terminalProgress = 100;
    state.uploadTimeRemaining = 8.5;
    state.extractionTimeRemaining = state.extractionDuration;
    state.extractionProgress = 0;
    state.enemies = [];
    state.projectiles = [];
    state.pickups = [];
    state.gameOver = false;
    state.contractResolved = false;
    state.victory = false;
    state.credits = 220;
    state.kills = 11;
    state.score = 13840;
    state.activeHazards = [spillwayBloom, backwashArc]
      .filter(Boolean)
      .map((hazard, index) => ({
        id: hazard.id,
        kind: hazard.kind,
        label: hazard.label,
        status: hazard.status,
        summary: hazard.summary,
        position: { ...hazard.position },
        radius: hazard.radius,
        remaining: index === 0 ? 3.8 : 2.2,
        maxDuration: hazard.duration,
        damagePerSecond: hazard.damagePerSecond,
        affectsEnemies: hazard.affectsEnemies ?? true,
        color: hazard.color,
      }));
    sim.phaseElapsed = 8.9;
    sim.triggeredBeatIds = new Set(['spillway-screen', 'coil-lock', 'wardens-advance']);
    sim.triggeredHazardIds = new Set(['relay-flare', 'spillway-bloom', 'backwash-arc']);
    sim.narrativePulse = null;
    sim.spawnScriptedEnemy({ type: 'shield', position: { x: 1010, y: 910 } });
    sim.spawnScriptedEnemy({ type: 'gunner', position: { x: 1180, y: 1080 } });
    sim.spawnScriptedEnemy({ type: 'runner', position: { x: 830, y: 1140 } });
    sim.applyMissionState();
    sim.applyNarrativePulse();
  });
  await page.waitForTimeout(900);
}

async function stageHazardSummary(page) {
  await waitForRuntime(page);
  await page.evaluate(() => {
    const runtime = window.__NEON_DISTRICT_RUNTIME__;
    const sim = runtime.simulation;
    runtime.restart();
    runtime.activateSweep();
    const state = sim.state;
    state.player.position = { ...state.extractionPoint };
    state.player.facing = { x: -0.82, y: -0.1 };
    state.player.health = Math.max(30, state.player.maxHealth * 0.58);
    state.player.shield = Math.max(0, state.player.maxShield * 0.08);
    state.player.energy = Math.max(18, state.player.maxEnergy * 0.3);
    state.combatActive = true;
    state.objectivePhase = 'complete';
    state.terminalProgress = 100;
    state.uploadTimeRemaining = 0;
    state.extractionTimeRemaining = 0;
    state.extractionProgress = 100;
    state.enemies = [];
    state.projectiles = [];
    state.pickups = [];
    state.activeHazards = [];
    state.gameOver = false;
    state.contractResolved = true;
    state.victory = true;
    state.credits = 510;
    state.kills = 23;
    state.score = 26640;
    state.districtStatus = 'Contract complete';
    state.districtSummary = sim.runConfig.contract.victorySummary ?? state.districtSummary;
    sim.phaseElapsed = 0;
    sim.triggeredBeatIds = new Set(['spillway-screen', 'coil-lock', 'wardens-advance', 'magline-dive']);
    sim.triggeredHazardIds = new Set(['relay-flare', 'spillway-bloom', 'backwash-arc', 'magline-surge']);
    sim.narrativePulse = null;
    sim.applyMissionState();
  });
  await page.waitForTimeout(1200);
}

function buildReadme({ warningCount, errorCount, consoleLogName }) {
  return `# Neon District Review Pack

Review date: ${reviewDate}

Standard review URL:
- \`${reviewBaseUrl}?autostart=1&review=1\`

Supporting review URL:
- \`${reviewBaseUrl}?review=1\`

Capture command:
- \`cmd /c npm run capture:review\`

Query params:
- \`review=1\`: loads a deterministic non-persistent Phase 2 campaign seed.
- \`reviewSlice=authored\`: swaps the review seed onto the featured Dead Signal Choir Heist slice.
- \`reviewSlice=boss\`: swaps the review seed onto the boss-grade Glassfall Nullbreaker Siege slice.
- \`reviewSlice=hazard\`: swaps the review seed onto the blackout-survival Redline Blackout Run slice.
- \`autostart=1\`: dismisses the briefing and enters the district immediately.
- \`showcase=1\`: primary demo route; jumps straight into the featured authored lane in a non-persistent state.
- \`hotDrop=1\`: legacy live-combat fast entry; still supported, but not the manager-standard review path.
- \`skipBriefing=1\`: legacy alias for entering the district without the briefing.

Deterministic review state:
- Contract: \`Ghostline Witness Lift\`
- Weapon: \`ARC-12 Rail Lance\`
- Armory fit: \`Rail Capacitor Spine\`
- Cyberware: \`Scrapper Daemon\`
- Seeded bank: \`1,460c\`
- Seeded victories: \`2\`

Evidence:
- \`${evidenceFiles.briefing}\`: deterministic seeded briefing shell.
- \`${evidenceFiles.autostartDesktop}\`: manager-standard fast-entry review state.
- \`${evidenceFiles.autostartMobile}\`: mobile review state at the same URL.
- \`${evidenceFiles.authoredBriefing}\`: featured authored review shell for Dead Signal Choir Heist.
- \`${evidenceFiles.authoredArchiveLiveDesktop}\`: authored route capture with the Ghost archive live before the bridge splice.
- \`${evidenceFiles.authoredArchiveSecuredDesktop}\`: authored route capture showing the Ghost archive secured state and bonus-proof handoff.
- \`${evidenceFiles.authoredArchiveSkippedDesktop}\`: authored route capture proving the main route still reads cleanly when the Ghost archive is skipped.
- \`${evidenceFiles.showcaseDesktop}\`: primary showcase route entered directly into the authored recon lane.
- \`${evidenceFiles.showcaseMobile}\`: primary showcase route on a mobile viewport.
- \`${evidenceFiles.authoredHoldDesktop}\`: automated hold-phase proof capture showing the scripted counter-push beat.
- \`${evidenceFiles.authoredSummaryDesktop}\`: automated authored payoff capture at contract-complete state.
- \`${evidenceFiles.bossBriefing}\`: boss-grade review shell for Glassfall Nullbreaker Siege.
- \`${evidenceFiles.bossAutostartDesktop}\`: boss-grade fast-entry review state.
- \`${evidenceFiles.bossHoldDesktop}\`: automated boss hold capture with Cinder Bishop on the vault floor.
- \`${evidenceFiles.bossSummaryDesktop}\`: automated boss-grade payoff capture at contract-complete state.
- \`${evidenceFiles.hazardBriefing}\`: blackout-survival review shell for Redline Blackout Run.
- \`${evidenceFiles.hazardAutostartDesktop}\`: blackout-survival fast-entry review state.
- \`${evidenceFiles.hazardHoldDesktop}\`: automated hazard hold capture with live surge blooms on the spillway.
- \`${evidenceFiles.hazardSummaryDesktop}\`: automated blackout-survival payoff capture after extraction.

Authored review URL:
- \`${reviewBaseUrl}?review=1&reviewSlice=authored\`

Primary showcase URL:
- \`${reviewBaseUrl}?showcase=1\`

Boss review URL:
- \`${reviewBaseUrl}?review=1&reviewSlice=boss\`

Boss fast-entry URL:
- \`${reviewBaseUrl}?autostart=1&review=1&reviewSlice=boss\`

Hazard review URL:
- \`${reviewBaseUrl}?review=1&reviewSlice=hazard\`

Hazard fast-entry URL:
- \`${reviewBaseUrl}?autostart=1&review=1&reviewSlice=hazard\`

Verification notes:
- The review seed is not persisted to local storage; reloading \`?review=1\` restores the same seeded state.
- \`?autostart=1&review=1\` intentionally enters the district in \`Recon\` instead of forcing combat, so reviewers do not land in an avoidable death loop.
- Browser console warnings captured during automation: \`${warningCount}\`.
- Browser page errors captured during automation: \`${errorCount}\`.
- Full preview stdout/stderr logs are written under \`output/\`.
- Console and page-error detail is mirrored to \`${consoleLogName}\` when issues are present.

Caveats:
- Browser audio still follows the normal user-gesture unlock behavior, so automated review captures may start muted until input occurs.
- The deterministic review seed is a curated slice, not a full campaign save.

Next improvement:
- No immediate follow-up is required for the current demo chunk. Future work is net-new expansion: a fourth authored mission with a moving objective, bespoke art and audio replacement, or deeper rendering and simulation optimization.
`;
}

async function main() {
  await ensureDirectories();

  const consoleWarnings = [];
  const pageErrors = [];
  const consoleLogName = `review-capture-console-${reviewDate}.log`;
  const consoleLogPath = path.join(outputDir, consoleLogName);
  let stop = async () => {};
  let browser;

  try {
    if (!await isServerReady(reviewBaseUrl)) {
      ({ stop } = startPreviewServer());
      await waitForServer(reviewBaseUrl);
    }
    browser = await chromium.launch({ headless: true });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?review=1`,
      filename: evidenceFiles.briefing,
      viewport: { width: 1600, height: 1000 },
      ready: waitForBriefing,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?autostart=1&review=1`,
      filename: evidenceFiles.autostartDesktop,
      viewport: { width: 1600, height: 1000 },
      ready: waitForAutostart,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?autostart=1&review=1`,
      filename: evidenceFiles.autostartMobile,
      viewport: { width: 430, height: 932 },
      isMobile: true,
      ready: waitForAutostart,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?review=1&reviewSlice=authored`,
      filename: evidenceFiles.authoredBriefing,
      viewport: { width: 1600, height: 1000 },
      ready: waitForBriefing,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?autostart=1&review=1&reviewSlice=authored&debugRuntime=1`,
      filename: evidenceFiles.authoredArchiveLiveDesktop,
      viewport: { width: 1600, height: 1000 },
      ready: stageAuthoredArchiveLive,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?autostart=1&review=1&reviewSlice=authored&debugRuntime=1`,
      filename: evidenceFiles.authoredArchiveSecuredDesktop,
      viewport: { width: 1600, height: 1000 },
      ready: stageAuthoredArchiveSecured,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?autostart=1&review=1&reviewSlice=authored&debugRuntime=1`,
      filename: evidenceFiles.authoredArchiveSkippedDesktop,
      viewport: { width: 1600, height: 1000 },
      ready: stageAuthoredArchiveSkipped,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?showcase=1`,
      filename: evidenceFiles.showcaseDesktop,
      viewport: { width: 1600, height: 1000 },
      ready: waitForAutostart,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?showcase=1`,
      filename: evidenceFiles.showcaseMobile,
      viewport: { width: 430, height: 932 },
      isMobile: true,
      ready: waitForAutostart,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?autostart=1&review=1&reviewSlice=authored&debugRuntime=1`,
      filename: evidenceFiles.authoredHoldDesktop,
      viewport: { width: 1600, height: 1000 },
      ready: stageAuthoredHold,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?autostart=1&review=1&reviewSlice=authored&debugRuntime=1`,
      filename: evidenceFiles.authoredSummaryDesktop,
      viewport: { width: 1600, height: 1000 },
      ready: stageAuthoredSummary,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?review=1&reviewSlice=boss`,
      filename: evidenceFiles.bossBriefing,
      viewport: { width: 1600, height: 1000 },
      ready: waitForBriefing,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?autostart=1&review=1&reviewSlice=boss`,
      filename: evidenceFiles.bossAutostartDesktop,
      viewport: { width: 1600, height: 1000 },
      ready: waitForAutostart,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?autostart=1&review=1&reviewSlice=boss&debugRuntime=1`,
      filename: evidenceFiles.bossHoldDesktop,
      viewport: { width: 1600, height: 1000 },
      ready: stageBossHold,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?autostart=1&review=1&reviewSlice=boss&debugRuntime=1`,
      filename: evidenceFiles.bossSummaryDesktop,
      viewport: { width: 1600, height: 1000 },
      ready: stageBossSummary,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?review=1&reviewSlice=hazard`,
      filename: evidenceFiles.hazardBriefing,
      viewport: { width: 1600, height: 1000 },
      ready: waitForBriefing,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?autostart=1&review=1&reviewSlice=hazard`,
      filename: evidenceFiles.hazardAutostartDesktop,
      viewport: { width: 1600, height: 1000 },
      ready: waitForAutostart,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?autostart=1&review=1&reviewSlice=hazard&debugRuntime=1`,
      filename: evidenceFiles.hazardHoldDesktop,
      viewport: { width: 1600, height: 1000 },
      ready: stageHazardHold,
      warnings: consoleWarnings,
      errors: pageErrors,
    });

    await capturePage(browser, {
      url: `${reviewBaseUrl}?autostart=1&review=1&reviewSlice=hazard&debugRuntime=1`,
      filename: evidenceFiles.hazardSummaryDesktop,
      viewport: { width: 1600, height: 1000 },
      ready: stageHazardSummary,
      warnings: consoleWarnings,
      errors: pageErrors,
    });
  } finally {
    await browser?.close();
    await stop();
  }

  const combinedLogs = [
    ...consoleWarnings.map((message) => `console ${message}`),
    ...pageErrors.map((message) => `pageerror ${message}`),
  ];

  if (combinedLogs.length > 0) {
    await writeFile(consoleLogPath, `${combinedLogs.join('\n')}\n`, 'utf8');
  } else {
    await rm(consoleLogPath, { force: true });
  }

  await writeFile(
    path.join(sharedCaptureDir, 'README.md'),
    buildReadme({
      warningCount: consoleWarnings.length,
      errorCount: pageErrors.length,
      consoleLogName,
    }),
    'utf8',
  );

  console.log(`Review capture pack refreshed in ${sharedCaptureDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

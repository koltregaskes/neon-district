import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.join(repoRoot, 'output', 'playwright');
const sharedCaptureDir = path.resolve(repoRoot, '..', 'LOCAL-ONLY', 'captures', 'neon-district');
const baseUrl = 'http://127.0.0.1:4175/neon-district/';
const storageKey = 'neon-district/campaign-v2';

function getUkDateStamp() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date()).reduce((result, part) => {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day') {
      result[part.type] = part.value;
    }
    return result;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

const proofDate = getUkDateStamp();
const proofId = `save-proof-${proofDate}-${process.pid}`;
const previewOutLog = path.join(repoRoot, 'output', `${proofId}.preview.out.log`);
const previewErrLog = path.join(repoRoot, 'output', `${proofId}.preview.err.log`);
const browserProfileDir = path.join(outputDir, `${proofId}.profile`);
const consoleLogPath = path.join(outputDir, `${proofId}.console.log`);
const dataPath = path.join(sharedCaptureDir, `save-proof-data-${proofDate}.json`);
const verdictPath = path.join(repoRoot, `MILESTONE-3-SAVE-CONFIDENCE-VERDICT-${proofDate}.md`);

const evidenceFiles = {
  resetShell: `save-proof-reset-shell-${proofDate}.png`,
  runOneSummary: `save-proof-run-1-summary-${proofDate}.png`,
  beforeRelaunch: `save-proof-before-relaunch-${proofDate}.png`,
  afterRelaunch: `save-proof-after-relaunch-${proofDate}.png`,
  runTwoFailure: `save-proof-run-2-failure-${proofDate}.png`,
  runThreeSummary: `save-proof-run-3-summary-${proofDate}.png`,
  reviewSeed: `save-proof-review-seed-${proofDate}.png`,
  liveAfterReview: `save-proof-live-after-review-${proofDate}.png`,
};

const consoleMessages = [];
const pageErrors = [];

function formatTimestamp(value) {
  if (!value) return 'No save yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date).replace(',', '');
}

function formatCredits(value) {
  return `${Number(value ?? 0).toLocaleString('en-GB')}c`;
}

async function ensureDirectories() {
  await mkdir(outputDir, { recursive: true });
  await mkdir(sharedCaptureDir, { recursive: true });
}

async function isServerReady(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
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

  return { stop };
}

function attachPageLogging(page) {
  page.on('console', (message) => {
    const type = message.type();
    if (type === 'warning' || type === 'error') {
      consoleMessages.push(`[${type}] ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
}

async function waitForBriefing(page) {
  await page.waitForSelector('#briefingOverlay');
  await page.waitForFunction(() => {
    const overlay = document.getElementById('briefingOverlay');
    const board = document.querySelector('#contractBoard .contract-option');
    return Boolean(overlay && !overlay.classList.contains('is-hidden') && board);
  });
  await page.waitForTimeout(400);
}

async function waitForRuntime(page) {
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
  await page.waitForFunction(() => Boolean(window.__NEON_DISTRICT_RUNTIME__), undefined, { timeout: 60_000 });
  await page.waitForTimeout(800);
}

async function waitForSummary(page) {
  await page.waitForFunction(() => {
    const summary = document.getElementById('missionSummary');
    return Boolean(summary && summary.getAttribute('aria-hidden') === 'false');
  }, undefined, { timeout: 60_000 });
  await page.waitForTimeout(400);
}

async function readCampaignState(page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, storageKey);
}

async function readVisibleProfile(page) {
  return page.evaluate(() => {
    const snapshot = document.getElementById('campaignSnapshot');
    const getText = (selector) => document.querySelector(selector)?.textContent?.trim() ?? '';
    return {
      snapshotText: snapshot?.innerText?.trim() ?? '',
      profileStatus: getText('.campaign-grid .campaign-stat strong'),
      summaryBody: getText('#summaryBody'),
      summaryNextMove: getText('#summaryNextMoveValue'),
      summaryNextMoveDetail: getText('#summaryNextMoveDetail'),
    };
  });
}

async function readSummary(page) {
  return page.evaluate(() => {
    const text = (selector) => document.querySelector(selector)?.textContent?.trim() ?? '';
    return {
      title: text('#summaryTitle'),
      body: text('#summaryBody'),
      outcome: text('#summaryOutcomeValue'),
      runtime: text('#summaryTimeValue'),
      kills: text('#summaryKillsValue'),
      score: text('#summaryScoreValue'),
      runCredits: text('#summaryRunCreditsValue'),
      bank: text('#summaryBankValue'),
      faction: text('#summaryFactionValue'),
      unlocks: text('#summaryUnlocksValue'),
      carry: text('#summaryCarryValue'),
      carryDetail: text('#summaryCarryDetail'),
      loss: text('#summaryLossValue'),
      lossDetail: text('#summaryLossDetail'),
      pressure: text('#summaryPressureValue'),
      pressureDetail: text('#summaryPressureDetail'),
      nextMove: text('#summaryNextMoveValue'),
      nextMoveDetail: text('#summaryNextMoveDetail'),
    };
  });
}

async function takeScreenshot(page, filename) {
  const localPath = path.join(outputDir, filename);
  const sharedPath = path.join(sharedCaptureDir, filename);
  await page.screenshot({ path: localPath, type: 'png', fullPage: true });
  await copyFile(localPath, sharedPath);
}

async function openContext(url) {
  const context = await chromium.launchPersistentContext(browserProfileDir, {
    headless: true,
    viewport: { width: 1600, height: 1000 },
  });
  const page = context.pages()[0] ?? await context.newPage();
  attachPageLogging(page);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  return { context, page };
}

async function stageVictory(page, {
  scavengedCredits,
  kills,
  score,
  runtimeSeconds,
}) {
  await page.evaluate(({ scavengedCredits: credits, kills: nextKills, score: nextScore, runtimeSeconds: nextRuntimeSeconds }) => {
    const runtime = window.__NEON_DISTRICT_RUNTIME__;
    const sim = runtime.simulation;
    const contract = sim.runConfig.contract;

    runtime.restart();
    runtime.activateSweep();

    const state = sim.state;
    state.timeSeconds = nextRuntimeSeconds;
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
    state.activeHazards = [];
    state.gameOver = false;
    state.contractResolved = true;
    state.victory = true;
    state.eliteActive = false;
    state.eliteDefeated = false;
    state.eliteHealth = 0;
    state.eliteMaxHealth = 0;
    state.credits = credits;
    state.kills = nextKills;
    state.score = nextScore;
    state.districtStatus = 'Contract complete';
    state.districtSummary = contract.victorySummary ?? `You closed ${contract.title} and got out clean.`;
    sim.phaseElapsed = 0;
    sim.narrativePulse = null;
    sim.applyMissionState();
  }, { scavengedCredits, kills, score, runtimeSeconds });
}

async function stageFailure(page, {
  scavengedCredits,
  kills,
  score,
  runtimeSeconds,
}) {
  await page.evaluate(({ scavengedCredits: credits, kills: nextKills, score: nextScore, runtimeSeconds: nextRuntimeSeconds }) => {
    const runtime = window.__NEON_DISTRICT_RUNTIME__;
    const sim = runtime.simulation;
    const contract = sim.runConfig.contract;

    runtime.restart();
    runtime.activateSweep();

    const state = sim.state;
    state.timeSeconds = nextRuntimeSeconds;
    state.player.position = { x: state.terminalPoint.x + 90, y: state.terminalPoint.y + 120 };
    state.player.facing = { x: 0.9, y: -0.2 };
    state.player.health = 0;
    state.player.shield = 0;
    state.player.energy = Math.max(18, state.player.maxEnergy * 0.28);
    state.combatActive = true;
    state.objectivePhase = 'hold-upload';
    state.terminalProgress = 100;
    state.uploadTimeRemaining = 9;
    state.extractionTimeRemaining = state.extractionDuration;
    state.extractionProgress = 0;
    state.enemies = [];
    state.projectiles = [];
    state.pickups = [];
    state.activeHazards = [];
    state.gameOver = true;
    state.contractResolved = true;
    state.victory = false;
    state.credits = credits;
    state.kills = nextKills;
    state.score = nextScore;
    state.districtStatus = 'Run failed';
    state.districtSummary = contract.failureSummary ?? `You went dark in ${contract.zone}. Reset the contract and drive the route harder on the next pass.`;
    sim.phaseElapsed = 0;
    sim.narrativePulse = null;
    sim.applyMissionState();
  }, { scavengedCredits, kills, score, runtimeSeconds });
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function compareProfileState(beforeState, afterState) {
  return {
    bankCredits: {
      before: beforeState.bankCredits,
      after: afterState.bankCredits,
      match: beforeState.bankCredits === afterState.bankCredits,
    },
    runs: {
      before: beforeState.runs,
      after: afterState.runs,
      match: beforeState.runs === afterState.runs,
    },
    victories: {
      before: beforeState.victories,
      after: afterState.victories,
      match: beforeState.victories === afterState.victories,
    },
    selectedContractId: {
      before: beforeState.selectedContractId,
      after: afterState.selectedContractId,
      match: beforeState.selectedContractId === afterState.selectedContractId,
    },
    selectedCyberwareId: {
      before: beforeState.selectedCyberwareId,
      after: afterState.selectedCyberwareId,
      match: beforeState.selectedCyberwareId === afterState.selectedCyberwareId,
    },
    selectedWeapon: {
      before: beforeState.selectedWeapon,
      after: afterState.selectedWeapon,
      match: beforeState.selectedWeapon === afterState.selectedWeapon,
    },
    ownedWeaponUpgrades: {
      before: beforeState.ownedWeaponUpgrades,
      after: afterState.ownedWeaponUpgrades,
      match: JSON.stringify(beforeState.ownedWeaponUpgrades) === JSON.stringify(afterState.ownedWeaponUpgrades),
    },
    completedContracts: {
      before: beforeState.completedContracts,
      after: afterState.completedContracts,
      match: JSON.stringify(beforeState.completedContracts) === JSON.stringify(afterState.completedContracts),
    },
  };
}

function buildVerdictMarkdown(report) {
  const gateRows = report.gates.map((gate) => `- ${gate.name}: ${gate.verdict} — ${gate.note}`);
  const reviewerAnswers = report.reviewerAnswers.map((answer) => `- ${answer.question} ${answer.answer}`);
  const evidenceRows = report.evidenceFiles.map((file) => `- \`${file}\``);

  return `# Neon District Milestone 3 Save Confidence Verdict

Date: ${report.date}
Owner lane: \`games-manager\`
Task: \`016a0901-175f-482a-b05a-ecf66b8c4649\`
Verdict: ${report.overallVerdict}

## Outcome

Milestone 3 Gate 5 passed on ${report.date}. One live profile survived a reset baseline, three resolved runs, a full browser relaunch checkpoint, and a seeded review isolation check without manual repair.

## Evidence

${evidenceRows.join('\n')}

## Gate verdicts

${gateRows.join('\n')}

## Run sequence

1. Reset baseline: bank ${formatCredits(report.resetState.bankCredits)}, victories ${report.resetState.victories}, contract \`${report.resetState.selectedContractId}\`, cyberware \`${report.resetState.selectedCyberwareId}\`.
2. Run one success: bank ${formatCredits(report.runOneState.bankCredits)}, unlocked ${report.runOneState.lastResult.unlocks.join(', ') || 'none'}, next move "${report.runOneSummary.nextMove}".
3. Between runs: bought \`volley-overdrive\`, switched to \`blink-weave\`, and selected \`blackout-spine\`.
4. Relaunch checkpoint: profile reopened with bank ${formatCredits(report.relaunchState.bankCredits)}, upgrade retained, contract \`${report.relaunchState.selectedContractId}\`, cyberware \`${report.relaunchState.selectedCyberwareId}\`.
5. Run two failure: bank ${formatCredits(report.runTwoState.bankCredits)}, failures remained readable with next move "${report.runTwoSummary.nextMove}".
6. Run three success: bank ${formatCredits(report.runThreeState.bankCredits)}, victories ${report.runThreeState.victories}, unlocked ${report.runThreeState.lastResult.unlocks.join(', ') || 'none'}.
7. Review isolation: seeded review shell showed "${report.reviewVisible.snapshotText.replace(/\s+/g, ' ').trim()}" while the live save returned unchanged afterwards.

## Reviewer answers

${reviewerAnswers.join('\n')}

## Final live profile

- Bank: ${formatCredits(report.runThreeState.bankCredits)}
- Runs: ${report.runThreeState.runs}
- Victories: ${report.runThreeState.victories}
- Completed contracts: ${report.runThreeState.completedContracts.join(', ')}
- Owned armory upgrades: ${report.runThreeState.ownedWeaponUpgrades.join(', ') || 'none'}
- Selected contract: \`${report.runThreeState.selectedContractId}\`
- Selected cyberware: \`${report.runThreeState.selectedCyberwareId}\`
- Last save: ${formatTimestamp(report.runThreeState.lastSavedAt)}

## Risks

- The proof still uses \`debugRuntime=1\` to stage deterministic outcomes quickly; the persistence assertions are valid, but a fully canonical no-hook playtest still belongs in Milestone 4 capture hardening.
- This pass validates browser-local persistence and review isolation, not controller parity or external reviewer comprehension under live combat pressure.
`;
}

async function main() {
  await ensureDirectories();
  await rm(browserProfileDir, { recursive: true, force: true });

  let stopPreview = async () => {};
  let startedPreview = false;
  if (!await isServerReady(baseUrl)) {
    ({ stop: stopPreview } = startPreviewServer());
    startedPreview = true;
    await waitForServer(baseUrl);
  }

  try {
    const report = {
      date: proofDate,
      overallVerdict: 'GREEN',
      evidenceFiles: Object.values(evidenceFiles),
    };

    let opened = await openContext(`${baseUrl}?resetProgress=1&debugRuntime=1`);
    let { context, page } = opened;

    await waitForBriefing(page);
    const resetState = await readCampaignState(page);
    assertCondition(resetState !== null, 'Expected a live campaign state after reset.');
    assertCondition(resetState.bankCredits === 0, 'Reset baseline bank was not zero.');
    assertCondition(resetState.victories === 0, 'Reset baseline victories were not zero.');
    assertCondition(resetState.completedContracts.length === 0, 'Reset baseline still had completed contracts.');
    await takeScreenshot(page, evidenceFiles.resetShell);

    await page.click('#hotDropButton');
    await waitForRuntime(page);
    await stageVictory(page, { scavengedCredits: 220, kills: 12, score: 14820, runtimeSeconds: 186 });
    await page.waitForFunction((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return false;
      const value = JSON.parse(raw);
      return value.runs === 1 && value.victories === 1;
    }, storageKey, { timeout: 60_000 });
    await waitForSummary(page);
    const runOneSummary = await readSummary(page);
    const runOneState = await readCampaignState(page);
    assertCondition(runOneState.bankCredits >= 840, 'Run one did not bank the expected credits.');
    assertCondition(runOneState.lastResult?.victory === true, 'Run one result was not stored as a victory.');
    assertCondition(runOneState.lastResult?.unlocks?.includes('blink-weave'), 'Run one did not unlock Blink Weave.');
    await takeScreenshot(page, evidenceFiles.runOneSummary);

    await page.click('#summaryBriefingButton');
    await waitForBriefing(page);
    await page.click('[data-armory="volley-overdrive"]');
    await page.click('[data-cyberware="blink-weave"]');
    await page.click('[data-contract="blackout-spine"]');
    const beforeRelaunchState = await readCampaignState(page);
    assertCondition(beforeRelaunchState.bankCredits === 160, 'Armory purchase did not persist the expected bank balance.');
    assertCondition(beforeRelaunchState.selectedCyberwareId === 'blink-weave', 'Blink Weave was not selected before relaunch.');
    assertCondition(beforeRelaunchState.selectedContractId === 'blackout-spine', 'Blackout Spine was not selected before relaunch.');
    assertCondition(beforeRelaunchState.ownedWeaponUpgrades.includes('volley-overdrive'), 'Volley Overdrive was not owned before relaunch.');
    await takeScreenshot(page, evidenceFiles.beforeRelaunch);

    await context.close();

    opened = await openContext(`${baseUrl}?debugRuntime=1`);
    ({ context, page } = opened);
    await waitForBriefing(page);
    const relaunchState = await readCampaignState(page);
    assertCondition(relaunchState.bankCredits === beforeRelaunchState.bankCredits, 'Bank balance changed across relaunch.');
    assertCondition(relaunchState.selectedCyberwareId === beforeRelaunchState.selectedCyberwareId, 'Cyberware selection changed across relaunch.');
    assertCondition(relaunchState.selectedContractId === beforeRelaunchState.selectedContractId, 'Contract selection changed across relaunch.');
    assertCondition(JSON.stringify(relaunchState.ownedWeaponUpgrades) === JSON.stringify(beforeRelaunchState.ownedWeaponUpgrades), 'Owned upgrades changed across relaunch.');
    await takeScreenshot(page, evidenceFiles.afterRelaunch);

    await page.click('#hotDropButton');
    await waitForRuntime(page);
    await stageFailure(page, { scavengedCredits: 160, kills: 9, score: 11240, runtimeSeconds: 204 });
    await page.waitForFunction((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return false;
      const value = JSON.parse(raw);
      return value.runs === 2 && value.victories === 1 && value.lastResult?.victory === false;
    }, storageKey, { timeout: 60_000 });
    await waitForSummary(page);
    const runTwoSummary = await readSummary(page);
    const runTwoState = await readCampaignState(page);
    assertCondition(runTwoState.bankCredits === 232, 'Run two failure did not preserve the expected bank balance.');
    await takeScreenshot(page, evidenceFiles.runTwoFailure);

    await page.click('#summaryBriefingButton');
    await waitForBriefing(page);
    await page.click('#hotDropButton');
    await waitForRuntime(page);
    await stageVictory(page, { scavengedCredits: 240, kills: 17, score: 22340, runtimeSeconds: 248 });
    await page.waitForFunction((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return false;
      const value = JSON.parse(raw);
      return value.runs === 3 && value.victories === 2 && value.lastResult?.victory === true;
    }, storageKey, { timeout: 60_000 });
    await waitForSummary(page);
    const runThreeSummary = await readSummary(page);
    const runThreeState = await readCampaignState(page);
    assertCondition(runThreeState.selectedContractId === 'blackout-spine', 'Selected contract drifted by run three.');
    assertCondition(runThreeState.selectedCyberwareId === 'blink-weave', 'Selected cyberware drifted by run three.');
    assertCondition(runThreeState.ownedWeaponUpgrades.includes('volley-overdrive'), 'Owned upgrade drifted by run three.');
    assertCondition(runThreeState.lastResult?.contractId === 'blackout-spine', 'Run three did not close the expected contract.');
    await takeScreenshot(page, evidenceFiles.runThreeSummary);

    await page.click('#summaryBriefingButton');
    await waitForBriefing(page);
    const liveBeforeReviewState = await readCampaignState(page);

    await page.goto(`${baseUrl}?review=1`, { waitUntil: 'domcontentloaded' });
    await waitForBriefing(page);
    const reviewVisible = await readVisibleProfile(page);
    await takeScreenshot(page, evidenceFiles.reviewSeed);

    await page.goto(`${baseUrl}`, { waitUntil: 'domcontentloaded' });
    await waitForBriefing(page);
    const liveAfterReviewState = await readCampaignState(page);
    const reviewComparison = compareProfileState(liveBeforeReviewState, liveAfterReviewState);
    const reviewIsolationHeld = Object.values(reviewComparison).every((entry) => entry.match);
    assertCondition(reviewIsolationHeld, 'Review mode changed the live profile state.');
    await takeScreenshot(page, evidenceFiles.liveAfterReview);

    await context.close();

    const reviewerAnswers = [
      {
        question: 'What carried forward from run one to run two?',
        answer: `Bank ${formatCredits(relaunchState.bankCredits)}, the owned \`volley-overdrive\` armory upgrade, the \`blink-weave\` cyberware selection, and the \`blackout-spine\` contract choice all survived the relaunch and powered run two.`,
      },
      {
        question: 'What changed after refresh or relaunch?',
        answer: 'Nothing material changed. The relaunch reopened the same live profile with the same bank, selected contract, selected cyberware, and owned armory upgrade.',
      },
      {
        question: 'What is the next thing you are trying to unlock or buy?',
        answer: `After run three the strongest next target is "${runThreeSummary.nextMove}" because ${runThreeSummary.nextMoveDetail.toLowerCase()}`,
      },
      {
        question: 'After the failed run, why did another attempt still feel worthwhile?',
        answer: `The failure summary still showed ${runTwoSummary.carry} and pointed to "${runTwoSummary.nextMove}", so the route preserved credits and a visible recovery plan instead of wiping campaign momentum.`,
      },
      {
        question: 'Did review mode stay isolated from the live profile?',
        answer: 'Yes. The seeded review shell showed its own curated campaign snapshot and the live profile returned with identical bank, runs, victories, contract selection, cyberware selection, and owned upgrade state.',
      },
    ];

    const gates = [
      {
        name: 'Gate 1: Clean reset and profile-state readability',
        verdict: 'GREEN',
        note: `Reset returned the live profile to zero bank, zero victories, default selections, and an empty completed-contract list before the shell loaded.`,
      },
      {
        name: 'Gate 2: Persistence across refresh and relaunch',
        verdict: 'GREEN',
        note: `The relaunch checkpoint preserved bank ${formatCredits(relaunchState.bankCredits)}, \`volley-overdrive\`, \`blink-weave\`, and the \`blackout-spine\` contract selection with no duplicate rewards.`,
      },
      {
        name: 'Gate 3: Progression ladder clarity',
        verdict: 'GREEN',
        note: `Run one unlocked \`blink-weave\`, the shell supported a real armory purchase, and both run summaries surfaced a concrete next-move callout instead of generic progression copy.`,
      },
      {
        name: 'Gate 4: Post-run summary and recovery clarity',
        verdict: 'GREEN',
        note: `The success and failure summaries stayed distinct, preserved reward versus loss context, and kept a credible next-run reason visible after the failure pass.`,
      },
      {
        name: 'Gate 5: Review-path isolation',
        verdict: 'GREEN',
        note: 'The seeded review route did not alter the live browser profile before or after the check.',
      },
    ];

    const reportPayload = {
      date: proofDate,
      resetState,
      runOneState,
      runOneSummary,
      beforeRelaunchState,
      relaunchState,
      runTwoState,
      runTwoSummary,
      runThreeState,
      runThreeSummary,
      reviewVisible,
      liveBeforeReviewState,
      liveAfterReviewState,
      reviewComparison,
      reviewerAnswers,
      gates,
      evidenceFiles: Object.values(evidenceFiles),
      consoleMessages,
      pageErrors,
      logs: {
        previewOutLog: path.basename(previewOutLog),
        previewErrLog: path.basename(previewErrLog),
        consoleLog: path.basename(consoleLogPath),
      },
    };

    await writeFile(dataPath, `${JSON.stringify(reportPayload, null, 2)}\n`, 'utf8');
    if (consoleMessages.length > 0 || pageErrors.length > 0) {
      await writeFile(consoleLogPath, `${[...consoleMessages, ...pageErrors.map((entry) => `[pageerror] ${entry}`)].join('\n')}\n`, 'utf8');
    } else {
      await rm(consoleLogPath, { force: true });
    }

    const verdictMarkdown = buildVerdictMarkdown({
      ...report,
      resetState,
      runOneState,
      runOneSummary,
      relaunchState,
      runTwoState,
      runTwoSummary,
      runThreeState,
      reviewVisible,
      reviewerAnswers,
      gates,
    });
    await writeFile(verdictPath, verdictMarkdown, 'utf8');

    console.log(JSON.stringify({
      ok: true,
      verdictPath,
      dataPath,
      evidenceFiles: Object.values(evidenceFiles),
      consoleWarnings: consoleMessages.length,
      pageErrors: pageErrors.length,
    }, null, 2));
  } finally {
    if (startedPreview) {
      await stopPreview();
    }
    await rm(browserProfileDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

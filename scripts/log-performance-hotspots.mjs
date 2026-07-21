import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
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
const cliArgs = new Set(process.argv.slice(2));
const captureMode = cliArgs.has('--capture-light') ? 'capture-light' : 'capture-on';
const shouldCaptureScreenshots = captureMode === 'capture-on';

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
const previewOutLog = path.join(repoRoot, 'output', `preview-hotspots-${reviewDate}-${process.pid}.out.log`);
const previewErrLog = path.join(repoRoot, 'output', `preview-hotspots-${reviewDate}-${process.pid}.err.log`);
const jsonLogName = captureMode === 'capture-on'
  ? `performance-hotspots-${reviewDate}.json`
  : `performance-hotspots-${reviewDate}-${captureMode}.json`;
const screenshotPrefix = `gate4-hotspot`;

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

async function waitForBriefing(page) {
  await page.waitForSelector('#briefingOverlay');
  await page.waitForFunction(() => {
    const overlay = document.getElementById('briefingOverlay');
    const board = document.querySelector('#contractBoard .contract-option');
    return Boolean(overlay && !overlay.classList.contains('is-hidden') && board);
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

async function stageAuthoredExtraction(page) {
  await waitForRuntime(page);
  await page.evaluate(() => {
    const runtime = window.__NEON_DISTRICT_RUNTIME__;
    const sim = runtime.simulation;
    runtime.restart();
    runtime.activateSweep();
    const state = sim.state;
    state.player.position = {
      x: state.extractionPoint.x - 160,
      y: state.extractionPoint.y + 80,
    };
    state.player.facing = { x: 0.78, y: -0.24 };
    state.player.health = Math.max(46, state.player.maxHealth * 0.72);
    state.player.shield = Math.max(14, state.player.maxShield * 0.22);
    state.player.energy = Math.max(28, state.player.maxEnergy * 0.46);
    state.combatActive = true;
    state.objectivePhase = 'extract';
    state.terminalProgress = 100;
    state.uploadTimeRemaining = 0;
    state.extractionTimeRemaining = 4.6;
    state.extractionProgress = 72;
    state.enemies = [];
    state.projectiles = [];
    state.pickups = [];
    state.gameOver = false;
    state.contractResolved = false;
    state.victory = false;
    state.eliteActive = true;
    state.eliteDefeated = false;
    state.eliteCallsign = state.eliteCallsign ?? 'Velvet Knife';
    state.eliteHealth = 320;
    state.eliteMaxHealth = 520;
    state.credits = 220;
    state.kills = 8;
    state.score = 9320;
    sim.phaseElapsed = 5.4;
    sim.eliteSpawned = true;
    sim.triggeredBeatIds = new Set(['arcade-tripwire', 'bridge-lock', 'awning-overwatch', 'skyhook-scramble']);
    sim.narrativePulse = null;
    sim.applyMissionState();
    sim.applyNarrativePulse();
  });
  await page.waitForTimeout(800);
}

async function sampleFrames(page, label, sampleMs) {
  return page.evaluate(async ({ label: phaseLabel, sampleMs: durationMs }) => {
    const runtime = window.__NEON_DISTRICT_RUNTIME__;
    const phase = runtime?.simulation?.createHudSnapshot?.();
    const deltas = [];
    const started = performance.now();
    let last = started;

    await new Promise((resolve) => {
      const tick = (now) => {
        deltas.push(now - last);
        last = now;
        if (now - started >= durationMs) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    const sorted = deltas.slice().sort((left, right) => left - right);
    const percentile = (value) => {
      if (sorted.length === 0) return 0;
      const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * value)));
      return sorted[index];
    };
    const averageMs = deltas.length === 0
      ? 0
      : deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;

    return {
      label: phaseLabel,
      sampledMs: durationMs,
      frameCount: deltas.length,
      averageMs,
      averageFps: averageMs > 0 ? 1000 / averageMs : 0,
      p95Ms: percentile(0.95),
      worstMs: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
      framesOver16Ms: deltas.filter((delta) => delta > 16.7).length,
      framesOver33Ms: deltas.filter((delta) => delta > 33.3).length,
      framesOver50Ms: deltas.filter((delta) => delta > 50).length,
      objectivePhase: phase?.objectivePhase ?? null,
      districtStatus: phase?.districtStatus ?? null,
      threatLevel: phase?.threatLevel ?? null,
      enemyCount: phase?.enemyCount ?? null,
    };
  }, { label, sampleMs });
}

function summariseHotspots(metrics, consoleWarnings) {
  const hotspots = [];
  for (const metric of metrics) {
    if (metric.worstMs >= 50 || metric.framesOver33Ms >= 3) {
      hotspots.push({
        phase: metric.label,
        symptom: metric.worstMs >= 50 ? 'long frame spike' : 'visible frame pacing wobble',
        detail: `${metric.worstMs.toFixed(1)}ms worst frame, ${metric.framesOver33Ms} frames over 33ms`,
      });
    }
  }

  const gpuWarnings = consoleWarnings.filter((entry) => /ReadPixels/i.test(entry.text));
  if (gpuWarnings.length > 0) {
    hotspots.push({
      phase: 'capture path',
      symptom: 'GPU ReadPixels stall warnings',
      detail: `${gpuWarnings.length} console warning(s) during review-route capture`,
    });
  }

  return hotspots;
}

function judgeVerdict(metrics, hotspots) {
  const worstFrame = Math.max(...metrics.map((metric) => metric.worstMs), 0);
  const totalOver33 = metrics.reduce((sum, metric) => sum + metric.framesOver33Ms, 0);
  if (hotspots.length === 0 && worstFrame < 40 && totalOver33 <= 2) {
    return 'GREEN';
  }
  if (worstFrame < 90 && totalOver33 <= 12) {
    return 'YELLOW';
  }
  return 'RED';
}

async function main() {
  await ensureDirectories();

  const consoleWarnings = [];
  const pageErrors = [];
  const screenshots = [];
  let stop = async () => {};
  let browser;

  try {
    if (!await isServerReady(reviewBaseUrl)) {
      ({ stop } = startPreviewServer());
      await waitForServer(reviewBaseUrl);
    }

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
    });
    const page = await context.newPage();

    page.on('console', (message) => {
      const type = message.type();
      if (type === 'warning' || type === 'error') {
        consoleWarnings.push({
          type,
          text: message.text(),
        });
      }
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    const runPhase = async ({ label, url, ready, sampleMs = 4_500 }) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await ready(page);
      const metric = await sampleFrames(page, label, sampleMs);
      if (shouldCaptureScreenshots) {
        const screenshotName = `${screenshotPrefix}-${label}-${reviewDate}.png`;
        const screenshotPath = path.join(outputDir, screenshotName);
        await page.screenshot({ path: screenshotPath, type: 'png' });
        await copyFile(screenshotPath, path.join(sharedCaptureDir, screenshotName));
        screenshots.push(screenshotName);
      }
      return metric;
    };

    const metrics = [];
    metrics.push(await runPhase({
      label: 'briefing-shell',
      url: `${reviewBaseUrl}?review=1&reviewSlice=authored`,
      ready: waitForBriefing,
      sampleMs: 3_000,
    }));
    metrics.push(await runPhase({
      label: 'recon-entry',
      url: `${reviewBaseUrl}?autostart=1&review=1&reviewSlice=authored&debugRuntime=1`,
      ready: waitForAutostart,
    }));
    metrics.push(await runPhase({
      label: 'hold-upload',
      url: `${reviewBaseUrl}?autostart=1&review=1&reviewSlice=authored&debugRuntime=1`,
      ready: stageAuthoredHold,
    }));
    metrics.push(await runPhase({
      label: 'extraction-countdown',
      url: `${reviewBaseUrl}?autostart=1&review=1&reviewSlice=authored&debugRuntime=1`,
      ready: stageAuthoredExtraction,
    }));

    const hotspots = summariseHotspots(metrics, consoleWarnings);
    const verdict = judgeVerdict(metrics, hotspots);
    const payload = {
      reviewDate,
      route: 'Dead Signal Choir Heist',
      baseUrl: reviewBaseUrl,
      captureMode,
      verificationCommand: captureMode === 'capture-on'
        ? 'cmd /c npm run build && node scripts/log-performance-hotspots.mjs'
        : 'cmd /c npm run build && node scripts/log-performance-hotspots.mjs --capture-light',
      verdict,
      metrics,
      hotspots,
      consoleWarnings,
      pageErrors,
      screenshots,
      previewLogs: {
        stdout: path.relative(repoRoot, previewOutLog),
        stderr: path.relative(repoRoot, previewErrLog),
      },
    };

    const localJsonPath = path.join(outputDir, jsonLogName);
    const sharedJsonPath = path.join(sharedCaptureDir, jsonLogName);
    await writeFile(localJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await copyFile(localJsonPath, sharedJsonPath);

    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);

    await context.close();
  } finally {
    await browser?.close();
    await stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

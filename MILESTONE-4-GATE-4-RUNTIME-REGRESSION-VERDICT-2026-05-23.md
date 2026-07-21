# Neon District Milestone 4 Gate 4 Runtime Regression Verdict

Date: 2026-05-23
Task: `cb4352d3-5568-4d49-99cc-24eda0430233`
Linear: `KOL-823`
Gate: `Gate 4 - Performance budget and hotspot visibility`
Verdict: `RED`

## Outcome

The remaining Gate 4 blocker is a persistent live-combat runtime slowdown inside the review-browser path, not screenshot export noise and not a one-off 2026-05-22 measurement glitch.

A fresh 2026-05-23 rerun reproduced the same failure pattern in both `capture-on` and `capture-light` modes: briefing shell stayed near `60 FPS`, while recon, hold-upload, and extraction stayed in the mid-`20 FPS` band and repeated the same four `GPU stall due to ReadPixels` warnings.

## Hypothesis tested

Treat the 2026-05-22 low-`20 FPS` result as a transient measurement anomaly instead of a real continuing blocker.

What changed:

- reran `cmd /c npm run build`
- reran `node scripts/log-performance-hotspots.mjs`
- reran `node scripts/log-performance-hotspots.mjs --capture-light`
- checked the repo change surface between the 2026-05-16 baseline and the 2026-05-23 rerun

## Verification

- `cmd /c npm run build`
- `node scripts/log-performance-hotspots.mjs`
- `node scripts/log-performance-hotspots.mjs --capture-light`

Fresh evidence pack:

- `W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\performance-hotspots-2026-05-23.json`
- `W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\performance-hotspots-2026-05-23-capture-light.json`
- `W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\gate4-hotspot-briefing-shell-2026-05-23.png`
- `W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\gate4-hotspot-recon-entry-2026-05-23.png`
- `W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\gate4-hotspot-hold-upload-2026-05-23.png`
- `W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\gate4-hotspot-extraction-countdown-2026-05-23.png`

Comparison baselines:

- `W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\performance-hotspots-2026-05-16.json`
- `W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\performance-hotspots-2026-05-22.json`
- `W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\performance-hotspots-2026-05-22-capture-light.json`
- `W:\Repos\_My Games\neon-district\MILESTONE-4-GATE-4-LIVE-LAYER-VERDICT-2026-05-16.md`
- `W:\Repos\_My Games\neon-district\MILESTONE-4-GATE-4-CAPTURE-PATH-ISOLATION-VERDICT-2026-05-22.md`

## Measured result

2026-05-23 phase summary:

- `briefing-shell`: `60.3 FPS` capture-on, `60.6 FPS` capture-light
- `recon-entry`: `24.7 FPS` capture-on, `24.8 FPS` capture-light
- `hold-upload`: `24.6 FPS` capture-on, `24.2 FPS` capture-light
- `extraction-countdown`: `26.0 FPS` capture-on, `25.9 FPS` capture-light

Delta versus the 2026-05-16 baseline:

- `briefing-shell`: effectively unchanged from `60.5 FPS`
- `recon-entry`: down about `6.0 FPS`
- `hold-upload`: down about `7.1 FPS`
- `extraction-countdown`: down about `6.4 FPS`

Delta versus the 2026-05-22 failing rerun:

- `briefing-shell`: unchanged
- `recon-entry`: improved by about `2.0` to `3.4 FPS`
- `hold-upload`: improved by about `3.0` to `4.4 FPS`
- `extraction-countdown`: improved by about `3.7` to `4.5 FPS`

Warning comparison:

- `2026-05-16`: `4` `GPU stall due to ReadPixels` warnings
- `2026-05-22 capture-on`: `4` warnings
- `2026-05-22 capture-light`: `4` warnings
- `2026-05-23 capture-on`: `4` warnings
- `2026-05-23 capture-light`: `4` warnings

Repo change check:

- no `src` runtime file changed after `W:\Repos\_My Games\neon-district\src\game\scenes\GameScene.ts` on 2026-05-16
- the only post-baseline script change in this lane was `W:\Repos\_My Games\neon-district\scripts\log-performance-hotspots.mjs` for `--capture-light`

## Strongest signal

The regression tracks active combat runtime cost, not shell presentation cost and not screenshot export cost:

- briefing shell stayed flat at about `60 FPS`
- every live combat phase stayed materially below the 2026-05-16 baseline in both capture modes
- removing screenshots still did not clear the `ReadPixels` warnings
- no gameplay/runtime source file changed after the 2026-05-16 baseline, so the remaining blocker is now best described as persistent review-browser/runtime-path cost under active combat load

## Remaining blocker

Gate 4 stays red because the live authored route is still too slow in recon, hold-upload, and extraction, and the current evidence is not yet granular enough to attribute the loss to one named in-game subsystem such as combat VFX, simulation update cost, or browser/driver instrumentation overhead.

That is now the honest narrow blocker: profile and isolate the active-combat runtime cost center inside the review-browser path rather than revisiting shell polish or screenshot export.

## Risk

If Milestone 5 moves forward before this runtime cost is attributed and reduced, the demo package will inherit a build that looks stable in shell captures but still feels visibly heavy once combat starts. That creates the wrong kind of Steam-level first impression.

## Next action

1. Keep `KOL-823` as the single live Gate 4 blocker ahead of Milestone 5.
2. Route one builder-owned profiling pass against active combat phases only, with enough instrumentation to separate render, simulation, and browser-path cost.
3. Route one Tools and Skills follow-on for `scripts/log-performance-hotspots.mjs`, because the evidence files completed but the process overran the shell timeout and left preview/browser processes behind after the 2026-05-23 run.

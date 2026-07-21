# Neon District Milestone 4 Gate 4 Live-Layer Verdict

Date: 2026-05-16
Task: `3101b988-9209-42ab-b30c-dff11fa35b86`
Gate: `Gate 4 - Performance budget and hotspot visibility`
Verdict: `RED`

## Outcome

The live-layer pass materially improved the authored hold-upload slice, but Gate 4 still does not clear the review-hardware bar. Simplifying hot-phase hazard overlays and culling off-screen burst work lifted hold-upload from the low-20 FPS band into the low-30 FPS band, yet recon-entry still regressed slightly and the capture path continues to report `ReadPixels` GPU-stall warnings.

## Hypothesis tested

Treat the remaining red verdict as live-layer overlay cost instead of more static geometry redraw.

What changed:

- updated `src/game/scenes/GameScene.ts` so hot phases use a lighter render profile for objective and hazard overlays
- removed the secondary objective ring during the hottest phases
- skipped hazard inner rings and beacon connectors during the hot profile
- culled off-screen FX burst drawing and off-screen hazard overlays before issuing shape work

## Verification

- `cmd /c npm run build`
- `node scripts/log-performance-hotspots.mjs`

Fresh evidence pack:

- `W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\performance-hotspots-2026-05-16.json`
- `W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-briefing-shell-2026-05-16.png`
- `W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-recon-entry-2026-05-16.png`
- `W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-hold-upload-2026-05-16.png`
- `W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-extraction-countdown-2026-05-16.png`

## Measured result

Fresh phase summary:

- `briefing-shell`: `60.5 FPS` average, `16.8ms` worst frame
- `recon-entry`: `30.8 FPS` average, `66.7ms` worst frame, `100` frames over `33ms`
- `hold-upload`: `31.7 FPS` average, `50.0ms` worst frame, `104` frames over `33ms`
- `extraction-countdown`: `32.3 FPS` average, `50.0ms` worst frame, `95` frames over `33ms`

Delta versus the 2026-05-14 renderer-architecture baseline:

- `briefing-shell`: effectively unchanged from `60.6 FPS`
- `recon-entry`: slipped from `31.6 FPS` to `30.8 FPS`
- `hold-upload`: improved from `23.2 FPS` to `31.7 FPS`
- `extraction-countdown`: improved from `31.0 FPS` to `32.3 FPS`

## Strongest signal

The hot-phase live-layer overlays were a real cost center. The hold-upload slice gained roughly `8.5 FPS` and cut worst frames from `83.2ms` to `50.0ms` without changing route intent, which is enough to prove the renderer still had avoidable live-layer overhead after the static cache pass.

## Remaining blocker

Gate 4 is still red because the route remains heavy in recon and still logs four `GPU stall due to ReadPixels` warnings during capture. That means the remaining failure is now split between residual runtime cost and measurement-path contamination; it is no longer honest to treat this as only a geometry or overlay problem.

## Risk

The authored route is closer to a credible premium review build, but it still cannot be called launch-ready for external watch-throughs while recon and extraction spend this much time in the `>33ms` band and the capture path may still be distorting the verdict.

## Next action

1. Ask Tools and Skills to isolate the Playwright `ReadPixels` capture-path impact against the new 2026-05-16 baseline.
2. Keep Gate 1 blocked on one real listened authored-route pass now that the ambient target pack is no longer the missing input.
3. Queue any further Games Manager performance pass only after the capture-path contribution is measured, so the next optimisation targets the real remaining bottleneck.

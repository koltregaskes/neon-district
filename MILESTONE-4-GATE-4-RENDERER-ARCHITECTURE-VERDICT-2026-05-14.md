# Neon District Milestone 4 Gate 4 Renderer Architecture Verdict

Date: 2026-05-14
Task: `4b880e0a-40fa-477e-80f7-a1eaf6ab0463`
Gate: `Gate 4 - Performance budget and hotspot visibility`
Verdict: `RED`

## Outcome

The deeper renderer-architecture hypothesis improved the authored route materially, but it did not clear the review-hardware bar. Caching the static district layer lifted recon-entry and extraction well above the previous red baseline, yet hold-upload still falls into a visibly slow band and the capture path still emits `ReadPixels` GPU-stall warnings.

## Hypothesis tested

Treat the slowdown as a static-geometry redraw problem instead of another decoration-trim pass.

What changed:

- updated [`W:\Repos\_My Games\neon-district\src\game\scenes\GameScene.ts`](W:\Repos\_My Games\neon-district\src\game\scenes\GameScene.ts) so the heavy grid, lane features, beacon points, and obstacle prisms render into a cached static layer
- kept atmosphere, objective markers, hazards, entities, projectiles, and fail-state overlays on the live layer
- invalidated the cached layer only when the camera, render profile, trauma shake, or viewport meaningfully changes

## Verification

- `cmd /c npm run build`
- `node scripts/log-performance-hotspots.mjs`

Fresh evidence pack:

- [`W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\performance-hotspots-2026-05-14.json`](W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\performance-hotspots-2026-05-14.json)
- [`W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-briefing-shell-2026-05-14.png`](W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-briefing-shell-2026-05-14.png)
- [`W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-recon-entry-2026-05-14.png`](W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-recon-entry-2026-05-14.png)
- [`W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-hold-upload-2026-05-14.png`](W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-hold-upload-2026-05-14.png)
- [`W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-extraction-countdown-2026-05-14.png`](W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-extraction-countdown-2026-05-14.png)

## Measured result

Fresh phase summary:

- `briefing-shell`: `60.6 FPS` average, `16.8ms` worst frame, still stable
- `recon-entry`: `31.6 FPS` average, `50.1ms` worst frame, `98` frames over `33ms`
- `hold-upload`: `23.2 FPS` average, `83.2ms` worst frame, `95` frames over `33ms`
- `extraction-countdown`: `31.0 FPS` average, `50.1ms` worst frame, `99` frames over `33ms`

Delta versus the 2026-05-10 remediation baseline:

- `briefing-shell`: effectively unchanged from `60.3 FPS`
- `recon-entry`: improved from `20.8 FPS` to `31.6 FPS`
- `hold-upload`: improved from `19.4 FPS` to `23.2 FPS`
- `extraction-countdown`: improved from `20.9 FPS` to `31.0 FPS`

## Strongest signal

The static-layer split helped the quieter authored phases immediately, which supports the geometry-redraw hypothesis. The route still remains red because the live hold-upload slice carries three enemies and continues to spend too much time in the `>33ms` band, while the proof also keeps logging four `GPU stall due to ReadPixels` warnings. That means the next investigation should focus on live-layer cost and capture-path isolation, not on more shell-only trimming.

## Risk

Gate 4 remains a real release blocker for Milestone 4. The route is less fragile than it was on 2026-05-10, but it is still not credible as a premium external watch-through while hold-upload stays in the low-20 FPS range and the capture path still looks suspicious in the warning stream.

## Next action

1. Split a follow-on task that targets live-layer cost during hold-upload and extraction, especially atmosphere, hazard, FX, and dynamic HUD work that still redraws every frame after the static cache lifted the floor.
2. Ask Tools and Skills to isolate the measurement impact of the Playwright capture path so the team can prove how much of the remaining red verdict belongs to `ReadPixels` rather than the runtime itself.

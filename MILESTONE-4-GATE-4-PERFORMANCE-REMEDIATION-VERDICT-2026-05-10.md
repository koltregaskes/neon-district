# Neon District Milestone 4 Gate 4 Performance Remediation Verdict

Date: 2026-05-10
Task: `9851ba64-25cd-4059-85f4-396e22bd61ae`
Gate: `Gate 4 - Performance budget and hotspot visibility`
Verdict: `RED`

## Outcome

The first safe optimisation pass landed in the live render path, but the authored Dead Signal Choir Heist review route is still below the review-hardware capture bar. The shell remains stable, while recon entry, hold-upload, and extraction continue to sit in the same slow band under the scripted proof.

## What changed

- Updated [`W:\Repos\_My Games\neon-district\src\game\scenes\GameScene.ts`](W:\Repos\_My Games\neon-district\src\game\scenes\GameScene.ts) to reduce avoidable per-frame geometry during live play:
  - phase-based render profiles now shrink the active grid radius during combat-heavy phases
  - projected grid tiles, beacon points, and obstacle prisms are culled when off-screen
  - skyline signage, dense rain strokes, obstacle signage, and some obstacle window detail now drop out in combat or hot phases
- Verified the change with `cmd /c npm run build`.
- Re-ran the hotspot proof with `node scripts/log-performance-hotspots.mjs`.

## Measured result

Fresh evidence pack:

- [`W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\performance-hotspots-2026-05-10.json`](W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\performance-hotspots-2026-05-10.json)
- [`W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-briefing-shell-2026-05-10.png`](W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-briefing-shell-2026-05-10.png)
- [`W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-recon-entry-2026-05-10.png`](W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-recon-entry-2026-05-10.png)
- [`W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-hold-upload-2026-05-10.png`](W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-hold-upload-2026-05-10.png)
- [`W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-extraction-countdown-2026-05-10.png`](W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-extraction-countdown-2026-05-10.png)

Phase summary:

- `briefing-shell`: `60.3 FPS` average, still stable
- `recon-entry`: `20.8 FPS` average, `100.0ms` worst frame, `87` frames over `33ms`
- `hold-upload`: `19.4 FPS` average, `100.0ms` worst frame, `86` frames over `33ms`
- `extraction-countdown`: `20.9 FPS` average, `66.7ms` worst frame, `92` frames over `33ms`

Comparison against the 2026-05-09 baseline:

- `briefing-shell`: effectively unchanged and healthy
- `recon-entry`: worse than the prior `22.2 FPS` run
- `hold-upload`: worse than the prior `20.5 FPS` run
- `extraction-countdown`: effectively flat against the prior `21.0 FPS` run

## Strongest signal

The route still underperforms even when the proof stages hold-upload and extraction with little or no enemy pressure, which keeps pointing at the renderer and capture path more than combat simulation density alone. The repeated `GPU stall due to ReadPixels` warnings also remain present in the fresh run.

## Risk

Gate 4 is still a real release blocker for external review. The live authored route is not yet trustworthy as a premium watch-through because the measured route remains in the `~19-21 FPS` band under the repeatable proof path, and the capture-related GPU stalls are still visible.

## Next action

Split a second, deeper optimisation task that treats the issue as a renderer architecture problem rather than a surface-decoration problem. The next pass should investigate one or more of:

1. caching or pre-rendering more of the static district geometry instead of redrawing it every frame
2. separating shell-grade decorative layers from combat-grade live layers
3. instrumenting Phaser or browser timing around the capture path to isolate whether `ReadPixels` and screenshot work are dominating the measured slowdown

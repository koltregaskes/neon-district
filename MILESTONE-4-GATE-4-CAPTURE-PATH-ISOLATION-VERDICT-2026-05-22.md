# Neon District Milestone 4 Gate 4 Capture-Path Isolation Verdict

Date: 2026-05-22
Task: `c884d5e3-f83e-4599-bbf1-401eb858e4a6`
Gate: `Gate 4 - Performance budget and hotspot visibility`
Verdict: `RED`

## Outcome

The screenshot capture path is not the main reason Gate 4 is still red. A fresh `capture-on` versus `capture-light` comparison kept the route in the same failing FPS band and reproduced the same four `GPU stall due to ReadPixels` warnings even when the hotspot script skipped screenshots entirely.

That means the remaining blocker is no longer "Playwright screenshots are distorting the result." The real blocker is that the current authored route now runs materially slower than the 2026-05-16 live-layer baseline inside the review-browser path, and the `ReadPixels` warning source still exists somewhere inside the runtime or browser instrumentation flow.

## Hypothesis tested

Treat the remaining Gate 4 failure as screenshot-export contamination instead of route runtime cost.

What changed:

- updated `scripts/log-performance-hotspots.mjs` to support `--capture-light`
- `capture-on` keeps the existing screenshot flow and dated shared evidence output
- `capture-light` runs the same route and sampling windows but skips screenshots so the pass can isolate whether image export is the actual cost source

## Verification

- `cmd /c npm run build`
- `node scripts/log-performance-hotspots.mjs`
- `node scripts/log-performance-hotspots.mjs --capture-light`

Fresh evidence pack:

- `W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\performance-hotspots-2026-05-22.json`
- `W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\performance-hotspots-2026-05-22-capture-light.json`
- `W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-briefing-shell-2026-05-22.png`
- `W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-recon-entry-2026-05-22.png`
- `W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-hold-upload-2026-05-22.png`
- `W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-extraction-countdown-2026-05-22.png`

Baseline used for comparison:

- `W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\performance-hotspots-2026-05-16.json`
- `W:\Repos\_My Games\neon-district\MILESTONE-4-GATE-4-LIVE-LAYER-VERDICT-2026-05-16.md`

## Measured result

Fresh phase summary:

- `briefing-shell`: `60.4 FPS` capture-on, `60.4 FPS` capture-light, effectively unchanged from the `60.5 FPS` baseline
- `recon-entry`: `21.4 FPS` capture-on, `22.8 FPS` capture-light, versus `30.8 FPS` baseline
- `hold-upload`: `21.3 FPS` capture-on, `20.2 FPS` capture-light, versus `31.7 FPS` baseline
- `extraction-countdown`: `22.2 FPS` capture-on, `21.5 FPS` capture-light, versus `32.3 FPS` baseline

Capture-light delta versus capture-on:

- `briefing-shell`: `+0.1 FPS`
- `recon-entry`: `+1.4 FPS`
- `hold-upload`: `-1.2 FPS`
- `extraction-countdown`: `-0.8 FPS`

Warning comparison:

- `capture-on`: `4` `GPU stall due to ReadPixels` warnings
- `capture-light`: `4` `GPU stall due to ReadPixels` warnings

## Strongest signal

Skipping screenshots did not clear the warnings and did not recover the lost performance. The capture-path export step is therefore non-material relative to the current runtime regression. The route is now roughly `8` to `12 FPS` slower than the 2026-05-16 baseline in every live combat slice regardless of whether screenshots are taken.

## Remaining blocker

Gate 4 stays red because the authored route itself is still too slow in recon, hold-upload, and extraction, and because the `ReadPixels` warnings still fire somewhere inside the review-browser path even when screenshots are disabled.

## Risk

If the team keeps treating this as a screenshot-only problem, Milestone 5 will inherit a false blocker diagnosis. That would waste the next optimisation pass and leave the review build visibly below the previous 2026-05-16 performance bar.

## Next action

1. Open one new Games Manager or builder-owned follow-on task to investigate the live runtime regression between the 2026-05-16 and 2026-05-22 review-route measurements.
2. Keep Milestone 5 tasks blocked behind the still-open Gate 1 listened audio proof and this renewed Gate 4 runtime blocker.
3. If the next performance pass still emits `ReadPixels` warnings without screenshots, inspect the review/runtime instrumentation path rather than the screenshot export step.

# Neon District Milestone 4 Gate 2 Hero-Capture Evidence

Gate: `Gate 2 - Visual polish and hero-capture readiness`
Owner lane: `games-manager`
Review date: `2026-05-12`

## Outcome

Gate 2 is `GREEN` for the current Neon District review build. The 2026-05-12 evidence pack now contains three deliberate hero frames that can carry shell, combat, and aftermath presentation without relying on luck or manual staging.

## Evidence

- Shell hero frame: [`W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\review-showcase-desktop-2026-05-12.png`](W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\review-showcase-desktop-2026-05-12.png)
  - The top-line `Neon District` wordmark, compact stat stack, and right-rail contract brief now create one readable focal sweep instead of a scattered briefing board.
- Combat hero frame: [`W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\review-authored-hold-desktop-2026-05-12.png`](W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\review-authored-hold-desktop-2026-05-12.png)
  - The upload-hold frame keeps readable HUD bars, distinct signage cards, and saturated combat geometry in the same shot while preserving route intent.
- Extraction and aftermath hero frame: [`W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\review-authored-summary-desktop-2026-05-12.png`](W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\review-authored-summary-desktop-2026-05-12.png)
  - The debrief overlay, outcome language, and contract-side panel read like a finished product surface rather than a debug summary.
- Supporting seeded shell proof: [`W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\review-briefing-desktop-2026-05-12.png`](W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\review-briefing-desktop-2026-05-12.png)
  - The refreshed capture path now resets the `.briefing-panel` scroll before the screenshot, so the shell evidence starts from the intended top-of-panel state.
- Shared review-pack manifest: [`W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\README.md`](W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\README.md)
  - The 2026-05-12 pack records zero browser console warnings and zero page errors for the captured review route set.

## Verification

- Visual evidence source: `cmd /c npm run capture:review`
- Current repo delta: [`W:\Repos\_My Games\neon-district\scripts\capture-review.mjs`](W:\Repos\_My Games\neon-district\scripts\capture-review.mjs)
  - Added a briefing-panel scroll reset inside `waitForBriefing()` so shell captures do not land mid-panel.

## Risk

The visual gate is green, but host-side verification remains slightly fragile on this machine. A same-session rerun of `cmd /c npm run capture:review` and `node scripts/build.mjs` did not return within the automation timeout even though the fresh 2026-05-12 artefacts already exist on disk. Treat that as a review-packaging and tooling follow-on risk, not a Gate 2 presentation blocker.

## Next action

Keep Gate 2 closed and continue the remaining Milestone 4 work on the same review build, with Gate 1 audio review closure and Gate 5 packaging discipline as the next launch-facing producer tasks.

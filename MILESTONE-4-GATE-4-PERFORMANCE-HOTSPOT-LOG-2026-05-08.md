# Neon District Milestone 4 Gate 4 Performance Hotspot Log

Date: 2026-05-09
Task: `bdb356e7-0e1d-4609-82b0-02b6b1a97ebf`
Gate: `Gate 4 - Performance budget and hotspot visibility`
Verdict: `RED`

## Outcome

The featured Dead Signal Choir Heist route now has a repeatable hotspot proof instead of a vague "felt fine" judgement, and that proof shows the current review build is still below the desktop-browser capture bar once the player leaves the shell. Briefing performance is stable, but recon, hold-upload, and extraction all dropped into roughly `20-22 FPS` equivalents during the scripted capture pass, with repeated GPU `ReadPixels` warnings still surfacing on the review route.

## Evidence

- `cmd /c npm run build` passed on 2026-05-09 before the hotspot run.
- Added [`W:\Repos\_My Games\neon-district\scripts\log-performance-hotspots.mjs`](W:\Repos\_My Games\neon-district\scripts\log-performance-hotspots.mjs), a repeatable Playwright proof that:
  - opens the authored review route
  - samples frame pacing in briefing, recon, hold-upload, and extraction phases
  - captures screenshots for each measured phase
  - records console warnings, including `GPU stall due to ReadPixels`
- Wrote shared evidence to [`W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\performance-hotspots-2026-05-09.json`](W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\performance-hotspots-2026-05-09.json).
- Produced four dated route captures:
  - [`W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-briefing-shell-2026-05-09.png`](W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-briefing-shell-2026-05-09.png)
  - [`W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-recon-entry-2026-05-09.png`](W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-recon-entry-2026-05-09.png)
  - [`W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-hold-upload-2026-05-09.png`](W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-hold-upload-2026-05-09.png)
  - [`W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-extraction-countdown-2026-05-09.png`](W:\Repos\_My Games\neon-district\output\playwright\gate4-hotspot-extraction-countdown-2026-05-09.png)

## Route-phase judgement

- `briefing-shell`: stable. Average frame time `16.5ms` (`60.5 FPS`), worst frame `16.8ms`, no visible long-frame spikes.
- `recon-entry`: below bar. Average frame time `45.0ms` (`22.2 FPS`), worst frame `50.1ms`, `93` frames over `33ms`.
- `hold-upload`: worst current hotspot. Average frame time `48.7ms` (`20.5 FPS`), worst frame `83.4ms`, `90` frames over `33ms`.
- `extraction-countdown`: still below bar. Average frame time `47.7ms` (`21.0 FPS`), worst frame `83.4ms`, `92` frames over `33ms`.

## Named hotspots

- `Recon entry`: the route drops out of shell-grade smoothness immediately after district load, even before enemies are active.
- `Hold-upload`: combat pressure plus authored beat staging is the clearest reviewer-visible slowdown and the strongest candidate for first optimisation work.
- `Extraction countdown`: the route stays in the same low-performance band even after enemy count falls, which suggests the bottleneck is not only raw enemy volume.
- `Capture path`: the browser emitted `4` `GPU stall due to ReadPixels` warnings during the scripted pass, so screenshot or capture activity remains a real part of the reviewer-visible risk rather than a resolved footnote.

## Current review-hardware bar

`Not met`

The shell is presentation-ready from a pacing standpoint, but the live authored route still degrades enough under capture conditions that an outside reviewer could notice the drop before they judge art, audio, or onboarding quality.

## Strongest signal

The new proof removes ambiguity. The performance problem is no longer anecdotal: the review route has a measured shell-versus-live gap, and the worst hotspot is now tied to the hold-upload and extraction phases of the featured authored slice.

## Main risk

Milestone 4 cannot be called green while the featured review route spends most of its measured live phases above `45ms` per frame and still emits capture-path GPU stall warnings. Gate 2 hero captures and Gate 5 packaging work can continue, but the build is not yet trustworthy as an external watch-through without a dedicated optimisation pass.

## Next action

Split one follow-on Neon District performance remediation task focused on the authored route's live phases, with the first investigation centered on the hold-upload and extraction scenes plus the `ReadPixels` capture-path warnings. Re-run `node scripts/log-performance-hotspots.mjs` after that pass and keep Gate 4 red until the live route clears the current desktop-browser review bar.

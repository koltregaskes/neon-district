# Neon District Milestone 4 Gate 3 Outsider Playtest Evidence

Date: 2026-05-08
Task: `90a41946-321c-41c5-81d5-7c4cdafd2ee1`
Gate: `Gate 3 - Outsider playtest script and onboarding confidence`
Verdict: `GREEN`

## Outcome

The Neon District shell now exposes a fixed outsider-facing playtest script inside the briefing itself instead of assuming internal lane knowledge. The shell now tells reviewers which route mode they are in, what to do in the first minute, when to call out the first readability spike, and how to read the debrief before retrying after a wipe.

## Evidence

- `cmd /c npm run build` passed on 2026-05-08 after the Gate 3 changes.
- Local Playwright verification against `http://127.0.0.1:4175/neon-district/?review=1` confirmed the shell now renders:
  - `Review seed // deterministic briefing pass`
  - `Read the shell, then enter on purpose`
  - `Call out the first readability spike`
  - `Check the debrief, then replay the same route`
- The in-run quick-tip card now tells outsiders to start in Recon, trigger Sweep deliberately, and read the debrief for carry-forward and next-move guidance before retrying.
- Local Playwright verification against `http://127.0.0.1:4175/neon-district/?autostart=1&review=1` confirmed the fast-entry route lands in `Recon` with `District quiet. Recon window open. // Recon onboarding`, preserving a safe no-save entry path instead of dropping straight into an avoidable death loop.

## Strongest onboarding moment

The new briefing playtest card turns the review shell into a usable script instead of a generic menu. An outsider can now read one card and understand the intended order: read the shell, enter on purpose, name the first pressure spike, then judge the debrief before replaying.

## Roughest fail-state moment

The fail-state still depends on the player actually reaching the debrief before they can judge whether the recovery copy feels earned under pressure. The shell now explains what to do after a wipe, but the next Milestone 4 verification pass should still include one fresh no-hook failed run to confirm the live emotional read matches the new copy.

## Risk

Gate 3 is green for shell clarity and review-route onboarding, but the next full Milestone 4 pass should validate that the updated recovery language still feels strong once a real failed run feeds the debrief under pressure.

## Next action

Continue the next highest-priority Milestone 4 gate task after this closeout. The next likely continuation is performance hotspot logging or hero-capture polish, depending on active lane replies and queue order.

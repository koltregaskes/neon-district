# Neon District Milestone 4 Presentation and Playtest Hardening Checklist

Owner lane: `games-manager`
Date: `2026-05-08`
Applies to: `Milestone 4: Presentation and playtest hardening`

## Purpose

Turn the Milestone 4 brief into a fixed review routine that proves the build can be shown, captured, and playtested like a credible Steam-facing vertical slice instead of a capable internal prototype.

## Canonical routes

Use these paths for every Milestone 4 pass:

- live shell: `http://127.0.0.1:4175/neon-district/`
- showcase shell: `http://127.0.0.1:4175/neon-district/?showcase=1`
- authored review shell: `http://127.0.0.1:4175/neon-district/?review=1&reviewSlice=authored`
- authored fast-entry review: `http://127.0.0.1:4175/neon-district/?autostart=1&review=1&reviewSlice=authored`
- clean reset shell: `http://127.0.0.1:4175/neon-district/?resetProgress=1`

If the pass depends on hidden flags beyond these routes, the milestone is not ready.

## Exit rule

Milestone 4 passes only if every gate below is green in the same review build and the same route can be watched end to end without obvious placeholder-feeling presentation breaks.

## Test sequence

Run this exact sequence on one review build:

1. Open the live shell and confirm the profile state, review controls, and next route targets are readable without checking source code.
2. Open the showcase shell and capture the shell presentation before district entry.
3. Run the featured authored route from the authored review shell and note first-impression clarity, audio distinctness, and route comprehension.
4. Run the authored fast-entry route and check whether combat, extraction, and wipe-recovery beats stay readable without shell context.
5. Capture at least three hero moments: shell, combat pressure, and extraction or aftermath.
6. Record whether any input confusion, difficulty spike, frame pacing issue, or visual-noise issue would block an outside playtest.
7. Repeat the route or its heaviest combat slice once more to check whether performance or readability degrades under capture conditions.
8. Log the build hash or verification command, known issues, and evidence locations in one review note.

## Gate 1: Audio readability and authored mood

Pass criteria:

- each major weapon family, shield-break, elite arrival, and extraction beat sounds distinct enough to call out without relying on UI
- ambience changes support route escalation and district identity
- the featured route feels sonically staged rather than functionally silent

Fail signs:

- combat sounds collapse into one repeated texture
- ambience does not help the player or observer read tension shifts
- audio identity would need to be apologised for during an external showing

Evidence to collect:

- one short note on the most distinct audio moment
- one short note on the weakest audio moment

## Gate 2: Visual polish and hero-capture readiness

Pass criteria:

- at least three captures feel deliberate enough for future trailer, store, or social use
- shell hierarchy points the eye toward the next action instead of dispersing attention
- signage, VFX, and lighting improve moment-to-moment readability

Fail signs:

- good screenshots depend on chance
- the shell feels dense without a clear visual focal point
- combat effects obscure decision-making during busy beats

Evidence to collect:

- one shell hero screenshot
- one combat hero screenshot
- one extraction or aftermath hero screenshot

## Gate 3: Outsider playtest and onboarding confidence

Pass criteria:

- the first-time route is understandable without live coaching
- the build teaches movement, pressure, and recovery well enough that a reviewer can keep going after the first failure
- the canonical route and reset guidance are easy to find

Fail signs:

- a reviewer would need a spoken explanation to start correctly
- failure recovery is mechanically safe but emotionally unclear
- the route only feels smooth for someone who already knows the shell

Evidence to collect:

- one note on the first unclear or overloaded moment
- one note on whether the wipe/recovery loop still felt worth another attempt

## Gate 4: Performance budget and hotspot visibility

Pass criteria:

- the review pass records whether frame pacing, capture stalls, or input latency were visible
- any hotspot is tied to a named scene, route phase, or effect cluster
- the route has a basic performance judgement, not only a binary pass/fail

Fail signs:

- performance is only described as “fine”
- repeated warnings or stalls appear without a documented owner
- reviewers cannot tell whether heavy combat or capture mode is the cause of a slowdown

Evidence to collect:

- one short hotspot log with route phase and symptom
- one note stating whether the build met the current review-hardware bar

## Gate 5: Review-build packaging discipline

Pass criteria:

- one note records the review URLs, verification command, known issues, and evidence pack path
- the build can be handed to another lane without extra verbal setup
- the route feels consistent enough that Milestone 5 can focus on demo packaging instead of rediscovering presentation gaps

Fail signs:

- review prep still depends on scattered docs or memory
- route quality varies so much that good captures hide a weak build
- the build is only safe for internal use

Evidence to collect:

- one dated verdict note
- one list of known issues that still need Milestone 4 closure

## Required reviewer questions

Every Milestone 4 pass must answer these five questions in writing:

1. Which moment looked or sounded most ready for a public-facing capture?
2. Which moment still felt placeholder or under-authored?
3. Did the build ever need outside explanation to stay understandable?
4. Where did performance, input clarity, or visual overload become visible?
5. Would you show this review build to an external tester today?

## Current judgement

What already exists:

- deterministic review and showcase routes are already available
- progression and review isolation are stronger after Milestone 3
- capture scripts and evidence-pack patterns already exist in the repo

What still needs proof:

- the build still needs a no-hook outsider-style route pass after the `debugRuntime=1` save-confidence proof
- audio identity and screenshot readiness are not yet locked behind one acceptance contract
- GPU `ReadPixels` warnings seen during capture need explicit assessment

## Immediate execution order

1. Use this checklist to open one builder-ready task per acceptance gate.
2. Run the route once in its current state and log the biggest presentation blockers before polishing blind.
3. Improve audio, visual hierarchy, and playtest clarity while collecting hotspot evidence.
4. Produce a dated Milestone 4 verdict before opening Milestone 5 demo-packaging work.

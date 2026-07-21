# Neon District Milestone 5 Demo Packaging and Launch-Readiness Brief

Owner lane: `games-manager`
Date: `2026-05-14`
Applies to: `Milestone 5: Demo packaging and launch-readiness review`

## Purpose

Define the first external-demo packaging contract for `Neon District` so the team can move from an internally credible review build toward a festival-style or external-tester handoff without live explanation.

This brief does **not** open Milestone 5 as active shipping work yet. It fixes the target, acceptance gates, and split-ready work so the milestone can start cleanly once Milestone 4 is actually closed.

## Start condition

Milestone 5 can only move from preproduction to active execution when these Milestone 4 blockers are closed in the same reviewable build:

- Gate 1 audio readability is backed by one real listened authored-route pass, not headless inference
- Gate 4 performance moves off the current red verdict, or the remaining slowdown is reclassified with named evidence and a reviewer-safe explanation
- Gate 5 packaging discipline stays green on the current route set and evidence manifest

If those conditions are not true, Milestone 5 work stays limited to planning, asset targets, task splitting, and launch-readiness criteria.

## Product target

Package `Neon District` as a premium browser-first vertical slice that feels closer to a Steam Next Fest candidate than a prototype:

- one flagship route with clear fantasy, stakes, and debrief value
- three to five assets strong enough for screenshot, trailer-beat, and store-copy drafting
- a review pack another lane can run without tribal setup
- known issues honest enough for outsiders to trust the build
- a go/no-go read on whether the slice earns more hardening or broader content work next

## Current baseline entering Milestone 5 planning

What already exists:

- a deterministic review route and showcase shell around `Dead Signal Choir Heist`
- build verification through `cmd /c npm run build`
- a shared evidence pack and capture manifest in `W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district`
- stronger progression clarity, save confidence proof, and review-route isolation from Milestone 3
- a green Milestone 4 Gate 5 packaging contract for URLs, capture order, and inherited known issues

What still prevents a launch-facing handoff today:

- audio identity is still only `yellow` until a real listened pass closes the authored route
- Gate 4 performance remains `red`, especially during `hold-upload`, with capture-path `ReadPixels` warnings still present
- no final external-demo copy pack exists yet for title promise, feature bullets, route framing, or known-issues language
- no formal launch-review checklist currently ties product pillars, onboarding quality, replay value, assets, and bug triage into one verdict

## Milestone 5 quality bar

The milestone is successful only if the build can be handed to an external tester or festival-style reviewer without apology for missing fundamentals.

That means the package must prove:

- the route fantasy is obvious from the shell, the contract framing, and the first minute of play
- the demo’s strongest assets and feature promises are consistent with the actual reviewed slice
- progression, save state, reset behaviour, and failure recovery still feel dependable under repeated handoff use
- performance, audio, presentation, and known issues are explicit enough that another person can judge the build honestly

## Launch-facing gaps to close in Milestone 5

### Positioning and promise gap

- the game has a strong internal identity, but no final draft pack yet frames that identity for an outsider in title, feature-bullet, or short-description form
- the current shell and docs describe systems well, but they do not yet compress the value proposition into reviewer-facing marketing language

### Asset-pack gap

- hero captures exist, but they still need a deliberate shortlist for store, trailer-beat, and outreach use
- no explicit asset target list yet names required shell, combat, extraction, and aftermath shots plus short trailer-beat moments

### Launch-readiness triage gap

- known issues exist across Milestone 4 evidence, but they are not yet grouped into demo blockers, acceptable caveats, and post-demo backlog
- the build still needs one final pass focused on progression blockers, readability failures, and performance regressions on the actual handoff route

### Verdict discipline gap

- the team has milestone verdicts, but not yet one final go/no-go review against product pillars, onboarding trust, content depth, and replayability
- without that review, the build risks drifting into “more polish” instead of a decision about whether the slice is ready to show

## Milestone 5 acceptance gates

Milestone 5 is complete only when every gate below is green in the same candidate build.

### Gate 1: Positioning and feature-bullet pack

Pass criteria:

- one concise demo title line, short description, feature bullet set, and route framing note all describe the same product promise
- the copy reflects the actual reviewed slice instead of future-desktop ambition
- the promise matches the pillars of dense cyberpunk pressure, readable combat, build identity, and mission variety

Fail signs:

- the copy overpromises systems or scale the current slice does not support
- feature bullets read like internal patch notes instead of player value
- the route fantasy still needs a person in the room to explain why it matters

### Gate 2: Asset pack and trailer-beat shortlist

Pass criteria:

- at least five named assets are locked: shell hero, combat pressure, extraction, aftermath, and one secondary angle
- each asset has a purpose such as store capsule support, trailer beat, social proof, or reviewer packet cover
- the shortlist reflects the current capture-ready route, not hypothetical future content

Fail signs:

- assets exist but no one knows which are canonical
- shots look readable but not memorable
- a trailer or store pass would have to rediscover the slice’s strongest moments from scratch

### Gate 3: Review-pack and known-issues discipline

Pass criteria:

- one handoff note records build hash or verification command, canonical URLs, reset path, evidence pack, known issues, and reviewer guidance
- open issues are separated into hard blockers, acceptable demo caveats, and watch items
- save/reset and review-route behaviour are safe enough to survive repeated tester handoff

Fail signs:

- reviewers need extra setup messages outside the pack
- known issues are vague or mixed with wishlist polish
- the safest route depends on hidden local knowledge

### Gate 4: Launch-focused bug triage

Pass criteria:

- one triage pass classifies progression blockers, readability failures, performance regressions, and presentation breaks on the candidate route
- issues are prioritised by external-review impact, not by engineering convenience
- the final pack clearly states what is fixed, what is accepted, and what is a no-go blocker

Fail signs:

- bug review collapses into a generic backlog sweep
- the highest-risk route problems stay buried in old milestone notes
- the team cannot explain why an issue is safe to carry into external testing

### Gate 5: Go / no-go launch review

Pass criteria:

- one dated verdict evaluates the candidate build against product pillars, onboarding, content depth, replayability, save confidence, audio, and performance
- the verdict ends with a clear `GO`, `CONDITIONAL GO`, or `NO-GO`
- the review names the smallest credible next move after the verdict

Fail signs:

- the milestone ends with only “needs more polish”
- the verdict ignores whether the build is actually handoff-safe
- the next step is ambiguous between more hardening, more content, and external review

## Required asset and package targets

The first external-demo pack should plan for:

- one short description under `160` characters
- one medium store-style summary under `400` characters
- four to six feature bullets
- one contract-framing paragraph for `Dead Signal Choir Heist`
- one reviewer-start note covering controls, route choice, and reset path
- five canonical stills
- three to five trailer-beat moments tied to actual route phases

## Ownership split

### Games Manager

- own the milestone contract, acceptance gates, demo quality bar, and final verdict discipline
- keep Milestone 5 honest about what is blocked by Milestone 4 and what is merely waiting on packaging work

### Project Manager

- split builder-ready or writing-ready tasks for copy pack, asset shortlist, launch triage, and final verdict sequencing
- keep each task tied to one Milestone 5 gate and one verification output

### Creative Hub

- own the player-facing language, screenshot shortlist, trailer-beat framing, and any capsule or title-line iteration

### Tools and Skills

- own any repeatable capture, manifest, or review-pack automation that makes the external-demo packet safer to regenerate

## Recommended implementation order

1. Close Milestone 4 Gate 1 and Gate 4 in the same reviewable build.
2. Lock the external-demo copy pack and reviewer-start packet around the actual route.
3. Freeze the asset shortlist and trailer-beat sequence from the capture-ready build.
4. Run the launch-focused bug triage pass.
5. Record the dated go/no-go verdict and decide whether the next step is external testing, more hardening, or content expansion.

## Do not do yet

- do not treat Milestone 5 as permission to ignore the current Milestone 4 red and yellow blockers
- do not draft store or trailer language around features not proven in the browser slice
- do not widen scope into multiple contracts or a new game as a substitute for launch-readiness discipline
- do not call the build external-review ready without one final verdict that names the remaining accepted caveats

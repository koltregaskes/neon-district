# Neon District Milestone 4 Presentation and Playtest Hardening Brief

Owner lane: `games-manager`
Date: `2026-05-08`
Applies to: `Milestone 4: Presentation and playtest hardening`

## Purpose

Turn the roadmap's Milestone 4 goal into a production-grade hardening brief so the current vertical slice becomes stable, watchable, and credible in front of outside reviewers instead of only readable to the internal team.

## Milestone decision

Use the existing browser-first vertical slice as the Milestone 4 proving ground.

Why this path:

- Milestone 3 already proved save confidence on one live profile, so the next launch-grade risk is no longer whether progression survives but whether the build presents itself like a serious product
- the repo already has deterministic review and capture routes in [`README.md`](./README.md), plus scripted evidence generation in [`scripts/capture-review.mjs`](./scripts/capture-review.mjs) and [`scripts/prove-save-confidence.mjs`](./scripts/prove-save-confidence.mjs)
- the current showcase still feels too close to a capable prototype because audio identity, visual hierarchy, playtest discipline, and performance evidence are not yet locked behind one reviewable contract

## Current launch-facing baseline

What already exists:

- a browser build that can ship a deterministic authored route and a seeded review shell
- build verification through `cmd /c npm run build`
- repeatable review captures and dated progression proof artefacts
- a contract shell that now communicates progression, recovery, and review isolation more clearly than earlier milestones

What is still missing:

- an authored sound and ambience layer that makes weapons, shields, elites, and extraction beats feel distinct
- a screenshot-ready visual standard for shell, district, and combat hero moments
- one fixed outsider playtest routine that tests onboarding, readability, difficulty spikes, and input confidence without tribal setup
- a durable performance budget and hotspot log for the actual review hardware path

## Launch-grade gaps blocking Milestone 4 acceptance

### Audio identity gap

- combat currently reads functionally, but not yet memorably; key weapon, shield-break, elite-entry, and extraction moments still need authored sound separation
- ambience does not yet sell district place, route escalation, or faction pressure strongly enough during observation-only review
- the slice lacks a milestone-level audio checklist defining what must be distinct before external playtests

### Visual hierarchy gap

- shell and combat remain usable, but the product still needs a stronger premium hierarchy across signage, VFX priority, lighting contrast, and screenshot framing
- capture surfaces are available, yet there is no fixed hero-shot target list ensuring the build looks deliberate in stills
- some flows still risk “placeholder” perception because they are functionally clear without being visually authored

### Playtest discipline gap

- there is no single formal playtest contract answering onboarding clarity, difficulty spikes, fail-state frustration, and input confidence in the same pass
- the save proof used `debugRuntime=1` for deterministic staging; Milestone 4 needs a canonical no-hook review routine the team can trust in front of outsiders
- reviewer guidance still lives across multiple docs and scripts instead of one hardening checklist

### Performance and release-readiness gap

- review evidence exists, but the build does not yet have tracked frame-time or hotspot expectations tied to the showcase route
- repeated Playwright capture warnings around GPU `ReadPixels` stalls were observed in Milestone 3 and need explicit assessment rather than silent carry-forward
- the team still needs one known-issues discipline for presentation blockers before the demo-packaging milestone opens

## Milestone 4 acceptance gates

Milestone 4 is complete only when every gate below is green in the same review build.

### Gate 1: Audio readability and authored mood

Pass criteria:

- core weapons, shield-breaks, elite pressure, ambience, and extraction beats are distinguishable without reading UI labels
- the featured authored route sounds intentionally staged rather than using one flat combat bed
- at least one review pass can identify route escalation from audio change alone

Fail signs:

- combat events blend together unless the player is already reading the HUD
- the district feels visually cyberpunk but sonically empty
- reviewers describe the build as mute, flat, or placeholder even when mechanics work

### Gate 2: Visual polish and hero-capture readiness

Pass criteria:

- shell, district, and combat framing each produce at least one deliberate hero screenshot
- signage, VFX hierarchy, and lighting contrast clearly direct attention during the flagship route
- the build looks curated enough that still captures can support future trailer and capsule planning

Fail signs:

- screenshots depend on luck rather than staging
- effects, signage, and lighting compete instead of clarifying priority
- the slice remains readable but not presentation-grade

### Gate 3: Outsider playtest script and onboarding confidence

Pass criteria:

- one fixed playtest checklist covers entry, briefing clarity, control confidence, difficulty spikes, wipe recovery, and route comprehension
- a reviewer can reach and finish the featured route without a live verbal rescue
- the build exposes the canonical review URL set and clean-start path in one place

Fail signs:

- onboarding quality depends on a manager explaining hidden controls or routes
- the first wipe or difficulty spike feels confusing rather than motivating
- reviewers need tribal knowledge to know whether they are in live, review, or showcase flow

### Gate 4: Performance budget and hotspot visibility

Pass criteria:

- the featured route has a tracked desktop-browser performance target with named hotspots
- capture and playtest notes record whether frame pacing, input latency, or visual overload becomes a reviewer-visible issue
- known performance risk areas are written down with reproduction guidance

Fail signs:

- the team can only say the build “felt fine”
- capture scripts expose warnings or stalls with no judgement or next owner
- the route is only credible on best-case local runs

### Gate 5: Review-build packaging discipline

Pass criteria:

- the review build has a fixed checklist for URL, reset path, review route, known issues, evidence pack location, and capture order
- the same build can be watched end to end without obvious placeholder-feeling presentation breaks
- the milestone ends with clear handoffs into demo packaging instead of vague “more polish”

Fail signs:

- review prep still depends on scattered notes and memory
- one good route run can hide broken supporting surfaces
- Milestone 5 would have to rediscover known presentation gaps from scratch

## Required reviewer questions

Every Milestone 4 pass must answer these five questions in writing:

1. Which moment sounded most distinct, and which still sounded too generic?
2. Which shell or combat frame looked screenshot-ready without setup?
3. Did you ever need outside explanation to know where to click, move, or recover after failure?
4. Where did the build feel slow, visually noisy, or input-uncertain?
5. Would you feel comfortable showing this route to an external reviewer today? Why or why not?

If those answers are vague, Milestone 4 is not ready to pass.

## Production split

### Games Manager

- lock the acceptance gates, proof routine, and review packaging contract
- reject vague “polish” work that does not improve outsider trust, presentation quality, or review readiness
- keep the slice centred on one premium route, not a content-sprawl response

### Project Manager

- split builder-ready tasks for audio kit, visual polish, formal playtest checklist, performance instrumentation, and review-pack cleanup
- keep each Milestone 4 task tied to one acceptance gate and one verification output

### Creative Hub

- own authored audio mood targets, hero-shot lists, signage/copy flavour, and trailer-beat framing notes for the showcase route

### Tools and Skills

- own any capture-script, telemetry, or proof automation required to turn playtest and performance checks into repeatable evidence

## Recommended implementation order

1. Lock the Milestone 4 checklist and route list.
2. Harden the review build packaging, capture route, and playtest script before deep audiovisual tweaks drift.
3. Improve audio and visual hierarchy on the featured route while collecting the first hotspot log.
4. Run one full outsider-style review pass on the hardened build and mark each gate `green`, `yellow`, or `red`.

## Do not do yet

- do not start a new game
- do not expand contract count as a substitute for presentation quality
- do not treat debug-only deterministic staging as the external review path
- do not open demo packaging work until audio, visual, playtest, and performance evidence sit in the same build

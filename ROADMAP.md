# Neon District Roadmap

## Product target

Ship `Neon District` as a browser-first premium vertical slice that feels closer to a Steam Next Fest candidate than a sandbox prototype: one polished district run, clear build expression, strong authored fiction, dependable performance, and a review flow that can survive repeated external playtests.

## Current position

The project already has a strong contract shell, readable combat foundations, deterministic review routes, and multiple authored mission slices. It is not yet launchable because the quality bar is uneven across progression depth, encounter authorship, audiovisual identity, onboarding, save confidence, and release packaging.

## Steam-level quality gaps

### Combat and encounter quality

- enemy roles still need cleaner tactical separation, especially ranged pressure, support disruption, and boss-stage readability
- weapon families need stronger identities so choices change playstyle rather than only changing numbers
- cover, hazards, and arena routing need more authored decision points instead of broad circular kiting

### Progression and retention

- permanent progression exists in first-pass form but still needs a full run-to-run economy with meaningful unlock pacing
- contracts need a clearer ladder so the player can understand what the next 30-60 minutes of improvement looks like
- save-state confidence, run summaries, and progression messaging need to feel dependable and legible

### UX, onboarding, and accessibility

- first-run teaching still needs a tighter authored ramp across movement, heat, shield break, gadgets, extraction pressure, and failure recovery
- shell screens need a more premium street-terminal feel with clearer action priority, reward visibility, and lower cognitive clutter
- controller parity, readability settings, and fail-state recovery need to be treated as launch criteria rather than optional polish

### Audio and presentation

- the game still needs a more authored sound and music pass so weapons, shields, elites, and faction spaces feel distinct
- the district mood needs more layered signage, transit ambience, VFX hierarchy, and screenshot-ready hero moments
- trailer, capsule, screenshot, and key-art planning have not started

### Release readiness

- performance budgets, capture standards, and repeatable playtest scripts need explicit gates
- the current review pack is useful internally, but external-review packaging still needs a clean checklist, known-issues discipline, and save-reset confidence

## Milestone plan

### Milestone 1: Combat identity lock

Goal: prove that the minute-to-minute gunplay is good enough to anchor the whole product.

Must ship in this milestone:

- three materially different weapon families with alternate-fire tradeoffs
- clearer enemy role taxonomy across rush, gunline, shield, drone, and support units
- stronger hit feedback, stagger, shield-break, death, and elite-threat tells
- at least one authored arena where cover, hazard pressure, and routing create deliberate decisions

Exit gate:

- internal playtests can describe why each weapon exists and which enemy created the failure without guessing

### Milestone 2: Authored contract slice

Goal: turn the strongest mission path into a reviewable, memorable campaign-quality run.

Must ship in this milestone:

- one flagship contract with briefing, infiltration, escalation, boss or setpiece, extraction, and debrief
- one optional objective or branching opportunity inside the contract
- stronger faction fiction for the mission giver, opposing force, and district stakes
- a deterministic review route for the full flagship contract, not only isolated slices

Exit gate:

- a first-time player can finish the flagship route and explain what happened, who they fought, and what reward or consequence they earned

### Milestone 3: Progression and save confidence

Goal: make repeat runs feel like advancement rather than repetition.

Must ship in this milestone:

- durable save/progression flow with clear currency, unlock, and loadout persistence
- meaningful between-run upgrades across armory, cyberware, and contract access
- stronger post-run summaries covering rewards, failures, faction movement, and next unlock targets
- recovery-safe reset and seeded-review paths that cannot silently corrupt live progression

Exit gate:

- three consecutive runs can be played on one profile without unclear rewards, dead-end upgrades, or broken save state

### Milestone 4: Presentation and playtest hardening

Goal: make the build feel stable, watchable, and credible in front of outsiders.

Must ship in this milestone:

- authored audio pass for weapons, shields, elites, ambience, and extraction beats
- visual polish pass for district signage, VFX hierarchy, lighting contrast, and hero screenshots
- formal playtest checklist covering onboarding, difficulty spikes, performance, input clarity, and fail-state frustration
- tracked performance targets for desktop browser review hardware with known hotspots called out

Exit gate:

- a clean review build can be captured, replayed, and watched end to end without obvious placeholder-feeling presentation gaps

### Milestone 5: Demo packaging and launch-readiness review

Goal: convert the polished slice into a release-facing demo candidate.

Must ship in this milestone:

- title, store-description, screenshot, trailer-beat, and feature-bullet draft pack
- review-pack checklist for build hash, route URLs, known issues, reset behaviour, and capture guidance
- bug triage pass focused on progression blockers, readability failures, and performance regressions
- go/no-go review against product pillars, onboarding quality, content depth, and replayability

Exit gate:

- the build is credible enough to hand to external testers or a festival-style review audience without needing live explanation to excuse missing fundamentals

## Production workstreams

### Design and systems

- weapon identity
- enemy role separation
- contract ladder
- progression economy
- difficulty and pacing

### Content and fiction

- flagship contract scripting
- boss and setpiece beats
- faction flavour
- codex and run-summary writing

### UX and frontend

- shell clarity
- onboarding flow
- accessibility and readability settings
- controller and keyboard parity

### Audio and art

- weapon and shield sound kit
- ambient district layers
- music stem plan
- screenshot and key-art target list

### Production and QA

- review-pack upkeep
- performance budgets
- playtest script
- known-issues discipline
- release checklist

## Recommended next slice

Do not start a new game. Push `Neon District` through `Milestone 4: Presentation and playtest hardening` and define the exact acceptance checklist for:

- authored audio identity across weapons, shields, elites, ambience, and extraction
- screenshot-ready shell, district, and combat presentation
- outsider playtest clarity across onboarding, wipe recovery, and route comprehension
- review-hardware performance targets, hotspot logging, and review-pack discipline

Execution reference:

- [`MILESTONE-4-PRESENTATION-PLAYTEST-BRIEF-2026-05-08.md`](./MILESTONE-4-PRESENTATION-PLAYTEST-BRIEF-2026-05-08.md) defines the current milestone gates, lane split, and implementation order.
- [`MILESTONE-4-PRESENTATION-PLAYTEST-CHECKLIST-2026-05-08.md`](./MILESTONE-4-PRESENTATION-PLAYTEST-CHECKLIST-2026-05-08.md) is the fixed hardening routine that should be used before opening Milestone 5 demo-packaging work.

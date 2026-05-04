# Neon District Milestone 2 Flagship Contract Brief

Owner lane: `games-manager`
Date: `2026-05-03`
Applies to: `Milestone 2: Authored contract slice`

## Purpose

Turn the roadmap's Milestone 2 goal into a production-grade flagship contract brief that can drive implementation, review, capture, and later external playtesting without drifting into another generic sandbox lane.

## Flagship route decision

Use `Dead Signal Choir Heist` as the flagship Milestone 2 route.

Why this route:

- it is already the featured authored slice in code and in the manager review shell
- it has the clearest briefing-to-extraction shape in the current build
- it already supports deterministic seeded review and fast-entry URLs
- its market lane, bridge hold, and overwatch extraction duel are closer to a memorable Steam-demo run than the broader sandbox contract

Reference evidence:

- [`src/game/content.ts`](./src/game/content.ts) defines `choir-heist` as the featured authored slice with fixed objectives, named factions, and a bespoke extraction beat
- [`README.md`](./README.md) already exposes the manager review URLs for the authored route

## Current live contract shape

Current route structure in code:

1. `Slip into Choir Exchange` recon entry through the market lane
2. `splice the dead-signal spool` at the signal bridge relay
3. hold while the `ledger decompress` objective resolves under scripted counter-pushes
4. break to the `choir skyhook` extraction and kill the named overwatch line

Current authored strengths:

- the mission has a client, hostile faction, zone identity, and readable district framing
- the route has distinct spatial beats instead of one endless circular arena
- the extraction finish already ends on a named elite duel, which gives the run a real payoff
- the authored review route is deterministic enough to serve as the capture and producer-review path

## Gaps blocking Milestone 2 acceptance

The route is promising but not yet a credible flagship contract because these Milestone 2 gaps remain:

### Optional objective or branch

- the current route is linear
- there is no player-facing optional objective, side opportunity, or meaningful branch inside the contract
- the slice needs one high-clarity choice that changes reward, risk, or extraction pressure

Recommended implementation direction:

- add an optional `ghost archive` pickup or witness-terminal override in the market-to-bridge transition
- success should grant bonus payout, faction reputation, or a stronger post-run codex beat
- failure or skip should leave the main route intact, not soft-lock the contract

### Mission fiction and consequence

- the contract already names `Morrow Relay Co-op`, `Glasshouse`, the ledger, and the signal bridge
- it still needs stronger debrief-level consequence so the player can explain what they stole, why it mattered, and who lost ground
- the faction-fiction pass should make the route feel like a story beat, not only a systems demo

### Debrief and reward clarity

- the route has extraction success and failure states, but the end-state messaging still needs a premium contract debrief
- reward language, faction movement, and next-run implication should be visible after success, not inferred
- the run needs one clear reward/consequence sentence that a first-time reviewer can repeat back

### Full-route review discipline

- deterministic entry already exists, but the flagship route still needs a formal review script and evidence checklist
- the lane should stop relying on generic "play the authored route" wording
- the exact review URLs, observer questions, and capture points must be fixed in one place

## Flagship contract acceptance gates

Milestone 2 is complete only when every gate below is green in the same build.

### Gate 1: Briefing to objective clarity

Pass criteria:

- a first-time player can explain the contract in one sentence before entering the district
- the contract board, pre-mission copy, and in-run objective labels all describe the same mission
- the player always knows whether they are infiltrating, holding, or extracting

Fail signs:

- reviewers describe the mission as "just survive the waves"
- the bridge splice, upload, and extraction phases blur together

### Gate 2: Optional objective or branching opportunity

Pass criteria:

- the contract contains one optional objective or branch with a clear player-facing reason to engage
- the branch changes risk, reward, route timing, or narrative payoff
- the contract remains winnable whether the optional path is taken or skipped

Fail signs:

- the optional content is invisible, unclear, or feels mandatory
- the route still plays as a single straight line every time

### Gate 3: Mission fiction and faction stakes

Pass criteria:

- the player can name the client, hostile force, and why the contract matters
- at least one mission beat reinforces the identity of Choir Exchange rather than using generic cyberpunk wording
- the debrief explains what changed in district terms after extraction or collapse

Fail signs:

- the player remembers the fight but not the story
- the route could be renamed without affecting the fiction

### Gate 4: Memorable extraction payoff

Pass criteria:

- the `choir skyhook` extraction remains the climax of the route
- the overwatch-line duel reads as a designed finish, not random last-wave cleanup
- success, failure, and near-miss all feel legible in the final ten seconds

Fail signs:

- the final beat feels like another sandbox exfil ring
- the player cannot explain what made the extraction special

### Gate 5: Deterministic review route

Pass criteria:

- the full flagship route is reviewable through seeded shell and fast-entry URLs
- the team has one named review checklist covering shell, combat, optional beat, extraction, and debrief
- review captures can be reproduced without relying on prior save progress

Fail signs:

- reviewers need verbal setup to understand what to click or what to watch for
- evidence collection depends on ad hoc free-play runs

## Review route contract

Use these URLs as the canonical Milestone 2 review entry points:

- shell review: `http://127.0.0.1:4175/neon-district/?review=1&reviewSlice=authored`
- fast-entry review: `http://127.0.0.1:4175/neon-district/?autostart=1&review=1&reviewSlice=authored`
- showcase shortcut: `http://127.0.0.1:4175/neon-district/?showcase=1`

Every Milestone 2 review pass should record:

1. what the player believed the mission was before entry
2. whether the optional objective or branch was understood
3. the beat where the route felt most authored rather than sandbox-driven
4. what the extraction duel communicated about the mission stakes
5. what reward or consequence the player believed they earned

## Production split

### Games Manager

- lock the flagship route definition and acceptance gates
- keep the route focused on one reviewable premium run instead of broadening scope into more contracts
- reject follow-on expansion work until the flagship contract has a clean end-to-end verdict

### Project Manager

- split builder-ready tasks for optional objective, contract debrief, review checklist, and implementation verification
- keep all Milestone 2 tasks tied to `Dead Signal Choir Heist` rather than generic contract improvements

### Creative Hub

- strengthen contract fiction, mission copy, debrief tone, and screenshot-minded hero moments for Choir Exchange
- prepare a compact flavour pack for client stakes, hostile posture, and one optional-objective payoff beat

## Recommended implementation order

1. Add the optional objective or branch to `Dead Signal Choir Heist`.
2. Improve the shell and debrief copy so the mission stakes and consequence read cleanly.
3. Lock the deterministic full-route review checklist for shell, fast-entry, and showcase paths.
4. Run one internal review pass and mark each acceptance gate green, yellow, or red before expanding Milestone 2 scope.

## Do not do yet

- do not start a new game
- do not open Milestone 3 progression work as a substitute for missing contract authorship
- do not hide route weaknesses behind presentation-only polish
- do not treat `Glassfall Nullbreaker Siege` or `Redline Blackout Run` as the flagship route until `Dead Signal Choir Heist` either passes or is explicitly rejected

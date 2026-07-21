# Neon District Milestone 5 Demo Packaging and Launch-Readiness Checklist

Owner lane: `games-manager`
Date: `2026-05-14`
Applies to: `Milestone 5: Demo packaging and launch-readiness review`

## Purpose

Turn the Milestone 5 brief into a fixed launch-readiness routine so the next external-demo candidate is judged like a real product handoff instead of an internal milestone celebration.

## Start rule

Do not run this checklist to completion until these conditions are true in one current build:

- Milestone 4 Gate 1 is closed by a real listened authored-route pass
- Milestone 4 Gate 4 is no longer red on the featured route
- Milestone 4 Gate 5 review-build packaging remains green

If those conditions are not true, use this checklist only for preproduction planning and task splitting.

## Candidate build contract

Use one candidate build with:

- canonical review URLs from `README.md`
- deterministic verification command: `cmd /c npm run build`
- current evidence pack: `W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district`
- current Milestone 4 known-issues chain, especially Gate 1 audio and Gate 4 performance evidence

If the candidate build needs extra hidden flags or verbal rescue, it is not a valid demo-packaging candidate.

## Exit rule

Milestone 5 passes only if every gate below is green and the final verdict says the build can be handed to an external tester or festival-style review audience without live explanation to excuse missing fundamentals.

## Sequence

1. Confirm the Milestone 4 blocker state and refuse to proceed if Gate 1 or Gate 4 is still open.
2. Lock the candidate build verification command, route URLs, reset path, and evidence-pack location in one note.
3. Draft the short description, medium summary, feature bullets, and contract-framing paragraph from the actual route.
4. Select the canonical screenshot and trailer-beat shortlist from the current evidence pack.
5. Run a launch-focused triage pass over progression, readability, performance, reset, and presentation issues.
6. Classify each issue as `must fix`, `acceptable caveat`, or `post-demo backlog`.
7. Record the dated go/no-go verdict and the smallest credible next move.

## Gate 1: Positioning and feature-bullet pack

Pass criteria:

- one short description, one medium summary, and four to six feature bullets are complete
- the copy describes the current browser-first premium slice, not a future desktop version
- the copy reinforces the pillars of readable combat, build identity, dense cyberpunk pressure, and mission structure

Evidence to collect:

- one copy pack note
- one route-framing paragraph for `Dead Signal Choir Heist`

Fail signs:

- copy promises scale or content the candidate build cannot deliver
- feature bullets read like engineering notes
- the route fantasy is still unclear after reading the pack

## Gate 2: Asset pack and trailer-beat shortlist

Pass criteria:

- five canonical stills are selected and labelled by purpose
- three to five trailer beats are selected from real route phases
- the shortlist includes shell, combat pressure, extraction, and aftermath coverage

Evidence to collect:

- one asset shortlist note
- links to the canonical image files
- one trailer-beat list with route-phase labels

Fail signs:

- multiple lanes could choose different “best” shots with no source of truth
- the shortlist hides weaker presentation moments instead of representing the real handoff build
- the build still lacks one obvious hero frame

## Gate 3: Review-pack and known-issues discipline

Pass criteria:

- one handoff note records URLs, verification command, reset path, evidence location, controls, and reviewer guidance
- known issues are grouped into `must fix`, `acceptable caveat`, and `watch`
- save, progression, and review-route safety are explicitly called out

Evidence to collect:

- one handoff pack note
- one issue ledger grouped by severity and external-review impact

Fail signs:

- the handoff still depends on Slack, chat context, or memory
- known issues are mixed with wishlist polish
- reset or route safety is assumed rather than stated

## Gate 4: Launch-focused bug triage

Pass criteria:

- the candidate route has one dated triage pass for progression blockers, readability failures, performance regressions, and presentation breaks
- each issue has an owner or a carry reason
- the triage reflects reviewer-visible risk, not only developer annoyance

Evidence to collect:

- one triage summary
- one ranked issue list

Fail signs:

- the highest-risk issues are still scattered across older milestone documents
- a blocker has no owner or no carry justification
- the triage ignores onboarding, wipe recovery, or progression trust

## Gate 5: Go / no-go launch review

Pass criteria:

- one dated verdict reviews product pillars, onboarding, content depth, replayability, save confidence, audio identity, and performance credibility
- the verdict uses `GO`, `CONDITIONAL GO`, or `NO-GO`
- the verdict names the smallest credible next move

Evidence to collect:

- one final verdict document
- one next-step note

Fail signs:

- the review ends with only “keep polishing”
- the verdict does not explain whether the build is safe to hand off
- the next step is ambiguous between demo, hardening, or expansion

## Required launch-review questions

Every Milestone 5 verdict must answer these in writing:

1. What is the one-sentence promise of this demo?
2. Which still image best sells that promise without explanation?
3. Which issue would most damage outsider trust if it survived into the handoff build?
4. Does the current package make the route, controls, reset path, and caveats obvious?
5. Is the smallest honest next move `GO`, `CONDITIONAL GO`, or `NO-GO`, and why?

## Current judgement entering Milestone 5 planning

What is already strong:

- deterministic review routes and a shared evidence-manifest pattern already exist
- the featured authored route has enough structure to support real copy and asset planning
- progression, loadout, and reset clarity are materially stronger than earlier milestones

What still blocks external-demo credibility:

- Gate 1 audio still needs a real listened pass
- Gate 4 performance still needs live-layer and capture-path closure
- no final copy pack, asset shortlist, launch triage note, or go/no-go verdict exists yet

## Immediate next action

1. Keep Milestone 5 in planning state while Milestone 4 Gate 1 and Gate 4 remain open.
2. Ask Project Manager to split the Milestone 5 copy, asset, triage, and verdict tasks now so they can queue behind the Milestone 4 closures.
3. Open active execution only after the current review build clears the remaining presentation blockers.

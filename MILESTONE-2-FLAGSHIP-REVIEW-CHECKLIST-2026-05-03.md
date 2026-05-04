# Neon District Milestone 2 Flagship Review Checklist

Owner lane: `games-manager`
Date: `2026-05-03`
Applies to: `Milestone 2: Authored contract slice`
Flagship route: `Dead Signal Choir Heist`

## Purpose

Turn the Milestone 2 brief into a fixed review script that producers, builders, and future playtesters can run without verbal setup. This milestone is complete only when the same build proves that `Dead Signal Choir Heist` reads as a premium authored contract from shell to debrief.

## Canonical review routes

Use these URLs for every Milestone 2 pass:

- shell review: `http://127.0.0.1:4175/neon-district/?review=1&reviewSlice=authored`
- fast-entry review: `http://127.0.0.1:4175/neon-district/?autostart=1&review=1&reviewSlice=authored`
- showcase shortcut: `http://127.0.0.1:4175/neon-district/?showcase=1`

If the pass depends on any other route, the milestone is not ready.

## Exit rule

Milestone 2 passes only if every gate below is green in the same build. A stronger optional beat without a clean debrief, or a cleaner shell without a memorable extraction, does not count.

## Gate 1: Briefing-to-objective clarity

Pass criteria:

- the shell states the client, hostile force, route, and objective in one readable pass
- first-time reviewers can explain the mission in one sentence before pressing `Enter District`
- the in-run beats still read as infiltration, bridge hold, and extraction rather than one blended survival timer
- the post-run summary uses the same contract language as the shell instead of collapsing back to generic success/failure copy

Fail signs:

- reviewers describe the route as `just hold out and extract`
- the ghost archive, bridge splice, and skyhook finish blur together
- the debrief could belong to any contract in the build

Evidence to collect:

- one shell screenshot with the authored route selected
- one short note answering `what did you think the mission was before entry?`

## Gate 2: Optional objective readability

Pass criteria:

- the `Ghost archive` objective is visible, understandable, and clearly optional
- players can explain what they gain for taking the detour and what they give up in tempo or safety
- success changes the debrief, payout, or faction readout cleanly enough to notice
- skipping the archive still leaves a complete and satisfying main route

Fail signs:

- players miss the archive entirely on a review-guided run
- the detour feels mandatory because the reward is unclear or the route copy oversells it
- success does not change the outcome language enough to prove it mattered

Evidence to collect:

- one capture of the archive status live in the mission
- one successful archive run and one skipped archive run with outcome notes

## Gate 3: Mission fiction and district stakes

Pass criteria:

- reviewers can name `Morrow Relay Co-op` as the client and `Glasshouse` as the hostile force
- the route feels specific to `Choir Exchange // Signal Bridge`, not generic cyberpunk filler copy
- the debrief explains what was stolen, what changed, and who lost ground
- at least one screenshot-worthy authored beat reinforces the district identity

Fail signs:

- players remember only the combat pressure, not the contract fiction
- the route could be re-skinned to another district without changing the writing
- the aftermath does not explain why the ledger matters

Evidence to collect:

- one note answering `who hired you, who opposed you, and what changed?`
- one capture from the market lane, bridge hold, or skyhook finish that sells Choir Exchange identity

## Gate 4: Extraction payoff

Pass criteria:

- the `choir skyhook` finish reads as the clear climax of the run
- `Velvet Knife` feels like a designed last barrier rather than another random cleanup wave
- success, failure, and near-miss all remain legible in the final ten seconds
- the debrief reinforces that the extraction resolved a real district-level consequence

Fail signs:

- the extraction ring feels interchangeable with generic sandbox exfil
- players cannot explain why the final duel mattered
- the route peaks earlier and then coasts into the exit

Evidence to collect:

- one extraction screenshot or clip
- one note answering `what made the ending feel authored or not authored?`

## Gate 5: Deterministic review discipline

Pass criteria:

- shell, fast-entry, and showcase routes all land on the same flagship contract logic
- the review can be repeated from a clean browser state without save dependence
- capture instructions and observer questions are fixed in one place
- producers can judge the route without ad hoc setup or remembered tribal knowledge

Fail signs:

- reviewers need a spoken explanation before the pass starts
- the route depends on prior progression or hidden URL combinations
- the evidence pack omits either shell, optional beat, or extraction proof

Evidence to collect:

- one named evidence pack folder refresh for the current build
- one pass/fail note per route: shell, fast-entry, showcase

## Required reviewer questions

Every Milestone 2 pass must answer these five questions in writing:

1. What did you think the contract was before you entered the district?
2. Did you understand the `Ghost archive` choice, and did it feel worth taking?
3. Which beat felt most authored rather than sandbox-driven?
4. What did the `choir skyhook` finish communicate about the mission stakes?
5. After the debrief, what reward or consequence did you believe you earned?

If the answers are vague, the milestone is not ready to pass.

## Current judgement

What already exists:

- deterministic authored review routes for shell, fast-entry, and showcase
- a real optional objective inside `Dead Signal Choir Heist`
- named client, hostile force, zone, elite duel, and route beats in code
- a stable browser shell that can carry clearer contract framing

What still needs proof:

- the shell and debrief must read as one coherent contract story
- the optional archive beat must change reviewer language, not just the score
- the extraction payoff must survive repeat review without hand-waving
- the milestone needs a formal capture-and-verdict routine, not only a route URL

## Immediate execution order

1. Run the shell review route and record the pre-entry mission sentence.
2. Run one archive-complete pass and one archive-skipped pass through the authored route.
3. Mark each gate `green`, `yellow`, or `red` with evidence.
4. Open builder tasks only for the red and yellow gates that remain after the review.

# Neon District Milestone 3 Progression and Save Confidence Brief

Owner lane: `games-manager`
Date: `2026-05-05`
Applies to: `Milestone 3: Progression and save confidence`

## Purpose

Turn the roadmap's Milestone 3 goal into a production-grade brief that can drive implementation, verification, and later external playtests without letting the progression loop drift into opaque browser-save behaviour.

## Milestone decision

Use the current browser campaign shell as the Milestone 3 proving ground.

Why this path:

- the build already persists core campaign state through [`src/game/progression.ts`](./src/game/progression.ts)
- the shell already exposes contract selection, armory purchases, cyberware unlocks, and post-run summaries in [`src/main.ts`](./src/main.ts)
- the lane has already closed Milestone 2, so the next risk is no longer authored-route shape but whether repeat runs feel dependable

## Current live progression shape

What already exists in code:

- browser-local campaign persistence under `localStorage`
- banked credits, victories, completed contracts, owned armory upgrades, selected loadout, faction reputation, and hostile heat
- contract and cyberware unlock gates keyed off campaign victories
- a post-run summary surface showing credits, bank total, faction shift, elite outcome, and unlocks
- deterministic review mode that bypasses live save writes

## Launch-grade gaps blocking Milestone 3 acceptance

The current loop is functional but not yet trustworthy enough for a launchable vertical slice.

### Save-state trust gap

- the live save has no player-facing health signal such as profile status, last-save stamp, or corrupted-save fallback notice
- `lastResult` is not restored after reload, so the shell loses useful between-session run context immediately
- the reset path is a URL-only affordance instead of a premium in-shell recovery action with clear consequences

### Progression ladder gap

- unlock logic exists, but the shell does not clearly tell the player what the next meaningful contract, cyberware, or armory target is
- victories are currently the main gate, which makes long-term improvement readable to the system but not yet to the player
- contract access still needs a stronger sense of campaign ladder rather than a flat board with hidden thresholds

### Reward and failure clarity gap

- the summary reports what happened on the last run, but not what the player should chase next
- wipe states still preserve some scavenged credits, yet the shell does not clearly explain the tradeoff or recovery path
- faction movement is surfaced numerically, but not framed as an actionable next-run consequence

### Reset and review safety gap

- live progression and seeded review are logically separated, but the acceptance contract is not written down in one place
- there is no fixed three-run verification routine proving that repeated play, refresh, and reset paths cannot silently corrupt the profile
- external reviewers would still need verbal setup to understand how to keep test saves clean

## Milestone 3 acceptance gates

Milestone 3 is complete only when every gate below is green in the same build.

### Gate 1: Save integrity and profile trust

Pass criteria:

- the player can tell whether they are in live progression, seeded review, or a clean reset state without reading source code or URL notes
- refresh, close/reopen, and replay preserve the intended live campaign state
- invalid or stale save data falls back safely without trapping the player in a broken profile
- the build exposes enough profile-state context that a reviewer can describe what was saved and when it changed

Fail signs:

- the player must guess whether a run counted
- a refresh drops important progression state or silently rewinds the selected loadout
- the save resets, sanitizes, or corrupts itself without visible explanation

### Gate 2: Between-run progression ladder

Pass criteria:

- the shell clearly communicates the next unlock target across contract access, cyberware, and armory progression
- the player can explain what the next 30 to 60 minutes of improvement looks like after one completed run
- at least one decision between runs changes the next contract attempt in a meaningful way
- progression feels like a ladder, not just a larger bank number

Fail signs:

- players hoard credits because they cannot tell what is worth buying
- new contracts unlock, but the path to them feels hidden or arbitrary
- replay value comes only from combat novelty, not build or campaign advancement

### Gate 3: Post-run summary clarity

Pass criteria:

- the end-of-run summary states what was earned, what changed, and what the best next action is
- success, failure, optional-objective outcomes, and unlock events each produce distinct post-run takeaways
- the player can explain why the next run will be easier, harder, or different
- faction movement and hostile heat are framed as campaign consequences rather than only raw numbers

Fail signs:

- the player closes the summary still unsure what the run accomplished
- failure looks like a generic loss screen instead of a recoverable campaign state
- optional rewards and unlocks are visible but not meaningful

### Gate 4: Reset and review-path safety

Pass criteria:

- seeded review mode cannot write into the live profile
- reset behaviour is explicit, reversible in expectation, and easy to validate from the shell
- reviewers can move between live progression and review capture routes without hidden save contamination
- the build documents the canonical clean-start path for internal review

Fail signs:

- review and live states can bleed into each other
- reset requires tribal knowledge or URL memorization
- a reviewer can accidentally wipe or pollute a real profile during capture

### Gate 5: Three-run confidence proof

Pass criteria:

- one profile can complete three consecutive runs with persistent credits, unlocks, contract access, and loadout state intact
- at least one refresh or browser relaunch during the sequence preserves the expected state
- at least one failed run and one successful run are included in the proof
- the final profile state matches the logged run outcomes without manual repair

Fail signs:

- the third run exposes drift, duplicate rewards, missing purchases, or broken unlock gates
- repeated runs make the shell harder to read instead of clearer
- the team can only prove progression works through single-run spot checks

## Required reviewer questions

Every Milestone 3 pass must answer these five questions in writing:

1. After this run, what do you think your next meaningful unlock or purchase is?
2. Did the game make it obvious whether your profile was live, seeded, or reset?
3. What exactly carried forward from the last run?
4. If you failed the contract, did the summary still explain why another run mattered?
5. After a refresh or relaunch, what changed and what correctly stayed the same?

If the answers are vague, Milestone 3 is not ready to pass.

## Production split

### Games Manager

- lock the Milestone 3 acceptance gates and proof routine
- reject vague `progression polish` work that does not improve save trust, reward clarity, or repeat-run confidence
- keep the lane focused on one reviewable campaign profile instead of opening more contracts

### Project Manager

- split builder-ready tasks for profile-state UX, next-unlock guidance, summary improvements, and reset/review safety
- keep every Milestone 3 task tied to one of the five gates above

### Tools and Skills

- own any helper or capture work needed to automate the three-run confidence routine if local tooling becomes the blocker

## Recommended implementation order

1. Add player-facing profile-state clarity for live, review, and reset modes.
2. Improve the shell and summary so the next unlock target and next-run value are obvious.
3. Harden reset and review behaviour into one canonical clean-start contract.
4. Run the fixed three-run proof and mark each gate `green`, `yellow`, or `red`.

## Do not do yet

- do not start a new game
- do not hide save-trust issues behind copy-only polish
- do not broaden the contract set as a substitute for a weak progression ladder
- do not call the browser slice launchable until the three-run proof is repeatable

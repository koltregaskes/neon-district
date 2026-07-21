# Neon District Milestone 3 Progression and Save Confidence Checklist

Owner lane: `games-manager`
Date: `2026-05-05`
Applies to: `Milestone 3: Progression and save confidence`

## Purpose

Turn the Milestone 3 brief into a fixed review script that proves the browser campaign loop survives repeated play, refresh, and reset without ambiguous rewards or broken save state.

## Canonical routes

Use these paths for every Milestone 3 pass:

- live progression shell: `http://127.0.0.1:4175/neon-district/`
- clean reset shell: `http://127.0.0.1:4175/neon-district/?resetProgress=1`
- seeded review shell: `http://127.0.0.1:4175/neon-district/?review=1`
- authored seeded fast-entry: `http://127.0.0.1:4175/neon-district/?autostart=1&review=1&reviewSlice=authored`

If the pass depends on any other hidden path, the milestone is not ready.

## Exit rule

Milestone 3 passes only if every gate below is green in the same build and the same profile survives the three-run sequence.

## Test sequence

Run this exact sequence on one live profile:

1. Start from `?resetProgress=1` and confirm the shell returns to the default contract, default cyberware, empty bank, and zero victories.
2. Complete one successful run and record credits earned, any unlocks, and the next suggested progression target.
3. Refresh or relaunch the browser, then confirm bank, victories, loadout, and contract access persisted correctly.
4. Run a second contract with at least one changed between-run decision such as a new purchase, new cyberware pick, or newly available contract.
5. Include at least one failed run before the third pass, then confirm the failure still leaves a legible recovery path.
6. Complete the third run and verify the final campaign state matches the recorded sequence.
7. Open `?review=1` after the live proof and confirm the seeded state does not inherit the live profile.
8. Return to the live shell and confirm the original profile is still intact.

## Gate 1: Clean reset and profile-state readability

Pass criteria:

- reset starts from a known baseline every time
- the shell makes the profile state readable enough to distinguish clean live play from seeded review
- no stale summary, contract, or upgrade state survives an intentional reset

Fail signs:

- reset leaves behind credits, unlocks, or selected gear
- reviewers cannot tell whether they are looking at live or seeded state
- the profile only becomes understandable after inspecting `localStorage`

Evidence to collect:

- one screenshot of the post-reset shell
- one note stating the exact baseline values observed after reset

## Gate 2: Persistence across refresh and relaunch

Pass criteria:

- bank, victories, contracts, cyberware, and owned upgrades survive refresh
- the selected loadout remains valid after reload, or safely falls back with a visible reason
- no duplicate rewards or missing purchases appear after relaunch

Fail signs:

- refresh rewinds the profile
- unlocks persist, but the selected gear silently changes without explanation
- purchased upgrades disappear or can be bought twice

Evidence to collect:

- one before/after note for the refresh checkpoint
- one screenshot pair showing the same progression state before close and after reopen

## Gate 3: Progression ladder clarity

Pass criteria:

- after each run, the player can name the next useful contract, cyberware, or armory target
- the shell explains what is locked, why it is locked, and what action unlocks it
- between-run decisions materially affect the next attempt

Fail signs:

- the player sees locked items but cannot tell how to reach them
- the best next action is still guesswork after reading the shell
- credits accumulate without a clear spending plan

Evidence to collect:

- one written answer after each run: `what is your next target and why?`
- one screenshot of the shell showing the current ladder state

## Gate 4: Post-run summary and recovery clarity

Pass criteria:

- success and failure summaries clearly state rewards, losses, faction movement, and next-run implications
- optional-objective outcomes, unlocks, and elite outcomes change the summary meaningfully
- a failed run still leaves a credible reason to continue the campaign

Fail signs:

- success and failure summaries feel too similar
- the player cannot explain what was banked or lost
- the summary ends without pointing toward the next run

Evidence to collect:

- one success summary note
- one failure summary note

## Gate 5: Review-path isolation

Pass criteria:

- review mode remains non-persistent and separate from the live profile
- moving into and out of review mode does not alter the live campaign sequence
- the clean-start guidance is strong enough for capture or external review prep

Fail signs:

- seeded review changes the live bank, victories, or unlocks
- reviewers need verbal warnings to avoid contaminating saves
- clean-start behaviour only works inconsistently

Evidence to collect:

- one note comparing the live profile before and after a review-mode pass
- one screenshot or log confirming the seeded shell uses a different state

## Required reviewer questions

Every Milestone 3 pass must answer these five questions in writing:

1. What carried forward from run one to run two?
2. What changed after refresh or relaunch?
3. What is the next thing you are trying to unlock or buy?
4. After the failed run, why did another attempt still feel worthwhile?
5. Did review mode stay isolated from the live profile?

## Current judgement

What already exists:

- the live build already persists core campaign values
- seeded review mode already avoids writing to live progression
- the shell already exposes contracts, upgrades, cyberware, and a post-run summary

What still needs proof:

- profile-state readability is still too implicit
- the next-unlock ladder is not yet explicit enough for first-time reviewers
- the reset path is still URL-led instead of product-grade
- the build still lacks a dated three-run evidence pack

## Immediate execution order

1. Use this checklist to open builder tasks for every unclear gate.
2. Improve the live shell before running the formal three-run proof.
3. Run the full sequence above and mark each gate `green`, `yellow`, or `red`.
4. Do not move to Milestone 4 until the same build survives the full proof routine.

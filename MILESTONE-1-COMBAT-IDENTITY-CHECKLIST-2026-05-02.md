# Neon District Milestone 1 Combat Identity Checklist

Owner lane: `games-manager`
Date: `2026-05-02`
Applies to: `Milestone 1: Combat identity lock`

## Purpose

Turn the roadmap goal into a pass/fail gate that can be used by producers, builders, and playtesters without reinterpretation. This milestone is complete only when the build proves that `Neon District` has combat worth scaling into a larger launchable slice.

## Review build routes

Use these deterministic routes while judging the milestone:

- `http://127.0.0.1:4175/neon-district/?autostart=1&review=1`
- `http://127.0.0.1:4175/neon-district/?autostart=1&review=1&reviewSlice=authored`
- `http://127.0.0.1:4175/neon-district/?autostart=1&review=1&reviewSlice=boss`
- `http://127.0.0.1:4175/neon-district/?autostart=1&review=1&reviewSlice=hazard`

## Exit rule

Milestone 1 passes only if every gate below is green in the same build. Partial wins do not count.

## Gate 1: Weapon family differentiation

Current weapon set in code:

- `volley`: sustained pressure rifle
- `scatter`: breach-range burst weapon
- `rail`: elite and lane-control precision weapon

Pass criteria:

- each weapon has a one-sentence combat fantasy that playtesters can repeat back after one contract
- each weapon solves a different problem in live combat, not just the same problem with different damage numbers
- each weapon has a visible downside that forces a tradeoff in positioning, heat, energy, or recovery timing
- the HUD and armory copy explain the intended use of each weapon clearly enough that a first-time reviewer does not need outside coaching
- at least one upgrade per weapon reinforces identity instead of flattening it

Fail signs:

- players swap weapons only because one has the best raw output
- `scatter` and `volley` overlap as interchangeable mid-range pressure tools
- `rail` feels like a slower universal answer instead of a precision lane breaker

Evidence to collect:

- one 30-60 second clip or screenshot pair per weapon showing its ideal use case
- one short playtest note per weapon answering `why would I bring this over the others?`

## Gate 2: Enemy role readability

Current enemy taxonomy in code:

- `runner`
- `gunner`
- `brute`
- `sniper`
- `shield`
- `captain`

Pass criteria:

- a first-read player can identify the threat role of each enemy within two seconds of contact
- each role creates a different failure mode: chase pressure, lane denial, shielded advance, burst punish, or elite command pressure
- kill priority changes by situation rather than always collapsing to `shoot nearest target`
- support pressure is represented clearly enough through `shield`, `captain`, or future support-unit behaviour that players can explain what disrupted them
- elite introductions, health presentation, and threat tells are readable in motion, not just in briefing text

Fail signs:

- players cannot explain why they died beyond `too many enemies`
- `runner`, `gunner`, and `brute` blend into one pressure blob
- shield units feel like larger health pools rather than lane-shaping defenders

Evidence to collect:

- one annotated encounter note listing the first target priority in each review slice
- one wipe report capturing the exact enemy that caused the collapse and why

## Gate 3: Authored cover-and-hazard arena

This gate exists because the roadmap explicitly rejects broad circular kiting as the dominant answer.

Pass criteria:

- at least one reviewable arena forces deliberate movement between cover, open lanes, and hazard space
- standing still in the safest loop fails reliably enough that players must rotate
- the authored beats and hazard triggers support the arena idea instead of adding random noise
- the arena includes at least one strong flank, one defensive anchor, and one hazard-backed denial zone
- the route remains readable on first play, with enough visual hierarchy to support spectatorship and screenshots

Suggested current proving ground:

- `reviewSlice=hazard` for active hazard pressure
- `reviewSlice=boss` for cover, lane, and elite-readability checks

Fail signs:

- the best tactic is to circle the perimeter until timers resolve
- hazard zones are technically active but not decisive
- cover is present as decoration instead of affecting survival decisions

Evidence to collect:

- one capture from the chosen arena showing safe lane, danger lane, and forced rotation
- one note describing the intended player route during the highest-pressure 10 seconds

## Gate 4: Combat feedback and threat signalling

Pass criteria:

- hit confirm, stagger, shield break, overheat, elite spawn, and player damage all have distinct visual or audio tells
- weapon audio reinforces identity strongly enough that muted footage loses useful information
- players can tell when they overcommitted because of heat, energy, or positioning instead of feeling the run failed arbitrarily
- death and shield-break feedback is readable during heavy effects, not hidden by FX clutter

Fail signs:

- testers misread shielded hits as misses
- overheat feels like a silent lockout
- elite arrivals do not create a noticeable escalation moment

Evidence to collect:

- one capture or clip for shield break, overheat, and elite arrival
- one note from a reviewer on whether failure felt readable or cheap

## Gate 5: Playtest question pack

Every Milestone 1 review pass must answer these questions in writing:

1. Which weapon did you trust most, and what combat problem did it solve?
2. Which enemy caused your most dangerous moment, and how did you know it was the main threat?
3. Did any arena force you to move with intent rather than kite broadly? Which one?
4. Was there a moment when feedback, audio, or VFX made the fight easier to read? What was it?
5. Was there a moment when the combat felt muddy, unfair, or samey? What specifically caused that?

Milestone 1 does not pass if reviewers answer these vaguely.

## Current build judgement

What already exists:

- three weapon families and weapon-specific upgrade tracks
- authored review slices for standard, authored, boss, and hazard routes
- hazard systems, elite states, shield interactions, and deterministic review entry points
- mission scripting strong enough to support controlled combat evaluations

What still needs proof before calling the milestone done:

- weapon identity validated by reviewer language, not only by code definitions
- enemy-role differentiation validated under pressure, especially shield, sniper, brute, and elite reads
- one named arena formally accepted as the combat benchmark space
- captured evidence pack for the Milestone 1 gates, not only the broader review pack

## Immediate execution order

1. Run the deterministic review routes and assign one benchmark arena for this milestone.
2. Record the five playtest answers above for at least one internal pass.
3. Mark each gate `green`, `yellow`, or `red`.
4. Open concrete builder tasks only for the red and yellow gates.

# Neon District Milestone 4 Gate 1 Ambient Target Pack

Owner lane: `creative-hub`  
Requested by: `games-manager`  
Date: `2026-05-16`  
Route: `Dead Signal Choir Heist` authored review slice  
Task: `83d773b1-b410-4aa4-9f3a-92650c1e259f`

## Purpose

Replace the generic ambience placeholder with one route-specific target pack a local builder can implement and verify without guessing.

This pack is only for the featured `Dead Signal Choir Heist` slice. It should make the quiet and transitional parts of the route feel like `Choir Exchange` under pressure, not a flat synth bed between fights.

## Source anchors

- [`MILESTONE-4-GATE-1-AUDIO-READABILITY-EVIDENCE-2026-05-08.md`](./MILESTONE-4-GATE-1-AUDIO-READABILITY-EVIDENCE-2026-05-08.md)
- [`MILESTONE-4-CREATIVE-TARGETS-PACK-2026-05-08.md`](./MILESTONE-4-CREATIVE-TARGETS-PACK-2026-05-08.md)
- [`DEAD-SIGNAL-CHOIR-HEIST-FLAVOUR-PACK-2026-05-03.md`](./DEAD-SIGNAL-CHOIR-HEIST-FLAVOUR-PACK-2026-05-03.md)
- [`src/game/content.ts`](./src/game/content.ts)

## Route read

`Dead Signal Choir Heist` is a witness-theft job on a bought signal bridge. The ambience should tell the player they are moving through expensive transit infrastructure that is still half-public, half-hostile, and about to be locked down by Glasshouse.

Use the route vocabulary already present in the slice:

- `Choir Exchange`
- `signal bridge`
- `ghost archive`
- `choir skyhook`

## Ambient layer rules

Every route state below should be built from the same seven ingredients. Change their prominence, not their identity.

### Required ingredients

| Ingredient | What it should sound like | Use |
|---|---|---|
| Rail | distant passing carriage rumble, brake squeal, or track vibration | tells the player this is a live transit lane, not a sealed arena |
| Vent | roof or wall vent pressure, fan chop, duct wash | fills the industrial mid-band in quiet spaces |
| PA bleed | smeared station announcements, warning bursts, or reroute prompts | keeps the district half-public and half-operational |
| Rain on metal | fine roof tick, awning tap, or gutter hiss | gives the route weather and texture without romanticising it |
| Distant siren | far emergency rise and fall, never foreground | sells wider district danger outside the current fight |
| Signage hum | transformer buzz, neon crackle, panel flicker | keeps `Choir Exchange` feeling electrified and expensive |
| Escalation transition | shutters, power dips, warning chirps, or skyline lock cues | marks state changes between recon, hold, pressure, and extraction |

### Global mix rules

- Rail, vent, and signage hum are the constant bed. At least two of those three should always be audible.
- PA bleed and distant siren should arrive in fragments, not loop like music.
- Rain on metal should be clearest in recon and post-spike lulls, then duck slightly under busy combat.
- Escalation transitions must announce phase shifts in under two seconds. They are punctuation, not beds.
- Do not fill every gap. The route still needs breath, but it cannot fall back to anonymous synth wash.

## Route-state targets

### 1. Shell and contract selection

Goal: make the player feel they are taking a job tied to live district infrastructure before they even spawn in.

Prioritise:

- low signage hum
- restrained PA bleed
- soft vent pressure
- light rain tick

Avoid:

- large dramatic swells
- clean silence
- bright menu-style ambience

Builder note:

The shell should imply the same district as the route. Keep the PA and transformer texture related to `Choir Exchange`, not a generic sci-fi terminal.

### 2. Recon entry through the market lane

Reference beat:

- `Slip into Choir Exchange`
- `Arcade tripwire sprung`

Goal: the market lane should sound like a dense transit arcade just before the route goes loud.

Prioritise:

- rain on awnings and metal catwalk edges
- blurred PA reroute copy
- signage crackle from the arcade face
- distant rail movement under everything

Escalation transition:

- when `Arcade tripwire sprung` fires, add one quick power dip or shutter cue so the player hears that cover has broken and the lane is no longer neutral

Pass read:

The first quiet seconds should communicate "public market over live rail" before the first gunfire starts.

### 3. Bridge splice and hold-upload

Reference beats:

- `Bridge shutters dropping`
- `Exchange awnings occupied`

Goal: the signal bridge must feel like the loudest public nerve centre in the route, with the city still audible under the combat.

Prioritise:

- stronger rail vibration and brake groan
- cyclical vent pressure under the bridge
- PA bleed cutting in and out as the bridge wakes
- signage hum turning harsher once the splice starts

Escalation transitions:

- `Bridge shutters dropping` should add a hard mechanical close cue plus a short power-dip tail
- `Exchange awnings occupied` should add a sharper overhead warning or awning-rattle cue to tell the player the threat has gone vertical

Pass read:

The hold should not feel like generic survival combat. It should feel like Glasshouse is sealing a civic bridge while the player keeps the ledger live in public.

### 4. Elite-pressure moment

Reference beat:

- the hold-upload phase once the route pressure peaks and the bridge starts to behave like a firing gallery

Goal: tell the player the route is collapsing inward, not just spawning more bodies.

Prioritise:

- siren layer slightly nearer but still offscreen
- harsher signage buzz and transformer strain
- vent chop becoming more irregular
- one added skyline-lock or system-warning cue before the pressure spike fully lands

Escalation transition:

- the pressure cue should happen before the player understands the exact enemy composition

Pass read:

The ambience itself should say "the district is locking down around you" before the elite or brute pressure finishes spelling it out through combat.

### 5. Extraction and choir skyhook

Reference beats:

- `Skyhook corridor open`
- `Rear screen collapsing`

Goal: extraction should sound like the bridge has been breached open and is now closing behind the player.

Prioritise:

- louder wind through the opened corridor
- rail rumble pulling away below the skyhook
- countdown-compatible warning bed with less PA and more structural strain
- distant siren and signage crackle still present, but stretched and thinner than the bridge hold

Escalation transitions:

- `Skyhook corridor open` should change the space immediately with one release cue plus exposed-air movement
- `Rear screen collapsing` should bring in a harsher closing cue that tells the player to stop chasing scraps and hold the ring

Pass read:

Extraction must sound like a narrow exit window over a live skyline, not like combat ended and an exfil timer simply appeared.

## Strongest intended ambient moment

The strongest ambient moment should be the first second after `Skyhook corridor open`.

Why:

- it can combine exposed wind, receding rail, warning-system strain, and the existing extraction countdown language
- it pays off the route fiction that proof is finally moving out through the choir skyhook
- it turns the authored extraction into a place-change, not just a timer change

If only one ambience transition gets premium attention, make it this one.

## Weakest current moment to fix

The weakest current moment is the quiet stretch between recon entry and the bridge fully waking.

Current failure:

- the route still reads as one generic synthetic bed with combat laid over it
- the player does not yet hear enough rail, PA, rain, or signage identity to believe they are inside `Choir Exchange`

Fix target:

- before the hold gets loud, the player should already hear market-lane rain, distant track movement, and smeared public-address bleed
- if a listened pass cannot identify `Choir Exchange` before the first heavy push, this task is not done

## Builder checklist

Implementing lane should verify all of the following:

1. Recon contains audible rail, rain-on-metal, and PA bleed before the first heavy exchange.
2. Hold-upload adds a distinct shutter or power-lock transition when the bridge wakes.
3. Awnings or vertical pressure moments sound different from ground-lane pressure.
4. Extraction opens the soundstage with exposed-air movement and structural urgency.
5. At least one quiet lull still sounds like a hostile transit district rather than a placeholder drone.

## Finish criteria

This pack is successful only if a local builder can run the authored review route and answer these without interpretation:

1. Where do rail, vent, PA bleed, rain, siren, and signage hum first become audible?
2. Which exact transition tells the player the bridge has locked into hold state?
3. Which exact transition tells the player the skyhook corridor is now the only safe direction?
4. Which quiet moment still feels too synthetic if the route is left unchanged?

If those answers are vague, the ambience pack is still too generic.

## Next action

Games Manager should review this pack against Gate 1, then either:

- accept it as the replacement deliverable for task `83d773b1-b410-4aa4-9f3a-92650c1e259f`, or
- split one local implementation pass plus one listened verification pass against the authored review route.

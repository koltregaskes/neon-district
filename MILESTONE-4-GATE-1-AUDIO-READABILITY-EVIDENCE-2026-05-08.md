# Neon District Milestone 4 Gate 1 Audio Readability Evidence

Owner lane: `games-manager`  
Date checked: `2026-05-09`  
Route: `Dead Signal Choir Heist` authored review slice  
Task: `0d40fe58-a026-44c7-a70b-42f4957eaa0c`

## Verdict

`Yellow`

The local audio authoring pass materially improved weapon identity, shield-contact readability, elite pressure signalling, and extraction urgency, but Gate 1 is not ready to call green until one real listened pass confirms the authored route balance outside headless verification.

## What changed

- added a dedicated `shield-contact` event so front-facing shield impacts now produce a distinct protected-target cue and a stronger break cue when the shield carrier collapses
- added an `extraction-window` event plus countdown marks at `10`, `5`, `3`, `2`, and `1` seconds so exfil now sounds like a narrowing operational window instead of only resolving at win or loss
- re-authored the three weapon families so:
  - `VX-9 Volley Rifle` reads faster and lighter as synthetic suppression
  - `HX-5 Scattergun` reads heavier with a compressed blast plus metallic decay
  - `ARC-12 Rail Lance` now ramps through a capacitor whine into a bright discharge
- deepened the combat bed so hold and extract phases add darker bass pressure, with extra escalation when elite pressure is active
- kept the shell and route ambience procedural but less empty by adding quieter hum and signage-style texture to the non-combat loop

## Verification

- `cmd /c npm run build` passed after the audio changes
- local preview served correctly at `http://127.0.0.1:4175/neon-district/`
- a fresh Playwright probe against `?autostart=1&review=1&reviewSlice=authored` now boots cleanly into live `Recon` with the briefing hidden, `District quiet. Recon window open.` status copy visible, and a dated capture at `output/playwright/gate1-authored-fast-entry-2026-05-09.png`
- the same probe still surfaces repeated GPU `ReadPixels` warnings, so the route-entry issue is resolved but the capture-path hotspot remains open for Gate 4

## Strongest audio moment

The best-authored moment in code is the extraction transition: the upload-close cue, urgent exfil window stinger, and stepped countdown pips now give the route a procedural endgame instead of dropping straight from flat combat into success or failure.

## Weakest audio moment

Ambient district identity is still the weakest part of the package. The procedural hum and noise layers are better than silence, but they are still a synth bed rather than a true layered city texture with rail, vent, PA, rain, and distant siren character.

## Gate call against criteria

- weapons: `pass pending listened proof`
- shield contact and break readability: `pass pending listened proof`
- elite pressure escalation: `pass pending listened proof`
- extraction urgency: `pass pending listened proof`
- district ambience identity: `still below green`

## Known issues

- the fast-entry authored review path now reaches live `Recon`, but browser automation still cannot supply the real listened judgement required to call the gate green
- capture-path GPU `ReadPixels` warnings remain visible and should be carried into Gate 4 hotspot logging
- shield-break feedback is now readable at the shield-carrier contact point, but the slice still lacks a richer layered ambience bed that would sell place between fights

## Next action

Run one real listened authored-route pass on the local review build, then either mark Gate 1 green or split a follow-on ambience refinement task if the route still reads too synthetic between combat spikes.

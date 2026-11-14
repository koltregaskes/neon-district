# Neon District: design-bible gap audit

Checked against main 5b3d86a on 14 November 2026 for rooms-os-hub #1228. This is a code and document audit, not a visual, audio or player-performance sign-off. DESIGN-BIBLE.md describes the longer-term target; six contracts already exist, so the old survival-only description is out of date.

## Every design pillar

| Pillar | Verdict | Implemented evidence | Gap to the stated target |
|---|---|---|---|
| Dense cyberpunk pressure | Partial | Isometric scene, named obstacles with rendered heights, contract zones and authored hazard beats: [simulation](../src/game/simulation.ts), [scene](../src/game/scenes/GameScene.ts), [content](../src/game/content.ts). | Movement/collision use x/y positions and rectangular footprints. Height is presentation, not traversable stacked floors. No explorable hub district or living city population is modelled. Visual density itself needs a playtest, not a grep verdict. |
| Readable combat | Partial | Line-of-sight obstacle checks, proximity cover and damage reduction, shield depletion, dodge, heat, differentiated runner/gunner/brute/sniper/shield/captain roles: [simulation](../src/game/simulation.ts), [types](../src/game/types.ts). | No distinct waist-high/overhead cover model, suppress/stagger state, destructible prop health, drone swarms or netrunner support role. Shock/blackout/corrosive hazards exist, but are not a complete five-family weapon damage/resistance system. Readability under pressure is unverified. |
| Build identity | Partial | Volley/scatter/rail weapons with distinct alternate fire; four selectable cyberware definitions and weapon upgrades affect real modifiers: [content](../src/game/content.ts), fireAlternate/configureRun in [simulation](../src/game/simulation.ts). | No simultaneous primary/secondary weapon equipment, separately equipped power/mobility/defensive slots, proficiency progression or rare named cyberware system. Existing energy sweep and dash are not proof of configurable slots. |
| Mission variety | Partial | Six contracts, authored enemy beats, named elite encounters, blackout/corrosive/shock hazards and a real optional cache branch on the Choir heist: [content](../src/game/content.ts), applyAuthoredBeats/updateOptionalObjective in [simulation](../src/game/simulation.ts). | All contracts share recon/reach/hack/hold/extract phases. No moving convoy raid or dedicated assassination objective implementation. Ghostline explicitly secures an uplink rather than escorting a person. Variety is more than a change of title or tuning. |

Done means the stated feature exists in code, not that its tuning or presentation is accepted. None of the four full target pillars is complete.

## Core loop and supporting systems

| Design-bible requirement | Verdict | Evidence and limits |
|---|---|---|
| Take a contract in a hub district | Partial | Contract board exists in [main](../src/main.ts); no traversable hub. |
| One main objective plus an optional opportunity | Partial | Main objectives exist for all six; optionalObjective is authored for Choir, not every contract. |
| Guns, gadgets, cover and movement | Partial | Weapons, sweep, dash, shield and line-of-sight cover work in the simulation; the full equipment and cover-height target is absent. |
| Extract with cash and faction consequences | Done | resolveContract in [progression](../src/game/progression.ts) banks rewards and changes reputation/heat; optional rewards depend on successful extraction. This is a code-level completion claim only. |
| Upgrade weapons, cyberware and reputation | Partial | Persistent campaign upgrades/unlocks and faction standings exist; street rank, weapon proficiency and territorial control do not appear in CampaignState or its update logic. |
| Seven enemy roles | Partial | EnemyType has runner, gunner, brute, sniper, shield and captain. Captains support named elites; this is not evidence of implemented drone/netrunner behaviours. |
| Stagger, suppression, shield break, overheat, light destruction | Partial | Shield handling and player overheat are implemented. No persistent suppression/stagger state or destructible-prop model found in the reviewed types/simulation. |
| Five elemental families | Partial | HazardKind has shock, blackout and corrosive. ProjectileState has no general damage-family/resistance contract. |
| Street rank, proficiency, reputation, control, rare cyberware | Partial | Credits, reputation, heat, cyberware and weapon unlocks exist in [progression](../src/game/progression.ts). The remaining named systems are missing from its persisted state. |
| Sound signatures and layered city ambience | Partial | Combat event cues exist in [audio](../src/game/audio.ts). This audit did not listen to them; no claim about mix quality or the complete trains/vents/PA/rain/sirens target. |
| Adaptive exploration/alert/combat/boss music stems | Partial | The browser uses briefing and combat streamed loops; procedural scheduling is a fallback when Audio is unavailable. Event cues/intensity logic do not demonstrate the specified multi-stem mix. |
| Five staged tutorial beats | Partial | createTutorialState/updateTutorial implement a six-step contract tutorial. The exact quiet-alley, cover-height, catwalk, workshop and collapsing-vault curriculum is not implemented as that sequence. |
| Front end and in-game terminals | Partial | Board, loadout, cyberware/armory, options and run summary are present in [main](../src/main.ts). No full enemy/district/system codex or territorial heat-map screen was found. |
| Desktop UE5 vertical slice, hub plus two combat zones | Missing | Repository implementation is Phaser/TypeScript/Vite. This does not imply an external desktop project has been audited. |

## Top five gaps by player impact

1. **Different objective rules.** Add a moving convoy or dedicated assassination objective with distinct success/failure rules. Six differently tuned contracts currently return to the same terminal/hold/extract loop. Acceptance: a player must make different decisions, not just visit a renamed marker.
2. **Configurable kit and build trade-offs.** Retain the existing alternate fire, then add a second equipped weapon and distinct power/mobility/defence choices. Acceptance: two loadouts change approach and resource trade-offs without being a flat damage upgrade.
3. **Playable vertical routes and a hub.** Height currently decorates a two-dimensional collision plane. Acceptance: at least two connected elevations alter traversal/line of sight, plus a hub-to-contract transition the player can navigate.
4. **Enemy interaction and combat states.** Add drone/netrunner behaviours and an explicit suppression or stagger counterplay loop before merely increasing wave counts. Acceptance: players can identify and answer each threat; cover height and destruction have consistent rules.
5. **Persistent progression beyond unlock counts.** Specify street rank, weapon proficiency and district control, while preserving the existing credits/reputation/heat ledger. Acceptance: completed contracts visibly change later opportunities or territory, with save/reload coverage.

These priorities rank expected player impact, not effort estimates. Audio stem layering, codex coverage and the authored tutorial curriculum remain explicit secondary gaps above. No game assets were downloaded for this audit, no game window or server was started, and no workflow was edited.

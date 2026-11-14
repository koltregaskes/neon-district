# Neon District

Neon District is a browser cyberpunk shooter. Six contracts make the campaign. Extract every one to secure the district, or let a faction's heat reach 100 and lose it.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints. The game is served under `/neon-district/`.

## How to play

- `WASD`: move
- `Mouse`: aim
- `Left click`: fire
- `Right click` or `F`: alternate fire
- `Shift` or `Space`: dash
- `Q` / `E`: cycle weapons
- `R`: reboot the current contract after a wipe

Pick a contract on the board, choose a weapon and augment, then Enter District. Activate Sweep when you want the fight to start. Hack the terminal, hold the upload, and stand in the extraction ring before the window closes.

## How to finish

You win when all six contracts have been extracted once. The debrief says **District secured**.

You lose when any faction heat reaches 100. The debrief says **District locked**.

A wiped contract is a reboot, not a campaign loss. Credits, heat, and closed contracts save in this browser. **New campaign** clears that save and opens the board again. `?resetProgress=1` does the same on load.

## Build

```bash
npm run build
```

## Review routes

These URLs seed a review profile. They are not the campaign. Start from `npm run dev` for a real run.

Manager-standard review URL:

- [http://127.0.0.1:4175/neon-district/?autostart=1&review=1](http://127.0.0.1:4175/neon-district/?autostart=1&review=1)

Supporting seeded briefing URL:

- [http://127.0.0.1:4175/neon-district/?review=1](http://127.0.0.1:4175/neon-district/?review=1)

Primary showcase URL:

- [http://127.0.0.1:4175/neon-district/?showcase=1](http://127.0.0.1:4175/neon-district/?showcase=1)

Featured authored review URL:

- [http://127.0.0.1:4175/neon-district/?review=1&reviewSlice=authored](http://127.0.0.1:4175/neon-district/?review=1&reviewSlice=authored)

Featured authored fast-entry URL:

- [http://127.0.0.1:4175/neon-district/?autostart=1&review=1&reviewSlice=authored](http://127.0.0.1:4175/neon-district/?autostart=1&review=1&reviewSlice=authored)

Boss review URL:

- [http://127.0.0.1:4175/neon-district/?review=1&reviewSlice=boss](http://127.0.0.1:4175/neon-district/?review=1&reviewSlice=boss)

Boss fast-entry URL:

- [http://127.0.0.1:4175/neon-district/?autostart=1&review=1&reviewSlice=boss](http://127.0.0.1:4175/neon-district/?autostart=1&review=1&reviewSlice=boss)

Hazard review URL:

- [http://127.0.0.1:4175/neon-district/?review=1&reviewSlice=hazard](http://127.0.0.1:4175/neon-district/?review=1&reviewSlice=hazard)

Hazard fast-entry URL:

- [http://127.0.0.1:4175/neon-district/?autostart=1&review=1&reviewSlice=hazard](http://127.0.0.1:4175/neon-district/?autostart=1&review=1&reviewSlice=hazard)

Review query params:

- `review=1`: loads a deterministic, non-persistent campaign seed
- `reviewSlice=authored`: switches the review seed onto the featured Dead Signal Choir Heist lane
- `reviewSlice=boss`: switches the review seed onto the Glassfall Nullbreaker Siege boss slice
- `reviewSlice=hazard`: switches the review seed onto the Redline Blackout Run hazard slice
- `autostart=1`: enters the district immediately
- `showcase=1`: primary demo route for the authored Dead Signal Choir Heist slice
- `contract=choir-heist`: preselects the featured authored mission slice
- `hotDrop=1`: legacy live-combat fast entry
- `skipBriefing=1`: legacy alias for skipping the shell
- `resetProgress=1`: clears local campaign progress
- `debugRuntime=1`: exposes `window.__NEON_DISTRICT_RUNTIME__` after entry

Refresh the review pack with:

```bash
npm run capture:review
```

Milestone review gates:

- [`MILESTONE-1-COMBAT-IDENTITY-CHECKLIST-2026-05-02.md`](./MILESTONE-1-COMBAT-IDENTITY-CHECKLIST-2026-05-02.md)
- [`MILESTONE-2-FLAGSHIP-CONTRACT-BRIEF-2026-05-03.md`](./MILESTONE-2-FLAGSHIP-CONTRACT-BRIEF-2026-05-03.md)
- [`MILESTONE-2-FLAGSHIP-REVIEW-CHECKLIST-2026-05-03.md`](./MILESTONE-2-FLAGSHIP-REVIEW-CHECKLIST-2026-05-03.md)
- [`MILESTONE-3-PROGRESSION-SAVE-BRIEF-2026-05-05.md`](./MILESTONE-3-PROGRESSION-SAVE-BRIEF-2026-05-05.md)
- [`MILESTONE-3-PROGRESSION-SAVE-CHECKLIST-2026-05-05.md`](./MILESTONE-3-PROGRESSION-SAVE-CHECKLIST-2026-05-05.md)
- [`MILESTONE-4-PRESENTATION-PLAYTEST-BRIEF-2026-05-08.md`](./MILESTONE-4-PRESENTATION-PLAYTEST-BRIEF-2026-05-08.md)
- [`MILESTONE-4-PRESENTATION-PLAYTEST-CHECKLIST-2026-05-08.md`](./MILESTONE-4-PRESENTATION-PLAYTEST-CHECKLIST-2026-05-08.md)

## Controls

- `WASD`: move
- `Mouse`: aim
- `Left click`: fire
- `Right click` or `F`: alternate fire
- `Shift` or `Space`: dash
- `Q` / `E`: cycle weapons
- `R`: reboot the run after a wipe

## Design direction

This project uses a browser-friendly stack:

- `Phaser` for combat and rendering
- `TypeScript + Vite` for the workflow
- DOM overlays for the HUD and the campaign shell

The finish line for this build is the six-contract district campaign: extract all six, or lose when faction heat hits 100.

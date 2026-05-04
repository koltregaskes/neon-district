# Neon District

`Neon District` is a browser-first cyberpunk isometric shooter prototype inspired by the readable pressure, industrial density, and high-voltage mood of games like *The Ascent*.

The longer-term production target and full design direction now live in [DESIGN-BIBLE.md](./DESIGN-BIBLE.md).

The current build is a vertical slice with a real contract shell around it:

- contract board, loadout selection, cyberware, and armory tuning
- twin-stick style movement and aim
- dash, shield, energy, and heat management
- multi-phase contracts with recon, breach, upload hold, and extraction
- escalating enemy waves with multiple enemy roles and elite pressure
- faction heat, reputation drift, banked credits, and permanent unlocks
- a layered cyberpunk HUD wrapped around an isometric combat arena

## Run locally

```powershell
cd "W:\Repos\_My Games\neon-district"
npm install
npm run dev
```

## Build

```powershell
cd "W:\Repos\_My Games\neon-district"
npm run build
```

## Manager Review Flow

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

Shared evidence pack:

- [W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district](W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district)

Refresh the shared review pack with:

```powershell
cd "W:\Repos\_My Games\neon-district"
cmd /c npm run capture:review
```

Milestone review gates:

- [`MILESTONE-1-COMBAT-IDENTITY-CHECKLIST-2026-05-02.md`](./MILESTONE-1-COMBAT-IDENTITY-CHECKLIST-2026-05-02.md)
- [`MILESTONE-2-FLAGSHIP-CONTRACT-BRIEF-2026-05-03.md`](./MILESTONE-2-FLAGSHIP-CONTRACT-BRIEF-2026-05-03.md)
- [`MILESTONE-2-FLAGSHIP-REVIEW-CHECKLIST-2026-05-03.md`](./MILESTONE-2-FLAGSHIP-REVIEW-CHECKLIST-2026-05-03.md)

## Controls

- `WASD`: move
- `Mouse`: aim
- `Left click`: fire
- `Shift` or `Space`: dash
- `Q` / `E`: cycle weapons
- `R`: reboot the run after a wipe

## Design direction

This project is intentionally using a browser-friendly stack first:

- `Phaser` for fast combat iteration and rendering
- `TypeScript + Vite` for a lightweight workflow
- DOM overlays for readable HUD and production-friendly UI iteration

Recent delivery/performance hardening:

- the Phaser runtime now lazy-loads after district entry from a local shipped runtime asset instead of inflating briefing-shell startup or the Vite bundle graph
- live HUD updates cache DOM nodes and skip redundant text/style writes
- review evidence generation is now scripted through Playwright instead of depending on manual capture passes
- featured authored contracts, `Dead Signal Choir Heist`, `Glassfall Nullbreaker Siege`, and `Redline Blackout Run` add shaped mission beats on top of the stable sandbox slice

That keeps us moving quickly while we build toward denser districts, better combat readability, more enemy behaviours, weapon differentiation, boss encounters, and eventually a larger campaign structure.

## Next priorities

- cache more static world rendering in the Phaser scene to reduce per-frame redraw cost
- author a fourth bespoke mission with a moving objective, such as convoy interception or a mobile escort breach
- add broader contract variety, boss beats, and stronger authored faction fiction
- deepen armory and cyberware progression beyond the first permanent upgrades
- keep using the browser build as the fast combat sandbox while the desktop production version is defined

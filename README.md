# Neon District

`Neon District` is a browser-first cyberpunk isometric shooter prototype inspired by the readable pressure, industrial density, and high-voltage mood of games like *The Ascent*.

The longer-term production target and full design direction now live in [DESIGN-BIBLE.md](./DESIGN-BIBLE.md).

The current build is a vertical slice:

- twin-stick style movement and aim
- dash, shield, energy, and heat management
- escalating enemy waves with multiple enemy roles
- pickups, score pressure, and run restarts
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

That keeps us moving quickly while we build toward denser districts, better combat readability, more enemy behaviours, weapon differentiation, boss encounters, and eventually a larger campaign structure.

## Next priorities

- add cover logic and enemy flanking pressure
- introduce weapon archetypes and loot rarity
- expand missions beyond wave survival
- add a named elite/boss encounter
- bring in audio, hit stop, and stronger impact feedback
- use the browser build as the fast combat sandbox while the desktop production version is defined

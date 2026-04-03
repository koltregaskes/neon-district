# Neon District Design Bible

`Neon District` should become a premium cyberpunk action shooter: dense vertical cityscapes, readable twin-stick combat, loot and build expression, and a much stronger mission structure than the current survival-slice prototype.

## Reference deep dive

### The Ascent

- Primary takeaway: the world must feel layered, dense, industrial, and alive.
- What to borrow:
  - stacked megacity composition and environmental storytelling
  - combat arenas with strong line-of-sight readability
  - heavy industrial VFX, sparks, smoke, signage, and machinery
  - diegetic UI language and strong hub-to-mission framing
- What to improve on:
  - clearer mechanical depth per mission
  - stronger enemy role separation
  - more memorable tutorialization and progression pacing

### Supporting references

- *Mad Max*: weighty impact, salvage fantasy, faction pressure, crunchy audiovisual payoff
- *Watch Dogs*: systemic disruption, utility gadgets, environmental interaction
- *Assassin's Creed*: better traversal rhythm, readable stealth states, layered movement mastery

## Game design

### Fantasy

You are a freelance district enforcer moving between corporate warrens, gang markets, transit struts, and collapsed industrial zones while trying to stay alive, upgrade your kit, and climb the city’s power map.

### Pillars

- **Dense cyberpunk pressure**: every area should feel crowded, vertical, and electrically unstable
- **Readable combat**: enemies, cover, hazards, and projectiles must be instantly legible
- **Build identity**: loadouts should feel materially different, not just numerically stronger
- **Mission variety**: extraction, sabotage, convoy raids, blackout survival, assassinations, and boss pushes

### Core loop

1. Take a contract in a hub district.
2. Enter a mission zone with one main objective and one optional opportunity.
3. Fight through layered spaces using guns, gadgets, cover, and movement.
4. Extract with cash, tech, and faction consequences.
5. Upgrade weapons, cyberware, and reputation.

## Game mechanics

### Combat

- twin-stick aim with directional dodge
- waist-high and overhead cover logic
- light destruction on props and signage
- stagger, suppression, shield break, and overheat states
- elemental damage families:
  - ballistic
  - thermal
  - shock
  - corrosive
  - cyber disruption

### Player kit

- primary weapon
- secondary weapon
- power slot
- mobility slot
- defensive implant

### Enemy roles

- rushers
- gunline soldiers
- shield carriers
- snipers
- drone swarms
- heavy exos
- netrunner support units

### Progression

- street rank
- weapon proficiency
- faction reputation
- district control state
- rare named cyberware

## Sound design

### Principles

- hard-edged industrial transients
- strong shield-hit and armor-break signatures
- deep mechanical reloads and servo movement
- layered city ambience: trains, vents, PA chatter, rain on metal, distant sirens

### Signature sounds

- shotgun: compressed blast plus metallic decay
- SMG: sharp synthetic clatter
- energy weapon: rising capacitor whine into bright discharge
- shield break: brittle glass-electrical crack
- loot pickup: short tonal confirmation, not arcade coins

## Music design

### Direction

- industrial techno
- dark synth pulses
- distorted bass arps
- sparse melancholy pads for hub zones

### System

- exploration stem
- alert stem
- combat stem
- elite/boss escalation stem
- extraction stinger

The music should intensify with danger instead of behaving like a flat looping soundtrack.

## Tutorials

Teach through controlled pressure, not walls of text.

### Tutorial beats

1. movement and aiming in a quiet alley
2. cover height and suppressive fire in a loading bay
3. dash and hazard avoidance on a transit catwalk
4. shield break and gadget use in a workshop ambush
5. extraction timer in a collapsing data vault

## Menus

### Front end

- title screen with a slow-moving skyline and light rain
- `Continue`, `New Contract`, `Loadout`, `Options`, `Quit`

### In-game

- contract board
- loadout table
- cyberware screen
- map with faction heat
- codex for enemies, districts, and systems

The menu language should feel like a street-terminal operating system, not a generic sci-fi dashboard.

## Production roadmap

### Near term

- fix Pages demo and keep using it as a combat sandbox
- add cover states and enemy archetype clarity
- add a first proper contract mission with extraction

### Mid term

- move to a desktop vertical slice in Unreal Engine 5
- build one hub district plus two combat zones
- add real audio and soundtrack stems

## Visual references

- The Ascent: https://store.steampowered.com/app/979690/The_Ascent/
- The Ascent screenshots: https://www.newgamenetwork.com/media/30179/the-ascent-screenshots/
- The Ascent community screenshot culture: https://steamcommunity.com/sharedfiles/filedetails/?id=2853013541

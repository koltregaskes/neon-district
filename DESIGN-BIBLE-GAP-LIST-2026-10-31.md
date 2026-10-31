# Neon District: gap list against DESIGN-BIBLE.md (31 Oct 2026)

Linear: KOL-6955.

**Basis:** the code at `7973242`, the head of PR #5 "Make Neon District a finishable campaign". This is the newest state; `main` (`5b3d86a`) has no campaign yet.

**Method:** read the code only. Nothing was built or played for this note. An item is marked DONE only when a mechanic exists in code; a name in text or a label alone counts as missing.

**Totals:** 77 bible items: **25 done, 32 partial, 20 missing.**

## Top 5 gaps by player impact (a 15-minute session)

1. **Every contract is the same arena with the same five phases.** All six contracts use one obstacle set (`DISTRICT_OBSTACLES`, simulation.ts:459) and the same recon, terminal, hack, upload and extract flow. By the second contract, "mission variety" is a label on one map.
2. **No gadgets or power slot.** The only verbs are shoot, alt-fire and dash, so fights flatten into kiting.
3. **Hits feel light.** There is no stagger, no suppression and nothing destructible, so enemies barely react to being shot.
4. **Builds barely change how you play.** Every run carries all three guns (cycled with Q and E). The single augment slot is a stat bump, and faction reputation gates nothing.
5. **The audio is thin.** There is no city ambience, the music is two MP3s swapping, and there is no boss music. The music intensity code (audio.ts:92) only drives the synth fallback, which never runs in a browser.

## A. Pillars

| Item | Status | Evidence |
|---|---|---|
| Dense vertical pressure | Partial | Tall isometric prisms, skyline and rain (GameScene.ts:402, 683-696). Play is on one flat plane with no vertical traversal. |
| Readable combat | Done | A distinct silhouette per enemy type (GameScene.ts:502-545), a front-facing shield, drawn hazard zones and colour-coded shots. |
| Build identity | Partial | The three weapons play differently (simulation.ts:90-160), but all three come on every run, and the augment is a stat bump. |
| Extraction | Done | Every contract ends with an extract ring and a timer, and one contract is a witness extraction (content.ts:276). |
| Sabotage | Partial | "Blackout Spine Sabotage" (content.ts:211) is the same terminal, upload and extract loop. |
| Convoy raids | Missing | No convoy, vehicle or raid. |
| Blackout survival | Partial | Redline adds timed shock and blackout zones (content.ts:755-810) to the same loop. |
| Assassinations | Missing | No kill-the-target objective. Elites are only optional bonuses. |
| Boss pushes | Partial | The Glassfall boss "Cinder Bishop" (content.ts:553) uses the same `captain` type and AI as the other elites. |

## B. Core loop

| Item | Status | Evidence |
|---|---|---|
| Take a contract in a hub | Partial | The contract board is a menu (main.ts:125). There is no walkable hub. |
| Main objective plus an optional one | Partial | Only Choir Heist has an optional objective (content.ts:404). |
| Guns, gadgets, cover, movement | Partial | Guns, dash and cover exist. Gadgets don't. |
| Extract with cash, tech and faction consequences | Partial | Cash and faction heat are applied (progression.ts:386-420). Tech comes only as unlocks by victory count; nothing drops. |
| Upgrade weapons, cyberware and reputation | Partial | Three armory tunes (content.ts:96). Cyberware is unlocked, not upgraded. Reputation is shown but does nothing (main.ts:1394). |

## C. Combat

| Item | Status | Evidence |
|---|---|---|
| Twin-stick aim | Done | WASD plus mouse (GameScene.ts:185). No gamepad support. |
| Directional dodge | Done | The dash follows your movement (simulation.ts:1915-1922). |
| Waist-high vs overhead cover | Partial | Cover is one in-or-out flag giving 0.48x damage taken (simulation.ts:57, 1338). Obstacle height is only drawn. |
| Light destruction | Missing | Nothing breakable. |
| Stagger | Missing | No stagger or knockback. |
| Suppression | Missing | None. |
| Shield break | Partial | Shield carriers take less frontal damage, and the rail gun pierces (simulation.ts:1198, 1620). There is no shield to break. |
| Overheat | Done | Lockout, then recovery at heat 34 (simulation.ts:55, 1210, 1882). |
| Ballistic | Missing | Projectiles have no damage type (types.ts:66). |
| Thermal | Missing | Exists only as a cyberware name. |
| Shock | Partial | Shock hazard zones exist, in Redline only (content.ts:760). |
| Corrosive | Missing | The hazard kind is defined (types.ts:23), but no content uses it. |
| Cyber disruption | Partial | The blackout hazard drains energy faster (simulation.ts:1155). |

## D. Player kit

| Slot | Status | Evidence |
|---|---|---|
| Primary | Done | Three weapons (simulation.ts:90). |
| Secondary | Partial | No separate slot. Each weapon has an alt-fire (simulation.ts:125). |
| Power | Missing | No ability or gadget slot. |
| Mobility | Partial | A fixed dash; the Blink Weave implant only tunes it (content.ts:66). |
| Defensive implant | Partial | One shared augment slot, with Mesh as the shield option (content.ts:42). |

## E. Enemy roles

| Role | Status | Evidence |
|---|---|---|
| Rushers | Done | `runner` (simulation.ts:228, 1680). |
| Gunline | Done | `gunner` keeps its distance and fires (simulation.ts:1697). |
| Shield carriers | Done | `shield`, with frontal damage reduction (simulation.ts:1620). |
| Snipers | Done | `sniper`, range 920 (simulation.ts:1713). |
| Drone swarms | Missing | No drone type (types.ts:44). |
| Heavy exos | Partial | `brute` is a heavy melee bruiser, not an exo (simulation.ts:230). |
| Netrunner support | Missing | No support type. |

## F. Progression

| Item | Status | Evidence |
|---|---|---|
| Street rank | Missing | Only a victory count (types.ts:319). |
| Weapon proficiency | Missing | None. |
| Faction reputation | Partial | Stored and shown, but gates nothing. |
| District control state | Partial | Faction heat raises the enemy tier (simulation.ts:417, 532), and 100 heat ends the campaign. There is no district map. |
| Rare named cyberware | Partial | Four named implants, unlocked by victory count (content.ts:40-90). None are rare drops. |
| Progress saves | Done | localStorage key `neon-district/campaign-v2` (progression.ts:23, 338). |

## G. Sound

Effects are made live with WebAudio (audio.ts:531, 558). Music is two MP3 files in `public/assets/audio`.

| Item | Status | Evidence |
|---|---|---|
| Industrial transients | Partial | Simple sawtooth and noise bursts. |
| Shield-hit and armour-break signatures | Done | Distinct shield and health hit sounds (audio.ts:311, 324). |
| Reloads and servo sounds | Missing | No reload mechanic and no servo sounds. |
| Layered city ambience | Missing | No ambience, rain or sirens. |
| Shotgun | Done | audio.ts:458. |
| SMG | Partial | There is no SMG. The volley rifle has a square-wave blip (audio.ts:473). |
| Energy weapon | Done | Rail capacitor whine into a discharge (audio.ts:466). |
| Shield break | Done | audio.ts:328. |
| Loot pickup | Done | A tonal sound per pickup type (audio.ts:498). |

## H. Music

| Stem | Status | Evidence |
|---|---|---|
| Exploration | Partial | One briefing track shared by the menu and recon (audio.ts:219). |
| Alert | Missing | No alert state. |
| Combat | Done | `music-combat.mp3` (audio.ts:224). |
| Elite or boss | Missing | Only a one-shot elite sound effect (audio.ts:418). |
| Extraction stinger | Done | A sting plus 10, 5 and 3 second ticks (audio.ts:105, 435). |
| Intensity follows danger | Partial | Calculated (audio.ts:92), but it only feeds the synth fallback (audio.ts:205). |

## I. Tutorials

| Beat | Status | Evidence |
|---|---|---|
| Any tutorial | Done | A 6-step guided HUD tutorial (simulation.ts:748-872). It replays on every contract. |
| Movement in a quiet alley | Partial | A movement step during recon in the main arena. |
| Cover and suppression in a loading bay | Missing | No step checks cover. |
| Dash and hazard on a catwalk | Partial | A dash step (simulation.ts:865), with no hazard. |
| Shield break and gadget in a workshop | Missing | Not present. |
| Extraction timer in a data vault | Partial | A "Make extraction" step that completes on victory. |

## J. Menus

| Item | Status | Evidence |
|---|---|---|
| Title skyline with rain | Partial | The menu uses a static `shell-bg.jpg` (main.ts:86); rain appears only in-game. |
| Continue, New Contract, Loadout, Options, Quit | Partial | The buttons are Enter District and Hot Drop, plus New campaign once it ends (main.ts:216). Loadout and Options exist; there is no Continue and no Quit. |
| Contract board | Done | main.ts:125, 1224. |
| Loadout table | Done | main.ts:131 and the armory at main.ts:150. |
| Cyberware screen | Done | main.ts:156, 1260. |
| Map with faction heat | Partial | A heat ledger with bars, not a map (main.ts:1394). |
| Codex | Missing | None. |

## K. Roadmap near term

| Item | Status | Evidence |
|---|---|---|
| Pages demo | Done (config) | Deploys on push to `main`, with Vite base `/neon-district/`. The live site wasn't checked, and PR #5 isn't live until it merges. |
| Cover states | Partial | One in-or-out flag only. |
| Enemy archetype clarity | Done | Six types, each with its own AI and silhouette. |
| A first proper contract with extraction | Done | Recon, terminal, hack, upload, extract (types.ts:96). |

## L. The PR #5 campaign as it stands

- **Contracts:** six (content.ts:149-818). Three are open at the start, Ghostline opens after 1 victory, and Glassfall and Redline after 2. Finished contracts can be replayed.
- **Win:** all six completed (progression.ts:102). The debrief reads "District secured" (main.ts:662).
- **Loss:**
  - The campaign is lost when any faction reaches 100 heat (progression.ts:96, 106).
  - Heat only rises: +10 to +18 on a success and +4 to +8 on a failure.
  - A clean run ends with Helix at about 56, so a campaign loss needs roughly six or more Helix wipes or replays.
  - A wipe on its own only fails that contract.
- **Restart:**
  - R, or the debrief button, restarts the contract (main.ts:1831).
  - After the campaign ends, the same path starts a new campaign and clears the save (main.ts:1812).
  - `?resetProgress=1` also clears it.

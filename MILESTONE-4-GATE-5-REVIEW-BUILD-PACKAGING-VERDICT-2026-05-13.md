# Neon District Milestone 4 Gate 5 Review-Build Packaging Verdict

Gate: `Gate 5 - Review-build packaging discipline`  
Owner lane: `games-manager`  
Review date: `2026-05-13`  
Task: `769f9ef5-1c79-4400-b566-a23d28e8eb2f`

## Outcome

Gate 5 is `GREEN` for handoff discipline. The current Neon District review build now has one explicit packaging contract that names the canonical URLs, deterministic verification command, evidence pack path, capture order, and the known issues that another lane must inherit without extra verbal setup.

This does **not** make the whole Milestone 4 build externally ready. Gate 5 is green because the review route is now packaged coherently; Gate 1 audio closure and Gate 4 performance closure remain real release blockers for an outside watch-through.

## Canonical review contract

- Primary fast-entry review URL: `http://127.0.0.1:4175/neon-district/?autostart=1&review=1`
- Supporting seeded shell URL: `http://127.0.0.1:4175/neon-district/?review=1`
- Featured authored route shell: `http://127.0.0.1:4175/neon-district/?review=1&reviewSlice=authored`
- Featured authored route fast-entry: `http://127.0.0.1:4175/neon-district/?autostart=1&review=1&reviewSlice=authored`
- Primary showcase URL: `http://127.0.0.1:4175/neon-district/?showcase=1`
- Deterministic verification command: `cmd /c npm run capture:review`
- Shared evidence pack: [`W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\README.md`](W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\README.md)

## Capture order

1. Seeded shell briefing
2. Standard fast-entry shell
3. Standard fast-entry mobile view
4. Authored review shell
5. Authored archive live
6. Authored archive secured
7. Authored archive skipped
8. Showcase desktop
9. Showcase mobile
10. Authored hold
11. Authored summary
12. Boss shell
13. Boss fast-entry
14. Boss hold
15. Boss summary
16. Hazard shell
17. Hazard fast-entry
18. Hazard hold
19. Hazard summary

The full dated filenames for that order are now locked in [`W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\README.md`](W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\README.md).

## Evidence

- [`W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\README.md`](W:\Repos\_My Games\LOCAL-ONLY\captures\neon-district\README.md)
  - Expanded the shared review-pack manifest so it now includes explicit capture order and a current known-issues section.
- [`W:\Repos\_My Games\neon-district\MILESTONE-4-GATE-2-HERO-CAPTURE-EVIDENCE-2026-05-08.md`](W:\Repos\_My Games\neon-district\MILESTONE-4-GATE-2-HERO-CAPTURE-EVIDENCE-2026-05-08.md)
  - Confirms the 2026-05-12 hero frames and the review-pack manifest link.
- [`W:\Repos\_My Games\neon-district\MILESTONE-4-GATE-1-AUDIO-READABILITY-EVIDENCE-2026-05-08.md`](W:\Repos\_My Games\neon-district\MILESTONE-4-GATE-1-AUDIO-READABILITY-EVIDENCE-2026-05-08.md)
  - Keeps Gate 1 yellow pending one real listened authored-route pass.
- [`W:\Repos\_My Games\neon-district\MILESTONE-4-GATE-4-PERFORMANCE-REMEDIATION-VERDICT-2026-05-10.md`](W:\Repos\_My Games\neon-district\MILESTONE-4-GATE-4-PERFORMANCE-REMEDIATION-VERDICT-2026-05-10.md)
  - Keeps Gate 4 red because the live authored route still misses the capture-hardware bar.

## Known issues to inherit

- Gate 4 remains red: the authored review route still measures around `19-21 FPS` in the recon, hold-upload, and extraction phases under the repeatable proof path.
- Capture-path `GPU stall due to ReadPixels` warnings still appear in the hotspot proof and are part of the reviewer-visible risk.
- Gate 1 remains yellow: the audio implementation is improved, but the route still needs one real listened pass before it can be called externally credible.
- Browser audio still requires a user gesture, so fully automated captures may begin muted until input occurs.
- Same-session reruns of `cmd /c npm run capture:review` and `node scripts/build.mjs` have timed out intermittently on this host even when the current evidence pack already exists.

## Next action

Hand this build to the next lane with the shared capture manifest first, then keep Milestone 5 scoped behind two explicit closures:

1. run a real listened authored-route pass and either close Gate 1 or split an ambience refinement task
2. run the deeper renderer/capture-path optimisation pass needed to move Gate 4 off the current red verdict

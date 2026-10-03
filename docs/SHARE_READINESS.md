# Share-readiness review — 2026-10-03

Current release: **v0.3.0**. The owner approved publication on 2026-10-04 from
corrected candidate `1dff130`. Publication requires a successful Pages deployment
of the exact merge commit and verification of the real public app before tagging.
See [deployment runs](https://github.com/MadB0i/Fault-and-Flow/actions/workflows/deploy.yml)
and [releases](https://github.com/MadB0i/Fault-and-Flow/releases) for delivery status.

Historical context: v0.2.0 was public on
[GitHub Pages](https://madb0i.github.io/Fault-and-Flow/) during the 2026-10-03
share-readiness review. This follow-up and its new social assets were initially
local changes awaiting approval.

## Audit and changes

Before this pass the initial heading did not immediately identify Assam or the
two experiences. Canonical/social metadata and app icons were absent. The dry
comparison divider crossed introductory copy and map controls; its keyboard ring
spanned the entire map. Exports offered a portrait crop without a return URL and
no landscape card. ROADMAP still described public deployment as future work.

The revised opening names Assam and explains chosen flood scenarios and recorded
earthquakes. The existing field-atlas typography and palette remain. The real
terrain continues to be the main exhibit; there are no added fabricated risk
scores, warnings, building surveys or future earthquakes.

- An optional 13-second showcase uses the existing engine API, chosen water
  settings, the dry/scenario sweep and actual recorded history. Loading adds
  time. Start explains the water/camera reset; pause, skip, replay and district
  discovery are explicit. Reduced motion uses Next and paused water. Returning
  visits never auto-play. Skip restores the original presentation/area; it cannot
  restore elapsed solver state.
- Comparison labels and the line clear the intro and navigation; the keyboard
  ring belongs to the handle. Cinematic controls render above the line.
- Canonical, Open Graph and Twitter large-card metadata use the public Pages URL.
  The 1200 × 630 preview uses real water/terrain and sourced quake markers through 1950. Original river/seismic icons use base-aware local paths. No remote fonts,
  image service, new dependency or synthetic disaster image is involved.
- Portrait PNGs include the return URL. A contained 1200 × 630 landscape card
  adds title, context, chosen settings or recorded event, scientific limits and
  full attribution. Existing portrait WebM remains browser dependent; PNG/link
  fallbacks remain available. There is no universal MP4 claim.
- Short phone landscape layouts scroll to their controls. New automated checks
  cover reduced motion, all stages, pause, skip, failure recovery, returning
  visits, both export formats/languages/modes, measured text bounds and rotation.

## Reproduce

Run Vite first. Python Playwright and Pillow are required for native checks and
media capture; reuse the existing Chromium executable, keeping temp files on D:.

```bash
npm run verify
npm run e2e -- --workers=1
npm run shots
npm run contrast
python scripts/test-release.py --browser /path/to/chromium
python scripts/capture-release.py --browser /path/to/chromium
python scripts/capture-social.py --browser /path/to/chromium
```

Native tests write evidence to ignored `.cache/share-readiness/`; core screenshot
capture updates `docs/screenshots/`. Inspect the actual 1440 × 900 and 390 × 844
pixels, including Assamese, rather than judging the source alone. The social
capture and the README's real-browser GIF retain credits. Every committed asset
must stay below 5 MB.

## Verification results

The 2026-10-04 audit of `1dff130` confirmed the smallest fixes for production
preview base paths, mobile depth/navigation overlap and Assamese root semantics.
`npm run verify` passes formatting, lint, types, **183 unit tests across 19 files**
and the production build. Browser gates pass **64 core checks**, **28 new
share/showcase checks**, **26 screenshot layout/axe checks** and **14 existing
release checks**, including actual changing WebM frames and unsupported-browser
fallbacks. `npm run shots` also passes independently. No new axe violations were
reported at either required width or language. Icons/preview dimensions and file
sizes have automated assertions; changed assets are all below 5 MB.
The cold reduced-motion regional start also verifies a focused, enabled Skip
control while the overview terrain loads.

A development-server reload interrupted one core run; its clean stable-source
rerun passed. The screenshot gate now verifies its expanded controls at capture
time. The comparison pixel regression masks only the measured new DOM-label
rectangles, preserving the full remaining right-side equality and left-side
difference checks. The unchanged contrast report has **28 passing pairs and two
previously accepted render-fill exceptions**, described below. The production
build retains its existing chunk-size warnings; no performance guarantee is made.

The real-browser GIF has **34 captured frames, 27 encoded frames, 579,602 bytes**.
It is a separate 7.48-second README demo, not the 13-second showcase. The social
preview is **1200 × 630, 349,298 bytes**. Actual 1440px/390px EN/AS pixels, landscape
exports, rotated-phone layout and showcase scenes were inspected. Local
documentation links resolve; the historical v0.2.0 release/About/topics matched
the product. DEM checks pass all eight landmark-containment assertions. Production
preview checks pass default, shared Assamese FLOW, historical FAULT and invalid
input reloads without forced playback or asset errors. Continuous desktop/mobile
recordings were inspected frame by frame through all seven showcase stages;
the animation clock is 13 seconds, with loading and slow rendering adding time.
Public metadata, assets, direct links and catalogue cutoff are mandatory delivery
checks before the v0.3.0 tag and release are published.

## Physical/manual matrix — not run in this pass

Emulated Chromium viewports are layout checks, not phone-performance evidence.
Record actual device, OS/browser versions, date and result for each row. Both
physical columns below remain **NOT RUN**, not provisionally passed.

| Check                                              | iPhone Safari | Midrange Android Chrome | Evidence needed                                      |
| -------------------------------------------------- | ------------- | ----------------------- | ---------------------------------------------------- |
| First load, slow network, unavailable WebGL, retry | NOT RUN       | NOT RUN                 | Time, readable loader/error, usable recovery         |
| One-finger pan, pinch at place, taps versus drags  | NOT RUN       | NOT RUN                 | Target stays under gesture, no accidental event pick |
| Run/pause/reset, water depth and dry comparison    | NOT RUN       | NOT RUN                 | Visible chosen-state response, reachable controls    |
| Timeline, magnitude filter, event/source record    | NOT RUN       | NOT RUN                 | Correct historical date, direct source opens         |
| District search, on-screen keyboard, return focus  | NOT RUN       | NOT RUN                 | All names searchable, dialog can close               |
| Portrait/landscape PNG, link sharing, attribution  | NOT RUN       | NOT RUN                 | Saved file opens, text and return URL readable       |
| WebM recording or honest fallback                  | NOT RUN       | NOT RUN                 | Browser capability result; decoded file if supported |
| Portrait ↔ landscape while running/sharing         | NOT RUN       | NOT RUN                 | No trapped/clipped controls or lost dialog           |
| OS reduced motion, optional replay, hidden tab     | NOT RUN       | NOT RUN                 | Manual steps, no forced playback, pause on hide      |
| VoiceOver / TalkBack and external keyboard         | NOT RUN       | NOT RUN                 | Names, live announcements, focus and exit path       |
| Sustained use, heat, memory, real rendering speed  | NOT RUN       | NOT RUN                 | Measured device behaviour; no inferred fps           |

Native-speaker Assamese review is also pending; glyph coverage alone cannot
establish translation quality. No offline capability, live alert feed, bathymetry,
erosion model, forecast or local hazard map is claimed.

The palette is unchanged. The contrast tool's existing terrain-low 1.58:1 and
deep-water 2.50:1 render-fill exceptions remain documented in `DECISIONS.md` §1
and `DESIGN.md`; HUD text uses the passing palette. Public asset delivery is a
release gate after deployment. Social-platform cache previews remain a manual
check after publication.

# Lessons From Past Widgets

Real mistakes made while building widgets in this project, the cause, and the rule that now
prevents each. Read this before building; add to it when a new mistake is found.

## Motion & morphing

| What the user saw | Cause | Rule |
|---|---|---|
| "No smooth animation" when the Apply form switched to the success view and back on Withdraw | The two views were swapped with a plain conditional inside the panel | Views inside one panel swap through `AnimatePresence mode="wait"` with an opacity/y/blur crossfade |
| "The morphing animation isn't smooth" (Apply Now and Deadline panels) | Panel background only on `openClassName`, so the box was see-through while growing; a `border` appeared instantly and shifted content 1px; content was `h-full` so it re-laid out every frame | Background on the container (or faded), ring-in-box-shadow instead of border, content in a fixed-size wrapper pinned to the anchor (easing.md §4) |
| Easings picked ad hoc (`back.out(2)`, `"easeOut"`, custom beziers) across widgets | No shared tokens | Only curves from easings.net via `src/lib/motion.ts`; the checker flags anything else |

## Carousels

| What the user saw | Cause | Rule |
|---|---|---|
| Carousel stuck halfway between two slides | (a) Focus moving to a button in an off-screen slide natively scrolled the `overflow-hidden` viewport. (b) A throttled/hidden page froze Embla's rAF snap; Embla never restarts it, and `scrollTo()` on the already-selected index is a no-op | Off-screen slides get `inert`; viewport `onScroll` resets `scrollLeft = 0`; a recovery effect finishes a stalled snap (`animation.stop()` → `useDuration(0)` → `update/render`) on `pointerUp`/`select` (+900ms), `visibilitychange`, `focus`; never while the pointer is down |
| "Very hard border" on the left where slides were cut, and cards "structurally attached" | Viewport clipped exactly at the card edge; slides had no gap | Viewport bleeds to the widget edge (`-mx-*`) with a horizontal `mask-image` fade over the bleed; slides `align: "center"`, width `100% - bleed`, padding = half the gap |
| Card bottom corners looked cut flat | `ring-1` draws outside the box and the viewport's `overflow-hidden` clipped it | Surfaces inside clipping containers use `ring-inset` |
| "Live App" button cut off in the detail panel | Panel `expandedHeight` (140) was smaller than its content (158) | Measure `scrollHeight` of every expanded panel for every item's content (longest description), not just the first |

## Visual quality

| What the user saw | Cause | Rule |
|---|---|---|
| "This is not premium" | Flat grey inner box, everything the same weight, empty middle, unused data | Layered surfaces (off-white widget, white card with hairline ring), clear type ramp, one strong accent, fill empty space with real data (e.g. a headline metric) — not decoration |
| Typography looked off | Name and location `items-center` at 16px/10px; bold units ("3 **yrs**"); "99 %" gap; 10px labels | Baseline-align mixed sizes (`items-baseline`); bold only the number; keep units attached; minimum 11px; one scale (16/14/12/11) |
| Description floating in the middle of the card | `my-auto` / `justify-between` on a 3-part column | Anchor text under its heading (`mt-*`), push actions down with `mt-auto` |
| Timeline lines didn't connect to the dots | One line segment per row with a guessed `-bottom-4` | One continuous rail through dot centres; mask the tail past the last dot |
| `✕` text character used as a close icon | Habit | Lucide `X` only; the checker flags non-Lucide glyph icons |
| Indigo accents leftover after a light-mode conversion read as off-brand | Palette swapped mechanically | After a theme change, re-check every accent for contrast on the new background and consistency |

## Live data & sizing

| What happened | Cause | Rule |
|---|---|---|
| Unit labels jittered sideways every second (Down/Up/Disk/Power) | Centred/right-aligned values changing width pushed their units | Put the unit in the label ("Down KB/s"), show the bare number, align it with its label; use consistent decimals (`toFixed(1)`) |
| CPU legend vanished on phones | Content slightly taller than the 9:16 box; flex shrank the only `overflow-hidden` child to 0 | Give stacked sections `shrink-0` (`[&>*]:shrink-0`) and budget the height for the smallest size |
| A 480px widget spilled out of the 3-column grid | Grid columns are ~430px at 1400px | Max widget width ~420px on desktop (e.g. 416×234 for 16:9), ~350px on phones |
| Panel corners peeked out behind an expanded card | Card was inset/rounded differently from the panel under it | When an element expands over another surface, animate to that surface's exact inset and radius |
| Motion audit flagged "sibling shift" on a live dashboard | Live numbers changing width moved neighbours | `NumberMorph` and live value groups carry `data-number-morph`; the audit baselines 1.2s before clicking and ignores anything that moves on its own |
| Reference ratio wasn't approved (2:1, ~0.72) | — | Pick the nearest approved ratio (16:9, 9:16), fill extra space with real data (e.g. a network chart), never stretch |
| Contents outside the reference widget (preset chips, home bar) | — | Bring essential controls inside (e.g. presets replace Stop while idle); drop decorative outside elements |

## Polish pass (all widgets)

| What happened | Cause | Rule |
|---|---|---|
| Envelope open/close felt janky | Live `backdrop-blur` on a moving layer, a hover lift that moved its own hit area (flicker loop at the edge), cards/pocket/viewer all animating at once, blend modes + clip-path stacks on moving art | No backdrop-filter on moving layers; keep hit areas static and animate an inner span; sequence exit (short ease-in) → enter (ease-out, ~0.1s delay); one SVG per illustration; `will-change-transform` on moving groups |
| Every widget spilled 7–97px on a 375px phone | Fixed design sizes wider than the ~343px column | `App.tsx` wraps widgets in `FitToWidth` (scales down only when wider than the column, reserves height). Don't hand-shrink layouts |
| Widgets overlapped each other at 640–1279px | `FitToWidth` was a flex row with a fixed height, so the widget stretched to the wrapper's height, was re-measured smaller, and collapsed (380px → 185px) while still painting full size | Measuring wrappers use `items-start`; verify the grid at 375/640/768/900/1024/1180/1280/1400/1600/1920 with a probe on each widget's own root box (not its wrapper) plus screenshots — never just 375 and 1400 |
| Click rotations crept into older widgets (chevron 90°, image tilt) | — | Swap icons (crossfade) instead of rotating; zoom without tilt |
| Clickable divs/spans and title-only buttons | — | Every control is a `<button>` with an `aria-label`; tests target those labels by exact match |
| Test harness hit the wrong button ("Record" matched "Recording options") | Prefix matching | Match aria-label/text exactly first, prefix only as a fallback |
| Headless captures froze mid-entrance (opacity 0.24) | Headless Chrome barely advances frames when idle | Judge entrances from screenshots/interaction, not from idle DOM reads |

## Content & process

| What happened | Rule |
|---|---|
| The reference's deadline (24 Sep 2026) had already passed, so the widget said "Closed" | Compare every date with today before building; ask the user |
| User asked to "change this image" without supplying one | Look in `public/` for an unused asset that fits, use it, and say which file was chosen |
| Testing in the hidden browser pane froze all animations (0 fps), so tab switches never finished and screenshots were stale | Check rAF first (`requestAnimationFrame` count over 500ms). If ~0, test motion in headless Chrome via `scripts/motion-audit.mjs` instead |
| `element.click()` from page JS sometimes didn't open a MorphContainer | Drive real input (CDP `Input.dispatchMouseEvent`) for interaction tests |
| A temporary debug/test change (`__embla` global, starting tab) risked being left in | Mark temporary edits with `DEBUG-TEMP` and grep for it before reporting |

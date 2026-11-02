---
name: widget-generation
description: >-
  Build or change a widget in this project (usually from a reference image) and prove it works.
  Use whenever the user asks to create, recreate, restyle, or extend a widget. Covers where the
  widget lives, the design and interaction rules (approved aspect ratios 1:1, 16:9, 4:3, 9:16; no
  sheets/dialogs/modals; inline morphing; Lucide icons only), motion with easings.net curves from
  src/lib/motion.ts, lessons from past mistakes, a static rule checker, a frame-by-frame motion
  audit in headless Chrome, and the mandatory break-the-UI pass.
---

# Widget Generation

A widget is only done when it matches the reference, follows every rule below, passes
`check-widget.mjs` and `motion-audit.mjs`, **and** has survived a deliberate attempt to break it.

**Resources in this skill**

| File | What it is |
|---|---|
| `references/lessons.md` | Every mistake made on past widgets, its cause, and the rule that prevents it. **Read first.** |
| `references/easing.md` | The easings.net catalogue, which curve/duration for which job, and the morphing contract |
| `scripts/check-widget.mjs` | Static rule checker (easings, springs, morph borders/wrappers, icons, text size, overlays, leftovers) |
| `scripts/motion-audit.mjs` | Real headless-Chrome audit: morph overshoot/settle/reflow/see-through/sibling shift, carousel snapping |
| `src/lib/motion.ts` | `EASINGS`, `EASE`, `GSAP_EASE`, `DURATION`, `SPRING`, `cssEase()` — the only source of curves |

## 1. Workflow

1. **Read `references/lessons.md`.**
2. **Read the reference.** List every visible element (text, numbers, icons, shapes, colors,
   shadows, corner cuts). Keep text exactly as shown unless it is clearly a typo — fix those and say so.
3. **Check content against reality.** Compare every date with today; if a deadline/event has
   passed, ask the user. If the user asks to swap an asset without supplying one, look in
   `public/` for an unused fit, use it, and name the file.
4. **Plan extra features.** For each element, decide whether a rule in §5 applies
   (date → calendar, temperature → unit toggle, number → NumberMorph, action button → morph
   panel, image → inline zoom). Add only features with a clear purpose.
5. **Build** in its own folder: `src/components/widgets/<widget-name>/<WidgetName>Widget.tsx`.
6. **Register** it in `src/App.tsx` (import it, add an entry to the `widgets` array).
7. **Validate** (§9), **break it** (§10), fix, re-run both until clean.
8. **Report**: what matches the reference, the extras, deliberate differences and why, and
   exactly what was and wasn't verified (and how).

## 2. Core Philosophy

* Every widget feels like a polished, native, self-contained experience.
* Clarity, minimalism, usability, consistency. Apple-like: reveal complexity only when needed.
* No decoration without purpose. Fill empty space with real data, not ornaments.

## 3. Layout & Aspect Ratio

* **No sheets, bottom sheets, dialogs, modals, popovers, or toasts.** Everything — including
  feedback like "copied" — stays inside the widget's own boundaries.
* Nothing outside the widget: no external headings, descriptions, instructions, or helper text.
* Don't render titles, labels, or metadata the interface already makes obvious.
* Prevent clipping, overlapping, horizontal overflow, and broken layouts.
* **Approved aspect ratios only:** 1:1, 16:9, 4:3, 9:16, with fixed pixel sizes that hit the ratio
  exactly (380×380, 480×270, 400×300, 270×480). Expanded states stay inside the same box; if more
  room is needed, animate between approved ratios and collapse back afterwards.
* Non-rectangular silhouettes (notches, tabs, cut corners) are an SVG `path` behind the content
  (fill/gradient via a uniquely-id'd `clipPath`, 1px stroke edge) with `filter: drop-shadow` on
  the wrapper so the shadow follows the shape.
* Surfaces inside an `overflow-hidden` container use `ring-inset`; an outer `ring-1` gets clipped
  and flattens the corners.

### Text alignment

* Never leave standalone text floating in the vertical centre with empty space above and below.
* Anchor text under its heading (`mt-*`) and push actions down with `mt-auto`; don't spread a
  column with `justify-between`/`my-auto`.
* Related headings, descriptions, and primary actions stay in tight proximity.

## 4. Morphing & Inline Expansion

* Dynamic Island model: compact state shows essentials; secondary content appears on interaction.
  Never expand without a reason, and never hide content the user still needs.
* **When a button offers more options, actions, or a form, it morphs inline** using
  `MorphContainer` from `@/components/custom`. It must meet the **morphing contract in
  `references/easing.md` §4**, in short:
  * Resting slot keeps the trigger's size (siblings never move); morph layer floats at `z-30`–`z-50`
    and grows from an anchor corner that keeps it inside the widget.
  * Geometry uses `SPRING.morph`; overshoot ≤ 2%; settles ≤ 600ms open / 500ms close.
  * **Expanded content sits in a wrapper fixed to the expanded size, pinned to the anchor corner,
    marked `data-morph-content`** — it is revealed, never re-laid out per frame.
  * Panel background is on the container (always, or faded with `EASE.fade`) — never see-through
    mid-morph. **No `border` on the container**: use a 1px ring as the first `box-shadow` layer
    with the same layer count open and closed.
  * Views inside one panel (form → sending → success → back) crossfade with
    `AnimatePresence mode="wait"` (opacity + small y + blur, `DURATION.view`).
  * Outside click and Escape close it — except while a request is in flight.
  * Measure every panel against its longest real content (`scrollHeight` ≤ panel height for
    every item), not just the first.
* **Inline detail expansion:** an element that needs to show more grows in place and animates back
  to its original size and position.

## 5. Interaction Rules

* Every visible control does its real job. No fake buttons or placeholders.
* Click, touch, and keyboard all work. Show pressed, selected, completed, disabled, loading,
  success, and error states.
* Preserve input and state across navigation, expansion, and resizing.
* **Image zoom:** tapping an image zooms it smoothly inside the widget — never a viewer.
* **Number inputs** accept only valid numeric characters (decimal/negative only when allowed).
* **Text/email inputs** validate on submit, show an inline `role="alert"` message and error border,
  and clear the error on edit.
* **Temperature:** tapping converts °C ↔ °F accurately and does nothing else.
* **Dates & days:** hidden horizontal swipe between days; tapping the date opens an inline month
  calendar; tapping the day opens an inline week calendar. A single fixed date (e.g. a deadline)
  opens an inline month calendar with the date highlighted, swipe/arrows between months, and a
  status computed from today ("Closes in N days" / "Closed N days ago").
* **List + detail:** highlight the active item; swipe in the detail panel to move between items.
* **Carousels (Embla):** no dots or arrows unless requested. Required:
  * Off-screen slides are `inert`; the viewport's `onScroll` resets `scrollLeft = 0`.
  * The stalled-snap recovery effect from `lessons.md` › Carousels (`internalEngine()` →
    `animation.stop()` → `useDuration(0)` → `update/render`) on `pointerUp`/`select` (+900ms),
    `visibilitychange`, and `focus`; never while the pointer is down.
  * Gap between slides, and no hard cut at the edge: the viewport bleeds to the widget edge
    (`-mx-*`), fades with a horizontal `mask-image`, slides `align: "center"`.
* **Empty states** always show a Lucide icon, a short message, and an optional action.

## 6. Iconography & Visual Design

* Icons come **only** from `lucide-react` — no custom SVG icons, emoji, or glyphs like `✕`/`✓`.
  If a brand logo isn't in Lucide, use the closest Lucide icon on a brand-coloured tile and say so.
* Consistent icon size and stroke; accessible names on icon-only buttons.
* Never rely on colour alone for critical states.
* Follow the design system: Geist, the project's palette, spacing, radii.
* **Premium checklist:** layered surfaces (tinted widget, white inner card, hairline ring, soft
  shadow only where it isn't clipped); one strong accent; real data filling space; consistent
  radii; no flat grey boxes with empty middles.
* **Typography:** one scale — 16/18 titles, 14 values, 12 body, 11 labels (nothing under 11px).
  Hierarchy through size, weight, and opacity — **never `tracking-*`**. Baseline-align mixed sizes
  (`items-baseline`); bold only the number, not its unit; keep `%`/`+` attached to the number.
* After a theme change (dark ↔ light), re-check every accent and muted colour for contrast.
* Custom subtle scrollbars:
  `[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full`
  (`bg-white/10` on dark widgets).

## 7. Animation & Motion

* **Curves come only from easings.net, via `src/lib/motion.ts`.** Never invent a
  `cubic-bezier`, never use library defaults (`"easeOut"`, CSS `ease`, Tailwind `ease-out`,
  `ease-linear` for UI motion), never Elastic or Bounce. Back only at `back.out(1.70158)` for one
  small pop, never on size/layout. Full guidance: `references/easing.md`.
* Roles: enter/expand → ease-out (`EASE.enter`, `EASE.expand`); exit/collapse → ease-in
  (`EASE.exit`, ~25% shorter); on-screen moves → ease-in-out (`EASE.move`); press → `EASE.press`.
* Springs only within `SPRING_LIMITS` (stiffness 240–360, damping 22–32); prefer `SPRING.*`.
* GSAP (`useGSAP`) for entrance and press feedback (`GSAP_EASE.*`); `motion/react` for layout,
  presence, and drag.
* Animate transform and opacity; animate only to communicate state or give feedback.
* **Never rotate or spin anything in response to a click** (including click-triggered spinners —
  use a progress fill or text state).
* **Numbers** change through `NumberMorph` (`@/components/custom`): only changed digits move.
* **Button groups:** only the pressed button animates.
* **Resizing** is always animated.
* **Reduced motion:** `useReducedMotion()` → skip GSAP entrances, `duration: 0` on morph springs,
  no slide/blur — content still swaps correctly.

## 8. Technical Quality

* Lightweight; no new dependencies unless unavoidable. Recharts for standard charts, D3 for custom.
* Clean up timers, listeners, and animations (`useEffect` cleanup, `useGSAP` scope).
* Handle empty, loading, error, and long-content states with semantic HTML.
* Unique SVG `id`s per widget.
* Mark any temporary debug/test edit with `DEBUG-TEMP` and remove it before reporting.

## 9. Validation Checks

Run all of these before reporting. Fix failures and re-run.

### 9.1 Static
```bash
npx tsc -p tsconfig.app.json --noEmit --ignoreDeprecations 6.0
```
```bash
npx eslint src/components/widgets/<widget-name>
```
```bash
node .agents/skills/widget-generation/scripts/check-widget.mjs src/components/widgets/<widget-name>
```
`check-widget` must report **0 errors**; read every warning and either fix it or state why it
stays. (The tsconfig `baseUrl` warning and errors in other widgets aren't yours to fix — say so.)

### 9.2 Motion audit (real frames)
With the dev server running (`widgets` entry in `.claude/launch.json`):
```bash
node .agents/skills/widget-generation/scripts/motion-audit.mjs --widget "<text in the widget>" --morph "<trigger label>" --carousel --reduced
```
Pass one `--morph` per morph trigger (visible text or aria-label); add `--carousel` if the widget
has one. Every check must PASS. It reports per morph: animates, overshoot ≤ 2%, settle time,
content reflow (needs `data-morph-content`), surface opacity mid-morph, sibling shift; and for
carousels: tiny/half/full/fast/rapid swipes, recovery from frames frozen mid-snap, Tab focus.

### 9.3 Rule checklist
* [ ] No overlays (dialogs, sheets, popovers, toasts); nothing renders outside the widget.
* [ ] Exact approved aspect ratio, including every expanded state.
* [ ] Lucide icons only; no emoji or glyph icons.
* [ ] Type scale respected, no `tracking-*`, no text under 11px, nothing floating in the centre.
* [ ] Curves from `@/lib/motion` only; springs within limits; no spin on click.
* [ ] Every morph meets the contract (audit passes); every panel fits its longest content.
* [ ] Numbers use `NumberMorph`; option buttons use `MorphContainer`.
* [ ] Every control works, has an accessible name and a visible focus ring.
* [ ] Reduced motion handled; dates computed from today.
* [ ] Folder-isolated and registered in `src/App.tsx`; no `DEBUG-TEMP` left.
* [ ] No console errors.

### 9.4 Visual match
Open the page in the browser pane at ≥ 1400×1000 (or 800×600 for a 1:1 capture of one widget)
and compare with the reference: layout, spacing, type, colours, radii, shadows.
**First check the pane is actually animating** — count `requestAnimationFrame` calls over 500ms.
If it's ~0 (pane hidden), screenshots go stale and transitions never finish: use the motion audit
for anything animated, and use temporary `DEBUG-TEMP` edits (e.g. a different starting tab) to
screenshot static states. Drive interactions with real input, not `element.click()`.

## 10. Break the UI (mandatory)

Try to make it fail, look after each attempt, and fix what breaks. List what you tried and what
happened in the report.

### 10.1 State tour — screenshot each

| State | What to check |
|---|---|
| Default / first load | Matches reference; entrance is subtle |
| Hover & keyboard focus | Visible focus rings; logical Tab order |
| Pressed | Only the pressed element reacts |
| Each morph / expanded panel | Contract met; fits; closes via X, Escape, outside click |
| Loading / sending | Controls disabled, no double submit, can't dismiss mid-request |
| Success | Clear confirmation; trigger reflects it; undo/reset works |
| Error | Inline message + styling; clears on edit |
| Empty | Icon + message |
| Disabled | Visibly disabled, not clickable |
| After reset / reopen | Input preserved or intentionally cleared |
| Every tab / carousel item | Each one, not just the first |

### 10.2 Stress tests
* **Rapid input:** hammer toggles, morph triggers, and submit; open/close mid-animation; Escape mid-transition.
* **Bad input:** empty, whitespace, invalid email, letters in number fields, emoji, long unbroken strings.
* **Content extremes:** temporarily long titles/descriptions, huge/negative/zero numbers, missing
  optional data — no overflow — then restore.
* **Dates:** today, tomorrow, past, month boundaries, 6-row months.
* **Numbers:** cycle every value; digits never overlap, blur, or push neighbours.
* **Carousel:** tiny, half, fast, and rapid swipes; Tab through; resize mid-snap; frozen frames
  (all in `motion-audit --carousel`).
* **Viewport:** 375×812 (mobile/touch emulation), 768×1024, desktop.
* **Keyboard only:** every flow with Tab, Enter, Space, Escape.
* **Reduced motion:** `--reduced` in the audit, plus a manual pass.
* **Console:** no errors after the whole tour.

Restore temporary content, remove `DEBUG-TEMP`, and reset the browser viewport to desktop.

## 11. Priority When Rules Conflict

1. Functional correctness and accessibility.
2. Content clarity and usability.
3. Approved aspect ratios and layout constraints.
4. Design-system consistency.
5. Minimalism and visual polish.
6. Decorative effects and optional animations.

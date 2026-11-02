# Easing & Motion Reference

All curves come from **[easings.net](https://easings.net/)**. Never hand-tune a new
`cubic-bezier`, and never use a library's generic default (`"easeOut"`, CSS `ease`,
`ease-linear` for UI motion). Import from `src/lib/motion.ts`:

```ts
import { EASE, EASINGS, GSAP_EASE, DURATION, SPRING, cssEase } from "@/lib/motion"
```

## 1. The easings.net catalogue

| Family | ease-in | ease-out | ease-in-out |
|---|---|---|---|
| Sine | `0.12, 0, 0.39, 0` | `0.61, 1, 0.88, 1` | `0.37, 0, 0.63, 1` |
| Quad | `0.11, 0, 0.5, 0` | `0.5, 1, 0.89, 1` | `0.45, 0, 0.55, 1` |
| Cubic | `0.32, 0, 0.67, 0` | `0.33, 1, 0.68, 1` | `0.65, 0, 0.35, 1` |
| Quart | `0.5, 0, 0.75, 0` | `0.25, 1, 0.5, 1` | `0.76, 0, 0.24, 1` |
| Quint | `0.64, 0, 0.78, 0` | `0.22, 1, 0.36, 1` | `0.83, 0, 0.17, 1` |
| Expo | `0.7, 0, 0.84, 0` | `0.16, 1, 0.3, 1` | `0.87, 0, 0.13, 1` |
| Circ | `0.55, 0, 1, 0.45` | `0, 0.55, 0.45, 1` | `0.85, 0, 0.15, 1` |
| Back | `0.36, 0, 0.66, -0.56` | `0.34, 1.56, 0.64, 1` | `0.68, -0.6, 0.32, 1.6` |
| Elastic | — banned | — banned | — banned |
| Bounce | — banned | — banned | — banned |

GSAP names for the same curves: Quad = `power1`, Cubic = `power2`, Quart = `power3`,
Quint = `power4`, plus `sine`, `expo`, `circ`, `back` (Back only at the default
`back.out(1.70158)` — larger values overshoot more than easings.net's easeOutBack).

## 2. Which curve for which job

| Role (`EASE.*`) | Curve | Duration (`DURATION.*`) | Used for |
|---|---|---|---|
| `press` | easeOutQuad | 100–150ms | Tap feedback (scale 0.96 → 1) |
| `fade` | easeOutCubic | 150–200ms | Opacity, color, background, ring/shadow fades |
| `enter` | easeOutQuart | 400–550ms | First-load entrance of the whole widget |
| `expand` | easeOutQuint (or `SPRING.morph`) | 280–380ms | Panel/button morphs, inline detail expansion, calendar open |
| `exit` | easeInCubic | 180–240ms | Leaving content, collapse fades (exits are ~25% shorter than enters) |
| `move` | easeInOutCubic | 300–400ms | Things travelling on screen A→B: carousel snaps, tab indicator, slide between months |
| `emphasis` | easeOutBack | 200–300ms | One small "pop" (success check, badge). Never on layout/size |

Rules of thumb (easings.net's drawer analogy):

* **Appearing / growing → ease-out.** Fast start, gentle landing; it responds instantly to the tap.
* **Disappearing / shrinking → ease-in**, and shorter. It gets out of the way.
* **Moving while staying visible → ease-in-out.**
* **Never ease-in on an enter** (feels laggy) and **never linear** for UI motion (only for
  progress bars tied to real time, or continuous loaders that are not click-triggered).
* **No Elastic or Bounce anywhere.** Back only for tiny one-shot emphasis, never on a morph,
  resize, or anything with text inside.
* Springs replace curves for size/position morphs. Keep them inside `SPRING_LIMITS`
  (stiffness 240–360, damping 22–32) so there's no visible bounce; prefer `SPRING.morph`.

## 3. How to write it per library

```tsx
// motion/react
<motion.div transition={{ duration: DURATION.fade, ease: EASE.fade }} />
<motion.div transition={SPRING.morph} />

// GSAP
gsap.fromTo(el, { scale: 0.96 }, { scale: 1, duration: DURATION.press, ease: GSAP_EASE.easeOutQuad })

// Tailwind / CSS (arbitrary value — copy the exact numbers)
className="transition-[background-color,box-shadow] duration-200 ease-[cubic-bezier(0.33,1,0.68,1)]"
style={{ transitionTimingFunction: cssEase("easeOutCubic") }}
```

## 4. Morphing animation contract

A morph (compact trigger ↔ expanded panel via `MorphContainer`) passes only if **all** hold:

1. **Geometry** springs with `SPRING.morph` (or easeOutQuint 280–380ms open, easeInCubic
   200–260ms close). Width, height and border-radius move together from one anchor corner.
2. **Overshoot ≤ 2%** of the final width/height. No visible bounce.
3. **Settles** within 600ms of the click.
4. **Content never reflows mid-morph**: the expanded content sits in a wrapper fixed to the
   expanded size and pinned to the anchor corner, so its box size is constant for every frame.
5. **Surface never goes see-through**: the panel background is on the container (always, or
   faded with `EASE.fade`) — never popping on at the end.
6. **No layout jump**: no `border` toggled on the morphing container (use a ring as the first
   `box-shadow` layer, with the same layer count in open and closed states).
7. **Crossfade order**: trigger fades out fast (~140ms), content fades in with opacity + slight
   blur/y (~200ms). Views inside one panel swap with `AnimatePresence mode="wait"`.
8. **Siblings don't move**: the resting slot keeps the trigger's size.
9. **Reduced motion**: duration 0 (or a pure ≤150ms fade), no blur/y.

`scripts/motion-audit.mjs` measures 2–4 and 8 frame by frame in a real headless Chrome.

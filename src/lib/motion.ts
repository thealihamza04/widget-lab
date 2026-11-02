/**
 * Motion tokens for widgets.
 *
 * Every curve here is copied verbatim from easings.net (https://easings.net/,
 * source: github.com/ai/easings.net/src/easings.yml). Do not invent new curves —
 * pick one from this file. Elastic and Bounce are intentionally absent: they have
 * no cubic-bezier form and are banned in widgets.
 *
 * See .agents/skills/widget-generation/references/easing.md for when to use which.
 */

export type CubicBezier = readonly [number, number, number, number]

export const EASINGS = {
  easeInSine: [0.12, 0, 0.39, 0],
  easeOutSine: [0.61, 1, 0.88, 1],
  easeInOutSine: [0.37, 0, 0.63, 1],
  easeInQuad: [0.11, 0, 0.5, 0],
  easeOutQuad: [0.5, 1, 0.89, 1],
  easeInOutQuad: [0.45, 0, 0.55, 1],
  easeInCubic: [0.32, 0, 0.67, 0],
  easeOutCubic: [0.33, 1, 0.68, 1],
  easeInOutCubic: [0.65, 0, 0.35, 1],
  easeInQuart: [0.5, 0, 0.75, 0],
  easeOutQuart: [0.25, 1, 0.5, 1],
  easeInOutQuart: [0.76, 0, 0.24, 1],
  easeInQuint: [0.64, 0, 0.78, 0],
  easeOutQuint: [0.22, 1, 0.36, 1],
  easeInOutQuint: [0.83, 0, 0.17, 1],
  easeInExpo: [0.7, 0, 0.84, 0],
  easeOutExpo: [0.16, 1, 0.3, 1],
  easeInOutExpo: [0.87, 0, 0.13, 1],
  easeInCirc: [0.55, 0, 1, 0.45],
  easeOutCirc: [0, 0.55, 0.45, 1],
  easeInOutCirc: [0.85, 0, 0.15, 1],
  easeInBack: [0.36, 0, 0.66, -0.56],
  easeOutBack: [0.34, 1.56, 0.64, 1],
  easeInOutBack: [0.68, -0.6, 0.32, 1.6],
} as const satisfies Record<string, CubicBezier>

export type EasingName = keyof typeof EASINGS

/** The same easings.net curves under GSAP's names (power1 = Quad … power4 = Quint). */
export const GSAP_EASE = {
  easeInSine: "sine.in",
  easeOutSine: "sine.out",
  easeInOutSine: "sine.inOut",
  easeInQuad: "power1.in",
  easeOutQuad: "power1.out",
  easeInOutQuad: "power1.inOut",
  easeInCubic: "power2.in",
  easeOutCubic: "power2.out",
  easeInOutCubic: "power2.inOut",
  easeInQuart: "power3.in",
  easeOutQuart: "power3.out",
  easeInOutQuart: "power3.inOut",
  easeInQuint: "power4.in",
  easeOutQuint: "power4.out",
  easeInOutQuint: "power4.inOut",
  easeInExpo: "expo.in",
  easeOutExpo: "expo.out",
  easeInOutExpo: "expo.inOut",
  easeInCirc: "circ.in",
  easeOutCirc: "circ.out",
  easeInOutCirc: "circ.inOut",
  easeInBack: "back.in(1.70158)",
  easeOutBack: "back.out(1.70158)",
  easeInOutBack: "back.inOut(1.70158)",
} as const satisfies Record<EasingName, string>

/** `cubic-bezier(...)` string for CSS / Tailwind arbitrary values. */
export const cssEase = (name: EasingName) => `cubic-bezier(${EASINGS[name].join(", ")})`

/**
 * Roles → curve. Use these instead of picking per call so a widget stays consistent.
 * enter/expand decelerate (ease-out), exit/collapse accelerate (ease-in),
 * on-screen moves A→B use ease-in-out.
 */
export const EASE = {
  press: EASINGS.easeOutQuad,
  fade: EASINGS.easeOutCubic,
  enter: EASINGS.easeOutQuart,
  expand: EASINGS.easeOutQuint,
  exit: EASINGS.easeInCubic,
  move: EASINGS.easeInOutCubic,
  emphasis: EASINGS.easeOutBack,
} as const

/** Durations in seconds (motion/GSAP). Multiply by 1000 for CSS/Tailwind. */
export const DURATION = {
  press: 0.12,
  micro: 0.16,
  fade: 0.2,
  view: 0.22,
  expand: 0.32,
  collapse: 0.24,
  move: 0.36,
  enter: 0.5,
} as const

/** Springs for size/position morphs (MorphContainer etc.). Critically damped-ish: no visible bounce. */
export const SPRING = {
  morph: { type: "spring", stiffness: 280, damping: 26, mass: 0.6 },
  indicator: { type: "spring", stiffness: 300, damping: 28 },
  digit: { type: "spring", stiffness: 280, damping: 24, mass: 0.5 },
} as const

/** Allowed spring envelope; the widget checker enforces it. */
export const SPRING_LIMITS = {
  stiffness: [240, 360],
  damping: [22, 32],
} as const

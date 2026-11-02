#!/usr/bin/env node
// Static rule checker for one widget.
//   node .agents/skills/widget-generation/scripts/check-widget.mjs src/components/widgets/<name>
// Exits 1 when any error is found. Warnings need a look but don't fail.

import fs from "node:fs"
import path from "node:path"

const target = process.argv[2]
if (!target) {
  console.error("usage: check-widget.mjs <widget file or folder>")
  process.exit(2)
}

// easings.net catalogue (keep in sync with src/lib/motion.ts)
const EASINGS = {
  easeInSine: [0.12, 0, 0.39, 0], easeOutSine: [0.61, 1, 0.88, 1], easeInOutSine: [0.37, 0, 0.63, 1],
  easeInQuad: [0.11, 0, 0.5, 0], easeOutQuad: [0.5, 1, 0.89, 1], easeInOutQuad: [0.45, 0, 0.55, 1],
  easeInCubic: [0.32, 0, 0.67, 0], easeOutCubic: [0.33, 1, 0.68, 1], easeInOutCubic: [0.65, 0, 0.35, 1],
  easeInQuart: [0.5, 0, 0.75, 0], easeOutQuart: [0.25, 1, 0.5, 1], easeInOutQuart: [0.76, 0, 0.24, 1],
  easeInQuint: [0.64, 0, 0.78, 0], easeOutQuint: [0.22, 1, 0.36, 1], easeInOutQuint: [0.83, 0, 0.17, 1],
  easeInExpo: [0.7, 0, 0.84, 0], easeOutExpo: [0.16, 1, 0.3, 1], easeInOutExpo: [0.87, 0, 0.13, 1],
  easeInCirc: [0.55, 0, 1, 0.45], easeOutCirc: [0, 0.55, 0.45, 1], easeInOutCirc: [0.85, 0, 0.15, 1],
  easeInBack: [0.36, 0, 0.66, -0.56], easeOutBack: [0.34, 1.56, 0.64, 1], easeInOutBack: [0.68, -0.6, 0.32, 1.6],
}
const BEZIERS = Object.values(EASINGS).map((v) => v.join(","))
const GSAP_OK = /^(none|(sine|power[1-4]|expo|circ)\.(in|out|inOut)|back\.(in|out|inOut)(\(1\.70158\))?)$/
const SPRING = { stiffness: [240, 360], damping: [22, 32] }
const ALLOWED_RATIOS = [1, 16 / 9, 4 / 3, 9 / 16]

const files = fs.statSync(target).isDirectory()
  ? fs.readdirSync(target, { recursive: true }).filter((f) => /\.(tsx|ts)$/.test(f)).map((f) => path.join(target, f))
  : [target]

const findings = []
const add = (sev, file, idx, src, rule, msg) => {
  const line = src.slice(0, idx).split("\n").length
  findings.push({ sev, where: `${file}:${line}`, rule, msg })
}
const each = (re, src, fn) => { for (const m of src.matchAll(re)) fn(m) }
const sameBezier = (nums) => BEZIERS.includes(nums.map((n) => +n).join(","))

for (const file of files) {
  const src = fs.readFileSync(file, "utf8")
  const usesMotion = /from "motion\/react"|from "gsap"|@gsap\/react/.test(src)

  // ── Layout ────────────────────────────────────────────────────────────
  each(/from "@\/components\/ui\/(dialog|sheet|drawer|alert-dialog|popover)"|<(Dialog|Sheet|Drawer|Modal|AlertDialog)\b/g, src, (m) =>
    add("error", file, m.index, src, "no-overlays", `${m[0]} — widgets never use dialogs/sheets/drawers/popovers`))
  each(/\btoast(\.\w+)?\(/g, src, (m) =>
    add("warn", file, m.index, src, "no-overlays", "toast() renders outside the widget; show feedback inline"))
  each(/aspect-\[(\d+)\/(\d+)\]/g, src, (m) => {
    const r = +m[1] / +m[2]
    if (!ALLOWED_RATIOS.some((a) => Math.abs(a - r) < 0.01))
      add("error", file, m.index, src, "aspect-ratio", `${m[0]} is not 1:1, 16:9, 4:3 or 9:16`)
  })
  each(/(?<![\w:-])w-\[(\d+)px\][^"`]*?(?<![\w:-])h-\[(\d+)px\]/g, src, (m) => {
    const r = +m[1] / +m[2]
    if (+m[1] >= 240 && +m[2] >= 240 && !ALLOWED_RATIOS.some((a) => Math.abs(a - r) < 0.01))
      add("warn", file, m.index, src, "aspect-ratio", `${m[1]}×${m[2]} — if this is the widget root it must be an approved ratio`)
  })

  // ── Typography ────────────────────────────────────────────────────────
  each(/\btracking-[\w[\].-]+/g, src, (m) =>
    add("error", file, m.index, src, "no-tracking", `${m[0]} — build hierarchy with size/weight/opacity`))
  each(/text-\[(\d+(?:\.\d+)?)px\]/g, src, (m) => {
    if (+m[1] < 11) add("warn", file, m.index, src, "min-text", `${m[0]} — keep text ≥ 11px`)
  })
  each(/<p[^>]*\bmy-auto\b|className="[^"]*\bmy-auto\b[^"]*(text-|leading-)/g, src, (m) =>
    add("warn", file, m.index, src, "no-dead-center", "text with my-auto floats in the middle; anchor it under its heading"))

  // ── Icons ─────────────────────────────────────────────────────────────
  each(/[✕✖✗✘✓✔×➜➔→←↑↓★☆♥❤⚡]|\p{Extended_Pictographic}/gu, src, (m) => {
    const lineText = src.slice(src.lastIndexOf("\n", m.index) + 1, src.indexOf("\n", m.index))
    if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(lineText)) return
    // "×" between numbers is a dimension sign (4032 × 3024), not an icon
    if (m[0] === "×" && /\d\s*$/.test(src.slice(Math.max(0, m.index - 6), m.index)) && /^\s*\d/.test(src.slice(m.index + 1, m.index + 6))) return
    // trailing // comment before the match on the same line
    const lineStart = src.lastIndexOf("\n", m.index) + 1
    const before = src.slice(lineStart, m.index)
    if (/(^|[^:"'`])\/\//.test(before)) return
    add("error", file, m.index, src, "lucide-only", `"${m[0]}" used as an icon — use a lucide-react icon`)
  })

  // ── Easing ────────────────────────────────────────────────────────────
  each(/\bease:\s*"([^"]+)"/g, src, (m) => {
    const v = m[1]
    if (/elastic|bounce/i.test(v)) add("error", file, m.index, src, "easing", `${v} — Elastic/Bounce are banned`)
    else if (/^(power|sine|expo|circ|back|none)/.test(v)) {
      if (!GSAP_OK.test(v)) add("error", file, m.index, src, "easing", `${v} — use GSAP_EASE from @/lib/motion (back only at 1.70158)`)
    } else add("error", file, m.index, src, "easing", `"${v}" is a library default, not an easings.net curve — use EASE/EASINGS from @/lib/motion`)
  })
  each(/\bease:\s*\[([^\]]+)\]/g, src, (m) => {
    const nums = m[1].split(",").map((s) => s.trim())
    if (nums.length === 4 && !sameBezier(nums))
      add("error", file, m.index, src, "easing", `[${m[1]}] is not an easings.net curve`)
  })
  each(/cubic-bezier\(([^)]+)\)/g, src, (m) => {
    const nums = m[1].split(",").map((s) => s.trim())
    if (nums.length === 4 && nums.every((n) => !isNaN(+n)) && !sameBezier(nums))
      add("error", file, m.index, src, "easing", `cubic-bezier(${m[1]}) is not an easings.net curve`)
  })
  each(/\bease-(linear|in|out|in-out)\b(?!-)/g, src, (m) =>
    add("warn", file, m.index, src, "easing", `${m[0]} is Tailwind's default curve — use ease-[cubic-bezier(…)] from easings.net`))

  // ── Springs ───────────────────────────────────────────────────────────
  each(/stiffness:\s*(\d+)/g, src, (m) => {
    if (+m[1] < SPRING.stiffness[0] || +m[1] > SPRING.stiffness[1])
      add("error", file, m.index, src, "spring", `stiffness ${m[1]} outside ${SPRING.stiffness.join("–")}`)
  })
  each(/damping:\s*(\d+)/g, src, (m) => {
    if (+m[1] < SPRING.damping[0] || +m[1] > SPRING.damping[1])
      add("error", file, m.index, src, "spring", `damping ${m[1]} outside ${SPRING.damping.join("–")} (bouncy or sluggish)`)
  })

  // ── Rotation / spin ───────────────────────────────────────────────────
  each(/\banimate-spin\b|\brotat(e|ion)\s*:/g, src, (m) =>
    add("warn", file, m.index, src, "no-spin", `${m[0]} — never rotate/spin in response to a click`))

  // ── Morphing ──────────────────────────────────────────────────────────
  each(/<MorphContainer\b[\s\S]*?\n(\s*)>|<MorphContainer\b[\s\S]*?\/>/g, src, (m) => {
    const tag = m[0]
    // only the container's own props — not classes inside the trigger={...} JSX
    const attrIndent = (tag.match(/\n(\s+)\w/) ?? [, ""])[1]
    each(/(className|openClassName|closedClassName)=(\{[^}]*\}|"[^"]*")/g, tag, (c) => {
      const lineStart = tag.lastIndexOf("\n", c.index) + 1
      if (tag.slice(lineStart, c.index) !== attrIndent) return
      // only border *width* classes add a box edge; colour-only classes don't
      const tokens = c[2].match(/[^\s"'{}()`,]+/g) ?? []
      if (tokens.some((t) => /^(\w+:)?border(-[0-9]+|-x|-y)?$/.test(t)))
        add("error", file, m.index, src, "morph-border", `${c[1]} has a border on the morphing container — use a box-shadow ring`)
    })
    // children of this MorphContainer up to its closing tag
    const close = src.indexOf("</MorphContainer>", m.index)
    const body = close > 0 ? src.slice(m.index + tag.length, close) : ""
    if (body && !/data-morph-content/.test(body))
      add("error", file, m.index, src, "morph-reflow", "expanded content needs a fixed-size wrapper with data-morph-content (see easing.md §4)")
    if (body && /\?\s*\(\s*\n?\s*<(?!AnimatePresence)/.test(body) && !/AnimatePresence/.test(body))
      add("warn", file, m.index, src, "morph-views", "conditional views inside a panel should crossfade via AnimatePresence mode=\"wait\"")
  })

  // ── Carousel ──────────────────────────────────────────────────────────
  if (/useEmblaCarousel/.test(src)) {
    const at = src.indexOf("useEmblaCarousel")
    if (!/\binert=/.test(src)) add("error", file, at, src, "carousel", "off-screen slides must be inert (focus scrolls the viewport)")
    if (!/internalEngine\(\)/.test(src)) add("error", file, at, src, "carousel", "add the stalled-snap recovery effect (lessons.md › Carousels)")
    if (!/mask-?[Ii]mage/.test(src)) add("warn", file, at, src, "carousel", "slides are hard-clipped at the edge — bleed the viewport and fade it with mask-image")
  }

  // ── Motion hygiene ────────────────────────────────────────────────────
  if (usesMotion && !/useReducedMotion|prefers-reduced-motion|gsap\.matchMedia|reducedMotion="user"/.test(src))
    add("error", file, 0, src, "reduced-motion", "animations present but reduced motion is never checked")
  each(/DEBUG-TEMP|__embla\b|console\.log\(/g, src, (m) =>
    add("error", file, m.index, src, "leftovers", `${m[0]} left in the widget`))
}

const order = { error: 0, warn: 1 }
findings.sort((a, b) => order[a.sev] - order[b.sev])
for (const f of findings) console.log(`${f.sev === "error" ? "ERROR" : "warn "}  ${f.where}  [${f.rule}] ${f.msg}`)
const errors = findings.filter((f) => f.sev === "error").length
console.log(`\n${errors} error(s), ${findings.length - errors} warning(s) in ${files.length} file(s)`)
process.exit(errors ? 1 : 0)

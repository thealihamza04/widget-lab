#!/usr/bin/env node
// Frame-by-frame motion audit in real headless Chrome (not the possibly-hidden browser pane).
//
//   node .agents/skills/widget-generation/scripts/motion-audit.mjs \
//     --widget "Ali Hamza" --morph "Connect" --morph "Explore" --carousel [--reduced]
//
//   --widget    text that appears inside the widget (scopes every lookup to that widget)
//   --morph     visible text or aria-label of a MorphContainer trigger (repeatable)
//   --carousel  run the Embla carousel checks (swipe snap, frozen-frame recovery, focus scroll)
//   --reduced   also re-run the morphs with prefers-reduced-motion: reduce
//   --url       default http://localhost:5173 (one-widget pages: http://localhost:5173/#/<id>)   --width/--height  default 1400×1000
//   CHROME=/path/to/chrome to override the browser binary (default: google-chrome)
//
// Exits 1 if any check fails. Thresholds come from references/easing.md §4.

import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const args = process.argv.slice(2)
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def }
const all = (name) => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []))
const URL = opt("url", "http://localhost:5173")
const WIDGET = opt("widget")
const MORPHS = all("morph")
const WIDTH = +opt("width", 1400), HEIGHT = +opt("height", 1000)
if (!WIDGET) { console.error("--widget <text inside the widget> is required"); process.exit(2) }

const LIMITS = { overshootPct: 2, openSettleMs: 600, closeSettleMs: 500, reflowPx: 0.5, siblingPx: 0.5, minFps: 20 }

// ── Chrome over CDP ──────────────────────────────────────────────────────
const port = 9300 + Math.floor(Math.random() * 500)
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "motion-audit-"))
const chrome = spawn(process.env.CHROME || "google-chrome",
  ["--headless=new", `--remote-debugging-port=${port}`, `--window-size=${WIDTH},${HEIGHT}`, `--user-data-dir=${profile}`, "about:blank"],
  { stdio: "ignore" })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let targets
for (let i = 0; i < 60 && !targets; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json() } catch { await sleep(250) }
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let seq = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id) } }
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })) })
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })
  if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
  return r?.result?.value
}
const click = async (x, y) => {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y })
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 })
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 })
}
const key = async (k, code, vk) => {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk })
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk })
}

await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false })
await send("Page.navigate", { url: URL })
await sleep(2500)

// Page-side helpers: widget root = the masonry cell's child that contains WIDGET text.
// Re-installed after every reload.
const installHelpers = () => ev(`(() => {
  const W = ${JSON.stringify(WIDGET)}
  window.__root = () => {
    // old all-widgets grid (.break-inside-avoid cells) or the one-widget page (#/<id>)
    const cells = [...document.querySelectorAll('.break-inside-avoid'), ...document.querySelectorAll('main .shrink-0')]
    const cell = cells.find(c => c.textContent.includes(W))
    return cell ? (cell.classList.contains('shrink-0') ? cell : cell.firstElementChild) : null
  }
  window.__trigger = (label) => {
    const root = window.__root()
    return [...root.querySelectorAll('button, [role=button], a')].find(b =>
      !b.closest('[inert]') && (b.textContent.trim() === label || b.getAttribute('aria-label') === label))
  }
  window.__alpha = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return 0; const p = m[1].split(','); return p.length > 3 ? +p[3] : 1 }
  // Records the morph container + content wrapper + siblings every animation frame.
  window.__sample = (container, ms) => new Promise(done => {
    const slot = container.parentElement
    // siblings: tagged once per morph (data-audit-sib) minus anything that moved on its own in the baseline
    const sibs = [...window.__root().querySelectorAll('[data-audit-sib]')]
      .filter(e => !slot.contains(e) && !container.contains(e) && !e.hasAttribute('data-audit-live'))
    const t0 = performance.now(), out = []
    const tick = () => {
      const r = container.getBoundingClientRect(), cs = getComputedStyle(container)
      const content = container.querySelector('[data-morph-content]')
      const cr = content && content.getBoundingClientRect()
      out.push({ t: performance.now() - t0, w: r.width, h: r.height, radius: cs.borderTopLeftRadius,
        bg: window.__alpha(cs.backgroundColor), cw: cr ? cr.width : null, ch: cr ? cr.height : null,
        names: sibs.map(e => (e.textContent || e.tagName).trim().slice(0, 24)), sib: sibs.map(e => { if (!e.isConnected) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10] }) })
      if (performance.now() - t0 < ms) requestAnimationFrame(tick); else done(out)
    }
    requestAnimationFrame(tick)
  })
  return !!window.__root()
})()`)
const load = async () => {
  for (let i = 0; i < 20; i++) { if (await installHelpers()) return; await sleep(500) }
  console.error(`No widget containing "${WIDGET}" at ${URL}`); process.exit(2)
}
await load()

const results = []
const check = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`) }

// Is the page actually animating? (a hidden pane runs ~0fps and makes every number meaningless)
let fps = 0
for (let i = 0; i < 3 && fps < LIMITS.minFps; i++) fps = Math.max(fps, await ev(`new Promise(r => { let f = 0; const t = performance.now(); const g = () => { f++; performance.now() - t < 1000 ? requestAnimationFrame(g) : r(f) }; requestAnimationFrame(g) })`))
check("frame rate", fps >= LIMITS.minFps, `${fps} fps`)

// ── Morph audit ──────────────────────────────────────────────────────────
async function analyze(label, phase, samples, settleLimit) {
  const last = samples[samples.length - 1]
  const first = samples[0]
  const growing = phase !== "close"
  // overshoot past the final size in the direction of travel
  const ow = growing ? Math.max(...samples.map((s) => s.w)) / last.w - 1 : 1 - Math.min(...samples.map((s) => s.w)) / last.w
  const oh = growing ? Math.max(...samples.map((s) => s.h)) / last.h - 1 : 1 - Math.min(...samples.map((s) => s.h)) / last.h
  const over = Math.max(ow, oh) * 100
  // settle = from the first frame that moves to the last frame that isn't at rest
  // (excludes click/React latency before the animation starts)
  const off = (s) => Math.abs(s.w - last.w) > 0.5 || Math.abs(s.h - last.h) > 0.5
  const start = samples.find((s) => Math.abs(s.w - first.w) > 0.5 || Math.abs(s.h - first.h) > 0.5)
  let settle = 0
  if (start) for (const s of samples) if (s.t >= start.t && off(s)) settle = s.t - start.t
  const moved = Math.abs(first.w - last.w) > 1 || Math.abs(first.h - last.h) > 1
  check(`${label} ${phase}: animates`, moved || phase === "reduced", `${first.w.toFixed(0)}×${first.h.toFixed(0)} → ${last.w.toFixed(0)}×${last.h.toFixed(0)}, ${samples.length} frames`)
  check(`${label} ${phase}: overshoot ≤ ${LIMITS.overshootPct}%`, over <= LIMITS.overshootPct, `${over.toFixed(2)}%`)
  check(`${label} ${phase}: settles ≤ ${settleLimit}ms`, settle <= settleLimit, `${settle.toFixed(0)}ms`)
  if (growing) {
    const cs = samples.filter((s) => s.cw != null)
    if (!cs.length) check(`${label} open: fixed-size content wrapper`, false, "no [data-morph-content] inside the expanded panel")
    else {
      const dw = Math.max(...cs.map((s) => s.cw)) - Math.min(...cs.map((s) => s.cw))
      const dh = Math.max(...cs.map((s) => s.ch)) - Math.min(...cs.map((s) => s.ch))
      check(`${label} open: content doesn't reflow`, Math.max(dw, dh) <= LIMITS.reflowPx, `content box varied by ${Math.max(dw, dh).toFixed(1)}px`)
    }
    // background must be present while the panel is mid-growth
    const mid = samples.filter((s) => (s.w - first.w) / (last.w - first.w || 1) > 0.15 && (s.w - first.w) / (last.w - first.w || 1) < 0.7)
    const thin = mid.filter((s) => s.bg < 0.5)
    check(`${label} open: surface not see-through mid-morph`, !mid.length || thin.length <= 1, mid.length ? `bg alpha min ${Math.min(...mid.map((s) => s.bg)).toFixed(2)} over ${mid.length} mid frames` : "no mid frames captured")
  }
  let sib = 0, who = ""
  // elements removed mid-sample (live text swapping) are skipped, not counted as jumping to 0,0
  for (const s of samples) s.sib.forEach((p, i) => { const f = first.sib[i]; if (!p || !f) return; const d = Math.max(Math.abs(p[0] - f[0]), Math.abs(p[1] - f[1])); if (d > sib) { sib = d; who = first.names[i] } })
  check(`${label} ${phase}: siblings stay put`, sib <= LIMITS.siblingPx, `max sibling shift ${sib.toFixed(1)}px${sib > LIMITS.siblingPx ? ` ("${who}")` : ""}`)
}

async function auditMorph(label, tag = "") {
  const box = await ev(`(() => { const b = window.__trigger(${JSON.stringify(label)}); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
  if (!box) { check(`${label}: trigger found`, false, "no visible button with that text/aria-label"); return }
  await sleep(300)
  // tag the morph container before clicking (the trigger unmounts when it opens)
  await ev(`(() => { const c = window.__trigger(${JSON.stringify(label)}).closest('.absolute.overflow-hidden'); c.setAttribute('data-audit', '1'); return true })()`)
  const pos = await ev(`(() => { const r = window.__trigger(${JSON.stringify(label)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
  // baseline: watch without interacting; anything that moves by itself (live data) is excluded
  await ev(`(() => { const c = document.querySelector('[data-audit]'); const slot = c.parentElement
    window.__root().querySelectorAll('[data-audit-sib],[data-audit-live]').forEach(e => { e.removeAttribute('data-audit-sib'); e.removeAttribute('data-audit-live') })
    ;[...window.__root().querySelectorAll('h1,h2,h3,p,span,button')].filter(e => !slot.contains(e) && !e.closest('[data-number-morph]')).slice(0, 60).forEach(e => e.setAttribute('data-audit-sib', ''))
    return true })()`)
  await ev(`(async () => { const els = [...window.__root().querySelectorAll('[data-audit-sib]')]; const at = els.map(e => e.getBoundingClientRect())
    const t0 = performance.now(); while (performance.now() - t0 < 1200) { await new Promise(r => requestAnimationFrame(r))
      els.forEach((e, i) => { const b = e.getBoundingClientRect(); if (!e.isConnected || Math.abs(b.x - at[i].x) > 0.5 || Math.abs(b.y - at[i].y) > 0.5) e.setAttribute('data-audit-live', '') }) }
    return true })()`)
  const sampling = ev(`window.__sample(document.querySelector('[data-audit]'), 1000)`)
  await sleep(30)
  await click(pos.x, pos.y)
  const open = await sampling
  await analyze(label + tag, tag ? "reduced" : "open", open, tag ? 50 : LIMITS.openSettleMs)
  const closing = ev(`window.__sample(document.querySelector('[data-audit]'), 900)`)
  await sleep(30)
  await key("Escape", "Escape", 27)
  const shut = await closing
  if (!tag) await analyze(label, "close", shut, LIMITS.closeSettleMs)
  await ev(`document.querySelector('[data-audit]')?.removeAttribute('data-audit')`)
  await sleep(400)
}

for (const m of MORPHS) await auditMorph(m)
if (args.includes("--reduced")) {
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] })
  await send("Page.reload"); await sleep(1500); await load()
  for (const m of MORPHS) await auditMorph(m, " (reduced motion)")
  await send("Emulation.setEmulatedMedia", { features: [] })
}

// ── Carousel audit ───────────────────────────────────────────────────────
if (args.includes("--carousel")) {
  await send("Page.reload"); await sleep(1500); await load()
  const setup = await ev(`(() => {
    const vp = window.__root().querySelector('[class*="cursor-grab"]')
    if (!vp) return null
    vp.scrollIntoView({ block: 'center' })
    window.__vp = vp
    window.__cards = () => [...vp.firstElementChild.children].map(s => (s.firstElementChild || s).getBoundingClientRect().x)
    const r = vp.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height, rest: window.__cards().find(x => x >= r.x - 1) }
  })()`)
  if (!setup) check("carousel found", false, "no [class*=cursor-grab] viewport in the widget")
  else {
    await sleep(300)
    const v = await ev(`(() => { const r = window.__vp.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })()`)
    const restX = await ev(`(() => { const r = window.__vp.getBoundingClientRect(); return window.__cards().filter(x => x >= r.x - 1).sort((a, b) => a - b)[0] })()`)
    const aligned = async () => ev(`(() => ({ ok: window.__cards().some(x => Math.abs(x - ${restX}) < 1) && window.__vp.scrollLeft === 0, sl: window.__vp.scrollLeft }))()`)
    const drag = async (dx, steps = 8, wait = 16) => {
      const sx = v.x + v.w * 0.6, sy = v.y + 40
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: sx, y: sy, button: "left", clickCount: 1 })
      for (let s = 1; s <= steps; s++) { await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: sx + (dx * s) / steps, y: sy, button: "left" }); await sleep(wait) }
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: sx + dx, y: sy, button: "left", clickCount: 1 })
    }
    for (const [name, dx, steps, wait] of [["tiny drag", -12, 3, 16], ["half drag", -v.w / 2, 6, 16], ["full swipe", -v.w * 0.7, 8, 16], ["fast flick", -120, 3, 5]]) {
      await drag(dx, steps, wait); await sleep(1500)
      const a = await aligned(); check(`carousel ${name}: snaps onto a slide`, a.ok, `scrollLeft ${a.sl}`)
    }
    for (let i = 0; i < 6; i++) { await drag(-v.w * 0.6, 4, 5); await sleep(60) }
    await sleep(1500); { const a = await aligned(); check("carousel rapid swipes: snaps onto a slide", a.ok, `scrollLeft ${a.sl}`) }
    // freeze animation frames mid-snap (what a throttled/hidden page does)
    await ev(`window.__raf = window.requestAnimationFrame; true`)
    await drag(-v.w * 0.5, 6, 16)
    await sleep(40); await ev(`window.requestAnimationFrame = () => 0; true`)
    await sleep(1600); { const a = await aligned(); check("carousel frozen mid-snap: recovers within 1.6s", a.ok, `scrollLeft ${a.sl}`) }
    await ev(`window.requestAnimationFrame = window.__raf; true`)
    // keyboard focus must not scroll the clipped viewport
    await ev(`document.body.focus(); true`)
    for (let i = 0; i < 16; i++) { await key("Tab", "Tab", 9); await sleep(30) }
    await sleep(600); { const a = await aligned(); check("carousel Tab focus: viewport not scrolled", a.ok, `scrollLeft ${a.sl}`) }
  }
}

ws.close()
chrome.kill()
await new Promise((r) => (chrome.exitCode !== null ? r() : chrome.once("exit", r)))
try { fs.rmSync(profile, { recursive: true, force: true }) } catch { /* Chrome may still hold a lock file */ }
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)

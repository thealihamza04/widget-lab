import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import * as d3 from "d3"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { Activity, Check, Coffee, Cpu, Settings, X } from "lucide-react"
import { MorphContainer, NumberMorph } from "@/components/custom"
import { DURATION, EASE, GSAP_EASE, SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

/* ── Simulated metrics (a browser can't read real system stats) ─────────── */

const PROCESSES = [
  { id: "aside", name: "Aside", color: "#f0954a" },
  { id: "studio", name: "Studio", color: "#f4f4f5" },
  { id: "paper", name: "Paper", color: "#8e8e93" },
  { id: "other", name: "Other", color: "#4b4b50" },
] as const
type ProcessId = (typeof PROCESSES)[number]["id"]

type Metrics = {
  cpu: number
  shares: Record<ProcessId, number> // % of total CPU, sums to cpu
  memUsed: number // GB
  gpu: number
  down: number // KB/s
  up: number // KB/s
  disk: number // MB/s
  power: number // W
}

const MEM_TOTAL = 48
const HISTORY = 36
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const walk = (v: number, step: number, lo: number, hi: number) => clamp(v + (Math.random() - 0.5) * step, lo, hi)

const splitShares = (cpu: number, prev?: Record<ProcessId, number>): Record<ProcessId, number> => {
  const base = prev
    ? { aside: walk(prev.aside, 6, 20, 70), studio: walk(prev.studio, 3, 4, 20), paper: walk(prev.paper, 2, 1, 8), other: walk(prev.other, 2, 2, 9) }
    : { aside: 61, studio: 12, paper: 4, other: 5 }
  const sum = base.aside + base.studio + base.paper + base.other
  const k = cpu / sum
  return { aside: base.aside * k, studio: base.studio * k, paper: base.paper * k, other: base.other * k }
}

const INITIAL: Metrics = { cpu: 82, shares: splitShares(82), memUsed: 24, gpu: 14, down: 104, up: 44, disk: 5.8, power: 8.7 }

const nextMetrics = (m: Metrics): Metrics => {
  const cpu = Math.round(walk(m.cpu, 14, 18, 96))
  return {
    cpu,
    shares: splitShares(cpu, m.shares),
    memUsed: Math.round(walk(m.memUsed, 1.2, 12, 44) * 10) / 10,
    gpu: Math.round(walk(m.gpu, 10, 3, 72)),
    down: Math.round(walk(m.down, 60, 8, 980)),
    up: Math.round(walk(m.up, 30, 2, 420)),
    disk: Math.round(walk(m.disk, 3, 0.2, 48) * 10) / 10,
    power: Math.round(walk(m.power, 2, 3.5, 28) * 10) / 10,
  }
}

const seedHistory = () => {
  const out: number[] = []
  let v = 58
  for (let i = 0; i < HISTORY; i++) out.push((v = walk(v + 0.8, 10, 35, 90)))
  out[out.length - 1] = 82
  return out
}

const seedNet = (start: number, lo: number, hi: number, step: number) => {
  const out: number[] = []
  let v = start
  for (let i = 0; i < HISTORY; i++) out.push((v = walk(v, step, lo, hi)))
  return out
}

const cpuStatus = (c: number) => (c >= 70 ? "Working hard" : c >= 40 ? "Busy" : "Cruising")
const memStatus = (used: number) => {
  const p = used / MEM_TOTAL
  return p > 0.8 ? "High memory pressure" : p > 0.6 ? "Moderate memory pressure" : "Low memory pressure"
}

/* ── Geometry (9:16) ─────────────────────────────────────────────────── */

const SM_QUERY = "(min-width: 640px)"
const subscribeSm = (cb: () => void) => {
  const mq = window.matchMedia(SM_QUERY)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
const useWide = () => useSyncExternalStore(subscribeSm, () => window.matchMedia(SM_QUERY).matches, () => true)

const PANEL_OPEN = "shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_24px_48px_-12px_rgba(0,0,0,0.8)]"
const PANEL_REST = "shadow-[0_0_0_1px_rgba(255,255,255,0),0_0_0_rgba(0,0,0,0)]"
const SURFACE = "transition-[background-color,box-shadow] duration-200"

/* ── D3 pieces ───────────────────────────────────────────────────────── */

/** Live sparkline: redraws with the new sample one step to the right, then slides left over one interval. */
function Sparkline({ data, width, height, intervalMs, reduceMotion }: { data: number[]; width: number; height: number; intervalMs: number; reduceMotion: boolean | null }) {
  const lineRef = useRef<SVGPathElement>(null)
  const areaRef = useRef<SVGPathElement>(null)
  const groupRef = useRef<SVGGElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const x = useMemo(() => d3.scaleLinear().domain([0, HISTORY - 2]).range([0, width]), [width])
  const y = useMemo(() => d3.scaleLinear().domain([0, 100]).range([height - 2, 2]), [height])
  const step = x(1) - x(0)

  useEffect(() => {
    const line = d3.line<number>().x((_, i) => x(i - 1)).y((v) => y(v)).curve(d3.curveMonotoneX)
    const area = d3.area<number>().x((_, i) => x(i - 1)).y0(height).y1((v) => y(v)).curve(d3.curveMonotoneX)
    d3.select(lineRef.current).attr("d", line(data))
    d3.select(areaRef.current).attr("d", area(data))
    const g = d3.select(groupRef.current)
    g.interrupt()
    if (reduceMotion) {
      g.attr("transform", `translate(${-step},0)`)
      return
    }
    // real-time scroll: linear because it tracks wall-clock time, not a UI transition
    g.attr("transform", "translate(0,0)").transition().duration(intervalMs).ease(d3.easeLinear).attr("transform", `translate(${-step},0)`)
  }, [data, x, y, height, step, intervalMs, reduceMotion])

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left
    setHover(clamp(Math.round(x.invert(px)) + 1, 1, data.length - 1))
  }

  return (
    <div className="relative">
      <svg width={width} height={height} className="overflow-visible" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="CPU usage over time">
        <defs>
          <linearGradient id="sysmon-spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0954a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f0954a" stopOpacity="0" />
          </linearGradient>
          <clipPath id="sysmon-spark-clip">
            <rect width={width} height={height} />
          </clipPath>
        </defs>
        <g clipPath="url(#sysmon-spark-clip)">
          <g ref={groupRef}>
            <path ref={areaRef} fill="url(#sysmon-spark)" />
            <path ref={lineRef} fill="none" stroke="#f0954a" strokeWidth={1.6} strokeLinejoin="round" />
          </g>
        </g>
        {hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover - 1)} x2={x(hover - 1)} y1={0} y2={height} stroke="rgba(255,255,255,0.25)" />
            <circle cx={x(hover - 1)} cy={y(data[hover])} r={2.5} fill="#f0954a" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <span className="pointer-events-none absolute -top-5 right-0 rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] tabular-nums text-white/80">
          {Math.round(data[hover])}% · {data.length - 1 - hover}s ago
        </span>
      )}
    </div>
  )
}

/** Segmented meter: d3.scaleBand lays out the bars, each bar takes its colour from the segment it falls in. */
function Meter({ width, height, count, segments, highlight }: { width: number; height: number; count: number; segments: { id: string; value: number; color: string }[]; highlight?: string | null }) {
  const band = useMemo(() => d3.scaleBand<number>().domain(d3.range(count)).range([0, width]).paddingInner(0.38), [count, width])
  const ends = d3.cumsum(segments, (s) => s.value)
  const edges = segments.map((s, i) => ({ ...s, from: ends[i] - s.value, to: ends[i] }))
  return (
    <svg width={width} height={height} aria-hidden>
      {d3.range(count).map((i) => {
        const pct = ((i + 0.5) / count) * 100
        const seg = edges.find((e) => pct >= e.from && pct < e.to)
        const dim = highlight && seg && seg.id !== highlight
        return (
          <rect
            key={i}
            x={band(i)}
            width={band.bandwidth()}
            height={height}
            rx={Math.min(1.5, band.bandwidth() / 2)}
            fill={seg ? seg.color : "rgba(255,255,255,0.12)"}
            opacity={dim ? 0.25 : 1}
            style={{ transition: "fill 300ms cubic-bezier(0.33, 1, 0.68, 1), opacity 200ms cubic-bezier(0.33, 1, 0.68, 1)" }}
          />
        )
      })}
    </svg>
  )
}

/** Download area + upload line on one shared scale (d3.scaleLinear / d3.area / d3.line). */
function NetChart({ down, up, width, height }: { down: number[]; up: number[]; width: number; height: number }) {
  const x = d3.scaleLinear().domain([0, down.length - 1]).range([0, width])
  const y = d3.scaleLinear().domain([0, Math.max(100, d3.max([...down, ...up]) ?? 100)]).nice().range([height - 1, 1])
  const area = d3.area<number>().x((_, i) => x(i)).y0(height).y1((v) => y(v)).curve(d3.curveMonotoneX)
  const downLine = d3.line<number>().x((_, i) => x(i)).y((v) => y(v)).curve(d3.curveMonotoneX)
  const ticks = y.ticks(2).filter((t) => t > 0)
  return (
    <svg width={width} height={height} role="img" aria-label={`Network: ${down[down.length - 1]} KB/s down, ${up[up.length - 1]} KB/s up`}>
      <defs>
        <linearGradient id="sysmon-net" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <line key={t} x1={0} x2={width} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />
      ))}
      <path d={area(down) ?? ""} fill="url(#sysmon-net)" />
      <path d={downLine(down) ?? ""} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.4} />
      <path d={downLine(up) ?? ""} fill="none" stroke="#f0954a" strokeWidth={1.4} />
    </svg>
  )
}

/* ── Widget ──────────────────────────────────────────────────────────── */

export default function SystemMonitorWidget() {
  const reduceMotion = useReducedMotion()
  const wide = useWide()
  const W = wide ? 342 : 324
  const H = Math.round((W * 16) / 9)
  const PAD = 18
  const inner = W - PAD * 2

  const morph = reduceMotion ? { duration: 0 } : SPRING.morph
  const swap = reduceMotion
    ? { initial: false as const, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 6, filter: "blur(3px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -6, filter: "blur(3px)" },
        transition: { duration: DURATION.view, ease: EASE.fade },
      }

  const widgetRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<"activity" | "awake">("activity")
  // metrics and CPU history advance together in one update
  const [live, setLive] = useState(() => ({
    metrics: INITIAL,
    history: seedHistory(),
    net: { down: seedNet(104, 8, 980, 120), up: seedNet(44, 2, 420, 60) },
  }))
  const { metrics, history, net } = live
  const setMetrics = (fn: (m: Metrics) => Metrics) => setLive((l) => ({ ...l, metrics: fn(l.metrics) }))
  const [intervalSec, setIntervalSec] = useState(1)
  const [showLegend, setShowLegend] = useState(true)
  const [legendFocus, setLegendFocus] = useState<ProcessId | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pulseOpen, setPulseOpen] = useState(false)
  const [freeing, setFreeing] = useState<"idle" | "working" | "done">("idle")
  const [freedGb, setFreedGb] = useState(0)

  // Awake
  const [awakeUntil, setAwakeUntil] = useState<number | null>(null)
  const [awakeChoice, setAwakeChoice] = useState<number>(60)
  const [now, setNow] = useState(0)

  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  useEffect(() => {
    const id = window.setInterval(() => {
      setLive((l) => {
        const n = nextMetrics(l.metrics)
        return {
          metrics: n,
          history: [...l.history.slice(1), n.cpu],
          net: { down: [...l.net.down.slice(1), n.down], up: [...l.net.up.slice(1), n.up] },
        }
      })
    }, intervalSec * 1000)
    return () => window.clearInterval(id)
  }, [intervalSec])

  useEffect(() => {
    if (awakeUntil === null) return
    const tick = () => {
      const t = Date.now()
      setNow(t)
      if (awakeUntil !== Infinity && t >= awakeUntil) setAwakeUntil(null)
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [awakeUntil])

  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, { y: 12, opacity: 0, duration: DURATION.enter, ease: GSAP_EASE.easeOutQuart })
    },
    { scope: widgetRef }
  )

  const press = (el: HTMLElement | null) => {
    if (!el || reduceMotion) return
    gsap.fromTo(el, { scale: 0.96 }, { scale: 1, duration: DURATION.press, ease: GSAP_EASE.easeOutQuad })
  }

  const freeMemory = () => {
    if (freeing !== "idle") return
    setFreeing("working")
    later(() => {
      const gb = Math.round((1.5 + Math.random() * 3) * 10) / 10
      setMetrics((m) => ({ ...m, memUsed: Math.max(10, Math.round((m.memUsed - gb) * 10) / 10) }))
      setFreedGb(gb)
      setFreeing("done")
      later(() => setFreeing("idle"), 2200)
    }, 1100)
  }

  const cpuSegments = PROCESSES.map((p) => ({ id: p.id, value: metrics.shares[p.id], color: p.color }))
  const memPct = (metrics.memUsed / MEM_TOTAL) * 100
  const awakeLeft = awakeUntil === null ? 0 : awakeUntil === Infinity ? Infinity : Math.max(0, awakeUntil - now)
  const fmtLeft = (ms: number) => {
    const s = Math.ceil(ms / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  }

  const colW = (inner - 24) / 2
  const footerBtnW = (inner - 10) / 2
  const pulsePanel = { width: inner, height: 300 }
  const settingsPanel = { width: 214, height: 132 }

  const topProcesses = [
    ...PROCESSES.filter((p) => p.id !== "other").map((p) => ({ name: p.name, cpu: metrics.shares[p.id], color: p.color })),
    { name: "WindowServer", cpu: metrics.shares.other * 0.45, color: "#4b4b50" },
    { name: "kernel_task", cpu: metrics.shares.other * 0.3, color: "#4b4b50" },
    { name: "mds_stores", cpu: metrics.shares.other * 0.25, color: "#4b4b50" },
  ].sort((a, b) => b.cpu - a.cpu)
  const procX = d3.scaleLinear().domain([0, Math.max(1, d3.max(topProcesses, (p) => p.cpu) ?? 1)]).range([0, 96])

  return (
    <div
      ref={widgetRef}
      style={{ width: W, height: H, padding: PAD }}
      className="relative flex select-none flex-col overflow-hidden rounded-[30px] bg-gradient-to-b from-[#202022] to-[#161618] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_30px_60px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      {/* Header */}
      <div className="relative z-40 flex items-center justify-between">
        <div role="tablist" aria-label="View" className="flex rounded-[11px] bg-black/40 p-[3px] ring-1 ring-inset ring-white/[0.06]">
          {(
            [
              { id: "activity", label: "Activity", icon: Activity },
              { id: "awake", label: "Awake", icon: Coffee },
            ] as const
          ).map((t) => {
            const active = tab === t.id
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex h-7 items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-white/40",
                  active ? "text-white" : "text-white/50 hover:text-white/80"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sysmon-tab"
                    transition={reduceMotion ? { duration: 0 } : SPRING.indicator}
                    className="absolute inset-0 rounded-[8px] bg-white/[0.12]"
                  />
                )}
                <Icon className="relative h-3.5 w-3.5 stroke-[2]" />
                <span className="relative">{t.label}</span>
              </button>
            )
          })}
        </div>

        <MorphContainer
          isOpen={settingsOpen}
          onOpenChange={setSettingsOpen}
          triggerWidth={28}
          triggerHeight={28}
          expandedWidth={settingsPanel.width}
          expandedHeight={settingsPanel.height}
          expandedRadius={18}
          anchor="top-right"
          transition={morph}
          className={cn("bg-[#2a2a2d]", SURFACE)}
          openClassName={PANEL_OPEN}
          closedClassName={cn(PANEL_REST, "bg-transparent")}
          trigger={({ open }) => (
            <button type="button" onClick={open} aria-label="Monitor settings" className="flex h-full w-full items-center justify-center rounded-full text-white/60 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/40">
              <Settings className="h-[18px] w-[18px] stroke-[1.8]" />
            </button>
          )}
        >
          {({ close }) => (
            <div data-morph-content className="absolute right-0 top-0 flex flex-col p-3.5" style={settingsPanel}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold">Monitor</span>
                <button type="button" onClick={close} aria-label="Close settings" className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                  <X className="h-3 w-3 stroke-[2.4]" />
                </button>
              </div>
              <div className="mt-auto space-y-2.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Refresh</span>
                  <div role="radiogroup" aria-label="Refresh interval" className="flex rounded-[8px] bg-black/30 p-0.5">
                    {[1, 2, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={intervalSec === s}
                        onClick={() => setIntervalSec(s)}
                        className={cn("h-6 w-8 rounded-[6px] text-[11px] tabular-nums transition-colors duration-200", intervalSec === s ? "bg-white/15 text-white" : "text-white/50 hover:text-white")}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">CPU legend</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showLegend}
                    aria-label="Show CPU legend"
                    onClick={() => setShowLegend((v) => !v)}
                    className={cn("relative h-[20px] w-[34px] rounded-full transition-colors duration-200", showLegend ? "bg-[#f0954a]" : "bg-white/15")}
                  >
                    <motion.span
                      animate={{ x: showLegend ? 14 : 0 }}
                      transition={{ duration: DURATION.micro, ease: EASE.move }}
                      className="absolute left-[3px] top-[3px] h-[14px] w-[14px] rounded-full bg-white"
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </MorphContainer>
      </div>

      <div className="relative mt-5 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {tab === "activity" ? (
            <motion.div key="activity" {...swap} className="absolute inset-0 flex flex-col [&>*]:shrink-0">
              {/* CPU */}
              <span className="text-[11px] font-medium text-white/45">CPU</span>
              <div className="mt-1.5 flex items-end justify-between">
                <span data-number-morph="" className="flex items-start font-light leading-none">
                  <span className="text-[60px] tabular-nums">
                    <NumberMorph value={metrics.cpu} />
                  </span>
                  <span className="mt-1 text-[20px] text-white/60">%</span>
                </span>
                <div className="flex flex-col items-end gap-1 pb-1">
                  <Sparkline data={history} width={112} height={34} intervalMs={intervalSec * 1000} reduceMotion={reduceMotion} />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={cpuStatus(metrics.cpu)} {...swap} className="text-[13px] font-medium text-[#f0954a]">
                      {cpuStatus(metrics.cpu)}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-3.5">
                <Meter width={inner} height={26} count={44} segments={cpuSegments} highlight={legendFocus} />
              </div>

              <motion.div
                initial={false}
                animate={{ height: showLegend ? "auto" : 0, opacity: showLegend ? 1 : 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: DURATION.fade, ease: EASE.fade }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between pt-2.5" onPointerLeave={() => setLegendFocus(null)}>
                  {PROCESSES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onPointerEnter={() => setLegendFocus(p.id)}
                      onFocus={() => setLegendFocus(p.id)}
                      onBlur={() => setLegendFocus(null)}
                      onClick={() => setLegendFocus((f) => (f === p.id ? null : p.id))}
                      aria-pressed={legendFocus === p.id}
                      className={cn("flex items-center gap-1.5 rounded text-[11px] outline-none transition-opacity duration-200 focus-visible:ring-1 focus-visible:ring-white/40", legendFocus && legendFocus !== p.id ? "opacity-40" : "opacity-100")}
                    >
                      <span className="h-[7px] w-[7px] rounded-[2px]" style={{ background: p.color }} />
                      <span className="text-white/75">{p.name}</span>
                      <span className="tabular-nums text-white/45">{Math.round(metrics.shares[p.id])}%</span>
                    </button>
                  ))}
                </div>
              </motion.div>

              <div className={cn("h-px bg-white/[0.07]", wide ? "my-4" : "my-3")} />

              {/* Memory + GPU */}
              <div className="flex justify-between">
                <div className="flex flex-col" style={{ width: colW }}>
                  <span className="text-[11px] font-medium text-white/45">MEMORY</span>
                  <span data-number-morph="" className="mt-1.5 flex items-baseline gap-1.5 leading-none">
                    <span className="text-[26px] font-light tabular-nums">
                      <NumberMorph value={Math.round(metrics.memUsed)} />
                    </span>
                    <span className="text-[12px] text-white/50">of {MEM_TOTAL} GB</span>
                  </span>
                  <div className="mt-2.5">
                    <Meter width={colW} height={16} count={22} segments={[{ id: "mem", value: memPct, color: "rgba(255,255,255,0.85)" }]} />
                  </div>
                  <span className="mt-1.5 text-[11px] text-white/45">{memStatus(metrics.memUsed)}</span>
                </div>
                <div className="flex flex-col" style={{ width: colW }}>
                  <span className="text-[11px] font-medium text-white/45">GPU</span>
                  <span data-number-morph="" className="mt-1.5 flex items-baseline gap-0.5 leading-none">
                    <span className="text-[26px] font-light tabular-nums">
                      <NumberMorph value={metrics.gpu} />
                    </span>
                    <span className="text-[12px] text-white/50">%</span>
                  </span>
                  <div className="mt-2.5">
                    <Meter width={colW} height={16} count={22} segments={[{ id: "gpu", value: metrics.gpu, color: "rgba(255,255,255,0.85)" }]} />
                  </div>
                  <span className="mt-1.5 text-[11px] text-white/45">{metrics.gpu > 35 ? "Neural Engine active" : "Neural Engine idle"}</span>
                </div>
              </div>

              <div className={cn("h-px bg-white/[0.07]", wide ? "my-4" : "my-3")} />

              {/* Network history (D3) */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-white/45">NETWORK</span>
                <span className="flex items-center gap-3 text-[11px] text-white/45">
                  <span className="flex items-center gap-1.5">
                    <span className="h-[2px] w-3 rounded-full bg-white/70" /> Down
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-[2px] w-3 rounded-full bg-[#f0954a]" /> Up
                  </span>
                </span>
              </div>
              <div className="mt-2">
                <NetChart down={net.down} up={net.up} width={inner} height={wide ? 64 : 40} />
              </div>

              {/* Throughput: unit lives in the label, so a changing number never pushes anything */}
              <div className="mt-3 grid grid-cols-4">
                {[
                  { label: "Down", unit: "KB/s", value: String(metrics.down) },
                  { label: "Up", unit: "KB/s", value: String(metrics.up) },
                  { label: "Disk", unit: "MB/s", value: metrics.disk.toFixed(1) },
                  { label: "Power", unit: "W", value: metrics.power.toFixed(1) },
                ].map((s, i) => (
                  <div key={s.label} className={cn("flex flex-col gap-1", i === 3 && "items-end")}>
                    <span className="whitespace-nowrap text-[11px] text-white/45">
                      {s.label} <span className="text-white/30">{s.unit}</span>
                    </span>
                    <span className="text-[14px] tabular-nums">
                      <NumberMorph value={s.value} />
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="awake" {...swap} className="absolute inset-0 flex flex-col">
              <span className="text-[11px] font-medium text-white/45">KEEP AWAKE</span>
              <span className="mt-2 text-[40px] font-light leading-none tabular-nums">
                {awakeUntil === null ? "Off" : awakeLeft === Infinity ? "On" : <NumberMorph value={fmtLeft(awakeLeft)} />}
              </span>
              <span className="mt-2 text-[12px] text-white/50">
                {awakeUntil === null
                  ? "Your Mac can sleep normally."
                  : awakeLeft === Infinity
                    ? "Stays awake until you turn it off."
                    : "Display and system stay awake until the timer ends."}
              </span>

              <span className="mt-6 text-[11px] font-medium text-white/45">DURATION</span>
              <div role="radiogroup" aria-label="Keep awake for" className="mt-2 grid grid-cols-4 gap-1.5">
                {[
                  { v: 30, label: "30m" },
                  { v: 60, label: "1h" },
                  { v: 120, label: "2h" },
                  { v: 0, label: "Always" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    role="radio"
                    aria-checked={awakeChoice === o.v}
                    onClick={() => {
                      setAwakeChoice(o.v)
                      if (awakeUntil !== null) setAwakeUntil(o.v ? Date.now() + o.v * 60_000 : Infinity)
                    }}
                    className={cn(
                      "h-9 rounded-[10px] text-[12px] font-medium outline-none ring-1 ring-inset transition-colors duration-200 focus-visible:ring-white/50",
                      awakeChoice === o.v ? "bg-white/[0.12] text-white ring-white/15" : "text-white/55 ring-white/[0.07] hover:text-white"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  press(e.currentTarget)
                  setAwakeUntil((u) => (u === null ? (awakeChoice ? Date.now() + awakeChoice * 60_000 : Infinity) : null))
                }}
                aria-pressed={awakeUntil !== null}
                className={cn(
                  "mt-5 flex h-11 items-center justify-center gap-2 rounded-[12px] text-[14px] font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-white/50",
                  awakeUntil !== null ? "bg-[#f0954a] text-black" : "bg-white/[0.08] text-white ring-1 ring-inset ring-white/10 hover:bg-white/[0.12]"
                )}
              >
                <Coffee className="h-4 w-4 stroke-[2]" />
                {awakeUntil !== null ? "Turn off" : "Keep awake"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer actions */}
      <div className="relative mt-4 flex items-center gap-2.5">
        <button
          type="button"
          onClick={(e) => {
            press(e.currentTarget)
            freeMemory()
          }}
          disabled={freeing === "working"}
          style={{ width: footerBtnW }}
          className="relative flex h-10 items-center justify-center gap-2 overflow-hidden rounded-[10px] bg-white/[0.06] text-[13px] font-medium text-white/80 outline-none ring-1 ring-inset ring-white/10 hover:bg-white/[0.1] focus-visible:ring-white/40 disabled:cursor-default"
        >
          {freeing === "working" && (
            <motion.span
              aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1, ease: EASE.move }}
              className="absolute inset-0 origin-left bg-white/[0.08]"
            />
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={freeing} {...swap} aria-live="polite" className="relative flex items-center gap-2">
              {freeing === "done" ? <Check className="h-4 w-4 text-[#7fe0a0] stroke-[2.4]" /> : <Cpu className="h-4 w-4 stroke-[1.8]" />}
              {freeing === "working" ? "Freeing…" : freeing === "done" ? `Freed ${freedGb} GB` : "Free memory"}
            </motion.span>
          </AnimatePresence>
        </button>

        <MorphContainer
          isOpen={pulseOpen}
          onOpenChange={setPulseOpen}
          triggerWidth={footerBtnW}
          triggerHeight={40}
          triggerRadius={10}
          expandedWidth={pulsePanel.width}
          expandedHeight={pulsePanel.height}
          expandedRadius={22}
          anchor="bottom-right"
          zIndex={45}
          transition={morph}
          className={cn("bg-[#2a2a2d]", SURFACE)}
          openClassName={PANEL_OPEN}
          closedClassName={PANEL_REST}
          trigger={({ open }) => (
            <button type="button" onClick={open} className="h-full w-full rounded-[10px] bg-white text-[13px] font-semibold text-black outline-none hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/60">
              Open Pulse
            </button>
          )}
        >
          {({ close }) => (
            <div data-morph-content className="absolute bottom-0 right-0 flex flex-col p-4" style={pulsePanel}>
              <div className="flex items-center justify-between">
                <span className="flex flex-col">
                  <span className="text-[14px] font-semibold">Pulse</span>
                  <span className="text-[11px] text-white/45">Top processes by CPU · live</span>
                </span>
                <button type="button" onClick={close} aria-label="Close Pulse" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                  <X className="h-3.5 w-3.5 stroke-[2.4]" />
                </button>
              </div>
              <ul className="mt-3 flex flex-col gap-2.5">
                {topProcesses.map((p) => (
                  <li key={p.name} className="flex items-center gap-3 text-[12px]">
                    <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: p.color }} />
                    <span className="flex-1 truncate text-white/85">{p.name}</span>
                    <svg width={96} height={6} aria-hidden className="shrink-0">
                      <rect width={96} height={6} rx={3} fill="rgba(255,255,255,0.08)" />
                      <rect width={procX(p.cpu)} height={6} rx={3} fill={p.color} style={{ transition: "width 400ms cubic-bezier(0.65, 0, 0.35, 1)" }} />
                    </svg>
                    <span className="w-9 text-right tabular-nums text-white/70">{p.cpu.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-center justify-between border-t border-white/[0.07] pt-3 text-[11px] text-white/45">
                <span>Total CPU</span>
                <span className="tabular-nums text-white/80">{metrics.cpu}%</span>
              </div>
            </div>
          )}
        </MorphContainer>
      </div>
    </div>
  )
}

import { useState, useRef, useEffect, useCallback } from "react"
import * as d3 from "d3"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useReducedMotion } from "motion/react"
import { Heart } from "lucide-react"

interface TelemetryPoint {
  hour: number // 0 to 23
  bottomPct: number // 0 to 100 (% of chart height from bottom)
  topPct: number // 0 to 100 (% of chart height from bottom)
  isPeak?: boolean
  isMin?: boolean
  isCurrent?: boolean
  displayBpm: number
}

// 24-hour telemetry data mirroring the exact reference visualization
const TELEMETRY_DATA: (TelemetryPoint | null)[] = [
  // 12AM - 5AM (0 - 5)
  { hour: 0, bottomPct: 32, topPct: 76, displayBpm: 79 },
  { hour: 1, bottomPct: 26, topPct: 68, displayBpm: 73 },
  { hour: 2, bottomPct: 20, topPct: 58, displayBpm: 68 },
  { hour: 3, bottomPct: 28, topPct: 62, displayBpm: 64 },
  { hour: 4, bottomPct: 12, topPct: 56, isMin: true, displayBpm: 51 }, // MIN (Purple marker)
  { hour: 5, bottomPct: 22, topPct: 48, displayBpm: 67 },

  // 6AM - 11AM (6 - 11)
  { hour: 6, bottomPct: 26, topPct: 44, displayBpm: 68 },
  { hour: 7, bottomPct: 32, topPct: 54, displayBpm: 74 },
  { hour: 8, bottomPct: 38, topPct: 66, displayBpm: 82 },
  { hour: 9, bottomPct: 34, topPct: 58, displayBpm: 78 },
  { hour: 10, bottomPct: 42, topPct: 74, displayBpm: 88 },
  { hour: 11, bottomPct: 46, topPct: 92, isPeak: true, displayBpm: 97 }, // PEAK (Orange marker)

  // 12PM - 5PM (12 - 17)
  { hour: 12, bottomPct: 36, topPct: 74, displayBpm: 84 },
  { hour: 13, bottomPct: 26, topPct: 54, displayBpm: 72 },
  { hour: 14, bottomPct: 24, topPct: 66, displayBpm: 76 },
  { hour: 15, bottomPct: 44, topPct: 72, displayBpm: 81 },
  { hour: 16, bottomPct: 38, topPct: 68, displayBpm: 79 },
  { hour: 17, bottomPct: 44, topPct: 78, displayBpm: 86 },

  // 6PM - 11PM (18 - 23)
  { hour: 18, bottomPct: 26, topPct: 74, displayBpm: 82 },
  { hour: 19, bottomPct: 34, topPct: 56, displayBpm: 75 },
  { hour: 20, bottomPct: 22, topPct: 64, displayBpm: 73 },
  { hour: 21, bottomPct: 44, topPct: 68, isCurrent: true, displayBpm: 72 }, // Live reading (72 BPM)
  null, // Hour 22 (guide line only)
  null, // Hour 23 (guide line only)
]

export default function HeartRateWidget() {
  const reduceMotion = useReducedMotion()
  const [activeBpm, setActiveBpm] = useState(72)
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)
  const [isPulsing, setIsPulsing] = useState(false)

  const widgetRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const heartRef = useRef<SVGSVGElement>(null)
  const bpmRef = useRef<HTMLSpanElement>(null)

  // Store direct references to D3 bar elements for instant switching
  const d3Refs = useRef<{
    bars: d3.Selection<SVGRectElement, { slot: number; data: TelemetryPoint | null }, SVGGElement, unknown> | null
    guidelines: d3.Selection<SVGLineElement, number, SVGGElement, unknown> | null
    activeSlot: number | null
  }>({
    bars: null,
    guidelines: null,
    activeSlot: null,
  })

  // GSAP entrance
  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, {
        scale: 0.96,
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
      })
    },
    { scope: widgetRef }
  )

  // Heartbeat pulse animation
  const handlePulse = useCallback(() => {
    setIsPulsing(true)
    if (heartRef.current) {
      const tl = gsap.timeline({
        onComplete: () => setIsPulsing(false),
      })
      tl.to(heartRef.current, {
        scale: 1.25,
        color: "#f43f5e",
        duration: 0.12,
        ease: "power2.out",
      })
        .to(heartRef.current, {
          scale: 0.94,
          duration: 0.08,
          ease: "power1.in",
        })
        .to(heartRef.current, {
          scale: 1.15,
          color: "#f43f5e",
          duration: 0.1,
          ease: "power2.out",
        })
        .to(heartRef.current, {
          scale: 1,
          color: "#8e8e93",
          duration: 0.2,
          ease: "power2.out",
        })
    }

    const next = 71 + Math.floor(Math.random() * 3)
    setActiveBpm(next)
    if (bpmRef.current) {
      bpmRef.current.textContent = String(next)
      gsap.fromTo(
        bpmRef.current,
        { opacity: 0.7, y: -1 },
        { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }
      )
    }
  }, [])

  // Instant slot switch function (0ms delay, no transition queue)
  const applySlotHover = useCallback((slot: number | null) => {
    if (d3Refs.current.activeSlot === slot) return
    d3Refs.current.activeSlot = slot

    setHoveredHour(slot)

    const { bars, guidelines } = d3Refs.current
    if (!bars || !guidelines) return

    // Update BPM reading instantly via direct DOM ref + state
    if (slot !== null && TELEMETRY_DATA[slot]) {
      const bpm = TELEMETRY_DATA[slot]!.displayBpm
      if (bpmRef.current) bpmRef.current.textContent = String(bpm)
      setActiveBpm(bpm)
    } else {
      if (bpmRef.current) bpmRef.current.textContent = "72"
      setActiveBpm(72)
    }

    // Instantly switch bar colors and guidelines
    bars
      .interrupt()
      .attr("fill", (d) => {
        if (slot !== null && d.slot === slot) return "#ffffff"
        if (d.data!.isCurrent) return "#22c55e"
        return "#8e8e93"
      })
      .attr("opacity", (d) => {
        if (slot === null) return 1
        return d.slot === slot ? 1 : 0.55
      })

    guidelines
      .interrupt()
      .attr("stroke", (d) => {
        if (slot !== null && d === slot) return "rgba(255, 255, 255, 0.45)"
        return "rgba(255, 255, 255, 0.08)"
      })
  }, [])

  // D3 Chart Rendering & High-Performance Single Pointer Tracker
  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const width = 300
    const height = 120
    const totalSlots = 24
    const slotWidth = width / totalSlots

    // Y scale mapping 0-100% to height-0
    const yScale = d3.scaleLinear().domain([0, 100]).range([height, 0])

    // Defs: Filters for glow effect
    const defs = svg.append("defs")

    // Green glow filter for live reading
    const greenGlow = defs.append("filter").attr("id", "green-glow")
    greenGlow
      .append("feDropShadow")
      .attr("dx", "0")
      .attr("dy", "0")
      .attr("stdDeviation", "2.5")
      .attr("flood-color", "#22c55e")
      .attr("flood-opacity", "0.7")

    // Orange glow for peak
    const orangeGlow = defs.append("filter").attr("id", "orange-glow")
    orangeGlow
      .append("feDropShadow")
      .attr("dx", "0")
      .attr("dy", "0")
      .attr("stdDeviation", "2")
      .attr("flood-color", "#f95738")
      .attr("flood-opacity", "0.6")

    // Purple glow for min
    const purpleGlow = defs.append("filter").attr("id", "purple-glow")
    purpleGlow
      .append("feDropShadow")
      .attr("dx", "0")
      .attr("dy", "0")
      .attr("stdDeviation", "2")
      .attr("flood-color", "#8257e5")
      .attr("flood-opacity", "0.6")

    // Main Chart Group
    const g = svg.append("g")

    // 1. Full-height vertical guideline lines behind every slot
    const guidelines = g
      .selectAll<SVGLineElement, number>("line.guideline")
      .data(d3.range(totalSlots))
      .enter()
      .append("line")
      .attr("class", "guideline")
      .attr("x1", (d) => d * slotWidth + slotWidth / 2)
      .attr("x2", (d) => d * slotWidth + slotWidth / 2)
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "rgba(255, 255, 255, 0.08)")
      .attr("stroke-width", 1)

    // 2. Telemetry Pill Bars (D3 Databind)
    const barWidth = 5
    const barData = TELEMETRY_DATA.map((item, idx) => ({
      slot: idx,
      data: item,
    })).filter((d) => d.data !== null)

    const barGroups = g
      .selectAll("g.bar-group")
      .data(barData)
      .enter()
      .append("g")
      .attr("class", "bar-group")
      .attr("data-slot", (d) => d.slot)

    // Rounded Capsule Bars
    const bars = barGroups
      .append("rect")
      .attr("class", "bar-pill")
      .attr("x", (d) => d.slot * slotWidth + (slotWidth - barWidth) / 2)
      .attr("y", (d) => yScale(d.data!.topPct))
      .attr("width", barWidth)
      .attr("height", (d) => yScale(d.data!.bottomPct) - yScale(d.data!.topPct))
      .attr("rx", barWidth / 2)
      .attr("ry", barWidth / 2)
      .attr("fill", (d) => {
        if (d.data!.isCurrent) return "#22c55e"
        return "#8e8e93"
      })
      .attr("filter", (d) => (d.data!.isCurrent ? "url(#green-glow)" : null))

    // 3. Peak Orange Dot (Slot 11)
    barGroups
      .filter((d) => Boolean(d.data!.isPeak))
      .append("circle")
      .attr("class", "peak-marker")
      .attr("cx", (d) => d.slot * slotWidth + slotWidth / 2)
      .attr("cy", (d) => yScale(d.data!.topPct))
      .attr("r", 3.25)
      .attr("fill", "#f95738")
      .attr("filter", "url(#orange-glow)")

    // 4. Min Purple Dot (Slot 4)
    barGroups
      .filter((d) => Boolean(d.data!.isMin))
      .append("circle")
      .attr("class", "min-marker")
      .attr("cx", (d) => d.slot * slotWidth + slotWidth / 2)
      .attr("cy", (d) => yScale(d.data!.bottomPct))
      .attr("r", 3.25)
      .attr("fill", "#8257e5")
      .attr("filter", "url(#purple-glow)")

    // Save references for instantaneous pointer tracking
    d3Refs.current.bars = bars
    d3Refs.current.guidelines = guidelines

    // 5. High-Performance Unified Pointer Tracker on full SVG
    // Calculating slot = Math.floor(x / slotWidth) ensures instantaneous 60fps/120fps response
    svg
      .on("pointerenter pointermove", (event: PointerEvent) => {
        const [x] = d3.pointer(event)
        const slot = Math.max(0, Math.min(totalSlots - 1, Math.floor(x / slotWidth)))
        applySlotHover(slot)
      })
      .on("pointerleave", () => {
        applySlotHover(null)
      })
  }, [applySlotHover])

  return (
    <div
      ref={widgetRef}
      className="relative w-[340px] sm:w-[350px] aspect-square bg-[#1c1d1f] text-white rounded-[32px] p-6 sm:p-7 shadow-2xl flex flex-col justify-between select-none overflow-hidden border border-white/[0.04]"
      style={{
        boxShadow:
          "0 24px 50px -12px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
      }}
    >
      {/* 1. TOP HEADER: Large BPM reading + Lucide Heart Icon */}
      <div className="flex items-start justify-between">
        <div
          className="flex items-baseline cursor-pointer group"
          onClick={handlePulse}
          title="Click to pulse"
        >
          <span
            ref={bpmRef}
            className="text-[52px] sm:text-[54px] font-semibold text-white leading-none tabular-nums"
          >
            {activeBpm}
          </span>
          <span className="text-[17px] font-medium text-[#7d7d82] uppercase ml-2.5 leading-none">
            BPM
          </span>
        </div>

        <button
          type="button"
          onClick={handlePulse}
          className="p-1 -mr-1 -mt-0.5 text-[#8e8e93] hover:text-white transition-colors focus:outline-none"
          aria-label="Heart rate sensor"
        >
          <Heart
            ref={heartRef}
            className={`w-[27px] h-[27px] transition-colors duration-150 ${
              isPulsing ? "text-rose-500 fill-rose-500/20" : "text-[#8e8e93]"
            }`}
            strokeWidth={1.8}
          />
        </button>
      </div>

      {/* 2. STATS ROW: PEAK: 97 BPM & MIN: 51 BPM (Instant Hover Support) */}
      <div className="flex flex-col space-y-1.5 mt-1 mb-2">
        {/* PEAK */}
        <div
          className="flex items-center gap-2 cursor-pointer w-fit group"
          onPointerEnter={() => applySlotHover(11)}
          onPointerLeave={() => applySlotHover(null)}
        >
          <div className="w-[6.5px] h-[6.5px] rounded-full bg-[#f95738] shrink-0" />
          <div className="font-mono text-[12.5px] leading-tight flex items-center">
            <span
              className={`font-medium transition-colors ${
                hoveredHour === 11 ? "text-white" : "text-[#8e8e93]"
              }`}
            >
              PEAK:
            </span>
            <span className="text-white font-bold ml-2">97</span>
            <span className="text-[#8e8e93] font-medium ml-1">BPM</span>
          </div>
        </div>

        {/* MIN */}
        <div
          className="flex items-center gap-2 cursor-pointer w-fit group"
          onPointerEnter={() => applySlotHover(4)}
          onPointerLeave={() => applySlotHover(null)}
        >
          <div className="w-[6.5px] h-[6.5px] rounded-full bg-[#8257e5] shrink-0" />
          <div className="font-mono text-[12.5px] leading-tight flex items-center">
            <span
              className={`font-medium transition-colors ${
                hoveredHour === 4 ? "text-white" : "text-[#8e8e93]"
              }`}
            >
              MIN:
            </span>
            <span className="text-white font-bold ml-2.5">51</span>
            <span className="text-[#8e8e93] font-medium ml-1">BPM</span>
          </div>
        </div>
      </div>

      {/* 3. D3 24-HOUR TELEMETRY CHART */}
      <div className="w-full flex flex-col pt-1">
        {/* Native D3 SVG Container with unified high-performance pointer tracking */}
        <div className="relative w-full h-[115px] sm:h-[120px] cursor-crosshair">
          <svg
            ref={svgRef}
            viewBox="0 0 300 120"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          />
        </div>

        {/* 4. TIME AXIS (12AM, 6AM, 12PM, 6PM) WITH DIVIDERS */}
        <div className="relative w-full h-[20px] mt-2 flex items-center">
          {/* 5 Dividing Vertical Lines */}
          <div className="absolute inset-0 flex justify-between pointer-events-none">
            <div className="w-[1px] h-full bg-white/[0.12]" />
            <div className="w-[1px] h-full bg-white/[0.12]" />
            <div className="w-[1px] h-full bg-white/[0.12]" />
            <div className="w-[1px] h-full bg-white/[0.12]" />
            <div className="w-[1px] h-full bg-white/[0.12]" />
          </div>

          {/* 4 Quadrant Labels */}
          <div className="w-full grid grid-cols-4 text-center z-10 pointer-events-none">
            <span className="font-mono text-[11px] text-[#71717a] font-medium uppercase">
              12AM
            </span>
            <span className="font-mono text-[11px] text-[#71717a] font-medium uppercase">
              6AM
            </span>
            <span className="font-mono text-[11px] text-[#71717a] font-medium uppercase">
              12PM
            </span>
            <span className="font-mono text-[11px] text-[#71717a] font-medium uppercase">
              6PM
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useRef, useEffect } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useReducedMotion } from "motion/react"
import { MoreHorizontal } from "lucide-react"

interface BarData {
  id: number
  label: string
  rows: number
  amount: string
  change: string
}

interface PeriodConfig {
  id: "1M" | "6M" | "1Y"
  label: string
  amount: string
  change: string
  bars: BarData[]
}

// Distinct heights and realistic progression across periods:
// 1M: Exact match to the user's reference image (Col 3 reaches full height of 46 rows, Col 2 is 30 rows, Col 1 is 19 rows)
// 6M: Noticeably shorter/different profile (Col 3 drops to 35 rows, Col 2 drops to 22 rows, Col 1 drops to 12 rows)
// 1Y: Distinct steep growth profile (Col 1 is very compact at 8 rows, Col 2 is 26 rows, Col 3 towers at 46 rows)
const PERIODS: Record<"1M" | "6M" | "1Y", PeriodConfig> = {
  "1M": {
    id: "1M",
    label: "Past Month",
    amount: "$7,432.58",
    change: "+8.3%",
    bars: [
      { id: 0, label: "W1", rows: 19, amount: "$2,140.25", change: "+2.4%" },
      { id: 1, label: "W2", rows: 30, amount: "$4,890.65", change: "+5.1%" },
      { id: 2, label: "W3", rows: 46, amount: "$7,432.58", change: "+8.3%" },
    ],
  },
  "6M": {
    id: "6M",
    label: "Past 6 Months",
    amount: "$18,924.40",
    change: "+24.6%",
    bars: [
      { id: 0, label: "Q1", rows: 12, amount: "$4,820.00", change: "+5.8%" },
      { id: 1, label: "Q2", rows: 22, amount: "$10,450.80", change: "+13.2%" },
      { id: 2, label: "Q3", rows: 35, amount: "$18,924.40", change: "+24.6%" },
    ],
  },
  "1Y": {
    id: "1Y",
    label: "Past Year",
    amount: "$42,650.00",
    change: "+68.2%",
    bars: [
      { id: 0, label: "H1", rows: 8, amount: "$9,300.00", change: "+14.5%" },
      { id: 1, label: "H2", rows: 26, amount: "$24,150.50", change: "+35.4%" },
      { id: 2, label: "FY", rows: 46, amount: "$42,650.00", change: "+68.2%" },
    ],
  },
}

export default function GrowthWidget() {
  const reduceMotion = useReducedMotion()
  const [selectedPeriod, setSelectedPeriod] = useState<"1M" | "6M" | "1Y">("1M")
  const [activeCol, setActiveCol] = useState<number | null>(null)
  const [hoveredCol, setHoveredCol] = useState<number | null>(null)
  const [showMenu, setShowMenu] = useState(false)

  const currentPeriod = PERIODS[selectedPeriod]
  const displayAmount = activeCol !== null ? currentPeriod.bars[activeCol].amount : currentPeriod.amount
  const displayChange = activeCol !== null ? currentPeriod.bars[activeCol].change : currentPeriod.change

  const widgetRef = useRef<HTMLDivElement>(null)
  const amountRef = useRef<HTMLSpanElement>(null)
  const changeRef = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Dedicated refs for GSAP SVG attribute animation (attr: { y, height, y1, y2 })
  const colRectRef0 = useRef<SVGRectElement>(null)
  const colRectRef1 = useRef<SVGRectElement>(null)
  const colRectRef2 = useRef<SVGRectElement>(null)

  const clipRectRef0 = useRef<SVGRectElement>(null)
  const clipRectRef1 = useRef<SVGRectElement>(null)
  const clipRectRef2 = useRef<SVGRectElement>(null)

  const topLineRef0 = useRef<SVGLineElement>(null)
  const topLineRef1 = useRef<SVGLineElement>(null)
  const topLineRef2 = useRef<SVGLineElement>(null)

  const glowRectRef0 = useRef<SVGRectElement>(null)
  const glowRectRef1 = useRef<SVGRectElement>(null)
  const glowRectRef2 = useRef<SVGRectElement>(null)

  const colRectRefs = [colRectRef0, colRectRef1, colRectRef2]
  const clipRectRefs = [clipRectRef0, clipRectRef1, clipRectRef2]
  const topLineRefs = [topLineRef0, topLineRef1, topLineRef2]
  const glowRectRefs = [glowRectRef0, glowRectRef1, glowRectRef2]

  // Exact SVG geometry parameters
  const svgWidth = 296
  const svgHeight = 208
  const colGap = 2
  const colCount = 3
  const colWidth = (svgWidth - (colCount - 1) * colGap) / colCount // 96.67px

  const dotsPerRow = 22
  const maxRows = 46
  const dotPaddingX = 2
  const dotWidth = 3.2
  const dotGapX = (colWidth - 2 * dotPaddingX - dotsPerRow * dotWidth) / (dotsPerRow - 1) // ~1.05px
  const dotStepX = dotWidth + dotGapX

  const dotHeight = 3.2
  const dotGapY = 1.2
  const dotStepY = dotHeight + dotGapY

  // Initial GSAP entrance animation
  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, {
        scale: 0.96,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
      })

      // Initial column reveal animation from bottom
      currentPeriod.bars.forEach((bar, idx) => {
        const colHeight = bar.rows * dotStepY + 2
        const colY = svgHeight - colHeight

        const colRect = colRectRefs[idx].current
        const clipRect = clipRectRefs[idx].current
        const glowRect = glowRectRefs[idx].current
        const topLine = topLineRefs[idx].current

        if (colRect && clipRect && glowRect && topLine) {
          gsap.fromTo(
            [colRect, clipRect, glowRect],
            { attr: { y: svgHeight, height: 0 } },
            {
              attr: { y: colY, height: colHeight },
              duration: 0.65,
              delay: 0.08 * idx,
              ease: "power3.out",
            }
          )
          gsap.fromTo(
            topLine,
            { attr: { y1: svgHeight, y2: svgHeight } },
            {
              attr: { y1: colY + 0.5, y2: colY + 0.5 },
              duration: 0.65,
              delay: 0.08 * idx,
              ease: "power3.out",
            }
          )
        }
      })
    },
    { scope: widgetRef }
  )

  // Fluid height morphing when switching period (1M / 6M / 1Y)
  const handlePeriodChange = (period: "1M" | "6M" | "1Y") => {
    if (period === selectedPeriod) return
    setSelectedPeriod(period)
    setActiveCol(null)

    const targetConfig = PERIODS[period]

    // Animate numbers
    if (amountRef.current) {
      gsap.fromTo(
        amountRef.current,
        { opacity: 0.25, y: -4 },
        { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }
      )
    }
    if (changeRef.current) {
      gsap.fromTo(
        changeRef.current,
        { opacity: 0.25, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.25, ease: "power2.out" }
      )
    }

    // Dynamic fluid resize ("bra chota hona") for all 3 bars
    targetConfig.bars.forEach((bar, idx) => {
      const colHeight = bar.rows * dotStepY + 2
      const colY = svgHeight - colHeight

      const colRect = colRectRefs[idx].current
      const clipRect = clipRectRefs[idx].current
      const glowRect = glowRectRefs[idx].current
      const topLine = topLineRefs[idx].current

      if (colRect && clipRect && glowRect && topLine) {
        gsap.to([colRect, clipRect, glowRect], {
          attr: { y: colY, height: colHeight },
          duration: reduceMotion ? 0 : 0.55,
          delay: idx * 0.05,
          ease: "power3.out",
        })

        gsap.to(topLine, {
          attr: { y1: colY + 0.5, y2: colY + 0.5 },
          duration: reduceMotion ? 0 : 0.55,
          delay: idx * 0.05,
          ease: "power3.out",
        })
      }
    })
  }

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showMenu])

  return (
    <div
      ref={widgetRef}
      className="relative w-[340px] sm:w-[350px] aspect-square bg-[#0b0c0e] text-white rounded-[28px] pt-6 px-6 pb-5 shadow-2xl flex flex-col justify-between select-none overflow-hidden border border-white/[0.08]"
      style={{
        boxShadow:
          "0 24px 50px -12px rgba(0, 0, 0, 0.92), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Subtle top ambient rim light */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

      {/* TOP HEADER SECTION */}
      <div className="relative z-10">
        {/* Title & Options Menu */}
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] sm:text-[16px] font-medium text-white">
            Growth
          </h2>

          <div ref={menuRef} className="relative">
            {/* When menu is closed, show sleek 3-dots button. When opened, reveal the exact pill selector */}
            {!showMenu ? (
              <button
                type="button"
                onClick={() => setShowMenu(true)}
                aria-label="Options"
                className="p-1 -mr-1 text-[#71717a] hover:text-white transition-colors duration-150 cursor-pointer focus:outline-none"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            ) : (
              /* The exact pill segmented control from user's reference */
              <div className="flex items-center bg-[#17181c] border border-white/[0.12] rounded-full p-0.5 shadow-xl transition-all">
                {(["1M", "6M", "1Y"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => handlePeriodChange(period)}
                    className={`px-3 py-0.5 text-[11px] font-medium rounded-full transition-all cursor-pointer ${
                      selectedPeriod === period
                        ? "bg-[#2b2c31] text-white shadow-sm"
                        : "text-[#8e8e93] hover:text-white"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-[12.5px] sm:text-[13px] text-[#8e8e93] font-normal mt-0.5">
          Celebrate your financial success
        </p>

        {/* Crisp horizontal divider line */}
        <div className="w-full h-px bg-white/[0.07] my-3.5" />

        {/* Value + Growth Indicator */}
        <div className="flex items-baseline gap-2">
          <span
            ref={amountRef}
            className="text-[22px] sm:text-[23px] font-bold text-white tabular-nums leading-none"
          >
            {displayAmount}
          </span>
          <span
            ref={changeRef}
            className="text-[12.5px] sm:text-[13px] font-semibold text-[#10b981] leading-none"
          >
            {displayChange}
          </span>
        </div>
      </div>

      {/* BOTTOM DOT MATRIX CHART SECTION */}
      <div className="relative w-full flex items-end justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Luminous Bottom Wash Gradient (smooth continuous fade rising from base) */}
            <linearGradient id="bottomGlow" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
              <stop offset="16%" stopColor="#ffffff" stopOpacity="0.72" />
              <stop offset="36%" stopColor="#ffffff" stopOpacity="0.38" />
              <stop offset="56%" stopColor="#ffffff" stopOpacity="0.12" />
              <stop offset="80%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Ambient Column Background Gradient */}
            <linearGradient id="colBgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a0b0d" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#101116" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#1f2128" stopOpacity="0.95" />
            </linearGradient>

            {/* Dynamic clipping paths for each column */}
            {[0, 1, 2].map((colIdx) => {
              const colX = colIdx * (colWidth + colGap)
              const initRows = currentPeriod.bars[colIdx].rows
              const initHeight = initRows * dotStepY + 2
              const initY = svgHeight - initHeight

              return (
                <clipPath key={`clip-${colIdx}`} id={`col-clip-${colIdx}`}>
                  <rect
                    ref={clipRectRefs[colIdx]}
                    x={colX}
                    y={initY}
                    width={colWidth}
                    height={initHeight}
                    rx="1"
                  />
                </clipPath>
              )
            })}
          </defs>

          {/* Render the 3 Columns */}
          {[0, 1, 2].map((colIdx) => {
            const colX = colIdx * (colWidth + colGap)
            const initRows = currentPeriod.bars[colIdx].rows
            const initHeight = initRows * dotStepY + 2
            const initY = svgHeight - initHeight
            const isHovered = hoveredCol === colIdx
            const isSelected = activeCol === colIdx

            return (
              <g
                key={`col-${colIdx}`}
                className="growth-column cursor-pointer group"
                onClick={() => {
                  setActiveCol(activeCol === colIdx ? null : colIdx)
                  if (amountRef.current) {
                    gsap.fromTo(
                      amountRef.current,
                      { opacity: 0.4, scale: 0.98 },
                      { opacity: 1, scale: 1, duration: 0.2, ease: "power2.out" }
                    )
                  }
                }}
                onMouseEnter={() => setHoveredCol(colIdx)}
                onMouseLeave={() => setHoveredCol(null)}
              >
                {/* 1. Column Dark Container Box (dynamically morphed by GSAP attr) */}
                <rect
                  ref={colRectRefs[colIdx]}
                  x={colX}
                  y={initY}
                  width={colWidth}
                  height={initHeight}
                  fill="url(#colBgGrad)"
                  stroke={isSelected || isHovered ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.12)"}
                  strokeWidth="1"
                  rx="1"
                  className="transition-colors duration-150"
                />

                {/* 2. Crisp Top Highlight Border on each column (glides with height) */}
                <line
                  ref={topLineRefs[colIdx]}
                  x1={colX + 1}
                  y1={initY + 0.5}
                  x2={colX + colWidth - 1}
                  y2={initY + 0.5}
                  stroke="rgba(255, 255, 255, 0.5)"
                  strokeWidth="1"
                />

                {/* 3. The Dense Matrix of Square Dots (clipped dynamically by clipPath) */}
                <g clipPath={`url(#col-clip-${colIdx})`}>
                  {Array.from({ length: maxRows }).map((_, rIdx) => {
                    // Start from the bottom row going upwards
                    const rowFromBottom = maxRows - 1 - rIdx
                    const dotY = svgHeight - 2 - dotHeight - rowFromBottom * dotStepY

                    // Dot opacity calculation to match reference lighting exactly
                    let dotOpacity = 0.65
                    if (rowFromBottom > 40) dotOpacity = 1.0
                    else if (rowFromBottom < 6) dotOpacity = 0.95
                    else if (rowFromBottom < 16) dotOpacity = 0.78
                    else dotOpacity = 0.58

                    return (
                      <g key={`r-${colIdx}-${rIdx}`}>
                        {Array.from({ length: dotsPerRow }).map((_, cIdx) => {
                          const dotX = colX + dotPaddingX + cIdx * dotStepX

                          return (
                            <rect
                              key={`d-${colIdx}-${rIdx}-${cIdx}`}
                              x={dotX}
                              y={dotY}
                              width={dotWidth}
                              height={dotHeight}
                              fill="#ffffff"
                              fillOpacity={dotOpacity}
                              rx="0.2"
                            />
                          )
                        })}
                      </g>
                    )
                  })}

                  {/* 4. Luminous White Gradient Wash (dynamically morphed with column height) */}
                  <rect
                    ref={glowRectRefs[colIdx]}
                    x={colX}
                    y={initY}
                    width={colWidth}
                    height={initHeight}
                    fill="url(#bottomGlow)"
                    style={{ mixBlendMode: "screen" }}
                    pointerEvents="none"
                  />
                </g>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

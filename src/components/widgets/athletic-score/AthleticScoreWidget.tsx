import { useState, useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useReducedMotion } from "motion/react"
import { Moon, Dumbbell, Footprints, Heart } from "lucide-react"

interface MetricItem {
  id: string
  label: string
  value: number
  unit?: string
  icon: typeof Moon
  bg: string
  color: string
}

const metricsData: MetricItem[] = [
  {
    id: "sleep",
    label: "SLEEP",
    value: 88,
    icon: Moon,
    bg: "#a3532c",
    color: "#ffffff",
  },
  {
    id: "strength",
    label: "STRENGTH",
    value: 170,
    unit: "lbs",
    icon: Dumbbell,
    bg: "#4d5d36",
    color: "#ffffff",
  },
  {
    id: "steps",
    label: "STEPS",
    value: 1982,
    icon: Footprints,
    bg: "#7a64aa",
    color: "#ffffff",
  },
  {
    id: "vo2max",
    label: "VO2 MAX",
    value: 52,
    icon: Heart,
    bg: "#5a8c9e",
    color: "#ffffff",
  },
]

export default function AthleticScoreWidget() {
  const reduceMotion = useReducedMotion()
  const [score, setScore] = useState(13)
  const [metrics, setMetrics] = useState(metricsData)
  const widgetRef = useRef<HTMLDivElement>(null)
  const scoreNumRef = useRef<HTMLSpanElement>(null)

  // Staggered entrance animation for widget internals
  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, {
        scale: 0.94,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      })
    },
    { scope: widgetRef }
  )

  // Subtle interactive score increment
  const handleScoreClick = () => {
    setScore((prev) => {
      const next = prev >= 99 ? 1 : prev + 1
      if (scoreNumRef.current) {
        gsap.fromTo(
          scoreNumRef.current,
          { opacity: 0.7, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.25, ease: "power2.out" }
        )
      }
      return next
    })
  }

  const handleMetricClick = (index: number) => {
    setMetrics((prev) => {
      const updated = [...prev]
      const target = updated[index]
      if (target.id === "steps") {
        target.value = target.value + 10
      } else if (target.id === "strength") {
        target.value = target.value + 5
      } else {
        target.value = target.value >= 99 ? 50 : target.value + 1
      }
      return updated
    })
  }

  // Matrix total dots: 6 rows x 11 cols = 66 dots
  // The bottom-left 6 dots (bottom 2 rows x first 3 columns) are highlighted yellow (#e4ff1a)
  const rows = 6
  const cols = 11

  return (
    <div
      ref={widgetRef}
      className="relative w-[380px] sm:w-[420px] aspect-[16/9] bg-[#141414] text-white rounded-[32px] p-6 shadow-2xl flex select-none overflow-hidden border border-white/[0.04]"
      style={{
        boxShadow:
          "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)",
      }}
    >
      {/* Left Column: Athletic Score + Dots Matrix */}
      <div className="w-[42%] flex flex-col justify-between pr-3">
        {/* Top: Score Section */}
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-[#6e6e6e] uppercase font-mono">
            ATHLETIC SCORE
          </span>
          <button
            onClick={handleScoreClick}
            type="button"
            className="text-left cursor-pointer focus:outline-none -mt-0.5 group"
          >
            <span
              ref={scoreNumRef}
              className="inline-block text-[58px] leading-none font-bold text-white transition-colors group-hover:text-slate-200"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {score}
            </span>
          </button>
        </div>

        {/* Bottom: 6x11 Dot Matrix */}
        <div className="flex flex-col gap-[4.5px] pb-1">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <div key={`row-${rIdx}`} className="flex gap-[4.5px] items-center">
              {Array.from({ length: cols }).map((_, cIdx) => {
                // Bottom 2 rows are rIdx === 4, 5 and left 3 columns are cIdx 0, 1, 2
                const isHighlighted = (rIdx === 4 || rIdx === 5) && cIdx < 3
                return (
                  <span
                    key={`dot-${rIdx}-${cIdx}`}
                    className={`w-[4.5px] h-[4.5px] rounded-full transition-colors duration-200 ${
                      isHighlighted
                        ? "bg-[#e4ff1a] shadow-[0_0_6px_rgba(228,255,26,0.6)]"
                        : "bg-[#252525]"
                    }`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: 4 Metrics Rows */}
      <div className="w-[58%] flex flex-col justify-between py-0.5">
        {metrics.map((item, index) => {
          const Icon = item.icon
          const isLast = index === metrics.length - 1

          return (
            <div
              key={item.id}
              onClick={() => handleMetricClick(index)}
              className="flex flex-col justify-center flex-1 cursor-pointer group"
            >
              <div className="flex items-center justify-between py-1">
                {/* Left: Icon circle & Label */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: item.bg }}
                  >
                    <Icon
                      className="w-3.5 h-3.5 text-white stroke-[2.2]"
                      style={{
                        transform: item.id === "sleep" ? "rotate(-15deg)" : undefined,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-white font-mono">
                    {item.label}
                  </span>
                </div>

                {/* Right: Value (+ Unit) */}
                <div className="flex items-baseline gap-1 text-right">
                  <span className="text-[17px] font-semibold text-white">
                    {item.value}
                  </span>
                  {item.unit && (
                    <span className="text-[11px] font-normal text-[#8e8e8e]">
                      {item.unit}
                    </span>
                  )}
                </div>
              </div>

              {/* Row Divider */}
              {!isLast && (
                <div className="w-full h-[1px] bg-[#222222] mt-1" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

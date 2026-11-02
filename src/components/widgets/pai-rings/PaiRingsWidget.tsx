import { useState, useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { GSAP_EASE } from "@/lib/motion"
import { useReducedMotion } from "motion/react"
import { ArrowUp, Moon, Heart } from "lucide-react"

export default function PaiRingsWidget() {
  const reduceMotion = useReducedMotion()
  const [pai, setPai] = useState(16)
  const [sleepHours] = useState(7)
  const [sleepMins, setSleepMins] = useState(2)
  const [heartRate, setHeartRate] = useState(56)

  const widgetRef = useRef<HTMLDivElement>(null)
  const paiNumRef = useRef<HTMLSpanElement>(null)

  // GSAP entrance
  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, {
        scale: 0.95,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
      })
    },
    { scope: widgetRef }
  )

  const handlePaiClick = () => {
    setPai((prev) => {
      const next = prev >= 99 ? 10 : prev + 1
      if (paiNumRef.current) {
        gsap.fromTo(
          paiNumRef.current,
          { scale: 0.92, opacity: 0.7 },
          { scale: 1, opacity: 1, duration: 0.25, ease: GSAP_EASE.easeOutBack }
        )
      }
      return next
    })
  }

  const handleSleepClick = () => {
    setSleepMins((prev) => (prev >= 55 ? 5 : prev + 5))
  }

  const handleHeartClick = () => {
    setHeartRate((prev) => (prev >= 85 ? 52 : prev + 2))
  }

  return (
    <div
      ref={widgetRef}
      className="relative w-[416px] h-[234px] bg-[#161616] text-white rounded-[36px] p-6 shadow-2xl flex select-none overflow-hidden border border-white/[0.04]"
      style={{
        boxShadow:
          "0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)",
      }}
    >
      {/* Left Column: Date Header + Metrics */}
      <div className="w-[50%] flex flex-col justify-between py-1 z-10">
        {/* Date Title */}
        <div className="text-[25px] font-bold text-white flex items-center gap-2">
          <span>Today</span>
          <span className="text-white/40 text-[18px] font-normal">•</span>
          <span>21 Feb</span>
        </div>

        {/* Metrics List */}
        <div className="space-y-4 pt-1">
          {/* Sleep Time Row */}
          <div
            onClick={handleSleepClick}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            {/* Glowing Blue Moon Icon */}
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <Moon className="w-6 h-6 text-[#4a72ec] stroke-[2.4] fill-[#22356c] -rotate-12 drop-shadow-[0_0_8px_rgba(74,114,236,0.6)]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[18px] font-bold text-white">
                  {sleepHours}h {sleepMins}m
                </span>
                <span className="text-[12px] font-bold text-[#34d399] flex items-center gap-0.5" aria-label="Up 12%">
                  12%
                  <ArrowUp className="h-3 w-3 stroke-[2.6]" />
                </span>
              </div>
              <span className="text-[13px] font-medium text-[#737373] leading-none mt-0.5">
                Sleep time
              </span>
            </div>
          </div>

          {/* Avg Heart Rate Row */}
          <div
            onClick={handleHeartClick}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            {/* Glowing Red Heart Icon */}
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 text-[#ef4444] stroke-[2.4] fill-[#ef4444] drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[18px] font-bold text-white leading-snug">
                {heartRate} bpm
              </span>
              <span className="text-[13px] font-medium text-[#737373] leading-none mt-0.5">
                Avg. heart rate
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section: Rings centered at (375, 142) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="w-full h-full"
          viewBox="0 0 440 210"
          fill="none"
        >
          {/* Center of all rings and white circle: cx = 375, cy = 142 */}

          {/* Dark Concentric Guide Tracks */}
          <circle cx="375" cy="142" r="142" stroke="#1d1d1d" strokeWidth="24" fill="none" />
          <circle cx="375" cy="142" r="114" stroke="#1d1d1d" strokeWidth="24" fill="none" />
          <circle cx="375" cy="142" r="86" stroke="#1d1d1d" strokeWidth="24" fill="none" />

          {/* 1. Outer Blue Ring (r = 142):
              Starts around 110° (bottom, x=326, y=275).
              Sweeps CLOCKWISE to angle 175° (left-middle, x=233, y=130). */}
          <path
            d="M 326 275 A 142 142 0 0 1 233 130"
            stroke="#38bdf8"
            strokeWidth="24"
            strokeLinecap="round"
            fill="none"
          />

          {/* Outer Badge (31): Pill circle centered right at (233, 130) */}
          <g transform="translate(233, 130)">
            <circle cx="0" cy="0" r="10.5" fill="#38bdf8" />
            <text
              x="0"
              y="3.5"
              fill="#082f49"
              fontSize="10.5"
              fontWeight="900"
              textAnchor="middle"
            >
              31
            </text>
          </g>

          {/* 2. Middle Green Ring (r = 114):
              Starts around 105° (bottom, x=345, y=252).
              Sweeps CLOCKWISE past 180° through the top to ~325° (top-right, x=382, y=28). */}
          <path
            d="M 345 252 A 114 114 0 0 1 382 28"
            stroke="#4ade80"
            strokeWidth="24"
            strokeLinecap="round"
            fill="none"
          />

          {/* Middle Badge (84): Pill circle centered right at (382, 28) */}
          <g transform="translate(382, 28)">
            <circle cx="0" cy="0" r="10.5" fill="#4ade80" />
            <text
              x="0"
              y="3.5"
              fill="#052e16"
              fontSize="10.5"
              fontWeight="900"
              textAnchor="middle"
            >
              84
            </text>
          </g>

          {/* 3. Inner Red/Coral Ring (r = 86):
              Starts around 95° (bottom, x=368, y=228).
              Sweeps CLOCKWISE around left to angle 245° (top-left, x=339, y=64). */}
          <path
            d="M 368 228 A 86 86 0 0 1 339 64"
            stroke="#f43f5e"
            strokeWidth="24"
            strokeLinecap="round"
            fill="none"
          />

          {/* Inner Badge (53): Pill circle centered right at (339, 64) */}
          <g transform="translate(339, 64)">
            <circle cx="0" cy="0" r="10.5" fill="#f43f5e" />
            <text
              x="0"
              y="3.5"
              fill="#4c0519"
              fontSize="10.5"
              fontWeight="900"
              textAnchor="middle"
            >
              53
            </text>
          </g>
        </svg>

        {/* Center Circular White PAI Disc:
            Radius = 66px, Diameter = 132px.
            Centered at cx = 375, cy = 142.
            Left = 375 - 66 = 309px. Top = 142 - 66 = 76px.
            Right edge reaches 309 + 132 = 441px (fully cut off by widget border at 440px).
            Bottom reaches 76 + 132 = 208px (sits right at bottom-right corner). */}
        <div
          onClick={handlePaiClick}
          className="absolute w-[132px] h-[132px] rounded-full bg-white text-black flex flex-col items-center justify-center shadow-[-14px_0_32px_rgba(0,0,0,0.65)] pointer-events-auto cursor-pointer hover:scale-[1.01] transition-transform select-none"
          style={{
            left: "309px",
            top: "76px",
          }}
        >
          {/* Offset text slightly to the left (-9px) to be optically centered in the visible arc */}
          <div className="flex flex-col items-center -translate-x-[14px] -translate-y-[4px]">
            <span
              ref={paiNumRef}
              className="text-[44px] leading-none font-bold text-[#111111]"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {pai}
            </span>
            <span
              className="text-[15px] font-extrabold text-[#111111] mt-1"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              PAI
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

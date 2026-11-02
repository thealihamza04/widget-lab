import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { ArrowUpRight, BellRing, Clock3, MapPin, Zap } from "lucide-react"
import { NumberMorph } from "@/components/custom"
import { cssEase, DURATION, EASE, GSAP_EASE } from "@/lib/motion"
import { BikeArt } from "../shared/BikeArt"
import { cn } from "@/lib/utils"

/* ── Data (simulated: a browser can't talk to the bike) ─────────────────── */

const BIKE = { name: "Cruiser ST", serial: "4729402043", tripKm: 65, rideMin: 42, powerW: 150, battery: 27, fullRangeKm: 68 }
const KM_TO_MI = 0.621371
const FT_TO_M = 0.3048
const TICKS = 56
const BASE_W = 416, BASE_H = 234

const SM_QUERY = "(min-width: 640px)"
const subscribeSm = (cb: () => void) => {
  const mq = window.matchMedia(SM_QUERY)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
const useWide = () => useSyncExternalStore(subscribeSm, () => window.matchMedia(SM_QUERY).matches, () => true)

const angleGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

export default function BikeTrackerWidget() {
  const reduceMotion = useReducedMotion()
  const W = useWide() ? BASE_W : 352
  const scale = W / BASE_W

  const widgetRef = useRef<HTMLDivElement>(null)
  const [miles, setMiles] = useState(false)
  const [meters, setMeters] = useState(false)
  const [showRange, setShowRange] = useState(false)
  const [ringing, setRinging] = useState(false)
  // bearing to the bike relative to the phone, degrees clockwise from up
  const [nav, setNav] = useState({ bearing: 45, feet: 15 })
  const ringTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const id = window.setInterval(() => {
      setNav((n) => ({
        bearing: n.bearing + (Math.random() - 0.5) * 24,
        feet: Math.max(4, Math.min(60, Math.round(n.feet + (Math.random() - 0.55) * 4))),
      }))
    }, 1600)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(ringTimer.current)
    }
  }, [])

  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, { y: 12, opacity: 0, duration: DURATION.enter, ease: GSAP_EASE.easeOutQuart })
    },
    { scope: widgetRef }
  )

  const press = (el: HTMLElement | null) => {
    if (!el || reduceMotion) return
    gsap.fromTo(el, { scale: 0.95 }, { scale: 1, duration: DURATION.press, ease: GSAP_EASE.easeOutQuad })
  }

  const ring = () => {
    setRinging(true)
    window.clearTimeout(ringTimer.current)
    ringTimer.current = window.setTimeout(() => setRinging(false), 2200)
  }

  const swap = reduceMotion
    ? { initial: false as const, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 4, filter: "blur(2px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -4, filter: "blur(2px)" },
        transition: { duration: DURATION.micro, ease: EASE.fade },
      }

  const trip = miles ? Math.round(BIKE.tripKm * KM_TO_MI * 10) / 10 : BIKE.tripKm
  const distance = meters ? Math.round(nav.feet * FT_TO_M * 10) / 10 : nav.feet
  const rangeKm = Math.round((BIKE.fullRangeKm * BIKE.battery) / 100)
  const bars = 28
  const filled = Math.round((BIKE.battery / 100) * bars)
  const heading = ((nav.bearing % 360) + 360) % 360
  // smooth needle: CSS transition with an easings.net curve (it follows live data, it's not a click spin)
  const needle = { transition: reduceMotion ? "none" : `transform 900ms ${cssEase("easeInOutCubic")}` }

  return (
    <div style={{ width: W, height: (W * 9) / 16 }} className="relative">
      {/* scale lives on its own wrapper so React never fights GSAP over the inner element's transform */}
      <div style={{ width: BASE_W, height: BASE_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
      <div
        ref={widgetRef}
        style={{ width: BASE_W, height: BASE_H }}
        className="relative select-none rounded-[34px] bg-white p-[7px] text-[#111214] shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_24px_48px_-16px_rgba(0,0,0,0.35)]"
      >
        <div className="flex h-full flex-col gap-[4px] overflow-hidden rounded-[28px]">
          {/* Header */}
          <div className="flex h-[58px] shrink-0 items-center justify-between rounded-t-[28px] bg-[#f4f4f5] px-[18px]">
            <div className="flex flex-col">
              <span className="text-[17px] font-semibold leading-tight">{BIKE.name}</span>
              <span className="text-[11px] tabular-nums text-[#8a8a8f]">{BIKE.serial}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  press(e.currentTarget)
                  setMiles((m) => !m)
                }}
                aria-label={`Trip ${trip} ${miles ? "miles" : "kilometres"}. Switch units`}
                className="flex h-[26px] items-center gap-1 rounded-full bg-white px-2.5 text-[11px] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.08)] outline-none ring-1 ring-inset ring-black/[0.04] focus-visible:ring-2 focus-visible:ring-black/30"
              >
                <MapPin className="h-3 w-3 fill-[#6b6b70] stroke-white stroke-[2]" />
                <span data-number-morph="" className="flex items-baseline tabular-nums">
                  <NumberMorph value={trip} />
                  <span>{miles ? "mi" : "km"}</span>
                </span>
              </button>
              <span className="flex h-[26px] items-center gap-1 rounded-full bg-white px-2.5 text-[11px] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-inset ring-black/[0.04]" aria-label={`Ride time ${BIKE.rideMin} minutes`}>
                <Clock3 className="h-3 w-3 fill-[#6b6b70] stroke-white stroke-[2]" />
                {BIKE.rideMin}m
              </span>
              <span className="flex h-[26px] items-center gap-0.5 rounded-full bg-white px-2.5 text-[11px] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-inset ring-black/[0.04]" aria-label={`Motor power ${BIKE.powerW} watts`}>
                <Zap className="h-3 w-3 fill-[#3a3a3d] stroke-[#3a3a3d]" />
                {BIKE.powerW}w
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 gap-[4px]">
            {/* Bike + battery */}
            <div className="relative flex w-[234px] shrink-0 flex-col rounded-bl-[28px] bg-[#f7f7f8] px-[14px] pb-[12px] pt-[10px]">
              <BikeArt variant="ebike" className="mx-auto h-[96px] w-auto" />
              <button
                type="button"
                onClick={() => setShowRange((r) => !r)}
                aria-label={`Battery ${BIKE.battery}%, about ${rangeKm} km range. ${showRange ? "Show percent" : "Show range"}`}
                className="relative mt-auto rounded-md pt-[18px] outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                <span
                  className="absolute top-0 -translate-x-1/2 rounded-full bg-[#e6e6e8] px-1.5 py-[2px] text-[11px] font-semibold tabular-nums shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                  style={{ left: `${((filled - 0.5) / bars) * 100}%` }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={showRange ? "range" : "pct"} {...swap} className="block whitespace-nowrap">
                      {showRange ? `≈${rangeKm} km` : `${BIKE.battery}%`}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className="flex h-[22px] items-stretch justify-between">
                  {Array.from({ length: bars }, (_, i) => (
                    <span
                      key={i}
                      className={cn("w-[4px] rounded-full", i < filled ? "" : "bg-[#e3e3e5]")}
                      style={i < filled ? { background: `linear-gradient(to bottom, #6b6b70, #111113)` } : undefined}
                    />
                  ))}
                </span>
              </button>
            </div>

            {/* Finder */}
            <div className="flex flex-1 flex-col items-center justify-center gap-[10px] rounded-br-[28px] bg-[#f7f7f8]">
              <button
                type="button"
                onClick={(e) => {
                  press(e.currentTarget)
                  ring()
                }}
                aria-label={ringing ? "Ringing the bike" : "Ring the bike to find it"}
                className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-[#f1f1f2] shadow-[0_8px_18px_-6px_rgba(0,0,0,0.18),inset_0_1px_0_#fff] outline-none ring-1 ring-black/[0.04] focus-visible:ring-2 focus-visible:ring-black/30"
              >
                <span className="absolute inset-[9px] rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]" />
                <svg viewBox="0 0 100 100" className="absolute inset-[9px]" aria-hidden>
                  {Array.from({ length: TICKS }, (_, i) => {
                    const a = (i / TICKS) * 360
                    const near = Math.max(0, 1 - angleGap(a, heading) / 28)
                    const rad = ((a - 90) * Math.PI) / 180
                    return (
                      <line
                        key={i}
                        x1={50 + Math.cos(rad) * 41}
                        y1={50 + Math.sin(rad) * 41}
                        x2={50 + Math.cos(rad) * (near > 0 ? 47 : 45)}
                        y2={50 + Math.sin(rad) * (near > 0 ? 47 : 45)}
                        stroke={near > 0 ? `rgba(20,20,22,${0.35 + near * 0.6})` : "rgba(0,0,0,0.12)"}
                        strokeWidth={near > 0 ? 1.6 : 1}
                        strokeLinecap="round"
                        style={{ transition: reduceMotion ? "none" : `stroke 600ms ${cssEase("easeOutCubic")}` }}
                      />
                    )
                  })}
                </svg>
                <AnimatePresence mode="wait" initial={false}>
                  {ringing ? (
                    <motion.span key="bell" {...swap} className="relative">
                      <BellRing className="h-6 w-6 text-[#3a3a3d] stroke-[2]" />
                    </motion.span>
                  ) : (
                    <motion.span key="arrow" {...swap} className="relative">
                      <span className="block" style={{ transform: `rotate(${nav.bearing - 45}deg)`, ...needle }}>
                        <ArrowUpRight className="h-7 w-7 text-[#5a5a5f] stroke-[2.4]" />
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <button
                type="button"
                onClick={() => setMeters((m) => !m)}
                aria-label={`${distance} ${meters ? "metres" : "feet"} away. Switch units`}
                className="flex h-[26px] items-center rounded-full bg-white px-3 text-[12px] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.08)] outline-none ring-1 ring-inset ring-black/[0.04] focus-visible:ring-2 focus-visible:ring-black/30"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {ringing ? (
                    <motion.span key="ring" {...swap}>Ringing…</motion.span>
                  ) : (
                    <motion.span key="dist" {...swap} data-number-morph="" className="flex items-baseline gap-0.5 tabular-nums">
                      <NumberMorph value={distance} />
                      <span>{meters ? "m" : "ft"} away</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

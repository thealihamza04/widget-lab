import { useCallback, useEffect, useRef, useState } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { Pause, Play, RotateCcw } from "lucide-react"
import { NumberMorph } from "@/components/custom"
import { DURATION, EASE, GSAP_EASE } from "@/lib/motion"
import { cn } from "@/lib/utils"

type Status = "idle" | "running" | "paused" | "done"

const PRESETS = [5, 10, 20] as const
const MINUTE = 60_000

// Ring geometry (SVG user units)
const RING_R = 78
const RING_C = 2 * Math.PI * RING_R

const formatClock = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function StandbyTimerWidget() {
  const reduceMotion = useReducedMotion()

  const widgetRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<HTMLButtonElement>(null)
  const arcRef = useRef<SVGCircleElement>(null)

  // Opens mid-run like the reference: 16:15 left of a 20 min timer
  const [durationMs, setDurationMs] = useState(20 * MINUTE)
  const [status, setStatus] = useState<Status>("running")
  const [remainingMs, setRemainingMs] = useState(16 * MINUTE + 15_000)
  const endAt = useRef(0)

  // Draws the remaining arc straight onto the SVG every frame (no React re-render per frame)
  const paintRing = useCallback(
    (remaining: number) => {
      const arc = arcRef.current
      if (!arc) return
      const left = Math.max(0, Math.min(1, remaining / durationMs))
      arc.style.strokeDasharray = `${left * RING_C} ${RING_C}`
      arc.style.strokeDashoffset = `${-(1 - left) * RING_C}`
      arc.style.opacity = left > 0 ? "1" : "0"
    },
    [durationMs]
  )

  useEffect(() => {
    if (status !== "running") {
      paintRing(remainingMs)
      return
    }
    // first run (the widget opens mid-countdown) has no end time yet
    if (!endAt.current) endAt.current = Date.now() + remainingMs
    let frame = 0
    let shownSecond = Math.ceil(remainingMs / 1000)
    const tick = () => {
      const left = Math.max(0, endAt.current - Date.now())
      paintRing(left)
      const second = Math.ceil(left / 1000)
      if (second !== shownSecond) {
        shownSecond = second
        setRemainingMs(left)
      }
      if (left <= 0) {
        setRemainingMs(0)
        setStatus("done")
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // remainingMs is read once when a run starts; the loop owns it afterwards
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, paintRing])

  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, {
        y: 10,
        opacity: 0,
        duration: DURATION.enter,
        ease: GSAP_EASE.easeOutQuart,
      })
    },
    { scope: widgetRef }
  )

  const pressFeedback = (el: HTMLElement | null) => {
    if (!el || reduceMotion) return
    gsap.fromTo(el, { scale: 0.94 }, { scale: 1, duration: DURATION.press, ease: GSAP_EASE.easeOutQuad })
  }

  const start = (ms: number) => {
    endAt.current = Date.now() + ms
    setRemainingMs(ms)
    setStatus("running")
  }

  const handleCenter = () => {
    pressFeedback(centerRef.current)
    if (status === "running") {
      setRemainingMs(Math.max(0, endAt.current - Date.now()))
      setStatus("paused")
    } else if (status === "done") {
      start(durationMs)
    } else {
      start(remainingMs)
    }
  }

  const handleStop = () => {
    setStatus("idle")
    setRemainingMs(durationMs)
  }

  const handlePreset = (minutes: number) => {
    const ms = minutes * MINUTE
    setDurationMs(ms)
    setRemainingMs(ms)
  }

  const label =
    status === "paused" ? "Paused" : status === "done" ? "Time's up" : "Timer"
  const CenterIcon = status === "running" ? Pause : status === "done" ? RotateCcw : Play
  const centerLabel =
    status === "running" ? "Pause timer" : status === "done" ? "Restart timer" : status === "paused" ? "Resume timer" : "Start timer"
  const swap = reduceMotion
    ? { initial: false as const, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 6, filter: "blur(3px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -6, filter: "blur(3px)" },
        transition: { duration: DURATION.view, ease: EASE.fade },
      }

  return (
    <div
      ref={widgetRef}
      className="relative w-[352px] sm:w-[416px] aspect-video rounded-[34px] sm:rounded-[40px] bg-black ring-1 ring-white/[0.08] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)] p-2.5 sm:p-3.5 flex gap-3 sm:gap-4 select-none text-white overflow-hidden"
    >
      {/* Left: label, countdown, and either Stop or the presets */}
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col pl-3.5 sm:pl-4 pt-4 sm:pt-5 pb-2.5 sm:pb-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={label}
            {...swap}
            aria-live="polite"
            className={cn(
              "text-[12px] sm:text-[14px] font-medium leading-none",
              status === "done" ? "text-[#16d4ff]" : "text-white/55"
            )}
          >
            {label}
          </motion.span>
        </AnimatePresence>

        <span
          role="timer"
          aria-label={`${formatClock(remainingMs)} remaining`}
          className={cn(
            "mt-2 sm:mt-2.5 text-[44px] sm:text-[54px] font-light leading-none tabular-nums transition-opacity duration-200",
            status === "paused" ? "text-white/60" : "text-white"
          )}
        >
          <NumberMorph value={formatClock(remainingMs)} />
        </span>

        {/* Fixed-height slot so swapping Stop ↔ presets never moves the clock */}
        <div className="relative mt-auto h-[34px] sm:h-[40px]">
          <AnimatePresence mode="wait" initial={false}>
            {status === "idle" ? (
              <motion.div
                key="presets"
                {...swap}
                className="absolute inset-0 flex items-center gap-2"
              >
                {/* Segmented control: compact enough for the narrow column at every size */}
                <div
                  role="radiogroup"
                  aria-label="Timer length in minutes"
                  className="flex h-full items-center rounded-[11px] sm:rounded-[12px] bg-white/[0.1] p-[3px]"
                >
                  {PRESETS.map((m) => {
                    const active = durationMs === m * MINUTE
                    return (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`${m} minutes`}
                        onClick={(e) => {
                          pressFeedback(e.currentTarget)
                          handlePreset(m)
                        }}
                        className={cn(
                          "h-full w-[30px] sm:w-[36px] rounded-[8px] sm:rounded-[9px] text-[12px] sm:text-[14px] font-medium tabular-nums transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#16d4ff]/60",
                          active ? "bg-[#194d6b] text-[#16d4ff]" : "text-white/60 hover:text-white"
                        )}
                      >
                        {m}
                      </button>
                    )
                  })}
                </div>
                <span className="text-[11px] sm:text-[13px] font-medium text-white/40">min</span>
              </motion.div>
            ) : (
              <motion.div key="stop" {...swap} className="absolute inset-0 flex items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    pressFeedback(e.currentTarget)
                    handleStop()
                  }}
                  className="h-full w-[108px] sm:w-[120px] rounded-[11px] sm:rounded-[12px] bg-[#2c2c2e] hover:bg-[#3a3a3c] text-[14px] sm:text-[16px] font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  {status === "done" ? "Reset" : "Stop"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: progress ring with the play/pause control */}
      <div className="relative h-full aspect-square shrink-0 rounded-[26px] sm:rounded-[30px] bg-[#194d6b] flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="absolute inset-[9%] w-[82%] h-[82%] -rotate-90" aria-hidden>
          <circle cx="100" cy="100" r={RING_R} fill="none" stroke="#10364c" strokeWidth="20" />
          <circle
            ref={arcRef}
            cx="100"
            cy="100"
            r={RING_R}
            fill="none"
            stroke="#16d4ff"
            strokeWidth="20"
            strokeLinecap="round"
          />
        </svg>
        <button
          ref={centerRef}
          type="button"
          onClick={handleCenter}
          aria-label={centerLabel}
          className="relative z-10 w-[46%] h-[46%] rounded-full bg-black flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#16d4ff]/70"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={status === "running" ? "pause" : status === "done" ? "restart" : "play"}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.7 }}
              transition={{ duration: DURATION.micro, ease: EASE.fade }}
              className="flex"
            >
              <CenterIcon
                className={cn(
                  "w-7 h-7 sm:w-9 sm:h-9 text-white",
                  CenterIcon === RotateCcw ? "stroke-[2.4]" : "fill-white stroke-[1.5]"
                )}
              />
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </div>
  )
}

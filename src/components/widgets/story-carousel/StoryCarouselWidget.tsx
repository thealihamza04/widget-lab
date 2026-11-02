import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { Camera, Footprints, MoonStar, Pause, Play, RotateCw, Timer, type LucideIcon } from "lucide-react"
import { NumberMorph } from "@/components/custom"
import { DURATION, EASE, GSAP_EASE, SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

/* ── Slides: a weekly recap story ─────────────────────────────────────── */

type Slide = { id: string; icon: LucideIcon; kicker: string; value: string; unit: string; caption: string; tint: [string, string]; ink: string }
const SLIDES: Slide[] = [
  { id: "walk", icon: Footprints, kicker: "You walked", value: "42.6", unit: "km", caption: "8% more than last week", tint: ["#e7f3ea", "#cfe9d6"], ink: "#1f5132" },
  { id: "focus", icon: Timer, kicker: "Deep focus", value: "11", unit: "h 40m", caption: "Longest streak on Tuesday", tint: ["#e9eefb", "#d3dcf6"], ink: "#23356b" },
  { id: "photos", icon: Camera, kicker: "Photos taken", value: "38", unit: "shots", caption: "Most at golden hour", tint: ["#fbefe4", "#f6dcc4"], ink: "#6b3a12" },
  { id: "sleep", icon: MoonStar, kicker: "Sleep score", value: "92", unit: "/ 100", caption: "Your best week this month", tint: ["#f1ebfa", "#e1d4f4"], ink: "#43246b" },
]
const SLIDE_MS = 5000
const BASE = 380

const SM_QUERY = "(min-width: 640px)"
const subscribeSm = (cb: () => void) => {
  const mq = window.matchMedia(SM_QUERY)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
const useWide = () => useSyncExternalStore(subscribeSm, () => window.matchMedia(SM_QUERY).matches, () => true)

type Status = "playing" | "paused" | "ended"

export default function StoryCarouselWidget() {
  const reduceMotion = useReducedMotion()
  const S = useWide() ? BASE : 350
  const scale = S / BASE

  const widgetRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [status, setStatus] = useState<Status>("paused")
  // elapsed time on the current slide survives pause/resume
  const elapsed = useRef(0)

  const paintFill = (p: number) => {
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, p))})`
  }

  const goTo = useCallback((i: number, dir?: number) => {
    setDirection(dir ?? 1)
    elapsed.current = 0
    paintFill(0)
    setIndex(i)
  }, [])

  // Progress loop: drives the active bar directly (no re-render per frame) and advances slides
  useEffect(() => {
    if (status !== "playing") return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      elapsed.current += now - last
      last = now
      const p = elapsed.current / SLIDE_MS
      paintFill(p)
      if (p >= 1) {
        if (index >= SLIDES.length - 1) {
          setStatus("ended")
          return
        }
        goTo(index + 1, 1)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const onHide = () => {
      if (document.hidden) setStatus("paused")
    }
    document.addEventListener("visibilitychange", onHide)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener("visibilitychange", onHide)
    }
  }, [status, index, goTo])

  // keep the bar in sync when paused / ended / switching slides
  useEffect(() => {
    paintFill(status === "ended" ? 1 : elapsed.current / SLIDE_MS)
  }, [status, index])

  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, { y: 12, opacity: 0, duration: DURATION.enter, ease: GSAP_EASE.easeOutQuart })
    },
    { scope: widgetRef }
  )

  const onControl = () => {
    if (buttonRef.current && !reduceMotion) {
      gsap.fromTo(buttonRef.current, { scale: 0.92 }, { scale: 1, duration: DURATION.press, ease: GSAP_EASE.easeOutQuad })
    }
    if (status === "playing") return setStatus("paused")
    if (status === "ended") goTo(0, -1)
    setStatus("playing")
  }

  const step = (d: number) => {
    const next = index + d
    if (next < 0 || next >= SLIDES.length) return
    if (status === "ended") setStatus("paused")
    goTo(next, d)
  }

  const slide = SLIDES[index]
  const ControlIcon = status === "playing" ? Pause : status === "ended" ? RotateCw : Play
  const controlLabel = status === "playing" ? "Pause" : status === "ended" ? "Replay from the start" : "Play"
  const move = reduceMotion ? { duration: 0 } : { duration: DURATION.move, ease: EASE.move }

  return (
    <div style={{ width: S, height: S }} className="relative">
      {/* scale lives on its own wrapper so React never fights GSAP over the inner element's transform */}
      <div style={{ width: BASE, height: BASE, transform: `scale(${scale})`, transformOrigin: "top left" }}>
      <div
        ref={widgetRef}
        style={{ width: BASE, height: BASE }}
        className="relative flex select-none flex-col gap-[12px] rounded-[40px] bg-white p-[14px] text-[#141416] shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_24px_48px_-16px_rgba(20,30,60,0.25)]"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1)
          if (e.key === "ArrowLeft") step(-1)
        }}
      >
        {/* Slides */}
        <div className="relative flex-1 overflow-hidden rounded-[28px] bg-[#efeff1]" aria-roledescription="carousel" aria-label="Weekly recap">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={slide.id}
              custom={direction}
              initial={reduceMotion ? false : { x: `${direction * 100}%` }}
              animate={{ x: "0%" }}
              exit={reduceMotion ? undefined : { x: `${direction * -100}%` }}
              transition={move}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.x < -50 || info.velocity.x < -400) step(1)
                else if (info.offset.x > 50 || info.velocity.x > 400) step(-1)
              }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${SLIDES.length}: ${slide.kicker} ${slide.value} ${slide.unit}`}
              className="absolute inset-0 flex cursor-grab flex-col p-[22px] will-change-transform active:cursor-grabbing"
              style={{ background: `linear-gradient(160deg, ${slide.tint[0]}, ${slide.tint[1]})`, color: slide.ink }}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70">
                <slide.icon className="h-5 w-5 stroke-[2]" />
              </span>
              <span className="mt-auto text-[13px] font-medium opacity-70">{slide.kicker}</span>
              <span data-number-morph="" className="mt-1 flex items-baseline gap-1.5 leading-none">
                <span className="text-[56px] font-semibold tabular-nums">
                  <NumberMorph value={slide.value} />
                </span>
                <span className="text-[18px] font-medium opacity-70">{slide.unit}</span>
              </span>
              <span className="mt-2 text-[13px] opacity-70">{slide.caption}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls: round play/pause/replay + pill of dots with the active slide's progress bar */}
        <div className="flex h-[64px] shrink-0 items-center gap-[12px]">
          <button
            ref={buttonRef}
            type="button"
            onClick={onControl}
            aria-label={controlLabel}
            className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full bg-[#efeff1] outline-none ring-1 ring-inset ring-black/[0.05] transition-colors duration-200 hover:bg-[#e8e8eb] focus-visible:ring-2 focus-visible:ring-black/30"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={status}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.6 }}
                transition={{ duration: DURATION.micro, ease: EASE.fade }}
                className="flex"
              >
                <ControlIcon className={cn("h-6 w-6 text-[#1b1b1d]", ControlIcon === RotateCw ? "stroke-[3]" : "fill-[#1b1b1d] stroke-[#1b1b1d] stroke-[1.5]")} />
              </motion.span>
            </AnimatePresence>
          </button>

          <div role="tablist" aria-label="Slides" className="flex h-full flex-1 items-center justify-center gap-[14px] rounded-full bg-[#efeff1] px-[22px] ring-1 ring-inset ring-black/[0.05]">
            {SLIDES.map((s, i) => {
              const active = i === index
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Slide ${i + 1}: ${s.kicker}`}
                  onClick={() => {
                    if (status === "ended") setStatus("paused")
                    goTo(i, i >= index ? 1 : -1)
                  }}
                  initial={false}
                  animate={{ width: active ? 64 : 9 }}
                  transition={reduceMotion ? { duration: 0 } : SPRING.indicator}
                  className={cn(
                    "relative h-[9px] shrink-0 overflow-hidden rounded-full outline-none focus-visible:ring-2 focus-visible:ring-black/30 focus-visible:ring-offset-2",
                    active ? "bg-[#8a8a8e]" : "bg-[#8a8a8e] hover:bg-[#6e6e72]"
                  )}
                >
                  {active && <span ref={fillRef} className="absolute inset-0 origin-left rounded-full bg-[#2a2a2c]" style={{ transform: "scaleX(0)" }} />}
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

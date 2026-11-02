import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { Check, ChevronLeft, ChevronRight, Images, X } from "lucide-react"
import { NumberMorph } from "@/components/custom"
import { DURATION, EASE, SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

/* ── Content ───────────────────────────────────────────────────────── */

const SENDER = "Photolab"
const SUBJECT = "Re: Your scans"
const EMAIL = "arkady@icloud.com"
const SCAN_COUNT = 36
const BASE = 380 // designed at 380×380; phones scale the whole tile

// Received at 3:45 pm on the most recent day that's already past that time
const receivedAt = (now: Date) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 45)
  if (d > now) d.setDate(d.getDate() - 1)
  return d
}
const receivedLabel = (d: Date, now: Date) => {
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace("AM", "am").replace("PM", "pm")
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000)
  const day = days === 0 ? "Today" : days === 1 ? "Yesterday" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${day}, ${time}`
}

/* ── Painted scans (no photo assets in the project — drop real scans in to replace) ── */

const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}
const SKIES = [
  ["#9cc4e8", "#e9d6b8"],
  ["#f3b98d", "#f7e3c4"],
  ["#7fa7d6", "#d9e6ef"],
  ["#c9a6d8", "#f2d2c4"],
  ["#a9cbe0", "#f0ead8"],
  ["#6f8fb8", "#e8c49b"],
]
const LANDS = ["#5d6b4f", "#7b6a58", "#4d5b66", "#6e7a5a", "#8a7560", "#56624b"]

// One SVG per scan: a single paint, no clip-path stacks, filters or blend modes to re-composite
function Scan({ index, className }: { index: number; className?: string }) {
  const r = (n: number) => rand(index * 7 + n)
  const [skyTop, skyLow] = SKIES[index % SKIES.length]
  const land = LANDS[(index * 5) % LANDS.length]
  const ridge = (base: number, amp: number, seed: number) =>
    `0,100 ${Array.from({ length: 7 }, (_, i) => `${(i / 6) * 100},${base - rand(index * 13 + seed + i) * amp}`).join(" ")} 100,100`
  const id = `scan-${index}`
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("block", className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="70%" stopColor={skyLow} />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0%" stopColor="#fffaeb" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#fff0d2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-cast`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffdcaa" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#281e3c" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}-sky)`} />
      <circle cx={26 + r(1) * 50} cy={20 + r(2) * 20} r="12" fill={`url(#${id}-sun)`} />
      <polygon points={ridge(62, 22, 1)} fill="#c4ccd4" opacity="0.6" />
      <polygon points={ridge(74, 16, 2)} fill={land} opacity="0.75" />
      <polygon points={ridge(88, 10, 3)} fill={land} />
      <rect width="100" height="100" fill={`url(#${id}-cast)`} />
    </svg>
  )
}

/* ── Size ──────────────────────────────────────────────────────────── */

const SM_QUERY = "(min-width: 640px)"
const subscribeSm = (cb: () => void) => {
  const mq = window.matchMedia(SM_QUERY)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
const useWide = () => useSyncExternalStore(subscribeSm, () => window.matchMedia(SM_QUERY).matches, () => true)

/* ── Widget ────────────────────────────────────────────────────────── */

export default function ScansMailWidget() {
  const reduceMotion = useReducedMotion()
  const S = useWide() ? 380 : 350
  const scale = S / BASE

  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [zoomed, setZoomed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [now] = useState(() => new Date())
  const copyTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(copyTimer.current), [])

  const received = receivedLabel(receivedAt(now), now)
  const move = reduceMotion ? { duration: 0 } : { duration: DURATION.move, ease: EASE.move }
  // Opening: the envelope + cards leave first (short, accelerating); closing: they return decelerating
  // after the viewer has cleared, so the two never fight for the same frames
  const envelope = reduceMotion
    ? { duration: 0 }
    : open
      ? { duration: DURATION.collapse, ease: EASE.exit }
      : { duration: DURATION.expand, ease: EASE.expand, delay: 0.08 }

  const go = useCallback((step: number) => {
    setZoomed(false)
    setDirection(step)
    setIndex((i) => (i + step + SCAN_COUNT) % SCAN_COUNT)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
      if (e.key === "ArrowRight") go(1)
      if (e.key === "ArrowLeft") go(-1)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, go])

  const copyEmail = () => {
    navigator.clipboard?.writeText(EMAIL)
    setCopied(true)
    window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div style={{ width: S, height: S }} className="relative">
      <div
        style={{ width: BASE, height: BASE, transform: `scale(${scale})`, transformOrigin: "top left" }}
        className="relative select-none overflow-hidden rounded-[84px] bg-[#27282d] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_30px_60px_-20px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)]"
      >
        {/* Envelope back wall (behind the cards) */}
        <motion.div
          initial={false}
          animate={open ? { y: 40, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={envelope}
          className="absolute left-[30px] right-[30px] top-[128px] h-[222px] rounded-[22px] bg-[#d9d9db] will-change-transform"
        />

        {/* Cards: tap to pull them out */}
        {/* The hit area never moves (a moving hover target flickers at its edge); only the cards inside do */}
        <button
          type="button"
          aria-label={`Open ${SCAN_COUNT} scans from ${SENDER}`}
          onClick={() => setOpen(true)}
          tabIndex={open ? -1 : 0}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          className={cn("absolute inset-0 cursor-pointer rounded-[84px] outline-none focus-visible:ring-2 focus-visible:ring-white/60", open && "pointer-events-none")}
        >
          <motion.span
            initial={false}
            animate={open ? { y: -28, scale: 1.02, opacity: 0 } : { y: hovered && !reduceMotion ? -6 : 0, scale: 1, opacity: 1 }}
            transition={open || reduceMotion ? envelope : { duration: DURATION.view, ease: EASE.fade }}
            className="absolute inset-0 will-change-transform"
          >
          <span className="absolute left-[262px] top-[88px] h-[190px] w-[62px] overflow-hidden rounded-[14px] shadow-[0_6px_16px_rgba(0,0,0,0.25)]" style={{ transform: "rotate(9deg)" }}>
            <Scan index={1} className="h-[118px] w-[150px]" />
          </span>
          <span className="absolute left-[206px] top-[52px] h-[220px] w-[86px] overflow-hidden rounded-[14px] shadow-[0_6px_16px_rgba(0,0,0,0.25)]" style={{ transform: "rotate(5deg)" }}>
            <Scan index={0} className="h-[140px] w-[150px]" />
          </span>
          {/* Letter */}
          <span className="absolute left-[46px] top-[36px] flex h-[240px] w-[184px] flex-col rounded-[14px] bg-white px-[20px] pt-[24px] text-left shadow-[0_8px_20px_rgba(0,0,0,0.25)]" style={{ transform: "rotate(-1.5deg)" }}>
            <span className="text-[17px] font-medium leading-tight text-[#b0b0b4]">From:</span>
            <span className="mt-1 text-[19px] font-semibold leading-tight text-[#141416]">{SENDER}</span>
            <span className="text-[19px] font-semibold leading-tight text-[#141416]">{SUBJECT}</span>
            <span className="mt-[24px] flex items-center justify-end gap-1 text-[#c4c4c8]">
              <Images className="h-[22px] w-[22px] stroke-[1.8]" />
              <span className="text-[20px] font-semibold tabular-nums">{SCAN_COUNT}</span>
            </span>
          </span>
          </motion.span>
        </button>

        {/* Envelope front pocket */}
        <motion.div
          initial={false}
          animate={open ? { y: 40, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={envelope}
          className="pointer-events-none absolute left-[30px] right-[30px] top-[145px] h-[205px] will-change-transform"
        >
          {/* Front is open above the V where the two flaps meet, so the letter shows through */}
          <div className="absolute inset-0" style={{ filter: "drop-shadow(0 -4px 10px rgba(0,0,0,0.22))" }}>
            <div
              className="absolute inset-0 rounded-b-[22px] bg-gradient-to-b from-[#f3f3f4] to-[#e4e4e6]"
              style={{ clipPath: "polygon(0 0, 46.9% 40%, 100% 0, 100% 100%, 0 100%)" }}
            />
          </div>
          <svg viewBox="0 0 320 205" className="absolute inset-0 h-full w-full" aria-hidden>
            {/* right flap edge + left flap crease continuing over it */}
            <path d="M320 0 L150 82" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" fill="none" />
            <path d="M0 0 L150 82" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" fill="none" />
            <path d="M150 82 L228 124" stroke="rgba(0,0,0,0.13)" strokeWidth="1.4" fill="none" />
            <path d="M0 0 L228 124 L228 205 L0 205 Z" fill="rgba(255,255,255,0.28)" />
          </svg>
        {/* Pocket text stays interactive (copy email) */}
          <div className={cn("absolute inset-x-0 top-[127px] flex flex-col items-center gap-[6px]", !open && "pointer-events-auto")}>
          <span className="text-[17px] font-medium text-[#b3b3b8]">{received}</span>
          <button
            type="button"
            onClick={copyEmail}
            aria-label={`Copy ${EMAIL}`}
            className="flex items-center gap-1.5 rounded-md px-1 text-[17px] font-medium text-[#a9a9ae] outline-none transition-colors duration-200 hover:text-[#8a8a90] focus-visible:ring-2 focus-visible:ring-black/20"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={copied ? "copied" : "email"}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: DURATION.micro, ease: EASE.fade }}
                aria-live="polite"
                className="flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-[#3aa35a] stroke-[2.4]" /> Copied
                  </>
                ) : (
                  EMAIL
                )}
              </motion.span>
            </AnimatePresence>
          </button>
          </div>

        </motion.div>

        {/* Viewer: the scans, inside the tile */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="viewer"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: reduceMotion ? { duration: 0 } : { ...SPRING.morph, delay: 0.1 } }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97, y: 10, transition: { duration: DURATION.micro, ease: EASE.exit } }}
              className="absolute inset-0 flex flex-col p-[22px] text-white will-change-transform"
            >
              <div className="flex items-center justify-between px-[10px]">
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold leading-tight">{SUBJECT}</span>
                  <span className="text-[12px] text-white/50">
                    {SENDER} · {received}
                  </span>
                </span>
                <button type="button" onClick={() => setOpen(false)} aria-label="Put scans back" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60">
                  <X className="h-4 w-4 stroke-[2.4]" />
                </button>
              </div>

              <div className="relative mt-[14px] flex-1 overflow-hidden rounded-[28px] bg-black/30">
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                  <motion.button
                    key={index}
                    type="button"
                    custom={direction}
                    aria-label={zoomed ? "Zoom out" : "Zoom in"}
                    onClick={() => setZoomed((z) => !z)}
                    initial={reduceMotion ? false : { x: `${direction * 100}%` }}
                    animate={{ x: "0%" }}
                    exit={reduceMotion ? undefined : { x: `${direction * -100}%` }}
                    transition={move}
                    drag={zoomed ? false : "x"}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.25}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -50 || info.velocity.x < -400) go(1)
                      else if (info.offset.x > 50 || info.velocity.x > 400) go(-1)
                    }}
                    className={cn("absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60", zoomed ? "cursor-zoom-out" : "cursor-grab active:cursor-grabbing")}
                  >
                    <motion.span
                      animate={{ scale: zoomed ? 1.8 : 1 }}
                      transition={reduceMotion ? { duration: 0 } : { duration: DURATION.expand, ease: EASE.expand }}
                      className="block h-full w-full"
                    >
                      <Scan index={index} className="h-full w-full" />
                    </motion.span>
                  </motion.button>
                </AnimatePresence>
              </div>

              <div className="mt-[12px] flex items-center justify-between px-[4px]">
                <button type="button" onClick={() => go(-1)} aria-label="Previous scan" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60">
                  <ChevronLeft className="h-4 w-4 stroke-[2.4]" />
                </button>
                <span data-number-morph="" className="flex items-baseline gap-1 text-[13px] tabular-nums text-white/70">
                  <NumberMorph value={index + 1} />
                  <span className="text-white/40">of {SCAN_COUNT}</span>
                </span>
                <button type="button" onClick={() => go(1)} aria-label="Next scan" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60">
                  <ChevronRight className="h-4 w-4 stroke-[2.4]" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

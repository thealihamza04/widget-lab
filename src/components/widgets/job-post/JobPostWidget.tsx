import { useEffect, useMemo, useRef, useState } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Link2,
  Mail,
  Megaphone,
  NotebookPen,
  X,
} from "lucide-react"
import { MorphContainer, NumberMorph } from "@/components/custom"
import { DURATION, EASE } from "@/lib/motion"
import { cn } from "@/lib/utils"

/*
 * Geometry (1:1 square widget):
 * The top-right corner is notched out to seat the category pill,
 * so the card silhouette is drawn as an SVG path instead of a rounded div.
 */
const SIZE = 380
const RADIUS = 34
const NOTCH_WIDTH = 126
const NOTCH_DEPTH = 44
const NOTCH_RADIUS = 14
const FOOTER_HEIGHT = 88
const PANEL_WIDTH = SIZE - 44
const CALENDAR_HEIGHT = 244
const APPLY_HEIGHT = 238

// Open/closed shadows keep the same layer count so the CSS transition interpolates;
// the first layer is a 1px ring standing in for a border (a border would shift content).
const PANEL_SHADOW_OPEN =
  "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_40px_rgba(0,0,0,0.5)]"
const PANEL_SHADOW_NONE =
  "shadow-[0_0_0_1px_rgba(255,255,255,0),0_0_0_rgba(0,0,0,0)]"
const APPLY_SHADOW_GLOW =
  "shadow-[0_0_0_1px_rgba(255,255,255,0),0_0_26px_rgba(140,243,170,0.35)]"
const MORPH_SURFACE_TRANSITION = "transition-[background-color,box-shadow] duration-300"

const NX = SIZE - NOTCH_WIDTH
const CARD_PATH = [
  `M ${RADIUS} 0`,
  `H ${NX - NOTCH_RADIUS}`,
  `A ${NOTCH_RADIUS} ${NOTCH_RADIUS} 0 0 1 ${NX} ${NOTCH_RADIUS}`,
  `V ${NOTCH_DEPTH - NOTCH_RADIUS}`,
  `A ${NOTCH_RADIUS} ${NOTCH_RADIUS} 0 0 0 ${NX + NOTCH_RADIUS} ${NOTCH_DEPTH}`,
  `H ${SIZE - RADIUS}`,
  `A ${RADIUS} ${RADIUS} 0 0 1 ${SIZE} ${NOTCH_DEPTH + RADIUS}`,
  `V ${SIZE - RADIUS}`,
  `A ${RADIUS} ${RADIUS} 0 0 1 ${SIZE - RADIUS} ${SIZE}`,
  `H ${RADIUS}`,
  `A ${RADIUS} ${RADIUS} 0 0 1 0 ${SIZE - RADIUS}`,
  `V ${RADIUS}`,
  `A ${RADIUS} ${RADIUS} 0 0 1 ${RADIUS} 0`,
  "Z",
].join(" ")

const DEADLINE = new Date(2026, 11, 24)
const DEADLINE_LABEL = `${DEADLINE.getDate()} ${DEADLINE.toLocaleDateString("en-GB", { month: "long" })}, ${DEADLINE.getFullYear()}`
const DAY_MS = 86_400_000
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]

// Annual salary band in thousands, USD base with static display rates.
const SALARY = { min: 85, max: 120 }
const CURRENCIES = [
  { code: "USD", rate: 1 },
  { code: "GBP", rate: 0.79 },
  { code: "EUR", rate: 0.92 },
] as const

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const APPLY_GRADIENT = "linear-gradient(165deg, #6ff0d2 0%, #8ef3a0 55%, #b2f56a 100%)"

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function deadlineStatus(now: Date) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((DEADLINE.getTime() - today.getTime()) / DAY_MS)
  if (days > 1) return { open: true, text: `Closes in ${days} days` }
  if (days === 1) return { open: true, text: "Closes tomorrow" }
  if (days === 0) return { open: true, text: "Closes today" }
  return {
    open: false,
    text: `Closed ${-days} ${days === -1 ? "day" : "days"} ago`,
  }
}

export default function JobPostWidget() {
  const reduceMotion = useReducedMotion()
  const morphTransition = reduceMotion ? { duration: 0 } : undefined
  const viewTransition = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8, filter: "blur(4px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -8, filter: "blur(4px)" },
        transition: { duration: DURATION.view, ease: EASE.fade },
      }

  const widgetRef = useRef<HTMLDivElement>(null)
  const salaryRef = useRef<HTMLButtonElement>(null)

  const [verifiedOpen, setVerifiedOpen] = useState(false)
  const [currencyIndex, setCurrencyIndex] = useState(0)

  // Deadline calendar
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(
    () => new Date(DEADLINE.getFullYear(), DEADLINE.getMonth(), 1)
  )
  const [monthDirection, setMonthDirection] = useState(1)

  // Application flow
  const [applyOpen, setApplyOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [portfolio, setPortfolio] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  const [applied, setApplied] = useState(false)
  const sendTimer = useRef<number | undefined>(undefined)

  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, {
        y: 12,
        scale: 0.97,
        opacity: 0,
        duration: 0.55,
        ease: "power2.out",
      })
    },
    { scope: widgetRef }
  )

  useEffect(() => () => window.clearTimeout(sendTimer.current), [])

  const currency = CURRENCIES[currencyIndex]
  const salaryMin = Math.round(SALARY.min * currency.rate)
  const salaryMax = Math.round(SALARY.max * currency.rate)

  const status = useMemo(() => deadlineStatus(new Date()), [])

  const calendarCells = useMemo(() => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const offset = (new Date(year, month, 1).getDay() + 6) % 7
    const count = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: 42 }, (_, i) => {
      const day = i - offset + 1
      return day >= 1 && day <= count ? new Date(year, month, day) : null
    })
  }, [viewMonth])

  const shiftMonth = (step: number) => {
    setMonthDirection(step)
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + step, 1))
  }

  const handleCalendarChange = (open: boolean) => {
    setCalendarOpen(open)
    if (open) {
      setViewMonth(new Date(DEADLINE.getFullYear(), DEADLINE.getMonth(), 1))
    }
  }

  const handleSalaryClick = () => {
    if (salaryRef.current && !reduceMotion) {
      gsap.fromTo(
        salaryRef.current,
        { scale: 0.97 },
        { scale: 1, duration: 0.22, ease: "power2.out" }
      )
    }
    setCurrencyIndex((i) => (i + 1) % CURRENCIES.length)
  }

  const handleApplyChange = (open: boolean) => {
    if (!open && sending) return
    setApplyOpen(open)
    if (!open) setError("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address")
      return
    }
    setError("")
    setSending(true)
    sendTimer.current = window.setTimeout(() => {
      setSending(false)
      setApplied(true)
    }, 1100)
  }

  const handleWithdraw = () => {
    setApplied(false)
    setPortfolio("")
  }

  return (
    <div
      ref={widgetRef}
      className="relative select-none text-white"
      style={{
        width: SIZE,
        height: SIZE,
        filter: "drop-shadow(0 24px 40px rgba(0,0,0,0.45))",
      }}
    >
      {/* Card surface */}
      <svg
        aria-hidden
        className="absolute inset-0"
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
      >
        <defs>
          <clipPath id="job-post-shape">
            <path d={CARD_PATH} />
          </clipPath>
          <linearGradient id="job-post-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1d3328" />
            <stop offset="42%" stopColor="#161917" />
            <stop offset="100%" stopColor="#111212" />
          </linearGradient>
          <radialGradient id="job-post-glow" cx="0.12" cy="0.1" r="0.6">
            <stop offset="0%" stopColor="#2f7a4f" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2f7a4f" stopOpacity="0" />
          </radialGradient>
          {/* Radial so the highlight fades out on every side — a clipped rect left a hard edge */}
          <radialGradient id="job-post-sheen" cx="1" cy="0" r="0.75">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g clipPath="url(#job-post-shape)">
          <rect width={SIZE} height={SIZE} fill="url(#job-post-body)" />
          <rect width={SIZE} height={SIZE} fill="url(#job-post-glow)" />
          <rect width={SIZE} height={SIZE} fill="url(#job-post-sheen)" />
          <rect
            y={SIZE - FOOTER_HEIGHT}
            width={SIZE}
            height={FOOTER_HEIGHT}
            fill="#262729"
          />
        </g>
        <path
          d={CARD_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1"
        />
      </svg>

      {/* Category pill seated in the notch */}
      <div
        className="absolute top-0 right-0 flex items-center justify-center gap-2 rounded-full bg-[#2a2b2d] text-[11.5px] font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        style={{ width: NOTCH_WIDTH - 10, height: NOTCH_DEPTH - 8 }}
      >
        <Megaphone className="size-3.5 text-[#f5cf3a]" strokeWidth={2.2} />
        <span>MARKETING</span>
      </div>

      {/* Main content */}
      <div className="absolute inset-x-0 top-0 flex flex-col px-[22px] pt-[22px]">
        {/* Company */}
        <div className="flex items-center gap-3">
          <div className="flex size-[46px] shrink-0 items-center justify-center rounded-[14px] bg-[#2dbe60] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
            <NotebookPen className="size-6 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-[16px] font-medium text-white/90">Evernote</span>
          <button
            type="button"
            onClick={() => setVerifiedOpen((v) => !v)}
            aria-expanded={verifiedOpen}
            aria-label="Verified employer"
            className="-ml-1.5 flex h-6 items-center rounded-full px-0.5 text-[#3b8cf5] outline-none focus-visible:ring-2 focus-visible:ring-[#3b8cf5]/50"
          >
            <BadgeCheck className="size-[18px] fill-[#3b8cf5] text-[#121614]" strokeWidth={2.2} />
            <AnimatePresence initial={false}>
              {verifiedOpen && (
                <motion.span
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: DURATION.view, ease: EASE.expand }}
                  className="overflow-hidden whitespace-nowrap text-[11.5px] font-medium"
                >
                  <span className="pl-1 pr-1.5">Verified employer</span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        <h2 className="mt-[18px] text-[23px] font-semibold leading-tight text-white">
          Marketing Coordinator
        </h2>

        {/* Meta row */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11.5px] text-white/40">Job Type</span>
            <span className="text-[13.5px] font-medium text-white/90">Full Time</span>
          </div>
          <div className="h-[30px] w-px bg-white/15" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[11.5px] text-white/40">Location</span>
            <span className="text-[13.5px] font-medium text-white/90">London</span>
          </div>
          <div className="h-[30px] w-px bg-white/15" />

          <MorphContainer
            isOpen={calendarOpen}
            onOpenChange={handleCalendarChange}
            // Text sits 6px inside the rounded, clipped container so the corner
            // radius can't shave the first glyph; the slot's -ml cancels that inset
            triggerWidth={148}
            triggerHeight={38}
            triggerRadius={10}
            slotClassName="-ml-1.5"
            expandedWidth={PANEL_WIDTH}
            expandedHeight={CALENDAR_HEIGHT}
            expandedRadius={22}
            anchor="top-right"
            transition={morphTransition}
            className={MORPH_SURFACE_TRANSITION}
            openClassName={cn("bg-[#1e1f21]", PANEL_SHADOW_OPEN)}
            closedClassName={cn("bg-transparent", PANEL_SHADOW_NONE)}
            trigger={({ open }) => (
              <button
                type="button"
                onClick={open}
                aria-label={`Deadline ${DEADLINE_LABEL}. ${status.text}. Open calendar`}
                className="flex h-full w-full flex-col items-start justify-center gap-0.5 rounded-[10px] pl-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <span className="text-[11.5px] text-white/40">Deadline</span>
                <span className="whitespace-nowrap text-[13.5px] font-medium text-white/90">
                  {DEADLINE_LABEL}
                </span>
              </button>
            )}
          >
            {({ close }) => (
              // Fixed-size content pinned to the anchor corner: the container reveals it
              // instead of reflowing it on every frame of the resize spring
              <div
                data-morph-content
                className="absolute top-0 right-0 flex flex-col p-3.5"
                style={{ width: PANEL_WIDTH, height: CALENDAR_HEIGHT }}
              >
                <div className="flex items-center justify-between">
                  <span className="pl-1 text-[13.5px] font-semibold text-white">
                    {viewMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => shiftMonth(-1)}
                      aria-label="Previous month"
                      className="flex size-7 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      <ChevronLeft className="size-4" strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => shiftMonth(1)}
                      aria-label="Next month"
                      className="flex size-7 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      <ChevronRight className="size-4" strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      aria-label="Close calendar"
                      className="flex size-7 items-center justify-center rounded-full bg-white/8 text-white/70 hover:bg-white/15 hover:text-white"
                    >
                      <X className="size-3.5" strokeWidth={2.4} />
                    </button>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-medium text-white/35">
                  {WEEKDAYS.map((d, i) => (
                    <span key={i}>{d}</span>
                  ))}
                </div>

                <div className="relative mt-1 h-[132px] overflow-hidden">
                  <AnimatePresence initial={false} custom={monthDirection} mode="popLayout">
                    <motion.div
                      key={viewMonth.toISOString()}
                      custom={monthDirection}
                      initial={reduceMotion ? false : { x: monthDirection * 40, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={reduceMotion ? undefined : { x: monthDirection * -40, opacity: 0 }}
                      transition={{ duration: DURATION.view, ease: EASE.move }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(_, info) => {
                        if (info.offset.x < -40) shiftMonth(1)
                        else if (info.offset.x > 40) shiftMonth(-1)
                      }}
                      className="grid h-full cursor-grab grid-cols-7 grid-rows-6 active:cursor-grabbing"
                    >
                      {calendarCells.map((date, i) => {
                        if (!date) return <span key={i} />
                        const isDeadline = sameDay(date, DEADLINE)
                        const isToday = sameDay(date, new Date())
                        return (
                          <span
                            key={i}
                            className="flex items-center justify-center"
                            aria-current={isDeadline ? "date" : undefined}
                          >
                            <span
                              className={cn(
                                "flex size-[20px] items-center justify-center rounded-full text-[11px] tabular-nums",
                                isDeadline
                                  ? "font-semibold text-[#0b1a10]"
                                  : isToday
                                    ? "font-semibold text-white ring-1 ring-white/40"
                                    : "text-white/70"
                              )}
                              style={isDeadline ? { background: APPLY_GRADIENT } : undefined}
                            >
                              {date.getDate()}
                            </span>
                          </span>
                        )
                      })}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="mt-auto flex items-center gap-1.5 pl-1 text-[11.5px] font-medium">
                  <CalendarClock
                    className={cn("size-3.5", status.open ? "text-[#8ef3a0]" : "text-[#f28b82]")}
                    strokeWidth={2.2}
                  />
                  <span className={status.open ? "text-[#8ef3a0]" : "text-[#f28b82]"}>
                    {status.text}
                  </span>
                </div>
              </div>
            )}
          </MorphContainer>
        </div>

        <p className="mt-4 text-[12px] leading-[1.62] text-white/45">
          Drive our brand narrative and grow our global community of weather
          enthusiasts. You will coordinate multi-channel campaigns and manage
          social presence to bring atmospheric clarity to everyone.
        </p>
      </div>

      {/* Footer */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-between px-[22px]"
        style={{ height: FOOTER_HEIGHT }}
      >
        <button
          ref={salaryRef}
          type="button"
          onClick={handleSalaryClick}
          aria-label={`Salary ${salaryMin}K to ${salaryMax}K ${currency.code} per year. Change currency`}
          className="rounded-lg text-[22px] font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <span className="inline-flex items-baseline gap-[5px]">
            <NumberMorph value={salaryMin} suffix="K" />
            <span>-</span>
            <NumberMorph value={salaryMax} suffix="k" />
            <span className="inline-block w-[46px] text-left">{currency.code}</span>
          </span>
        </button>

        <MorphContainer
          isOpen={applyOpen}
          onOpenChange={handleApplyChange}
          triggerWidth={138}
          triggerHeight={52}
          expandedWidth={PANEL_WIDTH}
          expandedHeight={APPLY_HEIGHT}
          expandedRadius={24}
          anchor="bottom-right"
          closeOnClickOutside={!sending}
          closeOnEscape={!sending}
          transition={morphTransition}
          // Dark surface is always present so nothing see-through shows while the trigger fades
          className={cn("bg-[#1e1f21]", MORPH_SURFACE_TRANSITION)}
          openClassName={PANEL_SHADOW_OPEN}
          closedClassName={applied ? PANEL_SHADOW_NONE : APPLY_SHADOW_GLOW}
          trigger={({ open }) => (
            <button
              type="button"
              onClick={open}
              className="flex h-full w-full items-center justify-center gap-1.5 text-[14px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              style={
                applied
                  ? { background: "#333436" }
                  : { background: APPLY_GRADIENT, color: "#0b1a10" }
              }
            >
              {applied ? (
                <>
                  <Check className="size-4 text-[#8ef3a0]" strokeWidth={2.6} />
                  <span className="text-white/90">Applied</span>
                </>
              ) : (
                <span>Apply Now</span>
              )}
            </button>
          )}
        >
          {({ close }) => (
            <div
              data-morph-content
              className="absolute right-0 bottom-0"
              style={{ width: PANEL_WIDTH, height: APPLY_HEIGHT }}
            >
            {/* Crossfade between the form and the confirmation instead of swapping instantly */}
            <AnimatePresence initial={false} mode="wait">
            {applied ? (
              <motion.div
                key="apply-success"
                {...viewTransition}
                className="flex h-full flex-col p-4"
              >
                <div className="flex items-start justify-between">
                  <motion.span
                    initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.08 }}
                  >
                    <CircleCheck className="size-9 text-[#8ef3a0]" strokeWidth={1.8} />
                  </motion.span>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="flex size-7 items-center justify-center rounded-full bg-white/8 text-white/70 hover:bg-white/15 hover:text-white"
                  >
                    <X className="size-3.5" strokeWidth={2.4} />
                  </button>
                </div>
                <div className="mt-auto flex flex-col gap-1">
                  <span className="text-[15px] font-semibold text-white">Application sent</span>
                  <span className="break-all text-[12px] leading-snug text-white/50">
                    Evernote will reply to {email.trim()}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    className="h-[42px] flex-1 rounded-full bg-white/8 text-[13px] font-medium text-white/80 hover:bg-white/12"
                  >
                    Withdraw
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="h-[42px] flex-1 rounded-full text-[13px] font-semibold text-[#0b1a10]"
                    style={{ background: APPLY_GRADIENT }}
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="apply-form"
                {...viewTransition}
                onSubmit={handleSubmit}
                noValidate
                className="flex h-full flex-col p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-semibold text-white">Apply for this role</span>
                    <span className="text-[11.5px] text-white/45">Marketing Coordinator · Evernote</span>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    disabled={sending}
                    aria-label="Cancel application"
                    className="flex size-7 items-center justify-center rounded-full bg-white/8 text-white/70 hover:bg-white/15 hover:text-white disabled:opacity-40"
                  >
                    <X className="size-3.5" strokeWidth={2.4} />
                  </button>
                </div>

                <div className="mt-auto flex flex-col gap-2">
                  <label
                    className={cn(
                      "flex h-10 items-center gap-2 rounded-[14px] border bg-white/5 px-3 transition-colors focus-within:border-[#8ef3a0]/60",
                      error ? "border-[#f28b82]/70" : "border-white/10"
                    )}
                  >
                    <Mail className="size-4 shrink-0 text-white/40" strokeWidth={2} />
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (error) setError("")
                      }}
                      disabled={sending}
                      placeholder="Email address"
                      aria-label="Email address"
                      aria-invalid={!!error}
                      className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/30"
                    />
                  </label>
                  <label className="flex h-10 items-center gap-2 rounded-[14px] border border-white/10 bg-white/5 px-3 transition-colors focus-within:border-[#8ef3a0]/60">
                    <Link2 className="size-4 shrink-0 text-white/40" strokeWidth={2} />
                    <input
                      type="url"
                      value={portfolio}
                      onChange={(e) => setPortfolio(e.target.value)}
                      disabled={sending}
                      placeholder="Portfolio or LinkedIn (optional)"
                      aria-label="Portfolio or LinkedIn URL"
                      className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/30"
                    />
                  </label>
                  <span role="alert" className="h-4 pl-1 text-[11px] text-[#f28b82]">
                    {error}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="relative mt-1 flex h-[42px] items-center justify-center gap-1.5 overflow-hidden rounded-full text-[13.5px] font-semibold text-[#0b1a10]"
                  style={{ background: APPLY_GRADIENT }}
                >
                  {sending && (
                    <motion.span
                      aria-hidden
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 1.1, ease: EASE.move }}
                      className="absolute inset-0 origin-left bg-black/10"
                    />
                  )}
                  <span className="relative">{sending ? "Sending…" : "Send application"}</span>
                  {!sending && <ArrowRight className="relative size-4" strokeWidth={2.4} />}
                </button>
              </motion.form>
            )}
            </AnimatePresence>
            </div>
          )}
        </MorphContainer>
      </div>
    </div>
  )
}

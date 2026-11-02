import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { ArrowRight, Blend, Bookmark, BookmarkCheck, CircleCheck, Link2, Mail, X } from "lucide-react"
import { MorphContainer, NumberMorph } from "@/components/custom"
import { DURATION, EASE, GSAP_EASE, SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

/* ── Content ───────────────────────────────────────────────────────── */

const DAY_MS = 86_400_000
// Five days before this widget was built; the label is computed from it so it stays true
const POSTED = new Date(2026, 9, 28)
const RATE = { min: 85, max: 120 }
// Part-time: ~20 h/week → ~86 h/month
const HOURS_PER_MONTH = 86
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const postedAgo = (now: Date) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((today.getTime() - POSTED.getTime()) / DAY_MS)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`
}
const POSTED_LABEL = POSTED.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

/* ── Size (1:1; 380 from sm, 350 on phones) ───────────────────────────── */

const SM_QUERY = "(min-width: 640px)"
const subscribeSm = (cb: () => void) => {
  const mq = window.matchMedia(SM_QUERY)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
const useWide = () => useSyncExternalStore(subscribeSm, () => window.matchMedia(SM_QUERY).matches, () => true)

const PANEL_OPEN = "shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_24px_48px_-12px_rgba(0,0,0,0.85)]"
const APPLY_REST = "shadow-[0_0_0_1px_rgba(255,255,255,0),0_6px_18px_-6px_rgba(255,255,255,0.25)]"

export default function VariantJobWidget() {
  const reduceMotion = useReducedMotion()
  const S = useWide() ? 380 : 350
  const PAD = S >= 380 ? 22 : 20
  const applyPanel = { width: S - PAD * 2, height: 236 }

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
  const [saved, setSaved] = useState(false)
  const [showExactDate, setShowExactDate] = useState(false)
  const [monthly, setMonthly] = useState(false)

  const [applyOpen, setApplyOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [portfolio, setPortfolio] = useState("")
  const [error, setError] = useState("")
  const [stage, setStage] = useState<"form" | "sending" | "sent">("form")
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const [ago] = useState(() => postedAgo(new Date()))

  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, { y: 12, opacity: 0, duration: DURATION.enter, ease: GSAP_EASE.easeOutQuart })
    },
    { scope: widgetRef }
  )

  const press = (el: HTMLElement | null) => {
    if (!el || reduceMotion) return
    gsap.fromTo(el, { scale: 0.94 }, { scale: 1, duration: DURATION.press, ease: GSAP_EASE.easeOutQuad })
  }

  const rateMin = monthly ? Math.round((RATE.min * HOURS_PER_MONTH) / 100) / 10 : RATE.min
  const rateMax = monthly ? Math.round((RATE.max * HOURS_PER_MONTH) / 100) / 10 : RATE.max

  const handleApplyChange = (open: boolean) => {
    if (!open && stage === "sending") return
    setApplyOpen(open)
    if (!open) setError("")
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!EMAIL_PATTERN.test(email.trim())) return setError("Enter a valid email address")
    const link = portfolio.trim()
    if (link && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(link)) return setError("That link doesn't look right")
    setError("")
    setStage("sending")
    timer.current = window.setTimeout(() => setStage("sent"), 1000)
  }

  const withdraw = () => {
    setStage("form")
    setPortfolio("")
  }

  return (
    <div
      ref={widgetRef}
      style={{ width: S, height: S, padding: PAD }}
      className="relative flex select-none flex-col overflow-hidden rounded-[24px] bg-black text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_30px_60px_-20px_rgba(0,0,0,0.9)]"
    >
      {/* Surface: soft grey wash fading into black, with a faint dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.09) 1px, transparent 1.2px), linear-gradient(to bottom, #3b3b3d 0%, #1a1a1b 32%, #000 58%)",
          backgroundSize: "18px 18px, 100% 100%",
          backgroundPosition: "9px 9px, 0 0",
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <span aria-label="Variant" role="img" className="flex items-center">
          <Blend className="h-8 w-8 fill-white stroke-white stroke-[1.5]" />
        </span>
        <button
          type="button"
          onClick={(e) => {
            press(e.currentTarget)
            setSaved((s) => !s)
          }}
          aria-pressed={saved}
          aria-label={saved ? "Saved — remove from saved jobs" : "Save job"}
          className={cn(
            "flex h-7 w-[72px] items-center justify-center gap-1.5 rounded-[5px] text-[12px] font-medium outline-none ring-1 ring-inset transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-white/60",
            saved ? "bg-white text-black ring-white" : "bg-white/[0.14] text-white/90 ring-white/15 hover:bg-white/[0.2]"
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={saved ? "saved" : "save"} {...swap} className="flex items-center gap-1.5">
              {saved ? "Saved" : "Save"}
              {saved ? <BookmarkCheck className="h-3.5 w-3.5 stroke-[2.2]" /> : <Bookmark className="h-3.5 w-3.5 stroke-[2]" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      {/* Role — anchored under the header */}
      <div className="relative mt-8 flex flex-col">
        <div className="flex items-baseline gap-3">
          <span className="text-[18px] font-normal leading-none">Variant-01</span>
          <button
            type="button"
            onClick={() => setShowExactDate((v) => !v)}
            aria-label={`Posted ${POSTED_LABEL}`}
            className="rounded text-[11px] leading-none text-white/45 outline-none hover:text-white/70 focus-visible:ring-1 focus-visible:ring-white/40"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={showExactDate ? "exact" : "ago"} {...swap} className="inline-block">
                {showExactDate ? POSTED_LABEL : ago}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
        <h2 className="mt-4 text-[26px] font-normal leading-tight">Web Designer</h2>
        <div className="mt-4 flex gap-2">
          {["Part-Time", "Remote"].map((t) => (
            <span key={t} className="rounded-[4px] bg-white/[0.14] px-3 py-1.5 text-[11px] font-medium leading-none text-white/85 ring-1 ring-inset ring-white/[0.06]">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Dims the card under an open panel so nothing peeks past its rounded corners */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-40 bg-black transition-opacity duration-200",
          applyOpen ? "opacity-70" : "opacity-0"
        )}
      />

      {/* Footer — pinned to the bottom */}
      <div className="relative mt-auto border-t border-white/25 pt-5">
        <div className="flex items-end justify-between">
          <button
            type="button"
            onClick={() => setMonthly((m) => !m)}
            aria-label={`Pay $${rateMin}${monthly ? "k" : ""} to $${rateMax}${monthly ? "k" : ""} ${monthly ? "per month" : "per hour"}. Switch to ${monthly ? "hourly" : "monthly"}`}
            className="flex flex-col items-start rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <span data-number-morph="" className="flex items-baseline text-[22px] font-semibold leading-none tabular-nums">
              <span>$</span>
              <NumberMorph value={rateMin} />
              {monthly && <span>k</span>}
              <span className="px-0.5">-</span>
              <NumberMorph value={rateMax} />
              {monthly && <span>k</span>}
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={monthly ? "m" : "h"} {...swap} className="mt-1.5 text-[12px] text-white/75">
                {monthly ? `Per month · ~${HOURS_PER_MONTH} hrs` : "Per every hour"}
              </motion.span>
            </AnimatePresence>
          </button>

          <MorphContainer
            isOpen={applyOpen}
            onOpenChange={handleApplyChange}
            triggerWidth={96}
            triggerHeight={34}
            triggerRadius={5}
            expandedWidth={applyPanel.width}
            expandedHeight={applyPanel.height}
            expandedRadius={18}
            anchor="bottom-right"
            zIndex={45}
            closeOnClickOutside={stage !== "sending"}
            closeOnEscape={stage !== "sending"}
            transition={morph}
            className="bg-[#161617] transition-[background-color,box-shadow] duration-200"
            openClassName={PANEL_OPEN}
            closedClassName={APPLY_REST}
            trigger={({ open }) => (
              <button
                type="button"
                onClick={open}
                className={cn(
                  "flex h-full w-full items-center justify-center gap-1.5 rounded-[5px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                  stage === "sent" ? "bg-white/[0.14] text-white" : "bg-white text-black"
                )}
              >
                {stage === "sent" ? (
                  <>
                    <CircleCheck className="h-3.5 w-3.5 text-[#7fe0a0] stroke-[2.4]" /> Applied
                  </>
                ) : (
                  "Apply now"
                )}
              </button>
            )}
          >
            {({ close }) => (
              <div data-morph-content className="absolute bottom-0 right-0" style={applyPanel}>
                <AnimatePresence mode="wait" initial={false}>
                  {stage === "sent" ? (
                    <motion.div key="sent" {...swap} className="flex h-full flex-col p-4">
                      <div className="flex items-start justify-between">
                        <CircleCheck className="h-9 w-9 text-[#7fe0a0] stroke-[1.8]" />
                        <button type="button" onClick={close} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                          <X className="h-3.5 w-3.5 stroke-[2.4]" />
                        </button>
                      </div>
                      <span className="mt-auto text-[15px] font-semibold">Application sent</span>
                      <span className="mt-1 break-all text-[12px] text-white/55">Variant will reply to {email.trim()}</span>
                      <div className="mt-4 flex gap-2">
                        <button type="button" onClick={withdraw} className="h-10 flex-1 rounded-[6px] bg-white/[0.08] text-[13px] text-white/80 hover:bg-white/[0.12]">
                          Withdraw
                        </button>
                        <button type="button" onClick={close} className="h-10 flex-1 rounded-[6px] bg-white text-[13px] font-medium text-black">
                          Done
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.form key="form" {...swap} onSubmit={submit} noValidate className="flex h-full flex-col p-4">
                      <div className="flex items-start justify-between">
                        <span className="flex flex-col">
                          <span className="text-[14px] font-semibold">Apply — Web Designer</span>
                          <span className="text-[11px] text-white/50">Variant-01 · Part-Time · Remote</span>
                        </span>
                        <button type="button" onClick={close} disabled={stage === "sending"} aria-label="Cancel" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40">
                          <X className="h-3.5 w-3.5 stroke-[2.4]" />
                        </button>
                      </div>
                      <div className="mt-auto flex flex-col gap-2">
                        <label className={cn("flex h-10 items-center gap-2 rounded-[8px] bg-white/[0.06] px-3 ring-1 ring-inset transition-shadow duration-200 focus-within:ring-white/50", error && !EMAIL_PATTERN.test(email.trim()) ? "ring-[#ff8a8a]/70" : "ring-white/10")}>
                          <Mail className="h-4 w-4 shrink-0 text-white/40" />
                          <input
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value)
                              if (error) setError("")
                            }}
                            disabled={stage === "sending"}
                            placeholder="Email address"
                            aria-label="Email address"
                            className="w-full bg-transparent text-[13px] outline-none placeholder:text-white/30"
                          />
                        </label>
                        <label className="flex h-10 items-center gap-2 rounded-[8px] bg-white/[0.06] px-3 ring-1 ring-inset ring-white/10 transition-shadow duration-200 focus-within:ring-white/50">
                          <Link2 className="h-4 w-4 shrink-0 text-white/40" />
                          <input
                            type="url"
                            value={portfolio}
                            onChange={(e) => {
                              setPortfolio(e.target.value)
                              if (error) setError("")
                            }}
                            disabled={stage === "sending"}
                            placeholder="Portfolio link (optional)"
                            aria-label="Portfolio link"
                            className="w-full bg-transparent text-[13px] outline-none placeholder:text-white/30"
                          />
                        </label>
                        <span role="alert" className="h-4 pl-1 text-[11px] text-[#ff8a8a]">{error}</span>
                      </div>
                      <button
                        type="submit"
                        disabled={stage === "sending"}
                        className="relative mt-1 flex h-10 items-center justify-center gap-1.5 overflow-hidden rounded-[6px] bg-white text-[13px] font-medium text-black"
                      >
                        {stage === "sending" && (
                          <motion.span
                            aria-hidden
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 1, ease: EASE.move }}
                            className="absolute inset-0 origin-left bg-black/10"
                          />
                        )}
                        <span className="relative">{stage === "sending" ? "Sending…" : "Send application"}</span>
                        {stage !== "sending" && <ArrowRight className="relative h-4 w-4 stroke-[2.2]" />}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            )}
          </MorphContainer>
        </div>
      </div>
    </div>
  )
}

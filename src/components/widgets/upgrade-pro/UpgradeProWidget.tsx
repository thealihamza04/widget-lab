import { useState, useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { X, ArrowRight, Check, Sparkles } from "lucide-react"
import { DURATION, EASE, GSAP_EASE } from "@/lib/motion"

export default function UpgradeProWidget() {
  const reduceMotion = useReducedMotion()
  const [upgraded, setUpgraded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const widgetRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, { scale: 0.96, opacity: 0, duration: DURATION.enter, ease: GSAP_EASE.easeOutQuart })
    },
    { scope: widgetRef }
  )

  const press = (el: HTMLElement | null) => {
    if (!el || reduceMotion) return
    gsap.fromTo(el, { scale: 0.96 }, { scale: 1, duration: DURATION.press, ease: GSAP_EASE.easeOutQuad })
  }

  const swap = reduceMotion
    ? { initial: false as const, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 8, filter: "blur(4px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -8, filter: "blur(4px)" },
        transition: { duration: DURATION.view, ease: EASE.fade },
      }

  /*
   * Layout:
   * 1. Top row: pill badge + close button
   * 2. Text anchored to the bottom, resting directly above the CTA (no dead-centre text)
   * Dismissing collapses the offer into an inline "hidden" state with Undo — nothing leaves the widget.
   */
  return (
    <div
      ref={widgetRef}
      className="relative w-[280px] h-[280px] rounded-[34px] p-5 select-none overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #f5f9f6 0%, #edf4ee 45%, #e4ede6 80%, #d8e4dc 100%)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 8px 20px -6px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {dismissed ? (
          <motion.div key="hidden" {...swap} className="flex h-full flex-col justify-end gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#285718] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <Sparkles className="h-5 w-5 stroke-[2]" />
            </span>
            <div className="space-y-1">
              <h2 className="text-[19px] font-bold leading-tight text-[#141414]">Offer hidden</h2>
              <p className="text-[13.5px] leading-[1.38] text-[#5c655e]">You can upgrade any time from Settings.</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                press(e.currentTarget)
                setDismissed(false)
              }}
              className="h-[44px] w-full rounded-full bg-white/70 text-[14px] font-semibold text-[#141414] ring-1 ring-inset ring-black/[0.06] transition-colors duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
            >
              Undo
            </button>
          </motion.div>
        ) : (
          <motion.div key="offer" {...swap} className="flex h-full flex-col justify-between">
            <div className="flex w-full items-center justify-between">
              <div className="rounded-full bg-[#d7f7be] px-3 py-1 text-[13px] font-semibold text-[#285718] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">4x Pro</div>
              <button
                onClick={(e) => {
                  press(e.currentTarget)
                  setDismissed(true)
                }}
                type="button"
                aria-label="Dismiss offer"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-[#2b2b2b] shadow-sm transition-[background-color,box-shadow] duration-200 hover:bg-slate-50 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
              >
                <X className="h-3.5 w-3.5 stroke-[2.4]" />
              </button>
            </div>

            <div className="flex flex-col space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-[23px] font-bold leading-tight text-[#141414]">Upgrade To Pro</h2>
                <p className="text-[13.5px] font-normal leading-[1.38] text-[#5c655e]">
                  Unlock Automations And
                  <br />
                  Unlimited Escalation Rules.
                </p>
              </div>

              <button
                ref={btnRef}
                onClick={() => {
                  press(btnRef.current)
                  setUpgraded((prev) => !prev)
                }}
                type="button"
                aria-pressed={upgraded}
                className="flex h-[48px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-white text-[14.5px] font-semibold text-[#141414] shadow-[0_3px_12px_rgba(0,0,0,0.06)] transition-[background-color,box-shadow] duration-200 hover:bg-[#fafafa] hover:shadow-[0_5px_16px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={upgraded ? "on" : "off"} {...swap} className="flex items-center gap-1.5">
                    {upgraded ? (
                      <>
                        <Check className="h-4 w-4 stroke-[2.6] text-emerald-600" />
                        Activated
                      </>
                    ) : (
                      <>
                        Upgrade Plan
                        <ArrowRight className="h-3.5 w-3.5 stroke-[2.4]" />
                      </>
                    )}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from "motion/react"
import { Cake, Heart, PartyPopper, Sparkles, Wine, X } from "lucide-react"
import { MorphContainer, NumberMorph } from "@/components/custom"
import { DURATION, EASE, SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

const WISH_PANEL = { width: 256, height: 196 }

export default function BirthdayCardWidget() {
  const [age, setAge] = useState(26)
  const [isAvatarZoomed, setIsAvatarZoomed] = useState(false)
  const [isCandleBlown, setIsCandleBlown] = useState(false)
  const [isWishOpen, setIsWishOpen] = useState(false)
  const [sparkleCount, setSparkleCount] = useState(0)
  const reduceMotion = useReducedMotion()
  // Inline feedback (replaces toasts, which render outside the widget)
  const [note, setNote] = useState<string | null>(null)
  const [sentWish, setSentWish] = useState<string | null>(null)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  const swap = reduceMotion
    ? { initial: false as const, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 4, filter: "blur(3px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -4, filter: "blur(3px)" },
        transition: { duration: DURATION.view, ease: EASE.fade },
      }

  const handleCakeTap = () => {
    setIsCandleBlown((prev) => !prev)
    setSparkleCount((c) => c + 1)
    setNote(isCandleBlown ? "Candle relit" : "Make a wish!")
    later(() => setNote(null), 2000)
  }

  const handleSendWish = (wishText: string) => {
    setIsWishOpen(false)
    setSentWish(wishText)
    later(() => setSentWish(null), 2600)
  }

  return (
    <MotionConfig reducedMotion="user">
    <div
      className="relative w-[340px] h-[340px] sm:w-[360px] sm:h-[360px] bg-[#000000] text-white rounded-[38px] p-6 sm:p-7 shadow-[0_24px_50px_rgba(0,0,0,0.7)] border border-neutral-900/80 select-none overflow-hidden"
      style={{
        fontFamily: "var(--font-sans)",
      }}
    >
      <div className="flex flex-col justify-between w-full h-full">
        {/* ========================================================
            1. TOP ROW: Cake Icon + "My birthday!" / "Sat, Feb 10" & Avatar
            ======================================================== */}
        <div className="flex items-start justify-between w-full">
          {/* Left: Cake Icon & Title / Date */}
          <div className="flex flex-col">
            {/* Birthday Cake with Interactive Tap */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={handleCakeTap}
              title="Click to blow out / light the candle"
              aria-label={isCandleBlown ? "Relight the candle" : "Blow out the candle"}
              className="relative w-8 h-8 flex items-center justify-start cursor-pointer focus:outline-none"
            >
              <img
                src="/birthday-cake.png"
                alt="Birthday Cake"
                className={cn(
                  "w-[30px] h-[30px] object-contain transition-all duration-300",
                  isCandleBlown
                    ? "opacity-60 filter grayscale"
                    : "opacity-100 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]"
                )}
              />

              {/* Sparkle micro-interaction when tapped */}
              <AnimatePresence>
                {sparkleCount > 0 && (
                  <motion.div
                    key={sparkleCount}
                    initial={{ scale: 0, opacity: 1, y: 0 }}
                    animate={{ scale: 1.4, opacity: 0, y: -16 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: EASE.enter }}
                    className="absolute -top-1 -right-2 pointer-events-none text-amber-300"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Title */}
            <h2 className="text-[19px] sm:text-[20px] font-bold text-white mt-3.5 leading-tight whitespace-nowrap">
              My birthday!
            </h2>

            {/* Date */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={note ?? "date"}
                {...swap}
                aria-live="polite"
                className={cn("text-[14px] sm:text-[15px] font-medium mt-0.5 whitespace-nowrap", note ? "text-amber-300" : "text-neutral-500")}
              >
                {note ?? "Sat, Feb 10"}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Right: Circular Profile Avatar with Smooth Zoom */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAvatarZoomed((prev) => !prev)}
            aria-label={isAvatarZoomed ? "Zoom out of photo" : "Zoom into photo"}
            aria-pressed={isAvatarZoomed}
            className="w-[74px] h-[74px] rounded-full border-2 border-white/90 overflow-hidden cursor-pointer shrink-0 shadow-lg relative bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <motion.img
              src="/birthday-avatar.png"
              alt="Birthday celebrant"
              animate={{
                scale: isAvatarZoomed ? 1.35 : 1,
              }}
              transition={SPRING.morph}
              className="w-full h-full object-cover select-none pointer-events-none"
            />
          </motion.button>
        </div>

        {/* ========================================================
            2. MIDDLE SECTION: "Today I've turned / 26 years old and I'm / happy about it."
            ======================================================== */}
        <div className="flex flex-col my-auto py-1">
          {/* Line 1 */}
          <p className="text-[17px] sm:text-[18px] text-neutral-500 font-normal leading-snug">
            Today I’ve turned
          </p>

          {/* Line 2: 26 years old (bold white) + and I'm (muted) */}
          <div className="flex items-baseline flex-wrap leading-snug mt-0.5">
            <button
              type="button"
              onClick={() => setAge((prev) => (prev === 26 ? 27 : 26))}
              title="Toggle age milestone"
              className="rounded text-[17px] sm:text-[18px] font-bold text-white cursor-pointer hover:text-amber-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <NumberMorph value={age} /> years old
            </button>
            <span className="text-[17px] sm:text-[18px] text-neutral-500 font-normal ml-1.5">
              and I’m
            </span>
          </div>

          {/* Line 3: happy (bold white) + about it. (muted) */}
          <div className="flex items-baseline leading-snug mt-0.5">
            <span className="text-[17px] sm:text-[18px] font-bold text-white">
              happy
            </span>
            <span className="text-[17px] sm:text-[18px] text-neutral-500 font-normal ml-1.5">
              about it.
            </span>
          </div>
        </div>

        {/* ========================================================
            3. BOTTOM SECTION: "Hope you have / a great day!" & Morphing Wish Button
            ======================================================== */}
        <div className="flex items-end justify-between w-full pt-1">
          {/* Left: Message */}
          <AnimatePresence mode="wait" initial={false}>
            {sentWish ? (
              <motion.div key="sent" {...swap} aria-live="polite" className="flex max-w-[170px] flex-col leading-tight">
                <p className="text-[16px] sm:text-[17px] font-bold text-amber-300">Wish sent</p>
                <p className="mt-0.5 truncate text-[13px] text-neutral-400">“{sentWish}”</p>
              </motion.div>
            ) : (
              <motion.div key="message" {...swap} className="flex flex-col leading-tight">
                <p className="text-[16px] sm:text-[17px] text-neutral-500 font-normal">Hope you have</p>
                <p className="text-[16px] sm:text-[17px] leading-tight mt-0.5">
                  <span className="text-neutral-500 font-normal">a </span>
                  <span className="font-bold text-white">great day!</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right: Interactive Morphing Wish Action (MorphContainer) */}
          <MorphContainer
            isOpen={isWishOpen}
            onOpenChange={setIsWishOpen}
            triggerWidth={84}
            triggerHeight={32}
            triggerRadius={16}
            expandedWidth={WISH_PANEL.width}
            expandedHeight={WISH_PANEL.height}
            expandedRadius={24}
            anchor="bottom-right"
            transition={reduceMotion ? { duration: 0 } : SPRING.morph}
            // ring in the shadow instead of a border, so opening never shifts the content
            className="bg-[#141417] text-white shadow-[0_0_0_1px_rgba(38,38,38,1),0_24px_50px_rgba(0,0,0,0.7)]"
            trigger={
              <button
                type="button"
                onClick={() => setIsWishOpen(true)}
                className="w-full h-full flex items-center justify-center gap-1.5 text-[12px] font-medium text-neutral-300 hover:text-white bg-neutral-900/90 hover:bg-neutral-800/90 rounded-full border border-neutral-800 transition-colors cursor-pointer select-none px-2.5"
              >
                <PartyPopper className="w-3.5 h-3.5 text-amber-400 stroke-[2.2]" />
                <span>Wish</span>
              </button>
            }
          >
            {({ close }) => (
              <div data-morph-content className="absolute bottom-0 right-0 flex flex-col justify-between p-4 box-border" style={WISH_PANEL}>
                {/* Header: Title + Close X */}
                <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                  <span className="text-[12px] font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Send a Wish
                  </span>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close dialog"
                    className="w-5 h-5 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.2]" />
                  </button>
                </div>

                {/* Quick Wish Buttons with uniform spacing & hover highlights */}
                <div className="flex flex-col gap-2 my-auto py-1">
                  {[
                    { icon: Cake, text: "Happy 26th Birthday!" },
                    { icon: Wine, text: "Cheers to great health!" },
                  ].map((item) => (
                    <button
                      key={item.text}
                      type="button"
                      onClick={() => handleSendWish(item.text)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-[11.5px] font-medium text-neutral-200 hover:text-white transition-all cursor-pointer border border-neutral-800/80 hover:border-neutral-700 truncate active:scale-[0.98]"
                    >
                      <span className="flex items-center gap-2">
                        <item.icon className="h-3.5 w-3.5 shrink-0 text-amber-300 stroke-[2]" />
                        {item.text}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Bottom Bar: Instant send + Send button */}
                <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
                  <span className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium">
                    <Heart className="w-3 h-3 text-rose-500 fill-rose-500/20" /> Instant send
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSendWish("Stay awesome!")}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-100 text-neutral-950 font-bold text-[11px] transition-all cursor-pointer active:scale-95 shadow-xs"
                  >
                    <span className="flex items-center gap-1">
                      Send <Sparkles className="h-3 w-3" />
                    </span>
                  </button>
                </div>
              </div>
            )}
          </MorphContainer>
        </div>
      </div>
    </div>
    </MotionConfig>
  )
}

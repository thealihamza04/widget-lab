import { useState, useRef } from "react"
import { motion, AnimatePresence, MotionConfig } from "motion/react"
import { DURATION, EASE, SPRING } from "@/lib/motion"
import {
  CreditCard,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Lock,
  ShoppingBag,
  Coffee,
  Receipt,
  Car,
  Minus,
} from "lucide-react"
import { TextMorph, NumberMorph } from "@/components/custom"

import { DynamicMorphButton } from "@/components/ui/dynamic-morph-button"

interface CardData {
  id: string
  name: string
  balanceInt: string
  balanceDec: string
  status: "Active" | "Frozen"
  network: "mastercard" | "visa"
  limits: {
    Daily: { amount: string; spent: number; max: number; period: string }
    Weekly: { amount: string; spent: number; max: number; period: string }
    Monthly: { amount: string; spent: number; max: number; period: string }
  }
  categories: {
    name: string
    amount: string
    percent: number
    icon: "shopping" | "coffee" | "receipt" | "car"
  }[]
}

const INITIAL_CARDS: CardData[] = [
  {
    id: "savings",
    name: "Savings Card",
    balanceInt: "$16,058",
    balanceDec: ".94",
    status: "Active",
    network: "mastercard",
    limits: {
      Daily: { amount: "$220.00", spent: 95, max: 220, period: "/ day" },
      Weekly: { amount: "$1,500.00", spent: 680, max: 1500, period: "/ week" },
      Monthly: { amount: "$6,200.00", spent: 3950, max: 6200, period: "/ month" },
    },
    categories: [
      { name: "Groceries", amount: "$380.00", percent: 55, icon: "shopping" },
      { name: "Dining & Drinks", amount: "$195.00", percent: 28, icon: "coffee" },
      { name: "Subscriptions", amount: "$105.00", percent: 17, icon: "receipt" },
    ],
  },
  {
    id: "checking",
    name: "Checking Card",
    balanceInt: "$4,820",
    balanceDec: ".50",
    status: "Active",
    network: "visa",
    limits: {
      Daily: { amount: "$150.00", spent: 75, max: 150, period: "/ day" },
      Weekly: { amount: "$950.00", spent: 520, max: 950, period: "/ week" },
      Monthly: { amount: "$3,800.00", spent: 1520, max: 3800, period: "/ month" },
    },
    categories: [
      { name: "Retail Shopping", amount: "$280.00", percent: 54, icon: "shopping" },
      { name: "Fuel & Transit", amount: "$140.00", percent: 27, icon: "car" },
      { name: "Utilities", amount: "$100.00", percent: 19, icon: "receipt" },
    ],
  },
  {
    id: "vault",
    name: "Platinum Travel",
    balanceInt: "$38,450",
    balanceDec: ".20",
    status: "Active",
    network: "mastercard",
    limits: {
      Daily: { amount: "$800.00", spent: 240, max: 800, period: "/ day" },
      Weekly: { amount: "$4,500.00", spent: 1890, max: 4500, period: "/ week" },
      Monthly: { amount: "$18,000.00", spent: 9200, max: 18000, period: "/ month" },
    },
    categories: [
      { name: "Flights & Stays", amount: "$1,240.00", percent: 65, icon: "car" },
      { name: "Fine Dining", amount: "$450.00", percent: 24, icon: "coffee" },
      { name: "Travel Extras", amount: "$200.00", percent: 11, icon: "shopping" },
    ],
  },
]

// Unified Spring Transition for Morphing Consistency
// Shared morph spring (critically damped-ish, see @/lib/motion)
const unifiedTransition = SPRING.morph

export default function MyCardsWidget() {
  const [cards, setCards] = useState<CardData[]>(INITIAL_CARDS)
  const [cardIndex, setCardIndex] = useState(0)
  const [period, setPeriod] = useState<"Daily" | "Weekly" | "Monthly">("Weekly")
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)
  const idCounterRef = useRef(4)

  const activeCard = cards[cardIndex] || cards[0]
  const currentLimit = activeCard.limits[period]

  const progressPercent = Math.min(
    100,
    Math.round((currentLimit.spent / currentLimit.max) * 100)
  )

  // Donut Ring Geometry
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset =
    circumference - (circumference * progressPercent) / 100

  // Carousel Handlers
  const handlePrevCard = () => {
    setCardIndex((prev) => (prev > 0 ? prev - 1 : cards.length - 1))
  }

  const handleNextCard = () => {
    setCardIndex((prev) => (prev < cards.length - 1 ? prev + 1 : 0))
  }

  const handleToggleStatus = () => {
    setCards((prev) =>
      prev.map((c, i) =>
        i === cardIndex
          ? { ...c, status: c.status === "Active" ? "Frozen" : "Active" }
          : c
      )
    )
  }

  const handleAdjustLimit = (delta: number) => {
    setCards((prev) =>
      prev.map((c, i) => {
        if (i !== cardIndex) return c
        const current = c.limits[period]
        const newMax = Math.max(100, current.max + delta)
        return {
          ...c,
          limits: {
            ...c.limits,
            [period]: {
              ...current,
              max: newMax,
              amount: `$${newMax.toLocaleString()}.00`,
            },
          },
        }
      })
    )
  }

  return (
    <MotionConfig transition={unifiedTransition} reducedMotion="user">
      <motion.div
        layout
        className="relative w-[360px] sm:w-[380px] bg-white text-gray-900 rounded-[34px] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)] border border-gray-100 select-none overflow-hidden"
        style={{
          fontFamily: "var(--font-sans)",
        }}
      >
        <motion.div layout className="flex flex-col justify-between w-full h-full gap-3">
          {/* ========================================================
              1. TOP HEADER: [CreditCard Icon + My Cards] & [+ Add Card]
              ======================================================== */}
          <motion.div layout className="flex items-center justify-between w-full shrink-0 relative z-30">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-gray-900 stroke-[1.8]" />
              <h1 className="text-[17px] font-semibold text-gray-900">
                My Cards
              </h1>
            </div>

            <div className="relative">
              <DynamicMorphButton
                onAddCard={(newCardConfig) => {
                  const nextId = idCounterRef.current
                  idCounterRef.current += 1
                  const newCard: CardData = {
                    id: `card-${nextId}`,
                    name: newCardConfig.name,
                    balanceInt: "$5,240",
                    balanceDec: ".00",
                    status: "Active",
                    network: newCardConfig.network,
                    limits: {
                      Daily: {
                        amount: `$${Math.round(newCardConfig.limit / 7)}.00`,
                        spent: 40,
                        max: Math.round(newCardConfig.limit / 7),
                        period: "/ day",
                      },
                      Weekly: {
                        amount: `$${newCardConfig.limit.toLocaleString()}.00`,
                        spent: 280,
                        max: newCardConfig.limit,
                        period: "/ week",
                      },
                      Monthly: {
                        amount: `$${(newCardConfig.limit * 4).toLocaleString()}.00`,
                        spent: 1200,
                        max: newCardConfig.limit * 4,
                        period: "/ month",
                      },
                    },
                    categories: [
                      { name: "Online Orders", amount: "$180.00", percent: 64, icon: "shopping" },
                      { name: "Coffee & Dining", amount: "$70.00", percent: 25, icon: "coffee" },
                      { name: "Subscriptions", amount: "$30.00", percent: 11, icon: "receipt" },
                    ],
                  }
                  setCards((prev) => [...prev, newCard])
                  setCardIndex(cards.length)
                }}
                className="absolute right-0 top-0 origin-top-right z-30"
              />
              <div className="w-[106px] h-[34px] pointer-events-none" />
            </div>
          </motion.div>

          {/* ========================================================
              2. MAIN CARD: Matching Reference Image with Morphing Content
              ======================================================== */}
          <motion.div
            layout
            className="w-full bg-white border border-gray-200/90 rounded-[20px] p-4 sm:p-5 relative overflow-hidden shadow-2xs my-1"
          >
            {/* Abstract Vector Contour Lines */}
            <svg
              className="absolute right-0 top-0 h-full w-[170px] pointer-events-none opacity-85"
              viewBox="0 0 170 170"
              fill="none"
            >
              <path
                d="M118 0 L108 22 C100 38 104 56 118 68 L136 82 C148 92 150 110 140 122 L120 146 C114 154 118 164 128 168 L170 168"
                stroke="#E5E7EB"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <path
                d="M145 0 L134 22 C126 38 130 56 144 68 L162 82"
                stroke="#E5E7EB"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>

            {/* Card Top: [Blue Icon, Wave, Status Pill] & [Mastercard / Visa] */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                {/* Metallic Blue Circle Emblem */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-400 flex items-center justify-center shadow-xs relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-white/95"
                    fill="currentColor"
                  >
                    <rect
                      x="4"
                      y="5"
                      width="12"
                      height="8"
                      rx="1.5"
                      transform="rotate(-18 4 5)"
                      fill="white"
                      opacity="0.95"
                    />
                    <rect
                      x="7"
                      y="10"
                      width="12"
                      height="8"
                      rx="1.5"
                      transform="rotate(-18 7 10)"
                      fill="white"
                      opacity="0.75"
                    />
                  </svg>
                </div>

                {/* Contactless Wave Icon (•))) */}
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-gray-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M8.5 15.5a5 5 0 0 1 0-7" />
                  <path d="M12 18a8.5 8.5 0 0 1 0-12" />
                  <circle cx="5" cy="12" r="1" fill="currentColor" />
                </svg>

                {/* Status Pill: Active / Frozen with Spring Micro-interaction */}
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={handleToggleStatus}
                  title="Click to toggle status"
                  aria-label={`Status: ${activeCard.status}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-gray-200/85 bg-white text-[12px] font-medium text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none"
                >
                  {activeCard.status === "Active" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>{activeCard.status}</span>
                </motion.button>
              </div>

              {/* Payment Network Emblem */}
              <div className="relative z-10 flex items-center pr-0.5">
                {activeCard.network === "mastercard" ? (
                  <svg width="34" height="22" viewBox="0 0 34 22" fill="none">
                    <circle cx="11" cy="11" r="10" fill="#EB001B" />
                    <circle cx="23" cy="11" r="10" fill="#F79E1B" fillOpacity="0.95" />
                  </svg>
                ) : (
                  <span className="font-extrabold text-[15px] italic text-blue-800">
                    VISA
                  </span>
                )}
              </div>
            </div>

            {/* Card Middle: Label & Large Balance with TextMorph */}
            <div className="mt-6 mb-1 relative z-10">
              <p className="text-[14px] text-gray-500 font-normal mb-1">
                <TextMorph>{activeCard.name}</TextMorph>
              </p>
              <div className="flex items-baseline">
                <span className="text-[34px] sm:text-[36px] font-bold text-gray-900 leading-none">
                  <NumberMorph value={activeCard.balanceInt} />
                </span>
                <span className="text-[31px] sm:text-[33px] font-semibold text-gray-400 leading-none">
                  <NumberMorph value={activeCard.balanceDec} />
                </span>
              </div>
            </div>

            {/* Card Navigation Controls (< and >) */}
            <div className="absolute right-4 bottom-4 z-20 flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs divide-x divide-gray-200">
              <motion.button
                whileTap={{ scale: 0.88 }}
                type="button"
                onClick={handlePrevCard}
                aria-label="Previous card"
                className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer focus:outline-none"
              >
                <ChevronLeft className="w-3.5 h-3.5 stroke-[2.2]" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.88 }}
                type="button"
                onClick={handleNextCard}
                aria-label="Next card"
                className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer focus:outline-none"
              >
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.2]" />
              </motion.button>
            </div>
          </motion.div>

          {/* ========================================================
              3. SEGMENTED FILTER BAR: [Daily | Weekly | Monthly]
              ======================================================== */}
          <motion.div
            layout
            className="w-full border border-gray-200 rounded-xl overflow-hidden p-0.5 bg-white flex items-center divide-x divide-gray-200/80 shadow-2xs shrink-0"
          >
            {(["Daily", "Weekly", "Monthly"] as const).map((tab) => {
              const isActive = period === tab
              return (
                <motion.button
                  key={tab}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setPeriod(tab)}
                  className={`flex-1 py-1.5 text-center text-[13px] transition-colors cursor-pointer focus:outline-none ${
                    isActive
                      ? "font-semibold text-gray-900 bg-gray-50/70 rounded-lg"
                      : "font-normal text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                </motion.button>
              )
            })}
          </motion.div>

          {/* ========================================================
              4. BOTTOM SECTION: Spending Limit & Progress Ring
              ======================================================== */}
          <motion.div layout className="flex items-center justify-between shrink-0 pt-0.5">
            {/* Left: Circular Donut Ring Chart with Morphing Stroke */}
            <div className="flex items-center gap-3.5">
              <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                  {/* Background Track */}
                  <circle
                    cx="22"
                    cy="22"
                    r={radius}
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="4.5"
                  />
                  {/* Foreground Animated Blue Arc */}
                  <motion.circle
                    cx="22"
                    cy="22"
                    r={radius}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                  />
                </svg>
              </div>

              {/* Center: Label & Amount with TextMorph */}
              <div className="flex flex-col">
                <span className="text-[13px] text-gray-500 font-normal leading-tight">
                  Spending Limit
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-[18px] sm:text-[19px] font-bold text-gray-900 leading-tight">
                    <NumberMorph value={currentLimit.amount} />
                  </span>
                  <span className="text-[13px] text-gray-400 font-normal leading-tight">
                    <TextMorph>{currentLimit.period}</TextMorph>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Chevron Button with Synchronized Morphing Rotation */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => setIsDetailsExpanded((prev) => !prev)}
              title={isDetailsExpanded ? "Collapse Details" : "Expand Details"}
              aria-label="Toggle spending details"
              className={`p-2.5 rounded-xl border border-gray-200 transition-colors shadow-2xs cursor-pointer focus:outline-none ${
                isDetailsExpanded
                  ? "bg-gray-100 text-gray-900 border-gray-300"
                  : "text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {/* icon crossfade instead of a click-triggered rotation */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isDetailsExpanded ? "down" : "right"}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: DURATION.micro, ease: EASE.fade }}
                  className="flex items-center justify-center"
                >
                  {isDetailsExpanded ? <ChevronDown className="w-4 h-4 stroke-[2.2]" /> : <ChevronRight className="w-4 h-4 stroke-[2.2]" />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </motion.div>

          {/* ========================================================
              5. INLINE ADAPTIVE EXPANSION: Synchronized Spring Morphing
              ======================================================== */}
          <AnimatePresence initial={false} mode="sync">
            {isDetailsExpanded && (
              <motion.div
                key="details-accordion"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  {/* Spending Progress Bar with Synchronized Width */}
                  <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100">
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-1.5">
                      <span>${currentLimit.spent}.00 spent</span>
                      <span className="font-semibold text-blue-600">
                        ${Math.max(0, currentLimit.max - currentLimit.spent)}.00 left
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200/80 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-600 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Categories Breakdown */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-gray-400 uppercase">
                      {period} Categories
                    </div>
                    {activeCard.categories.map((cat, idx) => (
                      <motion.div
                        key={idx}
                        layout
                        className="flex items-center justify-between p-2 rounded-xl bg-gray-50/60 border border-gray-100 hover:bg-gray-100/60 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            {cat.icon === "shopping" && <ShoppingBag className="w-3 h-3" />}
                            {cat.icon === "coffee" && <Coffee className="w-3 h-3" />}
                            {cat.icon === "receipt" && <Receipt className="w-3 h-3" />}
                            {cat.icon === "car" && <Car className="w-3 h-3" />}
                          </div>
                          <span className="font-medium text-gray-700">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-gray-900">
                            {cat.amount}
                          </span>
                          <span className="text-gray-400 ml-1.5">({cat.percent}%)</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Quick Adjust Limit Stepper */}
                  <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
                    <span>Adjust {period} Limit:</span>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => handleAdjustLimit(-100)}
                        className="px-2 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 active:scale-95 transition-all shadow-2xs flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <Minus className="w-3 h-3" /> $100
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => handleAdjustLimit(100)}
                        className="px-2 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 active:scale-95 transition-all shadow-2xs flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> $100
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </MotionConfig>
  )
}

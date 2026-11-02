import { useEffect, useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { ArrowLeftRight, ArrowRight, Check, ChevronDown, CircleDollarSign, CircleEuro, CirclePoundSterling, CircleAlert, JapaneseYen, RefreshCw, TrendingDown, TrendingUp, X } from "lucide-react"
import { MorphContainer, NumberMorph } from "@/components/custom"
import { DURATION, EASE, GSAP_EASE, SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

/* ── Currencies (units per 1 USD) ──────────────────────────────────── */

type Code = "GBP" | "EUR" | "USD" | "JPY"
const CURRENCIES: Record<Code, { name: string; symbol: string; perUsd: number; decimals: number; icon: typeof CircleDollarSign; ink: string; tint: string }> = {
  GBP: { name: "British Pound", symbol: "£", perUsd: 0.82, decimals: 2, icon: CirclePoundSterling, ink: "#047857", tint: "#ecfdf5" },
  EUR: { name: "Euro", symbol: "€", perUsd: 0.94, decimals: 2, icon: CircleEuro, ink: "#4338ca", tint: "#eef2ff" },
  USD: { name: "US Dollar", symbol: "$", perUsd: 1, decimals: 2, icon: CircleDollarSign, ink: "#1d4ed8", tint: "#eff6ff" },
  JPY: { name: "Japanese Yen", symbol: "¥", perUsd: 154.2, decimals: 0, icon: JapaneseYen, ink: "#b45309", tint: "#fffbeb" },
}
const CODES = Object.keys(CURRENCIES) as Code[]
const TAX = 0.02
const FEE = 0.01
const W = 342, H = 608 // 9:16
// chip → picker morph sizes (picker spans the card's inner width)
const CHIP = { width: 112, height: 36 }
const PICKER = { width: W - 48 - 24, height: 44 * 4 + 32 + 12 }

const rateOf = (from: Code, to: Code) => CURRENCIES[to].perUsd / CURRENCIES[from].perUsd
const money = (v: number, code: Code) =>
  v.toLocaleString("en-US", { minimumFractionDigits: CURRENCIES[code].decimals, maximumFractionDigits: CURRENCIES[code].decimals })
const fmtRate = (r: number) => (r >= 100 ? r.toFixed(1) : r >= 10 ? r.toFixed(2) : r.toFixed(4))

// 14-day history for a pair: a deterministic random walk ending at today's rate
const history = (from: Code, to: Code) => {
  const seed = from.charCodeAt(0) * 31 + to.charCodeAt(0) * 7
  const end = rateOf(from, to)
  const pts: number[] = []
  let v = end * (1 - 0.012)
  for (let i = 0; i < 14; i++) {
    const x = Math.sin((seed + i) * 12.9898) * 43758.5453
    v *= 1 + ((x - Math.floor(x)) - 0.45) * 0.006
    pts.push(v)
  }
  const k = end / pts[pts.length - 1]
  return pts.map((p) => p * k)
}

export default function CurrencyExchangeWidget() {
  const reduceMotion = useReducedMotion()
  const swap = reduceMotion
    ? { initial: false as const, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 6, filter: "blur(3px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -6, filter: "blur(3px)" },
        transition: { duration: DURATION.view, ease: EASE.fade },
      }

  const widgetRef = useRef<HTMLDivElement>(null)
  const swapRef = useRef<HTMLButtonElement>(null)
  const [from, setFrom] = useState<Code>("GBP")
  const [to, setTo] = useState<Code>("EUR")
  const [balances, setBalances] = useState<Record<Code, number>>({ GBP: 15958.94, EUR: 2410.5, USD: 5200, JPY: 182000 })
  const [amountText, setAmountText] = useState("100")
  const [picker, setPicker] = useState<"from" | "to" | null>(null)
  const [stage, setStage] = useState<"idle" | "working" | "done">("idle")
  const [receipt, setReceipt] = useState<{ sent: string; got: string } | null>(null)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, { y: 12, opacity: 0, duration: DURATION.enter, ease: GSAP_EASE.easeOutQuart })
    },
    { scope: widgetRef }
  )

  const f = CURRENCIES[from]
  const t = CURRENCIES[to]
  const amount = Number(amountText) || 0
  const rate = rateOf(from, to)
  const tax = amount * TAX
  const fee = amount * FEE
  const receive = (amount - tax - fee) * rate
  const over = amount > balances[from]
  const canExchange = amount > 0 && !over && stage === "idle"

  const series = useMemo(() => history(from, to), [from, to])
  const change = (series[series.length - 1] / series[0] - 1) * 100

  // amount: digits + one dot, respecting the currency's decimals (none for JPY)
  const onAmount = (raw: string) => {
    const re = f.decimals ? /^\d{0,7}(\.\d{0,2})?$/ : /^\d{0,9}$/
    if (raw === "" || re.test(raw)) setAmountText(raw)
  }

  const doSwap = () => {
    if (swapRef.current && !reduceMotion) {
      gsap.fromTo(swapRef.current, { scale: 0.9 }, { scale: 1, duration: DURATION.press, ease: GSAP_EASE.easeOutQuad })
    }
    setFrom(to)
    setTo(from)
    setAmountText((a) => (CURRENCIES[from].decimals && !CURRENCIES[to].decimals ? String(Math.floor(Number(a) || 0)) : a))
    setPicker(null)
  }

  const pick = (side: "from" | "to", code: Code) => {
    if (side === "from") {
      if (code === to) setTo(from)
      setFrom(code)
      if (!CURRENCIES[code].decimals) setAmountText((a) => String(Math.floor(Number(a) || 0)))
    } else {
      if (code === from) setFrom(to)
      setTo(code)
    }
    setPicker(null)
  }

  const exchange = () => {
    if (!canExchange) return
    setStage("working")
    later(() => {
      setBalances((b) => ({ ...b, [from]: Math.round((b[from] - amount) * 100) / 100, [to]: Math.round((b[to] + receive) * 100) / 100 }))
      setReceipt({ sent: `${f.symbol}${money(amount, from)}`, got: `${t.symbol}${money(receive, to)}` })
      setStage("done")
      later(() => setStage("idle"), 2200)
    }, 800)
  }

  const [whole, cents] = money(amount, from).split(".")

  return (
    <div
      ref={widgetRef}
      style={{ width: W, height: H }}
      className="relative flex select-none flex-col rounded-[32px] bg-white p-6 text-[#0a0a0b] shadow-[0_0_0_1px_rgba(15,23,42,0.05),0_24px_48px_-16px_rgba(15,23,42,0.25)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <RefreshCw className="h-5 w-5 stroke-[2.2]" />
          <h2 className="text-[20px] font-semibold leading-none">Exchange</h2>
        </div>
        <span className="text-[12px] tabular-nums text-[#71717a]">Rates live · 3% total fees</span>
      </div>

      {/* Main card */}
      <div className="relative mt-5 overflow-hidden rounded-[22px] ring-1 ring-inset ring-[#e4e4e7]">
        {/* veil under an open picker so the panel reads as the focus */}
        <div
          aria-hidden
          className={cn("pointer-events-none absolute inset-0 z-20 bg-white transition-opacity duration-200", picker ? "opacity-70" : "opacity-0")}
        />
        {/* currency row: each chip morphs into its own picker (MorphContainer) */}
        <div className="relative z-30 flex items-center justify-between px-3 py-2.5">
          {(["from", "to"] as const).map((side) => {
            const code = side === "from" ? from : to
            const c = CURRENCIES[code]
            return (
              <div key={side} className={cn("flex", side === "to" && "order-3")}>
                <MorphContainer
                  isOpen={picker === side}
                  onOpenChange={(o) => setPicker(o ? side : null)}
                  triggerWidth={CHIP.width}
                  triggerHeight={CHIP.height}
                  expandedWidth={PICKER.width}
                  expandedHeight={PICKER.height}
                  expandedRadius={18}
                  anchor={side === "from" ? "top-left" : "top-right"}
                  zIndex={45}
                  transition={reduceMotion ? { duration: 0 } : SPRING.morph}
                  className="bg-white transition-[background-color,box-shadow] duration-200"
                  openClassName="shadow-[0_0_0_1px_rgba(15,23,42,0.08),0_24px_48px_-12px_rgba(15,23,42,0.28)]"
                  closedClassName="shadow-[0_0_0_1px_rgba(15,23,42,0),0_0_0_rgba(15,23,42,0)]"
                  trigger={({ open }) => (
                    <button
                      type="button"
                      onClick={open}
                      aria-haspopup="listbox"
                      aria-label={`${side === "from" ? "Pay with" : "Receive in"} ${c.name}. Change currency`}
                      className={cn(
                        "flex h-full w-full items-center gap-2 rounded-full pl-1 pr-2 outline-none transition-colors duration-200 hover:bg-[#f4f4f5] focus-visible:ring-2 focus-visible:ring-[#0a0a0b]/20",
                        side === "to" && "justify-end"
                      )}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: c.tint, color: c.ink }}>
                        <c.icon className="h-4 w-4 stroke-[2.2]" />
                      </span>
                      <span className="text-[15px] font-semibold">{code}</span>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f4f4f5] text-[#52525b]">
                        <ChevronDown className="h-3.5 w-3.5 stroke-[2.5]" />
                      </span>
                    </button>
                  )}
                >
                  {({ close }) => (
                    <div data-morph-content className={cn("absolute top-0 flex flex-col p-1.5", side === "from" ? "left-0" : "right-0")} style={PICKER}>
                      <div className="flex h-8 items-center justify-between pl-2.5 pr-1">
                        <span className="text-[12px] font-medium text-[#71717a]">{side === "from" ? "Pay with" : "Receive in"}</span>
                        <button type="button" onClick={close} aria-label="Close" className="flex h-6 w-6 items-center justify-center rounded-full text-[#71717a] hover:bg-[#f4f4f5] hover:text-[#0a0a0b]">
                          <X className="h-3.5 w-3.5 stroke-[2.4]" />
                        </button>
                      </div>
                      <div role="listbox" aria-label={side === "from" ? "Pay currency" : "Receive currency"} className="flex flex-col">
                        {CODES.map((k) => {
                          const o = CURRENCIES[k]
                          const active = code === k
                          return (
                            <button
                              key={k}
                              type="button"
                              role="option"
                              aria-selected={active}
                              aria-label={`${o.name} (${k})`}
                              onClick={() => pick(side, k)}
                              className={cn(
                                "flex h-[44px] items-center gap-2.5 rounded-[12px] px-2 text-left outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#0a0a0b]/15",
                                active ? "bg-[#f4f4f5]" : "hover:bg-[#fafafa]"
                              )}
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: o.tint, color: o.ink }}>
                                <o.icon className="h-4 w-4 stroke-[2.2]" />
                              </span>
                              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                                <span className="text-[13px] font-semibold">{k}</span>
                                <span className="truncate text-[11px] text-[#71717a]">{o.name}</span>
                              </span>
                              <span className="text-[12px] font-medium tabular-nums text-[#3f3f46]">
                                {o.symbol}{money(balances[k], k)}
                              </span>
                              <span className="flex w-4 justify-center">{active && <Check className="h-4 w-4 stroke-[2.6]" />}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </MorphContainer>
              </div>
            )
          })}
          <button
            ref={swapRef}
            type="button"
            onClick={doSwap}
            aria-label={`Swap: exchange ${to} to ${from}`}
            className="order-2 flex h-9 w-9 items-center justify-center rounded-full text-[#52525b] outline-none ring-1 ring-inset ring-[#e4e4e7] transition-colors duration-200 hover:bg-[#f4f4f5] hover:text-[#0a0a0b] focus-visible:ring-2 focus-visible:ring-[#0a0a0b]/20"
          >
            <ArrowLeftRight className="h-4 w-4 stroke-[2.2]" />
          </button>
        </div>

        <div className="h-px bg-[#f4f4f5]" />

        {/* amount */}
        <div className="flex flex-col items-center px-4 pb-3 pt-4">
          <label className="relative flex items-start justify-center font-semibold leading-none tabular-nums">
            <span className="sr-only">Amount in {from}</span>
            <span className="mr-1 mt-[0.35em] text-[20px] text-[#a1a1aa]">{f.symbol}</span>
            {/* the visible figure; the input sits over it so typing edits it directly */}
            <span aria-hidden className="text-[40px]">
              {amountText === "" ? <span className="text-[#d4d4d8]">0</span> : <NumberMorph value={whole} />}
            </span>
            {f.decimals > 0 && <span aria-hidden className="ml-0.5 mt-[0.35em] text-[20px] text-[#a1a1aa]">.{cents ?? "00"}</span>}
            <input
              inputMode="decimal"
              autoComplete="off"
              value={amountText}
              onChange={(e) => onAmount(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              disabled={stage !== "idle"}
              aria-invalid={over}
              className="absolute inset-0 w-full cursor-text bg-transparent text-center text-transparent caret-[#0a0a0b] outline-none"
            />
          </label>
          <div className="mt-2.5 flex h-5 items-center gap-1.5 text-[12px]">
            <AnimatePresence mode="wait" initial={false}>
              {over ? (
                <motion.span key="over" {...swap} role="alert" className="flex items-center gap-1 font-medium text-[#dc2626]">
                  <CircleAlert className="h-3.5 w-3.5 stroke-[2.2]" /> Not enough {from}
                </motion.span>
              ) : (
                <motion.span key="ok" {...swap} className="text-[#71717a]">
                  Available{" "}
                  <span data-number-morph="" className="inline-flex font-semibold text-[#0a0a0b] tabular-nums">
                    {f.symbol}
                    <NumberMorph value={money(balances[from], from)} />
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setAmountText(String(f.decimals ? balances[from] : Math.floor(balances[from])))}
              disabled={stage !== "idle"}
              className="rounded-full bg-[#f4f4f5] px-2 py-0.5 text-[11px] font-semibold text-[#3f3f46] transition-colors duration-200 hover:bg-[#e4e4e7]"
            >
              Max
            </button>
          </div>
        </div>

        {/* rate + 14-day trend */}
        <div className="border-t border-[#f4f4f5] bg-[#fafafa] px-4 pb-3 pt-2.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium tabular-nums text-[#3f3f46]">
              1 {from} = {fmtRate(rate)} {to}
            </span>
            <span className={cn("flex items-center gap-1 font-medium tabular-nums", change >= 0 ? "text-[#059669]" : "text-[#dc2626]")}>
              {change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}% · 14d
            </span>
          </div>
          <RateChart series={series} up={change >= 0} />
          {/* period labels + range, so the chart reads as data, not decoration */}
          <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums text-[#a1a1aa]">
            <span>14 days ago</span>
            <span>
              Low {fmtRate(Math.min(...series))} · High {fmtRate(Math.max(...series))}
            </span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <dl className="mt-5 space-y-3 text-[14px]">
        {[
          ["Tax (2%)", `${f.symbol}${money(tax, from)}`],
          ["Exchange fee (1%)", `${f.symbol}${money(fee, from)}`],
          ["Arrives", "Instantly"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between">
            <dt className="text-[#71717a]">{k}</dt>
            <dd className="font-medium tabular-nums">{v}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-[#f4f4f5] pt-3">
          <dt className="font-medium text-[#3f3f46]">You receive</dt>
          <dd data-number-morph="" className="flex text-[17px] font-semibold tabular-nums">
            {t.symbol}
            <NumberMorph value={money(Math.max(0, receive), to)} />
          </dd>
        </div>
      </dl>

      {/* Action */}
      <button
        type="button"
        onClick={exchange}
        disabled={stage !== "idle"}
        aria-disabled={!canExchange}
        className={cn(
          "relative mt-auto flex h-12 w-full shrink-0 items-center justify-center overflow-hidden rounded-[14px] text-[15px] font-semibold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0a0a0b]/30",
          stage === "done" ? "bg-[#059669] text-white" : canExchange || stage === "working" ? "bg-[#0a0a0b] text-white hover:bg-[#27272a]" : "bg-[#f4f4f5] text-[#a1a1aa]"
        )}
      >
        {stage === "working" && (
          <motion.span aria-hidden initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, ease: EASE.move }} className="absolute inset-0 origin-left bg-white/15" />
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={stage} {...swap} aria-live="polite" className="relative flex items-center gap-2">
            {stage === "done" && receipt ? (
              <>
                <motion.span initial={reduceMotion ? false : { scale: 0.6 }} animate={{ scale: 1 }} transition={reduceMotion ? { duration: 0 } : SPRING.digit} className="flex">
                  <Check className="h-5 w-5 stroke-[2.6]" />
                </motion.span>
                {receipt.sent}
                <ArrowRight className="h-4 w-4 stroke-[2.4]" aria-label="to" />
                {receipt.got}
              </>
            ) : stage === "working" ? (
              "Exchanging…"
            ) : over ? (
              `Not enough ${from}`
            ) : amount > 0 ? (
              <>
                <RefreshCw className="h-4 w-4 stroke-[2.2]" /> Exchange {f.symbol}{money(amount, from)}
              </>
            ) : (
              "Enter an amount"
            )}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  )
}

function RateChart({ series, up }: { series: number[]; up: boolean }) {
  const w = W - 48 - 32, h = 64
  const x = d3.scaleLinear().domain([0, series.length - 1]).range([0, w])
  const [lo, hi] = d3.extent(series) as [number, number]
  const pad = (hi - lo) * 0.15 || hi * 0.001
  const y = d3.scaleLinear().domain([lo - pad, hi + pad]).range([h - 2, 2])
  const line = d3.line<number>().x((_, i) => x(i)).y((v) => y(v)).curve(d3.curveMonotoneX)(series) ?? ""
  const area = d3.area<number>().x((_, i) => x(i)).y0(h).y1((v) => y(v)).curve(d3.curveMonotoneX)(series) ?? ""
  const color = up ? "#059669" : "#dc2626"
  return (
    <svg width={w} height={h} className="mt-2 block" role="img" aria-label={`Rate trend over 14 days, ${up ? "up" : "down"}`}>
      <defs>
        <linearGradient id="fx-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#fx-area)" />
      <path d={line} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx={x(series.length - 1)} cy={y(series[series.length - 1])} r={2.8} fill={color} />
    </svg>
  )
}

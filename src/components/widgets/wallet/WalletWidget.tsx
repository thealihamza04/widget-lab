import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import {
  Apple,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Cloud,
  Copy,
  Hexagon,
  Info,
  Mail,
  MessageCircle,
  Music,
  PenTool,
  Volleyball,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react"
import { MorphContainer, NumberMorph } from "@/components/custom"
import { DURATION, EASE, GSAP_EASE, SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

/* ── Data ─────────────────────────────────────────────────────────────── */

type Contact = { id: string; name: string; bg: string; fg: string }
const CONTACTS: Contact[] = [
  { id: "leo", name: "Leo", bg: "#8fe3a0", fg: "#14532d" },
  { id: "mia", name: "Mia", bg: "#d9c8ff", fg: "#4c1d95" },
  { id: "zoe", name: "Zoe", bg: "#ffb8c9", fg: "#831843" },
  { id: "raj", name: "Raj", bg: "#ffd2a8", fg: "#7c2d12" },
  { id: "kai", name: "Kai", bg: "#9fd8ff", fg: "#0c4a6e" },
]

type Txn = { id: string; title: string; amount: number; at: Date; icon: LucideIcon; tint: string }
const INITIAL_TXNS: Txn[] = [
  { id: "t1", title: "Dribbble Pro", amount: -60, at: new Date(2026, 0, 17, 20, 12), icon: Volleyball, tint: "from-[#ffd0e4] to-[#c98bb0]" },
  { id: "t2", title: "Music subscription", amount: -11.99, at: new Date(2026, 0, 15, 9, 30), icon: Music, tint: "from-[#b9f5c9] to-[#5fbf7f]" },
  { id: "t3", title: "Leo", amount: 250, at: new Date(2026, 0, 12, 18, 5), icon: ArrowDown, tint: "from-[#c7ecff] to-[#6fb3e0]" },
  { id: "t4", title: "Design tools", amount: -15, at: new Date(2026, 0, 9, 11, 48), icon: PenTool, tint: "from-[#e6d9ff] to-[#9f86e0]" },
  { id: "t5", title: "Cloud storage", amount: -2.99, at: new Date(2026, 0, 3, 7, 15), icon: Cloud, tint: "from-[#dbe7ff] to-[#8aa6e6]" },
  { id: "t6", title: "App Store", amount: -4.99, at: new Date(2025, 11, 28, 21, 2), icon: Apple, tint: "from-[#eeeeee] to-[#a8a8a8]" },
]

const CURRENCIES = [
  { code: "USD", symbol: "$", rate: 1 },
  { code: "EUR", symbol: "€", rate: 0.92 },
] as const

const PAY_LINK = "pay.me/ana"

/* ── Geometry (1:1; 380 from sm up, 344 on phones) ─────────────────────── */

const SM_QUERY = "(min-width: 640px)"
const subscribeSm = (cb: () => void) => {
  const mq = window.matchMedia(SM_QUERY)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
const useWide = () =>
  useSyncExternalStore(subscribeSm, () => window.matchMedia(SM_QUERY).matches, () => true)

const geometry = (S: number) => {
  const PAD = 10, GAP = 8, BTN = S >= 380 ? 56 : 50, AV = S >= 380 ? 46 : 40
  const panelH = S >= 380 ? 164 : 140
  const btnTop = S - PAD - BTN
  const cardTop = PAD + panelH + AV / 2 + 10
  const pillW = (S - 2 * PAD - 2 * BTN - 3 * GAP) / 2
  const receiveLeft = PAD + 2 * BTN + 2 * GAP
  return {
    S, PAD, GAP, BTN, AV, panelH, btnTop, cardTop, pillW,
    cardH: btnTop - GAP - cardTop,
    cardOpenH: btnTop - GAP - PAD,
    sendPanel: { width: S - 2 * PAD, height: S >= 380 ? 278 : 264 },
    receivePanel: { width: S - PAD - receiveLeft, height: 178 },
    settingsPanel: { width: Math.min(224, S - 2 * PAD), height: 128 },
    infoPanel: { width: 212, height: 124 },
  }
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

const money = (v: number, cents: boolean) =>
  Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })

const stamp = (d: Date) => {
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  return { day, time }
}

// Ring as the first shadow layer stands in for a border; open/closed keep the same layer count
const PANEL_OPEN = "shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_24px_48px_-12px_rgba(0,0,0,0.7)]"
const PANEL_REST = "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_0_rgba(0,0,0,0)]"
const SEND_REST = "shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_10px_28px_-6px_rgba(46,124,255,0.75)]"
const SURFACE = "transition-[background-color,box-shadow] duration-200"

// A user icon on the contact's colour (no photos ship with the project); the name lives in the label
function Avatar({ c, size, className }: { c: Contact; size: number; className?: string }) {
  const icon = Math.round(size * 0.52)
  return (
    <span
      title={c.name}
      className={cn("flex shrink-0 items-center justify-center rounded-full", className)}
      style={{ width: size, height: size, background: c.bg, color: c.fg }}
    >
      <UserRound style={{ width: icon, height: icon }} className="stroke-[2]" aria-hidden />
    </span>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        on ? "bg-[#2f80ff]" : "bg-white/15"
      )}
    >
      <motion.span
        animate={{ x: on ? 16 : 0 }}
        transition={{ duration: DURATION.micro, ease: EASE.move }}
        className="absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow"
      />
    </button>
  )
}

/* ── Widget ───────────────────────────────────────────────────────────── */

export default function WalletWidget() {
  const reduceMotion = useReducedMotion()
  const g = geometry(useWide() ? 380 : 344)
  const morph = reduceMotion ? { duration: 0 } : SPRING.morph
  const swap = reduceMotion
    ? { initial: false as const, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 8, filter: "blur(4px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -8, filter: "blur(4px)" },
        transition: { duration: DURATION.view, ease: EASE.fade },
      }

  const widgetRef = useRef<HTMLDivElement>(null)

  const [balance, setBalance] = useState(52002.5)
  const [txns, setTxns] = useState<Txn[]>(INITIAL_TXNS)
  const [currencyIdx, setCurrencyIdx] = useState(0)
  const [hideBalance, setHideBalance] = useState(false)
  const [showCents, setShowCents] = useState(true)

  const [infoOpen, setInfoOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Send flow
  const [recipient, setRecipient] = useState<Contact>(CONTACTS[0])
  const [amount, setAmount] = useState("")
  const [sendError, setSendError] = useState("")
  const [sendStage, setSendStage] = useState<"form" | "sending" | "sent">("form")
  const [lastSent, setLastSent] = useState<{ amount: number; to: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  const currency = CURRENCIES[currencyIdx]
  const fmt = (usd: number) => money(usd * currency.rate, showCents)
  const last = txns[0]

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

  const openSend = (c?: Contact) => {
    if (c) setRecipient(c)
    if (sendStage === "sent") {
      setSendStage("form")
      setAmount("")
    }
    setSendError("")
    setSendOpen(true)
  }

  const handleAmount = (raw: string) => {
    // digits and one dot, max two decimals; anything else is ignored
    if (raw === "" || /^\d{0,7}(\.\d{0,2})?$/.test(raw)) {
      setAmount(raw)
      if (sendError) setSendError("")
    }
  }

  const submitSend = (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number(amount)
    if (!amount || !Number.isFinite(n) || n <= 0) return setSendError("Enter an amount")
    const usd = n / currency.rate
    if (usd > balance) return setSendError("That's more than your balance")
    setSendStage("sending")
    later(() => {
      setBalance((b) => Math.round((b - usd) * 100) / 100)
      setTxns((list) => [
        { id: `t${Date.now()}`, title: recipient.name, amount: -usd, at: new Date(), icon: ArrowUp, tint: "from-[#c7ecff] to-[#6fb3e0]" },
        ...list,
      ])
      setLastSent({ amount: usd, to: recipient.name })
      setSendStage("sent")
    }, 900)
  }

  const closeSend = () => {
    if (sendStage === "sending") return
    setSendOpen(false)
    if (sendStage === "sent") {
      later(() => {
        setSendStage("form")
        setAmount("")
      }, 350)
    }
  }

  const copyLink = () => {
    navigator.clipboard?.writeText(`https://${PAY_LINK}`)
    setCopied(true)
    later(() => setCopied(false), 1800)
  }

  const anyOpen = infoOpen || settingsOpen || receiveOpen || sendOpen

  return (
    <div
      ref={widgetRef}
      style={{ width: g.S, height: g.S }}
      className="relative select-none overflow-hidden rounded-[40px] bg-gradient-to-b from-[#1c2348] to-[#0e1230] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_30px_60px_-20px_rgba(0,0,30,0.9),inset_0_1px_0_rgba(255,255,255,0.08)]"
    >
      {/* ── Balance panel ─────────────────────────────────────────── */}
      <div className="absolute" style={{ left: g.PAD, right: g.PAD, top: g.PAD, height: g.panelH }}>
        <div className="absolute inset-0 rounded-[30px] bg-gradient-to-b from-[#4a96ff] via-[#2f74ff] to-[#1f4fe0] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-12px_24px_rgba(10,30,120,0.35)]" />

        <div className="relative flex items-center justify-between px-3 pt-3">
          <div className="flex items-center gap-2">
            <span aria-hidden className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-gradient-to-b from-[#ffe6b3] to-[#f4b860] text-[#7a3f00] ring-2 ring-white/40">
              <UserRound className="h-3.5 w-3.5 stroke-[2.2]" />
            </span>
            <span className="text-[12px] font-medium text-white/90">Ana</span>
          </div>

          <MorphContainer
            isOpen={infoOpen}
            onOpenChange={setInfoOpen}
            triggerWidth={26}
            triggerHeight={26}
            expandedWidth={g.infoPanel.width}
            expandedHeight={g.infoPanel.height}
            expandedRadius={20}
            anchor="top-right"
            transition={morph}
            className={cn("bg-[#1d2a63]", SURFACE)}
            openClassName={PANEL_OPEN}
            closedClassName={PANEL_REST}
            trigger={({ open }) => (
              <button
                type="button"
                onClick={open}
                aria-label="Account details"
                className="flex h-full w-full items-center justify-center rounded-full bg-white/15 outline-none hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <Info className="h-3.5 w-3.5 stroke-[2.2]" />
              </button>
            )}
          >
            {({ close }) => (
              <div data-morph-content className="absolute right-0 top-0 flex flex-col p-3.5" style={g.infoPanel}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold">Account</span>
                  <button type="button" onClick={close} aria-label="Close account details" className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                    <X className="h-3 w-3 stroke-[2.4]" />
                  </button>
                </div>
                <dl className="mt-auto grid grid-cols-2 gap-y-1.5 text-[12px]">
                  <dt className="text-white/50">Account</dt>
                  <dd className="text-right tabular-nums">•••• 4821</dd>
                  <dt className="text-white/50">Currency</dt>
                  <dd className="text-right">{currency.code}</dd>
                  <dt className="text-white/50">Transactions</dt>
                  <dd className="text-right tabular-nums">{txns.length}</dd>
                </dl>
              </div>
            )}
          </MorphContainer>
        </div>

        <div className="relative mt-1 flex flex-col items-center">
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white/90 ring-1 ring-inset ring-white/25">
            YOUR BALANCE
          </span>
          <button
            type="button"
            onClick={() => setHideBalance((h) => !h)}
            aria-label={hideBalance ? "Show balance" : "Hide balance"}
            className="mt-2 rounded-xl px-2 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <AnimatePresence mode="wait" initial={false}>
              {/* banking-style figure: raised small symbol, large whole part, quieter cents */}
              <motion.span key={hideBalance ? "hidden" : "shown"} {...swap} className="flex items-start font-semibold leading-none tabular-nums">
                <span className="mr-1 mt-[0.32em] text-white/80" style={{ fontSize: g.S >= 380 ? 22 : 19 }}>{currency.symbol}</span>
                {hideBalance ? (
                  <span style={{ fontSize: g.S >= 380 ? 42 : 36 }}>••••••</span>
                ) : (
                  <>
                    <span style={{ fontSize: g.S >= 380 ? 44 : 38 }}>
                      <NumberMorph value={fmt(balance).split(".")[0]} />
                    </span>
                    {showCents && (
                      <span className="ml-0.5 mt-[0.32em] text-white/65" style={{ fontSize: g.S >= 380 ? 22 : 19 }}>
                        <NumberMorph value={`.${fmt(balance).split(".")[1] ?? "00"}`} />
                      </span>
                    )}
                  </>
                )}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>

        {/* Contacts overlap the panel's bottom edge; tapping one starts a payment */}
        <div className="absolute inset-x-0 flex justify-center gap-2.5" style={{ bottom: -g.AV / 2 }}>
          {CONTACTS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={`Send to ${c.name}`}
              onClick={(e) => {
                press(e.currentTarget)
                openSend(c)
              }}
              className={cn(
                "rounded-full outline-none ring-[3px] transition-[box-shadow] duration-200 focus-visible:ring-white",
                sendOpen && recipient.id === c.id ? "ring-[#7fc3ff]" : "ring-[#141a3d]"
              )}
            >
              <Avatar c={c} size={g.AV} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Last transaction → inline history ─────────────────────── */}
      <motion.div
        className={cn("absolute overflow-hidden bg-[#1a2150] ring-1 ring-inset ring-white/10", historyOpen ? "z-30" : "z-10")}
        style={{ bottom: g.S - g.btnTop + g.GAP }}
        initial={false}
        // Open: match the balance panel's inset and radius exactly so none of it peeks out behind
        animate={{
          height: historyOpen ? g.cardOpenH : g.cardH,
          left: historyOpen ? g.PAD : g.PAD + 4,
          right: historyOpen ? g.PAD : g.PAD + 4,
          borderRadius: historyOpen ? 30 : 24,
        }}
        transition={morph}
      >
        <div className="flex h-full flex-col px-4 pb-3 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-white/50">{historyOpen ? "Transactions" : "Last transaction"}</span>
            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              aria-expanded={historyOpen}
              className="rounded text-[12px] text-white/80 underline underline-offset-2 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
            >
              {historyOpen ? "Close" : "View all"}
            </button>
          </div>

          {historyOpen ? (
            <motion.ul
              {...swap}
              data-lenis-prevent
              className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-track]:bg-transparent"
            >
              {txns.map((t) => (
                <TxnRow key={t.id} t={t} fmt={fmt} symbol={currency.symbol} compact />
              ))}
            </motion.ul>
          ) : (
            <div className="mt-auto">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={last.id} {...swap}>
                  <TxnRow t={last} fmt={fmt} symbol={currency.symbol} />
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div className="absolute flex items-center" style={{ left: g.PAD, top: g.btnTop, gap: g.GAP }}>
        <MorphContainer
          isOpen={settingsOpen}
          onOpenChange={setSettingsOpen}
          triggerWidth={g.BTN}
          triggerHeight={g.BTN}
          expandedWidth={g.settingsPanel.width}
          expandedHeight={g.settingsPanel.height}
          expandedRadius={24}
          anchor="bottom-left"
          transition={morph}
          className={cn("bg-[#262f6b]", SURFACE)}
          openClassName={PANEL_OPEN}
          closedClassName={PANEL_REST}
          trigger={({ open }) => (
            <button type="button" onClick={open} aria-label="Wallet settings" className="flex h-full w-full items-center justify-center rounded-full outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/50">
              <Hexagon className="h-5 w-5 stroke-[1.8]" />
            </button>
          )}
        >
          {({ close }) => (
            <div data-morph-content className="absolute bottom-0 left-0 flex flex-col p-4" style={g.settingsPanel}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold">Display</span>
                <button type="button" onClick={close} aria-label="Close settings" className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                  <X className="h-3 w-3 stroke-[2.4]" />
                </button>
              </div>
              <div className="mt-auto space-y-3 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/80">Hide balance</span>
                  <Toggle on={hideBalance} onChange={() => setHideBalance((h) => !h)} label="Hide balance" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80">Show cents</span>
                  <Toggle on={showCents} onChange={() => setShowCents((c) => !c)} label="Show cents" />
                </div>
              </div>
            </div>
          )}
        </MorphContainer>

        <button
          type="button"
          onClick={(e) => {
            press(e.currentTarget)
            setCurrencyIdx((i) => (i + 1) % CURRENCIES.length)
          }}
          aria-label={`Switch currency (showing ${currency.code})`}
          style={{ width: g.BTN, height: g.BTN }}
          className="flex shrink-0 items-center justify-center rounded-full bg-[#262f6b] outline-none ring-1 ring-inset ring-white/10 hover:bg-[#2d377a] focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <ArrowUpDown className="h-5 w-5 stroke-[1.8]" />
        </button>

        <MorphContainer
          isOpen={receiveOpen}
          onOpenChange={setReceiveOpen}
          triggerWidth={g.pillW}
          triggerHeight={g.BTN}
          expandedWidth={g.receivePanel.width}
          expandedHeight={g.receivePanel.height}
          expandedRadius={24}
          anchor="bottom-left"
          transition={morph}
          className={cn("bg-[#2a3274]", SURFACE)}
          openClassName={PANEL_OPEN}
          closedClassName={PANEL_REST}
          trigger={({ open }) => (
            <button type="button" onClick={open} className="flex h-full w-full items-center justify-center gap-1.5 rounded-full font-medium outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/50" style={{ fontSize: g.S >= 380 ? 17 : 15 }}>
              Receive <ArrowDown className="h-4 w-4 stroke-[2.2]" />
            </button>
          )}
        >
          {({ close }) => (
            <div data-morph-content className="absolute bottom-0 left-0 flex flex-col p-4" style={g.receivePanel}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold">Get paid</span>
                <button type="button" onClick={close} aria-label="Close" className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                  <X className="h-3 w-3 stroke-[2.4]" />
                </button>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-white/50">Share your link to receive money.</p>
              {/* real share targets: open the device's Messages / Mail with the link filled in */}
              <div className="mt-auto flex gap-2">
                {[
                  { label: "Message", icon: MessageCircle, href: `sms:?&body=${encodeURIComponent(`Pay me with https://${PAY_LINK}`)}` },
                  { label: "Mail", icon: Mail, href: `mailto:?subject=${encodeURIComponent("Payment link")}&body=${encodeURIComponent(`Pay me with https://${PAY_LINK}`)}` },
                ].map((t) => (
                  <a
                    key={t.label}
                    href={t.href}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-white/[0.07] text-[12px] font-medium text-white/85 outline-none ring-1 ring-inset ring-white/10 transition-colors duration-200 hover:bg-white/[0.11] focus-visible:ring-white/50"
                  >
                    <t.icon className="h-3.5 w-3.5 stroke-[2]" /> {t.label}
                  </a>
                ))}
              </div>
              <button
                type="button"
                onClick={copyLink}
                className="mt-2 flex h-11 items-center justify-between rounded-[14px] bg-white/[0.07] px-3 text-left outline-none ring-1 ring-inset ring-white/10 hover:bg-white/[0.11] focus-visible:ring-white/50"
              >
                <span className="flex flex-col">
                  <span aria-live="polite" className={cn("text-[11px] transition-colors duration-200", copied ? "text-[#7fe0a0]" : "text-white/50")}>
                    {copied ? "Copied" : "Pay link"}
                  </span>
                  <span className="text-[13px] font-medium">{PAY_LINK}</span>
                </span>
                {copied ? <Check className="h-4 w-4 text-[#7fe0a0] stroke-[2.4]" /> : <Copy className="h-4 w-4 text-white/60 stroke-[2]" />}
              </button>
            </div>
          )}
        </MorphContainer>

        <MorphContainer
          isOpen={sendOpen}
          onOpenChange={(o) => (o ? openSend() : closeSend())}
          triggerWidth={g.pillW}
          triggerHeight={g.BTN}
          expandedWidth={g.sendPanel.width}
          expandedHeight={g.sendPanel.height}
          expandedRadius={28}
          anchor="bottom-right"
          zIndex={45}
          closeOnClickOutside={sendStage !== "sending"}
          closeOnEscape={sendStage !== "sending"}
          transition={morph}
          className={cn("bg-[#1d2a63]", SURFACE)}
          openClassName={PANEL_OPEN}
          closedClassName={SEND_REST}
          trigger={({ open }) => (
            <button
              type="button"
              onClick={open}
              className="flex h-full w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-[#4aa8ff] to-[#1a5cff] font-medium outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              style={{ fontSize: g.S >= 380 ? 17 : 15 }}
            >
              Send <ArrowUp className="h-4 w-4 stroke-[2.2]" />
            </button>
          )}
        >
          {() => (
            <div data-morph-content className="absolute bottom-0 right-0" style={g.sendPanel}>
              <AnimatePresence mode="wait" initial={false}>
                {sendStage === "sent" && lastSent ? (
                  <motion.div key="sent" {...swap} className="flex h-full flex-col p-4">
                    <div className="flex items-center gap-3">
                      <motion.span
                        initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: DURATION.view, ease: EASE.emphasis, delay: 0.06 }}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7fe0a0]/15"
                      >
                        <Check className="h-5 w-5 text-[#7fe0a0] stroke-[2.6]" />
                      </motion.span>
                      <span className="flex flex-col">
                        <span className="text-[16px] font-semibold leading-tight">
                          Sent {currency.symbol}{fmt(lastSent.amount)}
                        </span>
                        <span className="text-[12px] text-white/50">New balance {currency.symbol}{fmt(balance)}</span>
                      </span>
                    </div>
                    {/* receipt, anchored under the confirmation */}
                    <dl className="mt-4 divide-y divide-white/[0.07] rounded-[14px] bg-white/[0.05] px-3 text-[12px] ring-1 ring-inset ring-white/[0.07]">
                      {[
                        ["To", lastSent.to],
                        ["Amount", `${currency.symbol}${fmt(lastSent.amount)}`],
                        ["Fee", "Free"],
                        ["Arrives", "Instantly"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex h-8 items-center justify-between">
                          <dt className="text-white/50">{k}</dt>
                          <dd className="font-medium tabular-nums">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <button
                      type="button"
                      onClick={closeSend}
                      className="mt-auto h-11 rounded-full bg-gradient-to-b from-[#4aa8ff] to-[#1a5cff] text-[14px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                      Done
                    </button>
                  </motion.div>
                ) : (
                  <motion.form key="form" {...swap} onSubmit={submitSend} noValidate className="flex h-full flex-col p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold">Send to {recipient.name}</span>
                      <button type="button" onClick={closeSend} disabled={sendStage === "sending"} aria-label="Cancel" className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40">
                        <X className="h-3 w-3 stroke-[2.4]" />
                      </button>
                    </div>
                    <div role="radiogroup" aria-label="Recipient" className="mt-2.5 flex gap-2">
                      {CONTACTS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          role="radio"
                          aria-checked={recipient.id === c.id}
                          aria-label={c.name}
                          disabled={sendStage === "sending"}
                          onClick={() => setRecipient(c)}
                          className={cn(
                            "rounded-full outline-none ring-2 transition-[box-shadow,opacity] duration-200 focus-visible:ring-white",
                            recipient.id === c.id ? "ring-[#7fc3ff]" : "ring-transparent opacity-60 hover:opacity-100"
                          )}
                        >
                          <Avatar c={c} size={30} />
                        </button>
                      ))}
                    </div>
                    <label className={cn("mt-3 flex h-12 items-center gap-1 rounded-[14px] bg-white/[0.07] px-3 ring-1 ring-inset transition-shadow duration-200 focus-within:ring-[#7fc3ff]/70", sendError ? "ring-[#ff8a8a]/70" : "ring-white/10")}>
                      <span className="text-[20px] font-semibold text-white/50">{currency.symbol}</span>
                      <input
                        inputMode="decimal"
                        autoComplete="off"
                        value={amount}
                        onChange={(e) => handleAmount(e.target.value)}
                        disabled={sendStage === "sending"}
                        placeholder="0.00"
                        aria-label="Amount"
                        aria-invalid={!!sendError}
                        className="w-full bg-transparent text-[20px] font-semibold tabular-nums outline-none placeholder:text-white/25"
                      />
                    </label>
                    <span role="alert" className={cn("mt-1.5 h-4 pl-1 text-[11px] tabular-nums", sendError ? "text-[#ff8a8a]" : "text-white/40")}>
                      {sendError || `Balance ${currency.symbol}${fmt(balance)}`}
                    </span>
                    <div className="mt-2 flex gap-1.5" aria-label="Quick amounts">
                      {[25, 50, 100].map((v) => (
                        <button
                          key={v}
                          type="button"
                          disabled={sendStage === "sending"}
                          onClick={() => handleAmount(String(v))}
                          className={cn(
                            "h-8 flex-1 rounded-full text-[12px] font-medium tabular-nums ring-1 ring-inset transition-colors duration-200",
                            amount === String(v) ? "bg-[#7fc3ff]/20 text-white ring-[#7fc3ff]/50" : "bg-white/[0.06] text-white/75 ring-white/10 hover:bg-white/[0.1]"
                          )}
                        >
                          {currency.symbol}{v}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={sendStage === "sending"}
                        onClick={() => handleAmount(String(Math.floor(balance * currency.rate * 100) / 100))}
                        className="h-8 flex-1 rounded-full bg-white/[0.06] text-[12px] font-medium text-white/75 ring-1 ring-inset ring-white/10 transition-colors duration-200 hover:bg-white/[0.1]"
                      >
                        Max
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={sendStage === "sending"}
                      aria-label={amount ? `Send ${currency.symbol}${amount} to ${recipient.name}` : "Send"}
                      className={cn(
                        "relative mt-auto h-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-[#4aa8ff] to-[#1a5cff] text-[14px] font-medium outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-white/70",
                        !amount && sendStage !== "sending" && "opacity-55"
                      )}
                    >
                      {sendStage === "sending" && (
                        <motion.span
                          aria-hidden
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.9, ease: EASE.move }}
                          className="absolute inset-0 origin-left bg-white/20"
                        />
                      )}
                      <span className="relative">{sendStage === "sending" ? "Sending…" : amount ? `Send ${currency.symbol}${amount}` : "Enter an amount"}</span>
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          )}
        </MorphContainer>
      </div>

      {/* Dims the rest while a panel is open so the floating panel reads as the focus */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-20 rounded-[40px] bg-[#05081c] transition-opacity duration-200",
          anyOpen ? "opacity-40" : "opacity-0"
        )}
      />
    </div>
  )
}

function TxnRow({ t, fmt, symbol, compact }: { t: Txn; fmt: (usd: number) => string; symbol: string; compact?: boolean }) {
  const { day, time } = stamp(t.at)
  const Icon = t.icon
  const incoming = t.amount > 0
  // list rows inside "View all", a plain block for the single last-transaction row
  const Row = compact ? "li" : "div"
  return (
    <Row className={cn("flex items-center gap-3", compact && "py-1")}>
      <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[#3b1030]/80 ring-2 ring-inset ring-white/25", t.tint, compact ? "h-8 w-8" : "h-10 w-10")}>
        <Icon className={cn("stroke-[2]", compact ? "h-4 w-4" : "h-5 w-5")} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate font-semibold", compact ? "text-[13px]" : "text-[15px]")}>{t.title}</span>
        <span className="text-[11px] tabular-nums text-white/50">
          {day} · {time}
        </span>
      </span>
      <span className={cn("shrink-0 font-semibold tabular-nums", compact ? "text-[13px]" : "text-[18px]", incoming && "text-[#7fe0a0]")}>
        {incoming ? "+" : ""}
        {symbol}
        {fmt(t.amount)}
      </span>
    </Row>
  )
}

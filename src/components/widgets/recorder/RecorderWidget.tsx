import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, Circle, Pause, Play, Scissors, SlidersHorizontal, Square, X } from "lucide-react"
import { MorphContainer, NumberMorph } from "@/components/custom"
import { DURATION, EASE, GSAP_EASE, SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

/* ── Library (simulated audio: amplitudes are generated from time, not recorded) ── */

type Take = { name: string; seconds: number }
const INITIAL_TAKES: Take[] = [
  { name: "Morning_Idea.wav", seconds: 192 },
  { name: "Bassline_v2.wav", seconds: 1340 },
  { name: "MyFavSong.wav", seconds: 3865 },
  { name: "Room_Tone.wav", seconds: 61 },
  { name: "Vocals_Take3.wav", seconds: 418 },
  { name: "Drum_Loop.wav", seconds: 95 },
  { name: "Interview_A.wav", seconds: 2710 },
  { name: "Field_Rain.wav", seconds: 604 },
  { name: "Guitar_DI.wav", seconds: 233 },
  { name: "Voice_Memo.wav", seconds: 47 },
]
const MAX_TAKES = 24 // storage slots; the screen shows position / total takes
const WINDOW = 60 // seconds of waveform on screen
const STEP = 0.5 // one bar per half second
const BASE_W = 416, BASE_H = 234

const amp = (t: number, seed: number) => {
  const x = Math.sin(t * 12.9898 + seed * 78.233) * 43758.5453
  const noise = x - Math.floor(x)
  const phrase = 0.55 + 0.45 * Math.sin(t / 3.1 + seed) * Math.sin(t / 7.3 + seed * 2)
  return Math.max(0.08, Math.min(1, noise * 0.6 + phrase * 0.55))
}
// bytes per second for PCM stereo
const bytesPerSec = (khz: number, bits: number) => khz * 1000 * (bits / 8) * 2
const fmtSize = (bytes: number) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`)
const hms = (s: number) => {
  const t = Math.floor(s)
  return [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60].map((n) => String(n).padStart(2, "0"))
}
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`

const SM_QUERY = "(min-width: 640px)"
const subscribeSm = (cb: () => void) => {
  const mq = window.matchMedia(SM_QUERY)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
const useWide = () => useSyncExternalStore(subscribeSm, () => window.matchMedia(SM_QUERY).matches, () => true)

type Mode = "recording" | "rec-paused" | "playing" | "stopped"

export default function RecorderWidget() {
  const reduceMotion = useReducedMotion()
  const W = useWide() ? BASE_W : 352
  const scale = W / BASE_W
  const morph = reduceMotion ? { duration: 0 } : SPRING.morph

  const widgetRef = useRef<HTMLDivElement>(null)
  const [takes, setTakes] = useState(INITIAL_TAKES)
  const [current, setCurrent] = useState(2)
  // Opens mid-take like the reference: recording MyFavSong, 01:04:25 in
  const [mode, setMode] = useState<Mode>("recording")
  const [pos, setPos] = useState(3865)
  const [khz, setKhz] = useState(96)
  const [bits, setBits] = useState(24)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [note, setNote] = useState("")
  const noteTimer = useRef<number | undefined>(undefined)

  const take = takes[current]
  const length = take.seconds

  // Clock: recording extends the take, playing moves the playhead
  useEffect(() => {
    if (mode !== "recording" && mode !== "playing") return
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      if (mode === "recording") {
        setTakes((ts) => ts.map((t, i) => (i === current ? { ...t, seconds: t.seconds + dt } : t)))
        setPos((p) => p + dt)
      } else {
        setPos((p) => {
          const next = p + dt
          if (next >= length) {
            setMode("stopped")
            return length
          }
          return next
        })
      }
    }, 100)
    return () => window.clearInterval(id)
  }, [mode, current, length])

  useEffect(() => () => window.clearTimeout(noteTimer.current), [])

  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, { y: 12, opacity: 0, duration: DURATION.enter, ease: GSAP_EASE.easeOutQuart })
    },
    { scope: widgetRef }
  )

  const press = (el: HTMLElement | null) => {
    if (!el || reduceMotion) return
    gsap.fromTo(el, { scale: 0.93 }, { scale: 1, duration: DURATION.press, ease: GSAP_EASE.easeOutQuad })
  }
  const flash = (msg: string) => {
    setNote(msg)
    window.clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => setNote(""), 1800)
  }

  const recording = mode === "recording" || mode === "rec-paused"

  const onRec = () => {
    if (mode === "recording") return setMode("rec-paused")
    if (mode === "rec-paused") return setMode("recording")
    // new take at the end of the list
    if (takes.length >= MAX_TAKES) return flash(`Storage full · ${MAX_TAKES} takes`)
    setTakes((ts) => [...ts, { name: `Take_${String(ts.length + 1).padStart(3, "0")}.wav`, seconds: 0 }])
    setCurrent(takes.length)
    setPos(0)
    setMode("recording")
  }
  const onStop = () => {
    if (recording) flash(`Saved ${take.name}`)
    setMode("stopped")
    setPos(recording ? length : 0)
  }
  const onPlay = () => {
    if (recording) return
    if (mode === "playing") return setMode("stopped")
    if (pos >= length - 0.5) setPos(0)
    setMode("playing")
  }
  const seek = (d: number) => {
    if (recording) return
    setPos((p) => Math.max(0, Math.min(length, p + d)))
  }
  const pickTake = (d: number) => {
    if (recording) return
    setCurrent((c) => (c + d + takes.length) % takes.length)
    setPos(0)
    setMode("stopped")
  }
  const divide = () => {
    if (recording || pos < 1 || pos > length - 1) return flash("Move the playhead inside the take")
    if (takes.length >= MAX_TAKES) return flash(`Storage full · ${MAX_TAKES} takes`)
    const base = take.name.replace(/\.wav$/, "")
    setTakes((ts) => {
      const next = [...ts]
      next.splice(current, 1, { name: `${base}_A.wav`, seconds: pos }, { name: `${base}_B.wav`, seconds: length - pos })
      return next
    })
    flash(`Divided at ${mmss(pos)}`)
    setOptionsOpen(false)
  }

  // Waveform window: the last minute while recording, centred on the playhead otherwise
  const winStart = Math.max(0, recording ? pos - WINDOW * 0.85 : Math.min(pos - WINDOW * 0.5, length - WINDOW))
  const barCount = WINDOW / STEP
  const seed = current * 3 + 1
  const playX = ((pos - winStart) / WINDOW) * 100
  const level = (ch: number) => (mode === "recording" || mode === "playing" ? amp(pos + ch * 0.37, seed + ch) : 0)
  const db = (l: number) => (l > 0 ? Math.round(-40 + l * 36) : null)
  const [H, M, S] = hms(pos)
  const firstLabel = Math.ceil(winStart / 15) * 15

  const swap = reduceMotion
    ? { initial: false as const, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: DURATION.micro, ease: EASE.fade },
      }
  const optionsPanel = { width: 300, height: 148 }

  return (
    <div style={{ width: W, height: (W * 9) / 16 }} className="relative">
      {/* scale lives on its own wrapper so React never fights GSAP over the inner element's transform */}
      <div style={{ width: BASE_W, height: BASE_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
      <div
        ref={widgetRef}
        style={{ width: BASE_W, height: BASE_H }}
        className="relative select-none rounded-[40px] bg-black p-[5px] text-[#141416] shadow-[0_24px_48px_-16px_rgba(0,0,0,0.5)]"
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-[35px] bg-[#f2f2f3]">
          {/* Timeline */}
          <div className="relative h-[66px] shrink-0 border-b border-black/[0.12] px-[16px]">
            <svg viewBox={`0 0 ${barCount} 40`} preserveAspectRatio="none" className="absolute inset-x-[16px] top-[8px] h-[34px] w-[calc(100%-32px)]" aria-hidden>
              <line x1={0} x2={barCount} y1={20} y2={20} stroke="rgba(0,0,0,0.08)" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
              {Array.from({ length: barCount }, (_, i) => {
                const t = winStart + i * STEP
                const recorded = t <= length
                const a = recorded ? amp(t, seed) : 0
                return recorded ? (
                  <rect key={i} x={i + 0.3} width={0.4} y={20 - a * 18} height={a * 36} fill={t <= pos || recording ? "#1b1b1d" : "#b9b9bd"} />
                ) : null
              })}
            </svg>
            {/* playhead */}
            <span className="absolute top-[4px] h-[58px] w-[1.5px] bg-[#e5484d]" style={{ left: `calc(16px + (100% - 32px) * ${playX / 100})` }} />
            <div className="absolute inset-x-[16px] bottom-[5px] h-[14px] text-[11px] tabular-nums text-[#3a3a3d]">
              {Array.from({ length: 5 }, (_, i) => firstLabel + i * 15)
                .filter((t) => t >= winStart && t <= winStart + WINDOW)
                .map((t) => (
                  // a label's anchor slides from its left edge (at 0%) to its right edge (at 100%) so ends never clip
                  <span key={t} className="absolute" style={{ left: `${((t - winStart) / WINDOW) * 100}%`, transform: `translateX(-${((t - winStart) / WINDOW) * 100}%)` }}>
                    {mmss(t)}
                  </span>
                ))}
            </div>
          </div>

          <div className="flex flex-1 items-center gap-[10px] px-[14px]">
            {/* Screen + file */}
            <div className="flex w-[196px] shrink-0 flex-col gap-[6px]">
              <div className="relative flex h-[104px] flex-col overflow-hidden rounded-[14px] bg-[#1c1c1e] px-[10px] py-[8px] text-white">
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.07)_45%,transparent_45.5%)]" />
                <div className="relative flex items-center gap-2 text-[11px] font-semibold">
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-[5px] px-1.5 py-[1px] transition-colors duration-200",
                      mode === "recording" ? "bg-white text-black" : "text-white/70 ring-1 ring-inset ring-white/30"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", mode === "recording" ? "bg-[#e5484d]" : "bg-white/50")} />
                    {mode === "recording" ? "REC" : mode === "rec-paused" ? "PAUSED" : mode === "playing" ? "PLAY" : "STOP"}
                  </span>
                  <span className="text-white/80">{khz >= 96 && bits >= 24 ? "HD" : "SD"}</span>
                  <span className="ml-auto tabular-nums text-white/70">
                    {current + 1}/{takes.length}
                  </span>
                </div>
                <div className="relative mt-auto flex items-end justify-between">
                  <span className="flex flex-col">
                    <span className="text-[11px] text-white/60">
                      {khz.toFixed(2)} kHz · {bits} bit
                    </span>
                    <span role="timer" aria-label={`${H} hours ${M} minutes ${S} seconds`} className="mt-0.5 flex items-baseline gap-[3px] text-[24px] font-light leading-none tabular-nums">
                      <NumberMorph value={H} />
                      <span className="text-[11px] text-white/60">H</span>
                      <NumberMorph value={M} />
                      <span className="text-[11px] text-white/60">M</span>
                      <NumberMorph value={S} />
                      <span className="text-[11px] text-white/60">S</span>
                    </span>
                  </span>
                  {/* L/R level meters */}
                  <span className="mb-[2px] flex flex-col gap-[3px]" aria-hidden>
                    {[0, 1].map((ch) => {
                      const l = level(ch)
                      return (
                        <span key={ch} className="flex items-center gap-1 text-[11px] leading-none text-white/50">
                          {ch ? "R" : "L"}
                          <span className="flex h-[7px] gap-[1px]">
                            {Array.from({ length: 10 }, (_, i) => (
                              <span key={i} className={cn("w-[2px] rounded-[1px]", i / 10 < l ? (i >= 8 ? "bg-[#e5484d]" : "bg-white") : "bg-white/15")} />
                            ))}
                          </span>
                        </span>
                      )
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <MorphContainer
                  isOpen={optionsOpen}
                  onOpenChange={setOptionsOpen}
                  triggerWidth={34}
                  triggerHeight={34}
                  expandedWidth={optionsPanel.width}
                  expandedHeight={optionsPanel.height}
                  expandedRadius={20}
                  anchor="bottom-left"
                  transition={morph}
                  className="bg-white transition-[background-color,box-shadow] duration-200"
                  openClassName="shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_48px_-12px_rgba(0,0,0,0.35)]"
                  closedClassName="shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.08)]"
                  trigger={({ open }) => (
                    <button type="button" onClick={open} aria-label="Recording options" className="flex h-full w-full items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-black/30">
                      <SlidersHorizontal className="h-4 w-4 stroke-[2]" />
                    </button>
                  )}
                >
                  {({ close }) => (
                    <div data-morph-content className="absolute bottom-0 left-0 flex flex-col p-3.5" style={optionsPanel}>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold">Options</span>
                        <button type="button" onClick={close} aria-label="Close options" className="flex h-6 w-6 items-center justify-center rounded-full bg-black/[0.06] hover:bg-black/10">
                          <X className="h-3 w-3 stroke-[2.4]" />
                        </button>
                      </div>
                      <div className="mt-auto space-y-2 text-[12px]">
                        {(
                          [
                            { label: "Sample rate", value: khz, set: setKhz, opts: [44.1, 48, 96], fmt: (v: number) => `${v} kHz` },
                            { label: "Bit depth", value: bits, set: setBits, opts: [16, 24], fmt: (v: number) => `${v}-bit` },
                          ] as const
                        ).map((row) => (
                          <div key={row.label} className="flex items-center justify-between">
                            <span className="text-[#5a5a5f]">{row.label}</span>
                            <div role="radiogroup" aria-label={row.label} className="flex rounded-[8px] bg-black/[0.05] p-0.5">
                              {row.opts.map((o) => (
                                <button
                                  key={o}
                                  type="button"
                                  role="radio"
                                  aria-checked={row.value === o}
                                  disabled={recording}
                                  onClick={() => row.set(o as never)}
                                  className={cn(
                                    "h-6 rounded-[6px] px-2 text-[11px] tabular-nums transition-colors duration-200 disabled:opacity-40",
                                    row.value === o ? "bg-white text-black shadow-[0_1px_2px_rgba(0,0,0,0.12)]" : "text-[#6b6b70] hover:text-black"
                                  )}
                                >
                                  {row.fmt(o)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={divide}
                          disabled={recording}
                          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[8px] bg-black/[0.05] text-[12px] font-medium hover:bg-black/[0.08] disabled:opacity-40"
                        >
                          <Scissors className="h-3.5 w-3.5 stroke-[2]" /> Divide at {mmss(pos)}
                        </button>
                      </div>
                    </div>
                  )}
                </MorphContainer>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={note || take.name} {...swap} aria-live="polite" className="flex min-w-0 flex-col">
                    {note ? (
                      <span className="truncate text-[12px] font-semibold text-[#e5484d]">{note}</span>
                    ) : (
                      <>
                        <span className="truncate text-[12px] font-semibold">{take.name}</span>
                        <span className="text-[11px] tabular-nums text-[#6b6b70]">
                          {fmtSize(length * bytesPerSec(khz, bits))}
                          {db(level(0)) !== null && ` · ${db(level(0))} dB`}
                        </span>
                      </>
                    )}
                  </motion.span>
                </AnimatePresence>


              </div>
            </div>

            {/* Navigation wheel */}
            <div className="relative h-[108px] w-[108px] shrink-0 rounded-full bg-gradient-to-b from-[#fbfbfc] to-[#e8e8ea] shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_6px_14px_-6px_rgba(0,0,0,0.25),inset_0_1px_0_#fff]">
              {(
                [
                  { label: "Previous take", icon: ChevronUp, cls: "left-1/2 top-[6px] -translate-x-1/2", act: () => pickTake(-1) },
                  { label: "Next take", icon: ChevronDown, cls: "left-1/2 bottom-[6px] -translate-x-1/2", act: () => pickTake(1) },
                  { label: "Back 10 seconds", icon: ChevronsLeft, cls: "left-[6px] top-1/2 -translate-y-1/2", act: () => seek(-10) },
                  { label: "Forward 10 seconds", icon: ChevronsRight, cls: "right-[6px] top-1/2 -translate-y-1/2", act: () => seek(10) },
                ] as const
              ).map((b) => (
                <button
                  key={b.label}
                  type="button"
                  aria-label={b.label}
                  disabled={recording}
                  onClick={(e) => {
                    press(e.currentTarget)
                    b.act()
                  }}
                  className={cn("absolute flex h-7 w-7 items-center justify-center rounded-full text-[#3a3a3d] outline-none hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-black/30 disabled:opacity-30", b.cls)}
                >
                  <b.icon className="h-4 w-4 stroke-[2]" />
                </button>
              ))}
              <button
                type="button"
                onClick={(e) => {
                  press(e.currentTarget)
                  onPlay()
                }}
                disabled={recording}
                aria-label={mode === "playing" ? "Pause playback" : "Play"}
                className="absolute left-1/2 top-1/2 flex h-[44px] w-[44px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-b from-white to-[#ededef] shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_3px_8px_-3px_rgba(0,0,0,0.3)] outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:opacity-40"
              >
                {mode === "playing" ? <Pause className="h-4 w-4 fill-[#1b1b1d] stroke-[#1b1b1d]" /> : <Play className="ml-0.5 h-4 w-4 fill-[#1b1b1d] stroke-[#1b1b1d]" />}
              </button>
            </div>

            {/* Transport */}
            <div className="flex flex-1 flex-col items-center justify-center gap-[10px]">
              <TransportButton label="STOP" aria="Stop" onPress={(el) => { press(el); onStop() }}>
                <Square className="h-3.5 w-3.5 fill-[#1b1b1d] stroke-[#1b1b1d]" />
              </TransportButton>
              <TransportButton label="REC/PAUSE" aria={mode === "recording" ? "Pause recording" : "Record"} pressed={mode === "recording"} onPress={(el) => { press(el); onRec() }}>
                <Circle className="h-3.5 w-3.5 fill-[#e5484d] stroke-[#e5484d]" />
              </TransportButton>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

function TransportButton({ label, aria, pressed, onPress, children }: { label: string; aria: string; pressed?: boolean; onPress: (el: HTMLButtonElement) => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        aria-label={aria}
        aria-pressed={pressed}
        onClick={(e) => onPress(e.currentTarget)}
        className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-gradient-to-b from-white to-[#ececee] shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_3px_8px_-3px_rgba(0,0,0,0.3)] outline-none focus-visible:ring-2 focus-visible:ring-black/30"
      >
        {children}
      </button>
      <span className="text-[11px] font-medium leading-none">{label}</span>
    </div>
  )
}

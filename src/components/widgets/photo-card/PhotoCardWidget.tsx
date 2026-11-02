import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { ArrowLeft, Check, Copy, EllipsisVertical, ImageOff, PencilLine, Send, Star, Sun, Thermometer, Trash2, X } from "lucide-react"
import { MorphContainer } from "@/components/custom"
import { DURATION, EASE, GSAP_EASE, SPRING } from "@/lib/motion"
import { BikeArt } from "../shared/BikeArt"
import { cn } from "@/lib/utils"

/* ── Album (illustrated stand-ins — no photo files ship with the project) ── */

type Photo = { id: number; sky: [string, string]; x: number; y: number; zoom: number; at: Date; fav: boolean }
const ago = (days: number, h: number, m: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(h, m, 0, 0)
  return d
}
const makeAlbum = (): Photo[] => [
  { id: 1, sky: ["#3f8fc4", "#a9d3ec"], x: 2, y: 30, zoom: 1.55, at: ago(1, 18, 22), fav: false },
  { id: 2, sky: ["#f0a36b", "#f8d9b8"], x: 10, y: 28, zoom: 1.5, at: ago(2, 7, 41), fav: true },
  { id: 3, sky: ["#5b6fb8", "#c4b5e0"], x: -18, y: 10, zoom: 2.6, at: ago(3, 20, 5), fav: false },
  { id: 4, sky: ["#4ba3a8", "#cdeee6"], x: 0, y: 32, zoom: 1.3, at: ago(6, 13, 12), fav: false },
  { id: 5, sky: ["#2f6fa8", "#9cc8e8"], x: -30, y: 4, zoom: 3, at: ago(9, 16, 48), fav: false },
  { id: 6, sky: ["#e7887a", "#f6d0c2"], x: 8, y: 22, zoom: 1.8, at: ago(12, 9, 3), fav: false },
]
const dayLabel = (d: Date) => {
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((start(new Date()) - start(d)) / 86_400_000)
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
const timeLabel = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

function PhotoArt({ p, className, style }: { p: Photo; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: `linear-gradient(170deg, ${p.sky[0]} 0%, ${p.sky[1]} 100%)`, ...style }}>
      <span aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)]" />
      <BikeArt
        variant="city"
        className="absolute"
        style={{ width: `${p.zoom * 100}%`, left: `${p.x}%`, top: `${p.y}%`, transform: "scaleX(-1)" }}
      />
    </div>
  )
}

const CONTACTS = [
  { id: "ma", name: "Maya", bg: "#ffd2a8" },
  { id: "jo", name: "Jon", bg: "#c7ecff" },
  { id: "li", name: "Lia", bg: "#d9c8ff" },
  { id: "sa", name: "Sam", bg: "#b9f5c9" },
]

const SM_QUERY = "(min-width: 640px)"
const subscribeSm = (cb: () => void) => {
  const mq = window.matchMedia(SM_QUERY)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
const useWide = () => useSyncExternalStore(subscribeSm, () => window.matchMedia(SM_QUERY).matches, () => true)

const BASE = 380
const PANEL_OPEN = "shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_24px_48px_-12px_rgba(0,0,0,0.3)]"
const PANEL_REST = "shadow-[0_0_0_1px_rgba(0,0,0,0),0_0_0_rgba(0,0,0,0)]"

export default function PhotoCardWidget() {
  const reduceMotion = useReducedMotion()
  const S = useWide() ? BASE : 350
  const scale = S / BASE
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
  const [album, setAlbum] = useState<Photo[]>(makeAlbum)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [view, setView] = useState<"photo" | "grid">("photo")
  const [bar, setBar] = useState<"actions" | "edit" | "delete">("actions")
  const [zoomed, setZoomed] = useState(false)
  const [edits, setEdits] = useState<Record<number, { light: number; warmth: number }>>({})
  const [sendOpen, setSendOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [lastDeleted, setLastDeleted] = useState<{ p: Photo; at: number } | null>(null)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  const photo = album[index]
  const edit = photo ? edits[photo.id] ?? { light: 0, warmth: 0 } : { light: 0, warmth: 0 }
  const photoFilter = `brightness(${1 + edit.light / 100}) sepia(${Math.max(0, edit.warmth) / 160}) hue-rotate(${Math.min(0, edit.warmth) / 4}deg) saturate(${1 + edit.warmth / 300})`

  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, { y: 12, opacity: 0, duration: DURATION.enter, ease: GSAP_EASE.easeOutQuart })
    },
    { scope: widgetRef }
  )
  const press = (el: HTMLElement | null) => {
    if (!el || reduceMotion) return
    gsap.fromTo(el, { scale: 0.92 }, { scale: 1, duration: DURATION.press, ease: GSAP_EASE.easeOutQuad })
  }

  const go = (step: number) => {
    if (album.length < 2) return
    setZoomed(false)
    setDirection(step)
    setIndex((i) => (i + step + album.length) % album.length)
  }
  const toggleFav = () => setAlbum((a) => a.map((p, i) => (i === index ? { ...p, fav: !p.fav } : p)))
  const setEdit = (k: "light" | "warmth", v: number) => photo && setEdits((e) => ({ ...e, [photo.id]: { ...edit, [k]: v } }))
  const confirmDelete = () => {
    if (!photo) return
    setLastDeleted({ p: photo, at: index })
    setAlbum((a) => a.filter((_, i) => i !== index))
    setIndex((i) => Math.max(0, Math.min(i, album.length - 2)))
    setBar("actions")
  }
  const undoDelete = () => {
    if (!lastDeleted) return
    setAlbum((a) => {
      const next = [...a]
      next.splice(lastDeleted.at, 0, lastDeleted.p)
      return next
    })
    setIndex(lastDeleted.at)
    setLastDeleted(null)
  }
  const share = (name: string) => {
    setSentTo(name)
    later(() => {
      setSendOpen(false)
      later(() => setSentTo(null), 400)
    }, 1100)
  }
  const copyLink = () => {
    navigator.clipboard?.writeText(`https://photos.example/p/${photo?.id ?? 0}`)
    setCopied(true)
    later(() => setCopied(false), 1600)
  }

  const sendPanel = { width: BASE - 16 - 24, height: 150 }
  const morePanel = { width: 220, height: 168 }

  return (
    <div style={{ width: S, height: S }} className="relative">
      {/* scale lives on its own wrapper so React never fights GSAP over the inner element's transform */}
      <div style={{ width: BASE, height: BASE, transform: `scale(${scale})`, transformOrigin: "top left" }}>
      <div
        ref={widgetRef}
        style={{ width: BASE, height: BASE }}
        className="relative flex select-none flex-col rounded-[36px] bg-white p-[8px] text-[#141416] shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_24px_48px_-16px_rgba(20,30,60,0.28)]"
      >
        {/* Photo / album */}
        <div className="relative h-[282px] shrink-0 overflow-hidden rounded-[28px] bg-[#e9edf2]">
          <AnimatePresence mode="wait" initial={false}>
            {view === "grid" ? (
              <motion.div key="grid" {...swap} className="absolute inset-0 grid grid-cols-3 gap-[3px] p-[3px]">
                {album.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setDirection(i >= index ? 1 : -1)
                      setIndex(i)
                      setView("photo")
                    }}
                    aria-label={`Open photo from ${dayLabel(p.at)} ${timeLabel(p.at)}`}
                    className={cn("relative overflow-hidden rounded-[18px] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white", i === index && "ring-2 ring-inset ring-white")}
                  >
                    <PhotoArt p={p} className="h-full w-full" />
                    {p.fav && <Star className="absolute right-2 top-2 h-3.5 w-3.5 fill-white stroke-white" />}
                  </button>
                ))}
                {album.length === 0 && (
                  <div className="col-span-3 flex flex-col items-center justify-center gap-2 text-[#6b7280]">
                    <ImageOff className="h-6 w-6" />
                    <span className="text-[12px]">No photos left</span>
                  </div>
                )}
              </motion.div>
            ) : photo ? (
              <motion.div key="photo" {...swap} className="absolute inset-0">
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                  <motion.button
                    key={photo.id}
                    type="button"
                    aria-label={zoomed ? "Zoom out" : "Zoom in"}
                    onClick={() => setZoomed((z) => !z)}
                    initial={reduceMotion ? false : { x: `${direction * 100}%` }}
                    animate={{ x: "0%" }}
                    exit={reduceMotion ? undefined : { x: `${direction * -100}%` }}
                    transition={reduceMotion ? { duration: 0 } : { duration: DURATION.move, ease: EASE.move }}
                    drag={zoomed || bar !== "actions" ? false : "x"}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.22}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -50 || info.velocity.x < -400) go(1)
                      else if (info.offset.x > 50 || info.velocity.x > 400) go(-1)
                    }}
                    className={cn("absolute inset-0 outline-none will-change-transform", zoomed ? "cursor-zoom-out" : "cursor-grab active:cursor-grabbing")}
                  >
                    <motion.span
                      animate={{ scale: zoomed ? 1.7 : 1 }}
                      transition={reduceMotion ? { duration: 0 } : { duration: DURATION.expand, ease: EASE.expand }}
                      className="block h-full w-full"
                    >
                      <PhotoArt p={photo} className="h-full w-full" style={{ filter: photoFilter, transition: "filter 120ms linear" }} />
                    </motion.span>
                  </motion.button>
                </AnimatePresence>
                {/* overlay: back + timestamp */}
                <div className="pointer-events-none absolute left-[12px] top-[12px] flex items-center gap-2.5 text-white">
                  <button
                    type="button"
                    onClick={() => {
                      setZoomed(false)
                      setBar("actions")
                      setView("grid")
                    }}
                    aria-label="Back to album"
                    className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/30 outline-none backdrop-blur-sm hover:bg-white/40 focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <ArrowLeft className="h-4 w-4 stroke-[2.2]" />
                  </button>
                  <span className="flex flex-col leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
                    <span className="text-[13px] font-semibold">{dayLabel(photo.at)}</span>
                    <span className="text-[11px] tabular-nums text-white/85">{timeLabel(photo.at)}</span>
                  </span>
                </div>
                {lastDeleted && (
                  <motion.button
                    {...swap}
                    type="button"
                    onClick={undoDelete}
                    className="absolute bottom-[12px] left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur-sm"
                  >
                    Photo deleted · Undo
                  </motion.button>
                )}
              </motion.div>
            ) : (
              <motion.div key="empty" {...swap} className="absolute inset-0 flex flex-col items-center justify-end gap-2 pb-10 text-[#6b7280]">
                <ImageOff className="h-7 w-7 stroke-[1.8]" />
                <span className="text-[13px] font-medium">No photos left</span>
                <button type="button" onClick={() => { setAlbum(makeAlbum()); setIndex(0); setLastDeleted(null) }} className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#141416] shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
                  Restore album
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action bar — swaps to edit sliders or delete confirmation in place */}
        <div className="relative mt-[6px] flex-1">
          <AnimatePresence mode="wait" initial={false}>
            {bar === "actions" && (
              <motion.div key="actions" {...swap} className="absolute inset-0 flex items-center justify-between px-[10px]">
                <MorphContainer
                  isOpen={sendOpen}
                  onOpenChange={setSendOpen}
                  triggerWidth={54}
                  triggerHeight={56}
                  triggerRadius={14}
                  expandedWidth={sendPanel.width}
                  expandedHeight={sendPanel.height}
                  expandedRadius={22}
                  anchor="bottom-left"
                  zIndex={45}
                  transition={morph}
                  className="bg-white transition-[background-color,box-shadow] duration-200"
                  openClassName={PANEL_OPEN}
                  closedClassName={PANEL_REST}
                  trigger={({ open }) => (
                    <ActionButton icon={Send} label="Send" disabled={!photo || view !== "photo"} onPress={open} />
                  )}
                >
                  {({ close }) => (
                    <div data-morph-content className="absolute bottom-0 left-0 flex flex-col p-4" style={sendPanel}>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold">{sentTo ? `Sent to ${sentTo}` : "Send photo"}</span>
                        <button type="button" onClick={close} aria-label="Close" className="flex h-6 w-6 items-center justify-center rounded-full bg-black/[0.06] hover:bg-black/10">
                          <X className="h-3 w-3 stroke-[2.4]" />
                        </button>
                      </div>
                      <div className="mt-auto flex items-end justify-between">
                        {CONTACTS.map((c) => (
                          <button key={c.id} type="button" aria-label={`Send to ${c.name}`} onClick={() => share(c.name)} disabled={!!sentTo} className="flex flex-col items-center gap-1 outline-none disabled:opacity-60">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-semibold text-black/70" style={{ background: c.bg }}>
                              {sentTo === c.name ? <Check className="h-4 w-4 stroke-[2.6]" /> : c.name.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="text-[11px] text-[#5a5a5f]">{c.name}</span>
                          </button>
                        ))}
                        <button type="button" aria-label="Copy link" onClick={copyLink} className="flex flex-col items-center gap-1 outline-none">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.06]">
                            {copied ? <Check className="h-4 w-4 text-[#2f9e5a] stroke-[2.6]" /> : <Copy className="h-4 w-4 stroke-[2]" />}
                          </span>
                          <span aria-live="polite" className="text-[11px] text-[#5a5a5f]">{copied ? "Copied" : "Link"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </MorphContainer>

                <ActionButton
                  icon={Star}
                  label={photo?.fav ? "Favorited" : "Favorite"}
                  active={!!photo?.fav}
                  disabled={!photo || view !== "photo"}
                  onPress={(el) => {
                    press(el)
                    toggleFav()
                  }}
                />
                <ActionButton icon={PencilLine} label="Edit" disabled={!photo || view !== "photo"} onPress={() => { setZoomed(false); setBar("edit") }} />
                <ActionButton icon={Trash2} label="Delete" disabled={!photo || view !== "photo"} onPress={() => setBar("delete")} />

                <MorphContainer
                  isOpen={moreOpen}
                  onOpenChange={setMoreOpen}
                  triggerWidth={54}
                  triggerHeight={56}
                  triggerRadius={14}
                  expandedWidth={morePanel.width}
                  expandedHeight={morePanel.height}
                  expandedRadius={22}
                  anchor="bottom-right"
                  zIndex={45}
                  transition={morph}
                  className="bg-white transition-[background-color,box-shadow] duration-200"
                  openClassName={PANEL_OPEN}
                  closedClassName={PANEL_REST}
                  trigger={({ open }) => <ActionButton icon={EllipsisVertical} label="More" disabled={!photo || view !== "photo"} onPress={open} />}
                >
                  {({ close }) => (
                    <div data-morph-content className="absolute bottom-0 right-0 flex flex-col p-4" style={morePanel}>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold">Info</span>
                        <button type="button" onClick={close} aria-label="Close info" className="flex h-6 w-6 items-center justify-center rounded-full bg-black/[0.06] hover:bg-black/10">
                          <X className="h-3 w-3 stroke-[2.4]" />
                        </button>
                      </div>
                      {photo && (
                        <dl className="mt-auto grid grid-cols-2 gap-y-1.5 text-[12px]">
                          <dt className="text-[#6b7280]">Taken</dt>
                          <dd className="text-right tabular-nums">{dayLabel(photo.at)}, {timeLabel(photo.at)}</dd>
                          <dt className="text-[#6b7280]">Size</dt>
                          <dd className="text-right tabular-nums">4032 × 3024</dd>
                          <dt className="text-[#6b7280]">Edited</dt>
                          <dd className="text-right">{edits[photo.id] && (edit.light || edit.warmth) ? "Yes" : "No"}</dd>
                          <dt className="text-[#6b7280]">Album</dt>
                          <dd className="text-right tabular-nums">{index + 1} of {album.length}</dd>
                        </dl>
                      )}
                    </div>
                  )}
                </MorphContainer>
              </motion.div>
            )}

            {bar === "edit" && (
              <motion.div key="edit" {...swap} className="absolute inset-0 flex items-center gap-3 px-[10px]">
                <div className="flex flex-1 flex-col gap-1.5">
                  {(
                    [
                      { k: "light", label: "Light", icon: Sun },
                      { k: "warmth", label: "Warmth", icon: Thermometer },
                    ] as const
                  ).map((r) => (
                    <label key={r.k} className="flex items-center gap-2 text-[11px] text-[#5a5a5f]">
                      <r.icon className="h-3.5 w-3.5 shrink-0 stroke-[2]" />
                      <span className="w-11 shrink-0">{r.label}</span>
                      <input
                        type="range"
                        min={-40}
                        max={40}
                        value={edit[r.k]}
                        onChange={(e) => setEdit(r.k, Number(e.target.value))}
                        aria-label={r.label}
                        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-black/10 accent-[#141416]"
                      />
                      <span className="w-7 text-right tabular-nums">{edit[r.k] > 0 ? `+${edit[r.k]}` : edit[r.k]}</span>
                    </label>
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  <button type="button" onClick={() => setBar("actions")} className="h-7 rounded-full bg-[#141416] px-3 text-[12px] font-medium text-white">
                    Done
                  </button>
                  <button type="button" onClick={() => photo && setEdits((e) => ({ ...e, [photo.id]: { light: 0, warmth: 0 } }))} className="h-7 rounded-full bg-black/[0.06] px-3 text-[12px] font-medium">
                    Reset
                  </button>
                </div>
              </motion.div>
            )}

            {bar === "delete" && (
              <motion.div key="delete" {...swap} className="absolute inset-0 flex items-center justify-between px-[14px]">
                <span className="flex flex-col">
                  <span className="text-[13px] font-semibold">Delete this photo?</span>
                  <span className="text-[11px] text-[#6b7280]">You can undo right after.</span>
                </span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => setBar("actions")} className="h-9 rounded-full bg-black/[0.06] px-3.5 text-[12px] font-medium">
                    Cancel
                  </button>
                  <button type="button" onClick={confirmDelete} className="h-9 rounded-full bg-[#e5484d] px-3.5 text-[12px] font-medium text-white">
                    Delete
                  </button>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  active,
  disabled,
  onPress,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  disabled?: boolean
  onPress: (el: HTMLButtonElement) => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => onPress(e.currentTarget)}
      disabled={disabled}
      aria-pressed={active}
      className="flex h-[56px] w-[54px] flex-col items-center justify-center gap-1 rounded-[14px] text-[#141416] outline-none transition-colors duration-200 hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-black/20 disabled:opacity-35"
    >
      <Icon className={cn("h-[18px] w-[18px] stroke-[1.8] transition-colors duration-200", active && "fill-[#f5b301] stroke-[#f5b301]")} />
      <span className="text-[11px] font-medium leading-none">{label}</span>
    </button>
  )
}

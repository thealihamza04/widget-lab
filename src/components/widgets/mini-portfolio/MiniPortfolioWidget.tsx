"use client"

import { Fragment, useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import useEmblaCarousel from "embla-carousel-react"
import {
  Sparkles,
  ExternalLink,
  ChevronLeft,
  Check,
  Copy,
  Code2,
  User,
  ArrowUpRight,
  Briefcase,
  Layers,
  Cpu,
  Mail,
  Zap,
  Globe,
  Database,
  Terminal,
  Eye,
  BarChart3,
  Server,
  Cloud,
  ShieldCheck,
  X,
} from "lucide-react"
import { MorphContainer, NumberMorph } from "@/components/custom"
import { DURATION, EASE, SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"

type TabType = "work" | "stack" | "about"

interface ProjectItem {
  id: string
  title: string
  category: string
  metric: string
  metricLabel: string
  description: string
  tech: string[]
  link: string
}

const ALL_PROJECTS: ProjectItem[] = [
  {
    id: "bigbrains",
    title: "BigBrains",
    category: "EdTech & Streaming",
    metric: "100%",
    metricLabel: "Protected Streams",
    description: "Paid marketplace featuring DRM video streaming via Cloudflare R2, Safepay checkout, watch-progress tracking, and AI-assisted lectures.",
    tech: ["React", "Express", "MongoDB", "Cloudflare R2", "Safepay"],
    link: "https://bigbrainss.vercel.app",
  },
  {
    id: "bidzest",
    title: "Bidzest",
    category: "Lead-Gen Engine",
    metric: "27+",
    metricLabel: "Trade Verticals",
    description: "Marketing and lead-generation platform for construction services with dynamic registries, automated sitemaps, and shared Firestore admin.",
    tech: ["Next.js", "TypeScript", "Tailwind", "Firestore", "Admin SDK"],
    link: "https://bidzest.vercel.app",
  },
  {
    id: "yao-pakistan",
    title: "YAO Pakistan",
    category: "NGO Web Platform",
    metric: "100%",
    metricLabel: "Serverless Writes",
    description: "Youth NGO web portal with animated sections, baked-in SEO, secure client-to-Firestore submissions, and dual-admin SDK initialization.",
    tech: ["Next.js", "Cloud Firestore", "Zod", "Tailwind", "SEO"],
    link: "https://yao-pakistan.vercel.app",
  },
  {
    id: "anomaeye",
    title: "AnomaEye",
    category: "Applied AI & CV",
    metric: "Real-Time",
    metricLabel: "Loss Prevention",
    description: "Computer vision platform connecting retail security camera RTSP streams to an intelligent real-time alert pipeline using deep learning.",
    tech: ["Python", "FastAPI", "OpenCV", "Deep Learning", "MJPEG"],
    link: "https://thealihamza04.vercel.app/projects/anomaeye",
  },
  {
    id: "codesphere",
    title: "CodeSphere",
    category: "Developer Hub",
    metric: "<50ms",
    metricLabel: "Search Latency",
    description: "Statically pre-rendered reference hub with custom 3-stage Vite build pipeline, cmdk command palette, and dual-layer SEO injection.",
    tech: ["React", "Vite SSR", "cmdk", "Tailwind", "SSG"],
    link: "https://codes-sphere.vercel.app",
  },
  {
    id: "boardinsight",
    title: "BoardInsight Lahore",
    category: "Educational Analytics",
    metric: "10 Yrs",
    metricLabel: "BISE Gazette Trends",
    description: "Educational data analysis dashboard processing a decade of Lahore board gazette PDFs with interactive trend visualization.",
    tech: ["Next.js", "Python", "PapaParse", "Recharts", "EDA"],
    link: "https://lahore-board-results.vercel.app",
  },
  {
    id: "edtech-platform",
    title: "EdTech Dashboard",
    category: "Role-Based LMS",
    metric: "3 Roles",
    metricLabel: "Teacher • Admin • Super",
    description: "Multi-tenant role-based administration prototype with OKLCH tokens, analytical telemetry charts, and accessible form validations.",
    tech: ["Next.js 16", "React Server Components", "Recharts", "OKLCH"],
    link: "https://thealihamza04.vercel.app/projects/edtech-platform",
  },
]

const ALL_TECH_STACK = [
  { name: "React & Next.js", category: "Frontend", level: "99%", icon: Code2 },
  { name: "TypeScript", category: "Languages", level: "98%", icon: Cpu },
  { name: "Node.js & Express", category: "Backend", level: "96%", icon: Server },
  { name: "Python & FastAPI", category: "AI & Backend", level: "94%", icon: Terminal },
  { name: "Computer Vision", category: "Applied AI", level: "92%", icon: Eye },
  { name: "Tailwind CSS", category: "Styling", level: "99%", icon: Sparkles },
  { name: "Cloud Firestore", category: "Database", level: "96%", icon: Database },
  { name: "MongoDB", category: "Database", level: "95%", icon: Layers },
  { name: "Cloudflare R2", category: "Storage", level: "93%", icon: Cloud },
  { name: "Recharts & D3", category: "Data Viz", level: "92%", icon: BarChart3 },
  { name: "Vite & SSR", category: "Tooling", level: "95%", icon: Zap },
  { name: "Zod Validation", category: "Architecture", level: "97%", icon: ShieldCheck },
]

const BRAND_TIMELINE = [
  {
    role: "Frontend Developer",
    company: "CodeWingz",
    period: "2026 — Present",
    highlight: "Engineering component-driven web systems & high-performance Next.js architectures.",
  },
  {
    role: "Full-Stack Developer",
    company: "Bidzest",
    period: "2025",
    highlight: "Architected 27-vertical lead generation platform with Firestore and admin aggregator.",
  },
  {
    role: "Full-Stack Developer",
    company: "BigBrains",
    period: "2025",
    highlight: "Delivered scalable EdTech marketplace with video streaming & payment gateways.",
  },
]

// Expanded morph panel sizes (content is pinned at this size so it never reflows mid-morph)
const CONNECT_PANEL = { width: 244, height: 184 }
const DETAIL_PANEL = { width: 290, height: 172 }

export default function MiniPortfolioWidget() {
  const reduceMotion = useReducedMotion()
  const morphTransition = reduceMotion ? { duration: 0 } : undefined
  const tabMotion = reduceMotion
    ? { initial: false as const, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: DURATION.fade, ease: EASE.fade },
      }
  const copyTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(copyTimer.current), [])

  const [activeTab, setActiveTab] = useState<TabType>("work")
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0)
  const [isProjectDetailOpen, setIsProjectDetailOpen] = useState(false)
  const [isConnectOpen, setIsConnectOpen] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)

  // Interactive Stat Switchers
  const [statMode, setStatMode] = useState<0 | 1>(0)
  const [availability, setAvailability] = useState(true)

  // Embla Carousel (Gesture / Swipe without arrow buttons)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    watchDrag: !isProjectDetailOpen,
  })

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => {
      setCurrentProjectIndex(emblaApi.selectedScrollSnap())
      setIsProjectDetailOpen(false)
    }
    emblaApi.on("select", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
    }
  }, [emblaApi])

  // Embla's snap runs on requestAnimationFrame; if the page is throttled or hidden
  // mid-snap it can freeze between slides (and a dropped frame leaves its loop thinking it
  // is still running). Settle straight onto the target when that happens.
  useEffect(() => {
    if (!emblaApi) return
    let timer: number | undefined
    const snapIfDrifted = () => {
      const engine = emblaApi.internalEngine()
      if (engine.dragHandler.pointerDown()) return
      if (Math.abs(engine.location.get() - engine.target.get()) > 0.5) {
        // scrollTo() is a no-op when the target is already set, so finish the snap directly
        engine.animation.stop()
        engine.scrollBody.useDuration(0)
        engine.animation.update()
        engine.animation.render(1)
        engine.animation.update()
        engine.scrollBody.useDuration(emblaApi.internalEngine().options.duration)
      }
    }
    const checkSoon = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(snapIfDrifted, 900)
    }
    const onVisible = () => {
      if (!document.hidden) snapIfDrifted()
    }
    emblaApi.on("pointerUp", checkSoon)
    emblaApi.on("select", checkSoon)
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", snapIfDrifted)
    return () => {
      window.clearTimeout(timer)
      emblaApi.off("pointerUp", checkSoon)
      emblaApi.off("select", checkSoon)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", snapIfDrifted)
    }
  }, [emblaApi])

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard?.writeText("thealihamza04@gmail.com")
    setCopiedEmail(true)
    window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopiedEmail(false), 2000)
  }

  const toggleStatMode = () => {
    setStatMode((prev) => (prev === 0 ? 1 : 0))
  }

  return (
    <div
      className="relative w-[350px] sm:w-[380px] aspect-square bg-gradient-to-b from-[#fbfbfa] to-[#f3f3f1] text-[#111214] rounded-[36px] p-5 sm:p-6 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.22)] border border-black/[0.08] select-none overflow-hidden flex flex-col justify-between font-sans"
      style={{
        boxShadow:
          "0 30px 60px -15px rgba(15, 23, 42, 0.22), 0 1px 2px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 1)",
      }}
    >
      {/* ========================================================
          1. HEADER: Avatar + Identity + Status & Connect Morph Button
          ======================================================== */}
      <div
        className={cn(
          "flex items-center justify-between w-full relative shrink-0 transition-all",
          isConnectOpen ? "z-40" : "z-20"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Avatar: generic user icon */}
          <div
            aria-hidden
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-b from-white to-[#ececea] ring-1 ring-black/[0.08] shadow-[0_2px_8px_rgba(15,23,42,0.10)]"
          >
            <User className="w-5 h-5 sm:w-[22px] sm:h-[22px] text-[#3c4149] stroke-[1.8]" />
          </div>

          {/* Name & Availability: Consistent Hierarchy (16px / 11px) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-1.5">
              <h2 className="text-[16px] font-semibold text-[#111214] leading-none">
                Ali Hamza
              </h2>
              <span className="text-[11px] font-normal text-[#6b7280] leading-none">
                Lahore, PK
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAvailability((prev) => !prev)}
              title="Click to toggle availability status"
              className="flex items-center gap-1.5 text-left cursor-pointer group"
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full transition-colors duration-300 inline-block shrink-0",
                  availability
                    ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.45)]"
                    : "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.45)]"
                )}
              />
              <span className="text-[11px] font-medium text-[#6b7280] group-hover:text-[#3c4149] transition-colors leading-none">
                {availability ? "Available for work" : "In active sprints"}
              </span>
            </button>
          </div>
        </div>

        {/* Morphing "Connect" Button (Compact, sleek pill) */}
        <MorphContainer
          isOpen={isConnectOpen}
          onOpenChange={setIsConnectOpen}
          triggerWidth={70}
          triggerHeight={26}
          triggerRadius={13}
          expandedWidth={CONNECT_PANEL.width}
          expandedHeight={CONNECT_PANEL.height}
          expandedRadius={22}
          anchor="top-right"
          zIndex={50}
          transition={morphTransition}
          className="bg-white text-[#111214] ring-1 ring-black/[0.06] shadow-[0_24px_48px_-12px_rgba(15,23,42,0.22)]"
          trigger={
            <button
              type="button"
              onClick={() => setIsConnectOpen(true)}
              className="w-full h-full flex items-center justify-center gap-1 text-[11px] font-medium text-[#3c4149] hover:text-[#111214] bg-black/[0.04] hover:bg-black/[0.08] rounded-full border border-black/[0.08] transition-colors cursor-pointer select-none px-2.5 leading-none"
            >
              <Sparkles className="w-3 h-3 text-[#0b0c0e] stroke-[2]" />
              <span>Connect</span>
            </button>
          }
        >
          {({ close }) => (
            <div
              data-morph-content
              className="absolute top-0 right-0 flex flex-col justify-between p-4 box-border"
              style={CONNECT_PANEL}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                <span className="text-[13px] font-semibold text-[#111214] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#0b0c0e] stroke-[2]" /> Start a Project
                </span>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="w-5 h-5 flex items-center justify-center rounded-full text-[#6b7280] hover:text-[#111214] hover:bg-black/[0.06] transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3 stroke-[2.4]" />
                </button>
              </div>

              {/* Email One-click copy */}
              <div className="my-auto py-1">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#f6f7f9] hover:bg-[#f0f1f4] border border-black/[0.06] hover:border-black/20 transition-all cursor-pointer group"
                >
                  <div className="flex flex-col text-left">
                    <span
                      aria-live="polite"
                      className={cn(
                        "text-[11px] font-normal transition-colors duration-200",
                        copiedEmail ? "text-emerald-600" : "text-[#6b7280]"
                      )}
                    >
                      {copiedEmail ? "Copied to clipboard" : "Direct Email"}
                    </span>
                    <span className="text-[12px] font-medium text-[#3c4149] group-hover:text-[#111214] truncate max-w-[155px]">
                      thealihamza04@gmail.com
                    </span>
                  </div>
                  <span className="relative w-3.5 h-3.5 shrink-0">
                    <AnimatePresence initial={false}>
                      <motion.span
                        key={copiedEmail ? "copied" : "copy"}
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.8 }}
                        transition={{ duration: DURATION.micro, ease: EASE.fade }}
                        className="absolute inset-0"
                      >
                        {copiedEmail ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#6b7280] group-hover:text-[#111214] stroke-[2]" />
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </button>
              </div>

              {/* Bottom Quick Links */}
              <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] text-[11px]">
                <a
                  href="https://github.com/thealihamza04"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#6b7280] hover:text-[#0b0c0e] flex items-center gap-1 transition-colors font-medium"
                >
                  GitHub <ArrowUpRight className="w-3 h-3 stroke-[2]" />
                </a>
                <a
                  href="https://linkedin.com/in/thealihamza04"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#6b7280] hover:text-[#0b0c0e] flex items-center gap-1 transition-colors font-medium"
                >
                  LinkedIn <Globe className="w-3 h-3 stroke-[2]" />
                </a>
                <a
                  href="https://x.com/thealihamza04"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#6b7280] hover:text-[#0b0c0e] flex items-center gap-1 transition-colors font-medium"
                >
                  Twitter <ArrowUpRight className="w-3 h-3 stroke-[2]" />
                </a>
              </div>
            </div>
          )}
        </MorphContainer>
      </div>

      {/* ========================================================
          2. METRICS / STATS: Sleek, Unboxed Single-line Row (Saves ~32px)
          ======================================================== */}
      <motion.div
        whileTap={reduceMotion ? undefined : { scale: 0.985 }}
        onClick={toggleStatMode}
        title="Click to toggle alternate stats"
        className="flex items-center justify-between px-2 py-1 cursor-pointer select-none shrink-0 my-0.5 relative z-10"
      >
        {(
          [
            statMode === 0
              ? { value: 3, unit: "", label: "yrs experience" }
              : { value: 1850, unit: "+", label: "commits" },
            statMode === 0
              ? { value: ALL_PROJECTS.length, unit: "", label: "apps shipped" }
              : { value: 27, unit: "+", label: "verticals" },
            statMode === 0
              ? { value: 99, unit: "%", label: "vitals" }
              : { value: 100, unit: "%", label: "csat" },
          ] as const
        ).map((stat, i) => (
          <Fragment key={i}>
            {i > 0 && <span aria-hidden className="w-px h-3 bg-black/10" />}
            <div className="flex items-baseline gap-1">
              <span className="text-[14px] font-semibold text-[#111214] leading-none tabular-nums inline-flex items-baseline">
                <NumberMorph value={stat.value} />
                {stat.unit && <span>{stat.unit}</span>}
              </span>
              <span className="text-[11px] font-normal text-[#6b7280] leading-none">
                {stat.label}
              </span>
            </div>
          </Fragment>
        ))}
      </motion.div>

      {/* ========================================================
          3. SEGMENTED TABS: Clean, subtle track (no rigid card border)
          ======================================================== */}
      <div className="flex items-center p-0.5 bg-black/[0.03] rounded-xl shrink-0 my-1 relative z-10">
        {(
          [
            { id: "work", label: "Work", icon: Briefcase },
            { id: "stack", label: "Stack", icon: Code2 },
            { id: "about", label: "Journey", icon: User },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <motion.button
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id)
                setIsProjectDetailOpen(false)
              }}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-1.5 py-1 text-[12px] font-medium rounded-lg transition-colors cursor-pointer",
                isActive ? "text-[#111214]" : "text-[#6b7280] hover:text-[#3c4149]"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="portfolio-tab-indicator"
                  transition={reduceMotion ? { duration: 0 } : SPRING.indicator}
                  className="absolute inset-0 bg-white rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.04)]"
                />
              )}
              <Icon className={cn("w-3.5 h-3.5 relative z-10 stroke-[2]", isActive ? "text-[#0b0c0e]" : "text-[#6b7280]")} />
              <span className="relative z-10">{tab.label}</span>
            </motion.button>
          )
        })}
      </div>

      {/* ========================================================
          4. MAIN CONTENT AREA: Spacious & Uncluttered
          ======================================================== */}
      <div className="relative flex-1 min-h-0 w-full flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* TAB 1: WORK (Gesture / Swipe Carousel across ALL 7 PROJECTS) */}
          {activeTab === "work" && (
            <motion.div
              key="tab-work"
              {...tabMotion}
              className="w-full h-full"
            >
              {/* Embla Carousel Viewport */}
              <div
                ref={emblaRef}
                // Focus can natively scroll this overflow-hidden viewport and strand Embla mid-slide
                onScroll={(e) => {
                  e.currentTarget.scrollLeft = 0
                }}
                // Bleeds to the widget edge so slides are clipped (and faded) there, not at the card
                style={{
                  maskImage:
                    "linear-gradient(to right, transparent, #000 var(--fade), #000 calc(100% - var(--fade)), transparent)",
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent, #000 var(--fade), #000 calc(100% - var(--fade)), transparent)",
                }}
                className="-mx-5 sm:-mx-6 [--fade:20px] sm:[--fade:24px] h-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
              >
                <div className="flex h-full">
                  {ALL_PROJECTS.map((project, idx) => {
                    const isThisDetailOpen =
                      isProjectDetailOpen && currentProjectIndex === idx
                    return (
                      <div
                        key={project.id}
                        inert={idx !== currentProjectIndex}
                        className="min-w-0 flex-[0_0_calc(100%-20px)] sm:flex-[0_0_calc(100%-24px)] px-2.5 sm:px-3 h-full"
                      >
                        <div className="w-full h-full flex flex-col p-4 rounded-[20px] bg-white ring-1 ring-inset ring-black/[0.06] relative overflow-hidden group">
                          {/* Category + Title + Description, anchored to the top */}
                          <div
                            className={cn(
                              "flex flex-col relative z-10 transition-opacity duration-200",
                              isThisDetailOpen ? "opacity-0" : "opacity-100"
                            )}
                          >
                            <span className="text-[11px] font-medium text-[#6b7280] leading-none">
                              {project.category}
                            </span>
                            <h3 className="mt-1.5 text-[18px] font-semibold text-[#0b0c0e] leading-tight">
                              {project.title}
                            </h3>
                            <p className="mt-1.5 text-[12px] font-normal text-[#4b5058] line-clamp-2 leading-relaxed">
                              {project.description}
                            </p>
                            <div className="mt-2.5 flex items-center gap-1.5 overflow-hidden">
                              {project.tech.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="px-2 py-1 text-[11px] font-medium rounded-full ring-1 ring-inset ring-black/[0.07] text-[#4b5058] leading-none whitespace-nowrap"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Bottom: Headline metric + Morphing Explore Detail Button */}
                          <div className="flex items-end justify-between relative z-10 mt-auto pt-3 border-t border-black/[0.05]">
                            <div
                              className={cn(
                                "flex flex-col gap-1 transition-opacity duration-200",
                                isThisDetailOpen ? "opacity-0" : "opacity-100"
                              )}
                            >
                              <span className="text-[20px] font-semibold text-[#0b0c0e] leading-none tabular-nums">
                                {project.metric}
                              </span>
                              <span className="text-[11px] font-normal text-[#6b7280] leading-none">
                                {project.metricLabel}
                              </span>
                            </div>

                            {/* Minimal & Spacious Explore Morph */}
                            <MorphContainer
                              isOpen={isThisDetailOpen}
                              onOpenChange={(open) => {
                                if (open) setCurrentProjectIndex(idx)
                                setIsProjectDetailOpen(open)
                              }}
                              triggerWidth={84}
                              triggerHeight={30}
                              triggerRadius={15}
                              expandedWidth={DETAIL_PANEL.width}
                              expandedHeight={DETAIL_PANEL.height}
                              expandedRadius={16}
                              anchor="bottom-right"
                              zIndex={35}
                              transition={morphTransition}
                              className="bg-white text-[#111214] ring-1 ring-black/[0.06] shadow-[0_24px_48px_-12px_rgba(15,23,42,0.22)]"
                              trigger={
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCurrentProjectIndex(idx)
                                    setIsProjectDetailOpen(true)
                                  }}
                                  className="w-full h-full flex items-center justify-center gap-1 text-[12px] font-medium text-white bg-[#0b0c0e] hover:bg-[#26282c] rounded-full transition-colors cursor-pointer select-none leading-none shadow-[0_4px_12px_-4px_rgba(11,12,14,0.5)]"
                                >
                                  <span>Explore</span>
                                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.2]" />
                                </button>
                              }
                            >
                              {({ close }) => (
                                <div
                                  data-morph-content
                                  className="absolute bottom-0 right-0 flex flex-col justify-between p-3.5 box-border"
                                  style={DETAIL_PANEL}
                                >
                                  {/* Header: Project Title + Back */}
                                  <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06]">
                                    <h4 className="text-[14px] font-semibold text-[#111214] leading-none">
                                      {project.title}
                                    </h4>

                                    <button
                                      type="button"
                                      onClick={close}
                                      aria-label="Back"
                                      className="text-[11px] font-medium text-[#6b7280] hover:text-[#111214] flex items-center gap-1 bg-black/[0.04] hover:bg-black/[0.08] px-2 py-1 rounded-md transition-colors cursor-pointer leading-none"
                                    >
                                      <ChevronLeft className="w-3 h-3 stroke-[2]" /> Back
                                    </button>
                                  </div>

                                  {/* Description: Clean, complete & fully readable without line-clamp */}
                                  <div className="my-auto py-1">
                                    <p className="text-[12px] font-normal text-[#3c4149] leading-relaxed select-text">
                                      {project.description}
                                    </p>
                                  </div>

                                  {/* Bottom: Minimal Live App Link */}
                                  <div className="flex items-center justify-end pt-1.5 border-t border-black/[0.06]">
                                    <a
                                      href={project.link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white bg-[#0b0c0e] hover:bg-[#26282c] px-3 py-1.5 rounded-full transition-colors leading-none"
                                    >
                                      <span>Live App</span>
                                      <ExternalLink className="w-3 h-3 stroke-[2]" />
                                    </a>
                                  </div>
                                </div>
                              )}
                            </MorphContainer>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: TECH STACK: Outlined pills on the shared white surface */}
          {activeTab === "stack" && (
            <motion.div
              key="tab-stack"
              {...tabMotion}
              className="w-full h-full rounded-[20px] bg-white ring-1 ring-inset ring-black/[0.06] p-3"
            >
              <div data-lenis-prevent className="w-full h-full overflow-y-auto flex flex-wrap gap-1.5 content-start pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 hover:[&::-webkit-scrollbar-thumb]:bg-black/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                {ALL_TECH_STACK.map((tech) => {
                  const Icon = tech.icon
                  return (
                    <span
                      key={tech.name}
                      title={tech.category}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ring-1 ring-inset ring-black/[0.07] hover:ring-black/[0.14] text-[#3c4149] hover:text-[#0b0c0e] text-[12px] font-medium leading-none transition-colors select-none"
                    >
                      <Icon className="w-3.5 h-3.5 stroke-[2] text-[#6b7280]" />
                      <span>{tech.name}</span>
                    </span>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* TAB 3: JOURNEY: Vertical timeline, current role marked solid */}
          {activeTab === "about" && (
            <motion.div
              key="tab-about"
              {...tabMotion}
              className="w-full h-full rounded-[20px] bg-white ring-1 ring-inset ring-black/[0.06] relative px-4 py-3.5 flex flex-col justify-between"
            >
              {/* One continuous rail through every dot center; the last row masks the tail */}
              <span aria-hidden className="absolute left-[19.5px] top-[21px] bottom-[14px] w-px bg-black/[0.1]" />
              {BRAND_TIMELINE.map((item, i) => (
                <div key={item.company} className="relative flex gap-3 text-left">
                  <div className="relative flex flex-col items-center pt-[3px]">
                    {i === BRAND_TIMELINE.length - 1 && (
                      <span aria-hidden className="absolute top-[7px] -bottom-4 w-[3px] bg-white" />
                    )}
                    <span
                      className={cn(
                        "relative w-2 h-2 rounded-full shrink-0",
                        i === 0 ? "bg-[#0b0c0e]" : "ring-[1.5px] ring-inset ring-black/25 bg-white"
                      )}
                    />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12px] font-semibold text-[#0b0c0e] leading-snug truncate">
                        {item.role}{" "}
                        <span className="font-normal text-[#6b7280]">· {item.company}</span>
                      </span>
                      <span className="text-[11px] font-normal text-[#6b7280] leading-none tabular-nums shrink-0">
                        {item.period}
                      </span>
                    </div>
                    <span className="text-[11px] font-normal text-[#6b7280] truncate mt-0.5 leading-normal">
                      {item.highlight}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

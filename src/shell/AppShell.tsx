import { Component, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Search, TriangleAlert, X } from "lucide-react"
import { FitToWidth } from "@/components/custom"
import { cn } from "@/lib/utils"
import { byId, CATEGORIES, WIDGETS, type WidgetEntry } from "./registry"

/* ── Routing: #/<widget-id> (no router dependency; links are shareable) ── */

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb)
  return () => window.removeEventListener("hashchange", cb)
}
const readRoute = () => decodeURIComponent(window.location.hash.replace(/^#\/?/, "")) || null
const useRoute = () => useSyncExternalStore(subscribeHash, readRoute, () => null)
const go = (id: string | null) => {
  window.location.hash = id ? `/${id}` : ""
  window.scrollTo({ top: 0 })
}

const matches = (w: WidgetEntry, q: string) => {
  const s = q.trim().toLowerCase()
  return !s || w.name.toLowerCase().includes(s) || w.category.toLowerCase().includes(s) || w.description.toLowerCase().includes(s)
}

/* ── Shell ─────────────────────────────────────────────────────────── */

export default function AppShell() {
  const route = useRoute()
  const current = byId(route)
  const [query, setQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  // ⌘K / Ctrl+K or "/" focuses search (ignored while typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault()
        if (current && window.innerWidth < 768) go(null)
        requestAnimationFrame(() => searchRef.current?.focus())
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [current])

  useEffect(() => {
    document.title = current ? `${current.name} · Widgets` : "Widgets"
  }, [current])

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] antialiased selection:bg-white/15">
      <div className="mx-auto flex w-full max-w-[1400px]">
        {/* Sidebar: always on desktop; on phones the list *is* the home page */}
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 border-r border-[#27272a] md:block">
          <WidgetNav query={query} setQuery={setQuery} searchRef={searchRef} activeId={current?.id ?? null} />
        </aside>

        <main className="min-w-0 flex-1">
          {route && !current ? (
            <NotFound id={route} />
          ) : current ? (
            <WidgetPage key={current.id} widget={current} />
          ) : (
            <IndexPage query={query} setQuery={setQuery} searchRef={searchRef} />
          )}
        </main>
      </div>
    </div>
  )
}

/* ── Navigation list (sidebar) ─────────────────────────────────────── */

function SearchField({ query, setQuery, searchRef, className }: { query: string; setQuery: (q: string) => void; searchRef: React.RefObject<HTMLInputElement | null>; className?: string }) {
  return (
    <label className={cn("flex h-9 items-center gap-2 rounded-md border border-[#27272a] bg-[#09090b] px-2.5 text-[13px] transition-colors focus-within:border-[#52525b]", className)}>
      <Search className="h-4 w-4 shrink-0 text-[#71717a]" />
      <input
        ref={searchRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setQuery("")
            e.currentTarget.blur()
          }
          if (e.key === "Enter") {
            const first = WIDGETS.find((w) => matches(w, query))
            if (first) go(first.id)
          }
        }}
        placeholder="Search widgets…"
        aria-label="Search widgets"
        className="w-full bg-transparent outline-none placeholder:text-[#71717a]"
      />
      {query && (
        <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="rounded p-0.5 text-[#71717a] hover:text-[#fafafa]">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </label>
  )
}

function WidgetNav({ query, setQuery, searchRef, activeId }: { query: string; setQuery: (q: string) => void; searchRef: React.RefObject<HTMLInputElement | null>; activeId: string | null }) {
  const groups = useMemo(() => CATEGORIES.map((c) => ({ c, items: WIDGETS.filter((w) => w.category === c && matches(w, query)) })).filter((g) => g.items.length), [query])
  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <SearchField query={query} setQuery={setQuery} searchRef={searchRef} />
      </div>
      {/* own scroll area: wheel scrolls the list, not the page */}
      <nav data-lenis-prevent aria-label="Widgets" className="flex-1 overflow-y-auto px-3 pb-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#27272a] [&::-webkit-scrollbar-track]:bg-transparent">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); go(null) }}
          className={cn("mb-3 flex h-8 items-center rounded-md px-2 text-[13px] font-medium transition-colors", activeId === null ? "bg-[#27272a] text-[#fafafa]" : "text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#fafafa]")}
        >
          All widgets
        </a>
        {groups.map(({ c, items }) => (
          <div key={c} className="mb-4">
            <h4 className="mb-1 px-2 text-[12px] font-medium text-[#71717a]">{c}</h4>
            {items.map((w) => (
              <a
                key={w.id}
                href={`#/${w.id}`}
                onClick={(e) => { e.preventDefault(); go(w.id) }}
                onPointerEnter={() => void w.load()}
                aria-current={activeId === w.id ? "page" : undefined}
                className={cn(
                  "flex h-8 items-center justify-between rounded-md px-2 text-[13px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/25",
                  activeId === w.id ? "bg-[#27272a] font-medium text-[#fafafa]" : "text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#fafafa]"
                )}
              >
                <span className="truncate">{w.name}</span>
                {w.isNew && <span className="rounded border border-[#3f3f46] px-1 text-[10px] font-medium leading-4 text-[#d4d4d8]">New</span>}
              </a>
            ))}
          </div>
        ))}
        {!groups.length && <p className="px-2 text-[13px] text-[#71717a]">No widgets match “{query}”.</p>}
      </nav>
    </div>
  )
}

/* ── Index page: text only, nothing heavy mounts here ──────────────── */

function IndexPage({ query, setQuery, searchRef }: { query: string; setQuery: (q: string) => void; searchRef: React.RefObject<HTMLInputElement | null> }) {
  const list = WIDGETS.filter((w) => matches(w, query))
  return (
    <div className="px-4 pb-16 pt-8 md:px-10 md:pt-10">
      <h1 className="text-[28px] font-semibold leading-tight md:text-[32px]">Widgets</h1>
      <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-[#a1a1aa]">
        {WIDGETS.length} interactive widgets. Pick one to open it on its own canvas — only the widget you open is loaded and running.
      </p>
      {/* phones have no sidebar, so search lives here */}
      <SearchField query={query} setQuery={setQuery} searchRef={searchRef} className="mt-6 max-w-[420px] md:hidden" />

      {CATEGORIES.map((c) => {
        const items = list.filter((w) => w.category === c)
        if (!items.length) return null
        return (
          <section key={c} className="mt-10">
            <h2 className="text-[13px] font-medium text-[#71717a]">{c}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((w) => (
                <a
                  key={w.id}
                  href={`#/${w.id}`}
                  onClick={(e) => { e.preventDefault(); go(w.id) }}
                  onPointerEnter={() => void w.load()}
                  className="group flex flex-col rounded-xl border border-[#27272a] bg-[#0c0c0e] p-4 outline-none transition-colors hover:border-[#3f3f46] hover:bg-[#111113] focus-visible:ring-2 focus-visible:ring-white/25"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-medium text-[#fafafa]">{w.name}</span>
                    <span className="flex items-center gap-2">
                      {w.isNew && <span className="rounded border border-[#3f3f46] px-1 text-[10px] font-medium leading-4 text-[#d4d4d8]">New</span>}
                      <ChevronRight className="h-4 w-4 text-[#52525b] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#a1a1aa]" />
                    </span>
                  </span>
                  <span className="mt-1.5 text-[13px] leading-snug text-[#a1a1aa]">{w.description}</span>
                </a>
              ))}
            </div>
          </section>
        )
      })}
      {!list.length && (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <Search className="h-6 w-6 text-[#52525b]" />
          <p className="text-[14px] text-[#a1a1aa]">No widgets match “{query}”.</p>
          <button type="button" onClick={() => setQuery("")} className="mt-1 rounded-md border border-[#27272a] px-3 py-1.5 text-[13px] hover:bg-[#18181b]">
            Clear search
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Widget page: one widget on a canvas ───────────────────────────── */

function WidgetPage({ widget }: { widget: WidgetEntry }) {
  const i = WIDGETS.indexOf(widget)
  const prev = WIDGETS[(i - 1 + WIDGETS.length) % WIDGETS.length]
  const next = WIDGETS[(i + 1) % WIDGETS.length]
  const [run, setRun] = useState(0)
  const [size, setSize] = useState<string | null>(null)
  // callback ref: the box only exists once the lazy widget has loaded (after Suspense resolves)
  const [sizeEl, setSizeEl] = useState<HTMLDivElement | null>(null)

  // show the widget's real design size (FitToWidth may be scaling it on narrow screens)
  useEffect(() => {
    const el = sizeEl
    if (!el) return
    const ro = new ResizeObserver(() => {
      // el > FitToWidth outer > inner (inner's layout box = the widget's natural size)
      const w = el.firstElementChild?.firstElementChild as HTMLElement | null | undefined
      if (w && w.offsetWidth) setSize(`${w.offsetWidth} × ${w.offsetHeight}`)
    })
    ro.observe(el)
    const inner = el.firstElementChild?.firstElementChild
    if (inner) ro.observe(inner)
    return () => ro.disconnect()
  }, [sizeEl])

  return (
    <div className="px-4 pb-16 pt-5 md:px-10 md:pt-8">
      {/* phones: back to the list */}
      <a href="#" onClick={(e) => { e.preventDefault(); go(null) }} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[#a1a1aa] hover:text-[#fafafa] md:hidden">
        <ArrowLeft className="h-4 w-4" /> All widgets
      </a>

      <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-[13px] text-[#71717a] md:flex">
        <a href="#" onClick={(e) => { e.preventDefault(); go(null) }} className="hover:text-[#fafafa]">Widgets</a>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>{widget.category}</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-[#fafafa]">{widget.name}</span>
      </nav>

      <h1 className="mt-3 text-[26px] font-semibold leading-tight md:text-[30px]">{widget.name}</h1>
      <p className="mt-2 max-w-[620px] text-[15px] leading-relaxed text-[#a1a1aa]">{widget.description}</p>

      {/* Preview canvas */}
      <div className="mt-6 overflow-hidden rounded-xl border border-[#27272a]">
        <div className="flex h-10 items-center justify-between border-b border-[#27272a] bg-[#0c0c0e] px-3">
          <span className="text-[12px] font-medium text-[#a1a1aa]">Preview</span>
          <span className="flex items-center gap-3">
            {size && <span className="text-[11px] tabular-nums text-[#71717a]">{size}</span>}
            <button
              type="button"
              onClick={() => setRun((r) => r + 1)}
              className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-[#a1a1aa] outline-none hover:bg-[#18181b] hover:text-[#fafafa] focus-visible:ring-2 focus-visible:ring-white/25"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restart
            </button>
          </span>
        </div>
        <div
          className="flex min-h-[460px] items-center justify-center px-4 py-10 md:min-h-[560px] md:px-10"
          style={{
            backgroundColor: "#09090b",
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        >
          <WidgetBoundary key={run} onRetry={() => setRun((r) => r + 1)}>
            <Suspense fallback={<div className="h-[280px] w-[280px] animate-pulse rounded-[32px] bg-[#18181b]" aria-label="Loading widget" />}>
              <div ref={setSizeEl} className="w-full">
                <FitToWidth>
                  <widget.Component />
                </FitToWidth>
              </div>
            </Suspense>
          </WidgetBoundary>
        </div>
      </div>

      {/* Prev / next, shadcn-docs style */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <a href={`#/${prev.id}`} onClick={(e) => { e.preventDefault(); go(prev.id) }} onPointerEnter={() => void prev.load()} className="flex h-9 min-w-0 items-center gap-1.5 rounded-md border border-[#27272a] px-3 text-[13px] hover:bg-[#18181b]">
          <ChevronLeft className="h-4 w-4 shrink-0" /> <span className="truncate">{prev.name}</span>
        </a>
        <a href={`#/${next.id}`} onClick={(e) => { e.preventDefault(); go(next.id) }} onPointerEnter={() => void next.load()} className="flex h-9 min-w-0 items-center gap-1.5 rounded-md border border-[#27272a] px-3 text-[13px] hover:bg-[#18181b]">
          <span className="truncate">{next.name}</span> <ChevronRight className="h-4 w-4 shrink-0" />
        </a>
      </div>
    </div>
  )
}

function NotFound({ id }: { id: string }) {
  return (
    <div className="flex flex-col items-start px-4 pb-16 pt-10 md:px-10">
      <TriangleAlert className="h-6 w-6 text-[#71717a]" />
      <h1 className="mt-3 text-[22px] font-semibold">Widget not found</h1>
      <p className="mt-1 text-[14px] text-[#a1a1aa]">There’s no widget called “{id}”.</p>
      <a href="#" onClick={(e) => { e.preventDefault(); go(null) }} className="mt-4 rounded-md border border-[#27272a] px-3 py-1.5 text-[13px] hover:bg-[#18181b]">
        Browse all widgets
      </a>
    </div>
  )
}

/* One misbehaving widget shouldn't blank the whole app */
class WidgetBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <TriangleAlert className="h-6 w-6 text-[#71717a]" />
        <p className="text-[14px] text-[#a1a1aa]">This widget failed to load.</p>
        <button type="button" onClick={this.props.onRetry} className="rounded-md border border-[#27272a] px-3 py-1.5 text-[13px] hover:bg-[#18181b]">
          Try again
        </button>
      </div>
    )
  }
}

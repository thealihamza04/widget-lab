import { useState, useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { GSAP_EASE } from "@/lib/motion"
import { useReducedMotion } from "motion/react"

export default function StacksCardWidget() {
  const reduceMotion = useReducedMotion()
  const [liked, setLiked] = useState(true)
  const [bookmarked, setBookmarked] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)

  const widgetRef = useRef<HTMLDivElement>(null)
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const graphicInnerRef = useRef<HTMLDivElement>(null)
  const headerTextRef = useRef<HTMLDivElement>(null)
  const heartBtnRef = useRef<HTMLButtonElement>(null)
  const bookmarkBtnRef = useRef<HTMLButtonElement>(null)

  // GSAP entrance
  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, {
        scale: 0.95,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      })
    },
    { scope: widgetRef }
  )

  /*
   * SNAPPY & SMOOTH INLINE EXPANSION & COLLAPSE (FAST ~0.26s):
   * Snappy spring-like responsive transition without sluggishness.
   */
  const handleToggleZoom = () => {
    const nextZoom = !isZoomed
    setIsZoomed(nextZoom)

    const grid = gridContainerRef.current
    const text = headerTextRef.current
    const graphic = graphicInnerRef.current

    if (!grid || !text || !graphic) return

    const tl = gsap.timeline({
      defaults: { ease: "power2.out", duration: 0.28 },
    })

    if (nextZoom) {
      // Fast collapse text from 1fr to 0fr
      tl.to(grid, {
        gridTemplateRows: "0fr 1fr",
        duration: 0.28,
        ease: "power2.out",
      }, 0)
        .to(text, {
          opacity: 0,
          y: -8,
          duration: 0.2,
          ease: "power2.in",
        }, 0)
    } else {
      // Fast restore text row back to 1fr
      tl.to(grid, {
        gridTemplateRows: "1fr 2fr",
        duration: 0.28,
        ease: "power2.out",
      }, 0)
        .to(text, {
          opacity: 1,
          y: 0,
          duration: 0.24,
          ease: "power2.out",
        }, 0.05)
    }
  }

  const handleLikeClick = () => {
    if (heartBtnRef.current) {
      gsap.fromTo(
        heartBtnRef.current,
        { scale: 0.8 },
        { scale: 1, duration: 0.25, ease: GSAP_EASE.easeOutBack }
      )
    }
    setLiked((prev) => !prev)
  }

  const handleBookmarkClick = () => {
    if (bookmarkBtnRef.current) {
      gsap.fromTo(
        bookmarkBtnRef.current,
        { scale: 0.8 },
        { scale: 1, duration: 0.25, ease: GSAP_EASE.easeOutBack }
      )
    }
    setBookmarked((prev) => !prev)
  }

  return (
    <div
      ref={widgetRef}
      className="relative w-[380px] sm:w-[420px] aspect-[1/1] bg-[#121212] text-white p-6 shadow-2xl flex flex-col justify-between select-none overflow-hidden rounded-[38px]"
      style={{
        boxShadow: "0 35px 70px -15px rgba(0, 0, 0, 0.95)",
      }}
    >
      {/* 1. Header: Orange Icon + stacks.co */}
      <div className="flex items-center gap-2 pl-1 pt-0.5 pb-1">
        <div className="w-[20px] h-[20px] rounded-full bg-[#f95716] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white stroke-[2.8]" fill="none" stroke="currentColor">
            <line x1="12" y1="3" x2="12" y2="20" />
            <line x1="4.5" y1="7.5" x2="19.5" y2="16.5" />
            <line x1="4.5" y1="16.5" x2="19.5" y2="7.5" />
          </svg>
        </div>
        <span className="text-[13px] font-medium text-white">
          stacks.co
        </span>
      </div>

      {/* 2. Main White Card */}
      <div className="w-full bg-white text-black rounded-[24px] p-4 flex flex-col shadow-xl overflow-hidden my-auto flex-1">
        {/* Card Header: Asterisk Logo + STACKS CO. (Fixed at top) */}
        <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.08] shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#111111] stroke-[2.6]" fill="none" stroke="currentColor">
            <line x1="12" y1="3" x2="12" y2="21" />
            <line x1="4.5" y1="7.5" x2="19.5" y2="16.5" />
            <line x1="4.5" y1="16.5" x2="19.5" y2="7.5" />
          </svg>
          <span className="text-[11px] font-bold font-mono text-black/55 uppercase">
            STACKS CO.
          </span>
        </div>

        {/* Smooth CSS Grid Parent Container: Animates from [1fr 2fr] to [0fr 1fr] */}
        <div
          ref={gridContainerRef}
          className="grid flex-1 overflow-hidden"
          style={{
            gridTemplateRows: "1fr 2fr",
            transition: "grid-template-rows 0.28s cubic-bezier(0.25, 1, 0.5, 1)",
          }}
        >
          {/* Animated Text Row */}
          <div className="overflow-hidden min-h-0 flex flex-col justify-center">
            <div ref={headerTextRef} className="py-2.5">
              <h2
                className="text-[25px] sm:text-[26px] font-normal text-[#141414] leading-[1.12]"
                style={{
                  fontFamily: "var(--font-sans)",
                }}
              >
                Activating the
                <br />
                Bitcoin economy
              </h2>
            </div>
          </div>

          {/* Animated Artwork Row (Expands to occupy the full white card) */}
          <div className="overflow-hidden min-h-0 flex flex-col justify-end pt-1 pb-0.5">
            <div
              ref={graphicInnerRef}
              onClick={handleToggleZoom}
              className="relative w-full h-full bg-[#f95716] rounded-[18px] overflow-hidden cursor-pointer shadow-inner flex items-center justify-center transition-all duration-300"
              title={isZoomed ? "Click to resize back" : "Click to expand image"}
            >
              <svg
                className="w-full h-full"
                viewBox="0 0 350 220"
                fill="none"
                preserveAspectRatio="none"
              >
                {Array.from({ length: 27 }).map((_, i) => {
                  const x = 18 + i * 12.07
                  const dist = Math.abs(i - 13)

                  const yTop = 16 + dist * 8.6
                  const yBottom = dist < 7 ? 136 + dist * 10.5 : 210
                  const hasLowerSegment = dist <= 4
                  const yLowerTop = 166 + dist * 9.5

                  return (
                    <g key={`stack-col-${i}`}>
                      <line
                        x1={x}
                        y1={yTop}
                        x2={x}
                        y2={yBottom}
                        stroke="white"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                      />
                      {hasLowerSegment && (
                        <line
                          x1={x}
                          y1={yLowerTop}
                          x2={x}
                          y2={210}
                          stroke="white"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                        />
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Social Icons */}
      <div className="flex items-center justify-between px-2 pt-1 pb-0.5 text-white/50">
        <div className="flex items-center gap-4">
          <button
            ref={heartBtnRef}
            onClick={handleLikeClick}
            type="button"
            aria-label="Like"
            className="cursor-pointer focus:outline-none"
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-[19px] h-[19px] transition-transform ${liked ? "fill-[#e11d48]" : "fill-[#333333]"
                }`}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Comment"
            className="cursor-pointer focus:outline-none"
          >
            <svg viewBox="0 0 24 24" className="w-[19px] h-[19px] fill-[#262626]">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Share"
            className="cursor-pointer focus:outline-none"
          >
            <svg viewBox="0 0 24 24" className="w-[19px] h-[19px] fill-[#262626]">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>

        <button
          ref={bookmarkBtnRef}
          onClick={handleBookmarkClick}
          type="button"
          aria-label="Save"
          className="cursor-pointer focus:outline-none"
        >
          <svg
            viewBox="0 0 24 24"
            className={`w-[19px] h-[19px] ${bookmarked ? "fill-white" : "fill-[#262626]"
              }`}
          >
            <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

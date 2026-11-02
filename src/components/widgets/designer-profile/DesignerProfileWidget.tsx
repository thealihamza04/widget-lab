import { useState, useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useReducedMotion } from "motion/react"
import { PlusCircle, Phone, Check } from "lucide-react"

export default function DesignerProfileWidget() {
  const reduceMotion = useReducedMotion()
  const [hired, setHired] = useState(false)
  const [contacted, setContacted] = useState(false)
  const widgetRef = useRef<HTMLDivElement>(null)
  const hireBtnRef = useRef<HTMLButtonElement>(null)
  const contactBtnRef = useRef<HTMLButtonElement>(null)

  // GSAP Entrance
  useGSAP(
    () => {
      if (reduceMotion) return
      gsap.from(widgetRef.current, {
        scale: 0.94,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      })
    },
    { scope: widgetRef }
  )

  // Button Click Animations complying with Rulebook (only the pressed button animates, subtle feedback)
  const handleHireClick = () => {
    if (hireBtnRef.current) {
      gsap.fromTo(
        hireBtnRef.current,
        { scale: 0.96 },
        { scale: 1, duration: 0.2, ease: "power2.out" }
      )
    }
    setHired((prev) => !prev)
  }

  const handleContactClick = () => {
    if (contactBtnRef.current) {
      gsap.fromTo(
        contactBtnRef.current,
        { scale: 0.96 },
        { scale: 1, duration: 0.2, ease: "power2.out" }
      )
    }
    setContacted((prev) => !prev)
  }

  return (
    <div
      ref={widgetRef}
      className="relative w-[380px] sm:w-[410px] aspect-video bg-[#141414] text-white rounded-[32px] p-6 shadow-2xl flex flex-col justify-between select-none overflow-hidden border border-white/[0.04]"
      style={{
        boxShadow:
          "0 30px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)",
      }}
    >
      {/* 1. Header: Product Designer & 6+ Projects delivered */}
      <div className="flex items-center justify-between text-xs text-[#8e8e8e]">
        <span className="font-normal text-[13px] text-white/90">
          Product Designer
        </span>
        <span className="font-normal text-[12px] text-[#71717a]">
          6+ Projects delivered
        </span>
      </div>

      {/* 2. Middle Profile Identity: Avatar + Name + Availability */}
      <div className="flex items-center gap-3.5 my-1">
        {/* Avatar with warm yellow/beige circular background matching Apple 3D Memoji */}
        <div className="relative w-12 h-12 rounded-full bg-[#fde047] flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white/10 shadow-md">
          <img
            src="/ansh_avatar.jpg"
            alt="Ansh Singh"
            className="w-full h-full object-cover scale-110 translate-y-0.5"
          />
        </div>

        {/* Name & Availability Pill */}
        <div className="flex flex-col">
          <h2 className="text-[17px] font-semibold text-white leading-tight">
            Ansh Singh
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] inline-block shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
            <span className="text-[12px] font-normal text-[#a1a1aa]">
              Now Available for work
            </span>
          </div>
        </div>
      </div>

      {/* 3. Three-Column Meta Row (Based in, Focus, Reply time) */}
      <div className="grid grid-cols-3 gap-2 py-0.5">
        {/* Col 1 */}
        <div className="flex flex-col space-y-0.5">
          <span className="text-[11px] font-normal text-[#71717a]">
            Based in
          </span>
          <span className="text-[13px] font-medium text-white">
            Mumbai, IND
          </span>
        </div>

        {/* Col 2 */}
        <div className="flex flex-col space-y-0.5">
          <span className="text-[11px] font-normal text-[#71717a]">
            Focus
          </span>
          <span className="text-[13px] font-medium text-white truncate">
            SaaS & Fintech
          </span>
        </div>

        {/* Col 3 */}
        <div className="flex flex-col space-y-0.5">
          <span className="text-[11px] font-normal text-[#71717a]">
            Reply time
          </span>
          <span className="text-[13px] font-medium text-white">
            &lt;24hrs
          </span>
        </div>
      </div>

      {/* 4. Action Buttons Group */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* Hire Me Button */}
        <button
          ref={hireBtnRef}
          onClick={handleHireClick}
          type="button"
          className="h-11 rounded-[16px] bg-[#2a2a2a] hover:bg-[#323232] active:bg-[#262626] border border-white/[0.04] text-white flex items-center justify-center gap-2 text-[14px] font-medium transition-colors cursor-pointer"
        >
          {hired ? (
            <>
              <Check className="w-4 h-4 text-[#22c55e]" />
              <span>Requested</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4 text-white/80" />
              <span>Hire Me</span>
            </>
          )}
        </button>

        {/* Contact Button */}
        <button
          ref={contactBtnRef}
          onClick={handleContactClick}
          type="button"
          className="h-11 rounded-[16px] bg-[#222222] hover:bg-[#2a2a2a] active:bg-[#1f1f1f] border border-white/[0.04] text-white flex items-center justify-center gap-2 text-[14px] font-medium transition-colors cursor-pointer"
        >
          {contacted ? (
            <>
              <Check className="w-4 h-4 text-[#22c55e]" />
              <span>Connected</span>
            </>
          ) : (
            <>
              <Phone className="w-4 h-4 text-white/80" />
              <span>Contact</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

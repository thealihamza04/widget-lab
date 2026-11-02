import { useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { Minus, Plus, Sparkles, Flame, Check } from "lucide-react"
import { MorphContainer, NumberMorph } from "@/components/custom"
import { cn } from "@/lib/utils"

export default function BananaItemWidget() {
  const reduceMotion = useReducedMotion()
  const [quantity, setQuantity] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)

  const unitPrice = 2.5
  const totalPrice = (quantity * unitPrice).toFixed(2)
  const formattedCount = String(quantity).padStart(3, "0")

  const handleIncrement = () => {
    setQuantity((prev) => Math.min(999, prev + 1))
  }

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(0, prev - 1))
  }

  const handleSelectBulk = (qty: number) => {
    setQuantity(qty)
    setIsOptionsOpen(false)
  }

  return (
    <div
      className="relative w-full max-w-[420px] sm:max-w-[460px] bg-white text-gray-900 rounded-[34px] p-5 sm:p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)] border border-gray-100 select-none overflow-hidden"
      style={{
        fontFamily: "var(--font-sans)",
      }}
    >
      <div className="flex flex-col w-full">
          {/* ========================================================
              TOP ROW: Banana Image on Left + Title, Info & Controls on Right
              ======================================================== */}
          <div className="flex items-center gap-4 sm:gap-5 w-full">
            {/* Left: Realistic Banana Image with Smooth Zoom */}
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsZoomed((prev) => !prev)}
              className="relative w-[110px] sm:w-[125px] h-[100px] sm:h-[110px] flex items-center justify-center shrink-0 cursor-pointer"
              title="Click to zoom image"
            >
              <motion.img
                src="/banana-cutout.png"
                alt="Banana 5 pcs"
                animate={{
                  scale: isZoomed ? 1.25 : 1,
                }}
                className="w-full h-full object-contain filter drop-shadow-md select-none pointer-events-none"
              />
            </motion.div>

            {/* Right: Title, Description, Price & Morphing Stepper */}
            <div className="flex flex-col justify-between flex-1 min-w-0">
              <div>
                <h2 className="text-[20px] sm:text-[22px] font-bold text-gray-900 leading-tight whitespace-nowrap">
                  Banana 5 pcs
                </h2>

                <p
                  onClick={() => setIsExpanded((prev) => !prev)}
                  title="Click to view nutrition details"
                  className="text-[12px] sm:text-[13px] text-gray-400 font-normal leading-relaxed mt-1 line-clamp-2 cursor-pointer hover:text-gray-600 transition-colors"
                >
                  Lorem Ipsum Lorem Ipsum Lorem
                  <br />
                  Lorem Ipsum
                </p>
              </div>

              {/* Bottom Row: Price & Stepper Button */}
              <div className="flex items-center justify-between mt-3 pt-1 relative">
                {/* Price Display: strictly whitespace-nowrap, immune to sibling resizing */}
                <div className="text-[17px] font-bold text-gray-900 whitespace-nowrap shrink-0">
                  <NumberMorph value={totalPrice} prefix="$" />
                </div>

                {/* Stepper with Generic MorphContainer: Zero layout shift */}
                <MorphContainer
                  isOpen={isOptionsOpen}
                  onOpenChange={setIsOptionsOpen}
                  triggerWidth={114}
                  triggerHeight={36}
                  triggerRadius={18}
                  expandedWidth={236}
                  expandedHeight={134}
                  expandedRadius={24}
                  anchor="bottom-right"
                  transition={reduceMotion ? { duration: 0 } : undefined}
                  // ring as the first shadow layer instead of a border (a border would shift content 1px)
                  className="bg-[#111111] text-white shadow-[0_0_0_1px_rgba(38,38,38,0.8),0_12px_36px_rgba(0,0,0,0.24)]"
                  trigger={
                    <div className="w-full h-full flex items-center justify-between px-2.5 whitespace-nowrap">
                      {/* Decrement Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDecrement()
                        }}
                        aria-label="Decrease quantity"
                        className="w-6 h-6 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-85 transition-all cursor-pointer focus:outline-none"
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[2.4]" />
                      </button>

                      {/* Count Pill Button */}
                      <button
                        type="button"
                        onClick={() => setIsOptionsOpen(true)}
                        title="Click for quick bulk selection"
                        aria-label="Choose quantity"
                        className="font-mono text-[13px] font-semibold text-white whitespace-nowrap px-1.5 py-0.5 rounded hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none select-none text-center min-w-[32px]"
                      >
                        <NumberMorph value={formattedCount} />
                      </button>

                      {/* Increment Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleIncrement()
                        }}
                        aria-label="Increase quantity"
                        className="w-6 h-6 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-85 transition-all cursor-pointer focus:outline-none"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.4]" />
                      </button>
                    </div>
                  }
                >
                  {({ close }) => (
                    <div data-morph-content className="absolute bottom-0 right-0 flex flex-col justify-between p-3 px-3.5" style={{ width: 236, height: 134 }}>
                      {/* Header: Title & Close X */}
                      <div className="flex items-center justify-between pb-1 border-b border-neutral-800/80">
                        <span className="text-[11px] font-medium text-neutral-300">
                          Quick Select
                        </span>
                        <button
                          type="button"
                          onClick={close}
                          aria-label="Close"
                          className="w-5 h-5 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-90 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 rotate-45 stroke-[2.4]" />
                        </button>
                      </div>

                      {/* Presets */}
                      <div className="grid grid-cols-3 gap-1.5 py-1">
                        {[1, 5, 10].map((qty) => (
                          <button
                            key={qty}
                            type="button"
                            onClick={() => handleSelectBulk(qty)}
                            className={cn(
                              "py-1 rounded-lg text-[11px] font-semibold text-center transition-colors cursor-pointer",
                              quantity === qty
                                ? "bg-amber-400 text-neutral-950 shadow-xs"
                                : "bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200"
                            )}
                          >
                            {qty} pcs
                          </button>
                        ))}
                      </div>

                      {/* Bottom Bar: Total & Done */}
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
                        <NumberMorph
                          value={totalPrice}
                          prefix="$"
                          suffix=" total"
                          className="text-[11px] text-neutral-400 font-medium"
                        />
                        <button
                          type="button"
                          onClick={close}
                          className="px-2.5 py-0.5 rounded-md bg-white hover:bg-neutral-100 text-neutral-950 text-[11px] font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </MorphContainer>
              </div>
            </div>
          </div>

          {/* ========================================================
              INLINE ADAPTIVE EXPANSION: Nutrition & Facts
              ======================================================== */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="nutrition-accordion"
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: "auto",
                  opacity: 1,
                  transition: {
                    height: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
                    opacity: { duration: 0.22, delay: 0.06 },
                  },
                }}
                exit={{
                  height: 0,
                  opacity: 0,
                  transition: {
                    opacity: { duration: 0.14 },
                    height: { duration: 0.25, ease: [0.25, 1, 0.5, 1] },
                  },
                }}
                className="overflow-hidden"
              >
                <motion.div
                  initial={{ y: -8 }}
                  animate={{ y: 0 }}
                  exit={{ y: -8 }}
                  transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                  className="pt-3.5 mt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] sm:text-xs text-gray-500"
                >
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-medium text-gray-600 whitespace-nowrap">Organic Cavendish</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="font-medium text-gray-600 whitespace-nowrap">105 kcal / pc</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                    </div>
                    <span className="font-semibold text-emerald-600 whitespace-nowrap">In Stock</span>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
    </div>
  )
}

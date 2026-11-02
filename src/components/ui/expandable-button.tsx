import { useState, useRef, useEffect, useCallback, type ReactNode } from "react"
import { motion, AnimatePresence, MotionConfig } from "motion/react"
import { X } from "lucide-react"

export interface ExpandableOption {
  id: string
  label: string
  icon?: ReactNode
  onClick: () => void
}

export interface ExpandableButtonProps {
  compactLabel: string
  compactIcon?: ReactNode
  options: ExpandableOption[]
  className?: string
  onExpandChange?: (expanded: boolean) => void
}

const springTransition = {
  type: "spring" as const,
  stiffness: 240,
  damping: 24,
  mass: 0.5,
}

export function ExpandableButton({
  compactLabel,
  compactIcon,
  options,
  className = "",
  onExpandChange,
}: ExpandableButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleExpand = useCallback(
    (state: boolean) => {
      setIsExpanded(state)
      onExpandChange?.(state)
    },
    [onExpandChange]
  )

  // Click outside listener to collapse back smoothly
  useEffect(() => {
    if (!isExpanded) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        toggleExpand(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isExpanded, toggleExpand])

  return (
    <MotionConfig transition={springTransition}>
      <motion.div
        ref={containerRef}
        layout
        className={`relative inline-flex items-center overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-2xs ${className}`}
      >
        <AnimatePresence initial={false} mode="wait">
          {!isExpanded ? (
            /* ========================================================
               COMPACT STATE: Starts small (icon + label)
               ======================================================== */
            <motion.button
              key="compact-button"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => toggleExpand(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer select-none focus:outline-none"
            >
              {compactIcon && (
                <motion.span layout className="flex items-center">
                  {compactIcon}
                </motion.span>
              )}
              <motion.span layout>{compactLabel}</motion.span>
            </motion.button>
          ) : (
            /* ========================================================
               EXPANDED STATE: Expands width to offer more options
               ======================================================== */
            <motion.div
              key="expanded-options"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1 p-1 bg-white select-none"
            >
              {options.map((opt) => (
                <motion.button
                  key={opt.id}
                  layout
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  whileTap={{ scale: 0.93 }}
                  type="button"
                  onClick={() => {
                    opt.onClick()
                    toggleExpand(false)
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 active:scale-95 transition-colors cursor-pointer focus:outline-none border border-transparent hover:border-blue-100"
                >
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className="whitespace-nowrap">{opt.label}</span>
                </motion.button>
              ))}

              {/* Close / Collapse button */}
              <motion.button
                layout
                whileTap={{ scale: 0.88 }}
                type="button"
                onClick={() => toggleExpand(false)}
                aria-label="Collapse options"
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none ml-0.5"
              >
                <X className="w-3.5 h-3.5 stroke-[2.2]" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  )
}

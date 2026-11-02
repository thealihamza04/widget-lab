"use client"

import { useMemo } from "react"
import { motion, AnimatePresence, type Transition } from "motion/react"
import { cn } from "@/lib/utils"

export interface NumberMorphProps {
  /** The value to display. Can be a number (e.g., 25.5) or string (e.g., "$25.50" or "005") */
  value: number | string
  /** Optional prefix (e.g., "$", "€", "+"). If not provided and value starts with symbol, it's auto-detected */
  prefix?: string
  /** Optional suffix (e.g., "%", " kcal", "/ mo") */
  suffix?: string
  /** CSS class for outer container */
  className?: string
  /** CSS class applied to individual digit / char slots */
  digitClassName?: string
  /** Custom transition for sliding digits */
  transition?: Transition
}

const DEFAULT_SPRING: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 24,
  mass: 0.5,
}

interface DigitColumnProps {
  digit: string
  className?: string
  transition?: Transition
}

/**
 * Individual sliding digit column.
 * Slides vertically between digits without any absolute overlay collision or overlap.
 */
function DigitColumn({ digit, className, transition }: DigitColumnProps) {
  const isNumber = !isNaN(Number(digit)) && digit !== " "

  if (!isNumber) {
    // Non-digit characters (like commas, dots, spaces) are completely stationary
    return (
      <span className={cn("inline-block select-none", className)}>
        {digit === " " ? "\u00A0" : digit}
      </span>
    )
  }

  return (
    <span
      className={cn(
        "relative inline-flex h-[1em] overflow-hidden leading-none select-none",
        className
      )}
      style={{ verticalAlign: "baseline" }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={digit}
          initial={{ y: "80%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-80%", opacity: 0 }}
          transition={transition || DEFAULT_SPRING}
          className="inline-block"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/**
 * NumberMorph
 *
 * A high-performance, layout-isolated number & currency animator.
 *
 * Guarantees:
 * 1. ZERO OVERLAP: Symbols (like '$', '€', '.') have their own dedicated stationary
 *    slots and never overlap with entering/exiting numbers.
 * 2. Digit-Level Granularity: Only the digits that actually change animate, keeping
 *    unchanged digits visually stable (satisfies Rule 64 of Widget Design Rulebook).
 * 3. Natural Flow: Integrates seamlessly inline with typography.
 */
export function NumberMorph({
  value,
  prefix = "",
  suffix = "",
  className,
  digitClassName,
  transition = DEFAULT_SPRING,
}: NumberMorphProps) {
  // Parse string value into prefix and character list
  const { parsedPrefix, characters, parsedSuffix } = useMemo(() => {
    let raw = String(value)

    let autoPrefix = prefix
    let autoSuffix = suffix

    // Auto-detect leading currency symbol if prefix prop not explicitly provided
    if (!autoPrefix) {
      const match = raw.match(/^([^\d\-+]+)/)
      if (match) {
        autoPrefix = match[1]
        raw = raw.slice(autoPrefix.length)
      }
    }

    // Auto-detect trailing suffix if suffix prop not explicitly provided
    if (!autoSuffix) {
      const match = raw.match(/([^\d.,\s]+)$/)
      if (match) {
        autoSuffix = match[1]
        raw = raw.slice(0, raw.length - autoSuffix.length)
      }
    }

    // Array of character tokens with stable positions
    const chars = raw.split("").map((char, index) => ({
      key: `col-${index}`,
      char,
    }))

    return {
      parsedPrefix: autoPrefix,
      characters: chars,
      parsedSuffix: autoSuffix,
    }
  }, [value, prefix, suffix])

  return (
    <span
      // marks live-changing digits so motion audits can tell them apart from layout shifts
      data-number-morph=""
      className={cn(
        "inline-flex items-baseline font-inherit tabular-nums tracking-normal select-none",
        className
      )}
    >
      {/* Static Prefix Symbol (e.g. $) - Guaranteed NEVER to be overlapped */}
      {parsedPrefix && (
        <span className="inline-block shrink-0 mr-[1px] select-none">
          {parsedPrefix}
        </span>
      )}

      {/* Characters & Digits */}
      <span className="inline-flex items-baseline">
        {characters.map((item, idx) => (
          <DigitColumn
            key={`pos-${idx}`}
            digit={item.char}
            className={digitClassName}
            transition={transition}
          />
        ))}
      </span>

      {/* Static Suffix (e.g. / mo) */}
      {parsedSuffix && (
        <span className="inline-block shrink-0 ml-[2px] select-none">
          {parsedSuffix}
        </span>
      )}
    </span>
  )
}

export default NumberMorph

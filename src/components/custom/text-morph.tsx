"use client"

import React, { useMemo, useId } from "react"
import { motion, AnimatePresence, type Transition, type Variants } from "motion/react"
import { cn } from "@/lib/utils"

export type TextMorphProps = {
  children: string
  as?: React.ElementType
  className?: string
  style?: React.CSSProperties
  variants?: Variants
  transition?: Transition
}

const defaultVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

const defaultTransition: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 22,
  mass: 0.4,
}

/**
 * TextMorph
 *
 * Smooth character-level morphing for words, titles, and text phrases.
 * Uses inline-flex layout isolation to prevent character collisions or overlaps.
 */
export function TextMorph({
  children,
  as: Component = "span",
  className,
  style,
  variants = defaultVariants,
  transition = defaultTransition,
}: TextMorphProps) {
  const uniqueId = useId()

  const characters = useMemo(() => {
    const charCounts: Record<string, number> = {}

    return children.split("").map((char) => {
      const lowerChar = char.toLowerCase()
      charCounts[lowerChar] = (charCounts[lowerChar] || 0) + 1

      return {
        id: `${uniqueId}-${lowerChar}${charCounts[lowerChar]}`,
        label: char === " " ? "\u00A0" : char,
      }
    })
  }, [children, uniqueId])

  return (
    <Component
      className={cn("inline-flex items-baseline relative whitespace-nowrap", className)}
      aria-label={children}
      style={style}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {characters.map((character) => (
          <motion.span
            key={character.id}
            layoutId={character.id}
            className="inline-block relative"
            aria-hidden="true"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
            transition={transition}
          >
            {character.label}
          </motion.span>
        ))}
      </AnimatePresence>
    </Component>
  )
}

export default TextMorph

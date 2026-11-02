"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence, type Transition } from "motion/react"
import { cn } from "@/lib/utils"

export type MorphAnchor =
  | "bottom-right"
  | "top-right"
  | "bottom-left"
  | "top-left"
  | "center"

export interface MorphContainerProps {
  /** Controlled open state */
  isOpen?: boolean
  /** Default open state if uncontrolled */
  defaultOpen?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void

  /** Compact resting width in pixels */
  triggerWidth: number
  /** Compact resting height in pixels */
  triggerHeight: number
  /** Compact resting border radius in pixels (defaults to triggerHeight / 2 for pill) */
  triggerRadius?: number

  /** Expanded target width in pixels */
  expandedWidth: number
  /** Expanded target height in pixels */
  expandedHeight: number
  /** Expanded target border radius in pixels (defaults to 22) */
  expandedRadius?: number

  /** Corner / origin to expand from (defaults to "bottom-right") */
  anchor?: MorphAnchor

  /** Elevation z-index when open (defaults to 40) */
  zIndex?: number

  /** Whether clicking outside collapses the expanded component (defaults to true) */
  closeOnClickOutside?: boolean

  /** Whether pressing Escape collapses the expanded component (defaults to true) */
  closeOnEscape?: boolean

  /** Custom spring physics transition */
  transition?: Transition

  /** CSS classes applied to the morphing container */
  className?: string
  /** CSS classes applied only when open */
  openClassName?: string
  /** CSS classes applied only when closed */
  closedClassName?: string
  /** CSS classes applied to the outer layout placeholder slot */
  slotClassName?: string

  /** Trigger element (compact resting button) */
  trigger:
    | React.ReactNode
    | ((props: { open: () => void; isOpen: boolean }) => React.ReactNode)

  /** Expanded content (dialog / panel / options) */
  children:
    | React.ReactNode
    | ((props: { close: () => void; isOpen: boolean }) => React.ReactNode)
}

const ANCHOR_STYLES: Record<MorphAnchor, string> = {
  "bottom-right": "absolute right-0 bottom-0 origin-bottom-right",
  "top-right": "absolute right-0 top-0 origin-top-right",
  "bottom-left": "absolute left-0 bottom-0 origin-bottom-left",
  "top-left": "absolute left-0 top-0 origin-top-left",
  center:
    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center",
}

const DEFAULT_SPRING: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 24,
  mass: 0.6,
}

/**
 * MorphContainer
 *
 * A production-grade, generic morphing component that seamlessly morphs a compact
 * button into an expanded panel/dialog without disrupting sibling layouts.
 *
 * Key Architectural Guarantees:
 * 1. Layout Isolation: Uses a fixed placeholder slot in normal document flow. Siblings
 *    never get squeezed, pushed, or wrapped.
 * 2. Higher Z-Index Floating Layer: The morphing container floats above surrounding elements.
 * 3. Ellipse / Egg-Distortion Immunity: Automatically computes mathematical pill radius
 *    (height / 2) to prevent CSS 9999px interpolation oval bugs.
 * 4. Micro-blur synchronized crossfade: Synchronizes inner content transition with outer
 *    spring geometry.
 * 5. Full Accessibility: Outside click & Escape key dismissal built-in.
 */
export function MorphContainer({
  isOpen: controlledIsOpen,
  defaultOpen = false,
  onOpenChange,
  triggerWidth,
  triggerHeight,
  triggerRadius,
  expandedWidth,
  expandedHeight,
  expandedRadius = 22,
  anchor = "bottom-right",
  zIndex = 40,
  closeOnClickOutside = true,
  closeOnEscape = true,
  transition = DEFAULT_SPRING,
  className,
  openClassName,
  closedClassName,
  slotClassName,
  trigger,
  children,
}: MorphContainerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen)
  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen

  const containerRef = useRef<HTMLDivElement>(null)

  const setIsOpen = useCallback(
    (nextState: boolean) => {
      if (!isControlled) {
        setInternalIsOpen(nextState)
      }
      onOpenChange?.(nextState)
    },
    [isControlled, onOpenChange]
  )

  const open = useCallback(() => setIsOpen(true), [setIsOpen])
  const close = useCallback(() => setIsOpen(false), [setIsOpen])

  // Compute proper radii (defaults to pill: height / 2)
  const effectiveTriggerRadius =
    triggerRadius !== undefined ? triggerRadius : Math.round(triggerHeight / 2)
  const effectiveExpandedRadius = expandedRadius

  // Click outside listener
  useEffect(() => {
    if (!isOpen || !closeOnClickOutside) return

    const handleMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close()
      }
    }

    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [isOpen, closeOnClickOutside, close])

  // Escape key listener
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, closeOnEscape, close])

  return (
    /* 
      1. IMMUTABLE LAYOUT SLOT:
      This element stays permanently in normal DOM flow with fixed trigger dimensions.
      Siblings (like prices, text, or adjacent icons) will NEVER move or wrap.
    */
    <div
      style={{
        width: triggerWidth,
        height: triggerHeight,
      }}
      className={cn("relative shrink-0 select-none", slotClassName)}
    >
      {/* 
        2. CONTINUOUS MORPHING CONTAINER:
        Floats on a higher z-index, anchored to the chosen corner, and morphs
        dimensions & border-radius smoothly with spring physics.
      */}
      <motion.div
        ref={containerRef}
        animate={{
          width: isOpen ? expandedWidth : triggerWidth,
          height: isOpen ? expandedHeight : triggerHeight,
          borderRadius: isOpen
            ? effectiveExpandedRadius
            : effectiveTriggerRadius,
        }}
        transition={transition}
        style={{
          zIndex: isOpen ? zIndex : 10,
        }}
        className={cn(
          "overflow-hidden",
          ANCHOR_STYLES[anchor],
          isOpen ? openClassName : closedClassName,
          className
        )}
      >
        <AnimatePresence initial={false} mode="wait">
          {!isOpen ? (
            /* COMPACT TRIGGER STATE */
            <motion.div
              key="morph-trigger-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="w-full h-full"
            >
              {typeof trigger === "function"
                ? trigger({ open, isOpen: false })
                : trigger}
            </motion.div>
          ) : (
            /* EXPANDED CONTENT STATE */
            <motion.div
              key="morph-expanded-content"
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              {typeof children === "function"
                ? children({ close, isOpen: true })
                : children}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default MorphContainer

"use client"

import React, { useLayoutEffect, useRef, useState } from "react"

/**
 * FitToWidth
 *
 * Widgets are designed at fixed pixel sizes (approved aspect ratios). On narrow screens a
 * widget can be wider than its column; this scales it down uniformly — never re-flows it —
 * and reserves the scaled height so nothing below overlaps. At full size it is a no-op.
 */
export function FitToWidth({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<{ scale: number; height?: number }>({ scale: 1 })

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    const measure = () => {
      // offsetWidth/Height ignore transforms, so this is always the widget's natural size
      const scale = Math.min(1, outer.clientWidth / inner.offsetWidth)
      setFit((f) => {
        const height = scale < 1 ? inner.offsetHeight * scale : undefined
        return f.scale === scale && f.height === height ? f : { scale, height }
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(outer)
    ro.observe(inner)
    return () => ro.disconnect()
  }, [])

  return (
    // items-start: the widget must keep its own height. With the default `stretch` it would take
    // the wrapper's (scaled) height, get re-measured smaller, and collapse a little more each pass.
    <div ref={outerRef} className="flex w-full items-start justify-center" style={{ height: fit.height }}>
      <div
        ref={innerRef}
        className="shrink-0"
        style={fit.scale < 1 ? { transform: `scale(${fit.scale})`, transformOrigin: "top center" } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

export default FitToWidth

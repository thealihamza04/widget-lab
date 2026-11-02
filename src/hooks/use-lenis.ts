import { useEffect } from "react"
import Lenis from "lenis"
import "lenis/dist/lenis.css"

/**
 * Page-level smooth scrolling (Lenis).
 *
 * - Skipped entirely when the user prefers reduced motion: native scroll stays.
 * - Scroll areas inside widgets opt out with `data-lenis-prevent`, so a wheel over a
 *   transaction list scrolls that list natively instead of the page.
 * - `lerp` 0.1 is Lenis' default glide; wheel and keyboard both stay responsive.
 */
export function useLenis() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const lenis = new Lenis({ autoRaf: true, lerp: 0.1, smoothWheel: true })
    return () => lenis.destroy()
  }, [])
}

import { cn } from "@/lib/utils"

/**
 * Side-view bicycle illustration (stands in for a product photo — none ship with the project).
 * `variant="ebike"`: matte black commuter with a down-tube battery; `variant="city"`: orange step-through.
 */
export function BikeArt({ variant = "ebike", className, style }: { variant?: "ebike" | "city"; className?: string; style?: React.CSSProperties }) {
  const ebike = variant === "ebike"
  const frame = ebike ? "#1d1d1f" : "#f26a1f"
  const tire = ebike ? "#141415" : "#1f1f22"
  const spokes = Array.from({ length: 18 }, (_, i) => (i / 18) * Math.PI * 2)
  const wheel = (cx: number) => (
    <g>
      <circle cx={cx} cy={120} r={52} fill="none" stroke={tire} strokeWidth={7} />
      <circle cx={cx} cy={120} r={46} fill="none" stroke={ebike ? "#3a3a3d" : "#c9ccd1"} strokeWidth={2} />
      {spokes.map((a, i) => (
        <line key={i} x1={cx} y1={120} x2={cx + Math.cos(a) * 45} y2={120 + Math.sin(a) * 45} stroke={ebike ? "#5a5a5e" : "#d7d9dd"} strokeWidth={0.7} />
      ))}
      <circle cx={cx} cy={120} r={ebike ? 9 : 5} fill={ebike ? "#2a2a2d" : "#bfc3c9"} />
    </g>
  )
  return (
    <svg viewBox="0 0 330 185" className={cn("block", className)} style={style} aria-hidden>
      {ebike && <ellipse cx={165} cy={176} rx={150} ry={5} fill="rgba(0,0,0,0.10)" />}
      {wheel(68)}
      {wheel(262)}
      {/* fenders */}
      {ebike && (
        <>
          <path d="M22 108 A50 50 0 0 1 104 82" fill="none" stroke={frame} strokeWidth={5} strokeLinecap="round" />
          <path d="M224 82 A50 50 0 0 1 312 110" fill="none" stroke={frame} strokeWidth={5} strokeLinecap="round" />
        </>
      )}
      {/* frame */}
      <g fill="none" stroke={frame} strokeWidth={ebike ? 9 : 7} strokeLinecap="round" strokeLinejoin="round">
        {ebike ? (
          <>
            <path d="M68 120 L132 52 L222 52" />
            <path d="M132 52 L150 128 L68 120" />
            <path d="M150 128 L222 52" />
            <path d="M222 52 L262 120" />
          </>
        ) : (
          <>
            <path d="M68 120 L150 128 L196 70" />
            <path d="M138 40 L150 128" />
            <path d="M196 70 L262 120" />
            <path d="M150 128 C 170 90, 182 78, 214 60" />
          </>
        )}
      </g>
      {/* down-tube battery */}
      {ebike && <rect x={122} y={44} width={16} height={58} rx={6} fill="#111113" transform="rotate(-12 130 73)" />}
      {/* crank */}
      <circle cx={150} cy={128} r={11} fill="none" stroke={ebike ? "#2b2b2e" : "#6b6f75"} strokeWidth={4} />
      <line x1={150} y1={128} x2={160} y2={146} stroke="#2b2b2e" strokeWidth={4} strokeLinecap="round" />
      {/* seat post + saddle */}
      <line x1={ebike ? 132 : 138} y1={ebike ? 52 : 40} x2={ebike ? 126 : 132} y2={ebike ? 26 : 22} stroke={ebike ? "#232325" : "#b9bdc3"} strokeWidth={5} strokeLinecap="round" />
      <path d={ebike ? "M104 22 Q126 14 150 22 Q128 30 104 22 Z" : "M112 18 Q134 8 156 18 Q134 28 112 18 Z"} fill="#111113" />
      {/* stem + bars */}
      <line x1={222} y1={52} x2={ebike ? 230 : 214} y2={ebike ? 28 : 26} stroke={ebike ? "#1d1d1f" : "#c9ccd1"} strokeWidth={6} strokeLinecap="round" />
      <path d={ebike ? "M218 26 L246 22" : "M190 30 Q214 10 238 26 L252 24"} fill="none" stroke={ebike ? "#1d1d1f" : "#c9ccd1"} strokeWidth={ebike ? 6 : 5} strokeLinecap="round" />
      {!ebike && <line x1={248} y1={24} x2={262} y2={22} stroke="#111113" strokeWidth={7} strokeLinecap="round" />}
    </svg>
  )
}

import type * as React from "react"
import { useFontConfigField, useEffectiveScale } from "@/lib/fontConfigContext"
import type { Barline as BarlineType } from "@/lib/schema"

// SMuFL barline glyphs (Petaluma / Bravura share these codepoints)
const BARLINE_GLYPHS: Record<string, string> = {
  single: "\uE030",
  double: "\uE031",
  final: "\uE032",
  repeatStart: "\uE040",
  repeatEnd: "\uE041",
}

// Single/double/final bumped to 1.3 so the double barline's interior gap
// reads cleanly at screen sizes. Repeat signs stay a touch larger so the
// bullet dots pop.
const BARLINE_SIZE_MULTIPLIER: Record<string, number> = {
  single: 1.3,
  double: 1.3,
  final: 1.3,
  repeatStart: 1.4,
  repeatEnd: 1.4,
}

export const BARLINE_CYCLE: BarlineType[] = [
  "single",
  "double",
  "repeatStart",
  "repeatEnd",
  "final",
]

export function nextBarlineStyle(current: string): BarlineType {
  const idx = BARLINE_CYCLE.indexOf(current as BarlineType)
  return BARLINE_CYCLE[(idx + 1) % BARLINE_CYCLE.length] ?? "single"
}

interface BarlineProps {
  style: string
  x: number
  height: number
  yOffset?: number
  /** When provided, the barline becomes tappable. The click event is forwarded
   *  so callers can anchor a popover to the barline's screen position. */
  onCycle?: (e: React.MouseEvent<SVGElement>) => void
}

export function Barline({ style, x, height, yOffset, onCycle }: BarlineProps) {
  const y = yOffset ?? 30
  const barlineFont = useFontConfigField("barline")
  const barlineColor = useFontConfigField("barlineColor")
  const scale = useEffectiveScale("barlineSize")

  // Base font size keyed off the staff height so glyphs align with the
  // five-line staff metric used elsewhere. Repeat signs get a small bump
  // so the bullet dots are visually punchy.
  const baseFontSize = height
  const fontSize =
    baseFontSize * scale * (BARLINE_SIZE_MULTIPLIER[style] ?? 1)
  const glyph = BARLINE_GLYPHS[style] ?? BARLINE_GLYPHS.single

  // SMuFL barline glyphs have their alphabetic baseline at the south staff
  // line and extend upward by ~1em (= 4 staff spaces = staff height). With
  // the default alphabetic baseline, placing y at "staff midline + fontSize/2"
  // puts the glyph's visual center exactly on the staff midline, which is
  // where the slash noteheads sit. This stays correct regardless of the
  // size multiplier.
  const visualCenterY = y + height / 2
  const baselineY = visualCenterY + fontSize / 2

  return (
    <g
      className={`barline barline--${style}`}
      data-style={style}
      style={{ cursor: onCycle ? "pointer" : undefined }}
      onClick={(e) => {
        if (!onCycle) return
        e.stopPropagation()
        onCycle(e)
      }}
    >
      {/* Wider transparent hit area so the user can tap easily */}
      {onCycle && (
        <rect
          className="barline-hit-area"
          x={x - 10}
          y={y - 6}
          width={20}
          height={height + 12}
          fill="transparent"
          pointerEvents="all"
        />
      )}
      <text
        className="barline-glyph"
        x={x}
        y={baselineY}
        textAnchor="middle"
        fontSize={fontSize}
        fontFamily={`${barlineFont}, Petaluma, Bravura, serif`}
        fill={barlineColor ?? "currentColor"}
        pointerEvents="none"
      >
        {glyph}
      </text>
    </g>
  )
}

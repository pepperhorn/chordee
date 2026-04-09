import { RELATIVE_SIZE_SCALE } from "@/lib/fonts"
import { useFontConfigField } from "@/lib/fontConfigContext"
import {
  CLEF_GLYPHS,
  ACCIDENTAL_GLYPHS,
  getKeySignatureAccidentals,
} from "@/lib/keySignature"
import type { Clef } from "@/lib/schema"

interface ClefKeySignatureProps {
  clef: Clef
  keyName: string
  x: number
  y: number
  staffHeight: number
  showClef: boolean
  showKeySig: boolean
}

const BASE_FONT_SIZE = 32
const STAFF_LINES = 5
const ACCIDENTAL_FONT_RATIO = 0.5

export function ClefKeySignature({
  clef,
  keyName,
  x,
  y,
  staffHeight,
  showClef,
  showKeySig,
}: ClefKeySignatureProps) {
  const clefFont = useFontConfigField("clef")
  const clefSize = useFontConfigField("clefSize")
  const clefColor = useFontConfigField("clefColor")

  if (!showClef && !showKeySig) return null

  const scale = RELATIVE_SIZE_SCALE[clefSize] ?? 1
  const fontSize = Math.round(BASE_FONT_SIZE * scale)
  const lineSpacing = staffHeight / (STAFF_LINES - 1)
  const accFontSize = Math.round(fontSize * ACCIDENTAL_FONT_RATIO)

  const glyph = CLEF_GLYPHS[clef]
  const accidentals = showKeySig
    ? getKeySignatureAccidentals(keyName, clef)
    : []

  // Clef reference line position
  const clefRefY = glyph
    ? ((STAFF_LINES - 1) - glyph.yOffset / 2) * lineSpacing
    : 0

  // X positions depend on whether clef is shown
  const clefWidth = showClef && glyph ? fontSize * 1.0 : 0
  const accStartX = clefWidth
  const accSpacing = accFontSize * 0.7
  const totalWidth = accStartX + accidentals.length * accSpacing + 8

  return (
    <g
      className="clef-key-signature"
      data-clef={clef}
      data-key={keyName}
      transform={`translate(${x}, ${y})`}
    >
      {/* 5-line staff segment */}
      <g className="clef-staff-lines">
        {Array.from({ length: STAFF_LINES }, (_, i) => (
          <line
            key={i}
            className="clef-staff-line"
            x1={-4}
            y1={i * lineSpacing}
            x2={totalWidth}
            y2={i * lineSpacing}
            stroke="currentColor"
            strokeWidth={0.5}
            opacity={0.3}
          />
        ))}
      </g>

      {/* Clef glyph */}
      {showClef && glyph && (
        <text
          className="clef-glyph"
          x={0}
          y={clefRefY}
          fontSize={fontSize}
          fontFamily={`${clefFont}, Petaluma, Bravura, serif`}
          fill={clefColor ?? "currentColor"}
        >
          {glyph.char}
        </text>
      )}

      {/* Key signature accidentals */}
      {accidentals.map((acc, i) => {
        const staffY = ((STAFF_LINES - 1) - acc.position / 2) * lineSpacing
        const accX = accStartX + i * accSpacing

        return (
          <text
            key={i}
            className={`key-sig-accidental key-sig-accidental--${acc.type}`}
            x={accX}
            y={staffY}
            fontSize={accFontSize}
            fontFamily={`${clefFont}, Petaluma, Bravura, serif`}
            fill="currentColor"
          >
            {ACCIDENTAL_GLYPHS[acc.type]}
          </text>
        )
      })}
    </g>
  )
}

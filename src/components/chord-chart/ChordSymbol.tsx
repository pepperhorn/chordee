import { RELATIVE_SIZE_SCALE } from "@/lib/fonts"
import { useFontConfigField } from "@/lib/fontConfigContext"

interface ChordSymbolProps {
  text: string
  x: number
  y: number
  centered?: boolean
}

const BASE_CHORD_FONT_SIZE = 18

export function ChordSymbol({ text, x, y, centered = false }: ChordSymbolProps) {
  const chordFont = useFontConfigField("chord")
  const chordSize = useFontConfigField("chordSize")
  const chordColor = useFontConfigField("chordColor")

  const scale = RELATIVE_SIZE_SCALE[chordSize] ?? 1
  const fontSize = Math.round(BASE_CHORD_FONT_SIZE * scale)

  return (
    <text
      className="chord-symbol"
      data-chord={text}
      x={x}
      y={y}
      textAnchor={centered ? "middle" : "start"}
      fontSize={fontSize}
      fontFamily={`${chordFont}, serif`}
      fill={chordColor ?? "currentColor"}
    >
      {text}
    </text>
  )
}

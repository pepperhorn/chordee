import { useChartStore } from "@/lib/store"
import { RELATIVE_SIZE_SCALE } from "@/lib/fonts"

interface ChordSymbolProps {
  text: string
  x: number
  y: number
  centered?: boolean
}

const BASE_CHORD_FONT_SIZE = 18

export function ChordSymbol({ text, x, y, centered = false }: ChordSymbolProps) {
  const chordFont = useChartStore((s) => s.ui.fontConfig.chord)
  const chordSize = useChartStore((s) => s.ui.fontConfig.chordSize)

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
      fill="currentColor"
    >
      {text}
    </text>
  )
}

import { useFontConfigField, useEffectiveScale } from "@/lib/fontConfigContext"
import { useGlyphMetrics } from "@/lib/glyphs/useGlyphMetrics"

interface ChordSymbolProps {
  text: string
  x: number
  y: number
  centered?: boolean
}


export function ChordSymbol({ text, x, y, centered = false }: ChordSymbolProps) {
  const chordFont = useFontConfigField("chord")
  const chordColor = useFontConfigField("chordColor")
  const scale = useEffectiveScale("chordSize")
  const metrics = useGlyphMetrics()
  const fontSize = Math.round(metrics.chordFontSize * scale)

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

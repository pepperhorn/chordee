import { useFontConfigField, useEffectiveScale } from "@/lib/fontConfigContext"
import { useGlyphMetrics } from "@/lib/glyphs/useGlyphMetrics"

interface TimeSignatureDisplayProps {
  beats: number
  beatUnit: number
  x: number
  y: number
  height: number
}

export function TimeSignatureDisplay({
  beats,
  beatUnit,
  x,
  y,
  height,
}: TimeSignatureDisplayProps) {
  const tsFont = useFontConfigField("timeSignature")
  const tsSize = useFontConfigField("timeSignatureSize")
  const tsColor = useFontConfigField("timeSignatureColor")
  const scale = useEffectiveScale("timeSignatureSize")
  const metrics = useGlyphMetrics()
  const fontSize = metrics.timeSigFontSize * scale
  const midY = y + height / 2

  return (
    <g
      className="time-signature-display"
      data-time-sig={`${beats}/${beatUnit}`}
      data-size={tsSize}
      transform={`translate(${x}, 0)`}
    >
      <text
        className="time-signature-numerator"
        x={0}
        y={midY - 2}
        textAnchor="middle"
        fontSize={fontSize}
        fontFamily={`${tsFont}, serif`}
        fontWeight={700}
        fill={tsColor ?? "currentColor"}
      >
        {beats}
      </text>
      <text
        className="time-signature-denominator"
        x={0}
        y={midY + fontSize - 2}
        textAnchor="middle"
        fontSize={fontSize}
        fontFamily={`${tsFont}, serif`}
        fontWeight={700}
        fill={tsColor ?? "currentColor"}
      >
        {beatUnit}
      </text>
    </g>
  )
}

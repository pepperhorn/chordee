import { useChartStore } from "@/lib/store"
import { RELATIVE_SIZE_SCALE } from "@/lib/fonts"

interface TimeSignatureDisplayProps {
  beats: number
  beatUnit: number
  x: number
  y: number
  height: number
}

const BASE_FONT_SIZE = 28

export function TimeSignatureDisplay({
  beats,
  beatUnit,
  x,
  y,
  height,
}: TimeSignatureDisplayProps) {
  const tsFont = useChartStore((s) => s.ui.fontConfig.timeSignature)
  const tsSize = useChartStore((s) => s.ui.fontConfig.timeSignatureSize)
  const tsColor = useChartStore((s) => s.ui.fontConfig.timeSignatureColor)

  const scale = RELATIVE_SIZE_SCALE[tsSize] ?? 1
  const fontSize = BASE_FONT_SIZE * scale
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

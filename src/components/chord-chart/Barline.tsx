interface BarlineProps {
  style: string
  x: number
  height: number
  yOffset?: number
}

export function Barline({ style, x, height, yOffset }: BarlineProps) {
  const y = yOffset ?? 30

  switch (style) {
    case "single":
      return (
        <line
          className="barline barline--single"
          x1={x}
          y1={y}
          x2={x}
          y2={y + height}
          stroke="currentColor"
          strokeWidth={1}
        />
      )

    case "double":
      return (
        <g className="barline barline--double">
          <line className="barline-thin" x1={x - 2} y1={y} x2={x - 2} y2={y + height} stroke="currentColor" strokeWidth={1} />
          <line className="barline-thin" x1={x + 1} y1={y} x2={x + 1} y2={y + height} stroke="currentColor" strokeWidth={1} />
        </g>
      )

    case "final":
      return (
        <g className="barline barline--final">
          <line className="barline-thin" x1={x - 4} y1={y} x2={x - 4} y2={y + height} stroke="currentColor" strokeWidth={1} />
          <line className="barline-thick" x1={x} y1={y} x2={x} y2={y + height} stroke="currentColor" strokeWidth={3} />
        </g>
      )

    case "repeatStart":
      return (
        <g className="barline barline--repeat-start">
          <line className="barline-thick" x1={x} y1={y} x2={x} y2={y + height} stroke="currentColor" strokeWidth={3} />
          <line className="barline-thin" x1={x + 4} y1={y} x2={x + 4} y2={y + height} stroke="currentColor" strokeWidth={1} />
          <circle className="barline-repeat-dot barline-repeat-dot--upper" cx={x + 8} cy={y + height * 0.35} r={2} fill="currentColor" />
          <circle className="barline-repeat-dot barline-repeat-dot--lower" cx={x + 8} cy={y + height * 0.65} r={2} fill="currentColor" />
        </g>
      )

    case "repeatEnd":
      return (
        <g className="barline barline--repeat-end">
          <circle className="barline-repeat-dot barline-repeat-dot--upper" cx={x - 8} cy={y + height * 0.35} r={2} fill="currentColor" />
          <circle className="barline-repeat-dot barline-repeat-dot--lower" cx={x - 8} cy={y + height * 0.65} r={2} fill="currentColor" />
          <line className="barline-thin" x1={x - 4} y1={y} x2={x - 4} y2={y + height} stroke="currentColor" strokeWidth={1} />
          <line className="barline-thick" x1={x} y1={y} x2={x} y2={y + height} stroke="currentColor" strokeWidth={3} />
        </g>
      )

    default:
      return null
  }
}

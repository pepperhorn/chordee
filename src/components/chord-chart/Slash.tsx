import { useGlyphMetrics } from "@/lib/glyphs/useGlyphMetrics"

interface SlashProps {
  x: number
  y: number
  width: number
  height: number
  articulation?: string
  stem?: boolean
  stemDirection?: "up" | "down"
  tied?: boolean
}

export function Slash({
  x,
  y,
  width,
  height,
  articulation = "none",
  stem = true,
  stemDirection = "up",
  tied = false,
}: SlashProps) {
  const metrics = useGlyphMetrics()
  const isUp = stemDirection === "up"
  const stemLength = metrics.stemLength / 2
  const articOffset = metrics.articulationOffset
  const strokeW = metrics.slashNoteheadThickness
  const stemW = metrics.stemThickness
  const tieEnd = metrics.tieEndpointThickness

  return (
    <g
      className={`slash-mark ${articulation !== "none" ? `slash-mark--${articulation}` : ""} ${tied ? "slash-mark--tied" : ""} slash-mark--stem-${stemDirection}`}
      data-articulation={articulation}
      data-stem-direction={stemDirection}
      transform={`translate(${x}, ${y})`}
    >
      {/* Slash notehead */}
      <line
        className="slash-notehead"
        x1={0}
        y1={height}
        x2={width}
        y2={0}
        stroke="currentColor"
        strokeWidth={strokeW}
        strokeLinecap="round"
      />

      {/* Stem */}
      {stem && isUp && (
        <line
          className="slash-stem"
          x1={width}
          y1={0}
          x2={width}
          y2={-stemLength}
          stroke="currentColor"
          strokeWidth={stemW}
        />
      )}
      {stem && !isUp && (
        <line
          className="slash-stem"
          x1={0}
          y1={height}
          x2={0}
          y2={height + stemLength}
          stroke="currentColor"
          strokeWidth={stemW}
        />
      )}

      {/* Accent articulation */}
      {articulation === "accent" && (
        <path
          className="slash-articulation slash-articulation--accent"
          d={`M${width / 2 - 4},${isUp ? height + articOffset : -articOffset} L${width / 2},${isUp ? height + articOffset * 0.5 : -articOffset * 0.5} L${width / 2 + 4},${isUp ? height + articOffset : -articOffset}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={stemW}
        />
      )}

      {/* Staccato articulation */}
      {articulation === "staccato" && (
        <circle
          className="slash-articulation slash-articulation--staccato"
          cx={width / 2}
          cy={isUp ? height + articOffset : -articOffset}
          r={1.5}
          fill="currentColor"
        />
      )}

      {/* Marcato articulation */}
      {articulation === "marcato" && (
        <path
          className="slash-articulation slash-articulation--marcato"
          d={`M${width / 2 - 3},${isUp ? -14 : height + 14} L${width / 2},${isUp ? -18 : height + 18} L${width / 2 + 3},${isUp ? -14 : height + 14}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={stemW}
        />
      )}

      {/* Legato articulation */}
      {articulation === "legato" && (
        <line
          className="slash-articulation slash-articulation--legato"
          x1={width / 2 - 4}
          y1={isUp ? height + articOffset : -articOffset}
          x2={width / 2 + 4}
          y2={isUp ? height + articOffset : -articOffset}
          stroke="currentColor"
          strokeWidth={stemW}
        />
      )}

      {/* Tie arc */}
      {tied && (
        <path
          className="slash-tie-arc"
          d={`M${width + 2},${height / 2} Q${width + 12},${height / 2 + 8} ${width + 22},${height / 2}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={tieEnd}
        />
      )}
    </g>
  )
}

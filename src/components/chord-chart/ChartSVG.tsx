import type { LayoutResult, LayoutElement } from "@/lib/layout/types"
import { BarGroup } from "./BarGroup"
import { SectionHeader } from "./SectionHeader"
import { useChartStore } from "@/lib/store"
import { RELATIVE_SIZE_SCALE } from "@/lib/fonts"

interface ChartSVGProps {
  layout: LayoutResult
  containerWidth: number
}

function renderElement(el: LayoutElement, lineY: number) {
  switch (el.type) {
    case "bar":
      return <BarGroup key={el.measureId} bar={el} lineY={lineY} />
    case "section-header":
      return <SectionHeader key={`header-${el.sectionId}`} header={el} />
    case "barline":
      return null
  }
}

export function ChartSVG({ layout, containerWidth }: ChartSVGProps) {
  const meta = useChartStore((s) => s.chart.meta)
  const fc = useChartStore((s) => s.ui.fontConfig)
  const setSelection = useChartStore((s) => s.setSelection)

  const headingScale = RELATIVE_SIZE_SCALE[fc.headingSize] ?? 1
  const subtitleScale = RELATIVE_SIZE_SCALE[fc.subtitleSize] ?? 1
  const bodyScale = RELATIVE_SIZE_SCALE[fc.bodySize] ?? 1
  const titleFontSize = Math.round(24 * headingScale)
  const subtitleFontSize = Math.round(14 * subtitleScale)
  const infoFontSize = Math.round(13 * bodyScale)

  const TEMPO_GLYPHS: Record<string, string> = {
    whole: "\uD834\uDD5D",
    half: "\uD834\uDD5E",
    quarter: "\u2669",
    eighth: "\u266A",
    sixteenth: "\uD834\uDD61",
  }

  // Build tempo string
  const tempoString = meta.showTempo !== false
    ? `${TEMPO_GLYPHS[meta.tempoDivisor ?? "quarter"] ?? "\u2669"} = ${meta.tempo}`
    : ""

  // Chart title header height
  const hasSubtitle = !!meta.subtitle
  const headerH = meta.title
    ? Math.round(40 + titleFontSize + (hasSubtitle ? subtitleFontSize + 4 : 0) + infoFontSize)
    : 0
  const totalH = layout.totalHeight + headerH

  return (
    <svg
      id="chart-area"
      className="chart-svg"
      role="img"
      aria-label={`Chord chart: ${meta.title || "Untitled"}`}
      width={containerWidth}
      height={totalH}
      style={{ display: "block" }}
      onClick={(e) => {
        if ((e.target as SVGElement).tagName === "svg") {
          setSelection(null)
        }
      }}
    >
      {/* Chart title header */}
      {meta.title && (
        <g className="chart-header">
          {/* Title — centered */}
          <text
            className="chart-title"
            x={containerWidth / 2}
            y={titleFontSize + 10}
            textAnchor="middle"
            fontSize={titleFontSize}
            fontWeight={700}
            fontFamily={`${fc.heading}, serif`}
            fill="currentColor"
          >
            {meta.title}
          </text>

          {/* Subtitle — centered, below title */}
          {meta.subtitle && (
            <text
              className="chart-subtitle"
              x={containerWidth / 2}
              y={titleFontSize + subtitleFontSize + 14}
              textAnchor="middle"
              fontSize={subtitleFontSize}
              fontFamily={`${fc.subtitle}, serif`}
              fill="currentColor"
              opacity={0.6}
            >
              {meta.subtitle}
            </text>
          )}

          {/* Composer / Arranger — right aligned */}
          {(meta.composer || meta.arranger) && (
            <text
              className="chart-composer"
              x={containerWidth - 40}
              y={titleFontSize + (hasSubtitle ? subtitleFontSize + 4 : 0) + infoFontSize + 14}
              textAnchor="end"
              fontSize={infoFontSize}
              fontFamily={`${fc.body}, sans-serif`}
              fill="currentColor"
              opacity={0.6}
            >
              {[meta.composer, meta.arranger && `arr. ${meta.arranger}`].filter(Boolean).join(" — ")}
            </text>
          )}

          {/* Tempo + Style — left aligned */}
          {(tempoString || meta.style) && (
            <text
              className="chart-tempo-style"
              x={40}
              y={titleFontSize + (hasSubtitle ? subtitleFontSize + 4 : 0) + infoFontSize + 14}
              textAnchor="start"
              fontSize={infoFontSize}
              fontFamily={`${fc.body}, sans-serif`}
              fill="currentColor"
              opacity={0.6}
            >
              {[tempoString, meta.style].filter(Boolean).join("  ")}
            </text>
          )}
        </g>
      )}

      {/* Chart body — offset by header height */}
      <g className="chart-body" transform={`translate(0, ${headerH})`}>
        {layout.lines.map((line, i) => (
          <g
            key={i}
            className={`chart-line ${line.sectionId ? `chart-line--section-${line.sectionId.slice(0, 6)}` : ""}`}
            data-line-index={i}
            transform={`translate(0, ${line.y})`}
          >
            {line.elements.map((el) => renderElement(el, line.y))}
          </g>
        ))}
      </g>
    </svg>
  )
}

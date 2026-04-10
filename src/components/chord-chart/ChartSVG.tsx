import type { LayoutResult, LayoutElement } from "@/lib/layout/types"
import { BarGroup } from "./BarGroup"
import { SectionHeader } from "./SectionHeader"
import { useChartStore } from "@/lib/store"
import { RELATIVE_SIZE_SCALE, type FontConfig } from "@/lib/fonts"
import { FontConfigOverrideProvider } from "@/lib/fontConfigContext"

interface ChartSVGProps {
  layout: LayoutResult
  containerWidth: number
  /** Per-instance overrides merged with the store fontConfig. Used for preview/export. */
  fontConfigOverride?: Partial<FontConfig>
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

export function ChartSVG({ layout, containerWidth, fontConfigOverride }: ChartSVGProps) {
  const meta = useChartStore((s) => s.chart.meta)
  const storeFc = useChartStore((s) => s.ui.fontConfig)
  const fc: FontConfig = fontConfigOverride
    ? { ...storeFc, ...fontConfigOverride }
    : storeFc
  const setSelection = useChartStore((s) => s.setSelection)

  const globalMul = RELATIVE_SIZE_SCALE[fc.globalScale] ?? 1
  const headingScale = (RELATIVE_SIZE_SCALE[fc.headingSize] ?? 1) * globalMul
  const subtitleScale = (RELATIVE_SIZE_SCALE[fc.subtitleSize] ?? 1) * globalMul
  const bodyScale = (RELATIVE_SIZE_SCALE[fc.bodySize] ?? 1) * globalMul
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

  // Chart-level copyright + footer-text rendered 20px below the last line of music.
  const COPYRIGHT_OFFSET = 20
  const copyrightFontSize = Math.max(10, Math.round(11 * bodyScale))
  const footerLineGap = 3
  const hasCopyright = !!meta.copyright?.trim()
  const hasFooterText = !!meta.footerText?.trim()
  const footerLineCount = (hasCopyright ? 1 : 0) + (hasFooterText ? 1 : 0)
  const copyrightBlockH =
    footerLineCount > 0
      ? COPYRIGHT_OFFSET +
        footerLineCount * copyrightFontSize +
        (footerLineCount - 1) * footerLineGap +
        8
      : 0
  const totalH = layout.totalHeight + headerH + copyrightBlockH

  return (
    <FontConfigOverrideProvider value={fontConfigOverride ?? null}>
    <svg
      id="chart-area"
      className="chart-svg"
      role="img"
      aria-label={`Chord chart: ${meta.title || "Untitled"}`}
      data-header-height={headerH}
      data-total-height={totalH}
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
            fill={fc.headingColor ?? "currentColor"}
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
              fill={fc.subtitleColor ?? "currentColor"}
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
              fill={fc.bodyColor ?? "currentColor"}
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
              fill={fc.bodyColor ?? "currentColor"}
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

      {/* Chart-level copyright + footer text — 20px below the bottom of the chord chart */}
      {hasCopyright && (
        <text
          className="chart-copyright"
          x={containerWidth / 2}
          y={headerH + layout.totalHeight + COPYRIGHT_OFFSET + copyrightFontSize}
          textAnchor="middle"
          fontSize={copyrightFontSize}
          fontFamily={`${fc.body}, sans-serif`}
          fill={fc.bodyColor ?? "currentColor"}
          opacity={0.55}
        >
          {meta.copyright}
        </text>
      )}
      {hasFooterText && (
        <text
          className="chart-footer-text"
          x={containerWidth / 2}
          y={
            headerH +
            layout.totalHeight +
            COPYRIGHT_OFFSET +
            (hasCopyright ? copyrightFontSize + footerLineGap + copyrightFontSize : copyrightFontSize)
          }
          textAnchor="middle"
          fontSize={copyrightFontSize}
          fontFamily={`${fc.body}, sans-serif`}
          fill={fc.bodyColor ?? "currentColor"}
          opacity={0.55}
          fontStyle="italic"
        >
          {meta.footerText}
        </text>
      )}
    </svg>
    </FontConfigOverrideProvider>
  )
}

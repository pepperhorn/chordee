import type { LayoutSectionHeader } from "@/lib/layout/types"
import { useChartStore } from "@/lib/store"
import { RELATIVE_SIZE_SCALE } from "@/lib/fonts"

interface SectionHeaderProps {
  header: LayoutSectionHeader
}

const BASE_SECTION_FONT_SIZE = 15
const BASE_REHEARSAL_FONT_SIZE = 13

export function SectionHeader({ header }: SectionHeaderProps) {
  const rehearsalFont = useChartStore((s) => s.ui.fontConfig.rehearsal)
  const rehearsalSize = useChartStore((s) => s.ui.fontConfig.rehearsalSize)
  const setSelection = useChartStore((s) => s.setSelection)
  const selection = useChartStore((s) => s.ui.selection)

  const isSelected = selection?.sectionId === header.sectionId && selection?.type === "section"
  const scale = RELATIVE_SIZE_SCALE[rehearsalSize] ?? 1
  const sectionFontSize = Math.round(BASE_SECTION_FONT_SIZE * scale)
  const rehearsalFontSize = Math.round(BASE_REHEARSAL_FONT_SIZE * scale)
  const boxSize = Math.round(20 * scale)
  const boxPadding = Math.round(4 * scale)

  const handleClick = () => {
    setSelection({
      type: "section",
      sectionId: header.sectionId,
    })
  }

  return (
    <g
      className={`section-header ${isSelected ? "section-header--selected" : ""}`}
      data-section-id={header.sectionId}
      data-rehearsal-size={rehearsalSize}
      transform={`translate(${header.x}, 0)`}
      onClick={handleClick}
      style={{ cursor: "pointer" }}
    >
      {/* Selection highlight */}
      {isSelected && (
        <rect
          className="section-selection-highlight"
          x={-4}
          y={-4}
          width={header.width + 8}
          height={boxSize + 8}
          fill="hsl(var(--chart-primary))"
          opacity={0.08}
          rx={3}
        />
      )}

      {/* Rehearsal mark box */}
      {header.rehearsalMark && (
        <g className="section-rehearsal-mark">
          <rect
            className="section-rehearsal-box"
            x={0}
            y={0}
            width={boxSize + boxPadding * 2}
            height={boxSize}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            rx={2}
          />
          <text
            className="section-rehearsal-label"
            x={(boxSize + boxPadding * 2) / 2}
            y={boxSize - boxPadding}
            textAnchor="middle"
            fontSize={rehearsalFontSize}
            fontWeight={700}
            fontFamily={`${rehearsalFont}, serif`}
            fill="currentColor"
          >
            {header.rehearsalMark}
          </text>
        </g>
      )}

      {/* Section name */}
      <text
        className="section-name"
        x={header.rehearsalMark ? boxSize + boxPadding * 2 + 8 : 0}
        y={Math.round(boxSize * 0.8)}
        fontSize={sectionFontSize}
        fontWeight={700}
        fontFamily={`${rehearsalFont}, serif`}
        fill="currentColor"
      >
        {header.text}
      </text>

      {/* Navigation mark */}
      {header.navigation && (
        <text
          className="section-navigation-mark"
          data-navigation={header.navigation}
          x={header.width - 8}
          y={Math.round(boxSize * 0.8)}
          textAnchor="end"
          fontSize={Math.round(12 * scale)}
          fontStyle="italic"
          fontFamily={`${rehearsalFont}, serif`}
          fill="currentColor"
          opacity={0.6}
        >
          {formatNavigation(header.navigation)}
        </text>
      )}
    </g>
  )
}

function formatNavigation(nav: string): string {
  const labels: Record<string, string> = {
    segno: "\uD834\uDD0B",
    coda: "\uD834\uDD0C",
    dsCoda: "D.S. al Coda",
    dsSegno: "D.S.",
    dcCoda: "D.C. al Coda",
    dcFine: "D.C. al Fine",
    fine: "Fine",
    toCoda: "To Coda",
  }
  return labels[nav] ?? nav
}

import { useMemo } from "react"
import { useChartStore } from "./store"
import { computeLayout } from "./layout/engine"
import { buildFontStrings, RELATIVE_SIZE_SCALE, type FontConfig } from "./fonts"
import { estimateClefKeySigWidth } from "./keySignature"
import { DEFAULT_SPACING, DEFAULT_FONT_SIZES } from "./layout/constants"
import type { LayoutConfig, LayoutResult } from "./layout/types"

const BASE_LINE_GAP = 8

export interface LayoutOverrides {
  containerWidth?: number
  measuresPerLine?: number | "auto"
  justification?: "proportional" | "equal"
  fontConfigOverride?: Partial<FontConfig>
}

export function useChartLayout(
  containerWidth: number,
  overrides?: LayoutOverrides,
): LayoutResult | null {
  const chart = useChartStore((s) => s.chart)
  const storeFontConfig = useChartStore((s) => s.ui.fontConfig)
  const storeJustification = useChartStore((s) => s.ui.justificationStrategy)
  const measuresPerLineMode = useChartStore((s) => s.ui.measuresPerLineMode)
  const storeMeasuresPerLine = useChartStore((s) => s.chart.meta.measuresPerLine)

  const fontConfig: FontConfig = overrides?.fontConfigOverride
    ? { ...storeFontConfig, ...overrides.fontConfigOverride }
    : storeFontConfig
  const effectiveContainerWidth = overrides?.containerWidth ?? containerWidth
  const justification = overrides?.justification ?? storeJustification
  const measuresPerLine =
    overrides?.measuresPerLine ??
    (measuresPerLineMode === "auto" ? "auto" : storeMeasuresPerLine)

  const clef = useChartStore((s) => s.chart.meta.clef)
  const showClef = useChartStore((s) => s.chart.meta.showClef ?? true)
  const clefDisplay = useChartStore((s) => s.chart.meta.clefDisplay ?? "start")
  const chartKey = useChartStore((s) => s.chart.meta.key)
  const showKeySig = useChartStore((s) => s.chart.meta.showKeySignature ?? false)

  return useMemo(() => {
    if (effectiveContainerWidth <= 0) return null

    // Scale spacing based on font size settings to avoid collisions.
    // The user-set per-font sizes are multiplied by the chart-wide
    // `globalScale` modifier so a single tier change rescales everything.
    const globalMul = RELATIVE_SIZE_SCALE[fontConfig.globalScale] ?? 1
    const chordScale = (RELATIVE_SIZE_SCALE[fontConfig.chordSize] ?? 1) * globalMul
    const lyricScale = (RELATIVE_SIZE_SCALE[fontConfig.lyricSize] ?? 1) * globalMul
    const dynamicScale = (RELATIVE_SIZE_SCALE[fontConfig.dynamicSize] ?? 1) * globalMul
    const rehearsalScale = (RELATIVE_SIZE_SCALE[fontConfig.rehearsalSize] ?? 1) * globalMul
    const lineSpacingScale = (RELATIVE_SIZE_SCALE[fontConfig.lineSpacing] ?? 1) * globalMul

    // lineHeight = vertical space for chord symbols above the stave
    // Needs to grow when chord font is larger
    const lineHeight = Math.round(DEFAULT_SPACING.lineHeight * chordScale)

    // lyricLineHeight grows with lyric + dynamic sizes (dynamics sit below lyrics)
    const lyricLineHeight = Math.round(
      DEFAULT_SPACING.lyricLineHeight * Math.max(lyricScale, dynamicScale)
    )

    // headerHeight for section headers scales with rehearsal size
    const headerHeight = Math.round(DEFAULT_SPACING.headerHeight * rehearsalScale)

    // sectionGap also scales with rehearsal size
    const sectionGap = Math.round(DEFAULT_SPACING.sectionGap * rehearsalScale)

    // Beat padding scales slightly with chord size for wider chords
    const beatPaddingX = Math.round(DEFAULT_SPACING.beatPaddingX * Math.max(1, chordScale * 0.8))

    // Clef + key signature width for left margin reservation
    const clefSizeScale = (RELATIVE_SIZE_SCALE[fontConfig.clefSize] ?? 1) * globalMul
    const clefFontSize = Math.round(32 * clefSizeScale)
    const clefKeySigWidth = showClef
      ? estimateClefKeySigWidth(chartKey, clef, clefFontSize)
      : showKeySig
        ? Math.max(0, estimateClefKeySigWidth(chartKey, clef, clefFontSize) - clefFontSize * 1.0)
        : 0

    // Reduce padding on narrow screens (mobile)
    const isMobile = effectiveContainerWidth < 600
    const chartPaddingX = isMobile ? 12 : DEFAULT_SPACING.chartPaddingX
    const chartPaddingY = isMobile ? 16 : DEFAULT_SPACING.chartPaddingY

    const config: LayoutConfig = {
      containerWidth: effectiveContainerWidth,
      fonts: buildFontStrings(fontConfig, DEFAULT_FONT_SIZES),
      spacing: {
        ...DEFAULT_SPACING,
        chartPaddingX,
        chartPaddingY,
        lineHeight,
        lyricLineHeight,
        headerHeight,
        sectionGap,
        beatPaddingX: isMobile ? Math.max(4, beatPaddingX - 2) : beatPaddingX,
        barPaddingX: isMobile ? 6 : DEFAULT_SPACING.barPaddingX,
        barGap: Math.round(BASE_LINE_GAP * lineSpacingScale),
        clefKeySigWidth,
      },
      justification,
      measuresPerLine,
      clefDisplay,
    }

    return computeLayout(chart, config)
  }, [chart, effectiveContainerWidth, fontConfig, justification, measuresPerLine, clef, showClef, showKeySig, clefDisplay, chartKey])
}

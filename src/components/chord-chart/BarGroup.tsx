import type { LayoutBar } from "@/lib/layout/types"
import { BeatSlotGroup } from "./BeatSlotGroup"
import { Barline } from "./Barline"
import { TimeSignatureDisplay } from "./TimeSignatureDisplay"
import { ClefKeySignature } from "./ClefKeySignature"
import { useChartStore } from "@/lib/store"
import { useEffectiveScale } from "@/lib/fontConfigContext"
import { estimateClefKeySigWidth } from "@/lib/keySignature"
import {
  validBarlineStylesAt,
  cycleBarlineStyle,
  isUnclosedRepeatStart,
} from "@/lib/barlineValidation"
import type { Barline as BarlineStyle } from "@/lib/schema"

interface BarGroupProps {
  bar: LayoutBar
  lineY: number
}

export function BarGroup({ bar, lineY }: BarGroupProps) {
  const selection = useChartStore((s) => s.ui.selection)
  const chart = useChartStore((s) => s.chart)
  const updateMeasure = useChartStore((s) => s.updateMeasure)
  const isSelected = selection?.measureId === bar.measureId
  const showSlashes = useChartStore((s) => s.ui.showSlashes)
  const showDynamics = useChartStore((s) => s.ui.showDynamics)
  const showLyrics = useChartStore((s) => s.ui.showLyrics)
  const clef = useChartStore((s) => s.chart.meta.clef)
  const showClefSetting = useChartStore((s) => s.chart.meta.showClef ?? true)
  const chartKey = useChartStore((s) => s.chart.meta.key)

  // "Don't forget to close this repeat" hint — only on the offending bar.
  const startBarUnclosed =
    bar.startBarline === "repeatStart" &&
    isUnclosedRepeatStart(chart, bar.sectionId, bar.measureId, "start")
  const endBarUnclosed =
    bar.endBarline === "repeatStart" &&
    isUnclosedRepeatStart(chart, bar.sectionId, bar.measureId, "end")

  // Cycling enforces the no-nested-repeats rule: repeatStart is skipped
  // when there's already an open repeat above this barline, and repeatEnd
  // is skipped when there's no open repeat to close.
  const cycleStartBarline = () => {
    const chart = useChartStore.getState().chart
    const valid = validBarlineStylesAt(chart, bar.sectionId, bar.measureId, "start")
    const current = (bar.startBarline ?? "single") as BarlineStyle
    updateMeasure(bar.sectionId, bar.measureId, {
      barlineStart: cycleBarlineStyle(current, valid),
    })
  }
  const cycleEndBarline = () => {
    const chart = useChartStore.getState().chart
    const valid = validBarlineStylesAt(chart, bar.sectionId, bar.measureId, "end")
    const current = (bar.endBarline ?? "single") as BarlineStyle
    updateMeasure(bar.sectionId, bar.measureId, {
      barlineEnd: cycleBarlineStyle(current, valid),
    })
  }
  const chordScale = useEffectiveScale("chordSize")
  const clefScale = useEffectiveScale("clefSize")
  const staveY = Math.round(14 * chordScale) + 6

  const showKeySig = useChartStore((s) => s.chart.meta.showKeySignature ?? true)
  const shouldShowClef = !!bar.showClef && showClefSetting
  const shouldShowKeySig = !!bar.showClef && showKeySig
  const shouldShowAnything = shouldShowClef || shouldShowKeySig

  // Clef + key sig width for offset calculation
  const clefFontSize = Math.round(32 * clefScale)
  const clefKeySigWidth = shouldShowAnything
    ? estimateClefKeySigWidth(chartKey, clef, clefFontSize) - (shouldShowClef ? 0 : clefFontSize * 1.0)
    : 0

  // Time sig offset: after clef+keysig if present
  const timeSigX = -(clefKeySigWidth + (bar.timeSignature ? 24 : 0))
  const clefX = -(clefKeySigWidth + 4)

  return (
    <g
      className={`bar-group ${isSelected ? "bar-group--selected" : ""}`}
      data-measure-id={bar.measureId}
      data-section-id={bar.sectionId}
      transform={`translate(${bar.x}, 0)`}
    >
      {/* Measure selection highlight */}
      {isSelected && selection?.type === "measure" && (
        <rect
          className="bar-selection-highlight"
          x={0}
          y={0}
          width={bar.width}
          height={56}
          fill="hsl(var(--chart-primary))"
          opacity={0.08}
          rx={3}
        />
      )}

      {/* Clef + key signature — before time signature, at start of each line */}
      {shouldShowAnything && (
        <ClefKeySignature
          clef={clef}
          keyName={chartKey}
          x={clefX}
          y={staveY}
          staffHeight={32}
          showClef={shouldShowClef}
          showKeySig={shouldShowKeySig}
        />
      )}

      {/* Time signature — before the first barline */}
      {bar.timeSignature && (
        <TimeSignatureDisplay
          beats={bar.timeSignature.beats}
          beatUnit={bar.timeSignature.beatUnit}
          x={timeSigX + clefKeySigWidth}
          y={staveY}
          height={32}
        />
      )}

      {/* Start barline */}
      {bar.startBarline && (
        <Barline
          style={bar.startBarline}
          x={0}
          height={32}
          yOffset={staveY}
          onCycle={cycleStartBarline}
        />
      )}

      {/* Beats */}
      {bar.beats.map((beat) => (
        <BeatSlotGroup
          key={beat.beatId}
          beat={beat}
          barX={bar.x}
          lineY={lineY}
          sectionId={bar.sectionId}
          measureId={bar.measureId}
          showSlashes={showSlashes}
          showDynamics={showDynamics}
          showLyrics={showLyrics}
        />
      ))}

      {/* End barline */}
      {bar.endBarline && (
        <Barline
          style={bar.endBarline}
          x={bar.width}
          height={32}
          yOffset={staveY}
          onCycle={cycleEndBarline}
        />
      )}

      {/* Unclosed-repeat hint — sits just above the offending repeat start */}
      {(startBarUnclosed || endBarUnclosed) && (
        <g
          className="barline-unclosed-hint"
          pointerEvents="none"
          transform={`translate(${startBarUnclosed ? 0 : bar.width}, ${staveY - 6})`}
        >
          <text
            x={4}
            y={0}
            fontSize={10}
            fontStyle="italic"
            fill="hsl(var(--destructive))"
            opacity={0.85}
          >
            ↳ don&apos;t forget to close this repeat
          </text>
        </g>
      )}

      {/* Whole rest */}
      {bar.wholeRest && (
        <rect
          className="bar-whole-rest"
          x={bar.width / 2 - 6}
          y={staveY + 8}
          width={12}
          height={4}
          fill="currentColor"
        />
      )}
    </g>
  )
}

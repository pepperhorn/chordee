import type { LayoutBar } from "@/lib/layout/types"
import { BeatSlotGroup } from "./BeatSlotGroup"
import { Barline } from "./Barline"
import { TimeSignatureDisplay } from "./TimeSignatureDisplay"
import { ClefKeySignature } from "./ClefKeySignature"
import { useChartStore } from "@/lib/store"
import {
  useEffectiveScale,
  useFontConfigField,
} from "@/lib/fontConfigContext"
import { estimateClefKeySigWidth } from "@/lib/keySignature"
import {
  validBarlineStylesAt,
  cycleBarlineStyle,
  isUnclosedRepeatStart,
} from "@/lib/barlineValidation"
import {
  generateRepeatRegionId,
  useVoltaSlice,
  useRegionFor,
  type VoltaSlice,
} from "@/lib/voltaState"
import type { Barline as BarlineStyle } from "@/lib/schema"

interface BarGroupProps {
  bar: LayoutBar
  lineY: number
}

export function BarGroup({ bar, lineY }: BarGroupProps) {
  const selection = useChartStore((s) => s.ui.selection)
  const updateMeasure = useChartStore((s) => s.updateMeasure)
  const openEndingPicker = useChartStore((s) => s.openEndingPicker)
  const isSelected = selection?.measureId === bar.measureId
  const showSlashes = useChartStore((s) => s.ui.showSlashes)
  const showDynamics = useChartStore((s) => s.ui.showDynamics)
  const showLyrics = useChartStore((s) => s.ui.showLyrics)
  const clef = useChartStore((s) => s.chart.meta.clef)
  const showClefSetting = useChartStore((s) => s.chart.meta.showClef ?? true)
  const chartKey = useChartStore((s) => s.chart.meta.key)

  // "Don't forget to close this repeat" hint — only on the offending bar.
  // Pulled from live store state instead of subscribing to the whole chart.
  const startBarUnclosed = useChartStore((s) =>
    bar.startBarline === "repeatStart"
      ? isUnclosedRepeatStart(s.chart, bar.sectionId, bar.measureId, "start")
      : false,
  )
  const endBarUnclosed = useChartStore((s) =>
    bar.endBarline === "repeatStart"
      ? isUnclosedRepeatStart(s.chart, bar.sectionId, bar.measureId, "end")
      : false,
  )

  // Region lookup comes from a precomputed Map threaded via context
  // (see ChartSVG → RegionMapContext) instead of walking the chart on
  // every render.
  const liveRegion = useRegionFor(bar.measureId)
  const voltaSlice = useVoltaSlice(bar.measureId)

  /** Open the chart-level Ending picker anchored at the clicked element.
   *  Resolves the *owner* bar — for mid-slice clicks the picker still
   *  edits the volta on the absolute first bar of the slice. */
  const openPickerForOwner = (
    e: React.MouseEvent<SVGElement>,
    ownerSectionId: string,
    ownerMeasureId: string,
  ) => {
    const target = e.currentTarget as SVGGraphicsElement
    const r = target.getBoundingClientRect()
    openEndingPicker(ownerSectionId, ownerMeasureId, {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
    })
  }

  // Cycling enforces the no-nested-repeats rule: repeatStart is skipped
  // when there's already an open repeat above this barline, and repeatEnd
  // is skipped when there's no open repeat to close. When the resulting
  // style is `repeatStart`, we also stamp a fresh repeatRegionId.
  const cycleStartBarline = (e?: React.MouseEvent<SVGElement>) => {
    const liveChart = useChartStore.getState().chart
    // Tapping inside a region opens the ending picker instead of cycling,
    // unless the current style is the region's marker (repeatStart/End).
    if (
      liveRegion &&
      bar.startBarline !== "repeatStart" &&
      bar.startBarline !== "repeatEnd" &&
      e
    ) {
      openPickerForOwner(e, bar.sectionId, bar.measureId)
      return
    }
    const valid = validBarlineStylesAt(liveChart, bar.sectionId, bar.measureId, "start")
    const current = (bar.startBarline ?? "single") as BarlineStyle
    const next = cycleBarlineStyle(current, valid)
    const updates: Record<string, unknown> = { barlineStart: next }
    if (next === "repeatStart" && current !== "repeatStart") {
      updates.repeatRegionId = generateRepeatRegionId()
    } else if (current === "repeatStart" && next !== "repeatStart") {
      updates.repeatRegionId = undefined
    }
    updateMeasure(bar.sectionId, bar.measureId, updates)
  }
  const cycleEndBarline = (e?: React.MouseEvent<SVGElement>) => {
    const liveChart = useChartStore.getState().chart
    if (
      liveRegion &&
      bar.endBarline !== "repeatStart" &&
      bar.endBarline !== "repeatEnd" &&
      e
    ) {
      openPickerForOwner(e, bar.sectionId, bar.measureId)
      return
    }
    const valid = validBarlineStylesAt(liveChart, bar.sectionId, bar.measureId, "end")
    const current = (bar.endBarline ?? "single") as BarlineStyle
    const next = cycleBarlineStyle(current, valid)
    const updates: Record<string, unknown> = { barlineEnd: next }
    if (next === "repeatStart" && current !== "repeatStart") {
      updates.repeatRegionId = generateRepeatRegionId()
    }
    updateMeasure(bar.sectionId, bar.measureId, updates)
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

      {/* Unclosed-repeat hint — sits above the chord row so it doesn't overlap. */}
      {(startBarUnclosed || endBarUnclosed) && (
        <g
          className="barline-unclosed-hint"
          pointerEvents="none"
          transform={`translate(${startBarUnclosed ? 0 : bar.width}, ${-Math.round(24 * chordScale)})`}
        >
          <text
            x={4}
            y={0}
            fontSize={10}
            fontStyle="italic"
            fill="hsl(var(--destructive))"
            opacity={0.9}
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

      {/* Repeat-ending bracket slice for this bar. Per-bar slices are
          computed once per chart in ChartSVG and threaded via
          VoltaSlicesContext, so multi-bar endings render seamlessly
          (middle bars draw only the top line; end bars get the closing
          tick) and multi-line endings "just work" because the slice
          follows the bar wherever line-breaking lands it. Clicking the
          bracket opens the picker for the bar that owns the ending —
          even when the click lands on a mid-slice bar. */}
      {voltaSlice && (
        <VoltaBracket
          slice={voltaSlice}
          width={bar.width}
          y={-Math.round(28 * chordScale)}
          onClick={(e) =>
            openPickerForOwner(
              e,
              voltaSlice.ownerSectionId,
              voltaSlice.ownerMeasureId,
            )
          }
        />
      )}
    </g>
  )
}

// ── Repeat-ending bracket ──────────────────────────────────────────────

interface VoltaBracketProps {
  slice: VoltaSlice
  width: number
  y: number
  onClick: (e: React.MouseEvent<SVGElement>) => void
}

function VoltaBracket({ slice, width, y, onClick }: VoltaBracketProps) {
  const TICK_HEIGHT = 8
  const HIT_HEIGHT = 14
  // Use the chord font so the ending label respects the chart's font
  // configuration (previously hardcoded to PetalumaScript).
  const chordFont = useFontConfigField("chord")
  const showLeftTick = slice.absoluteStart
  const showRightTick = slice.absoluteEnd && !slice.endsAtRepeat
  return (
    <g className="ending-bracket" onClick={onClick} cursor="pointer">
      {/* Invisible hit area covering the top line + label band so the
          whole bracket is clickable, not just the 1px stroke. */}
      <rect
        className="ending-bracket-hit"
        x={0}
        y={y - HIT_HEIGHT / 2}
        width={width}
        height={HIT_HEIGHT}
        fill="transparent"
        pointerEvents="all"
      />
      {/* Top horizontal line — always spans the full bar width so
          multi-bar endings appear continuous. */}
      <line
        className="ending-bracket-top"
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke="currentColor"
        strokeWidth={1.2}
        pointerEvents="none"
      />
      {/* Left start tick — only on the first bar of the ending */}
      {showLeftTick && (
        <line
          className="ending-bracket-tick-left"
          x1={0}
          y1={y}
          x2={0}
          y2={y + TICK_HEIGHT}
          stroke="currentColor"
          strokeWidth={1.2}
          pointerEvents="none"
        />
      )}
      {/* Right end tick — only on the last bar of the ending, and only
          when the bar isn't closed by a repeatEnd barline (that barline
          already visually closes the bracket). */}
      {showRightTick && (
        <line
          className="ending-bracket-tick-right"
          x1={width}
          y1={y}
          x2={width}
          y2={y + TICK_HEIGHT}
          stroke="currentColor"
          strokeWidth={1.2}
          pointerEvents="none"
        />
      )}
      {/* Label — only on the first bar of the ending */}
      {slice.label && (
        <text
          className="ending-bracket-label"
          x={5}
          y={y + 11}
          fontSize={11}
          fontFamily={`${chordFont}, serif`}
          fontWeight={700}
          fill="currentColor"
          pointerEvents="none"
        >
          {slice.label}
        </text>
      )}
    </g>
  )
}

import type { LayoutBar } from "@/lib/layout/types"
import { BeatSlotGroup } from "./BeatSlotGroup"
import { Barline } from "./Barline"
import { TimeSignatureDisplay } from "./TimeSignatureDisplay"
import { ClefKeySignature } from "./ClefKeySignature"
import { useState } from "react"
import { createPortal } from "react-dom"
import { useChartStore } from "@/lib/store"
import { useEffectiveScale } from "@/lib/fontConfigContext"
import { estimateClefKeySigWidth } from "@/lib/keySignature"
import {
  validBarlineStylesAt,
  cycleBarlineStyle,
  isUnclosedRepeatStart,
} from "@/lib/barlineValidation"
import {
  findRegionContaining,
  listVoltasInRegion,
  takenPresetKeys,
  suggestNextPreset,
  findMeasureAfterRegion,
  generateRepeatRegionId,
} from "@/lib/voltaState"
import { findVoltaPreset, DEFAULT_CLOSING_PRESET } from "@/lib/voltaPresets"
import { VoltaPicker } from "./VoltaPicker"
import type { Barline as BarlineStyle, Volta } from "@/lib/schema"

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

  // Volta picker state — opens when the user taps a barline of a measure
  // that's inside a repeat region (and the barline isn't a region marker).
  const [voltaPickerOpen, setVoltaPickerOpen] = useState(false)
  const [voltaAnchorRect, setVoltaAnchorRect] = useState<DOMRect | null>(null)

  const openVoltaPickerFor = (e: React.MouseEvent<SVGElement>) => {
    const target = e.currentTarget as SVGGraphicsElement
    setVoltaAnchorRect(target.getBoundingClientRect())
    setVoltaPickerOpen(true)
  }

  // Cycling enforces the no-nested-repeats rule: repeatStart is skipped
  // when there's already an open repeat above this barline, and repeatEnd
  // is skipped when there's no open repeat to close. When the resulting
  // style is `repeatStart`, we also stamp a fresh repeatRegionId.
  const cycleStartBarline = (e?: React.MouseEvent<SVGElement>) => {
    const liveChart = useChartStore.getState().chart
    // Tapping inside a region opens the volta picker instead of cycling,
    // unless the current style is the region's marker (repeatStart/End).
    const inRegion = findRegionContaining(liveChart, bar.sectionId, bar.measureId)
    if (
      inRegion &&
      bar.startBarline !== "repeatStart" &&
      bar.startBarline !== "repeatEnd" &&
      e
    ) {
      openVoltaPickerFor(e)
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
    const inRegion = findRegionContaining(liveChart, bar.sectionId, bar.measureId)
    if (
      inRegion &&
      bar.endBarline !== "repeatStart" &&
      bar.endBarline !== "repeatEnd" &&
      e
    ) {
      openVoltaPickerFor(e)
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

  // ── Volta apply / remove ────────────────────────────────────────────
  const liveRegion = findRegionContaining(chart, bar.sectionId, bar.measureId)
  const measureObj = chart.sections
    .find((s) => s.id === bar.sectionId)
    ?.measures.find((m) => m.id === bar.measureId)
  const currentVolta: Volta | null = measureObj?.volta ?? null
  const voltasInRegion = liveRegion ? listVoltasInRegion(chart, liveRegion) : []
  const isFirstInRegion = voltasInRegion.length === 0
  const taken = liveRegion ? takenPresetKeys(chart, liveRegion) : new Set<string>()
  const suggested = liveRegion
    ? suggestNextPreset(chart, liveRegion)
    : { key: "1", label: "1." }

  const applyVolta = (
    preset: { key: string; label: string },
    customLabel?: string,
  ) => {
    if (!liveRegion) return
    const finalLabel = customLabel ?? preset.label
    updateMeasure(bar.sectionId, bar.measureId, {
      volta: {
        regionId: liveRegion.regionId,
        label: finalLabel,
        presetKey: preset.key,
      },
    })

    // If this is the first volta in the region AND there's a measure right
    // after the close-repeat, auto-create the closing "2." volta there.
    if (isFirstInRegion) {
      const next = findMeasureAfterRegion(chart, liveRegion)
      if (next) {
        // Default closing preset, unless it's already taken
        const closing = taken.has("2-close")
          ? null
          : { key: "2-close", label: "2." }
        if (closing) {
          updateMeasure(next.sectionId, next.measureId, {
            volta: {
              regionId: liveRegion.regionId,
              label: closing.label,
              presetKey: closing.key,
            },
          })
        }
      }
    }
  }

  const removeVolta = () => {
    updateMeasure(bar.sectionId, bar.measureId, { volta: undefined })
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

      {/* Volta bracket — when this measure carries a volta, render the
          left tick + horizontal top line. Span ends are handled by
          subsequent bars in the same region (each bar draws its own slice). */}
      {currentVolta && (
        <VoltaBracket
          label={currentVolta.label}
          width={bar.width}
          // Top of the bracket sits above the chord row
          y={-Math.round(28 * chordScale)}
          showStartTick={true}
        />
      )}

      {/* Picker portal — rendered in document.body so it's free of the SVG tree */}
      {voltaPickerOpen && typeof document !== "undefined" &&
        createPortal(
          <VoltaPicker
            open={voltaPickerOpen}
            onOpenChange={setVoltaPickerOpen}
            anchorRect={voltaAnchorRect}
            current={currentVolta}
            takenKeys={taken}
            suggested={suggested}
            isFirstInRegion={isFirstInRegion}
            onSelect={applyVolta}
            onRemove={removeVolta}
          />,
          document.body,
        )}
    </g>
  )
}

// ── Volta bracket ──────────────────────────────────────────────────────

interface VoltaBracketProps {
  label: string
  width: number
  y: number
  showStartTick: boolean
}

function VoltaBracket({ label, width, y, showStartTick }: VoltaBracketProps) {
  const TICK_HEIGHT = 8
  return (
    <g className="volta-bracket" pointerEvents="none">
      {/* Top horizontal line */}
      <line
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke="currentColor"
        strokeWidth={1.2}
      />
      {/* Left start tick */}
      {showStartTick && (
        <line
          x1={0}
          y1={y}
          x2={0}
          y2={y + TICK_HEIGHT}
          stroke="currentColor"
          strokeWidth={1.2}
        />
      )}
      {/* Label */}
      <text
        x={5}
        y={y + 11}
        fontSize={11}
        fontFamily="PetalumaScript, serif"
        fontWeight={700}
        fill="currentColor"
      >
        {label}
      </text>
    </g>
  )
}

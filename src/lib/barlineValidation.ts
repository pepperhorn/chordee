import { createContext, useContext } from "react"
import type { ChordChart, Barline as BarlineStyle } from "./schema"

// Order used by the tap-to-cycle UI.
export const BARLINE_CYCLE_ORDER: BarlineStyle[] = [
  "single",
  "double",
  "repeatStart",
  "repeatEnd",
  "final",
]

/**
 * Walk all barlines in chart order and count (repeatStart) - (repeatEnd),
 * stopping just BEFORE the specified position. The returned value is the
 * number of unclosed repeats that are "active" when the user approaches
 * this barline — i.e., how deep we are inside an open repeat region.
 *
 * The current barline at (sectionId, measureId, side) is deliberately
 * excluded from the count, because cycling replaces it — we want to know
 * what's valid at this position independent of its current style.
 */
export function countOpenRepeatsBefore(
  chart: ChordChart,
  sectionId: string,
  measureId: string,
  side: "start" | "end",
): number {
  let count = 0
  for (const section of chart.sections) {
    for (const measure of section.measures) {
      const isTarget = section.id === sectionId && measure.id === measureId

      // The start barline is encountered first in each measure.
      if (isTarget && side === "start") return count
      if (measure.barlineStart === "repeatStart") count++
      else if (measure.barlineStart === "repeatEnd") count--

      // Then the end barline.
      if (isTarget && side === "end") return count
      if (measure.barlineEnd === "repeatStart") count++
      else if (measure.barlineEnd === "repeatEnd") count--
    }
  }
  return count
}

/** Returns true if any `repeatStart` exists earlier in the chart than
 *  the given position. Used to allow a `repeatEnd` even when the strict
 *  open-count has already been consumed by an earlier close — that's
 *  how multi-ending structures work: one opener, several closers,
 *  each delimiting a different ending. */
export function hasRepeatStartBefore(
  chart: ChordChart,
  sectionId: string,
  measureId: string,
  side: "start" | "end",
): boolean {
  for (const section of chart.sections) {
    for (const measure of section.measures) {
      const isTarget = section.id === sectionId && measure.id === measureId
      if (isTarget && side === "start") return false
      if (measure.barlineStart === "repeatStart") return true
      if (isTarget && side === "end") return false
      if (measure.barlineEnd === "repeatStart") return true
    }
  }
  return false
}

/**
 * Returns the set of barline styles that are valid at the given position,
 * enforcing the "no nested repeats" rule and allowing multi-ending
 * structures:
 *   - `repeatStart` is only valid when no repeat is currently open above.
 *   - `repeatEnd`   is valid whenever some `repeatStart` exists earlier
 *     in the chart — this permits multiple closing barlines for
 *     one opener, each delimiting a different ending bracket.
 *   - `single`, `double`, `final` are always valid.
 */
export function validBarlineStylesAt(
  chart: ChordChart,
  sectionId: string,
  measureId: string,
  side: "start" | "end",
): Set<BarlineStyle> {
  const open = countOpenRepeatsBefore(chart, sectionId, measureId, side)
  const valid = new Set<BarlineStyle>(["single", "double", "final"])
  if (open === 0) valid.add("repeatStart")
  if (hasRepeatStartBefore(chart, sectionId, measureId, side)) {
    valid.add("repeatEnd")
  }
  return valid
}

/**
 * Advance a barline style along `BARLINE_CYCLE_ORDER`, skipping any style
 * that isn't in `valid`. Returns the next valid style. If nothing is
 * valid (shouldn't happen — singles are always valid), falls back to
 * `"single"`.
 */
export function cycleBarlineStyle(
  current: BarlineStyle,
  valid: Set<BarlineStyle>,
): BarlineStyle {
  const len = BARLINE_CYCLE_ORDER.length
  const startIdx = Math.max(0, BARLINE_CYCLE_ORDER.indexOf(current))
  for (let i = 1; i <= len; i++) {
    const next = BARLINE_CYCLE_ORDER[(startIdx + i) % len]!
    if (valid.has(next)) return next
  }
  return "single"
}

/**
 * Returns true if a `repeatEnd` at this position has no `repeatStart`
 * anywhere earlier in the chart — i.e., it's a truly orphaned close.
 * (Multiple close-repeats for one opener are fine; what's broken is a
 * close-repeat with no opener at all.) Used to surface a "this
 * close-repeat needs an ending bracket OR a fresh start-repeat" hint.
 */
export function isOrphanedRepeatEnd(
  chart: ChordChart,
  sectionId: string,
  measureId: string,
  side: "start" | "end",
): boolean {
  return !hasRepeatStartBefore(chart, sectionId, measureId, side)
}

/**
 * Returns true if the `repeatStart` at this position has no matching
 * `repeatEnd` later in the chart. Used to surface a "don't forget to close
 * this repeat" hint. Walks barlines in chart order; once it reaches the
 * target it counts (start) - (end) and returns false the moment the count
 * hits 0.
 */
export function isUnclosedRepeatStart(
  chart: ChordChart,
  sectionId: string,
  measureId: string,
  side: "start" | "end",
): boolean {
  let started = false
  let net = 0

  const consume = (style: BarlineStyle | undefined): boolean => {
    if (!started) return true // continue
    if (style === "repeatStart") net++
    else if (style === "repeatEnd") {
      net--
      if (net === 0) return false // closed → stop
    }
    return true
  }

  for (const section of chart.sections) {
    for (const measure of section.measures) {
      const isTarget = section.id === sectionId && measure.id === measureId

      // Start side
      if (!started && isTarget && side === "start") {
        if (measure.barlineStart !== "repeatStart") return false
        started = true
        net = 1
      } else {
        if (!consume(measure.barlineStart as BarlineStyle | undefined)) return false
      }

      // End side
      if (!started && isTarget && side === "end") {
        if (measure.barlineEnd !== "repeatStart") return false
        started = true
        net = 1
      } else {
        if (!consume(measure.barlineEnd as BarlineStyle | undefined)) return false
      }
    }
  }
  return started && net > 0
}

// ── Precomputed hint map ───────────────────────────────────────────────

/**
 * Per-render hint map computed once per chart in ChartSVG and threaded
 * via context. Replaces 4× per-bar calls to `isUnclosedRepeatStart` /
 * `isOrphanedRepeatEnd` (each O(bars)) with a single O(bars) walk.
 *
 * Each set holds measure ids whose start- or end-side barline triggers
 * the corresponding hint. Bars not in any set show no hint.
 */
export interface BarlineHints {
  startUnclosed: Set<string>
  endUnclosed: Set<string>
  startOrphan: Set<string>
  endOrphan: Set<string>
}

export function computeBarlineHints(chart: ChordChart): BarlineHints {
  const hints: BarlineHints = {
    startUnclosed: new Set(),
    endUnclosed: new Set(),
    startOrphan: new Set(),
    endOrphan: new Set(),
  }
  // Track open repeats as a stack of (measureId, side). Anything left on
  // the stack at end-of-walk is unclosed. Stack semantics match the
  // existing single-target `isUnclosedRepeatStart` walk: a repeatEnd
  // closes the most-recent unclosed start.
  type Open = { measureId: string; side: "start" | "end" }
  const open: Open[] = []
  // Orphan close-repeat detection: a repeatEnd is orphaned only if NO
  // repeatStart appears strictly before it in chart order.
  let seenStart = false

  for (const section of chart.sections) {
    for (const measure of section.measures) {
      // Start side
      if (measure.barlineStart === "repeatStart") {
        open.push({ measureId: measure.id, side: "start" })
        seenStart = true
      } else if (measure.barlineStart === "repeatEnd") {
        if (!seenStart) hints.startOrphan.add(measure.id)
        if (open.length > 0) open.pop()
      }
      // End side
      if (measure.barlineEnd === "repeatStart") {
        open.push({ measureId: measure.id, side: "end" })
        seenStart = true
      } else if (measure.barlineEnd === "repeatEnd") {
        if (!seenStart) hints.endOrphan.add(measure.id)
        if (open.length > 0) open.pop()
      }
    }
  }

  for (const o of open) {
    if (o.side === "start") hints.startUnclosed.add(o.measureId)
    else hints.endUnclosed.add(o.measureId)
  }

  return hints
}

/** React context carrying the precomputed barline hint map from
 *  ChartSVG down to BarGroups. Avoids O(bars²) per-render walks. */
export const BarlineHintsContext = createContext<BarlineHints | null>(null)

export interface BarHintFlags {
  startUnclosed: boolean
  endUnclosed: boolean
  startOrphan: boolean
  endOrphan: boolean
}

const EMPTY_HINTS: BarHintFlags = {
  startUnclosed: false,
  endUnclosed: false,
  startOrphan: false,
  endOrphan: false,
}

export function useBarlineHints(measureId: string): BarHintFlags {
  const map = useContext(BarlineHintsContext)
  if (!map) return EMPTY_HINTS
  return {
    startUnclosed: map.startUnclosed.has(measureId),
    endUnclosed: map.endUnclosed.has(measureId),
    startOrphan: map.startOrphan.has(measureId),
    endOrphan: map.endOrphan.has(measureId),
  }
}

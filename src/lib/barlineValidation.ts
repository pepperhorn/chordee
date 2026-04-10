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

/**
 * Returns the set of barline styles that are valid at the given position,
 * enforcing the "no nested repeats" rule:
 *   - `repeatStart` is only valid when no repeat is currently open above.
 *   - `repeatEnd`   is only valid when a repeat IS currently open above.
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
  if (open > 0) valid.add("repeatEnd")
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
 * Returns true if a `repeatEnd` at this position has no matching
 * `repeatStart` opener earlier in the chart — i.e., it's an orphan
 * caused by the user dropping a new close-repeat in front of an
 * existing one. Used to surface a "this close-repeat needs an ending
 * bracket OR a fresh start-repeat" hint.
 */
export function isOrphanedRepeatEnd(
  chart: ChordChart,
  sectionId: string,
  measureId: string,
  side: "start" | "end",
): boolean {
  return countOpenRepeatsBefore(chart, sectionId, measureId, side) === 0
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

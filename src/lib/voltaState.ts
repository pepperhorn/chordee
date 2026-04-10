import { createContext, useContext } from "react"
import type { ChordChart, Measure, Volta } from "./schema"
import { findVoltaPreset, VOLTA_PRESETS, type VoltaPreset } from "./voltaPresets"

/**
 * A repeat region — bounded by a measure with `barlineStart === "repeatStart"`
 * and the next measure with a `barlineEnd === "repeatEnd"` (or another
 * `barlineStart === "repeatStart"`, which would be nesting and is forbidden).
 *
 * `regionId` is the stable identifier stored on the opening measure as
 * `repeatRegionId`.
 *
 * `measures` is the flat list of measures inside the region in chart order
 * (including the opening and closing measures themselves).
 */
export interface RepeatRegion {
  regionId: string
  startSectionId: string
  startMeasureId: string
  endSectionId: string
  endMeasureId: string
  /** Linear list of (sectionId, measureId) inside the region in chart order. */
  measures: Array<{ sectionId: string; measureId: string }>
}

/** Walk the chart and resolve every repeat region. Skips repeats with no
 *  matching close (those are flagged separately by `isUnclosedRepeatStart`). */
export function findRepeatRegions(chart: ChordChart): RepeatRegion[] {
  const regions: RepeatRegion[] = []
  let open: {
    regionId: string
    startSectionId: string
    startMeasureId: string
    measures: Array<{ sectionId: string; measureId: string }>
  } | null = null

  for (const section of chart.sections) {
    for (const measure of section.measures) {
      const ref = { sectionId: section.id, measureId: measure.id }

      if (measure.barlineStart === "repeatStart" && !open && measure.repeatRegionId) {
        open = {
          regionId: measure.repeatRegionId,
          startSectionId: section.id,
          startMeasureId: measure.id,
          measures: [ref],
        }
      } else if (open) {
        open.measures.push(ref)
      }

      if (open && measure.barlineEnd === "repeatEnd") {
        regions.push({
          regionId: open.regionId,
          startSectionId: open.startSectionId,
          startMeasureId: open.startMeasureId,
          endSectionId: section.id,
          endMeasureId: measure.id,
          measures: open.measures,
        })
        open = null
      }
    }
  }
  return regions
}

/** Find the repeat region that contains the given measure (the measure may be
 *  the opening, the closing, or anything in between). */
export function findRegionContaining(
  chart: ChordChart,
  sectionId: string,
  measureId: string,
): RepeatRegion | null {
  const regions = findRepeatRegions(chart)
  for (const r of regions) {
    if (
      r.measures.some(
        (m) => m.sectionId === sectionId && m.measureId === measureId,
      )
    ) {
      return r
    }
  }
  return null
}

/** Resolve a measure object inside a chart by its (section, measure) ids. */
export function getMeasure(
  chart: ChordChart,
  sectionId: string,
  measureId: string,
): Measure | null {
  const section = chart.sections.find((s) => s.id === sectionId)
  if (!section) return null
  return section.measures.find((m) => m.id === measureId) ?? null
}

/** Collect every volta currently bound to this region's id, in chart order.
 *  Voltas are scoped by `regionId`, not by bar position — a "second ending"
 *  often lives in the bar immediately after the close-repeat (outside the
 *  region's bars list) while still belonging to the same logical region. */
export function listVoltasInRegion(
  chart: ChordChart,
  region: RepeatRegion,
): Array<{ sectionId: string; measureId: string; volta: Volta }> {
  const out: Array<{ sectionId: string; measureId: string; volta: Volta }> = []
  for (const section of chart.sections) {
    for (const measure of section.measures) {
      if (measure.volta && measure.volta.regionId === region.regionId) {
        out.push({
          sectionId: section.id,
          measureId: measure.id,
          volta: measure.volta,
        })
      }
    }
  }
  return out
}

/** Find the measure that comes immediately after a region's closing measure
 *  in chart order. Returns null if the region closes at the very end of the
 *  chart (no measure exists after). */
export function findMeasureAfterRegion(
  chart: ChordChart,
  region: RepeatRegion,
): { sectionId: string; measureId: string } | null {
  let foundEnd = false
  for (const section of chart.sections) {
    for (const measure of section.measures) {
      if (foundEnd) {
        return { sectionId: section.id, measureId: measure.id }
      }
      if (
        section.id === region.endSectionId &&
        measure.id === region.endMeasureId
      ) {
        foundEnd = true
      }
    }
  }
  return null
}

/** The set of preset keys already taken in a region. */
export function takenPresetKeys(
  chart: ChordChart,
  region: RepeatRegion,
): Set<string> {
  const taken = new Set<string>()
  for (const v of listVoltasInRegion(chart, region)) {
    if (v.volta.presetKey) taken.add(v.volta.presetKey)
  }
  return taken
}

/** Return the suggested next preset to insert into the region, given how
 *  many voltas have already been placed. The picker uses this to focus
 *  the right column / button by default. */
export function suggestNextPreset(
  chart: ChordChart,
  region: RepeatRegion,
): VoltaPreset {
  const taken = takenPresetKeys(chart, region)
  const existing = listVoltasInRegion(chart, region)
  if (existing.length === 0) {
    return VOLTA_PRESETS.opening[0]! // "1."
  }
  // Walk closing column for an unused option, then middle, then opening.
  for (const col of [VOLTA_PRESETS.closing, VOLTA_PRESETS.middle, VOLTA_PRESETS.opening]) {
    for (const p of col) {
      if (!taken.has(p.key)) return p
    }
  }
  return VOLTA_PRESETS.middle[0]!
}

/** Generate a fresh repeat region id. Tiny because regions are scoped per chart. */
export function generateRepeatRegionId(): string {
  return `rr-${Math.random().toString(36).slice(2, 9)}`
}

// Re-export for callers that want to format a saved volta
export { findVoltaPreset }

// ── Per-bar volta slice ─────────────────────────────────────────────────

/**
 * Describes what a single measure's volta bracket should look like.
 * `null` / absent means the bar is not part of any volta.
 *
 * A volta bracket is a horizontal line above the staff that spans one or
 * more consecutive bars. This struct tells a BarGroup whether to:
 *   - draw the left end-tick (absolute first bar of the volta only)
 *   - draw the right end-tick (absolute last bar of the volta, and only
 *     when the bar isn't closed by a `repeatEnd` barline — that barline
 *     visually closes the bracket on its own)
 *   - render the label (absolute first bar only)
 *
 * Bars in the middle of a volta render only the top horizontal line;
 * left/right ticks are false. This makes multi-line voltas "just work"
 * because each layout line's first bar has absoluteStart=false (unless
 * it's also the volta's first bar) — the line starts without a tick,
 * the top line fills the bar width, and the bracket visually continues
 * from the previous line.
 */
export interface VoltaSlice {
  label: string | null
  absoluteStart: boolean
  absoluteEnd: boolean
  /** True if the bar that ends this volta slice has `barlineEnd === "repeatEnd"`.
   *  Callers use this to suppress the right-side tick since the close-repeat
   *  visually closes the bracket. */
  endsAtRepeat: boolean
}

/**
 * Walks the chart and computes a volta slice for every measure that is
 * covered by a volta. A volta extends from its starting measure until
 * the next measure (in chart order) that carries another volta with the
 * same `regionId`, OR until the end of the chart if no such next volta
 * exists.
 */
export function computeVoltaSlices(
  chart: ChordChart,
): Map<string, VoltaSlice> {
  const slices = new Map<string, VoltaSlice>()

  // Flatten (section, measure) pairs into a linear list so we can index
  // by chart position.
  const flat: Array<{ sectionId: string; measure: Measure }> = []
  for (const section of chart.sections) {
    for (const measure of section.measures) {
      flat.push({ sectionId: section.id, measure })
    }
  }

  for (let i = 0; i < flat.length; i++) {
    const measure = flat[i]!.measure
    if (!measure.volta) continue
    const regionId = measure.volta.regionId

    // Find the next measure that has a volta in the same region.
    let nextIdx = -1
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[j]!.measure.volta?.regionId === regionId) {
        nextIdx = j
        break
      }
    }

    const lastIdx = nextIdx === -1 ? flat.length - 1 : nextIdx - 1
    const lastBar = flat[lastIdx]!.measure
    const endsAtRepeat = lastBar.barlineEnd === "repeatEnd"

    for (let k = i; k <= lastIdx; k++) {
      const bar = flat[k]!.measure
      if (slices.has(bar.id)) continue // first-writer wins
      slices.set(bar.id, {
        label: k === i ? measure.volta.label : null,
        absoluteStart: k === i,
        absoluteEnd: k === lastIdx,
        endsAtRepeat,
      })
    }
  }

  return slices
}

/** React context carrying the precomputed volta slice map from ChartSVG
 *  down to individual BarGroups, avoiding per-bar chart walks. */
export const VoltaSlicesContext = createContext<Map<string, VoltaSlice> | null>(
  null,
)

export function useVoltaSlice(measureId: string): VoltaSlice | null {
  const map = useContext(VoltaSlicesContext)
  if (!map) return null
  return map.get(measureId) ?? null
}

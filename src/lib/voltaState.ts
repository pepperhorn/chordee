import { createContext, useContext } from "react"
import type { ChordChart, Measure, Volta } from "./schema"
import {
  VOLTA_PRESETS,
  type VoltaPreset,
  parseVoltaOrdinals,
  presetForOrdinal,
} from "./voltaPresets"

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
 *  matching close (those are flagged separately by `isUnclosedRepeatStart`).
 *
 *  A close-repeat barline can be stored either as the END of one measure
 *  (`barlineEnd === "repeatEnd"`) or as the START of the next measure
 *  (`barlineStart === "repeatEnd"`) — they describe the same physical
 *  barline. Both forms are detected here so the picker, slice computer,
 *  and region map all see the region as closed. */
export function findRepeatRegions(chart: ChordChart): RepeatRegion[] {
  const regions: RepeatRegion[] = []
  let open: {
    regionId: string
    startSectionId: string
    startMeasureId: string
    endSectionId: string
    endMeasureId: string
    measures: Array<{ sectionId: string; measureId: string }>
  } | null = null

  const flushOpen = () => {
    if (!open) return
    regions.push({
      regionId: open.regionId,
      startSectionId: open.startSectionId,
      startMeasureId: open.startMeasureId,
      endSectionId: open.endSectionId,
      endMeasureId: open.endMeasureId,
      measures: open.measures,
    })
    open = null
  }

  for (const section of chart.sections) {
    for (const measure of section.measures) {
      const ref = { sectionId: section.id, measureId: measure.id }

      // A close-repeat sitting on the LEFT barline of this measure means
      // the previous measure was the last one inside the open region.
      // Close before processing this measure further — the current
      // measure is OUTSIDE the region.
      if (open && measure.barlineStart === "repeatEnd") {
        flushOpen()
      }

      if (measure.barlineStart === "repeatStart" && !open && measure.repeatRegionId) {
        open = {
          regionId: measure.repeatRegionId,
          startSectionId: section.id,
          startMeasureId: measure.id,
          endSectionId: section.id,
          endMeasureId: measure.id,
          measures: [ref],
        }
      } else if (open) {
        open.measures.push(ref)
        open.endSectionId = section.id
        open.endMeasureId = measure.id
      }

      if (open && measure.barlineEnd === "repeatEnd") {
        flushOpen()
      }
    }
  }
  return regions
}

/** Find the repeat region that contains the given measure. The measure
 *  may be the opening, the closing, anything in between, OR the bar
 *  immediately after the close-repeat (where the closing ending lives —
 *  that bar is logically attached to the region even though it sits
 *  outside the region's `measures` list). */
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
    const after = findMeasureAfterRegion(chart, r)
    if (
      after &&
      after.sectionId === sectionId &&
      after.measureId === measureId
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

/** Everything already "taken" by endings in a region. Used by the picker
 *  to disable presets and by `suggestNextPreset` to pick a sensible next
 *  ordinal.
 *
 *  - `keys` — stable preset keys
 *  - `labels` — trimmed display labels (catches cross-column collisions
 *    and free-text edits)
 *  - `ordinals` — numeric ending numbers parsed out of labels, so
 *    `"1., 2."` as the opening ending blocks the picker from offering
 *    "1." or "2." as the next ending and suggests "3." instead. */
export interface TakenPresets {
  keys: Set<string>
  labels: Set<string>
  ordinals: Set<number>
}

export function takenPresetKeys(
  chart: ChordChart,
  region: RepeatRegion,
): TakenPresets {
  const keys = new Set<string>()
  const labels = new Set<string>()
  const ordinals = new Set<number>()
  for (const v of listVoltasInRegion(chart, region)) {
    if (v.volta.presetKey) keys.add(v.volta.presetKey)
    const trimmed = v.volta.label.trim()
    if (trimmed) labels.add(trimmed)
    for (const n of parseVoltaOrdinals(v.volta.label)) {
      ordinals.add(n)
    }
  }
  return { keys, labels, ordinals }
}

/** Return the suggested next preset to insert into the region.
 *
 *  The suggestion is driven by parsed ordinals: whatever numbers have
 *  already appeared in existing ending labels are "taken," so the
 *  smallest unused ordinal (≥ 1) becomes the next preset. Examples:
 *    - Empty region → "1."
 *    - "1." taken → "2."
 *    - "1., 2." taken (opening ending covers both passes) → "3."
 *    - "1.", "2.", "3." taken → "4."
 *
 *  When no numeric ordinals exist (e.g. the user only has named
 *  endings like "Vamp"), fall back to the first unused preset in the
 *  column order that matches the target bar's position. */
export function suggestNextPreset(
  chart: ChordChart,
  region: RepeatRegion,
  targetMeasureId?: string,
): VoltaPreset {
  const taken = takenPresetKeys(chart, region)
  const existing = listVoltasInRegion(chart, region)
  if (existing.length === 0) {
    return VOLTA_PRESETS.opening[0]! // "1."
  }

  // Ordinal-first suggestion — find the smallest unused number ≥ 1.
  if (taken.ordinals.size > 0) {
    let n = 1
    while (taken.ordinals.has(n)) n++
    return presetForOrdinal(n)
  }

  // Fallback: no ordinals in the region, fall through to column-order
  // scanning (same as before).
  const after = findMeasureAfterRegion(chart, region)
  const isAtClosing =
    !!targetMeasureId &&
    (targetMeasureId === region.endMeasureId ||
      after?.measureId === targetMeasureId)
  const cols = isAtClosing
    ? [VOLTA_PRESETS.closing, VOLTA_PRESETS.middle, VOLTA_PRESETS.opening]
    : [VOLTA_PRESETS.middle, VOLTA_PRESETS.closing, VOLTA_PRESETS.opening]
  for (const col of cols) {
    for (const p of col) {
      if (!taken.keys.has(p.key) && !taken.labels.has(p.label.trim())) return p
    }
  }
  return VOLTA_PRESETS.middle[0]!
}

/** Generate a fresh repeat region id. Tiny because regions are scoped per chart. */
export function generateRepeatRegionId(): string {
  return `rr-${Math.random().toString(36).slice(2, 9)}`
}

/** Returns the set of regionIds that are currently "closed" — i.e. have a
 *  matching `repeatStart` opener (with `repeatRegionId`) AND a matching
 *  `repeatEnd` closer. Endings whose regionId isn't in this set are
 *  orphans (their region was deleted, broken, or unpaired). */
export function findClosedRegionIds(chart: ChordChart): Set<string> {
  const closed = new Set<string>()
  for (const region of findRepeatRegions(chart)) {
    closed.add(region.regionId)
  }
  return closed
}

/** Mutating helper. Strips `volta` from any measure whose regionId no
 *  longer corresponds to a closed region. Called automatically by the
 *  store after every chart mutation so endings can never outlive their
 *  region (which previously left ghost brackets sprawling across the
 *  chart with no way to edit or remove them). */
export function pruneOrphanedVoltas(chart: ChordChart): void {
  const valid = findClosedRegionIds(chart)
  for (const section of chart.sections) {
    for (const measure of section.measures) {
      if (measure.volta && !valid.has(measure.volta.regionId)) {
        delete (measure as Measure).volta
      }
    }
  }
}

/** Build a Map<measureId, RepeatRegion> covering every bar that lies
 *  inside a region OR holds an "outside" closing ending (the bar
 *  immediately after the close-repeat). Computed once per chart by
 *  ChartSVG and threaded via context so individual BarGroups don't each
 *  walk the chart on every render. */
export function computeRegionMap(
  chart: ChordChart,
): Map<string, RepeatRegion> {
  const map = new Map<string, RepeatRegion>()
  const regions = findRepeatRegions(chart)
  for (const region of regions) {
    for (const m of region.measures) {
      map.set(m.measureId, region)
    }
    // Also include the bar immediately after the region — that's where
    // the closing ending lives. Click handlers on that bar need to
    // resolve back to the region even before any volta is placed there.
    const after = findMeasureAfterRegion(chart, region)
    if (after && !map.has(after.measureId)) {
      map.set(after.measureId, region)
    }
  }
  // Voltas placed elsewhere still resolve to their region.
  for (const section of chart.sections) {
    for (const measure of section.measures) {
      if (measure.volta && !map.has(measure.id)) {
        const region = regions.find(
          (r) => r.regionId === measure.volta!.regionId,
        )
        if (region) map.set(measure.id, region)
      }
    }
  }
  return map
}

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
  /** True when this slice's absoluteStart bar is immediately preceded
   *  by another ending's absoluteEnd bar — i.e., two brackets abut. The
   *  renderer insets the left edge by a few pixels so adjacent brackets
   *  don't touch and get visually distinct. */
  abutsPrevious: boolean
  /** True on every bar of a 2nd (or later) ending in a region. Used to
   *  inset the right edge of secondary endings so they pull back from
   *  the bar boundary, separating them visually from what follows. */
  isSecondary: boolean
  /** True when the bracket has no close-repeat at its right edge — the
   *  "final" ending of a multi-ending structure is open-ended (no
   *  vertical close tick) because the music simply continues. */
  openEnd: boolean
  /** The bar that owns the volta object (the absolute first bar of the
   *  slice). Click handlers on mid-slice bars use this to route the
   *  picker back to the bar that holds the volta. */
  ownerSectionId: string
  ownerMeasureId: string
}

/**
 * Walks the chart and computes a volta slice for every measure that is
 * covered by a volta. An ending bracket extends from its starting
 * measure until the earlier of:
 *   - the next measure that carries another volta in the same region, or
 *   - the region's close-repeat bar (for inside-region voltas), or
 *   - the end of the current section (for outside-region voltas like the
 *     closing ending placed after the repeat).
 *
 * The previous "extend to end of chart" fallback caused brackets to
 * shoot past the repeat barline, which is what the user saw in the
 * "Autumn Leaves" screenshot.
 */
export function computeVoltaSlices(
  chart: ChordChart,
): Map<string, VoltaSlice> {
  const slices = new Map<string, VoltaSlice>()
  const regions = findRepeatRegions(chart)

  // Build quick lookup: regionId → flat-index of the region's close bar,
  // and regionId → set of measureIds inside the region.
  const flat: Array<{ sectionId: string; measure: Measure }> = []
  for (const section of chart.sections) {
    for (const measure of section.measures) {
      flat.push({ sectionId: section.id, measure })
    }
  }

  const regionEndIdx = new Map<string, number>()
  const regionMeasureIds = new Map<string, Set<string>>()
  for (const region of regions) {
    const ids = new Set<string>()
    for (const m of region.measures) ids.add(m.measureId)
    regionMeasureIds.set(region.regionId, ids)
    // Find the flat index of the region's closing measure.
    for (let j = 0; j < flat.length; j++) {
      if (flat[j]!.measure.id === region.endMeasureId) {
        regionEndIdx.set(region.regionId, j)
        break
      }
    }
  }

  // Section boundary lookup — the flat index of the last bar in each
  // section. Used to cap outside-region voltas at the section end.
  const sectionLastIdx = new Map<string, number>()
  for (let j = 0; j < flat.length; j++) {
    sectionLastIdx.set(flat[j]!.sectionId, j)
  }

  // Track the flat index of the previous volta's last bar, keyed by
  // regionId — so when the next volta starts exactly one bar later we
  // know the two brackets abut and need a visual gap.
  const prevEndByRegion = new Map<string, number>()

  // Helpers: does `flat[j]` carry a close-repeat on its right edge,
  // either stored as its own barlineEnd or as the next bar's barlineStart?
  const rightEdgeIsClose = (j: number): boolean => {
    if (j < 0 || j >= flat.length) return false
    if (flat[j]!.measure.barlineEnd === "repeatEnd") return true
    if (j + 1 < flat.length && flat[j + 1]!.measure.barlineStart === "repeatEnd") return true
    return false
  }

  // Scan forward from `from` up to `hardStop` (inclusive) for the first
  // bar whose RIGHT edge is a close-repeat. Returns -1 if none found.
  // Used to find where a 2nd+ ending's bracket should terminate.
  const findNextCloseRightEdge = (from: number, hardStop: number): number => {
    for (let j = from; j <= hardStop && j < flat.length; j++) {
      if (rightEdgeIsClose(j)) return j
    }
    return -1
  }

  // Track how many voltas we've already emitted per region so we can
  // mark every bar of the 2nd+ ending as "secondary" — the bracket
  // renderer uses that to inset left/right edges for visual separation
  // from the preceding ending.
  const voltaCountByRegion = new Map<string, number>()
  const prevAbutsByRegion = new Map<string, number>() // just for abut detection

  for (let i = 0; i < flat.length; i++) {
    const owner = flat[i]!
    const measure = owner.measure
    if (!measure.volta) continue
    const regionId = measure.volta.regionId

    // Find the next measure that has a volta in the same region.
    let nextVoltaIdx = -1
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[j]!.measure.volta?.regionId === regionId) {
        nextVoltaIdx = j
        break
      }
    }

    const insideRegion = regionMeasureIds.get(regionId)?.has(measure.id) ?? false
    // Hard stop for the forward scan — never cross into the next volta
    // (same region) or out of the current section.
    const sectionEnd = sectionLastIdx.get(owner.sectionId) ?? i
    const hardStop = nextVoltaIdx !== -1 ? nextVoltaIdx - 1 : sectionEnd

    // Determine the natural boundary for this bracket.
    let boundaryIdx: number
    let openEnd = false

    if (insideRegion) {
      // 1st (inside-region) ending: extend to the next volta or to the
      // region's close-repeat bar — whichever comes first. This is the
      // "classical" extent that always terminates with a close-repeat.
      if (nextVoltaIdx !== -1) {
        boundaryIdx = nextVoltaIdx - 1
      } else {
        boundaryIdx = regionEndIdx.get(regionId) ?? i
      }
    } else {
      // 2nd+ (outside-region) ending: default to a SINGLE bar and open
      // right edge. If the user adds a close-repeat anywhere between
      // the volta's start bar and the next volta / section end, the
      // bracket extends to that close-repeat and gains a right tick.
      const closeIdx = findNextCloseRightEdge(i, hardStop)
      if (closeIdx !== -1) {
        boundaryIdx = closeIdx
      } else {
        boundaryIdx = i // single bar
        openEnd = true
      }
    }

    const lastIdx = Math.max(i, boundaryIdx)
    const lastBar = flat[lastIdx]!.measure
    const endsAtRepeat = lastBar.barlineEnd === "repeatEnd"
    const voltaOrdinal = (voltaCountByRegion.get(regionId) ?? 0) + 1
    const isSecondary = voltaOrdinal >= 2
    const prevEnd = prevAbutsByRegion.get(regionId)
    const abutsPrevious = prevEnd !== undefined && prevEnd === i - 1

    for (let k = i; k <= lastIdx; k++) {
      const bar = flat[k]!.measure
      if (slices.has(bar.id)) continue // first-writer wins
      slices.set(bar.id, {
        label: k === i ? measure.volta.label : null,
        absoluteStart: k === i,
        absoluteEnd: k === lastIdx,
        endsAtRepeat,
        abutsPrevious: k === i ? abutsPrevious : false,
        isSecondary,
        openEnd,
        ownerSectionId: owner.sectionId,
        ownerMeasureId: measure.id,
      })
    }

    voltaCountByRegion.set(regionId, voltaOrdinal)
    prevAbutsByRegion.set(regionId, lastIdx)
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

/** React context carrying the precomputed measure→region lookup from
 *  ChartSVG down to BarGroups. Avoids the O(bars²) chart walks that the
 *  previous per-render `findRegionContaining` calls produced. */
export const RegionMapContext = createContext<Map<string, RepeatRegion> | null>(
  null,
)

export function useRegionFor(measureId: string): RepeatRegion | null {
  const map = useContext(RegionMapContext)
  if (!map) return null
  return map.get(measureId) ?? null
}

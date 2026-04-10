import { useChartStore } from "@/lib/store"
import {
  findRegionContaining,
  listVoltasInRegion,
  takenPresetKeys,
  suggestNextPreset,
  findMeasureAfterRegion,
  type TakenPresets,
} from "@/lib/voltaState"
import {
  parseVoltaOrdinals,
  presetForOrdinal,
  type VoltaPreset,
} from "@/lib/voltaPresets"
import { VoltaPicker } from "./VoltaPicker"
import type { Volta } from "@/lib/schema"

const EMPTY_TAKEN: TakenPresets = {
  keys: new Set(),
  labels: new Set(),
  ordinals: new Set(),
}
const DEFAULT_SUGGESTED: VoltaPreset = { key: "1", label: "1." }

/**
 * Single chart-level mount point for the Ending picker. Subscribes to the
 * `ui.endingPicker` slot in the store and renders one popover at a time
 * (instead of every BarGroup carrying its own picker state). Uses live
 * store state for region resolution so the picker always reflects the
 * latest chart even after auto-prune.
 */
export function EndingPickerHost() {
  const target = useChartStore((s) => s.ui.endingPicker)
  const closeEndingPicker = useChartStore((s) => s.closeEndingPicker)
  const updateMeasures = useChartStore((s) => s.updateMeasures)
  const updateMeasure = useChartStore((s) => s.updateMeasure)

  if (!target) return null

  // Pull live chart state lazily so the picker is always rendering
  // against the freshest data, never a stale closure.
  const liveChart = useChartStore.getState().chart
  const liveRegion = findRegionContaining(
    liveChart,
    target.sectionId,
    target.measureId,
  )

  const measure = liveChart.sections
    .find((s) => s.id === target.sectionId)
    ?.measures.find((m) => m.id === target.measureId)
  const currentVolta: Volta | null = measure?.volta ?? null

  const taken: TakenPresets = liveRegion
    ? takenPresetKeys(liveChart, liveRegion)
    : EMPTY_TAKEN
  const suggested = liveRegion
    ? suggestNextPreset(liveChart, liveRegion, target.measureId)
    : DEFAULT_SUGGESTED
  const isFirstInRegion = liveRegion
    ? listVoltasInRegion(liveChart, liveRegion).length === 0
    : false

  const handleSelect = (preset: VoltaPreset, customLabel?: string) => {
    // Resolve everything against live state inside the handler — the
    // store may have changed since the picker opened.
    const chart = useChartStore.getState().chart
    const region = findRegionContaining(chart, target.sectionId, target.measureId)
    if (!region) return

    const finalLabel = (customLabel ?? preset.label).trim() || preset.label

    const edits: Array<{
      sectionId: string
      measureId: string
      updates: { volta: Volta }
    }> = [
      {
        sectionId: target.sectionId,
        measureId: target.measureId,
        updates: {
          volta: {
            regionId: region.regionId,
            label: finalLabel,
            presetKey: preset.key,
          },
        },
      },
    ]

    // First-ending auto-create: stamp a closing ending in the bar
    // immediately after the close-repeat — but only when that bar is in
    // the same section (otherwise we'd silently spill into the next
    // section, which is surprising). The closing ordinal is derived
    // from the ordinals the user just picked: picking "1." auto-creates
    // "2."; picking "1., 2." auto-creates "3." (since ordinals 1 and 2
    // are already covered by the opening bracket).
    const wasFirst = listVoltasInRegion(chart, region).length === 0
    if (wasFirst) {
      const next = findMeasureAfterRegion(chart, region)
      if (next && next.sectionId === region.endSectionId) {
        const pickedOrdinals = parseVoltaOrdinals(finalLabel)
        const maxPicked = pickedOrdinals.length > 0 ? Math.max(...pickedOrdinals) : 1
        const closing = presetForOrdinal(maxPicked + 1)
        edits.push({
          sectionId: next.sectionId,
          measureId: next.measureId,
          updates: {
            volta: {
              regionId: region.regionId,
              label: closing.label,
              presetKey: closing.key,
            },
          },
        })
      }
    }

    updateMeasures("Add repeat ending", edits)
  }

  const handleRemove = () => {
    updateMeasure(target.sectionId, target.measureId, {
      volta: undefined,
    })
  }

  return (
    <VoltaPicker
      open={true}
      onOpenChange={(o) => {
        if (!o) closeEndingPicker()
      }}
      anchorRect={target.anchorRect}
      current={currentVolta}
      taken={taken}
      suggested={suggested}
      isFirstInRegion={isFirstInRegion}
      onSelect={handleSelect}
      onRemove={handleRemove}
    />
  )
}

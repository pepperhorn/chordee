import { SAMPLE_CHART } from "../sampleChart"
import { ACTION_KINDS, createCardView, gradientFor } from "./librarySchema"
import type { LibraryCollection, LibraryItem } from "./librarySchema"
import type { LibraryPlugin } from "./registry"
import type { ChordChart } from "../schema"
import { ChordChartSchema } from "../schema"

const PLUGIN_ID = "factory"

interface FactoryEntry {
  id: string
  title: string
  composer?: string
  style?: string
  key?: string
  tempo?: number
  chart: ChordChart
}

// Factory presets. For now we only ship the Autumn Leaves seed; future entries
// can be added inline or split into JSON files under public/factory-charts/.
const FACTORY_ENTRIES: FactoryEntry[] = [
  {
    id: "autumn-leaves",
    title: SAMPLE_CHART.meta.title || "Autumn Leaves",
    composer: SAMPLE_CHART.meta.composer || "Joseph Kosma",
    style: SAMPLE_CHART.meta.style || "Medium Swing",
    key: SAMPLE_CHART.meta.key,
    tempo: SAMPLE_CHART.meta.tempo,
    // Clone so factory entries don't share identity with the live editor seed.
    chart: ChordChartSchema.parse(JSON.parse(JSON.stringify(SAMPLE_CHART))),
  },
]

export const factoryLibraryPlugin: LibraryPlugin = {
  id: PLUGIN_ID,
  label: "Sample charts",
  sort: 90,

  async fetchCollections(): Promise<LibraryCollection[]> {
    const items: LibraryItem[] = FACTORY_ENTRIES.map((entry) => {
      const meta: string[] = []
      if (entry.key) meta.push(`Key of ${entry.key}`)
      if (entry.tempo) meta.push(`${entry.tempo} BPM`)
      if (entry.style) meta.push(entry.style)
      return {
        id: `${PLUGIN_ID}/${entry.id}`,
        pluginId: PLUGIN_ID,
        collectionId: "factory-samples",
        kind: "chart",
        title: entry.title,
        fields: [
          { id: "factory_id", type: "text", value: entry.id },
        ],
        card: createCardView({
          title: entry.title,
          subtitle: entry.composer ? `by ${entry.composer}` : "",
          cover: gradientFor(entry.title),
          meta,
          badges: ["Sample"],
        }),
        actions: [{ id: "load", label: "Open", kind: ACTION_KINDS.LOAD_CHART }],
        // Factory charts include their payload inline so loading is offline-safe.
        payload: entry.chart,
      }
    })
    return [
      {
        id: "factory-samples",
        pluginId: PLUGIN_ID,
        label: "Sample charts",
        description: "Built-in starter charts you can open and customize.",
        itemKind: "chart",
        items,
      },
    ]
  },

  async onActivate(item, _action, ctx) {
    const payload = item.payload
    if (!payload) return
    // Always fork by giving the user a fresh meta.id so saving doesn't
    // overwrite the factory seed identity.
    const fresh: ChordChart = {
      ...payload,
      meta: { ...payload.meta, id: crypto.randomUUID() },
    }
    ctx.setChart(fresh)
    ctx.showToast?.(`Opened "${item.title}" — save it to keep your edits.`, "info")
  },
}

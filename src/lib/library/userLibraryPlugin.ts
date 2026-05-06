import { listCharts, loadChart } from "../cloudSave"
import { ACTION_KINDS, createCardView, gradientFor } from "./librarySchema"
import type { LibraryCollection, LibraryItem } from "./librarySchema"
import type { LibraryPlugin } from "./registry"

const PLUGIN_ID = "user"

function metaFor(visibility?: string, forkedFrom?: string | null): string[] {
  const out: string[] = []
  if (visibility && visibility !== "private") {
    out.push(visibility === "public" ? "Public" : visibility === "link_edit" ? "Shared (edit)" : "Shared (view)")
  } else {
    out.push("Private")
  }
  if (forkedFrom) out.push("Fork")
  return out
}

function badgesFor(visibility?: string, forkedFrom?: string | null): string[] {
  const out: string[] = []
  if (visibility === "public") out.push("Public")
  else if (visibility === "link_view" || visibility === "link_edit") out.push("Shared")
  if (forkedFrom) out.push("Fork")
  return out
}

export const userLibraryPlugin: LibraryPlugin = {
  id: PLUGIN_ID,
  label: "Your charts",
  sort: 10,

  async fetchCollections(ctx): Promise<LibraryCollection[]> {
    if (!ctx.auth.isLoggedIn || !ctx.auth.user || !ctx.auth.token) return []
    const rows = await listCharts(ctx.auth.user.id, ctx.auth.token)
    const items: LibraryItem[] = rows.map((row) => ({
      id: `${PLUGIN_ID}/${row.external_id}`,
      pluginId: PLUGIN_ID,
      collectionId: "user-saves",
      kind: "chart",
      title: row.name,
      fields: [
        { id: "external_id", type: "text", value: row.external_id },
        { id: "visibility", type: "text", value: row.visibility ?? "private" },
        { id: "date_updated", type: "text", value: row.date_updated },
      ],
      card: createCardView({
        title: row.name,
        subtitle: `Updated ${new Date(row.date_updated).toLocaleDateString()}`,
        cover: gradientFor(row.name),
        meta: metaFor(row.visibility, row.forked_from),
        badges: badgesFor(row.visibility, row.forked_from),
      }),
      actions: [
        { id: "load", label: "Open", kind: ACTION_KINDS.LOAD_CHART },
      ],
    }))
    return [
      {
        id: "user-saves",
        pluginId: PLUGIN_ID,
        label: "Your saved charts",
        description: "Charts saved to your PepperHorn account.",
        itemKind: "chart",
        items,
      },
    ]
  },

  async onActivate(item, _action, ctx) {
    if (!ctx.auth.user || !ctx.auth.token) return
    const externalId = (item.fields.find((f) => f.id === "external_id")?.value ?? "") as string
    if (!externalId) return
    const chart = await loadChart(externalId, ctx.auth.user.id, ctx.auth.token)
    if (chart) {
      ctx.setChart(chart)
      ctx.showToast?.(`Opened "${item.title}"`, "info")
    }
  },
}

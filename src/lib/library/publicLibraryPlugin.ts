import { ChordChartSchema } from "../schema"
import { ACTION_KINDS, createCardView, gradientFor } from "./librarySchema"
import type { LibraryCollection, LibraryItem } from "./librarySchema"
import type { LibraryPlugin } from "./registry"

const PLUGIN_ID = "public"
const SAVES_BASE = "https://apps.pepperhorn.com/items/app_user_saves"

interface PublicSave {
  id: string
  external_id: string
  name: string
  date_updated: string
  forked_from: string | null
  app_user: { first_name?: string | null; last_name?: string | null; email?: string } | string | null
}

function ownerLabel(row: PublicSave): string {
  const u = row.app_user
  if (!u) return ""
  if (typeof u === "string") return ""
  const first = u.first_name?.trim()
  const last = u.last_name?.trim()
  if (first || last) return [first, last].filter(Boolean).join(" ")
  return u.email ?? ""
}

export const publicLibraryPlugin: LibraryPlugin = {
  id: PLUGIN_ID,
  label: "Community",
  sort: 30,

  async fetchCollections(ctx): Promise<LibraryCollection[]> {
    const params = new URLSearchParams({
      "filter[app_slug][_eq]": "chordee",
      "filter[kind][_eq]": "chart",
      "filter[visibility][_eq]": "public",
      "filter[status][_eq]": "published",
      sort: "-date_updated",
      fields: "id,external_id,name,date_updated,forked_from,app_user.first_name,app_user.last_name,app_user.email",
      limit: "50",
    })
    const headers: HeadersInit = ctx.auth.token
      ? { Authorization: `Bearer ${ctx.auth.token}` }
      : {}
    const res = await fetch(`${SAVES_BASE}?${params}`, { headers })
    if (!res.ok) {
      // Public read may be ungranted — return an empty collection so the
      // host shows a friendly empty state rather than a hard error.
      return []
    }
    const json = await res.json()
    const rows: PublicSave[] = json?.data ?? []
    if (rows.length === 0) return []

    const items: LibraryItem[] = rows.map((row) => {
      const owner = ownerLabel(row)
      return {
        id: `${PLUGIN_ID}/${row.external_id}`,
        pluginId: PLUGIN_ID,
        collectionId: "public-charts",
        kind: "chart",
        title: row.name,
        fields: [
          { id: "external_id", type: "text", value: row.external_id },
          { id: "save_id", type: "text", value: row.id },
        ],
        card: createCardView({
          title: row.name,
          subtitle: owner ? `by ${owner}` : "Public",
          cover: gradientFor(row.name),
          meta: [owner || "Public", `Updated ${new Date(row.date_updated).toLocaleDateString()}`],
          badges: row.forked_from ? ["Public", "Fork"] : ["Public"],
        }),
        actions: [
          { id: "load", label: "Open", kind: ACTION_KINDS.LOAD_CHART },
          { id: "fork", label: "Fork to my account", kind: ACTION_KINDS.FORK_INTO_LIBRARY },
        ],
      }
    })
    return [
      {
        id: "public-charts",
        pluginId: PLUGIN_ID,
        label: "Community charts",
        description: "Public charts shared by other PepperHorn users.",
        itemKind: "chart",
        items,
      },
    ]
  },

  async onActivate(item, action, ctx) {
    const externalId = (item.fields.find((f) => f.id === "external_id")?.value ?? "") as string
    if (!externalId) return
    // Public charts are readable by anyone (when permissions allow); fetch
    // directly without owner-scoping.
    const params = new URLSearchParams({
      "filter[app_slug][_eq]": "chordee",
      "filter[kind][_eq]": "chart",
      "filter[external_id][_eq]": externalId,
      "filter[visibility][_eq]": "public",
      limit: "1",
      fields: "payload",
    })
    const headers: HeadersInit = ctx.auth.token
      ? { Authorization: `Bearer ${ctx.auth.token}` }
      : {}
    const res = await fetch(`${SAVES_BASE}?${params}`, { headers })
    if (!res.ok) {
      ctx.showToast?.("Couldn't open that public chart.", "warning")
      return
    }
    const json = await res.json()
    const payload = json?.data?.[0]?.payload
    if (!payload) return
    const chart = ChordChartSchema.parse(payload)
    ctx.setChart(chart)
    ctx.showToast?.(
      action?.kind === "fork_into_library"
        ? `Opened "${item.title}" — use the Fork button to save a copy.`
        : `Opened "${item.title}"`,
      "info",
    )
  },
}

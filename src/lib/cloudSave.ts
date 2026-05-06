import type { ChordChart } from "./schema"
import { ChordChartSchema } from "./schema"

const ITEMS_BASE = "https://apps.pepperhorn.com/items/app_user_saves"
const APP_SLUG = "chordee"
const KIND = "chart"

export interface ChartSaveSummary {
  id: string
  external_id: string
  name: string
  date_created: string
  date_updated: string
  visibility?: "private" | "link_view" | "link_edit" | "public"
  forked_from?: string | null
}

interface DirectusItem {
  id: string
  external_id: string
  name: string
  payload: unknown
  date_created: string
  date_updated: string
  app_user: string
  app_slug: string
  kind: string
  status: string
}

function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

function pickName(chart: ChordChart): string {
  return chart.meta.title?.trim() || "Untitled"
}

async function findExisting(externalId: string, userId: string, token: string): Promise<DirectusItem | null> {
  const params = new URLSearchParams({
    "filter[app_user][_eq]": userId,
    "filter[app_slug][_eq]": APP_SLUG,
    "filter[kind][_eq]": KIND,
    "filter[external_id][_eq]": externalId,
    limit: "1",
    fields: "id,external_id,name,date_created,date_updated,visibility,forked_from",
  })
  const res = await fetch(`${ITEMS_BASE}?${params}`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`List failed: ${res.status}`)
  const json = await res.json()
  const items: DirectusItem[] = json?.data ?? []
  return items[0] ?? null
}

export async function saveChart(chart: ChordChart, userId: string, token: string): Promise<ChartSaveSummary> {
  const externalId = chart.meta.id
  const existing = await findExisting(externalId, userId, token)
  const body = {
    app_user: userId,
    app_slug: APP_SLUG,
    kind: KIND,
    external_id: externalId,
    name: pickName(chart),
    payload: chart,
    status: "published",
  }
  if (existing) {
    const res = await fetch(`${ITEMS_BASE}/${existing.id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Save (update) failed: ${res.status}`)
    const json = await res.json()
    return json.data as ChartSaveSummary
  }
  const res = await fetch(ITEMS_BASE, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Save (create) failed: ${res.status}`)
  const json = await res.json()
  return json.data as ChartSaveSummary
}

export async function listCharts(userId: string, token: string): Promise<ChartSaveSummary[]> {
  const params = new URLSearchParams({
    "filter[app_user][_eq]": userId,
    "filter[app_slug][_eq]": APP_SLUG,
    "filter[kind][_eq]": KIND,
    "filter[status][_eq]": "published",
    sort: "-date_updated",
    fields: "id,external_id,name,date_created,date_updated,visibility,forked_from",
    limit: "100",
  })
  const res = await fetch(`${ITEMS_BASE}?${params}`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`List failed: ${res.status}`)
  const json = await res.json()
  return (json?.data ?? []) as ChartSaveSummary[]
}

export async function loadChart(externalId: string, userId: string, token: string): Promise<ChordChart | null> {
  const params = new URLSearchParams({
    "filter[app_user][_eq]": userId,
    "filter[app_slug][_eq]": APP_SLUG,
    "filter[kind][_eq]": KIND,
    "filter[external_id][_eq]": externalId,
    limit: "1",
    fields: "id,payload",
  })
  const res = await fetch(`${ITEMS_BASE}?${params}`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`Load failed: ${res.status}`)
  const json = await res.json()
  const item = (json?.data ?? [])[0]
  if (!item) return null
  return ChordChartSchema.parse(item.payload)
}

export async function deleteChart(itemId: string, token: string): Promise<void> {
  const res = await fetch(`${ITEMS_BASE}/${itemId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
}

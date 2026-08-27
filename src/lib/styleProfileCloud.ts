/**
 * Style profiles synced to the signed-in user's ph-apps account.
 *
 * Reuses the same `app_user_saves` collection charts use (see cloudSave.ts),
 * discriminated by `kind`. The profile's local id doubles as `external_id`, so
 * the same profile round-trips between localStorage and the account without
 * acquiring a second identity.
 */
import { StyleProfileSchema, type StyleProfile } from "./userStyle"

const ITEMS_BASE = "https://apps.pepperhorn.com/items/app_user_saves"
const APP_SLUG = "chordee"
const KIND = "style-profile"

export interface CloudProfileSummary {
  id: string
  external_id: string
  name: string
  date_created: string
  date_updated: string
}

interface DirectusItem extends CloudProfileSummary {
  payload: unknown
}

function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

async function findExisting(
  externalId: string,
  userId: string,
  token: string,
): Promise<CloudProfileSummary | null> {
  const params = new URLSearchParams({
    "filter[app_user][_eq]": userId,
    "filter[app_slug][_eq]": APP_SLUG,
    "filter[kind][_eq]": KIND,
    "filter[external_id][_eq]": externalId,
    limit: "1",
    fields: "id,external_id,name,date_created,date_updated",
  })
  const res = await fetch(`${ITEMS_BASE}?${params}`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`List failed: ${res.status}`)
  const json = await res.json()
  return (json?.data ?? [])[0] ?? null
}

/** Create or update the account copy of a profile. */
export async function saveCloudProfile(
  profile: StyleProfile,
  userId: string,
  token: string,
): Promise<CloudProfileSummary> {
  const existing = await findExisting(profile.id, userId, token)
  const body = {
    app_user: userId,
    app_slug: APP_SLUG,
    kind: KIND,
    external_id: profile.id,
    name: profile.name,
    payload: profile,
    status: "published",
  }
  const url = existing ? `${ITEMS_BASE}/${existing.id}` : ITEMS_BASE
  const res = await fetch(url, {
    method: existing ? "PATCH" : "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`${existing ? "Update" : "Create"} failed: ${res.status}`)
  }
  const json = await res.json()
  return json.data as CloudProfileSummary
}

/** Every profile stored on the account. Malformed payloads are skipped. */
export async function listCloudProfiles(
  userId: string,
  token: string,
): Promise<StyleProfile[]> {
  const params = new URLSearchParams({
    "filter[app_user][_eq]": userId,
    "filter[app_slug][_eq]": APP_SLUG,
    "filter[kind][_eq]": KIND,
    "filter[status][_eq]": "published",
    sort: "-date_updated",
    fields: "id,external_id,name,payload,date_created,date_updated",
    limit: "100",
  })
  const res = await fetch(`${ITEMS_BASE}?${params}`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`List failed: ${res.status}`)
  const json = await res.json()
  const items: DirectusItem[] = json?.data ?? []

  const out: StyleProfile[] = []
  for (const item of items) {
    const parsed = StyleProfileSchema.safeParse(item.payload)
    if (parsed.success) out.push(parsed.data)
    else console.warn(`[styleProfileCloud] skipping "${item.name}": invalid payload`)
  }
  return out
}

export async function deleteCloudProfile(
  externalId: string,
  userId: string,
  token: string,
): Promise<void> {
  const existing = await findExisting(externalId, userId, token)
  if (!existing) return
  const res = await fetch(`${ITEMS_BASE}/${existing.id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
}

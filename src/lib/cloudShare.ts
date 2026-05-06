import type { ChordChart } from "./schema"
import { ChordChartSchema } from "./schema"

const SHORTCODER_BASE = "https://apps.pepperhorn.com/items/shortcoder"
const SAVES_BASE = "https://apps.pepperhorn.com/items/app_user_saves"
const APP_SLUG = "chordee"
const KIND = "chart"

const CODE_ALPHABET =
  "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ" // base57 (no 0/1/I/O/l)
const CODE_LENGTH = 10

export type Visibility = "private" | "link_view" | "link_edit" | "public"

export interface ShortcodeRecord {
  id: string
  code: string
  app_slug: string
  kind: string
  chart_external_id: string | null
  anonymous_payload: ChordChart | null
  created_by: string | null
  visibility_at_create: Visibility
  view_count: number
  date_created: string
  date_updated: string | null
}

export interface ResolvedShare {
  chart: ChordChart
  visibility: Visibility
  ownerId: string | null
  isOwner: boolean
  canEdit: boolean
  canFork: boolean
  source: "owned" | "anonymous"
  shortcode: string
}

function authHeaders(token: string | null): HeadersInit {
  const base: HeadersInit = { "Content-Type": "application/json" }
  if (token) (base as Record<string, string>).Authorization = `Bearer ${token}`
  return base
}

function generateCode(): string {
  const out: string[] = []
  const buf = new Uint8Array(CODE_LENGTH)
  crypto.getRandomValues(buf)
  for (let i = 0; i < CODE_LENGTH; i++) {
    out.push(CODE_ALPHABET[buf[i] % CODE_ALPHABET.length]!)
  }
  return out.join("")
}

interface CreateOwnedShortcodeOpts {
  chart: ChordChart
  ownerId: string
  token: string
  visibility: Exclude<Visibility, "private">
}

/** Create a shortcode that points to an owned save. The caller must have
 *  already saved the chart so an `app_user_saves` row exists with this
 *  external_id. Visibility is also patched on the source save. */
export async function createOwnedShortcode(opts: CreateOwnedShortcodeOpts): Promise<string> {
  const { chart, ownerId, token, visibility } = opts

  // 1. Update visibility on the source save.
  await patchSaveVisibility(chart.meta.id, ownerId, token, visibility)

  // 2. Reuse an existing shortcode for this chart if one already exists.
  const existing = await findOwnedShortcode(chart.meta.id, ownerId, token)
  if (existing) {
    if (existing.visibility_at_create !== visibility) {
      // Resnap the visibility flag (best-effort).
      await fetch(`${SHORTCODER_BASE}/${existing.id}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({ visibility_at_create: visibility }),
      })
    }
    return existing.code
  }

  // 3. Create a fresh shortcode, retrying on collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    const res = await fetch(SHORTCODER_BASE, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        code,
        app_slug: APP_SLUG,
        kind: KIND,
        chart_external_id: chart.meta.id,
        created_by: ownerId,
        visibility_at_create: visibility,
        view_count: 0,
      }),
    })
    if (res.ok) return code
    if (res.status !== 400 && res.status !== 409) {
      throw new Error(`Shortcode create failed (${res.status})`)
    }
    // 400/409 likely collision — retry with a fresh code.
  }
  throw new Error("Failed to allocate a unique shortcode after 5 attempts")
}

/** Create a shortcode for an anonymous (not-logged-in) share. Stores the
 *  full chart payload inline in the shortcoder row. */
export async function createAnonymousShortcode(chart: ChordChart): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    const res = await fetch(SHORTCODER_BASE, {
      method: "POST",
      headers: authHeaders(null),
      body: JSON.stringify({
        code,
        app_slug: APP_SLUG,
        kind: KIND,
        anonymous_payload: chart,
        visibility_at_create: "link_view",
        view_count: 0,
      }),
    })
    if (res.ok) return code
    if (res.status !== 400 && res.status !== 409) {
      throw new Error(`Anonymous shortcode create failed (${res.status})`)
    }
  }
  throw new Error("Failed to allocate a unique shortcode")
}

async function findOwnedShortcode(
  externalId: string,
  ownerId: string,
  token: string,
): Promise<ShortcodeRecord | null> {
  const params = new URLSearchParams({
    "filter[app_slug][_eq]": APP_SLUG,
    "filter[kind][_eq]": KIND,
    "filter[chart_external_id][_eq]": externalId,
    "filter[created_by][_eq]": ownerId,
    limit: "1",
  })
  const res = await fetch(`${SHORTCODER_BASE}?${params}`, { headers: authHeaders(token) })
  if (!res.ok) return null
  const json = await res.json()
  return (json?.data?.[0] as ShortcodeRecord) ?? null
}

async function patchSaveVisibility(
  externalId: string,
  ownerId: string,
  token: string,
  visibility: Visibility,
): Promise<void> {
  const params = new URLSearchParams({
    "filter[app_user][_eq]": ownerId,
    "filter[app_slug][_eq]": APP_SLUG,
    "filter[kind][_eq]": KIND,
    "filter[external_id][_eq]": externalId,
    limit: "1",
    fields: "id",
  })
  const list = await fetch(`${SAVES_BASE}?${params}`, { headers: authHeaders(token) })
  if (!list.ok) return
  const json = await list.json()
  const item = json?.data?.[0]
  if (!item?.id) return
  await fetch(`${SAVES_BASE}/${item.id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ visibility }),
  })
}

interface ResolveOpts {
  code: string
  /** Token of the requesting user. Pass null for an anonymous resolve. */
  token: string | null
  /** id of the requesting user (when logged in). Used to detect ownership. */
  userId: string | null
}

/** Look up a shortcode and return the resolved chart payload + permissions.
 *  Returns null when the code doesn't exist or the requester can't read it. */
export async function resolveShortcode(opts: ResolveOpts): Promise<ResolvedShare | null> {
  const { code, token, userId } = opts
  const params = new URLSearchParams({
    "filter[code][_eq]": code,
    "filter[app_slug][_eq]": APP_SLUG,
    limit: "1",
  })
  const res = await fetch(`${SHORTCODER_BASE}?${params}`, { headers: authHeaders(token) })
  if (!res.ok) return null
  const json = await res.json()
  const sc = json?.data?.[0] as ShortcodeRecord | undefined
  if (!sc) return null

  // Anonymous payload — inline read.
  if (sc.anonymous_payload) {
    const chart = ChordChartSchema.parse(sc.anonymous_payload)
    fireAndForgetBumpView(sc.id, sc.view_count, token)
    return {
      chart,
      visibility: sc.visibility_at_create,
      ownerId: null,
      isOwner: false,
      canEdit: false, // anon shares are never directly editable
      canFork: !!userId, // logged-in viewers can fork into their account
      source: "anonymous",
      shortcode: code,
    }
  }

  // Owned payload — resolve via app_user_saves.
  if (!sc.chart_external_id) return null
  const saveParams = new URLSearchParams({
    "filter[app_slug][_eq]": APP_SLUG,
    "filter[kind][_eq]": KIND,
    "filter[external_id][_eq]": sc.chart_external_id,
    limit: "1",
    fields: "id,app_user,visibility,payload,external_id",
  })
  const sRes = await fetch(`${SAVES_BASE}?${saveParams}`, { headers: authHeaders(token) })
  if (!sRes.ok) return null
  const sJson = await sRes.json()
  const save = sJson?.data?.[0]
  if (!save) return null
  const visibility = (save.visibility as Visibility) ?? "private"
  const ownerId = (save.app_user as string) ?? null
  const isOwner = !!userId && userId === ownerId

  if (!isOwner && visibility === "private") {
    // The owner has revoked sharing on this chart.
    return null
  }

  const chart = ChordChartSchema.parse(save.payload)
  const canEdit = isOwner || (visibility === "link_edit" && !!userId)
  const canFork = !isOwner && !!userId && (visibility !== "private")

  fireAndForgetBumpView(sc.id, sc.view_count, token)
  return {
    chart,
    visibility,
    ownerId,
    isOwner,
    canEdit,
    canFork,
    source: "owned",
    shortcode: code,
  }
}

function fireAndForgetBumpView(id: string, current: number, token: string | null): void {
  fetch(`${SHORTCODER_BASE}/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ view_count: (current ?? 0) + 1 }),
  }).catch(() => {})
}

/** Build a public share URL for a code. */
export function shareUrl(code: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/c/${code}`
  }
  return `https://chordee.app/c/${code}`
}

/** Clone a chart into a fresh owned save under the current user's account.
 *  The new chart gets a new meta.id (so it's its own share root) and a
 *  forked_from pointer back to the source. */
export async function forkChart(
  source: ChordChart,
  ownerId: string,
  token: string,
): Promise<ChordChart> {
  const fresh: ChordChart = {
    ...source,
    meta: {
      ...source.meta,
      id: crypto.randomUUID(),
      title: source.meta.title ? `${source.meta.title} (copy)` : "Untitled (copy)",
    },
  }
  const body = {
    app_user: ownerId,
    app_slug: APP_SLUG,
    kind: KIND,
    external_id: fresh.meta.id,
    name: fresh.meta.title,
    payload: fresh,
    status: "published",
    visibility: "private",
    forked_from: source.meta.id,
  }
  const res = await fetch(SAVES_BASE, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Fork failed: ${res.status}`)
  return fresh
}

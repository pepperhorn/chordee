// Generalized library schema, adapted from drumlet so plugins across the
// PepperHorn app suite can share the same shape. Plugins contribute typed
// fields; the host renders a normalized card view.

import type { ChordChart } from "../schema"

export const FIELD_TYPES = {
  TEXT: "text",
  NUMBER: "number",
  TAGS: "tags",
  IMAGE: "image",
  URL: "url",
  BADGE_LIST: "badge_list",
  PERSON: "person",
  CHART_REF: "chart_ref",
  CHART_PAYLOAD: "chart_payload",
  LICENSE_GATE: "license_gate",
  CUSTOM_JSON: "custom_json",
} as const

export type FieldType = (typeof FIELD_TYPES)[keyof typeof FIELD_TYPES]

export const ACTION_KINDS = {
  /** Replace the current chart with this item's payload. */
  LOAD_CHART: "load_chart",
  /** Open the source location (e.g. a /c/<code> link in a new tab). */
  OPEN_LINK: "open_link",
  /** Fork into the current user's account. */
  FORK_INTO_LIBRARY: "fork_into_library",
} as const

export type ActionKind = (typeof ACTION_KINDS)[keyof typeof ACTION_KINDS]

export interface LibraryField<T = unknown> {
  id: string
  type: FieldType
  value: T
}

export interface CardView {
  title: string
  subtitle: string
  /** Optional URL or data-uri for a cover image. */
  cover: string
  /** Tiny one-liner facts (e.g. "Gm · 132 BPM · Medium Swing"). */
  meta: string[]
  /** Pill-style annotations (e.g. "Public", "Forked", "Premium"). */
  badges: string[]
}

export interface LibraryAction {
  id: string
  label: string
  kind: ActionKind
}

export interface LibraryItem {
  id: string
  pluginId: string
  collectionId: string
  /** Sub-type within the plugin's namespace (e.g. "chart"). */
  kind: string
  title: string
  fields: LibraryField[]
  card: CardView
  actions: LibraryAction[]
  /** When set, the item carries a chart payload directly (factory presets,
   *  public anon shares). When absent, the plugin's onActivate is responsible
   *  for resolving the payload. */
  payload?: ChordChart
}

export interface LibraryCollection {
  id: string
  pluginId: string
  /** Section heading shown in the Browse area. */
  label: string
  /** Free-text description (rendered under the heading). */
  description?: string
  itemKind: string
  items: LibraryItem[]
}

// ── Helpers ────────────────────────────────────────────────────────────

export function createCardView(opts: Partial<CardView> & Pick<CardView, "title">): CardView {
  return {
    title: opts.title,
    subtitle: opts.subtitle ?? "",
    cover: opts.cover ?? "",
    meta: opts.meta ?? [],
    badges: opts.badges ?? [],
  }
}

export function createField<T>(id: string, type: FieldType, value: T): LibraryField<T> {
  return { id, type, value }
}

export function getFieldValue<T = unknown>(item: LibraryItem, fieldId: string, fallback: T | null = null): T {
  const f = item.fields.find((x) => x.id === fieldId)
  return (f?.value ?? fallback) as T
}

// Cover gradients — deterministic per-title so the same chart always gets
// the same cover regardless of where it's listed.
const COVER_GRADIENTS = [
  "linear-gradient(135deg, #ef4444, #f97316)",
  "linear-gradient(135deg, #f59e0b, #eab308)",
  "linear-gradient(135deg, #84cc16, #22c55e)",
  "linear-gradient(135deg, #14b8a6, #06b6d4)",
  "linear-gradient(135deg, #3b82f6, #6366f1)",
  "linear-gradient(135deg, #8b5cf6, #d946ef)",
  "linear-gradient(135deg, #ec4899, #f43f5e)",
]

export function gradientFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length]!
}

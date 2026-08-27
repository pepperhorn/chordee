/**
 * Named style profiles — local persistence.
 *
 * A profile is a UserStyle with identity (id + required name), so a user can
 * keep several configurations ("Real Book", "Big print", "Nashville") and
 * switch between them. Profiles live in localStorage; when the user is signed
 * in they can additionally be pushed to their ph-apps account via
 * styleProfileCloud.ts, which uses the same shape.
 */
import { nanoid } from "nanoid"
import { StyleProfileSchema, type StyleProfile, type UserStyle } from "./userStyle"

const STORE_KEY = "chordee-style-profiles"
const ACTIVE_KEY = "chordee-active-style-profile"

// ── Local store ────────────────────────────────────────────────────────

/** All locally stored profiles, newest first. Malformed entries are dropped. */
export function listLocalProfiles(): StyleProfile[] {
  let raw: string | null
  try {
    raw = localStorage.getItem(STORE_KEY)
  } catch {
    return []
  }
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.warn("[styleProfiles] stored profiles were not valid JSON; ignoring")
    return []
  }
  if (!Array.isArray(parsed)) return []

  const out: StyleProfile[] = []
  for (const entry of parsed) {
    const result = StyleProfileSchema.safeParse(entry)
    if (result.success) out.push(result.data)
    else console.warn("[styleProfiles] dropping malformed profile:", result.error.issues[0]?.message)
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

function writeLocalProfiles(profiles: StyleProfile[]): boolean {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(profiles))
    return true
  } catch {
    // Quota or a private-mode browser. Callers surface this to the user
    // rather than silently appearing to have saved.
    console.warn("[styleProfiles] could not write to localStorage")
    return false
  }
}

/** Build a profile from the current style, minting an id when new. */
export function makeProfile(
  name: string,
  style: UserStyle,
  id?: string,
): StyleProfile {
  const now = new Date().toISOString()
  return {
    ...style,
    id: id ?? nanoid(10),
    name: name.trim(),
    createdAt: style.createdAt ?? now,
    updatedAt: now,
  }
}

/**
 * Insert or update a profile by id. Returns false when the write failed,
 * so the caller can tell the user rather than reporting a phantom save.
 */
export function saveLocalProfile(profile: StyleProfile): boolean {
  const existing = listLocalProfiles().filter((p) => p.id !== profile.id)
  return writeLocalProfiles([profile, ...existing])
}

export function deleteLocalProfile(id: string): boolean {
  const remaining = listLocalProfiles().filter((p) => p.id !== id)
  const ok = writeLocalProfiles(remaining)
  if (ok && getActiveProfileId() === id) setActiveProfileId(null)
  return ok
}

/** True when a name is already taken by a different profile. */
export function nameIsTaken(name: string, exceptId?: string): boolean {
  const wanted = name.trim().toLowerCase()
  return listLocalProfiles().some(
    (p) => p.id !== exceptId && p.name.trim().toLowerCase() === wanted,
  )
}

// ── Active profile ─────────────────────────────────────────────────────

export function getActiveProfileId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function setActiveProfileId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id)
    else localStorage.removeItem(ACTIVE_KEY)
  } catch {
    /* non-fatal — the profile still applies for this session */
  }
}

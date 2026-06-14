import { CHORD_ALIASES, CHORD_QUALITIES, CHORD_ROOTS, NASHVILLE_NUMBERS } from "./constants"
import type { Chord, NashvilleChord } from "./schema"

/**
 * Outcome of resolving a raw chord-entry string against the slot's current
 * chord. Shared by every chord-entry surface (inline input, toolbar field) so
 * bass-only "/Bb" handling stays consistent across them.
 */
export type ChordEntryResolution =
  | { kind: "invalid"; error: string }
  | { kind: "clear" }
  | { kind: "chord"; chord: Chord }
  | { kind: "nashville"; nashvilleChord: NashvilleChord }

export interface ParseResult {
  valid: boolean
  chord?: Chord
  nashvilleChord?: NashvilleChord
  error?: string
}

// Sort roots longest-first so "C#" matches before "C"
const SORTED_ROOTS = [...CHORD_ROOTS].sort((a, b) => b.length - a.length)

// Sort aliases longest-first for greedy matching
const SORTED_ALIASES = [...CHORD_ALIASES].sort(
  (a, b) => b[0].length - a[0].length
)

// Sorted longest-first for greedy matching
const VALID_EXTENSIONS = [
  "b9#9", "add11", "add13", "add2", "add4",
  "b11", "#11", "b13", "#13", "b5", "#5", "b9", "#9",
  "no3", "no5", "6/9",
]

function parseRootFromStart(input: string): { root: string; rest: string } | null {
  for (const root of SORTED_ROOTS) {
    if (input.startsWith(root)) {
      return { root, rest: input.slice(root.length) }
    }
  }
  return null
}

function parseQualityWithExtensions(
  input: string
): { quality: string; extensions: string[] } | null {
  for (const [alias, canonical] of SORTED_ALIASES) {
    if (input.startsWith(alias)) {
      const rest = input.slice(alias.length)
      const extensions: string[] = []
      let remaining = rest

      // Greedily consume extensions
      while (remaining.length > 0) {
        let matched = false
        for (const ext of VALID_EXTENSIONS) {
          if (remaining.startsWith(ext)) {
            extensions.push(ext)
            remaining = remaining.slice(ext.length)
            matched = true
            break
          }
        }
        if (!matched) {
          // Check for bass note: /Root
          if (remaining.startsWith("/")) {
            break
          }
          return null // invalid characters
        }
      }

      // Validate quality
      if (!(CHORD_QUALITIES as readonly string[]).includes(canonical)) {
        continue
      }

      return { quality: canonical, extensions }
    }
  }
  return null
}

export interface BassOnlyResult {
  valid: boolean
  /** New bass note, when set */
  bass?: string
  /** True when the input was a bare "/" — meaning clear any existing bass */
  clear?: boolean
  error?: string
}

/**
 * Parse a bass-only modifier like "/Bb" or "/F#". A bare "/" clears the bass.
 * Returns valid:false (with no error) when the input is not slash-prefixed,
 * so callers can fall through to normal chord parsing.
 */
export function parseBassOnly(input: string): BassOnlyResult {
  const trimmed = input.trim()
  if (!trimmed.startsWith("/")) return { valid: false }

  const bassCandidate = trimmed.slice(1).trim()
  if (!bassCandidate) {
    // "/" alone removes the existing bass note
    return { valid: true, clear: true }
  }

  const bassRoot = parseRootFromStart(bassCandidate)
  if (bassRoot && bassRoot.rest.length === 0) {
    return { valid: true, bass: bassRoot.root }
  }
  return { valid: false, error: `Invalid bass note: "${bassCandidate}"` }
}

function parseStandardChord(input: string): ParseResult {
  const trimmed = input.trim()
  if (!trimmed) return { valid: false, error: "Empty input" }

  const rootResult = parseRootFromStart(trimmed)
  if (!rootResult) return { valid: false, error: `Invalid root note` }

  let rest = rootResult.rest
  let bass: string | undefined

  // Check for bass note
  const slashIdx = rest.lastIndexOf("/")
  if (slashIdx >= 0) {
    const bassCandidate = rest.slice(slashIdx + 1)
    const bassRoot = parseRootFromStart(bassCandidate)
    if (bassRoot && bassRoot.rest.length === 0) {
      bass = bassRoot.root
      rest = rest.slice(0, slashIdx)
    }
  }

  const qualityResult = parseQualityWithExtensions(rest)
  if (!qualityResult) {
    return { valid: false, error: `Invalid quality: "${rest}"` }
  }

  return {
    valid: true,
    chord: {
      root: rootResult.root,
      quality: qualityResult.quality,
      bass,
      extensions:
        qualityResult.extensions.length > 0
          ? qualityResult.extensions
          : undefined,
    },
  }
}

// Sort Nashville numbers longest-first
const SORTED_NASHVILLE = [...NASHVILLE_NUMBERS].sort(
  (a, b) => b.length - a.length
)

function parseNashvilleChord(input: string): ParseResult {
  const trimmed = input.trim()
  if (!trimmed) return { valid: false, error: "Empty input" }

  let degree: string | null = null
  let rest = trimmed

  for (const num of SORTED_NASHVILLE) {
    if (trimmed.startsWith(num)) {
      degree = num
      rest = trimmed.slice(num.length)
      break
    }
  }

  if (!degree) return { valid: false, error: "Invalid Nashville number" }

  let quality: string | undefined
  let extensions: string[] | undefined
  if (rest.length > 0) {
    const qualityResult = parseQualityWithExtensions(rest)
    if (!qualityResult) {
      return { valid: false, error: `Invalid quality: "${rest}"` }
    }
    quality = qualityResult.quality
    extensions =
      qualityResult.extensions.length > 0
        ? qualityResult.extensions
        : undefined
  }

  return {
    valid: true,
    nashvilleChord: { degree, quality, extensions },
  }
}

export function parseChord(
  input: string,
  isNashville: boolean = false
): ParseResult {
  if (isNashville) {
    return parseNashvilleChord(input)
  }
  return parseStandardChord(input)
}

/**
 * Resolve a raw chord-entry string against the slot's current chord.
 * Centralizes the rules every text-entry surface needs:
 *   - empty            → clear the slot
 *   - "/Bb", "/F#"     → keep the current chord, move only the bass note
 *   - "/" (bare)       → keep the current chord, remove its bass note
 *   - otherwise        → parse as a full chord / Nashville number
 * Bass-only entry applies to standard notation only (Nashville has no bass).
 */
export function resolveChordEntry(
  rawValue: string,
  currentChord: Chord | null | undefined,
  isNashville: boolean
): ChordEntryResolution {
  const trimmed = rawValue.trim()
  if (!trimmed) return { kind: "clear" }

  if (!isNashville && trimmed.startsWith("/")) {
    if (!currentChord) {
      return { kind: "invalid", error: "No chord to add a bass note to" }
    }
    const bassResult = parseBassOnly(trimmed)
    if (!bassResult.valid) {
      return { kind: "invalid", error: bassResult.error || "Invalid bass note" }
    }
    return {
      kind: "chord",
      chord: {
        ...currentChord,
        bass: bassResult.clear ? undefined : bassResult.bass,
        // Bare "/" clears the bass and reverts to the full chord display;
        // "/Bb" renders as just the slash-bass without repeating the chord.
        bassOnly: bassResult.clear ? undefined : true,
      },
    }
  }

  const result = parseChord(trimmed, isNashville)
  if (!result.valid) {
    return { kind: "invalid", error: result.error || "Invalid chord" }
  }
  if (isNashville && result.nashvilleChord) {
    return { kind: "nashville", nashvilleChord: result.nashvilleChord }
  }
  if (result.chord) {
    return { kind: "chord", chord: result.chord }
  }
  return { kind: "invalid", error: "Invalid chord" }
}

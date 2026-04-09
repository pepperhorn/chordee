import type { Beat, BeatSlot, ChordChart, Measure } from "./schema"
import { formatChord, formatTimeSignature } from "./utils"

// ── File Operations ────────────────────────────────────────────────────

export function downloadFile(
  content: string | Uint8Array | Blob,
  filename: string,
  mimeType: string
) {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content as BlobPart], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function uploadFile(accept: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = accept
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return reject(new Error("No file selected"))
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    }
    input.click()
  })
}

// ── JSON Export/Import ─────────────────────────────────────────────────

export function exportToJSON(chart: ChordChart): string {
  return JSON.stringify(chart, null, 2)
}

// ── Markdown Export ────────────────────────────────────────────────────
//
// Layout per measure-group:
//   - Line 1: chord names (only when chord CHANGES), column-aligned with rhythm
//   - Line 2: rhythm glyphs + barlines
//
// Rhythm glyphs:
//   /   quarter
//   v   eighth
//   l   sixteenth
//   i   thirty-second
//   o   half    (collapses 1 follow-on beat)
//   O   whole   (collapses all follow-on beats in the measure)
//   3(vvv) / 6(llllll) / 3(///)   triplet groups (N = note count)
//
// Chord tokens are bracketed `[...]` only when the chord name contains a
// character that would confuse the parser: whitespace, `/`, `|`, `()`, `[]`.
// Standard chord names (Cmaj7, Am7b5, Bbm) stay bare; slash chords (F/E) wrap.
//
// Lyrics are NOT interleaved with the rhythm. They're emitted as a separate
// `### Lyrics` block at the end of each section, one paragraph per
// measure-group that had lyrics.

const GLYPH_FOR_DIVISION: Record<string, string> = {
  quarter: "/",
  eighth: "v",
  sixteenth: "l",
  thirtySecond: "i",
  half: "o",
  whole: "O",
  eighthTriplet: "v",
  sixteenthTriplet: "l",
  quarterTriplet: "/",
}

const TRIPLET_DIVISIONS = new Set([
  "eighthTriplet",
  "sixteenthTriplet",
  "quarterTriplet",
])

function chordNeedsBrackets(text: string): boolean {
  return /[\s/|()[\]]/.test(text)
}

function formatChordToken(text: string): string {
  return chordNeedsBrackets(text) ? `[${text}]` : text
}

function slotChordText(slot: BeatSlot): string | null {
  if (slot.noChord) return "N.C."
  if (slot.chord) return formatChord(slot.chord)
  if (slot.nashvilleChord) {
    return slot.nashvilleChord.degree + (slot.nashvilleChord.quality || "")
  }
  return null
}

/** One column in the two-line chord/rhythm grid. */
interface RhythmCell {
  kind: "cell"
  /** Chord label to show above this glyph, or "" to inherit the label visually from a previous cell. */
  chord: string
  /** Glyph string — single char for normal slots, `N(...)` for triplets, `o`/`O` for holds. */
  glyph: string
}
type RhythmColumn = RhythmCell | { kind: "bar" }

function buildMeasureColumns(
  measure: Measure,
  activeChord: { current: string | null },
): RhythmColumn[] {
  const cols: RhythmColumn[] = []
  const beats = measure.beats
  let skipCount = 0

  const emitCell = (slot: BeatSlot | undefined, glyph: string) => {
    let chordLabel = ""
    if (slot) {
      const text = slotChordText(slot)
      if (text !== null && text !== activeChord.current) {
        chordLabel = formatChordToken(text)
        activeChord.current = text
      }
    }
    cols.push({ kind: "cell", chord: chordLabel, glyph })
  }

  for (let bi = 0; bi < beats.length; bi++) {
    if (skipCount > 0) {
      skipCount--
      continue
    }
    const beat: Beat = beats[bi]!
    const div = beat.division

    // Holds: emit one cell, skip absorbed beats
    if (div === "half" || div === "whole") {
      emitCell(beat.slots[0], div === "whole" ? "O" : "o")
      skipCount = div === "whole" ? beats.length - bi - 1 : 1
      continue
    }

    // Triplets: one cell per beat, glyph = `N(xxx)`. Chord label = first slot's change.
    if (TRIPLET_DIVISIONS.has(div)) {
      const glyphChar = GLYPH_FOR_DIVISION[div] ?? "?"
      // Check each slot for a chord change; the *first* change lands on the
      // cell label. Later changes inside the triplet are absorbed silently.
      let cellChord = ""
      for (const slot of beat.slots) {
        const text = slotChordText(slot)
        if (text !== null && text !== activeChord.current) {
          if (cellChord === "") cellChord = formatChordToken(text)
          activeChord.current = text
        }
      }
      cols.push({
        kind: "cell",
        chord: cellChord,
        glyph: `${beat.slots.length}(${glyphChar.repeat(beat.slots.length)})`,
      })
      continue
    }

    // Regular beat: one cell per slot
    const glyph = GLYPH_FOR_DIVISION[div] ?? "?"
    for (const slot of beat.slots) {
      emitCell(slot, glyph)
    }
  }

  return cols
}

/** Format a series of columns (spanning multiple measures separated by barlines)
 *  into two aligned lines: chords above, rhythm below. */
function formatColumnLines(columns: RhythmColumn[]): {
  chord: string
  rhythm: string
} {
  const chordParts: string[] = []
  const rhythmParts: string[] = []

  for (const col of columns) {
    if (col.kind === "bar") {
      // Barline only on the rhythm line; chord line has matching whitespace
      chordParts.push("   ")
      rhythmParts.push(" | ")
      continue
    }
    const width = Math.max(col.chord.length, col.glyph.length)
    chordParts.push(col.chord.padEnd(width))
    rhythmParts.push(col.glyph.padEnd(width))
    // Single-space column separator
    chordParts.push(" ")
    rhythmParts.push(" ")
  }

  return {
    chord: chordParts.join("").trimEnd(),
    rhythm: rhythmParts.join("").trimEnd(),
  }
}

function collectMeasureGroupLyrics(measures: Measure[]): string | null {
  const words: string[] = []
  for (const m of measures) {
    for (const beat of m.beats) {
      if (beat.lyrics && beat.lyrics.trim()) {
        words.push(beat.lyrics.trim())
      }
    }
  }
  return words.length > 0 ? words.join(" ") : null
}

export function exportToMarkdown(chart: ChordChart): string {
  const lines: string[] = []

  // YAML frontmatter
  lines.push("---")
  lines.push(`title: "${chart.meta.title}"`)
  if (chart.meta.composer) lines.push(`composer: "${chart.meta.composer}"`)
  if (chart.meta.arranger) lines.push(`arranger: "${chart.meta.arranger}"`)
  lines.push(`key: ${chart.meta.key}`)
  lines.push(`tempo: ${chart.meta.tempo}`)
  lines.push(`notationType: ${chart.meta.notationType}`)
  lines.push("---")
  lines.push("")

  // Rhythm legend (HTML comment — invisible in rendered MD)
  lines.push(
    "<!-- rhythm: / quarter · v eighth · l 16th · i 32nd · o half · O whole · 3(vvv) triplet -->",
  )
  lines.push("")

  for (const section of chart.sections) {
    lines.push(`## ${section.name}`)
    lines.push(`Time: ${formatTimeSignature(section.timeSignature)}`)
    if (section.rehearsalMark) {
      lines.push(`Rehearsal: ${section.rehearsalMark}`)
    }
    lines.push("")

    // Rhythm/chord lines need a code fence so MD renderers preserve the
    // column alignment (monospace font, whitespace kept intact).
    lines.push("```")

    const activeChord = { current: null as string | null }
    const lyricParagraphs: string[] = []
    const mpl = chart.meta.measuresPerLine || 4

    for (let i = 0; i < section.measures.length; i += mpl) {
      const group = section.measures.slice(i, i + mpl)

      // Build columns for all measures in the group, with bars between
      const columns: RhythmColumn[] = []
      group.forEach((m, idx) => {
        columns.push(...buildMeasureColumns(m, activeChord))
        if (idx < group.length - 1) columns.push({ kind: "bar" })
      })

      const { chord, rhythm } = formatColumnLines(columns)
      // Skip empty chord line so we don't emit blank lines above the rhythm
      if (chord.trim()) lines.push(chord)
      lines.push(rhythm)
      lines.push("")

      const lyricPara = collectMeasureGroupLyrics(group)
      if (lyricPara) lyricParagraphs.push(lyricPara)
    }

    lines.push("```")
    lines.push("")

    // Lyrics block per section, only if any lyrics present
    if (lyricParagraphs.length > 0) {
      lines.push("### Lyrics")
      lines.push("")
      for (const para of lyricParagraphs) {
        lines.push(para)
        lines.push("")
      }
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n"
}

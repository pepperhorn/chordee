import type { ChordChart, Section, Measure, Beat, BeatSlot } from "../schema"
import { formatChord } from "../utils"
import { chordToNashville, formatNashville } from "../nashville"
import { measurementCache } from "./cache"
import { justifyLine } from "./justify"
import {
  DIVISION_MULTIPLIERS,
  MIN_BEAT_WIDTH,
  getMeasureBarlineWidths,
  DEFAULT_SPACING,
} from "./constants"
import type {
  LayoutConfig,
  LayoutResult,
  LayoutLine,
  LayoutBar,
  LayoutBeat,
  LayoutSlot,
  LayoutSectionHeader,
  PositionMap,
  PositionEntry,
} from "./types"

// ── Step 1: Collect unique strings ─────────────────────────────────────

function collectUniqueStrings(chart: ChordChart, key: string): {
  chords: Set<string>
  lyrics: Set<string>
  nashvilles: Set<string>
} {
  const chords = new Set<string>()
  const lyrics = new Set<string>()
  const nashvilles = new Set<string>()

  for (const section of chart.sections) {
    for (const measure of section.measures) {
      for (const beat of measure.beats) {
        if (beat.lyrics) lyrics.add(beat.lyrics)
        for (const slot of beat.slots) {
          if (slot.chord) {
            chords.add(formatChord(slot.chord))
            // Pre-measure derived Nashville text, in case display switches.
            const derived = chordToNashville(slot.chord, key)
            nashvilles.add(formatNashville(derived))
          }
          if (slot.nashvilleChord) {
            nashvilles.add(formatNashville(slot.nashvilleChord))
          }
        }
      }
    }
  }

  return { chords, lyrics, nashvilles }
}

// ── Step 2: Measure all strings ────────────────────────────────────────

function measureStrings(
  strings: Set<string>,
  font: string
): Map<string, number> {
  const widths = new Map<string, number>()
  for (const text of strings) {
    widths.set(text, measurementCache.measureText(text, font))
  }
  return widths
}

// ── Step 3: Compute beat width ─────────────────────────────────────────

// Tightest a beat can get before its CONTENT (chord text / lyric) would
// collide. Below this, line-breaking must not pack another bar onto the line.
// Empty beats (slash-only) can be far tighter than the comfortable display
// width, which is what lets more bars share a line when the chords are short.
const MIN_CONTENT_BEAT_WIDTH = 16

function computeBeatWidth(
  beat: Beat,
  chordWidths: Map<string, number>,
  lyricWidths: Map<string, number>,
  config: LayoutConfig
): { natural: number; min: number } {
  const { beatPaddingX } = config.spacing
  const multiplier = DIVISION_MULTIPLIERS[beat.division] ?? 1.0
  const comfortable = MIN_BEAT_WIDTH * multiplier

  // Sum the width needed for all slots — each slot needs space for whatever
  // text is rendered in the chord row. In "nashville" mode the chord row is
  // replaced by the Nashville number; in other modes it's the chord symbol.
  let naturalChordWidth = 0
  let minChordWidth = 0
  for (const slot of beat.slots) {
    let text = ""
    if (config.notationDisplay === "nashville") {
      if (slot.nashvilleChord) {
        text = formatNashville(slot.nashvilleChord)
      } else if (slot.chord) {
        text = formatNashville(chordToNashville(slot.chord, config.chartKey))
      }
    } else {
      if (slot.chord) text = formatChord(slot.chord)
      else if (slot.nashvilleChord) text = formatNashville(slot.nashvilleChord)
    }
    const w = chordWidths.get(text) ?? 0
    // Comfortable: at least the slash-friendly minimum. Min: just enough that
    // the chord text doesn't touch (or a tight floor for empty/slash beats).
    naturalChordWidth += Math.max(w + beatPaddingX, comfortable / beat.slots.length)
    minChordWidth += w > 0 ? w + beatPaddingX : MIN_CONTENT_BEAT_WIDTH
  }

  let lyricWidth = 0
  if (beat.lyrics) {
    lyricWidth = lyricWidths.get(beat.lyrics) ?? 0
  }

  return {
    natural: Math.max(
      naturalChordWidth + beatPaddingX,
      lyricWidth + beatPaddingX * 2,
      comfortable
    ),
    min: Math.max(
      minChordWidth,
      lyricWidth + beatPaddingX,
      MIN_CONTENT_BEAT_WIDTH
    ),
  }
}

// ── Step 4: Compute bar width ──────────────────────────────────────────

interface BarInfo {
  sectionId: string
  section: Section
  measureId: string
  measure: Measure
  beatWidths: number[]
  naturalWidth: number
  /** Tightest width before chord text / lyrics collide — used for line breaking. */
  minWidth: number
}

function computeBarWidths(
  chart: ChordChart,
  chordWidths: Map<string, number>,
  lyricWidths: Map<string, number>,
  config: LayoutConfig
): BarInfo[] {
  const bars: BarInfo[] = []
  const { barPaddingX } = config.spacing

  for (const section of chart.sections) {
    for (const measure of section.measures) {
      const beats = measure.beats.map((beat) =>
        computeBeatWidth(beat, chordWidths, lyricWidths, config)
      )
      const beatWidths = beats.map((b) => b.natural)
      const totalBeatWidth = beatWidths.reduce((sum, w) => sum + w, 0)
      const totalMinBeat = beats.reduce((sum, b) => sum + b.min, 0)
      const { start: startBarlineW, end: endBarlineW } = getMeasureBarlineWidths(measure)
      const naturalWidth = totalBeatWidth + startBarlineW + endBarlineW + barPaddingX * 2
      const minWidth = totalMinBeat + startBarlineW + endBarlineW + barPaddingX

      bars.push({
        sectionId: section.id,
        section,
        measureId: measure.id,
        measure,
        beatWidths,
        naturalWidth,
        minWidth,
      })
    }
  }

  return bars
}

// ── Step 5: Line breaking ──────────────────────────────────────────────

function lineShowsClef(
  lineIndex: number,
  isNewSection: boolean,
  clefDisplay: LayoutConfig["clefDisplay"]
): boolean {
  if (clefDisplay === "eachLine") return true
  if (clefDisplay === "section") return isNewSection
  /* "start" */ return lineIndex === 0
}

function breakIntoLines(
  bars: BarInfo[],
  config: LayoutConfig
): BarInfo[][] {
  const { chartPaddingX, barGap, clefKeySigWidth } = config.spacing
  // Clef-narrow available width: the conservative ceiling so every line in a
  // section is uniform regardless of which one shows the clef/key signature.
  const available = config.containerWidth - chartPaddingX * 2 - clefKeySigWidth

  // The requested bars/line acts as a CEILING, not an absolute. "auto" aims
  // for 4; an explicit choice is honored up to MAX_BPL. We only pack as many
  // bars as fit at their *minimum* (chord-text-tight) widths — so as long as
  // the chord labels themselves don't collide, more bars share a line, and
  // justification then stretches them out to fill the row. We only drop the
  // count when the text would actually overlap.
  const TARGET_BPL = 4
  const MAX_BPL = 6
  const ceiling =
    config.measuresPerLine === "auto"
      ? TARGET_BPL
      : Math.min(config.measuresPerLine, MAX_BPL)

  const groupWidth = (
    sectionBars: BarInfo[],
    start: number,
    count: number,
  ): number => {
    let w = 0
    for (let i = 0; i < count; i++) {
      w += sectionBars[start + i]!.minWidth
    }
    return w + Math.max(0, count - 1) * barGap
  }

  const lines: BarInfo[][] = []
  let sectionStart = 0
  while (sectionStart < bars.length) {
    const sid = bars[sectionStart]!.sectionId
    let sectionEnd = sectionStart
    while (sectionEnd < bars.length && bars[sectionEnd]!.sectionId === sid) {
      sectionEnd++
    }
    const sectionBars = bars.slice(sectionStart, sectionEnd)
    const n = sectionBars.length

    // Pick the largest bpl <= ceiling where every k-window fits at natural
    // width. (Trailing partial group is <= chosen, so it always fits.)
    let chosen = Math.max(1, Math.min(ceiling, n))
    while (chosen > 1) {
      let allFit = true
      for (let i = 0; i + chosen <= n; i++) {
        if (groupWidth(sectionBars, i, chosen) > available) {
          allFit = false
          break
        }
      }
      if (allFit) break
      chosen--
    }

    // Split section into uniform lines of `chosen` bars each
    for (let i = 0; i < n; i += chosen) {
      lines.push(sectionBars.slice(i, i + chosen))
    }

    sectionStart = sectionEnd
  }

  return lines
}

// ── Step 6-7: Generate positioned layout ───────────────────────────────

function getSlotChordText(slot: BeatSlot): string {
  if (slot.noChord) return "N.C."
  if (slot.chord) return formatChord(slot.chord)
  if (slot.nashvilleChord) return formatNashville(slot.nashvilleChord)
  return ""
}

function getSlotNashvilleText(slot: BeatSlot, key: string): string {
  if (slot.noChord) return ""
  if (slot.nashvilleChord) return formatNashville(slot.nashvilleChord)
  if (slot.chord) return formatNashville(chordToNashville(slot.chord, key))
  return ""
}

function buildLayoutResult(
  barLines: BarInfo[][],
  config: LayoutConfig
): LayoutResult {
  const { chartPaddingX, chartPaddingY, barGap, barPaddingX, headerHeight, staveHeight, lineHeight, lyricLineHeight, clefKeySigWidth } = config.spacing

  const lines: LayoutLine[] = []
  const positionEntries: PositionEntry[] = []
  let y = chartPaddingY

  let lastSectionId = ""
  let lastTimeSig = "" // track "beats/beatUnit" to detect changes
  let lastSectionIdForTs = "" // tracks section across bars to detect a section's first bar
  let currentSectionMeter: { beats: number; beatUnit: number } | null = null // effective meter inside current section, carried forward across bars
  let isFirstLine = true

  for (const barLine of barLines) {
    if (barLine.length === 0) continue

    const sectionId = barLine[0].sectionId
    const isNewSection = sectionId !== lastSectionId

    // Determine if clef should show on this line based on clefDisplay setting
    const shouldShowClef =
      config.clefDisplay === "eachLine" ? true :
      config.clefDisplay === "section" ? isNewSection :
      /* "start" */ isFirstLine

    // Per-line margin: only reserve clef space when clef is shown
    const leftMargin = chartPaddingX + (shouldShowClef ? clefKeySigWidth : 0)
    const availableWidth = config.containerWidth - leftMargin - chartPaddingX

    // Section header when section changes
    if (sectionId !== lastSectionId) {
      const section = barLine[0].section
      const headerLine: LayoutLine = {
        y,
        height: headerHeight + Math.round(lineHeight / 2) + 4,
        sectionId,
        elements: [
          {
            type: "section-header" as const,
            x: leftMargin,
            width: availableWidth,
            text: section.name,
            rehearsalMark: section.rehearsalMark,
            sectionId,
            timeSignature: `${section.timeSignature.beats}/${section.timeSignature.beatUnit}`,
            navigation: section.navigation?.type,
          } satisfies LayoutSectionHeader,
        ],
      }
      lines.push(headerLine)
      y += headerLine.height
      lastSectionId = sectionId
    }

    // Justify bars in this line
    const justified = justifyLine(
      barLine.map((bar, i) => ({ index: i, naturalWidth: bar.naturalWidth })),
      availableWidth,
      config.justification
    )

    // Determine whether this line has any chord-bearing slot (for Nashville above row)
    let lineHasChords = false
    for (const bar of barLine) {
      for (const beat of bar.measure.beats) {
        for (const slot of beat.slots) {
          if (slot.chord || slot.nashvilleChord || slot.noChord) {
            lineHasChords = true
            break
          }
        }
        if (lineHasChords) break
      }
      if (lineHasChords) break
    }

    const display = config.notationDisplay
    const nashvilleRowHeight = 14
    const nashvilleAbove = display === "both" && lineHasChords
    if (nashvilleAbove) {
      // Push the line down to leave room for a Nashville row above the chord
      y += nashvilleRowHeight
    }

    const lineHeight_ = staveHeight + lineHeight + lyricLineHeight + 8 +
      (nashvilleAbove ? nashvilleRowHeight : 0)
    const elements: LayoutBar[] = []

    let isFirstBarInLine = true
    for (const jBar of justified) {
      const bar = barLine[jBar.index]
      const barX = leftMargin + jBar.x

      // Distribute beat widths proportionally within justified bar width
      const totalNaturalBeat = bar.beatWidths.reduce((s, w) => s + w, 0)
      const innerWidth = jBar.width - barPaddingX * 2
      const { start: startBarlineW, end: endBarlineW } = getMeasureBarlineWidths(bar.measure)
      const beatAreaWidth = innerWidth - startBarlineW - endBarlineW

      let beatX = barPaddingX + startBarlineW
      const layoutBeats: LayoutBeat[] = []

      for (let bi = 0; bi < bar.measure.beats.length; bi++) {
        const beat = bar.measure.beats[bi]
        const naturalBeatW = bar.beatWidths[bi]
        const beatWidth = totalNaturalBeat > 0
          ? (naturalBeatW / totalNaturalBeat) * beatAreaWidth
          : beatAreaWidth / bar.measure.beats.length

        // Distribute slot widths evenly within beat
        const slotWidth = beatWidth / beat.slots.length
        const layoutSlots: LayoutSlot[] = beat.slots.map((slot, si) => {
          const slotX = si * slotWidth
          const chordText = getSlotChordText(slot)
          const nashvilleText = display !== "chords"
            ? getSlotNashvilleText(slot, config.chartKey)
            : ""

          const entry: PositionEntry = {
            rect: {
              x: barX + beatX + slotX,
              y,
              width: slotWidth,
              height: lineHeight_,
            },
            target: {
              sectionId: bar.sectionId,
              measureId: bar.measureId,
              beatId: beat.id,
              slotId: slot.id,
            },
          }
          positionEntries.push(entry)

          let chordOut: LayoutSlot["chord"]
          let nashvilleOut: LayoutSlot["nashville"]

          if (display === "nashville") {
            // Nashville replaces the chord row
            if (nashvilleText || slot.noChord) {
              nashvilleOut = {
                text: nashvilleText || (slot.noChord ? "N.C." : ""),
                x: slotX + 4,
                y: 0,
                primary: true,
              }
            }
          } else {
            if (chordText) {
              chordOut = {
                text: chordText,
                displayText: chordText,
                x: slotX + 4,
                y: 0,
              }
            }
            if (display === "both" && nashvilleText) {
              nashvilleOut = {
                text: nashvilleText,
                x: slotX + 4,
                y: -nashvilleRowHeight,
                primary: false,
              }
            }
          }

          return {
            x: slotX,
            width: slotWidth,
            slotId: slot.id,
            chord: chordOut,
            nashville: nashvilleOut,
            slash: {
              x: slotX + slotWidth / 2 - 4,
              y: lineHeight + 4,
              articulation: slot.slash.articulation,
              tied: slot.slash.tied,
              rest: slot.slash.rest,
              stem: slot.slash.stem,
              stemDirection: slot.slash.stemDirection,
            },
          }
        })

        layoutBeats.push({
          x: beatX,
          width: beatWidth,
          beatId: beat.id,
          slots: layoutSlots,
          division: beat.division,
          dynamic: beat.dynamics,
          lyric: beat.lyrics
            ? {
                text: beat.lyrics,
                x: beatX + 4,
                width: beatWidth - 8,
                y: lineHeight + staveHeight + 4,
              }
            : undefined,
        })

        beatX += beatWidth
      }

      elements.push({
        type: "bar",
        x: barX,
        width: jBar.width,
        measureId: bar.measureId,
        sectionId: bar.sectionId,
        beats: layoutBeats,
        startBarline: bar.measure.barlineStart,
        endBarline: bar.measure.barlineEnd,
        wholeRest: bar.measure.wholeRest,
        timeSignature: (() => {
          // Effective meter at this bar = section's starting meter unless
          // this bar (or a prior bar in the section) carries a measure-
          // level override. The override propagates forward inside the
          // section; new sections reset to their own section.timeSignature.
          const isSectionFirstBar = bar.sectionId !== lastSectionIdForTs
          lastSectionIdForTs = bar.sectionId
          if (isSectionFirstBar) {
            currentSectionMeter = bar.section.timeSignature
          }
          if (bar.measure.timeSignature) {
            currentSectionMeter = bar.measure.timeSignature
          }
          const effective = currentSectionMeter ?? bar.section.timeSignature
          const ts = `${effective.beats}/${effective.beatUnit}`
          const show = bar.section.showTimeSignature ?? "auto"
          // Display override applies only at a section's first bar.
          if (isSectionFirstBar && show === "always") {
            lastTimeSig = ts
            return effective
          }
          if (isSectionFirstBar && show === "never") {
            lastTimeSig = ts
            return undefined
          }
          if (lastTimeSig === "" || ts !== lastTimeSig) {
            lastTimeSig = ts
            return effective
          }
          return undefined
        })(),
        showClef: isFirstBarInLine && shouldShowClef,
      })
      isFirstBarInLine = false
    }

    lines.push({
      y,
      height: lineHeight_,
      sectionId,
      elements,
    })

    y += lineHeight_ + barGap * 2
    isFirstLine = false
  }

  return {
    lines,
    totalHeight: y + chartPaddingY,
    positionMap: { entries: positionEntries },
  }
}

// ── Public API ─────────────────────────────────────────────────────────

export function computeLayout(
  chart: ChordChart,
  config: LayoutConfig
): LayoutResult {
  // Step 1: Collect unique strings
  const { chords, lyrics, nashvilles } = collectUniqueStrings(chart, config.chartKey)

  // Step 2: Measure all strings (Nashville sits in the chord row when display is
  // "nashville"; in "both" it sits above at smaller size — we still pre-measure
  // so width budgeting accounts for it.)
  const chordWidths = measureStrings(chords, config.fonts.chord)
  const lyricWidths = measureStrings(lyrics, config.fonts.lyric)
  if (config.notationDisplay === "nashville") {
    // When Nashville replaces the chord row, treat Nashville texts as the
    // chords for width budgeting.
    for (const n of nashvilles) {
      if (!chordWidths.has(n)) {
        chordWidths.set(n, measurementCache.measureText(n, config.fonts.chord))
      }
    }
  }

  // Step 3-4: Compute bar widths
  const bars = computeBarWidths(chart, chordWidths, lyricWidths, config)

  // Step 5: Line breaking
  const barLines = breakIntoLines(bars, config)

  // Step 6-7: Generate positioned layout + position map
  return buildLayoutResult(barLines, config)
}

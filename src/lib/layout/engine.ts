import type { ChordChart, Section, Measure, Beat, BeatSlot } from "../schema"
import { formatChord } from "../utils"
import { measurementCache } from "./cache"
import { justifyLine } from "./justify"
import {
  DIVISION_MULTIPLIERS,
  MIN_BEAT_WIDTH,
  BARLINE_WIDTHS,
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

function collectUniqueStrings(chart: ChordChart): {
  chords: Set<string>
  lyrics: Set<string>
} {
  const chords = new Set<string>()
  const lyrics = new Set<string>()

  for (const section of chart.sections) {
    for (const measure of section.measures) {
      for (const beat of measure.beats) {
        if (beat.lyrics) lyrics.add(beat.lyrics)
        for (const slot of beat.slots) {
          if (slot.chord) chords.add(formatChord(slot.chord))
          if (slot.nashvilleChord) {
            const text = slot.nashvilleChord.degree + (slot.nashvilleChord.quality || "")
            chords.add(text)
          }
        }
      }
    }
  }

  return { chords, lyrics }
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

function computeBeatWidth(
  beat: Beat,
  chordWidths: Map<string, number>,
  lyricWidths: Map<string, number>,
  config: LayoutConfig
): number {
  const { beatPaddingX } = config.spacing
  const multiplier = DIVISION_MULTIPLIERS[beat.division] ?? 1.0
  const minWidth = MIN_BEAT_WIDTH * multiplier

  // Sum the width needed for all slots — each slot needs space for its chord
  // When multiple slots have chords, they sit side by side
  let totalChordWidth = 0
  for (const slot of beat.slots) {
    let text = ""
    if (slot.chord) text = formatChord(slot.chord)
    else if (slot.nashvilleChord) text = slot.nashvilleChord.degree + (slot.nashvilleChord.quality || "")
    const w = chordWidths.get(text) ?? 0
    // Each slot needs at least its chord width + padding between slots
    totalChordWidth += Math.max(w + beatPaddingX, minWidth / beat.slots.length)
  }

  let lyricWidth = 0
  if (beat.lyrics) {
    lyricWidth = lyricWidths.get(beat.lyrics) ?? 0
  }

  return Math.max(
    totalChordWidth + beatPaddingX,
    lyricWidth + beatPaddingX * 2,
    minWidth
  )
}

// ── Step 4: Compute bar width ──────────────────────────────────────────

interface BarInfo {
  sectionId: string
  section: Section
  measureId: string
  measure: Measure
  beatWidths: number[]
  naturalWidth: number
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
      const beatWidths = measure.beats.map((beat) =>
        computeBeatWidth(beat, chordWidths, lyricWidths, config)
      )
      const totalBeatWidth = beatWidths.reduce((sum, w) => sum + w, 0)
      const startBarlineW = BARLINE_WIDTHS[measure.barlineStart] ?? 1
      const endBarlineW = BARLINE_WIDTHS[measure.barlineEnd] ?? 1
      const naturalWidth = totalBeatWidth + startBarlineW + endBarlineW + barPaddingX * 2

      bars.push({
        sectionId: section.id,
        section,
        measureId: measure.id,
        measure,
        beatWidths,
        naturalWidth,
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
  const wideAvailable = config.containerWidth - chartPaddingX * 2
  const narrowAvailable = config.containerWidth - chartPaddingX * 2 - clefKeySigWidth

  if (config.measuresPerLine !== "auto") {
    const mpl = config.measuresPerLine
    const lines: BarInfo[][] = []
    for (let i = 0; i < bars.length; i += mpl) {
      lines.push(bars.slice(i, i + mpl))
    }
    return lines
  }

  // Auto: greedy line-breaking
  const lines: BarInfo[][] = []
  let currentLine: BarInfo[] = []
  let currentWidth = 0
  let lastSectionId = ""

  for (const bar of bars) {
    const barWidth = bar.naturalWidth + (currentLine.length > 0 ? barGap : 0)

    // Start new line if section changes
    if (currentLine.length > 0 && bar.sectionId !== currentLine[0].sectionId) {
      lines.push(currentLine)
      lastSectionId = currentLine[0].sectionId
      currentLine = [bar]
      // Determine available width for the new line
      const isNewSection = bar.sectionId !== lastSectionId
      const showClef = lineShowsClef(lines.length, isNewSection, config.clefDisplay)
      currentWidth = bar.naturalWidth
      const available = showClef ? narrowAvailable : wideAvailable
      // If this single bar already exceeds, it'll still be placed
      if (currentWidth > available) {
        // still push it as its own line below
      }
      continue
    }

    // Determine available width for current line
    const isNewSection = currentLine.length === 0
      ? bar.sectionId !== lastSectionId
      : currentLine[0].sectionId !== lastSectionId
    const showClef = lineShowsClef(lines.length, isNewSection, config.clefDisplay)
    const available = showClef ? narrowAvailable : wideAvailable

    if (currentWidth + barWidth > available && currentLine.length > 0) {
      lines.push(currentLine)
      lastSectionId = currentLine[0].sectionId
      currentLine = [bar]
      currentWidth = bar.naturalWidth
    } else {
      currentLine.push(bar)
      currentWidth += barWidth
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine)
  }

  return lines
}

// ── Step 6-7: Generate positioned layout ───────────────────────────────

function getSlotChordText(slot: BeatSlot): string {
  if (slot.noChord) return "N.C."
  if (slot.chord) return formatChord(slot.chord)
  if (slot.nashvilleChord) return slot.nashvilleChord.degree + (slot.nashvilleChord.quality || "")
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

    const lineHeight_ = staveHeight + lineHeight + lyricLineHeight + 8
    const elements: LayoutBar[] = []

    let isFirstBarInLine = true
    for (const jBar of justified) {
      const bar = barLine[jBar.index]
      const barX = leftMargin + jBar.x

      // Distribute beat widths proportionally within justified bar width
      const totalNaturalBeat = bar.beatWidths.reduce((s, w) => s + w, 0)
      const innerWidth = jBar.width - barPaddingX * 2
      const startBarlineW = BARLINE_WIDTHS[bar.measure.barlineStart] ?? 1
      const beatAreaWidth = innerWidth - startBarlineW - (BARLINE_WIDTHS[bar.measure.barlineEnd] ?? 1)

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

          return {
            x: slotX,
            width: slotWidth,
            slotId: slot.id,
            chord: chordText
              ? {
                  text: chordText,
                  displayText: chordText,
                  x: slotX + 4,
                  y: 0,
                }
              : undefined,
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
          const ts = `${bar.section.timeSignature.beats}/${bar.section.timeSignature.beatUnit}`
          if (lastTimeSig === "" || ts !== lastTimeSig) {
            lastTimeSig = ts
            return bar.section.timeSignature
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
  const { chords, lyrics } = collectUniqueStrings(chart)

  // Step 2: Measure all strings
  const chordWidths = measureStrings(chords, config.fonts.chord)
  const lyricWidths = measureStrings(lyrics, config.fonts.lyric)

  // Step 3-4: Compute bar widths
  const bars = computeBarWidths(chart, chordWidths, lyricWidths, config)

  // Step 5: Line breaking
  const barLines = breakIntoLines(bars, config)

  // Step 6-7: Generate positioned layout + position map
  return buildLayoutResult(barLines, config)
}

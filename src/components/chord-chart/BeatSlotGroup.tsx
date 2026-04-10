import type { LayoutBeat } from "@/lib/layout/types"
import { Slash } from "./Slash"
import { BeamedSlashGroup } from "./BeamedSlashGroup"
import { ChordSymbol } from "./ChordSymbol"
import { useChartStore } from "@/lib/store"
import { useFontConfigField, useEffectiveScale } from "@/lib/fontConfigContext"

const BEAMED_DIVISIONS = new Set([
  "eighth",
  "eighthTriplet",
  "sixteenth",
  "sixteenthTriplet",
  "thirtySecond",
])

interface BeatSlotGroupProps {
  beat: LayoutBeat
  barX: number
  lineY: number
  sectionId: string
  measureId: string
  showSlashes: boolean
  showDynamics: boolean
  showLyrics: boolean
}

export function BeatSlotGroup({
  beat,
  barX,
  lineY,
  sectionId,
  measureId,
  showSlashes,
  showDynamics,
  showLyrics,
}: BeatSlotGroupProps) {
  const selection = useChartStore((s) => s.ui.selection)
  const editMode = useChartStore((s) => s.ui.editMode)
  const setSelection = useChartStore((s) => s.setSelection)
  const lyricFont = useFontConfigField("lyric")
  const lyricColor = useFontConfigField("lyricColor")
  const dynamicFont = useFontConfigField("dynamic")
  const dynamicColor = useFontConfigField("dynamicColor")
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768
  const isBeatSelected = selection?.beatId === beat.beatId
  const isBeamed = BEAMED_DIVISIONS.has(beat.division)
  const chordScale = useEffectiveScale("chordSize")
  const lyricScale = useEffectiveScale("lyricSize")
  const dynamicScale = useEffectiveScale("dynamicSize")

  // Derive vertical positions from chord scale.
  // Chord baseline sits above the stave; stave starts after chord area.
  const chordBaseline = Math.round(-2 * chordScale)
  const staveTop = Math.round(14 * chordScale)
  // Vertically center slash noteheads on the barline midline.
  // Barline geometry: y = staveTop + 6, height = 32 (see BarGroup).
  // Barline center = staveTop + 6 + 16 = staveTop + 22.
  // Non-beamed slash notehead has height 12, so its top must be barline_center - 6
  //   = staveTop + 16.
  // Beamed slashes are translated by their CENTER (nhY = -NH_HEIGHT/2 inside),
  //   so their y is the barline center directly.
  const slashY = staveTop + 16
  const beamedY = staveTop + 22

  return (
    <g
      className={`beat-group beat-group--${beat.division} beat-group--${editMode} ${isBeatSelected ? "beat-group--selected" : ""}`}
      data-beat-id={beat.beatId}
      data-division={beat.division}
      data-edit-mode={editMode}
      transform={`translate(${beat.x}, 0)`}
    >
      {/* Rhythm mode: full-beat click target + selection highlight */}
      {editMode === "rhythm" && (
        <rect
          className="beat-click-target"
          x={0}
          y={-14}
          width={beat.width}
          height={72}
          fill={isBeatSelected ? "hsl(var(--chart-primary))" : "transparent"}
          opacity={isBeatSelected ? 0.08 : 0}
          rx={2}
          style={{ cursor: "pointer" }}
          onClick={() =>
            setSelection({
              type: "slot",
              sectionId,
              measureId,
              beatId: beat.beatId,
              slotId: beat.slots[0]?.slotId ?? "",
            })
          }
        />
      )}

      {/* Chord symbols (always rendered per slot) */}
      {beat.slots.map((slot) => {
        const isSlotSelected = selection?.slotId === slot.slotId
        const hasChord = !!slot.chord

        return (
          <g
            key={slot.slotId}
            className={`slot-group ${isSlotSelected ? "slot-group--selected" : ""} ${hasChord ? "slot-group--has-chord" : ""}`}
            data-slot-id={slot.slotId}
            transform={`translate(${slot.x}, 0)`}
            onClick={() =>
              setSelection({
                type: "slot",
                sectionId,
                measureId,
                beatId: beat.beatId,
                slotId: slot.slotId,
              })
            }
            style={{ cursor: "pointer" }}
          >
            {/* Invisible hit-area covering the full slot column so the user
                can click anywhere in the chord/slash region rather than
                hitting the slash glyph exactly. */}
            <rect
              className="slot-hit-area"
              x={-2}
              y={-12}
              width={slot.width + 4}
              height={70}
              fill="transparent"
              pointerEvents="all"
            />

            {/* Slot selection highlight (chord mode = slot, rhythm mode = beat-level above) */}
            {isSlotSelected && editMode === "chord" && (
              <rect
                className="slot-selection-highlight"
                x={0}
                y={-2}
                width={slot.width}
                height={58}
                fill="hsl(var(--chart-primary))"
                opacity={0.1}
                rx={2}
              />
            )}
            {isSlotSelected && editMode === "rhythm" && (
              <rect
                className="slot-selection-highlight slot-selection-highlight--rhythm"
                x={0}
                y={20}
                width={slot.width}
                height={36}
                fill="hsl(var(--chart-primary))"
                opacity={0.06}
                rx={2}
              />
            )}

            {/* Chord symbol — hidden when inline input is active on this slot (desktop only) */}
            {slot.chord && !(isSlotSelected && editMode === "chord" && !isMobile) && (
              <ChordSymbol
                text={slot.chord.displayText}
                x={slot.width / 2}
                y={chordBaseline}
                centered
              />
            )}

            {/* Individual slash for quarter/half/whole (non-beamed) */}
            {showSlashes && !isBeamed && slot.slash && !slot.slash.rest && (
              <Slash
                x={slot.width / 2 - 4}
                y={slashY}
                width={8}
                height={12}
                articulation={slot.slash.articulation}
                stem={slot.slash.stem}
                stemDirection={slot.slash.stemDirection}
                tied={slot.slash.tied}
              />
            )}

            {/* Rest symbol (for non-beamed or if individually rested) */}
            {!isBeamed && slot.slash?.rest && (
              <text
                className="slot-rest-symbol"
                x={slot.width / 2}
                y={slashY + 10}
                textAnchor="middle"
                fontSize={16}
                fill="currentColor"
                opacity={0.6}
              >
                𝄾
              </text>
            )}
          </g>
        )
      })}

      {/* Beamed slash group for eighth/sixteenth/triplet divisions */}
      {showSlashes && isBeamed && (
        <BeamedSlashGroup
          slotCount={beat.slots.length}
          division={beat.division}
          width={beat.width}
          x={0}
          y={beamedY}
          articulations={beat.slots.map((s) => s.slash?.articulation ?? "none")}
          rests={beat.slots.map((s) => s.slash?.rest ?? false)}
          stemDirection={beat.slots[0]?.slash?.stemDirection ?? "up"}
        />
      )}

      {/* Lyric — rendered first (above dynamics) */}
      {showLyrics && beat.lyric && (
        <text
          className="beat-lyric-text"
          x={4}
          y={beat.lyric.y}
          fontSize={Math.round(13 * lyricScale)}
          fontFamily={`${lyricFont}, sans-serif`}
          fill={lyricColor ?? "currentColor"}
          opacity={0.8}
        >
          {beat.lyric.text}
        </text>
      )}

      {/* Dynamic marking — below lyrics, left-aligned at -5px */}
      {showDynamics && beat.dynamic && (
        <text
          className="beat-dynamic-mark"
          data-dynamic={beat.dynamic}
          x={-5}
          y={beat.lyric && showLyrics ? beat.lyric.y + Math.round(16 * lyricScale) : slashY + 28}
          fontSize={Math.round(12 * dynamicScale)}
          fontStyle="italic"
          fontFamily={`${dynamicFont}, serif`}
          fill={dynamicColor ?? "currentColor"}
          opacity={0.7}
        >
          {beat.dynamic}
        </text>
      )}
    </g>
  )
}

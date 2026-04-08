/**
 * BeamedSlashGroup renders a group of slashes with proper beaming.
 * Noteheads are diagonal slash lines matching the individual Slash component.
 * Beams are SVG polygons. Supports stem-up and stem-down.
 */

interface BeamedSlashGroupProps {
  slotCount: number
  division: string
  width: number
  x: number
  y: number
  articulations?: string[]
  rests?: boolean[]
  stemDirection?: "up" | "down"
}

const NH_WIDTH = 8
const NH_HEIGHT = 12
const NH_STROKE = 2
const STEM_LENGTH = 20
const BEAM_THICKNESS = 3
const BEAM_SPACING = 5

function beamLevels(division: string): number {
  switch (division) {
    case "eighth":
    case "eighthTriplet":
      return 1
    case "sixteenth":
    case "sixteenthTriplet":
      return 2
    case "thirtySecond":
      return 3
    default:
      return 0
  }
}

export function BeamedSlashGroup({
  slotCount,
  division,
  width,
  x,
  y,
  articulations = [],
  rests = [],
  stemDirection = "up",
}: BeamedSlashGroupProps) {
  const levels = beamLevels(division)
  if (levels === 0 || slotCount <= 1) return null

  const isUp = stemDirection === "up"
  const slotWidth = width / slotCount

  const notes = Array.from({ length: slotCount }, (_, i) => ({
    index: i,
    cx: i * slotWidth + slotWidth / 2,
    isRest: rests[i] ?? false,
    articulation: articulations[i] ?? "none",
  }))

  const nhY = -NH_HEIGHT / 2

  // Stem and beam positions depend on direction
  const stemStartY = isUp ? nhY : nhY + NH_HEIGHT
  const beamY = isUp
    ? nhY - STEM_LENGTH
    : nhY + NH_HEIGHT + STEM_LENGTH

  // Stem attaches at right edge (up) or left edge (down) of notehead
  const stemAttachX = (nhX: number) => isUp ? nhX + NH_WIDTH : nhX

  return (
    <g
      className={`beamed-slash-group beamed-slash-group--${division} beamed-slash-group--stem-${stemDirection}`}
      data-division={division}
      data-slot-count={slotCount}
      data-stem-direction={stemDirection}
      transform={`translate(${x}, ${y})`}
    >
      {notes.map((note) => {
        if (note.isRest) {
          return (
            <text
              key={note.index}
              className="beamed-slash-rest"
              x={note.cx}
              y={4}
              textAnchor="middle"
              fontSize={14}
              fill="currentColor"
              opacity={0.6}
            >
              𝄾
            </text>
          )
        }

        const nhX = note.cx - NH_WIDTH / 2
        const sx = stemAttachX(nhX)

        return (
          <g key={note.index} className="beamed-slash-note" data-slot-index={note.index}>
            {/* Slash notehead */}
            <line
              className="beamed-slash-notehead"
              x1={nhX}
              y1={nhY + NH_HEIGHT}
              x2={nhX + NH_WIDTH}
              y2={nhY}
              stroke="currentColor"
              strokeWidth={NH_STROKE}
              strokeLinecap="round"
            />

            {/* Stem */}
            <line
              className="beamed-slash-stem"
              x1={sx}
              y1={stemStartY}
              x2={sx}
              y2={beamY}
              stroke="currentColor"
              strokeWidth={1.2}
            />

            {/* Articulations — placed opposite to stems */}
            {note.articulation === "accent" && (
              <path
                className="beamed-slash-articulation beamed-slash-articulation--accent"
                d={`M${note.cx - 3},${isUp ? NH_HEIGHT / 2 + 5 : nhY - 5} L${note.cx},${isUp ? NH_HEIGHT / 2 + 2 : nhY - 2} L${note.cx + 3},${isUp ? NH_HEIGHT / 2 + 5 : nhY - 5}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
              />
            )}
            {note.articulation === "staccato" && (
              <circle
                className="beamed-slash-articulation beamed-slash-articulation--staccato"
                cx={note.cx}
                cy={isUp ? NH_HEIGHT / 2 + 5 : nhY - 5}
                r={1.3}
                fill="currentColor"
              />
            )}
            {note.articulation === "marcato" && (
              <path
                className="beamed-slash-articulation beamed-slash-articulation--marcato"
                d={`M${note.cx - 2.5},${isUp ? beamY - 3 : beamY + 3} L${note.cx},${isUp ? beamY - 7 : beamY + 7} L${note.cx + 2.5},${isUp ? beamY - 3 : beamY + 3}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
              />
            )}
            {note.articulation === "legato" && (
              <line
                className="beamed-slash-articulation beamed-slash-articulation--legato"
                x1={note.cx - 3}
                y1={isUp ? NH_HEIGHT / 2 + 5 : nhY - 5}
                x2={note.cx + 3}
                y2={isUp ? NH_HEIGHT / 2 + 5 : nhY - 5}
                stroke="currentColor"
                strokeWidth={1.2}
              />
            )}
          </g>
        )
      })}

      {/* Beam polygons */}
      {Array.from({ length: levels }, (_, level) => {
        const activeNotes = notes.filter((n) => !n.isRest)
        if (activeNotes.length < 2) return null

        const first = activeNotes[0]
        const last = activeNotes[activeNotes.length - 1]

        const x1 = stemAttachX(first.cx - NH_WIDTH / 2)
        const x2 = stemAttachX(last.cx - NH_WIDTH / 2)

        // Stack beams away from noteheads
        const levelY = isUp
          ? beamY - level * BEAM_SPACING
          : beamY + level * BEAM_SPACING

        const thickness = isUp ? BEAM_THICKNESS : -BEAM_THICKNESS

        return (
          <polygon
            key={level}
            className={`beamed-slash-beam beamed-slash-beam--level-${level + 1}`}
            points={`${x1},${levelY} ${x2},${levelY} ${x2},${levelY - thickness} ${x1},${levelY - thickness}`}
            fill="currentColor"
          />
        )
      })}

      {/* Triplet number */}
      {(division === "eighthTriplet" || division === "sixteenthTriplet" || division === "quarterTriplet") && (
        <text
          className="beamed-slash-triplet-number"
          x={width / 2}
          y={isUp ? beamY - (levels * BEAM_SPACING) - 4 : beamY + (levels * BEAM_SPACING) + 12}
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          fill="currentColor"
        >
          {division === "sixteenthTriplet" ? "6" : "3"}
        </text>
      )}
    </g>
  )
}

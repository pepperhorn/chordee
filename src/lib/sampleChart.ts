import type { ChordChart } from "./schema"
import { generateId } from "./utils"

function slot(root?: string, quality?: string) {
  return {
    id: generateId(),
    chord: root ? { root, quality: quality || "maj" } : null,
    nashvilleChord: null,
    noChord: false,
    slash: {
      articulation: "none",
      tied: false,
      rest: false,
      stem: false,
      stemDirection: "up" as const,
    },
  }
}

function beat(root?: string, quality?: string) {
  return {
    id: generateId(),
    division: "quarter" as const,
    slots: [slot(root, quality)],
  }
}

/** 2-chord measure: chord1 on beats 1-2, chord2 on beats 3-4 */
function measure2(
  chord1: [string, string?],
  chord2: [string, string?]
) {
  return {
    id: generateId(),
    barlineStart: "single" as const,
    barlineEnd: "single" as const,
    repeatStart: false,
    repeatEnd: false,
    repeatCount: 2,
    wholeRest: false,
    beats: [
      beat(chord1[0], chord1[1]),
      beat(),
      beat(chord2[0], chord2[1]),
      beat(),
    ],
  }
}

/** 1-chord measure: chord on beat 1 only */
function measure1(chord: [string, string?]) {
  return {
    id: generateId(),
    barlineStart: "single" as const,
    barlineEnd: "single" as const,
    repeatStart: false,
    repeatEnd: false,
    repeatCount: 2,
    wholeRest: false,
    beats: [
      beat(chord[0], chord[1]),
      beat(),
      beat(),
      beat(),
    ],
  }
}

export const SAMPLE_CHART: ChordChart = {
  version: "1.0",
  meta: {
    title: "Autumn Leaves",
    subtitle: "",
    composer: "Joseph Kosma",
    arranger: "",
    style: "Medium Swing",
    key: "Gm",
    tempo: 132,
    tempoDivisor: "quarter",
    tempoText: "",
    showTempo: true,
    notationType: "standard",
    measuresPerLine: 4,
    clef: "treble",
    clefDisplay: "start",
    showClef: false,
    showKeySignature: true,
    copyright: "",
    footerText: "",
  },
  sections: [
    {
      id: generateId(),
      name: "A",
      timeSignature: { beats: 4, beatUnit: 4 },
      rehearsalMark: "A",
      measures: [
        measure2(["C", "min7"], ["F", "dom7"]),
        measure2(["Bb", "maj7"], ["Eb", "maj7"]),
        measure2(["A", "hdim7"], ["D", "dom7"]),
        measure1(["G", "min7"]),
        measure2(["C", "min7"], ["F", "dom7"]),
        measure2(["Bb", "maj7"], ["Eb", "maj7"]),
        measure2(["A", "hdim7"], ["D", "dom7"]),
        measure1(["G", "min7"]),
      ],
    },
    {
      id: generateId(),
      name: "B",
      timeSignature: { beats: 4, beatUnit: 4 },
      rehearsalMark: "B",
      measures: [
        measure2(["A", "hdim7"], ["D", "dom7"]),
        measure1(["G", "min7"]),
        measure2(["C", "min7"], ["F", "dom7"]),
        measure2(["Bb", "maj7"], ["Eb", "maj7"]),
        measure2(["A", "hdim7"], ["D", "dom7"]),
        measure2(["G", "min7"], ["C", "min7"]),
        measure2(["A", "hdim7"], ["D", "dom7"]),
        measure1(["G", "min7"]),
      ],
    },
  ],
}

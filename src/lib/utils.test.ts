import { describe, expect, it } from "vitest"
import type { BeatSlot, ChordChart } from "./schema"
import { findEffectiveChord, getInheritedChord } from "./utils"

function slot(id: string, updates: Partial<BeatSlot> = {}): BeatSlot {
  return {
    id,
    chord: null,
    nashvilleChord: null,
    noChord: false,
    slash: {
      articulation: "none",
      tied: false,
      rest: false,
      stem: false,
      stemDirection: "up",
    },
    ...updates,
  }
}

function chartWithSlots(slots: BeatSlot[]): ChordChart {
  return {
    version: "1.0",
    meta: {
      id: "00000000-0000-4000-8000-000000000000",
      title: "Test",
      subtitle: "",
      composer: "",
      arranger: "",
      style: "",
      key: "C",
      tempo: 120,
      tempoDivisor: "quarter",
      tempoText: "",
      showTempo: true,
      notationDisplay: "chords",
      measuresPerLine: 4,
      clef: "treble",
      clefDisplay: "start",
      showClef: false,
      showKeySignature: true,
      copyright: "",
      footerText: "",
    },
    sections: [{
      id: "section",
      name: "Section",
      timeSignature: { beats: 4, beatUnit: 4 },
      showTimeSignature: "auto",
      measures: [{
        id: "measure",
        barlineStart: "single",
        barlineEnd: "single",
        repeatStart: false,
        repeatEnd: false,
        repeatCount: 2,
        wholeRest: false,
        beats: [{
          id: "beat",
          division: "quarter",
          slots,
        }],
      }],
    }],
  }
}

describe("effective chord traversal", () => {
  it("inherits until N.C. and resumes only after a new chord", () => {
    const c = { root: "C", quality: "maj" }
    const g = { root: "G", quality: "dom7" }
    const chart = chartWithSlots([
      slot("c", { chord: c }),
      slot("inherits-c"),
      slot("nc", { noChord: true }),
      slot("blocked"),
      slot("g", { chord: g }),
      slot("inherits-g"),
    ])

    expect(findEffectiveChord(chart, "inherits-c")).toEqual(c)
    expect(findEffectiveChord(chart, "nc")).toBeNull()
    expect(findEffectiveChord(chart, "blocked")).toBeNull()
    expect(findEffectiveChord(chart, "inherits-g")).toEqual(g)
    expect(getInheritedChord(
      chart,
      "section",
      "measure",
      "beat",
      "inherits-g"
    )).toEqual({ chord: g, inherited: true })
  })

  it("returns null for unknown slot identifiers", () => {
    const chart = chartWithSlots([
      slot("known", { chord: { root: "C", quality: "maj" } }),
    ])

    expect(findEffectiveChord(chart, "missing")).toBeNull()
    expect(getInheritedChord(
      chart,
      "section",
      "measure",
      "beat",
      "missing"
    )).toBeNull()
  })
})

import { beforeEach, describe, expect, it } from "vitest"
import type { BeatSlot, ChordChart } from "./schema"
import { useChartStore } from "./store"

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

function testChart(): ChordChart {
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
          division: "eighth",
          slots: [
            slot("source", {
              chord: { root: "C", quality: "maj" },
            }),
            slot("target"),
          ],
        }],
      }],
    }],
  }
}

function targetSlot() {
  return useChartStore.getState().chart.sections[0].measures[0].beats[0].slots[1]
}

function apply(rawValue: string, isNashville = false) {
  return useChartStore.getState().applyRawChordEntry(
    "section",
    "measure",
    "beat",
    "target",
    rawValue,
    isNashville
  )
}

beforeEach(() => {
  const chart = testChart()
  useChartStore.setState({
    chart,
    history: [{ chart: structuredClone(chart), description: "Initial" }],
    historyIndex: 0,
  })
})

describe("applyRawChordEntry", () => {
  it("retains bass-only and bare-slash behavior", () => {
    expect(apply("/Bb")).toMatchObject({ kind: "chord" })
    expect(targetSlot().chord).toEqual({
      root: "C",
      quality: "maj",
      bass: "Bb",
      bassOnly: true,
    })

    expect(apply("/")).toMatchObject({ kind: "chord" })
    expect(targetSlot().chord).toEqual({
      root: "C",
      quality: "maj",
    })
  })

  it("applies a standard entry atomically and undo restores all slot fields", () => {
    useChartStore.getState().updateSlot(
      "section",
      "measure",
      "beat",
      "target",
      {
        chord: null,
        nashvilleChord: {
          degree: "5",
          quality: "dom7",
          extensions: ["b9"],
        },
        noChord: true,
      }
    )
    const beforeEntry = structuredClone(targetSlot())
    const historyBefore = useChartStore.getState().history.length

    expect(apply("Dm7#11")).toMatchObject({ kind: "chord" })
    expect(useChartStore.getState().history.length).toBe(historyBefore + 1)
    expect(targetSlot()).toMatchObject({
      chord: {
        root: "D",
        quality: "min7",
        extensions: ["#11"],
      },
      nashvilleChord: null,
      noChord: false,
    })

    useChartStore.getState().undo()
    expect(targetSlot()).toEqual(beforeEntry)
  })

  it("clears opposite notation for Nashville and clear entries", () => {
    const beforeNashville = useChartStore.getState().history.length
    expect(apply("4m7b9", true)).toMatchObject({ kind: "nashville" })
    expect(useChartStore.getState().history.length).toBe(beforeNashville + 1)
    expect(targetSlot()).toMatchObject({
      chord: null,
      nashvilleChord: {
        degree: "4",
        quality: "min7",
        extensions: ["b9"],
      },
      noChord: false,
    })

    const beforeClear = useChartStore.getState().history.length
    expect(apply("", true)).toEqual({ kind: "clear" })
    expect(useChartStore.getState().history.length).toBe(beforeClear + 1)
    expect(targetSlot()).toMatchObject({
      chord: null,
      nashvilleChord: null,
      noChord: false,
    })
  })

  it("does not mutate history for an unknown slot", () => {
    const before = useChartStore.getState().history.length
    const result = useChartStore.getState().applyRawChordEntry(
      "section",
      "measure",
      "beat",
      "missing",
      "C",
      false
    )

    expect(result).toEqual({ kind: "invalid", error: "Chord slot not found" })
    expect(useChartStore.getState().history.length).toBe(before)
  })
})

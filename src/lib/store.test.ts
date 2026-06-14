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
  const currentUi = useChartStore.getState().ui
  useChartStore.setState({
    chart,
    ui: {
      ...currentUi,
      readOnly: false,
      canFork: false,
      activeShare: null,
    },
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

describe("read-only document capability", () => {
  function makeHistory() {
    const initial = testChart()
    const changed = structuredClone(initial)
    changed.meta.title = "Changed"
    useChartStore.setState({
      chart: changed,
      history: [
        { chart: initial, description: "Initial" },
        { chart: changed, description: "Changed title" },
      ],
      historyIndex: 1,
    })
  }

  it("blocks chart mutations and atomic chord entry without adding history", () => {
    const store = useChartStore.getState()
    store.setShareState({
      readOnly: true,
      canFork: true,
      activeShare: null,
    })
    const before = structuredClone(useChartStore.getState().chart)
    const historyBefore = useChartStore.getState().history.length

    store.updateMeta({ title: "Blocked" })
    store.addSection("Blocked")
    expect(apply("Dm7")).toEqual({
      kind: "invalid",
      error: "Document is read-only",
    })

    expect(useChartStore.getState().chart).toEqual(before)
    expect(useChartStore.getState().history.length).toBe(historyBefore)
    expect(useChartStore.getState().canEditDocument()).toBe(false)
  })

  it("blocks undo, redo, and import while read-only", () => {
    makeHistory()
    const store = useChartStore.getState()
    store.setShareState({
      readOnly: true,
      canFork: false,
      activeShare: null,
    })

    expect(store.canUndo()).toBe(false)
    store.undo()
    expect(useChartStore.getState().historyIndex).toBe(1)
    expect(useChartStore.getState().chart.meta.title).toBe("Changed")

    useChartStore.setState({ historyIndex: 0 })
    expect(useChartStore.getState().canRedo()).toBe(false)
    useChartStore.getState().redo()
    expect(useChartStore.getState().historyIndex).toBe(0)

    expect(useChartStore.getState().importJSON(JSON.stringify(testChart()))).toBe(
      false
    )
    expect(useChartStore.getState().historyIndex).toBe(0)
  })

  it("allows trusted document replacement and local view settings", () => {
    const store = useChartStore.getState()
    store.setShareState({
      readOnly: true,
      canFork: true,
      activeShare: null,
    })
    const replacement = testChart()
    replacement.meta.title = "Resolved share"

    store.setChart(replacement)
    store.setZoom(125)
    store.setSelection({
      type: "slot",
      sectionId: "section",
      measureId: "measure",
      beatId: "beat",
      slotId: "target",
    })

    const state = useChartStore.getState()
    expect(state.chart.meta.title).toBe("Resolved share")
    expect(state.ui.zoom).toBe(125)
    expect(state.ui.selection?.type).toBe("slot")
    expect(state.ui.readOnly).toBe(true)
  })
})

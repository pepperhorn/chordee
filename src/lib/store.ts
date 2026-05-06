import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type {
  ChordChart,
  Selection,
  Section,
  Measure,
  Beat,
  BeatSlot,
  Chord,
  NashvilleChord,
  Division,
  TimeSignature,
  ChartMeta,
} from "./schema"
import { ChordChartSchema } from "./schema"
import { pruneOrphanedVoltas, reallocateEndings, generateRepeatRegionId } from "./voltaState"
import { validBarlineStylesAt, cycleBarlineStyle } from "./barlineValidation"
import type { Barline as BarlineStyle } from "./schema"
import { buildUserStyle, UserStyleSchema, type UserStyle } from "./userStyle"
import {
  createBeat,
  createBeatSlot,
  createEmptyChart,
  createMeasure,
  createSection,
  deepClone,
  generateId,
} from "./utils"
import { DIVISIONS } from "./constants"
import { DEFAULT_FONT_CONFIG, type FontConfig } from "./fonts"
import { SAMPLE_CHART } from "./sampleChart"

// ── UI State ───────────────────────────────────────────────────────────

export interface EditorUIState {
  selection: Selection | null
  isPlaying: boolean
  zoom: number
  showSlashes: boolean
  showDynamics: boolean
  showLyrics: boolean
  showInstructions: boolean
  theme: "light" | "dark" | "high-contrast"
  articulationSize: "sm" | "md" | "lg" | "xl"
  showKeyboardShortcuts: boolean
  fontConfig: FontConfig
  justificationStrategy: "proportional" | "equal"
  measuresPerLineMode: "auto" | "fixed"
  editMode: "chord" | "rhythm"
  activeInput: "none" | "chord" | "dynamic" | "timesig" | "keysig"
  paperTexture: "none" | "subtle" | "crumpled"
  bgColor: string
  toast: { message: string; type: "info" | "warning" | "error"; id: number } | null
  activePluginPanel: string | null
  enabledPlugins: string[]
  /** When set, the chart-level Ending picker is rendered anchored at
   *  `anchorRect`. Stored centrally so only one picker exists at a time
   *  (instead of every BarGroup carrying its own open-state). */
  endingPicker: {
    sectionId: string
    measureId: string
    anchorRect: { left: number; top: number; width: number; height: number }
  } | null
  /** Read-only viewing mode (e.g. opened a shared chart you don't own and
   *  can't edit). Disables Save and edit affordances. */
  readOnly: boolean
  /** When read-only, indicates the user can fork a copy into their own
   *  account. Drives the "Fork to my account" CTA. */
  canFork: boolean
  /** Active share metadata when the editor was opened via /c/<code>. */
  activeShare: {
    code: string
    visibility: "private" | "link_view" | "link_edit" | "public"
    ownerId: string | null
    source: "owned" | "anonymous"
  } | null
}

// ── History ────────────────────────────────────────────────────────────

interface HistoryEntry {
  chart: ChordChart
  description: string
}

const MAX_HISTORY = 50

// ── Store Interface ────────────────────────────────────────────────────

export interface ChartState {
  chart: ChordChart
  ui: EditorUIState
  history: HistoryEntry[]
  historyIndex: number

  // Chart mutations
  setChart: (chart: ChordChart) => void
  updateMeta: (meta: Partial<ChartMeta>) => void

  // Section operations
  addSection: (name?: string) => void
  updateSection: (id: string, updates: Partial<Section>) => void
  setSectionTimeSignature: (id: string, beats: number, beatUnit: 2 | 4 | 8 | 16) => void
  setMeasureTimeSignature: (
    sectionId: string,
    measureId: string,
    beats: number,
    beatUnit: 2 | 4 | 8 | 16
  ) => void
  clearMeasureTimeSignature: (sectionId: string, measureId: string) => void
  deleteSection: (id: string) => void
  reorderSections: (fromIndex: number, toIndex: number) => void

  // Measure operations
  addMeasure: (sectionId: string) => void
  updateMeasure: (sectionId: string, measureId: string, updates: Partial<Measure>) => void
  /** Apply multiple measure updates as a single mutation (one undo entry). */
  updateMeasures: (
    description: string,
    edits: Array<{ sectionId: string; measureId: string; updates: Partial<Measure> }>,
  ) => void
  /** Cycle a barline style and reflow endings as a single atomic
   *  mutation. Encapsulates the no-nested-repeats validation, the
   *  repeatRegionId stamping/clearing on repeatStart transitions, and
   *  the post-edit `reallocateEndings` pass that keeps multi-ending
   *  cascades in sync with the close-repeat layout. */
  cycleBarline: (sectionId: string, measureId: string, side: "start" | "end") => void
  deleteMeasure: (sectionId: string, measureId: string) => void

  // Ending picker
  openEndingPicker: (
    sectionId: string,
    measureId: string,
    anchorRect: { left: number; top: number; width: number; height: number },
  ) => void
  closeEndingPicker: () => void

  // Beat operations
  updateBeat: (sectionId: string, measureId: string, beatId: string, updates: Partial<Beat>) => void
  setBeatDivision: (sectionId: string, measureId: string, beatId: string, division: Division) => void

  // Slot operations
  updateSlot: (sectionId: string, measureId: string, beatId: string, slotId: string, updates: Partial<BeatSlot>) => void
  setSlotChord: (sectionId: string, measureId: string, beatId: string, slotId: string, chord: Chord | null) => void
  setSlotNashville: (sectionId: string, measureId: string, beatId: string, slotId: string, nashvilleChord: NashvilleChord | null) => void

  // Selection
  setSelection: (selection: Selection | null) => void

  // UI
  setZoom: (zoom: number) => void
  toggleShowSlashes: () => void
  toggleShowDynamics: () => void
  toggleShowLyrics: () => void
  toggleShowInstructions: () => void
  setTheme: (theme: EditorUIState["theme"]) => void
  setArticulationSize: (size: EditorUIState["articulationSize"]) => void
  /** Configure read-only viewing (e.g. shared link). */
  setShareState: (state: {
    readOnly: boolean
    canFork: boolean
    activeShare: EditorUIState["activeShare"]
  }) => void
  /** Reset share state to a normal owned-editor session. */
  clearShareState: () => void
  toggleShowKeyboardShortcuts: () => void
  setFontConfig: (config: Partial<FontConfig>) => void
  setJustificationStrategy: (s: "proportional" | "equal") => void
  setMeasuresPerLineMode: (mode: "auto" | "fixed") => void
  toggleEditMode: () => void
  setEditMode: (mode: "chord" | "rhythm") => void
  setActiveInput: (input: "none" | "chord" | "dynamic" | "timesig" | "keysig") => void
  setPaperTexture: (texture: "none" | "subtle" | "crumpled") => void
  setBgColor: (color: string) => void
  showToast: (message: string, type?: "info" | "warning" | "error") => void
  clearToast: () => void
  togglePluginPanel: (id: string) => void
  setPluginEnabled: (id: string, enabled: boolean) => void

  // History
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // I/O
  exportJSON: () => string
  importJSON: (json: string) => boolean
}

// ── Helpers ────────────────────────────────────────────────────────────

function findSection(chart: ChordChart, sectionId: string): Section | undefined {
  return chart.sections.find((s) => s.id === sectionId)
}

function findMeasure(section: Section, measureId: string): Measure | undefined {
  return section.measures.find((m) => m.id === measureId)
}

function findBeat(measure: Measure, beatId: string): Beat | undefined {
  return measure.beats.find((b) => b.id === beatId)
}

function findSlot(beat: Beat, slotId: string): BeatSlot | undefined {
  return beat.slots.find((s) => s.id === slotId)
}

/** Regroup `section.measures` from index `startIdx` (inclusive) to the end
 *  of the section into bars of `target` meter. Bars before `startIdx` stay
 *  unchanged. Beats from the regrouped range are flattened (preserving
 *  beat data and IDs), padded to a multiple of `target.beats` with empty
 *  rests, then split into new measures. The first new measure inherits
 *  the original measure[startIdx].barlineStart; the last new measure
 *  inherits the original section's final barlineEnd. Interior repeats,
 *  endings, voltas, and wholeRest flags within the regrouped range are
 *  reset. */
function regroupRange(
  section: Section,
  startIdx: number,
  target: TimeSignature
): void {
  const tail = section.measures.slice(startIdx)
  if (tail.length === 0) return
  const firstStart = tail[0].barlineStart
  const lastEnd = tail[tail.length - 1].barlineEnd
  const allBeats: Beat[] = tail.flatMap((m) => m.beats)

  const { beats, beatUnit } = target
  const remainder = allBeats.length % beats
  if (remainder !== 0) {
    const pad = beats - remainder
    for (let i = 0; i < pad; i++) allBeats.push(createBeat())
  }
  if (allBeats.length === 0) {
    for (let i = 0; i < beats; i++) allBeats.push(createBeat())
  }

  const newTail: Measure[] = []
  for (let i = 0; i < allBeats.length; i += beats) {
    const measure = createMeasure({ beats, beatUnit })
    measure.beats = allBeats.slice(i, i + beats)
    newTail.push(measure)
  }
  newTail[0].barlineStart = firstStart
  newTail[newTail.length - 1].barlineEnd = lastEnd

  section.measures = [...section.measures.slice(0, startIdx), ...newTail]
}

// ── Store ──────────────────────────────────────────────────────────────

export const useChartStore = create<ChartState>()(
  subscribeWithSelector((set, get) => {
    function saveHistory(description: string) {
      const { chart, history, historyIndex } = get()
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push({ chart: deepClone(chart), description })
      if (newHistory.length > MAX_HISTORY) newHistory.shift()
      set({ history: newHistory, historyIndex: newHistory.length - 1 })
    }

    function mutateChart(description: string, mutator: (chart: ChordChart) => void) {
      saveHistory(description)
      const chart = deepClone(get().chart)
      mutator(chart)
      // After every mutation, sweep endings whose region was deleted,
      // unpaired, or had its repeatRegionId cleared. Cheap (one chart
      // walk) and means callers never have to think about orphans.
      pruneOrphanedVoltas(chart)
      set({ chart })
    }

    return {
      chart: SAMPLE_CHART,
      ui: {
        selection: null,
        isPlaying: false,
        zoom: 100,
        showSlashes: true,
        showDynamics: true,
        showLyrics: true,
        showInstructions: true,
        theme: "light",
        articulationSize: "md",
        showKeyboardShortcuts: false,
        fontConfig: { ...DEFAULT_FONT_CONFIG },
        justificationStrategy: "proportional",
        measuresPerLineMode: "auto",
        editMode: "chord",
        activeInput: "none",
        paperTexture: "subtle",
        bgColor: "#ffffff",
        toast: null,
        activePluginPanel: null,
        enabledPlugins: ["playback"],
        endingPicker: null,
        readOnly: false,
        canFork: false,
        activeShare: null,
      },
      history: [],
      historyIndex: -1,

      // ── Chart mutations ──────────────────────────────────────

      setChart: (chart) => {
        saveHistory("Set chart")
        set({ chart: deepClone(chart) })
      },

      updateMeta: (meta) => {
        mutateChart("Update metadata", (chart) => {
          Object.assign(chart.meta, meta)
        })
      },

      // ── Section operations ───────────────────────────────────

      addSection: (name) => {
        mutateChart("Add section", (chart) => {
          chart.sections.push(createSection(name))
        })
      },

      updateSection: (id, updates) => {
        mutateChart("Update section", (chart) => {
          const section = findSection(chart, id)
          if (section) Object.assign(section, updates)
        })
      },

      setSectionTimeSignature: (id, beats, beatUnit) => {
        mutateChart("Change time signature", (chart) => {
          const section = findSection(chart, id)
          if (!section) return
          section.timeSignature = { beats, beatUnit }
          regroupRange(section, 0, { beats, beatUnit })
          // Section-wide change clears all in-section meter overrides.
          for (const m of section.measures) delete m.timeSignature
        })
      },

      setMeasureTimeSignature: (sectionId, measureId, beats, beatUnit) => {
        mutateChart("Change time signature", (chart) => {
          const section = findSection(chart, sectionId)
          if (!section) return
          const idx = section.measures.findIndex((m) => m.id === measureId)
          if (idx < 0) return

          if (idx === 0) {
            // First bar of section — change the section's starting meter.
            section.timeSignature = { beats, beatUnit }
            regroupRange(section, 0, { beats, beatUnit })
            for (const m of section.measures) delete m.timeSignature
            return
          }

          // Mid-section override: bars before idx stay; bars from idx
          // forward get regrouped into the new meter, with the override
          // recorded on the first new measure.
          regroupRange(section, idx, { beats, beatUnit })
          const firstNew = section.measures[idx]
          if (firstNew) firstNew.timeSignature = { beats, beatUnit }
        })
      },

      clearMeasureTimeSignature: (sectionId, measureId) => {
        mutateChart("Clear time signature change", (chart) => {
          const section = findSection(chart, sectionId)
          if (!section) return
          const idx = section.measures.findIndex((m) => m.id === measureId)
          if (idx <= 0) return
          // Effective meter at this bar reverts to whatever the prior bar's
          // meter was (walk backward).
          let effective: TimeSignature = section.timeSignature
          for (let i = 0; i < idx; i++) {
            const ts = section.measures[i].timeSignature
            if (ts) effective = ts
          }
          regroupRange(section, idx, effective)
          // Override on this bar is no longer needed.
          delete section.measures[idx].timeSignature
        })
      },

      deleteSection: (id) => {
        mutateChart("Delete section", (chart) => {
          chart.sections = chart.sections.filter((s) => s.id !== id)
        })
      },

      reorderSections: (fromIndex, toIndex) => {
        mutateChart("Reorder sections", (chart) => {
          const [section] = chart.sections.splice(fromIndex, 1)
          chart.sections.splice(toIndex, 0, section)
        })
      },

      // ── Measure operations ───────────────────────────────────

      addMeasure: (sectionId) => {
        mutateChart("Add measure", (chart) => {
          const section = findSection(chart, sectionId)
          if (section) {
            section.measures.push(createMeasure(section.timeSignature))
          }
        })
      },

      updateMeasure: (sectionId, measureId, updates) => {
        mutateChart("Update measure", (chart) => {
          const section = findSection(chart, sectionId)
          if (!section) return
          const measure = findMeasure(section, measureId)
          if (measure) Object.assign(measure, updates)
        })
      },

      updateMeasures: (description, edits) => {
        if (edits.length === 0) return
        mutateChart(description, (chart) => {
          for (const edit of edits) {
            const section = findSection(chart, edit.sectionId)
            if (!section) continue
            const measure = findMeasure(section, edit.measureId)
            if (measure) Object.assign(measure, edit.updates)
          }
        })
      },

      cycleBarline: (sectionId, measureId, side) => {
        // Snapshot live state to compute the next style + validation.
        const chart = get().chart
        const valid = validBarlineStylesAt(chart, sectionId, measureId, side)
        const liveSection = chart.sections.find((s) => s.id === sectionId)
        const liveMeasure = liveSection?.measures.find((m) => m.id === measureId)
        if (!liveMeasure) return
        const field = side === "start" ? "barlineStart" : "barlineEnd"
        const current = (liveMeasure[field] ?? "single") as BarlineStyle
        const next = cycleBarlineStyle(current, valid)
        if (next === current) return // nothing to do

        mutateChart("Cycle barline", (chart) => {
          const section = findSection(chart, sectionId)
          if (!section) return
          const measure = findMeasure(section, measureId)
          if (!measure) return
          if (side === "start") {
            measure.barlineStart = next
          } else {
            measure.barlineEnd = next
          }
          // Stamp / clear repeatRegionId on repeatStart transitions so
          // findRepeatRegions can identify the new region.
          if (next === "repeatStart" && current !== "repeatStart") {
            measure.repeatRegionId = generateRepeatRegionId()
          } else if (current === "repeatStart" && next !== "repeatStart") {
            delete (measure as Measure).repeatRegionId
          }
          // Reflow endings inside the same mutation so the cascade
          // (snap existing 1st ending, shift 2nd, pop new 3rd) lands as
          // a single undoable step.
          reallocateEndings(chart)
        })
      },

      openEndingPicker: (sectionId, measureId, anchorRect) => {
        set((state) => ({
          ui: { ...state.ui, endingPicker: { sectionId, measureId, anchorRect } },
        }))
      },

      closeEndingPicker: () => {
        set((state) => ({ ui: { ...state.ui, endingPicker: null } }))
      },

      deleteMeasure: (sectionId, measureId) => {
        mutateChart("Delete measure", (chart) => {
          const section = findSection(chart, sectionId)
          if (section) {
            section.measures = section.measures.filter((m) => m.id !== measureId)
          }
        })
      },

      // ── Beat operations ──────────────────────────────────────

      updateBeat: (sectionId, measureId, beatId, updates) => {
        mutateChart("Update beat", (chart) => {
          const section = findSection(chart, sectionId)
          if (!section) return
          const measure = findMeasure(section, measureId)
          if (!measure) return
          const beat = findBeat(measure, beatId)
          if (beat) Object.assign(beat, updates)
        })
      },

      setBeatDivision: (sectionId, measureId, beatId, division) => {
        mutateChart("Change division", (chart) => {
          const section = findSection(chart, sectionId)
          if (!section) return
          const measure = findMeasure(section, measureId)
          if (!measure) return
          const beat = findBeat(measure, beatId)
          if (!beat) return

          const newSlotCount = DIVISIONS[division].slots
          beat.division = division

          // Adjust slot count
          while (beat.slots.length < newSlotCount) {
            beat.slots.push(createBeatSlot())
          }
          beat.slots = beat.slots.slice(0, newSlotCount)
        })
      },

      // ── Slot operations ──────────────────────────────────────

      updateSlot: (sectionId, measureId, beatId, slotId, updates) => {
        mutateChart("Update slot", (chart) => {
          const section = findSection(chart, sectionId)
          if (!section) return
          const measure = findMeasure(section, measureId)
          if (!measure) return
          const beat = findBeat(measure, beatId)
          if (!beat) return
          const slot = findSlot(beat, slotId)
          if (slot) Object.assign(slot, updates)
        })
      },

      setSlotChord: (sectionId, measureId, beatId, slotId, chord) => {
        mutateChart("Set chord", (chart) => {
          const section = findSection(chart, sectionId)
          if (!section) return
          const measure = findMeasure(section, measureId)
          if (!measure) return
          const beat = findBeat(measure, beatId)
          if (!beat) return
          const slot = findSlot(beat, slotId)
          if (slot) slot.chord = chord
        })
      },

      setSlotNashville: (sectionId, measureId, beatId, slotId, nashvilleChord) => {
        mutateChart("Set Nashville chord", (chart) => {
          const section = findSection(chart, sectionId)
          if (!section) return
          const measure = findMeasure(section, measureId)
          if (!measure) return
          const beat = findBeat(measure, beatId)
          if (!beat) return
          const slot = findSlot(beat, slotId)
          if (slot) slot.nashvilleChord = nashvilleChord
        })
      },

      // ── Selection ────────────────────────────────────────────

      setSelection: (selection) => {
        set((state) => ({ ui: { ...state.ui, selection } }))
      },

      // ── UI ───────────────────────────────────────────────────

      setZoom: (zoom) => set((s) => ({ ui: { ...s.ui, zoom: Math.max(50, Math.min(200, zoom)) } })),
      toggleShowSlashes: () => set((s) => ({ ui: { ...s.ui, showSlashes: !s.ui.showSlashes } })),
      toggleShowDynamics: () => set((s) => ({ ui: { ...s.ui, showDynamics: !s.ui.showDynamics } })),
      toggleShowLyrics: () => set((s) => ({ ui: { ...s.ui, showLyrics: !s.ui.showLyrics } })),
      toggleShowInstructions: () => set((s) => ({ ui: { ...s.ui, showInstructions: !s.ui.showInstructions } })),
      setTheme: (theme) => set((s) => ({ ui: { ...s.ui, theme } })),
      setArticulationSize: (articulationSize) => set((s) => ({ ui: { ...s.ui, articulationSize } })),
      setShareState: ({ readOnly, canFork, activeShare }) =>
        set((s) => ({ ui: { ...s.ui, readOnly, canFork, activeShare } })),
      clearShareState: () =>
        set((s) => ({ ui: { ...s.ui, readOnly: false, canFork: false, activeShare: null } })),
      toggleShowKeyboardShortcuts: () => set((s) => ({ ui: { ...s.ui, showKeyboardShortcuts: !s.ui.showKeyboardShortcuts } })),
      setFontConfig: (config) => set((s) => ({ ui: { ...s.ui, fontConfig: { ...s.ui.fontConfig, ...config } } })),
      setJustificationStrategy: (justificationStrategy) => set((s) => ({ ui: { ...s.ui, justificationStrategy } })),
      setMeasuresPerLineMode: (measuresPerLineMode) => set((s) => ({ ui: { ...s.ui, measuresPerLineMode } })),
      toggleEditMode: () => set((s) => ({ ui: { ...s.ui, editMode: s.ui.editMode === "chord" ? "rhythm" : "chord" } })),
      setEditMode: (editMode) => set((s) => ({ ui: { ...s.ui, editMode } })),
      setActiveInput: (activeInput) => set((s) => ({ ui: { ...s.ui, activeInput } })),
      setPaperTexture: (paperTexture) => set((s) => ({ ui: { ...s.ui, paperTexture } })),
      setBgColor: (bgColor) => set((s) => ({ ui: { ...s.ui, bgColor } })),
      showToast: (message, type = "info") => {
        const id = Date.now()
        set((s) => ({ ui: { ...s.ui, toast: { message, type, id } } }))
        setTimeout(() => {
          const current = useChartStore.getState().ui.toast
          if (current?.id === id) {
            set((s) => ({ ui: { ...s.ui, toast: null } }))
          }
        }, 3000)
      },
      clearToast: () => set((s) => ({ ui: { ...s.ui, toast: null } })),
      togglePluginPanel: (id) => set((s) => ({
        ui: { ...s.ui, activePluginPanel: s.ui.activePluginPanel === id ? null : id }
      })),
      setPluginEnabled: (id, enabled) => set((s) => ({
        ui: {
          ...s.ui,
          enabledPlugins: enabled
            ? [...s.ui.enabledPlugins.filter((p) => p !== id), id]
            : s.ui.enabledPlugins.filter((p) => p !== id),
        }
      })),

      // ── History ──────────────────────────────────────────────

      undo: () => {
        const { history, historyIndex } = get()
        if (historyIndex < 0) return
        set({
          chart: deepClone(history[historyIndex].chart),
          historyIndex: historyIndex - 1,
        })
      },

      redo: () => {
        const { history, historyIndex } = get()
        if (historyIndex >= history.length - 1) return
        const newIndex = historyIndex + 1
        set({
          chart: deepClone(history[newIndex].chart),
          historyIndex: newIndex,
        })
      },

      canUndo: () => get().historyIndex >= 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      // ── I/O ──────────────────────────────────────────────────

      exportJSON: () => {
        const state = get()
        const { fontConfig, measuresPerLineMode, justificationStrategy, paperTexture, bgColor } = state.ui
        const style = buildUserStyle(
          fontConfig,
          measuresPerLineMode,
          state.chart.meta.measuresPerLine,
          justificationStrategy,
          undefined,
          { texture: paperTexture, bgColor },
        )
        // Embed the full style block on the chart so reopening restores the view.
        const bundle = { ...state.chart, style }
        return JSON.stringify(bundle, null, 2)
      },

      importJSON: (json) => {
        // Two failure modes worth distinguishing for the user:
        //   1. Malformed JSON         → "Couldn't read file (not valid JSON)"
        //   2. Wrong shape / Zod fail → "File isn't a valid chord chart"
        // Both surface via toast; the chart is left untouched on either path.
        let data: unknown
        try {
          data = JSON.parse(json)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error("[importJSON] JSON parse failed:", msg)
          get().showToast("Couldn't read file — not valid JSON", "error")
          return false
        }

        // Strip the embedded style block before validating against
        // ChordChartSchema (which doesn't know about it) and apply it to
        // UI state after chart loads. Style failures are non-fatal — we
        // warn and fall back to the user's current style.
        let embeddedStyle: UserStyle | null = null
        if (data && typeof data === "object" && "style" in data && (data as { style: unknown }).style) {
          const styleParse = UserStyleSchema.safeParse((data as { style: unknown }).style)
          if (styleParse.success) {
            embeddedStyle = styleParse.data
          } else {
            console.warn("[importJSON] Embedded style block is invalid, ignoring:", styleParse.error.message)
            get().showToast("Style block in file was ignored (invalid format)", "warning")
          }
          delete (data as { style?: unknown }).style
        }

        const chartParse = ChordChartSchema.safeParse(data)
        if (!chartParse.success) {
          const issue = chartParse.error.issues[0]
          const where = issue?.path.join(".") || "<root>"
          const msg = `${issue?.message ?? "validation failed"} at ${where}`
          console.error("[importJSON] schema validation failed:", chartParse.error.issues)
          get().showToast(`File isn't a valid chord chart — ${msg}`, "error")
          return false
        }

        const chart = chartParse.data
        saveHistory("Import chart")
        set((s) => {
          const next: Partial<EditorUIState> = {
            fontConfig: s.ui.fontConfig,
            measuresPerLineMode: s.ui.measuresPerLineMode,
            justificationStrategy: s.ui.justificationStrategy,
            paperTexture: s.ui.paperTexture,
            bgColor: s.ui.bgColor,
          }
          if (embeddedStyle) {
            next.fontConfig = { ...s.ui.fontConfig, ...embeddedStyle.fonts } as FontConfig
            next.measuresPerLineMode = embeddedStyle.layout.measuresPerLineMode
            next.justificationStrategy = embeddedStyle.layout.justification
            if (embeddedStyle.page) {
              next.paperTexture = embeddedStyle.page.texture
              next.bgColor = embeddedStyle.page.bgColor
            }
          }
          return { chart, ui: { ...s.ui, ...next } }
        })
        return true
      },
    }
  })
)

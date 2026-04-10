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
import { pruneOrphanedVoltas } from "./voltaState"
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
          // Adjust each measure to match the new beat count
          for (const measure of section.measures) {
            while (measure.beats.length < beats) {
              measure.beats.push(createBeat())
            }
            measure.beats = measure.beats.slice(0, beats)
          }
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
        try {
          const data = JSON.parse(json)
          // Strip the embedded style block before validating against ChordChartSchema
          // (which doesn't know about it) and apply it to UI state after chart loads.
          let embeddedStyle: UserStyle | null = null
          if (data && typeof data === "object" && "style" in data && data.style) {
            const parsed = UserStyleSchema.safeParse(data.style)
            if (parsed.success) embeddedStyle = parsed.data
            delete data.style
          }
          const chart = ChordChartSchema.parse(data)
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
        } catch {
          return false
        }
      },
    }
  })
)

import { useEffect, useCallback } from "react"
import { useChartStore } from "./store"
import { usePlaybackStore } from "./plugins/playback/playback-store"
import { findRegionContaining } from "./voltaState"
import type { LayoutResult, PositionEntry } from "./layout/types"

type Division = "quarter" | "eighth" | "eighthTriplet" | "sixteenth" | "sixteenthTriplet" | "thirtySecond" | "half" | "whole" | "quarterTriplet"

// New subdivision keys: 1=32nd, 2=16th, 3=8th, 4=quarter, 5=half, 6=whole
const DIVISION_KEYS: Record<string, Division> = {
  "1": "thirtySecond",
  "2": "sixteenth",
  "3": "eighth",
  "4": "quarter",
  "5": "half",
  "6": "whole",
}

// Triplet mappings: base division → triplet version
const TRIPLET_MAP: Record<string, Division> = {
  quarter: "quarterTriplet",
  eighth: "eighthTriplet",
  sixteenth: "sixteenthTriplet",
}

// Reverse: triplet → base
const UNTRIPLET_MAP: Record<string, Division> = {
  quarterTriplet: "quarter",
  eighthTriplet: "eighth",
  sixteenthTriplet: "sixteenth",
}

// Ordered subdivision cycle for Ctrl+Arrow (fine to coarse)
const DIVISION_CYCLE: Division[] = [
  "thirtySecond",
  "sixteenthTriplet",
  "sixteenth",
  "eighthTriplet",
  "eighth",
  "quarterTriplet",
  "quarter",
  "half",
  "whole",
]

// Divisions that don't make sense for certain beat units
// A whole note doesn't fit in a beat if the beat unit is already a quarter etc.
// For beat unit 8 (compound time), half/whole don't fit in a single beat
function isDivisionValidForTimeSig(
  division: Division,
  beatUnit: number
): boolean {
  if (division === "whole" && beatUnit >= 4) return true // whole = 4 quarter beats, only valid as a special case
  if (division === "half" && beatUnit >= 4) return true
  if (division === "whole" && beatUnit === 8) return false // can't fit a whole in an eighth-note beat
  if (division === "half" && beatUnit === 8) return false
  if (division === "thirtySecond" && beatUnit === 2) return true
  return true
}

const ARTICULATION_KEYS: Record<string, string> = {
  ".": "staccato",
  ",": "marcato",
  ";": "accent",
  "'": "legato",
}

export function useKeyboardNavigation(layout: LayoutResult | null) {
  const selection = useChartStore((s) => s.ui.selection)
  const editMode = useChartStore((s) => s.ui.editMode)
  const setSelection = useChartStore((s) => s.setSelection)
  const setBeatDivision = useChartStore((s) => s.setBeatDivision)
  const updateSlot = useChartStore((s) => s.updateSlot)
  const undo = useChartStore((s) => s.undo)
  const redo = useChartStore((s) => s.redo)
  const toggleEditMode = useChartStore((s) => s.toggleEditMode)
  const showToast = useChartStore((s) => s.showToast)

  const getEntries = useCallback((): PositionEntry[] => {
    return layout?.positionMap.entries ?? []
  }, [layout])

  const findCurrentIndex = useCallback((): number => {
    if (!selection?.slotId) return -1
    const entries = getEntries()
    return entries.findIndex((e) => e.target.slotId === selection.slotId)
  }, [selection, getEntries])

  const selectByIndex = useCallback(
    (index: number) => {
      const entries = getEntries()
      if (index < 0 || index >= entries.length) return
      const target = entries[index].target
      setSelection({
        type: "slot",
        sectionId: target.sectionId,
        measureId: target.measureId,
        beatId: target.beatId,
        slotId: target.slotId,
      })
    },
    [getEntries, setSelection]
  )

  const getSelectedSlot = useCallback(() => {
    if (!selection?.slotId || !selection.sectionId || !selection.measureId || !selection.beatId) return null
    const chart = useChartStore.getState().chart
    const section = chart.sections.find((s) => s.id === selection.sectionId)
    const measure = section?.measures.find((m) => m.id === selection.measureId)
    const beat = measure?.beats.find((b) => b.id === selection.beatId)
    const slot = beat?.slots.find((s) => s.id === selection.slotId)
    return slot ?? null
  }, [selection])

  const getSelectedBeat = useCallback(() => {
    if (!selection?.beatId || !selection.sectionId || !selection.measureId) return null
    const chart = useChartStore.getState().chart
    const section = chart.sections.find((s) => s.id === selection.sectionId)
    const measure = section?.measures.find((m) => m.id === selection.measureId)
    return measure?.beats.find((b) => b.id === selection.beatId) ?? null
  }, [selection])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // k — open key signature picker (works everywhere, k is never a valid chord character)
      if (e.key === "k" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        useChartStore.getState().setActiveInput("keysig")
        return
      }

      // Don't handle other keys if focused on an input
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      const entries = getEntries()
      if (entries.length === 0) return

      // ── Always active ────────────────────────────────────────

      // l — toggle listen mode
      if (e.key === "l" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        usePlaybackStore.getState().toggleListenMode()
        const on = usePlaybackStore.getState().listenMode
        showToast(`Listen mode ${on ? "ON" : "OFF"}`, "info")
        return
      }

      // \ — toggle edit mode
      if (e.key === "\\") {
        e.preventDefault()
        toggleEditMode()
        const newMode = useChartStore.getState().ui.editMode
        showToast(`Switched to ${newMode} mode`, "info")
        return
      }

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault()
        redo()
        return
      }

      // Escape — clear selection
      if (e.key === "Escape") {
        e.preventDefault()
        setSelection(null)
        return
      }

      // v — open Ending picker for the selected measure (only when it's
      // inside a repeat region). Uses the layout's position map to anchor
      // the popover at the selected bar's screen rect.
      if (e.key === "v" && !e.metaKey && !e.ctrlKey && selection?.measureId && selection.sectionId) {
        const chart = useChartStore.getState().chart
        const region = findRegionContaining(chart, selection.sectionId, selection.measureId)
        if (!region) {
          showToast("Selected bar isn't inside a repeat", "warning")
          return
        }
        e.preventDefault()
        // Anchor on the selected slot's DOM rect if available, falling
        // back to the document center.
        const svg = document.getElementById("chart-area") as SVGSVGElement | null
        const barEl = svg?.querySelector(
          `[data-measure-id="${selection.measureId}"]`,
        ) as SVGGraphicsElement | null
        const r = barEl?.getBoundingClientRect()
        const anchorRect = r
          ? { left: r.left, top: r.top, width: r.width, height: r.height }
          : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 1, height: 1 }
        useChartStore.getState().openEndingPicker(
          selection.sectionId,
          selection.measureId,
          anchorRect,
        )
        return
      }

      // ── Navigation (both modes) ─────────────────────────────

      if (!selection) {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
          e.preventDefault()
          selectByIndex(0)
        }
        return
      }

      const currentIdx = findCurrentIndex()

      // Ctrl+Shift+Left/Right — cycle subdivision (works in both modes, no native text conflict)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "ArrowRight" || e.key === "ArrowLeft") && selection.beatId && selection.sectionId && selection.measureId) {
        e.preventDefault()
        const beat = getSelectedBeat()
        if (!beat) return

        const idx = DIVISION_CYCLE.indexOf(beat.division as Division)
        if (idx < 0) return

        const next = e.key === "ArrowRight"
          ? DIVISION_CYCLE[Math.min(idx + 1, DIVISION_CYCLE.length - 1)]
          : DIVISION_CYCLE[Math.max(idx - 1, 0)]

        if (next !== beat.division) {
          setBeatDivision(selection.sectionId, selection.measureId, selection.beatId, next)
        }
        return
      }

      if (e.key === "ArrowRight") {
        e.preventDefault()
        if (currentIdx < entries.length - 1) selectByIndex(currentIdx + 1)
        return
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        if (currentIdx > 0) selectByIndex(currentIdx - 1)
        return
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault()
        if (currentIdx < 0) return
        const current = entries[currentIdx]
        const currentX = current.rect.x
        const currentY = current.rect.y

        const candidates = entries.filter((entry) =>
          e.key === "ArrowUp"
            ? entry.rect.y < currentY - 10
            : entry.rect.y > currentY + 10
        )
        if (candidates.length === 0) return

        const targetY = e.key === "ArrowUp"
          ? Math.max(...candidates.map((c) => c.rect.y))
          : Math.min(...candidates.map((c) => c.rect.y))

        const lineEntries = candidates.filter(
          (c) => Math.abs(c.rect.y - targetY) < 5
        )

        let best = lineEntries[0]
        let bestDist = Math.abs(best.rect.x - currentX)
        for (const entry of lineEntries) {
          const dist = Math.abs(entry.rect.x - currentX)
          if (dist < bestDist) {
            best = entry
            bestDist = dist
          }
        }

        const idx = entries.indexOf(best)
        if (idx >= 0) selectByIndex(idx)
        return
      }

      // Tab — next/previous measure
      if (e.key === "Tab") {
        e.preventDefault()
        if (currentIdx < 0) return
        const current = entries[currentIdx]
        const direction = e.shiftKey ? -1 : 1

        if (direction === 1) {
          for (let i = currentIdx + 1; i < entries.length; i++) {
            if (entries[i].target.measureId !== current.target.measureId) {
              selectByIndex(i)
              return
            }
          }
        } else {
          for (let i = currentIdx - 1; i >= 0; i--) {
            if (entries[i].target.measureId !== current.target.measureId) {
              const prevMeasureId = entries[i].target.measureId
              let firstIdx = i
              while (firstIdx > 0 && entries[firstIdx - 1].target.measureId === prevMeasureId) {
                firstIdx--
              }
              selectByIndex(firstIdx)
              return
            }
          }
        }
        return
      }

      // ── Both modes ─────────────────────────────────────────



      // ── Rhythm mode only ────────────────────────────────────

      if (editMode === "rhythm") {
        // Division keys: 1=32nd, 2=16th, 3=8th, 4=quarter, 5=half, 6=whole
        if (DIVISION_KEYS[e.key] && selection.beatId && selection.sectionId && selection.measureId) {
          e.preventDefault()
          const targetDiv = DIVISION_KEYS[e.key]
          // Validate against time signature
          const chart = useChartStore.getState().chart
          const sec = chart.sections.find((s) => s.id === selection.sectionId)
          if (sec && !isDivisionValidForTimeSig(targetDiv, sec.timeSignature.beatUnit)) {
            showToast(`${targetDiv} doesn't fit in ${sec.timeSignature.beats}/${sec.timeSignature.beatUnit} time`, "warning")
            return
          }
          setBeatDivision(
            selection.sectionId,
            selection.measureId,
            selection.beatId,
            targetDiv
          )
          return
        }

        // q — open time signature picker
        if (e.key === "q" && selection.sectionId) {
          e.preventDefault()
          useChartStore.getState().setActiveInput("timesig")
          return
        }

        // e — open dynamic/expression input
        if (e.key === "e" && selection.beatId) {
          e.preventDefault()
          useChartStore.getState().setActiveInput("dynamic")
          return
        }

        // r — toggle rest on selected slot
        if (e.key === "r" && selection.slotId) {
          e.preventDefault()
          const slot = getSelectedSlot()
          if (!slot) return
          updateSlot(selection.sectionId, selection.measureId!, selection.beatId!, selection.slotId, {
            slash: { ...slot.slash, rest: !slot.slash.rest },
          })
          showToast(slot.slash.rest ? "Rest removed" : "Rest added", "info")
          return
        }

        // n — toggle N.C. (no chord) on selected slot
        if (e.key === "n" && selection.slotId) {
          e.preventDefault()
          const slot = getSelectedSlot()
          if (!slot) return
          const newNC = !slot.noChord
          updateSlot(selection.sectionId, selection.measureId!, selection.beatId!, selection.slotId, {
            noChord: newNC,
            chord: newNC ? null : slot.chord, // clear chord if setting N.C.
          })
          showToast(newNC ? "N.C." : "N.C. removed", "info")
          return
        }

        // t — toggle triplet
        if (e.key === "t" && selection.beatId && selection.sectionId && selection.measureId) {
          e.preventDefault()
          const beat = getSelectedBeat()
          if (!beat) return

          const currentDiv = beat.division as string

          // If already a triplet, revert to base
          if (UNTRIPLET_MAP[currentDiv]) {
            setBeatDivision(selection.sectionId, selection.measureId, selection.beatId, UNTRIPLET_MAP[currentDiv])
            showToast(`Triplet removed → ${UNTRIPLET_MAP[currentDiv]}`, "info")
            return
          }

          // Convert to triplet — must be on the first slot of the beat
          const tripletDiv = TRIPLET_MAP[currentDiv]
          if (!tripletDiv) {
            showToast(`No triplet available for ${currentDiv}`, "warning")
            return
          }

          // Check that selected slot is the first in this beat
          if (selection.slotId && selection.slotId !== beat.slots[0]?.id) {
            showToast("Select the first note in the beat to create a triplet", "warning")
            return
          }

          setBeatDivision(selection.sectionId, selection.measureId, selection.beatId, tripletDiv)
          showToast(`Triplet: ${currentDiv} → ${tripletDiv}`, "info")
          return
        }

        // Articulation keys
        if (ARTICULATION_KEYS[e.key] && selection.slotId) {
          e.preventDefault()
          const slot = getSelectedSlot()
          if (!slot) return

          const currentArt = slot.slash.articulation
          const newArt = ARTICULATION_KEYS[e.key]
          const toggledArt = currentArt === newArt ? "none" : newArt

          updateSlot(selection.sectionId, selection.measureId!, selection.beatId!, selection.slotId, {
            slash: { ...slot.slash, articulation: toggledArt },
          })
          return
        }

        // 0 — toggle rest (legacy, kept for compatibility)
        if (e.key === "0" && selection.slotId) {
          e.preventDefault()
          const slot = getSelectedSlot()
          if (!slot) return
          updateSlot(selection.sectionId, selection.measureId!, selection.beatId!, selection.slotId, {
            slash: { ...slot.slash, rest: !slot.slash.rest },
          })
          return
        }

        // ] — toggle tie
        if (e.key === "]" && selection.slotId) {
          e.preventDefault()
          const slot = getSelectedSlot()
          if (!slot) return
          updateSlot(selection.sectionId, selection.measureId!, selection.beatId!, selection.slotId, {
            slash: { ...slot.slash, tied: !slot.slash.tied },
          })
          return
        }

        // x — flip stem direction (up/down) on all slots in the beat
        if (e.key === "x" && selection.beatId && selection.sectionId && selection.measureId) {
          e.preventDefault()
          const beat = getSelectedBeat()
          if (!beat) return
          const newDir = beat.slots[0]?.slash.stemDirection === "up" ? "down" : "up"
          for (const slot of beat.slots) {
            updateSlot(selection.sectionId, selection.measureId, selection.beatId, slot.id, {
              slash: { ...slot.slash, stemDirection: newDir },
            })
          }
          showToast(`Stems: ${newDir}`, "info")
          return
        }

        // y — toggle stems on/off for all slots in the beat
        if (e.key === "y" && selection.beatId && selection.sectionId && selection.measureId) {
          e.preventDefault()
          const beat = getSelectedBeat()
          if (!beat) return
          const newStem = !beat.slots[0]?.slash.stem
          for (const slot of beat.slots) {
            updateSlot(selection.sectionId, selection.measureId, selection.beatId, slot.id, {
              slash: { ...slot.slash, stem: newStem },
            })
          }
          showToast(`Stems ${newStem ? "on" : "off"}`, "info")
          return
        }
      }

      // ── Chord mode: let key events pass through to chord input ──
    },
    [selection, editMode, getEntries, findCurrentIndex, selectByIndex, setSelection, setBeatDivision, updateSlot, undo, redo, toggleEditMode, getSelectedSlot, getSelectedBeat, showToast]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}

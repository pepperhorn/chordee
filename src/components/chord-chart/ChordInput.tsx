import { useState, useEffect, useRef, useCallback } from "react"
import { useChartStore } from "@/lib/store"
import { parseChord } from "@/lib/chordParser"
import { formatChord } from "@/lib/utils"
import { RELATIVE_SIZE_SCALE } from "@/lib/fonts"
import type { LayoutResult } from "@/lib/layout/types"

const BASE_CHORD_FONT_SIZE = 18

interface ChordInputProps {
  layout: LayoutResult
}

export function ChordInput({ layout }: ChordInputProps) {
  const selection = useChartStore((s) => s.ui.selection)
  const setSlotChord = useChartStore((s) => s.setSlotChord)
  const setSlotNashville = useChartStore((s) => s.setSlotNashville)
  const notationType = useChartStore((s) => s.chart.meta.notationType)
  const editMode = useChartStore((s) => s.ui.editMode)
  const setSelection = useChartStore((s) => s.setSelection)
  const chordFont = useChartStore((s) => s.ui.fontConfig.chord)
  const chordSize = useChartStore((s) => s.ui.fontConfig.chordSize)
  const zoom = useChartStore((s) => s.ui.zoom)

  const [value, setValue] = useState("")
  const [error, setError] = useState("")
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const isNashville = notationType === "nashville"

  // Find the selected slot's position entry
  const selectedEntry = selection?.slotId
    ? layout.positionMap.entries.find((e) => e.target.slotId === selection.slotId)
    : null

  // Position the input by finding the actual SVG slot group in the DOM
  useEffect(() => {
    if (!selectedEntry || !selection?.slotId || editMode !== "chord") {
      setPos(null)
      return
    }

    // Find the slot's SVG group element
    const slotEl = document.querySelector(`.slot-group[data-slot-id="${selection.slotId}"]`)
    if (!slotEl) {
      setPos(null)
      return
    }

    // Find the chart-zoom-wrapper (positioned parent for the input overlay)
    const zoomWrapper = slotEl.closest(".chart-zoom-wrapper")
    const container = slotEl.closest(".chart-container")
    if (!container || !zoomWrapper) {
      setPos(null)
      return
    }
    containerRef.current = container as HTMLDivElement

    const slotRect = slotEl.getBoundingClientRect()
    const wrapperRect = zoomWrapper.getBoundingClientRect()
    const zoomScale = zoom / 100

    // Find a visible chord-symbol on the same line to get the correct chord text Y
    const lineGroup = slotEl.closest(".chart-line")
    const refChord = lineGroup?.querySelector(".chord-symbol") as SVGTextElement | null
    const refRect = refChord?.getBoundingClientRect()

    // Position relative to the zoom wrapper, undoing the zoom transform
    // Use the reference chord's top for vertical alignment (matches rendered chord baseline)
    setPos({
      left: (slotRect.left - wrapperRect.left) / zoomScale + (slotRect.width / zoomScale) / 2,
      top: refRect
        ? (refRect.top - wrapperRect.top) / zoomScale - 2
        : (slotRect.top - wrapperRect.top) / zoomScale - 2,
    })
  }, [selectedEntry?.target.slotId, editMode, zoom, layout])

  // Focus input when a slot is selected (chord mode only)
  useEffect(() => {
    if (selectedEntry && inputRef.current && editMode === "chord") {
      const chart = useChartStore.getState().chart
      const section = chart.sections.find((s) => s.id === selection!.sectionId)
      const measure = section?.measures.find((m) => m.id === selection!.measureId)
      const beat = measure?.beats.find((b) => b.id === selection!.beatId)
      const slot = beat?.slots.find((s) => s.id === selection!.slotId)

      if (slot?.chord) {
        setValue(formatChord(slot.chord))
      } else if (slot?.nashvilleChord) {
        setValue(slot.nashvilleChord.degree + (slot.nashvilleChord.quality || ""))
      } else {
        setValue("")
      }

      setError("")
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [selectedEntry?.target.slotId, editMode, pos])

  const handleSubmit = useCallback(() => {
    if (!selection?.slotId || !selection.sectionId || !selection.measureId || !selection.beatId) return

    if (!value.trim()) {
      setSlotChord(selection.sectionId, selection.measureId, selection.beatId, selection.slotId, null)
      if (isNashville) {
        setSlotNashville(selection.sectionId, selection.measureId, selection.beatId, selection.slotId, null)
      }
      setError("")
      return
    }

    const result = parseChord(value, isNashville)
    if (!result.valid) {
      setError(result.error || "Invalid chord")
      return
    }

    if (isNashville && result.nashvilleChord) {
      setSlotNashville(
        selection.sectionId,
        selection.measureId,
        selection.beatId,
        selection.slotId,
        result.nashvilleChord
      )
      setSlotChord(selection.sectionId, selection.measureId, selection.beatId, selection.slotId, null)
    } else if (result.chord) {
      setSlotChord(
        selection.sectionId,
        selection.measureId,
        selection.beatId,
        selection.slotId,
        result.chord
      )
      if (isNashville) {
        setSlotNashville(selection.sectionId, selection.measureId, selection.beatId, selection.slotId, null)
      }
    }

    setError("")
  }, [selection, value, isNashville, setSlotChord, setSlotNashville])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSubmit()
        // Move to next slot
        const entries = layout.positionMap.entries
        const idx = entries.findIndex((en) => en.target.slotId === selection?.slotId)
        if (idx >= 0 && idx < entries.length - 1) {
          const next = entries[idx + 1].target
          setSelection({
            type: "slot",
            sectionId: next.sectionId,
            measureId: next.measureId,
            beatId: next.beatId,
            slotId: next.slotId,
          })
        }
      }
      if (e.key === "Escape") {
        e.preventDefault()
        inputRef.current?.blur()
        setSelection(null)
      }
      // Let Ctrl+Shift+Arrow pass through for subdivision cycling
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        return
      }
      // Let k pass through for key signature picker
      if (e.key === "k") {
        return
      }
      // Let l pass through for listen mode toggle
      if (e.key === "l") {
        return
      }
      e.stopPropagation()
    },
    [handleSubmit, layout, selection, setSelection]
  )

  // Hide on mobile — the mobile control panel handles chord entry
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768
  if (!selectedEntry || !selection?.slotId || editMode !== "chord" || isMobile || !pos) return null

  const scale = RELATIVE_SIZE_SCALE[chordSize] ?? 1
  const fontSize = Math.round(BASE_CHORD_FONT_SIZE * scale)

  return (
    <div
      className="chord-input-inline absolute z-50"
      data-slot-id={selection.slotId}
      style={{
        left: pos.left,
        top: pos.top,
        transform: "translateX(-50%)",
      }}
    >
      <input
        ref={inputRef}
        className={`chord-input-field rounded border border-red-500 bg-white/80 px-1 outline-none caret-red-500 ${
          error ? "chord-input-field--error border-destructive text-destructive" : ""
        }`}
        style={{
          fontFamily: `${chordFont}, serif`,
          fontSize,
          lineHeight: 1,
          textAlign: "center",
          width: `${Math.max(value.length + 1, 3)}ch`,
          minWidth: "3ch",
          color: error ? undefined : "currentColor",
        }}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setError("")
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleSubmit}
        placeholder={isNashville ? "4m7" : "Am7"}
        spellCheck={false}
        autoComplete="off"
        aria-label="Chord input"
        aria-invalid={!!error}
      />
      {error && (
        <span className="chord-input-error absolute left-0 top-full mt-0.5 whitespace-nowrap text-[10px] text-destructive" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

import { useState, useEffect, useRef, useCallback } from "react"
import { useChartStore } from "@/lib/store"
import type { LayoutResult } from "@/lib/layout/types"

interface DynamicInputProps {
  layout: LayoutResult
}

export function DynamicInput({ layout }: DynamicInputProps) {
  const selection = useChartStore((s) => s.ui.selection)
  const activeInput = useChartStore((s) => s.ui.activeInput)
  const updateBeat = useChartStore((s) => s.updateBeat)
  const setActiveInput = useChartStore((s) => s.setActiveInput)

  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Find position from layout — use the first slot of the selected beat
  const selectedEntry = selection?.slotId
    ? layout.positionMap.entries.find((e) => e.target.slotId === selection.slotId)
    : null

  // Load current dynamic value and focus
  useEffect(() => {
    if (activeInput === "dynamic" && selectedEntry && inputRef.current) {
      const chart = useChartStore.getState().chart
      const section = chart.sections.find((s) => s.id === selection!.sectionId)
      const measure = section?.measures.find((m) => m.id === selection!.measureId)
      const beat = measure?.beats.find((b) => b.id === selection!.beatId)

      setValue(beat?.dynamics || "")

      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [activeInput, selectedEntry?.target.slotId])

  const handleSubmit = useCallback(() => {
    if (!selection?.beatId || !selection.sectionId || !selection.measureId) return

    updateBeat(selection.sectionId, selection.measureId, selection.beatId, {
      dynamics: value.trim() || undefined,
    })

    setActiveInput("none")
  }, [selection, value, updateBeat, setActiveInput])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSubmit()
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setActiveInput("none")
      }
      e.stopPropagation()
    },
    [handleSubmit, setActiveInput]
  )

  if (activeInput !== "dynamic" || !selectedEntry || !selection?.beatId) return null

  const { rect } = selectedEntry

  return (
    <div
      className="dynamic-input-popover absolute z-50"
      data-beat-id={selection.beatId}
      style={{
        left: rect.x - 5,
        top: rect.y + rect.height - 4,
      }}
    >
      <div className="dynamic-input-wrapper flex flex-col">
        <input
          ref={inputRef}
          className="dynamic-input-field h-6 w-20 rounded border border-input bg-background px-2 text-xs italic shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          placeholder="e.g. mf"
          spellCheck={false}
          autoComplete="off"
          aria-label="Dynamic marking"
        />
      </div>
    </div>
  )
}

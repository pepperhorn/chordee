import { useState, useEffect, useRef } from "react"
import { useChartStore } from "@/lib/store"
import { formatChord, getInheritedChord } from "@/lib/utils"
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import type { LayoutResult } from "@/lib/layout/types"
import { TouchControls } from "./TouchControls"

interface MobileBarProps {
  layout: LayoutResult | null
}

export function MobileBar({ layout }: MobileBarProps) {
  const [expanded, setExpanded] = useState(false)

  const selection = useChartStore((s) => s.ui.selection)
  const setSelection = useChartStore((s) => s.setSelection)
  const chart = useChartStore((s) => s.chart)

  // Auto-expand when a slot is selected on mobile
  const prevSlotId = useRef(selection?.slotId)
  useEffect(() => {
    if (selection?.slotId && selection.slotId !== prevSlotId.current) {
      setExpanded(true)
    }
    prevSlotId.current = selection?.slotId
  }, [selection?.slotId])

  // Current chord display for nav bar
  const currentSlot = (() => {
    if (!selection?.slotId || !selection.beatId) return null
    const sec = chart.sections.find((s) => s.id === selection.sectionId)
    const mea = sec?.measures.find((m) => m.id === selection.measureId)
    const beat = mea?.beats.find((b) => b.id === selection.beatId)
    return beat?.slots.find((s) => s.id === selection.slotId) ?? null
  })()
  const isNC = currentSlot?.noChord ?? false
  const currentChordText = isNC ? "N.C." : currentSlot?.chord ? formatChord(currentSlot.chord) : ""
  const inheritedChord = (!currentSlot?.chord && !isNC && selection?.slotId)
    ? getInheritedChord(chart, selection.sectionId, selection.measureId!, selection.beatId!, selection.slotId)
    : null
  const displayChordText = currentChordText || (inheritedChord ? formatChord(inheritedChord.chord) : "")
  const isInherited = !currentChordText && !!inheritedChord

  // Navigation helpers
  const entries = layout?.positionMap.entries ?? []
  const currentIdx = selection?.slotId
    ? entries.findIndex((e) => e.target.slotId === selection.slotId)
    : -1

  const navLeft = () => {
    if (currentIdx > 0) {
      const t = entries[currentIdx - 1].target
      setSelection({ type: "slot", sectionId: t.sectionId, measureId: t.measureId, beatId: t.beatId, slotId: t.slotId })
    }
  }
  const navRight = () => {
    if (currentIdx >= 0 && currentIdx < entries.length - 1) {
      const t = entries[currentIdx + 1].target
      setSelection({ type: "slot", sectionId: t.sectionId, measureId: t.measureId, beatId: t.beatId, slotId: t.slotId })
    }
  }

  if (!expanded) {
    return (
      <div className="mobile-keyboard hidden max-md:block">
        <button
          className="mobile-kb-open fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg active:scale-95 transition-transform"
          onClick={() => setExpanded(true)}
        >
          <ChevronUp className="h-4 w-4" />
          Controls
        </button>
      </div>
    )
  }

  return (
    <div className="mobile-keyboard hidden max-md:block fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
      {/* Nav + close row */}
      <div className="mobile-kb-nav flex items-center border-b px-2 py-1">
        <button
          className="mobile-kb-nav-btn rounded p-1.5 text-foreground active:bg-muted disabled:opacity-30"
          onClick={navLeft}
          disabled={currentIdx <= 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="mobile-kb-nav-info flex-1 text-center text-xs text-muted-foreground truncate px-1">
          {displayChordText
            ? <span className={isInherited ? "opacity-50 italic" : "font-medium text-foreground"}>{displayChordText}{isInherited ? " (inherited)" : ""}</span>
            : selection ? "No chord" : "Tap a beat"
          }
        </div>
        <button
          className="mobile-kb-nav-btn rounded p-1.5 text-foreground active:bg-muted disabled:opacity-30"
          onClick={navRight}
          disabled={currentIdx < 0 || currentIdx >= entries.length - 1}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <button
          className="mobile-kb-close ml-1 rounded p-1.5 text-muted-foreground active:text-foreground"
          onClick={() => setExpanded(false)}
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      <TouchControls />
    </div>
  )
}

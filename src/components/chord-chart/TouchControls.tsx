import { useState } from "react"
import { useChartStore } from "@/lib/store"
import { formatChord, getInheritedChord } from "@/lib/utils"
import type { Division } from "@/lib/schema"

const DIVISIONS: { div: Division; label: string; symbol: string }[] = [
  { div: "whole", label: "Whole", symbol: "𝅝" },
  { div: "half", label: "Half", symbol: "𝅗𝅥" },
  { div: "quarter", label: "Quarter", symbol: "♩" },
  { div: "eighth", label: "8th", symbol: "♪" },
  { div: "sixteenth", label: "16th", symbol: "♬" },
  { div: "thirtySecond", label: "32nd", symbol: "𝅘𝅥𝅰" },
]

const CHORD_ROOTS = ["C", "D", "E", "F", "G", "A", "B"]

const EXT_CYCLES: { label: string; variants: string[] }[] = [
  { label: "5", variants: ["b5", "#5"] },
  { label: "9", variants: ["b9", "#9", "b9#9"] },
  { label: "11", variants: ["b11", "#11"] },
  { label: "13", variants: ["b13", "#13"] },
  { label: "6/9", variants: ["6/9"] },
  { label: "no3", variants: ["no3"] },
  { label: "no5", variants: ["no5"] },
  { label: "add2", variants: ["add2"] },
  { label: "add4", variants: ["add4"] },
  { label: "add11", variants: ["add11"] },
  { label: "add13", variants: ["add13"] },
]

const QUALITIES = [
  { value: "maj", label: "maj" },
  { value: "min", label: "min" },
  { value: "dom7", label: "7" },
  { value: "maj7", label: "maj7" },
  { value: "min7", label: "m7" },
  { value: "dim", label: "dim" },
  { value: "aug", label: "aug" },
  { value: "hdim7", label: "m7b5" },
  { value: "sus4", label: "sus4" },
  { value: "sus2", label: "sus2" },
  { value: "6", label: "6" },
  { value: "9", label: "9" },
]

interface TouchControlsProps {
  compact?: boolean
}

export function TouchControls({ compact = false }: TouchControlsProps) {
  const [chordRoot, setChordRoot] = useState("")
  const [chordAcc, setChordAcc] = useState("")
  const [chordExts, setChordExts] = useState<string[]>([])

  const selection = useChartStore((s) => s.ui.selection)
  const editMode = useChartStore((s) => s.ui.editMode)
  const setBeatDivision = useChartStore((s) => s.setBeatDivision)
  const updateSlot = useChartStore((s) => s.updateSlot)
  const setSlotChord = useChartStore((s) => s.setSlotChord)
  const setActiveInput = useChartStore((s) => s.setActiveInput)
  const showToast = useChartStore((s) => s.showToast)
  const undo = useChartStore((s) => s.undo)
  const redo = useChartStore((s) => s.redo)
  const chart = useChartStore((s) => s.chart)

  const currentBeat = (() => {
    if (!selection?.beatId) return null
    const sec = chart.sections.find((s) => s.id === selection.sectionId)
    const mea = sec?.measures.find((m) => m.id === selection.measureId)
    return mea?.beats.find((b) => b.id === selection.beatId) ?? null
  })()
  const currentSlot = (() => {
    if (!selection?.slotId || !currentBeat) return null
    return currentBeat.slots.find((s) => s.id === selection.slotId) ?? null
  })()
  const currentDiv = currentBeat?.division ?? "quarter"
  const currentArt = currentSlot?.slash.articulation ?? "none"
  const isRest = currentSlot?.slash.rest ?? false
  const isTied = currentSlot?.slash.tied ?? false
  const stemDir = currentSlot?.slash.stemDirection ?? "up"
  const isNC = currentSlot?.noChord ?? false
  const currentChordText = isNC ? "N.C." : currentSlot?.chord ? formatChord(currentSlot.chord) : ""

  const inheritedChord = (!currentSlot?.chord && !isNC && selection?.slotId)
    ? getInheritedChord(chart, selection.sectionId, selection.measureId!, selection.beatId!, selection.slotId)
    : null
  const displayChordText = currentChordText || (inheritedChord ? formatChord(inheritedChord.chord) : "")
  const isInherited = !currentChordText && !!inheritedChord

  const handleDivision = (div: Division) => {
    if (!selection?.beatId || !selection.sectionId || !selection.measureId) return
    setBeatDivision(selection.sectionId, selection.measureId, selection.beatId, div)
  }

  const handleRest = () => {
    if (!selection?.slotId || !selection.sectionId || !selection.measureId || !selection.beatId) return
    if (!currentSlot) return
    updateSlot(selection.sectionId, selection.measureId, selection.beatId, selection.slotId, {
      slash: { ...currentSlot.slash, rest: !currentSlot.slash.rest },
    })
  }

  const handleTie = () => {
    if (!selection?.slotId || !selection.sectionId || !selection.measureId || !selection.beatId) return
    if (!currentSlot) return
    updateSlot(selection.sectionId, selection.measureId, selection.beatId, selection.slotId, {
      slash: { ...currentSlot.slash, tied: !currentSlot.slash.tied },
    })
  }

  const handleArticulation = (art: string) => {
    if (!selection?.slotId || !selection.sectionId || !selection.measureId || !selection.beatId) return
    if (!currentSlot) return
    const toggled = currentSlot.slash.articulation === art ? "none" : art
    updateSlot(selection.sectionId, selection.measureId, selection.beatId, selection.slotId, {
      slash: { ...currentSlot.slash, articulation: toggled },
    })
  }

  const handleStemFlip = () => {
    if (!selection?.beatId || !selection.sectionId || !selection.measureId) return
    const chart = useChartStore.getState().chart
    const sec = chart.sections.find((s) => s.id === selection.sectionId)
    const mea = sec?.measures.find((m) => m.id === selection.measureId)
    const beat = mea?.beats.find((b) => b.id === selection.beatId)
    if (!beat) return
    const newDir = beat.slots[0]?.slash.stemDirection === "up" ? "down" : "up"
    for (const slot of beat.slots) {
      updateSlot(selection.sectionId, selection.measureId, selection.beatId, slot.id, {
        slash: { ...slot.slash, stemDirection: newDir },
      })
    }
  }

  const handleChordSelect = (quality: string) => {
    if (!chordRoot || !selection?.slotId || !selection.sectionId || !selection.measureId || !selection.beatId) return
    setSlotChord(selection.sectionId, selection.measureId, selection.beatId, selection.slotId, {
      root: chordRoot + chordAcc,
      quality,
      extensions: chordExts.length > 0 ? chordExts : undefined,
    })
    const extStr = chordExts.length > 0 ? chordExts.join("") : ""
    showToast(`${chordRoot}${chordAcc}${quality === "maj" ? "" : quality}${extStr}`, "info")
    setChordRoot("")
    setChordAcc("")
    setChordExts([])
  }

  const handleClearChord = () => {
    if (!selection?.slotId || !selection.sectionId || !selection.measureId || !selection.beatId) return
    setSlotChord(selection.sectionId, selection.measureId, selection.beatId, selection.slotId, null)
    setChordRoot("")
    setChordAcc("")
    setChordExts([])
    showToast("Chord cleared", "info")
  }

  // Sizing classes based on compact mode
  const btnH = compact ? "h-7" : "h-9"
  const btnHLg = compact ? "h-8" : "h-10"
  const btnHSm = compact ? "h-6" : "h-8"
  const gap = compact ? "gap-1" : "gap-1.5"
  const pad = compact ? "p-1.5" : "p-2"
  const space = compact ? "space-y-1.5" : "space-y-2"
  const textSm = compact ? "text-[9px]" : "text-[10px]"
  const textBase = compact ? "text-xs" : "text-xs"
  const symbolSize = compact ? "text-sm" : "text-base"

  const btnClass = `touch-ctrl-btn flex items-center justify-center rounded-md bg-muted text-foreground ${textBase} font-medium active:bg-primary active:text-primary-foreground transition-colors`
  const btnActiveClass = `touch-ctrl-btn flex items-center justify-center rounded-md bg-primary text-primary-foreground ${textBase} font-medium`

  return (
    <div className="touch-controls">
      {/* Mode toggle */}
      <div className="touch-ctrl-mode flex border-b">
        <button
          className={`touch-ctrl-mode-btn flex-1 py-1.5 text-xs font-semibold transition-colors ${
            editMode === "chord"
              ? "bg-red-600 text-white"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => { useChartStore.getState().setEditMode("chord") }}
        >
          Chord
        </button>
        <button
          className={`touch-ctrl-mode-btn flex-1 py-1.5 text-xs font-semibold transition-colors ${
            editMode === "rhythm"
              ? "bg-red-600 text-white"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => { useChartStore.getState().setEditMode("rhythm") }}
        >
          Rhythm
        </button>
      </div>

      {/* Current chord info */}
      {compact && (
        <div className="touch-ctrl-chord-info border-b px-2 py-1 text-center text-xs text-muted-foreground truncate">
          {displayChordText
            ? <span className={isInherited ? "opacity-50 italic" : "font-medium text-foreground"}>{displayChordText}{isInherited ? " (inh.)" : ""}</span>
            : selection ? "No chord" : "Select a beat"
          }
        </div>
      )}

      {/* Rhythm mode controls */}
      {editMode === "rhythm" && (
        <div className={`touch-ctrl-rhythm ${pad} ${space}`}>
          {/* Subdivisions */}
          <div className={`touch-ctrl-row grid grid-cols-6 ${gap}`}>
            {DIVISIONS.map((d) => (
              <button
                key={d.div}
                className={currentDiv === d.div ? `${btnActiveClass} ${btnHLg}` : `${btnClass} ${btnHLg}`}
                onClick={() => handleDivision(d.div)}
              >
                <span className={symbolSize}>{d.symbol}</span>
              </button>
            ))}
          </div>

          {/* Actions row */}
          <div className={`touch-ctrl-row grid grid-cols-6 ${gap}`}>
            <button className={isRest ? `${btnActiveClass} ${btnH}` : `${btnClass} ${btnH}`} onClick={handleRest}>Rest</button>
            <button className={isTied ? `${btnActiveClass} ${btnH}` : `${btnClass} ${btnH}`} onClick={handleTie}>Tie</button>
            <button className={stemDir === "down" ? `${btnActiveClass} ${btnH}` : `${btnClass} ${btnH}`} onClick={handleStemFlip}>Flip</button>
            <button className={currentArt === "accent" ? `${btnActiveClass} ${btnH}` : `${btnClass} ${btnH}`} onClick={() => handleArticulation("accent")}>&gt;</button>
            <button className={currentArt === "staccato" ? `${btnActiveClass} ${btnH}` : `${btnClass} ${btnH}`} onClick={() => handleArticulation("staccato")}>.</button>
            <button className={currentArt === "marcato" ? `${btnActiveClass} ${btnH}` : `${btnClass} ${btnH}`} onClick={() => handleArticulation("marcato")}>^</button>
          </div>

          {/* Tools row */}
          <div className={`touch-ctrl-row grid grid-cols-5 ${gap}`}>
            <button className={currentArt === "legato" ? `${btnActiveClass} ${btnH}` : `${btnClass} ${btnH}`} onClick={() => handleArticulation("legato")}>–</button>
            <button className={`${btnClass} ${btnH}`} onClick={() => setActiveInput("timesig")}>T.S.</button>
            <button className={`${btnClass} ${btnH}`} onClick={() => setActiveInput("keysig")}>Key</button>
            <button className={`${btnClass} ${btnH}`} onClick={undo}>Undo</button>
            <button className={`${btnClass} ${btnH}`} onClick={redo}>Redo</button>
          </div>
        </div>
      )}

      {/* Chord mode controls */}
      {editMode === "chord" && (
        <div className={`touch-ctrl-chord ${pad} ${space}`}>
          {/* Current chord display */}
          <div className="touch-ctrl-chord-display flex items-center gap-2 rounded bg-muted px-2 py-1">
            <span className={`${compact ? "text-xs" : "text-sm"} font-medium text-foreground`}>
              {chordRoot
                ? `${chordRoot}${chordAcc}${chordExts.length ? chordExts.join("") : ""} → quality`
                : currentChordText
                  ? `Current: ${currentChordText}`
                  : isInherited
                    ? <span className="italic opacity-60">Inherited: {displayChordText}</span>
                    : "Select root..."}
            </span>
            {chordRoot && (
              <button className="ml-auto text-xs text-muted-foreground" onClick={() => { setChordRoot(""); setChordAcc("") }}>
                Clear
              </button>
            )}
          </div>

          {/* Root */}
          <div className={`touch-ctrl-section-label px-1 ${compact ? "text-[8px]" : "text-[9px]"} font-semibold uppercase tracking-wider text-muted-foreground`}>Root</div>
          <div className={`touch-ctrl-row grid ${compact ? "grid-cols-5" : "grid-cols-10"} gap-1`}>
            {CHORD_ROOTS.map((r) => {
              const isBuilding = chordRoot === r
              const isCurrent = !chordRoot && currentSlot?.chord?.root?.startsWith(r)
              return (
                <button
                  key={r}
                  className={isBuilding || isCurrent ? `${btnActiveClass} ${btnH}` : `${btnClass} ${btnH}`}
                  onClick={() => { setChordRoot(r); setChordAcc(""); setChordExts([]) }}
                >
                  {r}
                </button>
              )
            })}
            {(["", "#", "b"] as const).map((acc) => {
              const label = acc === "" ? "♮" : acc
              const isBuilding = chordRoot && chordAcc === acc
              const isCurrent = !chordRoot && currentSlot?.chord?.root && (
                acc === "" ? !currentSlot.chord.root.includes("#") && !currentSlot.chord.root.includes("b") :
                currentSlot.chord.root.includes(acc)
              )
              return (
                <button
                  key={acc || "nat"}
                  className={isBuilding || isCurrent ? `${btnActiveClass} ${btnH}` : `${btnClass} ${btnH}`}
                  onClick={() => setChordAcc(acc)}
                  disabled={!chordRoot}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="touch-ctrl-divider h-px bg-border mx-1" />

          {/* Quality */}
          <div className={`touch-ctrl-section-label px-1 ${compact ? "text-[8px]" : "text-[9px]"} font-semibold uppercase tracking-wider text-muted-foreground`}>Quality</div>
          <div className={`touch-ctrl-row grid ${compact ? "grid-cols-4" : "grid-cols-6"} gap-1`}>
            {QUALITIES.map((q) => {
              const isCurrent = currentSlot?.chord?.quality === q.value
              return (
                <button
                  key={q.value}
                  className={isCurrent && !chordRoot ? `${btnActiveClass} ${btnHSm} ${textSm}` : `${btnClass} ${btnHSm} ${textSm}`}
                  onClick={() => handleChordSelect(q.value)}
                  disabled={!chordRoot}
                >
                  {q.label}
                </button>
              )
            })}
          </div>

          <div className="touch-ctrl-divider h-px bg-border mx-1" />

          {/* Extensions */}
          <div className={`touch-ctrl-section-label px-1 ${compact ? "text-[8px]" : "text-[9px]"} font-semibold uppercase tracking-wider text-muted-foreground`}>
            Ext {chordExts.length > 0 && <span className="text-primary">{chordExts.join(" ")}</span>}
          </div>
          <div className={`touch-ctrl-row grid ${compact ? "grid-cols-4" : "grid-cols-6"} gap-1`}>
            {EXT_CYCLES.map((cycle) => {
              const isBuilding = !!chordRoot
              const slotExts = currentSlot?.chord?.extensions ?? []
              const sourceExts = isBuilding ? chordExts : slotExts
              const activeVariant = sourceExts.find(e => cycle.variants.includes(e))
              const display = activeVariant || cycle.label
              const isActive = !!activeVariant
              return (
                <button
                  key={cycle.label}
                  className={isActive ? `${btnActiveClass} ${btnH} ${textSm}` : `${btnClass} ${btnH} ${textSm}`}
                  onClick={() => {
                    const variants = cycle.variants
                    const currentIdx = activeVariant ? variants.indexOf(activeVariant) : -1
                    let cleaned = sourceExts.filter(e => !variants.includes(e))
                    if (cycle.label === "no5") cleaned = cleaned.filter(e => e !== "b5" && e !== "#5")
                    if (cycle.label === "5") cleaned = cleaned.filter(e => e !== "no5")
                    const newExts = currentIdx < variants.length - 1
                      ? [...cleaned, variants[currentIdx + 1]]
                      : cleaned

                    if (isBuilding) {
                      setChordExts(newExts)
                    } else if (currentSlot?.chord && selection?.slotId && selection.sectionId && selection.measureId && selection.beatId) {
                      setSlotChord(selection.sectionId, selection.measureId, selection.beatId, selection.slotId, {
                        ...currentSlot.chord,
                        extensions: newExts.length > 0 ? newExts : undefined,
                      })
                    }
                  }}
                >
                  {display}
                </button>
              )
            })}
          </div>

          {/* Clear chord / N.C. / undo/redo */}
          <div className={`touch-ctrl-row grid grid-cols-4 ${gap}`}>
            <button className={`${btnClass} ${btnHSm}`} onClick={handleClearChord}>Clear</button>
            <button
              className={currentSlot?.noChord ? `${btnActiveClass} ${btnHSm}` : `${btnClass} ${btnHSm}`}
              onClick={() => {
                if (!selection?.slotId || !selection.sectionId || !selection.measureId || !selection.beatId) return
                if (!currentSlot) return
                const newNC = !currentSlot.noChord
                updateSlot(selection.sectionId, selection.measureId, selection.beatId, selection.slotId, {
                  noChord: newNC,
                  chord: newNC ? null : currentSlot.chord,
                })
                showToast(newNC ? "N.C." : "N.C. removed", "info")
              }}
            >
              N.C.
            </button>
            <button className={`${btnClass} ${btnHSm}`} onClick={undo}>Undo</button>
            <button className={`${btnClass} ${btnHSm}`} onClick={redo}>Redo</button>
          </div>
        </div>
      )}
    </div>
  )
}

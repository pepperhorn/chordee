import { useChartStore } from "@/lib/store"
import { TIME_SIGNATURES } from "@/lib/constants"

interface TimeSigPickerProps {
  sectionId: string
  onClose: () => void
  anchorX: number
  anchorY: number
}

export function TimeSigPicker({ sectionId, onClose, anchorX, anchorY }: TimeSigPickerProps) {
  const setSectionTimeSignature = useChartStore((s) => s.setSectionTimeSignature)
  const showToast = useChartStore((s) => s.showToast)

  const handleSelect = (beats: number, beatUnit: 2 | 4 | 8 | 16) => {
    setSectionTimeSignature(sectionId, beats, beatUnit)
    showToast(`Time signature: ${beats}/${beatUnit}`, "info")
    onClose()
  }

  return (
    <div
      className="time-sig-picker absolute z-50 rounded-md border bg-popover p-2 shadow-lg"
      style={{ left: anchorX, top: anchorY }}
    >
      <div className="time-sig-picker-grid grid grid-cols-4 gap-1">
        {TIME_SIGNATURES.map((ts) => (
          <button
            key={ts.label}
            className="time-sig-picker-btn rounded px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleSelect(ts.beats, ts.beatUnit)}
          >
            {ts.label}
          </button>
        ))}
      </div>
    </div>
  )
}

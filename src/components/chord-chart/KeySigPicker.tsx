import { useChartStore } from "@/lib/store"

const KEYS = [
  { label: "C / Am", value: "C" },
  { label: "G / Em", value: "G" },
  { label: "D / Bm", value: "D" },
  { label: "A / F#m", value: "A" },
  { label: "E / C#m", value: "E" },
  { label: "B / G#m", value: "B" },
  { label: "F# / D#m", value: "F#" },
  { label: "C# / A#m", value: "C#" },
  { label: "F / Dm", value: "F" },
  { label: "Bb / Gm", value: "Bb" },
  { label: "Eb / Cm", value: "Eb" },
  { label: "Ab / Fm", value: "Ab" },
  { label: "Db / Bbm", value: "Db" },
  { label: "Gb / Ebm", value: "Gb" },
  { label: "Cb / Abm", value: "Cb" },
]

interface KeySigPickerProps {
  onClose: () => void
  anchorX: number
  anchorY: number
}

export function KeySigPicker({ onClose, anchorX, anchorY }: KeySigPickerProps) {
  const updateMeta = useChartStore((s) => s.updateMeta)
  const showToast = useChartStore((s) => s.showToast)
  const currentKey = useChartStore((s) => s.chart.meta.key)

  const handleSelect = (key: string) => {
    updateMeta({ key, showKeySignature: true })
    showToast(`Key: ${key}`, "info")
    onClose()
  }

  return (
    <div
      className="key-sig-picker absolute z-50 rounded-md border bg-popover p-2 shadow-lg"
      style={{ left: anchorX, top: anchorY }}
    >
      <div className="key-sig-picker-grid grid grid-cols-3 gap-1">
        {KEYS.map((k) => (
          <button
            key={k.value}
            className={`key-sig-picker-btn rounded px-2 py-1 text-xs transition-colors ${
              currentKey === k.value
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={() => handleSelect(k.value)}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  )
}

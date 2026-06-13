import { useChartStore } from "@/lib/store"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

const TIME_SIG_OPTIONS: Array<{ beats: number; beatUnit: 2 | 4 | 8 | 16; label: string }> = [
  { beats: 2, beatUnit: 4, label: "2/4" },
  { beats: 3, beatUnit: 4, label: "3/4" },
  { beats: 4, beatUnit: 4, label: "4/4" },
  { beats: 5, beatUnit: 4, label: "5/4" },
  { beats: 6, beatUnit: 8, label: "6/8" },
  { beats: 7, beatUnit: 4, label: "7/4" },
  { beats: 9, beatUnit: 8, label: "9/8" },
  { beats: 11, beatUnit: 4, label: "11/4" },
  { beats: 11, beatUnit: 8, label: "11/8" },
  { beats: 13, beatUnit: 4, label: "13/4" },
  { beats: 13, beatUnit: 8, label: "13/8" },
]

const DISPLAY_OPTIONS: Array<{ value: "auto" | "always" | "never"; label: string; hint: string }> = [
  { value: "auto", label: "Auto", hint: "Show only on transitions" },
  { value: "always", label: "Always", hint: "Always show at section start" },
  { value: "never", label: "Never", hint: "Hide at section start" },
]

export function TimePanel() {
  const selection = useChartStore((s) => s.ui.selection)
  const chart = useChartStore((s) => s.chart)
  const setMeasureTimeSignature = useChartStore((s) => s.setMeasureTimeSignature)
  const clearMeasureTimeSignature = useChartStore((s) => s.clearMeasureTimeSignature)
  const updateSection = useChartStore((s) => s.updateSection)

  const section = selection
    ? chart.sections.find((s) => s.id === selection.sectionId)
    : null
  const measureIdx = selection && section
    ? section.measures.findIndex((m) => m.id === selection.measureId)
    : -1
  const measure = measureIdx >= 0 ? section!.measures[measureIdx] : null

  if (!section || !measure) {
    return (
      <p className="time-empty text-sm text-muted-foreground">
        Click a beat to set its bar's time signature
      </p>
    )
  }

  // Effective meter at this bar (walking from section start through any
  // prior measure overrides up to and including this bar).
  let effective = section.timeSignature
  for (let i = 0; i <= measureIdx; i++) {
    const ts = section.measures[i].timeSignature
    if (ts) effective = ts
  }
  const effectiveLabel = `${effective.beats}/${effective.beatUnit}`
  const isFirstBar = measureIdx === 0
  const hasOverride = !!measure.timeSignature
  const currentShow = section.showTimeSignature ?? "auto"

  return (
    <div className="time-panel space-y-4">
      <div className="time-section-info text-xs text-muted-foreground">
        <div>
          Section: <span className="font-medium text-foreground">{section.name}</span>
        </div>
        <div>
          Bar {measureIdx + 1} · current meter: <span className="font-medium text-foreground">{effectiveLabel}</span>
          {hasOverride && !isFirstBar && (
            <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-900">
              override
            </span>
          )}
        </div>
      </div>

      <div className="time-sig-group space-y-2">
        <Label className="time-sig-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {isFirstBar ? "Section meter" : "Meter from this bar"}
        </Label>
        <div className="time-sig-grid grid grid-cols-4 gap-1.5">
          {TIME_SIG_OPTIONS.map((opt) => {
            const active = opt.beats === effective.beats && opt.beatUnit === effective.beatUnit
            return (
              <button
                key={opt.label}
                className={`time-sig-btn rounded border px-2 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                }`}
                onClick={() => setMeasureTimeSignature(section.id, measure.id, opt.beats, opt.beatUnit)}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        <p className="time-sig-hint text-[11px] text-muted-foreground">
          {isFirstBar
            ? "Changing the section meter rebars the whole section."
            : "Bars before this stay unchanged. Bars from here to the end of the section are rebarred in the new meter."}
        </p>
        {hasOverride && !isFirstBar && (
          <Button
            variant="outline"
            size="sm"
            className="btn-clear-time-override w-full"
            onClick={() => clearMeasureTimeSignature(section.id, measure.id)}
          >
            Clear override (revert to prior meter)
          </Button>
        )}
      </div>

      {isFirstBar && (
        <div className="time-display-group space-y-2">
          <Label className="time-display-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Display at section start
          </Label>
          <div className="time-display-grid grid grid-cols-3 gap-1.5">
            {DISPLAY_OPTIONS.map((opt) => {
              const active = opt.value === currentShow
              return (
                <button
                  key={opt.value}
                  className={`time-display-btn rounded border px-2 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => updateSection(section.id, { showTimeSignature: opt.value })}
                  title={opt.hint}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          <p className="time-display-hint text-[11px] text-muted-foreground">
            {DISPLAY_OPTIONS.find((o) => o.value === currentShow)?.hint}
          </p>
        </div>
      )}
    </div>
  )
}

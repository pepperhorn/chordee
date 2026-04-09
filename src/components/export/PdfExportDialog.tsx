import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChartSVG } from "@/components/chord-chart/ChartSVG"
import { useChartLayout } from "@/lib/useChartLayout"
import { useChartStore } from "@/lib/store"
import {
  exportChartToPdf,
  paperDimsPt,
  type PaperSize,
  type Orientation,
} from "@/lib/pdfExport"
import { downloadFile } from "@/lib/io"

interface PdfExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type BplOption = "auto" | number

const BPL_CHOICES: BplOption[] = ["auto", 1, 2, 3, 4, 5, 6, 8]

// A4 is always the default; users can switch to Letter/Legal in the picker.
function detectDefaultPaper(): PaperSize {
  return "a4"
}

export function PdfExportDialog({ open, onOpenChange }: PdfExportDialogProps) {
  const meta = useChartStore((s) => s.chart.meta)
  const storeBpl = useChartStore((s) => s.chart.meta.measuresPerLine)
  const storeBplMode = useChartStore((s) => s.ui.measuresPerLineMode)
  const storeJustification = useChartStore((s) => s.ui.justificationStrategy)

  const [paperSize, setPaperSize] = useState<PaperSize>(() => detectDefaultPaper())
  const [orientation, setOrientation] = useState<Orientation>("portrait")
  const [marginIn, setMarginIn] = useState<number>(0.5)
  const [bpl, setBpl] = useState<BplOption>(() =>
    storeBplMode === "auto" ? "auto" : storeBpl,
  )
  const [justification, setJustification] = useState<"proportional" | "equal">(
    storeJustification,
  )
  const [copyright, setCopyright] = useState<string>("")
  const [zoom100, setZoom100] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when re-opened
  useEffect(() => {
    if (open) {
      setBpl(storeBplMode === "auto" ? "auto" : storeBpl)
      setJustification(storeJustification)
      setError(null)
    }
    // Only react to open flipping
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Derive paper + content dimensions (in pt)
  const { width: paperWPt, height: paperHPt } = useMemo(
    () => paperDimsPt(paperSize, orientation),
    [paperSize, orientation],
  )
  const marginPt = marginIn * 72
  const contentWidthPt = Math.max(72, paperWPt - 2 * marginPt)

  // Compute layout with paper-derived width + user overrides
  const layout = useChartLayout(contentWidthPt, {
    containerWidth: contentWidthPt,
    measuresPerLine: bpl,
    justification,
  })

  // Reference to the hidden ChartSVG for grabbing DOM on export
  const hiddenSvgHostRef = useRef<HTMLDivElement>(null)

  const handleExport = async () => {
    setError(null)
    if (!layout) {
      setError("Layout not ready")
      return
    }
    const hostDiv = hiddenSvgHostRef.current
    const sourceSvg = hostDiv?.querySelector("svg.chart-svg") as SVGSVGElement | null
    if (!sourceSvg) {
      setError("Chart SVG not found")
      return
    }
    const chartHeaderHeight = Number(
      sourceSvg.getAttribute("data-header-height") || "0",
    )
    setExporting(true)
    try {
      const { bytes, pageCount } = await exportChartToPdf({
        sourceSvg,
        layout,
        chartHeaderHeight,
        opts: {
          paperSize,
          orientation,
          marginPt,
          title: meta.title || "Chord Chart",
          composer: meta.composer || undefined,
          copyright: copyright.trim() || undefined,
          headingFont: "PetalumaScript",
          bodyFont: "Inter, system-ui, sans-serif",
        },
      })
      const filename = `${(meta.title || "chart").replace(/[^\w\s-]/g, "_")}.pdf`
      downloadFile(bytes, filename, "application/pdf")
      void pageCount
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setExporting(false)
    }
  }

  // Preview pane sizing — measure available space and scale the real-size
  // SVG to fit the whole page with a small margin around it.
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const [previewBox, setPreviewBox] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    if (!open) return
    const el = previewScrollRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      setPreviewBox({ w: r.width, h: r.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  const PADDING = 24 // breathing room inside preview-scroll
  const availW = Math.max(1, previewBox.w - PADDING)
  const availH = Math.max(1, previewBox.h - PADDING)
  const fitScale = Math.min(availW / paperWPt, availH / paperHPt)
  const previewScale = zoom100 ? 1 : (previewBox.w > 0 ? fitScale : 0.6)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pdf-export-dialog flex max-w-6xl flex-col" style={{ height: "92vh", maxHeight: "92vh" }}>
        <DialogHeader className="shrink-0">
          <DialogTitle>Export PDF</DialogTitle>
          <DialogDescription>
            Confirm the layout for your PDF. Bars per line and justification can differ from
            what you see in the editor.
          </DialogDescription>
        </DialogHeader>

        <div className="pdf-export-body grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden md:grid-cols-[300px_1fr]">
          {/* ── Form ──────────────────────────────── */}
          <div className="pdf-export-form space-y-4 overflow-y-auto pr-2">
            <div className="field-group space-y-1.5">
              <Label className="text-xs">Paper size</Label>
              <Select value={paperSize} onValueChange={(v) => setPaperSize(v as PaperSize)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                  <SelectItem value="letter">Letter (8.5 × 11 in)</SelectItem>
                  <SelectItem value="legal">Legal (8.5 × 14 in)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="field-group space-y-1.5">
              <Label className="text-xs">Orientation</Label>
              <div className="flex gap-1">
                {(["portrait", "landscape"] as const).map((o) => (
                  <button
                    key={o}
                    className={`orient-btn flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                      orientation === o
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    onClick={() => setOrientation(o)}
                  >
                    {o.charAt(0).toUpperCase() + o.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group space-y-1.5">
              <Label className="text-xs">Margin (inches)</Label>
              <Input
                type="number"
                min={0}
                max={2}
                step={0.1}
                className="h-8"
                value={marginIn}
                onChange={(e) => setMarginIn(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>

            <div className="field-group space-y-1.5">
              <Label className="text-xs">Bars per line</Label>
              <div className="flex flex-wrap gap-1">
                {BPL_CHOICES.map((v) => {
                  const isActive = bpl === v
                  return (
                    <button
                      key={String(v)}
                      className={`bpl-btn rounded px-2 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      onClick={() => setBpl(v)}
                    >
                      {v === "auto" ? "Auto" : v}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="field-group space-y-1.5">
              <Label className="text-xs">Justification</Label>
              <div className="flex gap-1">
                {(["proportional", "equal"] as const).map((j) => (
                  <button
                    key={j}
                    className={`just-btn flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                      justification === j
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    onClick={() => setJustification(j)}
                  >
                    {j === "proportional" ? "Proportional" : "Equal"}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group space-y-1.5">
              <Label className="text-xs">Copyright (optional)</Label>
              <Input
                type="text"
                className="h-8 text-xs"
                placeholder="© 2026 Your Name"
                value={copyright}
                onChange={(e) => setCopyright(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Shown in the footer above "Created at chordee.app"
              </p>
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          {/* ── Preview ───────────────────────────── */}
          <div className="pdf-export-preview flex min-h-0 min-w-0 flex-col">
            <div className="preview-toolbar flex shrink-0 items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {Math.round(paperWPt)} × {Math.round(paperHPt)} pt · scale{" "}
                {Math.round(previewScale * 100)}%
              </span>
              <button
                className="zoom-toggle rounded px-2 py-0.5 text-[11px] font-medium bg-muted hover:bg-muted/80"
                onClick={() => setZoom100((z) => !z)}
              >
                {zoom100 ? "Fit" : "100%"}
              </button>
            </div>
            <div
              ref={previewScrollRef}
              className={`preview-scroll relative min-h-0 flex-1 rounded-md border bg-neutral-100 dark:bg-neutral-900 ${
                zoom100 ? "overflow-auto" : "overflow-hidden"
              }`}
            >
              <div
                className="preview-page-wrap absolute inset-0 flex items-center justify-center"
              >
              <div
                className="preview-page relative bg-white shadow-md"
                style={{
                  width: paperWPt * previewScale,
                  height: paperHPt * previewScale,
                }}
              >
                {/* Scaled chart SVG, clipped to page */}
                <div
                  className="preview-scaler absolute"
                  style={{
                    left: marginPt * previewScale,
                    top: marginPt * previewScale,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <div
                    ref={hiddenSvgHostRef}
                    className="preview-svg-host text-black"
                    style={{ width: contentWidthPt }}
                  >
                    {layout && (
                      <ChartSVG layout={layout} containerWidth={contentWidthPt} />
                    )}
                  </div>
                </div>
                {/* Margin outline */}
                <div
                  className="preview-margin-outline pointer-events-none absolute border border-dashed border-neutral-300"
                  style={{
                    left: marginPt * previewScale,
                    top: marginPt * previewScale,
                    width: contentWidthPt * previewScale,
                    height: (paperHPt - 2 * marginPt) * previewScale,
                  }}
                />
              </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pdf-export-actions flex shrink-0 items-center justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting || !layout}>
            {exporting ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

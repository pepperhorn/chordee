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
import { RELATIVE_SIZE_SCALE, type RelativeSize } from "@/lib/fonts"
import {
  exportChartToPdf,
  paperDimsPt,
  computePageGeometry,
  paginate,
  type PaperSize,
  type Orientation,
  type PageSpec,
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

// ── Font auto-scale for tight bars-per-line ────────────────────────────
// Heuristic: when the user asks for more than ~4 bars per line, step the
// chord/lyric/dynamic sizes down so the content keeps fitting without
// overlapping. Pure per-tier steps (no math), clamped at "sm".
const SIZE_TIERS = ["sm", "md", "lg", "xl", "2xl"] as const
type SizeTier = (typeof SIZE_TIERS)[number]
function stepDown(s: SizeTier, steps: number): SizeTier {
  const i = SIZE_TIERS.indexOf(s)
  if (i < 0) return s
  return SIZE_TIERS[Math.max(0, i - steps)]!
}
function computeFontScaleOverride(
  bpl: BplOption,
  base: { chordSize: SizeTier; lyricSize: SizeTier; dynamicSize: SizeTier },
): { chordSize?: SizeTier; lyricSize?: SizeTier; dynamicSize?: SizeTier } {
  if (bpl === "auto") return {}
  if (bpl <= 4) return {}
  // bpl 5-6 → drop one tier; 7-8 → drop two; 9+ → drop three (clamped at sm)
  const steps = bpl >= 9 ? 3 : bpl >= 7 ? 2 : 1
  return {
    chordSize: stepDown(base.chordSize, steps),
    lyricSize: stepDown(base.lyricSize, steps),
    dynamicSize: stepDown(base.dynamicSize, steps),
  }
}

// ── Preview page sub-component ────────────────────────────────────────

interface PreviewPageProps {
  page: PageSpec
  totalPages: number
  layout: import("@/lib/layout/types").LayoutResult
  chartHeaderHeight: number
  paperWPt: number
  paperHPt: number
  marginPt: number
  contentWidthPt: number
  subsequentHeaderPt: number
  previewScale: number
  title: string
  copyright: string
  fontConfigOverride: Partial<import("@/lib/fonts").FontConfig>
}

function PreviewPage({
  page,
  totalPages,
  layout,
  chartHeaderHeight,
  paperWPt,
  paperHPt,
  marginPt,
  contentWidthPt,
  subsequentHeaderPt,
  previewScale,
  title,
  copyright,
  fontConfigOverride,
}: PreviewPageProps) {
  // Which chart-line indices show on this page
  const isFirstPage = page.pageNum === 1
  const firstLineInPage = layout.lines[page.startLine]
  // y offset of the first visible line relative to the TOP of the chart SVG
  // (chart header + line.y within body group).
  const bodyTopY = chartHeaderHeight + (firstLineInPage?.y ?? 0)

  // How much vertical space the per-page header consumes inside the
  // page-content area. On page 1 this is the full chart title header
  // (already part of the source SVG). On pages 2+ we draw our own
  // compact header overlay.
  const pageContentTopY = isFirstPage ? 0 : bodyTopY - subsequentHeaderPt

  const contentHeightPt = paperHPt - 2 * marginPt

  const pageW = paperWPt * previewScale
  const pageH = paperHPt * previewScale

  return (
    <div
      className="preview-page relative bg-white shadow-md"
      style={{ width: pageW, height: pageH, flexShrink: 0 }}
    >
      {/* Content window (margin-boxed) */}
      <div
        className="preview-page-content absolute overflow-hidden"
        style={{
          left: marginPt * previewScale,
          top: marginPt * previewScale,
          width: contentWidthPt * previewScale,
          height: contentHeightPt * previewScale,
        }}
      >
        {/* Cropped ChartSVG — render another instance scaled, translated
            so the right vertical slice lines up within the content box. */}
        <div
          className="preview-page-scaler"
          style={{
            position: "absolute",
            left: 0,
            top: -pageContentTopY * previewScale,
            width: contentWidthPt * previewScale,
            transform: `scale(${previewScale})`,
            transformOrigin: "top left",
          }}
        >
          <div style={{ width: contentWidthPt }}>
            <ChartSVG
              layout={layout}
              containerWidth={contentWidthPt}
              fontConfigOverride={fontConfigOverride}
            />
          </div>
        </div>

        {/* Page 2+ header overlay: page num top-left, title top-right */}
        {!isFirstPage && (
          <>
            <div
              className="preview-page-num absolute text-muted-foreground"
              style={{
                left: 0,
                top: 2 * previewScale,
                fontSize: Math.max(7, 10 * previewScale),
                fontFamily: "Inter, system-ui, sans-serif",
                opacity: 0.7,
              }}
            >
              {page.pageNum} / {totalPages}
            </div>
            <div
              className="preview-page-title-repeat absolute text-foreground"
              style={{
                right: 0,
                top: 2 * previewScale,
                fontSize: Math.max(8, 11 * previewScale),
                fontFamily: "PetalumaScript, serif",
                fontWeight: 700,
                opacity: 0.75,
              }}
            >
              {title}
            </div>
          </>
        )}

        {/* Footer overlay: copyright + "Created at chordee.app" */}
        {copyright.trim() && (
          <div
            className="preview-footer-copyright absolute text-muted-foreground text-center"
            style={{
              left: 0,
              right: 0,
              bottom: 22 * previewScale,
              fontSize: Math.max(7, 9 * previewScale),
              fontFamily: "Inter, system-ui, sans-serif",
              opacity: 0.6,
            }}
          >
            {copyright}
          </div>
        )}
        <div
          className="preview-footer-chordee absolute text-muted-foreground text-center inline-flex items-center justify-center gap-1"
          style={{
            left: 0,
            right: 0,
            bottom: 4 * previewScale,
            fontSize: Math.max(7, 9 * previewScale),
            fontFamily: "PetalumaText, serif",
            opacity: 0.6,
          }}
        >
          <img
            src="/CHORDEE.png"
            alt=""
            style={{ height: Math.max(8, 10 * previewScale), width: "auto" }}
            draggable={false}
          />
          <span>· Created at chordee.app</span>
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

      {/* Page badge */}
      <div
        className="preview-page-badge absolute top-2 left-2 text-[9px] text-muted-foreground bg-background/80 rounded px-1 py-0.5"
        style={{ pointerEvents: "none" }}
      >
        Page {page.pageNum} of {totalPages}
      </div>
    </div>
  )
}

export function PdfExportDialog({ open, onOpenChange }: PdfExportDialogProps) {
  const meta = useChartStore((s) => s.chart.meta)
  const storeBpl = useChartStore((s) => s.chart.meta.measuresPerLine)
  const storeBplMode = useChartStore((s) => s.ui.measuresPerLineMode)
  const storeJustification = useChartStore((s) => s.ui.justificationStrategy)
  const baseChordSize = useChartStore((s) => s.ui.fontConfig.chordSize)
  const baseLyricSize = useChartStore((s) => s.ui.fontConfig.lyricSize)
  const baseDynamicSize = useChartStore((s) => s.ui.fontConfig.dynamicSize)
  const baseHeadingSize = useChartStore((s) => s.ui.fontConfig.headingSize)
  const baseSubtitleSize = useChartStore((s) => s.ui.fontConfig.subtitleSize)
  const baseBodySize = useChartStore((s) => s.ui.fontConfig.bodySize)

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

  // Font-scale override derived from bpl. Empty object for auto/<=4 bars.
  const fontConfigOverride = useMemo(
    () =>
      computeFontScaleOverride(bpl, {
        chordSize: baseChordSize as SizeTier,
        lyricSize: baseLyricSize as SizeTier,
        dynamicSize: baseDynamicSize as SizeTier,
      }),
    [bpl, baseChordSize, baseLyricSize, baseDynamicSize],
  )

  // Compute layout with paper-derived width + user overrides
  const layout = useChartLayout(contentWidthPt, {
    containerWidth: contentWidthPt,
    measuresPerLine: bpl,
    justification,
    fontConfigOverride,
  })

  // Chart title header height — must mirror the formula in ChartSVG.tsx.
  const chartHeaderHeight = useMemo(() => {
    if (!meta.title) return 0
    const headingScale = RELATIVE_SIZE_SCALE[baseHeadingSize as RelativeSize] ?? 1
    const subtitleScale = RELATIVE_SIZE_SCALE[baseSubtitleSize as RelativeSize] ?? 1
    const bodyScaleLocal = RELATIVE_SIZE_SCALE[baseBodySize as RelativeSize] ?? 1
    const titleFontSize = Math.round(24 * headingScale)
    const subtitleFontSize = Math.round(14 * subtitleScale)
    const infoFontSize = Math.round(13 * bodyScaleLocal)
    const hasSubtitle = !!meta.subtitle
    return Math.round(
      40 + titleFontSize + (hasSubtitle ? subtitleFontSize + 4 : 0) + infoFontSize,
    )
  }, [meta.title, meta.subtitle, baseHeadingSize, baseSubtitleSize, baseBodySize])

  const geometry = useMemo(
    () =>
      computePageGeometry(
        paperSize,
        orientation,
        marginPt,
        chartHeaderHeight,
        !!copyright.trim(),
      ),
    [paperSize, orientation, marginPt, chartHeaderHeight, copyright],
  )

  const pages: PageSpec[] = useMemo(() => {
    if (!layout) return []
    return paginate(
      layout,
      geometry.firstPageContentH,
      geometry.subsequentPageContentH,
    )
  }, [layout, geometry.firstPageContentH, geometry.subsequentPageContentH])

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

  // Preview pane sizing — measure available space.
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

  // Fit scale: always fit a single page to width, and also to height when
  // we only have 1 page. For multi-page we fit to width and let the stack
  // scroll vertically inside preview-scroll.
  const PADDING = 24
  const availW = Math.max(1, previewBox.w - PADDING)
  const availH = Math.max(1, previewBox.h - PADDING)
  const fitScale =
    pages.length <= 1
      ? Math.min(availW / paperWPt, availH / paperHPt)
      : availW / paperWPt
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
                pages.length > 1 || zoom100 ? "overflow-auto" : "overflow-hidden"
              }`}
            >
              {/* Hidden host: full chart SVG at natural size, used both as
                  the source for rasterization on export and as the visual
                  source for per-page cropped previews via CSS. */}
              <div
                ref={hiddenSvgHostRef}
                className="preview-svg-host-hidden"
                style={{
                  position: "absolute",
                  left: "-99999px",
                  top: "-99999px",
                  width: contentWidthPt,
                }}
              >
                {layout && (
                  <ChartSVG
                    layout={layout}
                    containerWidth={contentWidthPt}
                    fontConfigOverride={fontConfigOverride}
                  />
                )}
              </div>

              <div
                className="preview-pages-stack flex flex-col items-center gap-4 p-4"
                style={{ minHeight: "100%" }}
              >
                {pages.length === 0 || !layout ? (
                  <div className="text-xs text-muted-foreground">
                    {layout ? "Empty chart" : "Computing layout…"}
                  </div>
                ) : (
                  pages.map((page) => (
                    <PreviewPage
                      key={page.pageNum}
                      page={page}
                      totalPages={pages.length}
                      layout={layout}
                      chartHeaderHeight={chartHeaderHeight}
                      paperWPt={paperWPt}
                      paperHPt={paperHPt}
                      marginPt={marginPt}
                      contentWidthPt={contentWidthPt}
                      subsequentHeaderPt={geometry.subsequentHeaderPt}
                      previewScale={previewScale}
                      title={meta.title || "Chord Chart"}
                      copyright={copyright}
                      fontConfigOverride={fontConfigOverride}
                    />
                  ))
                )}
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

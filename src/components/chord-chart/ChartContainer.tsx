import { useState, useEffect, useRef } from "react"
import { useChartLayout } from "@/lib/useChartLayout"
import { useKeyboardNavigation } from "@/lib/useKeyboardNavigation"
import { ChartSVG } from "./ChartSVG"
import { ChordInput } from "./ChordInput"
import { DynamicInput } from "./DynamicInput"
import { TimeSigPicker } from "./TimeSigPicker"
import { KeySigPicker } from "./KeySigPicker"
import { EndingPickerHost } from "./EndingPickerHost"
import { getPaperOverlayStyle } from "@/lib/paperTexture"
import { useChartStore } from "@/lib/store"
import { pickBrandTagline } from "@/lib/brandTaglines"
import { AboutDialog } from "@/components/about/AboutDialog"
import { Info } from "lucide-react"

export function ChartContainer() {
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [brandTagline] = useState(() => pickBrandTagline())
  const [aboutOpen, setAboutOpen] = useState(false)
  const zoom = useChartStore((s) => s.ui.zoom)
  const theme = useChartStore((s) => s.ui.theme)
  const activeInput = useChartStore((s) => s.ui.activeInput)
  const paperTexture = useChartStore((s) => s.ui.paperTexture)
  const bgColor = useChartStore((s) => s.ui.bgColor)
  const selection = useChartStore((s) => s.ui.selection)
  const setActiveInput = useChartStore((s) => s.setActiveInput)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      setContainerWidth(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Adjust for zoom — layout uses the un-zoomed width
  const layoutWidth = containerWidth > 0 ? containerWidth / (zoom / 100) : 0
  const layout = useChartLayout(layoutWidth)

  // Keyboard navigation operates on the position map
  useKeyboardNavigation(layout)

  // Find anchor position for time sig picker
  const pickerAnchor = (() => {
    if (activeInput !== "timesig" || !selection?.slotId || !layout) return null
    const entry = layout.positionMap.entries.find((e) => e.target.slotId === selection.slotId)
    if (!entry) return null
    return { x: entry.rect.x, y: entry.rect.y - 40 }
  })()

  return (
    <div
      className={`chart-container-wrap chart-container-wrap--${theme} relative flex min-w-0 flex-1 flex-col text-slate-900`}
      style={{ backgroundColor: bgColor || "#ffffff", minHeight: 0 }}
    >
      <div
        ref={containerRef}
        className="chart-container relative flex-1 overflow-auto"
        data-zoom={zoom}
        style={{ minHeight: 0 }}
      >
        <div
          className="chart-zoom-wrapper origin-top-left"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
        >
          {layout && layoutWidth > 0 && (
            <>
              <ChartSVG layout={layout} containerWidth={layoutWidth} />
              <ChordInput layout={layout} />
              <DynamicInput layout={layout} />
              {activeInput === "timesig" && selection?.sectionId && pickerAnchor && (
                <TimeSigPicker
                  sectionId={selection.sectionId}
                  onClose={() => setActiveInput("none")}
                  anchorX={pickerAnchor.x}
                  anchorY={pickerAnchor.y}
                />
              )}
              {activeInput === "keysig" && pickerAnchor && (
                <KeySigPicker
                  onClose={() => setActiveInput("none")}
                  anchorX={pickerAnchor.x}
                  anchorY={pickerAnchor.y}
                />
              )}
            </>
          )}
        </div>
        {getPaperOverlayStyle(paperTexture) && (
          <div
            className="paper-overlay"
            style={{
              ...getPaperOverlayStyle(paperTexture)!,
              position: "sticky",
              bottom: 0,
              left: 0,
              width: "100%",
              height: "100vh",
              marginTop: "-100vh",
            }}
          />
        )}
      </div>

      {/* About / credits button — desktop only, absolutely pinned to the
          bottom-left of the chart container (outside the scroll area so it
          always sits at the visible bottom regardless of content length). */}
      <button
        type="button"
        className="chart-about-btn pointer-events-auto absolute bottom-[30px] left-4 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm hover:bg-background hover:text-foreground max-md:hidden"
        onClick={() => setAboutOpen(true)}
        aria-label="About chordee"
        title="About chordee"
      >
        <Info className="h-4 w-4" />
      </button>

      {/* Floating brand footer — desktop only, absolutely pinned at the bottom
          of the chart container (outside the scroll area). */}
      <div
        className="chart-brand-footer pointer-events-none absolute bottom-[30px] left-0 right-0 z-20 flex items-center justify-center gap-2 max-md:hidden"
        aria-hidden="true"
      >
        <img
          src="/CHORDEE.png"
          alt="chordee"
          className="chart-brand-logo block select-none"
          style={{
            height: "18px",
            width: "auto",
            filter: "drop-shadow(0 0 6px rgba(255,255,255,0.7)) drop-shadow(0 0 2px rgba(255,255,255,0.5))",
          }}
          draggable={false}
        />
        <span
          className="chart-brand-tag inline-flex items-center text-foreground leading-none"
          style={{
            fontFamily: "PetalumaScript, serif",
            fontSize: "14px",
            opacity: 0.6,
            textShadow: "0 0 6px rgba(255,255,255,0.7), 0 0 2px rgba(255,255,255,0.5)",
          }}
        >
          {brandTagline}
        </span>
      </div>

      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      <EndingPickerHost />
    </div>
  )
}

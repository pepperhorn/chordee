import { useState, useEffect, useRef } from "react"
import { useChartLayout } from "@/lib/useChartLayout"
import { useKeyboardNavigation } from "@/lib/useKeyboardNavigation"
import { ChartSVG } from "./ChartSVG"
import { ChordInput } from "./ChordInput"
import { DynamicInput } from "./DynamicInput"
import { TimeSigPicker } from "./TimeSigPicker"
import { KeySigPicker } from "./KeySigPicker"
import { getPaperOverlayStyle } from "@/lib/paperTexture"
import { useChartStore } from "@/lib/store"

export function ChartContainer() {
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
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
      ref={containerRef}
      className={`chart-container chart-container--${theme} relative flex-1 overflow-auto text-slate-900`}
      data-zoom={zoom}
      style={{ backgroundColor: bgColor || "#ffffff", minHeight: 0 }}
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
  )
}

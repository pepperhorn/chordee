import { useChartStore } from "@/lib/store"
import { ChartContainer } from "./ChartContainer"
import { Toolbar } from "./Toolbar"
import { PropertiesPanel } from "./PropertiesPanel"
import { MobileBar } from "./MobileBar"
import { Toast } from "./Toast"
import { useChartLayout } from "@/lib/useChartLayout"
import { useState, useEffect, useRef } from "react"
import { registerPlugin, getPlugin } from "@/lib/plugins/registry"
import { playbackPlugin } from "@/lib/plugins/playback"
import { useListenMode } from "@/lib/plugins/playback/useListenMode"
import { AuthProvider } from "@/lib/auth/AuthContext"
import { ShareResolver } from "@/components/share/ShareResolver"

// Register plugins on module load
registerPlugin(playbackPlugin)

function PluginPanel() {
  const activePanel = useChartStore((s) => s.ui.activePluginPanel)
  const togglePanel = useChartStore((s) => s.togglePluginPanel)

  if (!activePanel) return null

  const plugin = getPlugin(activePanel)
  if (!plugin?.Panel) return null

  const Panel = plugin.Panel

  return (
    <div className="plugin-panel-overlay absolute left-0 right-0 top-0 z-40 flex justify-end">
      <div className="plugin-panel-card mr-2 mt-1 rounded-lg border bg-popover shadow-lg">
        <div className="plugin-panel-header flex items-center justify-between border-b px-3 py-1.5">
          <span className="plugin-panel-title text-xs font-medium">{plugin.meta.name}</span>
          <button
            className="plugin-panel-close rounded p-0.5 text-muted-foreground hover:bg-muted"
            onClick={() => togglePanel(activePanel)}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <Panel onClose={() => togglePanel(activePanel)} />
      </div>
    </div>
  )
}

export function ChordChartEditor() {
  const theme = useChartStore((s) => s.ui.theme)
  const notationDisplay = useChartStore((s) => s.chart.meta.notationDisplay)

  // Activate listen mode hook
  useListenMode()

  // Shared layout for mobile bar nav — uses a simple width estimate
  const [editorWidth, setEditorWidth] = useState(0)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      setEditorWidth(entries[0]?.contentRect.width ?? 0)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const layout = useChartLayout(editorWidth > 0 ? editorWidth : 0)

  return (
    <AuthProvider>
      <ShareResolver />
      <div
        ref={editorRef}
        data-theme={theme}
        data-notation={notationDisplay}
        className={`chord-chart-editor chord-chart-editor--${theme} flex h-screen flex-col bg-background text-foreground`}
      >
        <a href="#chart-area" className="chord-chart-skip-link">
          Skip to chart
        </a>
        <Toolbar />
        <div className="editor-main relative flex flex-1 overflow-hidden">
          <PluginPanel />
          <ChartContainer />
          <PropertiesPanel />
        </div>
        <MobileBar layout={layout} />
        <Toast />
      </div>
    </AuthProvider>
  )
}

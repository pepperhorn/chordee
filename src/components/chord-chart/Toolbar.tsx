import { useState, useRef, useCallback } from "react"
import {
  Undo2,
  Redo2,
  Plus,
  Download,
  Upload,
  Music,
  Type,
  MessageSquare,
  Info,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  Hash,
  FileText,
  PenLine,
  Drum,
  Menu,
  X,
  Image,
  Palette,
  Volume2,
  VolumeX,
  ChevronDown,
  FileDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { useChartStore } from "@/lib/store"
import { downloadFile, uploadFile } from "@/lib/io"
import { exportToMarkdown } from "@/lib/io"
import { parseChord } from "@/lib/chordParser"
import { formatChord } from "@/lib/utils"
import { usePlaybackStore } from "@/lib/plugins/playback/playback-store"
import { PdfExportDialog } from "@/components/export/PdfExportDialog"

function ToolbarButton({
  icon: Icon,
  label,
  shortcut,
  onClick,
  disabled,
  active,
  className: extraClass,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortcut?: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "secondary" : "ghost"}
          size="icon"
          className={`toolbar-btn h-8 w-8 text-foreground md:text-white hover:bg-muted md:hover:bg-white/20 ${active ? "bg-muted md:bg-white/25" : ""} ${extraClass ?? ""}`}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="toolbar-tooltip">
        <p className="toolbar-tooltip-label">{label}</p>
        {shortcut && (
          <p className="toolbar-tooltip-shortcut mt-0.5 text-xs text-muted-foreground">
            {shortcut}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

function MobilePlaybackGroup() {
  const { listenMode, toggleListenMode, instrument, setInstrument, useBass, setUseBass } = usePlaybackStore()
  return (
    <div className="mobile-playback-group flex items-center gap-1 w-full pt-1 border-t mt-1">
      <ToolbarButton
        icon={listenMode ? Volume2 : VolumeX}
        label={listenMode ? "Listen ON" : "Listen OFF"}
        onClick={toggleListenMode}
        active={listenMode}
        className="btn-listen-mobile"
      />
      <div className="mobile-playback-options flex items-center gap-1 ml-1">
        {(["piano", "guitar"] as const).map((inst) => (
          <button
            key={inst}
            className={`mobile-playback-btn rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
              instrument === inst ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setInstrument(inst)}
          >
            {inst === "piano" ? "Piano" : "Guitar"}
          </button>
        ))}
        <button
          className={`mobile-playback-btn rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
            useBass ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
          onClick={() => setUseBass(!useBass)}
        >
          Bass
        </button>
      </div>
    </div>
  )
}

function PlaybackToolbarGroup() {
  const { listenMode, toggleListenMode, loading } = usePlaybackStore()
  const togglePanel = useChartStore((s) => s.togglePluginPanel)
  const activePanel = useChartStore((s) => s.ui.activePluginPanel)

  return (
    <div className="toolbar-group-playback flex items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={listenMode ? "secondary" : "ghost"}
            size="icon"
            className={`btn-listen h-8 w-8 text-white hover:bg-white/20 ${
              listenMode ? "bg-white/25" : ""
            } ${loading ? "animate-pulse" : ""}`}
            onClick={toggleListenMode}
            aria-label={listenMode ? "Disable listen mode" : "Enable listen mode"}
          >
            {listenMode ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="toolbar-tooltip">
          <p className="toolbar-tooltip-label">
            {listenMode ? "Listen mode ON" : "Listen mode OFF"}
          </p>
          <p className="toolbar-tooltip-shortcut mt-0.5 text-xs text-muted-foreground">
            {loading ? "Loading sounds..." : "Hear chords as you navigate/edit"}
          </p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={activePanel === "playback" ? "secondary" : "ghost"}
            size="icon"
            className={`btn-playback-settings h-8 w-6 text-white hover:bg-white/20 ${
              activePanel === "playback" ? "bg-white/25" : ""
            }`}
            onClick={() => togglePanel("playback")}
            aria-label="Playback settings"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="toolbar-tooltip">
          <p className="toolbar-tooltip-label">Playback settings</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export function Toolbar() {
  const store = useChartStore()
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    addSection,
    setZoom,
    toggleShowSlashes,
    toggleShowDynamics,
    toggleShowLyrics,
    toggleShowInstructions,
    setTheme,
    exportJSON,
    importJSON,
    updateMeta,
    setSlotChord,
    setSlotNashville,
    setSelection,
    toggleEditMode,
  } = store

  const ui = useChartStore((s) => s.ui)
  const chart = useChartStore((s) => s.chart)
  const selection = ui.selection

  // Inline chord input
  const [chordValue, setChordValue] = useState("")
  const chordInputRef = useRef<HTMLInputElement>(null)

  const currentSlotChord = (() => {
    if (!selection?.slotId) return ""
    const sec = chart.sections.find((s) => s.id === selection.sectionId)
    const mea = sec?.measures.find((m) => m.id === selection.measureId)
    const bea = mea?.beats.find((b) => b.id === selection.beatId)
    const slo = bea?.slots.find((s) => s.id === selection.slotId)
    if (slo?.chord) return formatChord(slo.chord)
    if (slo?.nashvilleChord) return slo.nashvilleChord.degree + (slo.nashvilleChord.quality || "")
    return ""
  })()

  const handleChordSubmit = useCallback(() => {
    if (!selection?.slotId || !selection.sectionId || !selection.measureId || !selection.beatId) return
    const isNashville = chart.meta.notationType === "nashville"

    if (!chordValue.trim()) {
      setSlotChord(selection.sectionId, selection.measureId, selection.beatId, selection.slotId, null)
      return
    }

    const result = parseChord(chordValue, isNashville)
    if (!result.valid) return

    if (isNashville && result.nashvilleChord) {
      setSlotNashville(selection.sectionId, selection.measureId, selection.beatId, selection.slotId, result.nashvilleChord)
    } else if (result.chord) {
      setSlotChord(selection.sectionId, selection.measureId, selection.beatId, selection.slotId, result.chord)
    }
  }, [selection, chordValue, chart.meta.notationType, setSlotChord, setSlotNashville])

  const handleExportJSON = () => {
    const json = exportJSON()
    downloadFile(json, `${chart.meta.title || "chart"}.json`, "application/json")
  }

  const handleExportMarkdown = () => {
    const md = exportToMarkdown(chart)
    downloadFile(md, `${chart.meta.title || "chart"}.md`, "text/markdown")
  }

  const handleImport = async () => {
    try {
      const content = await uploadFile(".json")
      importJSON(content)
    } catch {
      // User cancelled
    }
  }

  const handleThemeToggle = () => {
    const themes: Array<"light" | "dark" | "high-contrast"> = [
      "light",
      "dark",
      "high-contrast",
    ]
    const idx = themes.indexOf(ui.theme)
    setTheme(themes[(idx + 1) % themes.length])
  }

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const isMac = typeof navigator !== "undefined" && navigator.platform?.includes("Mac")
  const mod = isMac ? "⌘" : "Ctrl+"

  return (
    <TooltipProvider delayDuration={300}>
      <>
      {/* Mobile: minimal bar with logo + hamburger */}
      <div className="toolbar-mobile md:hidden flex h-10 items-center justify-between border-b bg-background/95 px-2">
        <img
          src="/CHORDEE.png"
          alt="chordee"
          className="chordee-logo select-none h-5 w-auto"
          draggable={false}
        />
        <Button
          variant="ghost"
          size="icon"
          className="toolbar-mobile-toggle h-8 w-8"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile: expandable menu */}
      {mobileMenuOpen && (
        <div className="toolbar-mobile-menu md:hidden flex flex-wrap items-center gap-1 border-b bg-background/95 px-2 py-1.5">
          <ToolbarButton icon={Undo2} label="Undo" onClick={undo} disabled={!canUndo()} className="btn-undo" />
          <ToolbarButton icon={Redo2} label="Redo" onClick={redo} disabled={!canRedo()} className="btn-redo" />
          <ToolbarButton icon={Plus} label="Add Section" onClick={() => addSection()} className="btn-add-section" />
          <ToolbarButton
            icon={Hash}
            label={`Notation: ${chart.meta.notationType === "nashville" ? "Nashville" : "Standard"}`}
            onClick={() => updateMeta({ notationType: chart.meta.notationType === "standard" ? "nashville" : "standard" })}
            active={chart.meta.notationType === "nashville"}
            className="btn-notation-type"
          />
          <ToolbarButton icon={Music} label="Slashes" onClick={toggleShowSlashes} active={ui.showSlashes} className="btn-toggle-slashes" />
          <ToolbarButton icon={Type} label="Dynamics" onClick={toggleShowDynamics} active={ui.showDynamics} className="btn-toggle-dynamics" />
          <ToolbarButton icon={MessageSquare} label="Lyrics" onClick={toggleShowLyrics} active={ui.showLyrics} className="btn-toggle-lyrics" />
          <ToolbarButton icon={ui.theme === "dark" ? Moon : Sun} label="Theme" onClick={handleThemeToggle} className="btn-theme-toggle" />
          <MobilePlaybackGroup />
          <ToolbarButton icon={Upload} label="Import" onClick={handleImport} className="btn-import" />
          <ToolbarButton icon={Download} label="Export JSON" onClick={handleExportJSON} className="btn-export-json" />
          <ToolbarButton icon={FileText} label="Export MD" onClick={handleExportMarkdown} className="btn-export-markdown" />
          <ToolbarButton icon={FileDown} label="Export PDF" onClick={() => { setPdfDialogOpen(true); setMobileMenuOpen(false) }} className="btn-export-pdf" />
          {/* Bars per line */}
          <div className="mobile-bpl flex items-center gap-1 w-full pt-1 border-t mt-1">
            <span className="text-[10px] text-muted-foreground shrink-0">Bars/Line:</span>
            {["auto", "1", "2", "3", "4", "5", "6", "8"].map((v) => {
              const isAuto = v === "auto"
              const isActive = isAuto
                ? ui.measuresPerLineMode === "auto"
                : ui.measuresPerLineMode === "fixed" && chart.meta.measuresPerLine === parseInt(v)
              return (
                <button
                  key={v}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                  onClick={() => {
                    if (isAuto) {
                      store.setMeasuresPerLineMode("auto")
                    } else {
                      store.setMeasuresPerLineMode("fixed")
                      updateMeta({ measuresPerLine: parseInt(v) })
                    }
                    setMobileMenuOpen(false)
                  }}
                >
                  {v === "auto" ? "Auto" : v}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Desktop: full toolbar */}
      <div
        role="toolbar"
        aria-label="Chart editor toolbar"
        className="toolbar hidden md:flex h-11 items-center gap-1 border-b bg-black px-3"
      >
        {/* Logo */}
        <img
          src="/CHORDEE.png"
          alt="chordee"
          className="chordee-logo select-none h-6 w-auto"
          style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.25))" }}
          draggable={false}
        />

        <Separator orientation="vertical" className="toolbar-sep mx-1.5 h-5 bg-white/20" />

        {/* History group */}
        <div className="toolbar-group-history flex items-center gap-0.5">
          <ToolbarButton
            icon={Undo2}
            label="Undo"
            shortcut={`${mod}Z`}
            onClick={undo}
            disabled={!canUndo()}
            className="btn-undo"
          />
          <ToolbarButton
            icon={Redo2}
            label="Redo"
            shortcut={`${mod}${isMac ? "⇧Z" : "Y"}`}
            onClick={redo}
            disabled={!canRedo()}
            className="btn-redo"
          />
        </div>

        <Separator orientation="vertical" className="toolbar-sep mx-1 h-5 bg-white/20" />

        {/* Structure group */}
        <div className="toolbar-group-structure flex items-center gap-0.5">
          <ToolbarButton
            icon={Plus}
            label="Add Section"
            shortcut="Adds a new section to the chart"
            onClick={() => addSection()}
            className="btn-add-section"
          />
        </div>

        <Separator orientation="vertical" className="toolbar-sep mx-1 h-5 bg-white/20" />

        {/* Notation group */}
        <div className="toolbar-group-notation flex items-center gap-0.5">
          <ToolbarButton
            icon={Hash}
            label={`Notation: ${chart.meta.notationType === "nashville" ? "Nashville" : "Standard"}`}
            shortcut="Toggle between standard and Nashville notation"
            onClick={() =>
              updateMeta({
                notationType: chart.meta.notationType === "standard" ? "nashville" : "standard",
              })
            }
            active={chart.meta.notationType === "nashville"}
            className="btn-notation-type"
          />

          {/* Inline chord input when slot selected in chord mode */}
          {selection?.slotId && ui.editMode === "chord" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  ref={chordInputRef}
                  className="toolbar-chord-input h-7 w-24 text-sm"
                  value={chordValue || currentSlotChord}
                  onChange={(e) => setChordValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleChordSubmit()
                      setChordValue("")
                    }
                    if (e.key === "Escape") {
                      e.preventDefault()
                      chordInputRef.current?.blur()
                      setChordValue("")
                    }
                    // Let Ctrl+Shift+Arrow pass through for subdivision cycling
                    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
                      return
                    }
                    // Let k pass through for key signature picker
                    if (e.key === "k") {
                      return
                    }
                    e.stopPropagation()
                  }}
                  onBlur={() => {
                    if (chordValue) handleChordSubmit()
                    setChordValue("")
                  }}
                  placeholder={chart.meta.notationType === "nashville" ? "4m7" : "Am7"}
                  aria-label="Chord input"
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="toolbar-tooltip">
                <p className="toolbar-tooltip-label">Enter chord for selected slot</p>
                <p className="toolbar-tooltip-shortcut mt-0.5 text-xs text-muted-foreground">
                  Enter to apply, Escape to cancel
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <Separator orientation="vertical" className="toolbar-sep mx-1 h-5 bg-white/20" />

        {/* Edit mode toggle */}
        <div className="toolbar-group-edit-mode flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`btn-edit-mode btn-edit-mode--${ui.editMode} flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  ui.editMode === "chord"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "border-2 border-red-600 bg-transparent text-white hover:bg-white/10"
                }`}
                onClick={toggleEditMode}
              >
                {ui.editMode === "chord" ? <PenLine className="h-3.5 w-3.5" /> : <Drum className="h-3.5 w-3.5" />}
                {ui.editMode === "chord" ? "Chord" : "Rhythm"}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="toolbar-tooltip">
              <p className="toolbar-tooltip-label">Toggle edit mode</p>
              <p className="toolbar-tooltip-shortcut mt-0.5 text-xs text-muted-foreground">Press \\ to toggle</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="toolbar-sep mx-1 h-5 bg-white/20" />

        {/* Visibility group */}
        <div className="toolbar-group-visibility flex items-center gap-0.5">
          <ToolbarButton
            icon={Music}
            label="Slash Notation"
            shortcut={ui.showSlashes ? "Visible — click to hide" : "Hidden — click to show"}
            onClick={toggleShowSlashes}
            active={ui.showSlashes}
            className="btn-toggle-slashes"
          />
          <ToolbarButton
            icon={Type}
            label="Dynamics"
            shortcut={ui.showDynamics ? "Visible — click to hide" : "Hidden — click to show"}
            onClick={toggleShowDynamics}
            active={ui.showDynamics}
            className="btn-toggle-dynamics"
          />
          <ToolbarButton
            icon={MessageSquare}
            label="Lyrics"
            shortcut={ui.showLyrics ? "Visible — click to hide" : "Hidden — click to show"}
            onClick={toggleShowLyrics}
            active={ui.showLyrics}
            className="btn-toggle-lyrics"
          />
          <ToolbarButton
            icon={Info}
            label="Instructions"
            shortcut={ui.showInstructions ? "Visible — click to hide" : "Hidden — click to show"}
            onClick={toggleShowInstructions}
            active={ui.showInstructions}
            className="btn-toggle-instructions"
          />
        </div>

        <Separator orientation="vertical" className="toolbar-sep mx-1 h-5 bg-white/20" />

        {/* Zoom group */}
        <div className="toolbar-group-zoom flex items-center gap-0.5">
          <ToolbarButton
            icon={ZoomOut}
            label="Zoom Out"
            shortcut={`${ui.zoom - 10}%`}
            onClick={() => setZoom(ui.zoom - 10)}
            className="btn-zoom-out"
          />
          <span className="zoom-level mx-1 min-w-[3rem] text-center text-xs text-white/70">
            {ui.zoom}%
          </span>
          <ToolbarButton
            icon={ZoomIn}
            label="Zoom In"
            shortcut={`${ui.zoom + 10}%`}
            onClick={() => setZoom(ui.zoom + 10)}
            className="btn-zoom-in"
          />
        </div>

        <Separator orientation="vertical" className="toolbar-sep mx-1 h-5 bg-white/20" />

        {/* Theme */}
        <ToolbarButton
          icon={ui.theme === "dark" ? Moon : Sun}
          label="Theme"
          shortcut={`Current: ${ui.theme} — click to cycle`}
          onClick={handleThemeToggle}
          className="btn-theme-toggle"
        />

        <Separator orientation="vertical" className="toolbar-sep mx-1 h-5 bg-white/20" />

        {/* Paper texture dropdown */}
        <div className="toolbar-group-texture relative flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="toolbar-texture-wrapper relative">
                <select
                  className="toolbar-texture-select appearance-none bg-white/10 text-white text-xs font-medium rounded-md pl-7 pr-2 py-1.5 cursor-pointer hover:bg-white/20 transition-colors outline-none border-none"
                  value={ui.paperTexture}
                  onChange={(e) => store.setPaperTexture(e.target.value as "none" | "subtle" | "crumpled")}
                >
                  <option value="none" className="text-black">None</option>
                  <option value="subtle" className="text-black">Subtle</option>
                  <option value="crumpled" className="text-black">Crumpled</option>
                </select>
                <Image className="toolbar-texture-icon absolute left-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="toolbar-tooltip">
              <p className="toolbar-tooltip-label">Paper texture</p>
            </TooltipContent>
          </Tooltip>

          {/* Background color picker */}
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="toolbar-bg-color relative flex items-center gap-1 cursor-pointer rounded-md px-1.5 py-1.5 hover:bg-white/20 transition-colors">
                <Palette className="h-3.5 w-3.5 text-white" />
                <div
                  className="toolbar-bg-swatch h-4 w-4 rounded border border-white/40"
                  style={{ backgroundColor: ui.bgColor }}
                />
                <input
                  type="color"
                  className="sr-only"
                  value={ui.bgColor}
                  onChange={(e) => store.setBgColor(e.target.value)}
                />
              </label>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="toolbar-tooltip">
              <p className="toolbar-tooltip-label">Background color</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="toolbar-spacer flex-1" />

        {/* I/O group */}
        <div className="toolbar-group-io flex items-center gap-0.5">
          <ToolbarButton
            icon={Upload}
            label="Import"
            shortcut="Load a .json chart file"
            onClick={handleImport}
            className="btn-import"
          />
          <ToolbarButton
            icon={Download}
            label="Export JSON"
            shortcut="Save chart as .json"
            onClick={handleExportJSON}
            className="btn-export-json"
          />
          <ToolbarButton
            icon={FileText}
            label="Export Markdown"
            shortcut="Save chart as .md"
            onClick={handleExportMarkdown}
            className="btn-export-markdown"
          />
          <ToolbarButton
            icon={FileDown}
            label="Export PDF"
            shortcut="Open PDF export dialog"
            onClick={() => setPdfDialogOpen(true)}
            className="btn-export-pdf"
          />
        </div>

        <Separator orientation="vertical" className="toolbar-sep mx-1 h-5 bg-white/20" />

        {/* Playback / Listen */}
        <PlaybackToolbarGroup />
      </div>

      <PdfExportDialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen} />
      </>
    </TooltipProvider>
  )
}

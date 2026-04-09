import { useState } from "react"
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useChartStore } from "@/lib/store"
import { FONT_FAMILIES, RELATIVE_SIZES, type RelativeSize } from "@/lib/fonts"
import { buildUserStyle, parseUserStyle } from "@/lib/userStyle"
import { downloadFile, uploadFile } from "@/lib/io"
import { BARLINE_TYPES, DYNAMICS, SECTION_PRESETS, TIME_SIGNATURES, NAVIGATION_TYPES } from "@/lib/constants"
import { formatChord } from "@/lib/utils"
import { ConfirmDialog } from "./ConfirmDialog"
import { TouchControls } from "./TouchControls"
import type { Division } from "@/lib/schema"

export function PropertiesPanel() {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768
  )
  const [expandedFonts, setExpandedFonts] = useState<Record<string, boolean>>({})
  const toggleFontExpanded = (key: string) =>
    setExpandedFonts((prev) => ({ ...prev, [key]: !prev[key] }))
  const {
    updateMeta, setFontConfig, setJustificationStrategy, setMeasuresPerLineMode,
    setPaperTexture, setBgColor,
    updateSection, setSectionTimeSignature, updateMeasure, updateBeat, setBeatDivision, addSection, addMeasure,
    deleteSection, deleteMeasure,
  } = useChartStore()
  const chart = useChartStore((s) => s.chart)
  const meta = chart.meta
  const fontConfig = useChartStore((s) => s.ui.fontConfig)
  const justification = useChartStore((s) => s.ui.justificationStrategy)
  const measuresMode = useChartStore((s) => s.ui.measuresPerLineMode)
  const paperTexture = useChartStore((s) => s.ui.paperTexture)
  const bgColor = useChartStore((s) => s.ui.bgColor)

  // Derive page background mode from texture + bgColor for the picker
  type PageBgMode = "parchment" | "crumpled" | "flat"
  const pageBgMode: PageBgMode =
    paperTexture === "crumpled"
      ? "crumpled"
      : paperTexture === "none"
        ? "flat"
        : "parchment"
  const setPageBgMode = (mode: PageBgMode) => {
    if (mode === "parchment") setPaperTexture("subtle")
    else if (mode === "crumpled") setPaperTexture("crumpled")
    else setPaperTexture("none")
  }
  const selection = useChartStore((s) => s.ui.selection)

  if (collapsed) {
    return (
      <div className="properties-panel-collapsed flex w-10 flex-col items-center border-l bg-background/95 pt-2 max-md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="panel-toggle h-8 w-8"
          onClick={() => setCollapsed(false)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Backdrop overlay on mobile */}
      <div
        className="panel-backdrop hidden max-md:block fixed inset-0 z-40 bg-black/30"
        onClick={() => setCollapsed(true)}
      />
      <div
        role="complementary"
        className="properties-panel flex w-72 flex-col border-l bg-background/95 max-md:absolute max-md:right-0 max-md:top-0 max-md:bottom-0 max-md:z-50 max-md:shadow-xl"
      >
      <div className="panel-header flex items-center justify-between border-b px-3 py-2">
        <span className="panel-title text-sm font-medium">Properties</span>
        <Button
          variant="ghost"
          size="icon"
          className="panel-toggle h-7 w-7"
          onClick={() => setCollapsed(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="tab-list mx-3 mt-2 grid h-auto w-[calc(100%-1.5rem)] grid-cols-2 gap-1 p-1">
            <TabsTrigger value="chart" className="tab-chart text-xs">Chart</TabsTrigger>
            <TabsTrigger value="layout" className="tab-layout text-xs">Layout</TabsTrigger>
            <TabsTrigger value="selection" className="tab-selection text-xs">Selection</TabsTrigger>
            <TabsTrigger value="controls" className="tab-controls text-xs max-md:hidden">Controls</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="chart-tab px-3 pb-4">
            {/* Metadata */}
            <div className="meta-section space-y-3 pt-2">
              <div className="field-group space-y-1">
                <Label className="field-label text-xs">Title</Label>
                <Input
                  className="field-input h-8 text-sm"
                  value={meta.title}
                  onChange={(e) => updateMeta({ title: e.target.value })}
                />
              </div>

              <div className="field-group space-y-1">
                <Label className="field-label text-xs">Subtitle</Label>
                <Input
                  className="field-input h-8 text-sm"
                  value={meta.subtitle ?? ""}
                  onChange={(e) => updateMeta({ subtitle: e.target.value })}
                  placeholder="Optional subtitle"
                />
              </div>

              <div className="field-group space-y-1">
                <Label className="field-label text-xs">Composer</Label>
                <Input
                  className="field-input h-8 text-sm"
                  value={meta.composer}
                  onChange={(e) => updateMeta({ composer: e.target.value })}
                />
              </div>

              <div className="field-group space-y-1">
                <Label className="field-label text-xs">Arranger</Label>
                <Input
                  className="field-input h-8 text-sm"
                  value={meta.arranger}
                  onChange={(e) => updateMeta({ arranger: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div className="field-group space-y-1">
                <Label className="field-label text-xs">Copyright</Label>
                <Input
                  className="field-input h-8 text-sm"
                  value={meta.copyright ?? ""}
                  onChange={(e) => updateMeta({ copyright: e.target.value })}
                  placeholder="© 2026 Your Name"
                />
              </div>

              <div className="field-group space-y-1">
                <Label className="field-label text-xs">Footer Text</Label>
                <Input
                  className="field-input h-8 text-sm"
                  value={meta.footerText ?? ""}
                  onChange={(e) => updateMeta({ footerText: e.target.value })}
                  placeholder="Optional — shown below copyright"
                />
              </div>

              <div className="field-group space-y-1">
                <Label className="field-label text-xs">Style</Label>
                <Input
                  className="field-input h-8 text-sm"
                  value={meta.style ?? ""}
                  onChange={(e) => updateMeta({ style: e.target.value })}
                  placeholder="e.g. Medium Swing"
                />
              </div>

              <div className="field-group flex gap-2">
                <div className="field-group flex-1 space-y-1">
                  <Label className="field-label text-xs">Key</Label>
                  <Input
                    className="field-input h-8 text-sm"
                    value={meta.key}
                    onChange={(e) => updateMeta({ key: e.target.value })}
                  />
                </div>
                <div className="field-group flex-1 space-y-1">
                  <Label className="field-label text-xs">Tempo</Label>
                  <Input
                    className="field-input h-8 text-sm"
                    type="number"
                    value={meta.tempo}
                    onChange={(e) => updateMeta({ tempo: parseInt(e.target.value) || 120 })}
                  />
                </div>
              </div>

              <div className="field-group space-y-1">
                <Label className="field-label text-xs">Tempo Note</Label>
                <div className="tempo-divisor-toggle flex gap-0.5 rounded-md border border-input p-0.5">
                  {([
                    ["whole", "\uD834\uDD5D"],
                    ["half", "\uD834\uDD5E"],
                    ["quarter", "\u2669"],
                    ["eighth", "\u266A"],
                    ["sixteenth", "\uD834\uDD61"],
                  ] as const).map(([value, glyph]) => (
                    <button
                      key={value}
                      className={`tempo-divisor-btn flex-1 rounded-sm px-1 py-0.5 text-sm transition-colors ${
                        (meta.tempoDivisor ?? "quarter") === value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                      onClick={() => updateMeta({ tempoDivisor: value })}
                      title={value}
                    >
                      {glyph}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-group flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show-tempo"
                  className="field-checkbox h-4 w-4 rounded border-input"
                  checked={meta.showTempo !== false}
                  onChange={(e) => updateMeta({ showTempo: e.target.checked })}
                />
                <Label htmlFor="show-tempo" className="field-label text-xs">
                  Show Tempo
                </Label>
              </div>

              <Separator className="clef-sep" />

              {/* Clef & Key Signature */}
              <div className="clef-section space-y-3">
                <Label className="section-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Clef & Key Signature
                </Label>

                <div className="field-group space-y-1">
                  <Label className="field-label text-xs">Clef</Label>
                  <Select
                    value={meta.clef}
                    onValueChange={(v) => updateMeta({ clef: v as any })}
                  >
                    <SelectTrigger className="field-select h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="treble">Treble</SelectItem>
                      <SelectItem value="alto">Alto</SelectItem>
                      <SelectItem value="tenor">Tenor</SelectItem>
                      <SelectItem value="bass">Bass</SelectItem>
                      <SelectItem value="percussion">Percussion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="clef-checkbox-grid grid grid-cols-2 gap-x-2 gap-y-1.5">
                  <div className="field-group flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="show-clef"
                      className="field-checkbox h-4 w-4 rounded border-input"
                      checked={meta.showClef ?? true}
                      onChange={(e) => updateMeta({ showClef: e.target.checked })}
                    />
                    <Label htmlFor="show-clef" className="field-label text-xs">
                      Show Clef
                    </Label>
                  </div>

                  <div className="field-group flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="show-key-sig"
                      className="field-checkbox h-4 w-4 rounded border-input"
                      checked={meta.showKeySignature}
                      onChange={(e) => updateMeta({ showKeySignature: e.target.checked })}
                    />
                    <Label htmlFor="show-key-sig" className="field-label text-xs">
                      Show Key Signature
                    </Label>
                  </div>
                </div>

                {(meta.showClef ?? true) && (
                  <div className="field-group space-y-1">
                    <Label className="field-label text-xs">Clef At</Label>
                    <div className="clef-display-toggle flex gap-0.5 rounded-md border border-input p-0.5">
                      {([
                        ["start", "Start"],
                        ["section", "Section"],
                        ["eachLine", "Each Line"],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          className={`clef-display-btn flex-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                            (meta.clefDisplay ?? "start") === value
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          }`}
                          onClick={() => updateMeta({ clefDisplay: value })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </TabsContent>

          <TabsContent value="layout" className="layout-tab px-3 pb-4">
            <div className="pt-2 space-y-4">
              {/* Style import/export */}
              <div className="style-io-section space-y-2">
                <Label className="section-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  User Style
                </Label>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="btn-style-export h-7 flex-1 text-[11px]"
                    onClick={() => {
                      const style = buildUserStyle(
                        fontConfig,
                        measuresMode,
                        meta.measuresPerLine,
                        justification,
                      )
                      const json = JSON.stringify(style, null, 2)
                      downloadFile(json, "chordee-style.json", "application/json")
                    }}
                  >
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="btn-style-import h-7 flex-1 text-[11px]"
                    onClick={async () => {
                      try {
                        const content = await uploadFile(".json")
                        const parsed = parseUserStyle(content)
                        if (!parsed) return
                        setFontConfig(parsed.fonts)
                        setMeasuresPerLineMode(parsed.layout.measuresPerLineMode)
                        if (parsed.layout.measuresPerLine != null) {
                          updateMeta({ measuresPerLine: parsed.layout.measuresPerLine })
                        }
                        setJustificationStrategy(parsed.layout.justification)
                      } catch {
                        /* user cancelled */
                      }
                    }}
                  >
                    Import
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Saves layout + font settings as JSON. User accounts soon.
                </p>
              </div>

              <Separator className="layout-sep" />

              {/* Page background */}
              <div className="page-bg-section space-y-2">
                <Label className="section-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Page Background
                </Label>
                <div className="page-bg-picker grid grid-cols-3 gap-1">
                  {([
                    ["parchment", "Parchment"],
                    ["crumpled", "Crumpled"],
                    ["flat", "Flat"],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      className={`page-bg-btn rounded px-1.5 py-1 text-[11px] font-medium transition-colors ${
                        pageBgMode === mode
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      onClick={() => setPageBgMode(mode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {pageBgMode === "flat" && (
                  <div className="flat-color-row flex items-center gap-2 pt-1">
                    <Label className="field-label text-xs flex-1">Fill color</Label>
                    <label
                      className="page-bg-color-picker relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-background hover:bg-accent"
                      title="Page background color"
                      aria-label="Page background color"
                    >
                      <span
                        className="page-bg-swatch h-5 w-10 rounded-sm border border-border"
                        style={{ backgroundColor: bgColor || "#ffffff" }}
                      />
                      <input
                        type="color"
                        className="sr-only"
                        value={bgColor || "#ffffff"}
                        onChange={(e) => setBgColor(e.target.value)}
                      />
                    </label>
                  </div>
                )}
              </div>

              <Separator className="layout-sep-2" />

              {/* Layout options */}
              <div className="layout-section space-y-3">
                <Label className="section-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Layout
                </Label>

                <div className="field-group space-y-1">
                  <Label className="field-label text-xs">Bars Per Line</Label>
                  <Select
                    value={measuresMode}
                    onValueChange={(v) => setMeasuresPerLineMode(v as "auto" | "fixed")}
                  >
                    <SelectTrigger className="field-select h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="fixed">Fixed ({meta.measuresPerLine})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {measuresMode === "fixed" && (
                  <div className="field-group space-y-1">
                    <Label className="field-label text-xs">Measures Per Line</Label>
                    <Input
                      className="field-input h-8 text-sm"
                      type="number"
                      min={1}
                      max={8}
                      value={meta.measuresPerLine}
                      onChange={(e) => updateMeta({ measuresPerLine: parseInt(e.target.value) || 4 })}
                    />
                  </div>
                )}

                <div className="field-group space-y-1">
                  <Label className="field-label text-xs">Justification</Label>
                  <Select
                    value={justification}
                    onValueChange={(v) => setJustificationStrategy(v as "proportional" | "equal")}
                  >
                    <SelectTrigger className="field-select h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proportional">Proportional</SelectItem>
                      <SelectItem value="equal">Equal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="font-sep" />

              {/* Font configuration */}
              <div className="font-section space-y-2">
                <Label className="section-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fonts
                </Label>

                {(
                  [
                    ["chord", "Chord", "chordSize", "chordColor"],
                    ["heading", "Heading", "headingSize", "headingColor"],
                    ["subtitle", "Subtitle", "subtitleSize", "subtitleColor"],
                    ["body", "Body", "bodySize", "bodyColor"],
                    ["lyric", "Lyric", "lyricSize", "lyricColor"],
                    ["dynamic", "Dynamic", "dynamicSize", "dynamicColor"],
                    ["rehearsal", "Rehearsal / Section", "rehearsalSize", "rehearsalColor"],
                    ["timeSignature", "Time Signature", "timeSignatureSize", "timeSignatureColor"],
                    ["clef", "Clef & Key Sig", "clefSize", "clefColor"],
                  ] as const
                ).map(([fontKey, label, sizeKey, colorKey]) => {
                  const isExpanded = !!expandedFonts[fontKey]
                  return (
                    <div key={fontKey} className="field-group space-y-1.5 rounded-md border border-input/50 p-2">
                      <div className="flex items-center justify-between">
                        <Label className="field-label text-xs font-medium">{label}</Label>
                        <button
                          type="button"
                          className="font-expand-toggle rounded hover:bg-accent p-0.5"
                          onClick={() => toggleFontExpanded(fontKey)}
                          aria-label={isExpanded ? `Collapse ${label} details` : `Expand ${label} details`}
                          title={isExpanded ? "Hide size" : "Show size"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      <div className="font-color-row flex items-center gap-1.5">
                        <Select
                          value={fontConfig[fontKey]}
                          onValueChange={(v) => setFontConfig({ [fontKey]: v })}
                        >
                          <SelectTrigger className="field-select h-8 text-sm flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONT_FAMILIES.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <label
                          className="font-color-picker relative inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-background hover:bg-accent"
                          title={`${label} color`}
                          aria-label={`${label} color`}
                        >
                          <span
                            className="font-color-swatch h-4 w-4 rounded-sm border border-border"
                            style={{ backgroundColor: fontConfig[colorKey] ?? "#000000" }}
                          />
                          <input
                            type="color"
                            className="sr-only"
                            value={fontConfig[colorKey] ?? "#000000"}
                            onChange={(e) => setFontConfig({ [colorKey]: e.target.value })}
                          />
                        </label>
                      </div>
                      {isExpanded && (
                        <SizeToggle
                          label=""
                          value={fontConfig[sizeKey] as RelativeSize}
                          onChange={(v) => setFontConfig({ [sizeKey]: v })}
                        />
                      )}
                    </div>
                  )
                })}

                {/* Line Spacing */}
                <SizeToggle
                  label="Line Spacing"
                  value={fontConfig.lineSpacing}
                  onChange={(v) => setFontConfig({ lineSpacing: v })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="selection" className="selection-tab px-3 pb-4">
            <div className="pt-2">
              {!selection ? (
                <p className="empty-selection text-sm text-muted-foreground">
                  Click a beat or slot to select it
                </p>
              ) : (
                <SelectionProperties
                  selection={selection}
                  chart={chart}
                  updateSection={updateSection}
                  setSectionTimeSignature={setSectionTimeSignature}
                  deleteSection={deleteSection}
                  addSection={addSection}
                  updateMeasure={updateMeasure}
                  updateBeat={updateBeat}
                  setBeatDivision={setBeatDivision}
                  addMeasure={addMeasure}
                  deleteMeasure={deleteMeasure}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="controls" className="controls-tab pb-4 max-md:hidden">
            <TouchControls compact />
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
    </>
  )
}

// ── Selection-sensitive Properties ─────────────────────────────────────

function SelectionProperties({
  selection,
  chart,
  updateSection,
  setSectionTimeSignature,
  deleteSection,
  addSection,
  updateMeasure,
  updateBeat,
  setBeatDivision,
  addMeasure,
  deleteMeasure,
}: {
  selection: NonNullable<ReturnType<typeof useChartStore.getState>["ui"]["selection"]>
  chart: ReturnType<typeof useChartStore.getState>["chart"]
  updateSection: ReturnType<typeof useChartStore.getState>["updateSection"]
  setSectionTimeSignature: ReturnType<typeof useChartStore.getState>["setSectionTimeSignature"]
  deleteSection: ReturnType<typeof useChartStore.getState>["deleteSection"]
  addSection: ReturnType<typeof useChartStore.getState>["addSection"]
  updateMeasure: ReturnType<typeof useChartStore.getState>["updateMeasure"]
  updateBeat: ReturnType<typeof useChartStore.getState>["updateBeat"]
  setBeatDivision: ReturnType<typeof useChartStore.getState>["setBeatDivision"]
  addMeasure: ReturnType<typeof useChartStore.getState>["addMeasure"]
  deleteMeasure: ReturnType<typeof useChartStore.getState>["deleteMeasure"]
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const section = chart.sections.find((s) => s.id === selection.sectionId)
  const measure = section?.measures.find((m) => m.id === selection.measureId)
  const beat = measure?.beats.find((b) => b.id === selection.beatId)
  const slot = beat?.slots.find((s) => s.id === selection.slotId)

  return (
    <div className="selection-props space-y-4">
      {/* Section editing */}
      {section && (
        <div className="section-props space-y-2">
          <Label className="section-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Section
          </Label>

          {/* Section name — editable input with preset quick-picks */}
          <div className="field-group space-y-1">
            <Label className="field-label text-xs">Name</Label>
            <Input
              className="field-input h-8 text-sm"
              value={section.name}
              onChange={(e) => updateSection(section.id, { name: e.target.value })}
              placeholder="Section name"
            />
            <div className="section-presets flex flex-wrap gap-1 pt-1">
              {SECTION_PRESETS.map((p) => (
                <button
                  key={p}
                  className={`section-preset-btn rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                    section.name === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => updateSection(section.id, { name: p })}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Rehearsal mark */}
          <div className="field-group space-y-1">
            <Label className="field-label text-xs">Rehearsal Mark</Label>
            <Input
              className="field-input h-8 text-sm"
              value={section.rehearsalMark ?? ""}
              onChange={(e) => updateSection(section.id, { rehearsalMark: e.target.value || undefined })}
              placeholder="e.g. A, B, C"
              maxLength={4}
            />
          </div>

          {/* Time Signature */}
          <div className="field-group space-y-1">
            <Label className="field-label text-xs">Time Signature</Label>
            <Select
              value={`${section.timeSignature.beats}/${section.timeSignature.beatUnit}`}
              onValueChange={(v) => {
                const [b, u] = v.split("/").map(Number)
                setSectionTimeSignature(section.id, b, u as 2 | 4 | 8 | 16)
              }}
            >
              <SelectTrigger className="field-select h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_SIGNATURES.map((ts) => (
                  <SelectItem key={ts.label} value={ts.label}>
                    {ts.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Navigation */}
          <div className="field-group space-y-1">
            <Label className="field-label text-xs">Navigation</Label>
            <Select
              value={section.navigation?.type ?? "none"}
              onValueChange={(v) =>
                updateSection(section.id, {
                  navigation: v === "none" ? undefined : { type: v as any },
                })
              }
            >
              <SelectTrigger className="field-select h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {NAVIGATION_TYPES.map((n) => (
                  <SelectItem key={n.type} value={n.type}>
                    {n.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section actions */}
          <div className="section-actions flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="btn-add-section-after flex-1"
              onClick={() => addSection()}
            >
              + Section
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="btn-delete-section flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={chart.sections.length <= 1}
            >
              Delete
            </Button>
          </div>

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <ConfirmDialog
              title="Delete Section"
              message={`Are you sure you want to delete "${section.name}"? This will remove all measures and chords in this section. This action can be undone with Ctrl+Z.`}
              confirmLabel="Delete Section"
              onConfirm={() => {
                deleteSection(section.id)
                setShowDeleteConfirm(false)
              }}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          )}
        </div>
      )}

      {/* Measure controls */}
      {measure && section && (
        <>
          <Separator />
          <div className="measure-props space-y-2">
            <Label className="section-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Measure
            </Label>

            <div className="field-group flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="field-label text-xs">Start Barline</Label>
                <Select
                  value={measure.barlineStart}
                  onValueChange={(v) =>
                    updateMeasure(section.id, measure.id, { barlineStart: v as any })
                  }
                >
                  <SelectTrigger className="field-select h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["single", "double", "repeatStart"] as const).map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="field-label text-xs">End Barline</Label>
                <Select
                  value={measure.barlineEnd}
                  onValueChange={(v) =>
                    updateMeasure(section.id, measure.id, { barlineEnd: v as any })
                  }
                >
                  <SelectTrigger className="field-select h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BARLINE_TYPES.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="field-group flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="add-measure-btn flex-1"
                onClick={() => addMeasure(section.id)}
              >
                + Measure
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="delete-measure-btn flex-1 text-destructive"
                onClick={() => deleteMeasure(section.id, measure.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Beat controls */}
      {beat && section && measure && (
        <>
          <Separator />
          <div className="beat-props space-y-2">
            <Label className="section-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Beat
            </Label>

            <div className="field-group space-y-1">
              <Label className="field-label text-xs">Division</Label>
              <div className="division-btns flex flex-wrap gap-1">
                {(
                  [
                    ["6", "whole", "𝅝"],
                    ["5", "half", "𝅗𝅥"],
                    ["4", "quarter", "♩"],
                    ["3", "eighth", "♪"],
                    ["2", "sixteenth", "♬"],
                    ["1", "thirtySecond", "𝅘𝅥𝅰"],
                  ] as const
                ).map(([key, div, label]) => (
                  <Button
                    key={div}
                    variant={beat.division === div ? "default" : "outline"}
                    size="sm"
                    className="division-btn h-7 w-9 text-xs"
                    onClick={() => setBeatDivision(section.id, measure.id, beat.id, div as Division)}
                    title={`${div} (key: ${key})`}
                  >
                    {key}
                  </Button>
                ))}
              </div>
            </div>

            <div className="field-group space-y-1">
              <Label className="field-label text-xs">Dynamics</Label>
              <Select
                value={beat.dynamics || "none"}
                onValueChange={(v) =>
                  updateBeat(section.id, measure.id, beat.id, {
                    dynamics: v === "none" ? undefined : v,
                  })
                }
              >
                <SelectTrigger className="field-select h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {DYNAMICS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="field-group space-y-1">
              <Label className="field-label text-xs">Lyrics</Label>
              <Input
                className="field-input h-8 text-sm"
                value={beat.lyrics || ""}
                onChange={(e) =>
                  updateBeat(section.id, measure.id, beat.id, {
                    lyrics: e.target.value || undefined,
                  })
                }
                placeholder="Lyric syllable"
              />
            </div>
          </div>
        </>
      )}

      {/* Current chord display */}
      {slot && (
        <>
          <Separator />
          <div className="slot-props space-y-1">
            <Label className="section-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Slot
            </Label>
            <p className="chord-display text-lg font-petaluma-script">
              {slot.chord ? formatChord(slot.chord) : slot.nashvilleChord
                ? `${slot.nashvilleChord.degree}${slot.nashvilleChord.quality || ""}`
                : "—"}
            </p>
            <p className="slot-hint text-xs text-muted-foreground">
              Type a chord name or press Enter to edit
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ── Size Toggle (inline radio buttons) ─────────────────────────────────

function SizeToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: RelativeSize
  onChange: (v: RelativeSize) => void
}) {
  return (
    <div className={`field-group ${label ? "space-y-1" : ""}`}>
      {label && <Label className="field-label text-xs">{label}</Label>}
      <div className="size-toggle flex gap-0.5 rounded-md border border-input p-0.5">
        {RELATIVE_SIZES.map((s) => (
          <button
            key={s.value}
            className={`size-toggle-btn flex-1 rounded-sm px-1 py-0.5 text-[10px] font-medium transition-colors ${
              value === s.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            onClick={() => onChange(s.value)}
            title={s.label}
          >
            {s.value.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}

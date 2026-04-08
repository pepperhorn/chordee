# Chord Charts v2 — Pretext Layout Engine

## Overview

Rebuild the PepperHorn chord chart editor with [chenglou/pretext](https://github.com/chenglou/pretext) as the layout engine, replacing CSS-driven layout (flexbox/grid) with a pre-computed measure-then-render pipeline. The existing [pepperhorn/chordcharts](https://github.com/pepperhorn/chordcharts) repo serves as reference for data model, parsing, and UX — not as a fork base.

## Goals

- **DOM-free layout**: All horizontal spacing (beat widths, bar widths, bars-per-line) computed by Pretext before any rendering occurs. Zero `getBoundingClientRect` or layout reflow during chart display.
- **Responsive reflow**: Container resize triggers `layout()` recalculation only — no DOM measurement pass. Bars-per-line adapts automatically to viewport width.
- **Render-target agnostic**: The layout engine outputs a position map. Renderers (SVG for screen, Canvas for export/PDF) consume the same data.
- **Portable data model**: Carry over Zod schemas, chord parser, store logic, and I/O from v1 unchanged.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Data Layer (from v1)            │
│  schema.ts · store.ts · chordParser.ts · io.ts  │
└──────────────────────┬──────────────────────────┘
                       │ chart state (Zustand)
                       ▼
┌─────────────────────────────────────────────────┐
│              Layout Engine (new)                 │
│                                                  │
│  1. Preparation pass (prepareInlineFlow)         │
│     - Measure all chord symbols per font/size    │
│     - Measure all lyric syllables                │
│     - Measure section headers, rehearsal marks   │
│                                                  │
│  2. Beat width resolution                        │
│     - Per-beat width = max(chord, lyric, min)    │
│     - Apply division multipliers                 │
│                                                  │
│  3. Bar width resolution                         │
│     - Sum beat widths + barline + padding         │
│     - Model each bar as InlineFlowItem           │
│       (break: 'never', extraWidth for chrome)    │
│                                                  │
│  4. Line breaking (walkInlineFlowLines)          │
│     - Feed bars into Pretext at container width  │
│     - Get optimal bars-per-line automatically    │
│                                                  │
│  5. Position map generation                      │
│     - Absolute x,y for every element             │
│     - Output: LayoutResult (see types below)     │
└──────────────────────┬──────────────────────────┘
                       │ LayoutResult
                       ▼
┌─────────────────────────────────────────────────┐
│             Renderer (new)                       │
│                                                  │
│  SVGRenderer (screen)                            │
│    - React components placed at pre-computed     │
│      positions via absolute SVG coordinates      │
│    - No CSS layout within chart area             │
│                                                  │
│  CanvasRenderer (export/print)                   │
│    - Same LayoutResult → canvas draw calls       │
│    - PDF generation without headless browser     │
└─────────────────────────────────────────────────┘
```

## Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Astro 5 + React 19 | Same as v1 |
| State | Zustand | Carry over store.ts + undo/redo |
| Validation | Zod | Carry over schema.ts |
| Layout engine | `@chenglou/pretext` | Core addition |
| Chart rendering | SVG (inline React) | Replaces CSS grid layout |
| UI chrome | Tailwind + Radix/shadcn | Toolbar, panels, dialogs — unchanged |
| Export | Canvas API + pdf-lib | For PDF/PNG export |

## Carry Over from v1 (Copy Directly)

These files are layout-agnostic and well-tested:

- `src/lib/schema.ts` — Zod schemas and TypeScript types for chart data
- `src/lib/store.ts` — Zustand store, actions, undo/redo middleware
- `src/lib/chordParser.ts` — Parse chord strings (Am7, F#maj7, Bb, Nashville numbers)
- `src/lib/constants.ts` — Time signatures, divisions, chord roots/qualities
- `src/lib/io.ts` — JSON and Markdown import/export
- `src/lib/utils.ts` — General utilities
- `src/components/ui/` — shadcn-style primitives (Button, Input, Select, etc.)

## New Modules to Build

### 1. `src/lib/layout/engine.ts` — Layout Engine

The core module. Takes chart state + container dimensions, returns a fully-resolved position map.

```typescript
import { prepareInlineFlow, walkInlineFlowLines, measureInlineFlow } from '@chenglou/pretext/inline-flow'
import { prepare, layout } from '@chenglou/pretext'

interface LayoutConfig {
  containerWidth: number
  fonts: {
    chord: string        // e.g. '16px Inter'
    lyric: string        // e.g. '12px Inter'
    section: string      // e.g. '700 14px Inter'
    rehearsal: string    // e.g. '700 16px Inter'
  }
  spacing: {
    beatPaddingX: number
    barPaddingX: number
    barGap: number
    sectionGap: number
    lineHeight: number
    lyricLineHeight: number
    staveHeight: number    // height of slash notation area
  }
}

interface LayoutResult {
  lines: LayoutLine[]
  totalHeight: number
}

interface LayoutLine {
  y: number
  height: number              // stave + lyrics + spacing
  elements: LayoutElement[]
}

type LayoutElement =
  | { type: 'section-header'; x: number; width: number; text: string; rehearsalMark?: string }
  | { type: 'barline'; x: number; style: BarlineStyle }
  | { type: 'bar'; x: number; width: number; beats: LayoutBeat[] }

interface LayoutBeat {
  x: number                   // relative to bar
  width: number
  chord?: { text: string; x: number }
  slashes: { x: number; articulation?: string }[]
  lyric?: { text: string; x: number; width: number }
  dynamic?: string
}

function computeLayout(chart: ChartData, config: LayoutConfig): LayoutResult
```

#### Preparation Phase

```typescript
// For each unique chord symbol in the chart, measure once:
const chordWidths = new Map<string, number>()

for (const symbol of uniqueChordSymbols) {
  const prepared = prepare(symbol, config.fonts.chord)
  const { height } = layout(prepared, Infinity, config.spacing.lineHeight)
  // Actually we need width — use prepareWithSegments + measureNaturalWidth
  const preparedSeg = prepareWithSegments(symbol, config.fonts.chord)
  chordWidths.set(symbol, measureNaturalWidth(preparedSeg))
}

// Same for lyrics
const lyricWidths = new Map<string, number>()
// ...
```

#### Line Breaking Phase

```typescript
// Model each bar as an atomic inline flow item
const barItems: InlineFlowItem[] = bars.map(bar => ({
  text: bar.chordSummary,     // representative text for measurement
  font: config.fonts.chord,
  break: 'never' as const,   // bars don't break mid-bar
  extraWidth: bar.computedWidth - bar.textWidth + config.spacing.barGap
}))

const prepared = prepareInlineFlow(barItems)

// Walk lines to find optimal bars-per-line
const lines: number[][] = []   // indices of bars per line
walkInlineFlowLines(prepared, config.containerWidth, line => {
  const barIndices = line.fragments.map(f => f.itemIndex)
  lines.push(barIndices)
})
```

### 2. `src/lib/layout/cache.ts` — Measurement Cache

Wraps Pretext's prepare/measure calls with a cache keyed on `text + font`. Avoids redundant preparation across re-renders.

```typescript
interface MeasurementCache {
  measureText(text: string, font: string): number
  measureParagraph(text: string, font: string, maxWidth: number, lineHeight: number): { height: number; lineCount: number }
  clear(): void
}
```

This sits on top of Pretext's internal cache and adds application-level deduplication — e.g. the chord "Am7" appearing 16 times in a chart only gets measured once.

### 3. `src/lib/layout/justify.ts` — Bar Justification

After Pretext determines which bars go on each line, distribute remaining horizontal space. Two strategies:

- **Proportional**: Extra space distributed proportional to bar content width (denser bars get more). This is the standard engraving approach.
- **Equal**: All bars on a line stretched to equal width (simpler, Nashville chart convention).

```typescript
function justifyLine(
  bars: { index: number; naturalWidth: number }[],
  lineWidth: number,
  strategy: 'proportional' | 'equal'
): { index: number; x: number; width: number }[]
```

### 4. `src/components/chord-chart/ChartSVG.tsx` — SVG Renderer

Replaces the current `ChartCanvas` component. Receives `LayoutResult` and renders positioned SVG elements. No CSS layout logic — every element has absolute coordinates from the layout engine.

```tsx
function ChartSVG({ layout, config, selection, onSelect }: ChartSVGProps) {
  return (
    <svg width={config.containerWidth} height={layout.totalHeight}>
      {layout.lines.map((line, i) => (
        <g key={i} transform={`translate(0, ${line.y})`}>
          {line.elements.map(renderElement)}
        </g>
      ))}
    </svg>
  )
}

function renderElement(el: LayoutElement) {
  switch (el.type) {
    case 'bar':
      return <BarGroup {...el} />
    case 'barline':
      return <Barline {...el} />
    case 'section-header':
      return <SectionHeader {...el} />
  }
}
```

#### Slash Notation

Slashes are simple SVG paths at computed positions, not font glyphs:

```tsx
function Slash({ x, y, width, height, articulation }: SlashProps) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <line x1={0} y1={height} x2={width} y2={0} stroke="currentColor" strokeWidth={2} />
      {articulation === 'accent' && <path d="..." />}
      {articulation === 'staccato' && <circle cx={width/2} cy={height + 4} r={1.5} />}
    </g>
  )
}
```

### 5. `src/components/chord-chart/ChartInteraction.tsx` — Interaction Layer

Transparent overlay on the SVG that handles click/tap targets, selection state, and keyboard navigation. Uses the same `LayoutResult` to map pointer coordinates → beat/slot selection.

```typescript
function hitTest(x: number, y: number, layout: LayoutResult): SelectionTarget | null
```

This decouples interaction from rendering — the SVG elements don't need click handlers, the overlay handles everything.

### 6. `src/lib/export/pdf.ts` — PDF Export

Uses the same `LayoutResult` to render to a Canvas element, then converts to PDF via pdf-lib. No headless browser required.

```typescript
async function exportToPDF(chart: ChartData, config: LayoutConfig): Promise<Uint8Array> {
  const layout = computeLayout(chart, { ...config, containerWidth: PDF_WIDTH })
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  renderToCanvas(ctx, layout, config)
  // ... pdf-lib integration
}
```

## Layout Pipeline Detail

### Beat Width Calculation

Each beat's width is determined by its widest content:

```
beatWidth = max(
  chordSymbolWidth + chordPadding,
  lyricSyllableWidth + lyricPadding,
  minBeatWidth × divisionMultiplier
)
```

Division multipliers scale the minimum beat width:
- Quarter (1 slash): 1.0×
- Eighth (2 slashes): 1.2×
- Eighth triplet (3): 1.5×
- Sixteenth (4): 1.8×
- Sixteenth triplet (5): 2.0×

### Bar Width Calculation

```
barWidth = sum(beatWidths) + leftBarlinWidth + rightBarlineWidth + barPadding
```

### Line Breaking

Bars are fed to `prepareInlineFlow` / `walkInlineFlowLines` as atomic items. Pretext handles the knapsack problem of fitting bars into lines optimally.

### Responsive Reflow

On container resize:

1. Beat/bar widths are already cached (text hasn't changed)
2. Re-run `walkInlineFlowLines` with new container width — this is pure arithmetic, sub-millisecond
3. Re-run justification
4. Generate new `LayoutResult`
5. React re-renders SVG with new positions

This is dramatically faster than the current approach where the browser re-layouts all the CSS grid/flex containers.

## Interaction Model

### Selection

Carried over from v1 conceptually, but implemented via hit-testing against the position map rather than DOM focus/blur:

- Click/tap on a beat slot → select it
- Arrow keys navigate the position map directly
- Enter/Space on a selected slot → open chord input (floating popover positioned from layout coordinates)
- Number keys 1-5 → change beat division (triggers layout recalc)

### Editing

Chord input remains a floating `<input>` element (DOM, not SVG) positioned absolutely based on the selected beat's coordinates from `LayoutResult`. This keeps text input accessible and IME-compatible.

### Drag to Reorder

Section reordering operates on the data model (Zustand store), which triggers a full layout recalculation. The drag handle is rendered at the section header's computed position.

## File Structure

```
src/
├── components/
│   ├── chord-chart/
│   │   ├── ChartSVG.tsx            # SVG renderer — reads LayoutResult
│   │   ├── ChartInteraction.tsx     # Hit-testing, selection, keyboard nav
│   │   ├── ChordInput.tsx           # Floating chord entry popover
│   │   ├── BarGroup.tsx             # SVG group for one bar
│   │   ├── BeatSlot.tsx             # SVG group for one beat
│   │   ├── Slash.tsx                # SVG slash notation mark
│   │   ├── Barline.tsx              # SVG barline variants
│   │   ├── SectionHeader.tsx        # SVG section label + rehearsal mark
│   │   ├── Toolbar.tsx              # Carry over from v1
│   │   ├── PropertiesPanel.tsx      # Carry over from v1 (adapt for new selection model)
│   │   ├── ChordChartEditor.tsx     # Top-level: wires store → layout → renderer
│   │   └── index.ts
│   └── ui/                          # Carry over from v1
├── lib/
│   ├── layout/
│   │   ├── engine.ts                # computeLayout() — the core pipeline
│   │   ├── cache.ts                 # Measurement cache over Pretext
│   │   ├── justify.ts               # Line justification strategies
│   │   ├── constants.ts             # Spacing defaults, division multipliers
│   │   └── types.ts                 # LayoutResult, LayoutLine, LayoutElement, etc.
│   ├── schema.ts                    # Carry over
│   ├── store.ts                     # Carry over (minor additions for layout config)
│   ├── chordParser.ts               # Carry over
│   ├── constants.ts                 # Carry over
│   ├── io.ts                        # Carry over
│   ├── useKeyboardNavigation.ts     # Rewrite for position-map navigation
│   ├── useChartLayout.ts            # React hook: store → computeLayout → memoised result
│   └── utils.ts                     # Carry over
├── pages/
│   └── index.astro
├── layouts/
│   └── Layout.astro
└── styles/
    ├── globals.css
    └── chord-chart.css              # Minimal — just toolbar/panel, no chart layout CSS
```

## Implementation Phases

### Phase 1: Foundation

1. Scaffold new Astro + React project
2. Copy over data layer files (schema, store, parser, constants, io, utils, ui components)
3. Install `@chenglou/pretext`
4. Implement `MeasurementCache` with basic tests
5. Implement `computeLayout()` with hardcoded test chart — verify beat/bar/line calculations

### Phase 2: Rendering

1. Build `ChartSVG` renderer — static display of a chart from `LayoutResult`
2. Build individual SVG components (BarGroup, BeatSlot, Slash, Barline, SectionHeader)
3. Wire `useChartLayout` hook: store state → layout engine → SVG renderer
4. Verify responsive reflow by resizing container

### Phase 3: Interaction

1. Implement hit-testing (`ChartInteraction`)
2. Wire selection state into store
3. Build `ChordInput` floating popover
4. Implement keyboard navigation against position map
5. Beat division changes (number keys) → store update → layout recalc → re-render

### Phase 4: Full Feature Parity

1. Section management (add/remove/reorder)
2. Barline types
3. Navigation marks (segno, coda, D.S., D.C., endings)
4. Dynamics and lyrics editing
5. Undo/redo verification
6. JSON/Markdown import/export
7. Themes (light/dark/high-contrast via CSS custom properties on SVG)
8. Accessibility audit (ARIA on SVG elements, skip links, screen reader announcements)

### Phase 5: Export & Polish

1. Canvas renderer for PDF/PNG export
2. Print stylesheet
3. Performance profiling — verify sub-ms layout on charts with 100+ bars
4. Integration with PepperHorn platform (Directus, auth, chart storage)

## Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Pretext's `prepareInlineFlow` is marked experimental/alpha | The core `prepare`/`layout` APIs are stable. Fall back to modelling bars with `walkLineRanges` if inline-flow has issues. |
| SVG rendering performance with large charts | Use React virtualisation — only render lines visible in viewport. Layout engine already knows line heights. |
| Chord input IME/accessibility in floating popover | Keep input as real DOM `<input>`, not SVG. Position absolutely from layout coordinates. |
| Font loading race with Pretext measurement | Run `document.fonts.ready` before first `prepare()` call. Cache invalidation on font load. |
| Pretext measures text but not SVG paths (slashes, barlines) | These are fixed-width constants. Add their known widths as `extraWidth` in the bar's `InlineFlowItem`. |

## Open Questions

- **Justified vs ragged-right**: Should lines justify to fill container width (traditional engraving) or leave ragged right (more casual/Nashville)? Probably a user toggle mapped to the `justify.ts` strategy.
- **Section headers**: Do they occupy their own line (current v1 behaviour) or can they sit inline before the first bar? The layout engine can support either — model section headers as `InlineFlowItem` with `break: 'never'` and high `extraWidth` to force a line break, or insert them as separate layout passes.
- **Multi-line lyrics**: Some beats may have multiple lyric lines (verse 1, verse 2). This affects line height calculation. Pretext can measure multi-line text height via `layout()` to determine the tallest lyric block per line.
- **Nashville number alignment**: Nashville charts often right-align numbers within beats. The layout engine computes beat width; alignment within the beat is a renderer concern.

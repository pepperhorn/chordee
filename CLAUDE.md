# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chord Charts v2 ("chordee2") — a chord chart editor rebuilt with [chenglou/pretext](https://github.com/chenglou/pretext) as the layout engine. Replaces CSS-driven layout from v1 ([pepperhorn/chordcharts](https://github.com/pepperhorn/chordcharts)) with a measure-then-render pipeline: all positioning is pre-computed before any rendering occurs.

## Stack

- **Framework**: Astro 5 + React 19
- **State**: Zustand (with undo/redo middleware)
- **Validation**: Zod
- **Layout engine**: `@chenglou/pretext` — text measurement and line breaking
- **Chart rendering**: SVG via React components (positioned with absolute coordinates from layout engine)
- **UI chrome**: Tailwind + Radix/shadcn
- **Export**: Canvas API + pdf-lib for PDF/PNG

## Commands

```bash
npm run dev -- --host 0.0.0.0  # Start dev server (accessible on network)
npx astro build                 # Production build to dist/
npx astro preview               # Preview production build
npx astro check                 # Type checking
```

## Architecture

The system has three layers connected by a unidirectional data flow:

1. **Data Layer** (`src/lib/`) — Zod schemas, Zustand store, chord parser, I/O. Carried over from v1; layout-agnostic.
2. **Layout Engine** (`src/lib/layout/`) — Takes chart state + container dimensions, outputs a `LayoutResult` (absolute x,y positions for every element). Uses Pretext for text measurement and line breaking. No DOM access.
3. **Renderer** (`src/components/chord-chart/`) — SVG components placed at pre-computed positions. No CSS layout within the chart area. Interaction via hit-testing against the position map, not DOM event handlers on individual elements.

Key flow: `Store state → computeLayout() → LayoutResult → ChartSVG`

### Layout Pipeline

1. **Measure** unique chord/lyric strings via Pretext (cached)
2. **Compute beat widths** = max(chord width, lyric width, min beat width × division multiplier)
3. **Compute bar widths** = sum of beat widths + barline + padding
4. **Line break** via Pretext's `walkRichInlineLineRanges` — bars are atomic items that don't break mid-bar
5. **Justify** lines (proportional or equal distribution of remaining space)
6. **Output** `LayoutResult` with absolute coordinates

### Interaction Model

- Selection and keyboard navigation operate on the position map, not the DOM
- Chord input is a real DOM `<input>` positioned absolutely from layout coordinates (for IME/accessibility)
- Container resize only re-runs line breaking + justification (beat/bar widths are cached)

## CSS / Tailwind Convention

Always add contextual class names to elements alongside Tailwind utility classes for DOM inspector identification and test hooks:

```html
<div className="chord-group flex flex-col items-center gap-2">
<button className="btn-shuffle px-5 py-2 rounded-full ...">
```

## Dev Server

Always use `--host 0.0.0.0` when starting dev servers:

```bash
npm run dev -- --host 0.0.0.0
```

## Music Fonts

- **Default**: Petaluma SMuFL (handwritten/Real Book style) — SIL OFL, from [steinbergmedia/petaluma](https://github.com/steinbergmedia/petaluma)
- **Alternative**: Bravura SMuFL (classical engraving) — SIL OFL, from [steinbergmedia/bravura](https://github.com/steinbergmedia/bravura)
- **Additional**: Finale Maestro, Finale Jazz (SMuFL), Finale Broadway (SMuFL) — SIL OFL versions from MakeMusic
- **NOT usable**: Finale legacy fonts (Broadway Copyist TTFs, Jazz TTFs in repo) — proprietary, cannot serve on web
- Users can configure fonts per element: heading, subtitle, body, lyric, dynamic, chord

## Pretext API Notes

The spec references `prepareInlineFlow` / `walkInlineFlowLines` — these don't exist. Use instead:
- `prepareRichInline` / `walkRichInlineLineRanges` from `@chenglou/pretext/rich-inline`
- `prepareWithSegments` → `measureNaturalWidth` from `@chenglou/pretext` (not `prepare`)

## Reference

The full architectural spec is in `CHORDCHARTS-PRETEXT-SPEC.md` — consult it for detailed type definitions, implementation phases, and open questions.

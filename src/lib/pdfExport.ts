import { PDFDocument } from "pdf-lib"
import type { LayoutResult } from "./layout/types"

// ── Paper sizes in PostScript points (1pt = 1/72 inch) ─────────────────

export const PAPER_SIZES_PT = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
} as const

export type PaperSize = keyof typeof PAPER_SIZES_PT
export type Orientation = "portrait" | "landscape"

export interface PdfExportOptions {
  paperSize: PaperSize
  orientation: Orientation
  marginPt: number
  title: string
  composer?: string
  copyright?: string
  headingFont: string
  bodyFont: string
}

export function paperDimsPt(size: PaperSize, orient: Orientation) {
  const base = PAPER_SIZES_PT[size]
  return orient === "portrait"
    ? { width: base.width, height: base.height }
    : { width: base.height, height: base.width }
}

// ── Font embedding ─────────────────────────────────────────────────────

const FONT_URLS = [
  { name: "Petaluma", url: "/fonts/Petaluma.woff2" },
  { name: "PetalumaScript", url: "/fonts/PetalumaScript.woff2" },
  { name: "PetalumaText", url: "/fonts/PetalumaText.woff2" },
  { name: "Bravura", url: "/fonts/Bravura.woff2" },
  { name: "BravuraText", url: "/fonts/BravuraText.woff2" },
] as const

let fontFaceCssCache: string | null = null

async function getFontFaceCss(): Promise<string> {
  if (fontFaceCssCache) return fontFaceCssCache
  const parts = await Promise.all(
    FONT_URLS.map(async (f) => {
      try {
        const resp = await fetch(f.url)
        const blob = await resp.blob()
        const dataUrl: string = await new Promise((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(r.result as string)
          r.onerror = () => reject(r.error)
          r.readAsDataURL(blob)
        })
        return `@font-face{font-family:"${f.name}";src:url(${dataUrl}) format("woff2");font-display:block;}`
      } catch {
        return ""
      }
    }),
  )
  fontFaceCssCache = parts.filter(Boolean).join("\n")
  return fontFaceCssCache
}

// ── SVG → PNG rasterization ────────────────────────────────────────────

async function svgStringToPngBytes(
  svgString: string,
  widthPt: number,
  heightPt: number,
  pixelRatio: number,
): Promise<Uint8Array> {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = (e) => reject(e)
      i.src = url
    })

    const canvas = document.createElement("canvas")
    canvas.width = Math.round(widthPt * pixelRatio)
    canvas.height = Math.round(heightPt * pixelRatio)
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas 2D context unavailable")
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    return await new Promise<Uint8Array>((resolve, reject) => {
      canvas.toBlob(async (b) => {
        if (!b) return reject(new Error("toBlob returned null"))
        const buf = await b.arrayBuffer()
        resolve(new Uint8Array(buf))
      }, "image/png")
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ── Pagination ─────────────────────────────────────────────────────────

interface PageSpec {
  pageNum: number
  startLine: number
  endLine: number // exclusive
}

function paginate(
  layout: LayoutResult,
  firstPageContentH: number,
  subsequentPageContentH: number,
): PageSpec[] {
  const pages: PageSpec[] = []
  const lines = layout.lines
  if (lines.length === 0) {
    return [{ pageNum: 1, startLine: 0, endLine: 0 }]
  }

  let i = 0
  let pageNum = 1
  while (i < lines.length) {
    const available = pageNum === 1 ? firstPageContentH : subsequentPageContentH
    const startY = lines[i].y
    let j = i
    while (j < lines.length) {
      const lineBottom = lines[j].y + lines[j].height - startY
      if (lineBottom > available) break
      j++
    }
    // ensure progress: at least one line per page
    if (j === i) j = i + 1
    pages.push({ pageNum, startLine: i, endLine: j })
    i = j
    pageNum++
  }
  return pages
}

// ── Per-page SVG construction ──────────────────────────────────────────

const SVG_NS = "http://www.w3.org/2000/svg"

function createSvgText(
  x: number,
  y: number,
  text: string,
  fontSize: number,
  opts: {
    anchor?: "start" | "middle" | "end"
    fontFamily?: string
    fontWeight?: number
    opacity?: number
  } = {},
): SVGTextElement {
  const el = document.createElementNS(SVG_NS, "text")
  el.setAttribute("x", String(x))
  el.setAttribute("y", String(y))
  if (opts.anchor) el.setAttribute("text-anchor", opts.anchor)
  el.setAttribute("font-size", String(fontSize))
  if (opts.fontFamily) el.setAttribute("font-family", opts.fontFamily)
  if (opts.fontWeight != null) el.setAttribute("font-weight", String(opts.fontWeight))
  if (opts.opacity != null) el.setAttribute("opacity", String(opts.opacity))
  el.setAttribute("fill", "#000")
  el.textContent = text
  return el
}

function stripSelectionArtifacts(root: Element): void {
  root
    .querySelectorAll<SVGElement>(
      '[class*="selection"],[class*="selected"],[class*="highlight"]',
    )
    .forEach((el) => el.remove())
}

interface BuildPageSvgArgs {
  sourceSvg: SVGSVGElement
  layout: LayoutResult
  chartHeaderHeight: number
  page: PageSpec
  totalPages: number
  paperWidthPt: number
  paperHeightPt: number
  marginPt: number
  contentWidthPt: number
  subsequentHeaderPt: number
  footerPt: number
  opts: PdfExportOptions
  fontFaceCss: string
}

function buildPageSvg({
  sourceSvg,
  layout,
  chartHeaderHeight,
  page,
  totalPages,
  paperWidthPt,
  paperHeightPt,
  marginPt,
  contentWidthPt,
  subsequentHeaderPt,
  footerPt,
  opts,
  fontFaceCss,
}: BuildPageSvgArgs): string {
  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("xmlns", SVG_NS)
  svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink")
  svg.setAttribute("width", String(paperWidthPt))
  svg.setAttribute("height", String(paperHeightPt))
  svg.setAttribute("viewBox", `0 0 ${paperWidthPt} ${paperHeightPt}`)
  svg.setAttribute("style", "color:#000;background:#fff;")

  // Font-face <defs><style>
  const defs = document.createElementNS(SVG_NS, "defs")
  const styleEl = document.createElementNS(SVG_NS, "style")
  styleEl.setAttribute("type", "text/css")
  styleEl.textContent = fontFaceCss
  defs.appendChild(styleEl)
  svg.appendChild(defs)

  // White background
  const bg = document.createElementNS(SVG_NS, "rect")
  bg.setAttribute("x", "0")
  bg.setAttribute("y", "0")
  bg.setAttribute("width", String(paperWidthPt))
  bg.setAttribute("height", String(paperHeightPt))
  bg.setAttribute("fill", "#ffffff")
  svg.appendChild(bg)

  // Content wrapper, offset by margins
  const content = document.createElementNS(SVG_NS, "g")
  content.setAttribute("transform", `translate(${marginPt}, ${marginPt})`)
  svg.appendChild(content)

  let bodyStartY = 0

  if (page.pageNum === 1) {
    // Clone chart-header from source (contains title, subtitle, composer, tempo)
    const sourceHeader = sourceSvg.querySelector(".chart-header")
    if (sourceHeader) {
      const clone = sourceHeader.cloneNode(true) as SVGGElement
      stripSelectionArtifacts(clone)
      content.appendChild(clone)
    }
    bodyStartY = chartHeaderHeight
  } else {
    // Page header: page number top-left, smaller centered title in far-right area
    const pageNumText = createSvgText(
      0,
      12,
      `${page.pageNum} / ${totalPages}`,
      10,
      { anchor: "start", fontFamily: `${opts.bodyFont}, sans-serif`, opacity: 0.7 },
    )
    content.appendChild(pageNumText)

    if (opts.title) {
      const titleRepeat = createSvgText(
        contentWidthPt,
        12,
        opts.title,
        11,
        {
          anchor: "end",
          fontFamily: `${opts.headingFont}, serif`,
          fontWeight: 700,
          opacity: 0.75,
        },
      )
      content.appendChild(titleRepeat)
    }

    bodyStartY = subsequentHeaderPt
  }

  // Lines for this page
  const firstLineY = layout.lines[page.startLine]?.y ?? 0
  const bodyOffsetY = bodyStartY - firstLineY
  const body = document.createElementNS(SVG_NS, "g")
  body.setAttribute("transform", `translate(0, ${bodyOffsetY})`)

  const sourceBody = sourceSvg.querySelector(".chart-body")
  if (sourceBody) {
    for (let i = page.startLine; i < page.endLine; i++) {
      const lineEl = sourceBody.querySelector(`[data-line-index="${i}"]`)
      if (lineEl) {
        const clone = lineEl.cloneNode(true) as SVGGElement
        stripSelectionArtifacts(clone)
        body.appendChild(clone)
      }
    }
  }
  content.appendChild(body)

  // Footer
  const contentHeightPt = paperHeightPt - 2 * marginPt
  const footerTop = contentHeightPt - footerPt

  // "Created at chordee.app" is intentionally hardcoded and non-removable.
  // Future: gate removal behind a paid sub-feature. Do NOT expose an option
  // to disable this via PdfExportOptions without that gate in place.
  const chordeeY = contentHeightPt - 4
  const chordeeText = createSvgText(
    contentWidthPt / 2,
    chordeeY,
    "Created at chordee.app",
    9,
    {
      anchor: "middle",
      fontFamily: `PetalumaText, serif`,
      opacity: 0.6,
    },
  )
  content.appendChild(chordeeText)

  if (opts.copyright) {
    const copyText = createSvgText(
      contentWidthPt / 2,
      footerTop + 10,
      opts.copyright,
      9,
      { anchor: "middle", fontFamily: `${opts.bodyFont}, sans-serif`, opacity: 0.6 },
    )
    content.appendChild(copyText)
  }

  return new XMLSerializer().serializeToString(svg)
}

// ── Public entry point ────────────────────────────────────────────────

export interface ExportResult {
  bytes: Uint8Array
  pageCount: number
}

export async function exportChartToPdf(args: {
  sourceSvg: SVGSVGElement
  layout: LayoutResult
  chartHeaderHeight: number
  opts: PdfExportOptions
}): Promise<ExportResult> {
  const { sourceSvg, layout, chartHeaderHeight, opts } = args

  // Ensure fonts have loaded in main document
  if ((document as Document & { fonts?: FontFaceSet }).fonts) {
    try {
      await (document as Document & { fonts: FontFaceSet }).fonts.ready
    } catch {
      /* no-op */
    }
  }

  const { width: paperWidthPt, height: paperHeightPt } = paperDimsPt(
    opts.paperSize,
    opts.orientation,
  )
  const marginPt = opts.marginPt
  const contentWidthPt = paperWidthPt - 2 * marginPt
  const contentHeightPt = paperHeightPt - 2 * marginPt

  // Reserve space at the bottom for footer (copyright + chordee line)
  const footerPt = opts.copyright ? 30 : 18
  const subsequentHeaderPt = 28

  const firstPageContentH = contentHeightPt - chartHeaderHeight - footerPt
  const subsequentPageContentH = contentHeightPt - subsequentHeaderPt - footerPt

  const pages = paginate(layout, firstPageContentH, subsequentPageContentH)
  const fontFaceCss = await getFontFaceCss()

  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle(opts.title || "Chord Chart")
  if (opts.composer) pdfDoc.setAuthor(opts.composer)
  pdfDoc.setCreator("chordee")
  pdfDoc.setProducer("chordee (pdf-lib)")
  pdfDoc.setCreationDate(new Date())

  const pixelRatio = 3

  for (const page of pages) {
    const svgString = buildPageSvg({
      sourceSvg,
      layout,
      chartHeaderHeight,
      page,
      totalPages: pages.length,
      paperWidthPt,
      paperHeightPt,
      marginPt,
      contentWidthPt,
      subsequentHeaderPt,
      footerPt,
      opts,
      fontFaceCss,
    })

    const pngBytes = await svgStringToPngBytes(
      svgString,
      paperWidthPt,
      paperHeightPt,
      pixelRatio,
    )
    const pngImage = await pdfDoc.embedPng(pngBytes)
    const pdfPage = pdfDoc.addPage([paperWidthPt, paperHeightPt])
    pdfPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: paperWidthPt,
      height: paperHeightPt,
    })
  }

  const bytes = await pdfDoc.save()
  return { bytes, pageCount: pages.length }
}

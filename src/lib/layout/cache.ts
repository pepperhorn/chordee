/**
 * MeasurementCache wraps canvas-based text measurement with deduplication.
 * In production this would use Pretext's prepareWithSegments + measureNaturalWidth,
 * but we provide a Canvas 2D fallback for environments where Pretext isn't available.
 */

let canvas: HTMLCanvasElement | null = null

function getContext(): CanvasRenderingContext2D {
  if (!canvas) {
    canvas = document.createElement("canvas")
  }
  return canvas.getContext("2d")!
}

export class MeasurementCache {
  private cache = new Map<string, number>()

  private key(text: string, font: string): string {
    return `${font}|||${text}`
  }

  measureText(text: string, font: string): number {
    if (!text) return 0

    const k = this.key(text, font)
    const cached = this.cache.get(k)
    if (cached !== undefined) return cached

    // Use Canvas 2D for measurement — works universally
    // TODO: swap to Pretext's prepareWithSegments + measureNaturalWidth
    // once we verify the API shape at runtime
    const ctx = getContext()
    ctx.font = font
    const width = ctx.measureText(text).width

    this.cache.set(k, width)
    return width
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

export const measurementCache = new MeasurementCache()

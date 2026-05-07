import { measurementCache } from "./cache"

let fontsReady = false

/**
 * Resolve once fonts are loaded, with a hard timeout so layout never
 * blocks indefinitely on a hanging font request. If the timeout fires,
 * we still set fontsReady=true and proceed — measurements will use
 * whatever the browser falls back to and will be re-cached on the next
 * `invalidateFontReadyState` cycle.
 */
const FONT_READY_TIMEOUT_MS = 5000

export async function ensureFontsReady(): Promise<void> {
  if (fontsReady) return
  if (typeof document !== "undefined" && document.fonts) {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        console.warn(
          `[fontReady] document.fonts.ready did not resolve within ${FONT_READY_TIMEOUT_MS}ms — proceeding with fallback metrics.`,
        )
        resolve()
      }, FONT_READY_TIMEOUT_MS)
    })
    try {
      await Promise.race([document.fonts.ready.then(() => undefined), timeoutPromise])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
  fontsReady = true
}

export function invalidateFontReadyState(): void {
  fontsReady = false
  // Stale width measurements taken under the previous font set must be
  // dropped — otherwise the layout uses old widths against new glyphs
  // and chord/lyric overflow appears at random.
  measurementCache.clear()
}

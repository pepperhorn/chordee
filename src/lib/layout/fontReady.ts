let fontsReady = false

export async function ensureFontsReady(): Promise<void> {
  if (fontsReady) return
  if (typeof document !== "undefined" && document.fonts) {
    await document.fonts.ready
  }
  fontsReady = true
}

export function invalidateFontReadyState(): void {
  fontsReady = false
}

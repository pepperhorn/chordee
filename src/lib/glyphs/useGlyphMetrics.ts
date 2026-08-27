import { useMemo } from "react"
import { useChartStore } from "../store"
import { useFontConfigField } from "../fontConfigContext"
import {
  resolveMetricsPx,
  smuflFontFor,
  type GlyphMetricsPx,
  type SmuflFontName,
} from "./registry"

/**
 * Resolved glyph geometry in px, for renderers.
 *
 * Defaults come from the SMuFL metadata of whichever music font is selected;
 * anything the user has edited in their style profile overrides them. Callers
 * get plain numbers and never touch staff-space conversion themselves.
 */
export function useGlyphMetrics(): GlyphMetricsPx {
  const overrides = useChartStore((s) => s.ui.glyphOverrides)
  const clefFont = useFontConfigField("clef")
  const font = smuflFontFor(clefFont)
  return useMemo(() => resolveMetricsPx(font, overrides), [font, overrides])
}

/** The SMuFL font backing the current music-font selection. */
export function useSmuflFont(): SmuflFontName {
  const clefFont = useFontConfigField("clef")
  return smuflFontFor(clefFont)
}

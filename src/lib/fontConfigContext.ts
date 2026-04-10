import { createContext, useContext } from "react"
import { RELATIVE_SIZE_SCALE, type FontConfig, type RelativeSize } from "./fonts"
import { useChartStore } from "./store"

/**
 * Context that lets a subtree override individual FontConfig fields.
 * Used by the PDF export preview to scale chord/lyric/dynamic sizes
 * down for tight bars-per-line without touching the editor state.
 *
 * Child components should read field values via `useFontConfigField`
 * instead of selecting directly from the store. That hook checks this
 * context first and falls back to the store selector when no override
 * is set — so editor views are unchanged.
 */
const FontConfigOverrideContext = createContext<Partial<FontConfig> | null>(null)

export const FontConfigOverrideProvider = FontConfigOverrideContext.Provider

/**
 * Subscribe to a single FontConfig field, honoring any override from the
 * nearest FontConfigOverrideProvider above this component. When no
 * override is set for the requested key, falls through to the store
 * selector (preserving narrow subscription behavior).
 */
export function useFontConfigField<K extends keyof FontConfig>(
  key: K,
): FontConfig[K] {
  const override = useContext(FontConfigOverrideContext)
  const storeValue = useChartStore((s) => s.ui.fontConfig[key])
  if (override && override[key] !== undefined) {
    return override[key] as FontConfig[K]
  }
  return storeValue
}

/**
 * Returns the effective scale factor for a per-font size key, multiplied by
 * the chart-wide `globalScale` modifier. Use this in place of
 * `RELATIVE_SIZE_SCALE[useFontConfigField("xxxSize")]` so the global scale
 * is honored everywhere.
 */
export function useEffectiveScale(
  sizeKey: keyof FontConfig & `${string}Size`,
): number {
  const sizeValue = useFontConfigField(sizeKey) as RelativeSize | undefined
  const globalScale = useFontConfigField("globalScale") as RelativeSize | undefined
  const perFont = sizeValue ? RELATIVE_SIZE_SCALE[sizeValue] ?? 1 : 1
  const global = globalScale ? RELATIVE_SIZE_SCALE[globalScale] ?? 1 : 1
  return perFont * global
}

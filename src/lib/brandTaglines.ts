/**
 * Rotating taglines for the floating desktop brand footer.
 *
 * Add new entries to this array — one will be picked at random on each
 * editor mount. Keep them short (they sit inline with the "chordee" logo).
 *
 * Each entry is rendered next to the logo as:  chordee | <tagline>
 */
export const BRAND_TAGLINES: string[] = [
  "Created at chordee.app",
  "Charts that sing · chordee.app",
  "Built on chordee.app",
  "Made with chordee.app",
  "chordee.app — real books for real musicians",
  "powered by pretext · chordee.app",
  "layouts by pretext · chordee.app",
  "beams inspired by vexflow · chordee.app",
  "standing on pretext & vexflow · chordee.app",
]

/** Pick a random tagline. Stable per-call (no side effects). */
export function pickBrandTagline(): string {
  if (BRAND_TAGLINES.length === 0) return "Created at chordee.app"
  const i = Math.floor(Math.random() * BRAND_TAGLINES.length)
  return BRAND_TAGLINES[i]!
}

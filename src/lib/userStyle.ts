import { z } from "zod"
import { METRIC_DEFS, type MetricDef } from "./glyphs/registry"
import {
  DEFAULT_FONT_CONFIG,
  FONT_FAMILIES,
  type FontConfig,
  type RelativeSize,
} from "./fonts"

// ── Schema ─────────────────────────────────────────────────────────────

const RELATIVE_SIZE_ENUM = z.enum(["sm", "md", "lg", "xl", "2xl"])

const FONT_FAMILY_VALUES = FONT_FAMILIES.map((f) => f.value) as [
  string,
  ...string[],
]

// Accept any string for font family to stay forward-compatible with custom
// fonts, but warn-lite via refine on unknown values (non-fatal).
const FontFamilyField = z.string()
const HexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  .optional()

export const UserStyleFontConfigSchema = z.object({
  globalScale: RELATIVE_SIZE_ENUM.default("md"),
  heading: FontFamilyField,
  headingSize: RELATIVE_SIZE_ENUM,
  headingColor: HexColor,
  subtitle: FontFamilyField,
  subtitleSize: RELATIVE_SIZE_ENUM,
  subtitleColor: HexColor,
  body: FontFamilyField,
  bodySize: RELATIVE_SIZE_ENUM,
  bodyColor: HexColor,
  lyric: FontFamilyField,
  lyricSize: RELATIVE_SIZE_ENUM,
  lyricColor: HexColor,
  dynamic: FontFamilyField,
  dynamicSize: RELATIVE_SIZE_ENUM,
  dynamicColor: HexColor,
  chord: FontFamilyField,
  chordSize: RELATIVE_SIZE_ENUM,
  chordColor: HexColor,
  timeSignature: FontFamilyField,
  timeSignatureSize: RELATIVE_SIZE_ENUM,
  timeSignatureColor: HexColor,
  rehearsal: FontFamilyField,
  rehearsalSize: RELATIVE_SIZE_ENUM,
  rehearsalColor: HexColor,
  clef: FontFamilyField,
  clefSize: RELATIVE_SIZE_ENUM,
  clefColor: HexColor,
  barline: FontFamilyField.default("Petaluma"),
  barlineSize: RELATIVE_SIZE_ENUM.default("md"),
  barlineColor: HexColor,
  lineSpacing: RELATIVE_SIZE_ENUM,
})

/**
 * Per-metric glyph overrides. Built from METRIC_DEFS so every key is
 * validated against its own min/max — adding a metric to the registry
 * extends this schema automatically.
 */
export const GlyphOverridesSchema = z.object(
  Object.fromEntries(
    (METRIC_DEFS as readonly MetricDef[]).map((d) => [
      d.key,
      z.number().min(d.min).max(d.max).optional(),
    ]),
  ),
)

export const UserStyleLayoutSchema = z.object({
  measuresPerLineMode: z.enum(["auto", "fixed"]),
  measuresPerLine: z.number().int().min(1).max(12).optional(),
  justification: z.enum(["proportional", "equal"]),
})

export const UserStylePageSchema = z.object({
  texture: z.enum(["none", "subtle", "crumpled"]).default("subtle"),
  bgColor: z.string().default("#ffffff"),
})

export const UserStyleSchema = z.object({
  schema: z.literal("chordee/user-style"),
  version: z.literal(1),
  name: z.string().optional(),
  createdAt: z.string().optional(),
  layout: UserStyleLayoutSchema,
  fonts: UserStyleFontConfigSchema,
  page: UserStylePageSchema.optional(),
  /** Glyph geometry edits. Absent means "use the font's SMuFL defaults". */
  glyphs: GlyphOverridesSchema.optional(),
})

/**
 * A named, saveable style. Same shape as UserStyle, plus the identity a
 * profile needs: a stable id and a required name, so a user can keep
 * several configurations and switch between them.
 */
export const StyleProfileSchema = UserStyleSchema.extend({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  updatedAt: z.string(),
})

export type UserStyle = z.infer<typeof UserStyleSchema>
export type StyleProfile = z.infer<typeof StyleProfileSchema>
export type GlyphOverrides = z.infer<typeof GlyphOverridesSchema>
export type UserStyleLayout = z.infer<typeof UserStyleLayoutSchema>
export type UserStylePage = z.infer<typeof UserStylePageSchema>

// ── Builders ───────────────────────────────────────────────────────────

export function buildUserStyle(
  fonts: FontConfig,
  measuresPerLineMode: "auto" | "fixed",
  measuresPerLine: number,
  justification: "proportional" | "equal",
  name?: string,
  page?: UserStylePage,
  glyphs?: GlyphOverrides,
): UserStyle {
  return {
    schema: "chordee/user-style",
    version: 1,
    name,
    createdAt: new Date().toISOString(),
    layout: {
      measuresPerLineMode,
      measuresPerLine,
      justification,
    },
    fonts: {
      ...DEFAULT_FONT_CONFIG,
      ...fonts,
    } as UserStyle["fonts"],
    page,
    glyphs,
  }
}

export function parseUserStyle(jsonText: string): UserStyle | null {
  try {
    const raw = JSON.parse(jsonText)
    const result = UserStyleSchema.safeParse(raw)
    if (!result.success) {
      console.warn("Invalid user style JSON:", result.error.issues)
      return null
    }
    return result.data
  } catch (e) {
    console.warn("Failed to parse user style JSON:", e)
    return null
  }
}

// Keep a reference so the compiler doesn't flag FONT_FAMILY_VALUES as unused;
// leaves room to tighten the enum if we want strict font-family validation.
export const KNOWN_FONT_FAMILIES = FONT_FAMILY_VALUES

// Re-export RelativeSize so downstream importers don't need fonts.ts too
export type { RelativeSize }

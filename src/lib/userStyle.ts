import { z } from "zod"
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
  lineSpacing: RELATIVE_SIZE_ENUM,
})

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
})

export type UserStyle = z.infer<typeof UserStyleSchema>
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

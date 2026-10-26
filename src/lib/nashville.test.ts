import { describe, expect, it } from "vitest"
import { parseChord } from "./chordParser"
import {
  chordToNashville,
  formatNashville,
  nashvilleToChord,
} from "./nashville"
import { NashvilleChordSchema } from "./schema"

describe("Nashville extensions", () => {
  it("survive parsing, schema validation, and formatting", () => {
    const parsed = parseChord("4m7b9#11", true)

    expect(parsed).toEqual({
      valid: true,
      nashvilleChord: {
        degree: "4",
        quality: "min7",
        extensions: ["b9", "#11"],
      },
    })
    const nashville = NashvilleChordSchema.parse(parsed.nashvilleChord)
    expect(formatNashville(nashville)).toBe("4m7b9#11")
  })

  it("round trips extensions through standard chord conversion", () => {
    const chord = {
      root: "F#",
      quality: "dom7",
      extensions: ["b9", "#11"],
    }

    const nashville = chordToNashville(chord, "E")
    expect(nashville).toEqual({
      degree: "2",
      quality: "dom7",
      extensions: ["b9", "#11"],
    })
    expect(nashvilleToChord(nashville, "E")).toEqual(chord)
  })
})

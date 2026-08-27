// GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate with: node scripts/build-smufl-metrics.mjs <petaluma.json> <bravura.json>
//
// Extracted from the upstream SMuFL metadata published by Steinberg (SIL OFL):
//   Petaluma 1.065 — steinbergmedia/petaluma, redist/petaluma_metadata.json
//   Bravura  1.482 — steinbergmedia/bravura,  redist/Bravura.json
//
// All engraving values are in STAFF SPACES, the unit SMuFL publishes them in.
// Multiply by the pixel size of one staff space to get device units.

/** Codepoint for each SMuFL glyph chordee renders. */
export const SMUFL_CODEPOINTS = {
  "gClef": "E050",
  "cClef": "E05C",
  "fClef": "E062",
  "unpitchedPercussionClef1": "E069",
  "accidentalFlat": "E260",
  "accidentalNatural": "E261",
  "accidentalSharp": "E262",
  "restWhole": "E4E3",
  "restHalf": "E4E4",
  "restQuarter": "E4E5",
  "rest8th": "E4E6",
  "rest16th": "E4E7",
  "rest32nd": "E4E8",
  "noteheadSlashVerticalEnds": "E100",
  "noteheadSlashHorizontalEnds": "E101",
  "noteheadSlashWhiteWhole": "E102",
  "noteheadSlashWhiteHalf": "E103",
  "timeSig0": "E080",
  "timeSig1": "E081",
  "timeSig2": "E082",
  "timeSig3": "E083",
  "timeSig4": "E084",
  "timeSig5": "E085",
  "timeSig6": "E086",
  "timeSig7": "E087",
  "timeSig8": "E088",
  "timeSig9": "E089",
  "repeatDot": "E044"
} as const

export type SmuflGlyphName = keyof typeof SMUFL_CODEPOINTS

/** Glyph ink extents, in staff spaces, relative to the glyph origin. */
export interface SmuflGlyphBBox {
  /** North-east corner: [x, y] */
  bBoxNE: [number, number]
  /** South-west corner: [x, y] */
  bBoxSW: [number, number]
}

/** Engraving ratios published by the font, in staff spaces. */
export interface SmuflEngravingDefaults {
  arrowShaftThickness: number
  barlineSeparation: number
  beamSpacing: number
  beamThickness: number
  bracketThickness: number
  dashedBarlineDashLength: number
  dashedBarlineGapLength: number
  dashedBarlineThickness: number
  hairpinThickness: number
  legerLineExtension: number
  legerLineThickness: number
  lyricLineThickness: number
  octaveLineThickness: number
  pedalLineThickness: number
  repeatBarlineDotSeparation: number
  repeatEndingLineThickness: number
  slurEndpointThickness: number
  slurMidpointThickness: number
  staffLineThickness: number
  stemThickness: number
  subBracketThickness: number
  textEnclosureThickness: number
  thickBarlineThickness: number
  thinBarlineThickness: number
  tieEndpointThickness: number
  tieMidpointThickness: number
  tupletBracketThickness: number
}

export interface SmuflFontData {
  fontName: string
  fontVersion: string
  engravingDefaults: SmuflEngravingDefaults
  glyphBBoxes: Partial<Record<SmuflGlyphName, SmuflGlyphBBox>>
}

export type SmuflFontName = "Petaluma" | "Bravura"

export const SMUFL_FONTS: Record<SmuflFontName, SmuflFontData> = {
  "Petaluma": {
    "fontName": "Petaluma",
    "fontVersion": "1.065",
    "engravingDefaults": {
      "arrowShaftThickness": 0.16,
      "barlineSeparation": 0.4,
      "beamSpacing": 0.25,
      "beamThickness": 0.5,
      "bracketThickness": 0.5,
      "dashedBarlineDashLength": 0.5,
      "dashedBarlineGapLength": 0.25,
      "dashedBarlineThickness": 0.16,
      "hairpinThickness": 0.16,
      "legerLineExtension": 0.4,
      "legerLineThickness": 0.16,
      "lyricLineThickness": 0.16,
      "octaveLineThickness": 0.16,
      "pedalLineThickness": 0.16,
      "repeatBarlineDotSeparation": 0.16,
      "repeatEndingLineThickness": 0.16,
      "slurEndpointThickness": 0.1,
      "slurMidpointThickness": 0.22,
      "staffLineThickness": 0.13,
      "stemThickness": 0.12,
      "subBracketThickness": 0.16,
      "textEnclosureThickness": 0.16,
      "thickBarlineThickness": 0.5,
      "thinBarlineThickness": 0.16,
      "tieEndpointThickness": 0.1,
      "tieMidpointThickness": 0.22,
      "tupletBracketThickness": 0.16
    },
    "glyphBBoxes": {
      "gClef": {
        "bBoxNE": [
          2.656,
          4.036
        ],
        "bBoxSW": [
          0,
          -2.236
        ]
      },
      "cClef": {
        "bBoxNE": [
          2.924,
          2.172
        ],
        "bBoxSW": [
          0,
          -2.172
        ]
      },
      "fClef": {
        "bBoxNE": [
          3.104,
          0.864
        ],
        "bBoxSW": [
          0,
          -1.984
        ]
      },
      "unpitchedPercussionClef1": {
        "bBoxNE": [
          1.5166,
          1
        ],
        "bBoxSW": [
          0,
          -1
        ]
      },
      "accidentalFlat": {
        "bBoxNE": [
          0.836,
          1.888
        ],
        "bBoxSW": [
          0.004,
          -0.832
        ]
      },
      "accidentalNatural": {
        "bBoxNE": [
          0.854,
          1.848
        ],
        "bBoxSW": [
          0,
          -1.824
        ]
      },
      "accidentalSharp": {
        "bBoxNE": [
          1.56,
          1.532
        ],
        "bBoxSW": [
          -0.088,
          -1.536
        ]
      },
      "restWhole": {
        "bBoxNE": [
          2,
          0.056
        ],
        "bBoxSW": [
          0.0036,
          -0.48
        ]
      },
      "restHalf": {
        "bBoxNE": [
          2.0736,
          0.648
        ],
        "bBoxSW": [
          0,
          0
        ]
      },
      "restQuarter": {
        "bBoxNE": [
          1.052,
          1.66
        ],
        "bBoxSW": [
          -0.0015,
          -1.66
        ]
      },
      "rest8th": {
        "bBoxNE": [
          1.156,
          1.044
        ],
        "bBoxSW": [
          0,
          -1.04
        ]
      },
      "rest16th": {
        "bBoxNE": [
          1.332,
          0.976
        ],
        "bBoxSW": [
          0,
          -1.3131
        ]
      },
      "rest32nd": {
        "bBoxNE": [
          1.388,
          1.932
        ],
        "bBoxSW": [
          0,
          -1.99
        ]
      },
      "noteheadSlashVerticalEnds": {
        "bBoxNE": [
          1.5967,
          0.58
        ],
        "bBoxSW": [
          0,
          -0.5688
        ]
      },
      "noteheadSlashHorizontalEnds": {
        "bBoxNE": [
          1.952,
          1.016
        ],
        "bBoxSW": [
          0,
          -1.016
        ]
      },
      "noteheadSlashWhiteWhole": {
        "bBoxNE": [
          3.818,
          1.024
        ],
        "bBoxSW": [
          0,
          -1.0182
        ]
      },
      "noteheadSlashWhiteHalf": {
        "bBoxNE": [
          2.92,
          0.972
        ],
        "bBoxSW": [
          0,
          -0.972
        ]
      },
      "timeSig0": {
        "bBoxNE": [
          2.052,
          1.436
        ],
        "bBoxSW": [
          0.08,
          -1.4326
        ]
      },
      "timeSig1": {
        "bBoxNE": [
          1.132,
          1.464
        ],
        "bBoxSW": [
          0.08,
          -1.456
        ]
      },
      "timeSig2": {
        "bBoxNE": [
          2.6419,
          1.528
        ],
        "bBoxSW": [
          0.08,
          -1.5149
        ]
      },
      "timeSig3": {
        "bBoxNE": [
          2.16,
          1.568
        ],
        "bBoxSW": [
          0.0793,
          -1.568
        ]
      },
      "timeSig4": {
        "bBoxNE": [
          2.5323,
          1.9647
        ],
        "bBoxSW": [
          0.08,
          -1.9584
        ]
      },
      "timeSig5": {
        "bBoxNE": [
          2.332,
          1.556
        ],
        "bBoxSW": [
          0.0787,
          -1.556
        ]
      },
      "timeSig6": {
        "bBoxNE": [
          2.26,
          1.452
        ],
        "bBoxSW": [
          0.08,
          -1.452
        ]
      },
      "timeSig7": {
        "bBoxNE": [
          2.368,
          1.38
        ],
        "bBoxSW": [
          0.0814,
          -1.38
        ]
      },
      "timeSig8": {
        "bBoxNE": [
          2.0166,
          1.712
        ],
        "bBoxSW": [
          0.08,
          -1.712
        ]
      },
      "timeSig9": {
        "bBoxNE": [
          1.976,
          1.684
        ],
        "bBoxSW": [
          0.08,
          -1.684
        ]
      },
      "repeatDot": {
        "bBoxNE": [
          0.572,
          0.304
        ],
        "bBoxSW": [
          0,
          -0.332
        ]
      }
    }
  },
  "Bravura": {
    "fontName": "Bravura",
    "fontVersion": "1.482",
    "engravingDefaults": {
      "arrowShaftThickness": 0.16,
      "barlineSeparation": 0.4,
      "beamSpacing": 0.25,
      "beamThickness": 0.5,
      "bracketThickness": 0.5,
      "dashedBarlineDashLength": 0.5,
      "dashedBarlineGapLength": 0.25,
      "dashedBarlineThickness": 0.16,
      "hairpinThickness": 0.16,
      "legerLineExtension": 0.4,
      "legerLineThickness": 0.16,
      "lyricLineThickness": 0.16,
      "octaveLineThickness": 0.16,
      "pedalLineThickness": 0.16,
      "repeatBarlineDotSeparation": 0.16,
      "repeatEndingLineThickness": 0.16,
      "slurEndpointThickness": 0.1,
      "slurMidpointThickness": 0.22,
      "staffLineThickness": 0.13,
      "stemThickness": 0.12,
      "subBracketThickness": 0.16,
      "textEnclosureThickness": 0.16,
      "thickBarlineThickness": 0.5,
      "thinBarlineThickness": 0.16,
      "tieEndpointThickness": 0.1,
      "tieMidpointThickness": 0.22,
      "tupletBracketThickness": 0.16
    },
    "glyphBBoxes": {
      "gClef": {
        "bBoxNE": [
          2.684,
          4.392
        ],
        "bBoxSW": [
          0,
          -2.632
        ]
      },
      "cClef": {
        "bBoxNE": [
          2.796,
          2.024
        ],
        "bBoxSW": [
          0,
          -2.024
        ]
      },
      "fClef": {
        "bBoxNE": [
          2.736,
          1.048
        ],
        "bBoxSW": [
          -0.02,
          -2.54
        ]
      },
      "unpitchedPercussionClef1": {
        "bBoxNE": [
          1.528,
          1
        ],
        "bBoxSW": [
          0,
          -1
        ]
      },
      "accidentalFlat": {
        "bBoxNE": [
          0.904,
          1.756
        ],
        "bBoxSW": [
          0,
          -0.7
        ]
      },
      "accidentalNatural": {
        "bBoxNE": [
          0.672,
          1.364
        ],
        "bBoxSW": [
          0,
          -1.34
        ]
      },
      "accidentalSharp": {
        "bBoxNE": [
          0.996,
          1.4
        ],
        "bBoxSW": [
          0,
          -1.392
        ]
      },
      "restWhole": {
        "bBoxNE": [
          1.128,
          0.036
        ],
        "bBoxSW": [
          0,
          -0.54
        ]
      },
      "restHalf": {
        "bBoxNE": [
          1.128,
          0.568
        ],
        "bBoxSW": [
          0,
          -0.008
        ]
      },
      "restQuarter": {
        "bBoxNE": [
          1.08,
          1.492
        ],
        "bBoxSW": [
          0.004,
          -1.5
        ]
      },
      "rest8th": {
        "bBoxNE": [
          0.988,
          0.696
        ],
        "bBoxSW": [
          0,
          -1.004
        ]
      },
      "rest16th": {
        "bBoxNE": [
          1.28,
          0.716
        ],
        "bBoxSW": [
          0,
          -2
        ]
      },
      "rest32nd": {
        "bBoxNE": [
          1.452,
          1.704
        ],
        "bBoxSW": [
          0,
          -2
        ]
      },
      "noteheadSlashVerticalEnds": {
        "bBoxNE": [
          1.46,
          0.996
        ],
        "bBoxSW": [
          0,
          -1.004
        ]
      },
      "noteheadSlashHorizontalEnds": {
        "bBoxNE": [
          2.12,
          1
        ],
        "bBoxSW": [
          0,
          -1
        ]
      },
      "noteheadSlashWhiteWhole": {
        "bBoxNE": [
          3.92,
          1
        ],
        "bBoxSW": [
          0,
          -1
        ]
      },
      "noteheadSlashWhiteHalf": {
        "bBoxNE": [
          3.12,
          1
        ],
        "bBoxSW": [
          0,
          -1
        ]
      },
      "timeSig0": {
        "bBoxNE": [
          1.8,
          1.004
        ],
        "bBoxSW": [
          0.08,
          -1
        ]
      },
      "timeSig1": {
        "bBoxNE": [
          1.256,
          1.004
        ],
        "bBoxSW": [
          0.08,
          -1
        ]
      },
      "timeSig2": {
        "bBoxNE": [
          1.704,
          1.016
        ],
        "bBoxSW": [
          0.08,
          -1.028
        ]
      },
      "timeSig3": {
        "bBoxNE": [
          1.604,
          0.996
        ],
        "bBoxSW": [
          0.08,
          -1.004
        ]
      },
      "timeSig4": {
        "bBoxNE": [
          1.8,
          1.004
        ],
        "bBoxSW": [
          0.08,
          -1
        ]
      },
      "timeSig5": {
        "bBoxNE": [
          1.532,
          0.984
        ],
        "bBoxSW": [
          0.08,
          -1.004
        ]
      },
      "timeSig6": {
        "bBoxNE": [
          1.656,
          1.004
        ],
        "bBoxSW": [
          0.08,
          -0.996
        ]
      },
      "timeSig7": {
        "bBoxNE": [
          1.684,
          0.996
        ],
        "bBoxSW": [
          0.08,
          -1
        ]
      },
      "timeSig8": {
        "bBoxNE": [
          1.664,
          1.036
        ],
        "bBoxSW": [
          0.08,
          -1.036
        ]
      },
      "timeSig9": {
        "bBoxNE": [
          1.656,
          1.004
        ],
        "bBoxSW": [
          0.08,
          -0.996
        ]
      },
      "repeatDot": {
        "bBoxNE": [
          0.4,
          0.2
        ],
        "bBoxSW": [
          0,
          -0.2
        ]
      }
    }
  }
}

/** Resolve a glyph's character, or undefined when the font lacks it. */
export function smuflChar(name: SmuflGlyphName): string {
  return String.fromCodePoint(parseInt(SMUFL_CODEPOINTS[name], 16))
}

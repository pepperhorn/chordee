export interface LayoutConfig {
  containerWidth: number
  fonts: {
    chord: string
    lyric: string
    section: string
    rehearsal: string
    dynamic: string
  }
  spacing: {
    beatPaddingX: number
    barPaddingX: number
    barGap: number
    sectionGap: number
    lineHeight: number
    lyricLineHeight: number
    staveHeight: number
    headerHeight: number
    chartPaddingX: number
    chartPaddingY: number
    clefKeySigWidth: number
  }
  justification: "proportional" | "equal"
  measuresPerLine: number | "auto"
  clefDisplay: "start" | "section" | "eachLine"
}

export interface LayoutResult {
  lines: LayoutLine[]
  totalHeight: number
  positionMap: PositionMap
}

export interface LayoutLine {
  y: number
  height: number
  sectionId?: string
  elements: LayoutElement[]
}

export type LayoutElement = LayoutSectionHeader | LayoutBarline | LayoutBar

export interface LayoutSectionHeader {
  type: "section-header"
  x: number
  width: number
  text: string
  rehearsalMark?: string
  sectionId: string
  timeSignature?: string
  navigation?: string
}

export interface LayoutBarline {
  type: "barline"
  x: number
  style: string
  height: number
}

export interface LayoutBar {
  type: "bar"
  x: number
  width: number
  measureId: string
  sectionId: string
  beats: LayoutBeat[]
  startBarline?: string
  endBarline?: string
  wholeRest?: boolean
  timeSignature?: { beats: number; beatUnit: number }
  showClef?: boolean
}

export interface LayoutBeat {
  x: number
  width: number
  beatId: string
  slots: LayoutSlot[]
  division: string
  dynamic?: string
  lyric?: { text: string; x: number; width: number; y: number }
}

export interface LayoutSlot {
  x: number
  width: number
  slotId: string
  chord?: { text: string; displayText: string; x: number; y: number }
  slash?: {
    x: number
    y: number
    articulation: string
    tied: boolean
    rest: boolean
    stem: boolean
    stemDirection: "up" | "down"
  }
}

export interface PositionMap {
  entries: PositionEntry[]
}

export interface PositionEntry {
  rect: { x: number; y: number; width: number; height: number }
  target: {
    sectionId: string
    measureId: string
    beatId: string
    slotId: string
  }
}

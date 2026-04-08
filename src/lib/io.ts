import type { ChordChart } from "./schema"
import { formatChord, formatTimeSignature } from "./utils"

// ── File Operations ────────────────────────────────────────────────────

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function uploadFile(accept: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = accept
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return reject(new Error("No file selected"))
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    }
    input.click()
  })
}

// ── JSON Export/Import ─────────────────────────────────────────────────

export function exportToJSON(chart: ChordChart): string {
  return JSON.stringify(chart, null, 2)
}

// ── Markdown Export ────────────────────────────────────────────────────

export function exportToMarkdown(chart: ChordChart): string {
  const lines: string[] = []

  // YAML frontmatter
  lines.push("---")
  lines.push(`title: "${chart.meta.title}"`)
  if (chart.meta.composer) lines.push(`composer: "${chart.meta.composer}"`)
  if (chart.meta.arranger) lines.push(`arranger: "${chart.meta.arranger}"`)
  lines.push(`key: ${chart.meta.key}`)
  lines.push(`tempo: ${chart.meta.tempo}`)
  lines.push(`notationType: ${chart.meta.notationType}`)
  lines.push("---")
  lines.push("")

  for (const section of chart.sections) {
    lines.push(`## ${section.name}`)
    lines.push(`Time: ${formatTimeSignature(section.timeSignature)}`)
    if (section.rehearsalMark) {
      lines.push(`Rehearsal: ${section.rehearsalMark}`)
    }
    lines.push("")

    // Group measures by measuresPerLine
    const mpl = chart.meta.measuresPerLine || 4
    for (let i = 0; i < section.measures.length; i += mpl) {
      const group = section.measures.slice(i, i + mpl)
      const chordLine = group
        .map((m) => {
          const chords = m.beats
            .map((b) => {
              const slot = b.slots[0]
              if (!slot?.chord) return ""
              return formatChord(slot.chord)
            })
            .join(" ")
          return chords || "/"
        })
        .join(" | ")
      lines.push(`| ${chordLine} |`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

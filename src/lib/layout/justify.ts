export interface JustifyInput {
  index: number
  naturalWidth: number
}

export interface JustifyOutput {
  index: number
  x: number
  width: number
}

export function justifyLine(
  bars: JustifyInput[],
  lineWidth: number,
  strategy: "proportional" | "equal"
): JustifyOutput[] {
  if (bars.length === 0) return []

  const totalNatural = bars.reduce((sum, b) => sum + b.naturalWidth, 0)

  if (strategy === "equal") {
    const equalWidth = lineWidth / bars.length
    return bars.map((bar, i) => ({
      index: bar.index,
      x: i * equalWidth,
      width: equalWidth,
    }))
  }

  // Proportional: distribute extra space proportional to natural width
  const extraSpace = lineWidth - totalNatural
  let x = 0
  return bars.map((bar) => {
    const share =
      totalNatural > 0
        ? (bar.naturalWidth / totalNatural) * extraSpace
        : extraSpace / bars.length
    const width = bar.naturalWidth + share
    const result = { index: bar.index, x, width }
    x += width
    return result
  })
}

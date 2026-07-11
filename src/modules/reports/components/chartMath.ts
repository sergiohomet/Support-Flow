export interface ChartPoint {
  x: number
  y: number
}

export interface LineChartLayout {
  plotWidth: number
  plotHeight: number
  marginLeft: number
  marginTop: number
}

// Rounds the axis ceiling up to a "nice" number (3/6/9, 5/10/15, 10/20/30, ...)
// so gridlines read like 0/10/20/30 instead of an arbitrary max like 27.
export function computeNiceMax(maxValue: number): number {
  if (maxValue <= 3) return 3
  const rough = maxValue / 3
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)))
  const normalized = rough / magnitude
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return niceNormalized * magnitude * 3
}

// Cardinal-spline-style smoothing: control points sit halfway between each
// pair of points at the endpoints' own height, which curves the line without
// overshooting past neighboring points.
export function buildSmoothPath(points: ChartPoint[]): string {
  if (points.length < 2) return ''

  let d = `M ${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i]
    const next = points[i + 1]
    const controlX = current.x + (next.x - current.x) / 2
    d += ` C ${controlX},${current.y} ${controlX},${next.y} ${next.x},${next.y}`
  }
  return d
}

// Evenly-spaced axis ticks from 0 up to niceMax (quarters via thirds: 0, 1/3, 2/3, max).
export function computeAxisTicks(niceMax: number): number[] {
  return [0, niceMax / 3, (niceMax / 3) * 2, niceMax]
}

// Maps a value on [0, niceMax] to a y pixel coordinate within the plot area
// (SVG y grows downward, so larger values map to smaller y).
export function computeValueY(value: number, niceMax: number, plotTop: number, plotHeight: number): number {
  return plotTop + plotHeight - (value / niceMax) * plotHeight
}

// Maps a series of values to x/y pixel coordinates for the line chart. A
// single value is centered on the plot's horizontal midpoint to avoid a
// division by zero when spacing points across the width.
export function computeLinePoints(values: number[], niceMax: number, layout: LineChartLayout): ChartPoint[] {
  return values.map((value, index) => ({
    x:
      layout.marginLeft +
      (values.length === 1 ? layout.plotWidth / 2 : (index / (values.length - 1)) * layout.plotWidth),
    y: computeValueY(value, niceMax, layout.marginTop, layout.plotHeight),
  }))
}

// Horizontal bar-width shaping as a percentage of the largest count. Guards
// against division by zero when every row's ticketCount is 0.
export function computeBarWidthPct(count: number, maxCount: number): number {
  return maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
}

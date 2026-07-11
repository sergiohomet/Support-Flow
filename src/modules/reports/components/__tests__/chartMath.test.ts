import { buildSmoothPath, computeAxisTicks, computeBarWidthPct, computeLinePoints, computeNiceMax } from '../chartMath'

describe('computeNiceMax', () => {
  it('returns 3 for values at or below 3', () => {
    expect(computeNiceMax(0)).toBe(3)
    expect(computeNiceMax(3)).toBe(3)
  })

  it('rounds 27 up to 30 (documented example)', () => {
    expect(computeNiceMax(27)).toBe(30)
  })

  it('rounds 10 up to 15', () => {
    expect(computeNiceMax(10)).toBe(15)
  })

  it('rounds 100 up to 150', () => {
    expect(computeNiceMax(100)).toBe(150)
  })
})

describe('buildSmoothPath', () => {
  it('returns an empty string for fewer than 2 points', () => {
    expect(buildSmoothPath([])).toBe('')
    expect(buildSmoothPath([{ x: 0, y: 0 }])).toBe('')
  })

  it('builds the exact cubic-bezier path for a known point set', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ]

    expect(buildSmoothPath(points)).toBe('M 0,0 C 5,0 5,10 10,10 C 15,10 15,0 20,0')
  })
})

describe('computeLinePoints', () => {
  const layout = { plotWidth: 100, plotHeight: 50, marginLeft: 10, marginTop: 5 }

  it('centers a single value on the plot midpoint (no division by zero)', () => {
    const points = computeLinePoints([7], 10, layout)

    expect(points).toHaveLength(1)
    expect(points[0].x).toBe(layout.marginLeft + layout.plotWidth / 2)
    expect(Number.isNaN(points[0].x)).toBe(false)
    expect(Number.isNaN(points[0].y)).toBe(false)
  })

  it('spaces multiple values evenly across the plot width', () => {
    const points = computeLinePoints([0, 10], 10, layout)

    expect(points[0].x).toBe(layout.marginLeft)
    expect(points[1].x).toBe(layout.marginLeft + layout.plotWidth)
  })
})

describe('computeAxisTicks', () => {
  it('returns 4 evenly-spaced ticks from 0 to niceMax', () => {
    expect(computeAxisTicks(30)).toEqual([0, 10, 20, 30])
  })
})

describe('computeBarWidthPct', () => {
  it('computes a percentage of the max count', () => {
    expect(computeBarWidthPct(10, 20)).toBe(50)
    expect(computeBarWidthPct(20, 20)).toBe(100)
    expect(computeBarWidthPct(0, 20)).toBe(0)
  })

  it('returns 0 when maxCount is 0 (avoids division by zero)', () => {
    expect(computeBarWidthPct(0, 0)).toBe(0)
  })
})

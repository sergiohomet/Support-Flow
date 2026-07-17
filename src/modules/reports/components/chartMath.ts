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

// Redondea el techo del eje hacia arriba a un número "lindo" (3/6/9, 5/10/15,
// 10/20/30, ...) para que las líneas de grilla se lean como 0/10/20/30 en vez
// de un máximo arbitrario como 27.
export function computeNiceMax(maxValue: number): number {
  if (maxValue <= 3) return 3
  const rough = maxValue / 3
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)))
  const normalized = rough / magnitude
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return niceNormalized * magnitude * 3
}

// Suavizado estilo cardinal-spline: los puntos de control se ubican a mitad
// de camino entre cada par de puntos, a la misma altura que los extremos, lo
// que curva la línea sin sobrepasar a los puntos vecinos.
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

// Marcas del eje espaciadas uniformemente desde 0 hasta niceMax (cuartos vía tercios: 0, 1/3, 2/3, max).
export function computeAxisTicks(niceMax: number): number[] {
  return [0, niceMax / 3, (niceMax / 3) * 2, niceMax]
}

// Mapea un valor en [0, niceMax] a una coordenada y en píxeles dentro del
// área del gráfico (el eje y de SVG crece hacia abajo, así que valores
// mayores se mapean a un y menor).
export function computeValueY(value: number, niceMax: number, plotTop: number, plotHeight: number): number {
  return plotTop + plotHeight - (value / niceMax) * plotHeight
}

// Mapea una serie de valores a coordenadas x/y en píxeles para el gráfico de
// línea. Un único valor se centra en el punto medio horizontal del área de
// gráfico para evitar una división por cero al espaciar los puntos a lo
// ancho.
export function computeLinePoints(values: number[], niceMax: number, layout: LineChartLayout): ChartPoint[] {
  return values.map((value, index) => ({
    x:
      layout.marginLeft +
      (values.length === 1 ? layout.plotWidth / 2 : (index / (values.length - 1)) * layout.plotWidth),
    y: computeValueY(value, niceMax, layout.marginTop, layout.plotHeight),
  }))
}

// Calcula el ancho horizontal de la barra como porcentaje del conteo más
// alto. Se protege contra la división por cero cuando el ticketCount de
// todas las filas es 0.
export function computeBarWidthPct(count: number, maxCount: number): number {
  return maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
}

import type { TicketsByWeek } from '@/modules/reports/schemas'
import { EmptyState } from '@/ui/EmptyState'

interface TicketsByWeekChartProps {
  data: TicketsByWeek[]
}

const CHART_WIDTH = 700
const CHART_HEIGHT = 220
const MARGIN = { top: 16, right: 16, bottom: 28, left: 32 }
const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom

function formatWeekLabel(weekStart: string): string {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(new Date(weekStart))
}

// Rounds the axis ceiling up to a "nice" number (3/6/9, 5/10/15, 10/20/30, ...)
// so gridlines read like 0/10/20/30 instead of an arbitrary max like 27.
function computeNiceMax(maxValue: number): number {
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
function buildSmoothPath(points: { x: number; y: number }[]): string {
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

export function TicketsByWeekChart({ data }: TicketsByWeekChartProps): React.JSX.Element {
  if (data.length === 0) {
    return <EmptyState title="Sin datos" description="No hay tickets registrados en el rango seleccionado." />
  }

  const maxCount = Math.max(...data.map((row) => row.ticketCount))
  const niceMax = computeNiceMax(maxCount)
  const ticks = [0, niceMax / 3, (niceMax / 3) * 2, niceMax]

  const points = data.map((row, index) => ({
    x: MARGIN.left + (data.length === 1 ? PLOT_WIDTH / 2 : (index / (data.length - 1)) * PLOT_WIDTH),
    y: MARGIN.top + PLOT_HEIGHT - (row.ticketCount / niceMax) * PLOT_HEIGHT,
    row,
  }))

  const linePath = buildSmoothPath(points)

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-56 w-full" role="group" aria-label="Tickets por semana">
        {ticks.map((tick) => {
          const y = MARGIN.top + PLOT_HEIGHT - (tick / niceMax) * PLOT_HEIGHT
          return (
            <g key={tick}>
              <line x1={MARGIN.left} y1={y} x2={CHART_WIDTH - MARGIN.right} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={MARGIN.left - 8} y={y} textAnchor="end" dominantBaseline="middle" className="fill-gray-400 text-[10px]">
                {Math.round(tick)}
              </text>
            </g>
          )
        })}

        {linePath && <path d={linePath} fill="none" stroke="#2563eb" strokeWidth={4} strokeLinecap="round" />}

        {points.map((point) => (
          <circle
            key={point.row.weekStart}
            cx={point.x}
            cy={point.y}
            r={7}
            fill="#2563eb"
            role="img"
            aria-label={`${point.row.ticketCount} tickets en la semana del ${formatWeekLabel(point.row.weekStart)}`}
          />
        ))}

        {points.map((point) => (
          <text key={`label-${point.row.weekStart}`} x={point.x} y={CHART_HEIGHT - 8} textAnchor="middle" className="fill-gray-500 text-[10px]">
            {formatWeekLabel(point.row.weekStart)}
          </text>
        ))}
      </svg>
    </div>
  )
}

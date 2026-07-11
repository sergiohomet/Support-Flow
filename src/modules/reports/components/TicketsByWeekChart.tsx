import type { TicketsByWeek } from '@/modules/reports/schemas'
import { EmptyState } from '@/ui/EmptyState'
import { buildSmoothPath, computeAxisTicks, computeLinePoints, computeNiceMax, computeValueY } from './chartMath'

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

export function TicketsByWeekChart({ data }: TicketsByWeekChartProps): React.JSX.Element {
  if (data.length === 0) {
    return <EmptyState title="Sin datos" description="No hay tickets registrados en el rango seleccionado." />
  }

  const maxCount = Math.max(...data.map((row) => row.ticketCount))
  const niceMax = computeNiceMax(maxCount)
  const ticks = computeAxisTicks(niceMax)

  const linePoints = computeLinePoints(
    data.map((row) => row.ticketCount),
    niceMax,
    { plotWidth: PLOT_WIDTH, plotHeight: PLOT_HEIGHT, marginLeft: MARGIN.left, marginTop: MARGIN.top },
  )
  const points = data.map((row, index) => ({ ...linePoints[index], row }))

  const linePath = buildSmoothPath(points)

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-56 w-full" role="group" aria-label="Tickets por semana">
        {ticks.map((tick) => {
          const y = computeValueY(tick, niceMax, MARGIN.top, PLOT_HEIGHT)
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

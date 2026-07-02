import type { SlaComplianceByCategory } from '@/modules/sla/schemas'

interface CategoryComplianceDonutProps {
  row: SlaComplianceByCategory
}

type ComplianceTier = 'green' | 'amber' | 'red'

const TIER_TEXT_CLASS: Record<ComplianceTier, string> = {
  green: 'text-[#16a34a]',
  amber: 'text-[#d97706]',
  red: 'text-red-600',
}

const TIER_DOT_CLASS: Record<ComplianceTier, string> = {
  green: 'bg-[#16a34a]',
  amber: 'bg-[#d97706]',
  red: 'bg-red-600',
}

function getTier(compliancePct: number | null): ComplianceTier {
  if (compliancePct === null) return 'red'
  if (compliancePct >= 80) return 'green'
  if (compliancePct >= 70) return 'amber'
  return 'red'
}

export function CategoryComplianceDonut({ row }: CategoryComplianceDonutProps): React.JSX.Element {
  const tier = getTier(row.compliancePct)
  const hasData = row.compliancePct !== null
  const pct = hasData ? Math.round(row.compliancePct as number) : 0
  const dashArray = `${pct}, 100`
  const strokeColorClass = tier === 'red' ? 'text-red-600' : TIER_TEXT_CLASS[tier]

  return (
    <div className="flex flex-col items-center gap-4 rounded-md border border-gray-200 bg-white p-4 text-center">
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">{row.categoryName}</span>
        <div className={['h-3 w-3 rounded-full', TIER_DOT_CLASS[tier]].join(' ')} />
      </div>

      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
          <path
            className="text-gray-200"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className={strokeColorClass}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeDasharray={dashArray}
            strokeWidth="3"
          />
        </svg>
        <span className="absolute text-lg font-bold text-gray-900">{hasData ? `${pct}%` : 'Sin datos'}</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">Dentro de {row.maxResolutionHours}h</span>
        <span className="text-sm text-gray-900">
          Resueltos: {row.resolvedCount}/{row.totalCount}
        </span>
      </div>
    </div>
  )
}

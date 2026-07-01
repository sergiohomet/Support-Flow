type SummaryCardVariant = 'neutral' | 'success' | 'danger'

interface SummaryCardProps {
  label: string
  value: number
  caption: string
  variant?: SummaryCardVariant
  icon?: React.ReactNode
}

const ACCENT_BORDER: Record<SummaryCardVariant, string> = {
  neutral: '',
  success: 'before:bg-[#16a34a]',
  danger: 'before:bg-red-600',
}

const CAPTION_COLOR: Record<SummaryCardVariant, string> = {
  neutral: 'text-gray-500',
  success: 'text-[#16a34a]',
  danger: 'text-red-600',
}

export function SummaryCard({
  label,
  value,
  caption,
  variant = 'neutral',
  icon,
}: SummaryCardProps): React.JSX.Element {
  return (
    <div
      className={[
        'relative flex flex-col gap-2 overflow-hidden rounded-md border border-gray-200 bg-white p-4',
        variant !== 'neutral' ? `before:absolute before:left-0 before:top-0 before:h-full before:w-1 ${ACCENT_BORDER[variant]}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className={['flex items-center gap-1 text-xs', CAPTION_COLOR[variant]].join(' ')}>
        {icon}
        <span>{caption}</span>
      </div>
    </div>
  )
}

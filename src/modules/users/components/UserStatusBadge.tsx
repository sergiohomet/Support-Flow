interface UserStatusBadgeProps {
  isActive: boolean
}

const statusConfig = {
  active:   { label: 'Active',   className: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-500' },
}

export function UserStatusBadge({ isActive }: UserStatusBadgeProps): React.JSX.Element {
  const { label, className } = isActive ? statusConfig.active : statusConfig.inactive

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

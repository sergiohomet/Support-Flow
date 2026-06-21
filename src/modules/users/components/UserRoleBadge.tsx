import type { UserRole } from '@/modules/users/schemas'

interface UserRoleBadgeProps {
  role: UserRole
}

const roleConfig = {
  client: { label: 'Cliente', className: 'bg-gray-100 text-gray-700' },
  agent:  { label: 'Agente',  className: 'bg-blue-100 text-blue-800' },
  admin:  { label: 'Admin',  className: 'bg-purple-100 text-purple-800' },
} as const

export function UserRoleBadge({ role }: UserRoleBadgeProps): React.JSX.Element {
  const { label, className } = roleConfig[role]

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

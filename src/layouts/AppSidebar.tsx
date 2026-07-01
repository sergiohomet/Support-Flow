import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '@/core/supabase/client'
import { useStore } from '@/store'
import type { UserRole } from '@/store/authSlice'
import { getInitials } from '@/core/utils/getInitials'

interface NavItem {
  label: string
  to: string
  icon: string
}

function getNavItems(role: UserRole): NavItem[] {
  const common: NavItem[] = [
    { label: 'Mis Tickets', to: '/tickets', icon: 'confirmation_number' },
    { label: 'Notificaciones', to: '/notifications', icon: 'notifications' },
  ]

  if (role === 'client') {
    return [
      { label: 'Mis Tickets', to: '/tickets', icon: 'confirmation_number' },
      { label: 'Crear Ticket', to: '/tickets/new', icon: 'add_circle' },
      { label: 'Notificaciones', to: '/notifications', icon: 'notifications' },
    ]
  }

  if (role === 'agent') {
    return [
      ...common,
      { label: 'Reportes', to: '/reports', icon: 'bar_chart' },
    ]
  }

  // admin
  return [
    ...common,
    { label: 'Reportes', to: '/reports', icon: 'bar_chart' },
    { label: 'Categorías', to: '/admin/categories', icon: 'folder' },
    { label: 'Configuración SLA', to: '/admin/sla', icon: 'schedule' },
    { label: 'Dashboard SLA', to: '/admin/sla/dashboard', icon: 'monitoring' },
    { label: 'Usuarios', to: '/admin/configuracion/usuarios', icon: 'group' },
  ]
}

function getRoleLabel(role: UserRole): string {
  if (role === 'client') return 'Cliente'
  if (role === 'agent') return 'Agente'
  return 'Administrador'
}

export function AppSidebar() {
  const user = useStore((s) => s.user)
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const role: UserRole = user?.role ?? 'client'
  const navItems = getNavItems(role)
  const initials = user ? getInitials(user.full_name) : '?'

  return (
    <aside className="flex flex-col w-60 h-full bg-white border-r border-gray-200 shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 mb-2">
        <h1 className="text-lg font-bold text-blue-600">SupportFlow</h1>
        <p className="text-xs text-gray-400 mt-0.5">Enterprise Support</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/tickets'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-icons text-[20px] shrink-0"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.full_name ?? '—'}
            </p>
            <p className="text-xs text-gray-400">{getRoleLabel(role)}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <span className="material-icons text-[18px]">logout</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

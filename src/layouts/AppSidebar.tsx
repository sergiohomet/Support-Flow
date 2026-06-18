import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '@/core/supabase/client'
import { useStore } from '@/store'
import type { UserRole } from '@/store/authSlice'

// --- Icons (inline SVG) ---

function IconTickets() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconFolder() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// --- Nav items per role ---

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
}

function getNavItems(role: UserRole): NavItem[] {
  const common: NavItem[] = [
    { label: 'Mis Tickets', to: '/tickets', icon: <IconTickets /> },
    { label: 'Notificaciones', to: '/notifications', icon: <IconBell /> },
  ]

  if (role === 'client') {
    return [
      { label: 'Mis Tickets', to: '/tickets', icon: <IconTickets /> },
      { label: 'Crear Ticket', to: '/tickets/new', icon: <IconPlus /> },
      { label: 'Notificaciones', to: '/notifications', icon: <IconBell /> },
    ]
  }

  if (role === 'agent') {
    return [
      ...common,
      { label: 'Reportes', to: '/reports', icon: <IconChart /> },
    ]
  }

  // admin
  return [
    ...common,
    { label: 'Reportes', to: '/reports', icon: <IconChart /> },
    { label: 'Categorías', to: '/admin/categories', icon: <IconFolder /> },
    { label: 'Usuarios', to: '/admin/users', icon: <IconUsers /> },
  ]
}

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function getRoleLabel(role: UserRole): string {
  if (role === 'client') return 'Cliente Premium'
  if (role === 'agent') return 'Agente'
  return 'Administrador'
}

// --- Component ---

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
    <aside className="flex flex-col w-64 h-full bg-white border-r border-gray-200 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <span className="text-base font-semibold text-gray-900">SupportFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/tickets'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ].join(' ')
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-3">
        <div className="flex items-center gap-3 px-2">
          {/* Avatar */}
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.full_name ?? '—'}
            </p>
            <p className="text-xs text-gray-500">{getRoleLabel(role)}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <IconLogout />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

import { NavLink, Outlet } from 'react-router-dom'

interface SettingsTab {
  label: string
  to: string
}

const SETTINGS_TABS: SettingsTab[] = [
  { label: 'General', to: '/admin/configuracion/general' },
  { label: 'Roles y Permisos', to: '/admin/configuracion/roles' },
  { label: 'Integraciones', to: '/admin/configuracion/integraciones' },
]

export function SettingsLayout() {
  return (
    <div className="flex flex-col h-full">
      {/* Navegación de pestañas */}
      <div className="border-b border-gray-200 bg-white px-6">
        <nav className="flex gap-0" aria-label="Settings tabs">
          {SETTINGS_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end
              className={({ isActive }) =>
                [
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                ].join(' ')
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Contenido de la página */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}

import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'

export function AppShell() {
  return (
    <div className="flex h-screen bg-gray-50">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

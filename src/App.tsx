import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/core/auth/AuthProvider";
import { PublicOnlyGuard } from "@/core/auth/guards/PublicOnlyGuard";
import { RoleGuard } from "@/core/auth/guards/RoleGuard";
import { AppShell } from "@/layouts/AppShell";
import { SettingsLayout } from "@/layouts/SettingsLayout";
import { LoginPage } from "@/modules/auth/pages/LoginPage";
import { RegisterPage } from "@/modules/auth/pages/RegisterPage";
import { ForgotPasswordPage } from "@/modules/auth/pages/ForgotPasswordPage";
import { TicketListPage } from "@/modules/tickets/pages/TicketListPage";
import { CreateTicketPage } from "@/modules/tickets/pages/CreateTicketPage";
import { TicketDetailPage } from "@/modules/tickets/pages/TicketDetailPage";
import { UsersPage } from "@/modules/users";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth routes */}
          <Route
            path="/login"
            element={
              <PublicOnlyGuard>
                <LoginPage />
              </PublicOnlyGuard>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyGuard>
                <RegisterPage />
              </PublicOnlyGuard>
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected routes */}
          <Route element={<AppShell />}>
            <Route
              path="/tickets"
              element={
                <RoleGuard allowedRoles={['client', 'agent', 'admin']}>
                  <TicketListPage />
                </RoleGuard>
              }
            />
            <Route
              path="/tickets/new"
              element={
                <RoleGuard allowedRoles={['client']}>
                  <CreateTicketPage />
                </RoleGuard>
              }
            />
            <Route
              path="/tickets/:id"
              element={
                <RoleGuard allowedRoles={['client', 'agent', 'admin']}>
                  <TicketDetailPage />
                </RoleGuard>
              }
            />
            <Route
              path="/notifications"
              element={
                <RoleGuard allowedRoles={['client', 'agent', 'admin']}>
                  <div>Notifications — TODO</div>
                </RoleGuard>
              }
            />
            <Route
              path="/reports"
              element={
                <RoleGuard allowedRoles={['agent', 'admin']}>
                  <div>Reports — TODO</div>
                </RoleGuard>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <RoleGuard allowedRoles={['agent', 'admin']}>
                  <div>Categories — TODO</div>
                </RoleGuard>
              }
            />
            <Route path="/admin/sla" element={<div>SLA Config — TODO</div>} />

            {/* Legacy redirect — keep until all bookmarks/links are updated */}
            <Route
              path="/admin/users"
              element={<Navigate to="/admin/configuracion/usuarios" replace />}
            />

            {/* Settings section */}
            <Route path="/admin/configuracion" element={<SettingsLayout />}>
              <Route
                path="general"
                element={<div>General — próximamente</div>}
              />
              <Route
                path="usuarios"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <UsersPage />
                  </RoleGuard>
                }
              />
              <Route
                path="roles"
                element={<div>Roles y Permisos — próximamente</div>}
              />
              <Route
                path="integraciones"
                element={<div>Integraciones — próximamente</div>}
              />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/tickets" replace />} />
          <Route path="/unauthorized" element={<div>Sin acceso</div>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

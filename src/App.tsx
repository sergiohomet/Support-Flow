import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/core/auth/AuthProvider";
import { PublicOnlyGuard } from "@/core/auth/guards/PublicOnlyGuard";
import { RoleGuard } from "@/core/auth/guards/RoleGuard";
import { RootRedirect } from "@/core/auth/guards/RootRedirect";
import { AppShell } from "@/layouts/AppShell";
import { SettingsLayout } from "@/layouts/SettingsLayout";

const LoginPage = lazy(() =>
  import("@/modules/auth/pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("@/modules/auth/pages/RegisterPage").then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("@/modules/auth/pages/ForgotPasswordPage").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const TicketListPage = lazy(() =>
  import("@/modules/tickets/pages/TicketListPage").then((m) => ({ default: m.TicketListPage })),
);
const CreateTicketPage = lazy(() =>
  import("@/modules/tickets/pages/CreateTicketPage").then((m) => ({
    default: m.CreateTicketPage,
  })),
);
const TicketDetailPage = lazy(() =>
  import("@/modules/tickets/pages/TicketDetailPage").then((m) => ({
    default: m.TicketDetailPage,
  })),
);
const UsersPage = lazy(() =>
  import("@/modules/users").then((m) => ({ default: m.UsersPage })),
);
const CategoriesPage = lazy(() =>
  import("@/modules/categories").then((m) => ({ default: m.CategoriesPage })),
);
const SlaConfigPage = lazy(() =>
  import("@/modules/sla").then((m) => ({ default: m.SlaConfigPage })),
);
const SlaDashboardPage = lazy(() =>
  import("@/modules/sla").then((m) => ({ default: m.SlaDashboardPage })),
);
const NotificationsPage = lazy(() =>
  import("@/modules/notifications").then((m) => ({ default: m.NotificationsPage })),
);
const ReportsPage = lazy(() =>
  import("@/modules/reports").then((m) => ({ default: m.ReportsPage })),
);
const AgentDashboardPage = lazy(() =>
  import("@/modules/agent-dashboard").then((m) => ({ default: m.AgentDashboardPage })),
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-screen text-gray-400">
              Cargando...
            </div>
          }
        >
          <Routes>
            {/* Rutas de autenticación */}
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

            {/* Rutas protegidas */}
            <Route element={<AppShell />}>
              <Route
                path="/agent/dashboard"
                element={
                  <RoleGuard allowedRoles={['agent']}>
                    <AgentDashboardPage />
                  </RoleGuard>
                }
              />
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
                    <NotificationsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/reports"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <ReportsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <CategoriesPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/sla"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <SlaConfigPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/sla/dashboard"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <SlaDashboardPage />
                  </RoleGuard>
                }
              />

              {/* Redirección legacy — mantener hasta que se actualicen todos los marcadores/enlaces */}
              <Route
                path="/admin/users"
                element={<Navigate to="/admin/configuracion/usuarios" replace />}
              />

              {/* Usuarios se accede directo desde el sidebar, no desde la
                  sección de Configuración — no lleva el tab bar de
                  General/Roles/Integraciones. */}
              <Route
                path="/admin/configuracion/usuarios"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <UsersPage />
                  </RoleGuard>
                }
              />

              {/* Sección de configuración */}
              <Route path="/admin/configuracion" element={<SettingsLayout />}>
                <Route
                  path="general"
                  element={<div>General — próximamente</div>}
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

            <Route path="/" element={<RootRedirect />} />
            <Route path="/unauthorized" element={<div>Sin acceso</div>} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

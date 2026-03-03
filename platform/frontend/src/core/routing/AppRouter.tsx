import { AnimatePresence } from "framer-motion";
import { createElement, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LandingPage } from "../../public/pages/LandingPage";
import { ProjectDetailPage } from "../../public/pages/ProjectDetailPage";
import { ProjectsPage } from "../../public/pages/ProjectsPage";
import { PreferencesProvider } from "../../public/preferences";
import { AuthSessionProvider, type AuthSession } from "../auth/auth-session";
import { PrivateAppLayout, PublicLayout } from "../layouts";
import { moduleRegistry } from "../plugin-registry";
import { ProtectedRoute } from "./ProtectedRoute";

function PrivateAppHome(): ReactNode {
  return <div>Private App Home</div>;
}

function NotFound(): ReactNode {
  return <div>Not Found</div>;
}

const publicModuleRoutes = moduleRegistry
  .filter((m) => m.publicPage)
  .map((m) => ({ path: m.publicPage!.path, component: m.publicPage!.component, id: `${m.id}-public` }));

const privateModuleRoutes = moduleRegistry
  .filter((m) => m.privateApp)
  .map((m) => ({ path: m.privateApp!.path, component: m.privateApp!.component, id: `${m.id}-private` }));

const extraModuleRoutes = moduleRegistry.flatMap((m) =>
  (m.routes ?? []).map((r, idx) => ({ path: r.path, component: r.component, id: `${m.id}-route-${idx}` }))
);

export interface AppRouterProps {
  session?: AuthSession;
}

function withPublicLayout(node: ReactNode): ReactNode {
  return <PublicLayout>{node}</PublicLayout>;
}

function withPrivateLayout(node: ReactNode): ReactNode {
  return <PrivateAppLayout>{node}</PrivateAppLayout>;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={withPublicLayout(<LandingPage />)} />
        <Route path="/projects" element={withPublicLayout(<ProjectsPage />)} />

        {publicModuleRoutes.map((route) => (
          <Route
            key={route.id}
            path={route.path}
            element={withPublicLayout(createElement(route.component))}
          />
        ))}

        <Route path="/projects/:id" element={withPublicLayout(<ProjectDetailPage />)} />

        <Route
          path="/app"
          element={
            <ProtectedRoute adminOnly>
              {withPrivateLayout(<PrivateAppHome />)}
            </ProtectedRoute>
          }
        />

        {privateModuleRoutes.map((route) => (
          <Route
            key={route.id}
            path={route.path}
            element={
              <ProtectedRoute adminOnly>
                {withPrivateLayout(createElement(route.component))}
              </ProtectedRoute>
            }
          />
        ))}

        {extraModuleRoutes.map((route) => (
          <Route
            key={route.id}
            path={route.path}
            element={
              route.path.startsWith("/app") ? (
                <ProtectedRoute adminOnly>
                  {withPrivateLayout(createElement(route.component))}
                </ProtectedRoute>
              ) : (
                withPublicLayout(createElement(route.component))
              )
            }
          />
        ))}

        <Route
          path="/app/*"
          element={
            <ProtectedRoute adminOnly>
              {withPrivateLayout(<Navigate to="/app" replace />)}
            </ProtectedRoute>
          }
        />
        <Route path="*" element={withPublicLayout(<NotFound />)} />
      </Routes>
    </AnimatePresence>
  );
}

export function AppRouter({ session = { isAuthenticated: false } }: AppRouterProps) {
  return (
    <AuthSessionProvider value={session}>
      <PreferencesProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </PreferencesProvider>
    </AuthSessionProvider>
  );
}

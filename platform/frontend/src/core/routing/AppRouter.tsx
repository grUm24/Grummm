import { AnimatePresence } from "framer-motion";
import { createElement, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LandingPage } from "../../public/pages/LandingPage";
import { ProjectDetailPage } from "../../public/pages/ProjectDetailPage";
import { ProjectsPage } from "../../public/pages/ProjectsPage";
import { PreferencesProvider } from "../../public/preferences";
import {
  AUTH_ACCESS_TOKEN_STORAGE_KEY,
  AUTH_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY,
  AUTH_SESSION_STORAGE_KEY,
  AuthSessionProvider,
  type AuthSession,
  type AuthSessionContextValue,
  type SignInPayload
} from "../auth/auth-session";
import { AdminProjectsWorkspace } from "../pages/AdminProjectsWorkspace";
import { AdminLandingContentPage } from "../pages/AdminLandingContentPage";
import { AdminLoginPage } from "../pages/AdminLoginPage";
import { AdminOverviewPage } from "../pages/AdminOverviewPage";
import { AdminSecurityPage } from "../pages/AdminSecurityPage";
import { DynamicProjectViewer } from "../pages/DynamicProjectViewer";
import { PrivateAppLayout, PublicLayout } from "../layouts";
import { confirmAdminSession, requestLoginEmailCode } from "../auth/auth-api";
import { moduleRegistry } from "../plugin-registry";
import { ProtectedRoute } from "./ProtectedRoute";

function PublicAnalyticsTracker(): ReactNode {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/app")) {
      return;
    }

    void fetch("/api/public/analytics/track-site-visit", {
      method: "POST",
      credentials: "omit",
      keepalive: true
    }).catch(() => undefined);

    const match = /^\/projects\/([^/]+)$/.exec(location.pathname);
    if (match?.[1]) {
      const postId = encodeURIComponent(match[1]);
      void fetch(`/api/public/analytics/track-post-view/${postId}`, {
        method: "POST",
        credentials: "omit",
        keepalive: true
      }).catch(() => undefined);
    }
  }, [location.pathname]);

  return null;
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
        <Route path="/login" element={withPublicLayout(<AdminLoginPage />)} />
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
              {withPrivateLayout(<AdminOverviewPage />)}
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/projects"
          element={
            <ProtectedRoute adminOnly>
              {withPrivateLayout(<AdminProjectsWorkspace />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/posts"
          element={
            <ProtectedRoute adminOnly>
              {withPrivateLayout(<AdminProjectsWorkspace mode="posts" />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/content"
          element={
            <ProtectedRoute adminOnly>
              {withPrivateLayout(<AdminLandingContentPage />)}
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/security"
          element={
            <ProtectedRoute adminOnly>
              {withPrivateLayout(<AdminSecurityPage />)}
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/:slug"
          element={
            <ProtectedRoute adminOnly>
              {withPrivateLayout(<DynamicProjectViewer />)}
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export function AppRouter({ session = { isAuthenticated: false } }: AppRouterProps) {
  const [authSession, setAuthSession] = useState<AuthSession>(session);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthEmail, setReauthEmail] = useState(session.adminEmail ?? "");
  const [reauthCode, setReauthCode] = useState("");
  const [reauthError, setReauthError] = useState("");
  const [reauthHint, setReauthHint] = useState("");
  const [reauthBusy, setReauthBusy] = useState(false);
  const [reauthSendingCode, setReauthSendingCode] = useState(false);

  function storeSession(next: AuthSession): void {
    if (!next.isAuthenticated) {
      try {
        window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
        window.localStorage.removeItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
        window.localStorage.removeItem(AUTH_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY);
      } catch {
        // ignore storage errors
      }
      return;
    }

    try {
      window.localStorage.setItem(
        AUTH_SESSION_STORAGE_KEY,
        JSON.stringify({ isAuthenticated: true, role: next.role, adminEmail: next.adminEmail })
      );
      if (next.accessToken) {
        window.localStorage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, next.accessToken);
      }
      if (next.accessTokenExpiresAtUtc) {
        window.localStorage.setItem(AUTH_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY, next.accessTokenExpiresAtUtc);
      }
    } catch {
      // ignore storage errors
    }
  }

  function closeReauthDialog(): void {
    setReauthOpen(false);
    setReauthCode("");
    setReauthError("");
    setReauthHint("");
    setReauthBusy(false);
    setReauthSendingCode(false);
  }

  function signOutWithCleanup(): void {
    closeReauthDialog();
    const next: AuthSession = { isAuthenticated: false };
    setAuthSession(next);
    storeSession(next);
  }

  useEffect(() => {
    if (!authSession.isAuthenticated) {
      closeReauthDialog();
      return;
    }

    const expiresAtRaw = authSession.accessTokenExpiresAtUtc;
    if (!expiresAtRaw) {
      signOutWithCleanup();
      return;
    }

    const expiresAt = Date.parse(expiresAtRaw);
    if (!Number.isFinite(expiresAt)) {
      signOutWithCleanup();
      return;
    }

    const delayMs = Math.max(0, expiresAt - Date.now());

    const timer = window.setTimeout(() => {
      setReauthEmail(authSession.adminEmail ?? "");
      setReauthOpen(true);
      setReauthCode("");
      setReauthError("");
      setReauthHint("");
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [authSession.isAuthenticated, authSession.accessTokenExpiresAtUtc, authSession.adminEmail]);

  async function handleReauthRequestCode() {
    if (!reauthEmail.trim()) {
      setReauthError("Введите email администратора.");
      return;
    }

    setReauthSendingCode(true);
    setReauthError("");
    setReauthHint("");
    try {
      const debugCode = await requestLoginEmailCode(reauthEmail.trim());
      setReauthHint(debugCode ? `Код (debug): ${debugCode}` : "Код отправлен на email.");
    } catch (error) {
      setReauthError(error instanceof Error ? error.message : "Не удалось отправить код.");
    } finally {
      setReauthSendingCode(false);
    }
  }

  async function handleReauthSubmit(event: FormEvent) {
    event.preventDefault();
    if (!authSession.isAuthenticated) {
      return;
    }

    setReauthBusy(true);
    setReauthError("");
    try {
      const result = await confirmAdminSession(reauthEmail.trim(), reauthCode.trim());
      const next: AuthSession = {
        isAuthenticated: true,
        role: authSession.role ?? "Admin",
        accessToken: result.accessToken,
        accessTokenExpiresAtUtc: result.accessTokenExpiresAtUtc,
        adminEmail: reauthEmail.trim()
      };
      setAuthSession(next);
      storeSession(next);
      closeReauthDialog();
    } catch (error) {
      setReauthError(error instanceof Error ? error.message : "Не удалось подтвердить сессию.");
    } finally {
      setReauthBusy(false);
    }
  }

  const sessionValue = useMemo<AuthSessionContextValue>(() => ({
    ...authSession,
    signIn: (payload: SignInPayload) => {
      const next: AuthSession = {
        isAuthenticated: true,
        role: payload.role,
        accessToken: payload.accessToken,
        accessTokenExpiresAtUtc: payload.accessTokenExpiresAtUtc,
        adminEmail: payload.adminEmail
      };
      setAuthSession(next);
      storeSession(next);
    },
    signOut: () => {
      signOutWithCleanup();
    }
  }), [authSession]);

  return (
    <AuthSessionProvider value={sessionValue}>
      <PreferencesProvider>
        <BrowserRouter>
          <PublicAnalyticsTracker />
          <AppRoutes />
          {reauthOpen && authSession.isAuthenticated ? (
            <div className="auth-reauth-overlay" role="dialog" aria-modal="true" aria-label="Подтверждение сессии">
              <section className="auth-reauth-modal">
                <h2>Подтвердите продолжение сессии</h2>
                <p className="admin-muted">Срок доступа истек. Введите код из email, чтобы продолжить без полного входа.</p>
                <form className="admin-form" onSubmit={handleReauthSubmit}>
                  <label>
                    Email администратора
                    <input
                      type="email"
                      value={reauthEmail}
                      onChange={(event) => setReauthEmail(event.target.value)}
                      required
                    />
                  </label>
                  <div className="auth-email-code-row">
                    <label>
                      Код из email
                      <input
                        value={reauthCode}
                        onChange={(event) => setReauthCode(event.target.value)}
                        placeholder="123456"
                        required
                      />
                    </label>
                    <button type="button" onClick={() => void handleReauthRequestCode()} disabled={reauthSendingCode}>
                      {reauthSendingCode ? "Отправка..." : "Получить код"}
                    </button>
                  </div>
                  <div className="auth-reauth-actions">
                    <button type="submit" disabled={reauthBusy}>
                      {reauthBusy ? "Проверка..." : "Продолжить"}
                    </button>
                    <button type="button" onClick={signOutWithCleanup}>
                      Отмена
                    </button>
                  </div>
                </form>
                {reauthHint ? <p className="admin-muted">{reauthHint}</p> : null}
                {reauthError ? <p className="admin-error">{reauthError}</p> : null}
              </section>
            </div>
          ) : null}
        </BrowserRouter>
      </PreferencesProvider>
    </AuthSessionProvider>
  );
}

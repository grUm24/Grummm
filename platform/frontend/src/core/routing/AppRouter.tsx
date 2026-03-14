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
import { t } from "../../shared/i18n";
import type { Language } from "../../public/types";

function normalizePublicChildPath(path: string): string {
  return path.replace(/^\/+/, "");
}

function normalizePrivateChildPath(path: string): string {
  return path.replace(/^\/app\/?/, "");
}

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
  .map((m) => ({
    path: normalizePublicChildPath(m.publicPage!.path),
    component: m.publicPage!.component,
    id: `${m.id}-public`
  }));

const privateModuleRoutes = moduleRegistry
  .filter((m) => m.privateApp)
  .map((m) => ({
    path: normalizePrivateChildPath(m.privateApp!.path),
    component: m.privateApp!.component,
    id: `${m.id}-private`
  }));

const publicExtraRoutes = moduleRegistry.flatMap((m) =>
  (m.routes ?? [])
    .filter((r) => !r.path.startsWith("/app"))
    .map((r, idx) => ({
      path: normalizePublicChildPath(r.path),
      component: r.component,
      id: `${m.id}-route-public-${idx}`
    }))
);

const privateExtraRoutes = moduleRegistry.flatMap((m) =>
  (m.routes ?? [])
    .filter((r) => r.path.startsWith("/app"))
    .map((r, idx) => ({
      path: normalizePrivateChildPath(r.path),
      component: r.component,
      id: `${m.id}-route-private-${idx}`
    }))
);

export interface AppRouterProps {
  session?: AuthSession;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="login" element={<AdminLoginPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />

        {publicModuleRoutes.map((route) => (
          <Route key={route.id} path={route.path} element={createElement(route.component)} />
        ))}

        {publicExtraRoutes.map((route) => (
          <Route key={route.id} path={route.path} element={createElement(route.component)} />
        ))}
      </Route>

      <Route path="/app" element={<ProtectedRoute adminOnly><PrivateAppLayout /></ProtectedRoute>}>
        <Route index element={<AdminOverviewPage />} />
        <Route path="projects" element={<AdminProjectsWorkspace />} />
        <Route path="posts" element={<AdminProjectsWorkspace mode="posts" />} />
        <Route path="content" element={<AdminLandingContentPage />} />
        <Route path="security" element={<AdminSecurityPage />} />
        <Route path=":slug" element={<DynamicProjectViewer />} />

        {privateModuleRoutes.map((route) => (
          <Route key={route.id} path={route.path} element={createElement(route.component)} />
        ))}

        {privateExtraRoutes.map((route) => (
          <Route key={route.id} path={route.path} element={createElement(route.component)} />
        ))}

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function AppRouter({ session = { isAuthenticated: false } }: AppRouterProps) {
  const language: Language = (() => {
    try {
      const stored = window.localStorage.getItem("platform.ui.language");
      return stored === "ru" || stored === "en" ? stored : "en";
    } catch {
      return "en";
    }
  })();
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
        return;
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
      return;
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
      setReauthError(t("reauth.error.enterEmail", language));
      return;
    }

    setReauthSendingCode(true);
    setReauthError("");
    setReauthHint("");
    try {
      const debugCode = await requestLoginEmailCode(reauthEmail.trim());
      setReauthHint(debugCode ? t("reauth.hint.debug", language, { code: debugCode }) : t("reauth.hint.sent", language));
    } catch (error) {
      setReauthError(error instanceof Error ? error.message : t("reauth.error.sendCode", language));
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
      setReauthError(error instanceof Error ? error.message : t("reauth.error.confirm", language));
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
            <div className="auth-reauth-overlay" role="dialog" aria-modal="true" aria-label={t("reauth.dialogAria", language)}>
              <section className="auth-reauth-modal">
                <h2>{t("reauth.title", language)}</h2>
                <p className="admin-muted">{t("reauth.description", language)}</p>
                <form className="admin-form" onSubmit={handleReauthSubmit}>
                  <label>
                    {t("reauth.emailLabel", language)}
                    <input
                      type="email"
                      value={reauthEmail}
                      onChange={(event) => setReauthEmail(event.target.value)}
                      required
                    />
                  </label>
                  <div className="auth-email-code-row">
                    <label>
                      {t("reauth.codeLabel", language)}
                      <input
                        value={reauthCode}
                        onChange={(event) => setReauthCode(event.target.value)}
                        placeholder="123456"
                        required
                      />
                    </label>
                    <button type="button" onClick={() => void handleReauthRequestCode()} disabled={reauthSendingCode}>
                      {reauthSendingCode ? t("reauth.sendingCode", language) : t("reauth.sendCode", language)}
                    </button>
                  </div>
                  <div className="auth-reauth-actions">
                    <button type="submit" disabled={reauthBusy}>
                      {reauthBusy ? t("reauth.checking", language) : t("reauth.submit", language)}
                    </button>
                    <button type="button" onClick={signOutWithCleanup}>
                      {t("reauth.cancel", language)}
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
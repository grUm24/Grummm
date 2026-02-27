import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { AuthSession } from "./core/auth/auth-session";
import { AppRouter } from "./core/routing";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element '#root' was not found.");
}

function getInitialSession(): AuthSession {
  const fallback: AuthSession = { isAuthenticated: false };

  try {
    const raw = window.localStorage.getItem("platform.auth.session");
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (parsed.isAuthenticated !== true) {
      return fallback;
    }

    if (parsed.role === "Admin" || parsed.role === "User") {
      return { isAuthenticated: true, role: parsed.role };
    }

    return { isAuthenticated: true };
  } catch {
    return fallback;
  }
}

createRoot(rootElement).render(
  <StrictMode>
    <AppRouter session={getInitialSession()} />
  </StrictMode>
);

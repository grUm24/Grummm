import { getCurrentLanguage, t } from "../../shared/i18n";

interface LoginResponse {
  accessToken?: string;
  accessTokenExpiresAtUtc?: string;
}

interface CsrfResponse {
  csrfHeaderName?: string;
  requestToken?: string;
}

async function fetchCsrfToken(): Promise<{ headerName: string; token: string } | null> {
  try {
    const response = await fetch("/api/public/security/csrf", {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as CsrfResponse;
    if (!payload.requestToken) {
      return null;
    }

    return {
      headerName: payload.csrfHeaderName || "X-CSRF-TOKEN",
      token: payload.requestToken
    };
  } catch {
    return null;
  }
}

async function parseError(response: Response): Promise<string> {
  const language = getCurrentLanguage();

  try {
    const payload = (await response.json()) as {
      error?: string;
      retryAfterSeconds?: number;
      title?: string;
      errors?: Record<string, string[]> | string[];
    };

    if (payload.error) {
      if (payload.error === "mailru_app_password_required") {
        return t("auth.error.mailruPassword", language);
      }
      if (payload.error === "invalid_email") {
        return t("auth.error.invalidEmail", language);
      }
      if (payload.error === "invalid_email_code") {
        return t("auth.error.invalidCode", language);
      }
      if (payload.error === "refresh_token_required") {
        return t("auth.error.refreshRequired", language);
      }
      if (payload.error === "email_code_rate_limited") {
        const retry = payload.retryAfterSeconds ?? 0;
        return retry > 0
          ? t("auth.error.rateLimitedRetry", language, { retry })
          : t("auth.error.rateLimited", language);
      }
      return payload.error;
    }

    if (payload.title === "CSRF validation failed") {
      return t("auth.error.csrf", language);
    }

    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      return payload.errors[0] || t("auth.error.validation", language);
    }

    if (payload.errors && typeof payload.errors === "object") {
      const firstError = Object.values(payload.errors)[0]?.[0];
      if (firstError) {
        return firstError;
      }
    }

    if (payload.title) {
      return payload.title;
    }
  } catch {
    // ignore
  }

  if (response.status === 401) {
    return t("auth.error.badCredentials", getCurrentLanguage());
  }

  if (response.status === 429) {
    return t("auth.error.tooManyAttempts", getCurrentLanguage());
  }

  return t("auth.error.request", getCurrentLanguage());
}

export interface LoginResult {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
}

export async function loginAdmin(userName: string, password: string, email: string, emailCode: string): Promise<LoginResult> {
  const csrf = await fetchCsrfToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (csrf) {
    headers[csrf.headerName] = csrf.token;
  }
  const response = await fetch("/api/public/auth/login", {
    method: "POST",
    headers,
    credentials: "same-origin",
    body: JSON.stringify({ userName, password, email, emailCode })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as LoginResponse;
  const language = getCurrentLanguage();
  if (!payload.accessToken) {
    throw new Error(t("auth.error.missingAccessToken", language));
  }

  if (!payload.accessTokenExpiresAtUtc) {
    throw new Error(t("auth.error.missingExpiry", language));
  }

  return {
    accessToken: payload.accessToken,
    accessTokenExpiresAtUtc: payload.accessTokenExpiresAtUtc
  };
}

export async function refreshAdminAccessToken(): Promise<LoginResult> {
  const csrf = await fetchCsrfToken();
  const headers: Record<string, string> = {};
  if (csrf) {
    headers[csrf.headerName] = csrf.token;
  }

  const response = await fetch("/api/public/auth/refresh", {
    method: "POST",
    headers,
    credentials: "same-origin"
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as LoginResponse;
  if (!payload.accessToken || !payload.accessTokenExpiresAtUtc) {
    throw new Error(t("auth.error.invalidRefreshResponse", getCurrentLanguage()));
  }

  return {
    accessToken: payload.accessToken,
    accessTokenExpiresAtUtc: payload.accessTokenExpiresAtUtc
  };
}

export async function confirmAdminSession(email: string, emailCode: string): Promise<LoginResult> {
  const csrf = await fetchCsrfToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (csrf) {
    headers[csrf.headerName] = csrf.token;
  }

  const response = await fetch("/api/public/auth/confirm-session", {
    method: "POST",
    headers,
    credentials: "same-origin",
    body: JSON.stringify({ email, emailCode })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as LoginResponse;
  if (!payload.accessToken || !payload.accessTokenExpiresAtUtc) {
    throw new Error(t("auth.error.invalidConfirmResponse", getCurrentLanguage()));
  }

  return {
    accessToken: payload.accessToken,
    accessTokenExpiresAtUtc: payload.accessTokenExpiresAtUtc
  };
}

export async function logoutAdmin(accessToken?: string): Promise<void> {
  await fetch("/api/app/auth/logout", {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    credentials: "same-origin"
  });
}

export async function requestPasswordEmailCode(email: string, accessToken: string): Promise<string | undefined> {
  const response = await fetch("/api/app/auth/request-email-code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    credentials: "same-origin",
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as { debugCode?: string };
  return payload.debugCode;
}

export async function requestLoginEmailCode(email: string): Promise<string | undefined> {
  const csrf = await fetchCsrfToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (csrf) {
    headers[csrf.headerName] = csrf.token;
  }

  const response = await fetch("/api/public/auth/request-login-email-code", {
    method: "POST",
    headers,
    credentials: "same-origin",
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = (await response.json()) as { debugCode?: string };
  return payload.debugCode;
}

export async function changeAdminPassword(
  oldPassword: string,
  newPassword: string,
  emailCode: string,
  accessToken: string
): Promise<void> {
  const response = await fetch("/api/app/auth/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    credentials: "same-origin",
    body: JSON.stringify({ oldPassword, newPassword, emailCode })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

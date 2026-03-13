import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePreferences } from "../../public/preferences";
import { t } from "../../shared/i18n";
import { loginAdmin, requestLoginEmailCode } from "../auth/auth-api";
import { useAuthSession } from "../auth/auth-session";

interface LocationState {
  from?: { pathname?: string };
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuthSession();
  const { language } = usePreferences();
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState("");
  const [codeHint, setCodeHint] = useState("");

  async function handleRequestCode() {
    if (!email.trim()) {
      setError(t("login.error.enterEmail", language));
      return;
    }

    setSendingCode(true);
    setError("");
    setCodeHint("");
    try {
      const debugCode = await requestLoginEmailCode(email.trim());
      setCodeHint(debugCode ? t("login.hint.debug", language, { code: debugCode }) : t("login.hint.sent", language));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("login.error.requestCode", language));
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const loginResult = await loginAdmin(userName.trim(), password, email.trim(), emailCode.trim());
      auth.signIn({
        role: "Admin",
        accessToken: loginResult.accessToken,
        accessTokenExpiresAtUtc: loginResult.accessTokenExpiresAtUtc,
        adminEmail: email.trim()
      });
      const state = location.state as LocationState | null;
      const redirectTo = state?.from?.pathname?.startsWith("/app") ? state.from.pathname : "/app";
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("login.error.submit", language));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-page">
      <article className="auth-card">
        <p className="section-heading__eyebrow">Admin access</p>
        <h1>{t("login.title", language)}</h1>
        <p className="admin-muted">{t("login.subtitle", language)}</p>
        <form className="admin-form" onSubmit={handleSubmit}>
          <label>
            {t("login.username", language)}
            <input
              autoComplete="username"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="adminuser"
              required
            />
          </label>
          <label>
            {t("login.adminEmail", language)}
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              required
            />
          </label>
          <div className="auth-email-code-row">
            <label>
              {t("login.emailCode", language)}
              <input
                value={emailCode}
                onChange={(event) => setEmailCode(event.target.value)}
                placeholder="123456"
                required
              />
            </label>
            <button type="button" className="glass-button glass-button--ghost" onClick={() => void handleRequestCode()} disabled={sendingCode}>
              {sendingCode ? t("login.requestingCode", language) : t("login.requestCode", language)}
            </button>
          </div>
          <label>
            {t("login.password", language)}
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" className="glass-button" disabled={busy}>
            {busy ? t("login.submitting", language) : t("login.submit", language)}
          </button>
        </form>
        {codeHint ? <p className="admin-muted">{codeHint}</p> : null}
        {error ? <p className="admin-error">{error}</p> : null}
      </article>
    </section>
  );
}

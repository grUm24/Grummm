import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginAdmin, requestLoginEmailCode } from "../auth/auth-api";
import { useAuthSession } from "../auth/auth-session";

interface LocationState {
  from?: { pathname?: string };
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuthSession();
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
      setError("Введите email администратора для получения кода.");
      return;
    }

    setSendingCode(true);
    setError("");
    setCodeHint("");
    try {
      const debugCode = await requestLoginEmailCode(email.trim());
      setCodeHint(debugCode ? `Код (debug): ${debugCode}` : "Код отправлен на email. Проверьте почту.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось отправить код.");
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
      setError(submitError instanceof Error ? submitError.message : "Не удалось войти.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-page">
      <article className="auth-card">
        <h1>Вход в админ-панель</h1>
        <p className="admin-muted">Введите логин, пароль, email и код из письма.</p>
        <form className="admin-form" onSubmit={handleSubmit}>
          <label>
            Логин
            <input
              autoComplete="username"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="adminuser"
              required
            />
          </label>
          <label>
            Email администратора
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
              Код из email
              <input
                value={emailCode}
                onChange={(event) => setEmailCode(event.target.value)}
                placeholder="123456"
                required
              />
            </label>
            <button type="button" onClick={() => void handleRequestCode()} disabled={sendingCode}>
              {sendingCode ? "Отправка..." : "Получить код"}
            </button>
          </div>
          <label>
            Пароль
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Вход..." : "Войти"}
          </button>
        </form>
        {codeHint ? <p className="admin-muted">{codeHint}</p> : null}
        {error ? <p className="admin-error">{error}</p> : null}
      </article>
    </section>
  );
}

import { useState, type FormEvent } from "react";
import { usePreferences } from "../../public/preferences";
import { t } from "../../shared/i18n";
import { changeAdminPassword, requestPasswordEmailCode } from "../auth/auth-api";
import { useAuthSession } from "../auth/auth-session";

const ADMIN_EMAIL = "serbul11@mail.ru";

export function AdminSecurityPage() {
  const auth = useAuthSession();
  const { language } = usePreferences();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busyCode, setBusyCode] = useState(false);
  const [busyChange, setBusyChange] = useState(false);

  async function handleRequestCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("");
    if (!auth.accessToken) {
      setError(t("security.error.noToken", language));
      return;
    }

    setBusyCode(true);
    try {
      const debugCode = await requestPasswordEmailCode(email.trim(), auth.accessToken);
      setStatus(debugCode ? t("security.status.debug", language, { code: debugCode }) : t("security.status.codeSent", language));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("security.error.requestCode", language));
    } finally {
      setBusyCode(false);
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("");
    if (!auth.accessToken) {
      setError(t("security.error.noToken", language));
      return;
    }

    if (newPassword.length < 8) {
      setError(t("security.error.minLength", language));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("security.error.mismatch", language));
      return;
    }

    setBusyChange(true);
    try {
      await changeAdminPassword(oldPassword, newPassword, emailCode.trim(), auth.accessToken);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setEmailCode("");
      setStatus(t("security.status.changed", language));
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : t("security.error.change", language));
    } finally {
      setBusyChange(false);
    }
  }

  return (
    <section className="admin-security">
      <article className="admin-card">
        <p className="section-heading__eyebrow">Security</p>
        <h1>{t("security.title", language)}</h1>
        <p className="admin-muted">{t("security.subtitle", language)}</p>

        <form className="admin-form" onSubmit={handleRequestCode}>
          <label>
            {t("security.email", language)}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <button type="submit" className="glass-button" disabled={busyCode}>
            {busyCode ? t("security.requestingCode", language) : t("security.requestCode", language)}
          </button>
        </form>

        <form className="admin-form" onSubmit={handleChangePassword}>
          <label>
            {t("security.oldPassword", language)}
            <input
              type="password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            {t("security.newPassword", language)}
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label>
            {t("security.confirmPassword", language)}
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label>
            {t("security.emailCode", language)}
            <input
              value={emailCode}
              onChange={(event) => setEmailCode(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]{4,12}"
              placeholder="123456"
              required
            />
          </label>
          <button type="submit" className="glass-button" disabled={busyChange}>
            {busyChange ? t("security.submitting", language) : t("security.submit", language)}
          </button>
        </form>

        {status ? <p className="admin-muted">{status}</p> : null}
        {error ? <p className="admin-error">{error}</p> : null}
      </article>
    </section>
  );
}

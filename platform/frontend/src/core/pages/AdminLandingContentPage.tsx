import { useState, type ChangeEvent, type FormEvent } from "react";
import { t } from "../../shared/i18n";
import { usePreferences } from "../../public/preferences";
import {
  readLandingContent,
  saveLandingContentToServer,
  type LandingContent
} from "../../public/data/landing-content-store";

interface LandingDraft extends LandingContent {}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

export function AdminLandingContentPage() {
  const { language } = usePreferences();
  const [landingDraft, setLandingDraft] = useState<LandingDraft>(() => readLandingContent());
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  async function handleLandingPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setLandingDraft((current) => ({ ...current, aboutPhoto: dataUrl }));
    } catch {
      setServerError(t("landingAdmin.error.readFile", language));
    }
  }

  async function handleLandingSave(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setServerError("");
    try {
      const saved = await saveLandingContentToServer(landingDraft, { serverOnly: true });
      setLandingDraft(saved);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : t("landingAdmin.error.sync", language));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-landing-content">
      <article className="admin-card admin-landing-editor">
        <p className="section-heading__eyebrow">Landing editor</p>
        <h1>{t("landingAdmin.title", language)}</h1>
        <p className="admin-muted">{t("landingAdmin.subtitle", language)}</p>
        {serverError ? <p className="admin-error">{serverError}</p> : null}
        <form className="admin-form" onSubmit={handleLandingSave}>
          <label>
            {t("landingAdmin.ru.heroEyebrow", language)}
            <input value={landingDraft.heroEyebrow.ru} onChange={(e) => setLandingDraft((current) => ({ ...current, heroEyebrow: { ...current.heroEyebrow, ru: e.target.value } }))} />
          </label>
          <label>
            {t("landingAdmin.en.heroEyebrow", language)}
            <input value={landingDraft.heroEyebrow.en} onChange={(e) => setLandingDraft((current) => ({ ...current, heroEyebrow: { ...current.heroEyebrow, en: e.target.value } }))} />
          </label>
          <label>
            {t("landingAdmin.ru.heroTitle", language)}
            <textarea rows={2} value={landingDraft.heroTitle.ru} onChange={(e) => setLandingDraft((current) => ({ ...current, heroTitle: { ...current.heroTitle, ru: e.target.value } }))} />
          </label>
          <label>
            {t("landingAdmin.en.heroTitle", language)}
            <textarea rows={2} value={landingDraft.heroTitle.en} onChange={(e) => setLandingDraft((current) => ({ ...current, heroTitle: { ...current.heroTitle, en: e.target.value } }))} />
          </label>
          <label>
            {t("landingAdmin.ru.heroDescription", language)}
            <textarea rows={3} value={landingDraft.heroDescription.ru} onChange={(e) => setLandingDraft((current) => ({ ...current, heroDescription: { ...current.heroDescription, ru: e.target.value } }))} />
          </label>
          <label>
            {t("landingAdmin.en.heroDescription", language)}
            <textarea rows={3} value={landingDraft.heroDescription.en} onChange={(e) => setLandingDraft((current) => ({ ...current, heroDescription: { ...current.heroDescription, en: e.target.value } }))} />
          </label>
          <label>
            {t("landingAdmin.ru.aboutTitle", language)}
            <input value={landingDraft.aboutTitle.ru} onChange={(e) => setLandingDraft((current) => ({ ...current, aboutTitle: { ...current.aboutTitle, ru: e.target.value } }))} />
          </label>
          <label>
            {t("landingAdmin.en.aboutTitle", language)}
            <input value={landingDraft.aboutTitle.en} onChange={(e) => setLandingDraft((current) => ({ ...current, aboutTitle: { ...current.aboutTitle, en: e.target.value } }))} />
          </label>
          <label>
            {t("landingAdmin.ru.aboutText", language)}
            <textarea rows={3} value={landingDraft.aboutText.ru} onChange={(e) => setLandingDraft((current) => ({ ...current, aboutText: { ...current.aboutText, ru: e.target.value } }))} />
          </label>
          <label>
            {t("landingAdmin.en.aboutText", language)}
            <textarea rows={3} value={landingDraft.aboutText.en} onChange={(e) => setLandingDraft((current) => ({ ...current, aboutText: { ...current.aboutText, en: e.target.value } }))} />
          </label>
          <label>
            {t("landingAdmin.ru.portfolioTitle", language)}
            <input value={landingDraft.portfolioTitle.ru} onChange={(e) => setLandingDraft((current) => ({ ...current, portfolioTitle: { ...current.portfolioTitle, ru: e.target.value } }))} />
          </label>
          <label>
            {t("landingAdmin.en.portfolioTitle", language)}
            <input value={landingDraft.portfolioTitle.en} onChange={(e) => setLandingDraft((current) => ({ ...current, portfolioTitle: { ...current.portfolioTitle, en: e.target.value } }))} />
          </label>
          <label>
            {t("landingAdmin.ru.portfolioText", language)}
            <textarea rows={3} value={landingDraft.portfolioText.ru} onChange={(e) => setLandingDraft((current) => ({ ...current, portfolioText: { ...current.portfolioText, ru: e.target.value } }))} />
            <small className="admin-muted">{t("landingAdmin.ru.blankLine", language)}</small>
          </label>
          <label>
            {t("landingAdmin.en.portfolioText", language)}
            <textarea rows={3} value={landingDraft.portfolioText.en} onChange={(e) => setLandingDraft((current) => ({ ...current, portfolioText: { ...current.portfolioText, en: e.target.value } }))} />
            <small className="admin-muted">{t("landingAdmin.en.blankLine", language)}</small>
          </label>
          <label>
            {t("landingAdmin.aboutPhoto", language)}
            <input type="file" accept="image/*" onChange={(e) => void handleLandingPhoto(e)} />
          </label>
          {landingDraft.aboutPhoto ? (
            <img className="admin-landing-editor__preview" src={landingDraft.aboutPhoto} alt="about-preview" />
          ) : null}
          <button type="submit" className="glass-button" disabled={busy}>
            {busy ? t("landingAdmin.saving", language) : t("landingAdmin.save", language)}
          </button>
        </form>
      </article>
    </section>
  );
}

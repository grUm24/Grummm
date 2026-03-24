import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { fetchProjectByIdFromApi, useProjectPost } from "../../public/data/project-store";
import { usePreferences } from "../../public/preferences";
import { t } from "../../shared/i18n";
import type { PortfolioProject } from "../../public/types";

function renderViewer(project: PortfolioProject) {
  const isStaticTemplate = project.template === "Static";
  return (
    <iframe
      title={`${project.id}-preview`}
      data-testid="dynamic-project-frame"
      className="dynamic-project-viewer__frame"
      src={`/app/${project.id}/index.html`}
      sandbox={isStaticTemplate ? "allow-scripts allow-forms allow-downloads allow-same-origin" : undefined}
      referrerPolicy="same-origin"
    />
  );
}

export function DynamicProjectViewer() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = usePreferences();
  const cached = useProjectPost(slug);
  const [project, setProject] = useState<PortfolioProject | undefined>(cached);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!slug) {
      setLoading(false);
      return () => undefined;
    }

    setLoading(true);
    void fetchProjectByIdFromApi(slug).then((item) => {
      if (!active) {
        return;
      }
      setProject(item ?? undefined);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [slug]);

  const hasTemplate = useMemo(() => Boolean(project?.template && project.template !== "None"), [project?.template]);

  if (!slug) {
    return <Navigate to="/app" replace />;
  }

  if (loading) {
    return (
      <section className="dynamic-project-viewer admin-card">
        <h1>{t("viewer.loading", language)}</h1>
      </section>
    );
  }

  if (!project || !hasTemplate) {
    return (
      <section className="dynamic-project-viewer admin-card">
        <h1>{t("viewer.unavailableTitle", language)}</h1>
        <p className="admin-muted">{t("viewer.unavailableText", language, { slug })}</p>
      </section>
    );
  }

  return (
    <section className="dynamic-project-viewer admin-card">
      <header className="dynamic-project-viewer__header">
        <div>
          <p className="section-heading__eyebrow">Runtime viewer</p>
          <h1>{project.title.ru || project.title.en}</h1>
          <p className="admin-muted">{t("viewer.template", language, { template: project.template ?? "None" })}</p>
        </div>
        <div className="dynamic-project-viewer__actions">
          {project.template !== "Static" ? (
            <a className="glass-button glass-button--ghost" href={`/app/${project.id}/index.html`} target="_blank" rel="noreferrer">
              {t("viewer.openFull", language)}
            </a>
          ) : null}
        </div>
      </header>
      {renderViewer(project)}
    </section>
  );
}

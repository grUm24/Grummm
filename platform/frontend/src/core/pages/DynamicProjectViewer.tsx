import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { fetchProjectByIdFromApi, useProjectPost } from "../../public/data/project-store";
import type { PortfolioProject } from "../../public/types";

function renderViewer(project: PortfolioProject) {
  return (
    <iframe
      title={`${project.id}-preview`}
      data-testid="dynamic-project-frame"
      className="dynamic-project-viewer__frame"
      src={`/app/${project.id}/index.html`}
    />
  );
}

export function DynamicProjectViewer() {
  const { slug } = useParams<{ slug: string }>();
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

  const hasTemplate = useMemo(
    () => Boolean(project?.template && project.template !== "None"),
    [project?.template]
  );

  if (!slug) {
    return <Navigate to="/app" replace />;
  }

  if (loading) {
    return (
      <section className="dynamic-project-viewer admin-card">
        <h1>Загрузка рабочего пространства проекта...</h1>
      </section>
    );
  }

  if (!project || !hasTemplate) {
    return (
      <section className="dynamic-project-viewer admin-card">
        <h1>Интерактивное пространство недоступно</h1>
        <p className="admin-muted">
          Проект `{slug}` не найден или для него не загружен интерактивный шаблон.
        </p>
      </section>
    );
  }

  return (
    <section className="dynamic-project-viewer admin-card">
      <header className="dynamic-project-viewer__header">
        <h1>{project.title.en}</h1>
        <p className="admin-muted">Шаблон: {project.template}</p>
        <div className="dynamic-project-viewer__actions">
          <a href={`/app/${project.id}/index.html`} target="_blank" rel="noreferrer">
            Открыть полностью
          </a>
        </div>
      </header>
      {renderViewer(project)}
    </section>
  );
}

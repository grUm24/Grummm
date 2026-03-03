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
        <h1>Loading project workspace...</h1>
      </section>
    );
  }

  if (!project || !hasTemplate) {
    return (
      <section className="dynamic-project-viewer admin-card">
        <h1>Interactive workspace unavailable</h1>
        <p className="admin-muted">
          Project `{slug}` was not found or does not have an interactive template bundle.
        </p>
      </section>
    );
  }

  return (
    <section className="dynamic-project-viewer admin-card">
      <header className="dynamic-project-viewer__header">
        <h1>{project.title.en}</h1>
        <p className="admin-muted">Template: {project.template}</p>
      </header>
      {renderViewer(project)}
    </section>
  );
}

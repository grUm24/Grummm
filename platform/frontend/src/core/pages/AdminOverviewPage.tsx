import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteProject, useProjectPosts } from "../../public/data/project-store";
import { useAuthSession } from "../auth/auth-session";

interface AnalyticsPostView {
  postId: string;
  title: string;
  views: number;
  popularity: "high" | "medium" | "low" | string;
}

interface AnalyticsOverview {
  storage: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usagePercent: number;
  };
  siteVisitsTotal: number;
  postViews: AnalyticsPostView[];
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent > 1 ? 1 : 0)} ${units[exponent]}`;
}

export function AdminOverviewPage() {
  const auth = useAuthSession();
  const navigate = useNavigate();
  const items = useProjectPosts();
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const projects = useMemo(
    () => items.filter((item) => (item.template ?? "None") !== "None").sort((a, b) => a.title.en.localeCompare(b.title.en)),
    [items]
  );

  const posts = useMemo(
    () => items.filter((item) => (item.template ?? "None") === "None").sort((a, b) => a.title.en.localeCompare(b.title.en)),
    [items]
  );

  useEffect(() => {
    if (!auth.accessToken) {
      return;
    }

    setLoading(true);
    setError("");
    void fetch("/api/app/analytics/overview", {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${auth.accessToken}`
      }
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Не удалось загрузить аналитику.");
        }
        const payload = (await response.json()) as AnalyticsOverview;
        setAnalytics(payload);
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Ошибка загрузки аналитики.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [auth.accessToken]);

  async function handleDelete(itemId: string, title: string) {
    if (!window.confirm(`Удалить "${title}"?`)) {
      return;
    }

    if (!window.confirm("Это действие необратимо. Будут удалены запись и файлы шаблона на сервере.")) {
      return;
    }

    setError("");
    try {
      await deleteProject(itemId, { serverOnly: true });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить запись.");
    }
  }

  return (
    <section className="admin-home">
      <header className="admin-home__header">
        <h1>Обзор</h1>
        <p>Единый центр: аналитика, посты и проекты с быстрыми действиями.</p>
      </header>

      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-home__grid">
        <article>
          <h3>Место на сервере</h3>
          <p className="admin-muted">
            {loading || !analytics
              ? "Загрузка..."
              : `${formatBytes(analytics.storage.usedBytes)} / ${formatBytes(analytics.storage.totalBytes)} (${analytics.storage.usagePercent}%)`}
          </p>
          {!loading && analytics ? (
            <p className="admin-muted">Свободно: {formatBytes(analytics.storage.freeBytes)}</p>
          ) : null}
        </article>
        <article>
          <h3>Посещения сайта</h3>
          <p className="admin-home__metric">{analytics?.siteVisitsTotal ?? 0}</p>
        </article>
        <article>
          <h3>Популярность постов</h3>
          <ul className="admin-overview-top-list">
            {(analytics?.postViews ?? []).slice(0, 5).map((item) => (
              <li key={item.postId}>
                <span>{item.title}</span>
                <span className={`admin-popularity admin-popularity--${item.popularity}`}>{item.views}</span>
              </li>
            ))}
            {(analytics?.postViews ?? []).length === 0 ? <li>Пока нет данных.</li> : null}
          </ul>
        </article>
      </div>

      <article className="admin-card admin-overview-list-card">
        <h2>Проекты</h2>
        <div className="admin-projects__list">
          {projects.map((project) => (
            <div key={project.id} className="admin-projects__item">
              <div>
                <strong>{project.title.ru || project.title.en}</strong>
                <p>{project.id}</p>
              </div>
              <div className="admin-chip-nav">
                <button type="button" onClick={() => navigate(`/app/projects?edit=${encodeURIComponent(project.id)}`)}>Редактировать</button>
                <button type="button" onClick={() => void handleDelete(project.id, project.title.ru || project.title.en || project.id)}>Удалить</button>
                <a href={`/app/${project.id}/index.html`} target="_blank" rel="noreferrer">Открыть</a>
              </div>
            </div>
          ))}
          {projects.length === 0 ? <p className="admin-muted">Пока нет проектов с шаблонами.</p> : null}
        </div>
      </article>

      <article className="admin-card admin-overview-list-card">
        <h2>Посты</h2>
        <div className="admin-projects__list">
          {posts.map((post) => (
            <div key={post.id} className="admin-projects__item">
              <div>
                <strong>{post.title.ru || post.title.en}</strong>
                <p>{post.id}</p>
              </div>
              <div className="admin-chip-nav">
                <button type="button" onClick={() => navigate(`/app/posts?edit=${encodeURIComponent(post.id)}`)}>Редактировать</button>
                <button type="button" onClick={() => void handleDelete(post.id, post.title.ru || post.title.en || post.id)}>Удалить</button>
                <Link to={`/projects/${post.id}`}>Открыть</Link>
              </div>
            </div>
          ))}
          {posts.length === 0 ? <p className="admin-muted">Постов пока нет.</p> : null}
        </div>
      </article>
    </section>
  );
}

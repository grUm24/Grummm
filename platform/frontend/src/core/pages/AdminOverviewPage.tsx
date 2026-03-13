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
  siteVisitsTotal: number;
  postViews: AnalyticsPostView[];
}

interface PlatformOpsOverview {
  storage: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usagePercent: number;
  };
}

interface ServiceState {
  status: "healthy" | "ready" | "degraded" | "unknown";
  label: string;
  details: string;
}

interface DashboardAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent > 1 ? 1 : 0)} ${units[exponent]}`;
}

function statusTone(status: ServiceState["status"]): "good" | "warn" | "bad" | "neutral" {
  if (status === "healthy" || status === "ready") return "good";
  if (status === "degraded") return "warn";
  if (status === "unknown") return "neutral";
  return "bad";
}

function formatLastSync(date: Date | null): string {
  if (!date) return "not synchronized yet";
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

async function readServiceState(endpoint: "/health" | "/ready"): Promise<ServiceState> {
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      return {
        status: "degraded",
        label: endpoint === "/health" ? "Health endpoint" : "Readiness endpoint",
        details: `HTTP ${response.status}`
      };
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const rawStatus = typeof payload.status === "string" ? payload.status : "unknown";

    if (rawStatus === "healthy") {
      return { status: "healthy", label: "API healthy", details: "Public health-check is green" };
    }

    if (rawStatus === "ready") {
      return { status: "ready", label: "Database connected", details: "Readiness confirms data access" };
    }

    return {
      status: "degraded",
      label: endpoint === "/health" ? "Health unstable" : "Readiness unstable",
      details: rawStatus
    };
  } catch {
    return {
      status: "unknown",
      label: endpoint === "/health" ? "Health unavailable" : "Readiness unavailable",
      details: "Failed to get response from service"
    };
  }
}

export function AdminOverviewPage() {
  const auth = useAuthSession();
  const navigate = useNavigate();
  const items = useProjectPosts();
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [platformOps, setPlatformOps] = useState<PlatformOpsOverview | null>(null);
  const [health, setHealth] = useState<ServiceState>({ status: "unknown", label: "Health check", details: "Waiting" });
  const [readiness, setReadiness] = useState<ServiceState>({ status: "unknown", label: "Readiness check", details: "Waiting" });
  const [loading, setLoading] = useState(false);
  const [refreshingServices, setRefreshingServices] = useState(false);
  const [error, setError] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const projects = useMemo(
    () => items.filter((item) => (item.template ?? "None") !== "None").sort((a, b) => a.title.en.localeCompare(b.title.en)),
    [items]
  );

  const posts = useMemo(
    () => items.filter((item) => (item.template ?? "None") === "None").sort((a, b) => a.title.en.localeCompare(b.title.en)),
    [items]
  );

  const templateBreakdown = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const item of projects) {
      const template = item.template ?? "None";
      buckets.set(template, (buckets.get(template) ?? 0) + 1);
    }

    return Array.from(buckets.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([template, count]) => ({ template, count }));
  }, [projects]);

  const publishedBundleCount = useMemo(
    () => projects.filter((item) => Boolean(item.frontendPath || item.backendPath)).length,
    [projects]
  );

  const storageUsagePercent = platformOps?.storage.usagePercent ?? 0;
  const storageTone = storageUsagePercent >= 85 ? "bad" : storageUsagePercent >= 65 ? "warn" : "good";
  const trafficTone = (analytics?.siteVisitsTotal ?? 0) >= 100 ? "good" : (analytics?.siteVisitsTotal ?? 0) > 0 ? "warn" : "neutral";
  const topPost = analytics?.postViews[0] ?? null;

  async function refreshServices() {
    setRefreshingServices(true);
    const [healthState, readinessState] = await Promise.all([
      readServiceState("/health"),
      readServiceState("/ready")
    ]);
    setHealth(healthState);
    setReadiness(readinessState);
    setRefreshingServices(false);
  }

  useEffect(() => {
    void refreshServices();
  }, []);

  useEffect(() => {
    if (!auth.accessToken) return;

    setLoading(true);
    setError("");

    void Promise.all([
      fetch("/api/app/analytics/overview", {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${auth.accessToken}` }
      }),
      fetch("/api/app/platform-ops/overview", {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${auth.accessToken}` }
      })
    ])
      .then(async ([analyticsResponse, platformOpsResponse]) => {
        if (!analyticsResponse.ok) throw new Error("Failed to load analytics data.");
        if (!platformOpsResponse.ok) throw new Error("Failed to load platform ops data.");

        const analyticsPayload = (await analyticsResponse.json()) as AnalyticsOverview;
        const platformOpsPayload = (await platformOpsResponse.json()) as PlatformOpsOverview;
        setAnalytics(analyticsPayload);
        setPlatformOps(platformOpsPayload);
        setLastSyncAt(new Date());
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load dashboard data.");
      })
      .finally(() => setLoading(false));
  }, [auth.accessToken]);

  async function handleDelete(itemId: string, title: string) {
    if (!window.confirm(`Delete "${title}"?`)) return;
    if (!window.confirm("This action is irreversible. Entry and runtime files will be removed from server.")) return;

    setError("");
    try {
      await deleteProject(itemId, { serverOnly: true });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete item.");
    }
  }

  const quickActions: DashboardAction[] = [
    { label: "Refresh health/readiness", onClick: () => { void refreshServices(); } },
    { label: "Open projects", href: "/app/projects" },
    { label: "Open posts", href: "/app/posts" },
    { label: "Open security", href: "/app/security" }
  ];

  return (
    <section className="admin-home">
      <header className="admin-home__header admin-home__header--ops">
        <div>
          <p className="admin-home__eyebrow">Ops dashboard</p>
          <h1>Platform operations overview</h1>
          <p>Single control center for API, readiness, storage, publications and traffic activity.</p>
        </div>
        <div className="admin-home__header-meta">
          <div className="admin-home__meta-card">
            <span>Last sync</span>
            <strong>{loading ? "Refreshing..." : formatLastSync(lastSyncAt)}</strong>
          </div>
          <button type="button" className="admin-home__refresh-button" onClick={() => { void refreshServices(); }} disabled={refreshingServices}>
            {refreshingServices ? "Checking..." : "Check services"}
          </button>
        </div>
      </header>

      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-home__grid admin-home__grid--ops-top">
        <article className="admin-panel admin-panel--status">
          <div className="admin-panel__header">
            <h3>API heartbeat</h3>
            <span className={`admin-status-badge admin-status-badge--${statusTone(health.status)}`}>{health.label}</span>
          </div>
          <p className="admin-muted">{health.details}</p>
        </article>

        <article className="admin-panel admin-panel--status">
          <div className="admin-panel__header">
            <h3>Readiness</h3>
            <span className={`admin-status-badge admin-status-badge--${statusTone(readiness.status)}`}>{readiness.label}</span>
          </div>
          <p className="admin-muted">{readiness.details}</p>
        </article>

        <article className="admin-panel admin-panel--metric">
          <div className="admin-panel__header">
            <h3>Project storage</h3>
            <span className={`admin-status-badge admin-status-badge--${storageTone}`}>{storageUsagePercent.toFixed(0)}%</span>
          </div>
          <p className="admin-home__metric">{loading || !platformOps ? "..." : formatBytes(platformOps.storage.usedBytes)}</p>
          <p className="admin-muted">{loading || !platformOps ? "Calculating..." : `${formatBytes(platformOps.storage.freeBytes)} free of ${formatBytes(platformOps.storage.totalBytes)}`}</p>
          <div className="admin-progress" aria-hidden="true">
            <span style={{ width: `${Math.max(2, Math.min(storageUsagePercent, 100))}%` }} />
          </div>
        </article>

        <article className="admin-panel admin-panel--metric">
          <div className="admin-panel__header">
            <h3>Site traffic</h3>
            <span className={`admin-status-badge admin-status-badge--${trafficTone}`}>{analytics?.siteVisitsTotal ?? 0} visits</span>
          </div>
          <p className="admin-home__metric">{analytics?.siteVisitsTotal ?? 0}</p>
          <p className="admin-muted">{topPost ? `Top post: ${topPost.title}` : "No post view events yet."}</p>
        </article>
      </div>

      <div className="admin-home__ops-layout">
        <article className="admin-card admin-ops-card admin-ops-card--wide">
          <div className="admin-panel__header">
            <div>
              <p className="admin-home__eyebrow">Services</p>
              <h2>Operational slice</h2>
            </div>
            <span className="admin-muted">Analytics and PlatformOps are isolated backend modules</span>
          </div>
          <div className="admin-ops-kpis">
            <div className="admin-ops-kpi"><span>Public posts</span><strong>{posts.length}</strong></div>
            <div className="admin-ops-kpi"><span>Template projects</span><strong>{projects.length}</strong></div>
            <div className="admin-ops-kpi"><span>Published bundles</span><strong>{publishedBundleCount}</strong></div>
            <div className="admin-ops-kpi"><span>Top post views</span><strong>{topPost?.views ?? 0}</strong></div>
          </div>
          <div className="admin-ops-split">
            <section>
              <h3>Template types</h3>
              <ul className="admin-overview-top-list admin-overview-top-list--stacked">
                {templateBreakdown.map((entry) => (
                  <li key={entry.template}><span>{entry.template}</span><span className="admin-popularity">{entry.count}</span></li>
                ))}
                {templateBreakdown.length === 0 ? <li>No template projects yet.</li> : null}
              </ul>
            </section>
            <section>
              <h3>Quick actions</h3>
              <div className="admin-chip-nav admin-chip-nav--compact">
                {quickActions.map((action) => action.href ? <Link key={action.label} to={action.href}>{action.label}</Link> : <button key={action.label} type="button" onClick={action.onClick}>{action.label}</button>)}
              </div>
            </section>
          </div>
        </article>

        <article className="admin-card admin-ops-card">
          <p className="admin-home__eyebrow">Traffic</p>
          <h2>Post popularity</h2>
          <ul className="admin-overview-top-list">
            {(analytics?.postViews ?? []).slice(0, 6).map((item) => (
              <li key={item.postId}><span>{item.title}</span><span className={`admin-popularity admin-popularity--${item.popularity}`}>{item.views}</span></li>
            ))}
            {(analytics?.postViews ?? []).length === 0 ? <li>No view data yet.</li> : null}
          </ul>
        </article>
      </div>

      <article className="admin-card admin-overview-list-card">
        <div className="admin-panel__header">
          <div>
            <p className="admin-home__eyebrow">Runtime</p>
            <h2>Template projects</h2>
          </div>
          <span className="admin-muted">Open viewer and jump to editor</span>
        </div>
        <div className="admin-projects__list">
          {projects.map((project) => (
            <div key={project.id} className="admin-projects__item admin-projects__item--ops">
              <div>
                <strong>{project.title.ru || project.title.en}</strong>
                <p>{project.id}</p>
                <p className="admin-muted">Template: {project.template ?? "None"}</p>
              </div>
              <div className="admin-chip-nav">
                <button type="button" onClick={() => navigate(`/app/projects?edit=${encodeURIComponent(project.id)}`)}>Edit</button>
                <button type="button" onClick={() => void handleDelete(project.id, project.title.ru || project.title.en || project.id)}>Delete</button>
                <a href={`/app/${project.id}/index.html`} target="_blank" rel="noreferrer">Open viewer</a>
              </div>
            </div>
          ))}
          {projects.length === 0 ? <p className="admin-muted">No template projects yet.</p> : null}
        </div>
      </article>

      <article className="admin-card admin-overview-list-card">
        <div className="admin-panel__header">
          <div>
            <p className="admin-home__eyebrow">Content</p>
            <h2>Posts and content</h2>
          </div>
          <span className="admin-muted">Queue for public showcase</span>
        </div>
        <div className="admin-projects__list">
          {posts.map((post) => (
            <div key={post.id} className="admin-projects__item admin-projects__item--ops">
              <div>
                <strong>{post.title.ru || post.title.en}</strong>
                <p>{post.id}</p>
              </div>
              <div className="admin-chip-nav">
                <button type="button" onClick={() => navigate(`/app/posts?edit=${encodeURIComponent(post.id)}`)}>Edit</button>
                <button type="button" onClick={() => void handleDelete(post.id, post.title.ru || post.title.en || post.id)}>Delete</button>
                <Link to={`/projects/${post.id}`}>Open</Link>
              </div>
            </div>
          ))}
          {posts.length === 0 ? <p className="admin-muted">No posts yet.</p> : null}
        </div>
      </article>
    </section>
  );
}

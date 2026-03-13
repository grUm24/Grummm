export function TaskTrackerPublicPage() {
  return (
    <section className="module-public-card">
      <p className="section-heading__eyebrow">Module</p>
      <h1>TaskTracker Module</h1>
      <p>
        TaskTracker is the first real module of the platform. It demonstrates owner-scoped task
        management, private API boundaries, and plugin-based module routing.
      </p>
      <ul>
        <li>Domain model with task lifecycle and completion state</li>
        <li>CQRS handlers for create, list, and complete flows</li>
        <li>Private endpoints mounted under <code>/api/app/tasks/*</code></li>
      </ul>
    </section>
  );
}

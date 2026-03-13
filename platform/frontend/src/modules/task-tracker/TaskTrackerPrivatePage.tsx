import { Link } from "react-router-dom";

export function TaskTrackerPrivatePage() {
  return (
    <section className="admin-card module-page">
      <p className="section-heading__eyebrow">Module</p>
      <h1>Task Tracker</h1>
      <p className="admin-muted">Private workspace for task management inside the platform.</p>
      <nav className="admin-chip-nav">
        <Link to="/app/tasks">Overview</Link>
        <Link to="/app/tasks/board">Board</Link>
        <Link to="/app/tasks/create">Create task</Link>
      </nav>
      <ul>
        <li>Owner permission checks are enforced on backend for private API.</li>
        <li>`AdminOnly` guard protects module routes inside the private app.</li>
      </ul>
    </section>
  );
}

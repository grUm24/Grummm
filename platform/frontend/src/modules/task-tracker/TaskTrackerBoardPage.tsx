export function TaskTrackerBoardPage() {
  return (
    <section className="admin-card module-page">
      <p className="section-heading__eyebrow">TaskTracker</p>
      <h2>Task Board</h2>
      <p className="admin-muted">Route: /app/tasks/board</p>
      <div className="admin-panel">
        <strong>Next step</strong>
        <ul>
          <li>Connect real API client for `/api/app/tasks/*`.</li>
          <li>Render owner-specific tasks via backend without local stubs.</li>
        </ul>
      </div>
    </section>
  );
}

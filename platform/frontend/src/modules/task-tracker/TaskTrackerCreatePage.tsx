export function TaskTrackerCreatePage() {
  return (
    <section className="admin-card module-page">
      <p className="section-heading__eyebrow">TaskTracker</p>
      <h2>Create Task</h2>
      <p className="admin-muted">Route: /app/tasks/create</p>
      <form className="admin-form">
        <label>
          Title
          <input name="title" placeholder="Task title" />
        </label>
        <label>
          Description
          <textarea name="description" placeholder="Task description" rows={4} />
        </label>
        <button type="button" className="glass-button">Create (stub)</button>
      </form>
    </section>
  );
}

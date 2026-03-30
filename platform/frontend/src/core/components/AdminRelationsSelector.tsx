import { useEffect, useMemo, useState } from "react";
import { getCurrentAccessToken } from "../auth/auth-session";
import {
  fetchProjectRelations,
  fetchProjectTopics,
  fetchTopics,
  setProjectRelations,
  setProjectTopics,
  useProjectPosts
} from "../../public/data/project-store";
import type { PortfolioProject, Topic } from "../../public/types";

interface AdminRelationsSelectorProps {
  projectId: string;
}

export function AdminRelationsSelector({ projectId }: AdminRelationsSelectorProps) {
  const allProjects = useProjectPosts();
  const [relationIds, setRelationIds] = useState<string[]>([]);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const candidates = useMemo(
    () => allProjects.filter((p) => p.id !== projectId),
    [allProjects, projectId]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return candidates
      .filter((p) => p.title.en.toLowerCase().includes(q) || p.title.ru.toLowerCase().includes(q) || p.id.includes(q))
      .slice(0, 8);
  }, [candidates, search]);

  const selectedProjects = useMemo(
    () => candidates.filter((p) => relationIds.includes(p.id)),
    [candidates, relationIds]
  );

  useEffect(() => {
    const token = getCurrentAccessToken();
    if (!token || !projectId) return;
    void fetchProjectRelations(projectId, token).then(setRelationIds);
    void fetchProjectTopics(projectId, token).then(setTopicIds);
    void fetchTopics(token).then(setAllTopics);
  }, [projectId]);

  function toggleRelation(id: string) {
    setRelationIds((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
    setDirty(true);
  }

  function toggleTopic(id: string) {
    setTopicIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
    setDirty(true);
  }

  async function handleSave() {
    const token = getCurrentAccessToken();
    if (!token) return;
    setSaving(true);
    try {
      await Promise.all([
        setProjectRelations(projectId, relationIds, token),
        setProjectTopics(projectId, topicIds, token)
      ]);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-relations">
      {/* Topics */}
      <div className="admin-relations__section">
        <h4 className="admin-relations__heading">Topics</h4>
        <div className="admin-relations__chips">
          {allTopics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={`admin-relations__chip ${topicIds.includes(topic.id) ? "admin-relations__chip--active" : ""}`}
              onClick={() => toggleTopic(topic.id)}
            >
              {topic.name.en}
            </button>
          ))}
          {allTopics.length === 0 ? <span className="admin-relations__hint">No topics created yet. Add topics in the Topics Manager above.</span> : null}
        </div>
      </div>

      {/* Relations */}
      <div className="admin-relations__section">
        <h4 className="admin-relations__heading">Related entries</h4>
        {selectedProjects.length > 0 ? (
          <div className="admin-relations__selected">
            {selectedProjects.map((p) => (
              <div key={p.id} className="admin-relations__selected-item">
                <span>{p.title.en || p.id}</span>
                <button type="button" className="admin-relations__remove" onClick={() => toggleRelation(p.id)}>&times;</button>
              </div>
            ))}
          </div>
        ) : null}
        <input
          type="text"
          className="admin-input"
          placeholder="Search posts/projects to link..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {filtered.length > 0 ? (
          <div className="admin-relations__dropdown">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`admin-relations__option ${relationIds.includes(p.id) ? "admin-relations__option--selected" : ""}`}
                onClick={() => { toggleRelation(p.id); setSearch(""); }}
              >
                <strong>{p.title.en || p.id}</strong>
                <span className="admin-relations__option-kind">{p.kind ?? "post"}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {dirty ? (
        <button type="button" className="admin-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save relations & topics"}
        </button>
      ) : null}
    </div>
  );
}

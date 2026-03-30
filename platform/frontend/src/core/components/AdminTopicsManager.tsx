import { useEffect, useState } from "react";
import { getCurrentAccessToken } from "../auth/auth-session";
import { deleteTopic, fetchTopics, upsertTopic } from "../../public/data/project-store";
import type { Topic } from "../../public/types";

export function AdminTopicsManager() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [newId, setNewId] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newNameRu, setNewNameRu] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getCurrentAccessToken();
    if (token) void fetchTopics(token).then(setTopics);
  }, []);

  async function handleAdd() {
    const token = getCurrentAccessToken();
    if (!token || !newId.trim() || !newNameEn.trim()) return;
    setLoading(true);
    try {
      const saved = await upsertTopic(
        { id: newId.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"), name: { en: newNameEn.trim(), ru: newNameRu.trim() || newNameEn.trim() } },
        token
      );
      setTopics((prev) => [...prev.filter((t) => t.id !== saved.id), saved].sort((a, b) => a.name.en.localeCompare(b.name.en)));
      setNewId("");
      setNewNameEn("");
      setNewNameRu("");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(topicId: string) {
    const token = getCurrentAccessToken();
    if (!token) return;
    await deleteTopic(topicId, token);
    setTopics((prev) => prev.filter((t) => t.id !== topicId));
  }

  return (
    <div className="admin-topics-manager">
      <h3 className="admin-topics-manager__title">Topics</h3>
      <div className="admin-topics-manager__list">
        {topics.map((topic) => (
          <div key={topic.id} className="admin-topics-manager__item">
            <span className="admin-topics-manager__label">{topic.name.en}{topic.name.ru !== topic.name.en ? ` / ${topic.name.ru}` : ""}</span>
            <span className="admin-topics-manager__id">{topic.id}</span>
            <button type="button" className="admin-topics-manager__delete" onClick={() => handleDelete(topic.id)} title="Delete">&times;</button>
          </div>
        ))}
        {topics.length === 0 ? <p className="admin-topics-manager__empty">No topics yet</p> : null}
      </div>
      <div className="admin-topics-manager__add">
        <input type="text" placeholder="ID (e.g. react)" value={newId} onChange={(e) => setNewId(e.target.value)} className="admin-input admin-input--sm" />
        <input type="text" placeholder="Name EN" value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} className="admin-input admin-input--sm" />
        <input type="text" placeholder="Name RU" value={newNameRu} onChange={(e) => setNewNameRu(e.target.value)} className="admin-input admin-input--sm" />
        <button type="button" className="admin-btn admin-btn--sm" onClick={handleAdd} disabled={loading || !newId.trim() || !newNameEn.trim()}>
          + Add
        </button>
      </div>
    </div>
  );
}

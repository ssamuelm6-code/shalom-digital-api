"use client";

import { useEffect, useState } from "react";

const EMPTY_ENTRY = { question: "", answer: "", tags: "" };

const PROFILE_FIELDS = [
  { key: "businessName", label: "Business name", placeholder: "ShalomDigital" },
  { key: "tone", label: "Tone of voice", placeholder: "friendly, concise and professional" },
  { key: "hours", label: "Opening hours", placeholder: "Mon-Sat, 9:30am-6:30pm IST" },
  { key: "contact", label: "Contact details", placeholder: "info@shalomdigital.in / +91 63604 06946" },
  { key: "website", label: "Website", placeholder: "https://shalomdigital.in" },
];

export default function TrainPanel({ profile, entries, loading, onRefresh }) {
  const [form, setForm] = useState(profile || {});
  const [entry, setEntry] = useState(EMPTY_ENTRY);
  const [editingId, setEditingId] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(profile || {});
  }, [profile]);

  function notify(message) {
    setStatus(message);
    setError("");
    window.setTimeout(() => setStatus(""), 2500);
  }

  function fail(message) {
    setError(message);
    setStatus("");
  }

  async function post(body) {
    const res = await fetch("/api/train", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Request failed");
    return json;
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await post({ action: "saveProfile", profile: form });
      await onRefresh();
      notify("Business details saved.");
    } catch (err) {
      fail(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveEntry(event) {
    event.preventDefault();
    const question = String(entry.question || "").trim();
    const answer = String(entry.answer || "").trim();
    if (!question || !answer) {
      fail("Both a question and an answer are required.");
      return;
    }

    const tags = Array.isArray(entry.tags)
      ? entry.tags
      : entry.tags.split(",").map((tag) => tag.trim()).filter(Boolean);

    setSavingEntry(true);
    const wasEditing = Boolean(editingId);
    try {
      if (wasEditing) {
        await post({ action: "updateEntry", entry: { id: editingId, question, answer, tags } });
      } else {
        await post({ action: "addEntry", entry: { question, answer, tags } });
      }
      setEntry(EMPTY_ENTRY);
      setEditingId(null);
      await onRefresh();
      notify(wasEditing ? "FAQ entry updated." : "FAQ entry added.");
    } catch (err) {
      fail(err.message);
    } finally {
      setSavingEntry(false);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEntry({
      question: item.question || "",
      answer: item.answer || "",
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : item.tags || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setEntry(EMPTY_ENTRY);
  }

  async function removeEntry(id) {
    if (!window.confirm("Delete this FAQ entry?")) return;
    try {
      await post({ action: "deleteEntry", id });
      if (editingId === id) cancelEdit();
      await onRefresh();
      notify("FAQ entry deleted.");
    } catch (err) {
      fail(err.message);
    }
  }

  async function resetAll() {
    if (!window.confirm("Reset the knowledge base and business profile to the sample defaults?")) return;
    try {
      await post({ action: "reset" });
      cancelEdit();
      await onRefresh();
      notify("Knowledge base reset.");
    } catch (err) {
      fail(err.message);
    }
  }

  return (
    <div className="stack">
      {status && <div className="alert alert-ok">{status}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <section className="card">
        <div className="card-head">
          <h2>Business profile</h2>
          <p>The bot uses this context for every answer.</p>
        </div>
        <form className="form-grid" onSubmit={saveProfile}>
          {PROFILE_FIELDS.map((field) => (
            <label className="field" key={field.key}>
              <span>{field.label}</span>
              <input
                value={form[field.key] || ""}
                placeholder={field.placeholder}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              />
            </label>
          ))}
          <label className="field field-full">
            <span>About the business</span>
            <textarea
              rows={3}
              value={form.description || ""}
              placeholder="What you sell, where you deliver, guarantees, etc."
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label className="field field-full">
            <span>Extra details</span>
            <textarea
              rows={3}
              value={form.extra || ""}
              placeholder="Payments, promotions, special instructions..."
              onChange={(e) => setForm({ ...form, extra: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save business details"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{editingId ? "Edit FAQ entry" : "Add FAQ entry"}</h2>
          <p>Teach the bot a question your customers ask and the answer it should give.</p>
        </div>
        <form className="form-grid" onSubmit={saveEntry}>
          <label className="field field-full">
            <span>Customer question</span>
            <input
              value={entry.question}
              placeholder="Do you deliver to my area?"
              onChange={(e) => setEntry({ ...entry, question: e.target.value })}
            />
          </label>
          <label className="field field-full">
            <span>Answer</span>
            <textarea
              rows={3}
              value={entry.answer}
              placeholder="Yes, we deliver nationwide in 2-5 business days."
              onChange={(e) => setEntry({ ...entry, answer: e.target.value })}
            />
          </label>
          <label className="field field-full">
            <span>Keywords (comma separated, optional)</span>
            <input
              value={entry.tags}
              placeholder="delivery, shipping, nationwide"
              onChange={(e) => setEntry({ ...entry, tags: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={savingEntry}>
              {savingEntry ? "Saving..." : editingId ? "Update entry" : "Add entry"}
            </button>
            {editingId && (
              <button className="btn btn-ghost" type="button" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-head card-head-row">
          <div>
            <h2>Knowledge base</h2>
            <p>{entries.length} FAQ {entries.length === 1 ? "entry" : "entries"} trained.</p>
          </div>
          <button className="btn btn-ghost btn-danger" onClick={resetAll} type="button">
            Reset to defaults
          </button>
        </div>

        {loading && <div className="muted">Loading...</div>}

        {!loading && entries.length === 0 && (
          <div className="empty">No FAQ entries yet. Add your first one above.</div>
        )}

        <div className="entry-list">
          {entries.map((item) => (
            <article className="entry" key={item.id}>
              <div className="entry-body">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
                {Array.isArray(item.tags) && item.tags.length > 0 && (
                  <div className="tags">
                    {item.tags.map((tag, index) => (
                      <span className="tag" key={`${item.id}-${index}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="entry-actions">
                <button className="btn btn-small" onClick={() => startEdit(item)} type="button">
                  Edit
                </button>
                <button
                  className="btn btn-small btn-danger"
                  onClick={() => removeEntry(item.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

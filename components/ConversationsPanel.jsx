"use client";

import { useCallback, useEffect, useState } from "react";

export default function ConversationsPanel() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [error, setError] = useState("");

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load conversations");
      const json = await res.json();
      setConversations(json.conversations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function openConversation(id) {
    setSelected(id);
    setReply("");
    setLoadingMessages(true);
    setError("");
    try {
      const res = await fetch(`/api/conversations?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load messages");
      const json = await res.json();
      setMessages(json.messages || []);
    } catch (err) {
      setError(err.message);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function sendReply(event) {
    event.preventDefault();
    const text = reply.trim();
    if (!text || !selected || sendingReply) return;

    setSendingReply(true);
    setError("");
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected, message: text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to send reply");
      setReply("");
      await openConversation(selected);
      loadList();
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingReply(false);
    }
  }

  async function removeConversation(id) {
    if (!window.confirm("Delete this conversation?")) return;
    await fetch(`/api/conversations?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (selected === id) {
      setSelected(null);
      setMessages([]);
    }
    loadList();
  }

  const selectedConversation = conversations.find((item) => item.id === selected);
  const selectedName = selectedConversation?.name || selected;
  const isTestConversation = String(selected || "").startsWith("test:");

  return (
    <section className="card">
      <div className="card-head card-head-row">
        <div>
          <h2>Conversations</h2>
          <p>Read customer messages and reply manually when needed.</p>
        </div>
        <button className="btn btn-ghost" onClick={loadList} type="button">
          Refresh
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="conversations-layout">
        <div className="conversation-list">
          {loading && <div className="muted">Loading...</div>}
          {!loading && conversations.length === 0 && (
            <div className="empty">No conversations yet. Messages will appear here once customers write in.</div>
          )}
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`conversation-item ${selected === conversation.id ? "conversation-active" : ""}`}
              onClick={() => openConversation(conversation.id)}
              type="button"
            >
              <div className="conversation-top">
                <strong>{conversation.name || conversation.id}</strong>
                <span>{formatTime(conversation.lastAt)}</span>
              </div>
              <p>{conversation.lastMessage || "No messages"}</p>
            </button>
          ))}
        </div>

        <div className="conversation-detail">
          {!selected && <div className="empty">Select a conversation to view the messages.</div>}
          {selected && (
            <>
              <div className="conversation-detail-head">
                <strong>{selectedName}</strong>
                <button
                  className="btn btn-small btn-danger"
                  onClick={() => removeConversation(selected)}
                  type="button"
                >
                  Delete
                </button>
              </div>
              {loadingMessages && <div className="muted">Loading...</div>}
              <div className="chat-window chat-window-small">
                {messages.map((message, index) => (
                  <div
                    className={`bubble-row ${message.role === "user" ? "bubble-row-user" : ""}`}
                    key={index}
                  >
                    <div className={`bubble ${message.role === "user" ? "bubble-user" : "bubble-bot"}`}>
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
              {isTestConversation && (
                <p className="muted">
                  Test conversation: replies are saved here but not sent to WhatsApp.
                </p>
              )}
              <form className="chat-input" onSubmit={sendReply}>
                <input
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder={isTestConversation ? "Type a test reply..." : "Reply to this customer..."}
                  disabled={sendingReply}
                />
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={sendingReply || !reply.trim()}
                >
                  {sendingReply ? "Sending..." : "Send"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return "";
  }
}

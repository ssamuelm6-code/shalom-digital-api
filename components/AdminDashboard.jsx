"use client";

import { useCallback, useEffect, useState } from "react";
import Login from "./Login";
import TrainPanel from "./TrainPanel";
import TestChat from "./TestChat";
import ConversationsPanel from "./ConversationsPanel";

const TABS = [
  { id: "train", label: "Train bot" },
  { id: "test", label: "Test chat" },
  { id: "conversations", label: "Conversations" },
];

export default function AdminDashboard() {
  const [auth, setAuth] = useState({ loading: true, authenticated: false, configured: true });
  const [tab, setTab] = useState("train");
  const [data, setData] = useState({ profile: null, entries: [], storage: null, loading: true });

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth", { cache: "no-store" });
      const json = await res.json();
      setAuth({
        loading: false,
        authenticated: Boolean(json.authenticated),
        configured: json.configured !== false,
      });
    } catch {
      setAuth({ loading: false, authenticated: false, configured: true });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const loadTraining = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch("/api/train", { cache: "no-store" });
      if (res.status === 401) {
        setAuth((prev) => ({ ...prev, authenticated: false }));
        return;
      }
      const json = await res.json();
      setData({
        profile: json.profile || null,
        entries: json.entries || [],
        storage: json.storage || null,
        loading: false,
      });
    } catch {
      setData((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (auth.authenticated) loadTraining();
  }, [auth.authenticated, loadTraining]);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    setAuth({ loading: false, authenticated: false, configured: true });
  }

  if (auth.loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!auth.authenticated) {
    return <Login configured={auth.configured} onSuccess={checkAuth} />;
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-brand">
          <span className="brand-mark">
            <span className="brand-s">S</span>
            <span className="brand-d">D</span>
          </span>
          <div>
            <h1>
              <span className="brand-s">Shalom</span>{" "}
              <span className="brand-d">Digital</span>{" "}
              <span className="brand-api">API</span>
            </h1>
            <p>WhatsApp bot dashboard · Train, test and monitor your assistant</p>
          </div>
        </div>
        <div className="admin-header-actions">
          <span className={`chip ${data.storage === "redis" ? "chip-ok" : "chip-warn"}`}>
            {data.storage === "redis" ? "Redis connected" : "In-memory storage"}
          </span>
          <button className="btn btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={`tab ${tab === item.id ? "tab-active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {data.storage === "memory" && (
        <div className="alert alert-warn">
          Storage is in-memory. Changes will be lost when the server restarts. Add
          <code> UPSTASH_REDIS_REST_URL </code> and <code> UPSTASH_REDIS_REST_TOKEN </code>
          to keep your training data and conversations safe on Vercel.
        </div>
      )}

      <main className="admin-content">
        {tab === "train" && (
          <TrainPanel
            profile={data.profile}
            entries={data.entries}
            loading={data.loading}
            onRefresh={loadTraining}
          />
        )}
        {tab === "test" && <TestChat />}
        {tab === "conversations" && <ConversationsPanel />}
      </main>
    </div>
  );
}

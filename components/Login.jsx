"use client";

import { useState } from "react";

export default function Login({ configured, onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Login failed");
      }
      await onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="login-card">
        <div className="login-icon">
          <span className="brand-s">S</span>
          <span className="brand-d">D</span>
        </div>
        <h1>
          <span className="brand-s">Shalom</span>{" "}
          <span className="brand-d">Digital</span>{" "}
          <span className="brand-api">API</span>
        </h1>
        <p>Enter the password configured in <code>ADMIN_PASSWORD</code>.</p>

        {!configured && (
          <div className="alert alert-warn">
            No <code>ADMIN_PASSWORD</code> is set on the server. Add it to your
            environment variables to enable login.
          </div>
        )}

        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading || !configured}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

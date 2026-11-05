"use client";

import { useId, useRef, useState } from "react";

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "Hi! I'm the ShalomDigital WhatsApp assistant. Send me a message here to test how I answer before you go live.",
};

const TEST_MESSAGES = [
  { label: "Greeting", message: "Hi", expect: "ShalomDigital welcome" },
  { label: "Services", message: "What services do you offer?", expect: "SEO, ads, social, web design" },
  { label: "Pricing", message: "How much does digital marketing cost?", expect: "Starter / Growth / Enterprise" },
  { label: "SEO", message: "Do you provide SEO services?", expect: "SEO + Local SEO / Google Maps" },
  { label: "Google Ads", message: "Do you manage Google Ads?", expect: "PPC & Google Ads management" },
  { label: "Website", message: "Do you build websites?", expect: "Fixed-price web design" },
  { label: "Free audit", message: "How do I get started?", expect: "Free audit within 48 hours" },
  { label: "Location", message: "Where are you located?", expect: "Yelahanka, Bengaluru + pan-India" },
  { label: "Diwali offer", message: "What is the Diwali offer?", expect: "₹34,999 launch pack" },
  { label: "Contracts", message: "Do you have long-term contracts?", expect: "Month-to-month, no lock-in" },
  { label: "Human agent", message: "I want to talk to a human", expect: "Contact info / phone" },
  { label: "Unknown question", message: "Do you accept crypto payments?", expect: "Fallback contact line" },
];

export default function TestChat() {
  const sessionId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  function scrollToEnd() {
    window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function append(role, content) {
    setMessages((prev) => [...prev, { role, content }]);
  }

  async function requestReply(text) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, sessionId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Failed to get a reply");
    return json.reply;
  }

  async function sendText(raw) {
    const text = String(raw || "").trim();
    if (!text || sending) return;

    setError("");
    setInput("");
    append("user", text);
    setSending(true);
    scrollToEnd();

    try {
      const reply = await requestReply(text);
      append("assistant", reply);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  }

  function send(event) {
    event.preventDefault();
    sendText(input);
  }

  async function runAll() {
    if (sending) return;

    setError("");
    setInput("");
    setSending(true);

    try {
      await fetch(`/api/chat?sessionId=${encodeURIComponent(sessionId)}`, { method: "DELETE" });
      setMessages([]);

      for (const test of TEST_MESSAGES) {
        append("user", test.message);
        scrollToEnd();
        const reply = await requestReply(test.message);
        append("assistant", reply);
        scrollToEnd();
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  }

  async function reset() {
    await fetch(`/api/chat?sessionId=${encodeURIComponent(sessionId)}`, { method: "DELETE" });
    setMessages([
      {
        role: "assistant",
        content: "Conversation cleared. Send a new message to start testing.",
      },
    ]);
    setError("");
  }

  return (
    <section className="card chat-card">
      <div className="card-head card-head-row">
        <div>
          <h2>Test chat</h2>
          <p>Simulate a WhatsApp conversation. This does not send real messages.</p>
        </div>
        <button className="btn btn-ghost" onClick={reset} type="button">
          Clear chat
        </button>
      </div>

      <div className="test-presets">
        <div className="test-presets-head">
          <div>
            <h3>Digital marketing test messages</h3>
            <p>Click one to send it, or run them all. Expected reply is shown under each label.</p>
          </div>
          <button
            className="btn btn-ghost btn-small"
            onClick={runAll}
            type="button"
            disabled={sending}
          >
            Run all
          </button>
        </div>
        <div className="test-preset-list">
          {TEST_MESSAGES.map((test) => (
            <button
              className="test-preset"
              key={test.label}
              onClick={() => sendText(test.message)}
              type="button"
              disabled={sending}
              title={`Send: ${test.message}`}
            >
              <span className="test-preset-label">{test.label}</span>
              <span className="test-preset-expect">{test.expect}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="chat-window">
        {messages.map((message, index) => (
          <div className={`bubble-row ${message.role === "user" ? "bubble-row-user" : ""}`} key={index}>
            <div className={`bubble ${message.role === "user" ? "bubble-user" : "bubble-bot"}`}>
              {message.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="bubble-row">
            <div className="bubble bubble-bot typing">Typing...</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="chat-input" onSubmit={send}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a customer message..."
          disabled={sending}
        />
        <button className="btn btn-primary" type="submit" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}

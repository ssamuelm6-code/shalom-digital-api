import Link from "next/link";

const steps = [
  {
    title: "1. Configure environment",
    body: "Copy .env.example to .env.local and fill in your Meta WhatsApp token, phone number ID, verify token, OpenAI key and Upstash Redis credentials.",
  },
  {
    title: "2. Deploy to Vercel",
    body: "Push this project to GitHub and import it in Vercel. Add the same environment variables in the Vercel project settings.",
  },
  {
    title: "3. Register the webhook",
    body: "In Meta App Dashboard > WhatsApp > Configuration, set the Callback URL to https://YOUR_DOMAIN/api/webhook and enter your verify token. Subscribe to the messages field.",
  },
  {
    title: "4. Train your bot",
    body: "Open the admin dashboard, add your business details and FAQ answers, then test the bot in the built-in chat before going live.",
  },
];

export default function Home() {
  return (
    <main className="landing">
      <section className="landing-hero">
        <span className="badge">WhatsApp Cloud API + OpenAI</span>
        <h1>Trainable WhatsApp Business Chatbot</h1>
        <p>
          A ready-to-deploy Next.js chatbot that answers customer replies on WhatsApp,
          uses your own business knowledge base, and lets you retrain it from a simple
          dashboard. Built for Vercel serverless.
        </p>
        <div className="landing-actions">
          <Link className="btn btn-primary" href="/admin">
            Open admin dashboard
          </Link>
          <Link className="btn" href="/api/health">
            Health check
          </Link>
        </div>
      </section>

      <section className="landing-grid">
        {steps.map((step) => (
          <article className="card" key={step.title}>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </article>
        ))}
      </section>

      <footer className="landing-footer">
        Endpoints: <code>/api/webhook</code> (Meta) &middot; <code>/api/train</code>{" "}
        &middot; <code>/api/chat</code> &middot; <code>/api/conversations</code> &middot;{" "}
        <code>/api/auth</code> &middot; <code>/api/health</code>
      </footer>
    </main>
  );
}

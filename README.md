# WhatsApp AI Chatbot (Next.js + Vercel)

A complete, trainable WhatsApp Business chatbot built with **JavaScript / Next.js**.
It uses the **Meta WhatsApp Cloud API** for messaging, **OpenAI** for natural replies,
and a built-in **admin dashboard** where you train your own business knowledge base.

- Receives customer replies via webhook (`/api/webhook`)
- Answers using your business profile + FAQ knowledge base (RAG-lite)
- Separate test chat so you can train/test without sending real messages
- Shows recent conversations in the dashboard
- Deploys to **Vercel** with zero config
- Works without OpenAI (falls back to keyword FAQ matching) and without Redis (in-memory, dev only)

---

## 1. Requirements

- Node.js 20+
- A [Meta developer account](https://developers.facebook.com/) and a WhatsApp Business app
- A WhatsApp phone number (test number is fine to start)
- An [OpenAI API key](https://platform.openai.com/api-keys) (optional but recommended)
- A free [Upstash Redis](https://upstash.com/) database (required for persistence on Vercel)

---

## 2. Local setup

```bash
npm install
copy .env.example .env.local     # Windows (use cp on macOS/Linux)
npm run dev
```

Open http://localhost:3000 and go to `/admin`.

> **Windows PowerShell fix:** if `npm run dev` says *"npm.ps1 cannot be loaded
> because running scripts is disabled"*, either double-click `start-dev.cmd` or
> run `npm.cmd run dev` instead of `npm run dev`. To fix it permanently, run
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` once.

To get a public webhook URL while developing, expose localhost with a tunnel:

```bash
npx ngrok http 3000
# webhook URL -> https://YOUR-NGROK-URL/api/webhook
```

---

## 3. Environment variables

Copy `.env.example` to `.env.local` (locally) and add the same values in
**Vercel → Project → Settings → Environment Variables**.

| Variable | Required | Description |
| --- | --- | --- |
| `WHATSAPP_TOKEN` | Yes | Meta access token (System User token for production) |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes | Phone number ID from Meta App Dashboard |
| `WHATSAPP_VERIFY_TOKEN` | Yes | Random string; must match the Meta webhook config |
| `WHATSAPP_APP_SECRET` | Recommended | Enables `X-Hub-Signature-256` verification |
| `WHATSAPP_GRAPH_VERSION` | No | Defaults to `v21.0` |
| `OPENAI_API_KEY` | Recommended | Enables AI replies |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |
| `ADMIN_PASSWORD` | Yes (production) | Login password for `/admin` |
| `AUTH_SECRET` | No | Extra secret for signing session cookies |
| `UPSTASH_REDIS_REST_URL` | Yes (production) | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes (production) | Upstash Redis REST token |

> Without Upstash the app uses in-memory storage. It works locally but data is
> lost on restart and is not shared between serverless instances.

---

## 4. Set up the WhatsApp Cloud API

1. Create an app at https://developers.facebook.com/apps (**Business** type) and add the **WhatsApp** product.
2. In **WhatsApp → API Setup**, copy the **Phone number ID** and generate an **access token**
   → set `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_TOKEN`.
   For production create a **System User** token with `whatsapp_business_messaging`
   and `whatsapp_business_management` permissions.
3. Add a recipient test number in **API Setup** while using the trial number.
4. Go to **WhatsApp → Configuration → Webhook → Edit**:
   - **Callback URL:** `https://YOUR_DOMAIN/api/webhook`
   - **Verify token:** the exact value of `WHATSAPP_VERIFY_TOKEN`
   - Click **Verify and save**
   - **Subscribe** to the `messages` field
5. Copy the **App secret** from **App settings → Basic** into `WHATSAPP_APP_SECRET`.

---

## 5. Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New → Project → Import** the repo.
3. Framework preset will be detected as **Next.js** — keep the defaults.
4. Add all environment variables from step 3.
5. Deploy, then set the Meta webhook URL to `https://YOUR-VERCEL-DOMAIN/api/webhook`.
6. Visit `https://YOUR-VERCEL-DOMAIN/admin`, log in, and train the bot.

---

## 6. Training your bot

Open `/admin` and use the **Train bot** tab:

- **Business profile** — name, description, tone, opening hours, contact, website, extra details.
  This is injected into every AI prompt.
- **FAQ entries** — a customer question + the answer the bot should give + optional keywords.
  The bot retrieves the most relevant entries for each incoming message.
- **Test chat** tab — simulate WhatsApp messages and confirm replies before going live.
- **Conversations** tab — read recent real chats and delete them if needed.

Every change is saved immediately and used by the live webhook.

---

## 7. API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/webhook` | Meta webhook verification |
| `POST` | `/api/webhook` | Incoming WhatsApp messages (signature verified) |
| `GET` | `/api/train` | Read profile + FAQ (auth) |
| `POST` | `/api/train` | `saveProfile`, `addEntry`, `updateEntry`, `deleteEntry`, `reset` (auth) |
| `POST` | `/api/chat` | Test-chat reply (auth) |
| `DELETE` | `/api/chat` | Clear a test conversation (auth) |
| `GET` | `/api/conversations` | List conversations, or `?id=` for messages (auth) |
| `DELETE` | `/api/conversations?id=` | Delete a conversation (auth) |
| `GET/POST/DELETE` | `/api/auth` | Session status / login / logout |
| `GET` | `/api/health` | Config + storage status |

---

## 8. Send a test message

```bash
curl -X POST "https://graph.facebook.com/v21.0/WHATSAPP_PHONE_NUMBER_ID/messages" ^
  -H "Authorization: Bearer WHATSAPP_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"messaging_product\":\"whatsapp\",\"to\":\"RECIPIENT_NUMBER\",\"type\":\"text\",\"text\":{\"body\":\"Hello\"}}"
```

Or simply message your WhatsApp test number — the webhook replies automatically.

---

## 9. Project structure

```
app/
  api/
    webhook/route.js        Meta verify + incoming message handling
    chat/route.js           Admin test chat
    train/route.js          Knowledge base CRUD
    conversations/route.js  Conversation list/detail/delete
    auth/route.js           Admin login/logout/session
    health/route.js         Status
  admin/page.js             Admin dashboard page
  page.js                   Landing page
  layout.js                 Root layout
  globals.css               Styles
components/                 Dashboard UI (React client components)
lib/
  ai.js                     OpenAI + keyword fallback
  knowledge.js              Default profile/FAQ, retrieval, prompt builder
  store.js                  Upstash Redis / in-memory storage
  whatsapp.js               Send messages + signature verification
  auth.js                   Admin session helpers
```

---

## 10. Notes for production

- Set a **strong `ADMIN_PASSWORD`** and `AUTH_SECRET`.
- Set `WHATSAPP_APP_SECRET` so forged webhook calls are rejected.
- Use Upstash Redis (or another shared store) — serverless functions do not share memory.
- For high message volume, move conversation storage to a proper database and process
  the webhook asynchronously (Vercel `waitUntil` / queue) to stay within response limits.
- To go live, complete Meta **Business Verification** and add a real phone number.

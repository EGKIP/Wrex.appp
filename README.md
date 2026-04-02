# Wrex.app

> **Write authentically. Sound like you.**

Wrex is a writing workspace for students. Paste your draft, get instant feedback on how it reads, fix what sounds off, and submit work that's genuinely yours. Pro users get AI-powered rewrites, a humanizer, and rubric-aligned edits — all in one place.

**Live:** https://wrex.app — **Repo:** private (keep it that way)

---

## Features

| Tier | What you get |
|---|---|
| **Free** | AI-pattern score (0–100) · sentence-level flags · rubric alignment check · writing tips · grammar & spelling via LanguageTool · 500 words per analysis · 3 analyses / day |
| **Pro ($9/mo)** | Everything in Free · Improve (sentence rewrites) · Humanize (tone shift) · Rubric Rewrite (match grading criteria) · 2,000 words · unlimited analyses |

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | FastAPI + Pydantic v2 + Uvicorn (deployed on Vercel serverless) |
| Auth & DB | Supabase (Postgres + JWT row-level security) |
| Payments | Stripe Checkout (embedded) + Billing Portal + webhook |
| AI (Pro) | OpenAI GPT-4o mini |
| Grammar (Free) | LanguageTool public API |
| Email forwarding | ImprovMX → support@wrex.app → Gmail |

---

## Local dev

**Frontend**
```bash
npm install
npm run dev          # http://localhost:5173
```

**Backend**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000
```

**Required env — `backend/.env`**
```
WREX_SUPABASE_URL=
WREX_SUPABASE_SERVICE_KEY=
WREX_STRIPE_SECRET_KEY=
WREX_STRIPE_PRICE_ID=
WREX_STRIPE_WEBHOOK_SECRET=
WREX_OPENAI_API_KEY=
```

**Frontend env — `.env.local`**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_API_URL=http://localhost:8000
```

**Stripe webhook (local)**
```bash
stripe listen --forward-to localhost:8000/pro/webhook
```

---

## API routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | none | Health check |
| POST | `/analyze` | optional | AI-pattern score + rubric check (500 / 2 000 word limit) |
| POST | `/grammar-check` | none | LanguageTool grammar pass |
| GET | `/history` | required | User's past analyses |
| POST | `/pro/improve` | Pro | Sentence-level GPT-4o mini suggestions |
| POST | `/pro/humanize` | Pro | Full humanized rewrite |
| POST | `/pro/rubric-rewrite` | Pro | Rewrite aligned to rubric criteria |
| POST | `/pro/checkout` | required | Create Stripe embedded checkout session |
| POST | `/pro/billing-portal` | required | Create Stripe Customer Portal session (manage / cancel) |
| POST | `/pro/webhook` | Stripe sig | Handle `customer.subscription.*` events |

---

## Project structure

```
src/
  App.tsx               Root — view routing (landing / workspace)
  components/
    Navbar.tsx          Top nav + avatar menu
    Hero.tsx            Landing hero
    HowItWorks.tsx      3-step explainer
    AnalyzerSection.tsx Free analyzer (landing page)
    ProPreview.tsx      Pricing cards
    FaqSection.tsx      FAQ accordion
    Footer.tsx          Footer + support link
    WorkspaceSidebar.tsx  History drawer (workspace)
    AnalyzerPanel.tsx   Editor + rubric banner + word counter
    ResultsPanel.tsx    Score card + flagged sentences + Accept flow
    ProPanel.tsx        Improve / Humanize / Rubric Rewrite tabs
    ProfileModal.tsx    Account info + plan details + Manage/Cancel
    CheckoutModal.tsx   Stripe embedded checkout
    Brand.tsx           Logo component
  hooks/
    useAuth.ts          Supabase auth state
    useQuota.ts         Daily quota fetching
  lib/api.ts            Typed fetch client for all backend calls
  types.ts              Shared TypeScript interfaces

backend/app/
  api/
    free_routes.py      /analyze, /grammar-check (word limits enforced here)
    pro_routes.py       /pro/* — checkout, billing portal, webhook, AI tools
    history_routes.py   /history
    auth_routes.py      Auth helpers
  services/
    free_detector/      Local NLP scorer — no API cost
    rubric_matcher/     Keyword-based rubric alignment
    pro_writer/         GPT-4o mini: improve, humanize, rubric rewrite
  core/                 Config, JWT auth, rate limiting, logging
  schemas/              Pydantic request/response models

public/
  og-image.svg          OG preview card (1200×630) — convert to PNG for Outlook
```

---

## Vercel environment variables (production)

Set these in **Vercel → Project → Settings → Environment Variables**:

```
# Backend (Functions)
WREX_SUPABASE_URL
WREX_SUPABASE_SERVICE_KEY
WREX_STRIPE_SECRET_KEY          ← sk_live_... for production
WREX_STRIPE_PRICE_ID            ← price_live_... for production
WREX_STRIPE_WEBHOOK_SECRET      ← whsec_... from Stripe dashboard
WREX_OPENAI_API_KEY

# Frontend (VITE_ prefix = injected at build time)
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_STRIPE_PUBLISHABLE_KEY     ← pk_live_... for production
VITE_API_URL                    ← https://wrex.app
```

---

## Go-live checklist

- [ ] Swap Stripe test keys → live keys in Vercel env vars
- [ ] Add live webhook endpoint in Stripe Dashboard → Developers → Webhooks → `https://wrex.app/pro/webhook`
- [ ] Copy live webhook secret → set `WREX_STRIPE_WEBHOOK_SECRET` in Vercel
- [ ] Enable Stripe Customer Portal: Dashboard → Settings → Billing → Customer portal
- [ ] Enable Stripe receipt emails: Dashboard → Settings → Customer emails
- [ ] Convert `public/og-image.svg` → `public/og-image.png` (cloudconvert.com) and push
- [ ] Verify ImprovMX MX records are green and `support@wrex.app` routes to Gmail

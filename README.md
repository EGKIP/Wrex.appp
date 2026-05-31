# Wrex.app

> **Write authentically. Sound like you.**

Private repo. Live site → **https://wrex.app**

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS on Vercel |
| Backend | FastAPI + Pydantic v2 on Render |
| Auth & DB | Supabase (Postgres + JWT) |
| Payments | Stripe Checkout + Billing Portal + webhook |
| AI (Pro) | OpenAI GPT-4o mini |
| Grammar (Free) | LanguageTool public API |

Production is split between a static Vercel frontend and the Render-hosted FastAPI API. `vercel.json` rewrites frontend routes to `index.html`; API calls should go to the Render backend through `VITE_API_BASE_URL`.

---

## Local dev

**Frontend**
```bash
npm install
npm run dev       
```

`.env.local`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_API_BASE_URL=http://localhost:8000
```

**Backend**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload   
```

For backend smoke tests:
```bash
pip install -r requirements-dev.txt
python3 -m pytest
```

`backend/.env`:
```
WREX_SUPABASE_URL=
WREX_SUPABASE_SERVICE_ROLE_KEY=
WREX_STRIPE_SECRET_KEY=
WREX_STRIPE_PRICE_ID=
WREX_STRIPE_WEBHOOK_SECRET=
WREX_OPENAI_API_KEY=
WREX_FRONTEND_URL=http://localhost:5173
```

**Stripe webhook (local)**
```bash
stripe listen --forward-to localhost:8000/pro/webhook
```

---

## API routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | none | Uptime check |
| POST | `/analyze` | optional | Authenticity score + rubric (Free: 500w, Pro: 2,000w) |
| POST | `/grammar-check` | none | LanguageTool pass |
| GET | `/history` | JWT | Past analyses |
| POST | `/pro/improve` | Pro | Sentence rewrites |
| POST | `/pro/humanize` | Pro | Full tone-shift rewrite |
| POST | `/pro/rubric-rewrite` | Pro | Rubric-aligned rewrite |
| POST | `/pro/checkout` | JWT | Stripe checkout session |
| POST | `/pro/billing-portal` | JWT | Stripe Customer Portal session |
| POST | `/pro/webhook` | Stripe-sig | Subscription lifecycle events |

---

## Production environment

**Vercel frontend**
```
VITE_API_BASE_URL=https://wrex-appp.onrender.com
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
```

**Render backend**
```
WREX_ENVIRONMENT=production
WREX_ALLOWED_ORIGINS=["https://wrex.app","https://www.wrex.app"]
WREX_FRONTEND_URL=https://wrex.app
WREX_SUPABASE_URL=
WREX_SUPABASE_SERVICE_ROLE_KEY=
WREX_STRIPE_SECRET_KEY=
WREX_STRIPE_PRICE_ID=
WREX_STRIPE_WEBHOOK_SECRET=
WREX_OPENAI_API_KEY=
```

---

## Structure

```
src/
  App.tsx                   Root — landing / workspace routing
  components/               All UI components
  hooks/useAuth.ts          Supabase auth state
  hooks/useProStatus.ts     Pro subscription + credit state
  lib/api.ts                Typed API client
  types.ts                  Shared interfaces

backend/app/
  api/                      Route handlers (free, pro, history, auth)
  services/
    free_detector/          Local NLP scorer (no API cost)
    rubric_matcher/         Rubric keyword alignment
    pro_writer/             GPT-4o mini rewrites
  core/                     Config, auth, rate limiting
  schemas/                  Pydantic models

public/
  og-image.svg              Link preview card (1200×630)
```

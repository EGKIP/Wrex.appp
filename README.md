# Wrex.app

> **Write authentically. Sound like you.**

Private repo. Live site → **https://wrex.app**

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | FastAPI + Pydantic v2 (Vercel serverless) |
| Auth & DB | Supabase (Postgres + JWT) |
| Payments | Stripe Checkout + Billing Portal + webhook |
| AI (Pro) | OpenAI GPT-4o mini |
| Grammar (Free) | LanguageTool public API |

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

`backend/.env`:
```
WREX_SUPABASE_URL=
WREX_SUPABASE_SERVICE_KEY=
WREX_STRIPE_SECRET_KEY=
WREX_STRIPE_PRICE_ID=
WREX_STRIPE_WEBHOOK_SECRET=
WREX_OPENAI_API_KEY=
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
| POST | `/analyze` | optional | AI score + rubric (Free: 500w, Pro: 2,000w) |
| POST | `/grammar-check` | none | LanguageTool pass |
| GET | `/history` | JWT | Past analyses |
| POST | `/pro/improve` | Pro | Sentence rewrites |
| POST | `/pro/humanize` | Pro | Full tone-shift rewrite |
| POST | `/pro/rubric-rewrite` | Pro | Rubric-aligned rewrite |
| POST | `/pro/checkout` | JWT | Stripe checkout session |
| POST | `/pro/billing-portal` | JWT | Stripe Customer Portal session |
| POST | `/pro/webhook` | Stripe-sig | Subscription lifecycle events |

---

## Structure

```
src/
  App.tsx                   Root — landing / workspace routing
  components/               All UI components
  hooks/useAuth.ts          Supabase auth state
  hooks/useQuota.ts         Daily quota
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

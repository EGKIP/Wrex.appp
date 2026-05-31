# Wrex.app — Backend

FastAPI backend deployed on Render. Handles AI scoring, Pro rewrites, Stripe billing, and Supabase auth for the Vercel-hosted frontend.

---

## Local setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload   # → http://localhost:8000
```

Smoke tests:
```bash
pip install -r requirements-dev.txt
python3 -m pytest
```

Create `backend/.env`:
```
WREX_SUPABASE_URL=
WREX_SUPABASE_SERVICE_ROLE_KEY=
WREX_STRIPE_SECRET_KEY=
WREX_STRIPE_PRICE_ID=
WREX_STRIPE_WEBHOOK_SECRET=
WREX_OPENAI_API_KEY=
WREX_PRO_MONTHLY_AI_CREDITS=100000
WREX_FRONTEND_URL=http://localhost:5173
```

Stripe webhook (local):
```bash
stripe listen --forward-to localhost:8000/pro/webhook
```

The frontend Vite app should use `VITE_API_BASE_URL=http://localhost:8000` locally. In production, Vercel serves the frontend and rewrites app routes to `index.html`; API requests should point at the Render backend, for example `VITE_API_BASE_URL=https://wrex-appp.onrender.com`.

Production backend env vars:
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
WREX_PRO_MONTHLY_AI_CREDITS=100000
WREX_AI_CREDIT_METERING_ENABLED=true
```

---

## Routes

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | none | Uptime check |
| POST | `/analyze` | optional | Authenticity score + rubric. Free: 500 words, Pro: 2,000 words |
| POST | `/grammar-check` | none | LanguageTool pass |
| GET | `/history` | JWT | User analysis history |
| POST | `/pro/improve` | Pro JWT | GPT-4o mini sentence suggestions |
| POST | `/pro/humanize` | Pro JWT | Full tone-shift rewrite |
| POST | `/pro/rubric-rewrite` | Pro JWT | Rubric-aligned rewrite |
| POST | `/pro/checkout` | JWT | Stripe embedded checkout session |
| POST | `/pro/billing-portal` | JWT | Stripe Customer Portal session (manage/cancel) |
| POST | `/pro/webhook` | Stripe-sig | Handles `customer.subscription.created/deleted` |

---

## Word limits

Enforced in both `free_routes.py` (backend) and `AnalyzerSection.tsx` (frontend):

| Tier | Limit |
|---|---|
| Free | 500 words |
| Pro | 2,000 words |

---

## Pro AI credits

Pro includes `WREX_PRO_MONTHLY_AI_CREDITS` AI credits per UTC calendar month. The default is `100000`, and one credit currently equals one OpenAI `total_tokens` value returned by GPT-4o mini.

Paid AI endpoints (`/pro/improve`, `/pro/humanize`, `/pro/rubric-rewrite`) preflight the current monthly balance before calling OpenAI, then debit actual token usage after a successful response. Stripe test mode is unchanged: checkout, portal, and webhook behavior still use the existing Stripe env vars and profile fields.

Supabase metering is expected to provide:

- `ai_credit_periods` table for each user's monthly included credits and used credits.
- `ai_credit_events` table for per-request token and credit debits.
- `wrex_get_or_create_ai_credit_balance(...)` RPC for balance checks.
- `wrex_debit_ai_credits(...)` RPC for idempotent debit logging.
- RLS policies allowing users to read their own credit periods/events, while backend writes use the service-role key.

Apply [backend/docs/supabase_ai_credits.sql](backend/docs/supabase_ai_credits.sql) in Supabase before enforcing production metering. If the RPCs are missing or Supabase is temporarily unavailable, the backend logs a warning and fails open for active Pro users; only a successful balance check with zero remaining credits returns HTTP 402.
